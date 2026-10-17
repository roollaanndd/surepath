#!/usr/bin/env node
// Release gate for the generated SurePath PWA. This catches a successful web
// build that accidentally omits the service worker, manifest, or install icons.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const fail = message => {
  console.error(`✗ PWA release check failed: ${message}`);
  process.exitCode = 1;
};

for (const file of ['index.html', 'manifest.webmanifest', 'sw.js']) {
  const path = join(dist, file);
  if (!existsSync(path) || statSync(path).size === 0) fail(`missing or empty dist/${file}`);
}

if (process.exitCode) process.exit(1);

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const manifest = JSON.parse(readFileSync(join(dist, 'manifest.webmanifest'), 'utf8'));
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));

if (!/manifest\.webmanifest/i.test(html)) fail('built HTML does not link the web app manifest');
// SurePath registers through virtual:pwa-register in index.tsx, so the call is
// bundled into the hashed application entry instead of necessarily being a
// separate script tag in dist/index.html.
function listJsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listJsFiles(path);
    return entry.isFile() && path.endsWith('.js') ? [path] : [];
  });
}
const bundles = listJsFiles(join(dist, 'assets'));
const bundleSource = bundles.map(path => readFileSync(path, 'utf8')).join('\\n');
if (!bundles.length || !/(serviceWorker|registerSW)/i.test(bundleSource)) {
  fail('built JavaScript does not contain the PWA service-worker registration code');
}
if (manifest.start_url !== '/' || manifest.scope !== '/' || manifest.id !== '/') {
  fail('manifest app identity/start_url/scope must remain pinned to the root');
}
if (manifest.display !== 'standalone') fail('manifest must retain standalone display mode');

const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
for (const requiredSize of ['192x192', '512x512']) {
  if (!icons.some(icon => icon.sizes === requiredSize)) fail(`manifest is missing required ${requiredSize} icon`);
}
if (!icons.some(icon => icon.purpose === 'maskable')) fail('manifest is missing a maskable icon');

for (const icon of icons) {
  const localPath = String(icon.src || '').replace(/^\//, '');
  if (!localPath || /^https?:\/\//i.test(localPath)) continue;
  if (!existsSync(join(dist, localPath))) fail(`manifest icon file not found: ${localPath}`);
}

const headers = Array.isArray(vercel.headers) ? vercel.headers : [];
const hasNoCache = source => headers.some(entry =>
  entry.source === source &&
  (entry.headers || []).some(header =>
    header.key.toLowerCase() === 'cache-control' &&
    /no-cache/.test(header.value) &&
    /must-revalidate|no-store/.test(header.value)
  )
);
if (!hasNoCache('/sw.js')) fail('Vercel must not immutably cache /sw.js');
if (!headers.some(entry => entry.source === '/manifest.webmanifest' &&
  (entry.headers || []).some(header => header.key.toLowerCase() === 'cache-control' && /no-cache/.test(header.value)))) {
  fail('Vercel must revalidate /manifest.webmanifest');
}

if (process.exitCode) process.exit(1);
console.log(`✓ PWA release check passed: service worker, registration, manifest, ${icons.length} icons, and update cache headers verified.`);
