'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Exercise, ExerciseCategory, WeightUnit } from '@/lib/database.types';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import ExercisePicker from './ExercisePicker';
import SetRow from './SetRow';
import RestTimer from './RestTimer';

/**
 * The core screen (System Design §6.2): current exercise name up top,
 * logged sets for it below, a bottom-anchored input row to log the next
 * set, and a rest timer that auto-appears after each non-warm-up set.
 * BottomNav is hidden on this route (see components/BottomNav.tsx) so
 * this input row owns the entire thumb zone.
 */
export default function ActiveWorkoutSession({
  workoutId,
  startedAt,
  exercises,
  categories,
  recentIds,
  weightUnit,
}: {
  workoutId: string;
  startedAt: string;
  exercises: Exercise[];
  categories: ExerciseCategory[];
  recentIds: string[];
  weightUnit: WeightUnit;
}) {
  const router = useRouter();
  const {
    sessionExercises,
    activeExerciseId,
    setActiveExerciseId,
    addExercise,
    logSet,
    finish,
    restTimerTrigger,
    prToast,
    dismissPRToast,
    isPending,
  } = useWorkoutSession(workoutId);

  const [pickerOpen, setPickerOpen] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const id = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000))), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const active = sessionExercises.find((e) => e.exercise.id === activeExerciseId);

  async function handleFinish() {
    await finish();
    router.push(`/workout/${workoutId}`);
  }

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-surface-border px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <span className="text-lg font-bold tabular-nums text-neutral-300">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
        <button
          onClick={handleFinish}
          disabled={isPending}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          Finish
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-64">
        {active ? (
          <>
            <button
              onClick={() => setPickerOpen(true)}
              className="mb-4 text-left text-2xl font-bold"
            >
              {active.exercise.name} <span className="text-sm text-neutral-500">▾</span>
            </button>

            <div className="mb-4 space-y-2">
              {active.sets.map((set, i) => (
                <SetRow
                  key={set.id}
                  mode="logged"
                  setIndex={i + 1}
                  weight={set.weight}
                  reps={set.reps}
                  distance={set.distance}
                  durationSeconds={set.duration_seconds}
                  isWarmup={set.is_warmup}
                  comment={set.comment}
                  isPR={set.isPR}
                  previousPerformance={active.lastPerformance}
                />
              ))}
              {active.sets.length === 0 && (
                <p className="py-4 text-center text-sm text-neutral-500">
                  {active.lastPerformance
                    ? `Last time: ${active.lastPerformance.weight ?? '—'} × ${active.lastPerformance.reps ?? '—'}`
                    : 'First time logging this one — no history yet.'}
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="py-12 text-center text-neutral-500">Pick an exercise to get started.</p>
        )}

        {sessionExercises.length > 0 && sessionExercises.length > 1 && (
          <ExerciseTabs
            sessionExercises={sessionExercises}
            activeExerciseId={activeExerciseId}
            onPick={setActiveExerciseId}
          />
        )}

        {sessionExercises.length > 0 && (
          <button
            onClick={() => setPickerOpen(true)}
            className="w-full rounded-2xl border border-dashed border-surface-border py-4 text-sm font-semibold text-neutral-300"
          >
            + Add Exercise
          </button>
        )}
      </div>

      {active && (
        <SetRow
          mode="input"
          exercise={active.exercise}
          unit={weightUnit}
          setIndex={active.sets.length + 1}
          defaultWeight={active.lastPerformance?.weight}
          defaultReps={active.lastPerformance?.reps}
          isPending={isPending}
          onLogSet={(input) => logSet(active.exercise.id, input)}
        />
      )}

      <RestTimer trigger={restTimerTrigger} />

      {prToast && (
        <div className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+1rem)] z-50 rounded-2xl bg-brand px-4 py-3 text-white shadow-lg">
          <p className="font-bold">🏆 New PR on {prToast.exerciseName}!</p>
          <button onClick={dismissPRToast} className="mt-1 text-sm underline">
            Dismiss
          </button>
        </div>
      )}

      {pickerOpen && (
        <ExercisePicker
          exercises={exercises}
          categories={categories}
          recentIds={recentIds}
          onSelect={(exercise) => {
            addExercise(exercise);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

function ExerciseTabs({
  sessionExercises,
  activeExerciseId,
  onPick,
}: {
  sessionExercises: ReturnType<typeof useWorkoutSession>['sessionExercises'];
  activeExerciseId: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto">
      {sessionExercises.map((e) => (
        <button
          key={e.exercise.id}
          onClick={() => onPick(e.exercise.id)}
          className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
            e.exercise.id === activeExerciseId ? 'bg-brand text-white' : 'bg-surface-raised text-neutral-400'
          }`}
        >
          {e.exercise.name}
        </button>
      ))}
    </div>
  );
}
