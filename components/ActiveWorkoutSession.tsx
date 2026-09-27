'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Exercise, ExerciseCategory, WeightUnit } from '@/lib/database.types';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { estimate1RM } from '@/lib/calculations';
import ExercisePicker from './ExercisePicker';
import SetRow from './SetRow';
import RestTimer from './RestTimer';
import BottomSheet from './BottomSheet';
import ShareCard from './ShareCard';

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
  initialExercises = [],
}: {
  workoutId: string;
  startedAt: string;
  exercises: Exercise[];
  categories: ExerciseCategory[];
  recentIds: string[];
  weightUnit: WeightUnit;
  /** Pre-populates the session — used when arriving via a routine's "Log All". */
  initialExercises?: Exercise[];
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
    isOnline,
    pendingSyncCount,
  } = useWorkoutSession(workoutId);

  const [pickerOpen, setPickerOpen] = useState(initialExercises.length === 0);
  const [elapsed, setElapsed] = useState(0);
  const [prShare, setPrShare] = useState<{ exerciseName: string; weight: number; reps: number } | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);

  function openPRShare(exerciseName: string, weight: number | null, reps: number | null) {
    if (weight == null || reps == null) return; // cardio sets have no weight/reps to share as a lifting PR
    setPrShare({ exerciseName, weight, reps });
  }

  useEffect(() => {
    // Runs once on mount to seed the session from a routine day. addExercise
    // is stable (useCallback with no deps that change here), so this is
    // intentionally not re-run when it changes identity between renders.
    initialExercises.forEach((exercise) => addExercise(exercise));
    // addExercise makes whichever exercise it just added "active", so
    // after seeding the whole list, explicitly re-point at the first one
    // rather than whichever happened to be added last.
    if (initialExercises[0]) setActiveExerciseId(initialExercises[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const id = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000))), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const active = sessionExercises.find((e) => e.exercise.id === activeExerciseId);

  async function handleFinish() {
    setFinishError(null);
    try {
      await finish();
      router.push(`/workout/${workoutId}`);
    } catch {
      // Most likely offline right at the moment of finishing — sets
      // already logged are safe (queued or synced); only "Finish" itself
      // needs a retry once signal is back.
      setFinishError("Couldn't finish the workout — check your connection and try again.");
    }
  }

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-surface-border px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold tabular-nums text-neutral-300">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
          {!isOnline && (
            <span className="rounded-full bg-amber-500/20 px-2 py-1 text-[11px] font-bold uppercase text-amber-400">
              Offline — will sync
            </span>
          )}
          {isOnline && pendingSyncCount > 0 && (
            <span className="rounded-full bg-neutral-700 px-2 py-1 text-[11px] font-bold uppercase text-neutral-300">
              Syncing {pendingSyncCount}…
            </span>
          )}
        </div>
        <button
          onClick={handleFinish}
          disabled={isPending}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          Finish
        </button>
      </header>

      {finishError && (
        <p className="border-b border-surface-border bg-red-500/10 px-4 py-2 text-center text-sm text-red-400">
          {finishError}
        </p>
      )}

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
                  onPRTap={() => openPRShare(active.exercise.name, set.weight, set.reps)}
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

      <RestTimer trigger={restTimerTrigger} />

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

      {prToast && (
        <div className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+1rem)] z-50 rounded-2xl bg-brand px-4 py-3 text-white shadow-lg">
          <p className="font-bold">🏆 New PR on {prToast.exerciseName}!</p>
          <div className="mt-1 flex gap-3 text-sm">
            <button
              onClick={() => {
                openPRShare(prToast.exerciseName, prToast.pr.weight, prToast.pr.reps);
                dismissPRToast();
              }}
              className="font-bold underline"
            >
              Share
            </button>
            <button onClick={dismissPRToast} className="underline">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {prShare && (
        <BottomSheet onClose={() => setPrShare(null)}>
          <ShareCard
            mode="pr"
            exerciseName={prShare.exerciseName}
            weight={prShare.weight}
            unit={weightUnit}
            reps={prShare.reps}
            estimated1RM={estimate1RM(prShare.weight, prShare.reps)}
            onShared={() => setPrShare(null)}
          />
        </BottomSheet>
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
