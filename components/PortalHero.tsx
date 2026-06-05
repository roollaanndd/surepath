import React, { useState, useEffect } from 'react';
import {
  FileText, Zap, ChevronRight,
  Plane, Car, Sparkles, QrCode, Bot, Star
} from 'lucide-react';
import { Language } from '../types';

interface PortalHeroProps {
  onAction: (id: string) => void;
  lang?: Language;
  userName?: string;
  nodeId?: string;
  policyCount?: number;
  trustScore?: number;
}

// Rotating promo strip — recommended products / actions
const PROMOS = (lang: Language) => [
  {
    icon: Plane,
    label: lang === Language.EN ? 'Travel Safe — instant global cover' : 'Travel Safe — proteksi global instan',
    action: 'buy-travel',
    tint: '#0891b2',
    bg: 'rgba(8,145,178,0.10)',
  },
  {
    icon: Car,
    label: lang === Language.EN ? 'Auto AI — snap a photo, get covered' : 'Auto AI — foto HP, langsung terlindungi',
    action: 'buy-car',
    tint: '#2563eb',
    bg: 'rgba(37,99,235,0.10)',
  },
  {
    icon: Zap,
    label: lang === Language.EN ? 'Fast-Path Claims — paid in minutes' : 'Klaim Jalur Cepat — cair dalam menit',
    action: 'claim',
    tint: '#16a34a',
    bg: 'rgba(22,163,74,0.10)',
  },
];

