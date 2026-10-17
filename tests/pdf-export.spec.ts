import { type Page, type Download } from '@playwright/test';
import { test, expect } from './helpers/visual-fixture';
import { PDFDocument, Duplex, PrintScaling } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import type { PdfFormat } from '../app/lib/pdf-contract';

test.setTimeout(120_000);
async function parsePdf(download: Download) {
  const file = await download.path(); expect(file).toBeTruthy();
  const bytes = await readFile(file!);
  const lib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = lib.getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }); const document = await task.promise;
  const pages = [];
  try {
    for (let i = 1; i <= document.numPages; i++) {
      const page = await document.getPage(i); const text = await page.getTextContent(); const ops = await page.getOperatorList();
      const items = text.items.filter(item => 'str' in item).map(item => ({ text: item.str, x: item.transform[4], y: item.transform[5], width: item.width }));
      const images = ops.fnArray.flatMap((op, index) => op === lib.OPS.paintImageXObject ? [ops.argsArray[index]] : []);
      const colours = ops.fnArray.flatMap((op, index) => op === lib.OPS.setFillRGBColor ? [ops.argsArray[index][0]] : []);
      const viewport = page.getViewport({ scale: 1 });
      pages.push({ text: items.map(item => item.text).join(' '), items, images, colours, width: viewport.width, height: viewport.height });
    }
  } finally { await task.destroy(); }
  return { bytes, pages, document: await PDFDocument.load(bytes) };
}
async function openPackage(page: Page) { await page.goto('/#marketing-package'); await expect(page.getByRole('heading', { name: 'Marketing Package', exact: true })).toBeVisible(); }
async function downloadPdf(page: Page, format: PdfFormat) {
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const response = page.waitForResponse(response => response.url().endsWith('/api/brochure-pdf'), { timeout: 60_000 });
  const pending = page.waitForEvent('download', { timeout: 65_000 }).catch(() => null);
  await page.getByRole('button', { name: format === 'letter' ? /Standard 8.5/ : /Folded 11/ }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Preparing brochure...');
  const result = await response;
  expect(result.status(), result.ok() ? '' : await result.text()).toBe(200);
  const file = await pending;
  expect(file).toBeTruthy();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeEnabled();
  return file;
}
const normalise = (value: string) => value.replace(/\s+/g, '').toLowerCase();
function checkNoUi(text: string) {
  for (const label of ['Download PDF', 'Back to Listing', 'Previous Page', 'Next Page', 'Brand Profile', 'WORKSPACE', 'Marketing Package', 'Preparing brochure']) expect(text).not.toContain(label);
}
function checkPrintBounds(items: { text: string; x: number; y: number; width: number }[], panelWidth = 612) {
  for (const item of items.filter(item => item.text.trim())) {
    const panel = Math.floor(item.x / panelWidth);
    expect(item.x - panel * panelWidth, item.text).toBeGreaterThanOrEqual(17);
    expect(item.x + item.width - panel * panelWidth, item.text).toBeLessThanOrEqual(panelWidth - 17);
    expect(item.y, item.text).toBeGreaterThan(17);
    expect(item.y, item.text).toBeLessThan(792 - 17);
  }
}
async function buildListing(page: Page, count: number, description?: string) {
  await page.goto('/#create-listing');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Create Listing', exact: true })).toBeVisible();
  const data = { 'Property address': '980 Test Way, Vancouver, BC', 'Listing price': '2345000', Bedrooms: '4', Bathrooms: '3.5', 'Square footage': '2875', 'Property taxes': '9876.54', 'Strata fee': '210', Parking: 'Two private parking spaces', Storage: 'Secure storage room', 'Property description': description || 'DYNAMIC DESCRIPTION: light-filled spaces and mountain views. A home for every chapter. THE FINAL SENTENCE.', 'Property features': 'First unique feature, Private garden, Last unique feature' };
  for (const [label, value] of Object.entries(data)) await page.getByLabel(label, { exact: false }).fill(value);
  if (count) {
    const source = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 2700; canvas.height = 1800; const ctx = canvas.getContext('2d')!; const gradient = ctx.createLinearGradient(0, 0, 2700, 1800); gradient.addColorStop(0, '#b14a30'); gradient.addColorStop(1, '#203940'); ctx.fillStyle = gradient; ctx.fillRect(0,0,2700,1800); return canvas.toDataURL('image/png').split(',')[1]; });
    const files = Array.from({ length: count }, (_, index) => ({ name: `high-resolution-${index + 1}.png`, mimeType: 'image/png', buffer: Buffer.from(source, 'base64') }));
    await page.getByLabel('Property photos', { exact: true }).setInputFiles(files);
    await expect(page.locator('.listing-photo-row')).toHaveCount(count);
  }
}

