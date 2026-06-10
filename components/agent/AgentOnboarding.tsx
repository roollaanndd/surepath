import React, { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Eye, EyeOff, RefreshCw,
  User, Globe, Phone, Lock, MapPin, CreditCard, ShieldCheck
} from 'lucide-react';
import { Language } from '../../types';
import { supabase, ensureProfile } from '../../services/supabaseService';

interface Props {
  onSuccess: (agent: any) => void;
  onBack: () => void;
  lang: Language;
}

const AgentOnboarding: React.FC<Props> = ({ onSuccess, onBack, lang }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [step, setStep] = useState(1);
  const [checkEmail, setCheckEmail] = useState(false);
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
    'w-full h-12 pl-12 pr-4 rounded-xl border border-white/10 bg-white/5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-all';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    setLoading(true);
    setError(null);

    // 1) Create the Supabase Auth account. Role/profile data travels in the
    // user metadata so the gateway can build the profile even when the user
    // only returns after clicking the email-confirmation link.
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
        },
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
    const profile = await ensureProfile({ name, phone, role: 'AGENT', ktp: ktp || null, address: address || null });
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
    <div className="min-h-screen bg-gray-950 flex flex-col px-6 py-12 overflow-y-auto">
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
              {t('Agent Registration', 'Daftar Agen')}
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
                s <= step ? 'bg-[#16a34a]' : 'bg-slate-200 dark:bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-8">

          {/* ─── Email confirmation required ─── */}
          {checkEmail && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 flex items-center justify-center mb-6 mx-auto">
                <ShieldCheck size={26} className="text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-white mb-2">
                {t('Check Your Email', 'Cek Email Kamu')}
              </p>
              <p className="text-sm text-gray-400 leading-relaxed mb-8">
                {t('We sent a confirmation link to ', 'Kami kirim link konfirmasi ke ')}
                <span className="text-emerald-400 font-bold">{email}</span>
                {t('. Click it, then sign in to activate your agent account.', '. Klik link tersebut, lalu masuk untuk mengaktifkan akun agen Anda.')}
              </p>
              <button
                onClick={onBack}
                className="w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm"
              >
                {t('Back to Login', 'Kembali ke Login')}
              </button>
            </div>
          )}

          {/* ─── STEP 1: Personal Info ─── */}
          {!checkEmail && step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <p className="font-black tracking-tighter text-lg mb-1">
                  {t('Personal Information', 'Informasi Pribadi')}
                </p>
                <p className="text-xs text-slate-400 font-medium">
                  {t('Fill in your personal details to get started.', 'Isi data pribadi Anda untuk memulai.')}
                </p>
              </div>

              {/* Name */}
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
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
                <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
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
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
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
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#16a34a] transition-colors"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#16a34a] transition-colors"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && (
                <p className="text-rose-500 text-xs font-bold px-3 py-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!canProceedStep1}
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
              >
                {t('Next', 'Lanjut')} <ChevronRight size={16} />
              </button>
            </form>
          )}

          {/* ─── STEP 2: Professional Info ─── */}
          {!checkEmail && step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="font-black tracking-tighter text-lg mb-1">
                  {t('Professional Information', 'Informasi Profesional')}
                </p>
                <p className="text-xs text-slate-400 font-medium">
                  {t('Optional details to complete your agent profile.', 'Detail opsional untuk melengkapi profil agen Anda.')}
                </p>
              </div>

              {/* KTP */}
              <div className="relative">
                <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
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
                <MapPin size={18} className="absolute left-4 top-4 text-slate-300" />
                <textarea
                  rows={3}
                  placeholder={t('Address (optional)', 'Alamat (opsional)')}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-white/[0.03] border-2 border-slate-100 dark:border-white/5 rounded-2xl outline-none transition-all font-bold text-sm resize-none focus:border-[#16a34a]/60"
                />
              </div>

              {/* Terms agreement */}
              <label className="flex items-start gap-3 cursor-pointer p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#16a34a] flex-shrink-0"
                />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t(
                    'By signing up you agree to SurePath agent terms and conditions.',
                    'Dengan mendaftar, Anda menyetujui syarat dan ketentuan agen SurePath.',
                  )}
                </span>
              </label>

              {error && (
                <p className="text-rose-500 text-xs font-bold px-3 py-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
              >
                {loading ? (
                  <RefreshCw size={18} className="animate-spin motion-reduce:animate-none text-[#16a34a]" />
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    {t('Create Agent Account', 'Buat Akun Agen')}
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[0.5rem] font-bold text-slate-400 uppercase tracking-widest">
          {t('Secured by SurePath Smart Security', 'Diamankan oleh SurePath Smart Security')}
        </p>
      </div>
    </div>
  );
};

export default AgentOnboarding;
