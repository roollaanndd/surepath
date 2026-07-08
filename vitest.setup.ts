// Vitest setup file — runs before all tests.
// Mocks browser globals that services depend on.

// Polyfill sessionStorage for vitest
if (typeof sessionStorage === 'undefined') {
  const store: Record<string, string> = {};
  (globalThis as any).sessionStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
}

// Polyfill atob/btoa if missing
if (typeof atob === 'undefined') {
  (globalThis as any).atob = (s: string) => Buffer.from(s, 'base64').toString('utf-8');
  (globalThis as any).btoa = (s: string) => Buffer.from(s, 'utf-8').toString('base64');
}

// Mock crypto.subtle for authService tests
if (typeof crypto === 'undefined' || !crypto.subtle) {
  (globalThis as any).crypto = {
    subtle: {
      importKey: () => Promise.resolve({}),
      deriveBits: () => Promise.resolve(new ArrayBuffer(32)),
    },
    getRandomValues: (arr: any) => { for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256); return arr; },
  };
}

// Mock navigator.userAgent
if (typeof navigator === 'undefined') {
  (globalThis as any).navigator = { userAgent: 'vitest/1.0' };
}
