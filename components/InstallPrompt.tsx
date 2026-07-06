import React, { useState, useEffect, useRef } from 'react';
import { Download, X, CheckCircle2, RefreshCw } from 'lucide-react';
import { APP_VERSION } from '../src/version';

// ─── Version-scoped PWA Install Prompt ───────────────────────────────────────
//
// Shows an install popup when a visitor first opens the web app.
//
// Version detection:
//   - Stores the last-installed version in localStorage: sp_pwa_installed_version
//   - If the stored version matches APP_VERSION → skip prompt (already installed
//     this version)
//   - If stored version is older → show an "update available" prompt instead
//   - If no stored version → show the install prompt (first-time visitor)
//
// Dismissal:
//   - Version-scoped: sp_pwa_install_dismissed_<APP_VERSION>
//   - Dismissed for 7 days per version — re-prompts on next version
//
// Standalone detection:
//   - If display-mode: standalone → app is already installed (skip prompt)
//   - Checks both matchMedia and navigator.standalone (iOS Safari)

const DISMISS_KEY = `sp_pwa_install_dismissed_${APP_VERSION}`;
const INSTALLED_VERSION_KEY = 'sp_pwa_installed_version';
const DISMISS_DAYS = 7;

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch { return false; }
}

function dismiss() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
}

function getInstalledVersion(): string | null {
  try { return localStorage.getItem(INSTALLED_VERSION_KEY); } catch { return null; }
}

function setInstalledVersion(version: string) {
  try { localStorage.setItem(INSTALLED_VERSION_KEY, version); } catch { /* noop */ }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as any).standalone === true;

interface Props {
  lang: string | 'EN' | 'ID';
}

