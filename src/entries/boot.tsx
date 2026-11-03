// Multi-entry boot shell (APP_SEPARATION_PLAN Fase 2).
//
// The main `index.tsx` stays the canonical boot and this module mirrors its
// shell — minus service-worker registration, which stays deferred for role
// entries until a SW-scope smoke test passes (plan §Fase2 step 4). Everything
// else (appViewport lock, Sentry, stale-chunk recovery, ErrorBoundary) is kept
// byte-equal in intent so an entry behaves exactly like the universal SPA.
import '../../services/appViewport';

import React from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from '../../App';
import '../../styles.css';
import '../styles/portal-modernization.css';

// Error monitoring — no-op unless VITE_SENTRY_DSN is configured in the env.
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 0.1,
  });
}

// Same stale-chunk recovery as index.tsx. NOTE: role entries deliberately do
// NOT register a service worker yet — the SW stays owned by the main shell
// until the entry smoke tests pass (plan §Fase2 step 4).
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();

  let last = 0;
  try {
    last = Number(sessionStorage.getItem('sp_chunk_reload_ts') ?? 0);
  } catch {
    // Storage can be blocked in private browsing; still attempt one recovery.
  }

  if (Date.now() - last < 30_000) {
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

// ─── Error Boundary — identical to index.tsx's ───────────────────────────────
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

/**
 * Boot the app pinned to one role's home route.
 *
 * `initialRoute` is the ONLY difference from index.tsx: App seeds
 * `currentPath` from this instead of window.location.pathname, so an entry
 * page served at /customer.html behaves as if it lived at /custapp. Omit it
 * and App keeps its exact universal behaviour.
 */
export function boot(initialRoute?: string) {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App initialRoute={initialRoute} />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
