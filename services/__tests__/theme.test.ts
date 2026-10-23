import { describe, it, expect, beforeEach } from 'vitest';
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
