import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home as HomeIcon, Zap, Wallet as WalletIcon, 
  UserCircle, LogOut, Sun, Moon, 
  Bell, Car, Plane, ShoppingBag, 
  Package, Heart, ShieldAlert, Bot, 
  ShieldCheck, Lightbulb, History
} from 'lucide-react';
import { SurePathLogo } from './components/Navbar';
import AuthGate from './components/AuthGate';
import ClaimManager from './components/ClaimManager';
import UserProfile from './components/UserProfile';
import AgentsWallet from './components/AgentsWallet';
import CarInsuranceWizard from './components/CarInsuranceWizard';
import TravelInsuranceWizard from './components/TravelInsuranceWizard';
import PAInsuranceWizard from './components/PAInsuranceWizard';
import MPARInsuranceWizard from './components/MPARInsuranceWizard';
import CustomInsuranceWizard from './components/CustomInsuranceWizard';
import PortalHero from './components/PortalHero';
import AdminPortal from './components/admin/AdminPortal';
import HealthChat from './components/HealthChat';
import ContactPage from './components/ContactPage';
import { Language, UserRole } from './types';
import { PageTransition } from './components/car-wizard/WizardUI';
import { db, seedDatabase, Policy } from './db';
import { Badge } from './components/shared/UI';
import { supabase, getAgentByEmail } from './services/supabaseService';

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
    const timer    = setInterval(() => setProgress(p => Math.min(p + 2, 100)), 28);
    const msgTimer = setInterval(() => setMessageIdx(i => Math.min(i + 1, messages.length - 1)), 600);
    const fadeTimer = setTimeout(() => setFadeOut(true), 2800);
    const finishTimer = setTimeout(onFinish, 3200);
    return () => { clearInterval(timer); clearInterval(msgTimer); clearTimeout(fadeTimer); clearTimeout(finishTimer); };
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[5000] bg-[#050505] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      {/* Background orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[130px] animate-pulse" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-orange-500/8 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      {/* grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)', backgroundSize: '50px 50px' }} />

      <div className="relative z-10 flex flex-col items-center gap-12">
        {/* Logo mark */}
        <div className="relative flex flex-col items-center gap-6">
          {/* Outer glow ring */}
          <div className="absolute w-40 h-40 rounded-full bg-emerald-500/15 blur-2xl animate-pulse" />
          {/* Icon container */}
          <div className="relative w-28 h-28 bg-emerald-500/10 border border-emerald-500/30 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-500/20 backdrop-blur-sm">
            <SurePathLogo className="w-16 h-16" />
          </div>

          {/* Wordmark */}
          <div className="text-center">
            <h1 className="text-5xl font-black tracking-[-0.05em] text-white uppercase leading-none">
              SURE<span className="text-emerald-500">PATH</span>
            </h1>
            <p className="text-[0.6rem] font-bold text-gray-600 uppercase tracking-[0.5em] mt-3">
              Asuransi Pintar untuk Semua
            </p>
          </div>
        </div>

        {/* Progress section */}
        <div className="flex flex-col items-center gap-4 w-72">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <p className="text-[0.65rem] font-black text-gray-500 uppercase tracking-[0.35em] transition-all duration-500">
              {messages[messageIdx]}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full h-[3px] bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, boxShadow: '0 0 12px rgba(16,185,129,0.6)' }}
            />
          </div>
        </div>
      </div>

      {/* Bottom tag */}
      <p className="absolute bottom-10 text-[0.45rem] font-bold text-gray-800 uppercase tracking-[0.5em]">
        Powered by Supabase · Xendit · Gemini AI
      </p>
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

import PlatformLanding from './src/pages/PlatformLanding';
import AgentPortal from './components/agent/AgentPortal';
import PaymentRedirect from './components/PaymentRedirect';

