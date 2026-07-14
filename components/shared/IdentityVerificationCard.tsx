import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, ShieldAlert, Clock, Upload, Smartphone, Mail, CheckCircle2, X } from 'lucide-react';
import { Language } from '../../types';
import { SecureDocLink } from './SecureDoc';
import {
  getUserByEmail, uploadIdentityKtp, isEmailVerified,
  sendPhoneVerificationOtp, verifyPhoneVerificationOtp,
  type SpUser,
} from '../../services/supabaseService';

interface Props {
  userId: string;
  lang?: Language;
  onStatusChange?: (status: NonNullable<SpUser['identity_status']>) => void;
}

const STATUS_META: Record<string, { labelEn: string; labelId: string; color: string; Icon: any }> = {
  UNSUBMITTED: { labelEn: 'Not submitted', labelId: 'Belum diajukan', color: 'bg-amber-50 text-ds-amber border-amber-200', Icon: ShieldAlert },
  PENDING:     { labelEn: 'Under review', labelId: 'Sedang direview', color: 'bg-blue-50 text-ds-blue border-blue-200', Icon: Clock },
  APPROVED:    { labelEn: 'Verified', labelId: 'Terverifikasi', color: 'bg-ds-green-tint text-ds-green border-green-200', Icon: ShieldCheck },
  REJECTED:    { labelEn: 'Rejected', labelId: 'Ditolak', color: 'bg-rose-50 text-ds-red border-rose-200', Icon: X },
};