const InstallPrompt: React.FC<Props> = ({ lang }) => {
  const en = lang === 'en' || lang === 'EN';
  const t = (id: string, enStr: string) => (en ? enStr : id);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [mode, setMode] = useState<'install' | 'update'>('install');
  const shownRef = useRef(false);

  useEffect(() => {
    // If already running as a PWA (standalone), check if version needs updating
    if (isStandalone()) {
      const installedVer = getInstalledVersion();
      if (installedVer && compareVersions(APP_VERSION, installedVer) > 0) {
        // App is installed but running an older version — show update notice
        // (the service worker auto-updates, but we tell the user to refresh)
        setMode('update');
        setTimeout(() => setShow(true), 1500);
      }
      // Don't show install prompt if already installed
      return;
    }

    // Not standalone — check if dismissed
    if (isDismissed()) return;

    const installedVer = getInstalledVersion();
    if (installedVer) {
      // Previously installed but not running standalone — maybe uninstalled
      // or opened in a new browser. Show install prompt with "reinstall" copy.
      setMode('install');
    }

    const iosDevice = isIOS();
    setIos(iosDevice);

    if (iosDevice) {
      setTimeout(() => { if (!shownRef.current) { shownRef.current = true; setShow(true); } }, 2500);
      return;
    }

    let fired = false;
    const handler = (e: any) => {
      e.preventDefault();
      fired = true;
      setDeferredPrompt(e);
      setTimeout(() => { if (!shownRef.current) { shownRef.current = true; setShow(true); } }, 2000);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Fallback — Chrome withholds the event when install criteria are pending
    const fallback = setTimeout(() => {
      if (!fired && !isStandalone() && !shownRef.current) {
        setManualMode(true);
        shownRef.current = true;
        setShow(true);
      }
    }, 4000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(fallback);
    };
  }, []);

  const handleInstall = async () => {
    if (ios) { handleDismiss(); return; }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalledVersion(APP_VERSION);
        setShow(false);
        setDeferredPrompt(null);
      }
    } else {
      // Manual mode — user will install via browser menu
      setInstalledVersion(APP_VERSION);
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    dismiss();
    setShow(false);
  };

  const handleUpdate = () => {
    // Force a page reload to pick up the new service worker
    window.location.reload();
  };

  if (!show) return null;

  // Update mode (already installed but running old version)
  if (mode === 'update') {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-[9000] mx-auto max-w-sm rounded-2xl sp-glass-strong p-4 flex items-center gap-3" style={{ animation: 'ip-up 0.4s cubic-bezier(.22,1,.36,1)' }}>
        <style>{`@keyframes ip-up { from { opacity: 0; transform: translateY(36px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
          <RefreshCw size={18} className="text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
            {t('Versi baru tersedia', 'New version available')}
          </p>
          <p className="text-[0.65rem] text-slate-500 dark:text-slate-400">
            v{APP_VERSION} · {t('Muat ulang untuk memperbarui', 'Reload to update')}
          </p>
        </div>
        <button onClick={handleUpdate} className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider active:scale-95 transition-transform shrink-0">
          {t('Perbarui', 'Update')}
        </button>
        <button onClick={handleDismiss} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 shrink-0">
          <X size={14} />
        </button>
      </div>
    );
  }

  // Install mode
  return (
    <div className="fixed inset-0 z-[9000] flex items-end justify-center p-4 sm:items-center" style={{ background: 'rgba(6,25,18,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <style>{`@keyframes ip-up { from { opacity: 0; transform: translateY(36px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div className="w-full max-w-sm rounded-[2.2rem] overflow-hidden sp-glass-strong" style={{ animation: 'ip-up 0.4s cubic-bezier(.22,1,.36,1)' }}>
        {/* Header */}
        <div className="relative px-6 pt-7 pb-4 text-center">
          <button onClick={handleDismiss} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-emerald-900/10 flex items-center justify-center active:scale-95 transition-transform" aria-label="Close">
            <X size={15} className="text-slate-500" />
          </button>
          <div className="w-16 h-16 mx-auto rounded-[1.4rem] bg-white shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500/20 flex items-center justify-center mb-3">
            <img src="/logo.png" alt="SurePath" className="w-11 h-12 object-contain" />
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-600 mb-1">SurePath</p>
          <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            {t('Pasang Aplikasinya', 'Install the App')}
          </h3>
          <p className="text-[0.6rem] text-slate-400 mt-1">v{APP_VERSION}</p>
        </div>

        {/* Benefits */}
        <div className="px-6 pb-2 space-y-2">
          {[
            t('Akses sekali ketuk dari layar utama', 'One-tap access from your home screen'),
            t('Lebih cepat & hemat kuota — bisa offline', 'Faster & lighter — works offline'),
            t('Notifikasi status klaim & polis', 'Claim & policy status notifications'),
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/15">
              <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={11} className="text-white" strokeWidth={3} />
              </span>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">{b}</p>
            </div>
          ))}

          {(ios || manualMode) && (
            <div className="mt-1 rounded-2xl bg-white/70 dark:bg-white/5 border border-emerald-900/10 dark:border-white/10 p-3.5 space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {ios ? t('Cara Pasang di iPhone / iPad', 'How to install on iPhone / iPad') : t('Cara Pasang', 'How to install')}
              </p>
              {(ios ? [
                t('Ketuk ikon Share (kotak panah ke atas) di Safari', 'Tap the Share icon (box with arrow) in Safari'),
                t('Pilih "Tambahkan ke Layar Utama"', 'Choose "Add to Home Screen"'),
                t('Ketuk "Tambahkan"', 'Tap "Add"'),
              ] : [
                t('Buka menu browser (ikon ⋮ di kanan atas)', 'Open the browser menu (⋮ icon, top right)'),
                t('Pilih "Instal aplikasi" / "Tambahkan ke Layar Utama"', 'Choose "Install app" / "Add to Home Screen"'),
                t('Konfirmasi pemasangan', 'Confirm the install'),
              ]).map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black text-white bg-emerald-500">{i + 1}</span>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">{step}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 pt-4 flex gap-2.5">
          {!ios && !manualMode && (
            <button
              onClick={handleInstall}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white uppercase tracking-widest active:scale-[0.98] transition-transform"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)', boxShadow: '0 14px 30px -12px rgba(5,150,105,0.6)' }}
            >
              <Download size={16} />
              {t('Pasang Sekarang', 'Install Now')}
            </button>
          )}
          <button
            onClick={handleDismiss}
            className={`${(ios || manualMode) ? 'flex-1' : ''} flex items-center justify-center px-5 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-500 bg-emerald-900/[0.06] dark:bg-white/5 active:scale-[0.98] transition-transform`}
          >
            {(ios || manualMode) ? t('Mengerti', 'Got it') : t('Nanti', 'Later')}
          </button>
        </div>
      </div>
    </div>
  );
};

export { InstallPrompt };
export default InstallPrompt;
