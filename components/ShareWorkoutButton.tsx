'use client';

import { useState } from 'react';
import type { WeightUnit } from '@/lib/database.types';
import BottomSheet from './BottomSheet';
import ShareCard from './ShareCard';

/**
 * The Share Card entry point on a finished workout's detail page
 * (System Design §6.3 / Flow D). Only rendered for workouts that have
 * an ended_at — see app/(app)/workout/[id]/page.tsx.
 */
export default function ShareWorkoutButton(props: {
  workoutTitle: string;
  date: string;
  durationMinutes: number;
  totalVolume: number;
  unit: WeightUnit;
  exerciseCount: number;
  setCount: number;
  prsHitCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl bg-brand py-4 text-base font-bold text-white active:scale-[0.98] transition-transform"
      >
        Share Workout
      </button>

      {open && (
        <BottomSheet onClose={() => setOpen(false)}>
          <ShareCard
            mode="workout"
            workoutTitle={props.workoutTitle}
            date={props.date}
            durationMinutes={props.durationMinutes}
            totalVolume={props.totalVolume}
            unit={props.unit}
            exerciseCount={props.exerciseCount}
            setCount={props.setCount}
            prsHitCount={props.prsHitCount}
            onShared={() => setOpen(false)}
          />
        </BottomSheet>
      )}
    </>
  );
}
