import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { fetchWebsiteSection, SpWebsiteConfig } from '../services/supabaseService';

const STORAGE_KEY = (id: number | string) => `sp_banner_dismissed_${id}`;

const PromoBanner: React.FC = () => {
  const [config, setConfig] = useState<SpWebsiteConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchWebsiteSection('promo_banner').then(data => {
      if (cancelled) return;
      if (!data || !data.is_visible || !data.headline) return;
      const key = STORAGE_KEY(data.id ?? data.section_key);
      if (localStorage.getItem(key) === 'true') return;
      setConfig(data);
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) setEntered(true);
        });
      });
    });
    return () => { cancelled = true; };
  }, []);

  const handleDismiss = () => {
    setEntered(false);
    setTimeout(() => setVisible(false), 300);
    if (config) {
      localStorage.setItem(STORAGE_KEY(config.id ?? config.section_key), 'true');
    }
  };

  if (!visible || !config) return null;

  return (
    <div
      role="banner"
      style={{
        transform: entered ? 'translateY(0)' : 'translateY(-100%)',
        opacity: entered ? 1 : 0,
        transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease',
      }}
      className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white z-[999] relative"
    >
      <div className="max-w-[1400px] mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex-1 flex items-center justify-center gap-2 text-center min-w-0">
          <span className="text-xs sm:text-sm font-bold truncate">
            {config.headline}
          </span>
          {config.subtitle && (
            <span className="hidden sm:inline text-xs font-normal opacity-90 truncate">
              — {config.subtitle}
            </span>
          )}
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default PromoBanner;
