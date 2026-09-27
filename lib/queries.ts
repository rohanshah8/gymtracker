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
  NewSet,
  NewWorkout,
  PersonalRecord,
  Workout,
  WorkoutSet,
} from './database.types';

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
  const sets = unwrap(setsRes as any);

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
