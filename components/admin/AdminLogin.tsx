import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { SurePathLogo } from '../Navbar';
import { db } from '../../db';
import { verifyPassword, createSessionToken } from '../../services/authService';
import { UserRole } from '../../types';

interface AdminLoginProps {
  onLoginSuccess: (user: any) => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = await db.users.where('email').equals(email).first();

      if (user && user.passwordHash && user.salt) {
        if (![UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.INSURANCE_ADMIN].includes(user.role)) {
          setError("Akses ditolak. Akun ini tidak memiliki izin admin.");
          setLoading(false);
          return;
        }

        const isValid = await verifyPassword(password, user.passwordHash, user.salt);
        if (isValid) {
          const token = createSessionToken(user);
          onLoginSuccess({ ...user, token });
        } else {
          setError("Email atau kata sandi salah.");
        }
      } else {
        setError("Email atau kata sandi salah.");
      }
    } catch (err) {
      setError("Terjadi kesalahan sistem. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const lpGreen = 'hsl(119, 99%, 46%)';
  const sora = "'Sora', sans-serif";

  return (
    <div className="min-h-screen flex flex-col justify-center items-center relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, hsl(0,0%,9%) 0%, hsl(0,0%,6%) 100%)', fontFamily: sora }}>

      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '64px 64px'
      }} />

      {/* Top accent line */}
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(6,224,0,0.25) 50%, transparent 90%)' }} />

      {/* Status indicator */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: lpGreen }} />
        <span style={{ fontSize: '0.48rem', fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.4em', textTransform: 'uppercase' }}>
          Secure Connection Active
        </span>
      </div>

      <div className="relative z-10 w-full max-w-sm px-6">

        {/* Logo + wordmark */}
        <div className="flex flex-col items-center mb-9">
          <div className="mb-6 w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <SurePathLogo className="w-12 h-12" />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.04em', color: '#fff', lineHeight: 1, marginBottom: '0.4rem' }}>
            Admin<span style={{ color: lpGreen }}>Portal</span>
          </h1>
          <p style={{ fontSize: '0.55rem', fontWeight: 500, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.3em', textTransform: 'uppercase' }}>
            SurePath · Dashboard Access
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-3xl p-7 space-y-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

          {error && (
            <div className="p-3.5 rounded-2xl flex items-start gap-3"
              style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={15} />
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f87171' }}>{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.55rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={15} />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="master@surepath.ai"
                  className="block w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm text-white placeholder-gray-700 outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', fontFamily: 'monospace' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(6,224,0,0.45)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.55rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={15} />
                <input type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-11 pr-12 py-3.5 rounded-2xl text-sm text-white placeholder-gray-700 outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', fontFamily: 'monospace' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(6,224,0,0.45)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-400 transition-colors">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex justify-center items-center gap-3 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-40 active:scale-95"
              style={{ background: lpGreen, color: 'hsl(0, 0%, 4%)' }}>
              {loading
                ? <><div className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black/80 animate-spin" /> Verifying...</>
                : <>Enter Dashboard <ArrowRight size={15} /></>
              }
            </button>
          </form>

        </div>

        <p className="text-center mt-7" style={{ fontSize: '0.45rem', fontWeight: 500, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.4em', textTransform: 'uppercase' }}>
          SurePath Admin · Authorized Access Only
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
