import React, { useState, useEffect } from 'react';
import {
  Eye, EyeOff, Mail, KeyRound, User,
  AlertCircle, LayoutDashboard, Smartphone, Briefcase,
  ArrowRight, Shield, CheckCircle2
} from 'lucide-react';
import { SurePathLogo } from './Navbar';
import { Language, UserRole } from '../types';
import { supabase, getAgentProfile, getAgentByEmail } from '../services/supabaseService';
import AgentOnboarding from './agent/AgentOnboarding';

interface AuthGateProps {
  onAuthSuccess: (user: any) => void;
  initialLang?: Language;
  initialMode?: 'LOGIN' | 'REGISTER';
}

// ─── Demo access (still uses local DB seed) ──────────────────────────────────
async function demoLogin(role: UserRole) {
  const emailMap: Record<string, string> = {
    [UserRole.MASTER_ADMIN]: 'master@surepath.ai',
    [UserRole.AGENT]:        'agent@surepath.ai',
    [UserRole.CUSTOMER]:     'user@surepath.ai',
  };
  return {
    id: `demo-${role}`,
    name: role === UserRole.MASTER_ADMIN ? 'Master Admin' : role === UserRole.AGENT ? 'Demo Agent' : 'Demo User',
    email: emailMap[role],
    role,
    supabaseId: role === UserRole.AGENT ? 'aaaaaaaa-0000-0000-0000-000000000001' : undefined,
    nodeId: `SP-DEMO-${role.slice(0, 3)}`,
    trustScore: 100,
  };
}

// ─── Animated background orbs ─────────────────────────────────────────────────
const Orbs = () => (
  <>
    <div className="absolute top-[-20%] right-[-15%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
    <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1.5s' }} />
    <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
    {/* grid */}
    <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
      style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
  </>
);

