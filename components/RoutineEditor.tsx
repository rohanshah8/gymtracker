'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Exercise, ExerciseCategory, Routine } from '@/lib/database.types';
import type { RoutineDayDetail } from '@/lib/queries';
import {
  addRoutineDayAction,
  addRoutineExerciseAction,
  deleteRoutineAction,
  deleteRoutineDayAction,
} from '@/app/(app)/actions';
import RoutineDayCard from './RoutineDayCard';
import ExercisePicker from './ExercisePicker';

export default function RoutineEditor({
  routine,
  days,
  exercises,
  categories,
  recentIds,
}: {
  routine: Routine;
  days: RoutineDayDetail[];
  exercises: Exercise[];
  categories: ExerciseCategory[];
  recentIds: string[];
}) {
  const router = useRouter();
  const [newDayName, setNewDayName] = useState('');
  const [pickerForDayId, setPickerForDayId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAddDay(e: React.FormEvent) {
    e.preventDefault();
    if (!newDayName.trim()) return;
    startTransition(async () => {
      await addRoutineDayAction(routine.id, newDayName.trim(), days.length);
      setNewDayName('');
      router.refresh();
    });
  }

  function handleDeleteDay(dayId: string) {
    startTransition(async () => {
      await deleteRoutineDayAction(routine.id, dayId);
      router.refresh();
    });
  }

  function handleDeleteRoutine() {
    startTransition(async () => {
      await deleteRoutineAction(routine.id);
      router.push('/routines');
    });
  }

  function handleAddExerciseToDay(exercise: Exercise) {
    if (!pickerForDayId) return;
    const day = days.find((d) => d.id === pickerForDayId);
    startTransition(async () => {
      await addRoutineExerciseAction(routine.id, {
        routine_day_id: pickerForDayId,
        exercise_id: exercise.id,
        exercise_order: day?.exercises.length ?? 0,
      });
      setPickerForDayId(null);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{routine.name}</h1>
        <button onClick={handleDeleteRoutine} disabled={isPending} className="text-sm font-semibold text-red-400">
          Delete routine
        </button>
      </div>

      <div className="mb-6 space-y-3">
        {days.map((day) => (
          <div key={day.id}>
            <RoutineDayCard day={day} onDelete={() => handleDeleteDay(day.id)} />
            <button
              onClick={() => setPickerForDayId(day.id)}
              className="mt-2 w-full rounded-xl border border-dashed border-surface-border py-2 text-xs font-semibold text-neutral-400"
            >
              + Add exercise to {day.day_name}
            </button>
          </div>
        ))}

        {days.length === 0 && (
          <p className="py-4 text-center text-sm text-neutral-500">
            Add a training day (e.g. "Push Day A") to start building this routine.
          </p>
        )}
      </div>

      <form onSubmit={handleAddDay} className="flex gap-2">
        <input
          value={newDayName}
          onChange={(e) => setNewDayName(e.target.value)}
          placeholder="New day name, e.g. Push Day A"
          className="flex-1 rounded-xl bg-surface-raised px-4 py-3 text-sm focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          Add
        </button>
      </form>

      {pickerForDayId && (
        <ExercisePicker
          exercises={exercises}
          categories={categories}
          recentIds={recentIds}
          onSelect={handleAddExerciseToDay}
          onClose={() => setPickerForDayId(null)}
        />
      )}
    </div>
  );
}
