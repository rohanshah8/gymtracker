'use client';

import { useState } from 'react';
import type { WeightUnit } from '@/lib/database.types';
import ToolsModal from './ToolsModal';

/** One-tap access to the 1RM/plate calculators from an exercise's detail screen. */
export default function ExerciseToolsLauncher({ unit }: { unit: WeightUnit }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-surface-raised px-3 py-2 text-sm font-semibold text-neutral-300"
      >
        Tools
      </button>
      {open && <ToolsModal unit={unit} onClose={() => setOpen(false)} />}
    </>
  );
}
