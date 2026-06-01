import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowRight, ChevronRight, ChevronDown, Menu, X, Globe, Sun, Moon,
  Smartphone, Shield, BarChart2, Users, Zap,
  Star, Download, Gift, MessageSquare, ShieldCheck,
  Sparkles, CheckCircle, Search, Award, Play,
  Car, Plane, Heart, Leaf, HeartHandshake,
} from 'lucide-react';

import { Language } from '../../types';
import { SurePathLogo } from '../../components/Navbar';

interface Props {
  onSignIn: () => void;
  navigate: (path: string) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  initialSection?: string;
}

const tx = (id: string, en: string, lang: Language) => lang === Language.EN ? en : id;

// ─── Keyframe injection ───────────────────────────────────────────────────────
const SECTION_CSS = `
@keyframes ticker-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@keyframes float {
  0%,100% { transform: translateY(0px); }
  50%     { transform: translateY(-8px); }
}
@keyframes glow-pulse {
  0%,100% { box-shadow: 0 0 20px rgba(1,235,2,0.2); }
  50%     { box-shadow: 0 0 40px rgba(1,235,2,0.45), 0 0 80px rgba(1,235,2,0.15); }
}
@keyframes banner-in {
  from { opacity:0; transform:scale(0.96) translateY(8px); }
  to   { opacity:1; transform:scale(1) translateY(0); }
}
@keyframes fade-up {
  from { opacity:0; transform:translateY(28px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes chevron-bounce {
  0%,100% { transform: translateY(0); opacity: 0.9; }
  50%     { transform: translateY(5px); opacity: 0.4; }
}
@keyframes chevron-bounce-delayed {
  0%,100% { transform: translateY(0); opacity: 0.4; }
  50%     { transform: translateY(5px); opacity: 0.9; }
}
@keyframes trust-pulse {
  0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgba(1,235,2,0.5); }
  50%     { opacity: 0.7; box-shadow: 0 0 0 4px rgba(1,235,2,0); }
}
.animate-ticker         { animation: ticker-scroll 28s linear infinite; will-change: transform; }
.animate-float          { animation: float 4s ease-out infinite; will-change: transform; }
.animate-float-2        { animation: float 5s ease-out infinite 1.5s; will-change: transform; }
.animate-glow           { animation: glow-pulse 3s ease-in-out infinite; }
.animate-banner         { animation: banner-in 0.45s cubic-bezier(0.22,1,0.36,1) both; }
.animate-fade-up        { animation: fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both; }
.animate-chevron-1      { animation: chevron-bounce 1.4s ease-in-out infinite; }
.animate-chevron-2      { animation: chevron-bounce-delayed 1.4s ease-in-out infinite 0.3s; }
.animate-trust-pulse    { animation: trust-pulse 2s ease-in-out infinite; }
button:focus-visible, a:focus-visible {
  outline: 2px solid rgba(1,235,2,0.7);
  outline-offset: 3px;
  border-radius: 8px;
}
@media (prefers-reduced-motion: reduce) {
  .animate-ticker, .animate-float, .animate-float-2,
  .animate-glow, .animate-banner, .animate-fade-up,
  .animate-chevron-1, .animate-chevron-2, .animate-trust-pulse { animation: none; }
  .animate-fade-up { opacity: 1 !important; transform: none !important; }
  * { transition-duration: 0.01ms !important; }
}
`;

// ─── Dark section background (for sections below hero) ───────────────────────
const BODY_BG_CSS = `body { background: hsl(0 0% 8%) !important; }`;
const SectionBackground: React.FC = () => (
  <>
    <style>{SECTION_CSS}</style>
    <style>{BODY_BG_CSS}</style>
  </>
);

// ─── Reveal hook ──────────────────────────────────────────────────────────────
const useReveal = (threshold = 0.12) => {
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

const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number; from?: 'bottom'|'left'|'right' }> = ({
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
const AnimatedCounter: React.FC<{ target: number; suffix: string; duration?: number }> = ({
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
      if (current >= target) {
        setCount(target);
        clearInterval(iv);
      } else {
        setCount(Math.floor(current));
      }
    }, delay);
    return () => clearInterval(iv);
  }, [visible, target, duration]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
};

// ─── Video hero background ────────────────────────────────────────────────────
const HeroVideo: React.FC = () => (
  <video
    autoPlay
    muted
    loop
    playsInline
    preload="auto"
    className="absolute inset-0 w-full h-full object-cover"
  >
    <source src="/hero.mp4" type="video/mp4" />
  </video>
);


