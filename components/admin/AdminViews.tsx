
import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, TrendingDown, Users, Zap, ShieldCheck, 
  CreditCard, ArrowUpRight, Activity, Database, 
  AlertCircle, CheckCircle2, Clock, MapPin, Search,
  Eye, FileText, Download, Filter, MoreHorizontal, User, Briefcase,
  ClipboardCheck, UserCheck, XCircle, CheckCircle, Check, Settings, ShieldAlert,
  HardDrive, Upload, FileUp, Cpu, RefreshCw, Layers, Sliders, Code,
  ChevronRight, Trash2, Smartphone, Plane, Package,
  Car, Lock, Terminal, Shield, ShieldX, Radio, Server,
  Fingerprint, ZapOff, Globe, Wallet, CheckSquare, Plus, Calendar, MoreVertical, X, FileDown,
  Gift, Percent, Landmark
} from 'lucide-react';
import { getSecurityPulse, getRecentThreats, generateLiveThreat, ThreatNode } from '../../services/NeuralGuardService';
import { db, User as DBUser, Policy, Transaction, AuditLog } from '../../db';
import { formatIDR } from '../car-wizard/WizardUI';

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
const USD_TO_IDR = 16000;

// NEW FINANCIAL CONSTANTS
// GWP 2024: 2267M, GWP 2025: 2680M
const FINANCIAL_REPORTS = {
  "2024": {
    gwp: [175, 182, 178, 185, 192, 188, 205, 195, 185, 198, 190, 194], // Total: 2267
    commission: [], // Calculated 25%
    promo: [],       // Calculated 10%
    others: [],      // Calculated 5%
    claims: [15.2, 18.4, 17.5, 20.1, 19.8, 22.4, 25.1, 23.2, 21.5, 24.0, 20.8, 22.1]
  },
  "2025": {
    gwp: [210, 225, 215, 230, 220, 245, 235, 228, 218, 212, 215, 227], // Total: 2680
    commission: [], // Calculated 25%
    promo: [],       // Calculated 10%
    others: [],      // Calculated 5%
    claims: [24.5, 28.1, 26.8, 30.2, 28.5, 34.0, 31.8, 29.5, 27.2, 26.4, 25.8, 27.5]
  }
};

// Auto-calculate ratios
(["2024", "2025"] as const).forEach(year => {
    FINANCIAL_REPORTS[year].commission = FINANCIAL_REPORTS[year].gwp.map(v => v * 0.25);
    FINANCIAL_REPORTS[year].promo = FINANCIAL_REPORTS[year].gwp.map(v => v * 0.10);
    FINANCIAL_REPORTS[year].others = FINANCIAL_REPORTS[year].gwp.map(v => v * 0.05);
});

const downloadCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => 
    Object.values(obj).map(val => 
      typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
    ).join(',')
  );
  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().getTime()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const Card: React.FC<{ children?: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
  <div className={`p-8 bg-white/[0.03] border border-white/5 rounded-[3rem] relative overflow-hidden backdrop-blur-sm group hover:border-primary-500/30 transition-all duration-500 shadow-xl ${className}`}>
    {children}
  </div>
);

