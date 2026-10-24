// headTags() is the contract two consumers share: applyDocumentHead() writes it
// into the live DOM, scripts/prerender.mjs writes it into static HTML at build
// time. Testing the list itself — rather than each consumer's output — is what
// keeps the two from drifting, which is the failure this whole arrangement
// exists to prevent.
import { describe, it, expect } from 'vitest';
import {
  SITE,
  headTags,
  canonicalFor,
  resolveSeo,
  indexablePaths,
  applyDocumentHead,
  type HeadTag,
} from '../../src/seo/seo';

function meta(tags: HeadTag[], key: string): string | undefined {
  const t = tags.find(x => x.kind === 'meta' && x.key === key);
  return t && t.kind === 'meta' ? t.content : undefined;
}

function links(tags: HeadTag[], rel: string) {
  return tags.filter(x => x.kind === 'link' && x.rel === rel) as Extract<
    HeadTag,
    { kind: 'link' }
  >[];
}

describe('canonicalFor', () => {
  it('keeps the root slash and strips every other trailing slash', () => {
    expect(canonicalFor({ title: 't', description: 'd', path: '/' })).toBe(`${SITE.origin}/`);
    expect(canonicalFor({ title: 't', description: 'd', path: '/products' })).toBe(
      `${SITE.origin}/products`,
    );
    expect(canonicalFor({ title: 't', description: 'd', path: '/products/' })).toBe(
      `${SITE.origin}/products`,
    );
  });
});

describe('headTags', () => {
  it('emits exactly one title, description, robots and canonical', () => {
    const tags = headTags(resolveSeo('/product/car'));
    expect(tags.filter(t => t.kind === 'title')).toHaveLength(1);
    expect(tags.filter(t => t.kind === 'meta' && t.key === 'description')).toHaveLength(1);
    expect(tags.filter(t => t.kind === 'meta' && t.key === 'robots')).toHaveLength(1);
    expect(links(tags, 'canonical')).toHaveLength(1);
  });

  it('points both hreflang alternates at the page itself, not at /', () => {
    const tags = headTags(resolveSeo('/kalkulator'));
    const alts = links(tags, 'alternate');
    expect(alts.map(a => a.hreflang).sort()).toEqual(['id', 'x-default']);
    for (const a of alts) {
      expect(a.href).toBe(`${SITE.origin}/kalkulator`);
    }
  });

  it('mirrors the title and description into Open Graph and Twitter', () => {
    const d = resolveSeo('/product/travel');
    const tags = headTags(d);
    expect(meta(tags, 'og:title')).toBe(d.title);
    expect(meta(tags, 'twitter:title')).toBe(d.title);
    expect(meta(tags, 'og:description')).toBe(d.description);
    expect(meta(tags, 'twitter:description')).toBe(d.description);
    expect(meta(tags, 'og:url')).toBe(canonicalFor(d));
  });

  it('falls back to the site OG image when a page sets none', () => {
    const tags = headTags({ title: 't', description: 'd', path: '/x' });
    expect(meta(tags, 'og:image')).toBe(SITE.defaultOgImage);
    expect(meta(tags, 'twitter:image')).toBe(SITE.defaultOgImage);
  });

  it('emits noindex for a non-indexable descriptor and index otherwise', () => {
    expect(meta(headTags(resolveSeo('/admin')), 'robots')).toBe('noindex, follow');
    expect(meta(headTags(resolveSeo('/')), 'robots')).toContain('index, follow');
  });

  it('omits the keywords tag rather than emitting it empty', () => {
    const tags = headTags({ title: 't', description: 'd', path: '/x' });
    expect(tags.some(t => t.kind === 'meta' && t.key === 'keywords')).toBe(false);
  });

  it('escapes JSON-LD so it cannot break out of the script element', () => {
    const tags = headTags({
      title: 't',
      description: 'd',
      path: '/x',
      jsonLd: {
        '@type': 'Thing',
        // Every way out of a <script> block, not just </script>: <!-- and
        // <script open a nested parse state, &amp; could be reinterpreted as an
        // entity, and U+2028/9 are JSON-legal but terminate a JS line.
        name: '</script><script>alert(1)</script> <!-- &amp; \u2028\u2029',
      },
    });
    const node = tags.find(t => t.kind === 'jsonLd');
    if (node?.kind !== 'jsonLd') throw new Error('expected a jsonLd tag');

    for (const forbidden of ['<', '>', '&', '\u2028', '\u2029']) {
      expect(node.json, `raw ${JSON.stringify(forbidden)} survived`).not.toContain(forbidden);
    }
    // And it must still be parseable JSON that round-trips the value.
    const parsed = JSON.parse(node.json) as { name: string };
    expect(parsed.name).toBe('</script><script>alert(1)</script> <!-- &amp; \u2028\u2029');
  });

  it('emits no JSON-LD node for a page that declares none', () => {
    const tags = headTags({ title: 't', description: 'd', path: '/x' });
    expect(tags.some(t => t.kind === 'jsonLd')).toBe(false);
  });
});

describe('the route inventory and the descriptors agree', () => {
  // scripts/prerender.mjs throws if these disagree, which would fail the build.
  // Catching it here names the offending route instead.
  it('every path in indexablePaths() resolves to an indexable descriptor', () => {
    for (const { path } of indexablePaths()) {
      const d = resolveSeo(path);
      expect(d.index === false, `${path} is listed as indexable but resolves to noindex`).toBe(
        false,
      );
    }
  });

  it('every indexable route has a distinct title and canonical', () => {
    const titles = new Map<string, string>();
    const canonicals = new Map<string, string>();
    for (const { path } of indexablePaths()) {
      const d = resolveSeo(path);
      expect(titles.has(d.title), `${path} reuses the title of ${titles.get(d.title)}`).toBe(false);
      titles.set(d.title, path);
      const c = canonicalFor(d);
      expect(canonicals.has(c), `${path} reuses the canonical of ${canonicals.get(c)}`).toBe(false);
      canonicals.set(c, path);
    }
  });
});

describe('applyDocumentHead', () => {
  it('replaces the previous route JSON-LD instead of stacking it', () => {
    applyDocumentHead(resolveSeo('/product/car'));
    expect(document.querySelectorAll('#sp-page-jsonld')).toHaveLength(1);
    applyDocumentHead(resolveSeo('/product/travel'));
    expect(document.querySelectorAll('#sp-page-jsonld')).toHaveLength(1);
  });

  it('removes the JSON-LD node when navigating to a route that has none', () => {
    applyDocumentHead({
      title: 't',
      description: 'd',
      path: '/x',
      jsonLd: { '@type': 'Thing' },
    });
    expect(document.querySelectorAll('#sp-page-jsonld')).toHaveLength(1);
    // A route with no JSON-LD must not inherit the previous route's.
    applyDocumentHead({ title: 't2', description: 'd2', path: '/y' });
    expect(document.querySelectorAll('#sp-page-jsonld')).toHaveLength(0);
  });

  it('keeps one canonical and two alternates across repeated navigations', () => {
    applyDocumentHead(resolveSeo('/'));
    applyDocumentHead(resolveSeo('/products'));
    applyDocumentHead(resolveSeo('/kalkulator'));
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelectorAll('link[rel="alternate"]')).toHaveLength(2);
    expect(
      document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe(`${SITE.origin}/kalkulator`);
  });
});
