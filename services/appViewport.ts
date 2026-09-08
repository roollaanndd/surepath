// ─── App-mode viewport lock ──────────────────────────────────────────────────
//
// Requirement: inside the app, the screen must not pinch-zoom or double-tap
// zoom, and must not rubber-band — it should behave like a native app.
//
// The one thing worth being explicit about: this is applied ONLY when the page
// is actually running as an app — an installed PWA (`display-mode: standalone`
// and friends) or the Capacitor Android build. In a normal browser tab the page
// stays fully zoomable.
//
// That split is deliberate rather than a compromise. `user-scalable=no` on the
// public website would fail WCAG 1.4.4 (Resize Text) and drop the Lighthouse
// accessibility score — and someone who needs to magnify text on a marketing
// page has no app chrome to fall back on. Someone who has installed the app has
// the OS-level display-size and accessibility-zoom settings instead, and there
// the browser's own pinch-zoom is what makes a "native-feeling" app feel broken:
// mistaken pinches leave the layout stranded off-centre with no way back.

const LOCKED_VIEWPORT =
  'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover';
const FREE_VIEWPORT =
  'width=device-width, initial-scale=1.0, viewport-fit=cover';

const HTML_CLASS = 'sp-app-locked';

/** Capacitor sets this global in the Android/iOS WebView build. */
function isNativeShell(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (!cap) return false;
  try {
    return typeof cap.isNativePlatform === 'function' ? cap.isNativePlatform() : true;
  } catch {
    return true;
  }
}

function isAppDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const mm = (q: string) => {
    try { return window.matchMedia(q).matches; } catch { return false; }
  };
  return (
    mm('(display-mode: standalone)') ||
    mm('(display-mode: fullscreen)') ||
    mm('(display-mode: minimal-ui)') ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** True when this page is running as the app rather than as a web page. */
export const isAppMode = (): boolean => isNativeShell() || isAppDisplay();

function viewportTag(): HTMLMetaElement | null {
  if (typeof document === 'undefined') return null;
  let tag = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!tag) {
    tag = document.createElement('meta');
    tag.name = 'viewport';
    document.head.appendChild(tag);
  }
  return tag;
}

// iOS Safari ignores `user-scalable=no` on the open web, and these gesture
// events are the only way to refuse a pinch there. They are non-standard and
// WebKit-only, which is exactly the engine that needs them.
const blockGesture = (e: Event) => e.preventDefault();

// Desktop PWAs zoom on ctrl/⌘ + wheel. Same reasoning as pinch.
const blockWheelZoom = (e: WheelEvent) => {
  if (e.ctrlKey || e.metaKey) e.preventDefault();
};

// Double-tap zoom is handled by `touch-action: manipulation` in styles.css.
// A `touchend` preventDefault would also do it — and would swallow the second
// tap on ordinary buttons, so it is deliberately not used here.

let applied = false;

function apply(locked: boolean) {
  if (locked === applied) return;
  applied = locked;

  const tag = viewportTag();
  if (tag) tag.setAttribute('content', locked ? LOCKED_VIEWPORT : FREE_VIEWPORT);

  const root = document.documentElement;
  root.classList.toggle(HTML_CLASS, locked);

  if (locked) {
    // `passive: false` is required — a passive listener cannot preventDefault,
    // which would make every one of these a no-op.
    document.addEventListener('gesturestart', blockGesture, { passive: false });
    document.addEventListener('gesturechange', blockGesture, { passive: false });
    document.addEventListener('gestureend', blockGesture, { passive: false });
    window.addEventListener('wheel', blockWheelZoom, { passive: false });
  } else {
    document.removeEventListener('gesturestart', blockGesture);
    document.removeEventListener('gesturechange', blockGesture);
    document.removeEventListener('gestureend', blockGesture);
    window.removeEventListener('wheel', blockWheelZoom);
  }
}

/**
 * Lock the viewport when running as an app, and keep it in step if the display
 * mode changes (the user installs the app and launches it from the home screen
 * without a reload).
 */
export function initAppViewport(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  apply(isAppMode());

  try {
    for (const q of ['(display-mode: standalone)', '(display-mode: fullscreen)', '(display-mode: minimal-ui)']) {
      window.matchMedia(q).addEventListener('change', () => apply(isAppMode()));
    }
  } catch { /* older Safari has no addEventListener on MediaQueryList */ }
}

// Self-initialising on import, and imported first in index.tsx.
//
// ES module imports are hoisted: every import of index.tsx is evaluated before
// the first statement in its body. So a `initAppViewport()` call placed in that
// body cannot run before ./App is evaluated — and if any module in that graph
// throws while loading (a missing env var is enough), the call is never reached
// and the app renders zoomable. Running here, from a module imported ahead of
// the app, makes the lock independent of whether the app itself boots.
initAppViewport();
