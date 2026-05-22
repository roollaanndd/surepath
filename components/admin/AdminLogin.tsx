import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { db } from '../../db';
import { verifyPassword, createSessionToken } from '../../services/authService';
import { UserRole } from '../../types';

interface AdminLoginProps {
  onLoginSuccess: (user: any) => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col justify-center items-center relative overflow-hidden">
      {/* Background ambient orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-15%] w-[500px] h-[500px] bg-emerald-500/4 rounded-full blur-[120px] pointer-events-none" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Top status bar */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[0.5rem] font-black text-emerald-500 uppercase tracking-[0.4em]">
          Secure Connection · TLS 1.3 Active
        </span>
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo section */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-[1.8rem] flex items-center justify-center shadow-2xl shadow-emerald-500/10 mb-6">
            <ShieldCheck size={36} className="text-emerald-500" />
          </div>
          <h1 className="text-4xl font-black tracking-[-0.05em] text-white uppercase leading-none mb-2">
            Admin<span className="text-emerald-500">Portal</span>
          </h1>
          <p className="text-[0.55rem] font-bold text-gray-600 uppercase tracking-[0.4em]">
            SurePath · Command Center Access
          </p>
        </div>

        {/* Frosted glass card */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-[2.5rem] p-8 backdrop-blur-xl shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-rose-400 font-bold">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[0.55rem] font-black text-gray-500 uppercase tracking-[0.25em]">
                Email Admin
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-600" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-gray-700 focus:outline-none focus:border-emerald-500/60 focus:bg-white/[0.06] transition-all font-mono"
                  placeholder="admin@surepath.id"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[0.55rem] font-black text-gray-500 uppercase tracking-[0.25em]">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-600" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-gray-700 focus:outline-none focus:border-emerald-500/60 focus:bg-white/[0.06] transition-all font-mono"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-3 py-4 px-6 rounded-2xl text-sm font-black text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/10 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  Masuk ke Dashboard
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Bottom tag */}
        <p className="text-center text-[0.45rem] font-bold text-gray-800 uppercase tracking-[0.5em] mt-8">
          SurePath Administration HQ · Authorized Access Only
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