const App = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [, setIsMobile] = useState(window.innerWidth < 1024);
  const [currentPage, setPage] = useState('home');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [appMode, setAppMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone || false;
    }
    return false;
  }); 
  const [products, setProducts] = useState<any[]>(INITIAL_PRODUCTS);
  const [lang, setLang] = useState<Language>(Language.ID);
  const [latestPolicy, setLatestPolicy] = useState<Policy | null>(null);

  useEffect(() => {
    // Load custom products from DB and append to products list
    const loadCustomProducts = async () => {
      try {
        const activeCustom = await db.customProducts.filter(p => p.isActive).toArray();
        if (activeCustom.length > 0) {
          const formattedCustom = activeCustom.map(cp => ({
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
             // ensure we append uniquely
             const coreIds = INITIAL_PRODUCTS.map(ip => ip.id);
             const cleanPrev = prev.filter(p => coreIds.includes(p.id));
             return [...cleanPrev, ...formattedCustom];
          });
        }
      } catch(e){}
    };
    loadCustomProducts();

    // Listen for product changes if needed
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    seedDatabase().catch(console.error);
    const savedSession = localStorage.getItem('SUREPATH_SESSION');
    if (savedSession) {
      try {
        const user = JSON.parse(savedSession);
        setCurrentUser(user);
        setAppMode(true);
        db.policies.where('userId').equals(user.id).toArray().then(res => {
           if (res.length > 0) setLatestPolicy(res.sort((a,b) => b.id! - a.id!)[0]);
        }).catch(console.error);
      } catch (e) { localStorage.removeItem('SUREPATH_SESSION'); }
    }
  }, []);

  const handleAuthSuccess = async (user: any) => {
    let enrichedUser = user;
    if (user.role === UserRole.AGENT && !user.supabaseId) {
      const spUser = await getAgentByEmail(user.email).catch(() => null);
      if (spUser) enrichedUser = { ...user, supabaseId: spUser.id, agent_code: spUser.agent_code };
    }
    setCurrentUser(enrichedUser);
    localStorage.setItem('SUREPATH_SESSION', JSON.stringify(enrichedUser));
    setAppMode(true);
    setPage('home');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    setCurrentUser(null);
    localStorage.removeItem('SUREPATH_SESSION');
    setAppMode(false);
    setPage('home');
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return lang === Language.EN ? "Good Morning" : "Selamat Pagi";
    if (hour < 15) return lang === Language.EN ? "Good Afternoon" : "Selamat Siang";
    if (hour < 19) return lang === Language.EN ? "Good Afternoon" : "Selamat Sore";
    return lang === Language.EN ? "Good Evening" : "Selamat Malam";
  }, [lang]);

  if (!isLoaded) return <WelcomeScreen onFinish={() => setIsLoaded(true)} />;

  // Payment gateway redirects (Xendit success/failure)
  const { pathname } = window.location;
  if (pathname === '/payment/success') return <PaymentRedirect status="success" />;
  if (pathname === '/payment/failed') return <PaymentRedirect status="failed" />;

  if (currentUser && [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.INSURANCE_ADMIN].includes(currentUser.role)) {
    return <AdminPortal onLogout={handleLogout} products={products} setProducts={setProducts} userRole={currentUser.role} />;
  }

  if (currentUser && currentUser.role === UserRole.AGENT) {
    const agentWithSupabaseId = currentUser.supabaseId
      ? { ...currentUser, id: currentUser.supabaseId, agent_code: currentUser.nodeId }
      : { ...currentUser, agent_code: currentUser.nodeId };
    return <AgentPortal agent={agentWithSupabaseId} onLogout={handleLogout} lang={lang} />;
  }

  // Website Logic (Desktop & Mobile Browser)
  if (!appMode && !currentUser) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <PlatformLanding 
          onSignIn={() => { setAppMode(true); setPage('auth'); }} 
          lang={lang}
          setLang={setLang}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      </div>
    );
  }

  if (!currentUser && appMode) {
    return <AuthGate onAuthSuccess={handleAuthSuccess} initialLang={lang} />;
  }

  const renderPortalContent = () => {
    switch(currentPage) {
      case 'home':
        return (
          <PageTransition>
            <div className="space-y-10 pb-32 relative z-10 transition-all duration-700">
              <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-5">
                    <div className="relative group cursor-pointer" onClick={() => setPage('profile')}>
                      <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl flex items-center justify-center border border-slate-100 dark:border-white/5 overflow-hidden transition-all duration-700 group-hover:scale-105 active:scale-95">
                         <div className="w-full h-full bg-gradient-to-tr from-emerald-500 to-emerald-400 flex items-center justify-center text-2xl font-black text-white">
                           {currentUser?.name?.[0]}
                         </div>
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full border-4 border-[#fafaf9] dark:border-[#0a0a0a] flex items-center justify-center text-[0.6rem] text-white font-black shadow-lg">
                         {currentUser?.trustScore || 85}
                      </div>
                    </div>
                    <div className="space-y-1">
                       <h3 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">{timeGreeting}, {currentUser?.name.split(' ')[0]}!</h3>
                       <p className="text-[0.65rem] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
                          <ShieldCheck size={12} className="animate-pulse"/> {lang === Language.EN ? 'SECURE ACCOUNT' : 'AKUN AMAN'}
                       </p>
                    </div>
                 </div>
                 <button onClick={() => setPage('profile')} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-white/5 text-slate-400 dark:text-gray-500 shadow-xl hover:text-primary-500 transition-all relative active:scale-90">
                    <Bell size={22}/>
                    <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800"></span>
                 </button>
              </div>

              <PortalHero onAction={(p) => setPage(p)} lang={lang} />

              <div className="grid grid-cols-4 gap-4 px-1">
                 {[
                   { id: 'products', label: lang === Language.EN ? 'Buy' : 'Beli', icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                   { id: 'claim', label: lang === Language.EN ? 'Claim' : 'Klaim', icon: Zap, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                   { id: 'wallet', label: lang === Language.EN ? 'Wallet' : 'Dompet', icon: WalletIcon, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                   { id: 'profile', label: lang === Language.EN ? 'History' : 'Histori', icon: History, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                 ].map(action => (
                   <div key={action.id} onClick={() => setPage(action.id)} className="flex flex-col items-center gap-3 cursor-pointer group active:scale-90 transition-all">
                      <div className={`w-16 h-16 ${action.bg} ${action.color} rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                         <action.icon size={28} strokeWidth={2.5}/>
                      </div>
                      <span className="text-[0.65rem] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-center leading-tight">{action.label}</span>
                   </div>
                 ))}
              </div>

              {latestPolicy && (
                <div className="px-1">
                  <div className="p-8 bg-white dark:bg-slate-900 rounded-[3rem] text-slate-900 dark:text-white relative overflow-hidden shadow-2xl border border-slate-100 dark:border-white/5 group">
                     <div className="absolute top-0 right-0 p-10 opacity-[0.05] rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                        {latestPolicy.type === 'CAR' ? <Car size={160}/> : <Plane size={160}/>}
                     </div>
                     <div className="relative z-10 space-y-8">
                        <div className="flex justify-between items-start">
                           <div className="space-y-1">
                              <p className="text-[0.6rem] font-black text-primary-500 uppercase tracking-[0.4em]">{lang === Language.EN ? 'YOUR INSURANCE' : 'ASURANSI KAMU'}</p>
                              <h4 className="text-2xl font-black uppercase tracking-tighter">{latestPolicy.coverageDetails?.vehicle?.brand} {latestPolicy.coverageDetails?.vehicle?.model}</h4>
                           </div>
                           <div className="p-3 bg-emerald-500/10 dark:bg-white/10 rounded-2xl border border-emerald-500/20 dark:border-white/10 backdrop-blur-md shadow-xl"><ShieldCheck size={24} className="text-emerald-500"/></div>
                        </div>
                        <div className="flex justify-between items-end">
                           <div className="space-y-1">
                              <p className="text-[0.5rem] font-black text-slate-400 uppercase tracking-widest">{lang === Language.EN ? 'EXPIRES ON' : 'AKHIR POLIS'}</p>
                              <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{new Date(latestPolicy.endDate).toLocaleDateString(lang === Language.EN ? 'en-US' : 'id-ID', { month: 'long', year: 'numeric' })}</p>
                           </div>
                           <button onClick={() => setPage('profile')} className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-[0.6rem] tracking-widest shadow-xl active:scale-95 transition-all">{lang === Language.EN ? 'Details' : 'Detail'}</button>
                        </div>
                     </div>
                  </div>
                </div>
              )}

              <div className="px-1">
                 <div className="p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex gap-6 group transition-all duration-700 shadow-lg dark:shadow-none">
                    <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 flex-shrink-0 shadow-inner group-hover:rotate-6 transition-transform">
                       <Lightbulb size={28}/>
                    </div>
                    <div className="space-y-1.5">
                       <p className="text-[0.6rem] font-black uppercase text-amber-600 dark:text-amber-400 tracking-[0.2em]">{lang === Language.EN ? 'DID YOU KNOW?' : 'TAHUKAH KAMU?'}</p>
                       <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                          {lang === Language.EN 
                            ? "You can file a claim by just taking a photo. Our smart assistant processes it in minutes." 
                            : "Kamu bisa lapor klaim cuma lewat foto HP. Asisten pintar kami bakal bantu prosesnya cuma dalam hitungan menit."}
                       </p>
                    </div>
                 </div>
              </div>
            </div>
          </PageTransition>
        );
      case 'products':
        return (
          <PageTransition>
            <div className="space-y-12 pb-32 pt-4 px-2">
              <div className="space-y-4 text-center max-w-2xl mx-auto">
                 <Badge variant="brand">{lang === Language.EN ? 'Simple Protection' : 'Pusat Proteksi'}</Badge>
                 <h2 className="text-5xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-tight">
                   {lang === Language.EN ? 'Choice of Plans' : 'Pilihan Paket'} <span className="text-primary-500">SurePath</span>
                 </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {products.map(p => (
                  <div key={p.id} onClick={() => p.active && setPage(`buy-${p.id}`)} className={`group p-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 flex flex-col justify-between transition-all duration-500 relative overflow-hidden ${p.active ? 'cursor-pointer hover:border-primary-500/30 shadow-xl' : 'opacity-40 grayscale'}`}>
                    <div className="relative z-10">
                       <div className="flex justify-between items-start mb-8">
                          <div className={`w-16 h-16 ${p.bg} dark:bg-white/5 ${p.color} rounded-[1.8rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                             <p.icon size={32} strokeWidth={2.5}/>
                          </div>
                          <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-lg text-[0.5rem] font-black uppercase tracking-widest text-slate-400">{p.tech}</span>
                       </div>
                       <h4 className="font-black text-2xl uppercase tracking-tighter text-slate-900 dark:text-white mb-2">{p.title}</h4>
                       <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </PageTransition>
        );
      case 'claim': return <PageTransition><ClaimManager onComplete={() => setPage('home')} lang={lang} /></PageTransition>;
      case 'wallet': return <PageTransition><AgentsWallet lang={lang}/></PageTransition>;
      case 'profile': return <PageTransition><UserProfile currentUser={currentUser} lang={lang} onLogout={handleLogout} /></PageTransition>;
      case 'contact': return <PageTransition><ContactPage lang={lang}/></PageTransition>;
      case 'buy-car': return <CarInsuranceWizard onComplete={() => setPage('home')} currentUser={currentUser} lang={lang} />;
      case 'buy-travel': return <TravelInsuranceWizard onComplete={() => setPage('home')} currentUser={currentUser} lang={lang} />;
      case 'buy-pa': return <PAInsuranceWizard onComplete={() => setPage('home')} currentUser={currentUser} lang={lang} />;
      case 'buy-mpar': return <MPARInsuranceWizard onComplete={() => setPage('home')} currentUser={currentUser} lang={lang} />;
      case 'bot': return <HealthChat onBack={() => setPage('home')} lang={lang} />;
      default: 
        if (currentPage.startsWith('buy-custom_')) {
          const productId = currentPage.replace('buy-', '');
          return <CustomInsuranceWizard onComplete={() => setPage('home')} currentUser={currentUser} lang={lang} productId={productId} />;
        }
        return null;
    }
  };

  const isWizardFlow = currentPage.startsWith('buy-');
  const navItems = [
    { id: 'home', icon: HomeIcon, label: lang === Language.EN ? 'Home' : 'Beranda' },
    { id: 'products', icon: ShoppingBag, label: lang === Language.EN ? 'Buy' : 'Beli' }, 
    { id: 'bot', icon: Bot, label: 'Chat' },
    { id: 'claim', icon: Zap, label: 'Klaim' },
    { id: 'profile', icon: UserCircle, label: 'Akun' }
  ];

  return (
    <div className={`${darkMode ? 'dark bg-[#0a0a0a]' : 'bg-[#fafaf9]'} min-h-screen transition-colors duration-700 flex flex-col relative overflow-hidden`}>
      {!isWizardFlow && currentUser && (
        <header className="flex-shrink-0 h-24 glass-card px-8 flex items-center justify-between border-b border-slate-200/50 dark:border-white/5 z-[60] relative bg-white/60 dark:bg-black/20 backdrop-blur-xl transition-all duration-700">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setPage('home')}>
            <SurePathLogo className="w-12 h-12 group-hover:scale-110 transition-transform" />
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tighter uppercase leading-none text-slate-900 dark:text-white">Sure<span className="text-primary-500">Path</span></span>
              <span className="text-[0.45rem] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.5em] mt-1.5 transition-colors duration-700">Simple Insurance</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setDarkMode(!darkMode)} className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl text-gray-400 dark:text-gray-500 hover:text-primary-500 transition-all duration-700 shadow-xl border border-slate-100 dark:border-white/5 active:rotate-45">
              {darkMode ? <Sun size={20} className="text-yellow-400"/> : <Moon size={20}/>}
            </button>
            <button onClick={handleLogout} className="p-3.5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl hover:bg-rose-500 dark:hover:bg-rose-500 transition-all duration-700 shadow-xl active:scale-95 group">
               <LogOut size={20} className="group-hover:-translate-x-0.5 transition-transform"/>
            </button>
          </div>
        </header>
      )}

      <main className={`flex-1 overflow-y-auto w-full no-scrollbar z-10 relative transition-all duration-700 ${isWizardFlow ? 'p-0 h-screen' : (currentUser ? 'px-6 py-10' : '')} bg-gradient-to-b from-transparent to-slate-50/40 dark:to-slate-950/20`}>
        {renderPortalContent()}
      </main>

      {!isWizardFlow && currentUser && (
        <nav className="flex-shrink-0 fixed bottom-8 inset-x-6 h-22 bg-white/90 dark:bg-[#111]/90 backdrop-blur-2xl z-[70] flex items-center justify-around px-6 rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] border border-slate-200/50 dark:border-white/10 max-w-xl mx-auto transition-all duration-700">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} className={`flex flex-col items-center gap-2 flex-1 py-4 transition-all duration-500 tap-feedback ${currentPage === item.id || (currentPage.startsWith('buy') && item.id === 'products') ? 'text-primary-500 scale-110 -translate-y-1' : 'text-gray-400 dark:text-gray-600'}`}>
              <item.icon size={26} strokeWidth={2.5} className={currentPage === item.id ? 'drop-shadow-[0_0_12px_rgba(249,115,22,0.5)]' : ''} />
              <span className={`text-[0.5rem] font-black uppercase tracking-[0.2em] ${currentPage === item.id ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
            </button>
          ))}
        </nav>
      )}

    </div>
  );
};

export default App;