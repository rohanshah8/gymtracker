import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { getExerciseCategories, getExercises, getProfile, getRecentExerciseIds } from '@/lib/queries';
import { createWorkoutAction, startWorkoutFromRoutineDayAction } from '@/app/(app)/actions';
import ActiveWorkoutSession from '@/components/ActiveWorkoutSession';

// The real core screen (System Design §6.2), rebuilt from the Phase 2
// rough version per Phase 3 of the build sequence: pre-filled weight/reps,
// thumb-zone "Log Set" button, rest timer, warm-up toggle, per-set
// comment, and an instant PR badge — see components/ActiveWorkoutSession.
//
// A `?routineDayId=` param means this session started from a routine's
// "Log All" button (Phase 4) — the workout is created from that routine
// day (tagging source_routine_day_id) and its exercises pre-populate the
// session instead of starting empty.
export default async function NewWorkoutPage({
  searchParams,
}: {
  searchParams: { routineDayId?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [exercises, categories, recentIds, profile] = await Promise.all([
    getExercises(supabase),
    getExerciseCategories(supabase),
    user ? getRecentExerciseIds(supabase, user.id) : Promise.resolve([]),
    user ? getProfile(supabase, user.id) : Promise.resolve(null),
  ]);

  // Known simplification carried over from Phase 2: a workout row is
  // created as soon as this page loads, whether from a routine or fresh.
  const { workout, initialExercises } = searchParams.routineDayId
    ? await startWorkoutFromRoutineDayAction(searchParams.routineDayId).then((r) => ({
        workout: r.workout,
        initialExercises: r.exercises,
      }))
    : { workout: await createWorkoutAction({ title: 'Workout' }), initialExercises: [] };

  return (
    <ActiveWorkoutSession
      workoutId={workout.id}
      startedAt={workout.started_at}
      exercises={exercises}
      categories={categories}
      recentIds={recentIds}
      weightUnit={profile?.weight_unit ?? 'kg'}
      initialExercises={initialExercises}
    />
  );
}
