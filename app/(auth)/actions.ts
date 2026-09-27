'use server';

import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabaseClient';

export type AuthActionResult = { ok: true } | { ok: false; error: string };

function getOrigin() {
  const h = headers();
  const host = h.get('host');
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  return `${protocol}://${host}`;
}

/** Sends a passwordless magic-link email — the entire signup/login flow. */
export async function sendMagicLink(formData: FormData, next?: string): Promise<AuthActionResult> {
  const email = String(formData.get('email') || '').trim();
  if (!email) return { ok: false, error: 'Enter your email address.' };

  const supabase = createSupabaseServerClient();
  const callback = new URL('/auth/callback', getOrigin());
  if (next) callback.searchParams.set('next', next);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callback.toString(),
    },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Kicks off Google OAuth; redirects the browser to Google, then back to /auth/callback. */
export async function signInWithGoogle(next?: string): Promise<{ url: string } | { error: string }> {
  const supabase = createSupabaseServerClient();
  const callback = new URL('/auth/callback', getOrigin());
  if (next) callback.searchParams.set('next', next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callback.toString(),
    },
  });

  if (error || !data?.url) return { error: error?.message ?? 'Could not start Google sign-in.' };
  return { url: data.url };
}

export async function signOut() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
}
