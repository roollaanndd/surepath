import React, { useState, useEffect, useRef, useCallback, lazy, Suspense, Component } from 'react';
import { Car, Plane, ShieldAlert, Package, Heart } from 'lucide-react';
import { SurePathLogo } from './components/Navbar';
import { Language, UserRole } from './types';
import { db, seedDatabase } from './db';
import { supabase, getAgentProfile, getAgentByEmail, getUserByEmail, getUserTcStatus, recordTcAcceptance, recordUserHeartbeat, recordPageView } from './services/supabaseService';
import TermsModal from './components/TermsModal';
import { InstallPrompt } from './components/InstallPrompt';
import { inject as injectVercelAnalytics } from '@vercel/analytics';
import RoleSelectionScreen from './components/RoleSelectionScreen';

const ADMIN_ROLES = [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.FINANCE_MANAGER, UserRole.FINANCE_DIRECTOR, UserRole.INSURANCE_ADMIN];

// Dedicated app URL per role — /admin, /agapps (agent), /custapp (customer/B2B)
const rolePath = (role: UserRole) =>
  ADMIN_ROLES.includes(role) ? '/admin' : role === UserRole.AGENT ? '/agapps' : '/custapp';

// ─── Error boundary — catches portal render crashes so a white blank page never shows ─
class PortalErrorBoundary extends Component<
  { children: React.ReactNode; onReset: () => void },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  componentDidCatch(e: Error) { console.error('[SurePath portal error]', e); }
  render() {
    if (this.state.error) {
      const msg = (this.state.error as Error)?.message ?? 'Unknown error';
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: '#060a09', color: '#fff', fontFamily: "'Sora',sans-serif", padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 36 }}>⚠️</div>
          <h2 style={{ fontWeight: 800, fontSize: '1rem', margin: 0 }}>Error</h2>
          <p style={{ fontSize: '0.7rem', color: '#888', maxWidth: 280, wordBreak: 'break-word', margin: 0 }}>{msg}</p>
          <button
            onClick={() => { this.setState({ error: null }); this.props.onReset(); }}
            style={{ marginTop: 4, padding: '10px 28px', borderRadius: 12, background: 'hsl(119,99%,46%)', color: '#000', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', border: 'none' }}
          >
            Kembali
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy-load heavy portal chunks — each is only downloaded when the user's role needs it
const AuthGate          = lazy(() => import('./components/AuthGate'));
const AdminPortal       = lazy(() => import('./components/admin/AdminPortal'));
const AdminLogin        = lazy(() => import('./components/admin/AdminLogin'));
const AgentPortal       = lazy(() => import('./components/agent/AgentPortal'));
const CustomerPortal    = lazy(() => import('./components/customer/CustomerPortal'));
const HomePage          = lazy(() => import('./src/pages/HomePage'));
const ProductsPage      = lazy(() => import('./src/pages/ProductsPage'));
const HowItWorksPage    = lazy(() => import('./src/pages/HowItWorksPage'));
const AboutPage         = lazy(() => import('./src/pages/AboutPage'));
const PaymentRedirect   = lazy(() => import('./components/PaymentRedirect'));
const InsuranceReviewPage = lazy(() => import('./components/InsuranceReviewPage'));
const InsurerPortal       = lazy(() => import('./components/InsurerPortal'));
const ProductInfoPage   = lazy(() => import('./src/pages/ProductInfoPage'));
const StaticInfoPage    = lazy(() => import('./src/pages/StaticInfoPage'));
const BlogPage          = lazy(() => import('./src/pages/BlogPage'));
const PremiumCalculatorPage = lazy(() => import('./src/pages/PremiumCalculatorPage'));
const B2BPortal         = lazy(() => import('./components/b2b/B2BPortal'));

const detectLang = (): Language => {
  const s = localStorage.getItem('SUREPATH_LANG');
  if (s === 'EN' || s === 'ID') return s as Language;
  return Language.ID;
};

const COPY = {
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

const PortalLoader = ({ lang = Language.ID }: { lang?: Language }) => (
  <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: 'hsl(0, 0%, 8%)' }}>
    {/* Top progress bar */}
    <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden">
      <div style={{
        position: 'absolute', top: 0, left: '-60%', width: '60%', height: '100%',
        background: 'linear-gradient(90deg, transparent, hsl(119,99%,46%), transparent)',
        animation: 'portal-slide 1.4s cubic-bezier(.4,0,.2,1) infinite',
      }} />
    </div>
    <style>{`@keyframes portal-slide { 0%{left:-60%} 100%{left:110%} }`}</style>
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: 'rgba(255,255,255,0.08)', borderTopColor: 'hsl(119, 99%, 46%)' }} />
      <p style={{ fontFamily: "'Sora', sans-serif", fontSize: '0.65rem', fontWeight: 500, color: 'rgba(255,255,255,0.30)' }}>
        {COPY[lang].loading}
      </p>
    </div>
  </div>
);

