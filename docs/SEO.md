# SEO

How search metadata works on the marketing site, and what is deliberately not done yet.

## Single source of truth

`src/seo/seo.ts` owns every indexable URL. It holds the descriptor for each route
(title, description, canonical path, keywords, OG type, page-level JSON-LD) and
exports three things:

| Export | Used by | Purpose |
|---|---|---|
| `resolveSeo(path)` | `App.tsx` route effect | descriptor for a pathname |
| `applyDocumentHead(d)` | `App.tsx` route effect | writes it into `<head>` |
| `indexablePaths()` | `scripts/generate-sitemap.mjs` | renders `public/sitemap.xml` |

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

## Tests

`tests/seo.spec.ts` covers all of the above: article URLs, crawlable links per
route, per-route metadata and canonicals, trailing-slash handling, hreflang,
structured-data scope, robots.txt, sitemap coverage, and the GA4 route pageview.
None of it is visible in the UI, which is why it is tested rather than reviewed.

Run it with `npx playwright test seo.spec.ts`.

## Known gaps

- **No prerendering.** All per-route metadata is applied client-side. Googlebot
  renders JavaScript and sees it, but WhatsApp, Facebook, X, LinkedIn and the LLM
  crawlers do not — for them every URL still carries `index.html`'s homepage
  title and OG image. Given how much Indonesian traffic arrives through WhatsApp
  shares, this is the largest remaining item. The fix is to emit one static HTML
  file per marketing route at build time, generated from `resolveSeo()` so no
  second source of truth appears.
- **No motorcycle insurance page.** `services/ojkRates.ts` already carries
  `MOTORCYCLE` rate tables, but there is no `/product/motor` route and the product
  slug whitelist in `App.tsx` does not include it. "Asuransi motor" is high-volume
  in Indonesia; this is a product decision, not a technical gap.
- **Soft 404s.** Unknown paths return HTTP 200 with the SPA shell. `noindex`
  mitigates it, but there is no real 404 page.
- **Product pricing in schema.** Only travel asserts a price, because it is the
  only product with a published figure. The rest are rated per vehicle or sum
  insured, so no price is claimed rather than inventing one.
