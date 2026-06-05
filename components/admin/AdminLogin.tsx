import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, AlertCircle, AlertTriangle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { supabase } from '../../services/supabaseService';
import { db } from '../../db';
import { verifyPassword, createSessionToken, checkRateLimit, recordFailedAttempt, clearRateLimit } from '../../services/authService';
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
  const [legacyWarning, setLegacyWarning] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setLegacyWarning(false);

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
          return;
        }

        if (!ADMIN_ROLES.includes(spUser.role as UserRole)) {
          await supabase.auth.signOut();
          recordFailedAttempt(normalEmail);
          setError('Akses ditolak. Akun ini tidak memiliki izin admin.');
          return;
        }

        clearRateLimit(normalEmail);
        onLoginSuccess({
          id:         spUser.id,
          name:       spUser.name,
          email:      spUser.email,
          role:       spUser.role,
          supabaseId: authData.user.id,
          nodeId:     spUser.agent_code ?? `SP-${authData.user.id.slice(0, 8).toUpperCase()}`,
          trustScore: spUser.trust_score ?? 85,
          token:      authData.session.access_token,
        });
        return;
      }

      const user = await db.users.where('email').equals(normalEmail).first();

      if (user?.passwordHash && user?.salt) {
        if (!ADMIN_ROLES.includes(user.role as UserRole)) {
          recordFailedAttempt(normalEmail);
          setError('Akses ditolak. Akun ini tidak memiliki izin admin.');
          return;
        }

        const isValid = await verifyPassword(password, user.passwordHash, user.salt);
        if (isValid) {
          clearRateLimit(normalEmail);
          setLegacyWarning(true);
          onLoginSuccess({ ...user, token: createSessionToken(user) });
        } else {
          recordFailedAttempt(normalEmail);
          const remaining = checkRateLimit(normalEmail).remainingAttempts;
          setError(remaining > 0
            ? `Kredensial salah. Sisa percobaan: ${remaining}`
            : 'Akun dikunci sementara. Coba lagi dalam 15 menit.');
        }
      } else {
        recordFailedAttempt(normalEmail);
        setError('Kredensial salah atau akun tidak ditemukan.');
      }
    } catch {
      setError('Terjadi kesalahan sistem. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: '#03050a', fontFamily: "'Inter', 'Sora', sans-serif" }}
    >
      <style>{`
        @keyframes adm-scan { 0% { transform: translateY(-100%) } 100% { transform: translateY(200vh) } }
        @keyframes adm-ping  { 0%,100% { opacity:.12; transform:scale(1) } 50% { opacity:.22; transform:scale(1.18) } }
      `}</style>

      {/* Dot-matrix background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(rgba(22,163,74,0.10) 1px, transparent 1px)',
        backgroundSize: '26px 26px',
      }} />

      {/* Blobs */}
      <div className="absolute pointer-events-none" style={{ top: '-15%', left: '-8%', width: '65%', height: '65%', background: 'radial-gradient(ellipse, rgba(22,163,74,0.07) 0%, transparent 65%)' }} />
      <div className="absolute pointer-events-none" style={{ bottom: '-15%', right: '-8%', width: '55%', height: '55%', background: 'radial-gradient(ellipse, rgba(34,197,94,0.04) 0%, transparent 65%)' }} />

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
          style={{ fontSize: '0.58rem', fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#374151' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#6b7280')}
          onMouseLeave={e => (e.currentTarget.style.color = '#374151')}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Kembali
        </button>
      )}

      {/* Live session badge */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#16a34a', boxShadow: '0 0 6px rgba(22,163,74,0.7)', animation: 'adm-ping 2.4s ease-in-out infinite' }} />
        <span style={{ fontSize: '0.44rem', letterSpacing: '0.42em', textTransform: 'uppercase', color: '#1f2937', fontWeight: 700 }}>Secure Session</span>
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
            <div className="relative p-px rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(22,163,74,0.4), rgba(22,163,74,0.08) 60%, rgba(22,163,74,0.25))' }}>
              <div className="w-16 h-16 rounded-[calc(1rem-1px)] flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(22,163,74,0.10) 0%, rgba(3,5,10,0.95) 100%)' }}>
                <ShieldCheck size={40} style={{ color: '#16a34a' }} />
              </div>
            </div>
            <p style={{ textAlign: 'center', marginTop: 8, fontSize: '0.72rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.55)' }}>
              Sure<span style={{ color: '#4ade80' }}>Path</span>
            </p>
          </div>

          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, letterSpacing: '-0.04em', color: '#f3f4f6', lineHeight: 1, marginBottom: '0.55rem' }}>
            Admin Portal
          </h1>
          <div className="flex items-center gap-2.5">
            <div className="h-px w-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(22,163,74,0.4))' }} />
            <span style={{ fontSize: '0.46rem', fontWeight: 700, color: '#374151', letterSpacing: '0.34em', textTransform: 'uppercase' }}>
              Authorized Access Only
            </span>
            <div className="h-px w-8" style={{ background: 'linear-gradient(90deg, rgba(22,163,74,0.4), transparent)' }} />
          </div>
        </div>

        {/* Card — gradient-border wrapper */}
        <div className="relative rounded-2xl p-px"
          style={{ background: 'linear-gradient(145deg, rgba(22,163,74,0.25) 0%, rgba(255,255,255,0.05) 45%, rgba(22,163,74,0.12) 100%)' }}>
          <div className="rounded-[calc(1rem-1px)] p-6 space-y-5"
            style={{ background: 'rgba(4,6,12,0.94)', backdropFilter: 'blur(24px)' }}>

            {legacyWarning && (
              <div className="p-3 rounded-xl flex items-start gap-2.5"
                style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)' }}>
                <AlertTriangle className="shrink-0 mt-0.5" size={13} style={{ color: '#f59e0b' }} />
                <p style={{ fontSize: '0.67rem', fontWeight: 500, color: '#fcd34d', lineHeight: 1.5 }}>
                  Akun ini belum terhubung ke Supabase Auth. Hubungi super admin untuk migrasi.
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl flex items-start gap-2.5"
                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <AlertCircle className="shrink-0 mt-0.5" size={13} style={{ color: '#f87171' }} />
                <p style={{ fontSize: '0.72rem', fontWeight: 500, color: '#fca5a5', lineHeight: 1.5 }}>{error}</p>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleLogin}>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '0.47rem', fontWeight: 700, color: '#374151', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" size={13} style={{ color: '#4b5563' }} />
                  <input
                    type="email" required autoComplete="username"
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="Email admin"
                    className="block w-full pl-10 pr-4 py-3 rounded-xl text-gray-200 placeholder-gray-700 outline-none transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'monospace', fontSize: '0.78rem' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(22,163,74,0.50)'; e.target.style.background = 'rgba(22,163,74,0.04)'; e.target.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.07), inset 0 0 0 1px rgba(22,163,74,0.10)'; }}
                    onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; e.target.style.background = 'rgba(255,255,255,0.03)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.47rem', fontWeight: 700, color: '#374151', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" size={13} style={{ color: '#4b5563' }} />
                  <input
                    type={showPass ? 'text' : 'password'} required autoComplete="current-password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full pl-10 pr-11 py-3 rounded-xl text-gray-200 placeholder-gray-700 outline-none transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'monospace', fontSize: '0.78rem' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(22,163,74,0.50)'; e.target.style.background = 'rgba(22,163,74,0.04)'; e.target.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.07), inset 0 0 0 1px rgba(22,163,74,0.10)'; }}
                    onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; e.target.style.background = 'rgba(255,255,255,0.03)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200"
                    style={{ color: '#4b5563' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#16a34a')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
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
                  : <>Masuk ke Dashboard <ArrowRight size={14} /></>
                }
              </button>
            </form>
          </div>
        </div>

        <p className="text-center mt-7 flex items-center justify-center gap-2"
          style={{ fontSize: '0.42rem', fontWeight: 600, color: '#1f2937', letterSpacing: '0.34em', textTransform: 'uppercase' }}>
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
