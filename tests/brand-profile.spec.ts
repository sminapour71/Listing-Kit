import { test, expect, type Page } from '@playwright/test';
const key = 'listingkit.brand-profile.v1';
async function openBrand(page: Page) {
  await page.goto('/#brand-profile');
  await expect(page.getByRole('heading', { name: 'Brand Profile', exact: true })).toBeVisible();
  await expect(page.getByLabel('First name', { exact: true })).toBeEnabled();
}
async function navigate(page: Page, label: string) {
  const menu = page.getByRole('button', { name: 'Toggle navigation' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button', { name: label, exact: true }).click();
}

test('contact details, both colours and all images are reusable after save and refresh', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await openBrand(page);
  const details = { 'First name': 'Jamie', 'Last name': 'Davis', 'Realtor title': 'Realtor', 'Team name': 'The Davis Group', 'Brokerage name': 'West Coast Realty', 'Phone number': '(604) 555-0123', Email: 'jamie@example.com', Website: 'www.jamiedavis.com', 'Instagram handle': '@jamiedavis' };
  for (const [label, value] of Object.entries(details)) await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel('Primary brand colour', { exact: true }).fill('#123456');
  await page.getByLabel('Secondary colour picker', { exact: true }).fill('#fedcba');
  for (const label of ['Headshot', 'Personal logo', 'Brokerage logo']) {
    await page.getByLabel(label, { exact: true }).setInputFiles('public/images/property-1.jpg');
    await expect(page.getByAltText(`${label} preview`, { exact: true })).toBeVisible();
  }
  await expect(page.locator('.brand-preview h2')).toHaveText('Jamie Davis');
  await expect(page.locator('.brand-preview-contact')).toContainText('jamie@example.com');
  await expect(page.locator('.brand-preview-banner')).toHaveCSS('background-color', 'rgb(18, 52, 86)');
  await page.getByRole('button', { name: 'Save Brand Profile' }).click();
  await expect(page.getByRole('status')).toContainText('Brand profile saved in this browser');
  await expect(page.locator('.profile strong')).toHaveText('Jamie Davis');
  await page.reload();
  await expect(page.getByLabel('First name', { exact: true })).toHaveValue('Jamie');
  for (const [label, value] of Object.entries(details)) await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
  await expect(page.getByLabel('Primary brand colour', { exact: true })).toHaveValue('#123456');
  await expect(page.getByLabel('Secondary brand colour', { exact: true })).toHaveValue('#FEDCBA');
  for (const label of ['Headshot', 'Personal logo', 'Brokerage logo']) await expect(page.getByAltText(`${label} preview`, { exact: true })).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
  const width = await page.getByAltText('Headshot preview', { exact: true }).evaluate((img: HTMLImageElement) => img.naturalWidth);
  expect(width).toBeGreaterThan(0); expect(width).toBeLessThanOrEqual(1600);
  await navigate(page, 'Listings 03');
  await expect(page.getByRole('heading', { name: /Listings/ })).toBeVisible();
  await navigate(page, 'Brand Profile');
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('jamie@example.com');
  await page.getByRole('button', { name: 'Remove headshot', exact: true }).click();
  await page.getByRole('button', { name: 'Save Brand Profile' }).click();
  await page.reload();
  await expect(page.getByLabel('First name', { exact: true })).toHaveValue('Jamie');
  await expect(page.getByAltText('Headshot preview', { exact: true })).toHaveCount(0);
  await expect(page.getByAltText('Personal logo preview', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('rejects invalid, oversized, and unreadable images without replacing an existing image', async ({ page }) => {
  await openBrand(page);
  const input = page.getByLabel('Headshot', { exact: true });
  await input.setInputFiles('public/images/property-1.jpg');
  const preview = page.getByAltText('Headshot preview', { exact: true });
  await expect(preview).toBeVisible(); const original = await preview.getAttribute('src');
  await input.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Not an image') });
  await expect(page.locator('.brand-page').getByRole('alert')).toContainText('Please choose a JPG, PNG, or WEBP');
  await input.setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(8 * 1024 * 1024 + 1) });
  await expect(page.locator('.brand-page').getByRole('alert')).toContainText('smaller than 8 MB');
  await input.setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('Not an image') });
  await expect(page.locator('.brand-page').getByRole('alert')).toContainText('This image could not be opened');
  await expect(preview).toHaveAttribute('src', original!);
});

test('shows an honest error when browser storage is full or blocked', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
  await openBrand(page);
  await page.getByLabel('First name', { exact: true }).fill('Still here');
  await page.getByRole('button', { name: 'Save Brand Profile' }).click();
  await expect(page.locator('.brand-page').getByRole('alert')).toContainText('Storage may be full or blocked');
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByLabel('First name', { exact: true })).toHaveValue('Still here');
  await expect(page.locator('.brand-save-state')).toContainText('Unsaved changes');
});

test('recovers from damaged saved data and can save a new profile', async ({ page }) => {
  await page.addInitScript(key => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(key, '{broken'); sessionStorage.setItem('seeded', 'yes'); } }, key);
  await openBrand(page);
  await expect(page.locator('.brand-page').getByRole('alert')).toContainText('could not be opened');
  await page.getByLabel('First name', { exact: true }).fill('Recovered');
  await page.getByRole('button', { name: 'Save Brand Profile' }).click();
  await expect(page.getByRole('status')).toContainText('Brand profile saved');
  await page.reload();
  await expect(page.getByLabel('First name', { exact: true })).toHaveValue('Recovered');
  await expect(page.locator('.brand-page').getByRole('alert')).toHaveCount(0);
});

test('validates email and colour codes before saving', async ({ page }) => {
  await openBrand(page);
  await page.getByLabel('Email', { exact: true }).fill('not-an-email');
  await page.getByRole('button', { name: 'Save Brand Profile' }).click();
  expect(await page.getByLabel('Email', { exact: true }).evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(false);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
  await page.getByLabel('Email', { exact: true }).fill('valid@example.com');
  await page.getByLabel('Primary brand colour', { exact: true }).fill('bad');
  await page.getByRole('button', { name: 'Save Brand Profile' }).click();
  expect(await page.getByLabel('Primary brand colour', { exact: true }).evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(false);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull();
});

test('fits desktop, tablet, and narrow phone displays, including long contact details', async ({ page }) => {
  await openBrand(page);
  await page.getByLabel('First name', { exact: true }).fill('A'.repeat(150));
  await page.getByLabel('Email', { exact: true }).fill('long'.repeat(40) + '@example.com');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('button', { name: 'Save Brand Profile' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('existing listing filters, search, and create-listing screen still work', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.listing-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'Active2', exact: true }).click();
  await expect(page.locator('.listing-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'All listings3', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search listings' }).fill('Howe');
  await expect(page.locator('.listing-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Create Listing', exact: true }).click();
  await page.getByLabel('Property address').fill('123 Sample Street');
  await page.getByRole('button', { name: 'Generate Marketing Package' }).click();
  await expect(page.getByRole('heading', { name: 'Marketing Package', exact: true })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Brochure page 1: Cover' })).toContainText('123 Sample Street');
});
