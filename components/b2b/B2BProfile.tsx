import React, { useState, useEffect } from 'react';
import { Loader2, LogOut, Save } from 'lucide-react';
import { Language } from '../../types';
import { getB2BProfile, updateB2BProfile, type SpUser } from '../../services/supabaseService';

interface Props {
  client: any;
  clientId: string;
  lang: Language;
  onLogout: () => void;
}

const INPUT = 'w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40';
const LABEL = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider';

const B2BProfile: React.FC<Props> = ({ client, clientId, lang, onLogout }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [profile, setProfile] = useState<SpUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    getB2BProfile(clientId).then(data => {
      setProfile(data ?? {
        id: clientId,
        name: client?.name ?? '',
        email: client?.email ?? '',
        phone: client?.phone ?? '',
        role: 'B2B_CLIENT',
        company_name: client?.company_name ?? '',
        company_reg_no: client?.company_reg_no ?? '',
        company_industry: client?.company_industry ?? '',
      });
      setLoading(false);
    });
  }, [clientId]);

  const update = (key: keyof SpUser, value: string) => {
    setProfile(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const ok = await updateB2BProfile(clientId, {
      name: profile.name,
      phone: profile.phone,
      company_name: profile.company_name,
      company_reg_no: profile.company_reg_no,
      company_industry: profile.company_industry,
    });
    setSaving(false);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  const initials = (profile?.company_name ?? client?.company_name ?? 'B2B')
    .split(' ').slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase();

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={28} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500 flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-orange-500/25">
          {initials}
        </div>
        <div className="text-center">
          <div className="font-black text-base">{profile?.company_name ?? '—'}</div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{profile?.email}</div>
        </div>
      </div>

      {/* Fields */}
      <div className="rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 p-4 space-y-4">
        <div>
          <label className={LABEL}>{t('Company Name', 'Nama Perusahaan')}</label>
          <input
            className={INPUT}
            value={profile?.company_name ?? ''}
            onChange={e => update('company_name', e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL}>{t('Company Reg No', 'No. Registrasi Perusahaan')}</label>
          <input
            className={INPUT}
            value={profile?.company_reg_no ?? ''}
            onChange={e => update('company_reg_no', e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL}>{t('Industry', 'Industri')}</label>
          <input
            className={INPUT}
            value={profile?.company_industry ?? ''}
            onChange={e => update('company_industry', e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL}>{t('PIC Name', 'Nama PIC')}</label>
          <input
            className={INPUT}
            value={profile?.name ?? ''}
            onChange={e => update('name', e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL}>{t('PIC Phone', 'Telepon PIC')}</label>
          <input
            className={INPUT}
            value={profile?.phone ?? ''}
            onChange={e => update('phone', e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL}>{t('Email (read-only)', 'Email (tidak dapat diubah)')}</label>
          <input
            className={`${INPUT} opacity-60 cursor-not-allowed`}
            value={profile?.email ?? ''}
            readOnly
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-500 text-white font-black text-sm shadow-lg shadow-orange-500/25 disabled:opacity-60"
      >
        {saving
          ? <Loader2 size={16} className="animate-spin" />
          : <Save size={16} />
        }
        {saved ? t('Saved!', 'Tersimpan!') : t('Save Changes', 'Simpan Perubahan')}
      </button>

      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-rose-200 dark:border-rose-500/30 text-rose-500 font-black text-sm"
      >
        <LogOut size={16} />
        {t('Log Out', 'Keluar')}
      </button>
    </div>
  );
};

export default B2BProfile;
