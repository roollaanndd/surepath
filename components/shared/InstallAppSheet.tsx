import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, X, CheckCircle2, Copy, Check, MoreVertical, Plus, MonitorDown } from 'lucide-react';
import { APP_VERSION } from '../../src/version';
import { usePwaInstall, promptInstall, isAndroid } from '../../services/pwaInstall';

// ─── Install sheet ───────────────────────────────────────────────────────────
//
// One install surface for the whole app — the marketing site, the portal
// navbar and the first-visit popup all render this.
//
// The rule it enforces: **never show instructions when the browser can just
// install.** When a prompt is available the sheet is a single button that runs
// the real install flow. Step-by-step "open the ⋮ menu" text only appears on
// browsers that genuinely have no install API (iOS) or that have withheld the
// prompt — and even then it points at the browser's own *Install* item, not at
// "Add to Home screen", which merely drops a bookmark icon on the launcher.

// The iOS Share glyph. Nobody recognises the word "Share" on an iPhone; they
// recognise this square-with-an-arrow, so draw it inline in the step text.
const IosShareIcon: React.FC<{ size?: number; className?: string }> = ({ size = 15, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M12 15V3" />
    <path d="m8 7 4-4 4 4" />
    <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
  </svg>
);

interface Props {
  lang: string;
  onClose: () => void;
  /** Called after a successful install so the host can hide its install button. */
  onInstalled?: () => void;
}

type Step = { icon: React.ReactNode; text: string };

const InstallAppSheet: React.FC<Props> = ({ lang, onClose, onInstalled }) => {
  const en = String(lang).toUpperCase() === 'EN';
  const t = (id: string, enStr: string) => (en ? enStr : id);

  const { method: liveMethod } = usePwaInstall();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // promptInstall() releases the event the instant it is used, which flips
  // liveMethod from 'native' to 'browser-menu' while the browser's own dialog
  // is still on screen. Latch it, or the sheet visibly rewrites itself into
  // "open the ⋮ menu" underneath a dialog that is already installing.
  const [sawNative, setSawNative] = useState(liveMethod === 'native');
  useEffect(() => { if (liveMethod === 'native') setSawNative(true); }, [liveMethod]);
  const method = sawNative ? 'native' : liveMethod;

  const handleInstall = async () => {
    setBusy(true);
    const outcome = await promptInstall();
    setBusy(false);
    if (outcome === 'accepted') onInstalled?.();
    // Accepted or declined, the browser has had its say — there is nothing
    // useful left on this sheet, and instructions for something the user just
    // turned down would be nagging.
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* clipboard blocked — the URL is on screen anyway */ }
  };

  const benefits = [
    t('Buka sekali ketuk dari layar utama', 'One-tap access from your home screen'),
    t('Lebih cepat & hemat kuota — bisa offline', 'Faster & lighter — works offline'),
    t('Notifikasi status klaim & polis', 'Claim & policy status notifications'),
  ];

  // ─── Per-method guidance ───────────────────────────────────────────────────
  let steps: Step[] = [];
  let heading = '';

  if (method === 'ios-safari') {
    heading = t('Pasang di iPhone / iPad', 'Install on iPhone / iPad');
    steps = [
      { icon: <IosShareIcon />, text: t('Ketuk tombol Bagikan di bar bawah Safari', 'Tap the Share button in Safari’s bottom bar') },
      { icon: <Plus size={15} />, text: t('Gulir, lalu pilih "Tambahkan ke Layar Utama"', 'Scroll and choose “Add to Home Screen”') },
      { icon: <Check size={15} />, text: t('Ketuk "Tambahkan" — SurePath muncul seperti aplikasi biasa', 'Tap “Add” — SurePath appears like any other app') },
    ];
  } else if (method === 'ios-in-app') {
    heading = t('Buka dulu di browser', 'Open in a browser first');
    steps = [
      { icon: <MoreVertical size={15} />, text: t('Ketuk menu ⋯ di pojok layar', 'Tap the ⋯ menu in the corner') },
      { icon: <MonitorDown size={15} />, text: t('Pilih "Buka di Safari" atau "Buka di Chrome"', 'Choose “Open in Safari” or “Open in Chrome”') },
      { icon: <Download size={15} />, text: t('Ketuk tombol Pasang lagi dari sana', 'Tap Install again from there') },
    ];
  } else if (method === 'browser-menu' && isAndroid()) {
    heading = t('Pasang di Android', 'Install on Android');
    steps = [
      { icon: <MoreVertical size={15} />, text: t('Ketuk menu ⋮ di pojok kanan atas Chrome', 'Tap the ⋮ menu at the top right of Chrome') },
      { icon: <Download size={15} />, text: t('Pilih "Instal aplikasi" (bukan "Tambahkan ke layar utama")', 'Choose “Install app” (not “Add to Home screen”)') },
      { icon: <Check size={15} />, text: t('Ketuk "Instal" — selesai', 'Tap “Install” — done') },
    ];
  } else if (method === 'browser-menu') {
    heading = t('Pasang di komputer', 'Install on desktop');
    steps = [
      { icon: <MonitorDown size={15} />, text: t('Klik ikon pasang di ujung kanan address bar', 'Click the install icon at the right of the address bar') },
      { icon: <MoreVertical size={15} />, text: t('Atau buka menu browser → "Instal SurePath"', 'Or open the browser menu → “Install SurePath”') },
      { icon: <Check size={15} />, text: t('Klik "Instal" — selesai', 'Click “Install” — done') },
    ];
  } else if (method === 'unsupported') {
    heading = t('Browser ini belum bisa memasang aplikasi', 'This browser can’t install apps yet');
    steps = [
      { icon: <MonitorDown size={15} />, text: t('Buka myinsurepath.com di Chrome, Edge atau Safari', 'Open myinsurepath.com in Chrome, Edge or Safari') },
      { icon: <Download size={15} />, text: t('Tombol Pasang akan muncul di sana', 'The Install button will appear there') },
    ];
  }

  // Portalled to <body>: the portal navbar sets `backdrop-blur`, and any
  // backdrop-filter makes its element a containing block for position:fixed
  // descendants — the sheet would otherwise be clipped to the 96px navbar.
  return createPortal(
    <div
      className="fixed inset-0 z-[9500] flex items-end justify-center p-4 sm:items-center"
      style={{ background: 'rgba(6,25,18,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('Pasang aplikasi SurePath', 'Install the SurePath app')}
    >
      <style>{`@keyframes sp-ias-up { from { opacity: 0; transform: translateY(36px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div
        className="w-full max-w-sm rounded-[2.2rem] overflow-hidden sp-glass-strong"
        style={{ animation: 'sp-ias-up 0.35s cubic-bezier(.22,1,.36,1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-7 pb-4 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-emerald-900/10 flex items-center justify-center active:scale-95 transition-transform"
            aria-label={t('Tutup', 'Close')}
          >
            <X size={15} className="text-slate-500" />
          </button>
          <div className="w-16 h-16 mx-auto rounded-[1.4rem] bg-white shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500/20 flex items-center justify-center mb-3">
            <img loading="lazy" src="/logo-sm.png" alt="SurePath" className="w-11 h-12 object-contain" />
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-ds-green mb-1">SurePath</p>
          <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            {method === 'native' ? t('Pasang Aplikasinya', 'Install the App') : heading}
          </h3>
          <p className="text-[0.6rem] text-slate-400 mt-1">v{APP_VERSION}</p>
        </div>

        {method === 'native' ? (
          <>
            <div className="px-6 pb-2 space-y-2">
              {benefits.map(b => (
                <div key={b} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/15">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={11} className="text-white" strokeWidth={3} />
                  </span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">{b}</p>
                </div>
              ))}
            </div>
            <div className="p-6 pt-4 flex gap-2.5">
              <button
                onClick={handleInstall}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white uppercase tracking-widest active:scale-[0.98] transition-transform disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #059669, #047857)', boxShadow: '0 14px 30px -12px rgba(5,150,105,0.6)' }}
              >
                <Download size={16} />
                {busy ? t('Memasang…', 'Installing…') : t('Pasang Sekarang', 'Install Now')}
              </button>
              <button
                onClick={onClose}
                className="flex items-center justify-center px-5 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-500 bg-emerald-900/[0.06] dark:bg-white/5 active:scale-[0.98] transition-transform"
              >
                {t('Nanti', 'Later')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-6 pb-2 space-y-2">
              {steps.map((s, i) => (
                <div key={s.text} className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/15">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 text-[0.6rem] font-black">
                    {i + 1}
                  </span>
                  <span className="text-ds-green dark:text-emerald-400 flex-shrink-0">{s.icon}</span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">{s.text}</p>
                </div>
              ))}
            </div>
            <div className="p-6 pt-4 flex gap-2.5">
              {(method === 'ios-in-app' || method === 'unsupported') && (
                <button
                  onClick={copyLink}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white uppercase tracking-widest active:scale-[0.98] transition-transform"
                  style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? t('Tersalin', 'Copied') : t('Salin Tautan', 'Copy Link')}
                </button>
              )}
              <button
                onClick={onClose}
                className={`${method === 'ios-in-app' || method === 'unsupported' ? '' : 'flex-1 '}flex items-center justify-center px-5 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest text-slate-500 bg-emerald-900/[0.06] dark:bg-white/5 active:scale-[0.98] transition-transform`}
              >
                {t('Mengerti', 'Got it')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
};

export { InstallAppSheet };
export default InstallAppSheet;
