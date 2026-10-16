import type { NextConfig } from 'next';
const config: NextConfig = {
  serverExternalPackages: ['@sparticuz/chromium', 'playwright-core'],
  outputFileTracingIncludes: {
    '/api/brochure-pdf': [
      './app/globals.css', './node_modules/tailwindcss/preflight.css',
      './node_modules/@sparticuz/chromium/bin/**',
      // Playwright loads browsers.json and other runtime assets dynamically.
      // Automatic tracing omits some of them, so ship its complete runtime.
      './node_modules/playwright-core/**/*',
      './node_modules/@fontsource/arimo/files/arimo-latin-{400,700}-normal.woff2',
      './node_modules/@fontsource/gelasio/files/gelasio-latin-{400,700}-{normal,italic}.woff2',
      './node_modules/@fontsource/bodoni-moda/files/bodoni-moda-latin-500-normal.woff2',
    ],
  },
};
export default config;
