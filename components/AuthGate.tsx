import React, { useState, useEffect, useRef } from 'react';
import {
  Eye, EyeOff, Mail, KeyRound, User,
  AlertCircle, Smartphone, Briefcase,
  ArrowRight, Shield, CheckCircle2, RefreshCw
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

// ─── Demo access ──────────────────────────────────────────────────────────────
async function demoLogin(role: UserRole) {
  const emailMap: Record<string, string> = {
    [UserRole.MASTER_ADMIN]: 'master@surepath.ai',
    [UserRole.AGENT]:        'agent@surepath.ai',
    [UserRole.CUSTOMER]:     'user@surepath.ai',
  };
  return {
    id:         `demo-${role}`,
    name:       role === UserRole.MASTER_ADMIN ? 'Master Admin' : role === UserRole.AGENT ? 'Demo Agent' : 'Demo User',
    email:      emailMap[role],
    role,
    supabaseId: role === UserRole.AGENT ? 'aaaaaaaa-0000-0000-0000-000000000001' : undefined,
    nodeId:     `SP-DEMO-${role.slice(0, 3)}`,
    trustScore: 100,
  };
}

// ─── Animated canvas background ───────────────────────────────────────────────
const AnimatedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const blobs = [
      { size: 520, color: '16,185,129',  phase: 0,   speedX: 0.0007, speedY: 0.0005 },
      { size: 420, color: '249,115,22',  phase: 2.1, speedX: 0.0005, speedY: 0.0008 },
      { size: 360, color: '99,102,241',  phase: 4.2, speedX: 0.0009, speedY: 0.0006 },
      { size: 280, color: '6,182,212',   phase: 1.0, speedX: 0.0006, speedY: 0.0009 },
    ];

    let frame = 0;
    let animId = 0;

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = frame;

      blobs.forEach((blob) => {
        const x = canvas.width  * (0.15 + 0.7 * (0.5 + 0.5 * Math.sin(t * blob.speedX + blob.phase)));
        const y = canvas.height * (0.15 + 0.7 * (0.5 + 0.5 * Math.cos(t * blob.speedY + blob.phase * 1.4)));

        const grd = ctx.createRadialGradient(x, y, 0, x, y, blob.size);
        grd.addColorStop(0, `rgba(${blob.color},0.18)`);
        grd.addColorStop(0.5, `rgba(${blob.color},0.06)`);
        grd.addColorStop(1, `rgba(${blob.color},0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};

const AuthGate: React.FC<AuthGateProps> = ({
  onAuthSuccess,
  initialLang = Language.ID,
  initialMode = 'LOGIN',
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'CHECK_EMAIL'>(initialMode as any);
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [lang]                    = useState<Language>(initialLang);
  const [regRole, setRegRole]     = useState<UserRole>(UserRole.CUSTOMER);
  const [formData, setFormData]   = useState({ name: '', email: '', password: '' });
  const [showAgentOnboarding, setShowAgentOnboarding] = useState(false);

  // Prevents double-resolution when both direct call and onAuthStateChange fire
  const resolvedRef = useRef(false);

  useEffect(() => { setMode(initialMode as any); }, [initialMode]);

  // ── Build user object from Supabase user ──────────────────────────────────
  const buildUserObj = async (user: any) => {
    const profile =
      (await getAgentProfile(user.id).catch(() => null)) ??
      (await getAgentByEmail(user.email!).catch(() => null));

    return profile
      ? {
          id:         profile.id,
          name:       profile.name,
          email:      profile.email,
          role:       profile.role as UserRole,
          supabaseId: profile.id,
          nodeId:     profile.agent_code ?? `SP-${user.id.slice(0, 8).toUpperCase()}`,
          trustScore: profile.trust_score ?? 85,
        }
      : {
          id:         user.id,
          name:       user.user_metadata?.name ?? user.email!.split('@')[0],
          email:      user.email!,
          role:       UserRole.CUSTOMER,
          supabaseId: user.id,
          nodeId:     `SP-${user.id.slice(0, 8).toUpperCase()}`,
          trustScore: 85,
        };
  };

  // ── Resolve and login — deduplicated via ref ──────────────────────────────
  const resolveAndLogin = async (user: any) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true; // claim immediately — JS is single-threaded
    try {
      const userObj = await buildUserObj(user);
      onAuthSuccess(userObj);
    } catch {
      resolvedRef.current = false;
      setLoading(false);
      setError(lang === Language.EN ? 'Login failed. Please try again.' : 'Login gagal. Coba lagi.');
    }
  };

  // ── Handle email confirmation redirect + auth state changes ───────────────
  useEffect(() => {
    // If user arrives from email confirmation link, they already have a session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) resolveAndLogin(session.user);
    });

    // Listen for SIGNED_IN (email link click while page is open, or 3rd-party)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        resolveAndLogin(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    resolvedRef.current = false; // reset for new attempt

    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email:    formData.email,
      password: formData.password,
    });

    if (authErr || !data.user) {
      const msg = authErr?.message ?? '';
      const friendlyError = msg.includes('Email not confirmed')
        ? t('Please confirm your email first. Check your inbox.', 'Konfirmasi email kamu dulu. Cek kotak masuk.')
        : msg.includes('Invalid login credentials')
        ? t('Email or password is incorrect.', 'Email atau password salah.')
        : msg || t('Login failed. Please try again.', 'Login gagal. Coba lagi.');
      setError(friendlyError);
      setLoading(false);
      return;
    }

    // Resolve directly — onAuthStateChange may also fire but resolvedRef prevents double-call
    await resolveAndLogin(data.user);
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
    resolvedRef.current = false;

    const { data, error: authErr } = await supabase.auth.signUp({
      email:    formData.email,
      password: formData.password,
      options:  { data: { name: formData.name } },
    });

    if (authErr || !data.user) {
      const msg = authErr?.message ?? '';
      const friendlyError = msg.includes('already registered') || msg.includes('already been registered')
        ? t('This email is already registered. Try signing in.', 'Email ini sudah terdaftar. Coba masuk.')
        : msg.includes('Password should be')
        ? t('Password must be at least 6 characters.', 'Password minimal 6 karakter.')
        : msg || t('Registration failed. Please try again.', 'Registrasi gagal. Coba lagi.');
      setError(friendlyError);
      setLoading(false);
      return;
    }

    // Upsert profile — errors here are non-fatal (user can still log in via auth)
    const { error: upsertErr } = await supabase.from('sp_users').upsert({
      id:          data.user.id,
      name:        formData.name,
      email:       formData.email,
      phone:       '',
      role:        UserRole.CUSTOMER,
      agent_code:  `SP-${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`,
      trust_score: 85,
    });
    if (upsertErr) console.warn('sp_users upsert failed:', upsertErr.message);

    if (!data.session) {
      // Email confirmation required
      setMode('CHECK_EMAIL');
      setLoading(false);
      return;
    }

    // Immediate session (email confirmation disabled) — resolve directly
    await resolveAndLogin(data.user);
  };

  // ── Resend confirmation email ─────────────────────────────────────────────
  const handleResend = async () => {
    if (!formData.email || resending) return;
    setResending(true);
    await supabase.auth.resend({ type: 'signup', email: formData.email }).catch(() => {});
    setTimeout(() => setResending(false), 5000);
  };

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
    <div className="min-h-screen bg-[#060818] text-white flex flex-col items-center justify-center p-5 relative overflow-hidden">

      <AnimatedBackground />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.018]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="w-full max-w-sm relative z-10 flex flex-col items-center gap-7">

        {/* Logo */}
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-[3rem] blur-3xl scale-150 animate-pulse" />
            <div className="relative w-28 h-28 bg-gradient-to-br from-orange-500/15 to-emerald-500/10 border border-orange-500/30 rounded-[2.5rem] flex items-center justify-center backdrop-blur-sm shadow-2xl shadow-orange-500/15">
              <div className="absolute inset-2 rounded-[2rem] border border-orange-500/10" />
              <SurePathLogo className="w-[4.5rem] h-[4.5rem]" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-[-0.05em] uppercase leading-none">
              Sure<span className="text-[#f97316]">Path</span>
            </h1>
            <p className="text-[0.55rem] font-bold text-gray-500 uppercase tracking-[0.45em] mt-2">
              {t('Smart Insurance Platform', 'Platform Asuransi Pintar')}
            </p>
          </div>
        </div>

        {/* Check-email screen */}
        {mode === 'CHECK_EMAIL' && (
          <div className="w-full bg-white/[0.04] border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-sm text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-[1.5rem] flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase">{t('Check Your Email', 'Cek Email Kamu')}</h3>
              <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                {t('We sent a confirmation link to ', 'Kami kirim link konfirmasi ke ')}
                <span className="text-emerald-400 font-bold">{formData.email}</span>.
                {t(' Click it to activate your account.', ' Klik untuk mengaktifkan akunmu.')}
              </p>
            </div>
            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full py-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl font-black text-xs uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
              {resending ? t('Sent!', 'Terkirim!') : t('Resend Email', 'Kirim Ulang Email')}
            </button>
            <button
              onClick={() => setMode('LOGIN')}
              className="w-full py-3.5 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              {t('Back to Login', 'Kembali ke Login')}
            </button>
          </div>
        )}

        {/* Main form */}
        {mode !== 'CHECK_EMAIL' && (
          <div className="w-full bg-white/[0.04] border border-white/[0.08] rounded-[2.5rem] p-7 backdrop-blur-sm space-y-6">

            {/* Tab switcher */}
            <div className="flex bg-white/[0.05] p-1 rounded-2xl border border-white/5">
              <button
                onClick={() => { setMode('LOGIN'); setError(null); }}
                className={`flex-1 py-3 rounded-xl text-[0.6rem] font-black uppercase tracking-widest transition-all ${mode === 'LOGIN' ? 'bg-[#f97316] text-white shadow-lg shadow-orange-500/30' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {t('Sign In', 'Masuk')}
              </button>
              <button
                onClick={() => { setMode('REGISTER'); setError(null); }}
                className={`flex-1 py-3 rounded-xl text-[0.6rem] font-black uppercase tracking-widest transition-all ${mode === 'REGISTER' ? 'bg-[#f97316] text-white shadow-lg shadow-orange-500/30' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {t('Register', 'Daftar')}
              </button>
            </div>

            <form onSubmit={mode === 'LOGIN' ? handleLogin : handleRegister} className="space-y-3">

              {mode === 'REGISTER' && (
                <>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      required
                      placeholder={t('Full Name', 'Nama Lengkap')}
                      className="w-full pl-11 pr-4 py-4 bg-white/[0.04] border border-white/10 rounded-2xl outline-none text-sm font-bold placeholder:text-gray-600 focus:border-orange-500/50 transition-all"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
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
                  className="w-full pl-11 pr-4 py-4 bg-white/[0.04] border border-white/10 rounded-2xl outline-none text-sm font-bold placeholder:text-gray-600 focus:border-orange-500/50 transition-all"
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
                  minLength={mode === 'REGISTER' ? 6 : 1}
                  className="w-full pl-11 pr-12 py-4 bg-white/[0.04] border border-white/10 rounded-2xl outline-none text-sm font-bold placeholder:text-gray-600 focus:border-orange-500/50 transition-all"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-400 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === 'REGISTER' && formData.password.length > 0 && formData.password.length < 6 && (
                <p className="text-[0.6rem] text-amber-400 font-bold px-1">
                  {t('Password must be at least 6 characters', 'Password minimal 6 karakter')}
                </p>
              )}

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', boxShadow: '0 8px 32px rgba(249,115,22,0.3)' }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'LOGIN'
                      ? t('Sign In', 'Masuk')
                      : regRole === UserRole.AGENT
                        ? t('Continue to Agent Setup', 'Lanjut ke Setup Agen')
                        : t('Create Account', 'Buat Akun')}
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Demo — Nasabah only */}
        {mode === 'LOGIN' && (
          <div className="w-full space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[0.55rem] font-black text-gray-600 uppercase tracking-widest">Demo</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <button
              onClick={() => handleDemoAccess(UserRole.CUSTOMER)}
              disabled={loading}
              className="w-full p-3.5 bg-white/[0.03] border border-emerald-500/20 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-40 text-emerald-400 hover:bg-emerald-500/10"
            >
              <Smartphone size={18} />
              <span className="text-[0.6rem] font-black uppercase tracking-widest">
                {t('Try as Customer', 'Coba sebagai Nasabah')}
              </span>
            </button>
          </div>
        )}

        <p className="text-[0.5rem] font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2">
          <Shield size={10} className="text-orange-800" />
          Secured by SurePath Smart Security v4.2
        </p>
      </div>
    </div>
  );
};

export default AuthGate;
