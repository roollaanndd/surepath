import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import {
  ArrowRight, MessageSquare, Gift, Smartphone, Download, Award,
} from 'lucide-react';
import { Language } from '../../../types';

// ─── Shared page props (every marketing page receives these) ──────────────────
export interface SitePageProps {
  onSignIn: () => void;
  navigate: (path: string) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

// ─── Translation helper ───────────────────────────────────────────────────────
export const tx = (id: string, en: string, lang: Language) => (lang === Language.EN ? en : id);
export const useT = (lang: Language) => useCallback((id: string, en: string) => tx(id, en, lang), [lang]);

// ─── Theme (dark/light mode aware style vars) ─────────────────────────────────
export const LP_GREEN = 'hsl(119 99% 46%)';

export const useSiteTheme = (darkMode: boolean) => ({
  lpGreen:          LP_GREEN,
  cardBg:           darkMode ? 'rgba(255,255,255,0.025)' : '#ffffff',
  cardBorder:       darkMode ? 'rgba(255,255,255,0.07)'  : '#d1fae5',
  cardShadow:       darkMode ? 'none' : '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(16,185,129,0.06)',
  textMuted:        darkMode ? 'rgba(255,255,255,0.65)'  : '#475569',
  textMain:         darkMode ? '#ffffff'                 : '#0f172a',
  sectionBg1:       darkMode ? 'hsl(0 0% 8%)'            : '#f0fdf4',
  sectionBg2:       darkMode ? 'hsl(0 0% 5%)'            : '#ffffff',
  sectionBg3:       darkMode ? 'hsl(0 0% 6%)'            : '#ecfdf5',
  sectionBg4:       darkMode ? 'rgba(4,12,6,0.6)'        : '#d1fae5',
  sectionBg5:       darkMode ? 'rgba(4,12,6,0.7)'        : '#a7f3d0',
  footerBg:         darkMode ? 'rgba(4,12,6,0.95)'       : '#0f172a',
  navBg:            darkMode ? 'rgba(10,10,10,0.85)'     : 'rgba(255,255,255,0.92)',
  navBorder:        darkMode ? 'rgba(255,255,255,0.06)'  : 'rgba(0,0,0,0.08)',
  navBtnBg:         darkMode ? 'hsl(0 0% 18%)'           : '#f1f5f9',
  navBtnColor:      darkMode ? 'hsl(0 0% 96%)'           : '#334155',
  mobilMenuBg:      darkMode ? 'hsl(0 0% 10%)'           : '#ffffff',
  mobileMenuBorder: darkMode ? 'hsl(0 0% 20%)'           : '#e2e8f0',
});

export type SiteTheme = ReturnType<typeof useSiteTheme>;

// ─── Keyframe injection + body background ─────────────────────────────────────
const SECTION_CSS = `
@keyframes ticker-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
@keyframes glow-pulse {
  0%,100% { box-shadow: 0 0 20px rgba(1,235,2,0.2); }
  50%     { box-shadow: 0 0 40px rgba(1,235,2,0.45), 0 0 80px rgba(1,235,2,0.15); }
}
@keyframes banner-in { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
@keyframes fade-up { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:translateY(0); } }
@keyframes chevron-bounce { 0%,100% { transform: translateY(0); opacity: 0.9; } 50% { transform: translateY(5px); opacity: 0.4; } }
@keyframes chevron-bounce-delayed { 0%,100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(5px); opacity: 0.9; } }
@keyframes trust-pulse { 0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgba(1,235,2,0.5); } 50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(1,235,2,0); } }
.animate-ticker      { animation: ticker-scroll 28s linear infinite; will-change: transform; }
.animate-float       { animation: float 4s ease-out infinite; will-change: transform; }
.animate-float-2     { animation: float 5s ease-out infinite 1.5s; will-change: transform; }
.animate-glow        { animation: glow-pulse 3s ease-in-out infinite; }
.animate-banner      { animation: banner-in 0.45s cubic-bezier(0.22,1,0.36,1) both; }
.animate-fade-up     { animation: fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both; }
.animate-chevron-1   { animation: chevron-bounce 1.4s ease-in-out infinite; }
.animate-chevron-2   { animation: chevron-bounce-delayed 1.4s ease-in-out infinite 0.3s; }
.animate-trust-pulse { animation: trust-pulse 2s ease-in-out infinite; }
button:focus-visible, a:focus-visible { outline: 2px solid rgba(1,235,2,0.7); outline-offset: 3px; border-radius: 8px; }
@media (prefers-reduced-motion: reduce) {
  .animate-ticker, .animate-float, .animate-float-2, .animate-glow, .animate-banner,
  .animate-fade-up, .animate-chevron-1, .animate-chevron-2, .animate-trust-pulse { animation: none; }
  .animate-fade-up { opacity: 1 !important; transform: none !important; }
  * { transition-duration: 0.01ms !important; }
}
`;

export const SectionBackground: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const BODY_BG_CSS = `body { background: ${darkMode ? 'hsl(0 0% 8%)' : '#f0fdf4'} !important; }`;
  return (
    <>
      <style>{SECTION_CSS}</style>
      <style>{BODY_BG_CSS}</style>
    </>
  );
};

