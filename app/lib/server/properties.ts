import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { emptyListing, type Listing } from '../listing';
import type { BrandProfile } from '../brand-profile';

export class PropertyError extends Error { constructor(message: string, public status = 400) { super(message); } }
export type PropertyRecord = { slug: string; status: 'draft' | 'published'; listing: Listing; brand: BrandProfile; sample: boolean; management_hash: string };
export function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, ''); const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new PropertyError('Publishing is not connected yet. Please finish the Supabase setup.', 503);
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) throw new PropertyError('The Supabase project address needs to be checked.', 503);
  return { url, key };
}
export async function supabase(path: string, init: RequestInit = {}) {
  const { url, key } = config();
  const response = await fetch(url + path, { ...init, headers: { apikey: key, ...init.headers }, cache: 'no-store', signal: AbortSignal.timeout(25_000) });
  return response;
}
export async function checked(response: Response) {
  if (response.ok) return response;
  let code = ''; try { code = (await response.json()).code || ''; } catch {}
  if (['PGRST205', '42P01'].includes(code)) throw new PropertyError('Please run the Listory setup script in Supabase before publishing.', 503);
  console.error('Property storage request failed', { status: response.status, code });
  throw new PropertyError('We could not save the property page. Your listing is still here; please try again.', 502);
}
export function productionOrigin(request: Request) {
  const hostname = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const origin = hostname ? `https://${hostname.replace(/^https?:\/\//, '').replace(/\/$/, '')}` : process.env.VERCEL_ENV === 'production' ? request.headers.get('origin') : null;
  if (!origin) throw new PropertyError('Publishing is available on the production website. Open Listory’s live website to publish a real public link.', 503);
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.pathname !== '/' || !url.hostname.includes('.') || /(^|\.)(localhost|local|internal)$/.test(url.hostname) || /^[\d.:\[\]]+$/.test(url.hostname) || url.username || url.password) throw new PropertyError('The production website address needs to be checked before publishing.', 503);
  return url.origin;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host')?.split(',')[0].trim() || request.headers.get('host') || new URL(request.url).host;
  let valid = false;
  try { valid = Boolean(origin) && new URL(origin!).host === host; } catch {}
  if (!valid) throw new PropertyError('Please publish from the Listory website.', 403);
}
export async function readJson(request: Request, limit = 120_000) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new PropertyError('The property details could not be read.', 415);
  const data = await boundedBody(request, limit);
  try { return JSON.parse(data.toString('utf8')); } catch { throw new PropertyError('The property details could not be read.'); }
}
export async function boundedBody(request: Request, limit: number) {
  const reader = request.body?.getReader(); if (!reader) throw new PropertyError('No property details were received.');
  let length = 0; const chunks: Uint8Array[] = [];
  while (true) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > limit) { await reader.cancel(); throw new PropertyError('This upload is too large. Please use a smaller image.', 413); } chunks.push(value); }
  return Buffer.concat(chunks);
}
export function slugify(address: string) { return address.split(',')[0].normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90).replace(/-+$/g, '') || 'property'; }
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export const makeToken = () => randomBytes(32).toString('hex');
export async function getProperty(slug: string): Promise<PropertyRecord | null> {
  if (!/^[a-z0-9-]{1,110}$/.test(slug)) return null;
  const response = await checked(await supabase(`/rest/v1/listory_properties?slug=eq.${slug}&select=slug,status,listing,brand,sample,management_hash`));
  const rows = await response.json(); return rows[0] || null;
}
export async function ownedProperty(request: Request, slug: string) {
  const token = request.headers.get('x-listory-management') || '';
  if (!/^[a-f0-9]{64}$/.test(token)) throw new PropertyError('This browser does not have permission to manage that property page.', 403);
  const row = await getProperty(slug);
  if (!row || !timingSafeEqual(Buffer.from(tokenHash(token)), Buffer.from(row.management_hash))) throw new PropertyError('This browser does not have permission to manage that property page.', 403);
  return row;
}
export async function patchProperty(slug: string, data: object) { await checked(await supabase(`/rest/v1/listory_properties?slug=eq.${slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, updated_at: new Date().toISOString() }) })); }
export function validateSnapshot(value: unknown, slug: string): { listing: Listing; brand: BrandProfile } {
  const data = value as { listing?: Record<string, unknown>; brand?: Record<string, unknown> };
  if (!data?.listing || !data.brand) throw new PropertyError('The property information is incomplete.');
  const listing = { ...emptyListing };
  for (const key of Object.keys(emptyListing).filter(k => !['photos', 'floorPlan'].includes(k))) {
    const text = data.listing[key]; const max = ['description', 'features'].includes(key) ? 15_000 : 500;
    if (typeof text !== 'string' || text.length > max) throw new PropertyError('Some property details are too long or could not be read.');
    (listing as unknown as Record<string, unknown>)[key] = text.trim();
  }
  if (!listing.address) throw new PropertyError('Enter a property address before publishing.');
  const prefix = config().url + `/storage/v1/object/public/listory-published/${slug}/`;
  function imageUrl(url: unknown) { if (typeof url !== 'string' || !url.startsWith(prefix) || !/^[a-f0-9-]+\.(jpg|png|webp)$/.test(url.slice(prefix.length))) throw new PropertyError('Please upload the property images again.'); return url; }
  function image(value: unknown, index: number) { const v = value as { url?: unknown; name?: unknown; pdfPages?: unknown }; return { id: `published-${index}`, url: imageUrl(v?.url), name: typeof v.name === 'string' ? v.name.slice(0, 150) : 'Property image', ...(Number.isInteger(v.pdfPages) && Number(v.pdfPages) > 0 && Number(v.pdfPages) < 1000 ? { pdfPages: Number(v.pdfPages) } : {}) }; }
  if (!Array.isArray(data.listing.photos) || data.listing.photos.length > 16) throw new PropertyError('Choose up to 16 property photos.');
  listing.photos = data.listing.photos.map(image); listing.floorPlan = data.listing.floorPlan ? image(data.listing.floorPlan, 17) : null;
  const brand = {} as BrandProfile;
  for (const key of ['firstName', 'lastName', 'title', 'teamName', 'brokerageName', 'phone', 'email', 'website', 'instagram', 'primaryColour', 'secondaryColour', 'headshot', 'personalLogo', 'brokerageLogo'] as (keyof BrandProfile)[]) {
    const v = data.brand[key]; if (typeof v !== 'string') throw new PropertyError('The Brand Profile could not be read.');
    if (['headshot', 'personalLogo', 'brokerageLogo'].includes(key)) brand[key] = v ? imageUrl(v) : '';
    else { if (v.length > 250) throw new PropertyError('Some Brand Profile details are too long.'); brand[key] = v.trim(); }
  }
  if (![brand.primaryColour, brand.secondaryColour].every(c => /^#[a-f0-9]{6}$/i.test(c))) throw new PropertyError('Please check both brand colours.');
  return { listing, brand };
}
export function propertyFailure(error: unknown) {
  if (error instanceof PropertyError) return Response.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  console.error('Property page operation failed', error instanceof Error ? error.name : 'Unknown error');
  return Response.json({ error: 'We could not prepare the property page. Your listing is still here; please try again.' }, { status: 500 });
}
