import { redirect } from 'next/navigation';

// The root route has nothing of its own to show — authenticated users
// belong on the dashboard, everyone else belongs on the login screen.
// middleware.ts is the actual auth gate; this redirect just picks a
// sensible landing spot before middleware re-checks the session.
export default function RootPage() {
  redirect('/dashboard');
}
