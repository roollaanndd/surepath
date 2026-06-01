import React, { useState, useEffect, useRef } from 'react';
import {
  User, Mail, Phone, MapPin, ShieldCheck, BadgeCheck,
  Edit2, Save, X, LogOut, Copy, CheckCircle, Wallet,
  FileText, Trophy, Loader2, Network, RefreshCw, FileEdit,
  AlertCircle, Camera,
} from 'lucide-react';
import { Language } from '../../types';
import {
  getAgentProfile, updateAgentProfile, getAgentStats,
  uploadAgentAvatar, uploadAgentKtp,
  type SpUser, type AgentStats,
} from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';

interface Props {
  agent: any;
  agentId: string;
  lang: Language;
  onLogout: () => void;
  onNavigate?: (tab: string) => void;
  stats?: AgentStats | null;
}

const inputCls =
  'w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition';

const AgentProfile: React.FC<Props> = ({ agent, agentId, lang, onLogout, onNavigate, stats: statsProp }) => {
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

  const [form, setForm] = useState({ name: '', phone: '', address: '' });

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
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        <p className="text-slate-400 text-sm">{t('Loading profile…', 'Memuat profil…')}</p>
      </div>
    );
  }

  const initials = (profile?.name ?? agent?.name ?? 'A')
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5 pb-32">
      {/* Avatar + Name */}
      <div className="flex flex-col items-center gap-3 pt-2 pb-4">
        <div className="relative w-20 h-20 mx-auto mb-2">
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="w-20 h-20 rounded-full overflow-hidden bg-primary-500/20 flex items-center justify-center relative"
          >
            {(profile as any)?.profile_photo_url
              ? <img src={(profile as any).profile_photo_url} alt="Avatar" className="w-full h-full object-cover" />
              : <span className="text-2xl font-black text-primary-500">{initials}</span>
            }
            {avatarUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
              <Camera size={10} className="text-white" />
            </div>
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div className="text-center">
          <h2 className="font-black text-xl text-slate-800 dark:text-white leading-tight">
            {profile?.name ?? agent?.name}
          </h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {profile?.agent_code ?? agent?.agent_code}
            </span>
            <button onClick={copyCode} className="text-slate-400 hover:text-primary-500 transition">
              {copied
                ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          {profile?.verified && (
            <div className="flex items-center justify-center gap-1 mt-1.5">
              <BadgeCheck className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-blue-500">
                {t('Verified Agent', 'Agen Terverifikasi')}
              </span>
            </div>
          )}
          {(() => {
            const tier = (profile as any)?.tier ?? (profile as any)?.agent_tier ?? agent?.tier ?? agent?.agent_tier;
            return tier ? (
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-sm">{tier === 'ELITE' ? '💎' : '⭐'}</span>
                <span className={`text-xs font-black ${tier === 'ELITE' ? 'text-purple-500' : 'text-amber-500'}`}>
                  {tier === 'ELITE' ? 'Agen Elite' : 'Agen Bintang'}
                </span>
              </div>
            ) : null;
          })()}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 p-3 text-center">
            <FileText className="w-5 h-5 text-primary-500 mx-auto mb-1" />
            <p className="font-black text-lg text-slate-800 dark:text-white leading-none">
              {stats.policiesCount}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">
              {t('Policies', 'Polis')}
            </p>
          </div>
          <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 p-3 text-center">
            <Wallet className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className="font-black text-sm text-slate-800 dark:text-white leading-none">
              {formatIDR(stats.totalCommissionAllTime)}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">
              {t('Total Earned', 'Total Komisi')}
            </p>
          </div>
          <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 p-3 text-center">
            <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="font-black text-lg text-slate-800 dark:text-white leading-none">
              {stats.clientsCount}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">
              {t('Clients', 'Klien')}
            </p>
          </div>
        </div>
      )}

      {/* Referral Link */}
      <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Link Rekrutmen Agen</p>
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-black/20 rounded-xl p-3">
          <p className="text-xs font-mono text-slate-600 dark:text-slate-300 flex-1 truncate">
            https://myinsurepath.com?ref={profile?.agent_code}
          </p>
          <button
            onClick={() => { navigator.clipboard.writeText(`https://myinsurepath.com?ref=${profile?.agent_code}`); }}
            className="text-primary-500 hover:text-primary-600 transition"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[9px] text-slate-400 mt-2">Bagikan link ini untuk merekrut agen baru di bawah kamu.</p>
      </div>

      {/* Document Status */}
      <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10">
          <span className="text-xs font-black uppercase tracking-widest text-slate-500">Status Dokumen</span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {[
            { label: 'KTP', done: !!profile?.ktp },
            { label: 'Foto Profil', done: false },
            { label: 'Rekening Bank', done: false },
            { label: 'Verifikasi Admin', done: !!profile?.verified },
          ].map(doc => (
            <div key={doc.label} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{doc.label}</span>
              {doc.done
                ? <span className="flex items-center gap-1 text-xs font-black text-emerald-500"><CheckCircle className="w-4 h-4" /> Lengkap</span>
                : <span className="flex items-center gap-1 text-xs font-black text-amber-500"><AlertCircle className="w-4 h-4" /> Belum</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Nav */}
      {onNavigate && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'network', label: 'Jaringan Downline', icon: Network, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { id: 'renewals', label: 'Renewal Polis', icon: RefreshCw, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { id: 'endorsements', label: 'Endorsement', icon: FileEdit, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 dark:border-white/10 bg-white dark:bg-white/5 active:scale-95 transition-all"
            >
              <div className={`w-9 h-9 ${item.bg} ${item.color} rounded-xl flex items-center justify-center`}>
                <item.icon size={16} />
              </div>
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 text-left leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Profile Info */}
      <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/10">
          <span className="text-xs font-black uppercase tracking-widest text-slate-500">
            {t('Personal Info', 'Informasi Pribadi')}
          </span>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-primary-500 hover:text-primary-600 transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
              {t('Edit', 'Ubah')}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-500 text-white text-xs font-bold disabled:opacity-50 transition"
              >
                {saving
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Save className="w-3.5 h-3.5" />}
                {t('Save', 'Simpan')}
              </button>
            </div>
          )}
        </div>

        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {/* Name */}
          <div className="flex items-start gap-3 px-5 py-4">
            <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
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
                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                  {profile?.name}
                </p>
              )}
            </div>
          </div>

          {/* Email — read-only */}
          <div className="flex items-start gap-3 px-5 py-4">
            <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                {t('Email', 'Email')}
              </p>
              <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                {profile?.email ?? agent?.email}
              </p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-start gap-3 px-5 py-4">
            <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
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
                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                  {profile?.phone}
                </p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-3 px-5 py-4">
            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
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
                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                  {profile?.address || <span className="text-slate-400 font-normal italic">{t('Not set', 'Belum diisi')}</span>}
                </p>
              )}
            </div>
          </div>

          {/* KTP — read-only */}
          {profile?.ktp && (
            <div className="flex items-start gap-3 px-5 py-4">
              <ShieldCheck className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  {t('ID Number (KTP)', 'Nomor KTP')}
                </p>
                <p className="text-sm font-semibold text-slate-800 dark:text-white font-mono tracking-widest">
                  {profile.ktp.replace(/(.{4})/g, '$1 ').trim()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Commission Rate */}
      {profile?.commission_rate !== undefined && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl px-5 py-4 flex items-center justify-between border border-emerald-100 dark:border-emerald-500/20">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-0.5">
              {t('Base Commission Rate', 'Tarif Komisi Dasar')}
            </p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {(profile.commission_rate * 100).toFixed(1)}%
            </p>
          </div>
          <Wallet className="w-8 h-8 text-emerald-400 opacity-60" />
        </div>
      )}

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-rose-200 dark:border-rose-500/20 text-rose-500 font-black text-sm uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
      >
        <LogOut className="w-4 h-4" />
        {t('Sign Out', 'Keluar')}
      </button>
    </div>
  );
};

export default AgentProfile;
