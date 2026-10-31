import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, RefreshCw, User, Globe, Phone, Lock, MapPin, CreditCard, ShieldCheck, MailCheck } from 'lucide-react';
import { Language } from '../../types';
import { supabase, ensureProfile } from '../../services/supabaseService';
import { isUntrustedEmail } from '../../supabase/functions/_shared/trust';
import ModuleIcon from '../shared/ModuleIcon';
import { PromoArtKeyframes, PromoArtSignup } from './AgentPromoArt';

interface Props {
  onSuccess: (agent: any) => void;
  onBack: () => void;
  lang: Language;
}

const AgentOnboarding: React.FC<Props> = ({ onSuccess, onBack, lang }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [step, setStep] = useState(1);
  const [checkEmail, setCheckEmail] = useState(false);
  // Without a resend path, an agent whose confirmation mail lands in spam
  // is stuck: they cannot sign in and cannot re-register the same address.
  const [resending, setResending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 1 fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2 fields
  const [ktp, setKtp] = useState('');
  const [address, setAddress] = useState('');
  const [agreed, setAgreed] = useState(false);

  const inputClass =
    'w-full h-12 pl-12 pr-4 rounded-full border border-slate-200 bg-white text-slate-900 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all';

  const canProceedStep1 =
    name.trim() && email.trim() && phone.trim() && password.length >= 6 && password === confirmPassword;

  const canSubmit = agreed;

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(t('Passwords do not match.', 'Kata sandi tidak cocok.'));
      return;
    }
    if (password.length < 6) {
      setError(t('Password must be at least 6 characters.', 'Kata sandi minimal 6 karakter.'));
      return;
    }
    setStep(2);
  };

  const handleResend = async () => {
    if (!email || resending) return;
    setResending(true);
    await supabase.auth
      .resend({ type: 'signup', email, options: { emailRedirectTo: window.location.origin } })
      .catch(() => {});
    setTimeout(() => setResending(false), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;

    // Sama seperti pendaftaran nasabah: tolak domain yang tidak dapat menerima
    // email sebelum akun auth dibuat.
    if (isUntrustedEmail(email)) {
      setError('Gunakan alamat email sungguhan — domain tersebut tidak bisa menerima email.');
      return;
    }

    setLoading(true);
    setError(null);

    // 1) Create the Supabase Auth account. Role/profile data travels in the
    // user metadata so the gateway can build the profile even when the user
    // only returns after clicking the email-confirmation link.
    // Referral code from a shared ?ref= link — travels in the signup metadata
    // so the gateway links the upline even after email confirmation.
    const refCode = localStorage.getItem('SUREPATH_REF') || undefined;
    const { data, error: authErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone,
          role: 'AGENT',
          ktp: ktp || null,
          address: address || null,
          referral_code: refCode,
        },
        // Return target for the confirmation link (see AuthGate for why).
        emailRedirectTo: window.location.origin,
      },
    });

    if (authErr || !data.user) {
      const msg = authErr?.message ?? '';
      setError(
        msg.includes('already registered') || msg.includes('already been registered')
          ? t('This email is already registered. Try signing in.', 'Email ini sudah terdaftar. Coba masuk.')
          : msg || t('Registration failed. Please try again.', 'Pendaftaran gagal. Silakan coba lagi.'),
      );
      setLoading(false);
      return;
    }

    // 2) Email confirmation required — profile will be created by
    // ensure_profile (from the metadata above) on their first login.
    if (!data.session) {
      setCheckEmail(true);
      setLoading(false);
      return;
    }

    // 3) Immediate session — create the agent profile via the gateway.
    const profile = await ensureProfile({ name, phone, role: 'AGENT', ktp: ktp || null, address: address || null, referral_code: refCode ?? null });
    if (profile) localStorage.removeItem('SUREPATH_REF');
    if (!profile) {
      setError(t('Registration failed. Please try again.', 'Pendaftaran gagal. Silakan coba lagi.'));
      setLoading(false);
      return;
    }

    const session = {
      ...profile,
      role: 'AGENT',
      supabaseId: profile.id,
    };
    localStorage.setItem('SUREPATH_SESSION', JSON.stringify(session));
    onSuccess(session);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center overflow-y-auto px-4 pb-12"
      style={{
        fontFamily: "'Sora', sans-serif",
        background: 'linear-gradient(160deg, #fbfdf9 0%, #f3fbf6 48%, #fef9f0 100%)',
        paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
      }}
    >
      <PromoArtKeyframes />
      <style>{`
        @keyframes sp-ob-step { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .sp-ob-step { animation: sp-ob-step .42s cubic-bezier(.22,1,.36,1) both; }
        @media (prefers-reduced-motion: reduce) { .sp-ob-step { animation: none !important; } }
      `}</style>

      <div className="w-full max-w-md flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={step === 1 ? onBack : () => setStep(1)}
            aria-label={t('Back', 'Kembali')}
            className="w-10 h-10 shrink-0 rounded-xl border border-emerald-900/10 bg-white flex items-center justify-center text-emerald-900 shadow-sm transition active:scale-95 motion-reduce:active:scale-100"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight text-emerald-950">
              {t('Partner Registration', 'Daftar Mitra')}
            </h1>
            <p className="text-sm font-medium text-emerald-900/60">
              {checkEmail
                ? t('Confirm your email', 'Konfirmasi email Anda')
                : t(`Step ${step} of 2`, `Langkah ${step} dari 2`)}
            </p>
          </div>
        </div>

        {/* Illustrated hero band */}
        <div className="relative h-[150px] w-full overflow-hidden rounded-[1.75rem] shadow-[0_18px_44px_-26px_rgba(4,53,36,0.55)]">
          <PromoArtSignup />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(100deg, rgba(4,32,24,.92) 0%, rgba(4,32,24,.68) 46%, rgba(4,32,24,.04) 82%)' }}
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full max-w-[60%] flex-col justify-center gap-1.5 px-5">
            <span className="text-2xs font-black uppercase tracking-[.16em] text-white/70">
              {t('SurePath Partner', 'Mitra SurePath')}
            </span>
            <p className="text-[15px] font-black leading-tight text-white">
              {t('Your insurance business, in hand', 'Bisnis asuransi dalam genggaman')}
            </p>
            <p className="text-2xs font-medium leading-snug text-white/75">
              {t('Official OJK rates, transparent commission, instant payout.', 'Tarif resmi OJK, komisi transparan, pencairan cepat.')}
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        {!checkEmail && (
          <div className="flex gap-2" aria-hidden="true">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 motion-reduce:transition-none ${
                  s <= step ? 'bg-emerald-600' : 'bg-emerald-900/10'
                }`}
              />
            ))}
          </div>
        )}

        {step === 2 && !checkEmail && (
          <div className="sp-ob-step rounded-2xl border border-emerald-600/15 bg-emerald-50 p-4">
            <p className="mb-2 text-2xs font-black uppercase tracking-wider text-emerald-700">
              {t('What happens next', 'Langkah berikutnya')}
            </p>
            <div className="space-y-2 text-xs leading-relaxed text-emerald-950/75">
              <p className="flex gap-2"><span className="font-black text-emerald-700">1.</span>{t('Finish your registration details.', 'Selesaikan data pendaftaran.')}</p>
              <p className="flex gap-2"><span className="font-black text-emerald-700">2.</span>{t('Confirm your email if prompted, then sign in.', 'Konfirmasi email jika diminta, lalu masuk.')}</p>
              <p className="flex gap-2"><span className="font-black text-emerald-700">3.</span>{t('Review and accept the partner agreement; your agreement number will be saved to your account.', 'Baca dan setujui perjanjian mitra; nomor agreement akan disimpan ke akun Anda.')}</p>
              <p className="flex gap-2"><span className="font-black text-emerald-700">4.</span>{t('Complete the app introduction and check your verification status in Profile.', 'Selesaikan pengenalan aplikasi dan cek status verifikasi di Profil.')}</p>
            </div>
          </div>
        )}

        {/* Card */}
        <div className="rounded-[2rem] border border-emerald-900/5 bg-white p-7 shadow-[0_24px_70px_-30px_rgba(6,95,70,0.32)]">

          {/* ─── Email confirmation required ─── */}
          {checkEmail && (
            <div className="sp-ob-step space-y-4 text-center" key="ob-check-email">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50">
                <ModuleIcon id="security" size={46} />
              </div>
              <p className="text-xl font-black text-emerald-950">
                {t('Check Your Email', 'Cek Email Kamu')}
              </p>
              <p className="mx-auto mb-6 max-w-xs text-sm leading-relaxed text-slate-600">
                {t('We sent a confirmation link to ', 'Kami kirim link konfirmasi ke ')}
                <span className="font-bold text-emerald-700">{email}</span>
                {t('. Click it, then sign in to activate your partner account.', '. Klik link tersebut, lalu masuk untuk mengaktifkan akun mitra Anda.')}
              </p>
              <button
                type="button"
                onClick={onBack}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-bold text-white transition hover:brightness-110 active:scale-[.99] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                {t('Back to Login', 'Kembali ke Login')}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 motion-reduce:transition-none"
              >
                <MailCheck size={14} />
                {resending
                  ? t('Link sent — check your inbox and spam folder', 'Link terkirim — cek inbox dan folder spam')
                  : t('Resend confirmation link', 'Kirim ulang link konfirmasi')}
              </button>
            </div>
          )}

          {/* ─── STEP 1: Personal Info ─── */}
          {!checkEmail && step === 1 && (
            <form onSubmit={handleStep1} className="sp-ob-step space-y-4" key="ob-step-1">
              <div className="mb-6">
                <p className="mb-1 text-xl font-black text-emerald-950">
                  {t('Personal Information', 'Informasi Pribadi')}
                </p>
                <p className="text-sm text-slate-600">
                  {t('Fill in your personal details to get started.', 'Isi data pribadi Anda untuk memulai.')}
                </p>
              </div>

              {/* Name */}
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type="text"
                  placeholder={t('Full Name*', 'Nama Lengkap*')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Email */}
              <div className="relative">
                <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type="email"
                  placeholder={t('Email*', 'Email*')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Phone */}
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type="tel"
                  placeholder={t('Phone Number*', 'Nomor Telepon*')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type={showPass ? 'text' : 'password'}
                  placeholder={t('Password* (min 6 chars)', 'Kata Sandi* (min 6 karakter)')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass + ' pr-12'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? t('Hide password', 'Sembunyikan kata sandi') : t('Show password', 'Tampilkan kata sandi')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type={showConfirm ? 'text' : 'password'}
                  placeholder={t('Confirm Password*', 'Konfirmasi Kata Sandi*')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass + ' pr-12'}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? t('Hide password', 'Sembunyikan kata sandi') : t('Show password', 'Tampilkan kata sandi')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!canProceedStep1}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-bold text-white transition hover:brightness-110 active:scale-[.99] disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                {t('Next', 'Lanjut')} <ChevronRight size={16} />
              </button>
            </form>
          )}

          {/* ─── STEP 2: Professional Info ─── */}
          {!checkEmail && step === 2 && (
            <form onSubmit={handleSubmit} className="sp-ob-step space-y-4" key="ob-step-2">
              <div className="mb-6">
                <p className="mb-1 text-xl font-black text-emerald-950">
                  {t('Professional Information', 'Informasi Profesional')}
                </p>
                <p className="text-sm text-slate-600">
                  {t('Optional details to complete your partner profile.', 'Detail opsional untuk melengkapi profil mitra Anda.')}
                </p>
              </div>

              {/* KTP */}
              <div className="relative">
                <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  maxLength={16}
                  placeholder={t('KTP Number (optional)', 'Nomor KTP (opsional)')}
                  value={ktp}
                  onChange={(e) => setKtp(e.target.value.replace(/\D/g, ''))}
                  className={inputClass}
                />
              </div>

              {/* Address */}
              <div className="relative">
                <MapPin size={18} className="absolute left-4 top-4 text-slate-400" />
                <textarea
                  rows={3}
                  placeholder={t('Address (optional)', 'Alamat (opsional)')}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full resize-none rounded-3xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 placeholder:text-slate-500 transition-all focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              {/* Terms agreement */}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 flex-shrink-0 accent-ds-green"
                />
                <span className="text-xs font-medium leading-relaxed text-slate-600">
                  {t(
                    'By signing up you agree to SurePath partner (Mitra) terms and conditions, and voluntarily consent that the data you provide will be forwarded to the relevant insurance company.',
                    'Dengan mendaftar, Anda menyetujui syarat dan ketentuan Mitra SurePath, dan secara sukarela menyetujui bahwa data yang Anda berikan akan diteruskan kepada perusahaan asuransi terkait.',
                  )}
                </span>
              </label>

              {error && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-bold text-white transition hover:brightness-110 active:scale-[.99] disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                {loading ? (
                  <RefreshCw size={18} className="animate-spin motion-reduce:animate-none" />
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    {t('Create Partner Account', 'Buat Akun Mitra')}
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-2xs font-bold uppercase tracking-widest text-emerald-900/40">
          {t('Secured by SurePath Smart Security', 'Diamankan oleh SurePath Smart Security')}
        </p>
      </div>
    </div>
  );
};

export default AgentOnboarding;
