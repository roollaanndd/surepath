import React, { useState, useEffect, useRef } from 'react';
import {
  User, Mail, Phone, MapPin, ShieldCheck, BadgeCheck,
  Edit2, Save, X, LogOut, Copy, CheckCircle, 
  Trophy, Loader2, Network, RefreshCw, FileEdit,
  AlertCircle, Camera, Building2, ChevronRight,
} from 'lucide-react';
import { Language } from '../../types';
import { APP_VERSION } from '../../src/version';
import {
  getAgentProfile, updateAgentProfile, getAgentStats,
  uploadAgentAvatar, uploadAgentKtp,
  type SpUser, type AgentStats,
} from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';
import { SecureDocLink } from '../shared/SecureDoc';
import { useTierDefinitions, getTierByCode } from '../../hooks/useTierDefinitions';

interface Props {
  agent: any;
  agentId: string;
  lang: Language;
  onLogout: () => void;
  onNavigate?: (tab: string) => void;
  stats?: AgentStats | null;
  agentTier?: string | null;
}

const inputCls =
  'w-full rounded-xl border border-ds-border bg-ds-card2 px-4 py-3 text-ds-ink text-sm focus:outline-none focus:ring-2 focus:ring-ds-green transition';

const AgentProfile: React.FC<Props> = ({ agent, agentId, lang, onLogout, onNavigate, stats: statsProp, agentTier }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [profile, setProfile] = useState<SpUser | null>(null);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [ktpUploading, setKtpUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const ktpInputRef = useRef<HTMLInputElement>(null);
  const { tiers } = useTierDefinitions();

  const [form, setForm] = useState({ name: '', phone: '', address: '' });

  interface BankAccount { bank_code: string; account_number: string; account_holder_name: string; }
  const BANK_STORAGE_KEY = 'SUREPATH_SAVED_BANK';
  // FIX v1.42.0: use sessionStorage instead of localStorage for bank PII.
  const BANK_STORAGE: Storage | null = typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  const [savedAccount, setSavedAccount] = useState<BankAccount | null>(() => {
    try { return JSON.parse(BANK_STORAGE?.getItem(BANK_STORAGE_KEY) ?? 'null'); } catch { return null; }
  });
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankForm, setBankForm] = useState({ bank_code: '', account_number: '', account_holder_name: '' });

  const INDONESIAN_BANKS = ['BCA', 'BRI', 'BNI', 'Mandiri', 'CIMB Niaga', 'BSI', 'Permata'];

  const saveBankAccount = () => {
    if (!bankForm.bank_code || !bankForm.account_number || !bankForm.account_holder_name) return;
    BANK_STORAGE?.setItem(BANK_STORAGE_KEY, JSON.stringify(bankForm));
    setSavedAccount(bankForm);
    setShowBankForm(false);
    setBankForm({ bank_code: '', account_number: '', account_holder_name: '' });
  };

  const deleteBankAccount = () => {
    BANK_STORAGE?.removeItem(BANK_STORAGE_KEY);
    setSavedAccount(null);
  };

  useEffect(() => {
    if (!agentId) return;
    Promise.all([getAgentProfile(agentId), getAgentStats(agentId)]).then(
      ([prof, st]) => {
        if (prof) {
          setProfile(prof);
          setForm({ name: prof.name, phone: prof.phone, address: prof.address ?? '' });
        }
        setStats(statsProp ?? st);
        setLoading(false);
      },
    );
  }, [agentId, statsProp]);

  const handleSave = async () => {
    if (!agentId) return;
    setSaving(true);
    const ok = await updateAgentProfile(agentId, form);
    if (ok) {
      setProfile(prev => prev ? { ...prev, ...form } : prev);
      setEditing(false);
    }
    setSaving(false);
  };

  const handleCancel = () => {
    if (profile) setForm({ name: profile.name, phone: profile.phone, address: profile.address ?? '' });
    setEditing(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(profile?.agent_code ?? '').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    const url = await new Promise<string>(res => {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
          const s = Math.min(1, 400 / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * s);
          c.height = Math.round(img.height * s);
          c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', 0.82));
        };
        img.src = ev.target!.result as string;
      };
      reader.readAsDataURL(file);
    });
    const publicUrl = await uploadAgentAvatar(agentId, url);
    if (publicUrl) {
      setProfile(p => p ? { ...p, profile_photo_url: publicUrl } as any : p);
    }
    setAvatarUploading(false);
  };

  const handleKtpChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setKtpUploading(true);
    const url = await uploadAgentKtp(agentId, file);
    if (url) setProfile(p => p ? { ...p, ktp_document_url: url } as any : p);
    setKtpUploading(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-ds-green animate-spin motion-reduce:animate-none" />
        <p className="text-ds-ink3 text-sm">{t('Loading profile…', 'Memuat profil…')}</p>
      </div>
    );
  }

  const initials = (profile?.name ?? agent?.name ?? 'A')
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  const tierCode = agentTier ?? (profile as any)?.tier ?? (profile as any)?.agent_tier ?? agent?.tier ?? agent?.agent_tier;
  const tierDef = getTierByCode(tiers, tierCode);

  return (
    <div className="bg-ds-bg min-h-screen pb-28 font-sora">

      {/* Avatar + Name hero — bank-style gradient banner */}
      <div className="relative overflow-hidden px-5 pt-12 pb-7 text-center text-white"
        style={{ background: 'linear-gradient(150deg, #0B1120 0%, #0E3B2E 60%, #0B5E3B 100%)' }}>
        <div aria-hidden className="absolute -top-16 -right-12 w-56 h-56 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,193,106,0.25), transparent 70%)' }} />
        <svg aria-hidden className="absolute left-0 bottom-0 h-3/4 opacity-[0.10] pointer-events-none" viewBox="0 0 200 140" fill="none">
          <circle cx="10" cy="130" r="80" stroke="#fff" strokeWidth="1.2" />
          <circle cx="10" cy="130" r="52" stroke="#fff" strokeWidth="1.2" />
        </svg>
        <div className="relative z-10">
        <div className="relative w-20 h-20 mx-auto mb-3">
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto overflow-hidden relative ring-4 ring-white/15"
            style={{ background: 'linear-gradient(135deg, #00C16A, #047857)' }}
          >
            {(profile as any)?.profile_photo_url
              ? <img loading="lazy" src={(profile as any).profile_photo_url} alt="Avatar" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              : <span>{initials}</span>
            }
            {avatarUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin motion-reduce:animate-none" />
              </div>
            )}
            <div className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow">
              <Camera size={11} className="text-sp-emerald" />
            </div>
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        <h2 className="text-lg font-black text-white">{profile?.name ?? agent?.name}</h2>

        <div className="flex items-center justify-center gap-2 mt-1.5">
          <span className="inline-flex px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white/85 text-xs font-bold tracking-wider font-mono">
            {profile?.agent_code ?? agent?.agent_code}
          </span>
          <button onClick={copyCode} className="text-white/60 hover:text-white transition">
            {copied
              ? <CheckCircle className="w-3.5 h-3.5 text-ds-green" />
              : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-2.5 flex-wrap">
          {profile?.verified && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-sky-300 text-xs font-bold">
              <BadgeCheck className="w-3.5 h-3.5" />
              {t('Verified Partner', 'Mitra Terverifikasi')}
            </span>
          )}
          {tierDef && !tierDef.is_default && (
            <span
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border border-white/15 bg-white/10"
              style={{ color: tierDef.color }}
            >
              {tierDef.emoji} {tierDef.name}
            </span>
          )}
        </div>
        </div>
      </div>

      {/* Stats strip */}
      {stats && (
        <div className="flex bg-ds-card border-b border-ds-border">
          {[
            { value: stats.policiesCount, label: t('Policies', 'Polis') },
            { value: formatIDR(stats.totalCommissionAllTime), label: t('Total Earned', 'Total Komisi') },
            { value: stats.clientsCount, label: t('Clients', 'Klien') },
          ].map((item, i) => (
            <div key={i} className="flex-1 text-center px-2 py-4 border-r last:border-r-0 border-ds-border">
              <p className="text-sm font-black text-ds-ink font-mono">{item.value}</p>
              <p className="text-[10px] text-ds-ink3 font-bold mt-0.5 uppercase tracking-widest">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Referral Link */}
      <div className="mx-5 mt-4 sp-glass rounded-2xl p-4">
        <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest mb-2">Link Rekrutmen Mitra</p>
        <div className="flex items-center gap-2 bg-ds-card2 rounded-xl p-3">
          <p className="text-xs font-mono text-ds-ink2 flex-1 truncate">
            https://myinsurepath.com?ref={profile?.agent_code}
          </p>
          <button
            onClick={() => { navigator.clipboard.writeText(`https://myinsurepath.com?ref=${profile?.agent_code}`); }}
            className="text-ds-green hover:text-ds-green-dk transition"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[9px] text-ds-ink3 mt-2">Bagikan link ini untuk merekrut agen baru di bawah kamu.</p>
      </div>

      {/* Document Status */}
      <div className="mx-5 mt-4 rounded-2xl sp-glass overflow-hidden">
        <div className="px-5 py-3 border-b border-ds-border">
          <span className="text-[10px] font-bold uppercase tracking-widest text-ds-ink3">Status Dokumen</span>
        </div>
        <div className="divide-y divide-ds-border">
          {[
            { label: 'KTP', done: !!profile?.ktp },
            { label: 'Foto Profil', done: false },
            { label: 'Rekening Bank', done: false },
            { label: 'Verifikasi Admin', done: !!profile?.verified },
          ].map(doc => (
            <div key={doc.label} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm font-semibold text-ds-ink">{doc.label}</span>
              {doc.done
                ? <span className="flex items-center gap-1 text-xs font-black text-ds-green bg-ds-green-tint px-2.5 py-1 rounded-full"><CheckCircle className="w-3.5 h-3.5" /> Lengkap</span>
                : <span className="flex items-center gap-1 text-xs font-black text-ds-amber bg-amber-50 px-2.5 py-1 rounded-full"><AlertCircle className="w-3.5 h-3.5" /> Belum</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Nav */}
      {onNavigate && (
        <div className="mx-5 mt-4 rounded-2xl sp-glass overflow-hidden">
          {[
            { id: 'network', label: 'Jaringan Downline', icon: Network },
            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
            { id: 'renewals', label: 'Renewal Polis', icon: RefreshCw },
            { id: 'endorsements', label: 'Endorsement', icon: FileEdit },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex items-center gap-3 px-5 py-4 border-b last:border-b-0 border-ds-border active:bg-ds-card2 transition-colors w-full"
            >
              <div className="w-8 h-8 rounded-xl bg-ds-card2 border border-ds-border flex items-center justify-center text-ds-ink2 flex-shrink-0">
                <item.icon size={16} />
              </div>
              <span className="text-sm font-medium text-ds-ink flex-1 text-left">{item.label}</span>
              <ChevronRight size={16} className="text-ds-ink3" />
            </button>
          ))}
        </div>
      )}

      {/* Profile Info */}
      <div className="mx-5 mt-4 rounded-2xl sp-glass overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-ds-border">
          <span className="text-[10px] font-bold uppercase tracking-widest text-ds-ink3">
            {t('Personal Info', 'Informasi Pribadi')}
          </span>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-ds-green hover:text-ds-green-dk transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
              {t('Edit', 'Ubah')}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="p-1.5 rounded-xl bg-ds-card2 border border-ds-border text-ds-ink2 hover:text-ds-ink transition"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ds-green text-white text-xs font-bold shadow-ds-green disabled:opacity-50 hover:bg-ds-green-dk transition active:scale-95"
              >
                {saving
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Save className="w-3.5 h-3.5" />}
                {t('Save', 'Simpan')}
              </button>
            </div>
          )}
        </div>

        <div className="divide-y divide-ds-border">
          {/* Name */}
          <div className="flex items-start gap-3 px-5 py-4">
            <User className="w-4 h-4 text-ds-ink3 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ds-ink3 mb-1">
                {t('Full Name', 'Nama Lengkap')}
              </p>
              {editing ? (
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className={inputCls}
                />
              ) : (
                <p className="text-sm font-semibold text-ds-ink truncate">{profile?.name}</p>
              )}
            </div>
          </div>

          {/* Email — read-only */}
          <div className="flex items-start gap-3 px-5 py-4">
            <Mail className="w-4 h-4 text-ds-ink3 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ds-ink3 mb-1">
                {t('Email', 'Email')}
              </p>
              <p className="text-sm font-semibold text-ds-ink truncate">
                {profile?.email ?? agent?.email}
              </p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-start gap-3 px-5 py-4">
            <Phone className="w-4 h-4 text-ds-ink3 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ds-ink3 mb-1">
                {t('Phone', 'Nomor HP')}
              </p>
              {editing ? (
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className={inputCls}
                />
              ) : (
                <p className="text-sm font-semibold text-ds-ink">{profile?.phone}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-3 px-5 py-4">
            <MapPin className="w-4 h-4 text-ds-ink3 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ds-ink3 mb-1">
                {t('Address', 'Alamat')}
              </p>
              {editing ? (
                <textarea
                  value={form.address}
                  onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  className={`${inputCls} resize-none`}
                  rows={2}
                  placeholder={t('Your address…', 'Alamat Anda…')}
                />
              ) : (
                <p className="text-sm font-semibold text-ds-ink">
                  {profile?.address || <span className="text-ds-ink3 font-normal italic">{t('Not set', 'Belum diisi')}</span>}
                </p>
              )}
            </div>
          </div>

          {/* KTP — read-only */}
          {profile?.ktp && (
            <div className="flex items-start gap-3 px-5 py-4">
              <ShieldCheck className="w-4 h-4 text-ds-ink3 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-ds-ink3 mb-1">
                  {t('ID Number (KTP)', 'Nomor KTP')}
                </p>
                <p className="text-sm font-semibold text-ds-ink font-mono tracking-widest">
                  {profile.ktp.replace(/(.{4})/g, '$1 ').trim()}
                </p>
              </div>
            </div>
          )}

          {/* KTP Document Upload */}
          <div className="flex items-center justify-between px-5 py-3">
            <div>
              <p className="text-xs font-black text-ds-ink">Foto KTP</p>
              <p className="text-[10px] text-ds-ink3 font-bold">
                {(profile as any)?.ktp_document_url ? '✓ Dokumen terupload' : '⚠ Belum diupload — Wajib'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(profile as any)?.ktp_document_url && (
                <SecureDocLink url={(profile as any).ktp_document_url}
                   className="text-[10px] font-black text-ds-blue underline">Lihat</SecureDocLink>
              )}
              <button
                onClick={() => ktpInputRef.current?.click()}
                disabled={ktpUploading}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  (profile as any)?.ktp_document_url
                    ? 'bg-ds-card2 border border-ds-border text-ds-ink3'
                    : 'bg-rose-50 text-ds-red border border-rose-200'
                }`}
              >
                {ktpUploading ? '...' : (profile as any)?.ktp_document_url ? 'Ganti' : 'Upload'}
              </button>
              <input ref={ktpInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleKtpChange} />
            </div>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="mx-5 mt-4 grid grid-cols-2 gap-3">
        <div className="sp-glass rounded-2xl p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-ds-ink3 mb-1">Bergabung</p>
          <p className="text-sm font-black text-ds-ink">
            {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'}) : '—'}
          </p>
        </div>
        <div className="sp-glass rounded-2xl p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-ds-ink3 mb-1">Status</p>
          <span className={`text-xs font-black px-2.5 py-1 rounded-full ${(profile as any)?.verified ? 'bg-ds-green-tint text-ds-green' : 'bg-amber-50 text-ds-amber'}`}>
            {(profile as any)?.verified ? 'Terverifikasi' : 'Pending'}
          </span>
        </div>
        <div className="sp-glass rounded-2xl p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-ds-ink3 mb-1">Kode Referral</p>
          <button
            onClick={() => { navigator.clipboard.writeText(agent?.agent_code ?? profile?.agent_code ?? ''); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="text-xs font-black text-ds-green flex items-center gap-1"
          >
            {agent?.agent_code ?? profile?.agent_code ?? '—'} {copied ? '✓' : <Copy size={10} />}
          </button>
        </div>
        <div className="sp-glass rounded-2xl p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-ds-ink3 mb-1">Downline</p>
          <p className="text-sm font-black text-ds-ink">{(profile as any)?.downline_count ?? 0}</p>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="mx-5 mt-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-ds-ink3 mb-3">Performa</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="sp-glass rounded-2xl p-4 text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-ds-ink3 mb-1">Komisi Bulan Ini</p>
            <p className="text-base font-black text-ds-green">
              {stats ? `Rp ${(stats.totalCommissionMonth/1000000).toFixed(1)}jt` : '—'}
            </p>
          </div>
          <div className="sp-glass rounded-2xl p-4 text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-ds-ink3 mb-1">Total Klien</p>
            <p className="text-base font-black text-ds-ink">{stats?.clientsCount ?? '—'}</p>
          </div>
          <div className="sp-glass rounded-2xl p-4 text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-ds-ink3 mb-1">Polis Aktif</p>
            <p className="text-base font-black text-ds-ink">{stats?.policiesCount ?? '—'}</p>
          </div>
          <div className="sp-glass rounded-2xl p-4 text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-ds-ink3 mb-1">Total Komisi</p>
            <p className="text-base font-black text-ds-blue">
              {stats ? `Rp ${(stats.totalCommissionAllTime/1000000).toFixed(1)}jt` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Bank Account */}
      <div className="mx-5 mt-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-ds-ink3 mb-3">Rekening Bank</p>
        {savedAccount ? (
          <div className="sp-glass rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-ds-blue" />
              <div>
                <p className="text-xs font-black text-ds-ink">{savedAccount.bank_code} — {savedAccount.account_number}</p>
                <p className="text-[10px] text-ds-ink3 font-bold">{savedAccount.account_holder_name}</p>
              </div>
            </div>
            <button onClick={deleteBankAccount} className="text-ds-red text-[10px] font-black">Hapus</button>
          </div>
        ) : (
          <button onClick={() => setShowBankForm(true)}
            className="w-full py-3 rounded-2xl border border-dashed border-ds-border bg-ds-card text-[10px] font-black uppercase tracking-widest text-ds-ink3 hover:border-ds-green hover:text-ds-green transition-all">
            + Tambah Rekening Bank
          </button>
        )}
      </div>

      {/* Bank Form Modal */}
      {showBankForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowBankForm(false)}>
          <div className="bg-ds-card rounded-t-[2rem] w-full max-w-lg p-6 pb-10 space-y-4 border-t border-ds-border shadow-ds-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-black text-ds-ink">Tambah Rekening Bank</p>
              <button onClick={() => setShowBankForm(false)}>
                <X className="w-5 h-5 text-ds-ink3" />
              </button>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-ds-ink3 block mb-1">Bank</label>
              <select value={bankForm.bank_code} onChange={e => setBankForm(p => ({ ...p, bank_code: e.target.value }))} className={inputCls}>
                <option value="">— Pilih Bank —</option>
                {INDONESIAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-ds-ink3 block mb-1">Nomor Rekening</label>
              <input type="text" value={bankForm.account_number} onChange={e => setBankForm(p => ({ ...p, account_number: e.target.value }))} className={inputCls} placeholder="1234567890" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-ds-ink3 block mb-1">Nama Pemilik Rekening</label>
              <input type="text" value={bankForm.account_holder_name} onChange={e => setBankForm(p => ({ ...p, account_holder_name: e.target.value }))} className={inputCls} placeholder="Nama sesuai buku tabungan" />
            </div>
            <button
              onClick={saveBankAccount}
              disabled={!bankForm.bank_code || !bankForm.account_number || !bankForm.account_holder_name}
              className="w-full py-3.5 rounded-xl bg-ds-green text-white font-black text-xs uppercase tracking-widest shadow-ds-green disabled:opacity-40 hover:bg-ds-green-dk transition active:scale-95"
            >
              Simpan Rekening
            </button>
          </div>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={onLogout}
        className="mx-5 mt-4 w-full h-12 rounded-xl border border-rose-200 bg-rose-50 text-ds-red font-semibold text-sm active:bg-rose-100 transition-all flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        {t('Sign Out', 'Keluar')}
      </button>
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.25em] text-ds-ink3 mt-4 pb-2">
        SurePath · v{APP_VERSION}
      </p>
    </div>
  );
};

export default AgentProfile;