// ─── CSS keyframes (injected once, used by splash + welcome-back screens) ─────
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
/* ── Mascot "Pathy" splash animations ── */
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
function ensureSPKeyframes() {
  if (!document.getElementById('sp-kf')) {
    const s = document.createElement('style'); s.id = 'sp-kf'; s.textContent = SP_CSS;
    document.head.appendChild(s);
  }
}

// ─── Day / night palette for the splash + welcome-back screens ────────────────
// Splash auto-switches with the clock: ivory + indigo by day, deep charcoal by night.
type SplashTheme = {
  isDay: boolean;
  bg: string;
  accent: string;      // hex/hsl for strokes, text accents
  accentRgb: string;   // "r,g,b" for rgba() glows
  text: string;
  textMuted: string;
  textFaint: string;
  tileBg: string;
  tileBorder: string;
  gridRgb: string;     // grid line color base
  gridOpacity: number;
  chipBg: string;
  chipBorder: string;
  blobs: { size: number; color: string; phase: number; speedX: number; speedY: number; op: number }[];
};

const splashTheme = (darkMode: boolean): SplashTheme =>
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
        bg: 'hsl(40, 36%, 97%)', // warm ivory
        accent: '#16a34a', // brand green
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
          { size: 380, color: '251,191,36',   phase: 4.2, speedX: 0.0009, speedY: 0.0006, op: 0.10 }, // warm amber sun-tint
          { size: 300, color: '16,185,129',   phase: 1.0, speedX: 0.0006, speedY: 0.0009, op: 0.12 },
        ],
      };

// Celestial badge — animated sun by day, crescent moon + stars by night.
const Celestial: React.FC<{ th: SplashTheme; show: boolean }> = ({ th, show }) => (
  <div
    className="sp-anim"
    style={{
      position: 'absolute', top: 28, right: 28, width: 44, height: 44,
      opacity: show ? 1 : 0,
      animation: show ? 'sp-celest-in .7s cubic-bezier(.22,1,.36,1) forwards' : 'none',
    }}
    aria-hidden
  >
    {th.isDay ? (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* rays */}
        <svg width="44" height="44" viewBox="0 0 44 44" style={{ position: 'absolute', inset: 0, animation: 'sp-sun-ray 22s linear infinite' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={i} x1="22" y1="3" x2="22" y2="9"
              stroke={th.accent} strokeWidth="2" strokeLinecap="round"
              transform={`rotate(${i * 45} 22 22)`} opacity="0.7" />
          ))}
        </svg>
        {/* core */}
        <div style={{
          position: 'absolute', inset: '12px', borderRadius: '50%',
          background: `radial-gradient(circle, rgba(251,191,36,0.95), rgba(${th.accentRgb},0.7))`,
          boxShadow: `0 0 18px rgba(251,191,36,0.6)`,
          animation: 'sp-sun-pulse 3.5s ease-in-out infinite',
        }} />
      </div>
    ) : (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* crescent moon */}
        <svg width="44" height="44" viewBox="0 0 44 44" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <mask id="sp-moon-mask">
              <rect width="44" height="44" fill="white" />
              <circle cx="28" cy="18" r="11" fill="black" />
            </mask>
          </defs>
          <circle cx="22" cy="22" r="11" fill={th.accent} mask="url(#sp-moon-mask)"
            style={{ filter: `drop-shadow(0 0 8px rgba(${th.accentRgb},0.6))` }} />
        </svg>
        {/* twinkling stars */}
        {[[6, 8, 0], [38, 30, 0.6], [34, 6, 1.2]].map(([x, y, d], i) => (
          <div key={i} style={{
            position: 'absolute', left: x, top: y, width: 3, height: 3, borderRadius: '50%',
            background: th.accent, animation: `sp-twinkle 2.${4 + i}s ease-in-out ${d}s infinite`,
          }} />
        ))}
      </div>
    )}
  </div>
);

