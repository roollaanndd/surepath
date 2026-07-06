import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Language } from '../../types';

interface Props {
  lang: Language;
}

const SCALE_OPTIONS = [
  { key: 'kecil',  label: 'Kecil',  labelEn: 'Small',  value: 0.9 },
  { key: 'normal', label: 'Normal', labelEn: 'Normal', value: 1.0 },
  { key: 'besar',  label: 'Besar',  labelEn: 'Large',  value: 1.15 },
];

const DEFAULT_SCALE = 1.0;

function applyScale(scale: number) {
  document.documentElement.style.fontSize = `${scale * 16}px`;
}

const AccessibilitySettings: React.FC<Props> = ({ lang }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [uiScale, setUiScale] = useState<number>(() => {
    const saved = parseFloat(localStorage.getItem('sp_ui_scale') ?? String(DEFAULT_SCALE));
    return isNaN(saved) ? DEFAULT_SCALE : saved;
  });

  useEffect(() => {
    applyScale(uiScale);
    localStorage.setItem('sp_ui_scale', String(uiScale));
  }, [uiScale]);

  const handleReset = () => {
    setUiScale(DEFAULT_SCALE);
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest pt-1">
        {t('Display Size', 'Ukuran Tampilan')}
      </p>

      <div className="grid grid-cols-3 gap-3">
        {SCALE_OPTIONS.map(opt => {
          const selected = Math.abs(uiScale - opt.value) < 0.001;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setUiScale(opt.value)}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 active:scale-95 ${
                selected
                  ? 'border-emerald-500 bg-ds-green-tint'
                  : 'border-ds-border bg-ds-card hover:border-emerald-300'
              }`}
            >
              {selected && (
                <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check size={10} className="text-white" strokeWidth={3} />
                </span>
              )}
              <span
                className="font-black text-ds-ink leading-none"
                style={{ fontSize: `${opt.value * 16}px` }}
              >
                Aa
              </span>
              <span className="text-[10px] font-bold text-ds-ink2 uppercase tracking-widest">
                {lang === Language.EN ? opt.labelEn : opt.label}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleReset}
        className="text-[11px] font-bold text-ds-ink3 underline underline-offset-2 active:opacity-60 transition-opacity"
      >
        {t('Reset to Default', 'Atur ke Default')}
      </button>
    </div>
  );
};

export default AccessibilitySettings;
