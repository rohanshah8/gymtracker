'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createRoutineAction } from '@/app/(app)/actions';

export default function CreateRoutineForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const routine = await createRoutineAction(name.trim());
        router.push(`/routines/${routine.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create routine.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New routine, e.g. Push Pull Legs"
          className="flex-1 rounded-xl bg-surface-raised px-4 py-3 text-sm focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          Create
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
