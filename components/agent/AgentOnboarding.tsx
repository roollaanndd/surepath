import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, RefreshCw, User, Globe, Phone, Lock, MapPin, CreditCard, ShieldCheck } from 'lucide-react';
import { Language } from '../../types';
import { supabase, ensureProfile } from '../../services/supabaseService';
import { isUntrustedEmail } from '../../supabase/functions/_shared/trust';
import ModuleIcon from '../shared/ModuleIcon';

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
    'w-full h-12 pl-12 pr-4 rounded-full border border-white bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all';

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
    <div className="min-h-screen flex flex-col px-6 py-12 overflow-y-auto" style={{ background: "linear-gradient(135deg,#fff8dc 0%,#f2fff6 55%,#fff0e5 100%)" }}>
      <div className="w-full max-w-md flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={step === 1 ? onBack : () => setStep(1)}
            className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-gray-400 mb-6"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              {t('Partner Registration', 'Daftar Mitra')}
            </h1>
            <p className="text-sm text-gray-400 mb-8">
              {t(`Step ${step} of 2`, `Langkah ${step} dari 2`)}
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex gap-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                s <= step ? 'bg-emerald-500' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {step === 2 && !checkEmail && (
          <div className="mt-4 mb-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-2">
              {t('What happens next', 'Langkah berikutnya')}
            </p>
            <div className="space-y-2 text-xs leading-relaxed text-gray-300">
              <p className="flex gap-2"><span className="text-emerald-400 font-bold">1.</span>{t('Finish your registration details.', 'Selesaikan data pendaftaran.')}</p>
              <p className="flex gap-2"><span className="text-emerald-400 font-bold">2.</span>{t('Confirm your email if prompted, then sign in.', 'Konfirmasi email jika diminta, lalu masuk.')}</p>
              <p className="flex gap-2"><span className="text-emerald-400 font-bold">3.</span>{t('Review and accept the partner agreement; your agreement number will be saved to your account.', 'Baca dan setujui perjanjian mitra; nomor agreement akan disimpan ke akun Anda.')}</p>
              <p className="flex gap-2"><span className="text-emerald-400 font-bold">4.</span>{t('Complete the app introduction and check your verification status in Profile.', 'Selesaikan pengenalan aplikasi dan cek status verifikasi di Profil.')}</p>
            </div>
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-[2rem] border border-white/80 p-8 shadow-[0_24px_70px_-30px_rgba(6,95,70,0.32)]">

          {/* ─── Email confirmation required ─── */}
          {checkEmail && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 flex items-center justify-center mb-6 mx-auto">
                <ModuleIcon id="security" size={46} />
              </div>
              <p className="text-xl font-bold text-white mb-2">
                {t('Check Your Email', 'Cek Email Kamu')}
              </p>
              <p className="text-sm text-gray-400 leading-relaxed mb-8">
                {t('We sent a confirmation link to ', 'Kami kirim link konfirmasi ke ')}
                <span className="text-emerald-400 font-bold">{email}</span>
                {t('. Click it, then sign in to activate your partner account.', '. Klik link tersebut, lalu masuk untuk mengaktifkan akun mitra Anda.')}
              </p>
              <button
                onClick={onBack}
                className="w-full h-12 rounded-xl bg-emerald-600 text-white font-semibold text-sm"
              >
                {t('Back to Login', 'Kembali ke Login')}
              </button>
              <button
                onClick={handleResend}
                disabled={resending}
                className="w-full h-11 rounded-xl border border-white/15 text-gray-300 font-semibold text-xs disabled:opacity-50"
              >
                {resending
                  ? t('Link sent — check your inbox and spam folder', 'Link terkirim — cek inbox dan folder spam')
                  : t('Resend confirmation link', 'Kirim ulang link konfirmasi')}
              </button>
            </div>
          )}

          {/* ─── STEP 1: Personal Info ─── */}
          {!checkEmail && step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <p className="text-2xl font-bold text-white mb-1">
                  {t('Personal Information', 'Informasi Pribadi')}
                </p>
                <p className="text-sm text-gray-400 mb-8">
                  {t('Fill in your personal details to get started.', 'Isi data pribadi Anda untuk memulai.')}
                </p>
              </div>

              {/* Name */}
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
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
                <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
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
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
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
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && (
                <p className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-4">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!canProceedStep1}
                className="w-full h-12 rounded-xl bg-emerald-600 text-white font-semibold text-sm active:bg-emerald-600 transition-all disabled:opacity-40 mt-2 flex items-center justify-center gap-2"
              >
                {t('Next', 'Lanjut')} <ChevronRight size={16} />
              </button>
            </form>
          )}

          {/* ─── STEP 2: Professional Info ─── */}
          {!checkEmail && step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="text-2xl font-bold text-white mb-1">
                  {t('Professional Information', 'Informasi Profesional')}
                </p>
                <p className="text-sm text-gray-400 mb-8">
                  {t('Optional details to complete your partner profile.', 'Detail opsional untuk melengkapi profil mitra Anda.')}
                </p>
              </div>

              {/* KTP */}
              <div className="relative">
                <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
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
                <MapPin size={18} className="absolute left-4 top-4 text-gray-500" />
                <textarea
                  rows={3}
                  placeholder={t('Address (optional)', 'Alamat (opsional)')}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-full border border-white bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all resize-none"
                />
              </div>

              {/* Terms agreement */}
              <label className="flex items-start gap-3 cursor-pointer p-3 bg-white/5 rounded-xl border border-white/10">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-ds-green flex-shrink-0"
                />
                <span className="text-xs font-medium text-gray-400 leading-relaxed">
                  {t(
                    'By signing up you agree to SurePath partner (Mitra) terms and conditions, and voluntarily consent that the data you provide will be forwarded to the relevant insurance company.',
                    'Dengan mendaftar, Anda menyetujui syarat dan ketentuan Mitra SurePath, dan secara sukarela menyetujui bahwa data yang Anda berikan akan diteruskan kepada perusahaan asuransi terkait.',
                  )}
                </span>
              </label>

              {error && (
                <p className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-4">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="w-full h-12 rounded-xl bg-emerald-600 text-white font-semibold text-sm active:bg-emerald-600 transition-all disabled:opacity-40 mt-2 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <RefreshCw size={18} className="animate-spin motion-reduce:animate-none text-ds-green" />
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

        <p className="text-center text-[0.5rem] font-bold text-gray-600 uppercase tracking-widest">
          {t('Secured by SurePath Smart Security', 'Diamankan oleh SurePath Smart Security')}
        </p>
      </div>
    </div>
  );
};

export default AgentOnboarding;
