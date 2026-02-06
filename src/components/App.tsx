import React, { useState, useEffect } from 'react';
import { 
  Home as HomeIcon, Grid, Zap, Briefcase, Moon, Sun, 
  ChevronRight, ArrowRight, ShieldCheck, 
  Car, Wallet, Plane, Smartphone, Loader2,
  User, CheckCircle2, Shield, Eye, Info, Check,
  Cpu, Database, Search, ShieldCheck as ShieldIcon,
  AlertOctagon, ClipboardCheck, ArrowDown, MapPinned, 
  FileUp, Users, Globe, Building2, Activity,
  Settings, Dog, ShieldAlert, BellRing, 
  CreditCard, Landmark, Save, LogOut, Package,
  Info as AboutIcon, Terminal, Radio, HeartPulse,
  Award, Target, BarChart3, Fingerprint, ShieldX,
  ChevronLeft, Scale, Lock, LineChart, TrendingUp,
  RefreshCw, Box, Network, Coins, Wallet as WalletIcon,
  UserCircle, ShoppingBag, QrCode
} from 'lucide-react';
import DesktopWebsite from './components/DesktopWebsite';
import Navbar, { SurePathLogo } from './components/Navbar';
import AuthGate from './components/AuthGate';
import ClaimManager from './ClaimManager';
import UserProfile from './UserProfile';
import AgentsWallet from './AgentsWallet';
import CarInsuranceWizard from './CarInsuranceWizard';
import TravelInsuranceWizard from './TravelInsuranceWizard';
import PAInsuranceWizard from './PAInsuranceWizard';
import MPARInsuranceWizard from './MPARInsuranceWizard';
import PortalHero from './PortalHero';
import AdminPortal from './admin/AdminPortal';
import PartnerView from './PartnerView';
import { Language, UserRole } from './types';
import { NeuralBot, PageTransition } from './components/car-wizard/WizardUI';
import { db, seedDatabase, Policy } from './db';

const WelcomeScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [messageIdx, setMessageIdx] = useState(0);

  const messages = [
    "Menyiapkan asuransi pintarmu...",
    "Mengamankan akun kamu...",
    "Mencari penawaran terbaik...",
    "Menghubungkan ke sistem...",
    "Siap melindungimu!"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => (p >= 100 ? 100 : p + 2));
    }, 40);
    const msgTimer = setInterval(() => {
      setMessageIdx(i => (i < messages.length - 1 ? i + 1 : i));
    }, 800);
    const finishTimer = setTimeout(onFinish, 3500);
    return () => { clearInterval(timer); clearInterval(msgTimer); clearTimeout(finishTimer); };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[5000] bg-[#fafaf9] dark:bg-[#0c0a09] flex flex-col items-center justify-center overflow-hidden">
      <div className="relative z-10 flex flex-col items-center animate-pop-in">
        <div className="mb-10 relative group">
           <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-[60px] animate-pulse"></div>
           <NeuralBot className="w-48 h-48 relative" mood="happy" />
        </div>
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
            SURE<span className="text-primary-500">PATH</span>
          </h1>
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] h-4 transition-all duration-500">
               {messages[messageIdx]}
            </p>
            <div className="w-64 h-1 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mx-auto">
                <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const INITIAL_PRODUCTS = [
  { id: 'car', title: 'Asuransi Mobil', label: 'Asuransi Mobil', icon: Car, color: 'text-blue-500', active: true, cat: 'Retail', tech: 'Cek Visual AI' },
  { id: 'travel', title: 'Asuransi Travel', label: 'Asuransi Travel', icon: Plane, color: 'text-emerald-500', active: true, cat: 'Retail', tech: 'Proteksi Perjalanan' },
  { id: 'pa', title: 'Kecelakaan Diri', label: 'Kecelakaan Diri', icon: ShieldAlert, color: 'text-rose-500', active: true, cat: 'Retail', tech: 'Santunan Cepat' },
  { id: 'mpar', title: 'Proteksi Barang', label: 'Proteksi Barang', icon: Package, color: 'text-amber-500', active: true, cat: 'Retail', tech: 'Elektronik & Gadget' },
];

