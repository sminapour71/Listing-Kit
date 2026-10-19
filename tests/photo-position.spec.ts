import { test, expect } from './helpers/visual-fixture';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { createCanvas } from '@napi-rs/canvas';

test('saves individual focal positions with mouse or touch and uses them in both real PDFs', async ({ page }, info) => {
  test.setTimeout(150_000);
  await page.goto('/workspace#create-listing');
  await page.getByLabel('Property address', { exact: false }).fill('Photo Position Verification, Vancouver, BC');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1000"><rect width="1800" height="1000" fill="#bfc4c2"/><rect width="1800" height="20" fill="#ff0000"/><rect y="980" width="1800" height="20" fill="#0000ff"/></svg>';
  const supporting = await sharp({ create: { width: 1800, height: 1000, channels: 3, background: '#849283' } }).png().toBuffer();
  await page.getByLabel('Property photos', { exact: true }).setInputFiles([
    { name: 'vertical-position.png', mimeType: 'image/png', buffer: await sharp(Buffer.from(svg)).png().toBuffer() },
    { name: 'horizontal-position.png', mimeType: 'image/png', buffer: await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="1000"><rect width="2000" height="1000" fill="#718878"/><rect width="60" height="1000" fill="#ff0000"/><rect x="1940" width="60" height="1000" fill="#0000ff"/></svg>')).png().toBuffer() },
    ...Array.from({ length: 3 }, (_, i) => ({ name: `supporting-${i}.png`, mimeType: 'image/png', buffer: supporting })),
  ]);
  const open = (n: number) => page.getByRole('button', { name: `Adjust Position for photo ${n}`, exact: true }).click();
  const frame = page.getByRole('group', { name: 'Photo position preview' });
  const dialog = page.getByRole('dialog', { name: 'Adjust Position', exact: true });
  async function drag(dx: number, dy: number) {
    const box = (await frame.boundingBox())!;
    const x = box.x + box.width / 2, y = box.y + box.height * .15;
    if (info.project.name === 'mobile') {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / 8, y: y + dy * i / 8 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
    } else { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y + dy, { steps: 8 }); await page.mouse.up(); }
  }
  await open(1);
  await expect(dialog.getByRole('status')).toHaveText('Automatic · centred');
  await drag(0, (await frame.boundingBox())!.height * .8);
  await expect(frame.locator('img')).toHaveCSS('object-position', '50% 0%');
  await dialog.screenshot({ path: info.outputPath('position-editor.png') });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await open(1); await expect(dialog.getByRole('status')).toHaveText('Custom position');
  await page.getByRole('button', { name: 'Reset Position', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Automatic · centred');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await open(1); await expect(frame.locator('img')).toHaveCSS('object-position', '50% 0%');
  await frame.press('Escape'); await expect(dialog).toHaveCount(0);
  await open(2); await expect(dialog.getByRole('status')).toHaveText('Automatic · centred');
  await drag((await frame.boundingBox())!.width * .8, 0); await expect(frame.locator('img')).not.toHaveCSS('object-position', '50% 50%');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Move photo 1 later', exact: true }).click();
  await open(2); await expect(frame.locator('img')).toHaveCSS('object-position', '50% 0%'); await frame.press('Escape');
  await page.getByRole('button', { name: 'Move photo 2 earlier', exact: true }).click();
  await page.getByRole('button', { name: 'Generate Marketing Package', exact: true }).click();
  const cover = page.locator('.brochure-cover-image');
  await expect(cover).toHaveAttribute('data-photo-focal-y', '0');
  // Phone frames may contain the photo; desktop cover crops gently at the chosen edge.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(cover).toHaveCSS('object-fit', 'cover');
  await expect(cover).toHaveCSS('object-position', '50% 0%');
  let requests = 0;
  page.on('request', request => { if (request.url().endsWith('/api/brochure-pdf')) { const body = request.postDataJSON(); expect(body.pages[0]).toContain('data-photo-focal-y="0"'); requests++; } });
  for (const [option, count, width] of [['Standard 8.5', 4, 612], ['Folded 11', 2, 1224]] as const) {
    await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
    const pending = page.waitForEvent('download', { timeout: 65_000 });
    await page.getByRole('button', { name: new RegExp(option) }).click();
    const download = await pending; const path = info.outputPath(count === 4 ? 'Position-Letter.pdf' : 'Position-Folded.pdf'); await download.saveAs(path);
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = pdfjs.getDocument({ data: new Uint8Array(await readFile(path)), useSystemFonts: false });
    try {
      const pdf = await task.promise; expect(pdf.numPages).toBe(count);
      for (let i = 1; i <= count; i++) { const p = await pdf.getPage(i); const v = p.getViewport({ scale: 1 }); expect([v.width, v.height]).toEqual([width, 792]); }
      const p = await pdf.getPage(1), viewport = p.getViewport({ scale: 2 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      await p.render({ canvas: canvas as never, canvasContext: canvas.getContext('2d') as never, viewport }).promise;
      const rgba = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let red = 0, blue = 0;
      for (let y = 0; y < canvas.height; y++) for (let x = count === 2 ? 1224 : 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        if (rgba[i] > 230 && rgba[i + 1] < 35 && rgba[i + 2] < 35) red++;
        if (rgba[i + 2] > 230 && rgba[i] < 35 && rgba[i + 1] < 35) blue++;
      }
      // Focal point at top retains the red edge and crops the blue bottom edge.
      // Centered/ignored data, or using contain, fails one of these assertions.
      expect(red).toBeGreaterThan(1000); expect(blue).toBeLessThan(20);
      // The gallery's saved horizontal focal point must also reach both PDFs.
      const gallery = await pdf.getPage(2), galleryViewport = gallery.getViewport({ scale: 2 });
      const galleryCanvas = createCanvas(Math.ceil(galleryViewport.width), Math.ceil(galleryViewport.height));
      await gallery.render({ canvas: galleryCanvas as never, canvasContext: galleryCanvas.getContext('2d') as never, viewport: galleryViewport }).promise;
      const galleryData = galleryCanvas.getContext('2d').getImageData(0, 0, galleryCanvas.width, galleryCanvas.height).data;
      let leftEdge = 0, rightEdge = 0;
      for (let y = 0; y < galleryCanvas.height; y++) for (let x = 0; x < 1224; x++) {
        const i = (y * galleryCanvas.width + x) * 4;
        if (galleryData[i] > 230 && galleryData[i + 1] < 35 && galleryData[i + 2] < 35) leftEdge++;
        if (galleryData[i + 2] > 230 && galleryData[i] < 35 && galleryData[i + 1] < 35) rightEdge++;
      }
      expect(leftEdge).toBeGreaterThan(1000); expect(rightEdge).toBeLessThan(20);
    } finally { await task.destroy(); }
  }
  expect(requests).toBe(2);
  await page.getByRole('button', { name: 'Back to Listing', exact: true }).click();
  await open(1); await page.getByRole('button', { name: 'Reset Position', exact: true }).click(); await page.getByRole('button', { name: 'Save', exact: true }).click();
  await open(1); await expect(dialog.getByRole('status')).toHaveText('Automatic · centred'); await frame.press('Escape');
  await page.getByRole('button', { name: 'Generate Marketing Package', exact: true }).click();
  await expect(cover).not.toHaveAttribute('data-photo-focal-y'); await expect(cover).toHaveCSS('object-position', '50% 50%');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
