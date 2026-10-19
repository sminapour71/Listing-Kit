import { test, expect } from './helpers/visual-fixture';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
test('fits mixed three-photo compositions without gaps, overlap, or changing page size', async ({ page }, info) => {
  test.setTimeout(90_000);
  for (const portraitFirst of [false, true]) {
    await page.goto('/workspace#create-listing'); await page.reload();
    await page.getByLabel('Property address', { exact: false }).fill('Photo Fitting Verification, Vancouver, BC');
    const dimensions = [[2400, 600], ...(portraitFirst ? [[500, 900], [900, 600], [600, 600]] : [[900, 600], [500, 900], [600, 600]])];
    const files = [];
    for (const [i, [width, height]] of dimensions.entries()) files.push({ name: `framing-${i}.png`, mimeType: 'image/png', buffer: await sharp({ create: { width, height, channels: 3, background: i === 2 ? '#b47659' : '#486b5a' } }).png().toBuffer() });
    await page.getByLabel('Property photos', { exact: true }).setInputFiles(files);
    await page.getByRole('button', { name: 'Generate Marketing Package', exact: true }).click();
    await expect(page.locator('.brochure-cover-image')).toHaveCSS('object-fit', 'cover');
    await page.getByRole('button', { name: 'Page 2: Property', exact: true }).click();
    for (const width of [1440, 834, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const grid = page.locator('.brochure-photo-grid.photo-layout-ready'); await expect(grid).toBeVisible();
      const boxes = await grid.locator('img').evaluateAll(images => images.map(image => { const r = image.getBoundingClientRect(); return { orientation: (image as HTMLImageElement).dataset.photoOrientation, x: r.x, y: r.y, right: r.right, bottom: r.bottom, height: r.height }; }));
      for (const [i, a] of boxes.entries()) for (const b of boxes.slice(i + 1)) expect(a.right <= b.x + .5 || b.right <= a.x + .5 || a.bottom <= b.y + .5 || b.bottom <= a.y + .5).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    if (!portraitFirst) {
      await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
      const pending = page.waitForEvent('download', { timeout: 65_000 });
      await page.getByRole('button', { name: /Standard 8.5/ }).click();
      const pdf = await pending; await pdf.saveAs(info.outputPath('mixed-three-Letter.pdf'));
      const document = await PDFDocument.load(await readFile((await pdf.path())!));
      expect(document.getPageCount()).toBe(4);
      for (const p of document.getPages()) expect(p.getSize()).toEqual({ width: 612, height: 792 });
    }
  }
});
