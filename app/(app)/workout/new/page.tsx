import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { getExerciseCategories, getExercises, getProfile, getRecentExerciseIds } from '@/lib/queries';
import { createWorkoutAction } from '@/app/(app)/actions';
import ActiveWorkoutSession from '@/components/ActiveWorkoutSession';

// The real core screen (System Design §6.2), rebuilt from the Phase 2
// rough version per Phase 3 of the build sequence: pre-filled weight/reps,
// thumb-zone "Log Set" button, rest timer, warm-up toggle, per-set
// comment, and an instant PR badge — see components/ActiveWorkoutSession.
export default async function NewWorkoutPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [exercises, categories, recentIds, profile, workout] = await Promise.all([
    getExercises(supabase),
    getExerciseCategories(supabase),
    user ? getRecentExerciseIds(supabase, user.id) : Promise.resolve([]),
    user ? getProfile(supabase, user.id) : Promise.resolve(null),
    // Known simplification carried over from Phase 2: a workout row is
    // created as soon as this page loads.
    createWorkoutAction({ title: 'Workout' }),
  ]);

  return (
    <ActiveWorkoutSession
      workoutId={workout.id}
      startedAt={workout.started_at}
      exercises={exercises}
      categories={categories}
      recentIds={recentIds}
      weightUnit={profile?.weight_unit ?? 'kg'}
    />
  );
}
