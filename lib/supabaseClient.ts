/**
 * Two Supabase client factories — one for Client Components (browser),
 * one for Server Components / Route Handlers / Server Actions (server).
 * Both share the same env vars; only the cookie storage differs, per
 * @supabase/ssr's Next.js App Router integration.
 *
 * Never import createSupabaseServerClient from a Client Component
 * ('use client' file) — it depends on next/headers, which only works
 * on the server.
 */
import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fails loudly at build/start time rather than with a cryptic
  // "fetch failed" the first time a query runs.
  // eslint-disable-next-line no-console
  console.warn(
    'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. ' +
      'Copy .env.example to .env.local and fill in your Supabase project values.'
  );
}

/** Use inside Client Components ('use client'). */
export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Use inside Server Components, Route Handlers, and Server Actions.
 * Server Components can't write cookies (Next.js restriction) — the
 * try/catch swallow there is intentional and harmless because
 * middleware.ts is what actually refreshes the session cookie on every
 * request; this client only needs to *read* it in that context.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Called from a Server Component render — safe to ignore;
          // middleware.ts handles session refresh on the next request.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // Same as above.
        }
      },
    },
  });
}
