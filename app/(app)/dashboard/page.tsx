import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { getDashboardStats, getProfile, getWorkoutHistory } from '@/lib/queries';
import StatCard from '@/components/StatCard';
import WorkoutCard from '@/components/WorkoutCard';
import SignOutButton from '@/components/SignOutButton';

// The real dashboard (System Design §2.1.10), replacing the Phase 1
// "logged in as {email}" placeholder now that stats/history/profile
// all exist to power it.
export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // middleware.ts already guards this route

  const [stats, profile, recentWorkouts] = await Promise.all([
    getDashboardStats(supabase, user.id),
    getProfile(supabase, user.id),
    getWorkoutHistory(supabase, user.id, { limit: 5 }),
  ]);

  return (
    <main className="min-h-screen px-4 pb-28 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-500">Welcome back</p>
          <h1 className="text-2xl font-bold">{profile.display_name}</h1>
        </div>
        <SignOutButton className="text-sm font-semibold text-neutral-500" />
      </div>

      <Link
        href="/workout/new"
        className="mb-6 block rounded-2xl bg-brand py-5 text-center text-lg font-bold text-white active:scale-[0.99] transition-transform"
      >
        Start Workout
      </Link>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="This Week" value={String(stats.workoutsThisWeek)} sublabel="workouts" />
        <StatCard label="Volume" value={stats.volumeThisWeek.toLocaleString()} sublabel={profile.weight_unit} />
        <StatCard label="Streak" value={String(stats.currentStreak)} sublabel="days" />
      </div>

      <h2 className="mb-2 text-sm font-semibold text-neutral-400">Recent workouts</h2>
      {recentWorkouts.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">
          No workouts yet — start your first one above.
        </p>
      ) : (
        <ul className="space-y-2">
          {recentWorkouts.map((w) => (
            <li key={w.id}>
              <WorkoutCard workout={w} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
