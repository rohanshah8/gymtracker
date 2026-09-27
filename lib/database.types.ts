/**
 * Hand-written types mirroring supabase/migrations/0001_init.sql.
 *
 * These aren't generated via `supabase gen types typescript` because that
 * requires a live linked project. Once you have one, you can replace this
 * file with the generated output — keep the exported names the same
 * (or update the imports across lib/queries.ts) so the rest of the app
 * doesn't need to change.
 */

export type WeightUnit = 'kg' | 'lb';
export type ExerciseType = 'resistance' | 'cardio';
export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other';

export interface Profile {
  id: string;
  display_name: string;
  weight_unit: WeightUnit;
  created_at: string;
}

export interface ExerciseCategory {
  id: string;
  name: string;
  is_custom: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  category_id: string;
  exercise_type: ExerciseType;
  equipment: Equipment | null;
  is_custom: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface RoutineDay {
  id: string;
  routine_id: string;
  day_name: string;
  day_order: number;
}

export interface RoutineExercise {
  id: string;
  routine_day_id: string;
  exercise_id: string;
  exercise_order: number;
  target_sets: number | null;
  target_reps: number | null;
}

export interface Workout {
  id: string;
  user_id: string;
  title: string;
  workout_date: string; // YYYY-MM-DD
  started_at: string;
  ended_at: string | null;
  source_routine_day_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface WorkoutSet {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_index: number;
  reps: number | null;
  weight: number | null;
  distance: number | null;
  duration_seconds: number | null;
  rpe: number | null;
  is_warmup: boolean;
  comment: string | null;
  created_at: string;
}

export interface PersonalRecord {
  id: string;
  user_id: string;
  exercise_id: string;
  set_id: string | null;
  weight: number;
  reps: number;
  estimated_1rm: number;
  achieved_at: string;
}

// ---- Insert helper types (only the columns callers actually provide;
// everything else has a DB default or is server-assigned) ----

export type NewWorkout = Pick<Workout, 'title'> &
  Partial<Pick<Workout, 'workout_date' | 'source_routine_day_id' | 'notes'>>;

export type NewSet = Pick<WorkoutSet, 'workout_id' | 'exercise_id' | 'set_index'> &
  Partial<
    Pick<WorkoutSet, 'reps' | 'weight' | 'distance' | 'duration_seconds' | 'rpe' | 'is_warmup' | 'comment'>
  >;

export type NewExercise = Pick<Exercise, 'name' | 'category_id' | 'exercise_type'> &
  Partial<Pick<Exercise, 'equipment'>>;

export type NewRoutine = Pick<Routine, 'name'>;

export type NewRoutineDay = Pick<RoutineDay, 'routine_id' | 'day_name'> &
  Partial<Pick<RoutineDay, 'day_order'>>;

export type NewRoutineExercise = Pick<RoutineExercise, 'routine_day_id' | 'exercise_id'> &
  Partial<Pick<RoutineExercise, 'exercise_order' | 'target_sets' | 'target_reps'>>;