// ─── Reveal-on-scroll ─────────────────────────────────────────────────────────
export const useReveal = (threshold = 0.12) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
};

export const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number; from?: 'bottom'|'left'|'right' }> = ({
  children, className = '', delay = 0, from = 'bottom',
}) => {
  const { ref, visible } = useReveal();
  const hidden = from === 'left' ? 'opacity-0 -translate-x-8' : from === 'right' ? 'opacity-0 translate-x-8' : 'opacity-0 translate-y-8';
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }}
      className={`transition-[opacity,transform] duration-700 ease-out ${visible ? 'opacity-100 translate-x-0 translate-y-0' : hidden} ${className}`}>
      {children}
    </div>
  );
};

// ─── Animated counter ─────────────────────────────────────────────────────────
export const AnimatedCounter: React.FC<{ target: number; suffix: string; duration?: number }> = ({
  target, suffix, duration = 1500,
}) => {
  const { ref, visible } = useReveal(0.2);
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!visible || started.current) return;
    started.current = true;
    const steps = 60;
    const increment = target / steps;
    const delay = duration / steps;
    let current = 0;
    const iv = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(iv); }
      else { setCount(Math.floor(current)); }
    }, delay);
    return () => clearInterval(iv);
  }, [visible, target, duration]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

// ─── Hero video ───────────────────────────────────────────────────────────────
export const HeroVideo: React.FC = () => (
  <video autoPlay muted loop playsInline preload="auto" className="absolute inset-0 w-full h-full object-cover">
    <source src="/hero.mp4" type="video/mp4" />
  </video>
);

