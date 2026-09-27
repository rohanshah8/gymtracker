import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { getExerciseCategories, getExercises } from '@/lib/queries';
import ExerciseLibraryList from '@/components/ExerciseLibraryList';

export default async function ExercisesPage() {
  const supabase = createSupabaseServerClient();
  const [categories, exercises] = await Promise.all([
    getExerciseCategories(supabase),
    getExercises(supabase),
  ]);

  return (
    <main className="min-h-screen px-4 pb-28 pt-6">
      <h1 className="mb-4 text-2xl font-bold">Exercises</h1>
      <ExerciseLibraryList categories={categories} exercises={exercises} />
    </main>
  );
}
