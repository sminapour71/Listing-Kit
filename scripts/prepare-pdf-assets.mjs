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
