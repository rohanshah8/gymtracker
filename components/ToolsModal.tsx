'use client';

import { useState } from 'react';
import { calculatePlates, estimate1RM } from '@/lib/calculations';
import type { WeightUnit } from '@/lib/database.types';
import BottomSheet from './BottomSheet';

/**
 * 1RM calculator + plate calculator — "one tap from any exercise, not
 * buried in menus" per the design's power-feature principle. Rendered
 * as a bottom-sheet-style modal so it never requires a full navigation.
 */
export default function ToolsModal({ unit, onClose }: { unit: WeightUnit; onClose: () => void }) {
  const [tab, setTab] = useState<'1rm' | 'plates'>('1rm');

  return (
    <BottomSheet onClose={onClose}>
      <div className="mb-4 flex gap-2">
        {(['1rm', 'plates'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl py-2 text-sm font-bold ${
              tab === t ? 'bg-brand text-white' : 'bg-surface-raised text-neutral-400'
            }`}
          >
            {t === '1rm' ? '1RM Calculator' : 'Plate Calculator'}
          </button>
        ))}
      </div>

      {tab === '1rm' ? <OneRepMaxCalculator unit={unit} /> : <PlateCalculator unit={unit} />}

      <button onClick={onClose} className="mt-4 w-full rounded-xl border border-surface-border py-3 text-sm font-semibold">
        Close
      </button>
    </BottomSheet>
  );
}

function OneRepMaxCalculator({ unit }: { unit: WeightUnit }) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const oneRM = weight && reps ? estimate1RM(Number(weight), Number(reps)) : null;

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <ToolInput label={`Weight (${unit})`} value={weight} onChange={setWeight} />
        <ToolInput label="Reps" value={reps} onChange={setReps} />
      </div>
      <div className="rounded-2xl bg-surface-raised px-5 py-4 text-center">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Estimated 1RM</p>
        <p className="text-3xl font-extrabold text-brand">
          {oneRM ? `${Math.round(oneRM)} ${unit}` : '—'}
        </p>
        <p className="mt-1 text-xs text-neutral-500">Epley formula: weight × (1 + reps ÷ 30)</p>
      </div>
    </div>
  );
}

function PlateCalculator({ unit }: { unit: WeightUnit }) {
  const [target, setTarget] = useState('');
  const [bar, setBar] = useState(unit === 'kg' ? '20' : '45');
  const result = target ? calculatePlates(Number(target), Number(bar) || 0, unit) : null;

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <ToolInput label={`Target (${unit})`} value={target} onChange={setTarget} />
        <ToolInput label={`Bar (${unit})`} value={bar} onChange={setBar} />
      </div>
      {result && (
        <div className="rounded-2xl bg-surface-raised px-5 py-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500">Plates per side</p>
          {result.plates.length === 0 ? (
            <p className="text-neutral-400">Just the bar.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {result.plates.map((p, i) => (
                <span key={i} className="rounded-lg bg-brand/20 px-3 py-1 font-bold text-brand">
                  {p}
                </span>
              ))}
            </div>
          )}
          {!result.exact && (
            <p className="mt-2 text-xs text-amber-400">
              {result.remainder} {unit} per side can't be matched exactly with standard plates.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ToolInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex-1">
      <span className="mb-1 block text-xs uppercase tracking-wide text-neutral-500">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-surface-raised px-4 py-3 text-center text-lg font-semibold focus:outline-none"
      />
    </label>
  );
}
