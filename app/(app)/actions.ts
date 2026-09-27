'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import * as queries from '@/lib/queries';
import type { NewExercise, NewSet, NewWorkout } from '@/lib/database.types';

async function requireUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return { supabase, user };
}

export async function createCustomExerciseAction(input: NewExercise) {
  const { supabase, user } = await requireUser();
  const exercise = await queries.createCustomExercise(supabase, user.id, input);
  revalidatePath('/exercises');
  return exercise;
}

export async function createCustomCategoryAction(name: string) {
  const { supabase, user } = await requireUser();
  const category = await queries.createCustomCategory(supabase, user.id, name);
  revalidatePath('/exercises');
  return category;
}

export async function createWorkoutAction(input: NewWorkout) {
  const { supabase, user } = await requireUser();
  return queries.createWorkout(supabase, user.id, input);
}

/** Logs a set and reports back whether it was a new PR, in one round trip. */
export async function logSetAction(input: NewSet) {
  const { supabase, user } = await requireUser();
  const set = await queries.logSet(supabase, input);
  const pr = await queries.wasPersonalRecord(supabase, user.id, input.exercise_id, set.id);
  return { set, pr };
}

export async function updateSetAction(
  setId: string,
  patch: Parameters<typeof queries.updateSet>[2]
) {
  const { supabase } = await requireUser();
  return queries.updateSet(supabase, setId, patch);
}

export async function deleteSetAction(setId: string) {
  const { supabase } = await requireUser();
  await queries.deleteSet(supabase, setId);
}

export async function finishWorkoutAction(workoutId: string) {
  const { supabase } = await requireUser();
  const workout = await queries.finishWorkout(supabase, workoutId);
  revalidatePath('/history');
  revalidatePath('/dashboard');
  return workout;
}

export async function getLastPerformanceAction(exerciseId: string) {
  const { supabase, user } = await requireUser();
  return queries.getLastPerformance(supabase, user.id, exerciseId);
}
