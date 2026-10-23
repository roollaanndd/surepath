// In-portal navigation has to return the view to the top; see
// components/shared/scrollReset.ts for why each portal differs.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scrollPortalToTop } from '../../components/shared/scrollReset';

const mockReducedMotion = (reduce: boolean) => {
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })));
};

describe('scrollPortalToTop', () => {
  beforeEach(() => mockReducedMotion(false));
  afterEach(() => vi.unstubAllGlobals());

  it('scrolls the window when the portal has no scroll container', () => {
    const scrollTo = vi.fn();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    window.scrollTo = scrollTo;

    scrollPortalToTop();

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('scrolls the container the portal owns instead of the window', () => {
    const windowScroll = vi.fn();
    window.scrollTo = windowScroll;
    const container = document.createElement('div');
    const containerScroll = vi.fn();
    container.scrollTo = containerScroll;

    scrollPortalToTop(container);

    expect(containerScroll).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(windowScroll).not.toHaveBeenCalled();
  });

  it('drops the easing when the user prefers reduced motion', () => {
    mockReducedMotion(true);
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;

    scrollPortalToTop();

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });

  it('falls back to scrollTop where Element.scrollTo is unavailable', () => {
    const container = document.createElement('div');
    // jsdom does not implement Element.scrollTo at all.
    expect(container.scrollTo).toBeUndefined();
    container.scrollTop = 500;

    scrollPortalToTop(container);

    expect(container.scrollTop).toBe(0);
  });

  it('does nothing rather than throwing when a container is absent', () => {
    window.scrollTo = vi.fn();
    expect(() => scrollPortalToTop(null)).not.toThrow();
    expect(window.scrollTo).toHaveBeenCalled();
  });
});
