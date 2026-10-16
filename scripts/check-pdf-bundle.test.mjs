import { test } from 'node:test';
import { mkdtemp, readFile, lstat, mkdir, readlink, symlink, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// Run after `npm run build`. A normal Next server sees all node_modules and
// cannot detect missing files in the deployment's output-file trace.
test('PDF deployment trace can initialize its renderer without the full installation', { timeout: 60_000 }, async () => {
  const root = process.cwd();
  const tracePath = path.join(root, '.next/server/app/api/brochure-pdf/route.js.nft.json');
  const trace = JSON.parse(await readFile(tracePath, 'utf8'));
  const isolated = await mkdtemp(path.join(tmpdir(), 'listory-pdf-bundle-'));
  try {
    const files = [...trace.files.map(file => path.resolve(path.dirname(tracePath), file)), tracePath.replace('.nft.json', '')];
    for (const file of files) {
      const relative = path.relative(root, file);
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Unexpected file outside project trace');
      const target = path.join(isolated, relative);
      await mkdir(path.dirname(target), { recursive: true });
      if ((await lstat(file)).isSymbolicLink()) await symlink(await readlink(file), target);
      else await copyFile(file, target);
    }
    await promisify(execFile)(process.execPath, ['--input-type=module', '--eval', `
      import assert from 'node:assert/strict';
      import { createRequire } from 'node:module';
      const require = createRequire(import.meta.url);
      const { routeModule } = require('./.next/server/app/api/brochure-pdf/route.js');
      await routeModule.ensureUserland();
      const response = await routeModule.userland.POST(new Request('http://localhost/api/brochure-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
      }));
      assert.equal(response.status, 400, 'Renderer must initialize and validate the request');
    `], { cwd: isolated, env: { ...process.env, NODE_ENV: 'production', VERCEL: '1' }, timeout: 45_000 });
  } finally { await rm(isolated, { recursive: true, force: true }); }
});
