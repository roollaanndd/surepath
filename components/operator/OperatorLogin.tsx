import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { supabase } from '../../services/supabaseService';
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '../../services/authService';
import { UserRole } from '../../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface OperatorLoginProps {
  onLoginSuccess: (user: any) => void;
  onBack?: () => void;
}

/**
 * OperatorLogin — gate for /operatorapp.
 *
 * Same Supabase Auth + gateway lookup flow as AdminLogin, but checks that the
 * sp_users.role === 'OPERATOR'. Master admins can grant OPERATOR to internal
 * staff via admin_update_user (gateway already supports it since v1.18.0).
 *
 * Defence-in-depth: even if an admin or customer somehow lands on /operatorapp
 * and tries to log in here, the role check below rejects them.
 */
const OperatorLogin: React.FC<OperatorLoginProps> = ({ onLoginSuccess, onBack }) => {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPass, setShowPass]         = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

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
        const gwRes = await fetch(`${SUPABASE_URL}/functions/v1/data-gateway`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authData.session.access_token}`,
          },
          body: JSON.stringify({ action: 'get_my_profile' }),
        });
        const gwData: { data?: any; error?: string } = await gwRes.json();
        const spUser = gwData.data ?? null;

        if (!spUser) {
          await supabase.auth.signOut();
          recordFailedAttempt(normalEmail);
          setError('Akun tidak ditemukan di profil SurePath. Hubungi administrator.');
          setLoading(false);
          return;
        }

        // Multi-app access check: user can access operator app if either:
        // 1. role === 'OPERATOR' (legacy single-app operator)
        // 2. allowed_apps array includes 'OPERATOR' (multi-app user)
        const allowedApps: string[] = Array.isArray((spUser as any).allowed_apps) ? (spUser as any).allowed_apps : [];
        const canAccessOperator = spUser.role === UserRole.OPERATOR || allowedApps.includes('OPERATOR');
        if (!canAccessOperator) {
          await supabase.auth.signOut();
          recordFailedAttempt(normalEmail);
          setError('Akses ditolak. Akun ini tidak memiliki akses Operator. Gunakan portal yang sesuai.');
          setLoading(false);
          return;
        }

        clearRateLimit(normalEmail);
        onLoginSuccess({
          id:           spUser.id,
          name:         spUser.name,
          email:        spUser.email,
          role:         spUser.role,
          supabaseId:   authData.user.id,
          nodeId:       spUser.agent_code ?? `SP-OP-${authData.user.id.slice(0, 6).toUpperCase()}`,
          trustScore:   spUser.trust_score ?? 85,
          allowed_apps: allowedApps ?? null,
          token:        authData.session.access_token,
        });
        return;
      }

      // Supabase Auth is the only login path — the legacy IndexedDB fallback
      // has been removed rather than DEV-gated, since a gated insecure token
      // generator is still a liability if the gate is ever refactored away.
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
        @keyframes op-scan { 0% { transform: translateY(-100%) } 100% { transform: translateY(200vh) } }
        @keyframes op-ping  { 0%,100% { opacity:.12; transform:scale(1) } 50% { opacity:.22; transform:scale(1.18) } }
      `}</style>

      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(rgba(5,150,105,0.09) 1px, transparent 1px)',
        backgroundSize: '26px 26px',
      }} />
      <div className="absolute pointer-events-none" style={{ top: '-15%', left: '-8%', width: '65%', height: '65%', background: 'radial-gradient(ellipse, rgba(16,185,129,0.13) 0%, transparent 65%)' }} />
      <div className="absolute pointer-events-none" style={{ bottom: '-15%', right: '-8%', width: '55%', height: '55%', background: 'radial-gradient(ellipse, rgba(16,185,129,0.09) 0%, transparent 65%)' }} />
      <div className="absolute inset-x-0 h-px pointer-events-none" style={{
        background: 'linear-gradient(90deg, transparent 10%, rgba(22,163,74,0.18) 50%, transparent 90%)',
        animation: 'op-scan 12s linear infinite',
        boxShadow: '0 0 14px rgba(22,163,74,0.07)',
      }} />
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(22,163,74,0.28) 50%, transparent 90%)' }} />
      <div className="absolute bottom-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(22,163,74,0.10) 50%, transparent 90%)' }} />

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

      <div className="absolute top-6 right-6 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#16a34a', boxShadow: '0 0 6px rgba(22,163,74,0.7)', animation: 'op-ping 2.4s ease-in-out infinite' }} />
        <span style={{ fontSize: '0.6875rem', letterSpacing: '0.14em', textTransform: 'uppercase', whiteSpace: 'nowrap', color: '#64748b', fontWeight: 700 }}>Operator Session</span>
      </div>

      <div className="relative z-10 w-full max-w-xs px-5">

        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6">
            <div className="absolute rounded-full" style={{
              inset: -20, background: 'radial-gradient(circle, rgba(22,163,74,0.12) 0%, transparent 72%)',
              animation: 'op-ping 3s ease-in-out infinite',
            }} />
            <div className="w-16 h-16 rounded-2xl sp-glass flex items-center justify-center">
              <ShieldCheck size={32} style={{ color: '#059669' }} />
            </div>
          </div>

          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, letterSpacing: '-0.04em', color: '#0f172a', lineHeight: 1, marginBottom: '0.55rem' }}>
            Operator App
          </h1>
          <div className="flex items-center gap-2.5">
            <div className="h-px w-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(22,163,74,0.4))' }} />
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Internal Staff Only
            </span>
            <div className="h-px w-8" style={{ background: 'linear-gradient(90deg, rgba(22,163,74,0.4), transparent)' }} />
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

            <form className="space-y-4" onSubmit={handleLogin}>

              <div>
                <label htmlFor="operator-login-email" style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" size={13} style={{ color: '#059669' }} />
                  <input
                    id="operator-login-email" type="email" required autoComplete="username"
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="operator@surepath.id"
                    className="block w-full pl-10 pr-4 py-3 rounded-xl text-slate-900 placeholder-slate-400 outline-none transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(6,78,59,0.12)', fontFamily: 'monospace', fontSize: '0.78rem' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(22,163,74,0.50)'; e.target.style.background = 'rgba(255,255,255,0.95)'; e.target.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.07), inset 0 0 0 1px rgba(22,163,74,0.10)'; }}
                    onBlur={e  => { e.target.style.borderColor = 'rgba(6,78,59,0.12)'; e.target.style.background = 'rgba(255,255,255,0.85)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="operator-login-password" style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" size={13} style={{ color: '#059669' }} />
                  <input
                    id="operator-login-password" type={showPass ? 'text' : 'password'} required autoComplete="current-password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    aria-label="Operator password"
                    placeholder="••••••••••••"
                    className="block w-full pl-10 pr-11 py-3 rounded-xl text-slate-900 placeholder-slate-400 outline-none transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(6,78,59,0.12)', fontFamily: 'monospace', fontSize: '0.78rem' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(22,163,74,0.50)'; e.target.style.background = 'rgba(255,255,255,0.95)'; e.target.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.07), inset 0 0 0 1px rgba(22,163,74,0.10)'; }}
                    onBlur={e  => { e.target.style.borderColor = 'rgba(6,78,59,0.12)'; e.target.style.background = 'rgba(255,255,255,0.85)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="button" onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    aria-pressed={showPass}
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
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  color: '#f0fdf4',
                  boxShadow: loading ? 'none' : '0 8px 28px -10px rgba(22,163,74,0.55)',
                }}
              >
                {loading
                  ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-green-200/20 border-t-green-200/80 animate-spin" /> Memverifikasi...</>
                  : <>Masuk ke Operator <ArrowRight size={14} /></>
                }
              </button>
            </form>
          </div>
        </div>

        <p className="text-center mt-7 flex items-center justify-center gap-2"
          style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(22,163,74,0.35)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          PT Ruang Proteksi Indonesia · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default OperatorLogin;
