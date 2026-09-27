import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { getProfile } from '@/lib/queries';
import ProfileSettings from '@/components/ProfileSettings';

export default async function ProfilePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfile(supabase, user.id);

  return (
    <main className="min-h-screen px-4 pb-28 pt-6">
      <h1 className="mb-6 text-2xl font-bold">Profile</h1>
      <ProfileSettings profile={profile} email={user.email ?? ''} />
    </main>
  );
}