test('downloads the current listing and saved realtor brand in both exact print formats', async ({ page }, testInfo) => {
  const headshot = `data:image/jpeg;base64,${(await readFile('public/images/property-1.jpg')).toString('base64')}`;
  const personalLogo = `data:image/jpeg;base64,${(await readFile('public/images/property-2.jpg')).toString('base64')}`;
  const brokerageLogo = `data:image/jpeg;base64,${(await readFile('public/images/property-3.jpg')).toString('base64')}`;
  await page.addInitScript(profile => localStorage.setItem('listingkit.brand-profile.v1', JSON.stringify(profile)), { firstName: 'Avery', lastName: 'Chen', title: 'Realtor', teamName: 'The Avery Team', brokerageName: 'Harbour Realty', phone: '(604) 555-0198', email: 'avery@example.com', website: 'avery.example', instagram: '@avery', headshot, personalLogo, brokerageLogo, primaryColour: '#152f48', secondaryColour: '#efd8b5' });
  await buildListing(page, 6);
  await page.getByLabel('Floor plan', { exact: true }).setInputFiles('tests/fixtures/floor-plan.pdf');
  await expect(page.getByAltText('Selected floor plan')).toBeVisible();
  await page.getByRole('button', { name: 'Generate Marketing Package', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Marketing Package', exact: true })).toBeVisible();
  const letterFile = await downloadPdf(page, 'letter');
  expect(letterFile.suggestedFilename()).toBe('980-Test-Way-Listory-Letter.pdf');
  await letterFile.saveAs(testInfo.outputPath('Letter.pdf'));
  const letter = await parsePdf(letterFile);
  expect(letter.pages).toHaveLength(4);
  for (const p of letter.pages) { expect(p.width).toBe(612); expect(p.height).toBe(792); checkNoUi(p.text); checkPrintBounds(p.items); }
  expect(letter.pages[0].text).toContain('980 Test Way'); expect(letter.pages[0].text).toContain('$2,345,000');
  expect(letter.pages[1].text).toContain('THE FINAL SENTENCE.'); expect(letter.pages[1].text).toContain('Last unique feature');
  for (const value of ['$9,876.54', '$210', 'Two private parking spaces', 'Secure storage room']) expect(letter.pages[2].text).toContain(value);
  for (const value of ['Avery Chen', 'The Avery Team', 'Harbour Realty', 'avery@example.com', '@avery', 'Book a Private Showing']) expect(letter.pages[3].text).toContain(value);
  expect(letter.pages[0].colours).toContain('#152f48'); expect(letter.pages[2].colours).toContain('#efd8b5');
  expect(letter.pages[0].images.some(image => image[1] >= 2500)).toBe(true);
  expect(letter.pages[1].images.length).toBeGreaterThanOrEqual(4);
  expect(letter.pages[2].images.length).toBeGreaterThanOrEqual(2);
  expect(letter.pages[3].images.length).toBeGreaterThanOrEqual(3);
  for (const [i, p] of letter.pages.entries()) { expect(p.text).toMatch(new RegExp(`\\b0\\s*${i + 1}\\b`)); expect(p.text).toContain('Listory.'); }
  const letterPreferences = letter.document.catalog.getOrCreateViewerPreferences();
  expect(letterPreferences.getPrintScaling()).toBe(PrintScaling.None); expect(letterPreferences.getDuplex()).toBe(Duplex.DuplexFlipLongEdge);
  const foldedFile = await downloadPdf(page, 'folded'); expect(foldedFile.suggestedFilename()).toBe('980-Test-Way-Listory-Folded.pdf');
  await foldedFile.saveAs(testInfo.outputPath('Folded.pdf'));
  const folded = await parsePdf(foldedFile); expect(folded.pages).toHaveLength(2);
  for (const p of folded.pages) { expect(p.width).toBe(1224); expect(p.height).toBe(792); checkNoUi(p.text); checkPrintBounds(p.items); }
  const halves = folded.pages.map(p => [p.items.filter(item => item.x < 612).map(item => item.text).join(' '), p.items.filter(item => item.x >= 612).map(item => item.text).join(' ')]);
  expect(halves[0][0]).toContain('Book a Private Showing'); expect(halves[0][0]).toContain('Avery Chen'); expect(normalise(halves[0][1])).toContain('exclusivelypresented');
  expect(normalise(halves[1][0])).toContain('theproperty'); expect(halves[1][0]).toContain('THE FINAL SENTENCE.'); expect(normalise(halves[1][1])).toContain('thefinerdetails');
  expect(folded.document.catalog.getOrCreateViewerPreferences().getDuplex()).toBe(Duplex.DuplexFlipShortEdge);
  await page.getByRole('button', { name: 'Next Page', exact: true }).click(); await expect(page.getByRole('article')).toHaveAttribute('aria-label', 'Brochure page 2: Property');
  await page.getByRole('button', { name: 'Back to Listing', exact: true }).click(); await expect(page.getByLabel('Property address', { exact: false })).toHaveValue('980 Test Way, Vancouver, BC');
  await expect(page.locator('.listing-photo-row')).toHaveCount(6);
});

test('exports long descriptions without losing their final words, with zero, one, or four photos', async ({ page }) => {
  for (const count of [0, 1, 4]) {
    await buildListing(page, count, 'Thoughtfully designed living spaces connect indoors and outdoors. '.repeat(20) + 'LONG DESCRIPTION FINAL WORDS');
    await page.getByRole('button', { name: 'Generate Marketing Package', exact: true }).click();
    for (const format of ['letter', 'folded'] as const) {
      const pdf = await parsePdf(await downloadPdf(page, format)); expect(pdf.pages).toHaveLength(format === 'letter' ? 4 : 2);
      expect(pdf.pages[1].text).toContain('LONG DESCRIPTION FINAL WORDS');
      expect(pdf.pages.map(p => p.text).join(' ')).toContain('Listory.');
    }
  }
});

test('format chooser is accessible, fits a phone, and can be closed without changing the preview', async ({ page }) => {
  await openPackage(page); await page.getByRole('button', { name: 'Page 3: Floor plan & details', exact: true }).click();
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Standard 8.5/ })).toBeVisible(); await expect(dialog.getByRole('button', { name: /Folded 11/ })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeFocused();
  await expect(page.getByRole('article')).toHaveAttribute('aria-label', 'Brochure page 3: Floor plan & details');
});

