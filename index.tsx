// FIRST import, deliberately. It locks zoom/overscroll when running as the
// installed app (a no-op in a browser tab, where the page must stay zoomable
// for accessibility) and self-initialises on evaluation — imports are hoisted,
// so nothing in this file's body could run before ./App loads. See the note at
// the bottom of that module.
import './services/appViewport';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import * as Sentry from '@sentry/react';
import App from './App';
import './styles.css';
import './src/styles/portal-modernization.css';

// Error monitoring — no-op unless VITE_SENTRY_DSN is configured in the env
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 0.1,
  });
}

// Explicit SW registration — guarantees PWA install/offline works even if
// the auto-injected registerSW.js script is blocked or dropped by a proxy.
try {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // Trigger an explicit update check when the installed PWA starts.
      // This is especially useful for Home Screen installs that may sit in the
      // background for long periods between launches.
      const checkForUpdate = () => {
        if (document.visibilityState !== 'visible') return;
        void registration.update().catch(() => {
          // A temporary offline/network failure must not interrupt app use.
        });
      };

      checkForUpdate();
      document.addEventListener('visibilitychange', checkForUpdate);
      window.addEventListener('pageshow', checkForUpdate);
    },
  });
} catch (e) {
  console.warn('SW registration failed (non-blocking):', e);
}

// Recover from stale HTML / service-worker caches after a deployment.
// A lazy chunk URL is content-hashed; if an old app shell points at a chunk no
// longer present in the active deployment, clear only our asset cache, remove
// the stale worker, and reload once. This avoids leaving the Admin portal blank.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();

  let last = 0;
  try {
    last = Number(sessionStorage.getItem('sp_chunk_reload_ts') ?? 0);
  } catch {
    // Storage can be blocked in private browsing; still attempt one recovery.
  }

  if (Date.now() - last < 30_000) {
    // Prevent a reload loop if the deployment is still inconsistent.
    console.error('SurePath could not load a required app module after recovery.');
    return;
  }

  try {
    sessionStorage.setItem('sp_chunk_reload_ts', String(Date.now()));
  } catch {
    // Continue recovery even when session storage is unavailable.
  }

  void (async () => {
    try {
      if ('caches' in window) await caches.delete('sp-assets');
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
    } catch (error) {
      console.warn('Stale app cache cleanup was incomplete:', error);
    } finally {
      window.location.reload();
    }
  })();
});

// ─── Error Boundary — catch any React crash and show error to user ───────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        style: {
          padding: '40px', fontFamily: 'sans-serif', textAlign: 'center',
          background: '#f6faf7', minHeight: '100vh', display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }
      }, [
        React.createElement('h1', { key: 'title', style: { color: '#059669', marginBottom: '16px' } }, 'SurePath'),
        React.createElement('p', { key: 'msg', style: { color: '#666', marginBottom: '20px' } }, 'Terjadi kesalahan. Refresh halaman atau coba lagi.'),
        React.createElement('p', { key: 'err', style: { color: '#999', fontSize: '12px', marginBottom: '20px', wordBreak: 'break-word' } }, this.state.error?.message || 'Unknown error'),
        React.createElement('button', {
          key: 'btn',
          onClick: () => window.location.reload(),
          style: { padding: '12px 24px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }
        }, 'Refresh'),
      ]);
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      {/* No router here, deliberately. Routing is hand-rolled on the History
          API in App.tsx: `currentPath` is seeded from window.location.pathname,
          navigate() calls history.pushState, and a popstate listener keeps the
          two in sync. This spot used to hold a <HashRouter> whose API nothing
          in the app ever used — no Route, no Link, no hook — so it shipped
          react-router-dom to every visitor on first load for nothing. */}
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);