const IdentityVerificationCard: React.FC<Props> = ({ userId, lang = Language.ID, onStatusChange }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const [profile, setProfile] = useState<SpUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [ktpUploading, setKtpUploading] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const ktpInputRef = useRef<HTMLInputElement>(null);

  // Phone OTP flow
  const [phone, setPhone] = useState('');
  const [otpStep, setOtpStep] = useState<'idle' | 'sent' | 'verifying'>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpBusy, setOtpBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, ev] = await Promise.all([getUserByEmail(''), isEmailVerified()]);
    setProfile(p);
    setEmailVerified(ev);
    if (p?.phone) setPhone(p.phone);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  useEffect(() => {
    if (profile?.identity_status) onStatusChange?.(profile.identity_status);
  }, [profile?.identity_status]);

  const handleKtpChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setKtpUploading(true);
    await uploadIdentityKtp(userId, file);
    await load();
    setKtpUploading(false);
  };

  const handleSendOtp = async () => {
    setOtpError(null);
    if (!/^(\+?62|0)[0-9]{8,15}$/.test(phone.trim())) {
      setOtpError(t('Enter a valid Indonesian phone number.', 'Masukkan nomor HP Indonesia yang valid.'));
      return;
    }
    setOtpBusy(true);
    const res = await sendPhoneVerificationOtp(phone.trim());
    setOtpBusy(false);
    if (!res.ok) { setOtpError(res.error ?? t('Failed to send OTP.', 'Gagal mengirim OTP.')); return; }
    setOtpStep('sent');
  };

  const handleVerifyOtp = async () => {
    setOtpError(null);
    if (otpCode.trim().length !== 6) {
      setOtpError(t('Enter the 6-digit code.', 'Masukkan kode 6 digit.'));
      return;
    }
    setOtpBusy(true);
    const res = await verifyPhoneVerificationOtp(phone.trim(), otpCode.trim());
    setOtpBusy(false);
    if (!res.ok) { setOtpError(res.error ?? t('Invalid code.', 'Kode tidak valid.')); return; }
    setOtpStep('idle');
    setOtpCode('');
    await load();
  };

  if (loading) {
    return (
      <div className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-4 animate-pulse h-32" />
    );
  }

  const status = profile?.identity_status ?? 'UNSUBMITTED';
  const meta = STATUS_META[status];

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest pt-1">
        {t('Identity Verification', 'Verifikasi Identitas')}
      </p>

      {/* KTP status + upload */}
      <div className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.color}`}>
            <meta.Icon size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-ds-ink">{t('KTP Verification', 'Verifikasi KTP')}</p>
            <p className="text-xs text-ds-ink3">{t(meta.labelEn, meta.labelId)}</p>
          </div>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${meta.color}`}>
            {t(meta.labelEn, meta.labelId)}
          </span>
        </div>

        {status === 'REJECTED' && profile?.identity_reject_reason && (
          <div className="bg-rose-50 rounded-xl px-3 py-2.5 border border-rose-100">
            <p className="text-[9px] font-bold text-ds-red uppercase tracking-widest mb-1">{t('Rejection reason', 'Alasan penolakan')}</p>
            <p className="text-xs text-ds-ink2">{profile.identity_reject_reason}</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {profile?.ktp_document_url ? (
            <SecureDocLink url={profile.ktp_document_url} className="text-xs font-bold text-ds-blue underline">
              {t('View uploaded document', 'Lihat dokumen terupload')}
            </SecureDocLink>
          ) : (
            <p className="text-xs text-ds-ink3">{t('No document uploaded yet', 'Belum ada dokumen diupload')}</p>
          )}
          {status !== 'APPROVED' && status !== 'PENDING' && (
            <button
              onClick={() => ktpInputRef.current?.click()}
              disabled={ktpUploading}
              className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-ds-green text-white flex items-center gap-1.5 flex-shrink-0"
            >
              <Upload size={12} /> {ktpUploading ? t('Uploading...', 'Mengunggah...') : t('Upload', 'Unggah')}
            </button>
          )}
          <input ref={ktpInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleKtpChange} />
        </div>
        <p className="text-[9px] text-ds-ink3 leading-relaxed">
          {t(
            'Required before you can purchase a policy or submit a claim. Reviewed by our team, usually within 1x24 hours.',
            'Wajib sebelum Anda dapat membeli polis atau mengajukan klaim. Direview tim kami, biasanya dalam 1x24 jam.',
          )}
        </p>
      </div>

      {/* Lightweight checks: phone OTP + email */}
      <div className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-4 space-y-3">
        <p className="text-xs font-bold text-ds-ink">{t('Quick checks (optional)', 'Cek cepat (opsional)')}</p>

        {/* Email — read-only, derived from Supabase Auth */}
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${emailVerified ? 'bg-ds-green-tint text-ds-green' : 'bg-ds-card2 text-ds-ink3'}`}>
            <Mail size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-ds-ink truncate">{profile?.email}</p>
            <p className="text-[10px] text-ds-ink3">{emailVerified ? t('Email confirmed', 'Email terkonfirmasi') : t('Not confirmed', 'Belum terkonfirmasi')}</p>
          </div>
          {emailVerified && <CheckCircle2 size={16} className="text-ds-green flex-shrink-0" />}
        </div>

        {/* Phone OTP */}
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${profile?.phone_verified_at ? 'bg-ds-green-tint text-ds-green' : 'bg-ds-card2 text-ds-ink3'}`}>
            <Smartphone size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-ds-ink">{t('Phone number', 'Nomor HP')}</p>
            <p className="text-[10px] text-ds-ink3">
              {profile?.phone_verified_at ? t('Verified', 'Terverifikasi') : t('Not verified yet', 'Belum diverifikasi')}
            </p>
          </div>
        </div>

        {!profile?.phone_verified_at && (
          <div className="pl-11 space-y-2">
            {otpStep === 'idle' ? (
              <div className="flex gap-2">
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="flex-1 px-3 py-2 rounded-xl border border-ds-border bg-ds-card2 text-xs font-bold text-ds-ink"
                />
                <button
                  onClick={handleSendOtp}
                  disabled={otpBusy}
                  className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-ds-ink text-white flex-shrink-0"
                >
                  {otpBusy ? '...' : t('Send OTP', 'Kirim OTP')}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="flex-1 px-3 py-2 rounded-xl border border-ds-border bg-ds-card2 text-xs font-bold text-ds-ink tracking-[0.3em]"
                />
                <button
                  onClick={handleVerifyOtp}
                  disabled={otpBusy}
                  className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-ds-green text-white flex-shrink-0"
                >
                  {otpBusy ? '...' : t('Verify', 'Verifikasi')}
                </button>
              </div>
            )}
            {otpError && <p className="text-[10px] font-bold text-ds-red">{otpError}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default IdentityVerificationCard;
