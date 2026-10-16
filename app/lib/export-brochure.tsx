'use client';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import BrochurePaper from '../components/brochure-paper';
import type { Listing } from './listing';
import type { BrandProfile } from './brand-profile';
import { PDF_ASSET_ORIGIN, PDF_REQUEST_LIMIT, brochureFilename, type PdfAsset, type PdfFormat, type PdfRequest } from './pdf-contract';

function abortIfNeeded(signal: AbortSignal) { signal.throwIfAborted(); }
async function encodeImage(src: string, photo: boolean, quality: number, signal: AbortSignal, printResolution = 3300) {
  abortIfNeeded(signal);
  const url = new URL(src, window.location.href);
  if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== window.location.origin) throw new Error('One of the images is unavailable. Please choose the image again and retry.');
  const image = new Image(); image.src = src;
  try { await image.decode(); } catch { throw new Error('One of the brochure images could not be opened. Please upload it again and retry.'); }
  abortIfNeeded(signal);
  const max = photo ? image.naturalWidth >= image.naturalHeight ? printResolution : 3300 : 3600;
  const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d'); if (!context) throw new Error('Your browser could not prepare the images. Please try Chrome or Edge.');
  if (photo) { context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const result = canvas.toDataURL(photo ? 'image/jpeg' : 'image/png', quality);
  canvas.width = canvas.height = 0;
  return result;
}

export async function exportBrochure({ listing, brand, sample, qrCode, format, signal }: { listing: Listing; brand: BrandProfile; sample: boolean; qrCode?: string; format: PdfFormat; signal: AbortSignal }) {
  // A separate, hidden React root serializes artwork only. The visible preview
  // and selected page never change, and no application chrome is sent to print.
  const host = document.createElement('div'); host.hidden = true; host.setAttribute('aria-hidden', 'true'); document.body.append(host);
  const root = createRoot(host);
  let payload: string;
  try {
    flushSync(() => root.render(<>{[0, 1, 2, 3].map(page => <BrochurePaper key={page} page={page} listing={listing} brand={brand} sample={sample} qrCode={qrCode} />)}</>));
    const images = Array.from(host.querySelectorAll('img'));
    const sources = [...new Set(images.map(image => image.getAttribute('src')!))];
    const photos = new Set(listing.photos.map(photo => photo.url));
    const ids = new Map(sources.map((source, i) => [source, `image-${i}`]));
    for (const image of images) { image.setAttribute('data-pdf-image', ids.get(image.getAttribute('src')!)!); image.removeAttribute('src'); image.removeAttribute('loading'); image.removeAttribute('srcset'); }
    const pages = Array.from(host.querySelectorAll('article')).map(article => article.outerHTML.replace(/data-pdf-image="(image-\d+)"/g, (_match, id) => `src="${PDF_ASSET_ORIGIN}${id}"`));
    const assets: PdfAsset[] = [];
    for (const src of sources) assets.push({ id: ids.get(src)!, data: await encodeImage(src, photos.has(src), .94, signal) });
    const request: PdfRequest = { pages, assets, format, address: listing.address };
    payload = JSON.stringify(request);
    if (new Blob([payload]).size > PDF_REQUEST_LIMIT) {
      // Keep at least 300 dpi across a Letter-width landscape photo and use
      // only modest photographic compression.
      // Transparent logos and line-art floor plans remain lossless PNGs.
      for (const src of sources.filter(source => photos.has(source))) assets.find(asset => asset.id === ids.get(src))!.data = await encodeImage(src, true, .9, signal, 2550);
      payload = JSON.stringify(request);
      if (new Blob([payload]).size > PDF_REQUEST_LIMIT) throw new Error('These images are too large to export at print quality. Try fewer brochure photos or smaller image files, then download again.');
    }
  } finally { root.unmount(); host.remove(); }
  abortIfNeeded(signal);
  const response = await fetch('/api/brochure-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, signal, cache: 'no-store' });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error || 'We couldn’t prepare your brochure. Please try again in a moment.');
  }
  const pdf = await response.blob();
  if (!pdf.size || !response.headers.get('content-type')?.includes('application/pdf')) throw new Error('The PDF could not be prepared. Please try again.');
  abortIfNeeded(signal);
  const url = URL.createObjectURL(pdf); const link = document.createElement('a');
  link.href = url; link.download = brochureFilename(listing.address, format); document.body.append(link); link.click(); link.remove();
  // Allow browser download handling to consume the blob before releasing it.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