// ─── PWA Install Popup ────────────────────────────────────────────────────────
const PWAPopup: React.FC<{ onDismiss: () => void; onInstall: () => void }> = ({ onDismiss, onInstall }) => (
  <div className="fixed bottom-0 left-0 right-0 z-[200] p-4 animate-banner">
    <div className="max-w-md mx-auto rounded-3xl border border-white/10 backdrop-blur-xl overflow-hidden"
      style={{ background: 'rgba(5,20,10,0.95)', boxShadow: '0 -8px 60px rgba(34,197,94,0.2)' }}>
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(34,197,94,1) 0%, transparent 60%)' }} />
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
          <button onClick={onInstall}
            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
            Install
          </button>
          <button onClick={onDismiss} className="px-4 py-1.5 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-300 transition-colors">
            Nanti
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ─── App Install Modal ────────────────────────────────────────────────────────
const InstallModal: React.FC<{ onClose: () => void; onPwa: () => void; hasPwaPrompt: boolean }> = ({ onClose, onPwa, hasPwaPrompt }) => {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
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
        ) : isIos ? (
          <div className="space-y-3">
            <p className="text-xs font-bold text-white">Cara install di iPhone / iPad:</p>
            {[
              '1. Buka halaman ini di Safari',
              '2. Ketuk ikon Share (kotak dengan panah atas)',
              '3. Pilih "Add to Home Screen"',
              '4. Ketuk "Add" — selesai!',
            ].map(s => (
              <div key={s} className="text-xs py-2 px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)' }}>{s}</div>
            ))}
          </div>
        ) : isAndroid ? (
          <div className="space-y-3">
            <p className="text-xs font-bold text-white">Cara install di Android:</p>
            {[
              '1. Ketuk menu ⋮ di pojok kanan atas Chrome',
              '2. Pilih "Add to Home screen" atau "Install app"',
              '3. Konfirmasi — selesai!',
            ].map(s => (
              <div key={s} className="text-xs py-2 px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)' }}>{s}</div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-bold text-white">Cara install di Desktop:</p>
            {[
              '1. Klik ikon install (⊕) di address bar browser',
              '2. Atau buka menu browser → "Install SurePath"',
              '3. Klik Install — selesai!',
            ].map(s => (
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

// ─── Promo Banner ─────────────────────────────────────────────────────────────
const BANNERS = [
  {
    badge: 'Gratis',
    title: ['Konsultasi', 'dengan Agen Kami'],
    sub: 'Dapatkan saran perlindungan yang tepat, tanpa tekanan dan tanpa biaya.',
    cta: 'Mulai Chat',
    icon: MessageSquare,
    grad: 'linear-gradient(135deg, #052e16 0%, #064e3b 100%)',
    accent: '#22c55e',
    badgeBg: 'rgba(34,197,94,0.15)',
    badgeColor: '#4ade80',
  },
  {
    badge: 'Referral Program',
    title: ['Ajak Teman,', 'Raih Keuntungan'],
    sub: 'Setiap referral yang bergabung memberikan keuntungan nyata untuk Anda berdua.',
    cta: 'Lihat Syarat',
    icon: Gift,
    grad: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
    accent: '#818cf8',
    badgeBg: 'rgba(129,140,248,0.15)',
    badgeColor: '#a5b4fc',
  },
  {
    badge: 'Produk Unggulan',
    title: ['Proteksi Gadget', '& Elektronik'],
    sub: 'Satu produk untuk semua perangkat berhargamu. Mudah, terjangkau, komprehensif.',
    cta: 'Cek Harga',
    icon: Smartphone,
    grad: 'linear-gradient(135deg, #0c0a1e 0%, #1a0533 100%)',
    accent: '#c084fc',
    badgeBg: 'rgba(192,132,252,0.15)',
    badgeColor: '#e879f9',
  },
];

const PromoBanners: React.FC<{ onSignIn: () => void; onInstall: () => void }> = ({ onSignIn, onInstall }) => {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setActive(a => (a + 1) % BANNERS.length), 5000);
    return () => clearInterval(iv);
  }, []);
  const b = BANNERS[active];
  const Icon = b.icon;
  return (
    <div className="space-y-4">
      {/* Main rotating banner */}
      <div key={active} className="animate-banner relative overflow-hidden rounded-3xl p-7"
        style={{ background: b.grad, border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${b.accent}, transparent)`, filter: 'blur(30px)', transform: 'translate(30%,-30%)' }} />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1">
            <span className="inline-block text-[0.55rem] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full mb-4"
              style={{ background: b.badgeBg, color: b.badgeColor, border: `1px solid ${b.accent}30` }}>
              {b.badge}
            </span>
            <h3 className="text-2xl font-black text-white leading-tight mb-2">
              {b.title[0]}<br /><span style={{ color: b.accent }}>{b.title[1]}</span>
            </h3>
            <p className="text-sm text-gray-400 mb-5 max-w-xs leading-relaxed">{b.sub}</p>
            <button onClick={onSignIn}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:opacity-90"
              style={{ background: b.accent }}>
              {b.cta} <ArrowRight size={14} />
            </button>
          </div>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${b.accent}18`, border: `1px solid ${b.accent}30` }}>
            <Icon size={28} style={{ color: b.accent }} />
          </div>
        </div>
        {/* Dots */}
        <div className="flex gap-1.5 mt-5">
          {BANNERS.map((_, i) => (
            <button key={i} onClick={() => setActive(i)}
              className="h-1 rounded-full transition-all"
              style={{ width: i === active ? '24px' : '6px', background: i === active ? b.accent : 'rgba(255,255,255,0.2)' }} />
          ))}
        </div>
      </div>

      {/* Two small static banners */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={onInstall}
          className="relative overflow-hidden rounded-2xl p-4 text-left cursor-pointer transition-all hover:scale-[1.03] active:scale-95 w-full"
          style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(16,185,129,0.04))', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
            style={{ background: 'rgba(34,197,94,0.12)' }}>
            <Download size={16} style={{ color: '#22c55e' }} />
          </div>
          <p className="text-xs font-black text-white leading-tight">Download<br />Mobile App</p>
          <p className="text-[10px] text-gray-500 mt-1">iOS & Android</p>
        </button>
        <div className="relative overflow-hidden rounded-2xl p-4"
          style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(139,92,246,0.04))', border: '1px solid rgba(168,85,247,0.15)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
            style={{ background: 'rgba(168,85,247,0.12)' }}>
            <Award size={16} style={{ color: '#a855f7' }} />
          </div>
          <p className="text-xs font-black text-white leading-tight">Trusted<br />Partner</p>
          <p className="text-[10px] text-gray-500 mt-1">18+ Insurer</p>
        </div>
      </div>
    </div>
  );
};

// ─── Product Card ─────────────────────────────────────────────────────────────
const PRODUCTS = [
  { Icon: Car,        slug: 'car',      name: 'Asuransi Kendaraan', sub: 'Komprehensif & TLO', color: '#22c55e', desc: 'Perlindungan menyeluruh dari tabrakan hingga pencurian' },
  { Icon: Plane,      slug: 'travel',   name: 'Asuransi Perjalanan', sub: 'Dalam & Luar Negeri', color: '#3b82f6', desc: 'Terlindungi di setiap perjalanan, ke mana pun tujuanmu' },
  { Icon: Shield,     slug: 'pa',       name: 'Kecelakaan Diri',    sub: 'Personal Accident',   color: '#a855f7', desc: 'Santunan tepat untuk kejadian tak terduga dalam hidup' },
  { Icon: Smartphone, slug: 'property', name: 'Proteksi Barang',    sub: 'Gadget & Elektronik', color: '#f59e0b', desc: 'Lindungi perangkat kerasmu dari kerusakan & kehilangan' },
  { Icon: Heart,      slug: 'health',   name: 'Kesehatan',          sub: 'Individu & Keluarga', color: '#ef4444', desc: 'Akses layanan kesehatan terbaik tanpa khawatir biaya' },
];

// ─── Main Component ───────────────────────────────────────────────────────────
const PlatformLanding: React.FC<Props> = ({ onSignIn, navigate, lang, setLang, darkMode, setDarkMode, initialSection }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  const [pwaVisible, setPwaVisible] = useState(false);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [cmsConfig, setCmsConfig] = useState<Record<string, any>>({});

  const t = useCallback((id: string, en: string) => tx(id, en, lang), [lang]);

  // Scroll listener
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // CMS config
  useEffect(() => {
    import('../../db').then(({ db }) => {
      db.websiteConfig.toArray().then(cfgs => {
        const m: Record<string, any> = {};
        cfgs.forEach(c => { m[c.sectionKey] = c; });
        setCmsConfig(m);
      }).catch(() => {});
    });
  }, []);

  // PWA install
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setPwaPrompt(e); setTimeout(() => setPwaVisible(true), 4000); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setPwaInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installPwa = async () => {
    if (!pwaPrompt) return;
    pwaPrompt.prompt();
    await pwaPrompt.userChoice;
    setPwaVisible(false); setPwaPrompt(null);
  };

  const handleInstallClick = () => {
    if (pwaPrompt) { installPwa(); return; }
    setInstallModalOpen(true);
  };

  // Scroll to initial section
  useEffect(() => {
    if (!initialSection) return;
    const t = setTimeout(() => document.getElementById(initialSection)?.scrollIntoView({ behavior: 'smooth' }), 400);
    return () => clearTimeout(t);
  }, [initialSection]);

  // URL tracking as user scrolls
  useEffect(() => {
    const MAP: Record<string, string> = { products: '/products', 'how-it-works': '/how-it-works', claims: '/claims', partners: '/partners', about: '/about' };
    const els = Object.keys(MAP).map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const heroEl = document.querySelector('[data-hero]') as HTMLElement | null;
    if (!els.length && !heroEl) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const path = MAP[e.target.id];
          if (path && window.location.pathname !== path) window.history.replaceState({}, '', path);
        }
      });
    }, { threshold: 0.35 });
    const heroObs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && window.location.pathname !== '/') window.history.replaceState({}, '', '/');
    }, { threshold: 0.5 });
    els.forEach(el => obs.observe(el));
    if (heroEl) heroObs.observe(heroEl);
    return () => { obs.disconnect(); heroObs.disconnect(); };
  }, []);

  const navLinks = [
    { id: 'products',     path: '/products',     label: t('Produk', 'Products') },
    { id: 'how-it-works', path: '/how-it-works', label: t('Cara Kerja', 'How It Works') },
    { id: 'about',        path: '/about',        label: t('Tentang', 'About') },
  ];

  const navScroll = (id: string, path: string) => {
    setMenuOpen(false);
    window.history.pushState({}, '', path);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // ── Section heading reveal hooks ────────────────────────────────────────────
  const { ref: productsHeadingRef, visible: productsHeadingVisible } = useReveal(0.1);
  const { ref: howItWorksHeadingRef, visible: howItWorksHeadingVisible } = useReveal(0.1);
  const { ref: pillarsHeadingRef, visible: pillarsHeadingVisible } = useReveal(0.1);

  // ── Styling vars ────────────────────────────────────────────────────────────
  const cardBg     = 'rgba(255,255,255,0.025)';
  const cardBorder = 'rgba(255,255,255,0.07)';
  const textMuted  = 'rgba(255,255,255,0.65)';

  // ── lp green ─────────────────────────────────────────────────────────────
  const lpGreen = 'hsl(119 99% 46%)';

  return (
    <div className="min-h-screen text-white font-sora" style={{ background: 'hsl(0 0% 8%)' }}>
      <SectionBackground />

      {/* ════════════════════════════════ NAVBAR ════════════════════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-5 transition-all duration-300 ${scrolled ? 'backdrop-blur-md' : ''}`}
        style={{ background: scrolled ? 'rgba(10,10,10,0.85)' : 'transparent', borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 group">
          <img src="/surepath-logo.png" alt="SurePath" className="h-7 w-auto object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span className="text-xl font-semibold tracking-tight text-white">
            Sure<span style={{ color: lpGreen }}>Path</span>
          </span>
        </a>

        {/* Center nav links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(l => (
            <a key={l.id} href={l.path}
              onClick={e => { e.preventDefault(); navScroll(l.id, l.path); }}
              className="text-sm uppercase tracking-widest transition-colors hover:text-white"
              style={{ color: 'hsl(0 0% 60%)' }}>
              {l.label}
            </a>
          ))}
          <button onClick={() => navigate('/admin')}
            className="text-sm uppercase tracking-widest transition-colors hover:text-white"
            style={{ color: 'hsl(0 0% 60%)' }}>
            Admin
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button onClick={() => setLang(lang === Language.EN ? Language.ID : Language.EN)}
            aria-label="Switch language"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:opacity-80"
            style={{ background: 'hsl(0 0% 18%)', color: 'hsl(0 0% 96%)' }}>
            <Globe size={12} /> {lang}
          </button>
          <button onClick={onSignIn}
            className="hidden md:inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-white transition-all active:scale-[0.97] hover:opacity-80"
            style={{ background: 'hsl(0 0% 18%)', color: 'hsl(0 0% 96%)' }}>
            {t('Masuk', 'Get Started')}
          </button>
          <button onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            className="md:hidden p-2.5 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            style={{ background: 'hsl(0 0% 18%)', color: 'hsl(0 0% 96%)' }}>
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 mx-4 mt-2 rounded-2xl border p-4"
            style={{ background: 'hsl(0 0% 10%)', borderColor: 'hsl(0 0% 20%)', backdropFilter: 'blur(24px)' }}>
            {navLinks.map(l => (
              <button key={l.id} onClick={() => navScroll(l.id, l.path)}
                className="flex items-center justify-between w-full py-3 border-b text-sm font-medium uppercase tracking-widest"
                style={{ borderColor: 'hsl(0 0% 20%)', color: 'hsl(0 0% 60%)' }}>
                <span>{l.label}</span><ChevronRight size={14} />
              </button>
            ))}
            <div className="flex gap-2 mt-4">
              <button onClick={() => navigate('/admin')} className="flex-1 py-2.5 rounded-xl text-xs font-black"
                style={{ background: 'rgba(6,224,0,0.08)', border: `1px solid rgba(6,224,0,0.2)`, color: lpGreen }}>Admin</button>
              <button onClick={onSignIn}
                className="flex-1 py-2.5 rounded-xl text-xs font-black"
                style={{ background: lpGreen, color: 'hsl(0 0% 4%)' }}>
                {t('Masuk', 'Get Started')}
              </button>
            </div>
            <button onClick={() => { setLang(lang === Language.EN ? Language.ID : Language.EN); localStorage.setItem('SUREPATH_LANG', lang === Language.EN ? 'ID' : 'EN'); }}
              className="flex items-center justify-center gap-2 w-full mt-2 py-2.5 rounded-xl text-xs font-bold border transition-all"
              style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
              <Globe size={12} /> {lang === Language.EN ? 'Switch to Bahasa' : 'Switch to English'}
            </button>
          </div>
        )}
      </nav>

      {/* ═══════════════════════════════════ HERO ═══════════════════════════ */}
      <section data-hero className="relative min-h-screen min-h-[100dvh] flex items-end overflow-hidden"
        style={{ background: 'hsl(0 0% 4%)' }}>

        {/* 1. Blurred looping video background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <HeroVideo />
        </div>

        {/* 2. Gradient scrim — bottom-heavy for text legibility */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.72) 80%, rgba(0,0,0,0.88) 100%)',
          zIndex: 1,
        }} />

        {/* 2b. Radial vignette — dark edges, transparent center */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
          zIndex: 1,
        }} />

        {/* Content — anchored bottom-left */}
        <div className="relative w-full max-w-[90%] sm:max-w-md lg:max-w-2xl px-6 md:px-10 pb-12 md:pb-16 pt-32 pointer-events-none"
          style={{ zIndex: 2 }}>

          {/* Headline */}
          <h1 className="font-bold uppercase leading-[1.05] tracking-[-0.05em] mb-3 md:mb-5 opacity-0 animate-fade-up"
            style={{ fontSize: 'clamp(3rem,8vw,6rem)', animationDelay: '0.2s', color: 'hsl(0 0% 96%)' }}>
            Sure<span style={{ color: lpGreen, textShadow: '0 0 40px rgba(1,235,2,0.4)' }}>Path</span>
          </h1>

          {/* Subheading */}
          <p className="font-light mb-3 md:mb-6 opacity-0 animate-fade-up"
            style={{ fontSize: 'clamp(1.125rem,2.5vw,1.875rem)', animationDelay: '0.4s', color: 'rgba(245,245,245,0.8)' }}>
            {t('Kami Hadir untuk Melindungi.', 'We\'re here to protect.')}
          </p>

          {/* Description */}
          <p className="font-light mb-6 md:mb-8 max-w-lg opacity-0 animate-fade-up"
            style={{ fontSize: 'clamp(0.875rem,1.5vw,1.125rem)', animationDelay: '0.55s', color: 'rgba(255,255,255,0.78)', lineHeight: '1.7', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
            {t(
              'Platform asuransi digital yang transparan, humanis, dan berpusat pada kebutuhan nyata Anda — bukan sekadar angka di atas kertas. Satu platform, semua perlindungan.',
              'A transparent, human-centered digital insurance platform built around your real needs — not just numbers on paper. One platform, all your protection.',
            )}
          </p>

          {/* Separator */}
          <div className="opacity-0 animate-fade-up mb-6 md:mb-8 max-w-lg"
            style={{ animationDelay: '0.625s' }}>
            <div style={{ height: '1px', background: `rgba(1,235,2,0.30)` }} />
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-3 opacity-0 animate-fade-up"
            style={{ animationDelay: '0.7s' }}>
            <button onClick={onSignIn}
              className="pointer-events-auto px-6 py-3 md:px-8 md:py-4 text-sm cursor-pointer transition-all active:scale-[0.97] hover:brightness-110"
              style={{
                background: lpGreen,
                color: 'hsl(0 0% 4%)',
                borderRadius: '14px',
                fontWeight: 700,
                letterSpacing: '0.02em',
                boxShadow: '0 0 24px rgba(1,235,2,0.35)',
              }}>
              {t('Mulai Konsultasi', 'Book a Consultation')}
            </button>
            <button onClick={() => { navScroll('products', '/products'); }}
              className="pointer-events-auto px-6 py-3 md:px-8 md:py-4 text-sm cursor-pointer transition-all active:scale-[0.97] hover:brightness-110"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1.5px solid rgba(255,255,255,0.25)',
                color: 'white',
                borderRadius: '14px',
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}>
              {t('Lihat Produk', 'Our Products')}
            </button>
          </div>

          {/* Trust line */}
          <div className="mt-5 md:mt-7 flex items-center gap-2 opacity-0 animate-fade-up"
            style={{ animationDelay: '0.85s' }}>
            {/* Green pulse dot */}
            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0 animate-trust-pulse"
              style={{ background: 'rgba(1,235,2,0.85)' }} />
            <p className="text-xs font-light" style={{ color: 'hsl(0 0% 50%)' }}>
              {t('Platform asuransi terpercaya', 'Trusted insurance platform')}
              <span className="mx-1.5" style={{ color: 'rgba(1,235,2,0.4)' }}>·</span>
              {t('Jakarta, Indonesia', 'Jakarta, Indonesia')}
              <span className="mx-1.5" style={{ color: 'rgba(1,235,2,0.4)' }}>·</span>
              {t('12.400+ nasabah aktif', '12,400+ active clients')}
            </p>
          </div>
        </div>

        {/* Scroll indicator — alternating chevron pair */}
        <div className="absolute bottom-8 right-8 z-10 flex flex-col items-center pointer-events-none" style={{ gap: '2px' }}>
          <ChevronDown size={20} className="animate-chevron-1" style={{ color: lpGreen }} />
          <ChevronDown size={20} className="animate-chevron-2" style={{ color: lpGreen, marginTop: '-8px' }} />
        </div>
      </section>

      {/* ════════════════════════════ BENTO GRID ═════════════════════════════ */}
      <section className="py-28 max-w-7xl mx-auto px-5">
        <Reveal>
          <div className="text-center mb-16">
            <span className="inline-block text-[0.6rem] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full mb-5"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}>
              {t('Kenapa SurePath?', 'Why SurePath?')}
            </span>
            <h2 className="font-black leading-tight tracking-[-0.03em] text-white"
              style={{ fontSize: 'clamp(2rem,5vw,3.5rem)' }}>
              {t('Asuransi yang Benar-Benar', 'Insurance That Truly')}{' '}
              <span style={{ background: 'linear-gradient(135deg,#4ade80,#22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {t('Bekerja Untukmu', 'Works for You')}
              </span>
            </h2>
            <p className="mt-4 text-base max-w-xl mx-auto" style={{ color: textMuted }}>
              {t('Kami membangun platform ini bukan untuk menjual sebanyak mungkin, tapi untuk memastikan kamu mendapat perlindungan yang paling tepat.', 'We built this platform not to sell as much as possible, but to ensure you get the most appropriate protection.')}
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Wide card */}
          <Reveal className="md:col-span-2" delay={0}>
            <div className="group relative overflow-hidden rounded-3xl p-8 h-full min-h-[220px] cursor-default transition-all duration-500 hover:scale-[1.01]"
              style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.07), rgba(16,185,129,0.03))', border: `1px solid rgba(34,197,94,0.12)` }}>
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.08), transparent)', transform: 'translate(40%,-40%)' }} />
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <Sparkles size={22} style={{ color: '#22c55e' }} />
              </div>
              <h3 className="text-xl font-black text-white mb-3">{t('Analisis Kebutuhan Cerdas', 'Smart Needs Analysis')}</h3>
              <p className="text-sm leading-relaxed" style={{ color: textMuted }}>
                {t('Sebelum merekomendasikan satu pun produk, kami memahami konteks kehidupanmu secara menyeluruh. Agen dan teknologi kami bekerja bersama untuk menemukan solusi yang benar-benar sesuai — bukan yang paling menguntungkan secara komisi.', 'Before recommending any product, we fully understand your life context. Our agents and technology work together to find truly suitable solutions — not the most commission-profitable ones.')}
              </p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="group relative overflow-hidden rounded-3xl p-7 h-full min-h-[220px] transition-all duration-500 hover:scale-[1.02]"
              style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <Users size={20} style={{ color: '#3b82f6' }} />
              </div>
              <h3 className="text-lg font-black text-white mb-2">{t('Agen Berlisensi', 'Licensed Agents')}</h3>
              <p className="text-sm leading-relaxed" style={{ color: textMuted }}>
                {t('Seluruh agen kami telah lulus sertifikasi asuransi resmi dan terus diperbarui pengetahuannya.', 'All our agents hold official insurance certifications and continuously updated knowledge.')}
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="group relative overflow-hidden rounded-3xl p-7 h-full min-h-[180px] transition-all duration-500 hover:scale-[1.02]"
              style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <Search size={20} style={{ color: '#a855f7' }} />
              </div>
              <h3 className="text-lg font-black text-white mb-2">{t('Transparansi 100%', '100% Transparent')}</h3>
              <p className="text-sm leading-relaxed" style={{ color: textMuted }}>
                {t('Tidak ada biaya tersembunyi. Semua ketentuan polis dijelaskan dengan bahasa yang jelas.', 'No hidden fees. All policy terms explained in clear language.')}
              </p>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <div className="group relative overflow-hidden rounded-3xl p-7 h-full min-h-[180px] transition-all duration-500 hover:scale-[1.02]"
              style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <BarChart2 size={20} style={{ color: '#f59e0b' }} />
              </div>
              <h3 className="text-lg font-black text-white mb-2">{t('Pilihan Terlengkap', 'Widest Selection')}</h3>
              <p className="text-sm leading-relaxed" style={{ color: textMuted }}>
                {t('40+ produk dari 18 insurer terpercaya, satu platform untuk semua kebutuhan perlindunganmu.', '40+ products from 18 trusted insurers, one platform for all your protection needs.')}
              </p>
            </div>
          </Reveal>

          {/* Wide card 2 */}
          <Reveal className="md:col-span-2" delay={200}>
            <div className="group relative overflow-hidden rounded-3xl p-8 h-full min-h-[180px] transition-all duration-500 hover:scale-[1.01]"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(5,150,105,0.03))', border: '1px solid rgba(16,185,129,0.1)' }}>
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08), transparent)', transform: 'translate(-40%,40%)' }} />
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Zap size={20} style={{ color: '#10b981' }} />
              </div>
              <h3 className="text-xl font-black text-white mb-3">{t('Digital-First, Human Touch', 'Digital-First, Human Touch')}</h3>
              <p className="text-sm leading-relaxed" style={{ color: textMuted }}>
                {t('Teknologi modern memudahkan akses, tapi di baliknya ada manusia nyata yang peduli. Agen kami hadir untuk menjawab pertanyaan terdalam yang tidak bisa dijawab algoritma.', 'Modern technology makes access easy, but behind it are real humans who care. Our agents are here to answer the deep questions algorithms cannot.')}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════ STATS ════════════════════════════════════ */}
      <section className="py-20 px-5" style={{ background: 'hsl(0 0% 5%)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { target: 12400, suffix: '+', label: t('Nasabah Aktif', 'Active Clients') },
              { target: 98, suffix: '%', label: t('Tingkat Kepuasan', 'Satisfaction Rate') },
              { target: 18, suffix: '+', label: t('Mitra Insurer', 'Insurer Partners') },
              { target: 40, suffix: '+', label: t('Produk Tersedia', 'Products Available') },
            ].map((stat, i) => (
              <Reveal key={stat.label} delay={i * 80}>
                <div className="text-center p-6 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="font-black text-white mb-1"
                    style={{ fontSize: 'clamp(2rem,5vw,3rem)', lineHeight: 1, color: 'hsl(119,99%,46%)' }}>
                    <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                  </p>
                  <p className="text-xs font-medium mt-2" style={{ color: 'rgba(255,255,255,0.55)' }}>{stat.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ PRODUCTS ════════════════════════════════ */}
      <section id="products" className="py-28 px-5" style={{ background: 'hsl(0 0% 6%)' }}>
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="flex items-end justify-between mb-14 flex-wrap gap-6">
              <div>
                <span className="inline-block text-[0.6rem] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full mb-5"
                  style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}>
                  {t('Produk Kami', 'Our Products')}
                </span>
                <div ref={productsHeadingRef} className={`transition-[opacity,transform] duration-700 ease-out ${productsHeadingVisible ? 'animate-fade-up' : 'opacity-0 translate-y-4'}`}>
                  <h2 className="font-black leading-tight tracking-[-0.03em] text-white"
                    style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}>
                    {t('Perlindungan untuk Setiap', 'Protection for Every')}{' '}
                    <span style={{ color: lpGreen }}>
                      {t('Aspek Hidupmu', 'Aspect of Life')}
                    </span>
                  </h2>
                </div>
              </div>
              <button onClick={() => navScroll('products', '/products')}
                className="flex items-center gap-2 text-sm font-bold transition-colors"
                style={{ color: '#22c55e' }}>
                {t('Lihat Semua', 'View All')} <ChevronRight size={16} />
              </button>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {PRODUCTS.map((p, i) => (
              <Reveal key={p.name} delay={i * 60}>
                <button className="group relative overflow-hidden rounded-3xl p-6 cursor-pointer transition-all duration-500 hover:scale-[1.04] hover:-translate-y-1 w-full text-left min-h-[200px]"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                  onClick={() => navigate(`/product/${p.slug}`)}
                  aria-label={`Learn more about ${p.name}`}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `radial-gradient(circle at 50% 0%, ${p.color}12, transparent 70%)` }} />
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 group-hover:rotate-3 relative"
                    style={{ background: `linear-gradient(135deg, ${p.color}22, ${p.color}11)`, border: `1px solid ${p.color}33` }}>
                    <p.Icon size={28} style={{ color: p.color }} />
                  </div>
                  <h3 className="font-black text-white text-sm mb-1 leading-tight">{p.name}</h3>
                  <p className="text-[0.65rem] font-bold mb-3" style={{ color: p.color }}>{p.sub}</p>
                  <p className="text-xs leading-relaxed" style={{ color: textMuted }}>{p.desc}</p>
                  <div className="flex items-center gap-1.5 mt-4 text-xs font-bold transition-all"
                    style={{ color: p.color }}>
                    {t('Pelajari', 'Learn more')} <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ HOW IT WORKS ═════════════════════════════════ */}
      <section id="how-it-works" className="py-28 max-w-7xl mx-auto px-5">
        <Reveal>
          <div className="text-center mb-20">
            <span className="inline-block text-[0.6rem] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full mb-5"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}>
              {t('Cara Kerja', 'How It Works')}
            </span>
            <div ref={howItWorksHeadingRef} className={`transition-[opacity,transform] duration-700 ease-out ${howItWorksHeadingVisible ? 'animate-fade-up' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '100ms' }}>
              <h2 className="font-black leading-tight tracking-[-0.03em] text-white"
                style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}>
                {t('Tiga Langkah Menuju', 'Three Steps to')}{' '}
                <span style={{ color: lpGreen }}>
                  {t('Ketenangan Pikiran', 'Peace of Mind')}
                </span>
              </h2>
            </div>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-14 left-[20%] right-[20%] h-px"
            style={{ background: 'linear-gradient(to right, transparent, rgba(34,197,94,0.3), rgba(34,197,94,0.3), transparent)' }} />

          {[
            {
              n: '01', icon: MessageSquare, color: '#22c55e',
              title: t('Ceritakan Kebutuhanmu', 'Share Your Needs'),
              desc: t('Konsultasikan kebutuhan proteksi Anda dengan agen berpengalaman kami atau melalui platform digital yang mudah digunakan.', 'Consult your protection needs with our experienced agents or through our easy-to-use digital platform.'),
            },
            {
              n: '02', icon: Search, color: '#3b82f6',
              title: t('Temukan yang Tepat', 'Find the Right Fit'),
              desc: t('Kami membandingkan puluhan opsi dari berbagai insurer dan mempresentasikan pilihan yang paling sesuai profil risikomu.', 'We compare dozens of options from various insurers and present the choices most suited to your risk profile.'),
            },
            {
              n: '03', icon: Shield, color: '#a855f7',
              title: t('Terlindungi dengan Tenang', 'Protected with Ease'),
              desc: t('Polis aktif dan sepenuhnya dikelola secara digital. Kami tetap hadir mendampingi sepanjang perjalanan perlindunganmu.', 'Policy active and fully managed digitally. We remain present throughout your protection journey.'),
            },
          ].map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.n} delay={i * 120}>
                <div className="relative flex flex-col items-center text-center group">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl"
                      style={{ background: step.color, transform: 'scale(1.5)' }} />
                    <div className="relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-105"
                      style={{ background: `${step.color}0d`, border: `1px solid ${step.color}25` }}>
                      <Icon size={36} style={{ color: step.color }} />
                      <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-[0.6rem] font-black"
                        style={{ background: step.color, color: 'white' }}>{step.n}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-black text-white mb-3">{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{step.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ════════════════════════════ PILLARS ════════════════════════════════ */}
      <section className="py-28 overflow-hidden" style={{ background: 'rgba(4,12,6,0.6)' }}>
        <div className="max-w-7xl mx-auto px-5">
          <Reveal>
            <div className="text-center mb-20">
              <span className="inline-block text-[0.6rem] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full mb-5"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}>
                {t('Nilai Kami', 'Our Values')}
              </span>
              <div ref={pillarsHeadingRef} className={`transition-[opacity,transform] duration-700 ease-out ${pillarsHeadingVisible ? 'animate-fade-up' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '150ms' }}>
                <h2 className="font-black leading-tight tracking-[-0.03em] text-white"
                  style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}>
                  {t('Cara Berbeda', 'A Different Way')}{' '}
                  <span style={{ color: lpGreen }}>
                    {t('Cara Kami Bekerja', 'We Work')}
                  </span>
                </h2>
              </div>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              {
                Icon: HeartHandshake,
                title: t('Berpusat pada Manusia', 'Human-Centered'),
                desc: t('Di tengah tren otomasi, kami percaya keputusan penting dalam hidup perlu pendampingan manusia yang nyata. Bukan robot, bukan skrip — agen yang benar-benar peduli.', 'Amid automation trends, we believe important life decisions need real human accompaniment. Not robots, not scripts — agents who truly care.'),
                items: [t('Agen bersertifikat & berpengalaman', 'Certified & experienced agents'), t('Konsultasi tanpa target penjualan', 'Consultation without sales pressure'), t('Pendampingan jangka panjang', 'Long-term accompaniment')],
                accent: '#22c55e',
              },
              {
                Icon: BarChart2,
                title: t('Transparan & Jujur', 'Transparent & Honest'),
                desc: t('Kami percaya edukasi lebih bernilai dari promosi. Setiap produk yang kami rekomendasikan dijelaskan dengan jelas termasuk batasannya.', 'We believe education is more valuable than promotion. Every product we recommend is clearly explained including its limitations.'),
                items: [t('Penjelasan klausa penting', 'Important clause explanations'), t('Tidak ada biaya tersembunyi', 'No hidden fees'), t('Laporan berkala yang jelas', 'Clear periodic reports')],
                accent: '#3b82f6',
              },
              {
                Icon: Leaf,
                title: t('Mitra Jangka Panjang', 'Long-Term Partner'),
                desc: t('Hubungan kami tidak berakhir saat polis diterbitkan. Kami tumbuh bersama nasabah dan memastikan perlindungan selalu relevan dengan perjalanan hidupmu.', 'Our relationship does not end when the policy is issued. We grow with clients and ensure protection always stays relevant to your life journey.'),
                items: [t('Review polis berkala', 'Periodic policy review'), t('Notifikasi sebelum jatuh tempo', 'Pre-expiry notifications'), t('Adaptasi sesuai perubahan hidup', 'Adapts to life changes')],
                accent: '#a855f7',
              },
            ].map((p, i) => (
              <Reveal key={p.title} delay={i * 100}>
                <div className="group relative overflow-hidden rounded-3xl p-8 h-full transition-all duration-500 hover:scale-[1.02] cursor-default"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `radial-gradient(circle at 50% 0%, ${p.accent}08, transparent 70%)` }} />
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 animate-float relative"
                    style={{ background: `${p.accent}12`, border: `1px solid ${p.accent}25`, animationDelay: `${i * 0.8}s` }}>
                    <p.Icon size={26} style={{ color: p.accent }} />
                  </div>
                  <h3 className="text-xl font-black text-white mb-4">{p.title}</h3>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: textMuted }}>{p.desc}</p>
                  <ul className="space-y-2.5">
                    {p.items.map(item => (
                      <li key={item} className="flex items-center gap-2.5 text-sm">
                        <CheckCircle size={14} style={{ color: p.accent, flexShrink: 0 }} />
                        <span style={{ color: 'rgba(255,255,255,0.65)' }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════════════════ PROMO BANNERS ═════════════════════════════ */}
      <section className="py-28 max-w-7xl mx-auto px-5">
        <Reveal>
          <div className="text-center mb-14">
            <span className="inline-block text-[0.6rem] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full mb-5"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}>
              {t('Penawaran & Promosi', 'Offers & Promotions')}
            </span>
            <h2 className="font-black leading-tight tracking-[-0.03em] text-white"
              style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}>
              {t('Program Eksklusif', 'Exclusive Programs')}{' '}
              <span style={{ color: lpGreen }}>
                {t('untuk Nasabah Kami', 'for Our Clients')}
              </span>
            </h2>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Reveal delay={0}>
            <PromoBanners onSignIn={onSignIn} onInstall={handleInstallClick} />
          </Reveal>
          {/* Third highlight banner */}
          <Reveal delay={100}>
            <div className="relative overflow-hidden rounded-3xl p-8 h-full"
              style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(16,185,129,0.05) 100%)', border: '1px solid rgba(34,197,94,0.15)', minHeight: '300px' }}>
              <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.3), transparent)', transform: 'translate(30%,-30%)' }} />
              <span className="inline-block text-[0.55rem] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full mb-6"
                style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>
                {t('Mulai Sekarang', 'Start Now')}
              </span>
              <h3 className="text-3xl font-black text-white leading-tight mb-4">
                {t('Pertama Kali', 'First Time')}<br />
                <span style={{ color: '#22c55e' }}>{t('Bersama SurePath?', 'with SurePath?')}</span>
              </h3>
              <p className="text-sm leading-relaxed mb-8 max-w-xs" style={{ color: textMuted }}>
                {t('Mulai dengan konsultasi gratis 30 menit bersama agen berpengalaman kami. Tanpa komitmen, tanpa tekanan.', 'Start with a free 30-minute consultation with our experienced agent. No commitment, no pressure.')}
              </p>
              <div className="space-y-3">
                {[t('Analisis kebutuhan perlindunganmu', 'Analyze your protection needs'), t('Perbandingan produk yang relevan', 'Relevant product comparison'), t('Estimasi biaya yang transparan', 'Transparent cost estimate')].map(item => (
                  <div key={item} className="flex items-center gap-2.5 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22c55e' }} />
                    <span style={{ color: 'rgba(255,255,255,0.65)' }}>{item}</span>
                  </div>
                ))}
              </div>
              <button onClick={onSignIn}
                className="mt-8 flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black text-white transition-all hover:scale-[1.03]"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 8px 30px rgba(34,197,94,0.25)' }}>
                {t('Jadwalkan Konsultasi', 'Schedule Consultation')} <ArrowRight size={14} />
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════ TESTIMONIALS ═══════════════════════════════ */}
      <section className="py-28 px-5" style={{ background: 'rgba(4,12,6,0.7)' }}>
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <span className="inline-block text-[0.6rem] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full mb-5"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}>
                {t('Cerita Nasabah', 'Client Stories')}
              </span>
              <h2 className="font-black leading-tight tracking-[-0.03em] text-white"
                style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}>
                {t('Dipercaya, Karena', 'Trusted, Because')}{' '}
                <span style={{ color: lpGreen }}>
                  {t('Mereka Merasakannya', 'They Felt It')}
                </span>
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                name: 'Rafi A.',
                role: t('Pengusaha Muda', 'Young Entrepreneur'),
                city: 'Jakarta',
                quote: t('SurePath membantu saya menemukan produk yang benar-benar sesuai kebutuhan, bukan sekadar yang termurah atau yang paling banyak diiklankan. Agen mereka meluangkan waktu untuk benar-benar mendengarkan.', 'SurePath helped me find products truly suited to my needs, not just the cheapest or most advertised. Their agent took time to genuinely listen.'),
                rating: 5,
                initial: 'R',
                color: '#22c55e',
              },
              {
                name: 'Dewi S.',
                role: t('Profesional HR', 'HR Professional'),
                city: 'Surabaya',
                quote: t('Baru pertama kali saya memahami isi polis asuransi saya dengan baik. Agen SurePath menjelaskan setiap klausa penting dengan sabar dan jelas — tanpa jargon yang membingungkan.', 'For the first time I truly understood my insurance policy. SurePath\'s agent patiently explained each important clause clearly — without confusing jargon.'),
                rating: 5,
                initial: 'D',
                color: '#3b82f6',
              },
              {
                name: 'Hendra K.',
                role: t('Arsitek', 'Architect'),
                city: 'Bandung',
                quote: t('Proses seluruhnya digital namun saya tetap merasa ditangani secara personal. Ada manusia di balik teknologinya, dan itu yang membuat saya nyaman mempercayakan perlindungan keluarga kepada SurePath.', 'The entire process is digital yet I still felt handled personally. There are humans behind the technology, and that\'s what makes me comfortable entrusting my family\'s protection to SurePath.'),
                rating: 5,
                initial: 'H',
                color: '#a855f7',
              },
            ].map((t_, i) => (
              <Reveal key={t_.name} delay={i * 100}>
                <div className="relative overflow-hidden rounded-3xl p-7 h-full flex flex-col"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                  {/* Stars */}
                  <div className="flex gap-1 mb-5">
                    {[...Array(t_.rating)].map((_, j) => (
                      <Star key={j} size={14} fill="#f59e0b" style={{ color: '#f59e0b' }} />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed flex-1 mb-6" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    "{t_.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                      style={{ background: `${t_.color}18`, border: `1px solid ${t_.color}30`, color: t_.color }}>
                      {t_.initial}
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{t_.name}</p>
                      <p className="text-[0.65rem]" style={{ color: textMuted }}>{t_.role} · {t_.city}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════ CTA FINAL ════════════════════════════════ */}
      <section className="py-28 max-w-7xl mx-auto px-5">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] p-12 md:p-20 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(16,185,129,0.06) 50%, rgba(5,150,105,0.08) 100%)',
              border: '1px solid rgba(34,197,94,0.15)',
            }}>
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] -translate-y-1/2 rounded-full opacity-20"
                style={{ background: 'radial-gradient(ellipse, rgba(34,197,94,0.35), transparent)' }} />
            </div>
            <div className="relative z-10">
              <span className="inline-block text-[0.6rem] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full mb-8"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac' }}>
                {t('Mulai Hari Ini', 'Start Today')}
              </span>
              <h2 className="font-black leading-tight tracking-[-0.03em] text-white mb-6"
                style={{ fontSize: 'clamp(2.2rem,5vw,4rem)' }}>
                {t('Siap Memulai', 'Ready to Begin')}<br />
                <span style={{ background: 'linear-gradient(135deg,#4ade80,#22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {t('Perjalanan Proteksimu?', 'Your Protection Journey?')}
                </span>
              </h2>
              <p className="text-base max-w-xl mx-auto mb-10" style={{ color: textMuted }}>
                {t('Bergabung dengan lebih dari 12.000 nasabah yang sudah mempercayakan ketenangan hidup mereka kepada SurePath.', 'Join over 12,000 clients who have entrusted their peace of mind to SurePath.')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={onSignIn}
                  className="group flex items-center justify-center gap-3 px-10 py-4 rounded-2xl text-base font-black text-white transition-all hover:scale-[1.03] hover:shadow-2xl"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 8px 40px rgba(34,197,94,0.3)' }}>
                  {t('Mulai Sekarang', 'Start Now')}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => navScroll('products', '/products')}
                  className="group flex items-center justify-center gap-3 px-10 py-4 rounded-2xl text-base font-black transition-all"
                  style={{ background: cardBg, border: `1px solid rgba(34,197,94,0.2)`, color: '#4ade80' }}>
                  {t('Lihat Semua Produk', 'View All Products')}
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ═══════════════════════════ FOOTER ══════════════════════════════════ */}
      <footer id="about" style={{ borderTop: '1px solid rgba(34,197,94,0.07)', background: 'rgba(4,12,6,0.95)' }}>
        <div className="max-w-7xl mx-auto px-5 py-16">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-10">
            {/* Brand */}
            <div className="col-span-2 flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <img src="/surepath-logo.png" alt="SurePath" className="h-9 w-auto object-contain"
                  onError={(e) => {
                    const t = e.target as HTMLImageElement; t.style.display = 'none';
                    const n = t.nextElementSibling as HTMLElement | null; if (n) n.style.display = 'flex';
                  }} />
                <div className="hidden w-9 h-9 rounded-xl items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <SurePathLogo className="w-5 h-5" />
                </div>
                <span className="font-black text-xl tracking-tight text-white">
                  Sure<span style={{ color: '#22c55e' }}>Path</span>
                </span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs" style={{ color: textMuted }}>
                {t('Platform asuransi digital yang transparan, humanis, dan berpusat pada kebutuhan nyata Anda.', 'A transparent, human-centered digital insurance platform built around your real needs.')}
              </p>
              <p className="text-xs font-bold italic" style={{ color: 'rgba(134,239,172,0.5)' }}>
                "Your Path to Protection."
              </p>
              {/* Social */}
              <div className="flex gap-3 mt-1">
                {[
                  { key: 'ig', label: 'Instagram',  href: 'https://instagram.com/surepath.id' },
                  { key: 'in', label: 'LinkedIn',    href: 'https://linkedin.com/company/surepath-id' },
                  { key: 'tw', label: 'Twitter / X', href: 'https://x.com/surepath_id' },
                ].map(s => (
                  <a key={s.key} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                    className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 hover:border-emerald-500/30"
                    style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                    <span className="text-[0.55rem] font-black uppercase tracking-wide" style={{ color: textMuted }}>{s.key}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            {[
              {
                title: t('Produk', 'Products'),
                links: [
                  { label: t('Asuransi Kendaraan', 'Car Insurance'),    path: '/product/car' },
                  { label: t('Asuransi Perjalanan', 'Travel Insurance'), path: '/product/travel' },
                  { label: t('Kecelakaan Diri', 'Personal Accident'),    path: '/product/pa' },
                  { label: t('Proteksi Barang', 'Property Protection'),  path: '/product/property' },
                  { label: t('Kesehatan', 'Health'),                     path: '/product/health' },
                ],
              },
              {
                title: t('Perusahaan', 'Company'),
                links: [
                  { label: t('Tentang Kami', 'About Us'),      path: '/about' },
                  { label: t('Karir', 'Careers'),              path: '/careers' },
                  { label: t('Blog', 'Blog'),                  path: '/blog' },
                  { label: t('Program Agen', 'Agent Program'), path: '/agents' },
                  { label: t('Kemitraan', 'Partnership'),      path: '/partnership' },
                ],
              },
              {
                title: t('Legal', 'Legal'),
                links: [
                  { label: t('Kebijakan Privasi', 'Privacy Policy'),       path: '/privacy' },
                  { label: t('Syarat & Ketentuan', 'Terms & Conditions'),  path: '/terms' },
                  { label: t('Keamanan Data', 'Data Security'),            path: '/security' },
                ],
              },
            ].map(col => (
              <div key={col.title}>
                <p className="text-[0.6rem] font-black uppercase tracking-[0.25em] mb-5" style={{ color: '#22c55e' }}>{col.title}</p>
                <ul className="space-y-3">
                  {col.links.map(l => (
                    <li key={l.path}>
                      <button onClick={() => navigate(l.path)}
                        className="text-sm transition-colors hover:text-white"
                        style={{ color: textMuted }}>{l.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[0.65rem]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              © 2025 SurePath. {t('Seluruh hak dilindungi.', 'All rights reserved.')}
            </p>
            <div className="flex items-center gap-6">
              {[
                { label: t('Privasi', 'Privacy'), path: '/privacy' },
                { label: t('Ketentuan', 'Terms'), path: '/terms' },
                { label: t('Cookie', 'Cookie'),   path: '/cookie' },
              ].map(l => (
                <button key={l.path} onClick={() => navigate(l.path)}
                  className="text-[0.65rem] transition-colors hover:text-white"
                  style={{ color: 'rgba(255,255,255,0.2)' }}>{l.label}</button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ══════════════════════════ PWA POPUP ════════════════════════════════ */}
      {pwaVisible && !pwaInstalled && (
        <PWAPopup onDismiss={() => setPwaVisible(false)} onInstall={installPwa} />
      )}

      {/* ════════════════════════ INSTALL MODAL ══════════════════════════════ */}
      {installModalOpen && (
        <InstallModal
          onClose={() => setInstallModalOpen(false)}
          onPwa={() => { installPwa(); setInstallModalOpen(false); }}
          hasPwaPrompt={!!pwaPrompt}
        />
      )}
    </div>
  );
};

export default PlatformLanding;
