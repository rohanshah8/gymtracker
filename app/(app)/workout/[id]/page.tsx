import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { getWorkoutDetail } from '@/lib/queries';
import { calculateVolume } from '@/lib/calculations';

export default async function WorkoutDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();

  let detail;
  try {
    detail = await getWorkoutDetail(supabase, params.id);
  } catch {
    notFound();
  }

  const { workout, sets } = detail;

  const byExercise = new Map<string, typeof sets>();
  for (const set of sets) {
    const list = byExercise.get(set.exercise.id) ?? [];
    list.push(set);
    byExercise.set(set.exercise.id, list);
  }

  const totalVolume = calculateVolume(sets);
  const durationMinutes = workout.ended_at
    ? Math.max(1, Math.round((new Date(workout.ended_at).getTime() - new Date(workout.started_at).getTime()) / 60000))
    : null;

  return (
    <main className="min-h-screen px-4 pb-28 pt-6">
      <h1 className="text-2xl font-bold">{workout.title}</h1>
      <p className="mb-6 text-sm text-neutral-500">{workout.workout_date}</p>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatTile label="Total Volume" value={`${totalVolume.toLocaleString()}`} />
        <StatTile label="Duration" value={durationMinutes ? `${durationMinutes} min` : 'In progress'} />
      </div>

      {Array.from(byExercise.entries()).map(([exerciseId, exerciseSets]) => (
        <section key={exerciseId} className="mb-5">
          <h2 className="mb-2 font-semibold">{exerciseSets[0]?.exercise.name}</h2>
          <ul className="space-y-1">
            {exerciseSets.map((set) => (
              <li
                key={set.id}
                className="flex items-center justify-between rounded-xl bg-surface-raised px-4 py-2 text-sm"
              >
                <span className="text-neutral-400">Set {set.set_index}</span>
                <span>
                  {set.weight != null && set.reps != null
                    ? `${set.weight} × ${set.reps}${set.is_warmup ? ' (warm-up)' : ''}`
                    : set.distance != null
                      ? `${set.distance} · ${Math.round((set.duration_seconds ?? 0) / 60)} min`
                      : '—'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {sets.length === 0 && (
        <p className="py-8 text-center text-sm text-neutral-500">No sets logged in this workout.</p>
      )}
    </main>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-raised px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
