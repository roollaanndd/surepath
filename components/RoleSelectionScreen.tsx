import React, { useState, useEffect } from 'react';
import { SurePathLogo } from './Navbar';
import { UserRole } from '../types';
import { registerAgent, createCustomerProfile, createB2BClientProfile, applyReferralCode } from '../services/supabaseService';

type Role = 'CUSTOMER' | 'AGENT' | 'B2B_CLIENT';

interface Props {
  oauthUser: {
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
    subtitle: 'Personal',
    description: 'Beli asuransi untuk diri sendiri dan keluarga',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.25)',
  },
  {
    role: 'AGENT' as Role,
    title: 'Agen',
    subtitle: 'Asuransi',
    description: 'Jual asuransi dan dapatkan komisi',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
    color: '#06e000',
    bg: 'rgba(6,224,0,0.08)',
    border: 'rgba(6,224,0,0.25)',
  },
  {
    role: 'B2B_CLIENT' as Role,
    title: 'Klien Korporat',
    subtitle: 'Perusahaan',
    description: 'Solusi asuransi untuk bisnis dan karyawan',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    ),
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.08)',
    border: 'rgba(168,85,247,0.25)',
  },
];

const RoleSelectionScreen: React.FC<Props> = ({ oauthUser, onComplete, onCancel }) => {
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
      let profile = null;

      if (selected === 'CUSTOMER') {
        profile = await createCustomerProfile({
          id: oauthUser.id,
          name: oauthUser.name,
          email: oauthUser.email,
          phone: phone.trim(),
        });
      } else if (selected === 'AGENT') {
        profile = await registerAgent({
          name: oauthUser.name,
          email: oauthUser.email,
          phone: phone.trim(),
        });
        // Link to upline if a referral code was stored from the landing URL
        if (profile && refCode) {
          await applyReferralCode(profile.id, refCode);
          localStorage.removeItem('SUREPATH_REF');
        }
      } else {
        profile = await createB2BClientProfile({
          id: oauthUser.id,
          name: oauthUser.name,
          email: oauthUser.email,
          phone: phone.trim(),
          company_name: companyName.trim(),
        });
      }

      if (!profile) {
        setError('Gagal membuat akun. Coba lagi.');
        setLoading(false);
        return;
      }

      onComplete({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role as UserRole,
        supabaseId: profile.id,
        nodeId: profile.agent_code ?? `SP-${profile.id.slice(0, 8).toUpperCase()}`,
        trustScore: profile.trust_score ?? 85,
      });
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
      setLoading(false);
    }
  };

  const needsExtra = selected === 'AGENT' || selected === 'B2B_CLIENT';

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#060a09',
        fontFamily: "'Sora', sans-serif",
        padding: '24px 16px',
        boxSizing: 'border-box',
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(6,224,0,0.08)', border: '1px solid rgba(6,224,0,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SurePathLogo className="w-6 h-6" />
        </div>
        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.03em' }}>
          Sure<span style={{ color: '#06e000' }}>Path</span>
        </span>
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: 400, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24 }}>
        <h2 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px' }}>
          Daftar sebagai
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', margin: '0 0 20px' }}>
          Pilih tipe akun kamu. Tidak bisa diubah setelah pendaftaran.
        </p>

        {/* Role cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {ROLE_CARDS.map(card => (
            <button
              key={card.role}
              onClick={() => { setSelected(card.role); setError(''); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                borderRadius: 14,
                border: `1.5px solid ${selected === card.role ? card.border : 'rgba(255,255,255,0.08)'}`,
                background: selected === card.role ? card.bg : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                outline: 'none',
              }}
            >
              <div style={{ color: card.color, flexShrink: 0 }}>{card.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 600 }}>
                  {card.title}
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, marginLeft: 6, fontSize: '0.75rem' }}>
                    · {card.subtitle}
                  </span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem', marginTop: 2 }}>
                  {card.description}
                </div>
              </div>
              {/* Radio indicator */}
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${selected === card.role ? card.color : 'rgba(255,255,255,0.20)'}`,
                background: selected === card.role ? card.color : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>
                {selected === card.role && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#000' }} />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Extra fields when role is selected */}
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem', marginBottom: 6 }}>
                Nomor HP
              </label>
              <input
                type="tel"
                placeholder="08xx xxxx xxxx"
                value={phone}
                onChange={e => { setPhone(e.target.value); setError(''); }}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
                  fontFamily: "'Sora', sans-serif",
                }}
              />
            </div>

            {selected === 'B2B_CLIENT' && (
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem', marginBottom: 6 }}>
                  Nama Perusahaan
                </label>
                <input
                  type="text"
                  placeholder="PT. Contoh Perusahaan"
                  value={companyName}
                  onChange={e => { setCompanyName(e.target.value); setError(''); }}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
                    fontFamily: "'Sora', sans-serif",
                  }}
                />
              </div>
            )}

            {selected === 'AGENT' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {refCode && (
                  <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.20)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1rem' }}>🔗</span>
                    <p style={{ color: 'rgba(147,197,253,0.9)', fontSize: '0.68rem', margin: 0 }}>
                      Referral dari agen <strong>{refCode}</strong> akan otomatis terhubung.
                    </p>
                  </div>
                )}
                <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(6,224,0,0.06)', border: '1px solid rgba(6,224,0,0.15)' }}>
                  <p style={{ color: 'rgba(6,224,0,0.8)', fontSize: '0.68rem', margin: 0, lineHeight: 1.5 }}>
                    Akun agen perlu diverifikasi admin sebelum bisa digunakan.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <p style={{ color: '#f87171', fontSize: '0.72rem', margin: '0 0 12px', textAlign: 'center' }}>
            {error}
          </p>
        )}

        <button
          onClick={handleConfirm}
          disabled={!selected || loading}
          style={{
            width: '100%', padding: '13px', borderRadius: 12,
            background: selected ? 'hsl(119,99%,46%)' : 'rgba(255,255,255,0.08)',
            color: selected ? '#000' : 'rgba(255,255,255,0.25)',
            fontWeight: 700, fontSize: '0.875rem', cursor: selected ? 'pointer' : 'not-allowed',
            border: 'none', fontFamily: "'Sora', sans-serif",
            transition: 'all 0.15s',
          }}
        >
          {loading ? 'Memproses…' : 'Daftar Sekarang'}
        </button>

        <button
          onClick={onCancel}
          style={{
            width: '100%', marginTop: 10, padding: '11px', borderRadius: 12,
            background: 'transparent', color: 'rgba(255,255,255,0.35)',
            fontWeight: 500, fontSize: '0.8rem', cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'Sora', sans-serif",
          }}
        >
          Batal
        </button>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.6rem', marginTop: 20, textAlign: 'center' }}>
        Masuk sebagai: {oauthUser.email}
      </p>
    </div>
  );
};

export default RoleSelectionScreen;