// ─── Product icons ────────────────────────────────────────────────────────────
const IconVehicle: React.FC<{ color?: string; size?: number }> = ({ color = '#22c55e', size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 24 L8 16 Q9 13 12 13 L28 13 Q31 13 32 16 L35 24 L35 29 Q35 31 33 31 L7 31 Q5 31 5 29 Z" stroke={color} strokeWidth="1.6" fill={`${color}15`} strokeLinejoin="round"/>
    <path d="M11 13 L13 8 Q14 6 16 6 L24 6 Q26 6 27 8 L29 13" stroke={color} strokeWidth="1.4" fill={`${color}10`}/>
    <circle cx="12" cy="31" r="3.5" stroke={color} strokeWidth="1.6" fill={`${color}20`}/>
    <circle cx="28" cy="31" r="3.5" stroke={color} strokeWidth="1.6" fill={`${color}20`}/>
    <path d="M30 17 L30 13 Q30 12 31 12 L36 12 Q37 12 37 13 L37 17 Q37 20 33.5 22 Q30 20 30 17 Z" fill={`${color}30`} stroke={color} strokeWidth="1.3"/>
    <path d="M33.5 14.5 L34 16 L35.5 16 L34.3 17 L34.8 18.5 L33.5 17.5 L32.2 18.5 L32.7 17 L31.5 16 L33 16 Z" fill={color}/>
  </svg>
);
const IconTravel: React.FC<{ color?: string; size?: number }> = ({ color = '#3b82f6', size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="21" r="13" stroke={color} strokeWidth="1.6" fill={`${color}10`}/>
    <path d="M14 21 Q20 13 26 21 Q20 29 14 21" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6"/>
    <path d="M7 21 L33 21" stroke={color} strokeWidth="1.2" opacity="0.4"/>
    <path d="M9 29 Q18 6 35 9" stroke={color} strokeWidth="1.4" strokeDasharray="2.5 2" fill="none"/>
    <path d="M33 7 L37 9 L33 11 L34 9 Z" fill={color}/>
    <path d="M33 8 L31 7 L32 9 Z" fill={color} opacity="0.6"/>
    <path d="M33 10 L31 11 L32 9 Z" fill={color} opacity="0.6"/>
  </svg>
);
const IconPersonalAccident: React.FC<{ color?: string; size?: number }> = ({ color = '#a855f7', size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="20" cy="22" rx="12" ry="13" fill={`${color}12`}/>
    <path d="M20 4 L33 9 L33 22 Q33 32 20 37 Q7 32 7 22 L7 9 Z" stroke={color} strokeWidth="1.6" fill={`${color}18`} strokeLinejoin="round"/>
    <circle cx="20" cy="15" r="3.2" stroke={color} strokeWidth="1.4" fill={`${color}20`}/>
    <path d="M14 29 Q14 22 20 21 Q26 22 26 29" stroke={color} strokeWidth="1.4" fill={`${color}15`} strokeLinejoin="round"/>
    <path d="M14 23 L11 26 M26 23 L29 26" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);
const IconProperty: React.FC<{ color?: string; size?: number }> = ({ color = '#f59e0b', size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="4" width="20" height="34" rx="4" stroke={color} strokeWidth="1.6" fill={`${color}12`}/>
    <rect x="12.5" y="8" width="15" height="22" rx="2" stroke={color} strokeWidth="1" fill={`${color}08`} opacity="0.8"/>
    <rect x="17" y="33" width="6" height="2" rx="1" fill={`${color}50`}/>
    <rect x="16" y="19" width="8" height="7" rx="1.5" stroke={color} strokeWidth="1.3" fill={`${color}22`}/>
    <path d="M17.5 19 L17.5 16.5 Q17.5 13.5 20 13.5 Q22.5 13.5 22.5 16.5 L22.5 19" stroke={color} strokeWidth="1.3" fill="none" strokeLinecap="round"/>
    <circle cx="20" cy="22" r="1" fill={color}/>
    <path d="M27 4 L25 8 L27.5 8 L24.5 13 L27 13 L24 18" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
  </svg>
);
const IconHealth: React.FC<{ color?: string; size?: number }> = ({ color = '#ef4444', size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 34 Q6 25 6 15 Q6 8 13 7 Q17 7 20 11 Q23 7 27 7 Q34 8 34 15 Q34 25 20 34 Z" stroke={color} strokeWidth="1.6" fill={`${color}20`} strokeLinejoin="round"/>
    <path d="M6 20 L12 20 L14 15 L16 25 L18 18 L20 23 L22 20 L28 20 L34 20" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

export const PRODUCTS = [
  { Icon: IconVehicle,          slug: 'car',      name: 'Asuransi Kendaraan', sub: 'Komprehensif & TLO', color: '#22c55e', desc: 'Perlindungan menyeluruh dari tabrakan hingga pencurian' },
  { Icon: IconTravel,           slug: 'travel',   name: 'Asuransi Perjalanan', sub: 'Dalam & Luar Negeri', color: '#3b82f6', desc: 'Terlindungi di setiap perjalanan, ke mana pun tujuanmu' },
  { Icon: IconPersonalAccident, slug: 'pa',       name: 'Kecelakaan Diri',    sub: 'Personal Accident',   color: '#a855f7', desc: 'Santunan tepat untuk kejadian tak terduga dalam hidup' },
  { Icon: IconProperty,         slug: 'property', name: 'Proteksi Barang',    sub: 'Gadget & Elektronik', color: '#f59e0b', desc: 'Lindungi perangkat kerasmu dari kerusakan & kehilangan' },
  { Icon: IconHealth,           slug: 'health',   name: 'Kesehatan',          sub: 'Individu & Keluarga', color: '#ef4444', desc: 'Akses layanan kesehatan terbaik tanpa khawatir biaya' },
];

// ─── Promo banners ────────────────────────────────────────────────────────────
const BANNERS = [
  { badge: 'Gratis', title: ['Konsultasi', 'dengan Agen Kami'], sub: 'Dapatkan saran perlindungan yang tepat, tanpa tekanan dan tanpa biaya.', cta: 'Mulai Chat', icon: MessageSquare, grad: 'linear-gradient(135deg, #052e16 0%, #064e3b 100%)', accent: '#22c55e', badgeBg: 'rgba(34,197,94,0.15)', badgeColor: '#4ade80' },
  { badge: 'Referral Program', title: ['Ajak Teman,', 'Raih Keuntungan'], sub: 'Setiap referral yang bergabung memberikan keuntungan nyata untuk Anda berdua.', cta: 'Lihat Syarat', icon: Gift, grad: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', accent: '#818cf8', badgeBg: 'rgba(129,140,248,0.15)', badgeColor: '#a5b4fc' },
  { badge: 'Produk Unggulan', title: ['Proteksi Gadget', '& Elektronik'], sub: 'Satu produk untuk semua perangkat berhargamu. Mudah, terjangkau, komprehensif.', cta: 'Cek Harga', icon: Smartphone, grad: 'linear-gradient(135deg, #0c0a1e 0%, #1a0533 100%)', accent: '#c084fc', badgeBg: 'rgba(192,132,252,0.15)', badgeColor: '#e879f9' },
];

export const PromoBanners: React.FC<{ onSignIn: () => void; onInstall: () => void }> = ({ onSignIn, onInstall }) => {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setActive(a => (a + 1) % BANNERS.length), 5000);
    return () => clearInterval(iv);
  }, []);
  const b = BANNERS[active];
  const Icon = b.icon;
  return (
    <div className="space-y-4">
      <div key={active} className="animate-banner relative overflow-hidden rounded-3xl p-7"
        style={{ background: b.grad, border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${b.accent}, transparent)`, filter: 'blur(30px)', transform: 'translate(30%,-30%)' }} />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1">
            <span className="inline-block text-[0.55rem] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full mb-4"
              style={{ background: b.badgeBg, color: b.badgeColor, border: `1px solid ${b.accent}30` }}>{b.badge}</span>
            <h3 className="text-2xl font-black text-white leading-tight mb-2">
              {b.title[0]}<br /><span style={{ color: b.accent }}>{b.title[1]}</span>
            </h3>
            <p className="text-sm text-gray-400 mb-5 max-w-xs leading-relaxed">{b.sub}</p>
            <button onClick={onSignIn}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90"
              style={{ background: b.accent }}>{b.cta} <ArrowRight size={14} /></button>
          </div>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${b.accent}18`, border: `1px solid ${b.accent}30` }}>
            <Icon size={28} style={{ color: b.accent }} />
          </div>
        </div>
        <div className="flex gap-1.5 mt-5">
          {BANNERS.map((_, i) => (
            <button key={i} onClick={() => setActive(i)} className="h-1 rounded-full transition-all"
              style={{ width: i === active ? '24px' : '6px', background: i === active ? b.accent : 'rgba(255,255,255,0.2)' }} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={onInstall}
          className="relative overflow-hidden rounded-2xl p-4 text-left cursor-pointer transition-all hover:scale-[1.03] active:scale-95 w-full"
          style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(16,185,129,0.04))', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: 'rgba(34,197,94,0.12)' }}>
            <Download size={16} style={{ color: '#22c55e' }} />
          </div>
          <p className="text-xs font-black text-white leading-tight">Download<br />Mobile App</p>
          <p className="text-[10px] text-gray-500 mt-1">iOS &amp; Android</p>
        </button>
        <div className="relative overflow-hidden rounded-2xl p-4"
          style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(139,92,246,0.04))', border: '1px solid rgba(168,85,247,0.15)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: 'rgba(168,85,247,0.12)' }}>
            <Award size={16} style={{ color: '#a855f7' }} />
          </div>
          <p className="text-xs font-black text-white leading-tight">Trusted<br />Partner</p>
          <p className="text-[10px] text-gray-500 mt-1">18+ Insurer</p>
        </div>
      </div>
    </div>
  );
};

// ─── PWA install components ───────────────────────────────────────────────────
export const PWAPopup: React.FC<{ onDismiss: () => void; onInstall: () => void }> = ({ onDismiss, onInstall }) => (
  <div className="fixed bottom-0 left-0 right-0 z-[200] p-4 animate-banner">
    <div className="max-w-md mx-auto rounded-3xl border border-white/10 backdrop-blur-xl overflow-hidden"
      style={{ background: 'rgba(5,20,10,0.95)', boxShadow: '0 -8px 60px rgba(34,197,94,0.2)' }}>
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(34,197,94,1) 0%, transparent 60%)' }} />
      <div className="relative p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 animate-glow"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
          <img src="/surepath-logo.png" alt="SurePath" className="w-10 h-10 object-contain" onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-sm">Install SurePath</p>
          <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">Akses lebih cepat langsung dari layar utama</p>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={onInstall} className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>Install</button>
          <button onClick={onDismiss} className="px-4 py-1.5 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-300 transition-colors">Nanti</button>
        </div>
      </div>
    </div>
  </div>
);

export const InstallModal: React.FC<{ onClose: () => void; onPwa: () => void; hasPwaPrompt: boolean }> = ({ onClose, onPwa, hasPwaPrompt }) => {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);
  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl p-7 space-y-5"
        style={{ background: 'rgba(10,20,12,0.98)', border: '1px solid rgba(34,197,94,0.2)', boxShadow: '0 -8px 60px rgba(34,197,94,0.15)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white">Install SurePath</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">✕</button>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Akses SurePath langsung dari layar utama HP Anda — lebih cepat, tanpa buka browser.
        </p>
        {hasPwaPrompt ? (
          <button onClick={onPwa}
            className="w-full py-3.5 rounded-2xl text-sm font-black text-black transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
            style={{ background: 'hsl(119,99%,46%)' }}>
            <Download size={16} /> Pasang ke Layar Utama
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-bold text-white">
              {isIos ? 'Cara install di iPhone / iPad:' : isAndroid ? 'Cara install di Android:' : 'Cara install di Desktop:'}
            </p>
            {(isIos
              ? ['1. Buka halaman ini di Safari', '2. Ketuk ikon Share (kotak dengan panah atas)', '3. Pilih "Add to Home Screen"', '4. Ketuk "Add" — selesai!']
              : isAndroid
              ? ['1. Ketuk menu ⋮ di pojok kanan atas Chrome', '2. Pilih "Add to Home screen" atau "Install app"', '3. Konfirmasi — selesai!']
              : ['1. Klik ikon install (⊕) di address bar browser', '2. Atau buka menu browser → "Install SurePath"', '3. Klik Install — selesai!']
            ).map(s => (
              <div key={s} className="text-xs py-2 px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)' }}>{s}</div>
            ))}
          </div>
        )}
        <p className="text-[0.55rem] text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
          SurePath PWA · Tidak memerlukan App Store · Gratis
        </p>
      </div>
    </div>
  );
};

// ─── Chrome context — exposes the PWA install handler to nested sections ───────
export const SiteChromeContext = createContext<{ onInstall: () => void }>({ onInstall: () => {} });
export const useSiteChrome = () => useContext(SiteChromeContext);
