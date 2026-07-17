import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../../types';

export const COPY = {
  EN: {
    steps: ['Getting things ready…', 'Loading your space…', 'Finding the best options…', 'Almost done…', 'Ready!'],
    tagline: 'Your protection, made simple.',
    chips: ['📸 Claim with photos', '⚡ Buy in minutes', '💬 Free to ask'],
    welcome: 'Welcome back',
    verified: "You're all set",
    loading: 'Loading…',
  },
  ID: {
    steps: ['Menyiapkan semuanya…', 'Memuat ruang kamu…', 'Mencari pilihan terbaik…', 'Hampir selesai…', 'Siap!'],
    tagline: 'Perlindungan kamu, dibuat mudah.',
    chips: ['📸 Klaim lewat foto', '⚡ Beli dalam menit', '💬 Bebas tanya'],
    welcome: 'Selamat datang',
    verified: 'Siap digunakan',
    loading: 'Memuat…',
  },
} as const;

export const PortalLoader = ({ lang = Language.ID }: { lang?: Language }) => (
  <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden" style={{ background: '#f6faf7' }}>
    {/* ambient wash */}
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
      background: 'radial-gradient(480px 360px at 50% 28%, rgba(16,185,129,0.10), transparent 65%), radial-gradient(560px 420px at 15% 105%, rgba(5,150,105,0.08), transparent 70%)' }} />
    <style>{`
      @keyframes pl-slide { 0%{left:-60%} 100%{left:110%} }
      @keyframes pl-float { 0%,100% { transform: translateY(0) rotate(-1.5deg); } 50% { transform: translateY(-10px) rotate(1.5deg); } }
      @keyframes pl-shadow { 0%,100% { transform: scaleX(1); opacity: .18; } 50% { transform: scaleX(0.72); opacity: .10; } }
      @keyframes pl-path { to { stroke-dashoffset: -220; } }
      @keyframes pl-runner { 0% { offset-distance: 0%; } 100% { offset-distance: 100%; } }
      @keyframes pl-leaf { 0% { transform: translate(0,0) rotate(0deg) scale(0.6); opacity: 0; } 15% { opacity: .9; } 100% { transform: translate(var(--dx), -90px) rotate(160deg) scale(1); opacity: 0; } }
      @keyframes pl-dots { 0%,80%,100% { opacity: .25; } 40% { opacity: 1; } }
      @media (prefers-reduced-motion: reduce) { .pl-anim, .pl-anim * { animation: none !important; } }
    `}</style>
    {/* top progress shimmer */}
    <div className="absolute top-0 left-0 right-0 h-[2.5px] overflow-hidden">
      <div style={{ position: 'absolute', top: 0, left: '-60%', width: '60%', height: '100%',
        background: 'linear-gradient(90deg, transparent, #059669, transparent)',
        animation: 'pl-slide 1.4s cubic-bezier(.4,0,.2,1) infinite' }} />
    </div>

    <div className="pl-anim relative flex flex-col items-center">
      {/* rising leaf particles */}
      {[{ l: '32%', d: '0s', dx: '-26px' }, { l: '58%', d: '1.1s', dx: '20px' }, { l: '45%', d: '2.2s', dx: '-8px' }].map((p, i) => (
        <span key={i} style={{
          position: 'absolute', top: '52%', left: p.l, width: 10, height: 10,
          background: 'radial-gradient(circle at 30% 30%, #6ee7b7, #059669)',
          borderRadius: '0 60% 0 60%', ['--dx' as string]: p.dx,
          animation: `pl-leaf 3.4s ease-out ${p.d}s infinite`,
        } as React.CSSProperties} />
      ))}

      {/* floating official logo */}
      <img loading="lazy" src="/logo-sm.png" alt="SurePath" width={104} height={120}
        style={{ objectFit: 'contain', animation: 'pl-float 3s ease-in-out infinite',
          filter: 'drop-shadow(0 18px 28px rgba(5,150,105,0.28))' }} />
      {/* ground shadow */}
      <div style={{ width: 74, height: 10, marginTop: 14, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(6,78,59,0.5), transparent 70%)',
        animation: 'pl-shadow 3s ease-in-out infinite' }} />

      {/* winding path being drawn */}
      <svg width="220" height="46" viewBox="0 0 220 46" fill="none" style={{ marginTop: 10 }}>
        <path id="pl-road" d="M8 38 C 60 38, 55 8, 110 8 S 160 38, 212 38"
          stroke="rgba(5,150,105,0.22)" strokeWidth="3" strokeLinecap="round" />
        <path d="M8 38 C 60 38, 55 8, 110 8 S 160 38, 212 38"
          stroke="#059669" strokeWidth="3" strokeLinecap="round"
          strokeDasharray="26 84" style={{ animation: 'pl-path 2.2s linear infinite' }} />
        <circle r="4.5" fill="#34d399" style={{
          offsetPath: "path('M8 38 C 60 38, 55 8, 110 8 S 160 38, 212 38')",
          animation: 'pl-runner 2.2s cubic-bezier(.45,.05,.55,.95) infinite',
          filter: 'drop-shadow(0 0 6px #34d399)',
        } as React.CSSProperties} />
      </svg>

      {/* wordmark + dots */}
      <div className="flex flex-col items-center gap-2 mt-5">
        <p style={{ fontFamily: "'Sora', sans-serif", fontSize: '0.9rem', fontWeight: 800, letterSpacing: '0.26em', color: '#065f46' }}>
          SUREPATH
        </p>
        <div className="flex items-center gap-2">
          <p style={{ fontFamily: "'Sora', sans-serif", fontSize: '0.62rem', fontWeight: 600, color: 'rgba(6,95,70,0.55)' }}>
            {COPY[lang].loading}
          </p>
          {[0, 1, 2].map(i => (
            <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#059669',
              animation: `pl-dots 1.2s ease-in-out ${i * 0.18}s infinite` }} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

const SP_CSS = `
@keyframes sp-ring-fwd { to { transform: rotate(360deg); } }
@keyframes sp-ring-rev { to { transform: rotate(-360deg); } }
@keyframes sp-orbit-0  { from { transform: rotate(0deg)   translateX(74px) rotate(0deg);    } to { transform: rotate(360deg)  translateX(74px)  rotate(-360deg);  } }
@keyframes sp-orbit-1  { from { transform: rotate(130deg) translateX(94px) rotate(-130deg); } to { transform: rotate(490deg)  translateX(94px)  rotate(-490deg);  } }
@keyframes sp-orbit-2  { from { transform: rotate(250deg) translateX(114px) rotate(-250deg);} to { transform: rotate(610deg)  translateX(114px) rotate(-610deg); } }
@keyframes sp-glow     { 0%,100% { box-shadow: 0 0 28px rgba(22,163,74,0.15), 0 0 56px rgba(22,163,74,0.08); } 50% { box-shadow: 0 0 52px rgba(22,163,74,0.28), 0 0 100px rgba(22,163,74,0.12); } }
@keyframes sp-float-a  { 0%,100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-14px) translateX(5px); } }
@keyframes sp-float-b  { 0%,100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-9px) translateX(-8px); } }
@keyframes sp-dot-ping { 0%,100% { opacity:.3; transform:scale(1); } 50% { opacity:1; transform:scale(1.5); } }
@keyframes sp-check-glow { 0%,100% { filter:drop-shadow(0 0 4px rgba(22,163,74,.5)); } 50% { filter:drop-shadow(0 0 12px rgba(22,163,74,.9)); } }
@keyframes sp-sun-ray { to { transform: rotate(360deg); } }
@keyframes sp-sun-pulse { 0%,100% { transform: scale(1); opacity:.9; } 50% { transform: scale(1.08); opacity:1; } }
@keyframes sp-twinkle { 0%,100% { opacity:.15; transform: scale(0.7); } 50% { opacity:.95; transform: scale(1); } }
@keyframes sp-celest-in { from { opacity:0; transform: scale(.5) translateY(10px); } to { opacity:1; transform: scale(1) translateY(0); } }
@keyframes sp-shoot { 0% { transform: translate(0,0); opacity:0; } 10% { opacity:1; } 60% { opacity:1; } 100% { transform: translate(-120px,60px); opacity:0; } }
@keyframes pathy-bob   { 0%,100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-12px) rotate(1deg); } }
@keyframes pathy-wave  { 0%,60%,100% { transform: rotate(8deg); } 70% { transform: rotate(34deg); } 80% { transform: rotate(2deg); } 90% { transform: rotate(30deg); } }
@keyframes pathy-blink { 0%,90%,100% { transform: scaleY(1); } 94% { transform: scaleY(0.12); } }
@keyframes pathy-bubble{ 0% { opacity:0; transform: scale(0.5) translateY(8px); } 60% { transform: scale(1.06) translateY(0); } 100% { opacity:1; transform: scale(1) translateY(0); } }
@keyframes pathy-pulse { 0%,100% { transform: scale(1); opacity:.5; } 50% { transform: scale(1.18); opacity:.18; } }
@keyframes pathy-rise  { 0% { transform: translateY(0) scale(1); opacity:0; } 12% { opacity:.7; } 100% { transform: translateY(-130px) scale(1.3); opacity:0; } }
@keyframes pathy-spark { 0%,100% { opacity:.2; transform: scale(0.7) rotate(0deg); } 50% { opacity:1; transform: scale(1.1) rotate(45deg); } }
@keyframes pathy-pop   { 0% { opacity:0; transform: scale(0.6); } 100% { opacity:1; transform: scale(1); } }
@media (prefers-reduced-motion: reduce) {
  .sp-anim, .sp-anim * { animation: none !important; }
}
`;

export function ensureSPKeyframes() {
  if (!document.getElementById('sp-kf')) {
    const s = document.createElement('style'); s.id = 'sp-kf'; s.textContent = SP_CSS;
    document.head.appendChild(s);
  }
}

export type SplashTheme = {
  isDay: boolean;
  bg: string;
  accent: string;
  accentRgb: string;
  text: string;
  textMuted: string;
  textFaint: string;
  tileBg: string;
  tileBorder: string;
  gridRgb: string;
  gridOpacity: number;
  chipBg: string;
  chipBorder: string;
  blobs: { size: number; color: string; phase: number; speedX: number; speedY: number; op: number }[];
};

export const splashTheme = (darkMode: boolean): SplashTheme =>
  darkMode
    ? {
        isDay: false,
        bg: 'hsl(0, 0%, 8%)',
        accent: 'hsl(119, 99%, 46%)',
        accentRgb: '1,235,2',
        text: '#ffffff',
        textMuted: 'rgba(255,255,255,0.38)',
        textFaint: 'rgba(255,255,255,0.25)',
        tileBg: 'rgba(1,235,2,0.07)',
        tileBorder: 'rgba(1,235,2,0.22)',
        gridRgb: '255,255,255',
        gridOpacity: 0.018,
        chipBg: 'rgba(255,255,255,0.04)',
        chipBorder: 'rgba(255,255,255,0.07)',
        blobs: [
          { size: 560, color: '5,46,22',    phase: 0,   speedX: 0.0007, speedY: 0.0005, op: 0.16 },
          { size: 440, color: '6,78,59',    phase: 2.1, speedX: 0.0005, speedY: 0.0008, op: 0.12 },
          { size: 380, color: '22,163,74',  phase: 4.2, speedX: 0.0009, speedY: 0.0006, op: 0.10 },
          { size: 300, color: '4,120,87',   phase: 1.0, speedX: 0.0006, speedY: 0.0009, op: 0.11 },
        ],
      }
    : {
        isDay: true,
        bg: 'hsl(40, 36%, 97%)',
        accent: '#16a34a',
        accentRgb: '22,163,74',
        text: '#1e1b2e',
        textMuted: 'rgba(30,27,46,0.55)',
        textFaint: 'rgba(30,27,46,0.38)',
        tileBg: 'rgba(22,163,74,0.07)',
        tileBorder: 'rgba(22,163,74,0.20)',
        gridRgb: '22,163,74',
        gridOpacity: 0.04,
        chipBg: 'rgba(22,163,74,0.05)',
        chipBorder: 'rgba(22,163,74,0.14)',
        blobs: [
          { size: 560, color: '22,163,74',   phase: 0,   speedX: 0.0007, speedY: 0.0005, op: 0.18 },
          { size: 440, color: '134,239,172',  phase: 2.1, speedX: 0.0005, speedY: 0.0008, op: 0.14 },
          { size: 380, color: '251,191,36',   phase: 4.2, speedX: 0.0009, speedY: 0.0006, op: 0.10 },
          { size: 300, color: '16,185,129',   phase: 1.0, speedX: 0.0006, speedY: 0.0009, op: 0.12 },
        ],
      };

export const PathyMascot: React.FC<{ accentRgb: string; size?: number; wave?: boolean }> = ({ accentRgb, size = 150, wave = true }) => {
  const W = size, H = Math.round(size * 1.16);
  const eye = (left: number): React.CSSProperties => ({
    position: 'absolute', left, top: H * 0.40, width: W * 0.13, height: W * 0.17,
  });
  return (
    <div className="sp-anim" style={{ position: 'relative', width: W, height: H, animation: wave ? 'pathy-bob 3.2s ease-in-out infinite' : 'none' }}>
      <div className="sp-anim" style={{ position: 'absolute', left: '50%', top: '46%', width: W * 1.25, height: W * 1.25, transform: 'translate(-50%,-50%)', borderRadius: '50%', border: `2px solid rgba(${accentRgb},0.5)`, animation: 'pathy-pulse 2.6s ease-in-out infinite' }} />
      <svg viewBox="0 0 120 140" width={W} height={H} style={{ position: 'absolute', inset: 0, filter: `drop-shadow(0 16px 32px rgba(${accentRgb},0.4))` }}>
        <defs>
          <linearGradient id="pathy-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2BE07A" />
            <stop offset="1" stopColor="#0E9D57" />
          </linearGradient>
        </defs>
        <path d="M60 6 L110 26 V70 C110 104 88 126 60 134 C32 126 10 104 10 70 V26 Z"
          fill="url(#pathy-body)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M60 14 L100 30 V46 C84 36 70 33 60 33 C50 33 36 36 20 46 V30 Z" fill="rgba(255,255,255,0.16)" />
      </svg>
      <div style={{ position: 'absolute', left: W * 0.27, top: H * 0.50, width: W * 0.12, height: W * 0.08, borderRadius: '50%', background: 'rgba(255,120,140,0.55)', filter: 'blur(1px)' }} />
      <div style={{ position: 'absolute', left: W * 0.61, top: H * 0.50, width: W * 0.12, height: W * 0.08, borderRadius: '50%', background: 'rgba(255,120,140,0.55)', filter: 'blur(1px)' }} />
      {[W * 0.345, W * 0.525].map((lx, i) => (
        <div key={i} className="sp-anim" style={{ ...eye(lx), animation: `pathy-blink 4.2s ease-in-out ${i * 0.05}s infinite`, transformOrigin: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: '#0b3d24', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', left: '52%', top: '18%', width: '34%', height: '30%', background: '#fff', borderRadius: '50%' }} />
        </div>
      ))}
      <svg viewBox="0 0 40 20" width={W * 0.30} height={W * 0.15} style={{ position: 'absolute', left: '50%', top: H * 0.55, transform: 'translateX(-50%)' }}>
        <path d="M4 4 Q20 20 36 4" fill="none" stroke="#0b3d24" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', left: '50%', top: H * 0.70, transform: 'translateX(-50%)', width: W * 0.22, height: W * 0.22, borderRadius: '50%', background: '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 24 24" width={W * 0.13} height={W * 0.13} fill="none" stroke="#0E9D57" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="sp-anim" style={{ position: 'absolute', left: W * 0.80, top: H * 0.30, width: W * 0.20, height: W * 0.20, transformOrigin: '30% 80%', animation: wave ? 'pathy-wave 1.6s ease-in-out infinite' : 'none' }}>
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#2BE07A,#0E9D57)', borderRadius: '50% 50% 50% 20%', border: '1.5px solid rgba(255,255,255,0.45)', boxShadow: '0 4px 10px rgba(0,0,0,0.18)' }} />
      </div>
    </div>
  );
};

export const SplashScreen: React.FC<{ onFinish: () => void; lang: Language; setLang: (l: Language) => void; darkMode: boolean }> = ({ onFinish, lang, setLang, darkMode }) => {
  const [phase, setPhase]       = useState(0);
  const [progress, setProgress] = useState(0);
  const [msgIdx, setMsgIdx]     = useState(0);
  const [dotCount, setDotCount] = useState(0);
  const onFinishRef  = useRef(onFinish);
  const th = splashTheme(darkMode);
  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);

  useEffect(() => {
    const dotInt = setInterval(() => setDotCount(d => (d + 1) % 4), 400);
    return () => clearInterval(dotInt);
  }, []);

  useEffect(() => {
    ensureSPKeyframes();
    const t0 = setTimeout(() => setPhase(1), 100);
    const t1 = setTimeout(() => setPhase(2), 520);
    const t2 = setTimeout(() => setPhase(3), 880);
    const t3 = setTimeout(() => setPhase(4), 3000);
    const t4 = setTimeout(() => onFinishRef.current(), 3500);
    const progInt = setInterval(() => setProgress(p => Math.min(p + 1.2, 100)), 18);
    const msgInt  = setInterval(() => setMsgIdx(i => Math.min(i + 1, COPY[lang].steps.length - 1)), 450);
    return () => { [t0,t1,t2,t3,t4].forEach(clearTimeout); clearInterval(progInt); clearInterval(msgInt); };
  }, [lang]);

  const G = COPY[lang];
  const greet = lang === Language.EN ? 'Hi there!' : 'Halo!';

  const bubbles = [
    { l: '12%', s: 54, d: 0,   dur: 9  }, { l: '24%', s: 26, d: 2.2, dur: 11 },
    { l: '40%', s: 38, d: 4.1, dur: 8  }, { l: '58%', s: 30, d: 1.4, dur: 12 },
    { l: '72%', s: 60, d: 3.0, dur: 10 }, { l: '86%', s: 34, d: 5.0, dur: 9.5 },
    { l: '6%',  s: 22, d: 6.0, dur: 13 }, { l: '92%', s: 20, d: 1.0, dur: 11.5 },
  ];

  return (
    <div
      className={`sp-anim fixed inset-0 z-[5000] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${phase >= 4 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ background: th.bg, fontFamily: "'Sora', sans-serif", transition: 'background 0.6s ease, opacity 0.5s ease' }}
    >
      <div className="absolute pointer-events-none" style={{ top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '85vw', height: '60vh', borderRadius: '50%', background: `radial-gradient(ellipse at center, rgba(${th.accentRgb},0.18), transparent 65%)`, filter: 'blur(20px)' }} />
      <div className="absolute pointer-events-none" style={{ bottom: '-15%', right: '-10%', width: '50vw', height: '50vh', borderRadius: '50%', background: `radial-gradient(circle, rgba(${th.accentRgb},0.12), transparent 70%)`, filter: 'blur(20px)' }} />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {bubbles.map((b, i) => (
          <div key={i} className="sp-anim" style={{
            position: 'absolute', left: b.l, bottom: -80, width: b.s, height: b.s, borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, rgba(${th.accentRgb},0.22), rgba(${th.accentRgb},0.05))`,
            border: `1px solid rgba(${th.accentRgb},0.18)`,
            animation: `pathy-rise ${b.dur}s linear ${b.d}s infinite`,
          }} />
        ))}
      </div>
      <div className="relative z-10 flex flex-col items-center gap-6 px-6">
        <div className="sp-anim" style={{
          opacity: phase >= 1 ? 1 : 0,
          animation: phase >= 1 ? 'pathy-bubble 0.5s cubic-bezier(.22,1,.36,1) forwards' : 'none',
          position: 'relative', padding: '10px 18px', borderRadius: 18,
          background: th.isDay ? '#ffffff' : 'rgba(255,255,255,0.06)',
          border: `1.5px solid rgba(${th.accentRgb},0.30)`,
          boxShadow: `0 10px 28px -12px rgba(${th.accentRgb},0.5)`,
          marginBottom: 4,
        }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: th.text }}>{greet} <span style={{ display: 'inline-block', animation: 'pathy-wave 1.6s ease-in-out infinite', transformOrigin: '70% 70%' }}>👋</span></span>
          <div style={{ position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: 14, height: 14, background: th.isDay ? '#ffffff' : 'rgba(20,28,24,0.95)', borderRight: `1.5px solid rgba(${th.accentRgb},0.30)`, borderBottom: `1.5px solid rgba(${th.accentRgb},0.30)` }} />
        </div>
        <div className={`transition-all duration-700 ease-out ${phase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <PathyMascot accentRgb={th.accentRgb} size={148} />
        </div>
        <div className={`text-center transition-all duration-500 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <h1 style={{ fontSize: '2.3rem', fontWeight: 700, letterSpacing: '-0.05em', color: th.text, lineHeight: 1 }}>
            Sure<span style={{ color: th.accent }}>Path</span>
          </h1>
          <p style={{ fontSize: '0.6rem', fontWeight: 500, color: th.textFaint, letterSpacing: '0.32em', textTransform: 'uppercase', marginTop: '0.5rem' }}>
            {G.tagline}
          </p>
        </div>
        <div className={`flex flex-col items-center gap-3 w-60 transition-all duration-500 ${phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
          <div className="flex items-center gap-2">
            <div className="sp-anim" style={{ width: 6, height: 6, borderRadius: '50%', background: th.accent, animation: 'sp-dot-ping 1.3s ease-in-out infinite' }} />
            <span style={{ fontSize: '0.6rem', fontWeight: 500, color: th.textMuted, letterSpacing: '0.02em' }}>{G.steps[msgIdx]}</span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 3, background: `rgba(${th.accentRgb},0.14)` }}>
            <div className="h-full rounded-full transition-all duration-200" style={{ width: `${progress}%`, background: th.accent, boxShadow: `0 0 8px rgba(${th.accentRgb},0.6)` }} />
          </div>
          <div style={{ fontSize: '0.58rem', fontWeight: 500, color: th.textFaint, letterSpacing: '0.12em' }}>
            {lang === 'ID' ? 'Memuat' : 'Loading'}{'·'.repeat(dotCount)}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {G.chips.map(chip => (
              <span key={chip} style={{ fontSize: '0.6rem', fontWeight: 500, color: th.textMuted, background: th.chipBg, border: `1px solid ${th.chipBorder}`, borderRadius: '99px', padding: '0.18rem 0.55rem' }}>
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div className={`flex items-center gap-1 transition-all duration-500 ${phase >= 3 ? 'opacity-100' : 'opacity-0'}`}>
          {(['ID', 'EN'] as const).map(l => (
            <button key={l} onClick={() => { setLang(l as Language); localStorage.setItem('SUREPATH_LANG', l); }}
              style={{ fontFamily: "'Sora',sans-serif", fontSize: '0.62rem', fontWeight: lang === l ? 600 : 400, color: lang === l ? th.accent : th.textFaint, padding: '0.2rem 0.65rem', borderRadius: '99px', cursor: 'pointer', background: lang === l ? `rgba(${th.accentRgb},0.10)` : 'transparent', border: `1px solid ${lang === l ? `rgba(${th.accentRgb},0.22)` : 'transparent'}`, transition: 'all 0.2s' }}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="absolute bottom-8" style={{ fontSize: '0.5rem', fontWeight: 500, color: th.textFaint, letterSpacing: '0.3em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={`rgba(${th.accentRgb},0.6)`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        SurePath · Secure Connection
      </div>
    </div>
  );
};

export const AppEntryScreen = ({ name, onDone, lang, darkMode }: { name: string; onDone: () => void; lang: Language; darkMode: boolean }) => {
  const [visible, setVisible] = useState(false);
  const [fade, setFade]       = useState(false);
  const onDoneRef = useRef(onDone);
  void darkMode; // entry screen is brand-light regardless of app theme
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    const t0 = setTimeout(() => setVisible(true), 40);
    const t1 = setTimeout(() => setFade(true), 1500);
    const t2 = setTimeout(() => onDoneRef.current(), 1950);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const G = COPY[lang];
  const CONFETTI = [
    { x: '18%', y: '30%', d: '0s',    c: '#34d399', s: 9 },
    { x: '78%', y: '24%', d: '0.12s', c: '#fbbf24', s: 7 },
    { x: '30%', y: '68%', d: '0.20s', c: '#059669', s: 8 },
    { x: '70%', y: '64%', d: '0.28s', c: '#6ee7b7', s: 10 },
    { x: '50%', y: '18%', d: '0.36s', c: '#a7f3d0', s: 6 },
    { x: '12%', y: '52%', d: '0.44s', c: '#fbbf24', s: 6 },
    { x: '88%', y: '46%', d: '0.32s', c: '#34d399', s: 7 },
  ];

  return (
    <div
      className={`sp-anim fixed inset-0 z-[4999] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${fade ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ background: '#f6faf7', fontFamily: "'Sora', sans-serif" }}
    >
      <style>{`
        @keyframes entry-pop { 0% { opacity: 0; transform: scale(0); } 60% { opacity: 1; transform: scale(1.25); } 100% { opacity: 0; transform: scale(0.4) translateY(26px); } }
        @keyframes entry-ring { 0% { transform: scale(0.6); opacity: 0.5; } 100% { transform: scale(1.9); opacity: 0; } }
        @keyframes entry-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @media (prefers-reduced-motion: reduce) { .sp-anim * { animation: none !important; } }
      `}</style>
      {/* ambient wash */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(460px 340px at 50% 32%, rgba(16,185,129,0.14), transparent 65%), radial-gradient(520px 400px at 50% 110%, rgba(5,150,105,0.09), transparent 70%)' }} />

      {/* confetti burst */}
      {visible && CONFETTI.map((p, i) => (
        <span key={i} style={{
          position: 'absolute', left: p.x, top: p.y, width: p.s, height: p.s,
          background: p.c, borderRadius: i % 2 ? '50%' : '0 60% 0 60%',
          animation: `entry-pop 1.15s cubic-bezier(.22,1,.36,1) ${p.d} both`,
        }} />
      ))}

      <div className={`relative z-10 text-center transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'}`}>
        {/* logo + expanding success rings + check badge */}
        <div className="relative mx-auto mb-7" style={{ width: 128, height: 128 }}>
          {[0, 0.5].map(d => (
            <span key={d} style={{
              position: 'absolute', inset: 8, borderRadius: '50%',
              border: '1.5px solid rgba(16,185,129,0.45)',
              animation: `entry-ring 1.5s ease-out ${d}s infinite`,
            }} />
          ))}
          <div className="relative w-full h-full rounded-[2.6rem] sp-glass flex items-center justify-center"
            style={{ animation: 'entry-bob 2.6s ease-in-out infinite' }}>
            <img loading="lazy" src="/logo-sm.png" alt="SurePath" width={76} height={88} style={{ objectFit: 'contain' }} />
          </div>
          {/* check badge — draws in */}
          <div className="absolute -bottom-1.5 -right-1.5 w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #059669, #047857)', boxShadow: '0 10px 22px -8px rgba(5,150,105,0.7)', border: '2.5px solid #f6faf7' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M5 12.5L10 17.5L19 7.5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                style={{ strokeDasharray: 26, strokeDashoffset: visible ? 0 : 26, transition: 'stroke-dashoffset 0.55s cubic-bezier(0.4,0,0.2,1) 0.4s' }} />
            </svg>
          </div>
        </div>

        <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#059669', marginBottom: '0.4rem' }}>
          {G.welcome},
        </p>
        <h2 style={{ fontSize: 'clamp(2rem,7vw,2.7rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a', lineHeight: 1, marginBottom: '1.1rem' }}>
          {name} 👋
        </h2>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
          style={{ border: '1px solid rgba(16,185,129,0.28)', background: 'rgba(16,185,129,0.08)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', animation: 'sp-dot-ping 1.3s ease-in-out infinite' }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#047857' }}>{G.verified}</span>
        </div>
      </div>

      <div className="absolute bottom-8" style={{ fontSize: '0.46rem', fontWeight: 700, color: 'rgba(15,23,42,0.25)', letterSpacing: '0.32em', textTransform: 'uppercase' }}>
        SUREPATH
      </div>
    </div>
  );
};
