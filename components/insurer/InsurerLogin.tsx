// InsurerLogin.tsx — token-based auth gate for /insurerapp.
// Insurers don't have Supabase Auth accounts; they authenticate via a
// rolling 7-day auth token passed as URL param (?token=xxx) or entered manually.
// On success, the token is stored in localStorage and the dashboard loads.

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowRight, AlertCircle, KeyRound, Link as LinkIcon } from 'lucide-react';
import { getInsurerDashboard } from '../../services/insurerService';

interface InsurerLoginProps {
  initialToken?: string;
  onLoginSuccess: (token: string) => void;
  onBack?: () => void;
}

const InsurerLogin: React.FC<InsurerLoginProps> = ({ initialToken, onLoginSuccess, onBack }) => {
  const [token, setToken] = useState(initialToken ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If token provided via URL, auto-validate
  useEffect(() => {
    if (initialToken) {
      handleLogin(initialToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialToken]);

  const handleLogin = async (tokenToValidate?: string) => {
    const t = (tokenToValidate ?? token).trim();
    if (!t) {
      setError('Token wajib diisi');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Validate by calling get_insurer_dashboard — if it works, token is valid
      const dashboard = await getInsurerDashboard(t);
      // Store token + insurer name for the session
      sessionStorage.setItem('SUREPATH_INSURER_TOKEN', t);
      sessionStorage.setItem('SUREPATH_INSURER_NAME', dashboard.insurer.name);
      onLoginSuccess(t);
    } catch (e: any) {
      console.error('InsurerLogin error:', e);
      const msg = e?.message ?? '';
      let friendly: string;
      if (msg.includes('Invalid token') || msg.includes('not found')) {
        friendly = 'Token tidak valid. Periksa kembali link dari email atau hubungi SurePath.';
      } else if (msg.includes('Token expired')) {
        friendly = 'Token sudah kedaluwarsa. Minta link baru dari tim SurePath.';
      } else {
        friendly = `Gagal masuk: ${msg}`;
      }
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: '#f6faf7', fontFamily: "'Sora', sans-serif" }}
    >
      <style>{`
        @keyframes ins-scan { 0% { transform: translateY(-100%) } 100% { transform: translateY(200vh) } }
        @keyframes ins-ping  { 0%,100% { opacity:.12; transform:scale(1) } 50% { opacity:.22; transform:scale(1.18) } }
      `}</style>

      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(rgba(124,58,237,0.09) 1px, transparent 1px)',
        backgroundSize: '26px 26px',
      }} />
      <div className="absolute pointer-events-none" style={{ top: '-15%', left: '-8%', width: '65%', height: '65%', background: 'radial-gradient(ellipse, rgba(124,58,237,0.13) 0%, transparent 65%)' }} />
      <div className="absolute pointer-events-none" style={{ bottom: '-15%', right: '-8%', width: '55%', height: '55%', background: 'radial-gradient(ellipse, rgba(124,58,237,0.09) 0%, transparent 65%)' }} />
      <div className="absolute inset-x-0 h-px pointer-events-none" style={{
        background: 'linear-gradient(90deg, transparent 10%, rgba(124,58,237,0.18) 50%, transparent 90%)',
        animation: 'ins-scan 12s linear infinite',
      }} />

      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-6 left-6 flex items-center gap-1.5 transition-colors duration-200"
          style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#94a3b8' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Kembali
        </button>
      )}

      <div className="absolute top-6 right-6 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#059669', boxShadow: '0 0 6px rgba(5,150,105,0.7)', animation: 'ins-ping 2.4s ease-in-out infinite' }} />
        <span style={{ fontSize: '0.6875rem', letterSpacing: '0.14em', textTransform: 'uppercase', whiteSpace: 'nowrap', color: '#64748b', fontWeight: 700 }}>Insurer Session</span>
      </div>

      <div className="relative z-10 w-full max-w-xs px-5">
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6">
            <div className="absolute rounded-full" style={{
              inset: -20, background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 72%)',
              animation: 'ins-ping 3s ease-in-out infinite',
            }} />
            <div className="w-16 h-16 rounded-2xl sp-glass flex items-center justify-center">
              <ShieldCheck size={32} style={{ color: '#059669' }} />
            </div>
          </div>

          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, letterSpacing: '-0.04em', color: '#0f172a', lineHeight: 1, marginBottom: '0.55rem' }}>
            Insurer Portal
          </h1>
          <div className="flex items-center gap-2.5">
            <div className="h-px w-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.4))' }} />
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Mitra Asuransi
            </span>
            <div className="h-px w-8" style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.4), transparent)' }} />
          </div>
        </div>

        <div className="relative sp-glass rounded-2xl">
          <div className="rounded-2xl p-6 space-y-5">
            {error && (
              <div className="p-3 rounded-xl flex items-start gap-2.5"
                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <AlertCircle className="shrink-0 mt-0.5" size={13} style={{ color: '#f87171' }} />
                <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#dc2626', lineHeight: 1.5 }}>{error}</p>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Token Akses
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" size={13} style={{ color: '#059669' }} />
                <input
                  type="text"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="Paste token dari email…"
                  className="block w-full pl-10 pr-4 py-3 rounded-xl text-slate-900 placeholder-slate-400 outline-none transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(124,58,237,0.12)', fontFamily: 'monospace', fontSize: '0.72rem' }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(124,58,237,0.50)'; e.target.style.background = 'rgba(255,255,255,0.95)'; }}
                  onBlur={e  => { e.target.style.borderColor = 'rgba(124,58,237,0.12)'; e.target.style.background = 'rgba(255,255,255,0.85)'; }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleLogin()}
              disabled={loading || !token.trim()}
              className="w-full flex justify-center items-center gap-2.5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-200 active:scale-[0.98] disabled:opacity-40 hover:brightness-[1.08]"
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#fff',
                boxShadow: loading ? 'none' : '0 8px 28px -10px rgba(124,58,237,0.55)',
              }}
            >
              {loading
                ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-200/20 border-t-emerald-200/80 animate-spin" /> Memverifikasi…</>
                : <>Masuk ke Dashboard <ArrowRight size={14} /></>
              }
            </button>

            <div className="pt-3 border-t border-slate-200/60">
              <div className="flex items-start gap-2 text-2xs text-slate-500 leading-relaxed">
                <LinkIcon size={11} className="shrink-0 mt-0.5 text-ds-green" />
                <span>
                  Token didapat dari email undangan SurePath atau hubungi tim SurePath untuk minta link akses baru. Token berlaku 7 hari dan auto-renew setiap login.
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center mt-7 flex items-center justify-center gap-2"
          style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(124,58,237,0.35)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          PT Ruang Proteksi Indonesia · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default InsurerLogin;
