import { describePhoto } from '../../../../lib/photo-fitting';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { boundedBody, checked, config, ownedProperty, PropertyError, propertyFailure, sameOrigin, supabase } from '../../../../lib/server/properties';
export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    sameOrigin(request); const { slug } = await context.params; await ownedProperty(request, slug);
    const body = await boundedBody(request, 3_800_000);
    const image = await sharp(body, { limitInputPixels: 20_000_000 }).metadata().catch(() => null);
    if (!image || !['jpeg', 'png', 'webp'].includes(image.format || '') || !image.width || !image.height || image.width > 5000 || image.height > 5000) throw new PropertyError('Please use a JPG, PNG, or WEBP image.');
    const ext = image.format === 'jpeg' ? 'jpg' : image.format;
    const path = `${slug}/${randomUUID()}.${ext}`;
    await checked(await supabase(`/storage/v1/object/listory-published/${path}`, { method: 'POST', headers: { 'Content-Type': `image/${image.format}`, 'x-upsert': 'false' }, body: new Uint8Array(body) }));
    return Response.json({ ...describePhoto(image.width, image.height), url: `${config().url}/storage/v1/object/public/listory-published/${path}` }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return propertyFailure(e); }
}
