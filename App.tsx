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

const PortalLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#060818' }}>
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: 'rgba(249,115,22,0.3)', borderTopColor: '#f97316' }} />
      <p className="text-[0.55rem] font-black uppercase tracking-[0.4em]" style={{ color: '#4b5563' }}>
        Memuat…
      </p>
    </div>
  </div>
);

const SPLASH_MESSAGES = [
  'Menyiapkan Sistem…',
  'Memuat Data Proteksi…',
  'Mengecek Penawaran Terbaik…',
  'Koneksi Aman…',
  'Selesai!',
];

const WelcomeScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [phase, setPhase]       = useState(0);
  const [progress, setProgress] = useState(0);
  const [msgIdx, setMsgIdx]     = useState(0);
  const [splashCfg, setSplashCfg] = useState<{logoUrl:string; tagline:string; accent:string}>({
    logoUrl: '/logo.png', tagline: 'Your Path to Protection.', accent: '#22c55e',
  });
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const onFinishRef = useRef(onFinish);
  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);

  // Load splash config from Dexie
  useEffect(() => {
    import('./db').then(({ db }) => {
      db.websiteConfig.where('sectionKey').equals('splash').first().then(cfg => {
        if (cfg) setSplashCfg({
          logoUrl:  cfg.ctaText  || '/logo.png',
          tagline:  cfg.headline || 'Your Path to Protection.',
          accent:   cfg.bgValue  || '#22c55e',
        });
      }).catch(() => {});
    });
  }, []);

  // Animated green particles on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const particles: {x:number;y:number;r:number;vx:number;vy:number;alpha:number;phase:number}[] = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 18; i++) {
      particles.push({
        x: Math.random(), y: Math.random(),
        r: 60 + Math.random() * 140,
        vx: (Math.random() - 0.5) * 0.0003,
        vy: (Math.random() - 0.5) * 0.0002,
        alpha: 0.04 + Math.random() * 0.08,
        phase: Math.random() * Math.PI * 2,
      });
    }
    let t = 0, raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < -0.1) p.x = 1.1;
        if (p.x > 1.1)  p.x = -0.1;
        if (p.y < -0.1) p.y = 1.1;
        if (p.y > 1.1)  p.y = -0.1;
        const cx = p.x * canvas.width;
        const cy = p.y * canvas.height;
        const pulse = 0.7 + 0.3 * Math.sin(t * 0.02 + p.phase);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, p.r * pulse);
        g.addColorStop(0, `rgba(34,197,94,${p.alpha})`);
        g.addColorStop(0.5, `rgba(22,163,74,${p.alpha * 0.4})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, p.r * pulse, 0, Math.PI * 2); ctx.fill();
      });
      t++; raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  useEffect(() => {
    const t0 = setTimeout(() => setPhase(1), 100);
    const t1 = setTimeout(() => setPhase(2), 600);
    const t2 = setTimeout(() => setPhase(3), 900);
    const progInt = setInterval(() => setProgress(p => Math.min(p + 1.4, 100)), 18);
    const msgInt  = setInterval(() => setMsgIdx(i => Math.min(i + 1, SPLASH_MESSAGES.length - 1)), 420);
    const t3 = setTimeout(() => setPhase(4), 2300);
    const t4 = setTimeout(() => onFinishRef.current(), 2800);
    return () => { [t0,t1,t2,t3,t4].forEach(clearTimeout); clearInterval(progInt); clearInterval(msgInt); };
  }, []);

  const logoIn  = phase >= 1;
  const textIn  = phase >= 2;
  const barIn   = phase >= 3;
  const fadeOut = phase >= 4;

  return (
    <div
      className={`fixed inset-0 z-[5000] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-600 ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ background: '#040C06' }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* subtle grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(74,222,128,0.8) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative z-10 flex flex-col items-center gap-8 px-8">

        {/* Logo */}
        <div className={`transition-all duration-800 ease-out ${logoIn ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-6'}`}>
          <div className="relative">
            <div className={`absolute inset-[-20px] rounded-full blur-3xl transition-opacity duration-1000 ${logoIn ? 'opacity-60' : 'opacity-0'}`}
              style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.35) 0%, transparent 70%)' }} />
            <img
              src={splashCfg.logoUrl}
              alt="SurePath"
              className="relative h-28 w-auto object-contain drop-shadow-2xl"
              style={{ filter: 'drop-shadow(0 0 24px rgba(34,197,94,0.5))' }}
              onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
            />
          </div>
        </div>

        {/* Wordmark + tagline */}
        <div className={`text-center transition-all duration-600 delay-100 ease-out ${textIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-[2.8rem] font-black tracking-[-0.05em] text-white uppercase leading-none">
            Sure<span style={{ color: splashCfg.accent }}>Path</span>
          </h1>
          <p className="text-[0.65rem] font-semibold mt-2 tracking-[0.3em] uppercase"
            style={{ color: 'rgba(134,239,172,0.7)' }}>
            {splashCfg.tagline}
          </p>
        </div>

        {/* Progress */}
        <div className={`flex flex-col items-center gap-3 w-56 transition-all duration-500 delay-200 ${barIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: splashCfg.accent }} />
            <span className="text-[0.55rem] font-bold uppercase tracking-[0.3em] transition-all duration-300"
              style={{ color: 'rgba(134,239,172,0.5)' }}>
              {SPLASH_MESSAGES[msgIdx]}
            </span>
          </div>
          <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${splashCfg.accent}, #4ade80)`,
                boxShadow: `0 0 12px ${splashCfg.accent}80`,
              }} />
          </div>
          <p className="text-[0.42rem] font-bold uppercase tracking-[0.45em]" style={{ color: 'rgba(255,255,255,0.12)' }}>
            OJK Licensed · Powered by Supabase & Gemini AI
          </p>
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

  return (
    <div
      className={`fixed inset-0 z-[4999] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${fade ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ background: '#060818' }}
    >
      {/* bg blobs */}
      <div className="absolute top-[-15%] right-[-10%] w-96 h-96 rounded-full blur-[110px] opacity-20 animate-pulse"
        style={{ background: '#f97316' }} />
      <div className="absolute bottom-[-15%] left-[-10%] w-80 h-80 rounded-full blur-[90px] opacity-15 animate-pulse"
        style={{ background: '#10b981', animationDelay: '0.8s' }} />
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* card */}
      <div
        className={`relative z-10 text-center transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-90'}`}
      >
        {/* ring glow */}
        <div className="relative mx-auto w-24 h-24 mb-6">
          <div className="absolute inset-0 rounded-[2rem] blur-xl opacity-50"
            style={{ background: 'radial-gradient(circle, #f97316 0%, #10b981 100%)' }} />
          <div
            className="relative w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl border"
            style={{ background: 'rgba(249,115,22,0.10)', borderColor: 'rgba(249,115,22,0.35)' }}
          >
            <SurePathLogo className="w-14 h-14" />
          </div>
        </div>

        <p className="text-[0.5rem] font-black uppercase tracking-[0.55em] mb-2" style={{ color: '#10b981' }}>
          Selamat Datang
        </p>
        <h2 className="text-[2.2rem] font-black tracking-tight text-white leading-none mb-2">{name}</h2>

        {/* verified badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border mt-3"
          style={{ borderColor: 'rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.08)' }}>
          <div className="w-1 h-1 rounded-full" style={{ background: '#10b981' }} />
          <span className="text-[0.48rem] font-black uppercase tracking-[0.5em]" style={{ color: '#10b981' }}>
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

  const { pathname } = window.location;

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

  // ── /admin route — show login directly, no landing page ──────────────────
  if (pathname === '/admin' && !currentUser) {
    return (
      <Suspense fallback={<PortalLoader />}>
        <AuthGate
          onAuthSuccess={(user) => {
            handleAuthSuccess(user);
            window.history.replaceState({}, '', '/');
          }}
          initialLang={lang}
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

  const SECTION_PATHS = ['products', 'how-it-works', 'claims', 'about', 'partners'];
  const sectionSlug = SECTION_PATHS.find(s => pathname === `/${s}`);

  if (sectionSlug && !currentUser) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <Suspense fallback={<PortalLoader />}>
          <PlatformLanding
            onSignIn={() => setAppMode(true)}
            lang={lang}
            setLang={setLang}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            initialSection={sectionSlug}
          />
        </Suspense>
      </div>
    );
  }

  if (!appMode) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <Suspense fallback={<PortalLoader />}>
          <PlatformLanding
            onSignIn={() => setAppMode(true)}
            lang={lang}
            setLang={setLang}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            initialSection={undefined}
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
