import { serverAuth } from '../../lib/server/auth';
import { safeReturnPath } from '../../lib/auth-options';
export async function GET(request: Request) {
  const url = new URL(request.url), code = url.searchParams.get('code');
  const next = url.searchParams.get('next') === '/reset-password' ? '/reset-password' : safeReturnPath(url.searchParams.get('next'));
  const auth = await serverAuth();
  // Also support Supabase's standard server-rendered email templates. Only a
  // valid, single-use email proof may establish a session; never accept a JWT
  // or user ID supplied in a URL as authenticated identity.
  const tokenHash=url.searchParams.get('token_hash'),type=url.searchParams.get('type');
  const { error } = code && code.length < 4096
    ? await auth.auth.exchangeCodeForSession(code)
    : tokenHash && /^[a-f0-9]{32,256}$/i.test(tokenHash) && (type==='signup'||type==='recovery')
      ? await auth.auth.verifyOtp({token_hash:tokenHash,type}) : {error:true};
  // A relative Location keeps the verified session on the browser's actual
  // origin, including Vercel previews and local hosts behind a reverse proxy.
  // The destination above is restricted to known internal paths.
  return new Response(null,{status:303,headers:{Location:error?'/sign-in?error=link':next,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
}
