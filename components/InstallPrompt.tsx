import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { APP_VERSION } from '../src/version';
import { usePwaInstall, isMobileView, isStandalone, isInstallOfferSnoozed, snoozeInstallOffer } from '../services/pwaInstall';
import InstallAppSheet from './shared/InstallAppSheet';

// ─── First-visit install prompt ──────────────────────────────────────────────
//
// Two jobs, and only two:
//   • Once per version, on mobile, offer to install the app.
//   • When running as an installed app on an older version, offer a reload.
//
// The install UI itself lives in components/shared/InstallAppSheet.tsx, and the
// question "can this browser install, and how" is answered by
// services/pwaInstall.ts. This file used to own its own `beforeinstallprompt`
// listener; it doesn't any more — see the comment at the top of that module for
// why three competing listeners were the bug.
//
// "Later" is version-scoped and lasts 7 days — see isInstallOfferSnoozed() in
// services/pwaInstall.ts. The snooze is shared with the marketing site's own
// install banner, which renders on the same homepage as this one.

const INSTALLED_VERSION_KEY = 'sp_pwa_installed_version';

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

interface Props {
  lang: string | 'EN' | 'ID';
}

const InstallPrompt: React.FC<Props> = ({ lang }) => {
  const en = String(lang).toUpperCase() === 'EN';
  const t = (id: string, enStr: string) => (en ? enStr : id);

  const { installed, canPrompt, method } = usePwaInstall();
  const [showInstall, setShowInstall] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const askedRef = useRef(false);

  // ── Update notice: installed, but running an older version than this build.
  useEffect(() => {
    if (!isStandalone()) return;
    const installedVer = getInstalledVersion();
    if (installedVer && compareVersions(APP_VERSION, installedVer) > 0) {
      const id = setTimeout(() => setShowUpdate(true), 1500);
      return () => clearTimeout(id);
    }
    setInstalledVersion(APP_VERSION);
  }, []);

  // ── Install offer. Fires whenever the install state settles into something
  // actionable — which may be well after mount, since the browser decides when
  // it is ready to offer an install.
  useEffect(() => {
    if (askedRef.current || installed || isInstallOfferSnoozed() || !isMobileView()) return;

    // 'native' = one tap. 'ios-safari' = no install API exists on iOS, so the
    // guided sheet is the only route there — and without this prompt an iPhone
    // user would never discover the app can be installed at all.
    if (!canPrompt && method !== 'ios-safari') return;

    askedRef.current = true;
    const id = setTimeout(() => setShowInstall(true), 1500);
    return () => clearTimeout(id);
  }, [installed, canPrompt, method]);

  const closeInstall = () => { snoozeInstallOffer(); setShowInstall(false); };

  if (showInstall && !installed) {
    return (
      <InstallAppSheet
        lang={String(lang)}
        onClose={closeInstall}
        onInstalled={() => setInstalledVersion(APP_VERSION)}
      />
    );
  }

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9000] mx-auto max-w-sm rounded-2xl sp-glass-strong p-4 flex items-center gap-3" style={{ animation: 'ip-up 0.4s cubic-bezier(.22,1,.36,1)' }}>
      <style>{`@keyframes ip-up { from { opacity: 0; transform: translateY(36px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
        <RefreshCw size={18} className="text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
          {t('Update SurePath tersedia', 'SurePath update available')}
        </p>
        <p className="text-[0.65rem] text-slate-500 dark:text-slate-400">
          v{APP_VERSION} · {t('Buka ulang aplikasi untuk memperbarui', 'Reopen the app to update')}
        </p>
      </div>
      <button
        onClick={() => { setInstalledVersion(APP_VERSION); window.location.reload(); }}
        className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider active:scale-95 transition-transform shrink-0"
      >
        {t('Buka ulang', 'Reopen')}
      </button>
      <button onClick={() => setShowUpdate(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 shrink-0" aria-label={t('Tutup', 'Close')}>
        <X size={14} />
      </button>
    </div>
  );
};

export { InstallPrompt };
export default InstallPrompt;
