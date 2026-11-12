import React, { useState, useEffect } from 'react';
import { SurePathLogo } from './Navbar';
import { RoleScene } from './shared/SurePathPremiumIcon';
import { UserRole } from '../types';
import { ensureProfile, createB2BClientProfile, applyReferralCode } from '../services/supabaseService';

type Role = 'CUSTOMER' | 'AGENT' | 'B2B_CLIENT';

interface Props {
  // Any authenticated user who has no profile yet — Google OAuth, email OTP,
  // or any other sign-in that carries no account type. Formerly `oauthUser`,
  // which under-described it: the picker is the single place where a brand-new
  // account's type is decided, whatever the sign-in method.
  authUser: {
    id: string;
    name: string;
    email: string;
  };
  onComplete: (user: any) => void;
  onCancel: () => void;
}

const ROLE_CARDS = [
  {
    role: 'CUSTOMER' as Role,
    title: 'Nasabah',
    description: 'Beli asuransi untuk diri sendiri dan keluarga',
    // Aureate Emerald premium artwork — same family as every nav icon, so the
    // first screen a new account sees already speaks the brand's icon language.
    icon: <RoleScene role="CUSTOMER" size={52} />,
  },
  {
    role: 'AGENT' as Role,
    title: 'Mitra',
    description: 'Jual asuransi dan dapatkan komisi',
    icon: <RoleScene role="AGENT" size={52} />,
  },
  {
    role: 'B2B_CLIENT' as Role,
    title: 'Klien Korporat',
    description: 'Solusi asuransi untuk bisnis dan karyawan',
    icon: <RoleScene role="B2B_CLIENT" size={52} />,
  },
];

