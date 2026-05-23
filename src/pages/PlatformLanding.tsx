import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sun,
  Moon,
  ArrowRight,
  Shield,
  Star,
  ChevronRight,
  Users,
  Clock,
  Award,
  TrendingUp,
  CheckCircle,
  Zap,
  Globe,
  Lock,
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { Language } from '../../types';

interface Props {
  onSignIn: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

// ─── Bilingual helper ────────────────────────────────────────────────────────
const tx = (id: string, en: string, lang: Language) => (lang === Language.EN ? en : id);

// ─── Reveal hook ─────────────────────────────────────────────────────────────
const useReveal = <T extends HTMLElement>(threshold = 0.1) => {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            obs.unobserve(e.target);
          }
        });
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible } as const;
};

// ─── Reveal wrapper ───────────────────────────────────────────────────────────
const Reveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
  from?: 'bottom' | 'left' | 'right';
}> = ({ children, className = '', delay = 0, from = 'bottom' }) => {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const hidden =
    from === 'left' ? '-translate-x-8 opacity-0' :
    from === 'right' ? 'translate-x-8 opacity-0' :
    'translate-y-8 opacity-0';
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transform-gpu transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-x-0 translate-y-0' : hidden} ${className}`}
    >
      {children}
    </div>
  );
};

// ─── Custom SVG: Car Insurance ────────────────────────────────────────────────
const CarSVG: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="carGrad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7c3aed" />
        <stop offset="1" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    {/* Car body */}
    <rect x="8" y="42" width="64" height="18" rx="4" fill="url(#carGrad)" opacity="0.9"/>
    {/* Car top */}
    <path d="M20 42 L26 26 L54 26 L60 42Z" fill="url(#carGrad)" opacity="0.7"/>
    {/* Windows */}
    <path d="M27 40 L30 30 L50 30 L53 40Z" fill="white" opacity="0.25"/>
    {/* Wheels */}
    <circle cx="22" cy="60" r="8" fill="#1e1b4b" stroke="url(#carGrad)" strokeWidth="2.5"/>
    <circle cx="22" cy="60" r="4" fill="url(#carGrad)" opacity="0.6"/>
    <circle cx="58" cy="60" r="8" fill="#1e1b4b" stroke="url(#carGrad)" strokeWidth="2.5"/>
    <circle cx="58" cy="60" r="4" fill="url(#carGrad)" opacity="0.6"/>
    {/* Shield overlay top-right */}
    <path d="M62 10 L74 15 L74 25 Q74 33 62 37 Q50 33 50 25 L50 15 Z" fill="#10b981" opacity="0.85"/>
    <path d="M58 23 L61 26 L67 19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─── Custom SVG: Travel Insurance ────────────────────────────────────────────
const TravelSVG: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="travelGrad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10b981" />
        <stop offset="1" stopColor="#0ea5e9" />
      </linearGradient>
    </defs>
    {/* Globe arc */}
    <circle cx="40" cy="44" r="28" stroke="url(#travelGrad)" strokeWidth="2" opacity="0.4"/>
    <path d="M12 44 Q40 28 68 44" stroke="url(#travelGrad)" strokeWidth="2" opacity="0.6"/>
    <path d="M16 36 Q40 50 64 36" stroke="url(#travelGrad)" strokeWidth="1.5" opacity="0.35"/>
    {/* Longitude lines */}
    <path d="M40 16 Q52 30 52 44 Q52 58 40 72" stroke="url(#travelGrad)" strokeWidth="1.5" opacity="0.4"/>
    <path d="M40 16 Q28 30 28 44 Q28 58 40 72" stroke="url(#travelGrad)" strokeWidth="1.5" opacity="0.4"/>
    {/* Plane */}
    <g transform="translate(28, 14) rotate(-35, 12, 12)">
      <path d="M12 2 L18 10 L30 10 L30 14 L18 14 L12 22 L8 22 L10 14 L4 14 L2 17 L0 17 L1 10 L0 3 L2 3 L4 6 L10 6 Z" fill="url(#travelGrad)" opacity="0.95"/>
    </g>
  </svg>
);

// ─── Custom SVG: Health Insurance ─────────────────────────────────────────────
const HealthSVG: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="healthGrad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ec4899" />
        <stop offset="1" stopColor="#f43f5e" />
      </linearGradient>
    </defs>
    {/* Heart */}
    <path d="M40 64 C40 64 10 46 10 26 C10 16 18 10 26 10 C31 10 36 13 40 17 C44 13 49 10 54 10 C62 10 70 16 70 26 C70 46 40 64 40 64Z" fill="url(#healthGrad)" opacity="0.85"/>
    {/* EKG line across heart */}
    <path d="M14 34 L22 34 L26 22 L30 46 L34 30 L38 38 L42 38 L46 34 L50 34 L54 26 L58 42 L62 34 L66 34" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
  </svg>
);

// ─── Custom SVG: PA Insurance ────────────────────────────────────────────────
const PASvg: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="paGrad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f97316" />
        <stop offset="1" stopColor="#eab308" />
      </linearGradient>
    </defs>
    {/* Protective ring */}
    <circle cx="40" cy="40" r="32" stroke="url(#paGrad)" strokeWidth="2.5" strokeDasharray="6 3" opacity="0.5"/>
    <circle cx="40" cy="40" r="24" stroke="url(#paGrad)" strokeWidth="2" opacity="0.3"/>
    {/* Human figure */}
    <circle cx="40" cy="22" r="7" fill="url(#paGrad)" opacity="0.9"/>
    <path d="M26 56 Q26 38 40 38 Q54 38 54 56" fill="url(#paGrad)" opacity="0.9"/>
    {/* Arms */}
    <path d="M28 44 L20 38" stroke="url(#paGrad)" strokeWidth="4" strokeLinecap="round" opacity="0.8"/>
    <path d="M52 44 L60 38" stroke="url(#paGrad)" strokeWidth="4" strokeLinecap="round" opacity="0.8"/>
  </svg>
);

// ─── Custom SVG: Gadget Insurance ────────────────────────────────────────────
const GadgetSVG: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="gadgetGrad" x1="0" y1="80" x2="80" y2="0" gradientUnits="userSpaceOnUse">
        <stop stopColor="#8b5cf6" />
        <stop offset="1" stopColor="#06b6d4" />
      </linearGradient>
    </defs>
    {/* Phone frame */}
    <rect x="22" y="6" width="36" height="64" rx="8" fill="url(#gadgetGrad)" opacity="0.15" stroke="url(#gadgetGrad)" strokeWidth="2.5"/>
    {/* Screen */}
    <rect x="27" y="16" width="26" height="40" rx="4" fill="url(#gadgetGrad)" opacity="0.2"/>
    {/* Home button */}
    <circle cx="40" cy="63" r="3" stroke="url(#gadgetGrad)" strokeWidth="1.5" opacity="0.7"/>
    {/* Lock symbol */}
    <rect x="33" y="30" width="14" height="12" rx="3" fill="url(#gadgetGrad)" opacity="0.8"/>
    <path d="M36 30 Q36 24 40 24 Q44 24 44 30" stroke="url(#gadgetGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    <circle cx="40" cy="35" r="2" fill="white" opacity="0.9"/>
  </svg>
);

