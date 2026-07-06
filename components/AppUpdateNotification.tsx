import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const AppUpdateNotification: React.FC = () => {
  const [updated, setUpdated] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleControllerChange = () => {
      setUpdated(true);
      // Small delay so slide-up animation is visible
      setTimeout(() => setVisible(true), 50);
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  if (!updated) return null;

  return (
    <div
      className={`fixed bottom-6 right-4 sm:right-6 z-[9999] transition-all duration-300 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="bg-gray-900 border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-500/20 px-4 py-3 flex items-center gap-3 max-w-xs">
        <RefreshCw className="text-emerald-400 shrink-0" size={16} />
        <span className="text-white text-sm font-bold flex-1">
          Versi baru tersedia
        </span>
        <button
          onClick={() => window.location.reload()}
          className="text-emerald-400 text-sm font-bold hover:text-emerald-300 transition-colors whitespace-nowrap"
        >
          Muat ulang
        </button>
      </div>
    </div>
  );
};

export default AppUpdateNotification;
