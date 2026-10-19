import {test, expect} from '@playwright/test';

test('Yaletown guide, media, chapter anchors and the existing public shell work on desktop and mobile', async ({page}) => {
  await page.route('https://*.supabase.co/storage/v1/object/public/**',async route=>{const response=await fetch(route.request().url());await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});});
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto('/neighbourhoods/yaletown');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Yaletown Vancouver Neighbourhood Guide | Listory');
  await expect(page.locator('h1')).toHaveText('Yaletown.');
  await expect(page.locator('.public-header')).toHaveCount(1);
  await expect(page.locator('.public-logo')).toHaveAttribute('href', '/');
  await expect(page.locator('.public-account-link')).toHaveAttribute('href', '/sign-in');
  const hero = page.locator('.yaletown-hero');
  const height = await hero.evaluate(el => el.getBoundingClientRect().height);
  expect(Math.abs(height - (await page.evaluate(() => innerHeight)))).toBeLessThan(3);
  await expect(page.locator('video')).toHaveAttribute('playsinline', '');
  await expect(page.locator('video')).toHaveJSProperty('muted', true);
  await expect.poll(() => page.locator('video').evaluate((el: HTMLVideoElement) => el.readyState)).toBeGreaterThanOrEqual(2);
  await page.getByRole('button', {name:'Pause background video'}).click();
  await expect(page.locator('video')).toHaveJSProperty('paused', true);
  for (const width of [320,390,834,1440]) {
    await page.setViewportSize({width,height:844});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(() => scrollTo(0,0));
  expect(await hero.evaluate(el => el.getBoundingClientRect().height)).toBe(390);
  await expect(page.locator('.yaletown-scroll-cue')).toBeInViewport();
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Open navigation'}).click();
  await expect(page.getByRole('navigation',{name:'Public navigation'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.public-menu-toggle')).toHaveAttribute('aria-expanded','false');
  await page.locator('.yaletown-scroll-cue').click();
  await expect(page).toHaveURL(/#yaletown-introduction$/);
  for (const [label,id] of [['Old Yaletown','old-yaletown'],['Marinaside','marinaside'],['Beach District','beach-district'],['Parks & Seawall','parks-seawall'],['Lofts','lofts']]) {
    await page.getByRole('navigation',{name:'Explore Yaletown chapters'}).getByRole('link',{name:label,exact:true}).click();
    await expect(page).toHaveURL(new RegExp('#'+id+'$'));
    await expect.poll(() => page.locator('#'+id).evaluate(el => Math.abs(el.getBoundingClientRect().top - 95))).toBeLessThan(10);
  }
  await expect(page.locator('.public-header')).not.toHaveClass(/is-over-hero/);
  for (const id of ['yaletown-fresh','yaletown-current','yaletown-open-houses','yaletown-agents']) await expect(page.locator('#'+id)).toBeVisible();
  await expect(page.locator('.yaletown-guide [role="alert"]')).toHaveCount(0);
  const html = await response!.text();
  for (const field of ['owner_id','management_hash','submission_fingerprint','SUPABASE_SECRET_KEY','portfolio_subareas','banned_until']) expect(html).not.toContain(field);
  for (const img of await page.locator('.yaletown-guide img').all()) {await img.scrollIntoViewIfNeeded();await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);}
  expect(errors).toEqual([]);
  await page.locator('.public-logo').click();
  await expect(page.locator('h1')).toContainText('Every listing');
  await expect(page.locator('.public-header')).not.toHaveClass(/public-header-cinematic/);
  await page.goto('/neighbourhoods');
  await page.getByRole('link',{name:'Explore Yaletown'}).click();
  await expect(page.locator('h1')).toHaveText('Yaletown.');
});

test('reduced motion uses the real poster without requesting or playing video', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  const videos: string[] = [];
  page.on('request', request => {if(request.url().includes('.mp4'))videos.push(request.url());});
  await page.goto('/neighbourhoods/yaletown');
  await expect(page.locator('.yaletown-hero-poster')).toBeVisible();
  await expect.poll(() => page.locator('.yaletown-hero-poster').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  await expect(page.locator('video')).toHaveCount(0);
  await page.getByRole('link',{name:'Scroll to explore'}).click();
  await expect(page.locator('#yaletown-introduction')).toBeInViewport();
  expect(videos).toEqual([]);
});
