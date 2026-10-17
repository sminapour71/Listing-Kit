import { test, expect } from '@playwright/test';
import { provisionAgent } from './helpers/agent';
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
  const agent=await provisionAgent();
  try {
  expect((await page.request.post('/api/auth/sign-in',{headers:{origin:'http://127.0.0.1:3100'},data:{email:agent.email,password:agent.password}})).status()).toBe(200);
  expect((await page.request.put('/api/agent-profile',{headers:{origin:'http://127.0.0.1:3100'},data:{brand:profile}})).status()).toBe(200);
    await page.goto('/#create-listing');
    for (const [label, value] of Object.entries({ 'Property address': address, 'Listing price': '2345000', Bedrooms: '4', Bathrooms: '3.5', 'Square footage': '2875', 'Property taxes': '9876.54', 'Strata fee': '0', Parking: 'Two private spaces', Storage: 'Secure storage', 'Property description': 'REAL PUBLISHED PROPERTY STORY. '.repeat(30) + 'FINAL PUBLISHED SENTENCE.', 'Property features': 'Private garden, Mountain views, Last published feature' })) await page.getByLabel(label, { exact: false }).fill(value);
    const photoFiles = [];
    for (const [i, [width, height]] of [[3600, 900], [900, 1500], [1800, 1200], [1100, 1100], [2800, 700], [700, 1300]].entries()) {
      // Saturated edge bands reveal cropping in the actual rendered PDF.
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#cad3c8"/><rect width="60" height="100%" fill="#ff0000"/><rect x="${width - 60}" width="60" height="100%" fill="#00ff00"/><rect width="100%" height="60" fill="#0000ff"/><rect y="${height - 60}" width="100%" height="60" fill="#ffff00"/></svg>`;
      photoFiles.push({ name: `orientation-${i + 1}.png`, mimeType: 'image/png', buffer: await sharp(Buffer.from(svg)).png().toBuffer() });
    }
    await page.getByLabel('Property photos', { exact: true }).setInputFiles(photoFiles);
    await page.getByRole('button', { name: 'Adjust Position for photo 1', exact: true }).click();
    await page.getByRole('group', { name: 'Photo position preview' }).press('ArrowLeft');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByLabel('Floor plan', { exact: true }).setInputFiles('tests/fixtures/floor-plan.pdf');
    await expect(page.getByAltText('Selected floor plan')).toBeVisible();
    await page.getByRole('button', { name: 'Generate Marketing Package', exact: true }).click();
    await expect(page.locator('.brochure-cover-image')).toHaveCSS('object-fit', 'cover');
    await expect(page.locator('.brochure-cover-image')).toHaveAttribute('data-photo-orientation', 'landscape');
    await page.getByRole('button', { name: 'Page 2: Property', exact: true }).click();
    await expect(page.locator('.brochure-photo-grid.photo-layout-ready')).toBeVisible();
    await expect(page.locator('.brochure-photo-grid>img[data-photo-orientation=portrait]').first()).toHaveCSS('position', 'absolute');
    await page.getByRole('button', { name: 'Publish Property Page', exact: true }).click();
    await expect(page.getByText('Published. Your property link and brochure QR code are ready.', { exact: true })).toBeVisible({ timeout: 100_000 });
    const publishedUrl=(await page.locator('.published-url').getAttribute('href'))!;
    publication={url:publishedUrl,slug:new URL(publishedUrl).pathname.split('/').pop()!,status:'published'};
    expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('listory.property.v1:')))).toEqual([]);
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
    const duplicate = await page.request.post('/api/properties', { headers: { origin: 'http://127.0.0.1:3100' }, data: { address } });
    expect(duplicate.status()).toBe(201); const duplicateData = await duplicate.json(); duplicateSlug = duplicateData.slug;
    expect(duplicateSlug).not.toBe(publication!.slug); expect(duplicateData.status).toBe('draft');
    const draftResponse = await request.get(new URL(duplicateData.url).pathname); expect(draftResponse.status()).toBe(404);
    expect(await draftResponse.text()).toContain('no longer available');
    expect((await request.get(`/api/properties/${publication!.slug}`)).status()).toBe(401);
    const path = new URL(publication!.url).pathname;
    const response = await publicPage.goto(path); expect(response?.status()).toBe(200);
    await expect(publicPage.locator('.public-hero-image')).toHaveAttribute('data-photo-focal-x', '0.52');
    await expect(publicPage.locator('.public-hero-image')).toHaveAttribute('data-photo-focal-y', '0.5');
    await expect(publicPage).toHaveTitle(`${address.split(',')[0]} | Listory`);
    await expect(publicPage.getByRole('heading', { name: address, exact: true })).toBeVisible();
    for (const text of ['FINAL PUBLISHED SENTENCE.', 'Last published feature', 'Two private spaces', 'Secure storage', 'Avery Chen', 'Avery Team', 'Harbour Realty']) await expect(publicPage.locator('body')).toContainText(text);
    await expect(publicPage.getByRole('link', { name: 'Call', exact: true })).toHaveAttribute('href', 'tel:6045550198');
    await expect(publicPage.getByRole('link', { name: 'Email', exact: true })).toHaveAttribute('href', 'mailto:avery@example.com');
    await expect(publicPage.locator('.sidebar, .topbar, .brochure-thumbnails')).toHaveCount(0);
    await expect(publicPage.locator('body')).not.toContainText(agent.email);
    for(const privateField of ['management_hash','owner_id','accountEmail'])expect(await response!.text()).not.toContain(privateField);
    for (const [name, width] of [['desktop', 1440], ['tablet', 834], ['mobile', 390]] as const) {
      await publicPage.setViewportSize({ width, height: 1000 });
      for (const image of await publicPage.locator('img[loading=lazy]').all()) await image.scrollIntoViewIfNeeded();
      await publicPage.locator('.public-footer').scrollIntoViewIfNeeded();
      await publicPage.waitForFunction(() => Array.from(document.images).every(image => image.complete && image.naturalWidth > 0));
      expect(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await expect(publicPage.locator('.public-hero-image')).toHaveCSS('object-fit', 'contain');
      expect(await publicPage.locator('.public-hero-image').evaluate((img: HTMLImageElement) => Math.abs(img.getBoundingClientRect().width / img.getBoundingClientRect().height - img.naturalWidth / img.naturalHeight))).toBeLessThan(.01);
      for (const photo of await publicPage.locator('.public-gallery img').all()) expect(await photo.evaluate((img: HTMLImageElement) => Math.abs(img.getBoundingClientRect().width / img.getBoundingClientRect().height - img.naturalWidth / img.naturalHeight))).toBeLessThan(.01);
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
        // Inspect the visible cover artwork, not merely the embedded source file.
        const cover = await pdf.getPage(1); const coverViewport = cover.getViewport({ scale: 2 });
        const coverCanvas = createCanvas(Math.ceil(coverViewport.width), Math.ceil(coverViewport.height));
        await cover.render({ canvas: coverCanvas as never, canvasContext: coverCanvas.getContext('2d') as never, viewport: coverViewport }).promise;
        const rgba = coverCanvas.getContext('2d').getImageData(0, 0, coverCanvas.width, coverCanvas.height).data;
        const counts = [0, 0, 0, 0];
        const startX = count === 2 ? 612 * 2 : 0;
        for (let y = 0; y < coverCanvas.height; y++) for (let x = startX; x < coverCanvas.width; x++) {
          const offset = (y * coverCanvas.width + x) * 4, r = rgba[offset], g = rgba[offset + 1], b = rgba[offset + 2];
          if (r > 230 && g < 35 && b < 35) counts[0]++;
          if (g > 230 && r < 35 && b < 35) counts[1]++;
          if (b > 230 && r < 35 && g < 35) counts[2]++;
          if (r > 230 && g > 230 && b < 35) counts[3]++;
        }
        expect(counts[0]).toBeLessThan(20); expect(counts[1]).toBeLessThan(20);
        expect(counts[2]).toBeGreaterThan(100); expect(counts[3]).toBeGreaterThan(100);
      } finally { await task.destroy(); }
    }
    await page.evaluate(({address,slug})=>localStorage.setItem(`listory.property.v1:${address.trim().toLowerCase()}`,JSON.stringify({slug,token:'a'.repeat(64),url:'https://obsolete.example/property/'+slug})),{address,slug:publication!.slug});
    await page.getByRole('button', { name: 'Back to Listing', exact: true }).click();
    await page.getByRole('button', { name: 'Generate Marketing Package', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Update Property Page', exact: true })).toBeEnabled();
    await expect(page.getByAltText('QR code for the published property page')).toBeVisible();
    await expect(page.locator('.published-url')).toHaveAttribute('href', publication!.url);
    await expect(page.getByRole('link', { name: 'View Property Page' })).toHaveAttribute('href', publication!.url);
    // A stale browser entry cannot override the server-verified account connection.
    expect(await page.evaluate(address => JSON.parse(localStorage.getItem(`listory.property.v1:${address.trim().toLowerCase()}`)!).url, address)).toContain('obsolete.example');
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: 'Copy Link' }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(publication!.url);
    const other=await provisionAgent();const otherContext=await browser.newContext();
    try{
      expect((await otherContext.request.post('/api/auth/sign-in',{headers:{origin:'http://127.0.0.1:3100'},data:{email:other.email,password:other.password}})).status()).toBe(200);
      for(const method of ['get','delete','put'] as const){const denied=await otherContext.request[method](`/api/properties/${publication!.slug}`,{headers:{origin:'http://127.0.0.1:3100','x-listory-management':'a'.repeat(64)},...(method==='put'?{data:{}}:{})});expect(denied.status()).toBe(404);}
      const otherProfile=await otherContext.request.get('/api/agent-profile');expect((await otherProfile.json()).brand).toEqual({});
    }finally{await otherContext.close();await other.cleanup();}
    const saved = await fetch(`${process.env.SUPABASE_URL}/rest/v1/listory_properties?slug=eq.${publication!.slug}&select=listing,brand,owner_id`, { headers: { apikey: process.env.SUPABASE_SECRET_KEY! } });
    const snapshot = (await saved.json())[0];expect(snapshot.owner_id).toBe(agent.id);
    expect(snapshot.listing.photos.map(p => p.orientation)).toEqual(['landscape', 'portrait', 'landscape', 'square', 'landscape', 'portrait']);
    expect(snapshot.listing.photos[0].width).toBe(2400);
    expect(snapshot.listing.photos[0].focalX).toBe(.52); expect(snapshot.listing.photos[0].focalY).toBe(.5);
    const invalidPosition = await page.evaluate(async ({ slug, token, snapshot }) => (await fetch(`/api/properties/${slug}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...snapshot, listing: { ...snapshot.listing, photos: [{ ...snapshot.listing.photos[0], focalX: -1 }, ...snapshot.listing.photos.slice(1)] } }) })).status, { slug: publication!.slug, token: publication!.token, snapshot });
    expect(invalidPosition).toBe(400);
    for (const index of [1, 2, 3]) {
      const photos = [snapshot.listing.photos[index], ...snapshot.listing.photos.filter((_: unknown, i: number) => i !== index)];
      const status = await page.evaluate(async ({ slug, token, snapshot }) => (await fetch(`/api/properties/${slug}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot) })).status, { slug: publication!.slug, token: publication!.token, snapshot: { ...snapshot, listing: { ...snapshot.listing, photos } } });
      expect(status).toBe(200);
      for (const width of [1440, 834, 390]) {
        await publicPage.setViewportSize({ width, height: 1000 }); await publicPage.reload();
        await expect(publicPage.locator('.public-hero-image')).toHaveAttribute('data-photo-orientation', photos[0].orientation);
        await expect(publicPage.locator('.public-hero-image')).toHaveCSS('object-fit', 'contain');
        expect(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        expect(await publicPage.locator('.public-hero-image').evaluate((img: HTMLImageElement) => img.getBoundingClientRect().height)).toBeLessThanOrEqual(1101);
      }
    }
    await page.goto('/');await page.reload();const ownCard=page.locator('.listing-card').filter({hasText:address}).filter({has:page.locator('.status.active')});await expect(ownCard).toBeVisible();await ownCard.getByRole('button',{name:'Edit Listing',exact:true}).click();
    await expect(page.getByLabel('Property address',{exact:false})).toHaveValue(address);
    await expect(page.locator('.listing-photo-row')).toHaveCount(6);
    await page.getByRole('button',{name:'Generate Marketing Package',exact:true}).click();
    await expect(page.locator('.published-url')).toHaveAttribute('href',publication!.url);
    await expect(page.locator('.brochure-cover-image')).toHaveAttribute('src',/^blob:/);
    for(const label of [/Standard 8.5/,/Folded 11/]){await page.getByRole('button',{name:'Download PDF',exact:true}).click();const file=page.waitForEvent('download',{timeout:65_000});await page.getByRole('button',{name:label}).click();expect(await (await file).failure()).toBeNull();}
    await page.getByRole('button', { name: 'Unpublish Property Page' }).click();
    await expect(page.locator('.publish-message')).toContainText('Unpublished.');
    await publicPage.reload(); await expect(publicPage.getByRole('heading', { name: /no longer available/ })).toBeVisible();
    await page.getByRole('button', { name: 'Page 4: Realtor', exact: true }).click();
    await expect(page.getByRole('article')).toContainText('Publish property page to activate QR code.');
    await expect(page.getByAltText('Property webpage QR code')).toHaveCount(0);
    await fresh.close();
  } finally {

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
    await agent.cleanup();
  }
});
