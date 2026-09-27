import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { getExerciseById, getExerciseProgress, getPersonalRecordsForExercise, getProfile } from '@/lib/queries';
import ProgressChart from '@/components/ProgressChart';
import ExerciseToolsLauncher from '@/components/ExerciseToolsLauncher';

export default async function ExerciseDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  let exercise;
  try {
    exercise = await getExerciseById(supabase, params.id);
  } catch {
    notFound();
  }

  const [progress, records, profile] = await Promise.all([
    getExerciseProgress(supabase, user.id, params.id),
    getPersonalRecordsForExercise(supabase, user.id, params.id),
    getProfile(supabase, user.id),
  ]);

  const unit = profile.weight_unit;

  return (
    <main className="min-h-screen px-4 pb-28 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{exercise.name}</h1>
        <ExerciseToolsLauncher unit={unit} />
      </div>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-neutral-400">Progress</h2>
        <ProgressChart data={progress} unit={unit} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-400">Personal Records</h2>
        {records.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-500">No PRs logged yet for this exercise.</p>
        ) : (
          <ul className="space-y-1">
            {records.map((pr) => (
              <li
                key={pr.id}
                className="flex items-center justify-between rounded-xl bg-surface-raised px-4 py-3 text-sm"
              >
                <span className="text-neutral-400">
                  {pr.reps} rep{pr.reps > 1 ? 's' : ''}
                </span>
                <span className="font-semibold">
                  {pr.weight} {unit}
                </span>
                <span className="text-neutral-500">est. 1RM {Math.round(pr.estimated_1rm)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
