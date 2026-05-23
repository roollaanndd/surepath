import React, { useState, useEffect } from 'react';
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

const WelcomeScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [messageIdx, setMessageIdx] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  const messages = [
    "Menyiapkan Sistem...",
    "Memuat Data Proteksi...",
    "Mengecek Penawaran Terbaik...",
    "Koneksi Aman...",
    "Selesai!",
  ];

  useEffect(() => {
    const timer     = setInterval(() => setProgress(p => Math.min(p + 1.5, 100)), 15);
    const msgTimer  = setInterval(() => setMessageIdx(i => Math.min(i + 1, messages.length - 1)), 400);
    const fadeTimer = setTimeout(() => setFadeOut(true), 2000);
    const finish    = setTimeout(onFinish, 2500);
    return () => { clearInterval(timer); clearInterval(msgTimer); clearTimeout(fadeTimer); clearTimeout(finish); };
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[5000] bg-[#050505] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[130px] animate-pulse" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-orange-500/8 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)', backgroundSize: '50px 50px' }} />

      <div className="relative z-10 flex flex-col items-center gap-12">
        <div className="relative flex flex-col items-center gap-6">
          <div className="absolute w-40 h-40 rounded-full bg-emerald-500/15 blur-2xl animate-pulse" />
          <div className="relative w-28 h-28 bg-emerald-500/10 border border-emerald-500/30 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20 backdrop-blur-sm">
            <SurePathLogo className="w-16 h-16" />
          </div>
          <div className="text-center">
            <h1 className="text-5xl font-black tracking-[-0.05em] text-white uppercase leading-none">
              SURE<span className="text-emerald-500">PATH</span>
            </h1>
            <p className="text-[0.6rem] font-bold text-gray-600 uppercase tracking-[0.5em] mt-3">
              Asuransi Pintar untuk Semua
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 w-72">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <p className="text-[0.65rem] font-black text-gray-500 uppercase tracking-[0.35em] transition-all duration-500">
              {messages[messageIdx]}
            </p>
          </div>
          <div className="w-full h-[3px] bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, boxShadow: '0 0 12px rgba(16,185,129,0.6)' }}
            />
          </div>
        </div>
      </div>

      <div className="scanner-line" />
      <p className="absolute bottom-10 text-[0.45rem] font-bold text-gray-800 uppercase tracking-[0.5em]">
        Powered by Supabase · Xendit · Gemini AI
      </p>
    </div>
  );
};

const AppEntryScreen = ({ name, onDone }: { name: string; onDone: () => void }) => {
  const [fade, setFade] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 900);
    const t2 = setTimeout(onDone, 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);
  return (
    <div className={`fixed inset-0 z-[4999] bg-[#030712] flex flex-col items-center justify-center gap-8 transition-opacity duration-500 ${fade ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="absolute w-64 h-64 rounded-full bg-violet-600/20 blur-[80px] animate-pulse" />
      <div className="relative z-10 text-center space-y-4">
        <div className="w-20 h-20 mx-auto bg-emerald-500/15 border border-emerald-500/30 rounded-[1.8rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20 mb-6">
          <SurePathLogo className="w-12 h-12" />
        </div>
        <p className="text-[0.55rem] font-black text-emerald-500 uppercase tracking-[0.5em]">Selamat Datang</p>
        <h2 className="text-3xl font-black tracking-tight text-white">{name}</h2>
        <p className="text-[0.6rem] text-gray-600 uppercase tracking-widest">Akun Terverifikasi · OJK Licensed</p>
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
