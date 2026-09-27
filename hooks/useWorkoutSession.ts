'use client';

import { useCallback, useState, useTransition } from 'react';
import type { Exercise, PersonalRecord, WorkoutSet } from '@/lib/database.types';
import { finishWorkoutAction, getLastPerformanceAction, logSetAction } from '@/app/(app)/actions';
import type { LastPerformance } from '@/lib/queries';

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
 */
export function useWorkoutSession(workoutId: string) {
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [restTimerTrigger, setRestTimerTrigger] = useState(0);
  const [prToast, setPrToast] = useState<PRToast | null>(null);
  const [isPending, startTransition] = useTransition();

  const addExercise = useCallback((exercise: Exercise) => {
    setSessionExercises((prev) => {
      if (prev.some((e) => e.exercise.id === exercise.id)) return prev;
      return [...prev, { exercise, sets: [] }];
    });
    setActiveExerciseId(exercise.id);

    // Pre-fill weight/reps from last time — fire-and-forget so picking an
    // exercise never blocks on a network round trip.
    startTransition(async () => {
      const last = await getLastPerformanceAction(exercise.id);
      setSessionExercises((prev) =>
        prev.map((e) => (e.exercise.id === exercise.id ? { ...e, lastPerformance: last } : e))
      );
    });
  }, []);

  const logSet = useCallback(
    (exerciseId: string, input: LogSetInput): Promise<{ isPR: boolean }> => {
      return new Promise((resolve, reject) => {
        startTransition(async () => {
          try {
            const target = sessionExercises.find((e) => e.exercise.id === exerciseId);
            const nextIndex = (target?.sets.length ?? 0) + 1;

            const { set, pr } = await logSetAction({
              workout_id: workoutId,
              exercise_id: exerciseId,
              set_index: nextIndex,
              weight: input.weight,
              reps: input.reps,
              distance: input.distance,
              duration_seconds: input.durationSeconds,
              is_warmup: input.isWarmup,
              comment: input.comment,
            });

            const sessionSet: SessionSet = { ...set, isPR: !!pr };
            setSessionExercises((prev) =>
              prev.map((e) => (e.exercise.id === exerciseId ? { ...e, sets: [...e.sets, sessionSet] } : e))
            );

            // Warm-up sets don't earn a rest countdown — they're meant to
            // be quick, back-to-back reps to get moving.
            if (!input.isWarmup) {
              setRestTimerTrigger((t) => t + 1);
            }

            if (pr && target) {
              setPrToast({ exerciseName: target.exercise.name, pr });
            }

            resolve({ isPR: !!pr });
          } catch (err) {
            reject(err instanceof Error ? err : new Error('Could not log set.'));
          }
        });
      });
    },
    [sessionExercises, workoutId]
  );

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
  };
}
