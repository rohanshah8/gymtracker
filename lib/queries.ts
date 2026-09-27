/**
 * Typed data-access functions. Every function takes a Supabase client as
 * its first argument (rather than constructing one internally) so the
 * exact same function works from a Server Component, a Route Handler, a
 * Server Action, or a Client Component — callers pick which client to
 * hand in via createSupabaseServerClient() / createSupabaseBrowserClient().
 *
 * Row Level Security (see supabase/migrations/0001_init.sql) is the real
 * authorization boundary — these functions still take `userId` /
 * `exerciseId` params for query filtering and clearer call sites, but a
 * user can never read/write another user's rows even if a bug omitted
 * a filter here.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Exercise,
  ExerciseCategory,
  NewExercise,
  NewRoutineExercise,
  NewSet,
  NewWorkout,
  PersonalRecord,
  Profile,
  Routine,
  RoutineDay,
  RoutineExercise,
  Workout,
  WorkoutSet,
} from './database.types';
import { calculateStreak, calculateVolume, estimate1RM } from './calculations';
import type { VolumeSet } from './calculations';

type DB = SupabaseClient;

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('Expected data but got null');
  return data;
}

// ============================================
// Exercise library
// ============================================

export async function getExerciseCategories(supabase: DB): Promise<ExerciseCategory[]> {
  const res = await supabase.from('exercise_categories').select('*').order('name');
  return unwrap(res as any);
}

export async function getExercises(
  supabase: DB,
  opts: { search?: string; categoryId?: string } = {}
): Promise<Exercise[]> {
  let query = supabase.from('exercises').select('*').order('name');

  if (opts.categoryId) {
    query = query.eq('category_id', opts.categoryId);
  }
  if (opts.search) {
    query = query.ilike('name', `%${opts.search}%`);
  }

  const res = await query;
  return unwrap(res as any);
}

export async function getExerciseById(supabase: DB, exerciseId: string): Promise<Exercise> {
  const res = await supabase.from('exercises').select('*').eq('id', exerciseId).single();
  return unwrap(res as any);
}

export async function createCustomExercise(
  supabase: DB,
  userId: string,
  input: NewExercise
): Promise<Exercise> {
  const res = await supabase
    .from('exercises')
    .insert({ ...input, is_custom: true, created_by: userId })
    .select('*')
    .single();
  return unwrap(res as any);
}

export async function createCustomCategory(
  supabase: DB,
  userId: string,
  name: string
): Promise<ExerciseCategory> {
  const res = await supabase
    .from('exercise_categories')
    .insert({ name, is_custom: true, created_by: userId })
    .select('*')
    .single();
  return unwrap(res as any);
}

/**
 * Exercises the user has actually logged, most-recently-used first — used
 * to pin "recent" exercises at the top of the picker per the design's
 * "no forced decisions" principle.
 */
export async function getRecentExerciseIds(supabase: DB, userId: string, limit = 10): Promise<string[]> {
  const res = await supabase
    .from('sets')
    .select('exercise_id, created_at, workouts!inner(user_id)')
    .eq('workouts.user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = unwrap(res as any) as Array<{ exercise_id: string }>;
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const row of rows) {
    if (!seen.has(row.exercise_id)) {
      seen.add(row.exercise_id);
      ordered.push(row.exercise_id);
    }
    if (ordered.length >= limit) break;
  }
  return ordered;
}

// ============================================
// Last performance (pre-fill weight/reps)
// ============================================

export interface LastPerformance {
  weight: number | null;
  reps: number | null;
  distance: number | null;
  durationSeconds: number | null;
  performedAt: string;
}

/**
 * The single most recent logged set for this exercise, across any of the
 * user's workouts — this is what pre-fills the weight/reps inputs the
 * instant an exercise is picked, per the "no forced decisions" principle.
 */
export async function getLastPerformance(
  supabase: DB,
  userId: string,
  exerciseId: string
): Promise<LastPerformance | null> {
  const res = await supabase
    .from('sets')
    .select('weight, reps, distance, duration_seconds, created_at, workouts!inner(user_id)')
    .eq('exercise_id', exerciseId)
    .eq('workouts.user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = res as any;
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    weight: data.weight,
    reps: data.reps,
    distance: data.distance,
    durationSeconds: data.duration_seconds,
    performedAt: data.created_at,
  };
}

