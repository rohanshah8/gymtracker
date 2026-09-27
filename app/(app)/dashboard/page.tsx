import { createSupabaseServerClient } from '@/lib/supabaseClient';
import SignOutButton from '@/components/SignOutButton';

// Phase 1 placeholder: just prove auth + DB round-trip work end-to-end.
// The real dashboard (stats, "Start Workout", streak) is built in Phase 4.
export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, weight_unit')
    .eq('id', user?.id ?? '')
    .single();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm text-neutral-500">Logged in as</p>
      <p className="text-lg font-semibold">{user?.email}</p>
      {profile && (
        <p className="text-sm text-neutral-400">
          Profile row confirmed: {profile.display_name} · {profile.weight_unit}
        </p>
      )}
      <SignOutButton className="mt-6 rounded-2xl border border-surface-border px-6 py-3 text-sm font-semibold text-red-400" />
    </main>
  );
}
