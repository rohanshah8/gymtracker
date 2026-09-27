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

export async function getWorkoutDatesInRangeAction(startDate: string, endDate: string) {
  const { supabase, user } = await requireUser();
  return queries.getWorkoutDatesInRange(supabase, user.id, startDate, endDate);
}

// ============================================
// Routines
// ============================================

export async function createRoutineAction(name: string) {
  const { supabase, user } = await requireUser();
  const routine = await queries.createRoutine(supabase, user.id, name);
  revalidatePath('/routines');
  return routine;
}

export async function deleteRoutineAction(routineId: string) {
  const { supabase } = await requireUser();
  await queries.deleteRoutine(supabase, routineId);
  revalidatePath('/routines');
}

export async function addRoutineDayAction(routineId: string, dayName: string, dayOrder: number) {
  const { supabase } = await requireUser();
  const day = await queries.addRoutineDay(supabase, routineId, dayName, dayOrder);
  revalidatePath(`/routines/${routineId}`);
  return day;
}

export async function deleteRoutineDayAction(routineId: string, dayId: string) {
  const { supabase } = await requireUser();
  await queries.deleteRoutineDay(supabase, dayId);
  revalidatePath(`/routines/${routineId}`);
}

export async function addRoutineExerciseAction(
  routineId: string,
  input: Parameters<typeof queries.addRoutineExercise>[1]
) {
  const { supabase } = await requireUser();
  const exercise = await queries.addRoutineExercise(supabase, input);
  revalidatePath(`/routines/${routineId}`);
  return exercise;
}

export async function removeRoutineExerciseAction(routineId: string, id: string) {
  const { supabase } = await requireUser();
  await queries.removeRoutineExercise(supabase, id);
  revalidatePath(`/routines/${routineId}`);
}

/** "Log All" entry point — creates a workout from a routine day and hands back its exercises. */
export async function startWorkoutFromRoutineDayAction(routineDayId: string) {
  const { supabase, user } = await requireUser();
  return queries.startWorkoutFromRoutineDay(supabase, user.id, routineDayId);
}

// ============================================
// Profile
// ============================================

export async function updateProfileAction(patch: Parameters<typeof queries.updateProfile>[2]) {
  const { supabase, user } = await requireUser();
  const profile = await queries.updateProfile(supabase, user.id, patch);
  revalidatePath('/profile');
  return profile;
}

export async function exportCSVAction() {
  const { supabase, user } = await requireUser();
  const rows = await queries.getAllSetsForExport(supabase, user.id);
  const { exportRowsToCSV } = await import('@/lib/csv');
  return exportRowsToCSV(rows);
}
