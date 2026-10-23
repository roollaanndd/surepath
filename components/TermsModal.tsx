import React, { useState, useRef, useEffect } from 'react';
import { SurePathLogo } from './Navbar';
import { TNC_SECTIONS } from '../src/tnc-content';

interface Props {
  onAccept: () => Promise<string>; // returns reference number
  onDone: () => void;              // called when user dismisses success screen
}

type ModalState = 'form' | 'loading' | 'success';

const TermsModal: React.FC<Props> = ({ onAccept, onDone }) => {
  const [checked, setChecked]   = useState(false);
  const [state, setState]       = useState<ModalState>('form');
  const [refNumber, setRefNumber] = useState('');
  const scrollRef               = useRef<HTMLDivElement>(null);

  // Prevent body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleAccept = async () => {
    if (!checked || state !== 'form') return;
    setState('loading');
    try {
      const ref = await onAccept();
      setRefNumber(ref);
      setState('success');
    } catch {
      setState('form');
    }
  };

  const containerStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Sora', sans-serif",
    padding: '16px',
  };

  const cardStyle: React.CSSProperties = {
    background: '#0d1210',
    border: '1px solid rgba(6,224,0,0.18)',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90dvh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 0 80px rgba(6,224,0,0.08)',
  };

  // ── Success state ────────────────────────────────────────────────────────────
  if (state === 'success') {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, maxHeight: 'none', padding: '40px 28px', alignItems: 'center', gap: '20px', textAlign: 'center' }}>
          {/* Checkmark */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(6,224,0,0.10)',
            border: '2px solid rgba(6,224,0,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M6 16L13 23L26 9" stroke="hsl(119,99%,46%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              Persetujuan Dikonfirmasi
            </h2>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
              Syarat &amp; Ketentuan SurePath telah Anda setujui.
            </p>
          </div>

          {/* Reference number card */}
          <div style={{
            width: '100%',
            background: 'rgba(6,224,0,0.05)',
            border: '1px solid rgba(6,224,0,0.20)',
            borderRadius: '14px',
            padding: '16px 20px',
          }}>
            <p style={{ margin: '0 0 6px', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Nomor Referensi Konfirmasi
            </p>
            <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'hsl(119,99%,46%)', letterSpacing: '0.04em', fontFamily: 'monospace' }}>
              {refNumber}
            </p>
            <p style={{ margin: '8px 0 0', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.30)', lineHeight: 1.5 }}>
              Catat nomor ini sebagai bukti persetujuan Anda. Nomor ini juga tersimpan di profil akun Anda.
            </p>
          </div>

          <div style={{ width: '100%', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px 14px' }}>
            <p style={{ margin: 0, fontSize: '0.6875rem', color: 'rgba(255,255,255,0.30)' }}>
              Tanggal: <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </p>
          </div>

          <button
            onClick={onDone}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '12px',
              border: 'none',
              background: 'hsl(119,99%,46%)',
              color: '#000',
              fontSize: '0.78rem',
              fontWeight: 700,
              fontFamily: "'Sora', sans-serif",
              cursor: 'pointer',
              letterSpacing: '-0.01em',
            }}
          >
            Mulai Gunakan SurePath
          </button>
        </div>
      </div>
    );
  }

  // ── Form state ───────────────────────────────────────────────────────────────
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div
          style={{
            padding: '24px 24px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: 56, height: 56, borderRadius: '16px',
              background: 'rgba(6,224,0,0.06)',
              border: '1px solid rgba(6,224,0,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <SurePathLogo className="w-8 h-8 object-contain" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              Syarat &amp; Ketentuan
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.02em' }}>
              Terms &amp; Conditions · SurePath
            </p>
          </div>
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.50)', textAlign: 'center', lineHeight: 1.5 }}>
            Harap baca seluruh ketentuan berikut sebelum menggunakan layanan SurePath.
          </p>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {TNC_SECTIONS.map(section => (
            <div key={section.title}>
              <h3
                style={{
                  margin: '0 0 8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'hsl(119,99%,46%)',
                  letterSpacing: '-0.01em',
                }}
              >
                {section.title}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.7rem',
                  color: 'rgba(255,255,255,0.60)',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-line',
                }}
              >
                {section.body}
              </p>
            </div>
          ))}
          <div style={{ height: 8 }} />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px 20px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            background: '#0d1210',
          }}
        >
          {/* Checkbox */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
            <div
              onClick={() => setChecked(c => !c)}
              style={{
                width: 18, height: 18,
                borderRadius: 5,
                border: `2px solid ${checked ? 'hsl(119,99%,46%)' : 'rgba(255,255,255,0.25)'}`,
                background: checked ? 'hsl(119,99%,46%)' : 'transparent',
                flexShrink: 0,
                marginTop: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.18s',
                cursor: 'pointer',
              }}
            >
              {checked && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span
              onClick={() => setChecked(c => !c)}
              style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, userSelect: 'none' }}
            >
              Saya telah membaca dan menyetujui{' '}
              <span style={{ color: 'hsl(119,99%,46%)' }}>Syarat &amp; Ketentuan</span> serta{' '}
              <span style={{ color: 'hsl(119,99%,46%)' }}>Kebijakan Privasi</span> SurePath.
            </span>
          </label>

          {/* CTA button */}
          <button
            onClick={handleAccept}
            disabled={!checked || state === 'loading'}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '12px',
              border: 'none',
              background: checked && state !== 'loading'
                ? 'hsl(119,99%,46%)'
                : 'rgba(255,255,255,0.07)',
              color: checked && state !== 'loading' ? '#000' : 'rgba(255,255,255,0.25)',
              fontSize: '0.78rem',
              fontWeight: 700,
              fontFamily: "'Sora', sans-serif",
              cursor: checked && state !== 'loading' ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              letterSpacing: '-0.01em',
            }}
          >
            {state === 'loading' ? 'Memproses…' : 'Setuju & Lanjutkan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
