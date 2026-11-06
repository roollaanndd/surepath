// B2BProfile — corporate account details, two-column dashboard layout.
// Form on the left, identity + status card on the right. Master-admin
// monitor view shows a single identity card with no form.

import React, { useState, useEffect } from 'react';
import { Loader2, Save, ShieldCheck, LayoutGrid, LogOut, Mail, Phone, Building2 } from 'lucide-react';
import { Language } from '../../types';
import { getB2BProfile, updateB2BProfile, type SpUser } from '../../services/supabaseService';
import { B2BGlass, B2BSectionHeader, B2BPill, B2BButton, useB2BToast } from './dashboard/ui';

interface Props {
  client: any;
  clientId: string;
  lang: Language;
  onLogout: () => void;
  masterView?: boolean;
}

const B2BProfile: React.FC<Props> = ({ client, clientId, lang, onLogout, masterView }) => {
  const t = (en: string, id: string) => (lang === Language.EN ? en : id);
  const toast = useB2BToast();

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
    setProfile(prev => (prev ? { ...prev, [key]: value } : prev));
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
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success(t('Profile saved successfully.', 'Profil berhasil tersimpan.'));
    } else {
      toast.error(t('Failed to save profile. Try again.', 'Gagal menyimpan profil. Coba lagi.'));
    }
  };

  const companyName = [profile?.company_name, client?.company_name]
    .find((n): n is string => typeof n === 'string' && n.trim().length > 0);
  const initials = (companyName ?? 'B2B')
    .trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || 'B2B';

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={24} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  /* ── Monitor view — Master Admin ──────────────────────────────────────── */
  if (masterView) {
    const adminName = client?.name || 'Master Admin';
    const adminInitials = adminName.trim().split(/\s+/).slice(0, 2)
      .map((w: string) => w[0] ?? '').join('').toUpperCase() || 'MA';
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <B2BGlass className="p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #4338ca, #4f46e5)',
                boxShadow: '0 12px 32px -12px rgba(67,56,202,0.5)',
              }}
            >
              {adminInitials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-xl text-slate-900" style={{ letterSpacing: '-0.02em' }}>{adminName}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{client?.email ?? ''}</p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-200">
                <ShieldCheck size={11} />
                {t('Master Admin · Monitor', 'Master Admin · Mode Pantau')}
              </div>
            </div>
          </div>
        </B2BGlass>

        <B2BGlass className="p-6">
          <B2BSectionHeader title={t('Monitor Scope', 'Lingkup Pantau')} />
          <p className="text-sm text-slate-600 leading-relaxed">
            {t(
              'You are viewing the B2B corporate portal as a monitor: all client submissions, quotes and bulk batches are visible under their tabs, without any client-side actions.',
              'Anda memantau portal korporat B2B: seluruh ajuan, penawaran, dan batch massal semua klien terlihat pada tab masing-masing, tanpa aksi sisi klien.',
            )}
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-4 pt-4 border-t border-slate-200/70">
            <LayoutGrid size={12} />
            {t('Use the floating switcher (bottom-left) to move between apps.',
               'Gunakan pengalih mengapung (kiri bawah) untuk berpindah aplikasi.')}
          </div>
        </B2BGlass>

        <div className="flex justify-end">
          <B2BButton variant="ghost" icon={LogOut} onClick={onLogout} className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 border-rose-200">
            {t('Log Out', 'Keluar')}
          </B2BButton>
        </div>
      </div>
    );
  }

  /* ── Client view — full form ──────────────────────────────────────────── */
  const inputClass = 'w-full px-4 py-2.5 rounded-xl text-sm text-slate-900 outline-none transition-colors';
  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.72)',
    border: '1px solid rgba(67,56,202,0.14)',
  };
  const labelClass = 'block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest';

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
      {/* Identity card — right column on desktop, top on mobile */}
      <aside className="lg:col-span-1 lg:order-last space-y-4">
        <B2BGlass className="p-6 text-center">
          <div
            className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center text-white text-xl font-black mb-4"
            style={{
              background: 'linear-gradient(135deg, #059669, #10b981)',
              boxShadow: '0 12px 32px -12px rgba(5,150,105,0.5)',
            }}
          >
            {initials}
          </div>
          <h2 className="font-black text-base text-slate-900" style={{ letterSpacing: '-0.015em' }}>
            {companyName ?? '—'}
          </h2>
          <div className="mt-2 flex justify-center">
            <B2BPill tone="accent">{t('B2B Client', 'Klien B2B')}</B2BPill>
          </div>
          <div className="mt-5 pt-5 border-t border-slate-200/70 space-y-2 text-left">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Mail size={12} className="text-slate-400 flex-shrink-0" />
              <span className="truncate">{profile?.email}</span>
            </div>
            {profile?.phone && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Phone size={12} className="text-slate-400 flex-shrink-0" />
                <span>{profile.phone}</span>
              </div>
            )}
            {profile?.company_industry && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Building2 size={12} className="text-slate-400 flex-shrink-0" />
                <span>{profile.company_industry}</span>
              </div>
            )}
          </div>
        </B2BGlass>

        <B2BButton
          variant="ghost"
          icon={LogOut}
          onClick={onLogout}
          className="w-full !text-rose-600 hover:!bg-rose-50 border-rose-200"
        >
          {t('Log Out', 'Keluar')}
        </B2BButton>
      </aside>

      {/* Form — left 2/3 */}
      <div className="lg:col-span-2">
        <B2BGlass className="p-6 lg:p-8">
          <B2BSectionHeader
            title={t('Account Details', 'Detail Akun')}
            subtitle={t('Update your company and PIC information.',
                        'Perbarui informasi perusahaan dan PIC.')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>{t('Company Name', 'Nama Perusahaan')}</label>
              <input
                className={inputClass}
                style={inputStyle}
                value={profile?.company_name ?? ''}
                onChange={e => update('company_name', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>{t('Company Reg No', 'No. Registrasi')}</label>
              <input
                className={inputClass}
                style={inputStyle}
                value={profile?.company_reg_no ?? ''}
                onChange={e => update('company_reg_no', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>{t('Industry', 'Industri')}</label>
              <input
                className={inputClass}
                style={inputStyle}
                value={profile?.company_industry ?? ''}
                onChange={e => update('company_industry', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 border-t border-slate-200/70 pt-4 mt-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {t('PIC Contact', 'Kontak PIC')}
              </span>
            </div>

            <div>
              <label className={labelClass}>{t('PIC Name', 'Nama PIC')}</label>
              <input
                className={inputClass}
                style={inputStyle}
                value={profile?.name ?? ''}
                onChange={e => update('name', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>{t('PIC Phone', 'Telepon PIC')}</label>
              <input
                className={inputClass}
                style={inputStyle}
                value={profile?.phone ?? ''}
                onChange={e => update('phone', e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>{t('Email (read-only)', 'Email (tidak dapat diubah)')}</label>
              <input
                className={`${inputClass} opacity-60 cursor-not-allowed`}
                style={inputStyle}
                value={profile?.email ?? ''}
                readOnly
              />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200/70 flex justify-end">
            <B2BButton
              variant={saved ? 'success' : 'primary'}
              icon={saving ? undefined : Save}
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {saved ? t('Saved!', 'Tersimpan!') : t('Save Changes', 'Simpan Perubahan')}
            </B2BButton>
          </div>
        </B2BGlass>
      </div>
    </div>
  );
};

export default B2BProfile;