const RoleSelectionScreen: React.FC<Props> = ({ authUser, onComplete, onCancel }) => {
  const [selected, setSelected] = useState<Role | null>(null);
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refCode, setRefCode] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('SUREPATH_REF') ?? '';
    setRefCode(stored);
  }, []);

  const handleConfirm = async () => {
    if (!selected) return;
    if (!phone.trim()) { setError('Nomor HP wajib diisi'); return; }
    if (selected === 'B2B_CLIENT' && !companyName.trim()) { setError('Nama perusahaan wajib diisi'); return; }

    setLoading(true);
    setError('');

    try {
      let profile: any = null;

      if (selected === 'CUSTOMER') {
        // referral_code links this user to the upline who shared the ?ref= link
        profile = await ensureProfile({
          name: authUser.name,
          phone: phone.trim(),
          role: 'CUSTOMER',
          referral_code: refCode || null,
        });
        if (profile && refCode) localStorage.removeItem('SUREPATH_REF');
      } else if (selected === 'AGENT') {
        profile = await ensureProfile({
          name: authUser.name,
          phone: phone.trim(),
          role: 'AGENT',
          referral_code: refCode || null,
        });
        // Fallback: if the profile already existed (ensure_profile no-op),
        // apply the referral via the gateway so the upline still links.
        if (profile && refCode) {
          if (!profile.upline_id) await applyReferralCode(profile.id, refCode);
          localStorage.removeItem('SUREPATH_REF');
        }
      } else {
        profile = await createB2BClientProfile({
          id: authUser.id,
          name: authUser.name,
          email: authUser.email,
          phone: phone.trim(),
          company_name: companyName.trim(),
        });
      }

      if (!profile) {
        setError('Gagal membuat akun. Periksa koneksi internet Anda atau coba lagi. Jika masalah berlanjut, hubungi dukungan.');
        setLoading(false);
        return;
      }

      // ROLE STICKINESS: the server may have returned an EXISTING profile with
      // a different role than the user just clicked (e.g. this sign-in is for
      // an account that already registered as AGENT — we must never
      // downgrade them to CUSTOMER just because they picked wrong here).
      // `__existed` is set by ensureProfile from the server's `existed` flag.
      // For B2B (createB2BClientProfile) it's undefined; that path always
      // inserts a fresh row so the picked role is the created role.
      if (profile.__existed && selected !== 'B2B_CLIENT' && profile.role !== selected) {
        const wasLabel = profile.role === 'AGENT' ? 'Mitra' : profile.role === 'CUSTOMER' ? 'Nasabah' : profile.role;
        setError(`Akun ini sudah terdaftar sebagai ${wasLabel}. Kami masukkan kamu ke aplikasi ${wasLabel}.`);
        // Small pause so the user sees WHY they're going somewhere other than
        // what they clicked. Then honor the server's stored role.
        await new Promise(r => setTimeout(r, 1200));
      }

      onComplete({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role as UserRole,
        supabaseId: profile.id,
        nodeId: profile.agent_code ?? `SP-${profile.id.slice(0, 8).toUpperCase()}`,
        trustScore: profile.trust_score ?? 85,
        allowed_apps: profile.allowed_apps ?? null,
      });
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 py-12 font-sora">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <SurePathLogo className="w-6 h-6" />
        </div>
        <span className="text-2xl font-bold text-white text-center mb-2" style={{ letterSpacing: '-0.03em' }}>
          Sure<span className="text-emerald-400">Path</span>
        </span>
      </div>

      {/* Title */}
      <p className="text-sm text-gray-400 text-center mb-8">
        Pilih tipe akun kamu. Tidak bisa diubah setelah pendaftaran.
      </p>

      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Role cards */}
        <div className="flex flex-col">
          {ROLE_CARDS.map(card => (
            <button
              key={card.role}
              onClick={() => { setSelected(card.role); setError(''); }}
              className={
                selected === card.role
                  ? 'w-full rounded-2xl border-2 border-emerald-500 bg-emerald-500/10 p-5 cursor-pointer transition-all text-left mb-3'
                  : 'w-full rounded-2xl border border-white/10 bg-white/5 p-5 cursor-pointer active:bg-white/10 transition-all text-left mb-3'
              }
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-3">
                {card.icon}
              </div>
              <p className="text-base font-bold text-white">{card.title}</p>
              <p className="text-sm text-gray-400 mt-1">{card.description}</p>
            </button>
          ))}
        </div>

        {/* Extra fields when role is selected */}
        {selected && (
          <div className="flex flex-col gap-2.5 mb-4">
            <div>
              <label className="block text-[0.7rem] text-white/55 mb-1.5">
                Nomor HP
              </label>
              <input
                type="tel"
                placeholder="08xx xxxx xxxx"
                value={phone}
                onChange={e => { setPhone(e.target.value); setError(''); }}
                className="w-full h-12 px-4 rounded-xl border border-white/10 bg-white/5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all mt-3"
              />
            </div>

            {selected === 'B2B_CLIENT' && (
              <div>
                <label className="block text-[0.7rem] text-white/55 mb-1.5">
                  Nama Perusahaan
                </label>
                <input
                  type="text"
                  placeholder="PT. Contoh Perusahaan"
                  value={companyName}
                  onChange={e => { setCompanyName(e.target.value); setError(''); }}
                  className="w-full h-12 px-4 rounded-xl border border-white/10 bg-white/5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all mt-3"
                />
              </div>
            )}

            {selected === 'AGENT' && (
              <div className="flex flex-col gap-2">
                {refCode && (
                  <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-300 shrink-0" aria-hidden="true">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <p className="text-emerald-300/90 text-[0.68rem] m-0">
                      Referral dari mitra <strong>{refCode}</strong> akan otomatis terhubung.
                    </p>
                  </div>
                )}
                <div className="px-3 py-2 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
                  <p className="text-emerald-400/80 text-[0.68rem] m-0 leading-relaxed">
                    Akun mitra perlu diverifikasi admin sebelum bisa digunakan.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-red-400 text-[0.72rem] mb-3 text-center">
            {error}
          </p>
        )}

        <button
          onClick={handleConfirm}
          disabled={!selected || loading}
          className="w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all mt-4 disabled:opacity-40"
        >
          {loading ? 'Memproses…' : 'Daftar Sekarang'}
        </button>

        <button
          onClick={onCancel}
          className="w-full mt-2.5 py-2.5 rounded-xl bg-transparent text-white/35 font-medium text-sm border border-white/10 transition-all"
        >
          Batal
        </button>
      </div>

      <p className="text-white/15 text-[0.6rem] mt-5 text-center">
        Masuk sebagai: {authUser.email}
      </p>
    </div>
  );
};

export default RoleSelectionScreen;
