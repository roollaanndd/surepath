# SEO

How search metadata works on the marketing site, and what is deliberately not done yet.

## Single source of truth

`src/seo/seo.ts` owns every indexable URL. It holds the descriptor for each route
(title, description, canonical path, keywords, OG type, page-level JSON-LD) and
exports three things:

| Export | Used by | Purpose |
|---|---|---|
| `resolveSeo(path)` | `App.tsx` route effect, both build scripts | descriptor for a pathname |
| `headTags(d)` | `applyDocumentHead`, `scripts/prerender.mjs` | the tag list a page needs, as data |
| `applyDocumentHead(d)` | `App.tsx` route effect | writes that list into the live `<head>` |
| `canonicalFor(d)` | `headTags`, `scripts/check-prerender.mjs` | the canonical URL for a descriptor |
| `indexablePaths()` | `scripts/generate-sitemap.mjs`, `scripts/prerender.mjs` | the route inventory |

`headTags()` is the part worth understanding. **Which** tags a page gets is
defined once, there, as a list of plain objects. Two consumers only know how to
render that list: `applyDocumentHead()` writes it into the DOM at runtime, and
`scripts/prerender.mjs` writes it into static HTML at build time. A prerenderer
that rebuilt the list in its own code would be a second source of truth, and the
two would drift exactly the way the hand-written sitemap drifted from the routes.

Adding a marketing page means adding it here. Because the sitemap is generated
from `indexablePaths()`, a page cannot have metadata and be missing from the
sitemap — that drift was why the hand-written sitemap kept falling behind.

`resolveSeo()` normalises the pathname itself (trailing slashes, empty string).
Callers pass the raw path. Do not re-normalise at the call site and do not assume
it has been normalised before it arrives.

Anything that does not match a known route returns a `noindex` descriptor, so a
soft-404 shell never gets indexed under homepage metadata.

## What lives in `index.html` versus `seo.ts`

`index.html` is the single HTML file Vercel rewrites every path to, so its `<head>`
is shared by all 24 URLs and the SPA never tears it down on navigation. It may
therefore only contain things true of the **whole site**:

- the four site-wide JSON-LD nodes: `Organization`, `InsuranceAgency`, `WebSite`,
  `FinancialService`
- the homepage's own title/description/OG, which double as the fallback for
  crawlers that do not run JavaScript
- icons, PWA metadata, fonts, GA4 bootstrap

Page-specific structured data belongs in a descriptor's `jsonLd`, which
`applyDocumentHead` renders under the single `#sp-page-jsonld` node and replaces
on every route change. The homepage FAQ lives in `HOME.jsonLd` for exactly this
reason: while it sat in `index.html` it was emitted on `/privacy` and on every
product and blog page too.

Keep the homepage title in `index.html` in step with `HOME.title` in `seo.ts`. For
a non-JS crawler the `index.html` copy is the only one that exists.

## NAP

The phone number, email and address in the JSON-LD must match what the footer in
`src/pages/site/SiteLayout.tsx` displays. Google reads consistency across these as
a trust signal for a business entity, and the two disagreed for a long time.

## Internal links must be links

Navigation uses `<a href={path} onClick={e => { e.preventDefault(); navigate(path); }}>`,
never `<button onClick={() => navigate(path)}>`. A button carries no href, so it is
invisible to crawlers, cannot be opened in a new tab, and is announced as a button
rather than a link.

This matters more than it sounds: when the footer and the product cards were
buttons, 19 of 24 URLs had no crawlable inbound link at all and were reachable
only through the sitemap — no anchor text, no authority flowing from the homepage.

The same rule applies to anything that changes the URL. The blog used to switch
articles with React state and no `pushState`, so the pathname never moved, the
router never re-ran, and every article was served under the listing's metadata.

## robots.txt

`public/robots.txt` allows AI crawlers (GPTBot, ClaudeBot, PerplexityBot,
Google-Extended and friends) on purpose — `public/llms.txt` exists to feed them.

The `Disallow` list is repeated in full inside that group. A named user-agent group
**replaces** the `User-agent: *` group instead of extending it, so a group holding
only `Allow: /` would expose the portals and tokenized pages to precisely those
crawlers. If you add a path to the `*` group, add it to the AI group too.

## Prerendering

`npm run build` emits one static HTML file per indexable route into `dist/`:
`/product/car` becomes `dist/product/car/index.html`. Vercel checks the
filesystem before applying the SPA rewrite in `vercel.json`, so these files win
for their URLs; everything else still falls through to `index.html`.

Each file is the built shell with its head rewritten — same hashed asset URLs,
same inline boot scripts, same `#root`. The SPA hydrates and takes over routing
exactly as before. These files change only what a crawler sees *before* any
JavaScript runs.

