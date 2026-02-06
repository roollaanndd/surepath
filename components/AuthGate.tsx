import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, Lock, Eye, EyeOff, ArrowRight, 
  Globe, Radio, ShieldAlert,
  Fingerprint, Sparkles, Activity,
  BellRing, X, RefreshCw, Smartphone,
  BadgeCheck, KeyRound, Briefcase, 
  Zap, ChevronRight, LayoutDashboard, Wallet,
  Building2, UserCircle,
  AlertCircle, Monitor, ShieldCheck, Shield
} from 'lucide-react';
import { SurePathLogo } from './Navbar';
import { Language, UserRole } from '../types';
import { db, User as DBUser } from '../db';
import { hashPassword, verifyPassword, validatePasswordStrength, REGEX } from '../services/authService';
import { NeuralBot } from './car-wizard/WizardUI';

interface AuthGateProps {
  onAuthSuccess: (user: any) => void;
  initialLang?: Language;
}

const ValidationStatus: React.FC<{ met: boolean, label: string }> = ({ met, label }) => (
    <div className={`flex items-center gap-2 transition-all ${met ? 'text-emerald-500' : 'text-slate-400'}`}>
        <div className={`w-3 h-3 rounded-full flex items-center justify-center ${met ? 'bg-emerald-500/10' : 'bg-slate-100 dark:bg-white/5'}`}>
            <Check size={8} strokeWidth={4} className={met ? 'opacity-100' : 'opacity-0'} />
        </div>
        <span className="text-[0.6rem] font-bold uppercase tracking-widest">{label}</span>
    </div>
);

