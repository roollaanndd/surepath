import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Car, Plane, ShieldAlert, Package, Heart } from 'lucide-react';
import { SurePathLogo } from './components/Navbar';
import { Language, UserRole } from './types';
import { db, seedDatabase } from './db';
import { supabase, getAgentByEmail } from './services/supabaseService';

// Lazy-load heavy portal chunks — each is only downloaded when the user's role needs it
const AuthGate          = lazy(() => import('./components/AuthGate'));
const AdminPortal       = lazy(() => import('./components/admin/AdminPortal'));
const AgentPortal       = lazy(() => import('./components/agent/AgentPortal'));
const CustomerPortal    = lazy(() => import('./components/customer/CustomerPortal'));
const PlatformLanding   = lazy(() => import('./src/pages/PlatformLanding'));
const PaymentRedirect   = lazy(() => import('./components/PaymentRedirect'));
const InsuranceReviewPage = lazy(() => import('./components/InsuranceReviewPage'));
const ProductInfoPage   = lazy(() => import('./src/pages/ProductInfoPage'));
const StaticInfoPage    = lazy(() => import('./src/pages/StaticInfoPage'));

const PortalLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'hsl(0, 0%, 8%)' }}>
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: 'rgba(6, 224, 0, 0.15)', borderTopColor: 'hsl(119, 99%, 46%)' }} />
      <p style={{ fontFamily: "'Sora', sans-serif", fontSize: '0.55rem', fontWeight: 500, letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
        Memuat…
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

const SPLASH_MESSAGES = [
  'Menyiapkan Sistem…',
  'Memuat Data Proteksi…',
  'Mengecek Penawaran Terbaik…',
  'Koneksi Aman…',
  'Selesai!',
];

const WelcomeScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);

  const onFinishRef = useRef(onFinish);
  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);

  useEffect(() => {
    const t0 = setTimeout(() => setPhase(1), 80);
    const t1 = setTimeout(() => setPhase(2), 480);
    const t2 = setTimeout(() => setPhase(3), 800);

    const progInt  = setInterval(() => setProgress(p => Math.min(p + 2, 100)), 18);
    const msgInt   = setInterval(() => setMsgIdx(i => Math.min(i + 1, SPLASH_MESSAGES.length - 1)), 380);
    const t3 = setTimeout(() => setPhase(4), 2000);
    const t4 = setTimeout(() => onFinishRef.current(), 2500);

    return () => {
      [t0,t1,t2,t3,t4].forEach(clearTimeout);
      clearInterval(progInt);
      clearInterval(msgInt);
    };
  }, []);

  const logoVisible  = phase >= 1;
  const textVisible  = phase >= 2;
  const barVisible   = phase >= 3;
  const fadingOut    = phase >= 4;

  const lpGreen = 'hsl(119, 99%, 46%)';

  return (
    <div
      className={`fixed inset-0 z-[5000] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-700 ${fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ background: 'hsl(0, 0%, 8%)' }}
    >
      <SplashCanvas />

      {/* subtle dot grid */}
      <div className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative z-10 flex flex-col items-center gap-9">
        {/* Logo — large & prominent */}
        <div
          className={`flex flex-col items-center transition-all duration-700 ease-out ${logoVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-90'}`}
        >
          <div className="relative">
            {/* outer ambient glow */}
            <div className="absolute -inset-8 rounded-[3.5rem] blur-3xl opacity-20"
              style={{ background: lpGreen }} />
            {/* logo tile */}
            <div
              className="relative w-48 h-48 rounded-[3.5rem] flex items-center justify-center border"
              style={{
                background: 'rgba(6, 224, 0, 0.05)',
                borderColor: 'rgba(6, 224, 0, 0.18)',
                boxShadow: '0 0 80px rgba(6, 224, 0, 0.10), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              <SurePathLogo className="w-32 h-32" />
            </div>
          </div>
        </div>

        {/* Wordmark */}
        <div
          className={`text-center transition-all duration-600 ease-out ${textVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <h1 style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 'clamp(2.8rem, 9vw, 4rem)',
            fontWeight: 700,
            letterSpacing: '-0.04em',
            color: '#ffffff',
            lineHeight: 1,
          }}>
            Sure<span style={{ color: lpGreen }}>Path</span>
          </h1>
          <p style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: '0.58rem',
            fontWeight: 500,
            letterSpacing: '0.45em',
            color: 'rgba(255,255,255,0.30)',
            textTransform: 'uppercase',
            marginTop: '0.85rem',
          }}>
            Asuransi Pintar · OJK Licensed
          </p>
        </div>

        {/* Progress */}
        <div
          className={`flex flex-col items-center gap-3 w-52 transition-all duration-500 ${barVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: lpGreen }} />
            <span style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: '0.56rem',
              fontWeight: 500,
              letterSpacing: '0.32em',
              color: 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase',
            }}>
              {SPLASH_MESSAGES[msgIdx]}
            </span>
          </div>
          <div className="w-full h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${progress}%`,
                background: lpGreen,
                boxShadow: `0 0 10px ${lpGreen}99`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const AppEntryScreen = ({ name, onDone }: { name: string; onDone: () => void }) => {
  const [visible, setVisible] = useState(false);
  const [fade, setFade]       = useState(false);

  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    const t0 = setTimeout(() => setVisible(true), 60);
    const t1 = setTimeout(() => setFade(true), 950);
    const t2 = setTimeout(() => onDoneRef.current(), 1450);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const lpGreen = 'hsl(119, 99%, 46%)';

  return (
    <div
      className={`fixed inset-0 z-[4999] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${fade ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ background: 'hsl(0, 0%, 8%)' }}
    >
      {/* ambient glows */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[130px] opacity-10"
        style={{ background: lpGreen }} />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[110px] opacity-08"
        style={{ background: '#22c55e' }} />
      <div className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* card */}
      <div
        className={`relative z-10 text-center transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-90'}`}
      >
        {/* logo */}
        <div className="relative mx-auto w-32 h-32 mb-8">
          <div className="absolute -inset-4 rounded-[2.5rem] blur-2xl opacity-20"
            style={{ background: lpGreen }} />
          <div
            className="relative w-32 h-32 rounded-[2.5rem] flex items-center justify-center border"
            style={{
              background: 'rgba(6, 224, 0, 0.05)',
              borderColor: 'rgba(6, 224, 0, 0.18)',
              boxShadow: '0 0 60px rgba(6, 224, 0, 0.08)',
            }}
          >
            <SurePathLogo className="w-20 h-20" />
          </div>
        </div>

        <p style={{ fontFamily: "'Sora', sans-serif", fontSize: '0.5rem', fontWeight: 600, letterSpacing: '0.55em', color: lpGreen, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          Selamat Datang
        </p>
        <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 'clamp(1.8rem, 6vw, 2.4rem)', fontWeight: 700, letterSpacing: '-0.03em', color: '#ffffff', lineHeight: 1, marginBottom: '0.5rem' }}>
          {name}
        </h2>

        {/* verified badge */}
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border mt-4"
          style={{ borderColor: 'rgba(6, 224, 0, 0.20)', background: 'rgba(6, 224, 0, 0.06)' }}>
          <div className="w-1 h-1 rounded-full" style={{ background: lpGreen }} />
          <span style={{ fontFamily: "'Sora', sans-serif", fontSize: '0.48rem', fontWeight: 500, letterSpacing: '0.45em', color: lpGreen, textTransform: 'uppercase' }}>
            Akun Terverifikasi · OJK Licensed
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

const App = () => {
  const [isLoaded, setIsLoaded]       = useState(false);
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
  const [lang, setLang]           = useState<Language>(Language.ID);
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

  if (!isLoaded) return <WelcomeScreen onFinish={() => setIsLoaded(true)} />;
  if (entryUser) return <AppEntryScreen name={entryUser.name} onDone={() => setEntryUser(null)} />;

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
