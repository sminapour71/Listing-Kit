import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import jsQR from 'jsqr';
import { createCanvas } from '@napi-rs/canvas';
import { siteOrigin } from '../app/lib/site-url';
import type { Publication } from '../app/lib/property-publication';

test('publishes real data, opens in a clean browser, and decodes the QR in both PDFs', async ({ page, browser, request }, info) => {
  test.skip(process.env.LISTORY_LIVE_STORAGE_TEST !== '1', 'Opt in to this real Supabase integration test.');
  test.setTimeout(240_000);
  const address = `Listory Verification ${randomUUID().slice(0, 8)}, Vancouver, BC`;
  let publication: Publication | undefined;
  let duplicateSlug: string | undefined;
  const profile = { firstName: 'Avery', lastName: 'Chen', title: 'Realtor', teamName: 'Avery Team', brokerageName: 'Harbour Realty', phone: '604-555-0198', email: 'avery@example.com', website: 'avery.example', instagram: '@avery', primaryColour: '#152f48', secondaryColour: '#efd8b5', headshot: '', personalLogo: '', brokerageLogo: '' };
  for (const [key, file] of [['headshot', 'property-1'], ['personalLogo', 'property-2'], ['brokerageLogo', 'property-3']]) profile[key] = `data:image/jpeg;base64,${(await readFile(`public/images/${file}.jpg`)).toString('base64')}`;
  await page.addInitScript(p => localStorage.setItem('listingkit.brand-profile.v1', JSON.stringify(p)), profile);
  try {
    await page.goto('/#create-listing');
    for (const [label, value] of Object.entries({ 'Property address': address, 'Listing price': '2345000', Bedrooms: '4', Bathrooms: '3.5', 'Square footage': '2875', 'Property taxes': '9876.54', 'Strata fee': '0', Parking: 'Two private spaces', Storage: 'Secure storage', 'Property description': 'REAL PUBLISHED PROPERTY STORY. '.repeat(30) + 'FINAL PUBLISHED SENTENCE.', 'Property features': 'Private garden, Mountain views, Last published feature' })) await page.getByLabel(label, { exact: false }).fill(value);
    await page.getByLabel('Property photos', { exact: true }).setInputFiles(['public/images/property-1.jpg', 'public/images/property-2.jpg', 'public/images/property-3.jpg']);
    await page.getByLabel('Floor plan', { exact: true }).setInputFiles('tests/fixtures/floor-plan.pdf');
    await expect(page.getByAltText('Selected floor plan')).toBeVisible();
    await page.getByRole('button', { name: 'Generate Marketing Package', exact: true }).click();
    await page.getByRole('button', { name: 'Publish Property Page', exact: true }).click();
    await expect(page.getByText('Published. Your property link and brochure QR code are ready.', { exact: true })).toBeVisible({ timeout: 100_000 });
    publication = await page.evaluate(address => JSON.parse(localStorage.getItem(`listory.property.v1:${address.trim().toLowerCase()}`)!), address);
    expect(publication!.url).toBe(`${siteOrigin()}/property/${publication!.slug}`);
    const code = page.getByAltText('QR code for the published property page'); await expect(code).toBeVisible();
    const qr = (await code.getAttribute('src'))!;
    const image = await sharp(Buffer.from(qr.split(',')[1], 'base64')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(jsQR(new Uint8ClampedArray(image.data), image.info.width, image.info.height)?.data).toBe(publication!.url);
    const fresh = await browser.newContext(); const publicPage = await fresh.newPage();
    // This cloud environment routes external traffic through its HTTPS proxy.
    // Forward only the public image requests; the page and storage are real.
    await fresh.route('https://*.supabase.co/**', async route => {
      const r = await fetch(route.request().url());
      expect(r.ok).toBe(true); expect(r.headers.get('access-control-allow-origin')).toBe('*');
      await route.fulfill({ status: r.status, headers: Object.fromEntries(r.headers), body: Buffer.from(await r.arrayBuffer()) });
    });
    const duplicate = await request.post('/api/properties', { headers: { origin: 'http://127.0.0.1:3100' }, data: { address } });
    expect(duplicate.status()).toBe(201); const duplicateData = await duplicate.json(); duplicateSlug = duplicateData.slug;
    expect(duplicateSlug).not.toBe(publication!.slug); expect(duplicateData.status).toBe('draft');
    const draftResponse = await request.get(new URL(duplicateData.url).pathname); expect(draftResponse.status()).toBe(404);
    expect(await draftResponse.text()).toContain('no longer available');
    expect((await request.get(`/api/properties/${publication!.slug}`)).status()).toBe(403);
    const path = new URL(publication!.url).pathname;
    const response = await publicPage.goto(path); expect(response?.status()).toBe(200);
    await expect(publicPage).toHaveTitle(`${address.split(',')[0]} | Listory`);
    await expect(publicPage.getByRole('heading', { name: address, exact: true })).toBeVisible();
    for (const text of ['FINAL PUBLISHED SENTENCE.', 'Last published feature', 'Two private spaces', 'Secure storage', 'Avery Chen', 'Avery Team', 'Harbour Realty']) await expect(publicPage.locator('body')).toContainText(text);
    await expect(publicPage.getByRole('link', { name: 'Call', exact: true })).toHaveAttribute('href', 'tel:6045550198');
    await expect(publicPage.getByRole('link', { name: 'Email', exact: true })).toHaveAttribute('href', 'mailto:avery@example.com');
    await expect(publicPage.locator('.sidebar, .topbar, .brochure-thumbnails')).toHaveCount(0);
    await expect(publicPage.locator('body')).not.toContainText(publication!.token);
    for (const [name, width] of [['desktop', 1440], ['tablet', 834], ['mobile', 390]] as const) {
      await publicPage.setViewportSize({ width, height: 1000 });
      await publicPage.locator('.public-footer').scrollIntoViewIfNeeded();
      await publicPage.waitForFunction(() => Array.from(document.images).every(image => image.complete && image.naturalWidth > 0));
      expect(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await publicPage.screenshot({ path: info.outputPath(`property-${name}.png`), fullPage: true });
    }
    for (const [option, count, width] of [['Standard 8.5', 4, 612], ['Folded 11', 2, 1224]] as const) {
      await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
      const pending = page.waitForEvent('download', { timeout: 65_000 });
      await page.getByRole('button', { name: new RegExp(option) }).click();
      const download = await pending; const file = info.outputPath(option.startsWith('Standard') ? 'QR-Letter.pdf' : 'QR-Folded.pdf'); await download.saveAs(file);
      const lib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const task = lib.getDocument({ data: new Uint8Array(await readFile(file)), useSystemFonts: false }); const pdf = await task.promise;
      try {
        expect(pdf.numPages).toBe(count);
        const page4 = await pdf.getPage(count === 4 ? 4 : 1);
        expect(page4.getViewport({ scale: 1 }).width).toBe(width); expect(page4.getViewport({ scale: 1 }).height).toBe(792);
        const viewport = page4.getViewport({ scale: 300 / 72 }); const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        await page4.render({ canvas: canvas as never, canvasContext: canvas.getContext('2d') as never, viewport }).promise;
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        expect(jsQR(new Uint8ClampedArray(pixels.data), canvas.width, canvas.height)?.data).toBe(publication!.url);
      } finally { await task.destroy(); }
    }
    await page.evaluate(address => { const key = `listory.property.v1:${address.trim().toLowerCase()}`; const saved = JSON.parse(localStorage.getItem(key)!); saved.url = 'https://obsolete.example/property/' + saved.slug; localStorage.setItem(key, JSON.stringify(saved)); }, address);
    await page.getByRole('button', { name: 'Back to Listing', exact: true }).click();
    await page.getByRole('button', { name: 'Generate Marketing Package', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Update Property Page', exact: true })).toBeEnabled();
    await expect(page.getByAltText('QR code for the published property page')).toBeVisible();
    await expect(page.locator('.published-url')).toHaveAttribute('href', publication!.url);
    await expect(page.getByRole('link', { name: 'View Property Page' })).toHaveAttribute('href', publication!.url);
    expect(await page.evaluate(address => JSON.parse(localStorage.getItem(`listory.property.v1:${address.trim().toLowerCase()}`)!).url, address)).toBe(publication!.url);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: 'Copy Link' }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(publication!.url);
    const forbiddenStatus = await page.evaluate(async slug => (await fetch(`/api/properties/${slug}`, { method: 'DELETE', headers: { 'x-listory-management': 'a'.repeat(64) } })).status, publication!.slug); expect(forbiddenStatus).toBe(403);
    await page.getByRole('button', { name: 'Unpublish Property Page' }).click();
    await expect(page.locator('.publish-message')).toContainText('Unpublished.');
    await publicPage.reload(); await expect(publicPage.getByRole('heading', { name: /no longer available/ })).toBeVisible();
    await page.getByRole('button', { name: 'Page 4: Realtor', exact: true }).click();
    await expect(page.getByRole('article')).toContainText('Publish property page to activate QR code.');
    await expect(page.getByAltText('Property webpage QR code')).toHaveCount(0);
    await fresh.close();
  } finally {
    if (!publication) publication = await page.evaluate(address => { const value = localStorage.getItem(`listory.property.v1:${address.trim().toLowerCase()}`); return value ? JSON.parse(value) : undefined; }, address).catch(() => undefined);
    if (duplicateSlug) await fetch(`${process.env.SUPABASE_URL}/rest/v1/listory_properties?slug=eq.${duplicateSlug}`, { method: 'DELETE', headers: { apikey: process.env.SUPABASE_SECRET_KEY! } });
    if (publication) {
      // Clean up only this test's random, uniquely named listing and its assets.
      const base = process.env.SUPABASE_URL!; const headers = { apikey: process.env.SUPABASE_SECRET_KEY! };
      const rowResponse = await fetch(`${base}/rest/v1/listory_properties?slug=eq.${publication.slug}&select=listing,brand`, { headers });
      const rows = await rowResponse.json(); const row = rows[0];
      const prefix = `${base}/storage/v1/object/public/listory-published/`;
      const urls = row ? [...(row.listing.photos || []).map(p => p.url), row.listing.floorPlan?.url, row.brand.headshot, row.brand.personalLogo, row.brand.brokerageLogo].filter((v): v is string => typeof v === 'string' && v.startsWith(prefix)) : [];
      if (urls.length) await fetch(`${base}/storage/v1/object/listory-published`, { method: 'DELETE', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: urls.map(url => url.slice(prefix.length)) }) });
      await fetch(`${base}/rest/v1/listory_properties?slug=eq.${publication.slug}`, { method: 'DELETE', headers });
    }
  }
});
