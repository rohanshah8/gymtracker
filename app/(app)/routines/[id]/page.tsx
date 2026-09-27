import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { getExerciseCategories, getExercises, getRecentExerciseIds, getRoutineDetail } from '@/lib/queries';
import RoutineEditor from '@/components/RoutineEditor';

export default async function RoutineDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let detail;
  try {
    detail = await getRoutineDetail(supabase, params.id);
  } catch {
    notFound();
  }

  const [exercises, categories, recentIds] = await Promise.all([
    getExercises(supabase),
    getExerciseCategories(supabase),
    user ? getRecentExerciseIds(supabase, user.id) : Promise.resolve([]),
  ]);

  return (
    <main className="min-h-screen px-4 pb-28 pt-6">
      <RoutineEditor
        routine={detail.routine}
        days={detail.days}
        exercises={exercises}
        categories={categories}
        recentIds={recentIds}
      />
    </main>
  );
}
