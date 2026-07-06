import React, { useState, useEffect, useRef } from 'react';
import {
  Eye, EyeOff, Mail, KeyRound, User,
  AlertCircle, Smartphone, Briefcase,
  ArrowRight, Shield, CheckCircle2, RefreshCw
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { SurePathLogo } from './Navbar';
import { Language, UserRole } from '../types';
import { supabase, ensureProfile } from '../services/supabaseService';
import AgentOnboarding from './agent/AgentOnboarding';
import { OjkBadge, EncryptionBadge } from './ui';

interface AuthGateProps {
  onAuthSuccess: (user: any) => void;
  initialLang?: Language;
  initialMode?: 'LOGIN' | 'REGISTER';
}

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
    // Fetch the caller's profile via the gateway, creating it from the signup
    // metadata if missing (e.g. email-confirmation flow where the profile
    // couldn't be created at registration time).
    // Retry once after 1.5 s — on new email/password signups the Supabase
    // database trigger that creates the sp_users row may not have committed yet.
    let profile = await ensureProfile().catch(() => null);
    if (!profile) {
      await new Promise(r => setTimeout(r, 1500));
      profile = await ensureProfile().catch(() => null);
    }

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

    // Referral code from a shared ?ref= link — travels in the signup metadata
    // so the gateway links the upline even after email confirmation.
    const refCode = localStorage.getItem('SUREPATH_REF') || undefined;
    const { data, error: authErr } = await supabase.auth.signUp({
      email:    formData.email,
      password: formData.password,
      options:  { data: { name: formData.name, role: UserRole.CUSTOMER, referral_code: refCode } },
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

  // ── Premium design tokens (no green) ──────────────────────────────────────
  const GRAD = 'linear-gradient(135deg, #16a34a 0%, #059669 100%)';
  const inputCls = 'w-full h-12 pl-11 pr-4 rounded-2xl border border-emerald-900/10 bg-white/80 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all duration-150';

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden" style={{ fontFamily: "'Sora', sans-serif", background: '#f6faf7' }}>

      {/* Ambient emerald wash — same language as the apps */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(480px 360px at 15% -5%, rgba(16,185,129,0.13), transparent 65%), radial-gradient(560px 420px at 110% 30%, rgba(16,185,129,0.09), transparent 70%), radial-gradient(520px 460px at 50% 115%, rgba(5,150,105,0.10), transparent 70%)' }} />
      {/* Fine dot-matrix overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(rgba(5,150,105,0.08) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }} />

      <div className="relative z-10 w-full max-w-sm mx-auto px-6 flex flex-col items-center gap-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute -inset-6 rounded-full blur-3xl opacity-20" style={{ background: GRAD }} />
            <div className="relative w-20 h-20 rounded-[1.9rem] flex items-center justify-center sp-glass">
              <SurePathLogo className="w-[3.6rem] h-[3.6rem] object-contain" />
            </div>
          </div>
          <div className="text-center">
            <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, color: '#0f172a' }}>
              Sure<span style={{ background: 'linear-gradient(135deg,#059669,#16a34a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Path</span>
            </h1>
            <p style={{ fontSize: '0.6rem', fontWeight: 600, color: 'rgba(15,23,42,0.42)', letterSpacing: '0.32em', textTransform: 'uppercase', marginTop: '0.6rem' }}>
              {mode === 'REGISTER'
                ? t('Create your account', 'Buat akun kamu')
                : t('Welcome back', 'Selamat datang kembali')}
            </p>
          </div>
        </div>

        {/* Check-email screen */}
        {mode === 'CHECK_EMAIL' && (
          <div className="w-full sp-glass rounded-[2.25rem] p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center mx-auto" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.30)' }}>
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 mb-1">{t('Check Your Email', 'Cek Email Kamu')}</h3>
              <p className="text-sm text-slate-500 mb-6">
                {t('We sent a confirmation link to ', 'Kami kirim link konfirmasi ke ')}
                <span className="text-emerald-700 font-bold">{formData.email}</span>.
                {t(' Click it to activate your account.', ' Klik untuk mengaktifkan akunmu.')}
              </p>
            </div>
            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest text-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)' }}
            >
              <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
              {resending ? t('Sent!', 'Terkirim!') : t('Resend Email', 'Kirim Ulang Email')}
            </button>
            <button
              onClick={() => setMode('LOGIN')}
              className="w-full h-10 rounded-xl text-slate-400 font-medium text-sm hover:text-emerald-700 transition-colors"
            >
              {t('Back to Login', 'Kembali ke Login')}
            </button>
          </div>
        )}

        {/* Forgot password — enter email */}
        {mode === 'FORGOT_PASSWORD' && (
          <div className="w-full sp-glass rounded-[2.25rem] p-8 space-y-5">
            <h3 className="text-2xl font-black text-slate-900 mb-1 text-center">{t('Reset Password', 'Reset Password')}</h3>
            <p className="text-sm text-slate-500 mb-6 text-center">{t('Enter your email and we will send a reset link.', 'Masukkan email kamu, kami kirim link reset.')}</p>
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700/50" />
                <input required type="email" placeholder="email@contoh.com" value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className={inputCls} />
              </div>
              {error && <p className="text-rose-400 text-xs font-bold">{error}</p>}
              <button type="submit" disabled={loading} className="w-full h-12 rounded-2xl text-white font-bold text-sm transition-all duration-150 disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]" style={{ background: GRAD, boxShadow: '0 12px 26px -10px rgba(5,150,105,0.55)' }}>
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{t('Send Reset Link', 'Kirim Link Reset')}<ArrowRight size={14} /></>}
              </button>
            </form>
            <button onClick={() => { setMode('LOGIN'); setError(null); }} className="w-full h-10 rounded-xl text-slate-400 font-medium text-sm hover:text-emerald-700 transition-colors">{t('Back', 'Kembali')}</button>
          </div>
        )}

        {/* Forgot password — sent */}
        {mode === 'FORGOT_SENT' && (
          <div className="w-full sp-glass rounded-[2.25rem] p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center mx-auto" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.30)' }}><CheckCircle2 size={32} className="text-emerald-600" /></div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 mb-1">{t('Check Your Email', 'Cek Email Kamu')}</h3>
              <p className="text-sm text-slate-500 mb-6">{t('Password reset link sent to ', 'Link reset dikirim ke ')}<span className="text-emerald-700 font-bold">{formData.email}</span>.</p>
            </div>
            <button onClick={() => { setMode('LOGIN'); setError(null); }} className="w-full h-10 rounded-xl text-slate-400 font-medium text-sm hover:text-emerald-700 transition-colors">{t('Back to Login', 'Kembali ke Login')}</button>
          </div>
        )}

        {/* Email OTP — verify */}
        {mode === 'EMAIL_OTP_VERIFY' && (
          <div className="w-full sp-glass rounded-[2.25rem] p-8 space-y-5">
            <div className="w-14 h-14 rounded-[1.2rem] flex items-center justify-center mx-auto" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.30)' }}>
              <Mail size={26} className="text-emerald-600" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-black text-slate-900 mb-1">{t('Check Your Email', 'Cek Email Kamu')}</h3>
              <p className="text-sm text-slate-500 mb-6">
                {t('Enter the 6-digit code sent to ', 'Masukkan kode 6 digit yang dikirim ke ')}
                <span className="text-emerald-700 font-bold">{formData.email}</span>.<br/>
                {t('Or click the link in the email.', 'Atau klik link di email.')}
              </p>
            </div>
            <form onSubmit={handleVerifyEmailOtp} className="space-y-3">
              <input required type="text" inputMode="numeric" maxLength={6} placeholder="· · · · · ·" value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center py-4 bg-white/80 border border-emerald-900/10 rounded-2xl outline-none text-2xl font-black tracking-[0.5em] text-slate-900 placeholder:text-slate-300 focus:border-emerald-500/60 transition-all" />
              {error && <p className="text-rose-400 text-xs font-bold text-center">{error}</p>}
              <button type="submit" disabled={loading || otpCode.length < 6} className="w-full h-12 rounded-2xl text-white font-bold text-sm transition-all duration-150 disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]" style={{ background: GRAD, boxShadow: '0 12px 26px -10px rgba(5,150,105,0.55)' }}>
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{t('Verify & Sign In', 'Verifikasi & Masuk')}<ArrowRight size={14} /></>}
              </button>
            </form>
            <button onClick={() => { handleSendEmailOtp(); setOtpCode(''); }} disabled={loading}
              className="w-full py-3 bg-emerald-900/5 border border-emerald-900/10 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-600 hover:bg-emerald-900/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              {t('Resend Code', 'Kirim Ulang Kode')}
            </button>
            <button onClick={() => { setMode('LOGIN'); setError(null); setOtpCode(''); }} className="w-full h-10 rounded-xl text-slate-400 font-medium text-sm hover:text-emerald-700 transition-colors">{t('Back to Login', 'Kembali ke Login')}</button>
          </div>
        )}

        {/* Reset password (from email link) */}
        {mode === 'RESET_PASSWORD' && (
          <div className="w-full sp-glass rounded-[2.25rem] p-8 space-y-5">
            <h3 className="text-2xl font-black text-slate-900 mb-1 text-center">{t('New Password', 'Password Baru')}</h3>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div className="relative">
                <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700/50" />
                <input required type={showNewPass ? 'text' : 'password'} placeholder={t('New password (min 6 chars)', 'Password baru (min 6 karakter)')} minLength={6} value={newPassword}
                  onChange={e => setNewPass(e.target.value)}
                  className={inputCls} />
                <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors">
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {error && <p className="text-rose-400 text-xs font-bold">{error}</p>}
              <button type="submit" disabled={loading} className="w-full h-12 rounded-2xl text-white font-bold text-sm transition-all duration-150 disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]" style={{ background: GRAD, boxShadow: '0 12px 26px -10px rgba(5,150,105,0.55)' }}>
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{t('Save Password', 'Simpan Password')}<ArrowRight size={14} /></>}
              </button>
            </form>
          </div>
        )}


        {/* Main form */}
        {(mode === 'LOGIN' || mode === 'REGISTER') && (
          /* Gradient-border card wrapper */
          <div className="w-full sp-glass rounded-[2.3rem] p-7 space-y-6">
          <div className="w-full space-y-6">

            {/* Sliding-pill tab switcher */}
            <div className="relative flex bg-emerald-900/[0.05] p-1 rounded-2xl border border-emerald-900/10">
              {/* Sliding pill */}
              <div className="absolute top-1 bottom-1 rounded-xl transition-all duration-300 ease-out pointer-events-none"
                style={{
                  left: mode === 'LOGIN' ? '4px' : '50%',
                  right: mode === 'LOGIN' ? '50%' : '4px',
                  background: GRAD,
                  boxShadow: '0 6px 22px -6px rgba(22,163,74,0.7)',
                }} />
              <button
                onClick={() => { setMode('LOGIN'); setError(null); }}
                className={`relative flex-1 py-3 rounded-xl text-[0.6rem] font-bold uppercase tracking-widest transition-colors duration-200 ${mode === 'LOGIN' ? 'text-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t('Sign In', 'Masuk')}
              </button>
              <button
                onClick={() => { setMode('REGISTER'); setError(null); }}
                className={`relative flex-1 py-3 rounded-xl text-[0.6rem] font-bold uppercase tracking-widest transition-colors duration-200 ${mode === 'REGISTER' ? 'text-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t('Register', 'Daftar')}
              </button>
            </div>

            <form onSubmit={mode === 'LOGIN' ? handleLogin : handleRegister} className="space-y-3">

              {mode === 'REGISTER' && (
                <>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700/50" />
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
                      className={`py-3 rounded-2xl text-[0.55rem] font-bold uppercase border transition-all flex items-center justify-center gap-2 ${regRole === UserRole.CUSTOMER ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-700' : 'border-emerald-900/10 text-slate-400 hover:border-emerald-900/25'}`}
                    >
                      <Smartphone size={14} /> {t('Customer', 'Nasabah')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole(UserRole.AGENT)}
                      className={`py-3 rounded-2xl text-[0.55rem] font-bold uppercase border transition-all flex items-center justify-center gap-2 ${regRole === UserRole.AGENT ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-700' : 'border-emerald-900/10 text-slate-400 hover:border-emerald-900/25'}`}
                    >
                      <Briefcase size={14} /> {t('Partner', 'Mitra')}
                    </button>
                  </div>
                </>
              )}

              {/* Email */}
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700/50" />
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
                <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-700/50" />
                <input
                  required
                  type={showPass ? 'text' : 'password'}
                  autoComplete={mode === 'LOGIN' ? 'current-password' : 'new-password'}
                  placeholder="Password"
                  minLength={mode === 'REGISTER' ? 6 : 1}
                  className={inputCls}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === 'REGISTER' && formData.password.length > 0 && formData.password.length < 6 && (
                <p className="text-[0.6rem] text-amber-400 font-bold px-1">
                  {t('Password must be at least 6 characters', 'Password minimal 6 karakter')}
                </p>
              )}

              {mode === 'LOGIN' && (
                <div className="flex justify-end">
                  <button type="button" onClick={() => { setMode('FORGOT_PASSWORD'); setError(null); }}
                    className="text-[0.6rem] font-bold text-slate-400 hover:text-emerald-600 transition-colors uppercase tracking-widest">
                    {t('Forgot password?', 'Lupa password?')}
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-2xl text-white font-bold text-sm transition-all duration-150 disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]" style={{ background: GRAD, boxShadow: '0 12px 26px -10px rgba(5,150,105,0.55)' }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'LOGIN'
                      ? t('Sign In', 'Masuk')
                      : regRole === UserRole.AGENT
                        ? t('Continue to Partner Setup', 'Lanjut ke Setup Mitra')
                        : t('Create Account', 'Buat Akun')}
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            {(mode === 'LOGIN' || mode === 'REGISTER') && (
              <div className="space-y-3 mt-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-emerald-900/10" />
                  <span className="text-[0.5rem] font-bold text-slate-400 uppercase tracking-widest">{mode === 'REGISTER' ? t('Or register with', 'Atau daftar dengan') : t('Or continue with', 'Atau lanjutkan dengan')}</span>
                  <div className="flex-1 h-px bg-emerald-900/10" />
                </div>
                <button onClick={handleGoogleSignIn} disabled={loading}
                  className="w-full h-12 rounded-2xl bg-white border border-emerald-900/10 text-slate-700 font-medium text-sm flex items-center justify-center gap-3 shadow-sm hover:border-emerald-500/30 active:scale-[0.98] transition-all duration-150 disabled:opacity-40">
                  <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-[0.65rem] font-bold uppercase tracking-widest">{mode === 'REGISTER' ? t('Sign up with Google', 'Daftar dengan Google') : t('Continue with Google', 'Lanjut dengan Google')}</span>
                </button>
                {mode === 'LOGIN' && (
                  <button onClick={handleSendEmailOtp} disabled={loading}
                    className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2.5 text-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50"
                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)' }}>
                    <Mail size={16} />
                    <span className="text-[0.6rem] font-bold uppercase tracking-widest">{t('Email OTP / Magic Link', 'OTP Email / Magic Link')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
          </div>
        )}

        <p style={{ fontSize: '0.5rem', fontWeight: 600, color: 'rgba(15,23,42,0.30)', letterSpacing: '0.3em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={10} style={{ color: 'rgba(5,150,105,0.55)' }} />
          SurePath · Secure Connection
        </p>

        {/* Trust signals — Indonesian insurance buyers explicitly look for
            OJK licensing + encryption at the signup moment. Previously buried
            in the footer of the marketing site only. */}
        <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
          <OjkBadge />
          <EncryptionBadge />
        </div>
      </div>
    </div>
  );
};

export default AuthGate;
