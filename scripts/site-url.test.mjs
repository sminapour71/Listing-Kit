import { test } from 'node:test';
import assert from 'node:assert/strict';
import { siteOrigin, propertyUrl } from '../app/lib/site-url.ts';
test('uses listory.ca for new public URLs regardless of Vercel automatic domains', () => {
  const oldSite = process.env.NEXT_PUBLIC_SITE_URL;
  const oldAuto = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  try {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'unowned.example';
    assert.equal(siteOrigin(), 'https://listory.ca');
    assert.equal(propertyUrl('2-58-e-40th-ave'), 'https://listory.ca/property/2-58-e-40th-ave');
    process.env.NEXT_PUBLIC_SITE_URL = 'https://owned.example/';
    assert.equal(propertyUrl('2-58-e-40th-ave'), 'https://owned.example/property/2-58-e-40th-ave');
  } finally {
    if (oldSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL = oldSite;
    if (oldAuto === undefined) delete process.env.VERCEL_PROJECT_PRODUCTION_URL; else process.env.VERCEL_PROJECT_PRODUCTION_URL = oldAuto;
  }
});
test('rejects development, malformed, or non-origin addresses', () => {
  for (const value of ['http://example.com', 'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://example.com/path', 'https://example.com?q=x', 'https://user:pass@example.com', 'https://example.com#test']) assert.throws(() => siteOrigin(value));
  assert.throws(() => propertyUrl('../other-page'));
});
