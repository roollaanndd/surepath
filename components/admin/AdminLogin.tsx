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
      // ── Path 1: Supabase Auth (preferred — provides verifiable JWT for data-gateway) ──
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalEmail,
        password,
      });

      if (!authError && authData.user && authData.session) {
        // Fetch the caller's SurePath profile via the gateway (uses service_role, no direct DB)
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

      // ── Path 2: IndexedDB legacy (deprecated — unmigrated admins only) ──────────────
      // This path has no server-verifiable identity. Admins should be migrated to
      // Supabase Auth so they can authenticate with the data-gateway.
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
      style={{ background: '#05080d', fontFamily: "'Inter', 'Sora', sans-serif" }}
    >
      {/* Very subtle grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }} />

      {/* Faint radial glow at centre */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(22,163,74,0.06) 0%, transparent 70%)',
      }} />

      {/* Top hairline */}
      <div className="absolute top-0 inset-x-0 h-px" style={{
        background: 'linear-gradient(90deg, transparent 15%, rgba(22,163,74,0.18) 50%, transparent 85%)',
      }} />

      {/* Back link */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-6 left-6 text-[0.6rem] font-semibold uppercase tracking-widest text-gray-600 hover:text-gray-400 transition-colors"
        >
          ← Kembali
        </button>
      )}

      {/* Connection status */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#16a34a', boxShadow: '0 0 4px rgba(22,163,74,0.5)' }} />
        <span className="text-gray-600 font-semibold" style={{ fontSize: '0.46rem', letterSpacing: '0.4em', textTransform: 'uppercase' }}>
          Encrypted Session
        </span>
      </div>

      <div className="relative z-10 w-full max-w-xs px-5">

        {/* Icon + title */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="mb-5 w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.15)' }}
          >
            <ShieldCheck size={40} style={{ color: '#16a34a' }} />
          </div>

          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#e5e7eb', lineHeight: 1, marginBottom: '0.35rem' }}>
            Admin Portal
          </h1>
          <p style={{ fontSize: '0.52rem', fontWeight: 500, color: '#374151', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
            SurePath · Authorized Access Only
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {legacyWarning && (
            <div
              className="p-3 rounded-xl flex items-start gap-2.5"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              <AlertTriangle className="shrink-0 mt-0.5" size={14} style={{ color: '#f59e0b' }} />
              <p style={{ fontSize: '0.68rem', fontWeight: 500, color: '#fcd34d' }}>
                Akun ini belum terhubung ke Supabase Auth. Hubungi super admin untuk migrasi.
              </p>
            </div>
          )}

          {error && (
            <div
              className="p-3 rounded-xl flex items-start gap-2.5"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.16)' }}
            >
              <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={14} />
              <p style={{ fontSize: '0.72rem', fontWeight: 500, color: '#fca5a5' }}>{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.52rem', fontWeight: 600, color: '#4b5563', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2" size={14} style={{ color: '#374151' }} />
                <input
                  type="email" required autoComplete="username"
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="admin@surepath.ai"
                  className="block w-full pl-10 pr-4 py-3 rounded-xl text-sm text-gray-200 placeholder-gray-700 outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'monospace', fontSize: '0.8rem' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(22,163,74,0.4)')}
                  onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.07)')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.52rem', fontWeight: 600, color: '#4b5563', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2" size={14} style={{ color: '#374151' }} />
                <input
                  type={showPass ? 'text' : 'password'} required autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-11 py-3 rounded-xl text-sm text-gray-200 placeholder-gray-700 outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'monospace', fontSize: '0.8rem' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(22,163,74,0.4)')}
                  onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.07)')}
                />
                <button
                  type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#374151' }}
                  onMouseEnter={e => ((e.target as HTMLElement).style.color = '#16a34a')}
                  onMouseLeave={e => ((e.target as HTMLElement).style.color = '#374151')}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full flex justify-center items-center gap-2.5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40"
              style={{ background: '#16a34a', color: '#f0fdf4' }}
            >
              {loading
                ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-green-200/20 border-t-green-100/80 animate-spin" /> Memverifikasi...</>
                : <>Masuk ke Dashboard <ArrowRight size={14} /></>
              }
            </button>
          </form>
        </div>

        <p className="text-center mt-6" style={{ fontSize: '0.43rem', fontWeight: 500, color: '#1f2937', letterSpacing: '0.35em', textTransform: 'uppercase' }}>
          SurePath Admin · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
