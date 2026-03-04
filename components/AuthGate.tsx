import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, Lock, Eye, EyeOff, ArrowRight, 
  Globe, ShieldCheck, RefreshCw, 
  Sparkles, BadgeCheck, KeyRound, 
  Zap, UserCircle, AlertCircle, Check,
  UserPlus,
  // Added missing icon imports
  LayoutDashboard, Smartphone
} from 'lucide-react';
import { SurePathLogo } from './Navbar';
import { Language, UserRole } from '../types';
import { db, User as DBUser } from '../db';
import { hashPassword, verifyPassword, validatePasswordStrength, REGEX, createSessionToken } from '../services/authService';
import { NeuralBot } from './car-wizard/WizardUI';

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
  const [statusMsg, setStatusMsg] = useState('Neural Access Point: Secure');
  const [lang, setLang] = useState<Language>(initialLang);
  const [regRole, setRegRole] = useState<UserRole>(UserRole.CUSTOMER);
  
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });

  const t = (en: string, idn: string) => lang === Language.EN ? en : idn;

  useEffect(() => {
    setMode(initialMode as any);
  }, [initialMode]);

  const passwordStrength = useMemo(() => validatePasswordStrength(formData.password), [formData.password]);

  // Demo Access Handler
  const handleDemoAccess = async (targetRole: UserRole) => {
    setLoading(true);
    setStatusMsg(t('Synchronizing with Headquarters...', 'Menyinkronkan dengan Kantor Pusat...'));
    
    try {
      // Cari akun demo sesuai peran
      const email = targetRole === UserRole.MASTER_ADMIN ? 'master@surepath.ai' : 'user@surepath.ai';
      const user = await db.users.where('email').equals(email).first();
      
      if (user) {
        setStatusMsg(t('Access Authorized!', 'Otorisasi Berhasil!'));
        const token = createSessionToken(user);
        setTimeout(() => onAuthSuccess({ ...user, token }), 800);
      } else {
        setError(t("Demo node unavailable.", "Node demo tidak tersedia."));
        setLoading(false);
      }
    } catch (err) {
      setError(t("Protocol Error.", "Kesalahan Protokol."));
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
        role: regRole, // Mendukung pendaftaran admin untuk demo
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
                    {/* Role Selection for Demo/Admin purposes */}
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

              {mode === 'LOGIN' && (
                <div className="pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
                  <p className="text-center text-[0.55rem] font-black text-gray-400 uppercase tracking-widest">{t('Demo Environments', 'Evaluasi Cepat (Demo)')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleDemoAccess(UserRole.MASTER_ADMIN)}
                      className="p-4 bg-primary-50/5 hover:bg-primary-500/10 border border-primary-500/20 rounded-2xl flex flex-col items-center gap-2 group transition-all"
                    >
                      <LayoutDashboard size={24} className="text-primary-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[0.55rem] font-black uppercase text-primary-600">Admin Dashboard</span>
                    </button>
                    <button 
                      onClick={() => handleDemoAccess(UserRole.CUSTOMER)}
                      className="p-4 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center gap-2 group transition-all"
                    >
                      <Smartphone size={24} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                      <span className="text-[0.55rem] font-black uppercase text-emerald-600">Customer App</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <BadgeCheck size={14} className="text-emerald-500"/> Secured by SurePath Neural Guard v4.2
        </p>
      </div>
    </div>
  );
};

export default AuthGate;