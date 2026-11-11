// B2BLogin.tsx — dedicated sign-in screen for the B2B corporate portal
// (/b2bapps). B2B accounts are provisioned by SurePath admin (no self-signup
// toggle here, unlike the retail AuthGate's Nasabah/Mitra picker) — this is
// login + forgot-password only, email/password via Supabase Auth.
//
// Visual identity deliberately distinct from the sibling portal logins:
// Insurer uses an orange accent, this pairs emerald with indigo — B2B here
// means institutional/fleet finance (multifinance companies), not retail.
//
// v2.7.56 — premium split layout: desktop shows a brand panel on the left
// (ledger motif, feature list) and the glass card on the right; on login
// success an emerald panel WIPES the screen from left to right before the
// portal mounts underneath — the transition reads as the login handing the
// baton to the portal. All auth logic (must_change_password handoff, profile
// checks) is untouched by this redesign.
import React, { useState } from 'react';
import { ArrowRight, AlertCircle, Mail, Lock, CheckCircle2, Building2, Files, FileCheck, Activity } from 'lucide-react';
import { supabase } from '../../services/db';
import { fetchMyProfileForLogin } from '../../services/users';
import { UserRole } from '../../types';

interface B2BLoginProps {
  onLoginSuccess: (user: any) => void;
  onBack?: () => void;
}

type Mode = 'LOGIN' | 'FORGOT' | 'FORGOT_SENT';

const shapeUser = (profile: any) => ({
  id: profile.id,
  name: profile.name,
  email: profile.email,
  role: profile.role as UserRole,
  supabaseId: profile.id,
  allowed_apps: profile.allowed_apps ?? null,
});