test('failed generation shows a friendly error and allows retry without losing the listing', async ({ page }) => {
  await openPackage(page);
  await page.route('**/api/brochure-pdf', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Please try again in a moment. Your listing is still here.' }) }), { times: 1 });
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  await page.getByRole('button', { name: /Standard 8.5/ }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Please try again');
  await expect(page.getByRole('dialog').getByRole('button', { name: /Standard 8.5/ })).toBeEnabled();
  await page.getByRole('button', { name: 'Close download options' }).click();
  await expect(page.getByRole('article')).toHaveAttribute('aria-label', 'Brochure page 1: Cover');
  const pdf = await parsePdf(await downloadPdf(page, 'letter')); expect(pdf.pages).toHaveLength(4);
});

test('refuses excessive content clearly instead of clipping text or adding pages', async ({ page }) => {
  await buildListing(page, 4, 'An exceptionally long description that cannot fit a four-page brochure. '.repeat(200));
  await page.getByRole('button', { name: 'Generate Marketing Package', exact: true }).click();
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  await page.getByRole('button', { name: /Folded 11/ }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Please shorten');
  await page.getByRole('button', { name: 'Close download options' }).click();
  await page.getByRole('button', { name: 'Back to Listing', exact: true }).click();
  await expect(page.getByLabel('Property description')).toHaveValue('An exceptionally long description that cannot fit a four-page brochure. '.repeat(200));
});

test('rejects invalid export requests and cross-site submissions', async ({ request }) => {
  const invalid = await request.post('/api/brochure-pdf', { data: { format: 'invalid', pages: [], assets: [], address: 'Test' } }); expect(invalid.status()).toBe(400);
  const wrongOrigin = await request.post('/api/brochure-pdf', { headers: { Origin: 'https://another-site.example' }, data: {} }); expect(wrongOrigin.status()).toBe(403);
});

test('can cancel preparation and reopen the chooser without changing pages', async ({ page }) => {
  await openPackage(page);
  await page.getByRole('button', { name: 'Page 4: Realtor', exact: true }).click();
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  await page.getByRole('button', { name: /Standard 8.5/ }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Preparing brochure...');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeEnabled();
  await expect(page.getByRole('article')).toHaveAttribute('aria-label', 'Brochure page 4: Realtor');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: /Folded 11/ })).toBeEnabled();
});
