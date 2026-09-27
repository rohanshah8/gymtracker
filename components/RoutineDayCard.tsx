'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RoutineDayDetail } from '@/lib/queries';

/** One training day within a routine, with the "Log All" entry point. */
export default function RoutineDayCard({
  day,
  onDelete,
}: {
  day: RoutineDayDetail;
  onDelete?: () => void;
}) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  function handleLogAll() {
    // The actual workout row is created by /workout/new itself (see its
    // ?routineDayId handling) — this just navigates there so there's a
    // single place that creates workouts, not two.
    setIsNavigating(true);
    router.push(`/workout/new?routineDayId=${day.id}`);
  }

  return (
    <div className="rounded-card bg-surface-raised p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{day.day_name}</h3>
        {onDelete && (
          <button onClick={onDelete} className="text-xs font-semibold text-red-400">
            Remove day
          </button>
        )}
      </div>

      {day.exercises.length === 0 ? (
        <p className="mb-3 text-sm text-neutral-500">No exercises added to this day yet.</p>
      ) : (
        <ul className="mb-3 space-y-1">
          {day.exercises.map((re) => (
            <li key={re.id} className="flex items-center justify-between text-sm text-neutral-300">
              <span>{re.exercise.name}</span>
              {(re.target_sets || re.target_reps) && (
                <span className="text-neutral-500">
                  {re.target_sets ?? '?'} × {re.target_reps ?? '?'}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={handleLogAll}
        disabled={isNavigating || day.exercises.length === 0}
        className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {isNavigating ? 'Starting…' : 'Log All'}
      </button>
    </div>
  );
}
