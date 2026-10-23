import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DARK_MODE_KEY, readDarkMode, applyDarkMode, storeDarkMode } from '../../components/shared/theme';

describe('dark mode — the single theme owner', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('returns the fallback when nothing is stored', () => {
    expect(readDarkMode()).toBe(false);
    // The Admin CMS opens dark; that preference is a fallback, not a lock.
    expect(readDarkMode(true)).toBe(true);
  });

  it('lets a stored light preference override a dark fallback', () => {
    // The CMS regression this module fixes: it seeded `useState(true)` and so
    // ignored the user's stored choice on every load.
    localStorage.setItem(DARK_MODE_KEY, 'false');
    expect(readDarkMode(true)).toBe(false);
  });

  it('reads a stored dark preference', () => {
    localStorage.setItem(DARK_MODE_KEY, 'true');
    expect(readDarkMode()).toBe(true);
  });

  it('puts the class on documentElement, not on a wrapper element', () => {
    applyDarkMode(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    applyDarkMode(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('round-trips a stored preference', () => {
    storeDarkMode(true);
    expect(localStorage.getItem(DARK_MODE_KEY)).toBe('true');
    expect(readDarkMode()).toBe(true);
    storeDarkMode(false);
    expect(readDarkMode()).toBe(false);
  });

  it('falls back instead of throwing where storage is blocked', () => {
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.getItem = () => { throw new Error('SecurityError'); };
    Storage.prototype.setItem = () => { throw new Error('SecurityError'); };
    try {
      expect(readDarkMode(true)).toBe(true);
      expect(() => storeDarkMode(true)).not.toThrow();
    } finally {
      Storage.prototype.getItem = getItem;
      Storage.prototype.setItem = setItem;
    }
  });
});

// index.html is outside the TypeScript build, so nothing else in the suite would
// notice if its two theme-critical pieces drifted. Both were defects: `body`
// hardcoded a light background with no dark counterpart, so the one surface
// behind every page never followed the theme; and the class only landed after
// React mounted, so dark-mode users got a white flash on every load.
describe('index.html carries the theme before the bundle does', () => {
  const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
  const head = html.slice(0, html.indexOf('</head>'));

  it('applies the stored preference in <head>, using the same key as theme.ts', () => {
    const script = head.slice(head.indexOf('<script>'), head.indexOf('<style>'));
    expect(script).toContain(DARK_MODE_KEY);
    expect(script).toContain("classList.add('dark')");
  });

  it('reads that preference before the bundle is requested', () => {
    // The module script lives at the end of <body>; the theme read must come
    // before it, or the page has already painted light by the time it runs.
    const bundle = html.indexOf('type="module"');
    expect(bundle).toBeGreaterThan(-1);
    expect(html.indexOf(DARK_MODE_KEY)).toBeLessThan(bundle);
  });

  it('gives body a token background rather than a literal', () => {
    const bodyRule = head.slice(head.indexOf('body {'), head.indexOf('html.dark body'));
    expect(bodyRule).toMatch(/background:\s*var\(--ds-bg/);
    expect(bodyRule).toMatch(/color:\s*var\(--ds-text-primary/);
    expect(bodyRule).not.toMatch(/background:\s*#/);
  });
});
