/** Only the local development/test host uses HTTP; real sites always use Secure. */
export function authCookieOptions(host: string) {
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  return { name: 'listory-auth', path: '/', httpOnly: true, sameSite: 'lax' as const, secure: !local, maxAge: 60 * 60 * 24 * 30 };
}
export function safeReturnPath(value: unknown) {
  if(typeof value !== 'string')return '/workspace';
  const match=/^\/(?:workspace)?(#(?:listings|create-listing|brand-profile|marketing-package|listory-agents))?$/.exec(value);
  return match?'/workspace'+(match[1]||''):'/workspace';
}
