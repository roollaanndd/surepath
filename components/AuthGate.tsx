import React, { useState, useEffect } from 'react';
import {
  User, Eye, EyeOff,
  Globe, RefreshCw,
  BadgeCheck, KeyRound,
  AlertCircle,
  LayoutDashboard, Smartphone, Briefcase
} from 'lucide-react';
import { SurePathLogo } from './Navbar';
import { Language, UserRole } from '../types';
import { db, User as DBUser } from '../db';
import { hashPassword, verifyPassword, createSessionToken } from '../services/authService';
import { auth, googleProvider, signInWithPopup } from '../firebase';

interface AuthGateProps {
  onAuthSuccess: (user: any) => void;
  initialLang?: Language;
  initialMode?: 'LOGIN' | 'REGISTER';
}

const AuthGate: React.FC<AuthGateProps> = ({ onAuthSuccess, initialLang = Language.ID, initialMode = 'LOGIN' }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'VERIFY'>(initialMode as any);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [statusMsg, setStatusMsg] = useState('Sistem Keamanan Akses: Aktif');
  const [lang] = useState<Language>(initialLang);
  const [regRole, setRegRole] = useState<UserRole>(UserRole.CUSTOMER);
  
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });

  const t = (en: string, idn: string) => lang === Language.EN ? en : idn;

  useEffect(() => {
    setMode(initialMode as any);
  }, [initialMode]);

  // Demo Access Handler
  const handleDemoAccess = async (targetRole: UserRole) => {
    setLoading(true);
    setStatusMsg(t('Synchronizing with Headquarters...', 'Menyinkronkan dengan Kantor Pusat...'));
    
    try {
      const emailMap: Record<string, string> = {
        [UserRole.MASTER_ADMIN]: 'master@surepath.ai',
        [UserRole.AGENT]: 'agent@surepath.ai',
        [UserRole.CUSTOMER]: 'user@surepath.ai',
      };
      const email = emailMap[targetRole] || 'user@surepath.ai';
      const user = await db.users.where('email').equals(email).first();
      
      if (user) {
        setStatusMsg(t('Access Authorized!', 'Otorisasi Berhasil!'));
        const token = createSessionToken(user);
        const supabaseAgentId = targetRole === UserRole.AGENT ? 'aaaaaaaa-0000-0000-0000-000000000001' : undefined;
        setTimeout(() => onAuthSuccess({ ...user, token, supabaseId: supabaseAgentId }), 800);
      } else {
        setError(t("Demo node unavailable.", "Node demo tidak tersedia."));
        setLoading(false);
      }
    } catch (err) {
      setError(t("Protocol Error.", "Kesalahan Protokol."));
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    setStatusMsg(t('Authenticating with Google...', 'Mengautentikasi dengan Google...'));
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user exists in local DB
      let dbUser = await db.users.where('email').equals(user.email!).first();
      
      if (!dbUser) {
        // Register new user from Google
        const newUser: DBUser = {
          name: user.displayName || 'Google User',
          email: user.email!,
          phone: user.phoneNumber || '',
          role: UserRole.CUSTOMER,
          nodeId: `SP-NODE-${Math.floor(Math.random() * 9999)}`,
          verified: true,
          trustScore: 85,
          memberSince: new Date().toISOString()
        };
        const id = await db.users.add(newUser);
        dbUser = { ...newUser, id };
      }
      
      const token = createSessionToken(dbUser);
      onAuthSuccess({ ...dbUser, token });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Google Login Failed.");
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatusMsg(t('Verifying Identity...', 'Memverifikasi Identitas...'));
    
    try {
      if (mode === 'LOGIN') {
        const user = await db.users.where('email').equals(formData.email).first();
        if (user && user.passwordHash && user.salt) {
          const isValid = await verifyPassword(formData.password, user.passwordHash, user.salt);
          if (isValid) {
            const token = createSessionToken(user);
            onAuthSuccess({ ...user, token });
          } else {
            setError(t("Invalid password.", "Sandi tidak valid."));
            setLoading(false);
          }
        } else {
          setError(t("Node not found.", "Node tidak ditemukan."));
          setLoading(false);
        }
      } else {
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(newOtp);
        setMode('VERIFY');
        setLoading(false);
      }
    } catch (err) {
      setError("Technical Fault.");
      setLoading(false);
    }
  };

  const finalizeRegistration = async () => {
    setLoading(true);
    try {
      const { hash, salt } = await hashPassword(formData.password);
      const newUser: DBUser = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        passwordHash: hash,
        salt: salt,
        role: regRole,
        nodeId: `SP-NODE-${Math.floor(Math.random() * 9999)}`,
        verified: true,
        trustScore: regRole === UserRole.CUSTOMER ? 85 : 100,
        memberSince: new Date().toISOString()
      };
      const id = await db.users.add(newUser);
      const userWithId = { ...newUser, id };
      const token = createSessionToken(userWithId);
      onAuthSuccess({ ...userWithId, token });
    } catch (err) {
      setError("Node Creation Failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#080707] flex flex-col items-center justify-center p-6 relative overflow-hidden transition-all duration-700">
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md flex flex-col items-center space-y-10 relative z-10">
        <div className="text-center space-y-4">
          <div className="p-6 bg-white dark:bg-[#111] rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-white/5 inline-block animate-float">
             <SurePathLogo className="w-16 h-16" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900 dark:text-white leading-none">Sure<span className="text-emerald-500">Path</span></h1>
            <p className="text-[0.6rem] font-bold text-gray-400 uppercase tracking-[0.4em] mt-3">{statusMsg}</p>
          </div>
        </div>

        <div className="w-full bg-white dark:bg-[#0c0c0c] rounded-[3rem] p-8 shadow-2xl border border-slate-100 dark:border-white/5 transition-all">
          {mode === 'VERIFY' ? (
            <div className="space-y-8 text-center py-4 animate-pop-in">
              <h3 className="text-xl font-black uppercase">{t('Verify Protocol', 'Verifikasi Protokol')}</h3>
              <input 
                type="tel" maxLength={6} placeholder="000000"
                className="w-full bg-transparent border-b-2 border-slate-200 dark:border-white/10 text-center text-4xl font-black tracking-[0.4em] text-emerald-500 outline-none focus:border-emerald-500 transition-all font-mono"
                value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g,''))}
              />
              <button 
                onClick={finalizeRegistration} 
                className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
              >
                {t('Initialize Access', 'Inisialisasi Akses')}
              </button>
              <p className="text-[0.5rem] font-bold text-gray-400 uppercase">DEBUG_OTP: {generatedOtp}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex bg-slate-100 dark:bg-white/[0.05] p-1 rounded-2xl border border-black/5">
                <button onClick={() => setMode('LOGIN')} className={`flex-1 py-3 rounded-xl text-[0.6rem] font-black uppercase tracking-widest transition-all ${mode === 'LOGIN' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-gray-400'}`}>{t('LOG IN', 'MASUK')}</button>
                <button onClick={() => setMode('REGISTER')} className={`flex-1 py-3 rounded-xl text-[0.6rem] font-black uppercase tracking-widest transition-all ${mode === 'REGISTER' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-gray-400'}`}>{t('REGISTER', 'DAFTAR')}</button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {mode === 'REGISTER' && (
                  <div className="space-y-4">
                    <div className="relative">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input required placeholder={t("Full Name", "Nama Lengkap")} className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-white/[0.03] border-2 border-slate-100 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}/>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <button type="button" onClick={() => setRegRole(UserRole.CUSTOMER)} className={`py-2 rounded-xl text-[0.5rem] font-black uppercase border-2 transition-all ${regRole === UserRole.CUSTOMER ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600' : 'border-slate-100 text-slate-400'}`}>Customer</button>
                       <button type="button" onClick={() => setRegRole(UserRole.MASTER_ADMIN)} className={`py-2 rounded-xl text-[0.5rem] font-black uppercase border-2 transition-all ${regRole === UserRole.MASTER_ADMIN ? 'border-primary-500 bg-primary-500/5 text-primary-600' : 'border-slate-100 text-slate-400'}`}>Admin HQ</button>
                    </div>
                  </div>
                )}

                <div className="relative">
                  <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input required type="email" placeholder="email@surepath.ai" className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-white/[0.03] border-2 border-slate-100 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}/>
                </div>

                <div className="relative">
                  <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input required type={showPass ? 'text' : 'password'} placeholder="Password" className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-white/[0.03] border-2 border-slate-100 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}/>
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-emerald-500 transition-colors">
                    {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>

                {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-[0.6rem] font-bold flex items-center gap-2"><AlertCircle size={14}/> {error}</div>}

                <button type="submit" disabled={loading} className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                  {loading ? <RefreshCw size={18} className="animate-spin text-emerald-500"/> : (mode === 'LOGIN' ? t('AUTHORIZE', 'MASUK') : t('CREATE NODE', 'DAFTAR'))}
                </button>
              </form>

              <div className="pt-4 space-y-4">
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase tracking-widest">OR</span>
                  <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
                </div>
                
                <button 
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-4 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm active:scale-95"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.09-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {t('Continue with Google', 'Lanjutkan dengan Google')}
                </button>
              </div>

              {mode === 'LOGIN' && (
                <div className="pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
                  <p className="text-center text-[0.55rem] font-black text-gray-400 uppercase tracking-widest">{t('Demo Environments', 'Evaluasi Cepat (Demo)')}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleDemoAccess(UserRole.MASTER_ADMIN)}
                      className="p-3 bg-primary-50/5 hover:bg-primary-500/10 border border-primary-500/20 rounded-2xl flex flex-col items-center gap-2 group transition-all"
                    >
                      <LayoutDashboard size={22} className="text-primary-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[0.5rem] font-black uppercase text-primary-600 text-center leading-tight">Admin HQ</span>
                    </button>
                    <button
                      onClick={() => handleDemoAccess(UserRole.AGENT)}
                      className="p-3 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 rounded-2xl flex flex-col items-center gap-2 group transition-all"
                    >
                      <Briefcase size={22} className="text-blue-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[0.5rem] font-black uppercase text-blue-600 text-center leading-tight">Agent Portal</span>
                    </button>
                    <button
                      onClick={() => handleDemoAccess(UserRole.CUSTOMER)}
                      className="p-3 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center gap-2 group transition-all"
                    >
                      <Smartphone size={22} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[0.5rem] font-black uppercase text-emerald-600 text-center leading-tight">Customer</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <BadgeCheck size={14} className="text-emerald-500"/> Secured by SurePath Smart Security v4.2
        </p>
      </div>
    </div>
  );
};

export default AuthGate;