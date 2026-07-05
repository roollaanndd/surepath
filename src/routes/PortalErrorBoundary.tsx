import React, { Component } from 'react';

// After a deploy, a tab that was already open still has the *old* bundle in
// memory. Navigating into a lazy-loaded chunk (AgentPortal, CustomerPortal,
// AdminPortal, ...) then fails to fetch that old chunk's hashed filename,
// since the production alias now points at the new deployment and that file
// no longer exists. The fix is a normal browser reload — it picks up the
// current bundle — so we detect this specific failure and do that
// automatically, once, instead of leaving the user stuck on a dead-end error
// screen with only a "back" button that can't actually recover.
const RELOAD_GUARD_KEY = 'sp_chunk_reload_attempted';

function isStaleChunkError(e: Error): boolean {
  const msg = e?.message ?? '';
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i.test(msg);
}

class PortalErrorBoundary extends Component<
  { children: React.ReactNode; onReset: () => void },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }

  componentDidCatch(e: Error, errorInfo: React.ErrorInfo) {
    console.error('[SurePath portal error]', e, errorInfo);

    // ── Capture in Sentry so we actually see production errors ────────────
    // Previously this only console.error'd, which meant React render errors
    // never reached Sentry even when the SDK was initialized.
    try {
      const Sentry = (window as any).__SENTRY__;
      if (Sentry?.captureException) {
        Sentry.captureException(e, { contexts: { react: { componentStack: errorInfo.componentStack } } });
      }
    } catch { /* no-op */ }

    if (isStaleChunkError(e) && !sessionStorage.getItem(RELOAD_GUARD_KEY)) {
      sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
      window.location.reload();
    }
  }

  render() {
    if (this.state.error) {
      const msg = (this.state.error as Error)?.message ?? 'Unknown error';
      if (isStaleChunkError(this.state.error as Error) && !sessionStorage.getItem(RELOAD_GUARD_KEY)) {
        // Reload is already in flight from componentDidCatch — avoid flashing the error UI.
        return null;
      }
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: '#060a09', color: '#fff', fontFamily: "'Sora',sans-serif", padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 36 }}>⚠️</div>
          <h2 style={{ fontWeight: 800, fontSize: '1rem', margin: 0 }}>Error</h2>
          <p style={{ fontSize: '0.7rem', color: '#888', maxWidth: 280, wordBreak: 'break-word', margin: 0 }}>{msg}</p>
          <button
            onClick={() => { this.setState({ error: null }); this.props.onReset(); }}
            style={{ marginTop: 4, padding: '10px 28px', borderRadius: 12, background: 'hsl(119,99%,46%)', color: '#000', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', border: 'none' }}
          >
            Kembali
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default PortalErrorBoundary;
