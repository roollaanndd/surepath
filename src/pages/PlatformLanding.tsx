import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowRight, ChevronRight, Menu, X, Globe, Sun, Moon,
  Smartphone, Shield, BarChart2, Users, Zap,
  Star, Download, Gift, MessageSquare, ShieldCheck,
  Sparkles, CheckCircle, Search, Award, Play,
  Car, Plane, Heart, Leaf, HeartHandshake,
} from 'lucide-react';
import { Language } from '../../types';
import { SurePathLogo } from '../../components/Navbar';

interface Props {
  onSignIn: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  initialSection?: string;
}

const tx = (id: string, en: string, lang: Language) => lang === Language.EN ? en : id;

// ─── Keyframe injection ───────────────────────────────────────────────────────
const KEYFRAMES = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');

@keyframes aurora-drift {
  0%,100% { transform: translate(0,0) scale(1); }
  33%      { transform: translate(3%,-2%) scale(1.05); }
  66%      { transform: translate(-2%,3%) scale(0.97); }
}
@keyframes fade-up {
  from { opacity:0; transform:translateY(28px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes ticker-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@keyframes counter-pulse {
  0%,100% { opacity:1; }
  50%     { opacity:0.7; }
}
@keyframes float {
  0%,100% { transform: translateY(0px); }
  50%     { transform: translateY(-8px); }
}
@keyframes glow-pulse {
  0%,100% { box-shadow: 0 0 20px rgba(34,197,94,0.2); }
  50%     { box-shadow: 0 0 40px rgba(34,197,94,0.45), 0 0 80px rgba(34,197,94,0.15); }
}
@keyframes banner-in {
  from { opacity:0; transform:scale(0.96) translateY(8px); }
  to   { opacity:1; transform:scale(1) translateY(0); }
}
.animate-aurora    { animation: aurora-drift 18s ease-in-out infinite; }
.animate-aurora-2  { animation: aurora-drift 24s ease-in-out infinite reverse; }
.animate-aurora-3  { animation: aurora-drift 30s ease-in-out infinite 6s; }
.animate-ticker    { animation: ticker-scroll 28s linear infinite; }
.animate-float     { animation: float 4s ease-out infinite; }
.animate-float-2   { animation: float 5s ease-out infinite 1.5s; }
.animate-glow      { animation: glow-pulse 3s ease-in-out infinite; }
.animate-banner    { animation: banner-in 0.45s cubic-bezier(0.22,1,0.36,1) both; }
button:focus-visible, a:focus-visible {
  outline: 2px solid rgba(34,197,94,0.7);
  outline-offset: 3px;
  border-radius: 8px;
}
@media (prefers-reduced-motion: reduce) {
  .animate-aurora, .animate-aurora-2, .animate-aurora-3,
  .animate-ticker, .animate-float, .animate-float-2,
  .animate-glow, .animate-banner { animation: none; }
  * { transition-duration: 0.01ms !important; }
}
`;

// ─── Aurora full-page background ─────────────────────────────────────────────
const AuroraBackground: React.FC = () => (
  <>
    <style>{KEYFRAMES}</style>
    <div className="fixed inset-0 -z-10 overflow-hidden" style={{ background: '#040C06' }}>
      {/* Layer 1 — large primary orb */}
      <div className="animate-aurora absolute rounded-full opacity-[0.22]"
        style={{
          width: '110vw', height: '80vh',
          top: '-20vh', left: '-10vw',
          background: 'radial-gradient(ellipse, rgba(34,197,94,0.5) 0%, rgba(22,163,74,0.2) 40%, transparent 70%)',
          filter: 'blur(80px)',
        }} />
      {/* Layer 2 — teal drift */}
      <div className="animate-aurora-2 absolute rounded-full opacity-[0.14]"
        style={{
          width: '80vw', height: '70vh',
          bottom: '-10vh', right: '-15vw',
          background: 'radial-gradient(ellipse, rgba(16,185,129,0.6) 0%, rgba(5,150,105,0.25) 45%, transparent 70%)',
          filter: 'blur(100px)',
        }} />
      {/* Layer 3 — lime accent */}
      <div className="animate-aurora-3 absolute rounded-full opacity-[0.09]"
        style={{
          width: '60vw', height: '60vh',
          top: '30vh', left: '20vw',
          background: 'radial-gradient(ellipse, rgba(74,222,128,0.5) 0%, transparent 65%)',
          filter: 'blur(60px)',
        }} />
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.022]"
        style={{
          backgroundImage: 'linear-gradient(rgba(134,239,172,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(134,239,172,0.8) 1px,transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      {/* Vignette */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 120% 80% at 50% 100%, rgba(4,12,6,0.7) 0%, transparent 70%)' }} />
    </div>
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
      className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-x-0 translate-y-0' : hidden} ${className}`}>
      {children}
    </div>
  );
};

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

