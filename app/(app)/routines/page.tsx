import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { getRoutines } from '@/lib/queries';
import CreateRoutineForm from '@/components/CreateRoutineForm';

export default async function RoutinesPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const routines = user ? await getRoutines(supabase, user.id) : [];

  return (
    <main className="min-h-screen px-4 pb-28 pt-6">
      <h1 className="mb-4 text-2xl font-bold">Routines</h1>

      {routines.length === 0 ? (
        <p className="mb-6 py-4 text-center text-sm text-neutral-500">
          No routines yet — create one to “Log All” a full training day in one tap.
        </p>
      ) : (
        <ul className="mb-6 space-y-2">
          {routines.map((r) => (
            <li key={r.id}>
              <Link
                href={`/routines/${r.id}`}
                className="flex items-center justify-between rounded-2xl bg-surface-raised px-4 py-4 active:scale-[0.99] transition-transform"
              >
                <span className="font-semibold">{r.name}</span>
                <span className="text-neutral-500">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateRoutineForm />
    </main>
  );
}