// ─── Policy Card (Hero Visual) ────────────────────────────────────────────────
const PolicyCard: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const _ = darkMode; // suppress unused warning - darkMode informs context
  void _;
  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Glow blob behind card */}
      <div
        className="absolute inset-0 rounded-[2.5rem] blur-3xl opacity-40 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #7c3aed 0%, #3b82f6 50%, transparent 80%)' }}
      />

      {/* Main policy card */}
      <div
        className="relative rounded-[2rem] p-6 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.9) 0%, rgba(59,130,246,0.85) 60%, rgba(16,185,129,0.4) 100%)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.18)',
          boxShadow: '0 32px 80px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
          transform: 'perspective(800px) rotateY(-6deg) rotateX(2deg)',
        }}
      >
        {/* Dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Card header */}
        <div className="relative flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                <CarSVG className="w-4 h-4" />
              </div>
              <span className="text-white/70 text-xs font-semibold uppercase tracking-widest">Car Protection</span>
            </div>
            <p className="text-white font-black text-lg leading-tight">Premium Plan</p>
          </div>
          {/* Active badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-400/20 border border-emerald-400/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-300 text-xs font-bold">ACTIVE</span>
          </div>
        </div>

        {/* Policy number */}
        <div className="relative mb-5">
          <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Policy Number</p>
          <p className="text-white font-mono font-bold text-sm tracking-wider">SP-2025-0042-8831</p>
        </div>

        {/* Coverage + expiry */}
        <div className="relative grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Coverage</p>
            <p className="text-white font-black text-base">Rp 350 Jt</p>
          </div>
          <div>
            <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Valid Until</p>
            <p className="text-white font-black text-base">Dec 2026</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center">
              <Shield className="text-white" size={13} />
            </div>
            <span className="text-white/60 text-xs font-medium">SurePath Insurance</span>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-white/30 bg-gradient-to-br from-violet-400 to-blue-400 -ml-1" />
            ))}
          </div>
        </div>
      </div>

      {/* Floating badge: users */}
      <div
        className="absolute -top-4 -left-6 flex items-center gap-2 px-3 py-2 rounded-2xl text-white text-xs font-bold"
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
          boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
        }}
      >
        <Users size={12} />
        24k+ Pengguna
      </div>

      {/* Floating badge: OJK */}
      <div
        className="absolute -bottom-3 -right-4 flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold"
        style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#34d399',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <Award size={12} />
        OJK Licensed
      </div>

      {/* Floating particles */}
      {[
        { top: '10%', left: '-8%', size: 8, delay: '0s', dur: '3.2s' },
        { top: '60%', left: '-12%', size: 5, delay: '0.8s', dur: '4.1s' },
        { top: '80%', right: '-6%', size: 6, delay: '1.4s', dur: '3.7s' },
        { top: '20%', right: '-10%', size: 4, delay: '0.4s', dur: '5s' },
        { top: '45%', right: '-15%', size: 7, delay: '2s', dur: '3.5s' },
        { top: '5%', right: '10%', size: 4, delay: '1s', dur: '4.5s' },
      ].map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: p.size,
            height: p.size,
            top: p.top,
            left: 'left' in p ? p.left : undefined,
            right: 'right' in p ? p.right : undefined,
            background: i % 2 === 0
              ? 'radial-gradient(circle, #a78bfa, #7c3aed)'
              : 'radial-gradient(circle, #34d399, #10b981)',
            animation: `spParticle${(i % 3) + 1} ${p.dur} ease-in-out infinite`,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
};

