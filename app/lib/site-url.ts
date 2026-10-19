// One public origin for generated links, QR destinations and SEO metadata.
// An explicit non-secret override supports isolated deployments when needed.
const DEFAULT_SITE_URL = 'https://listory.ca';
export function siteOrigin(value = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL): string {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error('NEXT_PUBLIC_SITE_URL must be a public HTTPS website address.'); }
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.port || url.username || url.password || !url.hostname.includes('.') || /(^|\.)(localhost|local|internal)$/.test(url.hostname) || /^[\d.:\[\]]+$/.test(url.hostname)) throw new Error('NEXT_PUBLIC_SITE_URL must be a public HTTPS origin without a path, query, or credentials.');
  return url.origin;
}
export function propertyUrl(slug: string): string {
  if (!/^[a-z0-9-]{1,110}$/.test(slug)) throw new Error('Invalid property slug.');
  return `${siteOrigin()}/property/${slug}`;
}
