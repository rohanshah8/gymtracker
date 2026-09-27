'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/app/(auth)/actions';

export default function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOut();
      router.push('/login');
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isPending}
      className={className ?? 'text-sm font-semibold text-red-400 disabled:opacity-60'}
    >
      {isPending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
