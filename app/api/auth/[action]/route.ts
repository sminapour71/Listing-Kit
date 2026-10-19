import { serverAuth, requireAgent } from '../../../lib/server/auth';
import { sameOrigin, readJson, propertyFailure, PropertyError } from '../../../lib/server/properties';
import { siteOrigin } from '../../../lib/site-url';
import { safeReturnPath } from '../../../lib/auth-options';
export const runtime = 'nodejs';
const reply = (data: object, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    sameOrigin(request); const { action } = await context.params;
    if (!['sign-in','sign-up','forgot-password','reset-password','sign-out'].includes(action)) return reply({ error: 'This account action is unavailable.' }, 404);
    const input = await readJson(request, 5000); const auth = await serverAuth();
    if (action === 'sign-out') {
      const { error } = await auth.auth.signOut({ scope: 'local' });
      if (error && !['session_not_found','session_expired'].includes(error.code || '')) throw new PropertyError('We could not sign you out. Please try again.', 502);
      return reply({ redirect: '/sign-in' });
    }
    if (action === 'reset-password') {
      const agent = await requireAgent(); const password = input.password;
      if (typeof password !== 'string' || password.length < 8 || password.length > 128 || input.confirmPassword !== password) throw new PropertyError('Enter matching passwords with at least 8 characters.');
      const { error } = await agent.client.auth.updateUser({ password });
      if (error) throw new PropertyError(error.code === 'same_password' ? 'Choose a password different from your previous one.' : 'Your password could not be updated. Request a new reset link and try again.');
      return reply({ redirect: '/workspace?password=updated' });
    }
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new PropertyError('Enter a valid email address.');
    if (action === 'forgot-password') {
      const { error } = await auth.auth.resetPasswordForEmail(email, { redirectTo: `${siteOrigin()}/auth/callback?next=/reset-password` });
      if (error && ['over_email_send_rate_limit','over_request_rate_limit'].includes(error.code || '')) throw new PropertyError('Email delivery is temporarily limited. Please wait before requesting another link.', 429);
      if(error && !['user_not_found','email_not_found'].includes(error.code||'')) {
        console.error('Password recovery request failed',{code:error.code||'delivery_error'});
        throw new PropertyError('We couldn’t request a reset email. Please try again, or ask the site owner to check the Supabase email settings.',502);
      }
      // Same result whether or not this address has an account.
      return reply({ message: 'If an account exists for this email, you’ll receive a password reset link. Open it in the same browser where you requested it.' });
    }
    const password = input.password;
    if (typeof password !== 'string' || password.length > 128 || password.length < (action === 'sign-up' ? 8 : 1)) throw new PropertyError('Enter your password. New passwords need at least 8 characters.');
    const next = safeReturnPath(input.next);
    const result = action === 'sign-up'
      ? await auth.auth.signUp({ email, password, options: { emailRedirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}` } })
      : await auth.auth.signInWithPassword({ email, password });
    if (result.error) {
      const code = result.error.code || '';
      if (['over_email_send_rate_limit','over_request_rate_limit'].includes(code)) throw new PropertyError('Too many attempts or emails. Please wait before trying again.', 429);
      if (code === 'email_not_confirmed') throw new PropertyError('Please confirm your email using the link from Supabase before signing in.', 401);
      throw new PropertyError(action === 'sign-in' ? 'We couldn’t sign you in. Check your email and password and try again.' : 'We couldn’t create the account. Please check your details or try signing in. If no confirmation email arrives, check the Supabase email settings.', 400);
    }
    if (result.data.session) return reply({ redirect: next });
    return reply({ message: 'Check your inbox for a confirmation link. Open it in this same browser, then sign in to Listory. If you already have an account, use Sign In.' });
  } catch (error) { return propertyFailure(error); }
}
