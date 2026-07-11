// InsurerProfile.tsx — Profil tab. Insurer info + PWA install + logout.

import React, { useState, useEffect } from 'react';
import { LogOut, Moon, Sun, Download, Shield, Smartphone, Info, ChevronRight, AlertTriangle, Building2, Mail, Phone, User } from 'lucide-react';
import { Language } from '../../types';
import { SectionLabel } from '../shared/cards';
import { useToast, useConfirmDialog } from '../ui';
import { APP_VERSION } from '../../src/version';
import { getInsurerDashboard, type InsurerProfile as InsurerProfileData } from '../../services/insurerService';

interface Props {
  authToken: string;
  lang: Language;
  onLogout: () => void;
  insurerName: string;
}

function usePwaInstall() {
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(() =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true)
  );
  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setInstallEvent(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setInstallEvent(null); setIsStandalone(true); });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const promptInstall = async () => {
    if (!installEvent) return { ok: false, reason: 'not-available' };
    installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallEvent(null);
    return { ok: choice?.outcome === 'accepted', reason: choice?.outcome };
  };
  return { canInstall: !!installEvent, isStandalone, promptInstall };
}

const InsurerProfile: React.FC<Props> = ({ authToken, onLogout, insurerName }) => {
  const toast = useToast();
  const confirm = useConfirmDialog();
  const { canInstall, isStandalone, promptInstall } = usePwaInstall();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('sp_dark_mode') === 'true');
  const [profile, setProfile] = useState<InsurerProfileData | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('sp_dark_mode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    getInsurerDashboard(authToken)
      .then(d => { setProfile(d.insurer); setTokenExpiry(d.token_expires_at ?? null); })
      .catch(e => toast.error(`Gagal memuat profil: ${e.message}`));
  }, [authToken, toast]);

  const handleInstall = async () => {
    const res = await promptInstall();
    if (res.ok) toast.success('Aplikasi insurer berhasil dipasang');
    else if (res.reason === 'not-available') toast.info('PWA install belum tersedia. Gunakan menu browser → Add to Home Screen.', { duration: 6000 });
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Keluar dari Insurer Portal',
      description: 'Anda akan keluar dari sesi insurer. Token disimpan di browser dan bisa dipakai lagi selama belum kedaluwarsa.',
      confirmLabel: 'Keluar',
      variant: 'danger',
    });
    if (!ok) return;
    localStorage.removeItem('SUREPATH_INSURER_TOKEN');
    localStorage.removeItem('SUREPATH_INSURER_NAME');
    onLogout();
  };

  return (
    <div className="px-5 pt-5 space-y-6 pb-4">
      {/* Profile card — bank-style gradient banner (purple identity) */}
      <div className="relative overflow-hidden rounded-[1.75rem] p-5 text-white"
        style={{ background: 'linear-gradient(120deg, #0B1120 0%, #2E1065 55%, #5B21B6 100%)', boxShadow: '0 16px 44px -14px rgba(11,17,32,0.55)' }}>
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.30) 0%, transparent 70%)' }} />
        <svg aria-hidden className="absolute right-0 bottom-0 h-4/5 opacity-[0.10] pointer-events-none" viewBox="0 0 200 140" fill="none">
          <circle cx="185" cy="130" r="76" stroke="#fff" strokeWidth="1.2" />
          <circle cx="185" cy="130" r="50" stroke="#fff" strokeWidth="1.2" />
        </svg>
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center ring-4 ring-white/15"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
            <Building2 size={28} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Mitra Asuransi</p>
            <p className="text-lg font-black tracking-tight truncate">{profile?.name ?? insurerName}</p>
            {profile?.pic_name && (
              <p className="text-xs text-white/80 truncate mt-0.5">PIC: {profile.pic_name}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-white/15 backdrop-blur px-2 py-0.5 rounded-full text-[10px] font-bold">
                Active
              </span>
              {tokenExpiry && (
                <span className="bg-white/15 backdrop-blur px-2 py-0.5 rounded-full text-[10px] font-bold">
                  Token: {new Date(tokenExpiry).toLocaleDateString('id-ID')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PIC info */}
      {profile && (
        <div>
          <SectionLabel>Kontak PIC</SectionLabel>
          <div className="bg-ds-card border border-ds-border rounded-2xl divide-y divide-ds-border overflow-hidden">
            {profile.pic_name && (
              <div className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-full bg-ds-card2 flex items-center justify-center"><User size={16} className="text-ds-ink2" /></div>
                <div className="flex-1"><p className="text-sm font-bold text-ds-ink">{profile.pic_name}</p><p className="text-xs text-ds-ink3">Nama PIC</p></div>
              </div>
            )}
            {profile.pic_email && (
              <div className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-full bg-ds-card2 flex items-center justify-center"><Mail size={16} className="text-ds-ink2" /></div>
                <div className="flex-1"><p className="text-sm font-bold text-ds-ink break-all">{profile.pic_email}</p><p className="text-xs text-ds-ink3">Email PIC</p></div>
              </div>
            )}
            {profile.pic_phone && (
              <div className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-full bg-ds-card2 flex items-center justify-center"><Phone size={16} className="text-ds-ink2" /></div>
                <div className="flex-1"><p className="text-sm font-bold text-ds-ink">{profile.pic_phone}</p><p className="text-xs text-ds-ink3">Telepon PIC</p></div>
              </div>
            )}
            {!profile.pic_name && !profile.pic_email && !profile.pic_phone && (
              <div className="p-4 text-center text-xs text-ds-ink3">Data PIC belum diisi oleh admin SurePath.</div>
            )}
          </div>
        </div>
      )}

      {/* Pengaturan */}
      <div>
        <SectionLabel>Pengaturan</SectionLabel>
        <div className="bg-ds-card border border-ds-border rounded-2xl divide-y divide-ds-border overflow-hidden">
          <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center gap-3 p-4 hover:bg-ds-card2 active:scale-[0.99] transition-all">
            <div className="w-9 h-9 rounded-full bg-ds-card2 flex items-center justify-center">
              {darkMode ? <Sun size={16} className="text-ds-amber" /> : <Moon size={16} className="text-ds-ink2" />}
            </div>
            <span className="flex-1 text-left text-sm font-bold text-ds-ink">{darkMode ? 'Mode Terang' : 'Mode Gelap'}</span>
            <ChevronRight size={16} className="text-ds-ink3" />
          </button>
        </div>
      </div>

      {/* PWA Install */}
      <div>
        <SectionLabel>Pasang Aplikasi (PWA)</SectionLabel>
        <div className="bg-ds-card border border-ds-border rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center shrink-0">
              <Smartphone size={18} className="text-purple-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ds-ink">{isStandalone ? 'Aplikasi sudah terpasang' : 'Pasang Insurer Portal di perangkat'}</p>
              <p className="text-xs text-ds-ink3 mt-0.5 leading-relaxed">
                {isStandalone ? 'Notifikasi aktif. Buka dari layar utama.' : 'Pasang sebagai PWA untuk notifikasi pengajuan baru real-time.'}
              </p>
              {!isStandalone && (
                <button
                  onClick={handleInstall}
                  disabled={!canInstall}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-purple-500 text-white active:scale-95 transition-transform disabled:opacity-60"
                >
                  <Download size={13} />{canInstall ? 'Pasang Sekarang' : 'Tambahkan ke Layar Utama'}
                </button>
              )}
              {!canInstall && !isStandalone && (
                <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed flex items-start gap-1.5">
                    <AlertTriangle size={10} className="shrink-0 mt-0.5" />
                    <span>iOS Safari: tap Share → Add to Home Screen. Chrome Android: menu ⋮ → Add to Home screen.</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div>
        <SectionLabel>Keamanan & Info</SectionLabel>
        <div className="bg-ds-card border border-ds-border rounded-2xl divide-y divide-ds-border overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <div className="w-9 h-9 rounded-full bg-ds-card2 flex items-center justify-center"><Shield size={16} className="text-purple-500" /></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-ds-ink">Sesi Aman</p>
              <p className="text-xs text-ds-ink3">Token-based auth · rolling 7-day</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <div className="w-9 h-9 rounded-full bg-ds-card2 flex items-center justify-center"><Info size={16} className="text-ds-ink2" /></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-ds-ink">Versi Aplikasi</p>
              <p className="text-xs text-ds-ink3">v{APP_VERSION} · PT Ruang Proteksi Indonesia</p>
            </div>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold bg-rose-500 text-white active:scale-[0.98] transition-transform"
      >
        <LogOut size={16} /> Keluar
      </button>

      <p className="text-center text-[10px] text-ds-ink3 font-bold uppercase tracking-widest pt-2">
        SurePath Insurer Portal · v{APP_VERSION}
      </p>
    </div>
  );
};

export default InsurerProfile;
