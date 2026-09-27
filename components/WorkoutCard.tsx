import Link from 'next/link';
import type { Workout } from '@/lib/database.types';

/** Summary card for the history list. */
export default function WorkoutCard({ workout }: { workout: Workout }) {
  const durationMinutes = workout.ended_at
    ? Math.max(1, Math.round((new Date(workout.ended_at).getTime() - new Date(workout.started_at).getTime()) / 60000))
    : null;

  return (
    <Link
      href={`/workout/${workout.id}`}
      className="flex items-center justify-between rounded-2xl bg-surface-raised px-4 py-4 active:scale-[0.99] transition-transform"
    >
      <div>
        <p className="font-semibold">{workout.title}</p>
        <p className="text-sm text-neutral-500">{workout.workout_date}</p>
      </div>
      {workout.ended_at ? (
        durationMinutes && <span className="text-sm text-neutral-400">{durationMinutes} min</span>
      ) : (
        <span className="rounded-full bg-brand/20 px-3 py-1 text-xs font-bold text-brand">In progress</span>
      )}
    </Link>
  );
}
