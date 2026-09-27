'use client';

import { Suspense, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { sendMagicLink, signInWithGoogle } from '../actions';

// useSearchParams() opts a component into client-only rendering unless a
// Suspense boundary catches it — without this wrapper, `next build` fails
// with "useSearchParams() should be wrapped in a suspense boundary".
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? undefined;

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get('error') ? 'That sign-in link expired or was already used — try again.' : null
  );
  const [isPending, startTransition] = useTransition();

  function handleMagicLink(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await sendMagicLink(formData, next);
      if (result.ok) {
        setSent(true);
      } else {
        setError(result.error);
      }
    });
  }

  function handleGoogle() {
    setError(null);
    startTransition(async () => {
      const result = await signInWithGoogle(next);
      if ('url' in result) {
        window.location.href = result.url;
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-2xl font-extrabold text-white">
            GT
          </div>
          <h1 className="text-2xl font-bold">GymTracker</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Log a set in two taps. No password to remember.
          </p>
        </div>

        {sent ? (
          <div className="rounded-card border border-surface-border bg-surface-raised p-6 text-center">
            <p className="text-lg font-semibold">Check your email</p>
            <p className="mt-2 text-sm text-neutral-400">
              We sent a sign-in link to <span className="text-neutral-200">{email}</span>. Open it
              on this device to finish signing in.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-4 text-sm font-semibold text-brand"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form action={handleMagicLink} className="space-y-3">
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-surface-border bg-surface-raised px-5 py-4 text-base text-white placeholder:text-neutral-500 focus:border-brand focus:outline-none"
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-2xl bg-brand py-4 text-lg font-bold text-white active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {isPending ? 'Sending…' : 'Send magic link'}
            </button>

            <div className="flex items-center gap-3 py-2 text-xs uppercase tracking-wide text-neutral-500">
              <span className="h-px flex-1 bg-surface-border" />
              or
              <span className="h-px flex-1 bg-surface-border" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={isPending}
              className="w-full rounded-2xl border border-surface-border bg-transparent py-4 text-base font-semibold text-white active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              Continue with Google
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
