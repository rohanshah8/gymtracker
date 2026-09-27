'use client';

import { useCallback, useEffect, useState } from 'react';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Month grid with training days highlighted, tap a day to jump to it.
 * Fetches dates for the visible month lazily via `getTrainedDates` so
 * this component stays decoupled from the query layer.
 *
 * Note: workout_date is written using the database's `current_date`
 * (UTC) — see supabase/migrations/0001_init.sql — so a workout logged
 * right around midnight local time could land on the "wrong" calendar
 * day for users far from UTC. The date math in this component and in
 * lib/calculations.ts is careful to stay in local time throughout; the
 * one unavoidable source of skew is that DB-side default.
 */
export default function CalendarView({
  getTrainedDates,
  onSelectDate,
  selectedDate,
}: {
  getTrainedDates: (startDate: string, endDate: string) => Promise<string[]>;
  onSelectDate?: (date: string) => void;
  selectedDate?: string;
}) {
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [trainedDates, setTrainedDates] = useState<Set<string>>(new Set());

  const loadMonth = useCallback(
    (cursor: Date) => {
      getTrainedDates(toLocalISO(startOfMonth(cursor)), toLocalISO(endOfMonth(cursor))).then((dates) =>
        setTrainedDates(new Set(dates))
      );
    },
    [getTrainedDates]
  );

  useEffect(() => {
    loadMonth(monthCursor);
  }, [monthCursor, loadMonth]);

  const days = buildMonthGrid(monthCursor);
  const todayStr = toLocalISO(new Date());

  return (
    <div className="rounded-card bg-surface-raised p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setMonthCursor((m) => addMonths(m, -1))}
          className="rounded-lg px-3 py-1 text-lg text-neutral-400"
          aria-label="Previous month"
        >
          ‹
        </button>
        <p className="font-semibold">
          {monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </p>
        <button
          onClick={() => setMonthCursor((m) => addMonths(m, 1))}
          className="rounded-lg px-3 py-1 text-lg text-neutral-400"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-xs text-neutral-500">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={`blank-${i}`} />;
          const iso = toLocalISO(day);
          const trained = trainedDates.has(iso);
          const isToday = iso === todayStr;
          const isSelected = iso === selectedDate;

          return (
            <button
              key={iso}
              onClick={() => onSelectDate?.(iso)}
              className={`aspect-square rounded-lg text-sm transition-colors ${
                trained ? 'bg-brand font-bold text-white' : 'text-neutral-400 hover:bg-surface'
              } ${isToday && !trained ? 'ring-1 ring-brand' : ''} ${isSelected ? 'ring-2 ring-white' : ''}`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildMonthGrid(monthCursor: Date): Array<Date | null> {
  const first = startOfMonth(monthCursor);
  const last = endOfMonth(monthCursor);
  const leadingBlanks = first.getDay();
  const days: Array<Date | null> = Array(leadingBlanks).fill(null);
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), d));
  }
  return days;
}
