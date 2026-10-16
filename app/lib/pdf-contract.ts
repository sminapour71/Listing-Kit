export type PdfFormat = 'letter' | 'folded';
export type PdfAsset = { id: string; data: string };
export type PdfRequest = { pages: string[]; assets: PdfAsset[]; format: PdfFormat; address: string };
// Stay safely below Vercel's 4.5 MB request/response limit.
export const PDF_REQUEST_LIMIT = 4_100_000;
export const PDF_RESPONSE_LIMIT = 4_400_000;
export const PDF_ASSET_ORIGIN = 'https://brochure-assets.invalid/';
export function brochureFilename(address: string, format: PdfFormat) {
  const street = address.split(',')[0].normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100).replace(/-+$/g, '') || 'Property';
  return `${street}-Listory-${format === 'folded' ? 'Folded' : 'Letter'}.pdf`;
}
