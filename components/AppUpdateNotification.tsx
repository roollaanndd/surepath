import React, { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, X } from 'lucide-react';
import { APP_VERSION } from '../src/version';

const VERSION_KEY = 'surepath:last-seen-app-version';

const AppUpdateNotification: React.FC = () => {
  const [mode, setMode] = useState<'updated' | 'available' | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let dismissed = false;

    const reveal = (nextMode: 'updated' | 'available') => {
      if (dismissed) return;
      setMode(nextMode);
      timeoutId = setTimeout(() => setVisible(true), 50);
    };

    // On the first launch after a deployment, compare the running bundle with
    // the version this installation last acknowledged. Only show this banner
    // in a service-worker-controlled app, not on an ordinary first website visit.
    let lastSeen: string | null = null;
    try {
      lastSeen = window.localStorage.getItem(VERSION_KEY);
      if (navigator.serviceWorker?.controller && lastSeen !== APP_VERSION) {
        reveal('updated');
      }
      window.localStorage.setItem(VERSION_KEY, APP_VERSION);
    } catch {
      // Storage can be unavailable in private/restricted browser contexts.
    }

    const handleControllerChange = () => reveal('available');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }

    return () => {
      dismissed = true;
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  if (!mode) return null;

  const isAvailable = mode === 'available';
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-4 sm:right-6 z-[9999] transition-all duration-300 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="bg-gray-900 border border-emerald-500/40 rounded-2xl shadow-2xl shadow-emerald-500/20 px-4 py-3 flex items-center gap-3 max-w-sm">
        {isAvailable
          ? <RefreshCw className="text-emerald-400 shrink-0" size={18} />
          : <CheckCircle2 className="text-emerald-400 shrink-0" size={18} />}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-bold">
            {isAvailable ? 'Pembaruan aplikasi tersedia' : `SurePath diperbarui ke v${APP_VERSION}`}
          </p>
          <p className="text-gray-300 text-xs mt-0.5">
            {isAvailable ? 'Muat ulang untuk memakai versi terbaru.' : 'Fitur dan perbaikan terbaru sudah aktif.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => isAvailable ? window.location.reload() : setMode(null)}
          className="text-emerald-400 text-sm font-bold hover:text-emerald-300 transition-colors whitespace-nowrap"
        >
          {isAvailable ? 'Muat ulang' : 'Mengerti'}
        </button>
        {!isAvailable && (
          <button type="button" aria-label="Tutup notifikasi" onClick={() => setMode(null)} className="text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default AppUpdateNotification;
