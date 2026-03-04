
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
  UserCircle
} from 'lucide-react';
import DesktopWebsite from './components/DesktopWebsite';
import { SurePathLogo } from './components/Navbar';
import AuthGate from './components/AuthGate';
import AppSelector from './components/AppSelector';
import ClaimManager from './components/ClaimManager';
import UserProfile from './components/UserProfile';
import AgentsWallet from './components/AgentsWallet';
import CarInsuranceWizard from './components/CarInsuranceWizard';
import TravelInsuranceWizard from './components/TravelInsuranceWizard';
import PAInsuranceWizard from './components/PAInsuranceWizard';
import MPARInsuranceWizard from './components/MPARInsuranceWizard';
import PortalHero from './components/PortalHero';
import AdminPortal from './components/admin/AdminPortal';
import PartnerView from './components/PartnerView';
import { Language, UserRole } from './types';

// --- INITIAL DATA ---
const INITIAL_PRODUCTS = [
  { id: 'car', title: 'Auto Matrix', label: 'Auto Matrix', icon: Car, color: 'text-blue-500', active: true, cat: 'Retail', tech: 'Vision Transformers' },
  { id: 'travel', title: 'Travel Matrix', label: 'Travel Matrix', icon: Plane, color: 'text-emerald-500', active: true, cat: 'Retail', tech: 'Parametric Sync' },
  { id: 'pa', title: 'Accident Core', label: 'Accident Core', icon: ShieldAlert, color: 'text-rose-500', active: true, cat: 'Retail', tech: 'Heuristic Modeling' },
  { id: 'mpar', title: 'Property Shield', label: 'Property Shield', icon: Package, color: 'text-amber-500', active: true, cat: 'Retail', tech: 'All-Risk Matrix' },
  { id: 'health', title: 'Health Sync', label: 'Health Sync', icon: HeartPulse, color: 'text-rose-600', active: true, cat: 'Retail', tech: 'Biometric ID' },
  { id: 'cyber_p', title: 'Cyber Personal', label: 'Cyber Personal', icon: ShieldCheck, color: 'text-indigo-500', active: true, cat: 'Retail', tech: 'Encrypted Vault' },
  { id: 'fleet', title: 'Fleet Cluster', label: 'Fleet Cluster', icon: Box, color: 'text-blue-700', active: false, cat: 'Corporate', tech: 'Telemetery AI' },
  { id: 'cyber_c', title: 'Cyber Shield Corp', label: 'Cyber Shield Corp', icon: Lock, color: 'text-indigo-600', active: false, cat: 'Corporate', tech: 'Threat Guard' },
  { id: 'liability', title: 'Liability Sync', label: 'Liability Sync', icon: Scale, color: 'text-emerald-600', active: false, cat: 'Corporate', tech: 'Legal Neural' }
];

const WelcomeScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [messageIdx, setMessageIdx] = useState(0);

  const messages = [
    "Initializing Neural Kernel",
    "Syncing Bio-Metric Shield",
    "Calibrating Risk Matrix",
    "Establishing Secure Link",
    "Protection Active"
  ];

  useEffect(() => {
    const timer = setInterval(() => setProgress(p => (p >= 100 ? 100 : p + 2.5)), 30);
    const msgTimer = setInterval(() => setMessageIdx(i => (i < messages.length - 1 ? i + 1 : i)), 700);
    const finishTimer = setTimeout(onFinish, 3400);
    return () => { clearInterval(timer); clearInterval(msgTimer); clearTimeout(finishTimer); };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[2000] bg-[#f0faf7] flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[1200px] h-[1200px] bg-emerald-400/10 rounded-full blur-[160px] animate-blob"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[1000px] h-[1000px] bg-cyan-300/10 rounded-full blur-[140px] animate-blob animation-delay-2000"></div>
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-emerald-500/10 rounded-full animate-spin-slow"></div>
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-cyan-500/10 rounded-full animate-reverse-spin opacity-50"></div>
         <div className="absolute inset-0 bg-neural-mesh opacity-60"></div>
      </div>
      <div className="relative z-10 flex flex-col items-center animate-pop-in">
        <div className="mb-14 relative group">
           <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-[60px] animate-pulse"></div>
           <SurePathLogo className="w-44 h-44 relative animate-hologram drop-shadow-[0_0_35px_rgba(16,185,129,0.5)]" />
        </div>
        <div className="text-center space-y-10">
          <h1 className="text-7xl font-black tracking-[-0.08em] text-gray-900 uppercase flex items-center gap-1.5">
            SURE<span className="text-primary-500 text-glow-emerald">PATH</span>
          </h1>
          <div className="space-y-5">
            <div className="flex items-center justify-center gap-3">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
               <p className="text-[0.85rem] font-black text-emerald-600 uppercase tracking-[0.6em] h-6 transition-all duration-500 flex items-center justify-center">
                  {messages[messageIdx]}
               </p>
            </div>
            <div className="w-96 h-[3px] bg-gray-200/50 rounded-full overflow-hidden mx-auto shadow-sm">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-cyan-400 shadow-[0_0_25px_rgba(16,185,129,0.8)] transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [currentPage, setPage] = useState('home');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [appMode, setAppMode] = useState(false); 
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [lang, setLang] = useState<Language>(Language.EN);

  // Persistence logic: Check for active session on boot
  useEffect(() => {
    const savedSession = localStorage.getItem('SUREPATH_SESSION');
    if (savedSession) {
      try {
        const user = JSON.parse(savedSession);
        setCurrentUser(user);
        setAppMode(true);
      } catch (e) {
        console.error("Invalid session node", e);
        localStorage.removeItem('SUREPATH_SESSION');
      }
    }

    const timezone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    const isIndo = timezone.includes('Jakarta') || timezone.includes('Makassar') || timezone.includes('Jayapura');
    if (isIndo) setLang(Language.ID);
  }, []);

  const handleAuthSuccess = (user: any) => {
    setCurrentUser(user);
    // Persist session
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

  // Show the WelcomeScreen (Loading Animation) first
  if (!isLoaded) return <WelcomeScreen onFinish={() => setIsLoaded(true)} />;

  // Roles that access the HQ Admin Portal
  const isAdminRole = currentUser && [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE].includes(currentUser.role);

  if (isAdminRole) {
    return <AdminPortal 
      onLogout={handleLogout} 
      products={products}
      setProducts={setProducts}
      userRole={currentUser.role}
    />;
  }

  if (!isMobile && !appMode && !currentUser) {
    return (
      <DesktopWebsite 
        onEnterPortal={() => { setAppMode(true); setPage('auth'); }} 
        onAdminAccess={() => { setAppMode(true); setPage('auth'); }} 
        currentLang={lang}
        onLangChange={setLang}
      />
    );
  }

  if (!currentUser && (isMobile || appMode)) {
    return <AuthGate onAuthSuccess={handleAuthSuccess} initialLang={lang} />;
  }

  const renderPortalContent = () => {
    // Shared components between Agent and Customer if any
    const isAgent = currentUser?.role === UserRole.AGENT;

    switch(currentPage) {
      case 'home':
        return (
          <div className="space-y-8 animate-fade-in pb-24 text-gray-900 dark:text-white relative z-10">
            <PortalHero onAction={(p) => setPage(p)} />
            
            <div className="p-5 bg-primary-500/5 border border-primary-500/20 rounded-[2rem] flex items-center justify-between shadow-inner group">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/20 group-hover:scale-110 transition-transform">
                     <ShieldIcon size={20}/>
                  </div>
                  <div>
                     <p className="text-[0.65rem] font-black uppercase tracking-widest text-primary-600 flex items-center gap-2">
                        {isAgent ? 'Partner Node Active' : 'Neural Shield Active'}
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-ping"></span>
                     </p>
                     <p className="text-[0.5rem] font-bold text-gray-500 uppercase tracking-widest">Node ID: {currentUser?.nodeId || 'SP-GHOST'}</p>
                  </div>
               </div>
               <Radio size={16} className="text-primary-500 animate-pulse"/>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div onClick={() => setPage('products')} className="p-8 glass-card rounded-[2.8rem] border border-gray-200/50 shadow-xl cursor-pointer group overflow-hidden relative">
                <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-125 transition-transform text-gray-900 dark:text-white"><Grid size={140}/></div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-5 shadow-inner"><Grid size={24}/></div>
                <p className="font-black text-lg uppercase tracking-tighter">{isAgent ? 'Deployment' : 'Neural Store'}</p>
                <p className="text-[0.6rem] font-bold text-gray-400 mt-1.5 uppercase tracking-widest">{isAgent ? 'Issue Policy' : 'Buy Protection'}</p>
              </div>
              <div onClick={() => setPage('claim')} className="p-8 glass-card rounded-[2.8rem] border border-gray-200/50 shadow-xl cursor-pointer group overflow-hidden relative">
                <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-125 transition-transform text-gray-900 dark:text-white"><Zap size={140}/></div>
                <div className="w-12 h-12 bg-primary-500/10 rounded-2xl flex items-center justify-center text-primary-500 mb-5 shadow-inner"><Zap size={24}/></div>
                <p className="font-black text-lg uppercase tracking-tighter">Claim AI</p>
                <p className="text-[0.6rem] font-bold text-gray-400 mt-1.5 uppercase tracking-widest">60s Payout</p>
              </div>
            </div>
            
            {/* Conditional Wallet: Customers might have a simple one, Agents have the complex matrix */}
            <div onClick={() => setPage('wallet')} className="p-8 glass-card rounded-[2.8rem] border border-gray-200/50 shadow-xl cursor-pointer group overflow-hidden relative flex items-center justify-between">
                <div className="absolute inset-0 bg-primary-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center gap-6 relative z-10">
                   <div className="w-14 h-14 bg-gray-100 dark:bg-white/10 rounded-3xl flex items-center justify-center text-gray-400 group-hover:text-primary-500 group-hover:scale-110 transition-all shadow-inner">
                      <WalletIcon size={28}/>
                   </div>
                   <div>
                      <p className="text-xl font-black uppercase tracking-tighter">{isAgent ? 'Agents Wallet' : 'Node Vault'}</p>
                      <p className="text-[0.6rem] font-bold text-gray-400 uppercase tracking-widest mt-1">{isAgent ? 'Earnings & Trans Matrix' : 'Policies & Payments'}</p>
                   </div>
                </div>
                <ChevronRight className="text-gray-300 group-hover:text-primary-500 transition-all group-hover:translate-x-1" size={24}/>
            </div>
          </div>
        );

      case 'products':
        return (
          <div className="space-y-10 animate-fade-in pb-24 text-gray-900 dark:text-white relative z-10">
            <h2 className="text-4xl font-black uppercase tracking-tighter px-2">{isAgent ? 'Policy' : 'Neural'} <span className="text-primary-500">{isAgent ? 'Deployment' : 'Store'}</span></h2>
            <div className="grid gap-4">
              {products.filter(p => p.cat === 'Retail').map(p => (
                <div 
                  key={p.id} 
                  onClick={() => p.active ? setPage(`buy-${p.id}`) : null} 
                  className={`p-6 glass-card rounded-[2.8rem] border border-gray-200 dark:border-gray-800 flex items-center justify-between transition-all group relative overflow-hidden ${p.active ? 'cursor-pointer hover:border-primary-500 shadow-lg' : 'opacity-40 grayscale cursor-not-allowed bg-gray-50/50'}`}
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 bg-gray-100 dark:bg-white/10 ${p.color} rounded-3xl flex items-center justify-center shadow-inner ${p.active ? 'group-hover:scale-110 transition-transform' : ''}`}>
                      <p.icon size={32}/>
                    </div>
                    <div>
                      <h4 className="font-black text-xl uppercase tracking-tighter">{p.label}</h4>
                      <p className="text-[0.65rem] text-gray-500 font-bold uppercase tracking-[0.2em]">{p.active ? p.tech : 'Matrix Calibration'}</p>
                    </div>
                  </div>
                  {p.active && <ChevronRight className="text-gray-300 group-hover:text-primary-500 transition-colors" size={24}/>}
                </div>
              ))}
            </div>
          </div>
        );

      /* Fix: Added missing lang prop to ClaimManager */
      case 'claim': return <ClaimManager onComplete={() => setPage('home')} lang={lang} />;
      case 'wallet': return isAgent ? <AgentsWallet /> : <div className="p-10 text-center uppercase font-black text-gray-300">Customer Wallet Coming Soon</div>;
      case 'profile': return <UserProfile currentUser={currentUser} />;
      /* Fix: Added missing lang prop to wizards */
      case 'buy-car': return <CarInsuranceWizard onComplete={() => setPage('home')} currentUser={currentUser} lang={lang} />;
      case 'buy-travel': return <TravelInsuranceWizard onComplete={() => setPage('home')} currentUser={currentUser} lang={lang} />;
      case 'buy-pa': return <PAInsuranceWizard onComplete={() => setPage('home')} currentUser={currentUser} lang={lang} />;
      case 'buy-mpar': return <MPARInsuranceWizard onComplete={() => setPage('home')} currentUser={currentUser} lang={lang} />;
      default: return <div className="p-10 text-center uppercase font-black text-gray-300">Under Construction</div>;
    }
  };

  const isWizardFlow = currentPage.startsWith('buy-');

  const AppWrapper = () => (
    <div className={`${darkMode ? 'dark bg-[#f0faf7] text-gray-900' : 'bg-[#f0faf7] text-gray-900'} h-full transition-colors duration-700 font-sans flex flex-col relative overflow-hidden`}>
      
      {/* Ambient Background Animation */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[800px] h-[800px] bg-primary-500/5 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[120px] animate-pulse-slow animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
      </div>

      {!isWizardFlow && (
        <header className="flex-shrink-0 h-24 glass-card px-8 flex items-center justify-between border-b border-emerald-100 dark:border-emerald-100 z-[60] relative">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setPage('home')}>
            <SurePathLogo className="w-12 h-12 group-hover:scale-110 transition-transform" />
            <div className="flex flex-col">
              <span className="font-black text-2xl tracking-tighter uppercase leading-none">Sure<span className="text-primary-500">Path</span></span>
              <span className="text-[0.45rem] font-bold text-gray-400 uppercase tracking-[0.4em] mt-1">{currentUser?.name || 'Guest Node'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setDarkMode(!darkMode)} className="p-3 bg-white dark:bg-white/10 rounded-2xl text-gray-400 hover:text-primary-500 transition-colors shadow-sm border border-emerald-50">
              {darkMode ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
            <button 
              onClick={handleLogout} 
              className="p-3 bg-rose-500 text-white rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
            >
               <LogOut size={18}/>
            </button>
          </div>
        </header>
      )}

      <main className={`flex-1 overflow-y-auto w-full no-scrollbar z-10 relative ${isWizardFlow ? 'p-0 h-screen' : 'px-6 py-10'}`}>
        {renderPortalContent()}
      </main>

      {!isWizardFlow && (
        <nav className="flex-shrink-0 fixed bottom-8 inset-x-6 h-20 glass-card z-[70] flex items-center justify-around px-4 rounded-[2.8rem] shadow-[0_30px_60px_-15px_rgba(16,185,129,0.15)] border border-emerald-100 max-w-xl mx-auto transition-all duration-500">
          {[
            { id: 'home', icon: HomeIcon, label: 'Matrix' },
            { id: 'products', icon: Grid, label: currentUser?.role === UserRole.AGENT ? 'Deploy' : 'Store' },
            { id: 'claim', icon: Zap, label: 'Claim' },
            { id: 'wallet', icon: WalletIcon, label: 'Wallet' },
            { id: 'profile', icon: UserCircle, label: 'Profile' }
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => setPage(item.id)} 
              className={`flex flex-col items-center gap-1.5 flex-1 py-3 transition-all duration-300 tap-feedback ${currentPage === item.id || (currentPage.startsWith('buy') && item.id === 'products') ? 'text-primary-500 scale-110 -translate-y-1' : 'text-gray-400'}`}
            >
              <item.icon size={24} className={currentPage === item.id ? 'drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]' : ''} />
              <span className="text-[0.45rem] font-black uppercase tracking-[0.2em]">{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );

  if (!isMobile && (currentUser || appMode)) {
    return (
      <div className="min-h-screen bg-[#01241d] flex items-center justify-center p-12 overflow-hidden relative transition-all duration-1000 ease-in-out">
        <div className="absolute inset-0 bg-neural-mesh opacity-100"></div>
        <div className="relative w-[440px] h-[880px] bg-white rounded-[5rem] border-[14px] border-[#023129] shadow-[0_60px_120px_-30px_rgba(0,0,0,0.6)] ring-[1px] ring-white/10 overflow-hidden group transition-all duration-700">
          <div className="h-full w-full overflow-hidden rounded-[3.8rem]">
             <AppWrapper />
          </div>
        </div>
        <div className="absolute left-10 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-6 w-80">
           <div className="p-10 glass-card rounded-[3rem] border-white/20 space-y-6 shadow-2xl">
              <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-lg animate-float"><Terminal size={32}/></div>
              <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Hyper-Portal</h4>
              <p className="text-[0.7rem] text-gray-500 font-bold leading-relaxed uppercase tracking-[0.2em]">Logged as: {currentUser?.name || 'Guest'}. Status: Secure.</p>
              <div className="pt-2">
                 <Badge color="emerald">{currentUser?.role || 'NEURAL_NODE'}</Badge>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return <AppWrapper />;
};

const Badge = ({ children, color = "primary" }: { children?: React.ReactNode, color?: string }) => {
  const styles: any = {
    primary: "bg-primary-500/10 text-primary-500 border-primary-500/20",
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-500 border-blue-200",
    amber: "bg-amber-500/10 text-amber-600 border-amber-200",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[0.55rem] font-black uppercase tracking-widest border ${styles[color] || styles.primary}`}>
      {children}
    </span>
  );
};

export default App;
