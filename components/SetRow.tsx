'use client';

import { useState } from 'react';
import type { Exercise, WeightUnit } from '@/lib/database.types';

interface LoggedRowProps {
  mode: 'logged';
  setIndex: number;
  weight: number | null;
  reps: number | null;
  distance?: number | null;
  durationSeconds?: number | null;
  isWarmup: boolean;
  comment?: string | null;
  isPR: boolean;
  previousPerformance?: { weight: number | null; reps: number | null } | null;
  onPRTap?: () => void;
}

interface InputRowProps {
  mode: 'input';
  exercise: Exercise;
  unit: WeightUnit;
  setIndex: number;
  defaultWeight?: number | null;
  defaultReps?: number | null;
  isPending?: boolean;
  onLogSet: (input: { weight?: number; reps?: number; isWarmup: boolean; comment?: string }) => void;
}

type SetRowProps = LoggedRowProps | InputRowProps;

/**
 * Dual-mode per the system design's component list: in 'input' mode this
 * IS the weight/reps + warm-up + comment + "Log Set" row (the thing you
 * interact with to log a new set); in 'logged' mode it's the compact,
 * read-only row for a set you already logged, with a PR trophy and a
 * tap-to-reveal "last time" comparison.
 */
export default function SetRow(props: SetRowProps) {
  if (props.mode === 'logged') return <LoggedRow {...props} />;
  return <InputRow {...props} />;
}

function LoggedRow({
  setIndex,
  weight,
  reps,
  distance,
  durationSeconds,
  isWarmup,
  comment,
  isPR,
  previousPerformance,
  onPRTap,
}: LoggedRowProps) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="rounded-xl bg-surface-raised px-4 py-2">
      <div className="flex items-center justify-between text-sm">
        <button
          onClick={() => setShowHistory((s) => !s)}
          className="flex flex-1 items-center gap-2 text-left text-neutral-200"
        >
          <span className="text-neutral-500">{setIndex}</span>
          <span className="font-medium">
            {weight != null && reps != null
              ? `${weight} × ${reps}`
              : distance != null
                ? `${distance} · ${Math.round((durationSeconds ?? 0) / 60)} min`
                : '—'}
          </span>
          {isWarmup && (
            <span className="rounded-full bg-neutral-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-300">
              Warm-up
            </span>
          )}
        </button>
        <div className="flex items-center gap-3">
          {comment && (
            <span title={comment} className="text-sm">
              💬
            </span>
          )}
          {isPR && (
            <button onClick={onPRTap} title="New PR — tap to share" className="text-lg leading-none">
              🏆
            </button>
          )}
        </div>
      </div>
      {showHistory && (
        <p className="mt-1 pl-6 text-xs text-neutral-500">
          {previousPerformance
            ? `Last time: ${previousPerformance.weight ?? '—'} × ${previousPerformance.reps ?? '—'}`
            : 'No previous performance on record.'}
        </p>
      )}
    </div>
  );
}

function InputRow({ exercise, unit, setIndex, defaultWeight, defaultReps, isPending, onLogSet }: InputRowProps) {
  const [weight, setWeight] = useState(defaultWeight != null ? String(defaultWeight) : '');
  const [reps, setReps] = useState(defaultReps != null ? String(defaultReps) : '');
  const [isWarmup, setIsWarmup] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const isCardio = exercise.exercise_type === 'cardio';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onLogSet({
      weight: !isCardio && weight ? Number(weight) : undefined,
      reps: !isCardio && reps ? Number(reps) : undefined,
      isWarmup,
      comment: comment || undefined,
    });
    setComment('');
    setShowComment(false);
    setIsWarmup(false);
  }

  return (
    <form onSubmit={handleSubmit} className="thumb-zone-action rounded-t-card bg-surface-raised px-4 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-400">Set {setIndex}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsWarmup((w) => !w)}
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase transition-colors ${
              isWarmup ? 'bg-brand text-white' : 'bg-surface text-neutral-500'
            }`}
          >
            Warm-up
          </button>
          <button
            type="button"
            onClick={() => setShowComment((c) => !c)}
            aria-label="Add comment"
            className={`text-lg ${comment ? 'opacity-100' : 'opacity-40'}`}
          >
            💬
          </button>
        </div>
      </div>

      {showComment && (
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comment on this set…"
          className="mb-3 w-full rounded-xl bg-surface px-4 py-2 text-sm focus:outline-none"
        />
      )}

      {!isCardio ? (
        <div className="mb-3 flex gap-3">
          <NumberField label={unit} value={weight} onChange={setWeight} step={2.5} />
          <NumberField label="reps" value={reps} onChange={setReps} step={1} />
        </div>
      ) : (
        <p className="mb-3 text-sm text-neutral-500">
          Cardio logging (distance/duration) is coming in a later update — log resistance sets for now.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mb-4 w-full rounded-2xl bg-brand py-4 text-lg font-bold text-white active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {isPending ? 'Logging…' : 'Log Set'}
      </button>
    </form>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step: number;
}) {
  function bump(delta: number) {
    const current = parseFloat(value) || 0;
    const next = Math.max(0, Math.round((current + delta) * 100) / 100);
    onChange(String(next));
  }

  return (
    <div className="flex-1">
      <span className="mb-1 block text-xs uppercase tracking-wide text-neutral-500">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => bump(-step)}
          className="h-11 w-11 flex-shrink-0 rounded-xl bg-surface text-lg font-bold text-neutral-300 active:scale-95"
        >
          −
        </button>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 rounded-xl bg-surface px-2 py-3 text-center text-lg font-semibold focus:outline-none"
        />
        <button
          type="button"
          onClick={() => bump(step)}
          className="h-11 w-11 flex-shrink-0 rounded-xl bg-surface text-lg font-bold text-neutral-300 active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}
