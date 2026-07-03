import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const DISMISS_KEY = 'sp_pwa_install_dismissed';
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
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
}

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as any).standalone === true;

interface Props {
  lang: string;
}

export const InstallPrompt: React.FC<Props> = ({ lang }) => {
  const en = lang === 'en' || lang === 'EN';
  const t = (id: string, enStr: string) => (en ? enStr : id);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    const iosDevice = isIOS();
    setIos(iosDevice);

    if (iosDevice) {
      // iOS can't use beforeinstallprompt — show manual instructions
      setTimeout(() => setShow(true), 2500);
      return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShow(true), 2000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (ios) { handleDismiss(); return; }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    dismiss();
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9000] flex items-end justify-center p-4 sm:items-center" style={{ background: 'rgba(6,25,18,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <style>{`@keyframes ip-up { from { opacity: 0; transform: translateY(36px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div className="w-full max-w-sm rounded-[2.2rem] overflow-hidden sp-glass-strong" style={{ animation: 'ip-up 0.4s cubic-bezier(.22,1,.36,1)' }}>
        {/* Header — logo + title */}
        <div className="relative px-6 pt-7 pb-4 text-center">
          <button onClick={handleDismiss} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-emerald-900/10 flex items-center justify-center active:scale-95 transition-transform">
            <X size={15} className="text-slate-500" />
          </button>
          <div className="w-16 h-16 mx-auto rounded-[1.4rem] bg-white shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500/20 flex items-center justify-center mb-3">
            <img src="/logo.png" alt="SurePath" className="w-11 h-12 object-contain" />
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-600 mb-1">SurePath</p>
          <h3 className="text-xl font-black tracking-tight text-slate-900 leading-tight">
            {t('Pasang Aplikasinya', 'Install the App')}
          </h3>
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
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <p className="text-xs font-semibold text-slate-700 leading-snug">{b}</p>
            </div>
          ))}

          {ios && (
            <div className="mt-1 rounded-2xl bg-white/70 border border-emerald-900/10 p-3.5 space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {t('Cara Pasang di iPhone / iPad', 'How to install on iPhone / iPad')}
              </p>
              {[
                t('Ketuk ikon Share (kotak panah ke atas) di Safari', 'Tap the Share icon (box with arrow) in Safari'),
                t('Pilih "Tambahkan ke Layar Utama"', 'Choose "Add to Home Screen"'),
                t('Ketuk "Tambahkan"', 'Tap "Add"'),
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black text-white bg-emerald-500">{i + 1}</span>
                  <p className="text-xs text-slate-600 leading-snug">{step}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 pt-4 flex gap-2.5">
          {!ios && (
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
            className={`${ios ? 'flex-1' : ''} flex items-center justify-center px-5 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-500 bg-emerald-900/[0.06] active:scale-[0.98] transition-transform`}
          >
            {ios ? t('Mengerti', 'Got it') : t('Nanti', 'Later')}
          </button>
        </div>
      </div>
    </div>
  );
};
