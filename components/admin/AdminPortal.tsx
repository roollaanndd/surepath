
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Zap, ShieldCheck, 
  Wallet, FileText, Settings, LogOut, Search, 
  ChevronDown, Activity, Radio, Menu, X,
  ShieldAlert, ClipboardCheck, UserCheck, HardDrive, RefreshCw, Globe, ArrowUpRight,
  TrendingUp, Clock,
  Building2
} from 'lucide-react';
import { FinanceView, BizAdminView, ApprovalsView, SettingsView, InventoryView, SecurityView, ClaimsListView } from './AdminViews';
import { UserRole } from '../../types';
import { db } from '../../db';

const Badge = ({ children, color = "primary" }: { children?: React.ReactNode, color?: string }) => {
  const styles: any = {
    primary: "bg-primary-500/10 text-primary-500 border-primary-500/20",
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-500 border-blue-200",
    amber: "bg-amber-500/10 text-amber-600 border-amber-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-lg text-[0.45rem] font-black uppercase tracking-widest border ${styles[color] || styles.primary}`}>{children}</span>
  );
};

const StatCard = ({ label, value, trend, icon: Icon, color }: any) => (
  <div className="p-8 bg-white/[0.03] border border-white/5 rounded-[2.5rem] relative overflow-hidden backdrop-blur-sm group hover:border-primary-500/30 transition-all duration-500 shadow-xl">
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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [stats, setStats] = useState({
    userCount: 0,
    policyCount: 0,
    claimCount: 0,
    totalPremium: 0
  });

  const fetchStats = async () => {
      const u = await db.users.count();
      const p = await db.policies.count();
      const c = await db.claims.count();
      const allPolicies = await db.policies.toArray();
      const total = allPolicies.reduce((acc, curr) => acc + curr.premium, 0);
      
      setStats({
          userCount: u,
          policyCount: p,
          claimCount: c,
          totalPremium: total
      });
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
    }
  }, []);

  const getMenuItems = () => {
    const common = [{ id: 'dashboard', label: 'Dasbor Utama', icon: LayoutDashboard }];
    const masterItems = [
      { id: 'security', label: 'Neural Guard (Master)', icon: ShieldAlert },
      { id: 'approvals', label: 'Semua Persetujuan', icon: ClipboardCheck },
      { id: 'claims', label: 'Monitoring Klaim', icon: Activity },
      { id: 'users', label: 'Direktori Pengguna', icon: Users },
      { id: 'settings', label: 'Registri Inti', icon: Settings },
    ];
    const surepathAdminItems = [
      { id: 'approvals', label: 'Manajemen Polis', icon: ClipboardCheck },
      { id: 'claims', label: 'Log Klaim AI', icon: Activity },
      { id: 'users', label: 'Manajemen Pengguna', icon: UserCheck },
      { id: 'transactions', label: 'Traffic Jaringan', icon: Zap },
    ];
    const insuranceAdminItems = [
      { id: 'approvals', label: 'Aplikasi Baru', icon: FileText },
      { id: 'claims', label: 'Antrean Klaim', icon: Activity },
      { id: 'inventory', label: 'Katalog Produk', icon: Building2 },
    ];
    const financeItems = [
      { id: 'ledger', label: 'Buku Besar Keuangan', icon: FileText },
      { id: 'claims', label: 'Pencairan Klaim', icon: Activity },
      { id: 'wallet', label: 'Vault Modal', icon: Wallet },
      { id: 'approvals', label: 'Audit Pembayaran', icon: ClipboardCheck },
    ];
    switch (userRole) {
      case UserRole.MASTER_ADMIN: return [...common, ...masterItems];
      case UserRole.ADMIN: return [...common, ...surepathAdminItems];
      case UserRole.INSURANCE_ADMIN: return [...common, ...insuranceAdminItems];
      case UserRole.FINANCE: return [...common, ...financeItems];
      default: return common;
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-12 px-2">
        <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg"><ShieldCheck size={24} className="text-white" /></div>
        <div>
          <h1 className="font-black text-xl tracking-tighter uppercase leading-none">Sure<span className="text-primary-500">Path</span></h1>
          <span className="text-[0.5rem] font-bold text-gray-500 uppercase tracking-[0.3em]">Command HQ</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar">
        {getMenuItems().map((item) => (
          <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${activeTab === item.id ? 'bg-primary-500/10 text-primary-500 border border-primary-500/20' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
            <item.icon size={20} />
            <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="pt-6 border-t border-white/5 space-y-4">
        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
          <p className="text-[0.5rem] font-black text-gray-500 uppercase tracking-widest mb-1">Session Role</p>
          <p className="text-[0.6rem] font-black uppercase text-white tracking-widest truncate">{userRole.replace('_', ' ')}</p>
        </div>
        <button onClick={onLogout} className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-rose-500 hover:bg-rose-500/10 transition-all font-black uppercase text-[0.6rem] tracking-[0.2em] bg-black/40"><LogOut size={18} /> Keluar</button>
      </div>
    </div>
  );

  const formatMoney = (n: number) => new Intl.NumberFormat('id-ID', { notation: "compact", compactDisplay: "short" }).format(n);

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden font-sans">
      {!isMobile && <aside className="w-72 border-r border-white/5 bg-black/40 backdrop-blur-xl flex flex-col p-6 flex-shrink-0"><SidebarContent /></aside>}
      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] animate-fade-in">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setMobileMenuOpen(false)}></div>
           <aside className="absolute top-0 left-0 bottom-0 w-72 bg-[#0a0a0a] border-r border-white/10 p-6 flex flex-col animate-slide-right"><SidebarContent /></aside>
        </div>
      )}
      <main className="flex-1 flex flex-col min-w-0 bg-grid-pattern relative">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-6 lg:px-10 bg-black/20 backdrop-blur-md z-10">
          <div className="flex items-center gap-4 lg:gap-6 flex-1">
            {isMobile && <button onClick={() => setMobileMenuOpen(true)} className="p-3 bg-white/5 rounded-xl text-gray-400"><Menu size={20} /></button>}
            <div className="relative w-full max-w-sm hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input type="text" placeholder="Cari data..." className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs outline-none focus:border-primary-500/50" />
            </div>
          </div>
          <div className="flex items-center gap-3 lg:gap-6">
            <button onClick={fetchStats} className="p-2.5 text-gray-400 hover:text-white bg-white/5 rounded-xl transition-colors active:rotate-180 duration-500"><RefreshCw size={18} /></button>
            <div className="relative">
              <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-3 pl-2 pr-3 py-2 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all active:scale-95">
                <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center font-black text-xs shadow-inner uppercase">{userRole[0]}</div>
                <ChevronDown size={14} className={`text-gray-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>
              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-[#111] border border-white/10 rounded-2xl shadow-2xl p-2 z-50">
                  <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-500/10 text-[0.6rem] font-black uppercase tracking-widest"><LogOut size={14}/> Log Out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 no-scrollbar">
          <div className="max-w-7xl mx-auto space-y-10">
            {activeTab === 'dashboard' && (
              <div className="animate-fade-in space-y-10">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
                   <div>
                      <p className="text-[0.7rem] font-black text-primary-500 uppercase tracking-[0.4em] mb-2">Pusat Kendali Matriks</p>
                      <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter leading-none">Ringkasan <span className="text-gray-500">Performa</span></h2>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <StatCard label="Premi Bruto (GWP)" value={`Rp ${formatMoney(stats.totalPremium)}`} trend="+Live" icon={Wallet} color="bg-emerald-500/10 text-emerald-500" />
                   <StatCard label="Klaim Diproses" value={stats.claimCount} trend={`+${stats.claimCount}`} icon={Activity} color="bg-rose-500/10 text-rose-500" />
                   <StatCard label="Rata-rata Waktu AI" value="42 Detik" trend="-4s" icon={Clock} color="bg-blue-500/10 text-blue-500" />
                </div>
                <BizAdminView section="transactions" isDashboard={true} userRole={userRole} />
              </div>
            )}
            {activeTab === 'users' && <BizAdminView section="users" userRole={userRole} />}
            {activeTab === 'security' && <SecurityView />}
            {activeTab === 'approvals' && <ApprovalsView />}
            {activeTab === 'claims' && <ClaimsListView />}
            {activeTab === 'inventory' && <InventoryView />}
            {activeTab === 'settings' && <SettingsView products={products} setProducts={setProducts} />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPortal;
