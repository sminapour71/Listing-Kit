import { renderBrochurePdf, PdfExportError } from '../../lib/server/brochure-pdf';
import { PDF_REQUEST_LIMIT, brochureFilename, type PdfRequest } from '../../lib/pdf-contract';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    const host = request.headers.get('x-forwarded-host')?.split(',')[0].trim() || request.headers.get('host') || new URL(request.url).host;
    if (origin) {
      let sameSite = false;
      try { sameSite = new URL(origin).host === host; } catch {}
      if (!sameSite) return Response.json({ error: 'Please download the brochure from the Listory website.' }, { status: 403 });
    }
    if (!request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error: 'Please choose a brochure format in Listory.' }, { status: 415 });
    // Bound the streamed request as well as the declared size. No uploads or
    // generated PDFs are retained on disk or in a database.
    const reader = request.body?.getReader();
    if (!reader) throw new PdfExportError('The brochure details could not be read. Please try again.', 400);
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > PDF_REQUEST_LIMIT) { await reader.cancel(); throw new PdfExportError('These images are too large. Try fewer brochure photos or smaller image files.', 413); }
      chunks.push(value);
    }
    let input: PdfRequest;
    try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new PdfExportError('The brochure details could not be read. Please generate the package again.', 400); }
    const bytes = await renderBrochurePdf(input, request.signal);
    return new Response(new Uint8Array(bytes), { headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${brochureFilename(input.address, input.format)}"`,
      'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    if (error instanceof PdfExportError) return Response.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
    console.error('Brochure PDF generation failed', error instanceof Error ? process.env.VERCEL ? error.name : error.stack : 'Unknown error');
    return Response.json({ error: 'We couldn’t prepare your brochure right now. Please try again in a moment. Your listing is still here.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
