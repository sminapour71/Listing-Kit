import { type Page } from '@playwright/test';
import { test, expect } from './helpers/visual-fixture';
import { readFileSync } from 'node:fs';
const asset = `data:image/jpeg;base64,${readFileSync('public/images/property-1.jpg').toString('base64')}`;
const brand = {
  firstName: 'Alex', lastName: 'Morgan', title: 'Personal Real Estate Corporation', teamName: 'The Morgan Team', brokerageName: 'Pacific Realty',
  phone: '(604) 555-4567', email: 'alex@example.com', website: 'www.alexmorgan.example', instagram: '@alexmorgan',
  headshot: asset, personalLogo: asset, brokerageLogo: asset, primaryColour: '#101d32', secondaryColour: '#f5d7b0',
};
async function seedBrand(page: Page) {
  await page.addInitScript(profile => localStorage.setItem('listingkit.brand-profile.v1', JSON.stringify(profile)), brand);
}
async function createListing(page: Page) {
  await page.goto('/#create-listing');
  await expect(page.getByRole('heading', { name: 'Create Listing', exact: true })).toBeVisible();
  const fields = { 'Property address': '123 Test Avenue, Vancouver, BC', 'Listing price': '1975000', Bedrooms: '3', Bathrooms: '2.5', 'Square footage': '1586', 'Property taxes': '8475.60', 'Strata fee': '425', Parking: '2 underground spaces', Storage: 'Locker 42', 'Property description': 'Light-filled living in Vancouver.\nA private terrace overlooks the garden.', 'Property features': 'Private terrace, EV charging\nAir conditioning' };
  for (const [label, value] of Object.entries(fields)) await page.getByLabel(label, { exact: false }).fill(value);
}
async function generate(page: Page) {
  await page.getByRole('button', { name: 'Generate Marketing Package', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Marketing Package', exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toBeVisible();
}
async function goTo(page: Page, number: number, label: string) {
  await page.getByRole('button', { name: `Page ${number}: ${label}`, exact: true }).click();
  await expect(page.getByRole('article')).toHaveAttribute('aria-label', `Brochure page ${number}: ${label}`);
}

test('generates all four branded pages from the complete listing and retains edits when returning', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await seedBrand(page); await createListing(page);
  await page.getByLabel('Property photos', { exact: true }).setInputFiles(['public/images/property-1.jpg', 'public/images/property-2.jpg', 'public/images/property-3.jpg', 'public/images/hero.jpg', 'public/images/property-2.jpg', 'public/images/property-3.jpg']);
  await expect(page.locator('.listing-photo-row')).toHaveCount(6);
  await page.getByLabel('Floor plan', { exact: true }).setInputFiles('public/images/property-2.jpg');
  await expect(page.getByAltText('Selected floor plan', { exact: true })).toBeVisible();
  await generate(page);
  const paper = page.getByRole('article');
  await expect(paper).toContainText('123 Test Avenue, Vancouver, BC'); await expect(paper).toContainText('$1,975,000');
  await expect(paper).toContainText('2.5'); await expect(paper).toContainText('1,586');
  await expect(paper.getByAltText(/Cover property photograph/)).toHaveAttribute('src', /^blob:/);
  await expect(page.locator('.brochure-cover-content')).toHaveCSS('background-color', 'rgb(16, 29, 50)');
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Previous Page', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Next Page', exact: true }).click();
  await expect(paper).toHaveAttribute('aria-label', 'Brochure page 2: Property');
  await expect(paper).toContainText('Light-filled living in Vancouver.'); await expect(paper).toContainText('Air conditioning');
  await expect(page.locator('.brochure-photo-grid img')).toHaveCount(5);
  await expect(page.locator('.brochure-fact-strip')).toHaveCSS('background-color', 'rgb(245, 215, 176)');
  await goTo(page, 3, 'Floor plan & details');
  await expect(paper.getByAltText(/Floor plan for/)).toHaveAttribute('src', /^blob:/);
  for (const text of ['$8,475.60 / year', '$425 / month', '2 underground spaces', 'Locker 42']) await expect(paper).toContainText(text);
  await expect(paper.getByAltText('Additional property detail photograph')).toBeVisible();
  await goTo(page, 4, 'Realtor');
  for (const text of ['Alex Morgan', brand.title, brand.teamName, brand.brokerageName, brand.phone, brand.email, brand.website, brand.instagram, 'Book a Private Showing', 'Property QR code', 'Publish property page to activate QR code.']) await expect(paper).toContainText(text);
  await expect(paper.getByAltText('Alex Morgan headshot')).toBeVisible();
  await expect(paper.getByAltText('Personal or team logo')).toBeVisible(); await expect(paper.getByAltText('Brokerage logo')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next Page', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Previous Page', exact: true }).click();
  await expect(paper).toHaveAttribute('aria-label', 'Brochure page 3: Floor plan & details');
  await page.getByRole('button', { name: 'Back to Listing', exact: true }).click();
  await expect(page.getByLabel('Property address', { exact: false })).toHaveValue('123 Test Avenue, Vancouver, BC');
  await expect(page.getByLabel('Property description')).toHaveValue('Light-filled living in Vancouver.\nA private terrace overlooks the garden.');
  await expect(page.locator('.listing-photo-row')).toHaveCount(6); await expect(page.getByAltText('Selected floor plan')).toBeVisible();
  await page.getByLabel('Listing price').fill('2100000'); await generate(page); await expect(page.getByRole('article')).toContainText('$2,100,000');
  expect(errors).toEqual([]);
});

