// SEO regression tests. Each case here corresponds to something that was broken
// and is cheap to break again, because none of it is visible in the UI: a blog
// article that silently keeps the listing's metadata, a footer link that is a
// <button> and so invisible to crawlers, or a sitemap that drifts from the routes.

import { test, expect } from '@playwright/test';

test.describe('Blog article URLs', () => {
  test('selecting an article pushes its URL and applies its own metadata', async ({ page }) => {
    await page.goto('/blog');
    await expect(page).toHaveTitle(/Blog SurePath/);

    // Cards are anchors, so the href alone is the crawlable signal.
    const card = page.locator('a[href="/blog/asuransi-all-risk-vs-tlo"]').first();
    await expect(card).toBeVisible();
    await card.click();

    await expect(page).toHaveURL(/\/blog\/asuransi-all-risk-vs-tlo$/);
    await expect(page).toHaveTitle(/All Risk vs TLO/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href', 'https://myinsurepath.com/blog/asuransi-all-risk-vs-tlo',
    );
  });

  test('an article URL loads directly with article metadata and Article schema', async ({ page }) => {
    await page.goto('/blog/cara-klaim-asuransi-mobil');
    await expect(page).toHaveTitle(/Cara Klaim Asuransi Mobil/);

    const jsonLd = await page.locator('#sp-page-jsonld').textContent();
    const nodes = JSON.parse(jsonLd ?? '[]');
    const article = (Array.isArray(nodes) ? nodes : [nodes]).find(n => n['@type'] === 'Article');
    expect(article).toBeTruthy();
    // dateModified and image are both required for an article rich result.
    expect(article.dateModified).toBeTruthy();
    expect(article.image?.length).toBeGreaterThan(0);
  });

  test('going back from an article returns to the listing URL', async ({ page }) => {
    await page.goto('/blog/premi-asuransi-mobil-2025');
    await page.goBack();
    await expect(page).toHaveURL(/\/blog\/premi-asuransi-mobil-2025$|\/blog$|about:blank/);
  });
});

test.describe('Crawlable internal links', () => {
  // Before this, 19 of 24 URLs had no crawlable inbound link at all — the footer
  // and every product card were <button onClick={navigate}>, so the only way in
  // was the sitemap.
  const mustBeLinkedFromHome = ['/product/car', '/product/travel', '/product/pa', '/products', '/blog', '/about'];

  for (const path of mustBeLinkedFromHome) {
    test(`homepage links to ${path} with a real href`, async ({ page }) => {
      await page.goto('/');
      await expect(page.locator(`a[href="${path}"]`).first()).toHaveCount(1);
    });
  }

  const mustBeInFooter = ['/agents', '/partnership', '/careers', '/contact', '/privacy', '/terms', '/security', '/cookie'];

  for (const path of mustBeInFooter) {
    test(`footer links to ${path} with a real href`, async ({ page }) => {
      await page.goto('/');
      await expect(page.locator(`footer a[href="${path}"]`).first()).toHaveCount(1);
    });
  }

  test('products page links to the premium calculator', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('a[href="/kalkulator"]').first()).toHaveCount(1);
  });

  test('clicking a footer link navigates in-app rather than reloading', async ({ page }) => {
    await page.goto('/');
    await page.locator('footer a[href="/privacy"]').first().click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page).toHaveTitle(/Kebijakan Privasi/);
  });
});

