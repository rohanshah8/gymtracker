'use client';

import { useMemo, useState } from 'react';
import type { Workout } from '@/lib/database.types';
import CalendarView from './CalendarView';
import WorkoutCard from './WorkoutCard';

/** Calendar + list, wired together client-side so tapping a day filters the list below it. */
export default function HistoryCalendarSection({
  workouts,
  getTrainedDates,
}: {
  workouts: Workout[];
  getTrainedDates: (startDate: string, endDate: string) => Promise<string[]>;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const visibleWorkouts = useMemo(
    () => (selectedDate ? workouts.filter((w) => w.workout_date === selectedDate) : workouts),
    [workouts, selectedDate]
  );

  return (
    <div>
      <div className="mb-4">
        <CalendarView
          getTrainedDates={getTrainedDates}
          selectedDate={selectedDate ?? undefined}
          onSelectDate={(date) => setSelectedDate((prev) => (prev === date ? null : date))}
        />
        {selectedDate && (
          <button onClick={() => setSelectedDate(null)} className="mt-2 text-xs font-semibold text-brand">
            Clear filter — showing {selectedDate}
          </button>
        )}
      </div>

      {visibleWorkouts.length === 0 ? (
        <p className="py-12 text-center text-sm text-neutral-500">
          {selectedDate ? 'No workout logged on this day.' : 'No workouts logged yet — start one from the Dashboard.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {visibleWorkouts.map((w) => (
            <li key={w.id}>
              <WorkoutCard workout={w} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