// ─── Pathy — the animated SurePath mascot (waves, blinks, bobs) ───────────────
const PathyMascot: React.FC<{ accentRgb: string; size?: number; wave?: boolean }> = ({ accentRgb, size = 150, wave = true }) => {
  const W = size, H = Math.round(size * 1.16);
  const eye = (left: number): React.CSSProperties => ({
    position: 'absolute', left, top: H * 0.40, width: W * 0.13, height: W * 0.17,
  });
  return (
    <div className="sp-anim" style={{ position: 'relative', width: W, height: H, animation: wave ? 'pathy-bob 3.2s ease-in-out infinite' : 'none' }}>
      {/* Pulsing halo */}
      <div className="sp-anim" style={{ position: 'absolute', left: '50%', top: '46%', width: W * 1.25, height: W * 1.25, transform: 'translate(-50%,-50%)', borderRadius: '50%', border: `2px solid rgba(${accentRgb},0.5)`, animation: 'pathy-pulse 2.6s ease-in-out infinite' }} />

      {/* Shield body */}
      <svg viewBox="0 0 120 140" width={W} height={H} style={{ position: 'absolute', inset: 0, filter: `drop-shadow(0 16px 32px rgba(${accentRgb},0.4))` }}>
        <defs>
          <linearGradient id="pathy-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2BE07A" />
            <stop offset="1" stopColor="#0E9D57" />
          </linearGradient>
        </defs>
        <path d="M60 6 L110 26 V70 C110 104 88 126 60 134 C32 126 10 104 10 70 V26 Z"
          fill="url(#pathy-body)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" strokeLinejoin="round" />
        {/* glossy highlight */}
        <path d="M60 14 L100 30 V46 C84 36 70 33 60 33 C50 33 36 36 20 46 V30 Z" fill="rgba(255,255,255,0.16)" />
      </svg>

      {/* Cheeks */}
      <div style={{ position: 'absolute', left: W * 0.27, top: H * 0.50, width: W * 0.12, height: W * 0.08, borderRadius: '50%', background: 'rgba(255,120,140,0.55)', filter: 'blur(1px)' }} />
      <div style={{ position: 'absolute', left: W * 0.61, top: H * 0.50, width: W * 0.12, height: W * 0.08, borderRadius: '50%', background: 'rgba(255,120,140,0.55)', filter: 'blur(1px)' }} />

      {/* Eyes (blink) */}
      {[W * 0.345, W * 0.525].map((lx, i) => (
        <div key={i} className="sp-anim" style={{ ...eye(lx), animation: `pathy-blink 4.2s ease-in-out ${i * 0.05}s infinite`, transformOrigin: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: '#0b3d24', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', left: '52%', top: '18%', width: '34%', height: '30%', background: '#fff', borderRadius: '50%' }} />
        </div>
      ))}

      {/* Smile */}
      <svg viewBox="0 0 40 20" width={W * 0.30} height={W * 0.15} style={{ position: 'absolute', left: '50%', top: H * 0.55, transform: 'translateX(-50%)' }}>
        <path d="M4 4 Q20 20 36 4" fill="none" stroke="#0b3d24" strokeWidth="3.5" strokeLinecap="round" />
      </svg>

      {/* White check badge on belly */}
      <div style={{ position: 'absolute', left: '50%', top: H * 0.70, transform: 'translateX(-50%)', width: W * 0.22, height: W * 0.22, borderRadius: '50%', background: '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 24 24" width={W * 0.13} height={W * 0.13} fill="none" stroke="#0E9D57" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* Waving hand */}
      <div className="sp-anim" style={{ position: 'absolute', left: W * 0.80, top: H * 0.30, width: W * 0.20, height: W * 0.20, transformOrigin: '30% 80%', animation: wave ? 'pathy-wave 1.6s ease-in-out infinite' : 'none' }}>
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#2BE07A,#0E9D57)', borderRadius: '50% 50% 50% 20%', border: '1.5px solid rgba(255,255,255,0.45)', boxShadow: '0 4px 10px rgba(0,0,0,0.18)' }} />
      </div>
    </div>
  );
};

// ─── Splash screen (auto-advances, no interaction needed) ──────────────────────
const SplashScreen: React.FC<{ onFinish: () => void; lang: Language; setLang: (l: Language) => void; darkMode: boolean }> = ({ onFinish, lang, setLang, darkMode }) => {
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

  // Floating bubbles — fresh, playful backdrop (replaces the old orbital field).
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
      {/* Soft accent aurora */}
      <div className="absolute pointer-events-none" style={{ top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '85vw', height: '60vh', borderRadius: '50%', background: `radial-gradient(ellipse at center, rgba(${th.accentRgb},0.18), transparent 65%)`, filter: 'blur(20px)' }} />
      <div className="absolute pointer-events-none" style={{ bottom: '-15%', right: '-10%', width: '50vw', height: '50vh', borderRadius: '50%', background: `radial-gradient(circle, rgba(${th.accentRgb},0.12), transparent 70%)`, filter: 'blur(20px)' }} />

      {/* Rising bubbles */}
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

        {/* Speech bubble greeting */}
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
          {/* tail */}
          <div style={{ position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: 14, height: 14, background: th.isDay ? '#ffffff' : 'rgba(20,28,24,0.95)', borderRight: `1.5px solid rgba(${th.accentRgb},0.30)`, borderBottom: `1.5px solid rgba(${th.accentRgb},0.30)` }} />
        </div>

        {/* Mascot */}
        <div className={`transition-all duration-700 ease-out ${phase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <PathyMascot accentRgb={th.accentRgb} size={148} />
        </div>

        {/* Brand */}
        <div className={`text-center transition-all duration-500 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <h1 style={{ fontSize: '2.3rem', fontWeight: 700, letterSpacing: '-0.05em', color: th.text, lineHeight: 1 }}>
            Sure<span style={{ color: th.accent }}>Path</span>
          </h1>
          <p style={{ fontSize: '0.6rem', fontWeight: 500, color: th.textFaint, letterSpacing: '0.32em', textTransform: 'uppercase', marginTop: '0.5rem' }}>
            {G.tagline}
          </p>
        </div>

        {/* Progress */}
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

        {/* Language toggle */}
        <div className={`flex items-center gap-1 transition-all duration-500 ${phase >= 3 ? 'opacity-100' : 'opacity-0'}`}>
          {(['ID', 'EN'] as const).map(l => (
            <button key={l} onClick={() => { setLang(l as Language); localStorage.setItem('SUREPATH_LANG', l); }}
              style={{ fontFamily: "'Sora',sans-serif", fontSize: '0.62rem', fontWeight: lang === l ? 600 : 400, color: lang === l ? th.accent : th.textFaint, padding: '0.2rem 0.65rem', borderRadius: '99px', cursor: 'pointer', background: lang === l ? `rgba(${th.accentRgb},0.10)` : 'transparent', border: `1px solid ${lang === l ? `rgba(${th.accentRgb},0.22)` : 'transparent'}`, transition: 'all 0.2s' }}>
              {l}
            </button>
          ))}
        </div>

      </div>

      {/* Footer */}
      <div className="absolute bottom-8" style={{ fontSize: '0.5rem', fontWeight: 500, color: th.textFaint, letterSpacing: '0.3em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={`rgba(${th.accentRgb},0.6)`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        SurePath · Secure Connection
      </div>
    </div>
  );
};

// ─── Welcome-back screen (shown after login, auto-advances) ───────────────────
const AppEntryScreen = ({ name, onDone, lang, darkMode }: { name: string; onDone: () => void; lang: Language; darkMode: boolean }) => {
  const [visible, setVisible] = useState(false);
  const [fade, setFade]       = useState(false);
  const onDoneRef = useRef(onDone);
  const th = splashTheme(darkMode);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    ensureSPKeyframes();
    const t0 = setTimeout(() => setVisible(true), 60);
    const t1 = setTimeout(() => setFade(true), 1800);
    const t2 = setTimeout(() => onDoneRef.current(), 2300);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const G = COPY[lang];

  return (
    <div
      className={`sp-anim fixed inset-0 z-[4999] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${fade ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ background: th.bg, fontFamily: "'Sora', sans-serif", transition: 'background 0.6s ease, opacity 0.5s ease' }}
    >
      {/* Day/night celestial indicator */}
      <Celestial th={th} show={visible} />

      {/* Radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div style={{ width: 440, height: 440, borderRadius: '50%', background: `radial-gradient(circle, rgba(${th.accentRgb},0.12) 0%, transparent 68%)`, opacity: visible ? 1 : 0, transition: 'opacity 1s' }} />
      </div>

      <div className={`relative z-10 text-center transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
        {/* Animated shield — icon scaled to fill the tile */}
        <div className="relative mx-auto mb-7" style={{ width: 124, height: 124 }}>
          <div className="absolute inset-0 rounded-[2.5rem] blur-2xl" style={{ background: th.accent, opacity: 0.16 }} />
          <div className="relative w-full h-full rounded-[2.5rem] flex items-center justify-center border"
            style={{ background: th.tileBg, borderColor: th.tileBorder, boxShadow: `0 0 60px rgba(${th.accentRgb},0.12)` }}>
            <svg width="72" height="72" viewBox="0 0 54 54" fill="none" className="sp-anim" style={{ animation: 'sp-check-glow 2.5s ease-in-out infinite' }}>
              <path d="M27 4L43 11.5V26C43 36.2 36 44.6 27 48C18 44.6 11 36.2 11 26V11.5L27 4Z"
                fill={`rgba(${th.accentRgb},0.12)`} stroke={th.accent} strokeWidth="1.5" />
              <path d="M19 27L23.5 31.5L35 20"
                stroke={th.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ strokeDasharray: 32, strokeDashoffset: visible ? 0 : 32, transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1) 0.35s' }} />
            </svg>
          </div>
        </div>

        <p style={{ fontSize: '0.75rem', fontWeight: 500, color: th.accent, marginBottom: '0.4rem', letterSpacing: '0.02em' }}>
          {G.welcome},
        </p>
        <h2 style={{ fontSize: 'clamp(2rem,7vw,2.8rem)', fontWeight: 700, letterSpacing: '-0.03em', color: th.text, lineHeight: 1, marginBottom: '1.2rem' }}>
          {name} 👋
        </h2>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border"
          style={{ borderColor: `rgba(${th.accentRgb},0.22)`, background: `rgba(${th.accentRgb},0.08)` }}>
          <div className="sp-anim" style={{ width: 6, height: 6, borderRadius: '50%', background: th.accent, animation: 'sp-dot-ping 1.3s ease-in-out infinite' }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 500, color: th.accent }}>{G.verified}</span>
        </div>
      </div>

      {/* Bottom wordmark */}
      <div className="absolute bottom-8" style={{ fontSize: '0.46rem', fontWeight: 600, color: th.textFaint, letterSpacing: '0.32em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={`rgba(${th.accentRgb},0.27)`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        SurePath
      </div>
    </div>
  );
};

const INITIAL_PRODUCTS = [
  {
    id: 'car',
    title: 'Car Protection',
    label: 'Asuransi Mobil',
    icon: Car,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    active: true,
    cat: 'Retail',
    tech: 'Smart Scan AI',
    desc: 'Proteksi lengkap kendaraan dengan pengecekan kerusakan instan lewat foto HP.'
  },
  {
    id: 'travel',
    title: 'Travel Safe',
    label: 'Asuransi Perjalanan',
    icon: Plane,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
    active: true,
    cat: 'Retail',
    tech: 'Direct Payout',
    desc: 'Pembayaran otomatis untuk pesawat terlambat dan perlindungan medis dunia.'
  },
  {
    id: 'pa',
    title: 'Personal Safety',
    label: 'Kecelakaan Diri',
    icon: ShieldAlert,
    color: 'text-rose-500',
    bg: 'bg-rose-50',
    active: true,
    cat: 'Retail',
    tech: 'Instant Approval',
    desc: 'Santunan cepat kecelakaan diri dengan pendaftaran mudah cuma 60 detik.'
  },
  {
    id: 'mpar',
    title: 'Item Shield',
    label: 'Proteksi Barang',
    icon: Package,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    active: true,
    cat: 'Retail',
    tech: 'Device Guard',
    desc: 'Lindungi gadget, elektronik, dan barang berharga dari kerusakan tak terduga.'
  },
  {
    id: 'health-ind',
    title: 'Family Health',
    label: 'Kesehatan Keluarga',
    icon: Heart,
    color: 'text-pink-500',
    bg: 'bg-pink-50',
    active: true,
    cat: 'Retail',
    tech: 'AI Chat',
    desc: 'Konsultasi gratis dengan asisten medis AI SurePath — pembelian polis kesehatan segera hadir.'
  }
];

const SESSION_KEY = 'SUREPATH_SESSION';


const App = () => {
  // Show splash on every fresh browser session (sessionStorage resets per tab/window open)
  const [isLoaded, setIsLoaded]       = useState(() => sessionStorage.getItem('sp_splash_done') === '1');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [darkMode, setDarkMode]       = useState(() => {
    if (typeof window === 'undefined') return false;
    const hour = new Date().getHours();
    return hour < 6 || hour >= 19; // dark from 7 PM to 5:59 AM
  });
  const [appMode, setAppMode]         = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone || false
      : false
  );
  // True while we're waiting for a Supabase PKCE/implicit OAuth callback to resolve.
  // Prevents the landing page flashing before the session is established.
  const [oauthLoading, setOauthLoading] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.location.search.includes('code=') || window.location.hash.includes('access_token=');
  });
  const [products, setProducts]   = useState<any[]>(INITIAL_PRODUCTS);
  const [lang, setLang]           = useState<Language>(detectLang);
  const [entryUser, setEntryUser] = useState<{ name: string } | null>(null);
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [pendingOAuthUser, setPendingOAuthUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [showTc, setShowTc] = useState(false);

  useEffect(() => {
    const loadCustomProducts = async () => {
      try {
        const activeCustom = await db.customProducts.filter(p => p.isActive).toArray();
        if (activeCustom.length > 0) {
          const formatted = activeCustom.map(cp => ({
            id: `custom_${cp.id}`,
            title: cp.name,
            label: cp.name,
            icon: Package,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50',
            active: true,
            cat: cp.type === 'SERVICES' ? 'Services' : 'Retail',
            desc: cp.description || 'Produk asuransi komprehensif.'
          }));
          setProducts(prev => {
            const coreIds = INITIAL_PRODUCTS.map(ip => ip.id);
            return [...prev.filter(p => coreIds.includes(p.id)), ...formatted];
          });
        }
      } catch (err) {
        console.warn('Failed to load custom products:', err);
      }
    };
    loadCustomProducts();
  }, []);

  // Auto-update theme on the hour boundary (7 PM → dark, 6 AM → light)
  useEffect(() => {
    const check = () => {
      const hour = new Date().getHours();
      setDarkMode(prev => {
        const auto = hour < 6 || hour >= 19;
        return prev !== auto ? auto : prev;
      });
    };
    const id = setInterval(check, 60_000); // check every minute
    return () => clearInterval(id);
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  }, []);

  const handleAuthSuccess = useCallback(async (user: any) => {
    let enrichedUser = user;
    if (user.role === UserRole.AGENT && !user.supabaseId) {
      const spUser = await getAgentByEmail(user.email).catch(() => null);
      if (spUser) enrichedUser = { ...user, supabaseId: spUser.id, agent_code: spUser.agent_code };
    }
    setEntryUser({ name: enrichedUser.name?.split(' ')[0] || 'Pengguna' });
    setTimeout(() => {
      setCurrentUser(enrichedUser);
      // Persist to localStorage so a fresh login survives a page reload (LOW-1).
      // The startup restore branch reads localStorage first; previously the session
      // was written only to sessionStorage, so a reload logged the user out.
      localStorage.setItem(SESSION_KEY, JSON.stringify(enrichedUser));
      setAppMode(true);
      navigate(rolePath(enrichedUser.role));
    }, 1400);
  }, [navigate]);

  // Capture referral code from ?ref= URL param (persists across OAuth redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) localStorage.setItem('SUREPATH_REF', ref);
  }, []);

  useEffect(() => {
    injectVercelAnalytics({ mode: 'auto' });
    seedDatabase().catch(console.error);
    const saved = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const user = JSON.parse(saved);
        setCurrentUser(user);
        setAppMode(true);
        setOauthLoading(false);
        // HIGH-5: enforce T&C on restored sessions too, mirroring the fresh-OAuth
        // path below. Without this, a user who never accepted the T&C could skip
        // the gate simply by having a session persisted in storage.
        const restoredId = user?.supabaseId ?? user?.id;
        if (restoredId) {
          getUserTcStatus(restoredId)
            .then((tcAccepted) => { if (!tcAccepted) setShowTc(true); })
            .catch(() => {});
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
      }
    } else {
      // Restore session after OAuth redirect or magic link.
      // getSession() handles implicit flow (token in hash).
      // onAuthStateChange handles PKCE flow where the code exchange is async
      // and may complete AFTER getSession() is first called.
      let resolved = false;

      const buildAndLogin = async (u: any) => {
        if (resolved) return;
        resolved = true;
        // Strip ?code= / #access_token= so a refresh doesn't re-trigger PKCE
        if (window.location.search.includes('code=') || window.location.hash.includes('access_token=')) {
          window.history.replaceState({}, '', window.location.pathname);
        }
        const [byId, byEmail] = await Promise.allSettled([
          getAgentProfile(u.id),
          getUserByEmail(u.email!),  // finds any role, not just AGENT
        ]);
        const profile =
          (byId.status === 'fulfilled' ? byId.value : null) ??
          (byEmail.status === 'fulfilled' ? byEmail.value : null);
        setOauthLoading(false);
        if (profile) {
          const tcAccepted = await getUserTcStatus(profile.id).catch(() => true);
          if (!tcAccepted) setShowTc(true);
          handleAuthSuccess({
            id:         profile.id,
            name:       profile.name,
            email:      profile.email,
            role:       profile.role as UserRole,
            supabaseId: profile.id,
            nodeId:     profile.agent_code ?? `SP-${u.id.slice(0, 8).toUpperCase()}`,
            trustScore: profile.trust_score ?? 85,
          });
        } else {
          // New Google user — show role selection before creating a profile
          setPendingOAuthUser({
            id:    u.id,
            name:  u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email!.split('@')[0],
            email: u.email!,
          });
        }
      };

      // Immediate path — works when session is already in memory
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) buildAndLogin(session.user);
      });

      // Async fallback — catches PKCE code exchange that completes after getSession
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          buildAndLogin(session.user);
        }
        // If auth reports no session, stop the loading spinner
        if (event === 'INITIAL_SESSION' && !session) {
          setOauthLoading(false);
        }
      });

      // Safety timeout — if OAuth/PKCE never resolves, stop blocking the UI after 10s
      const oauthTimeout = setTimeout(() => setOauthLoading(false), 10000);

      return () => { subscription.unsubscribe(); clearTimeout(oauthTimeout); };
    }
  }, [handleAuthSuccess]);

  const handleSetLang = useCallback((l: Language) => {
    setLang(l);
    localStorage.setItem('SUREPATH_LANG', l);
  }, []);

  useEffect(() => {
    const fn = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', fn);
    return () => window.removeEventListener('popstate', fn);
  }, []);

  // ── Heartbeat: record user session every 2 minutes while logged in ──────────
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (currentUser?.id && currentUser?.role) {
      // Fire immediately, then every 2 minutes
      recordUserHeartbeat(currentUser.id, currentUser.role).catch(() => {});
      heartbeatRef.current = setInterval(() => {
        recordUserHeartbeat(currentUser.id, currentUser.role).catch(() => {});
      }, 2 * 60 * 1000);
    }
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [currentUser?.id, currentUser?.role]);

  // ── Page view tracking ───────────────────────────────────────────────────────
  useEffect(() => {
    if (currentPath) {
      recordPageView(currentPath).catch(() => {});
    }
  }, [currentPath]);

  const handleLogout = useCallback(async () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    await supabase.auth.signOut().catch(() => {});
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setAppMode(false);
    navigate('/');
  }, [navigate]);

  if (!isLoaded) return <SplashScreen onFinish={() => { sessionStorage.setItem('sp_splash_done', '1'); setIsLoaded(true); }} lang={lang} setLang={handleSetLang} darkMode={darkMode} />;
  if (oauthLoading && !currentUser) return <PortalLoader />;
  if (pendingOAuthUser) return (
    <RoleSelectionScreen
      oauthUser={pendingOAuthUser}
      onComplete={user => { setPendingOAuthUser(null); handleAuthSuccess(user); }}
      onCancel={() => { setPendingOAuthUser(null); handleLogout(); }}
    />
  );
  if (entryUser) return <AppEntryScreen name={entryUser.name} onDone={() => setEntryUser(null)} lang={lang} darkMode={darkMode} />;

  if (showTc && currentUser) {
    return (
      <TermsModal
        onAccept={async () => {
          return await recordTcAcceptance(currentUser.id ?? currentUser.supabaseId);
        }}
        onDone={() => setShowTc(false)}
      />
    );
  }

  const pathname = currentPath;

  if (pathname === '/payment/success' || pathname === '/payment/failed') {
    return (
      <Suspense fallback={<PortalLoader />}>
        <PaymentRedirect status={pathname === '/payment/success' ? 'success' : 'failed'} />
      </Suspense>
    );
  }

  if (pathname === '/insurer-portal') {
    return (
      <Suspense fallback={<PortalLoader />}>
        <InsurerPortal />
      </Suspense>
    );
  }

  const reviewMatch = pathname.match(/^\/review\/([0-9a-f-]{36})$/i);
  if (reviewMatch) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <InsuranceReviewPage token={reviewMatch[1]} />
      </Suspense>
    );
  }

  // Info pages — accessible without authentication
  const productMatch = pathname.match(/^\/product\/(car|travel|pa|property|health)$/);
  if (productMatch) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <ProductInfoPage
          productId={productMatch[1]}
          lang={lang}
          onBack={() => navigate('/')}
          onSignIn={() => navigate('/login')}
        />
      </Suspense>
    );
  }

  // Calculator route
  if (pathname === '/kalkulator') {
    return (
      <Suspense fallback={<PortalLoader />}>
        <PremiumCalculatorPage
          lang={lang}
          onBack={() => navigate('/')}
          onSignIn={() => navigate('/login')}
        />
      </Suspense>
    );
  }

  // Marketing pages — public, accessible without authentication
  const MARKETING_PAGES: Record<string, React.FC<any>> = {
    '/products': ProductsPage,
    '/how-it-works': HowItWorksPage,
    '/about': AboutPage,
  };
  const MarketingPage = MARKETING_PAGES[pathname];
  if (MarketingPage) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <MarketingPage
          onSignIn={() => navigate('/login')}
          navigate={navigate}
          lang={lang}
          setLang={setLang}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      </Suspense>
    );
  }

  // Blog routes — /blog and /blog/:slug
  const blogSlugMatch = pathname.match(/^\/blog\/([a-z0-9-]+)$/);
  if (pathname === '/blog' || blogSlugMatch) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <BlogPage
          slug={blogSlugMatch ? blogSlugMatch[1] : undefined}
          onBack={() => navigate('/')}
          onSignIn={() => navigate('/login')}
        />
      </Suspense>
    );
  }

  const STATIC_PAGES = ['careers', 'agents', 'partnership', 'privacy', 'terms', 'security', 'cookie'];
  const staticPageId = STATIC_PAGES.find(p => pathname === `/${p}`);
  if (staticPageId) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <StaticInfoPage
          pageId={staticPageId}
          lang={lang}
          setLang={setLang}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          navigate={navigate}
          onSignIn={() => navigate('/login')}
        />
      </Suspense>
    );
  }

  // Dedicated app entry routes — /login, /custapp (customer), /agapps (agent).
  // Logged-out visitors get the auth screen here (deep links work: after login
  // they land in their role's portal). Logged-in users fall through to the
  // role-based portal rendering below.
  if (['/login', '/custapp', '/agapps'].includes(pathname) && !currentUser) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <AuthGate onAuthSuccess={handleAuthSuccess} initialLang={lang} />
      </Suspense>
    );
  }

  // Dedicated /admin login page — show AdminLogin whenever the current user is not an admin,
  // even if they're logged in as a customer/agent (prevents the app from falling through
  // to their own portal when they visit /admin).
  if ((pathname === '/admin' || pathname.startsWith('/admin/')) && (!currentUser || !ADMIN_ROLES.includes(currentUser.role))) {
    return (
      <Suspense fallback={<PortalLoader lang={lang} />}>
        <AdminLogin
          onLoginSuccess={user => {
            handleAuthSuccess(user);
            navigate('/admin');
          }}
          onBack={() => navigate('/')}
        />
      </Suspense>
    );
  }

  if (currentUser && ADMIN_ROLES.includes(currentUser.role)) {
    return (
      <PortalErrorBoundary onReset={handleLogout}>
        <Suspense fallback={<PortalLoader />}>
          <AdminPortal
            onLogout={handleLogout}
            products={products}
            setProducts={setProducts}
            userRole={currentUser.role}
            currentUser={currentUser}
          />
        </Suspense>
      </PortalErrorBoundary>
    );
  }

  if (currentUser && currentUser.role === UserRole.AGENT) {
    const agentWithSupabaseId = currentUser.supabaseId
      ? { ...currentUser, id: currentUser.supabaseId, agent_code: currentUser.nodeId }
      : { ...currentUser, agent_code: currentUser.nodeId };
    return (
      <>
        <InstallPrompt lang={lang} />
        <PortalErrorBoundary onReset={handleLogout}>
          <Suspense fallback={<PortalLoader />}>
            <AgentPortal agent={agentWithSupabaseId} onLogout={handleLogout} lang={lang} />
          </Suspense>
        </PortalErrorBoundary>
      </>
    );
  }

  if (currentUser && currentUser.role === UserRole.B2B_CLIENT) {
    return (
      <PortalErrorBoundary onReset={handleLogout}>
        <Suspense fallback={<PortalLoader />}>
          <B2BPortal client={currentUser} onLogout={handleLogout} lang={lang} />
        </Suspense>
      </PortalErrorBoundary>
    );
  }

  if (currentUser) {
    return (
      <>
        <InstallPrompt lang={lang} />
        <PortalErrorBoundary onReset={handleLogout}>
          <Suspense fallback={<PortalLoader />}>
            <CustomerPortal
              currentUser={currentUser}
              onLogout={handleLogout}
              lang={lang}
              products={products}
            />
          </Suspense>
        </PortalErrorBoundary>
      </>
    );
  }

  if (!appMode) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <Suspense fallback={<PortalLoader />}>
          <HomePage
            onSignIn={() => navigate('/login')}
            navigate={navigate}
            lang={lang}
            setLang={setLang}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <Suspense fallback={<PortalLoader />}>
      <AuthGate onAuthSuccess={handleAuthSuccess} initialLang={lang} />
    </Suspense>
  );
};

export default App;
