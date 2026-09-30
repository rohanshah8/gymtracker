import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Every route that lives under app/(app)/* requires a signed-in user.
// Route groups don't appear in the URL, so this list is the real paths.
const PROTECTED_PREFIXES = ['/dashboard', '/workout', '/history', '/routines', '/exercises', '/profile'];

export async function middleware(request: NextRequest) {
  // Supabase falls back to the bare Site URL when the redirect isn't allowlisted; forward the code.
  const code = request.nextUrl.searchParams.get('code');
  if (code && request.nextUrl.pathname !== '/auth/callback') {
    const callbackUrl = new URL('/auth/callback', request.url);
    callbackUrl.searchParams.set('code', code);
    return NextResponse.redirect(callbackUrl);
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // IMPORTANT: getUser() (not getSession()) actually revalidates the JWT
  // against Supabase Auth rather than trusting whatever is in the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isLoginPage = pathname.startsWith('/login');

  if (!user && isProtected) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets, images, and the PWA/service
     * worker files next-pwa generates at build time.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-.*|icons/).*)',
  ],
};