const AuthGate: React.FC<AuthGateProps> = ({
  onAuthSuccess,
  initialLang = Language.ID,
  initialMode = 'LOGIN',
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'CHECK_EMAIL'>(initialMode as any);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang] = useState<Language>(initialLang);
  const [regRole, setRegRole] = useState<UserRole>(UserRole.CUSTOMER);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [showAgentOnboarding, setShowAgentOnboarding] = useState(false);

  useEffect(() => { setMode(initialMode as any); }, [initialMode]);

  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  // ── Demo access ──────────────────────────────────────────────────────────────
  const handleDemoAccess = async (role: UserRole) => {
    setLoading(true);
    const user = await demoLogin(role);
    setTimeout(() => onAuthSuccess(user), 600);
  };

  // ── Supabase login ───────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (authErr || !data.user) {
      setError(authErr?.message ?? 'Login gagal. Coba lagi.');
      setLoading(false);
      return;
    }

    const profile =
      (await getAgentProfile(data.user.id).catch(() => null)) ??
      (await getAgentByEmail(data.user.email!).catch(() => null));

    const userObj = profile
      ? {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role as UserRole,
          supabaseId: profile.id,
          nodeId: profile.agent_code ?? `SP-${data.user.id.slice(0, 8).toUpperCase()}`,
          trustScore: profile.trust_score ?? 85,
        }
      : {
          id: data.user.id,
          name: data.user.user_metadata?.name ?? data.user.email!.split('@')[0],
          email: data.user.email!,
          role: UserRole.CUSTOMER,
          supabaseId: data.user.id,
          nodeId: `SP-${data.user.id.slice(0, 8).toUpperCase()}`,
          trustScore: 85,
        };

    onAuthSuccess(userObj);
  };

  // ── Supabase register ────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regRole === UserRole.AGENT) {
      setShowAgentOnboarding(true);
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error: authErr } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: { data: { name: formData.name } },
    });

    if (authErr || !data.user) {
      setError(authErr?.message ?? 'Registrasi gagal. Coba lagi.');
      setLoading(false);
      return;
    }

    // Upsert profile in sp_users
    await supabase.from('sp_users').upsert({
      id: data.user.id,
      name: formData.name,
      email: formData.email,
      phone: '',
      role: UserRole.CUSTOMER,
      agent_code: `SP-${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`,
      trust_score: 85,
    });

    // If email confirmation required, show check-email screen
    if (!data.session) {
      setMode('CHECK_EMAIL');
      setLoading(false);
      return;
    }

    onAuthSuccess({
      id: data.user.id,
      name: formData.name,
      email: formData.email,
      role: UserRole.CUSTOMER,
      supabaseId: data.user.id,
      nodeId: `SP-${data.user.id.slice(0, 8).toUpperCase()}`,
      trustScore: 85,
    });
  };

  // ── Agent onboarding ─────────────────────────────────────────────────────────
  if (showAgentOnboarding) {
    return (
      <AgentOnboarding
        lang={lang}
        onBack={() => setShowAgentOnboarding(false)}
        onSuccess={(agent) => onAuthSuccess({ ...agent, supabaseId: agent.id })}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-5 relative overflow-hidden">
      <Orbs />

      <div className="w-full max-w-sm relative z-10 flex flex-col items-center gap-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-2xl scale-150 animate-pulse" />
            <div className="relative w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-[2rem] flex items-center justify-center backdrop-blur-sm shadow-2xl">
              <SurePathLogo className="w-12 h-12" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-[-0.05em] uppercase leading-none">
              Sure<span className="text-emerald-500">Path</span>
            </h1>
            <p className="text-[0.55rem] font-bold text-gray-500 uppercase tracking-[0.4em] mt-2">
              {t('Smart Insurance Platform', 'Platform Asuransi Pintar')}
            </p>
          </div>
        </div>

        {/* Check email screen */}
        {mode === 'CHECK_EMAIL' && (
          <div className="w-full bg-white/[0.04] border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-sm text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-[1.5rem] flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase">{t('Check Your Email', 'Cek Email Kamu')}</h3>
              <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                {t('We sent a confirmation link to ', 'Kami kirim link konfirmasi ke ')}<span className="text-emerald-400 font-bold">{formData.email}</span>.
              </p>
            </div>
            <button
              onClick={() => setMode('LOGIN')}
              className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              {t('Back to Login', 'Kembali ke Login')}
            </button>
          </div>
        )}

        {/* Main form */}
        {mode !== 'CHECK_EMAIL' && (
          <div className="w-full bg-white/[0.04] border border-white/10 rounded-[2.5rem] p-7 backdrop-blur-sm space-y-6">

            {/* Tab switcher */}
            <div className="flex bg-white/[0.05] p-1 rounded-2xl border border-white/5">
              <button
                onClick={() => { setMode('LOGIN'); setError(null); }}
                className={`flex-1 py-3 rounded-xl text-[0.6rem] font-black uppercase tracking-widest transition-all ${mode === 'LOGIN' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {t('Sign In', 'Masuk')}
              </button>
              <button
                onClick={() => { setMode('REGISTER'); setError(null); }}
                className={`flex-1 py-3 rounded-xl text-[0.6rem] font-black uppercase tracking-widest transition-all ${mode === 'REGISTER' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {t('Register', 'Daftar')}
              </button>
            </div>

            <form onSubmit={mode === 'LOGIN' ? handleLogin : handleRegister} className="space-y-3">
              {mode === 'REGISTER' && (
                <>
                  {/* Name */}
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      required
                      placeholder={t('Full Name', 'Nama Lengkap')}
                      className="w-full pl-11 pr-4 py-4 bg-white/[0.04] border border-white/10 rounded-2xl outline-none text-sm font-bold placeholder:text-gray-600 focus:border-emerald-500/50 transition-all"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  {/* Role selector */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRegRole(UserRole.CUSTOMER)}
                      className={`py-3 rounded-2xl text-[0.55rem] font-black uppercase border transition-all flex items-center justify-center gap-2 ${regRole === UserRole.CUSTOMER ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-white/10 text-gray-500 hover:border-white/20'}`}
                    >
                      <Smartphone size={14} /> {t('Customer', 'Nasabah')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole(UserRole.AGENT)}
                      className={`py-3 rounded-2xl text-[0.55rem] font-black uppercase border transition-all flex items-center justify-center gap-2 ${regRole === UserRole.AGENT ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-white/10 text-gray-500 hover:border-white/20'}`}
                    >
                      <Briefcase size={14} /> {t('Agent', 'Agen')}
                    </button>
                  </div>
                </>
              )}

              {/* Email */}
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  required
                  type="email"
                  placeholder="email@contoh.com"
                  className="w-full pl-11 pr-4 py-4 bg-white/[0.04] border border-white/10 rounded-2xl outline-none text-sm font-bold placeholder:text-gray-600 focus:border-emerald-500/50 transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {/* Password */}
              <div className="relative">
                <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  required
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password"
                  minLength={6}
                  className="w-full pl-11 pr-12 py-4 bg-white/[0.04] border border-white/10 rounded-2xl outline-none text-sm font-bold placeholder:text-gray-600 focus:border-emerald-500/50 transition-all"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'LOGIN' ? t('Sign In', 'Masuk') : (regRole === UserRole.AGENT ? t('Continue to Agent Setup', 'Lanjut ke Setup Agen') : t('Create Account', 'Buat Akun'))}
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Demo access */}
        {mode === 'LOGIN' && (
          <div className="w-full space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[0.55rem] font-black text-gray-600 uppercase tracking-widest">Demo</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: UserRole.MASTER_ADMIN, label: 'Admin HQ', icon: LayoutDashboard, color: 'text-orange-400 border-orange-500/20 hover:bg-orange-500/10' },
                { role: UserRole.AGENT,        label: 'Agen',     icon: Briefcase,      color: 'text-blue-400  border-blue-500/20  hover:bg-blue-500/10'  },
                { role: UserRole.CUSTOMER,     label: 'Nasabah',  icon: Smartphone,     color: 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10' },
              ].map(({ role, label, icon: Icon, color }) => (
                <button
                  key={role}
                  onClick={() => handleDemoAccess(role)}
                  disabled={loading}
                  className={`p-3 bg-white/[0.03] border rounded-2xl flex flex-col items-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 ${color}`}
                >
                  <Icon size={20} />
                  <span className="text-[0.5rem] font-black uppercase">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-[0.5rem] font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2">
          <Shield size={10} className="text-emerald-700" />
          Secured by SurePath Smart Security v4.2
        </p>
      </div>
    </div>
  );
};

export default AuthGate;