export const Badge = ({ children, color = "primary" }: { children?: React.ReactNode, color?: string }) => {
  const styles: any = {
    primary: "bg-primary-500/10 text-primary-500 border-primary-500/20",
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    rose: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    yellow: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    indigo: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[0.5rem] font-black uppercase tracking-widest border ${styles[color] || styles.primary}`}>
      {children}
    </span>
  );
};

const StatCard = ({ label, value, trend, icon: Icon, color }: any) => (
  <Card>
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
  </Card>
);

export const BizAdminView = ({ isDashboard, section }: { isDashboard?: boolean, section?: string }) => {
  const [users, setUsers] = useState<DBUser[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);

  useEffect(() => {
    const fetchData = async () => {
        const allUsers = await db.users.toArray();
        const allPolicies = await db.policies.toArray();
        setUsers(allUsers);
        setPolicies(allPolicies);
    };
    fetchData();
  }, [section]);

  if (section === 'transactions') {
     return (
        <div className="space-y-8 animate-fade-in">
           <Card>
              <h3 className="font-black uppercase tracking-widest text-sm mb-6">Live Policy Deployment Traffic</h3>
              <div className="space-y-4">
                 {policies.map((p, i) => (
                    <div key={i} className="p-4 bg-white/5 rounded-2xl flex items-center justify-between border border-white/5">
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                             <ShieldCheck size={20}/>
                          </div>
                          <div>
                             <p className="text-xs font-black uppercase">{p.policyNumber}</p>
                             <p className="text-[0.5rem] text-gray-500 uppercase tracking-widest">{p.type} • {p.providerId}</p>
                          </div>
                       </div>
                       <p className="text-sm font-black tracking-tighter text-primary-500">{formatIDR(p.premium)}</p>
                    </div>
                 ))}
              </div>
           </Card>
        </div>
     )
  }

  return (
  <div className="space-y-8 animate-fade-in">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard label="Active Policies" value={policies.length} trend={`+${policies.length}`} icon={FileText} color="bg-primary-500/10 text-primary-500" />
      <StatCard label="Partner Nodes" value="842" trend="+12" icon={Users} color="bg-blue-500/10 text-blue-500" />
      <StatCard label="Conversion Rate" value="18.4%" trend="+2.1%" icon={TrendingUp} color="bg-emerald-500/10 text-emerald-500" />
    </div>
    {!isDashboard && (section === 'users') && (
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black uppercase tracking-widest text-sm">User Directory</h3>
          <div className="flex items-center gap-3">
             <span className="text-[0.6rem] font-bold text-gray-500 uppercase tracking-widest">{users.length} Users Synced</span>
             <Search size={18} className="text-gray-500"/>
          </div>
        </div>
        <div className="space-y-4 max-h-[500px] overflow-y-auto no-scrollbar">
          {users.map((u, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-primary-500/20 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center font-black text-xs text-white shadow-lg">{u.name[0]}</div>
                <div>
                  <p className="text-xs font-black uppercase text-white">{u.name}</p>
                  <p className="text-[0.5rem] text-gray-500 uppercase tracking-widest">{u.role} • {u.nodeId}</p>
                </div>
              </div>
              <div className="text-right">
                 <Badge color={u.verified ? "blue" : "yellow"}>{u.verified ? 'Verified' : 'Pending'}</Badge>
                 <p className="text-[0.4rem] font-mono text-gray-500 mt-1 uppercase tracking-wider">{new Date(u.memberSince).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    )}
  </div>
)};

export const SecurityView = () => {
  const [pulse, setPulse] = useState(getSecurityPulse());
  const [threats, setThreats] = useState<ThreatNode[]>(getRecentThreats());
  const [activeTraffic, setActiveTraffic] = useState<number[]>(Array(40).fill(0).map(() => 20 + Math.random() * 40));
  const [lastNotification, setLastNotification] = useState<string | null>(null);

  const updatePulse = useCallback(() => {
    setPulse(getSecurityPulse());
    setActiveTraffic(prev => [...prev.slice(1), 20 + Math.random() * 60]);
    
    if (Math.random() > 0.9) {
      const newThreat = generateLiveThreat();
      setThreats(prev => [newThreat, ...prev.slice(0, 4)]);
      setLastNotification(`${newThreat.type} Neutralized from ${newThreat.ip}`);
      setTimeout(() => setLastNotification(null), 3000);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(updatePulse, 2000);
    return () => clearInterval(interval);
  }, [updatePulse]);

  return (
    <div className="space-y-8 animate-fade-in relative">
       {lastNotification && (
         <div className="fixed top-24 right-10 z-[100] animate-pop-in">
            <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(16,185,129,0.4)] flex items-center gap-4 border border-white/20">
               <ShieldCheck size={20} className="animate-pulse"/>
               <div className="space-y-0.5">
                  <p className="text-[0.55rem] font-black uppercase tracking-[0.2em] opacity-80">Neural Guard Active</p>
                  <p className="text-xs font-bold tracking-tight">{lastNotification}</p>
               </div>
            </div>
         </div>
       )}

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Live Threats Blocked" value={pulse.threatsBlocked24h.toLocaleString()} trend={`+${Math.floor(Math.random() * 5)}`} icon={ShieldAlert} color="bg-primary-500/10 text-primary-500" />
          <StatCard label="Neural Load" value={`${pulse.neuralLoad.toFixed(2)}%`} trend="-0.4%" icon={Cpu} color="bg-blue-500/10 text-blue-500" />
          <StatCard label="AI Shield Latency" value="0.38ms" trend="-0.01" icon={Zap} color="bg-orange-500/10 text-orange-500" />
          <StatCard label="Global Uptime" value={pulse.globalUptime} icon={Globe} color="bg-emerald-500/10 text-emerald-500" />
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
             <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-500"><Terminal size={20}/></div>
                   <div>
                      <h3 className="font-black uppercase tracking-widest text-sm">Real-time Traffic Neural Mesh</h3>
                      <p className="text-[0.5rem] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">24/7 Backend Protection Monitoring</p>
                   </div>
                </div>
             </div>
             
             <div className="h-56 flex items-end gap-1 px-2 border-b border-white/5 pb-1">
                {activeTraffic.map((h, i) => (
                   <div 
                     key={i} 
                     className="flex-1 bg-primary-500 transition-all duration-700 rounded-t-sm" 
                     style={{ 
                       height: `${h}%`, 
                       opacity: 0.1 + (i / 40) * 0.9,
                       boxShadow: h > 70 ? '0 0 15px rgba(16, 185, 129, 0.3)' : 'none'
                     }}
                   ></div>
                ))}
             </div>
          </Card>

          <Card>
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500"><ShieldX size={20}/></div>
                   <h3 className="font-black uppercase tracking-widest text-sm">Mitigation Log</h3>
                </div>
                <Badge color="rose">Live Feed</Badge>
             </div>
             <div className="space-y-4">
                {threats.map((t, i) => (
                   <div key={i} className={`p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all animate-fade-in ${i === 0 ? 'border-primary-500/40 bg-primary-500/5' : ''}`}>
                      <div className="space-y-1 overflow-hidden">
                         <div className="flex items-center gap-2">
                            <Badge color={t.type === 'HIJACKING_ATTEMPT' ? 'rose' : 'yellow'}>{t.type.split('_')[0]}</Badge>
                            <span className="text-[0.6rem] font-mono text-gray-500 truncate">{t.ip}</span>
                         </div>
                         <p className="text-[0.5rem] font-bold text-gray-500 uppercase tracking-widest">{t.timestamp} • AI-Neutralized</p>
                      </div>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-primary-500 text-white animate-bounce' : 'bg-emerald-500/10 text-emerald-500'}`}>
                         <Check size={16} strokeWidth={3}/>
                      </div>
                   </div>
                ))}
             </div>
          </Card>
       </div>
    </div>
  );
};

