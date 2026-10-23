// ─── Dark mode — the single owner of the theme ───────────────────────────────
//
// Before this module four components each owned the same `sp_dark_mode` state
// independently, and two of them disagreed about where the `dark` class goes:
//
//   App.tsx            wrapped the marketing site in <div className="dark">
//                      and never touched documentElement at all
//   CustomerPortal     added/removed `dark` on documentElement
//   AdminPortal        toggled `dark` on documentElement, but seeded its state
//                      from useState(true) — ignoring the stored preference
//                      and never writing one back
//   OperatorProfile    toggled `dark` on documentElement
//
// Two consequences, both user-visible. The `dark` class left behind by one
// portal stayed on documentElement after navigating to the marketing site,
// which themes itself with the wrapper div — so `body` and every token-driven
// surface rendered dark underneath a light-mode page. And the CMS could not
// remember a light-mode preference across reloads, because it never stored one.
//
// Everything now reads and writes through here, so there is one key, one place
// the class is applied, and one answer to "is the app dark right now".

import { useCallback, useEffect, useState } from 'react';

/** localStorage key holding the user's theme preference, as a stringified boolean. */
export const DARK_MODE_KEY = 'sp_dark_mode';

/**
 * The stored preference, or `fallback` when nothing is stored yet.
 *
 * `fallback` exists for the Admin CMS, which has always opened in dark mode.
 * It applies only when the user has never chosen — once they toggle, their
 * choice is stored and wins everywhere, the CMS included.
 */
export function readDarkMode(fallback = false): boolean {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem(DARK_MODE_KEY);
    return stored === null ? fallback : stored === 'true';
  } catch {
    // Private mode / blocked storage — the preference is simply not available.
    return fallback;
  }
}

/** Put the theme on the document root, which is where every `dark:` variant and `.dark` token override looks. */
export function applyDarkMode(dark: boolean): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', dark);
}

/** Persist the preference. Silently does nothing where storage is unavailable. */
export function storeDarkMode(dark: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DARK_MODE_KEY, String(dark));
  } catch {
    // Nothing to do: the theme still applies for this session.
  }
}

/**
 * Theme state for a portal: `[darkMode, setDarkMode]`, with the class applied
 * to documentElement and the choice persisted on every change.
 */
export function useDarkMode(fallback = false): [boolean, (dark: boolean) => void] {
  const [darkMode, setDarkMode] = useState(() => readDarkMode(fallback));

  useEffect(() => {
    applyDarkMode(darkMode);
    storeDarkMode(darkMode);
  }, [darkMode]);

  const set = useCallback((dark: boolean) => setDarkMode(dark), []);

  return [darkMode, set];
}
