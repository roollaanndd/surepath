import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Car, Plane, ShieldAlert, Package, Heart } from 'lucide-react';
import { SurePathLogo } from './components/Navbar';
import { Language, UserRole } from './types';
import { db, seedDatabase } from './db';
import { supabase, getAgentProfile, getAgentByEmail } from './services/supabaseService';
import { inject as injectVercelAnalytics } from '@vercel/analytics';

// Lazy-load heavy portal chunks — each is only downloaded when the user's role needs it
const AuthGate          = lazy(() => import('./components/AuthGate'));
const AdminPortal       = lazy(() => import('./components/admin/AdminPortal'));
const AdminLogin        = lazy(() => import('./components/admin/AdminLogin'));
const AgentPortal       = lazy(() => import('./components/agent/AgentPortal'));
const CustomerPortal    = lazy(() => import('./components/customer/CustomerPortal'));
const PlatformLanding   = lazy(() => import('./src/pages/PlatformLanding'));
const PaymentRedirect   = lazy(() => import('./components/PaymentRedirect'));
const InsuranceReviewPage = lazy(() => import('./components/InsuranceReviewPage'));
const InsurerPortal       = lazy(() => import('./components/InsurerPortal'));
const ProductInfoPage   = lazy(() => import('./src/pages/ProductInfoPage'));
const StaticInfoPage    = lazy(() => import('./src/pages/StaticInfoPage'));
const B2BPortal         = lazy(() => import('./components/b2b/B2BPortal'));

