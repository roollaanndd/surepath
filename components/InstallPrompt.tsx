import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor } from 'lucide-react';

const DISMISS_KEY = 'sp_pwa_install_dismissed';
const DISMISS_DAYS = 7;

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch { return false; }
}

function dismiss() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
const isAndroid = () => /Android/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as any).standalone === true;

interface Props { lang: string; }

export const InstallPrompt: React.FC<Props> = ({ lang }) => {
  const en = lang === 'en' || lang === 'EN';
  const t = (id: string, enStr: string) => (en ? enStr : id);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    if (isIOS()) {
      setPlatform('ios');
      setTimeout(() => setShow(true), 2500);
      return;
    }

    if (isAndroid()) {
      setPlatform('android');
      const fallback = setTimeout(() => setShow(true), 3000);
      const handler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        clearTimeout(fallback);
        setTimeout(() => setShow(true), 2000);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        clearTimeout(fallback);
      };
    }

    // Desktop — show instructions after 2.5s; also capture native prompt if available
    setPlatform('desktop');
    const fallback = setTimeout(() => setShow(true), 2500);
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      clearTimeout(fallback);
      setTimeout(() => setShow(true), 2000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(fallback);
    };
  }, []);

  const handleInstall = async () => {
    if (platform === 'ios' || (platform === 'desktop' && !deferredPrompt)) {
      handleDismiss();
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => { dismiss(); setShow(false); };

  if (!show) return null;

  const ios = platform === 'ios';
  const desktop = platform === 'desktop';
  const canNativeInstall = !!deferredPrompt;

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-end justify-center p-4 sm:items-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #003B2F, #005240)', border: '1px solid rgba(0,193,106,0.25)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,193,106,0.2)' }}>
              {desktop
                ? <Monitor size={24} style={{ color: '#00C16A' }} />
                : <Smartphone size={24} style={{ color: '#00C16A' }} />
              }
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50">SurePath</p>
              <h3 className="text-base font-black text-white leading-tight">
                {t('Pasang Aplikasi', 'Install the App')}
              </h3>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
          >
            <X size={16} className="text-white/60" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-2">
          <p className="text-sm text-white/70 leading-relaxed">
            {t(
              'Tambahkan SurePath ke layar utama untuk akses lebih cepat, notifikasi klaim, dan pengalaman seperti aplikasi native.',
              'Add SurePath to your home screen for faster access, claim notifications, and a native app experience.',
            )}
          </p>

          {ios && (
            <div className="mt-3 rounded-2xl border border-white/10 p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
                {t('Cara Pasang di iPhone / iPad', 'How to install on iPhone / iPad')}
              </p>
              {[
                t('Ketuk ikon Share (kotak dengan panah ke atas) di Safari', 'Tap the Share icon (box with arrow) in Safari'),
                t('Gulir ke bawah dan ketuk "Tambahkan ke Layar Utama"', 'Scroll down and tap "Add to Home Screen"'),
                t('Ketuk "Tambahkan" di pojok kanan atas', 'Tap "Add" in the top-right corner'),
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black text-white" style={{ background: '#00C16A' }}>{i + 1}</span>
                  <p className="text-xs text-white/70 leading-snug">{step}</p>
                </div>
              ))}
            </div>
          )}

          {desktop && !canNativeInstall && (
            <div className="mt-3 rounded-2xl border border-white/10 p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
                {t('Cara Pasang di Browser', 'How to install in Browser')}
              </p>
              {[
                t('Klik ikon ⊕ atau ↓ di bilah alamat browser', 'Click the ⊕ or ↓ icon in your browser\'s address bar'),
                t('Atau buka menu browser (⋮) → "Pasang SurePath"', 'Or open browser menu (⋮) → "Install SurePath"'),
                t('Klik "Pasang" di popup yang muncul', 'Click "Install" in the popup that appears'),
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black text-white" style={{ background: '#00C16A' }}>{i + 1}</span>
                  <p className="text-xs text-white/70 leading-snug">{step}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-5 pt-3 flex gap-2">
          {canNativeInstall && (
            <button
              onClick={handleInstall}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm active:scale-95 transition-transform"
              style={{ background: '#00C16A', color: '#003B2F' }}
            >
              <Download size={16} />
              {t('Pasang Sekarang', 'Install Now')}
            </button>
          )}
          <button
            onClick={handleDismiss}
            className={`${!canNativeInstall ? 'flex-1' : ''} flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm text-white/60 bg-white/10 active:scale-95 transition-transform`}
          >
            {(ios || desktop) ? t('Mengerti', 'Got it') : t('Nanti Saja', 'Not Now')}
          </button>
        </div>

        <div className="px-5 pb-4 text-center">
          <p className="text-[10px] text-white/30">
            {t('Tidak ada data yang dikumpulkan saat instalasi', 'No data collected during installation')}
          </p>
        </div>
      </div>
    </div>
  );
};