const App = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [currentPage, setPage] = useState('home');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [appMode, setAppMode] = useState(false); 
  const [products] = useState(INITIAL_PRODUCTS);
  const [lang, setLang] = useState<Language>(Language.ID);
  const [latestPolicy, setLatestPolicy] = useState<Policy | null>(null);

  useEffect(() => {
    seedDatabase();
    const savedSession = localStorage.getItem('SUREPATH_SESSION');
    if (savedSession) {
      try {
        const user = JSON.parse(savedSession);
        setCurrentUser(user);
        setAppMode(true);
        // Load latest policy
        db.policies.where('userId').equals(user.id).toArray().then(res => {
           if (res.length > 0) setLatestPolicy(res.sort((a,b) => b.id! - a.id!)[0]);
        });
      } catch (e) { localStorage.removeItem('SUREPATH_SESSION'); }
    }
  }, [currentPage]);

  const handleAuthSuccess = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem('SUREPATH_SESSION', JSON.stringify(user));
    setAppMode(true);
    setPage('home');
  };

  const handleDemoLogin = async () => {
    const user = await db.users.where('email').equals('user@surepath.ai').first();
    if (user) handleAuthSuccess(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('SUREPATH_SESSION');
    setAppMode(false);
    setPage('home');
  };

  const startClaimFromPolicy = (policy: Policy) => {
     setPage('claim');
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isLoaded) return <WelcomeScreen onFinish={() => setIsLoaded(true)} />;

  if (currentUser && [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.INSURANCE_ADMIN].includes(currentUser.role)) {
    return <AdminPortal onLogout={handleLogout} products={products} setProducts={() => {}} userRole={currentUser.role} />;
  }

  if (!isMobile && !appMode && !currentUser) {
    return (
      <>
        <Navbar 
          lang={lang} 
          setLang={setLang} 
          darkMode={darkMode} 
          setDarkMode={setDarkMode} 
          currentPage={currentPage} 
          setPage={setPage}
          onDemoLogin={handleDemoLogin}
        />
        <DesktopWebsite onEnterPortal={() => { setAppMode(true); setPage('auth'); }} onAdminAccess={() => { setAppMode(true); setPage('auth'); }} currentLang={lang} onLangChange={setLang} />
      </>
    );
  }

  if (!currentUser && (isMobile || appMode)) {
    return <AuthGate onAuthSuccess={handleAuthSuccess} initialLang={lang} />;
  }

  const renderPortalContent = () => {
    switch(currentPage) {
      case 'home':
        return (
          <PageTransition>
            <div className="space-y-6 pb-24 relative z-10">
              <PortalHero onAction={(p) => setPage(p)} />
              
              {latestPolicy ? (
                <div className="p-6 bg-slate-900 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                      <ShieldCheck size={120} className="text-primary-500"/>
                   </div>
                   <div className="relative z-10 space-y-6">
                      <div className="flex justify-between items-center">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                               <ShieldIcon size={20}/>
                            </div>
                            <div>
                               <p className="text-[0.65rem] font-black uppercase tracking-widest text-emerald-400">Node Aktif</p>
                               <h4 className="text-white font-black uppercase text-sm leading-none">{latestPolicy.policyNumber}</h4>
                            </div>
                         </div>
                         <button onClick={() => setPage('profile')} className="p-2 bg-white/10 rounded-xl text-primary-500"><QrCode size={18}/></button>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500"><Car size={20}/></div>
                            <p className="text-[0.7rem] font-black text-gray-200 uppercase tracking-tight truncate max-w-[140px]">{latestPolicy.coverageDetails?.vehicle?.brand} {latestPolicy.coverageDetails?.vehicle?.model}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[0.45rem] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Berakhir</p>
                            <p className="text-[0.65rem] font-black text-emerald-400 uppercase">{new Date(latestPolicy.endDate).toLocaleDateString()}</p>
                         </div>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="p-5 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-[2rem] flex items-center justify-between shadow-sm">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-2xl flex items-center justify-center text-gray-400">
                         <ShieldIcon size={20}/>
                      </div>
                      <div>
                         <p className="text-xs font-black uppercase text-gray-400">Belum Ada Node</p>
                         <p className="text-[0.5rem] font-bold text-gray-500 uppercase tracking-widest">ID Anggota: {currentUser?.nodeId}</p>
                      </div>
                   </div>
                   <button onClick={() => setPage('products')} className="px-3 py-1 bg-primary-500 text-white rounded-lg text-[0.5rem] font-black uppercase">Mulai Proteksi</button>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div onClick={() => setPage('products')} className="p-6 bg-white dark:bg-white/5 rounded-[2.5rem] border border-gray-100 shadow-sm cursor-pointer group active:scale-95 transition-all">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 mb-4"><ShoppingBag size={20}/></div>
                  <p className="font-black text-sm uppercase">Beli Asuransi</p>
                  <p className="text-[0.5rem] text-gray-400 font-bold uppercase mt-1">Cari Proteksi</p>
                </div>
                <div onClick={() => setPage('claim')} className="p-6 bg-primary-500 rounded-[2.5rem] shadow-lg shadow-primary-500/20 cursor-pointer group active:scale-95 transition-all text-white">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white mb-4"><Zap size={20}/></div>
                  <p className="font-black text-sm uppercase">Lapor Klaim</p>
                  <p className="text-[0.5rem] text-white/70 font-bold uppercase mt-1">Proses AI Cepat</p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                  <h3 className="text-lg font-black uppercase tracking-tight px-2">Rekomendasi <span className="text-primary-500">Untuk Kamu</span></h3>
                  <div className="grid grid-cols-2 gap-3">
                    {products.slice(0, 4).map(p => (
                      <div key={p.id} onClick={() => setPage(`buy-${p.id}`)} className="p-4 bg-white dark:bg-white/5 rounded-[2rem] border border-gray-100 flex flex-col gap-3 active:scale-95 transition-all shadow-sm cursor-pointer">
                        <div className={`w-10 h-10 ${p.color} bg-gray-50 rounded-xl flex items-center justify-center`}><p.icon size={18}/></div>
                        <div><h4 className="font-black text-[0.7rem] uppercase leading-none mb-1">{p.label}</h4><p className="text-[0.45rem] text-gray-400 font-bold uppercase">{p.tech}</p></div>
                      </div>
                    ))}
                  </div>
              </div>
            </div>
          </PageTransition>
        );
      case 'products':
        return (
          <PageTransition>
            <div className="space-y-6 pb-24 pt-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter px-2">Daftar <span className="text-primary-500">Asuransi</span></h2>
              <div className="grid gap-3">
                {products.map(p => (
                  <div key={p.id} onClick={() => setPage(`buy-${p.id}`)} className="p-5 bg-white dark:bg-white/5 rounded-[2.2rem] border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer shadow-sm">
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 bg-gray-50 dark:bg-white/10 ${p.color} rounded-2xl flex items-center justify-center shadow-inner`}><p.icon size={28}/></div>
                      <div><h4 className="font-black text-base uppercase">{p.title}</h4><p className="text-[0.6rem] text-gray-400 font-bold uppercase tracking-widest">{p.tech}</p></div>
                    </div>
                    <ChevronRight className="text-gray-300" size={20}/>
                  </div>
                ))}
              </div>
            </div>
          </PageTransition>
        );
      case 'claim': return <PageTransition><ClaimManager onComplete={() => setPage('home')} /></PageTransition>;
      case 'wallet': return <PageTransition><AgentsWallet /></PageTransition>;
      case 'profile': return <PageTransition><UserProfile currentUser={currentUser} onStartClaim={startClaimFromPolicy} /></PageTransition>;
      case 'buy-car': return <CarInsuranceWizard onComplete={() => setPage('home')} currentUser={currentUser} />;
      case 'buy-travel': return <TravelInsuranceWizard onComplete={() => setPage('home')} currentUser={currentUser} />;
      case 'buy-pa': return <PAInsuranceWizard onComplete={() => setPage('home')} currentUser={currentUser} />;
      case 'buy-mpar': return <MPARInsuranceWizard onComplete={() => setPage('home')} currentUser={currentUser} />;
      default: return null;
    }
  };

  const isWizardFlow = currentPage.startsWith('buy-');
  
  const navItems = [
    { id: 'home', icon: HomeIcon, label: 'Beranda' },
    { id: 'products', icon: ShoppingBag, label: 'Produk' }, 
    { id: 'claim', icon: Zap, label: 'Klaim' },
    { id: 'wallet', icon: WalletIcon, label: 'Dompet' },
    { id: 'profile', icon: UserCircle, label: 'Akun' }
  ];

  return (
    <div className={`${darkMode ? 'dark bg-[#0a0a0a]' : 'bg-[#fafaf9]'} h-full transition-colors duration-700 font-sans flex flex-col relative overflow-hidden`}>
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-primary-500/5 rounded-full blur-[120px]"></div>
      </div>
      {!isWizardFlow && currentUser && (
        <header className="flex-shrink-0 h-24 glass-card px-8 flex items-center justify-between border-b border-gray-100 dark:border-white/5 z-[60] relative bg-white/80 dark:bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setPage('home')}>
            <SurePathLogo className="w-12 h-12 group-hover:scale-110 transition-transform" />
            <div className="flex flex-col">
              <span className="font-black text-2xl tracking-tighter uppercase leading-none text-slate-900 dark:text-white">Sure<span className="text-brand-500">Path</span></span>
              <span className="text-[0.45rem] font-bold text-gray-400 uppercase tracking-[0.4em] mt-1">{currentUser?.name || 'Halo!'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setDarkMode(!darkMode)} className="p-3 bg-white dark:bg-white/10 rounded-2xl text-gray-400 hover:text-primary-500 transition-colors shadow-sm border border-gray-100 dark:border-white/5">
              {darkMode ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
            <button onClick={handleLogout} className="p-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl hover:bg-primary-500 dark:hover:bg-primary-500 transition-all shadow-lg">
               <LogOut size={18}/>
            </button>
          </div>
        </header>
      )}
      <main className={`flex-1 overflow-y-auto w-full no-scrollbar z-10 relative ${isWizardFlow ? 'p-0 h-screen' : 'px-6 py-10'}`}>
        {renderPortalContent()}
      </main>
      {!isWizardFlow && currentUser && (
        <nav className="flex-shrink-0 fixed bottom-8 inset-x-6 h-20 bg-white/90 dark:bg-[#111]/90 backdrop-blur-xl z-[70] flex items-center justify-around px-4 rounded-[2.8rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-white/10 max-w-xl mx-auto transition-all duration-500">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} className={`flex flex-col items-center gap-1.5 flex-1 py-3 transition-all duration-300 tap-feedback ${currentPage === item.id || (currentPage.startsWith('buy') && item.id === 'products') ? 'text-primary-500 scale-110 -translate-y-1' : 'text-gray-400 dark:text-gray-500'}`}>
              <item.icon size={24} className={currentPage === item.id ? 'drop-shadow-[0_0_12px_rgba(249,115,22,0.4)]' : ''} />
              <span className="text-[0.45rem] font-black uppercase tracking-[0.2em]">{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
};

export default App;