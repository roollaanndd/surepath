import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Car, Plane, ShieldAlert, Package, Heart } from 'lucide-react';
import { SurePathLogo } from './components/Navbar';
import { Language, UserRole } from './types';
import { db, seedDatabase } from './db';
import { supabase, getAgentByEmail } from './services/supabaseService';
import { SpiralAnimation } from './components/ui/spiral-animation';
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
const ProductInfoPage   = lazy(() => import('./src/pages/ProductInfoPage'));
const StaticInfoPage    = lazy(() => import('./src/pages/StaticInfoPage'));

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

const SplashCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let w = 0, h = 0;

    const blobs = [
      { x: 0.75, y: 0.22, r: 400, color: '#06e000', phase: 0 },
      { x: 0.22, y: 0.72, r: 320, color: '#22c55e', phase: 2.1 },
      { x: 0.55, y: 0.48, r: 240, color: '#4ade80', phase: 4.2 },
    ];

    const resize = () => {
      w = canvas.width  = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      blobs.forEach(b => {
        const cx = (b.x + Math.sin(t * 0.33 + b.phase) * 0.12) * w;
        const cy = (b.y + Math.cos(t * 0.28 + b.phase) * 0.09) * h;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r);
        grad.addColorStop(0, b.color + '16');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, b.r, 0, Math.PI * 2);
        ctx.fill();
      });
      t += 0.009;
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(rafRef.current); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
};

