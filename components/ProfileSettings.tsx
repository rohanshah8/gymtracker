'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile, WeightUnit } from '@/lib/database.types';
import { exportCSVAction, updateProfileAction } from '@/app/(app)/actions';
import SignOutButton from './SignOutButton';

export default function ProfileSettings({ profile, email }: { profile: Profile; email: string }) {
  const router = useRouter();
  const [unit, setUnit] = useState<WeightUnit>(profile.weight_unit);
  const [unitError, setUnitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  function handleUnitChange(nextUnit: WeightUnit) {
    const previousUnit = unit;
    setUnit(nextUnit);
    setUnitError(null);
    startTransition(async () => {
      try {
        await updateProfileAction({ weight_unit: nextUnit });
        router.refresh();
      } catch (err) {
        setUnit(previousUnit); // roll back the optimistic toggle
        setUnitError(err instanceof Error ? err.message : 'Could not save — check your connection.');
      }
    });
  }

  async function handleExport() {
    setIsExporting(true);
    setExportError(null);
    try {
      const csv = await exportCSVAction();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gymtracker-export-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Could not export data — try again.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-surface-raised px-4 py-4">
        <p className="text-sm text-neutral-500">Signed in as</p>
        <p className="font-semibold">{email}</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-neutral-400">Weight unit</p>
        <div className="flex gap-2">
          {(['kg', 'lb'] as const).map((u) => (
            <button
              key={u}
              onClick={() => handleUnitChange(u)}
              disabled={isPending}
              className={`flex-1 rounded-xl py-3 text-sm font-bold uppercase transition-colors ${
                unit === u ? 'bg-brand text-white' : 'bg-surface-raised text-neutral-400'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
        {unitError && <p className="mt-2 text-sm text-red-400">{unitError}</p>}
      </div>

      <div>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full rounded-xl border border-surface-border py-3 text-sm font-semibold disabled:opacity-60"
        >
          {isExporting ? 'Preparing export…' : 'Export all data as CSV'}
        </button>
        {exportError && <p className="mt-2 text-sm text-red-400">{exportError}</p>}
      </div>

      <SignOutButton className="w-full rounded-xl border border-red-500/40 py-3 text-sm font-semibold text-red-400" />
    </div>
  );
}
