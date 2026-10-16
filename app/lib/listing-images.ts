import type { ListingImage } from './listing';
async function canvasAsset(canvas: HTMLCanvasElement, name: string, pdfPages?: number): Promise<ListingImage> {
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The image could not be prepared. Please try another file.')), 'image/png'));
  return { id: crypto.randomUUID(), url: URL.createObjectURL(blob), name, pdfPages };
}
export async function prepareListingImage(file: File, allowPdf = false): Promise<ListingImage> {
  if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name}: please choose a file smaller than 20 MB.`);
  if (allowPdf && file.type === 'application/pdf') {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf-assets/pdf.worker.min.mjs';
    const task = pdfjs.getDocument({ data: await file.arrayBuffer(), standardFontDataUrl: '/pdf-assets/standard_fonts/', cMapUrl: '/pdf-assets/cmaps/', cMapPacked: true, wasmUrl: '/pdf-assets/wasm/' });
    try {
      const document = await task.promise;
      const page = await document.getPage(1);
      const size = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(2, 1800 / Math.max(size.width, size.height)) });
      const canvas = window.document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d'); if (!context) throw new Error('Image preview is unavailable.');
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      return await canvasAsset(canvas, file.name, document.numPages);
    } catch { throw new Error(`${file.name}: this PDF could not be opened. Try an unlocked PDF, JPG, or PNG floor plan.`); }
    finally { await task.destroy(); }
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error(`${file.name}: choose a JPG, PNG, or WEBP${allowPdf ? ', or a PDF floor plan' : ''}.`);
  const source = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = source;
    try { await image.decode(); } catch { throw new Error(`${file.name}: this image could not be opened. Please choose another image.`); }
    const scale = Math.min(1, 2000 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d'); if (!context) throw new Error('Image preview is unavailable. Please try another browser.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await canvasAsset(canvas, file.name);
  } finally { URL.revokeObjectURL(source); }
}