export const ReportsView = ({ compact, externalCurrency }: { compact?: boolean, externalCurrency?: 'USD' | 'IDR' }) => {
  const [year, setYear] = useState<"2024" | "2025">("2025");
  const [metric, setMetric] = useState<"gwp" | "commission" | "promo" | "others" | "claims">("gwp");
  const [currency, setCurrency] = useState<'USD' | 'IDR'>(externalCurrency || 'USD');

  useEffect(() => {
    if (externalCurrency) setCurrency(externalCurrency);
  }, [externalCurrency]);

  const data = FINANCIAL_REPORTS[year][metric];
  const maxVal = Math.max(...data);

  const getMetricLabel = () => {
    const unit = currency === 'USD' ? 'USD Million' : 'IDR Trillion';
    if (metric === "gwp") return `Gross Written Premium (${unit})`;
    if (metric === "commission") return `Commission Matrix (25%) (${unit})`;
    if (metric === "promo") return `Promotional Allocation (10%) (${unit})`;
    if (metric === "others") return `Operational Expenses (5%) (${unit})`;
    return `Neural Claim Payouts (${unit})`;
  };

  const formatDisplay = (val: number) => {
    if (currency === 'IDR') return `Rp ${(val * USD_TO_IDR / 1000).toFixed(2)}T`;
    return `$${val}M`;
  };

  const getYearTotal = () => {
     const sum = data.reduce((a,b) => a + b, 0);
     return formatDisplay(sum);
  };

  const handleExport = () => {
    const csvData = MONTHS.map((m, i) => ({
      Month: m,
      Year: year,
      Currency: currency,
      GWP_M: FINANCIAL_REPORTS[year].gwp[i],
      Commission_M: FINANCIAL_REPORTS[year].commission[i],
      Promo_M: FINANCIAL_REPORTS[year].promo[i],
      Others_M: FINANCIAL_REPORTS[year].others[i],
      Claims_M: FINANCIAL_REPORTS[year].claims[i]
    }));
    downloadCSV(csvData, `SurePath_Finance_${year}_${currency}`);
  };

  return (
    <div className={`space-y-8 ${compact ? '' : 'animate-fade-in text-white'}`}>
       {!compact && (
          <div className="flex flex-col lg:flex-row justify-between items-end gap-6 mb-4">
             <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Performance <span className="text-primary-500">Analytics</span></h2>
                <p className="text-[0.6rem] font-bold text-gray-500 uppercase tracking-widest mt-1">Multi-Year Financial Matrix Decomposition</p>
             </div>
             <div className="flex gap-4">
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                   {(["2024", "2025"] as const).map(y => (
                      <button 
                        key={y} 
                        onClick={() => setYear(y)}
                        className={`px-6 py-3 rounded-xl text-[0.65rem] font-black uppercase transition-all ${year === y ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                      >
                         FY {y}
                      </button>
                   ))}
                </div>
                {!externalCurrency && (
                   <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                      {(['USD', 'IDR'] as const).map(c => (
                        <button key={c} onClick={() => setCurrency(c)} className={`px-4 py-3 rounded-xl text-[0.6rem] font-black transition-all ${currency === c ? 'bg-white/10 text-white' : 'text-gray-500'}`}>{c}</button>
                      ))}
                   </div>
                )}
                <button onClick={handleExport} className="flex items-center gap-3 px-6 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase text-[0.6rem] tracking-widest hover:bg-white/10 transition-all">
                   <FileDown size={18}/> Export Excel
                </button>
             </div>
          </div>
       )}

       <Card className={compact ? 'p-0 bg-transparent border-0 shadow-none' : ''}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
             <div className="space-y-2">
                <p className="text-[0.65rem] font-black text-primary-500 uppercase tracking-[0.4em]">{getMetricLabel()}</p>
                <h3 className="text-4xl font-black tracking-tighter">{getYearTotal()}</h3>
             </div>
             
             <div className="flex flex-wrap bg-white/5 p-1 rounded-2xl border border-white/5">
                {[
                  { id: 'gwp', label: 'GWP', icon: Wallet },
                  { id: 'commission', label: 'Comm', icon: TrendingUp },
                  { id: 'promo', label: 'Promo', icon: Gift },
                  { id: 'others', label: 'Exp', icon: Percent },
                  { id: 'claims', label: 'Claims', icon: Zap }
                ].map(m => (
                   <button 
                     key={m.id} 
                     onClick={() => setMetric(m.id as any)}
                     className={`flex items-center gap-2 px-4 py-3 rounded-xl text-[0.6rem] font-black uppercase transition-all ${metric === m.id ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                   >
                      <m.icon size={14}/>
                      {m.label}
                   </button>
                ))}
             </div>
          </div>

          <div className="relative h-[320px] w-full flex items-end justify-between px-2 gap-2 md:gap-4 group/chart">
             <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
                {[1,2,3,4].map(i => <div key={i} className="w-full border-t border-white"></div>)}
             </div>

             {data.map((val, i) => {
                const height = (val / maxVal) * 100;
                const metricColors: any = {
                    gwp: 'bg-primary-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]',
                    commission: 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]',
                    promo: 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]',
                    others: 'bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)]',
                    claims: 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                };
                return (
                   <div key={i} className="flex-1 flex flex-col items-center gap-3 group/bar">
                      <div className="relative w-full h-[250px] flex items-end">
                         <div 
                           className={`w-full rounded-t-xl transition-all duration-1000 ease-out relative overflow-hidden ${metricColors[metric]}`}
                           style={{ height: `${height}%`, transitionDelay: `${i * 50}ms` }}
                         >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                         </div>
                         
                         <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white text-slate-900 px-3 py-1.5 rounded-lg text-[0.65rem] font-black shadow-2xl opacity-0 group-hover/bar:opacity-100 transition-all pointer-events-none whitespace-nowrap z-30">
                            {formatDisplay(val)}
                         </div>
                      </div>
                      <span className="text-[0.6rem] font-black text-gray-500 uppercase tracking-widest">{MONTHS[i]}</span>
                   </div>
                );
             })}
          </div>
       </Card>
    </div>
  );
};

export const LedgerView = ({ externalCurrency }: { externalCurrency?: 'USD' | 'IDR' }) => {
    const [txs, setTxs] = useState<Transaction[]>([]);
    const [year, setYear] = useState<"2024" | "2025">("2025");
    const [currency, setCurrency] = useState<'USD' | 'IDR'>(externalCurrency || 'USD');
    
    useEffect(() => {
        if (externalCurrency) setCurrency(externalCurrency);
    }, [externalCurrency]);

    useEffect(() => {
        db.transactions.toArray().then(res => setTxs(res.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())));
    }, []);

    const convert = (usdM: number) => {
        if (currency === 'IDR') return `Rp ${(usdM * USD_TO_IDR / 1000).toFixed(2)}T`;
        return `$${usdM}M`;
    };

    const handleExport = () => {
        const data = txs.map(t => ({
            ID: t.id,
            Date: t.date,
            Type: t.type,
            Amount: t.amount,
            Status: t.status,
            Reference: t.referenceId,
            Description: t.description
        }));
        downloadCSV(data, `SurePath_Finance_Ledger_${currency}`);
    };

    return (
        <div className="space-y-8 text-white">
           <div className="flex flex-col lg:flex-row justify-between items-end gap-6 mb-4">
              <div>
                 <h2 className="text-3xl font-black uppercase tracking-tighter">Vault <span className="text-emerald-500">Registry</span></h2>
                 <p className="text-[0.6rem] font-bold text-gray-500 uppercase tracking-widest mt-1">Real-time Node Transaction Reconciliation</p>
              </div>
              <div className="flex gap-4">
                 <button onClick={handleExport} className="flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase text-[0.6rem] tracking-widest shadow-xl shadow-emerald-500/10 active:scale-95 transition-all">
                    <FileDown size={18}/> Download Ledger (Excel)
                 </button>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                 <Card>
                    <div className="flex justify-between items-center mb-8">
                       <h3 className="text-sm font-black uppercase tracking-widest">Monthly Financial Performance Audit</h3>
                       <div className="flex gap-4">
                          <div className="flex bg-white/5 p-1 rounded-xl">
                             {(["2024", "2025"] as const).map(y => (
                                <button key={y} onClick={() => setYear(y)} className={`px-4 py-1.5 rounded-lg text-[0.6rem] font-black uppercase transition-all ${year === y ? 'bg-primary-500 text-white' : 'text-gray-500'}`}>{y}</button>
                             ))}
                          </div>
                       </div>
                    </div>
                    
                    <div className="overflow-x-auto no-scrollbar">
                       <table className="w-full text-left">
                          <thead>
                             <tr className="text-[0.55rem] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                                <th className="pb-4 pl-4">Month Cycle</th>
                                <th className="pb-4">GWP</th>
                                <th className="pb-4">Comm (25%)</th>
                                <th className="pb-4">Promo (10%)</th>
                                <th className="pb-4">Others (5%)</th>
                                <th className="pb-4">Claims</th>
                                <th className="pb-4 text-right pr-4">Health</th>
                             </tr>
                          </thead>
                          <tbody className="text-[0.7rem] font-bold">
                             {MONTHS.map((m, i) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                   <td className="py-4 pl-4 uppercase text-white font-black">{m} {year}</td>
                                   <td className="py-4 text-primary-500 font-mono">{convert(FINANCIAL_REPORTS[year].gwp[i])}</td>
                                   <td className="py-4 text-blue-400 font-mono">{convert(FINANCIAL_REPORTS[year].commission[i])}</td>
                                   <td className="py-4 text-emerald-400 font-mono">{convert(FINANCIAL_REPORTS[year].promo[i])}</td>
                                   <td className="py-4 text-indigo-400 font-mono">{convert(FINANCIAL_REPORTS[year].others[i])}</td>
                                   <td className="py-4 text-rose-500 font-mono">{convert(FINANCIAL_REPORTS[year].claims[i])}</td>
                                   <td className="py-4 text-right pr-4">
                                      <div className="flex items-center justify-end gap-2 text-emerald-500">
                                         <CheckCircle2 size={12}/>
                                      </div>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </Card>
              </div>

              <div className="space-y-6">
                 <Card className="bg-primary-500/5 border-primary-500/10">
                    <div className="flex items-center gap-4 mb-6">
                       <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center text-white shadow-lg"><Activity size={20}/></div>
                       <h3 className="text-sm font-black uppercase tracking-tight">System Audit</h3>
                    </div>
                    <div className="space-y-4">
                       <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                          <p className="text-[0.5rem] font-black text-gray-400 uppercase tracking-widest">Total GWP FY {year}</p>
                          <p className="text-2xl font-black text-white">{convert(FINANCIAL_REPORTS[year].gwp.reduce((a,b)=>a+b,0))}</p>
                       </div>
                       <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                          <p className="text-[0.5rem] font-black text-gray-400 uppercase tracking-widest">Combined Ratio</p>
                          <p className="text-2xl font-black text-emerald-500">~52.5%</p>
                       </div>
                    </div>
                 </Card>
                 
                 <Card>
                    <h3 className="text-xs font-black uppercase tracking-widest mb-6">Expense Decomposition</h3>
                    <div className="space-y-3">
                       <div className="p-3 bg-white/5 rounded-xl flex justify-between items-center">
                          <span className="text-[0.6rem] font-black uppercase text-blue-400">Commission</span>
                          <span className="text-xs font-mono">25%</span>
                       </div>
                       <div className="p-3 bg-white/5 rounded-xl flex justify-between items-center">
                          <span className="text-[0.6rem] font-black uppercase text-emerald-400">Promo</span>
                          <span className="text-xs font-mono">10%</span>
                       </div>
                       <div className="p-3 bg-white/5 rounded-xl flex justify-between items-center">
                          <span className="text-[0.6rem] font-black uppercase text-indigo-400">Others</span>
                          <span className="text-xs font-mono">5%</span>
                       </div>
                    </div>
                 </Card>
              </div>
           </div>
        </div>
    );
};

export const AuditLogView = ({ compact }: { compact?: boolean }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    useEffect(() => { db.auditLogs.toArray().then(res => setLogs(res.sort((a,b) => (b.id||0) - (a.id||0)).slice(0, compact ? 10 : 50))); }, [compact]);
    return (
        <div className="space-y-4">
           {logs.map(log => (
              <div key={log.id} className="flex gap-4 items-start p-4 bg-white/[0.02] rounded-2xl border border-white/5 hover:bg-white/5 transition-all">
                 <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 animate-pulse ${log.domain === 'SECURITY' ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-primary-500 shadow-[0_0_8px_#f97316]'}`}></div>
                 <div className="min-w-0">
                    <p className="text-[0.65rem] font-bold text-gray-300 leading-tight"><span className="text-primary-500 uppercase font-black">{log.actor.split('@')[0]}</span> {log.action}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                       <Badge color={log.domain === 'SECURITY' ? 'rose' : 'blue'}>{log.domain}</Badge>
                       <span className="text-[0.5rem] font-mono text-gray-600 uppercase tracking-widest">{new Date(log.timestamp).toLocaleTimeString('id-ID')}</span>
                    </div>
                 </div>
              </div>
           ))}
        </div>
    );
};

export const ApprovalsView = () => {
    const [policies, setPolicies] = useState<Policy[]>([]);
    useEffect(() => {
        db.policies.where('status').equals('PENDING').toArray().then(setPolicies);
    }, []);

    return (
        <div className="space-y-8 animate-fade-in text-white">
            <Card>
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500"><ClipboardCheck size={22}/></div>
                <h3 className="font-black uppercase tracking-widest text-sm">Policy Approval Queue</h3>
                </div>
                <Badge color="yellow">{policies.length} Pending</Badge>
            </div>
            <div className="space-y-4">
                {policies.map(p => (
                <div key={p.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-[1.8rem] flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100/10 rounded-2xl flex items-center justify-center text-gray-400"><FileText size={24}/></div>
                    <div>
                        <p className="font-black text-sm uppercase">{p.policyNumber}</p>
                        <p className="text-[0.55rem] text-gray-500 font-bold uppercase tracking-widest">Type: {p.type} • Value: {formatIDR(p.premium)}</p>
                    </div>
                    </div>
                    <div className="flex items-center gap-2">
                    <button className="p-3 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><XCircle size={18}/></button>
                    <button 
                        onClick={async () => {
                            await db.policies.update(p.id!, { status: 'ACTIVE' });
                            db.policies.where('status').equals('PENDING').toArray().then(setPolicies);
                        }}
                        className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                    >
                        <CheckCircle size={18}/>
                    </button>
                    </div>
                </div>
                ))}
            </div>
            </Card>
        </div>
    );
}

export const InventoryView = () => (
  <div className="space-y-8 animate-fade-in text-white">
    <Card>
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-500"><HardDrive size={22}/></div>
          <h3 className="font-black uppercase tracking-widest text-sm">Active Matrix Inventory</h3>
        </div>
        <button className="p-2 text-gray-500 hover:text-white transition-all"><RefreshCw size={18}/></button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 text-[0.55rem] font-black uppercase text-gray-500 tracking-[0.2em]">
              <th className="pb-4 pl-4">Asset Matrix</th>
              <th className="pb-4">Status</th>
              <th className="pb-4">Risk Rating</th>
              <th className="pb-4 text-right pr-4">Action</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {[1,2,3,4,5].map(i => (
              <tr key={i} className="border-b border-white/[0.02] group hover:bg-white/[0.01]">
                <td className="py-4 pl-4">
                  <div className="flex items-center gap-3">
                    <Car size={16} className="text-gray-400"/>
                    <span className="font-black uppercase">Unit-A0{i} (Matrix)</span>
                  </div>
                </td>
                <td className="py-4"><Badge color="emerald">Active</Badge></td>
                <td className="py-4 font-mono">0.122-LOW</td>
                <td className="py-4 text-right pr-4"><button className="text-gray-500 hover:text-white"><Eye size={14}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  </div>
);

export const SettingsView = ({ products, setProducts }: { products: any[], setProducts: any }) => {
  const toggleProduct = (id: string) => {
    setProducts(products.map((p: any) => p.id === id ? { ...p, active: !p.active } : p));
  };

  return (
    <div className="space-y-8 animate-fade-in text-white">
       <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-500"><Settings size={22}/></div>
          <h3 className="font-black uppercase tracking-widest text-sm">Neural Product Configuration</h3>
       </div>
       <div className="grid gap-4">
          {products.map(p => (
            <Card key={p.id} className="flex items-center justify-between py-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 ${p.color}`}><p.icon size={24}/></div>
                <div>
                  <p className="font-black uppercase text-sm">{p.label}</p>
                  <p className="text-[0.6rem] font-bold text-gray-500 uppercase tracking-widest">{p.active ? 'Deployment Active' : 'Neural Core Standby'}</p>
                </div>
              </div>
              <button 
                onClick={() => toggleProduct(p.id)}
                className={`px-8 py-3 rounded-2xl text-[0.65rem] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 ${p.active ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-primary-500 text-white shadow-primary-500/20'}`}
              >
                {p.active ? 'Shut Down' : 'Initialize'}
              </button>
            </Card>
          ))}
       </div>
    </div>
  );
};
