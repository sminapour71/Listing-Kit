import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { authCookieOptions } from './app/lib/auth-options';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return response;
  const auth = createServerClient(url, key, {
    cookieOptions: authCookieOptions(request.headers.get('host') || ''),
    cookies: {
      encode: 'tokens-only', getAll: () => request.cookies.getAll(),
      setAll(values, cacheHeaders) {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of values) response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(cacheHeaders)) response.headers.set(name, value);
        response.headers.set('Cache-Control', 'private, no-store, max-age=0');
      },
    },
  });
  // Refresh only. Actual authorization is repeated in the protected page/API.
  await auth.auth.getUser();
  return response;
}
export const config = { matcher: ['/', '/workspace/:path*', '/buy', '/agents', '/fresh', '/open-houses', '/guides', '/neighbourhoods/:path*', '/for-agents', '/agent/:path*', '/property/:path*', '/open-house/:path*', '/sign-in', '/create-account', '/forgot-password', '/reset-password', '/api/properties/:path*', '/api/agent-profile', '/api/agents', '/api/agent-portfolio/:path*', '/api/open-houses/:path*'] };
