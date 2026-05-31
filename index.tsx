import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

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