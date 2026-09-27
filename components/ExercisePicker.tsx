'use client';

import { useMemo, useState } from 'react';
import type { Exercise, ExerciseCategory } from '@/lib/database.types';

/**
 * Full-screen searchable exercise picker used mid-workout — "Recent"
 * exercises pin to the top (per the design's "no forced decisions"
 * principle) whenever there's no active search query.
 */
export default function ExercisePicker({
  exercises,
  categories,
  recentIds = [],
  onSelect,
  onClose,
}: {
  exercises: Exercise[];
  categories: ExerciseCategory[];
  recentIds?: string[];
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');

  const recent = useMemo(() => {
    if (search.trim()) return [];
    return recentIds
      .map((id) => exercises.find((e) => e.id === id))
      .filter((e): e is Exercise => Boolean(e));
  }, [recentIds, exercises, search]);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? exercises.filter((e) => e.name.toLowerCase().includes(q)) : exercises;

    const byCategory = new Map<string, Exercise[]>();
    for (const ex of filtered) {
      const list = byCategory.get(ex.category_id) ?? [];
      list.push(ex);
      byCategory.set(ex.category_id, list);
    }
    return categories
      .map((category) => ({ category, exercises: byCategory.get(category.id) ?? [] }))
      .filter((g) => g.exercises.length > 0);
  }, [search, exercises, categories]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      <div className="flex items-center gap-3 border-b border-surface-border px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <input
          autoFocus
          type="search"
          placeholder="Search exercises…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl bg-surface-raised px-4 py-3 text-base focus:outline-none"
        />
        <button onClick={onClose} className="text-sm font-semibold text-neutral-400">
          Cancel
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {recent.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Recent</h2>
            <ExerciseButtonList exercises={recent} onSelect={onSelect} />
          </section>
        )}

        {grouped.map(({ category, exercises: list }) => (
          <section key={category.id} className="mb-6">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
              {category.name}
            </h2>
            <ExerciseButtonList exercises={list} onSelect={onSelect} />
          </section>
        ))}

        {recent.length === 0 && grouped.length === 0 && (
          <p className="py-8 text-center text-sm text-neutral-500">No exercises match "{search}".</p>
        )}
      </div>
    </div>
  );
}

function ExerciseButtonList({
  exercises,
  onSelect,
}: {
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
}) {
  return (
    <ul className="space-y-1">
      {exercises.map((ex) => (
        <li key={ex.id}>
          <button
            onClick={() => onSelect(ex)}
            className="flex w-full items-center justify-between rounded-2xl bg-surface-raised px-4 py-3 text-left active:scale-[0.99] transition-transform"
          >
            <span>{ex.name}</span>
            <span className="text-xs text-neutral-500">
              {ex.exercise_type === 'cardio' ? 'Cardio' : ex.equipment ?? ''}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
