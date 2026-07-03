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
registerSW({ immediate: true });

// Auto-reload when a lazy-loaded chunk fails (happens when SW serves stale assets after deploy)
window.addEventListener('vite:preloadError', () => {
  const last = Number(sessionStorage.getItem('sp_reload_ts') ?? 0);
  if (Date.now() - last > 10_000) {
    sessionStorage.setItem('sp_reload_ts', String(Date.now()));
    window.location.reload();
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);