import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { config, PropertyError } from './config';
import { authCookieOptions } from '../auth-options';

export async function serverAuth() {
  const store = await cookies(), requestHeaders = await headers(), { url, key } = config();
  // This confidential client exists only on the server. No Supabase key or auth
  // token is sent to client-side JavaScript. Browser sessions use HttpOnly cookies.
  return createServerClient(url, key, {
    cookieOptions: authCookieOptions(requestHeaders.get('host') || ''),
    cookies: {
      encode: 'tokens-only', getAll: () => store.getAll(),
      setAll(values) { try { for (const { name, value, options } of values) store.set(name, value, options); } catch { /* The Proxy refreshes cookies before Server Components render. */ } },
    },
  });
}
export async function currentAgent() {
  const client = await serverAuth();
  // Always validate with Supabase Auth. Never authorize using the cookie's user
  // object, an unverified JWT payload, getSession() alone, or a browser header.
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  const { data: session } = await client.auth.getSession();
  if (!session.session?.access_token) return null;
  return { user: data.user, accessToken: session.session.access_token, client };
}
export async function requireAgent() {
  const agent = await currentAgent();
  if (!agent) throw new PropertyError('Please sign in to your Listory account to continue.', 401);
  return agent;
}
export type AgentSession = NonNullable<Awaited<ReturnType<typeof currentAgent>>>;
/** Authenticated database requests ALWAYS carry the verified user's JWT.
 * The private API key is only a gateway credential; it must never become the
 * Authorization token for a listing/profile operation. RLS enforces the user.
 */
export async function agentRequest(agent: AgentSession, path: string, init: RequestInit = {}) {
  if (!agent.accessToken) throw new PropertyError('Please sign in again.', 401);
  const { url, key } = config();
  return fetch(url + '/rest/v1/' + path, { ...init, headers: { ...init.headers, apikey: key, Authorization: `Bearer ${agent.accessToken}` }, cache: 'no-store', signal: AbortSignal.timeout(25_000) });
}
