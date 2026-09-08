import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── PWA install store ───────────────────────────────────────────────────────
//
// The bug these tests exist to prevent: `beforeinstallprompt` fires once and is
// never replayed, so an install button that only learns about it from its own
// late-mounted listener will silently fall back to manual instructions — which
// produce a browser shortcut, not an installed app. The store must therefore
// pick up an event that was parked on `window` long before it was imported.

type Outcome = 'accepted' | 'dismissed';

/** Minimal stand-in for a real BeforeInstallPromptEvent. */
function makeBip(outcome: Outcome = 'accepted') {
  return {
    preventDefault: vi.fn(),
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  };
}

function setUA(ua: string, extra: Partial<{ platform: string; maxTouchPoints: number }> = {}) {
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true });
  Object.defineProperty(window.navigator, 'platform', { value: extra.platform ?? 'Linux x86_64', configurable: true });
  Object.defineProperty(window.navigator, 'maxTouchPoints', { value: extra.maxTouchPoints ?? 0, configurable: true });
}

/** jsdom ships no matchMedia; `standalone` decides what display-mode reports. */
function stubMatchMedia(standalone = false) {
  window.matchMedia = ((q: string) => ({
    matches: /display-mode:\s*(standalone|fullscreen|minimal-ui)/.test(q) ? standalone : false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';
const IG_IN_APP = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 302.0.0.23.113';
const FIREFOX_DESKTOP = 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0';

/** Fresh module instance — the store keeps singleton listener state. */
async function loadStore() {
  vi.resetModules();
  return import('../pwaInstall');
}

beforeEach(() => {
  delete (window as unknown as { __spInstall?: unknown }).__spInstall;
  localStorage.clear();
  stubMatchMedia(false);
  setUA(ANDROID_CHROME);
});

describe('capturing the prompt', () => {
  it('finds an event parked on window before the module was imported', async () => {
    // This is the whole point: index.html captured it while the bundle was
    // still downloading.
    (window as any).__spInstall = { event: makeBip(), installed: false };
    const store = await loadStore();
    const state = store.getInstallState();
    expect(state.canPrompt).toBe(true);
    expect(state.method).toBe('native');
  });

  it('still captures an event that fires after the module loaded', async () => {
    const store = await loadStore();
    expect(store.getInstallState().canPrompt).toBe(false);

    const bip = makeBip();
    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), bip));

    expect(store.getInstallState().canPrompt).toBe(true);
  });

  it('suppresses the browser mini-infobar so our own sheet is the only UI', async () => {
    const store = await loadStore();
    store.getInstallState(); // wires the listeners
    const evt = Object.assign(new Event('beforeinstallprompt'), makeBip());
    const spy = vi.spyOn(evt, 'preventDefault');
    window.dispatchEvent(evt);
    expect(spy).toHaveBeenCalled();
  });

  it('notifies subscribers when the prompt arrives', async () => {
    const store = await loadStore();
    const seen = vi.fn();
    store.subscribeInstall(seen);
    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), makeBip()));
    expect(seen).toHaveBeenCalled();
  });
});

describe('promptInstall', () => {
  it('runs the real browser flow and reports acceptance', async () => {
    const bip = makeBip('accepted');
    (window as any).__spInstall = { event: bip, installed: false };
    const store = await loadStore();

    await expect(store.promptInstall()).resolves.toBe('accepted');
    expect(bip.prompt).toHaveBeenCalledTimes(1);
    expect(store.getInstallState().installed).toBe(true);
  });

  it('reports a decline without marking the app installed', async () => {
    (window as any).__spInstall = { event: makeBip('dismissed'), installed: false };
    const store = await loadStore();

    await expect(store.promptInstall()).resolves.toBe('dismissed');
    expect(store.getInstallState().installed).toBe(false);
  });

  it('never prompts the same event twice', async () => {
    // A BeforeInstallPromptEvent may be prompt()ed exactly once; a second call
    // throws in a real browser. The store must release it after the first use.
    const bip = makeBip('accepted');
    (window as any).__spInstall = { event: bip, installed: false };
    const store = await loadStore();

    await store.promptInstall();
    await expect(store.promptInstall()).resolves.toBe('unavailable');
    expect(bip.prompt).toHaveBeenCalledTimes(1);
  });

  it('returns "unavailable" — the caller\'s cue to show instructions — when there is no prompt', async () => {
    const store = await loadStore();
    await expect(store.promptInstall()).resolves.toBe('unavailable');
  });
});

describe('install method per platform', () => {
  it('prefers the native prompt over every set of instructions', async () => {
    setUA(IPHONE_SAFARI, { platform: 'iPhone' });
    (window as any).__spInstall = { event: makeBip(), installed: false };
    const store = await loadStore();
    expect(store.getInstallState().method).toBe('native');
  });

  it('routes iOS to the Share → Add to Home Screen guide', async () => {
    setUA(IPHONE_SAFARI, { platform: 'iPhone' });
    const store = await loadStore();
    expect(store.getInstallState().method).toBe('ios-safari');
  });

  it('detects iPadOS, which reports itself as a Mac', async () => {
    setUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.2 Safari/605.1.15',
      { platform: 'MacIntel', maxTouchPoints: 5 });
    const store = await loadStore();
    expect(store.isIos()).toBe(true);
    expect(store.getInstallState().method).toBe('ios-safari');
  });

  it('tells in-app webviews to open a real browser first', async () => {
    setUA(IG_IN_APP, { platform: 'iPhone' });
    const store = await loadStore();
    expect(store.getInstallState().method).toBe('ios-in-app');
  });

  it('points Chromium without a prompt at the browser menu', async () => {
    const store = await loadStore();
    expect(store.getInstallState().method).toBe('browser-menu');
  });

  it('is honest about browsers that cannot install at all', async () => {
    setUA(FIREFOX_DESKTOP);
    const store = await loadStore();
    expect(store.getInstallState().method).toBe('unsupported');
  });
});

describe('installed state', () => {
  it('treats a standalone display-mode as installed', async () => {
    stubMatchMedia(true);
    const store = await loadStore();
    const state = store.getInstallState();
    expect(state.installed).toBe(true);
    expect(state.canPrompt).toBe(false);
  });

  it('remembers the install after the appinstalled event', async () => {
    const store = await loadStore();
    store.getInstallState();
    window.dispatchEvent(new Event('appinstalled'));
    expect(store.getInstallState().installed).toBe(true);
    expect(localStorage.getItem('sp_pwa_installed')).toBe('1');
  });

  it('forgets a stale install flag when the browser offers to install again', async () => {
    // The browser only offers to install what is not installed — so a fresh
    // prompt proves the user uninstalled and the button must come back.
    localStorage.setItem('sp_pwa_installed', '1');
    const store = await loadStore();
    expect(store.getInstallState().installed).toBe(true);

    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), makeBip()));

    const state = store.getInstallState();
    expect(state.installed).toBe(false);
    expect(state.canPrompt).toBe(true);
  });

  it('survives localStorage being unavailable', async () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('private mode'); };
    try {
      const store = await loadStore();
      store.getInstallState();
      expect(() => window.dispatchEvent(new Event('appinstalled'))).not.toThrow();
    } finally {
      Storage.prototype.setItem = orig;
    }
  });
});
