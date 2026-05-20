import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export const InstallPrompt: React.FC<{ lang: string }> = ({ lang }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Wait a bit before showing to not overwhelm the user
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-32 inset-x-6 max-w-xl mx-auto z-[80] animate-pop-in">
      <div className="bg-emerald-500 text-white rounded-3xl p-5 shadow-2xl flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-black uppercase tracking-tight text-lg mb-1 leading-none">
            {lang === 'en' ? 'Add App to Home Screen' : 'Tambahkan ke Layar Utama'}
          </p>
          <p className="text-xs font-medium text-emerald-100">
            {lang === 'en' ? 'Access SurePath faster without a browser.' : 'Akses SurePath lebih cepat tanpa browser.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={handleInstall}
             className="px-4 py-2.5 bg-white text-emerald-600 rounded-xl font-black uppercase text-[0.65rem] tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2"
           >
             <Download size={16} />
             {lang === 'en' ? 'Install' : 'Pasang'}
           </button>
           <button 
             onClick={() => setShowPrompt(false)}
             className="p-2.5 bg-emerald-600 text-emerald-100 rounded-xl hover:bg-emerald-700 transition-colors"
           >
             <X size={18} />
           </button>
        </div>
      </div>
    </div>
  );
};
