// ─── useHaptic Hook ──────────────────────────────────────────────────────────
//
// Wraps navigator.vibrate with sensible defaults and a user-togglable
// disable flag (stored in localStorage as `sp_haptics_off`).
//
// Usage:
//   const haptic = useHaptic();
//   haptic.tap();       // 10ms — light tap (button press, tab switch)
//   haptic.success();   // 20ms — success (payment confirmed, claim submitted)
//   haptic.error();     // [10,40,10] — error pattern (validation failed)
//   haptic.selection(); // 5ms — selection change (radio, segment)
//
// On iOS Safari, navigator.vibrate is not supported — calls are no-ops.
// On Android Chrome (the primary SurePath platform), it works as expected.

import { useCallback } from 'react';

export type HapticPattern = 'tap' | 'success' | 'error' | 'selection' | 'warning';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  selection: 5,
  success: 20,
  warning: [10, 30, 10],
  error: [10, 40, 10],
};

export function useHaptic() {
  const vibrate = useCallback((pattern: HapticPattern) => {
    try {
      if (typeof navigator === 'undefined' || !navigator.vibrate) return;
      // Respect user preference
      if (localStorage.getItem('sp_haptics_off') === 'true') return;
      navigator.vibrate(PATTERNS[pattern]);
    } catch {
      // Silently ignore — haptics are a nice-to-have, not critical
    }
  }, []);

  return {
    tap: () => vibrate('tap'),
    selection: () => vibrate('selection'),
    success: () => vibrate('success'),
    warning: () => vibrate('warning'),
    error: () => vibrate('error'),
    raw: vibrate,
  };
}
