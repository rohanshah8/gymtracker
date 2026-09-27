'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import type { Exercise, ExerciseCategory } from '@/lib/database.types';
import { createCustomExerciseAction } from '@/app/(app)/actions';

export default function ExerciseLibraryList({
  categories,
  exercises,
}: {
  categories: ExerciseCategory[];
  exercises: Exercise[];
}) {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? exercises.filter((e) => e.name.toLowerCase().includes(q)) : exercises;

    const byCategory = new Map<string, Exercise[]>();
    for (const exercise of filtered) {
      const list = byCategory.get(exercise.category_id) ?? [];
      list.push(exercise);
      byCategory.set(exercise.category_id, list);
    }
    return categories
      .map((category) => ({ category, exercises: byCategory.get(category.id) ?? [] }))
      .filter((group) => group.exercises.length > 0);
  }, [search, exercises, categories]);

  return (
    <div>
      <input
        type="search"
        placeholder="Search exercises…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded-2xl border border-surface-border bg-surface-raised px-5 py-3 text-base placeholder:text-neutral-500 focus:border-brand focus:outline-none"
      />

      {grouped.map(({ category, exercises: list }) => (
        <section key={category.id} className="mb-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
            {category.name}
          </h2>
          <ul className="space-y-1">
            {list.map((exercise) => (
              <li key={exercise.id}>
                <Link
                  href={`/exercises/${exercise.id}`}
                  className="flex items-center justify-between rounded-2xl bg-surface-raised px-4 py-3 active:scale-[0.99] transition-transform"
                >
                  <span>{exercise.name}</span>
                  <span className="text-xs text-neutral-500">
                    {exercise.exercise_type === 'cardio' ? 'Cardio' : exercise.equipment ?? ''}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {grouped.length === 0 && (
        <p className="py-8 text-center text-sm text-neutral-500">No exercises match "{search}".</p>
      )}

      {showAddForm ? (
        <AddCustomExerciseForm categories={categories} onDone={() => setShowAddForm(false)} />
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="mt-4 w-full rounded-2xl border border-dashed border-surface-border py-4 text-sm font-semibold text-neutral-300"
        >
          + Add custom exercise
        </button>
      )}
    </div>
  );
}

function AddCustomExerciseForm({
  categories,
  onDone,
}: {
  categories: ExerciseCategory[];
  onDone: () => void;
}) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [type, setType] = useState<'resistance' | 'cardio'>('resistance');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !categoryId) {
      setError('Name and category are required.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createCustomExerciseAction({ name: name.trim(), category_id: categoryId, exercise_type: type });
        onDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not add exercise.');
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 space-y-3 rounded-card border border-surface-border bg-surface-raised p-4"
    >
      <input
        placeholder="Exercise name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-xl bg-surface px-4 py-3 text-base focus:outline-none"
        autoFocus
      />
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="w-full rounded-xl bg-surface px-4 py-3 text-base focus:outline-none"
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        {(['resistance', 'cardio'] as const).map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold capitalize ${
              type === t ? 'bg-brand text-white' : 'bg-surface text-neutral-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDone}
          className="flex-1 rounded-xl border border-surface-border py-3 text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {isPending ? 'Adding…' : 'Add exercise'}
        </button>
      </div>
    </form>
  );
}
