// OperatorProfile.tsx — Profil tab. Operator info + PWA install menu in footer.
import React, { useState, useEffect } from 'react';
import { LogOut, Moon, Sun, Download, Shield, Smartphone, Info, ChevronRight, AlertTriangle } from 'lucide-react';
import { Language } from '../../types';
import { SectionLabel } from '../shared/cards';
import { useToast, useConfirmDialog } from '../ui';
import { APP_VERSION } from '../../src/version';

interface Props {
  operator: any;
  lang: Language;
  onLogout: () => void;
}

// ── Tiny PWA install hook (re-implemented here to keep operator app self-contained) ──
function usePwaInstall() {
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(() =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true)
  );

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setInstallEvent(null);
      setIsStandalone(true);
    });
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

const OperatorProfile: React.FC<Props> = ({ operator, onLogout }) => {
  const toast = useToast();
  const confirm = useConfirmDialog();
  const { canInstall, isStandalone, promptInstall } = usePwaInstall();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('sp_dark_mode') === 'true');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('sp_dark_mode', String(darkMode));
  }, [darkMode]);

  const handleInstall = async () => {
    const res = await promptInstall();
    if (res.ok) {
      toast.success('Aplikasi operator berhasil dipasang');
    } else if (res.reason === 'not-available') {
      toast.info('PWA install belum tersedia. Gunakan menu browser → Add to Home Screen.', { duration: 6000 });
    } else if (res.reason === 'dismissed') {
      toast.info('Instalasi dibatalkan');
    }
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Keluar dari Operator App',
      description: 'Anda akan keluar dari sesi operator. Notifikasi pop-up tidak akan aktif sampai Anda masuk kembali.',
      confirmLabel: 'Keluar',
      variant: 'danger',
    });
    if (!ok) return;
    onLogout();
  };

  return (
    <div className="px-5 pt-5 space-y-6 pb-4">
      {/* Profile card — bank-style gradient banner */}
      <div className="relative overflow-hidden rounded-[1.75rem] p-5 text-white"
        style={{ background: 'linear-gradient(120deg, #0B1120 0%, #0E3B2E 55%, #0B5E3B 100%)', boxShadow: '0 16px 44px -14px rgba(11,17,32,0.55)' }}>
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,193,106,0.28) 0%, transparent 70%)' }} />
        <svg aria-hidden className="absolute right-0 bottom-0 h-4/5 opacity-[0.10] pointer-events-none" viewBox="0 0 200 140" fill="none">
          <circle cx="185" cy="130" r="76" stroke="#fff" strokeWidth="1.2" />
          <circle cx="185" cy="130" r="50" stroke="#fff" strokeWidth="1.2" />
        </svg>
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black ring-4 ring-white/15"
            style={{ background: 'linear-gradient(135deg, #00C16A, #047857)' }}>
            {operator?.name?.charAt(0)?.toUpperCase() ?? 'O'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Operator Internal</p>
            <p className="text-lg font-black tracking-tight truncate">{operator?.name ?? 'Operator'}</p>
            <p className="text-xs text-white/80 truncate">{operator?.email ?? '-'}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-white/15 backdrop-blur px-2 py-0.5 rounded-full text-[10px] font-bold">
                {operator?.nodeId ?? 'SP-OP'}
              </span>
              <span className="bg-ds-green text-white px-2 py-0.5 rounded-full text-[10px] font-bold">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pengaturan */}
      <div>
        <SectionLabel>Pengaturan</SectionLabel>
        <div className="bg-ds-card border border-ds-border rounded-2xl divide-y divide-ds-border overflow-hidden">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center gap-3 p-4 hover:bg-ds-card2 active:scale-[0.99] transition-all"
          >
            <div className="w-9 h-9 rounded-full bg-ds-card2 flex items-center justify-center">
              {darkMode ? <Sun size={16} className="text-ds-amber" /> : <Moon size={16} className="text-ds-ink2" />}
            </div>
            <span className="flex-1 text-left text-sm font-bold text-ds-ink">
              {darkMode ? 'Mode Terang' : 'Mode Gelap'}
            </span>
            <ChevronRight size={16} className="text-ds-ink3" />
          </button>
        </div>
      </div>

      {/* PWA Install — footer menu */}
      <div>
        <SectionLabel>Pasang Aplikasi (PWA)</SectionLabel>
        <div className="bg-ds-card border border-ds-border rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-ds-green-tint flex items-center justify-center shrink-0">
              <Smartphone size={18} className="text-ds-green" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ds-ink">
                {isStandalone ? 'Aplikasi sudah terpasang' : 'Pasang Operator App di perangkat Anda'}
              </p>
              <p className="text-xs text-ds-ink3 mt-0.5 leading-relaxed">
                {isStandalone
                  ? 'Notifikasi pop-up aktif. Buka dari layar utama untuk pengalaman terbaik.'
                  : 'Pasang sebagai PWA agar notifikasi pop-up pengajuan baru tetap aktif bahkan saat aplikasi ditutup.'}
              </p>
              {!isStandalone && (
                <button
                  onClick={handleInstall}
                  disabled={!canInstall}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-ds-green text-white active:scale-95 transition-transform disabled:opacity-60"
                >
                  <Download size={13} />
                  {canInstall ? 'Pasang Sekarang' : 'Tambahkan ke Layar Utama'}
                </button>
              )}
              {!canInstall && !isStandalone && (
                <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed flex items-start gap-1.5">
                    <AlertTriangle size={10} className="shrink-0 mt-0.5" />
                    <span>
                      iOS Safari: tap tombol Share → Add to Home Screen. Chrome Android: tap menu ⋮ → Add to Home screen.
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Keamanan & Info */}
      <div>
        <SectionLabel>Keamanan & Info</SectionLabel>
        <div className="bg-ds-card border border-ds-border rounded-2xl divide-y divide-ds-border overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <div className="w-9 h-9 rounded-full bg-ds-card2 flex items-center justify-center">
              <Shield size={16} className="text-ds-green" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-ds-ink">Sesi Aman</p>
              <p className="text-xs text-ds-ink3">Autentikasi Supabase Auth + JWT</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <div className="w-9 h-9 rounded-full bg-ds-card2 flex items-center justify-center">
              <Info size={16} className="text-ds-ink2" />
            </div>
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
        SurePath Operator · v{APP_VERSION}
      </p>
    </div>
  );
};

export default OperatorProfile;