// ============================================
// Workouts + sets (the core logging loop)
// ============================================

export async function createWorkout(supabase: DB, userId: string, input: NewWorkout): Promise<Workout> {
  const res = await supabase
    .from('workouts')
    .insert({ ...input, user_id: userId })
    .select('*')
    .single();
  return unwrap(res as any);
}

export async function finishWorkout(supabase: DB, workoutId: string): Promise<Workout> {
  const res = await supabase
    .from('workouts')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', workoutId)
    .select('*')
    .single();
  return unwrap(res as any);
}

/**
 * Inserts one set. The PR-detection trigger (see migration 0001) runs
 * server-side on every insert — call wasPersonalRecord() afterwards if
 * the UI needs to show a PR badge immediately.
 */
export async function logSet(supabase: DB, input: NewSet): Promise<WorkoutSet> {
  const res = await supabase.from('sets').insert(input).select('*').single();
  return unwrap(res as any);
}

export async function updateSet(
  supabase: DB,
  setId: string,
  patch: Partial<Pick<WorkoutSet, 'reps' | 'weight' | 'distance' | 'duration_seconds' | 'rpe' | 'is_warmup' | 'comment'>>
): Promise<WorkoutSet> {
  const res = await supabase.from('sets').update(patch).eq('id', setId).select('*').single();
  return unwrap(res as any);
}

export async function deleteSet(supabase: DB, setId: string): Promise<void> {
  const { error } = await supabase.from('sets').delete().eq('id', setId);
  if (error) throw new Error(error.message);
}

export async function getWorkoutSets(supabase: DB, workoutId: string): Promise<WorkoutSet[]> {
  const res = await supabase
    .from('sets')
    .select('*')
    .eq('workout_id', workoutId)
    .order('set_index', { ascending: true });
  return unwrap(res as any);
}

/**
 * How many of the given sets are currently recorded as a personal
 * record — used to show "N New PRs" on a finished workout's Share Card.
 */
