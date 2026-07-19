import { useEffect } from 'react';

// Per-route SEO metadata — fixes the gap documented in docs/SEO_ARCHITECTURE.md §9:
// every route used to inherit the same static <title>/description/canonical from
// index.html. This component overrides document.head per-mount so each silo/blog/
// landing page gets unique, crawlable metadata + its own JSON-LD.
//
// Caveat (documented, not fixed here): this is a useEffect-based head mutation, so
// it only helps crawlers that execute JS (Googlebot does). Non-JS AI crawlers still
// need build-time prerendering — that's tracked separately in SEO_ARCHITECTURE.md §15.

export interface SEOProps {
  /** ≤60 chars. Rendered as-is — include " | SurePath" yourself for consistency. */
  title: string;
  /** ≤155 chars, should contain the primary keyword + a reason to click. */
  description: string;
  /** Site-relative path starting with "/", e.g. "/asuransi-mobil/all-risk". */
  path: string;
  /** Absolute image URL for og:image/twitter:image. Defaults to the brand logo. */
  image?: string;
  /** One or more JSON-LD objects to inject for this page (Service, FAQPage, BreadcrumbList, ...). */
  jsonLd?: object | object[];
  /** Set true for utility/state pages (e.g. calculator result states) that shouldn't be indexed. */
  noindex?: boolean;
}

const BASE_URL = 'https://myinsurepath.com';
const DEFAULT_IMAGE = `${BASE_URL}/surepath-logo.png`;
const PAGE_SCHEMA_ID = 'seo-page-schema';

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function SEO({ title, description, path, image, jsonLd, noindex }: SEOProps) {
  useEffect(() => {
    const url = `${BASE_URL}${path}`;
    const img = image ?? DEFAULT_IMAGE;

    document.title = title;
    setMeta('name', 'description', description);
    setMeta('name', 'robots', noindex ? 'noindex, follow' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
    setLink('canonical', url);

    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:image', img);

    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', img);

    // Page-specific JSON-LD — separate <script> tag from the global one in
    // index.html (Organization/WebSite stay global; this is per-page only).
    const existing = document.getElementById(PAGE_SCHEMA_ID);
    if (existing) existing.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = PAGE_SCHEMA_ID;
      const payload = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      script.text = JSON.stringify(payload.length === 1 ? payload[0] : payload).replace(/</g, '\\u003c');
      document.head.appendChild(script);
    }

    return () => {
      const s = document.getElementById(PAGE_SCHEMA_ID);
      if (s) s.remove();
    };
  }, [title, description, path, image, jsonLd, noindex]);

  return null;
}

export default SEO;
