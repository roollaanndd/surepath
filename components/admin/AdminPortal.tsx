
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Zap, ShieldCheck, 
  Wallet, FileText, Settings, LogOut, Search, 
  ChevronDown, Activity, Radio, Menu, X,
  ShieldAlert, ClipboardCheck, UserCheck, HardDrive, RefreshCw, Globe, ArrowUpRight,
  TrendingUp, Clock, Building2, LockKeyhole, History, Database, BarChart3,
  Bell, Command, PieChart, BarChart, CheckCircle
} from 'lucide-react';
import { 
  BizAdminView, 
  ApprovalsView, 
  SettingsView, 
  InventoryView, 
  SecurityView, 
  LedgerView, 
  AuditLogView,
  ReportsView,
  Badge
} from './AdminViews';
import { UserRole } from '../../types';
import { db } from '../../db';

const StatCard = ({ label, value, trend, icon: Icon, color }: any) => (
  <div className="p-8 bg-white/[0.03] border border-white/5 rounded-[2.5rem] relative overflow-hidden backdrop-blur-sm group hover:border-emerald-500/30 transition-all duration-500 shadow-xl">
    <div className="flex justify-between items-start mb-6">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${color}`}>
        <Icon size={24} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-[0.65rem] font-black ${trend.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
          {trend} <ArrowUpRight size={14} className={trend.startsWith('-') ? 'rotate-90' : ''} />
        </div>
      )}
    </div>
    <p className="text-3xl font-black tracking-tighter leading-none mb-2">{value}</p>
    <p className="text-[0.6rem] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
  </div>
);

const AdminPortal = ({ onLogout, products, setProducts, userRole }: { onLogout: () => void, products: any[], setProducts: any, userRole: UserRole }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'IDR'>('USD');
  const [stats, setStats] = useState({ userCount: 0, policyCount: 0, claimCount: 0, totalPremium: 0 });

  const exchangeRate = 16000;
  
  // Format for summary cards (converted to Millions USD as requested)
  const formatVal = (usdM: number) => {
    if (currency === 'IDR') return `Rp ${(usdM * exchangeRate / 1000).toFixed(1)}T`;
    return `$${usdM}M`;
  };

  const fetchStats = async () => {
      const u = await db.users.count();
      const p = await db.policies.count();
      const c = await db.claims.count();
      const allPolicies = await db.policies.toArray();
      const total = allPolicies.reduce((acc, curr) => acc + curr.premium, 0);
      setStats({ userCount: u, policyCount: p, claimCount: c, totalPremium: total });
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    fetchStats();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard, roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.INSURANCE_ADMIN] },
    { id: 'reports', label: 'Performa', icon: BarChart3, roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE] },
    { id: 'inventory', label: 'Data Master', icon: HardDrive, roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN] },
    { id: 'transactions', label: 'Ledger Vault', icon: Wallet, roles: [UserRole.MASTER_ADMIN, UserRole.FINANCE] },
    { id: 'approvals', label: 'Antrean Polis', icon: ClipboardCheck, roles: [UserRole.MASTER_ADMIN, UserRole.INSURANCE_ADMIN] },
    { id: 'users', label: 'User Matrix', icon: Users, roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN] },
    { id: 'security', label: 'Neural Guard', icon: ShieldAlert, roles: [UserRole.MASTER_ADMIN] },
    { id: 'settings', label: 'Konfigurasi', icon: Settings, roles: [UserRole.MASTER_ADMIN] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(userRole));

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="animate-fade-in space-y-10">
            <div className="flex justify-between items-end">
               <div>
                  <div className="flex items-center gap-3 mb-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                     <p className="text-[0.6rem] font-black text-emerald-500 uppercase tracking-[0.4em]">Global HQ Connection: SECURE</p>
                  </div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter leading-none text-white">SurePath <span className="text-gray-500">Command Center</span></h2>
               </div>
               
               <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 shadow-inner">
                  {(['USD', 'IDR'] as const).map(curr => (
                    <button 
                      key={curr} 
                      onClick={() => setCurrency(curr)}
                      className={`px-6 py-2 rounded-xl text-[0.6rem] font-black uppercase transition-all ${currency === curr ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      {curr}
                    </button>
                  ))}
               </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {/* GWP Target Realignment: 2680M USD and 2267M Actual */}
               <StatCard label="FY2025 Target GWP" value={formatVal(2680)} trend="+18.2%" icon={TrendingUp} color="bg-primary-500/10 text-primary-500" />
               <StatCard label="FY2024 Actual GWP" value={formatVal(2267)} trend="+14.4%" icon={CheckCircle} color="bg-blue-500/10 text-blue-500" />
               <StatCard label="Live Audit Nodes" value={stats.policyCount} trend="+3" icon={Activity} color="bg-emerald-500/10 text-emerald-500" />
               <StatCard label="Market Liquidity" value="94.2%" trend="+0.5%" icon={Zap} color="bg-amber-500/10 text-amber-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2">
                  <ReportsView compact externalCurrency={currency} />
               </div>
               <div className="space-y-8">
                  <Card className="p-8">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Security Audit Feed</h3>
                        <Badge color="rose">Live</Badge>
                     </div>
                     <AuditLogView compact />
                  </Card>
               </div>
            </div>
          </div>
        );
      case 'reports': return <ReportsView externalCurrency={currency} />;
      case 'inventory': return <InventoryView />;
      case 'transactions': return <LedgerView externalCurrency={currency} />;
      case 'approvals': return <ApprovalsView />;
      case 'users': return <BizAdminView section="users" />;
      case 'security': return <SecurityView />;
      case 'settings': return <SettingsView products={products} setProducts={setProducts} />;
      default: return null;
    }
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="mb-12 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
             <Command size={28} />
          </div>
          <div>
             <h1 className="font-black text-2xl tracking-tighter uppercase leading-none">Sure<span className="text-emerald-500">Path</span></h1>
             <span className="text-[0.45rem] font-bold text-gray-500 uppercase tracking-[0.4em]">Administration HQ</span>
          </div>
      </div>

      <nav className="flex-1 space-y-1">
        {filteredMenu.map((item) => (
          <button 
            key={item.id} 
            onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }} 
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all group ${activeTab === item.id ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
          >
            <item.icon size={20} />
            <span className="text-[0.7rem] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto p-5 bg-white/5 rounded-[2rem] border border-white/10 space-y-4">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-black text-xs">{userRole[0]}</div>
            <div className="text-left overflow-hidden">
               <p className="text-xs font-black uppercase truncate">{userRole.replace('_', ' ')}</p>
               <p className="text-[0.5rem] font-bold text-emerald-500 uppercase">Authenticated</p>
            </div>
         </div>
         <button onClick={onLogout} className="w-full py-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all font-black uppercase text-[0.6rem] tracking-widest flex items-center justify-center gap-2">
            <LogOut size={14} /> Exit System
         </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden font-sans">
      {!isMobile && (
        <aside className="w-72 border-r border-white/5 bg-black/40 backdrop-blur-3xl flex flex-col p-8 flex-shrink-0 relative z-20">
           <Sidebar />
        </aside>
      )}

      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 z-[1000] animate-fade-in">
           <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setMobileMenuOpen(false)}></div>
           <aside className="absolute top-0 left-0 bottom-0 w-72 bg-[#0a0a0a] border-r border-white/10 p-8 flex flex-col animate-slide-right">
              <Sidebar />
           </aside>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-24 border-b border-white/5 flex items-center justify-between px-8 lg:px-12 bg-black/20 backdrop-blur-md z-10">
          <div className="flex items-center gap-6">
            {isMobile && <button onClick={() => setMobileMenuOpen(true)} className="p-3 bg-white/5 rounded-xl text-gray-400"><Menu size={20} /></button>}
            <div className="relative">
               <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"/>
               <input className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-xs font-bold outline-none w-64 lg:w-96" placeholder="Search matrix data..." />
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 animate-pulse"><Activity size={20} /></div>
             <button className="p-3 bg-white/5 rounded-xl relative text-gray-400"><Bell size={20} /><span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#050505]"></span></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 lg:p-12 no-scrollbar">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </div>
      </main>
    </div>
  );
};

const Card = ({ children, className }: any) => <div className={`bg-white/[0.03] border border-white/5 rounded-[2.5rem] ${className}`}>{children}</div>;

export default AdminPortal;
