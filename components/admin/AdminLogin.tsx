import React, { useEffect, useState } from 'react';
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../services/supabaseService';
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '../../services/authService';
import { UserRole } from '../../types';

const ADMIN_ROLES = [
  UserRole.MASTER_ADMIN,
  UserRole.ADMIN,
  UserRole.FINANCE,
  UserRole.FINANCE_MANAGER,
  UserRole.FINANCE_DIRECTOR,
  UserRole.INSURANCE_ADMIN,
];
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface AdminLoginProps {
  onLoginSuccess: (user: any) => void;
  onBack?: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBack }) => {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPass, setShowPass]         = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const authorizeAdminSession = async (authUser: any, session: any, attemptedEmail?: string) => {
    const normalEmail = String(authUser?.email ?? attemptedEmail ?? '').trim().toLowerCase();
    if (!authUser || !session?.access_token || !normalEmail) {
      setError('Login Google tidak menghasilkan sesi yang valid. Silakan coba lagi.');
      return false;
    }

    try {
      const gwRes = await fetch(`${SUPABASE_URL}/functions/v1/data-gateway`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'get_my_profile' }),
      });
      const gwData: { data?: any; error?: string } = await gwRes.json();
      const spUser = gwRes.ok ? (gwData.data ?? null) : null;

      // Google OAuth may authenticate an identity, but it must never provision
      // an application profile or grant access by itself. Only an existing
      // sp_users record with an authorized admin role/apps may enter.
      if (!spUser) {
        await supabase.auth.signOut();
        recordFailedAttempt(normalEmail);
        setError('Akun Google ini belum terdaftar di database SurePath. Hubungi administrator.');
        return false;
      }

      const allowedApps: string[] = Array.isArray(spUser.allowed_apps) ? spUser.allowed_apps : [];
      const canAccessAdmin = ADMIN_ROLES.includes(spUser.role as UserRole) || allowedApps.includes('ADMIN');
      if (!canAccessAdmin) {
        await supabase.auth.signOut();
        recordFailedAttempt(normalEmail);
        setError('Akses ditolak. Akun ini tidak memiliki izin admin.');
        return false;
      }

      clearRateLimit(normalEmail);
      onLoginSuccess({
        id: spUser.id,
        name: spUser.name,
        email: spUser.email,
        role: spUser.role,
        supabaseId: authUser.id,
        nodeId: spUser.agent_code ?? `SP-${authUser.id.slice(0, 8).toUpperCase()}`,
        allowed_apps: allowedApps,
        trustScore: spUser.trust_score ?? 85,
        token: session.access_token,
      });
      return true;
    } catch {
      await supabase.auth.signOut();
      setError('Gagal memverifikasi akses admin. Silakan coba lagi.');
      return false;
    }
  };

  // Supabase returns here after Google OAuth. Verify the session against the
  // existing SurePath profile before rendering the admin portal.
  useEffect(() => {
    const callbackUrl = new URL(window.location.href);
    const isOAuthCallback =
      callbackUrl.searchParams.has('code') ||
      window.location.hash.includes('access_token=') ||
      window.location.hash.includes('error=');
    if (!isOAuthCallback) return;

    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (!active) return;
        if (sessionError || !data.session || !data.session.user) {
          setError('Login Google gagal atau sesi tidak valid. Silakan coba lagi.');
          return;
        }
        await authorizeAdminSession(data.session.user, data.session, data.session.user.email);
        if (active) {
          // Remove OAuth tokens/code from the visible URL after verification.
          window.history.replaceState({}, document.title, '/admin');
        }
      } catch {
        if (active) setError('Tidak dapat memverifikasi akun Google. Silakan coba lagi.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/admin` },
      });
      if (oauthError) setError(`Login Google gagal: ${oauthError.message}`);
    } catch {
      setError('Tidak dapat memulai login Google. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const normalEmail = email.trim().toLowerCase();
    const rl = checkRateLimit(normalEmail);
    if (!rl.allowed) {
      const mins = Math.ceil(((rl.lockedUntilMs ?? Date.now()) - Date.now()) / 60000);
      setError(`Terlalu banyak percobaan. Coba lagi dalam ${mins} menit.`);
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalEmail,
        password,
      });

      if (!authError && authData.user && authData.session) {
        await authorizeAdminSession(authData.user, authData.session, normalEmail);
        return;
      }

      recordFailedAttempt(normalEmail);
      setError('Kredensial salah atau akun tidak ditemukan.');
    } catch {
      setError('Terjadi kesalahan sistem. Silakan coba lagi.');
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
        @keyframes adm-scan { 0% { transform: translateY(-100%) } 100% { transform: translateY(200vh) } }
        @keyframes adm-ping  { 0%,100% { opacity:.12; transform:scale(1) } 50% { opacity:.22; transform:scale(1.18) } }
      `}</style>

      {/* Dot-matrix background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(rgba(5,150,105,0.045) 1px, transparent 1px)',
        backgroundSize: '26px 26px',
      }} />

      {/* Blobs */}
      <div className="absolute pointer-events-none" style={{ top: '-15%', left: '-8%', width: '65%', height: '65%', background: 'radial-gradient(ellipse, rgba(34,197,94,0.16) 0%, transparent 65%)' }} />
      <div className="absolute pointer-events-none" style={{ bottom: '-15%', right: '-8%', width: '55%', height: '55%', background: 'radial-gradient(ellipse, rgba(249,115,22,0.13) 0%, transparent 65%)' }} />

      {/* Slow scanline sweep */}
      <div className="absolute inset-x-0 h-px pointer-events-none" style={{
        background: 'linear-gradient(90deg, transparent 10%, rgba(22,163,74,0.18) 50%, transparent 90%)',
        animation: 'adm-scan 12s linear infinite',
        boxShadow: '0 0 14px rgba(22,163,74,0.07)',
      }} />

      {/* Top + bottom hairlines */}
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(22,163,74,0.28) 50%, transparent 90%)' }} />
      <div className="absolute bottom-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(22,163,74,0.10) 50%, transparent 90%)' }} />

      {/* Back link */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-6 left-6 flex items-center gap-1.5 transition-colors duration-200"
          style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#94a3b8' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#059669')}
          onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Kembali
        </button>
      )}

      {/* Live session badge */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#16a34a', boxShadow: '0 0 6px rgba(22,163,74,0.7)', animation: 'adm-ping 2.4s ease-in-out infinite' }} />
        <span style={{ fontSize: '0.6875rem', letterSpacing: '0.14em', textTransform: 'uppercase', whiteSpace: 'nowrap', color: '#64748b', fontWeight: 700 }}>Secure Session</span>
      </div>

      <div className="relative z-10 w-full max-w-xs px-5">

        {/* Logo + heading */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6">
            {/* Outer halo ring */}
            <div className="absolute rounded-full" style={{
              inset: -20, background: 'radial-gradient(circle, rgba(22,163,74,0.12) 0%, transparent 72%)',
              animation: 'adm-ping 3s ease-in-out infinite',
            }} />
            {/* Shield icon tile with gradient border — enlarged icon fitted to box */}
            <div className="w-16 h-16 rounded-2xl sp-glass flex items-center justify-center">
              <img loading="lazy" src="/logo-sm.png" alt="SurePath" className="w-11 h-12 object-contain" />
            </div>
          </div>

          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, letterSpacing: '-0.04em', color: '#0f172a', lineHeight: 1, marginBottom: '0.55rem' }}>
            Admin Portal
          </h1>
          <div className="flex items-center gap-2.5">
            <div className="h-px w-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(22,163,74,0.4))' }} />
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Authorized Access Only
            </span>
            <div className="h-px w-8" style={{ background: 'linear-gradient(90deg, rgba(22,163,74,0.4), transparent)' }} />
          </div>
        </div>

        {/* Card — gradient-border wrapper */}
        <div className="relative sp-glass rounded-2xl">
          <div className="rounded-2xl p-6 space-y-5">

            {error && (
              <div className="p-3 rounded-xl flex items-start gap-2.5"
                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <AlertCircle className="shrink-0 mt-0.5" size={13} style={{ color: '#f87171' }} />
                <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#dc2626', lineHeight: 1.5 }}>{error}</p>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleLogin}>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" size={13} style={{ color: '#059669' }} />
                  <input
                    type="email" required autoComplete="username"
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="admin@surepath.ai"
                    className="block w-full pl-10 pr-4 py-3 rounded-full text-ds-ink placeholder-slate-400 outline-none transition-all duration-200"
                    style={{ background: 'var(--ds-card2, rgba(255,255,255,0.85))', color: 'var(--ds-ink, #0f172a)', border: '1px solid var(--ds-border, rgba(6,78,59,0.12))', fontFamily: 'monospace', fontSize: '0.78rem' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(22,163,74,0.50)'; e.target.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.07), inset 0 0 0 1px rgba(22,163,74,0.10)'; }}
                    onBlur={e  => { e.target.style.borderColor = 'var(--ds-border, rgba(6,78,59,0.12))'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" size={13} style={{ color: '#059669' }} />
                  <input
                    type={showPass ? 'text' : 'password'} required autoComplete="current-password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full pl-10 pr-11 py-3 rounded-full text-ds-ink placeholder-slate-400 outline-none transition-all duration-200"
                    style={{ background: 'var(--ds-card2, rgba(255,255,255,0.85))', color: 'var(--ds-ink, #0f172a)', border: '1px solid var(--ds-border, rgba(6,78,59,0.12))', fontFamily: 'monospace', fontSize: '0.78rem' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(22,163,74,0.50)'; e.target.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.07), inset 0 0 0 1px rgba(22,163,74,0.10)'; }}
                    onBlur={e  => { e.target.style.borderColor = 'var(--ds-border, rgba(6,78,59,0.12))'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
                    style={{ color: '#94a3b8' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#059669')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
                  >
                    {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full flex justify-center items-center gap-2.5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-200 active:scale-[0.98] disabled:opacity-40 hover:brightness-[1.08]"
                style={{
                  background: 'linear-gradient(115deg, #15803d 0%, #059669 62%, #f97316 145%)',
                  color: '#f0fdf4',
                  boxShadow: loading ? 'none' : '0 8px 28px -10px rgba(22,163,74,0.55)',
                }}
              >
                {loading
                  ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-green-200/20 border-t-green-200/80 animate-spin" /> Memverifikasi...</>
                  : <>Masuk ke Dashboard <ArrowRight size={14} /></>
                }
              </button>
            </form>

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1" style={{ background: 'rgba(6,78,59,0.12)' }} />
              <span style={{ fontSize: '0.6875rem', color: '#94a3b8', letterSpacing: '0.18em', fontWeight: 700 }}>ATAU</span>
              <div className="h-px flex-1" style={{ background: 'rgba(6,78,59,0.12)' }} />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex justify-center items-center gap-3 py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40"
              style={{ background: 'var(--ds-card2, #ffffff)', color: 'var(--ds-ink2, #334155)', border: '1px solid var(--ds-border, rgba(6,78,59,0.16))', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}
            >
              <span aria-hidden="true" className="flex items-center justify-center w-5 h-5 rounded-full font-bold" style={{ fontSize: '0.95rem', color: '#4285F4', fontFamily: 'Arial, sans-serif' }}>G</span>
              Lanjutkan dengan Google
            </button>
          </div>
        </div>

        <p className="text-center mt-7 flex items-center justify-center gap-2"
          style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(22,163,74,0.35)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          SurePath Admin · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