const detectLang = (): Language => {
  const s = localStorage.getItem('SUREPATH_LANG');
  if (s === 'EN' || s === 'ID') return s as Language;
  return navigator.language?.toLowerCase().startsWith('id') ? Language.ID : Language.EN;
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
  <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'hsl(0, 0%, 8%)' }}>
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: 'rgba(6, 224, 0, 0.15)', borderTopColor: 'hsl(119, 99%, 46%)' }} />
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
@keyframes sp-glow     { 0%,100% { box-shadow: 0 0 28px rgba(6,224,0,0.10), 0 0 56px rgba(6,224,0,0.05); } 50% { box-shadow: 0 0 52px rgba(6,224,0,0.24), 0 0 100px rgba(6,224,0,0.10); } }
@keyframes sp-float-a  { 0%,100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-14px) translateX(5px); } }
@keyframes sp-float-b  { 0%,100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-9px) translateX(-8px); } }
@keyframes sp-dot-ping { 0%,100% { opacity:.3; transform:scale(1); } 50% { opacity:1; transform:scale(1.5); } }
@keyframes sp-check-glow { 0%,100% { filter:drop-shadow(0 0 4px rgba(6,224,0,.5)); } 50% { filter:drop-shadow(0 0 12px rgba(6,224,0,.9)); } }
`;
function ensureSPKeyframes() {
  if (!document.getElementById('sp-kf')) {
    const s = document.createElement('style'); s.id = 'sp-kf'; s.textContent = SP_CSS;
    document.head.appendChild(s);
  }
}

// ─── Splash screen (auto-advances, no interaction needed) ──────────────────────
const SplashScreen: React.FC<{ onFinish: () => void; lang: Language; setLang: (l: Language) => void }> = ({ onFinish, lang, setLang }) => {
  const [phase, setPhase]       = useState(0);
  const [progress, setProgress] = useState(0);
  const [msgIdx, setMsgIdx]     = useState(0);
  const onFinishRef  = useRef(onFinish);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);

  // Animated blobs — identical to the login page AnimatedBackground
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const blobs = [
      { size: 520, color: '6,224,0',    phase: 0,   speedX: 0.0007, speedY: 0.0005 },
      { size: 420, color: '34,197,94',  phase: 2.1, speedX: 0.0005, speedY: 0.0008 },
      { size: 360, color: '74,222,128', phase: 4.2, speedX: 0.0009, speedY: 0.0006 },
      { size: 280, color: '16,185,129', phase: 1.0, speedX: 0.0006, speedY: 0.0009 },
    ];
    let frame = 0, animId = 0;
    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      blobs.forEach(blob => {
        const x = canvas.width  * (0.15 + 0.7 * (0.5 + 0.5 * Math.sin(frame * blob.speedX + blob.phase)));
        const y = canvas.height * (0.15 + 0.7 * (0.5 + 0.5 * Math.cos(frame * blob.speedY + blob.phase * 1.4)));
        const grd = ctx.createRadialGradient(x, y, 0, x, y, blob.size);
        grd.addColorStop(0,   `rgba(${blob.color},0.18)`);
        grd.addColorStop(0.5, `rgba(${blob.color},0.06)`);
        grd.addColorStop(1,   `rgba(${blob.color},0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  useEffect(() => {
    ensureSPKeyframes();
    const t0 = setTimeout(() => setPhase(1), 100);
    const t1 = setTimeout(() => setPhase(2), 520);
    const t2 = setTimeout(() => setPhase(3), 880);
    const t3 = setTimeout(() => setPhase(4), 2600);
    const t4 = setTimeout(() => onFinishRef.current(), 3100);
    const progInt = setInterval(() => setProgress(p => Math.min(p + 1.5, 100)), 18);
    const msgInt  = setInterval(() => setMsgIdx(i => Math.min(i + 1, COPY[lang].steps.length - 1)), 450);
    return () => { [t0,t1,t2,t3,t4].forEach(clearTimeout); clearInterval(progInt); clearInterval(msgInt); };
  }, [lang]);

  const G   = COPY[lang];
  const GRN = 'hsl(119, 99%, 46%)';

  return (
    <div
      className={`fixed inset-0 z-[5000] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${phase >= 4 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ background: 'hsl(0, 0%, 8%)', fontFamily: "'Sora', sans-serif" }}
    >
      {/* Animated canvas blobs — same as login page */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* White grid overlay — same as login page */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.018]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="relative z-10 flex flex-col items-center gap-7">

        {/* Logo with orbital rings */}
        <div className={`relative flex items-center justify-center transition-all duration-700 ease-out ${phase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
          {/* Outer dashed ring */}
          <svg width="228" height="228" viewBox="0 0 228 228" className="absolute pointer-events-none"
            style={{ animation: 'sp-ring-fwd 20s linear infinite', opacity: 0.22 }}>
            <circle cx="114" cy="114" r="110" fill="none" stroke={GRN} strokeWidth="1" strokeDasharray="6 9" />
          </svg>
          {/* Inner dashed ring */}
          <svg width="172" height="172" viewBox="0 0 172 172" className="absolute pointer-events-none"
            style={{ animation: 'sp-ring-rev 13s linear infinite', opacity: 0.16 }}>
            <circle cx="86" cy="86" r="82" fill="none" stroke={GRN} strokeWidth="1" strokeDasharray="3 13" />
          </svg>
          {/* Orbiting dots */}
          {([0, 1, 2] as const).map(i => (
            <div key={i} className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ animation: `sp-orbit-${i} ${5 + i * 1.8}s linear infinite` }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: GRN, boxShadow: `0 0 10px ${GRN}, 0 0 22px rgba(6,224,0,.5)` }} />
            </div>
          ))}
          {/* Logo tile — matching login page style */}
          <div className="relative">
            <div className="absolute -inset-6 rounded-[3rem] blur-3xl opacity-20" style={{ background: GRN }} />
            <div className="relative w-28 h-28 rounded-[2.5rem] flex items-center justify-center border"
              style={{ background: 'rgba(6,224,0,0.06)', borderColor: 'rgba(6,224,0,0.22)', boxShadow: '0 0 60px rgba(6,224,0,0.10)', animation: 'sp-glow 3.2s ease-in-out infinite' }}>
              <SurePathLogo className="w-[4.5rem] h-[4.5rem]" />
            </div>
          </div>
        </div>

        {/* Brand — matching login page typography */}
        <div className={`text-center transition-all duration-600 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.05em', color: '#fff', lineHeight: 1 }}>
            Sure<span style={{ color: GRN }}>Path</span>
          </h1>
          <p style={{ fontSize: '0.6rem', fontWeight: 500, color: 'rgba(255,255,255,0.30)', letterSpacing: '0.35em', textTransform: 'uppercase', marginTop: '0.5rem' }}>
            {G.tagline}
          </p>
        </div>

        {/* Progress */}
        <div className={`flex flex-col items-center gap-3 w-56 transition-all duration-500 ${phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
          <div className="flex items-center gap-2">
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: GRN, animation: 'sp-dot-ping 1.3s ease-in-out infinite' }} />
            <span style={{ fontSize: '0.6rem', fontWeight: 500, color: 'rgba(255,255,255,0.38)', letterSpacing: '0.02em' }}>{G.steps[msgIdx]}</span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 2, background: 'rgba(255,255,255,0.07)' }}>
            <div className="h-full rounded-full transition-all duration-200" style={{ width: `${progress}%`, background: GRN, boxShadow: '0 0 8px rgba(6,224,0,0.6)' }} />
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {G.chips.map(chip => (
              <span key={chip} style={{ fontSize: '0.6rem', fontWeight: 500, color: 'rgba(255,255,255,0.30)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '99px', padding: '0.18rem 0.55rem' }}>
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* Language toggle */}
        <div className={`flex items-center gap-1 transition-all duration-500 ${phase >= 3 ? 'opacity-100' : 'opacity-0'}`}>
          {(['ID', 'EN'] as const).map(l => (
            <button key={l} onClick={() => { setLang(l as Language); localStorage.setItem('SUREPATH_LANG', l); }}
              style={{ fontFamily: "'Sora',sans-serif", fontSize: '0.62rem', fontWeight: lang === l ? 600 : 400, color: lang === l ? GRN : 'rgba(255,255,255,0.25)', padding: '0.2rem 0.65rem', borderRadius: '99px', cursor: 'pointer', background: lang === l ? 'rgba(6,224,0,0.08)' : 'transparent', border: `1px solid ${lang === l ? 'rgba(6,224,0,0.20)' : 'transparent'}`, transition: 'all 0.2s' }}>
              {l}
            </button>
          ))}
        </div>

      </div>

      {/* Footer — matching login page */}
      <div className="absolute bottom-8" style={{ fontSize: '0.5rem', fontWeight: 500, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.3em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(6,224,0,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        SurePath · Secure Connection
      </div>
    </div>
  );
};

// ─── Welcome-back screen (shown after login, auto-advances) ───────────────────
const AppEntryScreen = ({ name, onDone, lang }: { name: string; onDone: () => void; lang: Language }) => {
  const [visible, setVisible] = useState(false);
  const [fade, setFade]       = useState(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    ensureSPKeyframes();
    const t0 = setTimeout(() => setVisible(true), 60);
    const t1 = setTimeout(() => setFade(true), 1800);
    const t2 = setTimeout(() => onDoneRef.current(), 2300);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const G   = COPY[lang];
  const GRN = '#06e000';

  return (
    <div
      className={`fixed inset-0 z-[4999] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${fade ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ background: '#060a09', fontFamily: "'Sora', sans-serif" }}
    >
      {/* Radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div style={{ width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,224,0,0.10) 0%, transparent 68%)', opacity: visible ? 1 : 0, transition: 'opacity 1s' }} />
      </div>

      <div className={`relative z-10 text-center transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
        {/* Animated shield */}
        <div className="relative mx-auto mb-7" style={{ width: 120, height: 120 }}>
          <div className="absolute inset-0 rounded-[2.5rem] blur-2xl" style={{ background: GRN, opacity: 0.14 }} />
          <div className="relative w-full h-full rounded-[2.5rem] flex items-center justify-center border"
            style={{ background: 'rgba(6,224,0,0.05)', borderColor: 'rgba(6,224,0,0.18)', boxShadow: '0 0 60px rgba(6,224,0,0.10)' }}>
            <svg width="54" height="54" viewBox="0 0 54 54" fill="none" style={{ animation: 'sp-check-glow 2.5s ease-in-out infinite' }}>
              <path d="M27 4L43 11.5V26C43 36.2 36 44.6 27 48C18 44.6 11 36.2 11 26V11.5L27 4Z"
                fill="rgba(6,224,0,0.12)" stroke={GRN} strokeWidth="1.5" />
              <path d="M19 27L23.5 31.5L35 20"
                stroke={GRN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ strokeDasharray: 32, strokeDashoffset: visible ? 0 : 32, transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1) 0.35s' }} />
            </svg>
          </div>
        </div>

        <p style={{ fontSize: '0.75rem', fontWeight: 500, color: GRN, marginBottom: '0.4rem', letterSpacing: '0.02em' }}>
          {G.welcome},
        </p>
        <h2 style={{ fontSize: 'clamp(2rem,7vw,2.8rem)', fontWeight: 700, letterSpacing: '-0.03em', color: '#fff', lineHeight: 1, marginBottom: '1.2rem' }}>
          {name} 👋
        </h2>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border"
          style={{ borderColor: 'rgba(6,224,0,0.22)', background: 'rgba(6,224,0,0.07)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: GRN, animation: 'sp-dot-ping 1.3s ease-in-out infinite' }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 500, color: GRN }}>{G.verified}</span>
        </div>
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
    tech: 'Health Assistant',
    desc: 'Asuransi kesehatan individu dengan asisten medis AI yang selalu siaga.'
  }
];

const SESSION_KEY = 'SUREPATH_SESSION';


const App = () => {
  const [isLoaded, setIsLoaded]       = useState(() => sessionStorage.getItem('sp_splash_done') === '1');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [darkMode, setDarkMode]       = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
  );
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

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setDarkMode(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
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
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(enrichedUser));
      setAppMode(true);
    }, 1400);
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
        const [byId, byEmail] = await Promise.allSettled([
          getAgentProfile(u.id),
          getAgentByEmail(u.email!),
        ]);
        const profile =
          (byId.status === 'fulfilled' ? byId.value : null) ??
          (byEmail.status === 'fulfilled' ? byEmail.value : null);
        setOauthLoading(false);
        const userObj = profile
          ? {
              id:         profile.id,
              name:       profile.name,
              email:      profile.email,
              role:       profile.role as UserRole,
              supabaseId: profile.id,
              nodeId:     profile.agent_code ?? `SP-${u.id.slice(0, 8).toUpperCase()}`,
              trustScore: profile.trust_score ?? 85,
            }
          : {
              id:         u.id,
              name:       u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email!.split('@')[0],
              email:      u.email!,
              role:       UserRole.CUSTOMER,
              supabaseId: u.id,
              nodeId:     `SP-${u.id.slice(0, 8).toUpperCase()}`,
              trustScore: 85,
            };
        handleAuthSuccess(userObj);
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
      });

      return () => subscription.unsubscribe();
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

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut().catch(() => {});
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setAppMode(false);
  }, []);

  if (!isLoaded) return <SplashScreen onFinish={() => { sessionStorage.setItem('sp_splash_done', '1'); setIsLoaded(true); }} lang={lang} setLang={handleSetLang} />;
  if (oauthLoading && !currentUser) return <PortalLoader />;
  if (entryUser) return <AppEntryScreen name={entryUser.name} onDone={() => setEntryUser(null)} lang={lang} />;

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
          onBack={() => navigate('/')}
          onSignIn={() => { navigate('/'); setAppMode(true); }}
        />
      </Suspense>
    );
  }

  const STATIC_PAGES = ['about', 'careers', 'blog', 'agents', 'partnership', 'privacy', 'terms', 'security', 'cookie'];
  const staticPageId = STATIC_PAGES.find(p => pathname === `/${p}`);
  if (staticPageId) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <StaticInfoPage
          pageId={staticPageId}
          onBack={() => navigate('/')}
          onSignIn={() => { navigate('/'); setAppMode(true); }}
        />
      </Suspense>
    );
  }

  const ADMIN_ROLES = [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.FINANCE_MANAGER, UserRole.FINANCE_DIRECTOR, UserRole.INSURANCE_ADMIN];

  // Dedicated /admin login page
  if ((pathname === '/admin' || pathname.startsWith('/admin/')) && !currentUser) {
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
      <Suspense fallback={<PortalLoader />}>
        <AdminPortal
          onLogout={handleLogout}
          products={products}
          setProducts={setProducts}
          userRole={currentUser.role}
          currentUser={currentUser}
        />
      </Suspense>
    );
  }

  if (currentUser && currentUser.role === UserRole.AGENT) {
    const agentWithSupabaseId = currentUser.supabaseId
      ? { ...currentUser, id: currentUser.supabaseId, agent_code: currentUser.nodeId }
      : { ...currentUser, agent_code: currentUser.nodeId };
    return (
      <Suspense fallback={<PortalLoader />}>
        <AgentPortal agent={agentWithSupabaseId} onLogout={handleLogout} lang={lang} />
      </Suspense>
    );
  }

  if (currentUser && currentUser.role === UserRole.B2B_CLIENT) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <B2BPortal client={currentUser} onLogout={handleLogout} lang={lang} />
      </Suspense>
    );
  }

  if (currentUser) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <CustomerPortal
          currentUser={currentUser}
          onLogout={handleLogout}
          lang={lang}
          products={products}
        />
      </Suspense>
    );
  }

  if (!appMode) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <Suspense fallback={<PortalLoader />}>
          <PlatformLanding
            onSignIn={() => setAppMode(true)}
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
