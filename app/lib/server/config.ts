import 'server-only';
export class PropertyError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, ''); const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new PropertyError('Publishing is not connected yet. Please finish the Supabase setup.', 503);
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) throw new PropertyError('The Supabase project address needs to be checked.', 503);
  return { url, key };
}
