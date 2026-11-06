// InsurerLogin.tsx — token-based auth gate for /insurerapp (v2.7.59 redesign).
//
// Insurers tidak punya akun Supabase Auth; mereka masuk lewat rolling 7-day
// token yang diterima lewat email undangan (URL ?token=xxx) atau input manual.
// Pada success token disimpan di sessionStorage dan dashboard dimuat.
//
// Visual DNA: emerald bank-grade (konsisten dengan InsurerHero di Dashboard).
// Login screen adalah "first impression" — jadi kita beri branded gradient
// panel kiri (desktop) + card login clean di kanan. Di mobile tumpuk vertikal.
import React, { useState, useEffect } from 'react';
import { ArrowRight, AlertCircle, KeyRound, ShieldCheck, Clock, Mail } from 'lucide-react';
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

  // URL ?token=xxx → auto-validate on mount.
  useEffect(() => {
    if (initialToken) handleLogin(initialToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialToken]);

  const handleLogin = async (tokenToValidate?: string) => {
    const t = (tokenToValidate ?? token).trim();
    if (!t) { setError('Token wajib diisi'); return; }
    setLoading(true);
    setError(null);
    try {
      const dashboard = await getInsurerDashboard(t);
      sessionStorage.setItem('SUREPATH_INSURER_TOKEN', t);
      sessionStorage.setItem('SUREPATH_INSURER_NAME', dashboard.insurer.name);
      onLoginSuccess(t);
    } catch (e: any) {
      console.error('InsurerLogin error:', e);
      const msg = e?.message ?? '';
      const friendly = msg.includes('Invalid token') || msg.includes('not found')
        ? 'Token tidak valid. Periksa kembali link dari email atau hubungi tim SurePath.'
        : msg.includes('Token expired')
        ? 'Token sudah kedaluwarsa. Minta link baru dari tim SurePath.'
        : `Gagal masuk: ${msg}`;
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden"
      style={{ background: '#F7F8FA', fontFamily: "'Sora', sans-serif" }}
    >
      <style>{`
        @keyframes ins-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(1.3); } }
        @media (prefers-reduced-motion: reduce) { [data-ins-pulse] { animation: none !important; } }
      `}</style>

      {/* ── Left: branded panel (hidden on mobile) ──────────────────────── */}
      <aside
        className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12 text-white"
        style={{
          flex: '0 0 44%',
          background: 'linear-gradient(135deg, #052E1C 0%, #065F46 55%, #047857 100%)',
        }}
      >
        {/* Concentric rings decoration */}
        <div aria-hidden className="absolute pointer-events-none" style={{ top: -120, right: -120, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.3), transparent 65%)' }} />
        <svg aria-hidden className="absolute pointer-events-none" style={{ top: -80, right: -80, width: 420, height: 420 }} viewBox="0 0 420 420" fill="none">
          <circle cx="340" cy="80" r="170" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
          <circle cx="340" cy="80" r="120" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
          <circle cx="340" cy="80" r="70" stroke="rgba(255,255,255,0.13)" strokeWidth="1.5" />
        </svg>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <span data-ins-pulse className="inline-block w-2 h-2 rounded-full bg-emerald-400" style={{ animation: 'ins-pulse 2s ease-in-out infinite' }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-200">Insurer Portal · SurePath</span>
          </div>
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.08] mb-4">
            Pintu masuk<br />mitra asuransi.
          </h1>
          <p className="text-emerald-100/85 text-sm leading-relaxed max-w-md">
            Pusat kontrol pengajuan polis, klaim, dan pembayaran dari jaringan SurePath — real-time, satu layar.
          </p>
        </div>

        <div className="relative z-10 space-y-3 text-[13px]">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <ShieldCheck size={16} className="text-emerald-300" />
            </div>
            <div>
              <p className="font-semibold text-white">Pengajuan ter-triase otomatis</p>
              <p className="text-emerald-100/75 text-[12px]">AI pre-score dokumen + foto sebelum masuk antrean Anda.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <Clock size={16} className="text-emerald-300" />
            </div>
            <div>
              <p className="font-semibold text-white">Token aktif 7 hari</p>
              <p className="text-emerald-100/75 text-[12px]">Auto-renew setiap kali masuk; tidak butuh password.</p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-[11px] text-emerald-200/60 tracking-wider">
          PT Ruang Proteksi Indonesia · OJK Registered · {new Date().getFullYear()}
        </p>
      </aside>

      {/* ── Right: login card ───────────────────────────────────────────── */}
      <main className="flex-1 relative flex flex-col items-center justify-center p-6 sm:p-10">
        {/* Back + session chip (mobile shows both at top) */}
        <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
          {onBack ? (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 hover:text-slate-700 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Kembali
            </button>
          ) : <span />}
          <div className="inline-flex items-center gap-1.5">
            <span data-ins-pulse className="w-1.5 h-1.5 rounded-full bg-emerald-500" style={{ animation: 'ins-pulse 2.4s ease-in-out infinite' }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Insurer Session</span>
          </div>
        </div>

        {/* Mobile-only compact brand */}
        <div className="lg:hidden flex flex-col items-center mb-7 pt-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg, #065F46 0%, #047857 100%)', boxShadow: '0 12px 30px -10px rgba(6,78,59,0.45)' }}
          >
            <ShieldCheck size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Insurer Portal</h1>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mt-1">Mitra Asuransi SurePath</p>
        </div>

        {/* Form card */}
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-7 sm:p-8" style={{ boxShadow: '0 20px 48px -24px rgba(15,23,42,0.18)' }}>
          <div className="hidden lg:block mb-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Masuk</p>
            <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">Token akses</h2>
            <p className="mt-1.5 text-[13px] text-slate-500 leading-relaxed">
              Masukkan token yang Anda terima dari email undangan SurePath.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl flex items-start gap-2.5 bg-rose-50 border border-rose-100">
              <AlertCircle className="shrink-0 mt-0.5" size={14} style={{ color: '#dc2626' }} />
              <p className="text-[12px] font-semibold text-rose-700 leading-snug">{error}</p>
            </div>
          )}

          <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1.5">
            Token Akses
          </label>
          <div className="relative mb-5">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600" size={14} />
            <input
              type="text"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Paste token dari email…"
              onKeyDown={e => { if (e.key === 'Enter' && !loading && token.trim()) handleLogin(); }}
              className="block w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition-all text-[13px]"
              style={{ fontFamily: 'ui-monospace, "JetBrains Mono", Menlo, Monaco, monospace' }}
            />
          </div>

          <button
            type="button"
            onClick={() => handleLogin()}
            disabled={loading || !token.trim()}
            className="w-full flex justify-center items-center gap-2.5 py-3.5 rounded-xl font-bold text-[12px] uppercase tracking-[0.14em] text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
            style={{
              background: 'linear-gradient(135deg, #065F46 0%, #047857 55%, #059669 100%)',
              boxShadow: loading ? 'none' : '0 10px 28px -10px rgba(6,95,70,0.55)',
            }}
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-200/40 border-t-white animate-spin" />
                Memverifikasi…
              </>
            ) : (
              <>Masuk ke Dashboard <ArrowRight size={15} /></>
            )}
          </button>

          <div className="pt-5 mt-5 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
            <Mail size={12} className="shrink-0 mt-0.5 text-emerald-600" />
            <span>
              Belum terima token? Hubungi tim SurePath untuk minta link akses baru. Token berlaku 7 hari dan diperpanjang otomatis setiap login.
            </span>
          </div>
        </div>

        <p className="lg:hidden text-center text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 mt-6">
          PT Ruang Proteksi Indonesia · {new Date().getFullYear()}
        </p>
      </main>
    </div>
  );
};

export default InsurerLogin;