const WelcomeScreen = ({ onFinish, lang, setLang }: { onFinish: () => void; lang: Language; setLang: (l: Language) => void }) => {
  const [phase, setPhase]       = useState(0);
  const [progress, setProgress] = useState(0);
  const [msgIdx, setMsgIdx]     = useState(0);
  const onFinishRef = useRef(onFinish);
  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);

  useEffect(() => {
    const t0 = setTimeout(() => setPhase(1), 80);
    const t1 = setTimeout(() => setPhase(2), 500);
    const t2 = setTimeout(() => setPhase(3), 820);
    const progInt = setInterval(() => setProgress(p => Math.min(p + 1.8, 100)), 18);
    const msgInt  = setInterval(() => setMsgIdx(i => Math.min(i + 1, COPY[lang].steps.length - 1)), 400);
    const t3 = setTimeout(() => setPhase(4), 2200);
    const t4 = setTimeout(() => onFinishRef.current(), 2750);
    return () => { [t0,t1,t2,t3,t4].forEach(clearTimeout); clearInterval(progInt); clearInterval(msgInt); };
  }, [lang]);

  const G = COPY[lang];
  const lpGreen = 'hsl(119, 99%, 46%)';
  const sora = "'Sora', sans-serif";

  return (
    <div
      className={`fixed inset-0 z-[5000] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-700 ${phase >= 4 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ background: 'hsl(0, 0%, 8%)' }}
    >
      <SplashCanvas />
      <div className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative z-10 flex flex-col items-center gap-8">

        {/* Logo with pulsing rings */}
        <div className={`relative flex items-center justify-center ${phase >= 1 ? 'sp-logo-in' : 'opacity-0'}`}>
          {/* rings — sit behind the tile */}
          {phase >= 1 && [0, 1, 2].map(i => (
            <div key={i} className="sp-ring absolute w-48 h-48 rounded-[3.5rem] border"
              style={{ borderColor: 'rgba(6,224,0,0.28)', animationDelay: `${i * 1}s` }} />
          ))}
          {/* ambient glow */}
          <div className="absolute -inset-10 rounded-[4rem] blur-3xl opacity-15" style={{ background: lpGreen }} />
          {/* tile */}
          <div className="relative w-48 h-48 rounded-[3.5rem] flex items-center justify-center border"
            style={{
              background: 'rgba(6,224,0,0.05)',
              borderColor: 'rgba(6,224,0,0.20)',
              boxShadow: '0 0 80px rgba(6,224,0,0.10), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}>
            <SurePathLogo className="w-32 h-32" />
          </div>
        </div>

        {/* Wordmark + tagline */}
        <div className={`text-center transition-all duration-600 ${phase >= 2 ? 'sp-word-in' : 'opacity-0'}`}>
          <h1 style={{ fontFamily: sora, fontSize: 'clamp(2.8rem,9vw,4rem)', fontWeight: 700, letterSpacing: '-0.04em', color: '#fff', lineHeight: 1 }}>
            Sure<span style={{ color: lpGreen }}>Path</span>
          </h1>
          <p style={{ fontFamily: sora, fontSize: '0.95rem', fontWeight: 400, color: 'rgba(255,255,255,0.45)', marginTop: '0.6rem', letterSpacing: '-0.01em' }}>
            {G.tagline}
          </p>
        </div>

        {/* Progress + chips */}
        <div className={`flex flex-col items-center gap-4 w-60 transition-all duration-500 ${phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
          {/* step message */}
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: lpGreen }} />
            <span style={{ fontFamily: sora, fontSize: '0.65rem', fontWeight: 500, color: 'rgba(255,255,255,0.40)', letterSpacing: '0.02em' }}>
              {G.steps[msgIdx]}
            </span>
          </div>
          {/* bar */}
          <div className="w-full h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all duration-200"
              style={{ width: `${progress}%`, background: lpGreen, boxShadow: `0 0 10px ${lpGreen}88` }} />
          </div>
          {/* value chips */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {G.chips.map(chip => (
              <span key={chip} style={{
                fontFamily: sora, fontSize: '0.62rem', fontWeight: 500,
                color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '99px',
                padding: '0.2rem 0.6rem',
              }}>
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* Language toggle */}
        <div className={`flex items-center gap-1 transition-all duration-500 ${phase >= 3 ? 'opacity-100' : 'opacity-0'}`}>
          {(['ID', 'EN'] as const).map(l => (
            <button key={l}
              onClick={() => { setLang(l as Language); localStorage.setItem('SUREPATH_LANG', l); }}
              style={{
                fontFamily: sora, fontSize: '0.65rem', fontWeight: lang === l ? 600 : 400,
                color: lang === l ? lpGreen : 'rgba(255,255,255,0.28)',
                padding: '0.2rem 0.65rem', borderRadius: '99px', cursor: 'pointer',
                background: lang === l ? 'rgba(6,224,0,0.10)' : 'transparent',
                border: `1px solid ${lang === l ? 'rgba(6,224,0,0.22)' : 'transparent'}`,
                transition: 'all 0.2s',
              }}>
              {l}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};

const AppEntryScreen = ({ name, onDone, lang }: { name: string; onDone: () => void; lang: Language }) => {
  const [visible, setVisible] = useState(false);
  const [fade, setFade]       = useState(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    const t0 = setTimeout(() => setVisible(true), 60);
    const t1 = setTimeout(() => setFade(true), 1000);
    const t2 = setTimeout(() => onDoneRef.current(), 1500);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const G = COPY[lang];
  const lpGreen = 'hsl(119, 99%, 46%)';
  const sora = "'Sora', sans-serif";

  return (
    <div
      className={`fixed inset-0 z-[4999] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${fade ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ background: 'hsl(0, 0%, 8%)' }}
    >
      <div className="absolute top-[-20%] right-[-10%] w-[480px] h-[480px] rounded-full blur-[130px] opacity-10" style={{ background: lpGreen }} />
      <div className="absolute bottom-[-20%] left-[-10%] w-[380px] h-[380px] rounded-full blur-[110px] opacity-[0.07]" style={{ background: '#22c55e' }} />
      <div className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className={`relative z-10 text-center transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-90'}`}>
        <div className="relative mx-auto w-36 h-36 mb-8">
          <div className="absolute -inset-6 rounded-[3rem] blur-2xl opacity-18" style={{ background: lpGreen }} />
          <div className="relative w-36 h-36 rounded-[3rem] flex items-center justify-center border"
            style={{ background: 'rgba(6,224,0,0.05)', borderColor: 'rgba(6,224,0,0.18)', boxShadow: '0 0 60px rgba(6,224,0,0.08)' }}>
            <SurePathLogo className="w-24 h-24" />
          </div>
        </div>

        <p style={{ fontFamily: sora, fontSize: '0.75rem', fontWeight: 500, color: lpGreen, marginBottom: '0.4rem' }}>
          {G.welcome},
        </p>
        <h2 style={{ fontFamily: sora, fontSize: 'clamp(2rem,7vw,2.8rem)', fontWeight: 700, letterSpacing: '-0.03em', color: '#fff', lineHeight: 1, marginBottom: '1rem' }}>
          {name} 👋
        </h2>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border"
          style={{ borderColor: 'rgba(6,224,0,0.20)', background: 'rgba(6,224,0,0.06)' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: lpGreen }} />
          <span style={{ fontFamily: sora, fontSize: '0.7rem', fontWeight: 500, color: lpGreen }}>
            {G.verified}
          </span>
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

const SpiralScreen = ({ onEnter }: { onEnter: () => void }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 2000); return () => clearTimeout(t); }, []);
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-black">
      <div className="absolute inset-0">
        <SpiralAnimation />
      </div>
      <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-[1500ms] ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <button
          onClick={onEnter}
          className="text-white text-2xl tracking-[0.2em] uppercase font-extralight transition-all duration-700 hover:tracking-[0.3em] animate-pulse"
        >
          Mulai
        </button>
      </div>
    </div>
  );
};

const App = () => {
  const [isLoaded, setIsLoaded]       = useState(false);
  const [spiralDone, setSpiralDone]   = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [darkMode, setDarkMode]       = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
  );
  const [appMode, setAppMode]         = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone || false
      : false
  );
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

  useEffect(() => {
    injectVercelAnalytics({ mode: 'auto' });
    seedDatabase().catch(console.error);
    const saved = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const user = JSON.parse(saved);
        setCurrentUser(user);
        setAppMode(true);
      } catch {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

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

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut().catch(() => {});
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setAppMode(false);
  }, []);

  if (!isLoaded) return <WelcomeScreen onFinish={() => setIsLoaded(true)} lang={lang} setLang={handleSetLang} />;
  if (!spiralDone) return <SpiralScreen onEnter={() => setSpiralDone(true)} />;
  if (entryUser) return <AppEntryScreen name={entryUser.name} onDone={() => setEntryUser(null)} lang={lang} />;

  const pathname = currentPath;

  if (pathname === '/payment/success' || pathname === '/payment/failed') {
    return (
      <Suspense fallback={<PortalLoader />}>
        <PaymentRedirect status={pathname === '/payment/success' ? 'success' : 'failed'} />
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

  const ADMIN_ROLES = [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.INSURANCE_ADMIN];

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
