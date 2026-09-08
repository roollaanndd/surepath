// ─── PWA install store ───────────────────────────────────────────────────────
//
// Why this exists: `beforeinstallprompt` fires ONCE per page load, as soon as
// Chrome finishes its installability check, and it is never replayed. Before
// this module, three separate React components each attached their own listener
// inside a `useEffect`:
//
//   • components/InstallPrompt.tsx  (mounted with the app shell)
//   • components/Navbar.tsx         (portal navbar chip)
//   • src/pages/site/SiteLayout.tsx (marketing site — a LAZY chunk)
//
// The lazy one always lost the race: by the time SiteLayout-*.js had been
// fetched and mounted, the event had already fired into nothing. Its
// "Install App" button then saw `pwaPrompt === null` and fell back to the
// manual "buka menu ⋮ → Add to Home screen" instruction sheet — which produces
// a plain browser shortcut, not an installed app. That is the bug the user hit.
//
// The three copies also fought each other: a beforeinstallprompt event may be
// prompt()ed exactly once, so whichever component consumed it left the others
// holding a dead object.
//
// The fix has two halves:
//   1. An inline script in index.html captures the event before any bundle is
//      even parsed, and parks it on `window.__spInstall`.
//   2. This module is the single reader of that parking spot. Every install
//      affordance in the app subscribes here, so they all agree on whether a
//      one-tap install is available and they all share the one event object.

import { useEffect, useState } from 'react';
import { APP_VERSION } from '../src/version';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/** How this visitor can install, given their browser. */
export type InstallMethod =
  /** The browser handed us a prompt — one tap installs, no instructions needed. */
  | 'native'
  /** iOS/iPadOS: no install API exists. Share → "Add to Home Screen" is the only way. */
  | 'ios-safari'
  /** An in-app webview (Instagram, Facebook, WhatsApp…). Cannot install at all — must open in a real browser. */
  | 'ios-in-app'
  /** Chromium without a prompt right now: the browser's own menu still installs. */
  | 'browser-menu'
  /** Firefox desktop and friends — no install support. */
  | 'unsupported';

export interface InstallState {
  /** Running as an installed app, or known to be installed on this device. */
  installed: boolean;
  /** A one-tap native install is available right now. */
  canPrompt: boolean;
  method: InstallMethod;
}

/** Set once the browser tells us the app was installed. Cleared if it later offers to install again. */
const INSTALLED_KEY = 'sp_pwa_installed';

/**
 * "Not now" is remembered per release for a week. Version-scoped so a new
 * release still gets one fresh ask, and shared by every unprompted install
 * surface — the first-visit sheet and the marketing-site banner both live on
 * the homepage, so without a common key saying no to one summoned the other
 * 2.5 seconds later.
 */
const SNOOZE_KEY = `sp_pwa_install_dismissed_${APP_VERSION}`;
const SNOOZE_DAYS = 7;

// ─── The window bridge shared with the inline capture script ─────────────────

interface InstallBridge {
  event: BeforeInstallPromptEvent | null;
  installed: boolean;
}

const NOOP_BRIDGE: InstallBridge = { event: null, installed: false };

function bridge(): InstallBridge {
  if (typeof window === 'undefined') return NOOP_BRIDGE;
  const w = window as unknown as { __spInstall?: InstallBridge };
  if (!w.__spInstall) w.__spInstall = { event: null, installed: false };
  return w.__spInstall;
}

// ─── Platform detection ──────────────────────────────────────────────────────

/** iPadOS 13+ reports itself as a Mac, so touch points are the only tell. */
export const isIos = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;
};

export const isAndroid = (): boolean =>
  typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');

/**
 * In-app webviews (Instagram, Facebook, WhatsApp, LINE, the Google app…).
 * These cannot install anything — the honest advice is "open in your browser".
 * A lot of Indonesian traffic arrives through exactly these.
 */
const IN_APP_RE = /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|WhatsApp|Twitter|TikTok|GSA\//i;

export const isInAppBrowser = (): boolean =>
  typeof navigator !== 'undefined' && IN_APP_RE.test(navigator.userAgent || '');

const isChromium = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // Chrome, Edge, Opera, Samsung Internet, Brave — everything that can install.
  return /Chrome|Chromium|CriOS|Edg\/|EdgA\/|OPR\/|SamsungBrowser/i.test(ua);
};

/** True when the page is being displayed as an installed app rather than a tab. */
export const isStandalone = (): boolean => {
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
};

