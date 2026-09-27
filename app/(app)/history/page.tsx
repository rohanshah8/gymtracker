import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { getWorkoutHistory } from '@/lib/queries';
import { getWorkoutDatesInRangeAction } from '@/app/(app)/actions';
import HistoryCalendarSection from '@/components/HistoryCalendarSection';

export default async function HistoryPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const workouts = user ? await getWorkoutHistory(supabase, user.id, { limit: 200 }) : [];

  return (
    <main className="min-h-screen px-4 pb-28 pt-6">
      <h1 className="mb-4 text-2xl font-bold">History</h1>
      <HistoryCalendarSection workouts={workouts} getTrainedDates={getWorkoutDatesInRangeAction} />
    </main>
  );
}