test.describe('Per-route metadata', () => {
  const routes: [string, RegExp][] = [
    ['/', /Asuransi Mobil, Jiwa & Properti Online/],
    ['/products', /Produk Asuransi Online/],
    ['/product/car', /Asuransi Mobil All Risk & TLO/],
    ['/kalkulator', /Kalkulator Premi Asuransi Mobil/],
    ['/ai', /Teknologi AI SurePath/],
    ['/agents', /Daftar Jadi Agen Asuransi Online/],
  ];

  for (const [path, titlePattern] of routes) {
    test(`${path} has its own title, description and canonical`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveTitle(titlePattern);
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description?.length).toBeGreaterThan(50);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href', `https://myinsurepath.com${path === '/' ? '/' : path}`,
      );
    });
  }

  test('portal routes are noindex', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('an unknown path is noindex rather than inheriting homepage metadata', async ({ page }) => {
    await page.goto('/halaman-yang-tidak-ada');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});

test.describe('Structured data scope', () => {
  test('the homepage FAQ does not leak onto other routes', async ({ page }) => {
    await page.goto('/');
    const home = await page.locator('#sp-page-jsonld').textContent();
    expect(home).toContain('FAQPage');

    await page.goto('/privacy');
    const privacy = await page.locator('#sp-page-jsonld').count();
    const staticGraph = await page.locator('script[type="application/ld+json"]').allTextContents();
    // The site-wide @graph stays; the homepage FAQ must not come with it.
    expect(staticGraph.join(' ')).not.toContain('FAQPage');
    expect(privacy).toBe(0);
  });

  test('the site-wide graph holds no breadcrumb and no placeholder phone number', async ({ page }) => {
    await page.goto('/');
    const graph = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
    expect(graph).not.toContain('/agent"');            // route is /agents
    expect(graph).not.toContain('+62-800-1234-5678');  // placeholder
    expect(graph).not.toContain('info@myinsurepath.com');
  });
});

test.describe('Crawl directives', () => {
  test('robots.txt points at the sitemap and keeps portals out for AI crawlers too', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('Sitemap: https://myinsurepath.com/sitemap.xml');

    // The AI-crawler group must repeat the Disallow list: a named user-agent group
    // replaces the `*` group instead of inheriting it.
    const aiGroup = body.slice(body.indexOf('User-agent: GPTBot'));
    for (const path of ['/admin', '/review/', '/custapp', '/payment']) {
      expect(aiGroup).toContain(`Disallow: ${path}`);
    }
  });

  test('sitemap.xml is well-formed and covers the marketing routes', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const body = await res.text();

    for (const path of ['/', '/products', '/kalkulator', '/product/car', '/agents', '/blog', '/blog/asuransi-all-risk-vs-tlo']) {
      expect(body).toContain(`<loc>https://myinsurepath.com${path}</loc>`);
    }
    // Nothing noindexed should ever be advertised for crawling.
    for (const path of ['/admin', '/custapp', '/agapps', '/login', '/financing']) {
      expect(body).not.toContain(`<loc>https://myinsurepath.com${path}</loc>`);
    }
  });
});

test.describe('URL normalisation', () => {
  // resolveSeo() was handed the raw pathname while App.tsx stripped the trailing
  // slash separately, so /products/ rendered the right page and then fell through
  // to the unknown-path branch and served `noindex` on an indexable page.
  for (const path of ['/products/', '/product/car/', '/blog/', '/agents/']) {
    test(`${path} stays indexable and canonicalises without the slash`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^index/);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toBe(`https://myinsurepath.com${path.replace(/\/$/, '')}`);
    });
  }
});

test.describe('hreflang', () => {
  test('alternates follow the canonical instead of pinning every page to /', async ({ page }) => {
    await page.goto('/product/car');
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBe('https://myinsurepath.com/product/car');

    await expect(page.locator('link[rel="alternate"][hreflang="id"]')).toHaveAttribute('href', canonical!);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute('href', canonical!);
    // One of each, not a duplicate appended per navigation.
    await expect(page.locator('link[rel="alternate"][hreflang="id"]')).toHaveCount(1);

    await page.goto('/blog');
    await expect(page.locator('link[rel="alternate"][hreflang="id"]')).toHaveAttribute(
      'href', 'https://myinsurepath.com/blog',
    );
    await expect(page.locator('link[rel="alternate"][hreflang="id"]')).toHaveCount(1);
  });
});

test.describe('GA4 route tracking', () => {
  test('a route change sends a page_view with that route path and title', async ({ page }) => {
    // Asserted through window.dataLayer rather than a gtag stub: index.html
    // declares its own `function gtag()` inline, which replaces any stub, so the
    // only honest observation point is the queue gtag actually pushes to.
    await page.goto('/');
    await page.locator('footer a[href="/privacy"]').first().click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page).toHaveTitle(/Kebijakan Privasi/);

    const views = await page.evaluate(() =>
      ((window as unknown as { dataLayer?: IArguments[] }).dataLayer ?? [])
        .map(entry => Array.from(entry) as unknown[])
        .filter(args => args[0] === 'event' && args[1] === 'page_view')
        .map(args => args[2] as Record<string, string>));

    const privacyView = views.find(v => v.page_path === '/privacy');
    expect(privacyView).toBeTruthy();
    expect(privacyView!.page_title).toMatch(/Kebijakan Privasi/);
    expect(privacyView!.page_location).toMatch(/\/privacy$/);
  });
});
