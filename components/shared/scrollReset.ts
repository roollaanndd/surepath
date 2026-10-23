// Scroll handling for in-portal navigation.
//
// Every portal keeps its own `activeTab` state, so switching views is a state
// change rather than a document navigation — the browser has no reason to move
// the scroll position. A view opened from halfway down a long list therefore
// renders already scrolled, and the `sp-page-enter` animation plays off-screen.
//
// What actually scrolls differs per portal: the admin CMS and the customer app
// each own an inner `overflow-y-auto` container, while the agent, operator,
// insurer and B2B portals let the document scroll. Callers pass their container
// when they own one and omit it otherwise.

/** Return the portal to the top after an in-portal view change. */
export const scrollPortalToTop = (container?: HTMLElement | null): void => {
  if (typeof window === 'undefined') return;

  // Smooth scrolling is motion too, so it follows the same preference.
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

  if (container) {
    // `Element.scrollTo` is missing in jsdom and in older engines; assigning
    // `scrollTop` reaches the top there too, just without the easing.
    if (typeof container.scrollTo === 'function') container.scrollTo({ top: 0, behavior });
    else container.scrollTop = 0;
    return;
  }

  window.scrollTo({ top: 0, behavior });
};