const AuthGate: React.FC<AuthGateProps> = ({ onAuthSuccess, initialLang = Language.ID }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'VERIFY' | 'DEMO_SELECT'>('LOGIN');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [showIncomingOtp, setShowIncomingOtp] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Lingkungan Aman');
  
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });

  // Real-time Validation
  const passwordStrength = useMemo(() => validatePasswordStrength(formData.password), [formData.password]);
  const isEmailValid = useMemo(() => REGEX.EMAIL.test(formData.email), [formData.email]);
  const isPhoneValid = useMemo(() => REGEX.PHONE.test(formData.phone), [formData.phone]);

  const canRegister = useMemo(() => {
      return formData.name.length > 2 && isEmailValid && isPhoneValid && passwordStrength.score === 4;
  }, [formData.name, isEmailValid, isPhoneValid, passwordStrength]);

  const canLogin = useMemo(() => {
      return isEmailValid && formData.password.length > 0;
  }, [isEmailValid, formData.password]);

  const handleDemoAccess = async () => {
    setLoading(true);
    setStatusMsg('Membuka Akses Demo...');
    setError(null);
    
    try {
      // Cari user demo di database
      const user = await db.users.where('email').equals('user@surepath.ai').first();
      if (user) {
        setStatusMsg('Akses Demo Terbuka!');
        setTimeout(() => onAuthSuccess(user), 1000);
      } else {
        // Fallback jika seeding belum selesai
        setError("User demo belum siap. Silakan coba lagi.");
        setLoading(false);
      }
    } catch (err) {
      setError("Terjadi kendala saat memuat demo.");
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'REGISTER' && !canRegister) return;
    if (mode === 'LOGIN' && !canLogin) return;

    setLoading(true);
    setError(null);
    setStatusMsg('Memverifikasi Identitas...');
    
    try {
      if (mode === 'LOGIN') {
        const user = await db.users.where('email').equals(formData.email).first();
        if (user && user.passwordHash && user.salt) {
          const isValid = await verifyPassword(formData.password, user.passwordHash, user.salt);
          if (isValid) {
            setStatusMsg('Berhasil Masuk!');
            setTimeout(() => onAuthSuccess(user), 800);
          } else {
            setError("Password yang kamu masukkan salah.");
            setLoading(false);
          }
        } else {
          setError("Email belum terdaftar.");
          setLoading(false);
        }
      } else {
        const existing = await db.users.where('email').equals(formData.email).first();
        if (existing) {
          setError("Email ini sudah digunakan.");
          setLoading(false);
          return;
        }
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(newOtp);
        setTimeout(() => {
          setMode('VERIFY');
          setLoading(false);
          setShowIncomingOtp(true);
          setStatusMsg('Kode Verifikasi Dikirim!');
        }, 1500);
      }
    } catch (err) {
      setError("Terjadi kendala teknis. Coba lagi ya.");
      setLoading(false);
    }
  };

  const finalizeRegistration = async () => {
    setLoading(true);
    setStatusMsg('Menyiapkan Akun Kamu...');
    try {
      const { hash, salt } = await hashPassword(formData.password);
      const newUser: DBUser = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        passwordHash: hash,
        salt: salt,
        role: UserRole.CUSTOMER,
        nodeId: `SP-USER-${Math.floor(1000 + Math.random() * 9000)}`,
        verified: true,
        trustScore: 85,
        memberSince: new Date().toISOString()
      };
      const id = await db.users.add(newUser);
      onAuthSuccess({ ...newUser, id });
    } catch (err) {
      setError("Gagal membuat akun.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080707] flex flex-col items-center p-6 relative overflow-hidden transition-all duration-700">
      
      <div className="absolute top-[-5%] right-[-10%] w-[400px] h-[400px] bg-primary-500/5 rounded-full blur-[80px] pointer-events-none"></div>

      {showIncomingOtp && (
        <div className="fixed top-6 left-6 right-6 z-[300] animate-pop-in">
           <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl flex items-center gap-6 border border-white/10">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg"><BellRing size={28}/></div>
              <div className="flex-1">
                 <p className="text-[0.6rem] font-black text-emerald-400 uppercase tracking-widest mb-1">Kode Verifikasi Kamu</p>
                 <div className="flex items-center gap-4">
                    <span className="text-3xl font-black text-white tracking-[0.3em] font-mono">{generatedOtp}</span>
                    <button onClick={() => { setOtp(generatedOtp); setShowIncomingOtp(false); }} className="ml-auto px-5 py-2 bg-white text-black rounded-xl text-xs font-black uppercase">Isi Otomatis</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="w-full max-w-md flex flex-col items-center space-y-8 flex-1 relative z-10 pt-10">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="p-6 bg-white dark:bg-[#111] rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-white/5 relative group transition-all">
               <SurePathLogo className="w-16 h-16 relative z-10 group-hover:scale-105 transition-transform" />
            </div>
            <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-white dark:bg-black rounded-2xl shadow-xl flex items-center justify-center border border-slate-100 dark:border-white/5">
                <NeuralBot mood={loading ? 'thinking' : (passwordStrength.score > 2 ? 'happy' : 'scanning')} className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900 dark:text-white leading-none">Sure<span className="text-primary-500">Path</span></h1>
          <p className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-[0.3em] mt-3">{statusMsg}</p>
        </div>

        <div className="w-full bg-white dark:bg-[#0c0c0c] rounded-[3rem] p-8 shadow-2xl border border-slate-100 dark:border-white/5 overflow-hidden transition-all">
          {mode === 'VERIFY' ? (
            <div className="space-y-8 text-center animate-pop-in py-4">
              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase tracking-tight">Masukkan Kode</h3>
                <p className="text-[0.65rem] text-slate-400 font-bold uppercase tracking-widest">Masukkan 6 digit kode yang dikirim.</p>
              </div>
              <input 
                type="tel" maxLength={6} placeholder="000000"
                className="w-full bg-transparent border-b-2 border-slate-200 dark:border-white/10 text-center text-4xl font-black tracking-[0.4em] text-primary-500 outline-none focus:border-primary-500 transition-all font-mono"
                value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g,'')); setError(null); }}
              />
              <button 
                onClick={async () => otp === generatedOtp ? await finalizeRegistration() : setError("Kode verifikasi salah.")} 
                disabled={otp.length < 6 || loading} 
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 disabled:opacity-30 transition-all"
              >
                Konfirmasi Akun
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex bg-slate-100 dark:bg-white/[0.05] p-1.5 rounded-2xl mb-2 border border-slate-200 dark:border-white/5 shadow-inner">
                <button type="button" onClick={() => { setMode('LOGIN'); setError(null); }} className={`flex-1 py-3 rounded-xl text-[0.6rem] font-black uppercase tracking-widest transition-all ${mode === 'LOGIN' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-400 opacity-60'}`}>Masuk</button>
                <button type="button" onClick={() => { setMode('REGISTER'); setError(null); }} className={`flex-1 py-3 rounded-xl text-[0.6rem] font-black uppercase tracking-widest transition-all ${mode === 'REGISTER' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-400 opacity-60'}`}>Daftar</button>
              </div>

              <form onSubmit={handleAuth} className="space-y-6">
                <div className="space-y-4">
                  {mode === 'REGISTER' && (
                    <div className="space-y-1.5">
                        <label className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                        <div className="relative">
                          <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                          <input 
                              required placeholder="Masukkan Nama Sesuai KTP"
                              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-white/[0.03] border-2 border-slate-100 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm"
                              value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                          />
                        </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                      <label className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                      <div className="relative">
                          <Globe size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${formData.email.length > 0 ? (isEmailValid ? 'text-emerald-500' : 'text-rose-500') : 'text-slate-300'}`} />
                          <input 
                              required type="email" placeholder="contoh@email.com"
                              className={`w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-white/[0.03] border-2 rounded-2xl outline-none transition-all font-bold text-sm ${formData.email.length > 0 ? (isEmailValid ? 'border-emerald-500/20' : 'border-rose-500/20') : 'border-slate-100 dark:border-white/5'}`}
                              value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                          />
                      </div>
                  </div>

                  {mode === 'REGISTER' && (
                      <div className="space-y-1.5">
                          <label className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor HP Aktif</label>
                          <div className="relative">
                              <Smartphone size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${formData.phone.length > 0 ? (isPhoneValid ? 'text-emerald-500' : 'text-rose-500') : 'text-slate-300'}`} />
                              <input 
                                  required placeholder="08xxxxxxxxxx"
                                  className={`w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-white/[0.03] border-2 rounded-2xl outline-none transition-all font-bold text-sm ${formData.phone.length > 0 ? (isPhoneValid ? 'border-emerald-500/20' : 'border-rose-500/20') : 'border-slate-100 dark:border-white/5'}`}
                                  value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
                              />
                          </div>
                      </div>
                  )}

                  <div className="space-y-1.5">
                      <label className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                      <div className="relative">
                          <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                          <input 
                              required type={showPass ? 'text' : 'password'} placeholder="••••••••"
                              className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-white/[0.03] border-2 border-slate-100 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm"
                              value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
                          />
                          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary-500 transition-colors">
                              {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                          </button>
                      </div>
                  </div>

                  {mode === 'REGISTER' && formData.password.length > 0 && (
                      <div className="p-5 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-[2rem] space-y-4 animate-fade-in">
                          <div className="flex justify-between items-center">
                              <p className="text-[0.6rem] font-black uppercase text-gray-400 tracking-widest">Kekuatan Password</p>
                              <span className={`text-[0.6rem] font-black uppercase ${passwordStrength.score === 4 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                  {passwordStrength.score === 4 ? 'SANGAT AMAN' : passwordStrength.score > 2 ? 'AMAN' : 'KURANG AMAN'}
                              </span>
                          </div>
                          <div className="flex gap-1.5">
                              {[1,2,3,4].map(i => (
                                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= passwordStrength.score ? (passwordStrength.score === 4 ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-500') : 'bg-slate-200 dark:bg-white/10'}`}></div>
                              ))}
                          </div>
                          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                              {passwordStrength.requirements.map((req, i) => (
                                  <ValidationStatus key={i} met={req.met} label={req.label} />
                              ))}
                          </div>
                      </div>
                  )}
                </div>

                {error && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-[0.65rem] font-bold animate-pop-in">
                      <AlertCircle size={16}/>
                      {error}
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <button 
                    type="submit" 
                    disabled={loading || (mode === 'REGISTER' && !canRegister) || (mode === 'LOGIN' && !canLogin)} 
                    className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-[0.65rem] tracking-[0.3em] shadow-2xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale"
                  >
                    {loading ? <RefreshCw size={18} className="animate-spin text-primary-500"/> : (mode === 'LOGIN' ? 'Masuk Sekarang' : 'Daftar Sekarang')} 
                    {!loading && <ShieldCheck size={18} className="text-primary-500"/>}
                  </button>
                </div>
              </form>

              {mode === 'LOGIN' && (
                <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-4">
                  <div className="relative flex items-center justify-center">
                    <span className="absolute bg-white dark:bg-[#0c0c0c] px-4 text-[0.55rem] font-black text-gray-300 uppercase tracking-[0.3em]">Atau Cepat</span>
                    <div className="w-full h-px bg-slate-100 dark:bg-white/5"></div>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={handleDemoAccess}
                    disabled={loading}
                    className="w-full py-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-2xl font-black uppercase text-[0.65rem] tracking-[0.2em] transition-all hover:bg-emerald-500 hover:text-white flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                  >
                    <Sparkles size={16} className={loading ? 'animate-spin' : ''}/> 
                    Gunakan Akses Demo
                  </button>
                  <p className="text-[0.45rem] text-center text-gray-400 font-bold uppercase tracking-widest px-4">
                    Eksplorasi seluruh fitur SurePath tanpa perlu registrasi.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-8 opacity-30 py-6">
           <div className="flex items-center gap-2.5"><BadgeCheck size={16} className="text-emerald-500"/><span className="text-[0.6rem] font-black uppercase tracking-widest leading-none">Standar Keamanan Internasional</span></div>
        </div>
      </div>
    </div>
  );
};

const Check = ({ size, className, strokeWidth }: { size: number, className?: string, strokeWidth?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth || 2} strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>
);

export default AuthGate;