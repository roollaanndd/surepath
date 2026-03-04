
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home as HomeIcon, Zap, Wallet as WalletIcon, 
  UserCircle, LogOut, Sun, Moon, CheckCircle2, 
  Bell, Car, Plane, ShoppingBag, Shield, 
  Package, Heart, ShieldAlert, Bot, ChevronRight,
  ShieldCheck, Lightbulb, QrCode, ArrowRight, History,
  Search, Filter, LayoutGrid, Building2, User,
  // Fix: Added missing Network and ShieldIcon (alias for ShieldCheck) imports from lucide-react
  Network, ShieldCheck as ShieldIcon
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
import HealthChat from './components/HealthChat';
import { Language, UserRole } from './types';
import { NeuralBot, PageTransition } from './components/car-wizard/WizardUI';
import { db, seedDatabase, Policy } from './db';
import { Badge } from './components/shared/UI';

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
    const timer = setInterval(() => setProgress(p => (p >= 100 ? 100 : p + 2)), 30);
    const msgTimer = setInterval(() => setMessageIdx(i => (i < messages.length - 1 ? i + 1 : i)), 700);
    const finishTimer = setTimeout(onFinish, 3200);
    return () => { clearInterval(timer); clearInterval(msgTimer); clearTimeout(finishTimer); };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[5000] bg-[#fafaf9] dark:bg-[#0c0a09] flex flex-col items-center justify-center overflow-hidden transition-colors duration-700">
      <div className="relative z-10 flex flex-col items-center animate-pop-in">
        <div className="mb-14 relative group">
           <div className="absolute inset-0 bg-primary-500/25 rounded-full blur-[70px] animate-pulse scale-150"></div>
           <NeuralBot className="w-56 h-56 relative drop-shadow-[0_0_20px_rgba(249,115,22,0.3)]" mood="happy" />
        </div>
        <div className="text-center space-y-8">
          <h1 className="text-5xl font-black tracking-[-0.05em] text-slate-900 dark:text-white uppercase">
            SURE<span className="text-primary-500">PATH</span>
          </h1>
          <div className="space-y-5">
            <div className="flex items-center justify-center gap-3">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
               <p className="text-[0.75rem] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.4em] h-4 transition-all duration-500">
                  {messages[messageIdx]}
               </p>
            </div>
            <div className="w-72 h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mx-auto shadow-inner">
                <div className="h-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-300 shadow-[0_0_10px_#f97316]" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const INITIAL_PRODUCTS = [
  { 
    id: 'car', 
    title: 'Asuransi Mobil', 
    label: 'Auto Matrix', 
    icon: Car, 
    color: 'text-blue-500', 
    bg: 'bg-blue-50',
    active: true, 
    cat: 'Retail', 
    tech: 'AI Damage Vision',
    desc: 'Proteksi lengkap kendaraan dengan audit kerusakan instan via foto kamera HP.'
  },
  { 
    id: 'travel', 
    title: 'Asuransi Perjalanan', 
    label: 'Travel Sync', 
    icon: Plane, 
    color: 'text-emerald-500', 
    bg: 'bg-emerald-50',
    active: true, 
    cat: 'Retail', 
    tech: 'Parametric Shield',
    desc: 'Klaim otomatis untuk keterlambatan pesawat dan perlindungan medis internasional.'
  },
  { 
    id: 'pa', 
    title: 'Kecelakaan Diri', 
    label: 'Accident Core', 
    icon: ShieldAlert, 
    color: 'text-rose-500', 
    bg: 'bg-rose-50',
    active: true, 
    cat: 'Retail', 
    tech: 'Neural Underwriting',
    desc: 'Santunan cepat untuk risiko kecelakaan diri dengan proses pendaftaran 60 detik.'
  },
  { 
    id: 'mpar', 
    title: 'Proteksi Barang', 
    label: 'Asset Shield', 
    icon: Package, 
    color: 'text-amber-500', 
    bg: 'bg-amber-50',
    active: true, 
    cat: 'Retail', 
    tech: 'All-Risk Matrix',
    desc: 'Lindungi gadget, elektronik, dan barang berharga Anda dari kerusakan tak terduga.'
  },
  { 
    id: 'fleet', 
    title: 'Fleet Management', 
    label: 'Fleet Node', 
    icon: Building2, 
    color: 'text-indigo-500', 
    bg: 'bg-indigo-50',
    active: false, 
    cat: 'Corporate', 
    tech: 'Batch Deployment',
    desc: 'Solusi asuransi massal untuk armada kendaraan perusahaan dan aset logistik.'
  },
  { 
    id: 'group-health', 
    title: 'Kesehatan Grup', 
    label: 'Health Cluster', 
    icon: Heart, 
    color: 'text-pink-500', 
    bg: 'bg-pink-50',
    active: false, 
    cat: 'Corporate', 
    tech: 'Dynamic Pooling',
    desc: 'Proteksi kesehatan karyawan dengan sistem klaim cashless yang terintegrasi.'
  },
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

  // Filter & Search State for Products Page
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'All' | 'Retail' | 'Corporate'>('All');

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return lang === Language.EN ? "Good Morning" : "Selamat Pagi";
    if (hour < 15) return lang === Language.EN ? "Good Afternoon" : "Selamat Siang";
    if (hour < 19) return lang === Language.EN ? "Good Afternoon" : "Selamat Sore";
    return lang === Language.EN ? "Good Evening" : "Selamat Malam";
  }, [lang]);

  useEffect(() => {
    seedDatabase();
    const savedSession = localStorage.getItem('SUREPATH_SESSION');
    if (savedSession) {
      try {
        const user = JSON.parse(savedSession);
        setCurrentUser(user);
        setAppMode(true);
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

  const handleLogout = () => {
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

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.label.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = activeCategory === 'All' || p.cat === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, activeCategory]);

  if (!isLoaded) return <WelcomeScreen onFinish={() => setIsLoaded(true)} />;

  if (currentUser && [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.INSURANCE_ADMIN].includes(currentUser.role)) {
    return <AdminPortal onLogout={handleLogout} products={products} setProducts={() => {}} userRole={currentUser.role} />;
  }

  if (!isMobile && !appMode && !currentUser) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <Navbar 
          lang={lang} 
          setLang={setLang} 
          darkMode={darkMode} 
          setDarkMode={setDarkMode} 
          currentPage={currentPage} 
          setPage={setPage}
        />
        <DesktopWebsite onEnterPortal={() => { setAppMode(true); setPage('auth'); }} onAdminAccess={() => { setAppMode(true); setPage('auth'); }} currentLang={lang} onLangChange={setLang} />
      </div>
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
            <div className="space-y-10 pb-32 relative z-10 transition-all duration-700">
              <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-5">
                    <div className="relative group cursor-pointer" onClick={() => setPage('profile')}>
                      <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl flex items-center justify-center border border-slate-100 dark:border-white/5 overflow-hidden transition-all duration-700 group-hover:scale-105 active:scale-95">
                         <div className="w-full h-full bg-gradient-to-tr from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-2xl font-black text-slate-300 dark:text-slate-600">
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
                          <ShieldCheck size={12} className="animate-pulse"/> {lang === Language.EN ? 'SECURE CONNECTION' : 'KONEKSI AMAN'}
                       </p>
                    </div>
                 </div>
                 <button onClick={() => setPage('profile')} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-white/5 text-slate-400 dark:text-gray-500 shadow-xl hover:text-primary-500 transition-all relative active:scale-90">
                    <Bell size={22}/>
                    <span className="absolute top-4 right-4 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800"></span>
                 </button>
              </div>

              <PortalHero onAction={(p) => setPage(p)} lang={lang} />

              <div className="grid grid-cols-4 gap-4 px-1">
                 {[
                   { id: 'products', label: lang === Language.EN ? 'Buy' : 'Beli', icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                   { id: 'claim', label: lang === Language.EN ? 'Claim' : 'Klaim', icon: Zap, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                   { id: 'wallet', label: lang === Language.EN ? 'Wallet' : 'Dompet', icon: WalletIcon, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                   { id: 'profile', label: lang === Language.EN ? 'Account' : 'Akun', icon: UserCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
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
                  <div className="p-8 bg-slate-900 rounded-[3rem] text-white relative overflow-hidden shadow-[0_30px_60px_rgba(15,23,42,0.3)] border border-white/5 group">
                     <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                        {latestPolicy.type === 'CAR' ? <Car size={160}/> : <Plane size={160}/>}
                     </div>
                     <div className="relative z-10 space-y-8">
                        <div className="flex justify-between items-start">
                           <div className="space-y-1">
                              <p className="text-[0.6rem] font-black text-primary-400 uppercase tracking-[0.4em]">{lang === Language.EN ? 'YOUR POLICY' : 'POLIS KAMU'}</p>
                              <h4 className="text-2xl font-black uppercase tracking-tighter">{latestPolicy.coverageDetails?.vehicle?.brand} {latestPolicy.coverageDetails?.vehicle?.model}</h4>
                           </div>
                           <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md shadow-xl"><ShieldCheck size={24} className="text-emerald-400"/></div>
                        </div>
                        <div className="flex justify-between items-end">
                           <div className="space-y-1">
                              <p className="text-[0.5rem] font-black text-slate-500 uppercase tracking-widest">{lang === Language.EN ? 'EXPIRES ON' : 'AKHIR POLIS'}</p>
                              <p className="text-sm font-black text-emerald-400">{new Date(latestPolicy.endDate).toLocaleDateString(lang === Language.EN ? 'en-US' : 'id-ID', { month: 'long', year: 'numeric' })}</p>
                           </div>
                           <button onClick={() => setPage('profile')} className="px-6 py-2.5 bg-white text-slate-900 rounded-xl font-black uppercase text-[0.6rem] tracking-widest shadow-xl active:scale-95 transition-all">{lang === Language.EN ? 'Details' : 'Detail'}</button>
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
                            ? "You can file a claim by just taking a photo. Our AI processes it in minutes." 
                            : "Kamu bisa lapor klaim cuma lewat foto HP. AI kami bakal bantu prosesnya cuma dalam hitungan menit."}
                       </p>
                    </div>
                 </div>
              </div>

              <div className="space-y-4 px-1 pt-2">
                  <div className="flex justify-between items-center px-4">
                     <h3 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">{lang === Language.EN ? 'Recent Activity' : 'Aktivitas Terakhir'}</h3>
                     <button onClick={() => setPage('wallet')} className="text-[0.65rem] font-black uppercase text-primary-500 flex items-center gap-1">{lang === Language.EN ? 'View All' : 'Lihat Semua'} <ChevronRight size={14}/></button>
                  </div>
                  <div className="space-y-3">
                     <div className="p-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500"><History size={20}/></div>
                           <div>
                              <p className="text-xs font-black uppercase text-slate-900 dark:text-white">{lang === Language.EN ? 'Login Successful' : 'Login Berhasil'}</p>
                              <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">{lang === Language.EN ? 'Today, 10:24 AM' : 'Hari ini, 10:24 WIB'}</p>
                           </div>
                        </div>
                        <CheckCircle2 size={18} className="text-emerald-500"/>
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
              {/* Header Section */}
              <div className="space-y-4 text-center max-w-2xl mx-auto">
                 <Badge variant="brand">{lang === Language.EN ? 'Protection Store' : 'Pusat Proteksi'}</Badge>
                 <h2 className="text-5xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-tight">
                   {lang === Language.EN ? 'Insurance Matrix' : 'Modul Asuransi'} <span className="text-primary-500">SurePath</span>
                 </h2>
                 <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                   {lang === Language.EN 
                     ? "Select an AI-driven protection module tailored for your specific needs." 
                     : "Pilih modul proteksi ditenagai AI yang dirancang khusus untuk kebutuhan aset dan diri Anda."}
                 </p>
              </div>

              {/* Utility Bar: Search & Filter */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900/50 p-4 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm">
                 <div className="flex bg-gray-100 dark:bg-black/20 p-1.5 rounded-full w-full md:w-auto">
                    {(['All', 'Retail', 'Corporate'] as const).map((cat) => (
                       <button
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          className={`px-6 py-2.5 rounded-full text-[0.65rem] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-white dark:bg-slate-800 text-primary-500 shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                       >
                          {cat}
                       </button>
                    ))}
                 </div>
                 <div className="relative w-full md:w-72 group">
                    <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary-500 transition-colors" />
                    <input 
                       type="text" 
                       placeholder={lang === Language.EN ? "Search protection..." : "Cari proteksi..."}
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="w-full pl-12 pr-6 py-3.5 bg-gray-50 dark:bg-black/20 border border-transparent focus:border-primary-500/30 rounded-full text-xs font-bold outline-none transition-all"
                    />
                 </div>
              </div>

              {/* Grid of Products */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredProducts.map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => p.active && setPage(`buy-${p.id}`)} 
                    className={`group p-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 flex flex-col justify-between transition-all duration-500 relative overflow-hidden ${p.active ? 'cursor-pointer hover:border-primary-500/30 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] hover:-translate-y-1 active:scale-[0.98]' : 'opacity-40 grayscale cursor-not-allowed bg-slate-50/50'}`}
                  >
                    {/* Floating Background Accent */}
                    <div className={`absolute -right-8 -top-8 w-32 h-32 ${p.bg} rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity`}></div>

                    <div className="relative z-10">
                       <div className="flex justify-between items-start mb-8">
                          <div className={`w-16 h-16 ${p.bg} dark:bg-white/5 ${p.color} rounded-[1.8rem] flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                             <p.icon size={32} strokeWidth={2.5}/>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                             <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-lg text-[0.5rem] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors">{p.cat}</span>
                             {!p.active && <span className="px-3 py-1 bg-rose-100 text-rose-600 rounded-lg text-[0.5rem] font-black uppercase tracking-widest">Coming Soon</span>}
                          </div>
                       </div>
                       
                       <div className="space-y-3">
                          <h4 className="font-black text-2xl uppercase tracking-tighter text-slate-900 dark:text-white leading-none">{p.title}</h4>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-[90%]">{p.desc}</p>
                       </div>
                    </div>

                    <div className="mt-10 pt-6 border-t border-slate-50 dark:border-white/5 flex items-center justify-between relative z-10">
                       <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                          <span className="text-[0.6rem] font-black uppercase tracking-widest text-emerald-600/70">{p.tech}</span>
                       </div>
                       {p.active && (
                          <div className="flex items-center gap-2 text-primary-500 font-black uppercase text-[0.65rem] tracking-[0.2em] group-hover:translate-x-2 transition-transform">
                             {lang === Language.EN ? 'Configure' : 'Konfigurasi'} <ChevronRight size={18}/>
                          </div>
                       )}
                    </div>
                  </div>
                ))}

                {filteredProducts.length === 0 && (
                   <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                      <LayoutGrid size={64} className="text-slate-300"/>
                      <p className="text-sm font-black uppercase tracking-widest text-slate-400">Produk tidak ditemukan</p>
                   </div>
                )}
              </div>

              {/* Enterprise Banner */}
              <div className="p-12 bg-slate-900 rounded-[4rem] text-white relative overflow-hidden group shadow-2xl">
                 <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-[3000ms]">
                    <Building2 size={240}/>
                 </div>
                 <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center">
                    <div className="space-y-6">
                       <Badge variant="brand">SurePath for Business</Badge>
                       <h3 className="text-4xl font-black tracking-tighter uppercase leading-none">
                          Butuh Proteksi <br/> <span className="text-primary-500">Skala Besar?</span>
                       </h3>
                       <p className="text-slate-400 font-medium leading-relaxed max-w-sm">
                          Kami menyediakan integrasi API dan portal khusus untuk perusahaan dalam mengelola ratusan aset dalam satu dasbor.
                       </p>
                       <button className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 group">
                          Hubungi Tim Enterprise <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform"/>
                       </button>
                    </div>
                    <div className="hidden md:flex justify-end pr-8">
                       <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-2xl">
                          <Network size={48} className="text-primary-500"/>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </PageTransition>
        );
      case 'claim': return <PageTransition><ClaimManager onComplete={() => setPage('home')} lang={lang} /></PageTransition>;
      case 'wallet': return <PageTransition><AgentsWallet lang={lang}/></PageTransition>;
      case 'profile': return <PageTransition><UserProfile currentUser={currentUser} lang={lang} onLogout={handleLogout} /></PageTransition>;
      case 'buy-car': return <CarInsuranceWizard onComplete={() => setPage('home')} currentUser={currentUser} lang={lang} />;
      case 'buy-travel': return <TravelInsuranceWizard onComplete={() => setPage('home')} currentUser={currentUser} lang={lang} />;
      case 'buy-pa': return <PAInsuranceWizard onComplete={() => setPage('home')} currentUser={currentUser} lang={lang} />;
      case 'buy-mpar': return <MPARInsuranceWizard onComplete={() => setPage('home')} currentUser={currentUser} lang={lang} />;
      case 'bot': return <HealthChat onBack={() => setPage('home')} lang={lang} />;
      default: return null;
    }
  };

  const isWizardFlow = currentPage.startsWith('buy-');
  const navItems = [
    { id: 'home', icon: HomeIcon, label: lang === Language.EN ? 'Home' : 'Beranda' },
    { id: 'products', icon: ShoppingBag, label: lang === Language.EN ? 'Products' : 'Produk' }, 
    { id: 'bot', icon: Bot, label: 'Tanya AI' },
    { id: 'claim', icon: Zap, label: 'Klaim' },
    { id: 'profile', icon: UserCircle, label: 'Akun' }
  ];

  return (
    <div className={`${darkMode ? 'dark bg-[#0a0a0a]' : 'bg-[#fafaf9]'} h-full transition-all duration-700 font-sans flex flex-col relative overflow-hidden`}>
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-gradient-to-br from-primary-500/5 via-transparent to-emerald-500/5 blur-[120px]"></div>
      </div>
      
      {!isWizardFlow && currentUser && (
        <header className="flex-shrink-0 h-24 glass-card px-8 flex items-center justify-between border-b border-slate-200/50 dark:border-white/5 z-[60] relative bg-white/60 dark:bg-black/20 backdrop-blur-xl transition-all duration-700">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setPage('home')}>
            <SurePathLogo className="w-12 h-12 group-hover:scale-110 transition-transform" />
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tighter uppercase leading-none text-slate-900 dark:text-white">Sure<span className="text-primary-500">Path</span></span>
              <span className="text-[0.45rem] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.5em] mt-1.5 transition-colors duration-700">{currentUser?.name || 'Halo!'}</span>
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
