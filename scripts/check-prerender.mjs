// Verifies the prerendered output in dist/ after scripts/prerender.mjs has run.
//
// The unit tests in services/__tests__/seoHead.test.ts pin the tag list; this
// checks what actually landed on disk, because the failure being guarded
// against is specifically a route serving the homepage's metadata. A silent
// regression here looks fine in every test that runs in a browser — the SPA
// still sets the right head once JavaScript runs — and is only visible to a
// crawler that never executes it.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, '../dist');

const { indexablePaths, resolveSeo, canonicalFor } = await import(
  resolve(here, '../src/seo/seo.ts')
);

const failures = [];

const HTML_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" };

/** Reverse the escaping scripts/prerender.mjs applies, in a single pass.
 *
 *  Chained replaces unescape twice: running /&amp;/ before /&lt;/ turns the
 *  literal text "&amp;lt;" into "&lt;" and then into "<", so a title containing
 *  an escaped entity would be compared wrong. One pass over the alternation
 *  cannot feed its own output back in. (CodeQL js/double-escaping, caught on
 *  this PR.)
 */
function unescapeHtml(value) {
  return value.replace(/&(amp|lt|gt|quot|#39);/g, (_, name) => HTML_ENTITIES[name]);
}

function countOf(html, pattern) {
  return (html.match(pattern) ?? []).length;
}

const SINGLETONS = [
  ['title', /<title>/g],
  ['meta description', /name="description"/g],
  ['meta robots', /name="robots"/g],
  ['canonical', /rel="canonical"/g],
  ['og:title', /property="og:title"/g],
  ['og:url', /property="og:url"/g],
  ['og:image', /property="og:image"\s/g],
  ['twitter:title', /name="twitter:title"/g],
];

const entries = indexablePaths();
const homeTitle = resolveSeo('/').title;
const seenTitles = new Map();

for (const { path } of entries) {
  const file = path === '/' ? join(distDir, 'index.html') : join(distDir, path, 'index.html');

  if (!existsSync(file)) {
    failures.push(`${path}: no prerendered file at ${file.replace(distDir, 'dist')}`);
    continue;
  }

  const html = readFileSync(file, 'utf8');
  const d = resolveSeo(path);

  // Exactly one of each tag the prerenderer owns. Two titles means the shell's
  // copy was not stripped, and a crawler may believe either.
  for (const [label, pattern] of SINGLETONS) {
    const n = countOf(html, pattern);
    if (n !== 1) failures.push(`${path}: expected 1 ${label}, found ${n}`);
  }

  // Both hreflang alternates, and no more.
  const alts = countOf(html, /rel="alternate"/g);
  if (alts !== 2) failures.push(`${path}: expected 2 hreflang alternates, found ${alts}`);

  // The page's own title, not the homepage's. This is the original defect.
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
  const title = titleMatch ? unescapeHtml(titleMatch[1]) : null;
  if (title === null) {
    failures.push(`${path}: no <title> in the prerendered file`);
  } else {
    if (title !== d.title) {
      failures.push(`${path}: title is ${JSON.stringify(title)}, expected ${JSON.stringify(d.title)}`);
    }
    if (path !== '/' && title === homeTitle) {
      failures.push(`${path}: serves the homepage title — prerendering did not take effect`);
    }
    const dupe = seenTitles.get(title);
    if (dupe !== undefined) failures.push(`${path}: shares its title with ${dupe}`);
    seenTitles.set(title, path);
  }

  // The canonical must be this page's, or duplicate-content signals collapse
  // every route onto one URL.
  const canonical = html.match(/rel="canonical" href="([^"]*)"/)?.[1];
  const expected = canonicalFor(d);
  if (canonical !== expected) {
    failures.push(`${path}: canonical is ${JSON.stringify(canonical)}, expected ${JSON.stringify(expected)}`);
  }

  // The SPA must still boot from a prerendered file: these are the same shell
  // with a rewritten head, not a replacement for it.
  if (!/<script type="module"[^>]+src="\/assets\//.test(html)) {
    failures.push(`${path}: no hashed module script — the app would not boot from this file`);
  }
  if (!html.includes('id="root"')) {
    failures.push(`${path}: no #root mount point`);
  }
}

// The fallback shell. vercel.json's catch-all points every unmatched path at
// this file, so if it is missing or wrong, every SPA deep link breaks — the
// portals, /login, /review/:uuid, the payment return. That makes it the highest
// blast-radius file in the build, and worth asserting rather than assuming.
const fallbackFile = join(distDir, '_fallback.html');
if (!existsSync(fallbackFile)) {
  failures.push('_fallback.html is missing — vercel.json rewrites every unmatched path to it');
} else {
  const fb = readFileSync(fallbackFile, 'utf8');

  // Raw-HTML noindex is the point: an unknown path must not present itself as
  // an indexable page to a crawler that runs no JavaScript.
  const robots = fb.match(/name="robots" content="([^"]*)"/)?.[1];
  if (robots !== 'noindex, follow') {
    failures.push(`_fallback.html robots is ${JSON.stringify(robots)}, expected "noindex, follow"`);
  }
  if (countOf(fb, /name="robots"/g) !== 1) {
    failures.push(`_fallback.html has ${countOf(fb, /name="robots"/g)} robots tags, expected 1`);
  }

  // One file answers many URLs, so it must not claim a canonical for any of them.
  if (countOf(fb, /rel="canonical"/g) !== 0) {
    failures.push('_fallback.html declares a canonical — it answers many URLs and can own none of them');
  }
  if (countOf(fb, /rel="alternate"/g) !== 0) {
    failures.push('_fallback.html declares an hreflang alternate');
  }

  // And it must still boot the app, or every deep link is a blank page.
  if (!/<script type="module"[^>]+src="\/assets\//.test(fb)) {
    failures.push('_fallback.html has no hashed module script — every SPA deep link would be blank');
  }
  if (!fb.includes('id="root"')) {
    failures.push('_fallback.html has no #root mount point');
  }
}

// The homepage keeps its own indexable document, which only works while / is
// served from the filesystem rather than through the catch-all.
const homeRobots = readFileSync(join(distDir, 'index.html'), 'utf8').match(
  /name="robots" content="([^"]*)"/,
)?.[1];
if (!homeRobots?.startsWith('index, follow')) {
  failures.push(`dist/index.html robots is ${JSON.stringify(homeRobots)}, expected to start "index, follow"`);
}

if (failures.length > 0) {
  console.error(`✗ prerender check failed (${failures.length}):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `✓ prerender check passed: ${entries.length} routes each with their own title, canonical and a bootable shell, plus a noindex _fallback.html.`,
);
