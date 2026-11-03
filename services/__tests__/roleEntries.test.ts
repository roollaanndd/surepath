// Phase-2 role entries guard (APP_SEPARATION_PLAN).
//
// The four role entries (customer / agent / operator / admin) are additive:
// the universal shell (index.html + index.tsx) must stay untouched and the
// entries stay dormant (noindex, no SW registration) until their smoke tests
// pass. This source-level guard keeps those invariants visible.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const ENTRIES = [
  { html: 'customer.html', boot: 'src/entries/customer.tsx', route: '/custapp' },
  { html: 'agent.html', boot: 'src/entries/agent.tsx', route: '/agapps' },
  { html: 'operator.html', boot: 'src/entries/operator.tsx', route: '/operatorapp' },
  { html: 'admin.html', boot: 'src/entries/admin.tsx', route: '/admin' },
];

describe('phase-2 role entries', () => {
  it('the universal shell keeps its canonical boot (no SW-less drift)', () => {
    const index = read('index.tsx');
    expect(index).toContain("from 'virtual:pwa-register'");
    expect(index).toContain('registerSW(');
    const html = read('index.html');
    expect(html).toContain('<script type="module" src="/index.tsx"></script>');
  });

  for (const { html, boot, route } of ENTRIES) {
    it(`${html}: noindex, points at ${boot}, and boot pins ${route}`, () => {
      const entry = read('src/entries/boot.tsx');
      expect(entry).toContain('initialRoute');

      const src = read(boot);
      expect(src).toContain(`boot('${route}')`);

      const page = read(html);
      expect(page).toContain(`<script type="module" src="/${boot}"></script>`);
      expect(page).toContain('noindex');
      // Entries must not promote themselves before the smoke tests pass.
      expect(page).not.toContain('content="index, follow');
    });

    it(`${html} exists next to index.html`, () => {
      expect(existsSync(join(ROOT, html))).toBe(true);
    });
  }
});

describe('phase-2 App pinning stays optional', () => {
  it('App seeds currentPath from initialRoute only when provided', () => {
    const app = read('App.tsx');
    expect(app).toContain('initialRoute ?? window.location.pathname');
    expect(app).toContain("({ initialRoute }: AppProps = {}) => {");
    // The default export wraps App inside context providers; it must forward
    // the prop or role entries bind to IntrinsicAttributes and CI fails tsc.
    expect(app).toContain('<App initialRoute={initialRoute} />');
    expect(app).toContain('React.FC<AppProps>');
  });

  it('vite lists the main input as `index` plus all four role inputs', () => {
    const config = read('vite.config.ts');
    // Android CI verifies the bundled index.html contains `assets/index-`;
    // rollup names entry chunks after the input keys, so the main key must
    // stay `index` or the native verify step fails.
    expect(config).toContain("index: path.resolve(__dirname, 'index.html')");
    for (const key of ['customer', 'agent', 'operator', 'admin']) {
      expect(config).toContain(`${key}: path.resolve(__dirname, '${key}.html')`);
    }
  });

  it('boot shell never registers a service worker', () => {
    const boot = read('src/entries/boot.tsx');
    expect(boot).not.toContain('virtual:pwa-register');
    expect(boot).not.toContain('registerSW(');
  });

  it('boot shell imports resolve from src/entries (services/styles live at repo root)', () => {
    const boot = read('src/entries/boot.tsx');
    expect(boot).toContain("'../../services/appViewport'");
    expect(boot).toContain("'../../styles.css'");
    expect(boot).toContain("'../styles/portal-modernization.css'");
  });
});
