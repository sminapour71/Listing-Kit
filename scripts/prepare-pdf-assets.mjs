import { cp, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const root = path.dirname(require.resolve('pdfjs-dist/package.json'));
await mkdir('public/pdf-assets', { recursive: true });
await cp(path.join(root, 'build/pdf.worker.min.mjs'), 'public/pdf-assets/pdf.worker.min.mjs');
for (const directory of ['cmaps', 'standard_fonts', 'wasm']) {
  await cp(path.join(root, directory), path.join('public/pdf-assets', directory), { recursive: true });
}
// Preview and PDF use the same already-packaged print fonts, without a CDN.
await mkdir('public/brochure-fonts', { recursive: true });
for (const [family, weight, style] of [['arimo',400,'normal'],['arimo',700,'normal'],['gelasio',400,'normal'],['gelasio',400,'italic'],['gelasio',700,'normal']]) {
  const fontRoot = path.dirname(require.resolve(`@fontsource/${family}/package.json`));
  await cp(path.join(fontRoot, 'files', `${family}-latin-${weight}-${style}.woff2`), `public/brochure-fonts/${family}-${weight}-${style}.woff2`);
}