This exists because client-side metadata reaches Googlebot and almost nothing
else. WhatsApp, Facebook, X, LinkedIn and the LLM crawlers read the raw HTML and
stop. Before this, the no-JS HTML for `/product/car`, `/kalkulator` and
`/blog/asuransi-all-risk-vs-tlo` returned an **identical** homepage `<title>` and
`og:title` — a car-insurance page shared into WhatsApp previewed as the homepage.
For a market where most sharing happens in WhatsApp, that was the single largest
SEO defect on the site.

Two pieces, both run by `npm run build`:

| Script | Does |
|---|---|
| `scripts/prerender.mjs` | strips the shell's static head tags, inserts `headTags(resolveSeo(path))`, writes one file per route |
| `scripts/check-prerender.mjs` | asserts the result: exactly one title/description/robots/canonical and two hreflang alternates per file, each route carrying its own title rather than the homepage's, and a bootable shell |

The check is in the build chain, not just the test suite, because the failure it
guards against is invisible to any test that runs in a browser: the SPA still
sets the right head once JavaScript runs, so a prerender regression looks fine
everywhere except to the crawlers it was built for. Break prerendering and
`npm run build` exits non-zero.

### The fallback shell

`vercel.json`'s catch-all points every unmatched path at `/_fallback.html`, not
at `/index.html`. The two documents differ in one way that matters: the fallback
is `noindex, follow` in its raw HTML.

It used to point at `/index.html`, which meant an unknown path was served the
homepage document verbatim — `index, follow`, the homepage title, the homepage
canonical — and the SPA corrected it client-side. That is precisely the
correction prerendering exists to stop depending on: a crawler running no
JavaScript was being invited to index an unbounded number of soft-404s under
homepage metadata. Splitting the documents lets `/` stay indexable (it is served
from the filesystem, not through the catch-all) while everything unmatched is
not.

The authenticated routes come through here too — `/admin`, `/agapps`,
`/custapp`, `/login`, `/review/:uuid`, `/payment` — and `noindex` is right for
all of them.

The fallback deliberately carries **no canonical**. One file answers many URLs,
so any canonical it named would be wrong for all but one of them, and `noindex`
already settles indexing.

This is the highest blast-radius file in the build: if it is missing, every SPA
deep link is a blank page. `scripts/check-prerender.mjs` asserts it exists, is
noindex, has no canonical, and still boots the app.

### Service workers

A returning PWA user does not get these files. The service worker binds
navigations to the precached `index.html`, so the SPA sets the head as it always
did. Crawlers never run a service worker, which is why this does not undo the
fix.

If you add a route, add it to `seo.ts`. The sitemap, the prerendered file and the
check all follow from `indexablePaths()` — there is nothing else to update.

## Tests

`tests/seo.spec.ts` covers all of the above: article URLs, crawlable links per
route, per-route metadata and canonicals, trailing-slash handling, hreflang,
structured-data scope, robots.txt, sitemap coverage, the GA4 route pageview, and
the contact details. None of it is visible in the UI, which is why it is tested
rather than reviewed. Run it with `npx playwright test seo.spec.ts`.

`services/__tests__/seoHead.test.ts` pins `headTags()` itself — the contract the
DOM applier and the prerenderer share — plus the invariant that every path in
`indexablePaths()` resolves to an indexable descriptor with a distinct title and
canonical.

One case in `seo.spec.ts` deserves its own note, because it is the trap this
file's assertions kept falling into. The contact-detail test originally asserted
against `/kontak`, which is **not a route** — the real path is `/contact`. An
unrouted path falls through to the catch-all, which returns HTTP 200 with the
generic shell and `noindex`, so every assertion about it passed without testing
anything. The `Indexable route sweep` block now visits every path in
`indexablePaths()` and requires it to render real content and serve
`index, follow`; that is what closes the class, not the one corrected path.
Assertions of *absence* are especially exposed to this: they pass on a page that
does not exist.

## Known gaps

- **Prerendered HTML is static, not rendered.** The head is per-route, but the
  `<body>` a crawler sees before JavaScript runs is still the shell plus the
  `<noscript>` block — there is no server-rendered page content. That is enough
  for titles, descriptions, canonicals, OG cards and JSON-LD, which is what
  social and LLM crawlers read. It is not full SSR, and this file should not be
  read as claiming otherwise.
- **No motorcycle insurance page.** `services/ojkRates.ts` already carries
  `MOTORCYCLE` rate tables, but there is no `/product/motor` route and the product
  slug whitelist in `App.tsx` does not include it. "Asuransi motor" is high-volume
  in Indonesia; this is a product decision, not a technical gap.
- **Soft 404s still return HTTP 200.** Unknown paths now serve a `noindex`
  shell rather than homepage metadata, which keeps them out of the index, but
  the status code is still 200 and there is no real 404 page. Fixing the status
  code means a Vercel-level route, not a change here.
- **Product pricing in schema.** Only travel asserts a price, because it is the
  only product with a published figure. The rest are rated per vehicle or sum
  insured, so no price is claimed rather than inventing one.
