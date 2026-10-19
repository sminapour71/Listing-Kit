import {test, expect} from '@playwright/test';

test('public canonical URLs use listory.ca on every host without changing old route paths', async ({page}) => {
  for (const path of ['/', '/fresh', '/buy', '/agents', '/open-houses', '/guides', '/neighbourhoods', '/for-agents', '/fresh?location=Yaletown&page=2']) {
    const response = await page.goto(path, {waitUntil:'domcontentloaded'});
    expect(response?.status()).toBe(200);
    const canonical = 'https://listory.ca' + (path.split('?')[0] === '/' ? '' : path.split('?')[0]);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical);
  }
  // Existing published slugs remain readable through the same routes, even
  // when the incoming host is local/a legacy alias rather than the canonical host.
  await page.goto('/property/1806-1480-howe-street', {waitUntil:'domcontentloaded'});
  await expect(page.locator('h1')).toContainText('1480 Howe Street');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://listory.ca/property/1806-1480-howe-street');
  await page.goto('/agent/shahin-minapour', {waitUntil:'domcontentloaded'});
  await expect(page.locator('h1')).toContainText('Shahin');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://listory.ca/agent/shahin-minapour');
  const propertyLinks = page.locator('.agent-property-card');
  expect(await propertyLinks.count()).toBeGreaterThan(0);
  for (const link of await propertyLinks.all()) expect(await link.getAttribute('href')).toMatch(/^https:\/\/listory\.ca\/property\/[a-z0-9-]+$/);
  await page.goto('/login');
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole('heading',{name:'Welcome back.'})).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await page.goto('/workspace');
  await expect(page).toHaveURL(/\/sign-in\?next=/);
});
