'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import type { Exercise, NewSet, PersonalRecord, WorkoutSet } from '@/lib/database.types';
import { finishWorkoutAction } from '@/app/(app)/actions';
import { createSupabaseBrowserClient } from '@/lib/supabaseClient';
import { getLastPerformance, logSet as insertSet, wasPersonalRecord } from '@/lib/queries';
import type { LastPerformance } from '@/lib/queries';
import { enqueueSet, flushQueue } from '@/lib/offlineQueue';
import { useOnlineStatus } from './useOnlineStatus';

export type SessionSet = WorkoutSet & { isPR: boolean };

export interface SessionExercise {
  exercise: Exercise;
  sets: SessionSet[];
  lastPerformance?: LastPerformance | null;
}

export interface LogSetInput {
  weight?: number;
  reps?: number;
  distance?: number;
  durationSeconds?: number;
  isWarmup?: boolean;
  comment?: string;
}

export interface PRToast {
  exerciseName: string;
  pr: PersonalRecord;
}

/**
 * All the state behind the active-logging screen: which exercises are in
 * this session, their logged sets, the rest-timer trigger, and the
 * PR toast — kept in one hook so /workout/new stays a thin layout while
 * the actual session logic is unit-testable and reusable.
 *
 * logSet talks to Supabase directly via the browser client rather than
 * through a Server Action. That's deliberate: a Server Action is a round
 * trip to the Next.js server, which is just as unreachable as Supabase
 * the moment gym wifi drops — routing straight to Supabase means the one
 * fetch that can fail is the one this hook actually knows how to queue
 * and retry (see lib/offlineQueue.ts), matching the System Design's own
 * architecture diagram (browser talks to Supabase directly) and its
 * offline requirement in §8.
 */
export function useWorkoutSession(workoutId: string) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const isOnline = useOnlineStatus();

  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [restTimerTrigger, setRestTimerTrigger] = useState(0);
  const [prToast, setPrToast] = useState<PRToast | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  const appendSet = useCallback((exerciseId: string, set: SessionSet) => {
    setSessionExercises((prev) =>
      prev.map((e) => (e.exercise.id === exerciseId ? { ...e, sets: [...e.sets, set] } : e))
    );
  }, []);

  const addExercise = useCallback(
    (exercise: Exercise) => {
      setSessionExercises((prev) => {
        if (prev.some((e) => e.exercise.id === exercise.id)) return prev;
        return [...prev, { exercise, sets: [] }];
      });
      setActiveExerciseId(exercise.id);

      // Pre-fill weight/reps from last time — fire-and-forget so picking
      // an exercise never blocks on a network round trip, and a failure
      // (offline) just means no pre-fill this time rather than a crash.
      startTransition(async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;
          const last = await getLastPerformance(supabase, user.id, exercise.id);
          setSessionExercises((prev) =>
            prev.map((e) => (e.exercise.id === exercise.id ? { ...e, lastPerformance: last } : e))
          );
        } catch {
          // Offline or transient failure — the input row just won't have
          // a pre-filled default this time; logging still works.
        }
      });
    },
    [supabase]
  );

  const logSet = useCallback(
    (exerciseId: string, input: LogSetInput): Promise<{ isPR: boolean }> => {
      return new Promise((resolve) => {
        startTransition(async () => {
          const target = sessionExercises.find((e) => e.exercise.id === exerciseId);
          const nextIndex = (target?.sets.length ?? 0) + 1;

          const newSetInput: NewSet = {
            workout_id: workoutId,
            exercise_id: exerciseId,
            set_index: nextIndex,
            weight: input.weight,
            reps: input.reps,
            distance: input.distance,
            duration_seconds: input.durationSeconds,
            is_warmup: input.isWarmup,
            comment: input.comment,
          };

          try {
            const set = await insertSet(supabase, newSetInput);

            const {
              data: { user },
            } = await supabase.auth.getUser();
            const pr = user ? await wasPersonalRecord(supabase, user.id, exerciseId, set.id) : null;

            appendSet(exerciseId, { ...set, isPR: !!pr });
            if (!input.isWarmup) setRestTimerTrigger((t) => t + 1);
            if (pr && target) setPrToast({ exerciseName: target.exercise.name, pr });

            resolve({ isPR: !!pr });
          } catch {
            // Network failure (bad gym wifi, most likely) — queue the
            // write and keep the UI moving as if it had succeeded. The
            // set shows up immediately with a client-generated id; PR
            // detection can't run offline (the trigger lives in
            // Postgres), so it's simply skipped until this set syncs.
            const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            await enqueueSet({ localId, input: newSetInput, queuedAt: new Date().toISOString() });
            setPendingSyncCount((c) => c + 1);

            const optimisticSet: SessionSet = {
              id: localId,
              workout_id: workoutId,
              exercise_id: exerciseId,
              set_index: nextIndex,
              reps: input.reps ?? null,
              weight: input.weight ?? null,
              distance: input.distance ?? null,
              duration_seconds: input.durationSeconds ?? null,
              rpe: null,
              is_warmup: input.isWarmup ?? false,
              comment: input.comment ?? null,
              created_at: new Date().toISOString(),
              isPR: false,
            };
            appendSet(exerciseId, optimisticSet);
            if (!input.isWarmup) setRestTimerTrigger((t) => t + 1);

            resolve({ isPR: false });
          }
        });
      });
    },
    [sessionExercises, workoutId, supabase, appendSet]
  );

  // Flush anything queued from a previous drop the moment connectivity
  // returns — this is what turns "will sync" into an actual sync.
  useEffect(() => {
    if (!isOnline) return;
    let cancelled = false;
    flushQueue((queuedInput) => insertSet(supabase, queuedInput)).then((synced) => {
      if (!cancelled && synced > 0) setPendingSyncCount((c) => Math.max(0, c - synced));
    });
    return () => {
      cancelled = true;
    };
  }, [isOnline, supabase]);

  const finish = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      startTransition(async () => {
        try {
          await finishWorkoutAction(workoutId);
          resolve();
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Could not finish workout.'));
        }
      });
    });
  }, [workoutId]);

  return {
    sessionExercises,
    activeExerciseId,
    setActiveExerciseId,
    addExercise,
    logSet,
    finish,
    restTimerTrigger,
    prToast,
    dismissPRToast: () => setPrToast(null),
    isPending,
    isOnline,
    pendingSyncCount,
  };
}