test('renders a PDF floor plan inside the brochure, with no external viewer', async ({ page }) => {
  await createListing(page);
  await page.getByLabel('Floor plan', { exact: true }).setInputFiles('tests/fixtures/floor-plan.pdf');
  await expect(page.getByAltText('Selected floor plan')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.listing-floor-file')).toContainText('PDF page 1 of 1');
  await generate(page); await goTo(page, 3, 'Floor plan & details');
  const plan = page.getByRole('article').getByAltText(/Floor plan for/);
  await expect(plan).toBeVisible(); await expect(plan).toHaveAttribute('src', /^blob:/);
  expect(await plan.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(100);
  await expect(page.getByRole('article')).toContainText('PDF floor plan · Page 1 of 1');
});

test('handles missing photos, floor plan, and branding honestly', async ({ page }) => {
  await page.goto('/#create-listing');
  await page.getByLabel('Property address', { exact: false }).fill('An empty listing');
  await generate(page);
  await expect(page.locator('.package-summary')).toContainText('SAMPLE BRANDING');
  await expect(page.getByRole('article')).toContainText('Add a property photo');
  await goTo(page, 2, 'Property'); await expect(page.getByRole('article')).toContainText('Add additional photographs');
  await goTo(page, 3, 'Floor plan & details'); await expect(page.getByRole('article')).toContainText('Add a floor plan');
  await expect(page.getByRole('article')).toContainText('Not provided');
  await goTo(page, 4, 'Realtor'); await expect(page.getByRole('article')).toContainText('Add your headshot');
});

test('offers a sample brochure with the current saved brand, including on a fresh deep link', async ({ page }) => {
  await seedBrand(page); await page.goto('/');
  await page.getByRole('button', { name: 'Preview sample brochure', exact: true }).first().click();
  await expect(page.locator('.package-summary')).toContainText('SAMPLE LISTING');
  await expect(page.getByRole('article')).toContainText('Alex Morgan');
  await goTo(page, 3, 'Floor plan & details'); await expect(page.getByRole('article')).toContainText('Illustrative sample floor plan');
  await page.reload(); await expect(page.getByRole('heading', { name: 'Marketing Package', exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toContainText('Alex Morgan');
  await expect(page.getByRole('article')).toContainText('2847 West 35th Avenue');
});

test('supports photo order, removal, and validation before generating', async ({ page }) => {
  await createListing(page);
  await page.getByLabel('Property photos', { exact: true }).setInputFiles(['public/images/property-1.jpg', 'public/images/property-2.jpg']);
  await expect(page.locator('.listing-photo-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Move photo 2 earlier', exact: true }).click();
  await expect(page.locator('.listing-photo-row').first()).toContainText('property-2.jpg');
  await page.getByRole('button', { name: 'Remove photo 2', exact: true }).click();
  await expect(page.locator('.listing-photo-row')).toHaveCount(1);
  await page.getByLabel('Property photos', { exact: true }).setInputFiles({ name: 'bad.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('broken') });
  await expect(page.locator('form').getByRole('alert')).toContainText('could not be opened');
  await expect(page.locator('.listing-photo-row')).toHaveCount(1);
  await page.getByLabel('Floor plan', { exact: true }).setInputFiles({ name: 'bad.pdf', mimeType: 'application/pdf', buffer: Buffer.from('broken') });
  await expect(page.locator('form').getByRole('alert')).toContainText('this PDF could not be opened');
  await expect(page.getByRole('button', { name: 'Generate Marketing Package', exact: true })).toBeEnabled();
});

test('all four pages fit narrow phones and desktop, with long content and readable light-brand colours', async ({ page }) => {
  await page.addInitScript(profile => localStorage.setItem('listingkit.brand-profile.v1', JSON.stringify({ ...profile, primaryColour: '#ffffff', secondaryColour: '#000000' })), brand);
  await createListing(page);
  await page.getByLabel('Property address', { exact: false }).fill('VeryLongPropertyAddress'.repeat(10));
  const description = 'A spacious home with thoughtful details and views. '.repeat(60) + 'THE END OF THE DESCRIPTION';
  await page.getByLabel('Property description').fill(description);
  await generate(page);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [index, label] of ['Cover', 'Property', 'Floor plan & details', 'Realtor'].entries()) {
      await goTo(page, index + 1, label);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.getByRole('article').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
  }
  await goTo(page, 1, 'Cover'); await expect(page.locator('.brochure-cover-content')).toHaveCSS('color', 'rgb(20, 37, 28)');
  await goTo(page, 2, 'Property'); await expect(page.getByRole('article')).toContainText('THE END OF THE DESCRIPTION');
  await expect(page.locator('.brochure-fact-strip')).toHaveCSS('color', 'rgb(255, 255, 255)');
});

test('uses saved brand colours even if contact details have not been filled in', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('listingkit.brand-profile.v1', JSON.stringify({ primaryColour: '#123456', secondaryColour: '#654321' })));
  await page.goto('/#marketing-package');
  await expect(page.getByRole('heading', { name: 'Marketing Package', exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toBeVisible();
  await expect(page.locator('.package-summary')).toContainText('SAVED BRAND PROFILE');
  await expect(page.locator('.brochure-cover-content')).toHaveCSS('background-color', 'rgb(18, 52, 86)');
  await expect(page.getByRole('article')).toContainText('Your realtor');
});