export async function getPRCountForSets(supabase: DB, setIds: string[]): Promise<number> {
  if (setIds.length === 0) return 0;
  const { count, error } = await supabase
    .from('personal_records')
    .select('id', { count: 'exact', head: true })
    .in('set_id', setIds);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * After inserting a set, check whether it's now the user's best at that
 * rep count for that exercise — true the instant the trigger's upsert
 * matches this exact set, which is what the UI treats as "new PR".
 */
export async function wasPersonalRecord(
  supabase: DB,
  userId: string,
  exerciseId: string,
  setId: string
): Promise<PersonalRecord | null> {
  const res = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .eq('set_id', setId)
    .maybeSingle();

  const { data, error } = res as any;
  if (error) throw new Error(error.message);
  return data ?? null;
}

// ============================================
// Workout history
// ============================================

export async function getWorkoutHistory(
  supabase: DB,
  userId: string,
  opts: { limit?: number; before?: string } = {}
): Promise<Workout[]> {
  let query = supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('workout_date', { ascending: false })
    .order('started_at', { ascending: false })
    .limit(opts.limit ?? 50);

  if (opts.before) {
    query = query.lt('workout_date', opts.before);
  }

  const res = await query;
  return unwrap(res as any);
}

export interface WorkoutDetail {
  workout: Workout;
  sets: Array<WorkoutSet & { exercise: Pick<Exercise, 'id' | 'name' | 'exercise_type'> }>;
}

export async function getWorkoutDetail(supabase: DB, workoutId: string): Promise<WorkoutDetail> {
  const workoutRes = await supabase.from('workouts').select('*').eq('id', workoutId).single();
  const workout = unwrap(workoutRes as any) as Workout;

  const setsRes = await supabase
    .from('sets')
    .select('*, exercise:exercises(id, name, exercise_type)')
    .eq('workout_id', workoutId)
    .order('set_index', { ascending: true });
  const sets = unwrap(setsRes as any) as WorkoutDetail['sets'];

  return { workout, sets };
}

/** Distinct dates the user trained on, for highlighting days on CalendarView. */
export async function getWorkoutDatesInRange(
  supabase: DB,
  userId: string,
  startDate: string,
  endDate: string
): Promise<string[]> {
  const res = await supabase
    .from('workouts')
    .select('workout_date')
    .eq('user_id', userId)
    .gte('workout_date', startDate)
    .lte('workout_date', endDate);

  const rows = unwrap(res as any) as Array<{ workout_date: string }>;
  return Array.from(new Set(rows.map((r) => r.workout_date)));
}

// ============================================
// Profile
// ============================================

export async function getProfile(supabase: DB, userId: string): Promise<Profile> {
  const res = await supabase.from('profiles').select('*').eq('id', userId).single();
  return unwrap(res as any);
}

export async function updateProfile(
  supabase: DB,
  userId: string,
  patch: Partial<Pick<Profile, 'display_name' | 'weight_unit'>>
): Promise<Profile> {
  const res = await supabase.from('profiles').update(patch).eq('id', userId).select('*').single();
  return unwrap(res as any);
}

// ============================================
// Dashboard stats
// ============================================

export interface DashboardStats {
  workoutsThisWeek: number;
  volumeThisWeek: number;
  currentStreak: number;
}

export async function getDashboardStats(supabase: DB, userId: string): Promise<DashboardStats> {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfWeekStr = startOfWeek.toISOString().slice(0, 10);

  const weekRes = await supabase
    .from('workouts')
    .select('id')
    .eq('user_id', userId)
    .gte('workout_date', startOfWeekStr);
  const weekWorkouts = unwrap(weekRes as any) as Array<{ id: string }>;

  let volumeThisWeek = 0;
  if (weekWorkouts.length > 0) {
    const setsRes = await supabase
      .from('sets')
      .select('weight, reps, is_warmup')
      .in(
        'workout_id',
        weekWorkouts.map((w) => w.id)
      );
    const sets = unwrap(setsRes as any) as VolumeSet[];
    volumeThisWeek = calculateVolume(sets);
  }

  // Streak needs a longer lookback than just the current week.
  const recentRes = await supabase
    .from('workouts')
    .select('workout_date')
    .eq('user_id', userId)
    .order('workout_date', { ascending: false })
    .limit(120);
  const recentWorkouts = unwrap(recentRes as any) as Array<{ workout_date: string }>;

  return {
    workoutsThisWeek: weekWorkouts.length,
    volumeThisWeek,
    currentStreak: calculateStreak(recentWorkouts.map((w) => w.workout_date)),
  };
}

// ============================================
// Per-exercise progress + PR history (Exercises/[id])
// ============================================

export interface ProgressPoint {
  date: string;
  topWeight: number;
  estimated1RM: number;
}

/** One point per calendar day trained: that day's top weight + best estimated 1RM, for ProgressChart. */
export async function getExerciseProgress(
  supabase: DB,
  userId: string,
  exerciseId: string
): Promise<ProgressPoint[]> {
  const res = await supabase
    .from('sets')
    .select('weight, reps, is_warmup, workouts!inner(user_id, workout_date)')
    .eq('exercise_id', exerciseId)
    .eq('workouts.user_id', userId)
    .eq('is_warmup', false)
    .not('weight', 'is', null)
    .not('reps', 'is', null);
  const rows = unwrap(res as any) as Array<{
    weight: number;
    reps: number;
    workouts: { workout_date: string };
  }>;

  const byDate = new Map<string, ProgressPoint>();
  for (const row of rows) {
    const date = row.workouts.workout_date;
    const oneRM = estimate1RM(row.weight, row.reps);
    const existing = byDate.get(date);
    if (!existing) {
      byDate.set(date, { date, topWeight: row.weight, estimated1RM: oneRM });
    } else {
      existing.topWeight = Math.max(existing.topWeight, row.weight);
      existing.estimated1RM = Math.max(existing.estimated1RM, oneRM);
    }
  }

  return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}

export async function getPersonalRecordsForExercise(
  supabase: DB,
  userId: string,
  exerciseId: string
): Promise<PersonalRecord[]> {
  const res = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .order('reps', { ascending: true });
  return unwrap(res as any);
}

// ============================================
// Routines
// ============================================

export interface RoutineDayDetail extends RoutineDay {
  exercises: Array<RoutineExercise & { exercise: Exercise }>;
}

export interface RoutineDetail {
  routine: Routine;
  days: RoutineDayDetail[];
}

export async function getRoutines(supabase: DB, userId: string): Promise<Routine[]> {
  const res = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return unwrap(res as any);
}

export async function createRoutine(supabase: DB, userId: string, name: string): Promise<Routine> {
  const res = await supabase.from('routines').insert({ user_id: userId, name }).select('*').single();
  return unwrap(res as any);
}

export async function deleteRoutine(supabase: DB, routineId: string): Promise<void> {
  const { error } = await supabase.from('routines').delete().eq('id', routineId);
  if (error) throw new Error(error.message);
}

export async function getRoutineDetail(supabase: DB, routineId: string): Promise<RoutineDetail> {
  const routineRes = await supabase.from('routines').select('*').eq('id', routineId).single();
  const routine = unwrap(routineRes as any) as Routine;

  const daysRes = await supabase
    .from('routine_days')
    .select('*, routine_exercises(*, exercise:exercises(*))')
    .eq('routine_id', routineId)
    .order('day_order', { ascending: true });
  const daysRaw = unwrap(daysRes as any) as any[];

  const days: RoutineDayDetail[] = daysRaw.map((d) => ({
    id: d.id,
    routine_id: d.routine_id,
    day_name: d.day_name,
    day_order: d.day_order,
    exercises: (d.routine_exercises ?? [])
      .slice()
      .sort((a: any, b: any) => a.exercise_order - b.exercise_order)
      .map((re: any) => ({ ...re, exercise: re.exercise })),
  }));

  return { routine, days };
}

export async function addRoutineDay(
  supabase: DB,
  routineId: string,
  dayName: string,
  dayOrder: number
): Promise<RoutineDay> {
  const res = await supabase
    .from('routine_days')
    .insert({ routine_id: routineId, day_name: dayName, day_order: dayOrder })
    .select('*')
    .single();
  return unwrap(res as any);
}

export async function deleteRoutineDay(supabase: DB, dayId: string): Promise<void> {
  const { error } = await supabase.from('routine_days').delete().eq('id', dayId);
  if (error) throw new Error(error.message);
}

export async function addRoutineExercise(supabase: DB, input: NewRoutineExercise): Promise<RoutineExercise> {
  const res = await supabase.from('routine_exercises').insert(input).select('*').single();
  return unwrap(res as any);
}

export async function removeRoutineExercise(supabase: DB, id: string): Promise<void> {
  const { error } = await supabase.from('routine_exercises').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * "Log All": creates a workout tagged with this routine day and returns
 * its exercises in order, ready to pre-populate the active session.
 */
export async function startWorkoutFromRoutineDay(
  supabase: DB,
  userId: string,
  routineDayId: string
): Promise<{ workout: Workout; exercises: Exercise[] }> {
  const dayRes = await supabase
    .from('routine_days')
    .select('day_name, routine_exercises(exercise_order, exercise:exercises(*))')
    .eq('id', routineDayId)
    .single();
  const day = unwrap(dayRes as any) as any;

  const workout = await createWorkout(supabase, userId, {
    title: day.day_name,
    source_routine_day_id: routineDayId,
  });

  const exercises = (day.routine_exercises ?? [])
    .slice()
    .sort((a: any, b: any) => a.exercise_order - b.exercise_order)
    .map((re: any) => re.exercise as Exercise);

  return { workout, exercises };
}

// ============================================
// CSV export (Profile — "data ownership, no lock-in")
// ============================================

export interface ExportRow {
  workout_date: string;
  workout_title: string;
  exercise_name: string;
  set_index: number;
  weight: number | null;
  reps: number | null;
  distance: number | null;
  duration_seconds: number | null;
  is_warmup: boolean;
  comment: string | null;
}

export async function getAllSetsForExport(supabase: DB, userId: string): Promise<ExportRow[]> {
  const res = await supabase
    .from('sets')
    .select(
      'set_index, weight, reps, distance, duration_seconds, is_warmup, comment, created_at, ' +
        'exercise:exercises(name), workouts!inner(user_id, workout_date, title)'
    )
    .eq('workouts.user_id', userId)
    // Ordering by the base table's own created_at (when the set was
    // logged) rather than a joined column — simpler and still produces
    // a sensible chronological export.
    .order('created_at', { ascending: true });

  const rows = unwrap(res as any) as any[];
  return rows.map((r) => ({
    workout_date: r.workouts.workout_date,
    workout_title: r.workouts.title,
    exercise_name: r.exercise.name,
    set_index: r.set_index,
    weight: r.weight,
    reps: r.reps,
    distance: r.distance,
    duration_seconds: r.duration_seconds,
    is_warmup: r.is_warmup,
    comment: r.comment,
  }));
}


