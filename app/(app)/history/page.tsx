import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { getWorkoutHistory } from '@/lib/queries';

export default async function HistoryPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const workouts = user ? await getWorkoutHistory(supabase, user.id) : [];

  return (
    <main className="min-h-screen px-4 pb-28 pt-6">
      <h1 className="mb-4 text-2xl font-bold">History</h1>

      {workouts.length === 0 ? (
        <p className="py-12 text-center text-sm text-neutral-500">
          No workouts logged yet — start one from the Dashboard.
        </p>
      ) : (
        <ul className="space-y-2">
          {workouts.map((workout) => (
            <li key={workout.id}>
              <Link
                href={`/workout/${workout.id}`}
                className="flex items-center justify-between rounded-2xl bg-surface-raised px-4 py-4 active:scale-[0.99] transition-transform"
              >
                <div>
                  <p className="font-semibold">{workout.title}</p>
                  <p className="text-sm text-neutral-500">{workout.workout_date}</p>
                </div>
                {!workout.ended_at && (
                  <span className="rounded-full bg-brand/20 px-3 py-1 text-xs font-bold text-brand">
                    In progress
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
