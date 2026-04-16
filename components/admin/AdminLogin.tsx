import React, { useState } from 'react';
import { Lock, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
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
        // Check if user has admin role
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
            <ShieldCheck size={32} className="text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-black tracking-tight text-slate-900 uppercase">
          Admin Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 font-medium">
          Sistem Manajemen SurePath
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-3xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
                <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-rose-700 font-medium">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
                Email Admin
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-slate-50 font-medium transition-all"
                  placeholder="admin@surepath.id"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-slate-50 font-medium transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-widest"
            >
              {loading ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
              {!loading && <ArrowRight size={18} />}
            </button>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500 font-medium">Atau</span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const user = await db.users.where('email').equals('master@surepath.ai').first();
                      if (user) {
                        const token = createSessionToken(user);
                        onLoginSuccess({ ...user, token });
                      } else {
                        setError("Akun demo tidak ditemukan.");
                      }
                    } catch (err) {
                      setError("Gagal masuk dengan akun demo.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-slate-200 rounded-xl shadow-sm text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-all uppercase tracking-widest"
                >
                  Gunakan Akun Demo
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