const PortalHero: React.FC<PortalHeroProps> = ({
  onAction,
  lang = Language.ID,
  userName = 'Nasabah',
  nodeId = 'SP-USER',
  policyCount = 0,
  trustScore = 85,
}) => {
  const t = (en: string, id: string) => (lang === Language.EN ? en : id);
  const [promo, setPromo] = useState(0);
  const promos = PROMOS(lang);

  useEffect(() => {
    const timer = setInterval(() => setPromo(p => (p + 1) % promos.length), 5000);
    return () => clearInterval(timer);
  }, [promos.length]);

  const isProtected = policyCount > 0;
  const Promo = promos[promo].icon;

  return (
    <div className="space-y-4" style={{ animation: 'spRise 0.5s cubic-bezier(.2,.7,.2,1) both' }}>
      <style>{`
        @keyframes spRise { from { opacity:0; transform: translateY(14px); } to { opacity:1; transform: translateY(0); } }
        @keyframes spShimmer { 0% { transform: translateX(-120%) skewX(-12deg); } 100% { transform: translateX(220%) skewX(-12deg); } }
        @keyframes spPulseDot { 0%,100% { opacity:1; transform: scale(1);} 50% { opacity:.45; transform: scale(.82);} }
        @media (prefers-reduced-motion: reduce){ [data-sp-shimmer]{ animation:none !important; } }
      `}</style>

      {/* ── Protection Card — gradient top + white bottom (myBCA-style split) ── */}
      <div className="rounded-[1.9rem] overflow-hidden shadow-xl shadow-emerald-900/10 ring-1 ring-emerald-900/5 dark:ring-white/5">

        {/* Top — SurePath green gradient */}
        <div
          className="relative px-5 pt-5 pb-6 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #052e16 0%, #14532d 58%, #16a34a 100%)' }}
        >
          {/* shimmer sweep */}
          <div
            data-sp-shimmer
            className="absolute inset-y-0 w-1/3 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)',
              animation: 'spShimmer 4.5s ease-in-out 1s infinite',
            }}
          />
          {/* decorative glow + dot matrix */}
          <div className="absolute -top-10 -right-8 w-44 h-44 rounded-full opacity-25 pointer-events-none" style={{ background: 'radial-gradient(circle, #4ade80, transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />

          <div className="relative z-10 flex items-start justify-between">
            <div className="inline-flex items-center gap-2 bg-white/12 border border-white/20 rounded-full pl-1.5 pr-3 py-1 backdrop-blur-sm">
              <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
                <QrCode size={13} className="text-white" />
              </span>
              <span className="text-white text-[11px] font-black tracking-wide">{nodeId}</span>
              <ChevronRight size={13} className="text-white/60" />
            </div>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border"
              style={{
                background: isProtected ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.10)',
                borderColor: isProtected ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.2)',
                color: isProtected ? '#bbf7d0' : 'rgba(255,255,255,0.7)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: isProtected ? '#4ade80' : 'rgba(255,255,255,0.6)', animation: isProtected ? 'spPulseDot 1.8s ease-in-out infinite' : 'none' }}
              />
              {isProtected ? t('Protected', 'Terlindungi') : t('Get Covered', 'Belum Aktif')}
            </span>
          </div>

          <div className="relative z-10 mt-4 flex items-end justify-between">
            <div>
              <p className="text-white/55 text-[10px] font-bold uppercase tracking-[0.22em]">
                {t('SurePath Protection', 'Proteksi SurePath')}
              </p>
              <div className="flex items-end gap-2 mt-1">
                <h2 className="text-white font-black text-2xl tracking-tight leading-none">
                  {policyCount} <span className="text-white/70 text-base font-bold">{t('active policies', 'polis aktif')}</span>
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-white/12 border border-white/20 rounded-full pl-1.5 pr-2.5 py-1">
              <span className="w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center">
                <Star size={11} className="text-amber-300" fill="currentColor" />
              </span>
              <span className="text-white text-[11px] font-black leading-none">{trustScore}</span>
              <span className="text-white/55 text-[9px] font-bold uppercase tracking-wider">Trust</span>
            </div>
          </div>
        </div>

        {/* Bottom — white quick-link tray */}
        <div className="bg-white dark:bg-[#0d2618] px-2 py-2 grid grid-cols-3 divide-x divide-slate-100 dark:divide-white/5">
          {[
            { id: 'history',  icon: FileText,    label: t('My Policies', 'Polis Saya'), tint: '#16a34a' },
            { id: 'claim',    icon: Zap,         label: t('Claim', 'Klaim'),            tint: '#d97706' },
            { id: 'bot',      icon: Bot,         label: t('Ask AI', 'Tanya AI'),        tint: '#7c3aed' },
          ].map(link => (
            <button
              key={link.id}
              onClick={() => onAction(link.id)}
              className="flex flex-col items-center justify-center gap-1.5 py-2.5 active:scale-95 transition-transform duration-150 motion-reduce:transition-none group"
            >
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:-translate-y-0.5 group-active:scale-90 motion-reduce:transition-none"
                style={{ background: `${link.tint}1a` }}
              >
                <link.icon size={17} strokeWidth={2.2} style={{ color: link.tint }} />
              </span>
              <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 tracking-tight">{link.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Rotating promo strip ── */}
      <button
        onClick={() => onAction(promos[promo].action)}
        className="relative w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-[#0d2618] border border-slate-100 dark:border-[#16a34a]/15 shadow-[0_8px_24px_-12px_rgba(5,46,22,0.18)] active:scale-[0.99] transition-all duration-200 motion-reduce:transition-none text-left"
      >
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-500"
          style={{ background: promos[promo].bg }}
        >
          <Promo size={19} strokeWidth={2.2} style={{ color: promos[promo].tint }} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[0.5rem] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Sparkles size={9} className="fill-current" /> {t('Recommended', 'Rekomendasi')}
          </p>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight mt-0.5 truncate">
            {promos[promo].label}
          </p>
        </div>
        <ChevronRight size={16} className="text-slate-300 dark:text-slate-500 flex-shrink-0" />
        {/* progress dots */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {promos.map((_, i) => (
            <span key={i} className={`h-1 rounded-full transition-all duration-500 ${i === promo ? 'w-4 bg-emerald-500' : 'w-1 bg-slate-200 dark:bg-white/15'}`} />
          ))}
        </div>
      </button>
    </div>
  );
};

export default PortalHero;