const PromoBanners: React.FC<{ onSignIn: () => void }> = ({ onSignIn }) => {
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
        <div className="relative overflow-hidden rounded-2xl p-4"
          style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(16,185,129,0.04))', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
            style={{ background: 'rgba(34,197,94,0.12)' }}>
            <Download size={16} style={{ color: '#22c55e' }} />
          </div>
          <p className="text-xs font-black text-white leading-tight">Download<br />Mobile App</p>
          <p className="text-[10px] text-gray-500 mt-1">iOS & Android</p>
        </div>
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
  { Icon: Car,          name: 'Asuransi Kendaraan', sub: 'Komprehensif & TLO', color: '#22c55e', desc: 'Perlindungan menyeluruh dari tabrakan hingga pencurian' },
  { Icon: Plane,        name: 'Asuransi Perjalanan', sub: 'Dalam & Luar Negeri', color: '#3b82f6', desc: 'Terlindungi di setiap perjalanan, ke mana pun tujuanmu' },
  { Icon: Shield,       name: 'Kecelakaan Diri',    sub: 'Personal Accident',   color: '#a855f7', desc: 'Santunan tepat untuk kejadian tak terduga dalam hidup' },
  { Icon: Smartphone,   name: 'Proteksi Barang',    sub: 'Gadget & Elektronik', color: '#f59e0b', desc: 'Lindungi perangkat kerasmu dari kerusakan & kehilangan' },
  { Icon: Heart,        name: 'Kesehatan',          sub: 'Individu & Keluarga', color: '#ef4444', desc: 'Akses layanan kesehatan terbaik tanpa khawatir biaya' },
];