/**
 * Mobile view = small viewport OR touch-first device. Auto-popups are limited
 * to this; desktop users get the navbar button and their browser's own UI.
 * (Lives here rather than in InstallPrompt so PWA logic sits in one module.)
 */
export const isMobileView = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia('(max-width: 768px)').matches ||
      window.matchMedia('(pointer: coarse)').matches;
  } catch { return false; }
};

// ─── Persisted "already installed" flag ──────────────────────────────────────

function readInstalledFlag(): boolean {
  try { return localStorage.getItem(INSTALLED_KEY) === '1'; } catch { return false; }
}

function writeInstalledFlag(v: boolean) {
  try {
    if (v) localStorage.setItem(INSTALLED_KEY, '1');
    else localStorage.removeItem(INSTALLED_KEY);
  } catch { /* private mode */ }
}

export function isInstallOfferSnoozed(): boolean {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < SNOOZE_DAYS * 24 * 60 * 60 * 1000;
  } catch { return false; }
}

export function snoozeInstallOffer() {
  try { localStorage.setItem(SNOOZE_KEY, String(Date.now())); } catch { /* private mode */ }
}

// ─── Subscription ────────────────────────────────────────────────────────────

type Listener = () => void;
const listeners = new Set<Listener>();
let wired = false;

function notify() {
  listeners.forEach(fn => { try { fn(); } catch { /* a bad subscriber must not break the rest */ } });
}

function wire() {
  if (wired || typeof window === 'undefined') return;
  wired = true;

  // Backstop for the inline capture script: in dev, or if the inline script
  // were ever dropped, this still catches prompts fired after the bundle loads.
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    bridge().event = e as BeforeInstallPromptEvent;
    // The browser only offers to install what is NOT installed — so this event
    // is proof the stored flag is stale (the user uninstalled it).
    bridge().installed = false;
    writeInstalledFlag(false);
    notify();
  });

  window.addEventListener('appinstalled', () => {
    markInstalled();
  });

  // Dispatched by the inline capture script for events that fired before this
  // module was even parsed.
  window.addEventListener('sp:installability', () => notify());

  // An event captured before we wired up means the stored flag is stale too.
  if (bridge().event) writeInstalledFlag(false);
}

function markInstalled() {
  const b = bridge();
  b.event = null;
  b.installed = true;
  writeInstalledFlag(true);
  notify();
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getInstallState(): InstallState {
  wire();
  const b = bridge();
  const installed = isStandalone() || b.installed || readInstalledFlag();
  const canPrompt = !!b.event && !installed;

  let method: InstallMethod;
  if (canPrompt) method = 'native';
  else if (isInAppBrowser()) method = 'ios-in-app';
  else if (isIos()) method = 'ios-safari';
  else if (isChromium()) method = 'browser-menu';
  else method = 'unsupported';

  return { installed, canPrompt, method };
}

/**
 * Trigger the browser's real install flow.
 *
 * Returns `'unavailable'` when no prompt is on hand — that is the caller's cue
 * to open the guided sheet, and the ONLY case where instructions are correct.
 */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  wire();
  const b = bridge();
  const event = b.event;
  if (!event) return 'unavailable';

  // A beforeinstallprompt event may be prompt()ed exactly once. Release it
  // before awaiting so a double tap can't throw, and so every other install
  // button in the app stops advertising a prompt it no longer owns.
  b.event = null;
  notify();

  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === 'accepted') markInstalled();
    return outcome;
  } catch (e) {
    console.warn('promptInstall:', e);
    return 'unavailable';
  }
}

/** Subscribe to install-state changes. Returns an unsubscribe function. */
export function subscribeInstall(fn: Listener): () => void {
  wire();
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ─── React binding ───────────────────────────────────────────────────────────

export function usePwaInstall(): InstallState {
  const [state, setState] = useState<InstallState>(() => getInstallState());

  useEffect(() => {
    const sync = () => setState(getInstallState());
    // Re-read on mount: the prompt may have arrived before this component did.
    sync();
    const off = subscribeInstall(sync);

    // display-mode flips the moment an installed app is launched from the
    // home screen, which is how we notice on browsers without `appinstalled`.
    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia('(display-mode: standalone)');
      mq.addEventListener('change', sync);
    } catch { mq = null; }

    return () => {
      off();
      try { mq?.removeEventListener('change', sync); } catch { /* noop */ }
    };
  }, []);

  return state;
}