const B2BLogin: React.FC<B2BLoginProps> = ({ onLoginSuccess, onBack }) => {
  const [mode, setMode] = useState<Mode>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const friendlyAuthError = (msg: string): string => {
    if (msg.includes('Invalid login credentials')) return 'Email atau kata sandi salah. Periksa kembali.';
    if (msg.includes('Email not confirmed')) return 'Email belum dikonfirmasi. Cek kotak masuk Anda.';
    return `Gagal masuk: ${msg}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Email dan kata sandi wajib diisi.'); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authErr || !data.user) {
        setError(friendlyAuthError(authErr?.message ?? 'unknown error'));
        setLoading(false);
        return;
      }

      // Password set by admin (e.g. account just provisioned) — must be
      // changed before the account is usable. Point to the existing reset
      // flow rather than rebuilding it here.
      if (data.user.user_metadata?.must_change_password === true) {
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}?reset=1`,
        });
        setError('Kata sandi Anda disetel oleh admin. Kami mengirim link untuk membuat kata sandi baru — cek email Anda.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      const res = await fetchMyProfileForLogin();
      if (!res.profile) {
        await supabase.auth.signOut();
        setError(res.noProfile
          ? 'Akun ini belum terdaftar sebagai klien B2B. Hubungi admin SurePath untuk aktivasi.'
          : 'Tidak bisa memuat profil. Periksa koneksi lalu coba lagi.');
        setLoading(false);
        return;
      }
      if (res.profile.role !== UserRole.B2B_CLIENT) {
        await supabase.auth.signOut();
        setError('Akun ini bukan akun korporat B2B. Masuk lewat portal yang sesuai dengan peran Anda.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      // The wipe panel takes ~500ms to cover the screen; the remaining beat
      // lets the "Berhasil masuk" state register before the portal mounts
      // underneath the (fully opaque) panel.
      setTimeout(() => onLoginSuccess(shapeUser(res.profile)), 700);
    } catch (e: any) {
      setError(`Gagal masuk: ${e?.message ?? 'kesalahan tidak diketahui'}`);
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Masukkan email Anda dulu.'); return; }
    setLoading(true);
    setError(null);
    const { error: e2 } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}?reset=1`,
    });
    setLoading(false);
    if (e2) { setError(e2.message); return; }
    setMode('FORGOT_SENT');
  };

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row relative overflow-hidden"
      style={{ background: '#f5f7fa', fontFamily: "'Sora', sans-serif" }}
    >
      <style>{`
        @keyframes b2b-drift-a { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(3%,-4%) scale(1.08) } }
        @keyframes b2b-drift-b { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(-4%,3%) scale(1.1) } }
        @keyframes b2b-rise-in { from { opacity: 0; transform: translateY(14px) scale(.985); filter: blur(6px) } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0) } }
        @keyframes b2b-pop-in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes b2b-ring-pulse { 0% { transform: scale(1); opacity: .55 } 100% { transform: scale(2.4); opacity: 0 } }
        @keyframes b2b-dot-pulse { 0%,100% { opacity: .35 } 50% { opacity: .8 } }
        @keyframes b2b-shimmer { 0% { transform: translateX(-100%) } 100% { transform: translateX(240%) } }
        @keyframes b2b-wipe-in { from { transform: translateX(-101%) } to { transform: translateX(0) } }
        @keyframes b2b-wipe-bar { from { transform: scaleX(0) } to { transform: scaleX(1) } }
        .b2b-stagger-1 { animation: b2b-pop-in .5s cubic-bezier(.2,.8,.2,1) .05s both }
        .b2b-stagger-2 { animation: b2b-pop-in .5s cubic-bezier(.2,.8,.2,1) .15s both }
        .b2b-stagger-3 { animation: b2b-pop-in .5s cubic-bezier(.2,.8,.2,1) .25s both }
        .b2b-stagger-4 { animation: b2b-pop-in .5s cubic-bezier(.2,.8,.2,1) .35s both }
        .b2b-brand-stagger-1 { animation: b2b-pop-in .55s cubic-bezier(.2,.8,.2,1) .1s both }
        .b2b-brand-stagger-2 { animation: b2b-pop-in .55s cubic-bezier(.2,.8,.2,1) .22s both }
        .b2b-brand-stagger-3 { animation: b2b-pop-in .55s cubic-bezier(.2,.8,.2,1) .34s both }
        .b2b-brand-stagger-4 { animation: b2b-pop-in .55s cubic-bezier(.2,.8,.2,1) .46s both }
        @media (prefers-reduced-motion: reduce) {
          .b2b-stagger-1, .b2b-stagger-2, .b2b-stagger-3, .b2b-stagger-4, .b2b-card-enter { animation: none !important; }
          .b2b-brand-stagger-1, .b2b-brand-stagger-2, .b2b-brand-stagger-3, .b2b-brand-stagger-4 { animation: none !important; }
          .b2b-blob { animation: none !important; }
          .b2b-wipe-panel { animation: none !important; }
          .b2b-wipe-bar { animation: none !important; transform: scaleX(1); }
        }
      `}</style>

      {/* ── Panel brand (desktop) — ledger motif, identitas korporat ─────── */}
      <aside
        className="hidden md:flex md:w-[44%] lg:w-[42%] flex-col justify-between relative overflow-hidden p-10 xl:p-14"
        style={{
          background: 'linear-gradient(155deg, #064e3b 0%, #065f46 48%, #1e3a8a 135%)',
          color: '#fff',
        }}
      >
        {/* Motif buku besar: garis-garis tipis transulasi — institusional,
            bukan konsumen. Digambar CSS, tanpa aset eksternal. */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.13]" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 44px)',
        }} />
        <div className="absolute -bottom-32 -right-24 w-[28rem] h-[28rem] rounded-full pointer-events-none" style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.10) 0%, transparent 70%)',
        }} />

        <div className="relative b2b-brand-stagger-1">
          <div className="flex items-center gap-3.5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: '1px solid rgba(255,255,255,0.22)',
              }}
            >
              <Building2 size={24} color="#fff" strokeWidth={2} />
            </div>
            <div>
              <p className="font-extrabold text-lg leading-tight" style={{ letterSpacing: '-0.02em' }}>
                Sure<span style={{ color: '#6ee7b7' }}>Path</span> Korporat
              </p>
              <p className="text-2xs font-bold uppercase tracking-[0.18em] text-white/55 mt-0.5">
                Portal Mitra B2B
              </p>
            </div>
          </div>

          <h2 className="mt-12 font-extrabold text-3xl xl:text-4xl leading-[1.15]" style={{ letterSpacing: '-0.03em' }}>
            Satu portal untuk
            <br />
            seluruh kebutuhan
            <br />
            <span style={{ color: '#6ee7b7' }}>asuransi korporat.</span>
          </h2>
        </div>

        <div className="relative space-y-5 my-10">
          <div className="flex items-start gap-4 b2b-brand-stagger-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)' }}>
              <Files size={16} color="#6ee7b7" />
            </div>
            <div>
              <p className="text-sm font-bold">Pengajuan satuan &amp; impor armada massal</p>
              <p className="text-xs text-white/60 mt-0.5 leading-relaxed">Isi Excel sekali — sistem memecah jadi polis per unit.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 b2b-brand-stagger-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)' }}>
              <FileCheck size={16} color="#6ee7b7" />
            </div>
            <div>
              <p className="text-sm font-bold">Penawaran &amp; PDF siap kirim</p>
              <p className="text-xs text-white/60 mt-0.5 leading-relaxed">Bandingkan, terima, unduh dokumen — dari satu layar.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 b2b-brand-stagger-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)' }}>
              <Activity size={16} color="#6ee7b7" />
            </div>
            <div>
              <p className="text-sm font-bold">Status transaksi transparan</p>
              <p className="text-xs text-white/60 mt-0.5 leading-relaxed">Pantau sampai polisi terbit, tanpa perlu bertanya.</p>
            </div>
          </div>
        </div>

        <div className="relative b2b-brand-stagger-4">
          <div className="h-px w-full mb-5" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.25), transparent)' }} />
          <p className="text-2xs font-bold text-white/45 uppercase tracking-[0.14em]">
            Dipercaya mitra multifinance · PT Ruang Proteksi Indonesia
          </p>
        </div>
      </aside>

      {/* ── Sisi kanan: ambient + kartu kaca ──────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-5 py-10">
        {/* Ambient background — slow-drifting emerald + indigo blobs, calmer
            pacing than a consumer screen (this is a B2B finance tool). */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(rgba(67,56,202,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        <div className="b2b-blob absolute pointer-events-none" style={{
          top: '-18%', left: '-10%', width: '60%', height: '60%',
          background: 'radial-gradient(ellipse, rgba(5,150,105,0.16) 0%, transparent 68%)',
          animation: 'b2b-drift-a 16s ease-in-out infinite',
        }} />
        <div className="b2b-blob absolute pointer-events-none" style={{
          bottom: '-18%', right: '-10%', width: '55%', height: '55%',
          background: 'radial-gradient(ellipse, rgba(67,56,202,0.14) 0%, transparent 68%)',
          animation: 'b2b-drift-b 18s ease-in-out infinite',
        }} />

        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-6 left-6 flex items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-colors duration-200 z-20"
            style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Kembali
          </button>
        )}

        <div className="absolute top-6 right-6 flex items-center gap-2 z-20">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#4338ca', animation: 'b2b-dot-pulse 2.6s ease-in-out infinite' }} />
          <span style={{ fontSize: '0.6875rem', letterSpacing: '0.14em', textTransform: 'uppercase', whiteSpace: 'nowrap', color: '#64748b', fontWeight: 700 }}>
            B2B Session
          </span>
        </div>

        <div className="relative z-10 w-full max-w-sm">
          {/* Signature move: the whole card rises and sharpens into focus —
              the one orchestrated entrance this screen gets. */}
          <div className="b2b-card-enter" style={{ animation: 'b2b-rise-in .6s cubic-bezier(.2,.8,.2,1) both' }}>
            {/* Brand header — full di mobile, ringkas di desktop (versi lengkap
                ada di panel kiri). */}
            <div className="flex flex-col items-center mb-9 b2b-stagger-1 md:hidden">
              <div className="relative mb-5">
                <div className="absolute rounded-2xl" style={{
                  inset: -14, background: 'radial-gradient(circle, rgba(67,56,202,0.14) 0%, transparent 72%)',
                }} />
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'rgba(255,255,255,0.82)',
                    backdropFilter: 'blur(20px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                    border: '1px solid rgba(67,56,202,0.14)',
                    boxShadow: '0 8px 24px -16px rgba(67,56,202,0.35)',
                  }}
                >
                  <Building2 size={26} color="#4338ca" strokeWidth={2} />
                </div>
              </div>

              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', lineHeight: 1.1, marginBottom: '0.4rem' }}>
                Sure<span style={{ color: '#059669' }}>Path</span> Korporat
              </h1>
              <div className="flex items-center gap-2.5 mt-1">
                <div className="h-px w-7" style={{ background: 'linear-gradient(90deg, transparent, rgba(67,56,202,0.4))' }} />
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  Portal Mitra B2B
                </span>
                <div className="h-px w-7" style={{ background: 'linear-gradient(90deg, rgba(67,56,202,0.4), transparent)' }} />
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2.5 mb-6 b2b-stagger-1">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{
                background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(67,56,202,0.14)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              }}>
                <Building2 size={15} color="#4338ca" strokeWidth={2} />
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Sure<span style={{ color: '#059669' }}>Path</span> Korporat
              </span>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                · Portal Mitra B2B
              </span>
            </div>

            <div
              className="relative rounded-2xl b2b-stagger-2"
              style={{
                background: 'rgba(255,255,255,0.82)',
                backdropFilter: 'blur(20px) saturate(140%)',
                WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                border: '1px solid rgba(67,56,202,0.12)',
                boxShadow: '0 20px 48px -28px rgba(15,23,42,0.25)',
              }}
            >
              <div className="rounded-2xl p-6 space-y-5">
                {error && (
                  <div className="p-3 rounded-xl flex items-start gap-2.5" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <AlertCircle className="shrink-0 mt-0.5" size={13} style={{ color: '#f87171' }} />
                    <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#dc2626', lineHeight: 1.5 }}>{error}</p>
                  </div>
                )}

                {mode === 'FORGOT_SENT' ? (
                  <div className="py-2 text-center space-y-3">
                    <CheckCircle2 size={32} color="#059669" className="mx-auto" />
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Link terkirim</p>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
                      Cek email <strong>{email}</strong> untuk tautan membuat kata sandi baru.
                    </p>
                    <button
                      type="button"
                      onClick={() => { setMode('LOGIN'); setError(null); }}
                      style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4338ca' }}
                    >
                      Kembali ke halaman masuk
                    </button>
                  </div>
                ) : mode === 'FORGOT' ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
                      Masukkan email akun B2B Anda — kami kirim tautan untuk membuat kata sandi baru.
                    </p>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        Email Korporat
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" size={13} style={{ color: '#4338ca' }} />
                        <input
                          type="email" value={email} onChange={e => setEmail(e.target.value)}
                          placeholder="nama@perusahaan.co.id"
                          className="block w-full pl-10 pr-4 py-3 rounded-full text-slate-900 placeholder-slate-400 outline-none transition-all duration-200"
                          style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(67,56,202,0.14)', fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>
                    <button
                      type="submit" disabled={loading}
                      className="w-full flex justify-center items-center gap-2.5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-150 active:scale-[0.97] disabled:opacity-40"
                      style={{ background: 'linear-gradient(115deg, #4338ca 0%, #4f46e5 100%)', color: '#fff' }}
                    >
                      {loading ? 'Mengirim…' : 'Kirim Link Reset'}
                    </button>
                    <button type="button" onClick={() => { setMode('LOGIN'); setError(null); }}
                      className="w-full text-center" style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8' }}>
                      Batal
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        Email Korporat
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" size={13} style={{ color: '#4338ca' }} />
                        <input
                          type="email" value={email} onChange={e => setEmail(e.target.value)}
                          placeholder="nama@perusahaan.co.id" autoComplete="username"
                          className="block w-full pl-10 pr-4 py-3 rounded-full text-slate-900 placeholder-slate-400 outline-none transition-all duration-200"
                          style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(67,56,202,0.14)', fontSize: '0.8rem' }}
                          onFocus={e => { e.target.style.borderColor = 'rgba(67,56,202,0.5)'; }}
                          onBlur={e => { e.target.style.borderColor = 'rgba(67,56,202,0.14)'; }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                          Kata Sandi
                        </label>
                        <button type="button" onClick={() => { setMode('FORGOT'); setError(null); }}
                          style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#4338ca' }}>
                          Lupa?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" size={13} style={{ color: '#4338ca' }} />
                        <input
                          type="password" value={password} onChange={e => setPassword(e.target.value)}
                          placeholder="••••••••" autoComplete="current-password"
                          className="block w-full pl-10 pr-4 py-3 rounded-full text-slate-900 placeholder-slate-400 outline-none transition-all duration-200"
                          style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(67,56,202,0.14)', fontSize: '0.8rem' }}
                          onFocus={e => { e.target.style.borderColor = 'rgba(67,56,202,0.5)'; }}
                          onBlur={e => { e.target.style.borderColor = 'rgba(67,56,202,0.14)'; }}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || success}
                      className="relative w-full flex justify-center items-center gap-2.5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-transform duration-150 active:scale-[0.96] disabled:opacity-80 overflow-hidden"
                      style={{
                        background: success
                          ? 'linear-gradient(115deg, #059669 0%, #047857 100%)'
                          : 'linear-gradient(115deg, #4338ca 0%, #059669 150%)',
                        color: '#fff',
                        boxShadow: loading ? 'none' : '0 10px 30px -12px rgba(67,56,202,0.5)',
                      }}
                    >
                      {success && (
                        <span className="absolute inset-0 rounded-full" style={{
                          border: '2px solid rgba(255,255,255,0.7)',
                          animation: 'b2b-ring-pulse .65s ease-out',
                        }} />
                      )}
                      {success
                        ? <><CheckCircle2 size={15} /> Berhasil masuk</>
                        : loading
                          ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white/25 border-t-white/90 animate-spin" /> Memverifikasi…</>
                          : <>Masuk ke Portal <ArrowRight size={14} /></>
                      }
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="mt-6 b2b-stagger-4">
              <p className="text-center flex items-center justify-center gap-2" style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Belum punya akun?
                <a href="mailto:partnership@myinsurepath.com" style={{ color: '#4338ca' }}>Hubungi tim SurePath</a>
              </p>
              <p className="text-center mt-5 flex items-center justify-center gap-2" style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#cbd5e1', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(67,56,202,0.35)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                PT Ruang Proteksi Indonesia · {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Transisi sukses: panel menyapu kiri → kanan, menutup layar penuh.
          onLoginSuccess me-mount portal DI BAWAH panel (opaque), jadi sapuan
          ini terbaca sebagai "login menyerahkan ke portal". ───────────────── */}
      {success && (
        <div
          className="b2b-wipe-panel fixed inset-0 z-[400] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(150deg, #065f46 0%, #047857 55%, #1e3a8a 140%)',
            animation: 'b2b-wipe-in .55s cubic-bezier(.65,0,.35,1) both',
            color: '#fff',
          }}
        >
          <div className="absolute inset-0 pointer-events-none opacity-[0.12]" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 44px)',
          }} />
          <div
            className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
          >
            <Building2 size={30} color="#fff" strokeWidth={2} />
          </div>
          <p className="relative font-extrabold text-lg" style={{ letterSpacing: '-0.02em' }}>
            Selamat datang kembali
          </p>
          <p className="relative text-xs text-white/60 mt-1 mb-8">
            Menyiapkan portal korporat Anda…
          </p>
          <div className="relative w-44 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <div
              className="absolute inset-0 origin-left rounded-full"
              style={{
                background: 'linear-gradient(90deg, #6ee7b7, rgba(255,255,255,0.9))',
                animation: 'b2b-wipe-bar .7s cubic-bezier(.65,0,.35,1) both',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default B2BLogin;
