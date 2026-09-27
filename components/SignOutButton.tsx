'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/app/(auth)/actions';

export default function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    setError(null);
    startTransition(async () => {
      try {
        await signOut();
        router.push('/login');
        router.refresh();
      } catch {
        setError("Couldn't sign out — check your connection and try again.");
      }
    });
  }

  return (
    <div>
      <button
        onClick={handleSignOut}
        disabled={isPending}
        className={className ?? 'text-sm font-semibold text-red-400 disabled:opacity-60'}
      >
        {isPending ? 'Signing out…' : 'Sign out'}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
