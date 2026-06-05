import React, { useState, useEffect, useRef } from 'react';
import {
  Eye, EyeOff, Mail, KeyRound, User,
  AlertCircle, Smartphone, Briefcase,
  ArrowRight, Shield, CheckCircle2, RefreshCw
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { SurePathLogo } from './Navbar';
import { Language, UserRole } from '../types';
import { supabase, getAgentProfile, getAgentByEmail } from '../services/supabaseService';
import AgentOnboarding from './agent/AgentOnboarding';

interface AuthGateProps {
  onAuthSuccess: (user: any) => void;
  initialLang?: Language;
  initialMode?: 'LOGIN' | 'REGISTER';
}

// ─── Premium animated aurora background ───────────────────────────────────────
const AuroraBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Brand green palette — soft emerald clouds on white.
    const blobs = [
      { size: 560, color: '34,197,94',  phase: 0.0, speedX: 0.00045, speedY: 0.00033, op: 0.14 },
      { size: 460, color: '16,185,129', phase: 2.1, speedX: 0.00033, speedY: 0.00052, op: 0.12 },
      { size: 420, color: '74,222,128', phase: 4.2, speedX: 0.00058, speedY: 0.00040, op: 0.13 },
      { size: 320, color: '5,150,105',  phase: 1.0, speedX: 0.00040, speedY: 0.00060, op: 0.10 },
    ];

    let frame = 0;
    let animId = 0;
    const draw = () => {
      frame++;
      const w = window.innerWidth, h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      const t = frame;
      blobs.forEach((b) => {
        const x = w * (0.18 + 0.64 * (0.5 + 0.5 * Math.sin(t * b.speedX + b.phase)));
        const y = h * (0.18 + 0.64 * (0.5 + 0.5 * Math.cos(t * b.speedY + b.phase * 1.4)));
        const grd = ctx.createRadialGradient(x, y, 0, x, y, b.size);
        grd.addColorStop(0,   `rgba(${b.color},${b.op})`);
        grd.addColorStop(0.5, `rgba(${b.color},${(b.op * 0.32).toFixed(3)})`);
        grd.addColorStop(1,   `rgba(${b.color},0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

const AuthGate: React.FC<AuthGateProps> = ({
  onAuthSuccess,
  initialLang = Language.ID,
  initialMode = 'LOGIN',
}) => {
  type AuthMode = 'LOGIN' | 'REGISTER' | 'CHECK_EMAIL' | 'FORGOT_PASSWORD' | 'FORGOT_SENT' | 'EMAIL_OTP_VERIFY' | 'RESET_PASSWORD';
  const [mode, setMode] = useState<AuthMode>(initialMode as AuthMode);
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [resending, setResending]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [lang]                      = useState<Language>(initialLang);
  const [regRole, setRegRole]       = useState<UserRole>(UserRole.CUSTOMER);
  const [formData, setFormData]     = useState({ name: '', email: '', password: '' });
  const [showAgentOnboarding, setShowAgentOnboarding] = useState(false);
  const [otpCode, setOtpCode]       = useState('');
  const [newPassword, setNewPass]   = useState('');
  const [showNewPass, setShowNewPass] = useState(false);

  // Prevents double-resolution when both direct call and onAuthStateChange fire
  const resolvedRef = useRef(false);

  useEffect(() => { setMode(initialMode as AuthMode); }, [initialMode]);

  // ── Build user object from Supabase user ──────────────────────────────────
  const buildUserObj = async (user: any) => {
    const [byId, byEmail] = await Promise.allSettled([
      getAgentProfile(user.id),
      getAgentByEmail(user.email!),
    ]);
    const profile =
      (byId.status === 'fulfilled' ? byId.value : null) ??
      (byEmail.status === 'fulfilled' ? byEmail.value : null);

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
      if (event === 'PASSWORD_RECOVERY') {
        setMode('RESET_PASSWORD');
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const t = (en: string, id: string) => lang === Language.EN ? en : id;

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

  // ── Google OAuth ─────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setLoading(true); setError(null);
    const redirectTo = Capacitor.isNativePlatform()
      ? 'com.myinsurepath.os://auth-callback'
      : window.location.origin;
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (e) { setError(e.message); setLoading(false); }
  };

  // ── Forgot password ───────────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    const { error: e2 } = await supabase.auth.resetPasswordForEmail(formData.email, {
      redirectTo: `${window.location.origin}?reset=1`,
    });
    if (e2) { setError(e2.message); setLoading(false); return; }
    setMode('FORGOT_SENT'); setLoading(false);
  };

  // ── Email OTP — send (passwordless via Supabase built-in) ───────────────
  const handleSendEmailOtp = async () => {
    if (!formData.email) { setError(t('Enter your email first.', 'Masukkan email dulu.')); return; }
    setLoading(true); setError(null);
    await supabase.auth.signInWithOtp({
      email: formData.email,
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: false },
    });
    // Always move to verify screen — avoids email enumeration
    setMode('EMAIL_OTP_VERIFY'); setLoading(false);
  };

  // ── Email OTP — verify ───────────────────────────────────────────────────
  const handleVerifyEmailOtp = async (ev: React.FormEvent) => {
    ev.preventDefault(); setLoading(true); setError(null);
    resolvedRef.current = false;
    const { data, error: e } = await supabase.auth.verifyOtp({
      email: formData.email,
      token: otpCode,
      type: 'email',
    });
    if (e || !data.session?.user) {
      setError(e?.message ?? t('Invalid code. Try again.', 'Kode salah. Coba lagi.'));
      setLoading(false); return;
    }
    await resolveAndLogin(data.session.user);
  };

  // ── Reset password (after email link) ────────────────────────────────────
  const handleResetPassword = async (ev: React.FormEvent) => {
    ev.preventDefault(); setLoading(true); setError(null);
    const { error: e } = await supabase.auth.updateUser({ password: newPassword });
    if (e) { setError(e.message); setLoading(false); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await resolveAndLogin(session.user);
    setLoading(false);
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

  // ── Design tokens — white + SurePath green ────────────────────────────────
  const GRAD = 'linear-gradient(135deg, #16a34a 0%, #059669 100%)';
  const primaryBtn: React.CSSProperties = {
    background: GRAD,
    color: '#fff',
    boxShadow: '0 14px 30px -12px rgba(22,163,74,0.6)',
  };
  const inputCls = 'w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-green-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(22,163,74,0.10)]';
  const cardCls = 'w-full bg-white border border-slate-100 rounded-[2.25rem] p-8 space-y-5';
  const cardShadow: React.CSSProperties = { boxShadow: '0 30px 70px -34px rgba(5,46,22,0.30)' };

  return (
    <div className="min-h-screen text-slate-900 flex items-center justify-center p-5 relative overflow-hidden"
      style={{ background: 'linear-gradient(165deg, #f0fdf4 0%, #ffffff 46%, #ecfdf5 100%)', fontFamily: "'Sora', sans-serif" }}>

      <AuroraBackground />

      {/* Fine dot-matrix overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(rgba(22,163,74,0.06) 1px, transparent 1px)',
        backgroundSize: '26px 26px',
      }} />
      {/* Soft top highlight */}
      <div className="absolute top-0 inset-x-0 h-40 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.7), transparent)' }} />
      {/* Top hairline accent */}
      <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent 15%, rgba(22,163,74,0.35) 50%, transparent 85%)' }} />

      <div className="w-full max-w-sm relative z-10 flex flex-col items-center gap-6" style={{ animation: 'spAuthRise 0.55s cubic-bezier(.2,.7,.2,1) both' }}>
        <style>{`
          @keyframes spAuthRise { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }
          @keyframes spLogoFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
          @media (prefers-reduced-motion: reduce){ [data-sp-float]{ animation:none !important; } }
        `}</style>

        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative" data-sp-float style={{ animation: 'spLogoFloat 4s ease-in-out infinite' }}>
            <div className="absolute -inset-5 rounded-full blur-2xl opacity-30" style={{ background: 'radial-gradient(circle, #4ade80, transparent 70%)' }} />
            {/* Gradient-border logo tile */}
            <div className="relative p-px rounded-[1.9rem]" style={{ background: 'linear-gradient(135deg, #16a34a, #86efac 55%, #059669)' }}>
              <div className="relative w-20 h-20 rounded-[calc(1.9rem-1px)] flex items-center justify-center bg-white"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 10px 30px -12px rgba(22,163,74,0.4)' }}>
                <SurePathLogo className="w-[4.25rem] h-[4.25rem] object-contain" />
              </div>
            </div>
          </div>
          <div className="text-center">
            <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 1, color: '#0f172a' }}>
              Sure<span style={{ background: 'linear-gradient(135deg,#16a34a,#059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Path</span>
            </h1>
            <p style={{ fontSize: '0.6rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.32em', textTransform: 'uppercase', marginTop: '0.6rem' }}>
              {mode === 'REGISTER'
                ? t('Create your account', 'Buat akun kamu')
                : t('Welcome back', 'Selamat datang kembali')}
            </p>
          </div>
        </div>

        {/* Check-email screen */}
        {mode === 'CHECK_EMAIL' && (
          <div className={`${cardCls} text-center`} style={cardShadow}>
            <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center mx-auto bg-green-50 border border-green-200">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-slate-900">{t('Check Your Email', 'Cek Email Kamu')}</h3>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                {t('We sent a confirmation link to ', 'Kami kirim link konfirmasi ke ')}
                <span className="text-green-600 font-bold">{formData.email}</span>.
                {t(' Click it to activate your account.', ' Klik untuk mengaktifkan akunmu.')}
              </p>
            </div>
            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
              {resending ? t('Sent!', 'Terkirim!') : t('Resend Email', 'Kirim Ulang Email')}
            </button>
            <button
              onClick={() => setMode('LOGIN')}
              className="w-full py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all"
            >
              {t('Back to Login', 'Kembali ke Login')}
            </button>
          </div>
        )}

        {/* Forgot password — enter email */}
        {mode === 'FORGOT_PASSWORD' && (
          <div className={cardCls} style={cardShadow}>
            <h3 className="text-lg font-bold tracking-tight text-center text-slate-900">{t('Reset Password', 'Reset Password')}</h3>
            <p className="text-slate-500 text-xs text-center leading-relaxed">{t('Enter your email and we will send a reset link.', 'Masukkan email kamu, kami kirim link reset.')}</p>
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input required type="email" placeholder="email@contoh.com" value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className={inputCls} />
              </div>
              {error && <p className="text-rose-500 text-xs font-bold">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50" style={primaryBtn}>
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{t('Send Reset Link', 'Kirim Link Reset')}<ArrowRight size={14} /></>}
              </button>
            </form>
            <button onClick={() => { setMode('LOGIN'); setError(null); }} className="w-full py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all">{t('Back', 'Kembali')}</button>
          </div>
        )}

        {/* Forgot password — sent */}
        {mode === 'FORGOT_SENT' && (
          <div className={`${cardCls} text-center`} style={cardShadow}>
            <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center mx-auto bg-green-50 border border-green-200"><CheckCircle2 size={32} className="text-green-600" /></div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-slate-900">{t('Check Your Email', 'Cek Email Kamu')}</h3>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">{t('Password reset link sent to ', 'Link reset dikirim ke ')}<span className="text-green-600 font-bold">{formData.email}</span>.</p>
            </div>
            <button onClick={() => { setMode('LOGIN'); setError(null); }} className="w-full py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all">{t('Back to Login', 'Kembali ke Login')}</button>
          </div>
        )}

        {/* Email OTP — verify */}
        {mode === 'EMAIL_OTP_VERIFY' && (
          <div className={cardCls} style={cardShadow}>
            <div className="w-14 h-14 rounded-[1.2rem] flex items-center justify-center mx-auto bg-green-50 border border-green-200">
              <Mail size={26} className="text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold tracking-tight text-slate-900">{t('Check Your Email', 'Cek Email Kamu')}</h3>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                {t('Enter the 6-digit code sent to ', 'Masukkan kode 6 digit yang dikirim ke ')}
                <span className="text-green-600 font-bold">{formData.email}</span>.<br/>
                {t('Or click the link in the email.', 'Atau klik link di email.')}
              </p>
            </div>
            <form onSubmit={handleVerifyEmailOtp} className="space-y-3">
              <input required type="text" inputMode="numeric" maxLength={6} placeholder="· · · · · ·" value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-2xl font-black tracking-[0.5em] text-slate-900 placeholder:text-slate-300 focus:border-green-500 focus:bg-white transition-all" />
              {error && <p className="text-rose-500 text-xs font-bold text-center">{error}</p>}
              <button type="submit" disabled={loading || otpCode.length < 6} className="w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50" style={primaryBtn}>
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{t('Verify & Sign In', 'Verifikasi & Masuk')}<ArrowRight size={14} /></>}
              </button>
            </form>
            <button onClick={() => { handleSendEmailOtp(); setOtpCode(''); }} disabled={loading}
              className="w-full py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              {t('Resend Code', 'Kirim Ulang Kode')}
            </button>
            <button onClick={() => { setMode('LOGIN'); setError(null); setOtpCode(''); }} className="w-full py-2 text-slate-400 hover:text-slate-600 font-bold text-[0.55rem] uppercase tracking-widest transition-colors">{t('Back to Login', 'Kembali ke Login')}</button>
          </div>
        )}

        {/* Reset password (from email link) */}
        {mode === 'RESET_PASSWORD' && (
          <div className={cardCls} style={cardShadow}>
            <h3 className="text-lg font-bold tracking-tight text-center text-slate-900">{t('New Password', 'Password Baru')}</h3>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div className="relative">
                <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input required type={showNewPass ? 'text' : 'password'} placeholder={t('New password (min 6 chars)', 'Password baru (min 6 karakter)')} minLength={6} value={newPassword}
                  onChange={e => setNewPass(e.target.value)}
                  className="w-full pl-11 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:bg-white transition-all" />
                <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-600 transition-colors">
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {error && <p className="text-rose-500 text-xs font-bold">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50" style={primaryBtn}>
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{t('Save Password', 'Simpan Password')}<ArrowRight size={14} /></>}
              </button>
            </form>
          </div>
        )}

        {/* Main form */}
        {(mode === 'LOGIN' || mode === 'REGISTER') && (
          /* Gradient-border card wrapper */
          <div className="w-full p-px rounded-[2.3rem]" style={{ background: 'linear-gradient(145deg, rgba(22,163,74,0.45) 0%, rgba(226,232,240,0.6) 45%, rgba(5,150,105,0.30) 100%)' }}>
          <div className="w-full bg-white rounded-[calc(2.3rem-1px)] p-7 space-y-6" style={{ boxShadow: '0 34px 80px -34px rgba(5,46,22,0.32)' }}>

            {/* Sliding-pill tab switcher */}
            <div className="relative flex bg-slate-100 p-1 rounded-2xl border border-slate-200/70">
              {/* Sliding pill */}
              <div className="absolute top-1 bottom-1 rounded-xl transition-all duration-300 ease-out pointer-events-none"
                style={{
                  left: mode === 'LOGIN' ? '4px' : '50%',
                  right: mode === 'LOGIN' ? '50%' : '4px',
                  background: GRAD,
                  boxShadow: '0 6px 18px -6px rgba(22,163,74,0.6)',
                }} />
              <button
                onClick={() => { setMode('LOGIN'); setError(null); }}
                className={`relative flex-1 py-3 rounded-xl text-[0.6rem] font-bold uppercase tracking-widest transition-colors duration-200 ${mode === 'LOGIN' ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {t('Sign In', 'Masuk')}
              </button>
              <button
                onClick={() => { setMode('REGISTER'); setError(null); }}
                className={`relative flex-1 py-3 rounded-xl text-[0.6rem] font-bold uppercase tracking-widest transition-colors duration-200 ${mode === 'REGISTER' ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {t('Register', 'Daftar')}
              </button>
            </div>

            <form onSubmit={mode === 'LOGIN' ? handleLogin : handleRegister} className="space-y-3">

              {mode === 'REGISTER' && (
                <>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      placeholder={t('Full Name', 'Nama Lengkap')}
                      className={inputCls}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRegRole(UserRole.CUSTOMER)}
                      className={`py-3 rounded-2xl text-[0.55rem] font-bold uppercase border transition-all flex items-center justify-center gap-2 ${regRole === UserRole.CUSTOMER ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                    >
                      <Smartphone size={14} /> {t('Customer', 'Nasabah')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole(UserRole.AGENT)}
                      className={`py-3 rounded-2xl text-[0.55rem] font-bold uppercase border transition-all flex items-center justify-center gap-2 ${regRole === UserRole.AGENT ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                    >
                      <Briefcase size={14} /> {t('Agent', 'Agen')}
                    </button>
                  </div>
                </>
              )}

              {/* Email */}
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="email@contoh.com"
                  className={inputCls}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {/* Password */}
              <div className="relative">
                <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type={showPass ? 'text' : 'password'}
                  autoComplete={mode === 'LOGIN' ? 'current-password' : 'new-password'}
                  placeholder="Password"
                  minLength={mode === 'REGISTER' ? 6 : 1}
                  className="w-full pl-11 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(22,163,74,0.10)] transition-all"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-600 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === 'REGISTER' && formData.password.length > 0 && formData.password.length < 6 && (
                <p className="text-[0.6rem] text-amber-500 font-bold px-1">
                  {t('Password must be at least 6 characters', 'Password minimal 6 karakter')}
                </p>
              )}

              {mode === 'LOGIN' && (
                <div className="flex justify-end">
                  <button type="button" onClick={() => { setMode('FORGOT_PASSWORD'); setError(null); }}
                    className="text-[0.6rem] font-bold text-slate-400 hover:text-green-600 transition-colors uppercase tracking-widest">
                    {t('Forgot password?', 'Lupa password?')}
                  </button>
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                style={primaryBtn}
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

            {mode === 'LOGIN' && (
              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-[0.5rem] font-bold text-slate-400 uppercase tracking-widest">{t('Or continue with', 'Atau lanjutkan dengan')}</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <button onClick={handleGoogleSignIn} disabled={loading}
                  className="w-full py-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-center gap-2.5 hover:bg-slate-50 transition-all active:scale-[0.98] disabled:opacity-50">
                  <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-[0.6rem] font-bold uppercase tracking-widest text-slate-700">{t('Google', 'Google')}</span>
                </button>
                <button onClick={handleSendEmailOtp} disabled={loading}
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2.5 text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 transition-all active:scale-[0.98] disabled:opacity-50">
                  <Mail size={16} />
                  <span className="text-[0.6rem] font-bold uppercase tracking-widest">{t('Email OTP / Magic Link', 'OTP Email / Magic Link')}</span>
                </button>
              </div>
            )}
          </div>
          </div>
        )}

        <p style={{ fontSize: '0.5rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.3em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={10} style={{ color: '#16a34a' }} />
          SurePath · Secure Connection
        </p>
      </div>
    </div>
  );
};

export default AuthGate;
