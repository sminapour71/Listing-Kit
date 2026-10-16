import { ownedProperty, patchProperty, productionOrigin, propertyFailure, readJson, sameOrigin, validateSnapshot } from '../../../lib/server/properties';
export const runtime = 'nodejs';
type Context = { params: Promise<{ slug: string }> };
export async function GET(request: Request, context: Context) {
  try { const { slug } = await context.params; const row = await ownedProperty(request, slug); return Response.json({ slug, status: row.status, url: `${productionOrigin(request)}/property/${slug}` }, { headers: { 'Cache-Control': 'no-store' } }); } catch (e) { return propertyFailure(e); }
}
export async function PUT(request: Request, context: Context) {
  try {
    sameOrigin(request); const { slug } = await context.params; await ownedProperty(request, slug);
    const origin = productionOrigin(request); const snapshot = validateSnapshot(await readJson(request), slug);
    await patchProperty(slug, { ...snapshot, status: 'published' });
    return Response.json({ slug, status: 'published', url: `${origin}/property/${slug}` }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return propertyFailure(e); }
}
export async function DELETE(request: Request, context: Context) {
  try { sameOrigin(request); const { slug } = await context.params; await ownedProperty(request, slug); await patchProperty(slug, { status: 'draft' }); return Response.json({ status: 'draft' }, { headers: { 'Cache-Control': 'no-store' } }); } catch (e) { return propertyFailure(e); }
}
