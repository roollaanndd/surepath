// FIRST import, deliberately. It locks zoom/overscroll when running as the
// installed app (a no-op in a browser tab, where the page must stay zoomable
// for accessibility) and self-initialises on evaluation — imports are hoisted,
// so nothing in this file's body could run before ./App loads. See the note at
// the bottom of that module.
import './services/appViewport';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import * as Sentry from '@sentry/react';
import App from './App';
import './styles.css';

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
  registerSW({ immediate: true });
} catch (e) {
  console.warn('SW registration failed (non-blocking):', e);
}

// Auto-reload when a lazy-loaded chunk fails (happens when SW serves stale assets after deploy)
window.addEventListener('vite:preloadError', () => {
  const last = Number(sessionStorage.getItem('sp_reload_ts') ?? 0);
  if (Date.now() - last > 10_000) {
    sessionStorage.setItem('sp_reload_ts', String(Date.now()));
    window.location.reload();
  }
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
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);