// ─── Main Component ───────────────────────────────────────────────────────────
const PlatformLanding: React.FC<Props> = ({ onSignIn, lang, setLang, darkMode, setDarkMode, initialSection }) => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  const [pwaVisible, setPwaVisible] = useState(false);
  const [pwaInstalled, setPwaInstalled] = useState(false);
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

  // ── Styling vars ────────────────────────────────────────────────────────────
  const cardBg     = 'rgba(255,255,255,0.025)';
  const cardBorder = 'rgba(255,255,255,0.07)';
  const textMuted  = 'rgba(255,255,255,0.5)';

  return (
    <div className="min-h-screen text-white" style={{ fontFamily: "'IBM Plex Sans', 'Inter', system-ui, sans-serif" }}>
      <AuroraBackground />

      {/* ════════════════════════════════ NAVBAR ════════════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled ? 'rgba(4,12,6,0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(24px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(34,197,94,0.08)' : '1px solid transparent',
        }}>
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur-md"
                style={{ background: 'rgba(34,197,94,0.4)' }} />
              <img src="/surepath-logo.png" alt="SurePath" className="relative h-8 w-auto object-contain"
                onError={(e) => {
                  const t = e.target as HTMLImageElement;
                  t.style.display = 'none';
                  const next = t.nextElementSibling as HTMLElement | null;
                  if (next) next.style.display = 'flex';
                }} />
              <div className="hidden w-8 h-8 rounded-xl items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
                <SurePathLogo className="w-5 h-5" />
              </div>
            </div>
            <span className="font-black text-lg tracking-tight">
              Sure<span style={{ color: '#22c55e' }}>Path</span>
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map(l => (
              <a key={l.id} href={l.path}
                onClick={e => { e.preventDefault(); navScroll(l.id, l.path); }}
                className="text-sm font-medium transition-colors relative group"
                style={{ color: textMuted }}>
                <span className="group-hover:text-white transition-colors">{l.label}</span>
                <span className="absolute -bottom-0.5 left-0 w-0 h-px group-hover:w-full transition-all duration-300"
                  style={{ background: '#22c55e' }} />
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <a href="/admin" title="Admin"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all hover:border-emerald-500/40 hover:text-emerald-400"
              style={{ borderColor: cardBorder, color: textMuted }}>
              <ShieldCheck size={13} /> Admin
            </a>
            <button onClick={() => setLang(lang === Language.EN ? Language.ID : Language.EN)}
              aria-label="Switch language"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all min-h-[44px] sm:min-h-0"
              style={{ borderColor: cardBorder, color: textMuted }}>
              <Globe size={12} /> {lang}
            </button>
            <button onClick={() => setDarkMode(!darkMode)}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2.5 rounded-xl border transition-all hover:border-emerald-500/30 min-h-[44px] min-w-[44px] flex items-center justify-center"
              style={{ borderColor: cardBorder, color: textMuted }}>
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button onClick={onSignIn}
              className="hidden sm:flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 4px 24px rgba(34,197,94,0.25)' }}>
              {t('Masuk', 'Sign In')} <ArrowRight size={14} />
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 rounded-xl border" style={{ borderColor: cardBorder, color: textMuted }}>
              {menuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden mx-4 mb-4 rounded-2xl border p-4"
            style={{ background: 'rgba(4,12,6,0.97)', borderColor: cardBorder, backdropFilter: 'blur(24px)' }}>
            {navLinks.map(l => (
              <button key={l.id} onClick={() => navScroll(l.id, l.path)}
                className="flex items-center justify-between w-full py-3 border-b text-sm font-medium"
                style={{ borderColor: cardBorder, color: textMuted }}>
                <span>{l.label}</span><ChevronRight size={14} />
              </button>
            ))}
            <div className="flex gap-2 mt-4">
              <a href="/admin" className="flex-1 py-2.5 rounded-xl text-xs font-black text-center border"
                style={{ borderColor: 'rgba(34,197,94,0.3)', color: '#22c55e' }}>Admin</a>
              <button onClick={onSignIn}
                className="flex-1 py-2.5 rounded-xl text-xs font-black text-white"
                style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                {t('Masuk', 'Sign In')}
              </button>
            </div>
            <a href="/admin" className="flex items-center justify-center gap-2 mt-2 py-2.5 rounded-xl text-xs font-bold"
              style={{ border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}>
              <ShieldCheck size={13} /> Admin Dashboard
            </a>
          </div>
        )}
      </nav>

      {/* ═══════════════════════════════ HERO ═══════════════════════════════ */}
      <section data-hero className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Section gradient overlay */}
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(34,197,94,0.05) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-40"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(4,12,6,0.95))' }} />

        {/* Floating badge top */}
        <div className="absolute top-28 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[0.6rem] font-black uppercase tracking-[0.25em]"
            style={{
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)',
              color: '#86efac',
              backdropFilter: 'blur(12px)',
            }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
            {t('Platform Asuransi Digital', 'Digital Insurance Platform')}
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-5 py-24 flex flex-col items-center text-center">

          {/* Main headline */}
          <div className="max-w-4xl">
            <h1 className="font-black leading-[0.92] tracking-[-0.04em] mb-6"
              style={{ fontSize: 'clamp(3rem, 8vw, 7rem)', animation: 'fade-up 0.9s cubic-bezier(0.22,1,0.36,1) both 0.1s' }}>
              {t('Lindungi Yang', 'Protect What')}{' '}
              <span className="relative inline-block">
                <span style={{
                  background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  {t('Paling Berharga', 'Matters Most')}
                </span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 100 8" preserveAspectRatio="none" height="8">
                  <path d="M0,6 Q25,0 50,5 Q75,8 100,3" stroke="#22c55e" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
                </svg>
              </span>
              <br />
              {t('dalam Hidup', 'in Life')}
            </h1>

            <p className="text-lg leading-relaxed mb-10 max-w-2xl mx-auto"
              style={{ color: 'rgba(255,255,255,0.55)', animation: 'fade-up 0.9s cubic-bezier(0.22,1,0.36,1) both 0.25s' }}>
              {t(
                'SurePath menghadirkan platform asuransi yang transparan, mudah dipahami, dan dirancang sesuai dengan kebutuhan nyata kehidupanmu — bukan sekadar angka di atas kertas.',
                'SurePath delivers an insurance platform that\'s transparent, easy to understand, and designed around your real life needs — not just numbers on paper.',
              )}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center"
              style={{ animation: 'fade-up 0.9s cubic-bezier(0.22,1,0.36,1) both 0.4s' }}>
              <button onClick={onSignIn}
                className="group flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-base font-black text-white transition-all hover:scale-[1.03]"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 8px 40px rgba(34,197,94,0.35)' }}>
                {t('Mulai Konsultasi', 'Start Consultation')}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => navScroll('products', '/products')}
                className="group flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-base font-black transition-all hover:border-emerald-500/40"
                style={{ background: cardBg, border: `1px solid ${cardBorder}`, color: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)' }}>
                <Play size={16} className="group-hover:scale-110 transition-transform" style={{ color: '#22c55e' }} />
                {t('Jelajahi Produk', 'Explore Products')}
              </button>
            </div>
          </div>

          {/* Floating stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-20 max-w-2xl w-full"
            style={{ animation: 'fade-up 0.9s cubic-bezier(0.22,1,0.36,1) both 0.55s' }}>
            {[
              { n: '12,400+', l: t('Nasabah Aktif', 'Active Clients') },
              { n: '40+',     l: t('Produk Pilihan', 'Products') },
              { n: '18',      l: t('Partner Insurer', 'Insurer Partners') },
              { n: '5+',      l: t('Tahun Pengalaman', 'Years Experience') },
            ].map(s => (
              <div key={s.l} className="text-center rounded-2xl py-4 px-3"
                style={{ background: cardBg, border: `1px solid ${cardBorder}`, backdropFilter: 'blur(12px)' }}>
                <div className="text-2xl font-black" style={{ color: '#4ade80' }}>{s.n}</div>
                <div className="text-[0.65rem] font-medium mt-1" style={{ color: textMuted }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-float">
          <div className="w-5 h-8 rounded-full border flex items-start justify-center pt-1.5"
            style={{ borderColor: 'rgba(34,197,94,0.3)' }}>
            <div className="w-1 h-2 rounded-full" style={{ background: '#22c55e', animation: 'counter-pulse 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      </section>

      {/* ════════════════════════════ PARTNERS TICKER ════════════════════════ */}
      <div className="relative py-8 overflow-hidden border-y"
        style={{ borderColor: 'rgba(34,197,94,0.07)', background: 'rgba(4,12,6,0.6)', backdropFilter: 'blur(8px)' }}>
        <div className="flex animate-ticker whitespace-nowrap">
          {[...Array(2)].map((_, repeat) => (
            <div key={repeat} className="flex items-center gap-12 px-6">
              {['Allianz', 'ACA', 'Asuransi Adira', 'Jasindo', 'Tugu Insurance', 'Asuransi BCA', 'Sompo', 'Zurich', 'Astra Insurance', 'AXA Mandiri', 'Asuransi Sinar Mas', 'Lippo Insurance', 'Asuransi Reliance', 'MSIG', 'Asuransi Ramayana', 'Tokio Marine', 'Asuransi CAR', 'Asuransi Wahana Tata'].map(name => (
                <span key={name} className="text-sm font-bold flex-shrink-0"
                  style={{ color: 'rgba(134,239,172,0.35)' }}>
                  {name}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="absolute inset-y-0 left-0 w-20" style={{ background: 'linear-gradient(to right, rgba(4,12,6,0.6), transparent)' }} />
        <div className="absolute inset-y-0 right-0 w-20" style={{ background: 'linear-gradient(to left, rgba(4,12,6,0.6), transparent)' }} />
      </div>

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

      {/* ═══════════════════════════ PRODUCTS ════════════════════════════════ */}
      <section id="products" className="py-28 px-5" style={{ background: 'rgba(4,12,6,0.7)' }}>
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="flex items-end justify-between mb-14 flex-wrap gap-6">
              <div>
                <span className="inline-block text-[0.6rem] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full mb-5"
                  style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}>
                  {t('Produk Kami', 'Our Products')}
                </span>
                <h2 className="font-black leading-tight tracking-[-0.03em] text-white"
                  style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}>
                  {t('Perlindungan untuk Setiap', 'Protection for Every')}{' '}
                  <span style={{ background: 'linear-gradient(135deg,#4ade80,#22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {t('Aspek Hidupmu', 'Aspect of Life')}
                  </span>
                </h2>
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
                  onClick={onSignIn}
                  aria-label={`Learn more about ${p.name}`}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `radial-gradient(circle at 50% 0%, ${p.color}12, transparent 70%)` }} />
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 animate-float-2 relative"
                    style={{ background: `${p.color}14`, border: `1px solid ${p.color}25`, animationDelay: `${i * 0.4}s` }}>
                    <p.Icon size={22} style={{ color: p.color }} />
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
            <h2 className="font-black leading-tight tracking-[-0.03em] text-white"
              style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}>
              {t('Tiga Langkah Menuju', 'Three Steps to')}{' '}
              <span style={{ background: 'linear-gradient(135deg,#4ade80,#22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {t('Ketenangan Pikiran', 'Peace of Mind')}
              </span>
            </h2>
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
              <h2 className="font-black leading-tight tracking-[-0.03em] text-white"
                style={{ fontSize: 'clamp(2rem,4vw,3rem)' }}>
                {t('Cara Berbeda', 'A Different Way')}{' '}
                <span style={{ background: 'linear-gradient(135deg,#4ade80,#22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {t('Cara Kami Bekerja', 'We Work')}
                </span>
              </h2>
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
              <span style={{ background: 'linear-gradient(135deg,#4ade80,#22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {t('untuk Nasabah Kami', 'for Our Clients')}
              </span>
            </h2>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Reveal delay={0}>
            <PromoBanners onSignIn={onSignIn} />
          </Reveal>
          {/* Third highlight banner */}
          <Reveal delay={100}>
            <div className="relative overflow-hidden rounded-3xl p-8 h-full"
              style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(16,185,129,0.05) 100%)', border: '1px solid rgba(34,197,94,0.15)', minHeight: '300px' }}>
              <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.4), transparent)', filter: 'blur(40px)', transform: 'translate(30%,-30%)' }} />
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
                <span style={{ background: 'linear-gradient(135deg,#4ade80,#22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
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
                style={{ background: 'radial-gradient(ellipse, rgba(34,197,94,0.5), transparent)', filter: 'blur(60px)' }} />
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
                  { key: 'ig', label: 'Instagram' },
                  { key: 'in', label: 'LinkedIn' },
                  { key: 'tw', label: 'Twitter / X' },
                ].map(s => (
                  <button key={s.key} aria-label={s.label}
                    className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 hover:border-emerald-500/30"
                    style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                    <span className="text-[0.55rem] font-black uppercase tracking-wide" style={{ color: textMuted }}>{s.key}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Links */}
            {[
              {
                title: t('Produk', 'Products'),
                links: [t('Asuransi Kendaraan', 'Car Insurance'), t('Asuransi Perjalanan', 'Travel Insurance'), t('Kecelakaan Diri', 'Personal Accident'), t('Proteksi Barang', 'Property Protection'), t('Kesehatan', 'Health')],
              },
              {
                title: t('Perusahaan', 'Company'),
                links: [t('Tentang Kami', 'About Us'), t('Karir', 'Careers'), t('Blog', 'Blog'), t('Program Agen', 'Agent Program'), t('Kemitraan', 'Partnership')],
              },
              {
                title: t('Legal', 'Legal'),
                links: [t('Kebijakan Privasi', 'Privacy Policy'), t('Syarat & Ketentuan', 'Terms & Conditions'), t('Keamanan Data', 'Data Security')],
              },
            ].map(col => (
              <div key={col.title}>
                <p className="text-[0.6rem] font-black uppercase tracking-[0.25em] mb-5" style={{ color: '#22c55e' }}>{col.title}</p>
                <ul className="space-y-3">
                  {col.links.map(l => (
                    <li key={l}>
                      <button onClick={onSignIn}
                        className="text-sm transition-colors hover:text-white"
                        style={{ color: textMuted }}>{l}
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
              {[t('Privasi', 'Privacy'), t('Ketentuan', 'Terms'), t('Cookie', 'Cookie')].map(l => (
                <button key={l} className="text-[0.65rem] transition-colors hover:text-white"
                  style={{ color: 'rgba(255,255,255,0.2)' }}>{l}</button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ══════════════════════════ PWA POPUP ════════════════════════════════ */}
      {pwaVisible && !pwaInstalled && (
        <PWAPopup onDismiss={() => setPwaVisible(false)} onInstall={installPwa} />
      )}
    </div>
  );
};

export default PlatformLanding;
