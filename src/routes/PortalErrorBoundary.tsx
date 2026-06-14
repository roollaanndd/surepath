import React, { Component } from 'react';

class PortalErrorBoundary extends Component<
  { children: React.ReactNode; onReset: () => void },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  componentDidCatch(e: Error) { console.error('[SurePath portal error]', e); }
  render() {
    if (this.state.error) {
      const msg = (this.state.error as Error)?.message ?? 'Unknown error';
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