// ─── Phone Mockup (Claims) ────────────────────────────────────────────────────
const PhoneMockup: React.FC<{ lang: Language }> = ({ lang }) => (
  <div className="relative flex justify-center items-center">
    {/* Glow */}
    <div
      className="absolute w-64 h-80 rounded-full blur-3xl opacity-25 pointer-events-none"
      style={{ background: 'radial-gradient(ellipse, #7c3aed, #10b981)' }}
    />

    {/* Phone frame */}
    <div
      className="relative w-52 rounded-[3rem] overflow-hidden"
      style={{
        background: 'rgba(15,10,40,0.95)',
        border: '3px solid rgba(255,255,255,0.12)',
        boxShadow: '0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      {/* Notch */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-24 h-5 rounded-full bg-black/80" />
      </div>

      {/* Screen content */}
      <div className="px-4 pb-6 pt-1 flex flex-col gap-3">
        {/* App header */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-white font-black text-sm">{tx('Klaim Baru', 'New Claim', lang)}</p>
          <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center">
            <X size={10} className="text-violet-400" />
          </div>
        </div>

        {/* Photo upload area */}
        <div
          className="rounded-2xl p-4 flex flex-col items-center gap-2"
          style={{
            background: 'rgba(124,58,237,0.12)',
            border: '1.5px dashed rgba(124,58,237,0.4)',
          }}
        >
          {/* Camera icon custom SVG */}
          <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="rgb(167,139,250)" strokeWidth="1.8">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <p className="text-white/70 text-[10px] font-semibold text-center">{tx('Foto Kerusakan', 'Photo Damage', lang)}</p>
          <p className="text-white/30 text-[9px] text-center">tap to capture</p>
        </div>

        {/* Form fields */}
        <div className="space-y-2">
          {[
            { label: tx('Nomor Polis', 'Policy No', lang), val: 'SP-2025-0042' },
            { label: tx('Jenis Insiden', 'Incident Type', lang), val: tx('Kecelakaan', 'Accident', lang) },
          ].map((f) => (
            <div key={f.label} className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-white/40 text-[8px] uppercase tracking-wider">{f.label}</p>
              <p className="text-white/80 text-xs font-semibold">{f.val}</p>
            </div>
          ))}
        </div>

        {/* Status: submitted */}
        <div
          className="rounded-xl p-2.5 flex items-center gap-2"
          style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}
        >
          <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-emerald-300 text-[10px] font-bold">Submitted ✓</p>
            <p className="text-emerald-400/60 text-[8px]">{tx('Dalam proses', 'Processing...', lang)}</p>
          </div>
        </div>

        {/* Bottom pill */}
        <div
          className="rounded-xl py-2.5 text-center text-white text-xs font-bold"
          style={{ background: 'linear-gradient(90deg, #7c3aed, #3b82f6)' }}
        >
          {tx('Kirim Klaim', 'Submit Claim', lang)}
        </div>
      </div>

      {/* Home bar */}
      <div className="flex justify-center pb-3">
        <div className="w-24 h-1 rounded-full bg-white/20" />
      </div>
    </div>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
// ─── Animated Mesh Background ─────────────────────────────────────────────────
interface Orb { ax: number; ay: number; fx: number; fy: number; px: number; py: number; r: number; h: number; s: number; l: number; a: number; }

const AnimatedBackground: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const orbs: Orb[] = [
      { ax: 0.55, ay: 0.30, fx: 0.00031, fy: 0.00023, px: 0,    py: 0.5,  r: 380, h: 265, s: 80, l: 55, a: 0 },
      { ax: 0.35, ay: 0.65, fx: 0.00019, fy: 0.00041, px: 1.5,  py: 2.1,  r: 320, h: 210, s: 70, l: 50, a: 0 },
      { ax: 0.75, ay: 0.55, fx: 0.00027, fy: 0.00017, px: 3.2,  py: 0.8,  r: 280, h: 165, s: 75, l: 50, a: 0 },
      { ax: 0.20, ay: 0.25, fx: 0.00043, fy: 0.00033, px: 0.7,  py: 3.5,  r: 240, h: 30,  s: 80, l: 60, a: 0 },
      { ax: 0.85, ay: 0.80, fx: 0.00015, fy: 0.00025, px: 2.8,  py: 1.2,  r: 300, h: 185, s: 65, l: 55, a: 0 },
      { ax: 0.50, ay: 0.50, fx: 0.00037, fy: 0.00029, px: 4.0,  py: 4.0,  r: 200, h: 140, s: 60, l: 55, a: 0 },
    ];

    let w = 0, h = 0, raf = 0;
    const resize = () => {
      w = canvas.width  = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const opacity = darkMode ? 0.13 : 0.055;
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      t += 1;
      for (const o of orbs) {
        const cx = (o.ax + 0.18 * Math.sin(o.fx * t + o.px)) * w;
        const cy = (o.ay + 0.16 * Math.cos(o.fy * t + o.py)) * h;
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, o.r);
        grd.addColorStop(0,   `hsla(${o.h},${o.s}%,${o.l}%,${opacity})`);
        grd.addColorStop(0.5, `hsla(${o.h},${o.s}%,${o.l}%,${opacity * 0.4})`);
        grd.addColorStop(1,   `hsla(${o.h},${o.s}%,${o.l}%,0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, o.r, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [darkMode]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
    />
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const PlatformLanding: React.FC<Props> = ({ onSignIn, lang, setLang, darkMode, setDarkMode }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cmsConfig, setCmsConfig] = useState<Record<string, import('../../db').WebsiteSection>>({});

  const t = useCallback((id: string, en: string) => tx(id, en, lang), [lang]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    import('../../db').then(({ db }) => {
      db.websiteConfig.toArray().then(configs => {
        const map: Record<string, import('../../db').WebsiteSection> = {};
        configs.forEach(c => { map[c.sectionKey] = c; });
        setCmsConfig(map);
      }).catch(() => {});
    });
  }, []);

  const toggleLang = () => setLang(lang === Language.EN ? Language.ID : Language.EN);
  const toggleDark = () => setDarkMode(!darkMode);

  const isDark = darkMode;

  // ── Data ────────────────────────────────────────────────────────────────────
  const products = [
    {
      svg: CarSVG,
      name: t('Asuransi Kendaraan', 'Car Insurance'),
      subtitle: t('Komprehensif & TLO', 'Comprehensive & TLO'),
      desc: t('Perlindungan total kendaraan dari benturan, bencana alam, hingga kehilangan.', 'Total vehicle protection from collision, natural disasters, to theft.'),
      pills: ['All Risk', 'TLO', t('Banjir', 'Flood')],
      price: t('Rp 1,2 Jt/tahun', 'Rp 1.2M/year'),
      badge: t('Terlaris', 'Best Seller'),
      grad: 'from-violet-600/20 to-indigo-600/20',
      border: 'border-violet-500/20',
      iconGrad: 'from-violet-500 to-indigo-600',
    },
    {
      svg: TravelSVG,
      name: t('Asuransi Perjalanan', 'Travel Insurance'),
      subtitle: t('Domestik & Internasional', 'Domestic & International'),
      desc: t('Perjalanan aman ke seluruh penjuru dunia dengan perlindungan medis & bagasi.', 'Safe worldwide travel with medical & baggage protection.'),
      pills: ['Medical', 'Bagasi', 'Delay'],
      price: t('Rp 89rb/trip', 'Rp 89K/trip'),
      badge: '',
      grad: 'from-emerald-600/20 to-teal-600/20',
      border: 'border-emerald-500/20',
      iconGrad: 'from-emerald-500 to-teal-600',
    },
    {
      svg: HealthSVG,
      name: t('Asuransi Kesehatan', 'Health Insurance'),
      subtitle: t('Rawat Inap & Jalan', 'Inpatient & Outpatient'),
      desc: t('Jaringan 2.000+ RS di seluruh Indonesia. Cashless, tanpa antri panjang.', '2,000+ hospitals across Indonesia. Cashless, no long queues.'),
      pills: ['Cashless', 'Rawat Jalan', 'ICU'],
      price: t('Rp 250rb/bln', 'Rp 250K/mo'),
      badge: '',
      grad: 'from-pink-600/20 to-rose-600/20',
      border: 'border-pink-500/20',
      iconGrad: 'from-pink-500 to-rose-600',
    },
    {
      svg: PASvg,
      name: t('Jiwa & Kecelakaan Diri', 'Life & PA Insurance'),
      subtitle: t('Santunan Jiwa & PA', 'Life & Personal Accident'),
      desc: t('Santunan jiwa dan kecelakaan diri dengan proses klaim tercepat di industri.', 'Life and personal accident benefits with the fastest claim processing in the industry.'),
      pills: ['PA', t('Jiwa', 'Life'), t('Cacat', 'Disability')],
      price: t('Rp 120rb/bln', 'Rp 120K/mo'),
      badge: '',
      grad: 'from-orange-500/20 to-amber-500/20',
      border: 'border-orange-500/20',
      iconGrad: 'from-orange-500 to-amber-500',
    },
    {
      svg: GadgetSVG,
      name: t('Asuransi Gadget', 'Gadget Insurance'),
      subtitle: t('Smartphone & Laptop', 'Smartphone & Laptop'),
      desc: t('Lindungi perangkat elektronik dari kerusakan fisik, kehilangan, dan kerusakan cairan.', 'Protect electronics from physical damage, loss, and liquid damage.'),
      pills: ['Crack Screen', t('Kehilangan', 'Loss'), 'Liquid'],
      price: t('Rp 45rb/bln', 'Rp 45K/mo'),
      badge: '',
      grad: 'from-cyan-600/20 to-violet-600/20',
      border: 'border-cyan-500/20',
      iconGrad: 'from-cyan-500 to-violet-600',
    },
  ];

  const howItWorks = [
    {
      num: '01',
      title: t('Pilih Produk', 'Choose Product'),
      desc: t('Pilih dari 5 kategori asuransi dan sesuaikan kebutuhanmu dalam hitungan detik.', 'Choose from 5 insurance categories and customize your needs in seconds.'),
      color: 'text-violet-400',
      glowColor: 'rgba(124,58,237,0.3)',
    },
    {
      num: '02',
      title: t('Isi Data', 'Fill Your Details'),
      desc: t('Isi form singkat — AI kami akan bantu pra-isi dari data yang sudah ada.', 'Fill a short form — our AI pre-fills from your existing data.'),
      color: 'text-blue-400',
      glowColor: 'rgba(59,130,246,0.3)',
    },
    {
      num: '03',
      title: t('Bayar & Aktif', 'Pay & Activate'),
      desc: t('Bayar via transfer, kartu, atau QRIS. Polis aktif & dikirim dalam 60 detik.', 'Pay via transfer, card, or QRIS. Policy activated & delivered in 60 seconds.'),
      color: 'text-emerald-400',
      glowColor: 'rgba(16,185,129,0.3)',
    },
  ];

  const claimSteps = [
    { emoji: '📷', label: t('Foto', 'Photo'), desc: t('Ambil foto insiden', 'Take incident photo') },
    { emoji: '📋', label: t('Isi Form', 'Fill Form'), desc: t('Form singkat 3 field', '3-field short form') },
    { emoji: '🚀', label: t('Kirim', 'Submit'), desc: t('Kirim langsung', 'Submit instantly') },
    { emoji: '✅', label: t('Diproses', 'Processing'), desc: t('Notifikasi real-time', 'Real-time notification') },
  ];

  const stats = [
    { val: '24.000+', label: t('Pengguna Aktif', 'Active Users'), sub: t('& terus bertambah', '& growing'), icon: Users },
    { val: '99.2%', label: t('Tingkat Persetujuan', 'Approval Rate'), sub: t('klaim disetujui', 'claims approved'), icon: CheckCircle },
    { val: '< 5 Mnt', label: t('Proses Klaim', 'Claim Process'), sub: t('rata-rata', 'average'), icon: Clock },
    { val: 'Rp 12M+', label: t('Total Dibayar', 'Total Paid'), sub: t('kepada nasabah', 'to customers'), icon: TrendingUp },
  ];

  const testimonials = [
    {
      name: 'Andi Prasetyo',
      meta: t('Jakarta · Asuransi Mobil', 'Jakarta · Car Insurance'),
      quote: t('"Proses klaim cuma 10 menit! Foto, upload, selesai. Nggak perlu ribet ke kantor sama sekali."', '"Claim took just 10 minutes! Photo, upload, done. No need to go to the office at all."'),
      rating: 5,
      init: 'A',
      color: 'from-violet-600 to-indigo-600',
    },
    {
      name: 'Sari Dewi',
      meta: t('Surabaya · Perjalanan', 'Surabaya · Travel'),
      quote: t('"Bagasi hilang di Singapura, klaim langsung cair di hari yang sama. Benar-benar luar biasa!"', '"Luggage lost in Singapore, claim disbursed the same day. Truly incredible!"'),
      rating: 5,
      init: 'S',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      name: 'Budi Santoso',
      meta: t('Bandung · Jiwa & PA', 'Bandung · Life & PA'),
      quote: t('"SurePath jauh lebih murah dari asuransi konvensional dengan manfaat yang bahkan lebih baik."', '"SurePath is much cheaper than conventional insurance with even better benefits."'),
      rating: 5,
      init: 'B',
      color: 'from-blue-500 to-cyan-600',
    },
  ];

  const footerLinks = {
    [t('Produk', 'Products')]: [
      t('Asuransi Kendaraan', 'Car Insurance'),
      t('Asuransi Perjalanan', 'Travel Insurance'),
      t('Asuransi Kesehatan', 'Health Insurance'),
      t('Jiwa & PA', 'Life & PA'),
      t('Asuransi Gadget', 'Gadget Insurance'),
    ],
    [t('Perusahaan', 'Company')]: [
      t('Tentang Kami', 'About Us'),
      t('Karir', 'Careers'),
      t('Blog', 'Blog'),
      t('Mitra', 'Partners'),
    ],
    [t('Legal', 'Legal')]: [
      t('Syarat & Ketentuan', 'Terms & Conditions'),
      t('Kebijakan Privasi', 'Privacy Policy'),
      t('Perizinan OJK', 'OJK License'),
    ],
  };

  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const surfaceBg = isDark ? 'bg-white/[0.04]' : 'bg-white';
  const borderColor = isDark ? 'border-white/[0.08]' : 'border-slate-200';
  const pageBg = isDark ? '#030712' : '#f8fafc';

  return (
    <>
      {/* ── Keyframe styles ───────────────────────────────────────────────── */}
      <style>{`
        @keyframes spMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes spGradShift {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 200% 50%; }
        }
        @keyframes spParticle1 {
          0%,100% { transform: translateY(0px) scale(1); opacity:0.7; }
          50% { transform: translateY(-16px) scale(1.2); opacity:1; }
        }
        @keyframes spParticle2 {
          0%,100% { transform: translateY(0px) scale(1) translateX(0); opacity:0.5; }
          50% { transform: translateY(-10px) scale(0.9) translateX(6px); opacity:0.9; }
        }
        @keyframes spParticle3 {
          0%,100% { transform: translateY(0px) rotate(0deg); opacity:0.6; }
          50% { transform: translateY(-20px) rotate(180deg); opacity:1; }
        }
        @keyframes spCardFloat {
          0%,100% { transform: perspective(800px) rotateY(-6deg) rotateX(2deg) translateY(0px); }
          50% { transform: perspective(800px) rotateY(-6deg) rotateX(2deg) translateY(-12px); }
        }
        @keyframes spPulseRing {
          0% { transform: scale(1); opacity:0.6; }
          100% { transform: scale(1.5); opacity:0; }
        }
        .sp-grad-text {
          background: linear-gradient(135deg, #a78bfa 0%, #818cf8 40%, #67e8f9 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: spGradShift 5s ease-in-out infinite;
        }
        .sp-grad-orange {
          background: linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fbbf24 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .sp-marquee { animation: spMarquee 30s linear infinite; }
        .sp-card-float {
          animation: spCardFloat 5s ease-in-out infinite;
        }
        .sp-product-card {
          transition: transform 0.4s cubic-bezier(0.23,1,0.32,1), box-shadow 0.4s, border-color 0.3s;
        }
        .sp-product-card:hover {
          transform: translateY(-4px) scale(1.005);
        }
        .sp-btn-primary {
          background: linear-gradient(135deg, #f97316, #fb923c, #fbbf24);
          background-size: 200% 200%;
          transition: all 0.3s ease;
          box-shadow: 0 8px 32px rgba(249,115,22,0.35);
        }
        .sp-btn-primary:hover {
          background-position: right center;
          box-shadow: 0 12px 40px rgba(249,115,22,0.5);
          transform: scale(1.03) translateY(-1px);
        }
        .sp-glass {
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .sp-noise::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          border-radius: inherit;
        }
        @media (prefers-reduced-motion: reduce) {
          .sp-card-float, .sp-marquee, .sp-grad-text { animation: none !important; }
        }
      `}</style>

      <div
        className={`${textPrimary} min-h-screen overflow-x-hidden font-sans relative`}
        style={{ background: pageBg }}
      >
        <AnimatedBackground darkMode={darkMode} />
        {/* ══════════════════════════════════════════════════════════════════
            NAV
        ══════════════════════════════════════════════════════════════════ */}
        <nav
          className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
            isScrolled
              ? 'py-2'
              : 'py-4'
          }`}
        >
          <div className={`mx-4 md:mx-auto md:max-w-6xl transition-all duration-500 ${
            isScrolled
              ? `rounded-2xl sp-glass border ${borderColor} ${isDark ? 'bg-[#030712]/80' : 'bg-white/80'} shadow-2xl shadow-black/20 px-5`
              : 'px-6'
          }`}>
            <div className="h-14 flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                >
                  <Shield size={16} className="text-white" />
                </div>
                <span className="font-black text-xl tracking-tight">
                  <span className={textPrimary}>Sure</span>
                  <span className="sp-grad-text">Path</span>
                </span>
              </div>

              {/* Desktop nav links */}
              <div className="hidden lg:flex items-center gap-7">
                {[
                  { href: '#products', label: t('Produk', 'Products') },
                  { href: '#how-it-works', label: t('Cara Kerja', 'How It Works') },
                  { href: '#claims', label: t('Klaim', 'Claims') },
                  { href: '#about', label: t('Tentang', 'About') },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-medium ${textMuted} hover:text-violet-400 transition-colors relative group`}
                  >
                    {link.label}
                    <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-violet-400 group-hover:w-full transition-all duration-300" />
                  </a>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Lang toggle */}
                <button
                  onClick={toggleLang}
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${borderColor} ${textMuted} hover:border-violet-500/50 hover:text-violet-400 transition-all`}
                >
                  <Globe size={12} />
                  {lang}
                </button>

                {/* Dark mode */}
                <button
                  onClick={toggleDark}
                  className={`p-2 rounded-xl border ${borderColor} ${textMuted} hover:border-violet-500/50 hover:text-violet-400 transition-all`}
                  aria-label="Toggle dark mode"
                >
                  {isDark ? <Sun size={15} /> : <Moon size={15} />}
                </button>

                {/* Masuk */}
                <button
                  onClick={onSignIn}
                  className={`hidden sm:block px-4 py-2 rounded-xl text-sm font-semibold border ${borderColor} ${textMuted} hover:text-violet-400 hover:border-violet-500/40 transition-all`}
                >
                  {t('Masuk', 'Sign In')}
                </button>

                {/* Daftar CTA */}
                <button
                  onClick={onSignIn}
                  className="sp-btn-primary px-4 py-2 rounded-xl text-sm font-black text-white"
                >
                  {t('Daftar Gratis', 'Get Started')}
                </button>

                {/* Mobile hamburger */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className={`lg:hidden p-2 rounded-xl border ${borderColor} ${textMuted}`}
                  aria-label="Menu"
                >
                  {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile slide-down menu */}
          {mobileMenuOpen && (
            <div
              className={`lg:hidden mx-4 mt-2 rounded-2xl sp-glass border ${borderColor} ${isDark ? 'bg-[#030712]/95' : 'bg-white/95'} p-4 shadow-2xl`}
            >
              {[
                { href: '#products', label: t('Produk', 'Products') },
                { href: '#how-it-works', label: t('Cara Kerja', 'How It Works') },
                { href: '#claims', label: t('Klaim', 'Claims') },
                { href: '#about', label: t('Tentang', 'About') },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between py-3 border-b ${borderColor} last:border-0 ${textMuted} hover:text-violet-400 transition-colors`}
                >
                  {link.label}
                  <ChevronRight size={14} />
                </a>
              ))}
              <div className="flex gap-2 mt-4">
                <button onClick={toggleLang} className={`flex-1 py-2.5 rounded-xl text-sm font-bold border ${borderColor} ${textMuted} flex items-center justify-center gap-1.5`}>
                  <Globe size={14} />{lang}
                </button>
                <button onClick={onSignIn} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-violet-600 to-blue-600 text-white">
                  {t('Masuk', 'Sign In')}
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* ══════════════════════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════════════════════ */}
        <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
          {/* Mesh gradient background */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: isDark
                ? `
                  radial-gradient(ellipse 80% 60% at 70% 30%, rgba(124,58,237,0.18) 0%, transparent 60%),
                  radial-gradient(ellipse 60% 50% at 20% 70%, rgba(59,130,246,0.12) 0%, transparent 60%),
                  radial-gradient(ellipse 50% 40% at 80% 80%, rgba(16,185,129,0.08) 0%, transparent 60%),
                  #030712
                `
                : `
                  radial-gradient(ellipse 80% 60% at 70% 30%, rgba(167,139,250,0.12) 0%, transparent 60%),
                  radial-gradient(ellipse 60% 50% at 20% 70%, rgba(147,197,253,0.1) 0%, transparent 60%),
                  #f8fafc
                `,
            }}
          />

          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.025]"
            style={{
              backgroundImage: `linear-gradient(${isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.5)'} 1px, transparent 1px),
                                linear-gradient(90deg, ${isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.5)'} 1px, transparent 1px)`,
              backgroundSize: '64px 64px',
            }}
          />

          <div className="relative z-10 max-w-7xl mx-auto px-6 w-full py-20 lg:py-24">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* ── Left ── */}
              <div className="flex flex-col gap-7">
                {/* Eyebrow pill */}
                <div className="flex items-center gap-2.5 w-fit">
                  <div
                    className="flex items-center gap-2 px-4 py-2 rounded-full"
                    style={{
                      background: isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.08)',
                      border: '1px solid rgba(124,58,237,0.25)',
                    }}
                  >
                    <div className="relative">
                      <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
                      <span className="absolute inset-0 rounded-full bg-violet-400 animate-ping opacity-50" />
                    </div>
                    <span className="text-violet-400 text-xs font-bold uppercase tracking-widest">
                      {t('OJK Terdaftar & Diawasi', 'OJK Registered & Supervised')}
                    </span>
                  </div>
                </div>

                {/* H1 */}
                <h1
                  className={`text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black leading-[1.02] ${textPrimary}`}
                  style={{ letterSpacing: '-0.04em' }}
                >
                  {cmsConfig.hero?.headline ?? t('Proteksi Terbaik,', 'Best Protection,')}
                  <br />
                  <span className="sp-grad-text">
                    {cmsConfig.hero?.subtitle ?? t('Klaim Semudah Foto.', 'Claim as Easy as a Photo.')}
                  </span>
                </h1>

                {/* Sub */}
                <p className={`text-lg lg:text-xl ${textMuted} leading-relaxed max-w-lg`}>
                  {t(
                    'Beli asuransi dalam 60 detik. Klaim cukup lewat kamera HP. 24.000+ pengguna sudah merasakan manfaatnya.',
                    'Buy insurance in 60 seconds. Claim just with your phone camera. 24,000+ users already enjoy the benefits.'
                  )}
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={onSignIn}
                    className="sp-btn-primary flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-white font-black text-base"
                  >
                    {cmsConfig.hero?.ctaText ?? t('Mulai Gratis', 'Start Free')}
                    <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={onSignIn}
                    className={`flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-bold text-base border ${borderColor} ${textMuted} hover:text-violet-400 hover:border-violet-500/40 transition-all`}
                  >
                    {t('Lihat Demo', 'Watch Demo')}
                    <ChevronDown size={16} />
                  </button>
                </div>

                {/* Social proof row */}
                <div className={`flex items-center gap-4 pt-2 border-t ${borderColor}`}>
                  {/* Avatars */}
                  <div className="flex -space-x-2">
                    {['A', 'S', 'B', 'R', 'D'].map((init, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-white text-xs font-black"
                        style={{
                          borderColor: pageBg,
                          background: ['#7c3aed', '#10b981', '#3b82f6', '#f97316', '#ec4899'][i],
                        }}
                      >
                        {init}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} size={11} className="text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <p className={`text-xs ${textMuted} mt-0.5`}>
                      <span className={`font-bold ${textPrimary}`}>4.9/5</span>
                      {t(' dari 8.400+ ulasan', ' from 8,400+ reviews')}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Right: Policy Card ── */}
              <div className="hidden lg:flex justify-center items-center">
                <div className="sp-card-float">
                  <PolicyCard darkMode={isDark} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            MARQUEE TICKER
        ══════════════════════════════════════════════════════════════════ */}
        <div
          className="relative py-4 overflow-hidden"
          style={{
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          }}
        >
          {/* Fade edges */}
          <div
            className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
            style={{ background: `linear-gradient(to right, ${pageBg}, transparent)` }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
            style={{ background: `linear-gradient(to left, ${pageBg}, transparent)` }}
          />
          <div className="flex sp-marquee whitespace-nowrap">
            {[
              'OJK Licensed', 'Pembayaran Instan', 'Teknologi AI', 'Klaim Mudah',
              '24/7 Support', '50+ Produk', 'Trusted by 24k+', 'ISO 27001',
              'OJK Licensed', 'Pembayaran Instan', 'Teknologi AI', 'Klaim Mudah',
              '24/7 Support', '50+ Produk', 'Trusted by 24k+', 'ISO 27001',
            ].map((item, i) => (
              <span key={i} className={`inline-flex items-center gap-3 px-6 text-sm font-semibold ${textMuted}`}>
                <span
                  className="w-1 h-1 rounded-full inline-block"
                  style={{ background: i % 4 === 0 ? '#7c3aed' : i % 4 === 1 ? '#10b981' : i % 4 === 2 ? '#f97316' : '#3b82f6' }}
                />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PRODUCTS
        ══════════════════════════════════════════════════════════════════ */}
        <section id="products" className="py-24 max-w-7xl mx-auto px-6" style={{ display: cmsConfig.products?.isVisible === false ? 'none' : undefined }}>
          <Reveal className="text-center mb-14">
            <p className="text-xs font-bold text-violet-400 uppercase tracking-[0.2em] mb-3">
              {t('Produk Kami', 'Our Products')}
            </p>
            <h2
              className={`text-4xl lg:text-5xl font-black ${textPrimary} leading-tight`}
              style={{ letterSpacing: '-0.03em' }}
            >
              {t('Semua Kebutuhan', 'All Your')}
              <br />
              <span className="sp-grad-text">{t('Proteksimu', 'Protection Needs')}</span>
            </h2>
            <p className={`${textMuted} mt-4 text-base max-w-xl mx-auto leading-relaxed`}>
              {t('Dari kendaraan hingga kesehatan — AI kami menemukan produk terbaik untukmu.', 'From vehicles to health — our AI finds the best product for you.')}
            </p>
          </Reveal>

          <div className="flex flex-col gap-4">
            {products.map((prod, i) => (
              <Reveal key={i} delay={i * 60}>
                <div
                  className={`sp-product-card relative rounded-3xl p-5 sm:p-6 border ${borderColor} cursor-pointer overflow-hidden ${surfaceBg}`}
                  onClick={onSignIn}
                  style={{
                    background: isDark
                      ? 'rgba(255,255,255,0.03)'
                      : 'rgba(255,255,255,0.9)',
                  }}
                >
                  {/* Subtle top gradient accent */}
                  <div
                    className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, rgba(124,58,237,0.4), transparent)` }}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                    {/* Icon */}
                    <div
                      className={`w-20 h-20 rounded-3xl flex-shrink-0 flex items-center justify-center bg-gradient-to-br ${prod.grad} border ${prod.border}`}
                    >
                      <prod.svg className="w-12 h-12" />
                    </div>

                    {/* Center content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-black text-lg ${textPrimary}`}>{prod.name}</h3>
                        {prod.badge && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black text-white bg-gradient-to-r from-orange-500 to-amber-500">
                            {prod.badge}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs font-semibold ${textMuted} mb-2 uppercase tracking-wider`}>{prod.subtitle}</p>
                      <p className={`text-sm ${textMuted} leading-relaxed mb-3 max-w-xl`}>{prod.desc}</p>
                      {/* Feature pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {prod.pills.map((pill) => (
                          <span
                            key={pill}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                            style={{
                              background: isDark ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.06)',
                              color: '#a78bfa',
                              border: '1px solid rgba(124,58,237,0.2)',
                            }}
                          >
                            {pill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right: price + CTA */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className={`text-[11px] ${textMuted} mb-0.5`}>{t('Mulai dari', 'Starting from')}</p>
                        <p className={`font-black text-xl ${textPrimary}`}>{prod.price}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onSignIn(); }}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-sm font-black text-white whitespace-nowrap"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', boxShadow: '0 6px 20px rgba(124,58,237,0.3)' }}
                      >
                        {t('Beli', 'Buy')} <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════════════════════════════════ */}
        <section
          id="how-it-works"
          className="py-24 relative overflow-hidden"
          style={{
            background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)',
          }}
        >
          <div className="max-w-7xl mx-auto px-6">
            <Reveal className="text-center mb-16">
              <p className="text-xs font-bold text-violet-400 uppercase tracking-[0.2em] mb-3">
                {t('Cara Kerja', 'How It Works')}
              </p>
              <h2
                className={`text-4xl lg:text-5xl font-black ${textPrimary}`}
                style={{ letterSpacing: '-0.03em' }}
              >
                {t('3 Langkah,', '3 Steps,')}
                {' '}
                <span className="sp-grad-text">{t('60 Detik Aktif', '60 Seconds Active')}</span>
              </h2>
            </Reveal>

            <div className="relative grid lg:grid-cols-3 gap-8 lg:gap-6">
              {/* Connector dashed line (desktop) */}
              <div
                className="hidden lg:block absolute top-[60px] left-[calc(16.666%+2rem)] right-[calc(16.666%+2rem)] pointer-events-none"
                style={{
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.4) 20%, rgba(59,130,246,0.4) 50%, rgba(16,185,129,0.4) 80%, transparent)',
                  borderTop: '1px dashed rgba(124,58,237,0.3)',
                }}
              />

              {howItWorks.map((step, i) => (
                <Reveal key={i} delay={i * 120}>
                  <div
                    className={`relative rounded-3xl p-8 border ${borderColor}`}
                    style={{
                      background: isDark
                        ? 'rgba(255,255,255,0.03)'
                        : 'rgba(255,255,255,0.8)',
                      boxShadow: isDark
                        ? `0 0 60px ${step.glowColor}`
                        : `0 4px 24px rgba(0,0,0,0.06)`,
                    }}
                  >
                    {/* Step number — the visual focus */}
                    <div className="mb-6 relative">
                      <p
                        className={`text-7xl font-black leading-none ${step.color}`}
                        style={{
                          letterSpacing: '-0.04em',
                          textShadow: `0 0 60px ${step.glowColor}`,
                        }}
                      >
                        {step.num}
                      </p>
                      {/* Pulse ring behind number */}
                      <div
                        className="absolute top-3 left-2 w-10 h-10 rounded-full"
                        style={{
                          background: step.glowColor,
                          animation: 'spPulseRing 2s ease-out infinite',
                          animationDelay: `${i * 0.4}s`,
                        }}
                      />
                    </div>
                    <h3 className={`font-black text-xl ${textPrimary} mb-2`} style={{ letterSpacing: '-0.02em' }}>
                      {step.title}
                    </h3>
                    <p className={`text-sm ${textMuted} leading-relaxed`}>{step.desc}</p>

                    {/* Arrow indicator */}
                    {i < howItWorks.length - 1 && (
                      <div className="lg:hidden absolute -bottom-4 left-1/2 -translate-x-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: pageBg, border: `1px solid rgba(124,58,237,0.3)` }}>
                        <ChevronDown size={14} className="text-violet-400" />
                      </div>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            CLAIM IN 60 SECONDS
        ══════════════════════════════════════════════════════════════════ */}
        <section id="claims" className="py-24 max-w-7xl mx-auto px-6" style={{ display: cmsConfig.claims?.isVisible === false ? 'none' : undefined }}>
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: story */}
            <div>
              <Reveal>
                <p className="text-xs font-bold text-violet-400 uppercase tracking-[0.2em] mb-3">
                  {t('Cara Klaim', 'How to Claim')}
                </p>
                <h2
                  className={`text-4xl lg:text-5xl font-black ${textPrimary} leading-tight mb-4`}
                  style={{ letterSpacing: '-0.03em' }}
                >
                  {t('Klaim Selesai Dalam', 'Claim Done In')}
                  <br />
                  <span className="sp-grad-text">{t('Hitungan Menit', 'Minutes')}</span>
                </h2>
                <p className={`text-base ${textMuted} leading-relaxed mb-10 max-w-lg`}>
                  {t(
                    'Lupakan proses klaim berbelit yang memakan waktu berhari-hari. SurePath merevolusi pengalaman klaim asuransi.',
                    'Forget the convoluted claim process that takes days. SurePath revolutionizes the insurance claim experience.'
                  )}
                </p>
              </Reveal>

              {/* 4 steps */}
              <div className="relative flex flex-col gap-0">
                {claimSteps.map((step, i) => (
                  <Reveal key={i} delay={i * 100}>
                    <div className="flex items-start gap-5 relative pb-8 last:pb-0">
                      {/* Vertical connector */}
                      {i < claimSteps.length - 1 && (
                        <div
                          className="absolute left-[18px] top-11 bottom-0 w-px"
                          style={{
                            background: isDark
                              ? 'linear-gradient(to bottom, rgba(124,58,237,0.4), rgba(124,58,237,0.05))'
                              : 'linear-gradient(to bottom, rgba(124,58,237,0.2), rgba(124,58,237,0.02))',
                          }}
                        />
                      )}

                      {/* Numbered circle */}
                      <div
                        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-base font-black text-white relative z-10"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                      >
                        {i + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xl">{step.emoji}</span>
                          <p className={`font-black text-base ${textPrimary}`}>{step.label}</p>
                        </div>
                        <p className={`text-sm ${textMuted}`}>{step.desc}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>

              {/* CTA under steps */}
              <Reveal delay={500}>
                <button
                  onClick={onSignIn}
                  className="mt-8 sp-btn-primary flex items-center gap-2 px-7 py-4 rounded-2xl text-white font-black text-base"
                >
                  {t('Coba Sekarang', 'Try Now')}
                  <ArrowRight size={16} />
                </button>
              </Reveal>
            </div>

            {/* Right: phone mockup */}
            <Reveal delay={200} from="right">
              <PhoneMockup lang={lang} />
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            STATS BAR
        ══════════════════════════════════════════════════════════════════ */}
        <section
          className="py-20 relative overflow-hidden"
          style={{
            display: cmsConfig.stats?.isVisible === false ? 'none' : undefined,
            background: isDark
              ? 'rgba(255,255,255,0.02)'
              : 'rgba(0,0,0,0.02)',
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          }}
        >
          {/* Subtle glow blobs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-32 blur-3xl opacity-10 rounded-full" style={{ background: 'radial-gradient(ellipse, #7c3aed, transparent)' }} />
            <div className="absolute bottom-0 right-1/4 w-96 h-32 blur-3xl opacity-10 rounded-full" style={{ background: 'radial-gradient(ellipse, #10b981, transparent)' }} />
          </div>

          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
              {stats.map((s, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div className="text-center flex flex-col items-center gap-2">
                    <p
                      className="font-black leading-none"
                      style={{
                        fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                        letterSpacing: '-0.04em',
                        background: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 40%, #67e8f9 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {s.val}
                    </p>
                    <p className={`font-bold text-sm ${textPrimary}`}>{s.label}</p>
                    <p className={`text-xs ${textMuted}`}>{s.sub}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            TESTIMONIALS
        ══════════════════════════════════════════════════════════════════ */}
        <section className="py-24 max-w-7xl mx-auto px-6" style={{ display: cmsConfig.testimonials?.isVisible === false ? 'none' : undefined }}>
          <Reveal className="text-center mb-14">
            <p className="text-xs font-bold text-violet-400 uppercase tracking-[0.2em] mb-3">
              {t('Testimoni', 'Testimonials')}
            </p>
            <h2
              className={`text-4xl lg:text-5xl font-black ${textPrimary}`}
              style={{ letterSpacing: '-0.03em' }}
            >
              {t('Cerita Nyata dari', 'Real Stories from')}
              <br />
              <span className="sp-grad-text">{t('Pengguna Kami', 'Our Users')}</span>
            </h2>
          </Reveal>

          <div
            className="grid lg:grid-cols-3 gap-5"
          >
            {testimonials.map((tm, i) => (
              <Reveal key={i} delay={i * 100}>
                <div
                  className={`rounded-3xl p-7 border ${borderColor} h-full flex flex-col relative overflow-hidden`}
                  style={{
                    background: isDark
                      ? 'rgba(255,255,255,0.03)'
                      : 'rgba(255,255,255,0.9)',
                    boxShadow: isDark ? '0 4px 32px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
                  }}
                >
                  {/* Top accent */}
                  <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${tm.color}`} />

                  {/* Stars */}
                  <div className="flex gap-0.5 mb-5">
                    {Array.from({ length: tm.rating }).map((_, j) => (
                      <Star key={j} size={13} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>

                  {/* Quote mark */}
                  <div className={`text-5xl font-black leading-none mb-2 ${textMuted} opacity-20`}>"</div>

                  {/* Quote */}
                  <p className={`text-sm ${textMuted} leading-relaxed flex-1`}>{tm.quote}</p>

                  {/* Author */}
                  <div className="flex items-center gap-3 mt-6 pt-5 border-t border-white/5">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${tm.color.includes('violet') ? '#7c3aed,#4f46e5' : tm.color.includes('emerald') ? '#10b981,#0d9488' : '#3b82f6,#0ea5e9'})` }}
                    >
                      {tm.init}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${textPrimary}`}>{tm.name}</p>
                      <p className={`text-xs ${textMuted}`}>{tm.meta}</p>
                    </div>
                    <div className="ml-auto">
                      <CheckCircle size={16} className="text-emerald-400" />
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            TRUST PARTNERS
        ══════════════════════════════════════════════════════════════════ */}
        <section
          id="partners"
          className="py-16"
          style={{
            background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)',
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
          }}
        >
          <div className="max-w-7xl mx-auto px-6">
            <Reveal className="text-center mb-8">
              <p className={`text-sm font-semibold ${textMuted} uppercase tracking-[0.15em]`}>
                {t('15+ Mitra Insurer OJK Terdaftar', '15+ OJK-Registered Insurer Partners')}
              </p>
            </Reveal>
            <Reveal>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  'Sinarmas', 'Astra Insurance', 'Allianz', 'Adira Insurance',
                  'Zurich', 'ACA', 'Tugu Insurance', 'Sompo', 'MSIG',
                  'Prudential', 'Manulife', 'AXA Mandiri', '+3 Lainnya',
                ].map((ins) => (
                  <span
                    key={ins}
                    className={`px-4 py-2 rounded-2xl border ${borderColor} text-sm font-semibold ${textMuted} transition-all hover:border-violet-500/30 hover:text-violet-400`}
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.8)',
                    }}
                  >
                    {ins}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            CTA SECTION
        ══════════════════════════════════════════════════════════════════ */}
        <section id="about" className="py-24 px-6">
          <Reveal>
            <div
              className="relative max-w-6xl mx-auto rounded-[2.5rem] overflow-hidden p-12 sm:p-16 text-center sp-noise"
              style={{
                background: 'linear-gradient(135deg, #1e0a47 0%, #2d1b69 30%, #1a1a5c 60%, #0f3460 100%)',
                boxShadow: '0 32px 80px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
            >
              {/* Radial glow */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(124,58,237,0.3), transparent)',
                }}
              />

              {/* Decorative rings */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none"
                style={{
                  border: '1px dashed rgba(167,139,250,0.15)',
                  animation: 'spCardFloat 8s ease-in-out infinite',
                }}
              />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
                style={{
                  border: '1px dashed rgba(99,102,241,0.1)',
                  animation: 'spCardFloat 12s ease-in-out infinite reverse',
                }}
              />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] rounded-full pointer-events-none"
                style={{ border: '1px dashed rgba(59,130,246,0.07)' }}
              />

              {/* Content */}
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
                  <Zap size={12} className="text-violet-300" />
                  <span className="text-violet-300 text-xs font-bold uppercase tracking-widest">{t('Mulai Sekarang', 'Start Now')}</span>
                </div>

                <h2
                  className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4"
                  style={{ letterSpacing: '-0.04em' }}
                >
                  {t('Siap Lindungi Diri', 'Ready to Protect')}
                  <br />
                  <span className="sp-grad-text">{t('& Keluarga?', 'Yourself & Family?')}</span>
                </h2>

                <p className="text-white/60 text-base mb-10 max-w-md mx-auto leading-relaxed">
                  {t(
                    'Daftar gratis, tanpa kartu kredit, tanpa komitmen. Dapatkan penawaran terbaik dari 15+ insurer terpercaya.',
                    'Sign up free, no credit card, no commitment. Get the best offers from 15+ trusted insurers.'
                  )}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={onSignIn}
                    className="sp-btn-primary flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-black text-base"
                  >
                    {t('Mulai Gratis Sekarang', 'Get Started Free')}
                    <ArrowRight size={16} />
                  </button>
                  <button
                    onClick={onSignIn}
                    className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-white/70 text-base hover:text-white transition-colors"
                    style={{ border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    <Shield size={16} className="text-violet-300" />
                    {t('Lihat Semua Produk', 'View All Products')}
                  </button>
                </div>

                {/* Trust badges */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
                  {[
                    { icon: Award, label: 'OJK Licensed', color: '#34d399' },
                    { icon: Lock, label: 'ISO 27001', color: '#60a5fa' },
                    { icon: Users, label: '24k+ Users', color: '#f97316' },
                    { icon: Zap, label: '60s Policy', color: '#a78bfa' },
                  ].map((badge) => (
                    <div
                      key={badge.label}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: badge.color,
                      }}
                    >
                      <badge.icon size={11} />
                      {badge.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════════════════════════════ */}
        <footer
          style={{
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
          }}
        >
          <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Brand col */}
            <div className="col-span-2 flex flex-col gap-5">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                >
                  <Shield size={16} className="text-white" />
                </div>
                <span className="font-black text-xl">
                  <span className={textPrimary}>Sure</span>
                  <span className="sp-grad-text">Path</span>
                </span>
              </div>

              <p className={`text-sm ${textMuted} leading-relaxed max-w-xs`}>
                {t(
                  'Platform asuransi digital terpercaya. Beli, klaim, dan pantau polis asuransimu dalam satu genggaman.',
                  'Trusted digital insurance platform. Buy, claim, and track your policy in one hand.'
                )}
              </p>

              {/* OJK badges */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'OJK', color: 'text-emerald-400', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
                  { label: 'ISO 27001', color: 'text-blue-400', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' },
                  { label: '4.9 ★', color: 'text-amber-400', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
                ].map((b) => (
                  <span
                    key={b.label}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold ${b.color}`}
                    style={{ background: b.bg, border: `1px solid ${b.border}` }}
                  >
                    {b.label}
                  </span>
                ))}
              </div>

              {/* Contact */}
              <div className="flex flex-col gap-2">
                {[
                  { icon: Phone, label: '+62 21 5000 1234' },
                  { icon: Mail, label: 'hello@surepath.id' },
                  { icon: MapPin, label: 'Jakarta, Indonesia' },
                ].map((c) => (
                  <div key={c.label} className={`flex items-center gap-2 text-xs ${textMuted}`}>
                    <c.icon size={12} className="text-violet-400 flex-shrink-0" />
                    {c.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer link columns */}
            {Object.entries(footerLinks).map(([heading, links]) => (
              <div key={heading}>
                <p className={`text-xs font-black ${textPrimary} uppercase tracking-[0.15em] mb-5`}>{heading}</p>
                <ul className="flex flex-col gap-2.5">
                  {links.map((link) => (
                    <li key={link}>
                      <button
                        onClick={onSignIn}
                        className={`text-sm ${textMuted} hover:text-violet-400 transition-colors text-left`}
                      >
                        {link}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div
            className={`px-6 py-5 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3`}
            style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}
          >
            <p className={`text-xs ${textMuted}`}>
              © 2026 SurePath Technologies, Inc.
              {' '}
              {t('Hak cipta dilindungi undang-undang.', 'All rights reserved.')}
            </p>
            <div className="flex items-center gap-4">
              <p className={`text-xs ${textMuted}`}>
                {t('Diawasi oleh', 'Supervised by')}
                {' '}
                <span className="text-emerald-400 font-semibold">OJK</span>
              </p>
              <div className={`w-px h-4 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
              <p className={`text-xs ${textMuted}`}>🇮🇩 Indonesia</p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};

export default PlatformLanding;
