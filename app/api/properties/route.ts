import { checked, makeToken, productionOrigin, propertyFailure, readJson, sameOrigin, slugify, supabase, tokenHash } from '../../lib/server/properties';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    sameOrigin(request); const origin = productionOrigin(request); const input = await readJson(request, 3000);
    if (typeof input.address !== 'string' || !input.address.trim() || input.address.length > 500) return Response.json({ error: 'Enter a property address before publishing.' }, { status: 400 });
    const token = makeToken(); const base = slugify(input.address);
    for (let attempt = 0; attempt < 8; attempt++) {
      const slug = base + (attempt ? `-${makeToken().slice(0, 6)}` : '');
      const response = await supabase('/rest/v1/listory_properties', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, status: 'draft', listing: { address: input.address.trim() }, brand: {}, sample: input.sample === true, management_hash: tokenHash(token) }) });
      if (response.status === 409) continue;
      await checked(response); return Response.json({ slug, token, url: `${origin}/property/${slug}`, status: 'draft' }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    }
    return Response.json({ error: 'Please try publishing again to create a unique property address.' }, { status: 409 });
  } catch (error) { return propertyFailure(error); }
}
