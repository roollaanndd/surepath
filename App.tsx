import React, { useState, useEffect, useRef } from 'react';
import { Car, Plane, ShieldAlert, Package, Heart } from 'lucide-react';
import { SurePathLogo } from './components/Navbar';
import AuthGate from './components/AuthGate';
import AdminPortal from './components/admin/AdminPortal';
import { Language, UserRole } from './types';
import { db, seedDatabase } from './db';
import { supabase, getAgentByEmail } from './services/supabaseService';
import PlatformLanding from './src/pages/PlatformLanding';
import AgentPortal from './components/agent/AgentPortal';
import CustomerPortal from './components/customer/CustomerPortal';
import PaymentRedirect from './components/PaymentRedirect';
import InsuranceReviewPage from './components/InsuranceReviewPage';

const SplashCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let w = 0, h = 0;

    const blobs = [
      { x: 0.8, y: 0.2, r: 320, hue: '#f97316', vx: 0.15, vy: 0.10, phase: 0 },
      { x: 0.2, y: 0.7, r: 280, hue: '#10b981', vx: -0.12, vy: 0.08, phase: 1.5 },
      { x: 0.5, y: 0.5, r: 200, hue: '#0ea5e9', vx: 0.08, vy: -0.12, phase: 3 },
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
        const cx = (b.x + Math.sin(t * 0.4 + b.phase) * 0.15) * w;
        const cy = (b.y + Math.cos(t * 0.35 + b.phase) * 0.12) * h;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r);
        grad.addColorStop(0, b.hue + '22');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, b.r, 0, Math.PI * 2);
        ctx.fill();
      });
      t += 0.012;
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

  return (
    <div
      className={`fixed inset-0 z-[5000] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ background: '#060818' }}
    >
      <SplashCanvas />

      {/* dot-grid overlay */}
      <div className="absolute inset-0 opacity-[0.035]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />

      <div className="relative z-10 flex flex-col items-center gap-10">
        {/* Logo */}
        <div
          className={`flex flex-col items-center gap-5 transition-all duration-700 ease-out ${logoVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-90'}`}
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-[2.5rem] blur-2xl opacity-40"
              style={{ background: 'radial-gradient(circle, #f97316 0%, #10b981 100%)' }} />
            <div
              className="relative w-28 h-28 rounded-[2.5rem] flex items-center justify-center shadow-2xl backdrop-blur-sm border"
              style={{ background: 'rgba(249,115,22,0.08)', borderColor: 'rgba(249,115,22,0.35)' }}
            >
              <SurePathLogo className="w-16 h-16" />
            </div>
          </div>
        </div>

        {/* Wordmark */}
        <div
          className={`text-center transition-all duration-600 ease-out ${textVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: textVisible ? '0ms' : '0ms' }}
        >
          <h1 className="text-[3.2rem] font-black tracking-[-0.06em] text-white uppercase leading-none">
            SURE<span style={{ color: '#f97316' }}>PATH</span>
          </h1>
          <p className="text-[0.55rem] font-bold uppercase tracking-[0.55em] mt-3" style={{ color: '#374151' }}>
            Asuransi Pintar · OJK Licensed
          </p>
        </div>

        {/* Progress section */}
        <div
          className={`flex flex-col items-center gap-3 w-64 transition-all duration-500 ${barVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: '#10b981' }} />
            <span className="text-[0.6rem] font-black uppercase tracking-[0.35em] transition-all duration-300" style={{ color: '#4b5563' }}>
              {SPLASH_MESSAGES[msgIdx]}
            </span>
          </div>
          <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #10b981, #f97316)',
                boxShadow: '0 0 14px rgba(249,115,22,0.55)',
              }}
            />
          </div>
          <p className="text-[0.42rem] font-bold uppercase tracking-[0.5em]" style={{ color: '#1f2937' }}>
            Powered by Supabase · Xendit · Gemini AI
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

const App = () => {
  const [isLoaded, setIsLoaded]   = useState(false);
  const [, setIsMobile]           = useState(window.innerWidth < 1024);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [darkMode, setDarkMode]   = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
  );
  const [appMode, setAppMode]     = useState(() =>
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
      } catch (_) {}
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
    const saved = localStorage.getItem('SUREPATH_SESSION');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        setCurrentUser(user);
        setAppMode(true);
      } catch (_) { localStorage.removeItem('SUREPATH_SESSION'); }
    }
  }, []);

  const handleAuthSuccess = async (user: any) => {
    let enrichedUser = user;
    if (user.role === UserRole.AGENT && !user.supabaseId) {
      const spUser = await getAgentByEmail(user.email).catch(() => null);
      if (spUser) enrichedUser = { ...user, supabaseId: spUser.id, agent_code: spUser.agent_code };
    }
    setEntryUser({ name: enrichedUser.name?.split(' ')[0] || 'Pengguna' });
    setTimeout(() => {
      setCurrentUser(enrichedUser);
      localStorage.setItem('SUREPATH_SESSION', JSON.stringify(enrichedUser));
      setAppMode(true);
    }, 1400);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    setCurrentUser(null);
    localStorage.removeItem('SUREPATH_SESSION');
    setAppMode(false);
  };

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  if (!isLoaded) return <WelcomeScreen onFinish={() => setIsLoaded(true)} />;
  if (entryUser) return <AppEntryScreen name={entryUser.name} onDone={() => setEntryUser(null)} />;

  const { pathname } = window.location;
  if (pathname === '/payment/success') return <PaymentRedirect status="success" />;
  if (pathname === '/payment/failed')  return <PaymentRedirect status="failed" />;

  const reviewMatch = pathname.match(/^\/review\/([0-9a-f-]{36})$/i);
  if (reviewMatch) return <InsuranceReviewPage token={reviewMatch[1]} />;

  if (currentUser && [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.INSURANCE_ADMIN].includes(currentUser.role)) {
    return (
      <AdminPortal
        onLogout={handleLogout}
        products={products}
        setProducts={setProducts}
        userRole={currentUser.role}
        currentUser={currentUser}
      />
    );
  }

  if (currentUser && currentUser.role === UserRole.AGENT) {
    const agentWithSupabaseId = currentUser.supabaseId
      ? { ...currentUser, id: currentUser.supabaseId, agent_code: currentUser.nodeId }
      : { ...currentUser, agent_code: currentUser.nodeId };
    return <AgentPortal agent={agentWithSupabaseId} onLogout={handleLogout} lang={lang} />;
  }

  if (currentUser) {
    return (
      <CustomerPortal
        currentUser={currentUser}
        onLogout={handleLogout}
        lang={lang}
        products={products}
      />
    );
  }

  if (!appMode) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <PlatformLanding
          onSignIn={() => setAppMode(true)}
          lang={lang}
          setLang={setLang}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      </div>
    );
  }

  return <AuthGate onAuthSuccess={handleAuthSuccess} initialLang={lang} />;
};

export default App;
