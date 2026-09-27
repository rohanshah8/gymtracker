import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { getExercises } from '@/lib/queries';
import { createWorkoutAction } from '@/app/(app)/actions';
import WorkoutLoggerRough from '@/components/WorkoutLoggerRough';

// Phase 2 placeholder: proves the data layer (create a workout, log real
// sets, see personal_records populate) with a deliberately unstyled UI.
// Phase 3 replaces this with the real 2-tap logging screen — see
// GymTracker_Claude_Build_Sequence.md Phase 3.
export default async function NewWorkoutPage() {
  const supabase = createSupabaseServerClient();
  const exercises = await getExercises(supabase);

  // Known Phase-2 simplification: a workout row is created as soon as this
  // page loads. Abandoning the page without logging anything leaves an
  // empty workout row — acceptable for now, revisited if it matters once
  // real usage shows how often that happens.
  const workout = await createWorkoutAction({ title: 'Workout' });

  return (
    <main className="min-h-screen px-4 pb-28 pt-6">
      <WorkoutLoggerRough workoutId={workout.id} exercises={exercises} />
    </main>
  );
}
