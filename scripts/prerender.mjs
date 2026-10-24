// Emits one static HTML file per indexable marketing route into dist/, plus the
// noindex fallback shell.
//
// Why this exists: all per-route metadata was applied client-side by
// applyDocumentHead(). Googlebot renders JavaScript and saw it, but the
// crawlers that matter most for Indonesian traffic do not — WhatsApp,
// Facebook, X, LinkedIn and the LLM crawlers read the raw HTML and stop.
// For them, every URL on the site carried index.html's homepage title and
// OG image: a car-insurance page shared into WhatsApp previewed as the
// homepage. Measured before this script existed, the no-JS HTML for
// /product/car, /kalkulator and /blog/asuransi-all-risk-vs-tlo returned an
// identical <title> and og:title.
//
// There is no second source of truth here. The tag list comes from
// headTags() in src/seo/seo.ts — the same function the DOM applier consumes —
// so this script only knows how to turn a HeadTag into a string, never which
// tags a page gets.
//
// Runs after `vite build`, over dist/index.html, so every emitted file carries
// the same hashed asset URLs and the same inline boot scripts as the shell.
// The SPA still hydrates and takes over routing exactly as before; these files
// only change what a crawler sees before any JavaScript runs.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(here, '../dist');

const { indexablePaths, resolveSeo, headTags } = await import(resolve(here, '../src/seo/seo.ts'));

const shell = readFileSync(join(distDir, 'index.html'), 'utf8');

/** Escape a value for an HTML double-quoted attribute. */
function attr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Escape text content for inside <title>. */
function text(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderTag(tag) {
  switch (tag.kind) {
    case 'title':
      return `<title>${text(tag.text)}</title>`;
    case 'meta':
      return `<meta ${tag.attr}="${attr(tag.key)}" content="${attr(tag.content)}" />`;
    case 'link':
      return tag.hreflang
        ? `<link rel="${attr(tag.rel)}" hreflang="${attr(tag.hreflang)}" href="${attr(tag.href)}" />`
        : `<link rel="${attr(tag.rel)}" href="${attr(tag.href)}" />`;
    case 'jsonLd':
      // tag.json is already escaped by headTags() so it cannot close the script
      // element or break out of it.
      return `<script type="application/ld+json" id="sp-page-jsonld">${tag.json}</script>`;
    default:
      throw new Error(`prerender: unhandled head tag kind ${JSON.stringify(tag.kind)}`);
  }
}

// index.html delimits its per-route head tags with these markers, and
// everything between them is replaced wholesale.
//
// An earlier version of this script instead matched each tag with its own
// regex — one for <title>, one per meta name, one per property. Hand-rolled
// tag-shaped patterns are the wrong tool twice over: they are not reliable
// against real markup, and they left the contract implicit. Add an
// og:site_name to index.html and those regexes would have silently left it on
// every prerendered page, which is how a per-route tag turns into a site-wide
// one by accident. A marked block states which part of the head is per-route
// and makes the swap exact.
const START = '<!-- seo:per-route:start -->';
const END = '<!-- seo:per-route:end -->';

/** Replace the shell's per-route head block with `block`. */
function spliceHead(block) {
  const from = shell.indexOf(START);
  const to = shell.indexOf(END);

  if (from === -1 || to === -1 || to < from) {
    throw new Error(
      `prerender: dist/index.html is missing the ${START} / ${END} markers, ` +
        'so the per-route head block cannot be located.',
    );
  }
  if (shell.indexOf(START, from + START.length) !== -1) {
    throw new Error(`prerender: dist/index.html has more than one ${START} marker.`);
  }

  return `${shell.slice(0, from + START.length)}\n    ${block}\n    ${shell.slice(to)}`;
}

function pageHtml(descriptor) {
  return spliceHead(headTags(descriptor).map(renderTag).join('\n    '));
}

// The fallback shell, served by vercel.json's catch-all for every path with no
// file of its own. It must be noindex in the raw HTML.
//
// Before this, the catch-all pointed at /index.html, so an unknown path was
// served the homepage document verbatim: "index, follow" plus the homepage
// title and canonical. The SPA corrected it client-side, which is exactly the
// audience prerendering exists to stop relying on — a non-JS crawler was being
// invited to index an unbounded number of soft-404s under homepage metadata.
// Splitting the two documents lets / stay indexable while everything unmatched
// does not. The authenticated routes (/admin, /agapps, /login, /review/...)
// come through here too, and noindex is correct for all of them.
//
// It carries no canonical on purpose: one file answers many URLs, so any
// canonical it named would be wrong for all but one of them, and noindex
// already settles indexing.
function fallbackHtml() {
  const tags = [
    { kind: 'title', text: 'SurePath — Asuransi Digital Indonesia' },
    {
      kind: 'meta',
      attr: 'name',
      key: 'description',
      content: 'Platform asuransi digital terpercaya di Indonesia.',
    },
    { kind: 'meta', attr: 'name', key: 'robots', content: 'noindex, follow' },
  ];
  return spliceHead(tags.map(renderTag).join('\n    '));
}

const entries = indexablePaths();
let written = 0;

for (const { path } of entries) {
  const descriptor = resolveSeo(path);

  if (descriptor.index === false) {
    throw new Error(
      `prerender: ${path} is in indexablePaths() but resolveSeo() says noindex — ` +
        'the route inventory and the descriptors disagree.',
    );
  }

  // '/' is dist/index.html itself; everything else becomes <path>/index.html so
  // Vercel serves it for the extensionless URL. Vercel checks the filesystem
  // before applying the SPA rewrite in vercel.json, so these win.
  const outFile =
    path === '/' ? join(distDir, 'index.html') : join(distDir, path, 'index.html');

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, pageHtml(descriptor));
  written += 1;
}

writeFileSync(join(distDir, '_fallback.html'), fallbackHtml());

console.log(`prerender: ${written} routes + _fallback.html → dist/`);
