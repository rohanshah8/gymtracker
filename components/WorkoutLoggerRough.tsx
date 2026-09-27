'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Exercise } from '@/lib/database.types';
import { finishWorkoutAction, logSetAction } from '@/app/(app)/actions';

interface LoggedSet {
  id: string;
  exerciseName: string;
  weight: number | null;
  reps: number | null;
  isPR: boolean;
}

export default function WorkoutLoggerRough({
  workoutId,
  exercises,
}: {
  workoutId: string;
  exercises: Exercise[];
}) {
  const router = useRouter();
  const [exerciseId, setExerciseId] = useState(exercises[0]?.id ?? '');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const setsForExercise = loggedSets.filter(
    (s) => s.exerciseName === exercises.find((e) => e.id === exerciseId)?.name
  ).length;

  function handleLogSet(e: React.FormEvent) {
    e.preventDefault();
    const exercise = exercises.find((ex) => ex.id === exerciseId);
    if (!exercise) return;

    setError(null);
    startTransition(async () => {
      try {
        const { set, pr } = await logSetAction({
          workout_id: workoutId,
          exercise_id: exerciseId,
          set_index: setsForExercise + 1,
          weight: weight ? Number(weight) : undefined,
          reps: reps ? Number(reps) : undefined,
        });
        setLoggedSets((prev) => [
          ...prev,
          { id: set.id, exerciseName: exercise.name, weight: set.weight, reps: set.reps, isPR: !!pr },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not log set.');
      }
    });
  }

  function handleFinish() {
    startTransition(async () => {
      await finishWorkoutAction(workoutId);
      router.push(`/workout/${workoutId}`);
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Active Workout</h1>
        <button
          onClick={handleFinish}
          disabled={isPending}
          className="rounded-xl bg-surface-raised px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          Finish
        </button>
      </div>

      <form onSubmit={handleLogSet} className="mb-6 space-y-3 rounded-card bg-surface-raised p-4">
        <select
          value={exerciseId}
          onChange={(e) => setExerciseId(e.target.value)}
          className="w-full rounded-xl bg-surface px-4 py-3 text-base focus:outline-none"
        >
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </select>

        <div className="flex gap-3">
          <input
            type="number"
            inputMode="decimal"
            placeholder="Weight"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-1/2 rounded-xl bg-surface px-4 py-3 text-base focus:outline-none"
          />
          <input
            type="number"
            inputMode="numeric"
            placeholder="Reps"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="w-1/2 rounded-xl bg-surface px-4 py-3 text-base focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-brand py-3 text-base font-bold text-white disabled:opacity-60"
        >
          {isPending ? 'Logging…' : 'Log Set'}
        </button>
      </form>

      <h2 className="mb-2 text-sm font-semibold text-neutral-400">This session</h2>
      <ul className="space-y-1">
        {loggedSets.map((set, i) => (
          <li
            key={set.id}
            className="flex items-center justify-between rounded-xl bg-surface-raised px-4 py-2 text-sm"
          >
            <span>
              {i + 1}. {set.exerciseName}
            </span>
            <span className="flex items-center gap-2">
              {set.weight} × {set.reps}
              {set.isPR && <span title="New PR">🏆</span>}
            </span>
          </li>
        ))}
      </ul>
      {loggedSets.length === 0 && (
        <p className="py-6 text-center text-sm text-neutral-500">No sets logged yet.</p>
      )}
    </div>
  );
}
