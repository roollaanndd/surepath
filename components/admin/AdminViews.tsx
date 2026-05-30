
import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Users, Zap, ShieldCheck,
  ArrowUpRight, Activity,
  CheckCircle2, Search,
  Eye, FileText,
  ClipboardCheck, XCircle, CheckCircle, Check, Settings, ShieldAlert,
  HardDrive, Cpu, RefreshCw,

  Car, Terminal, ShieldX,
  Globe, FileDown, Upload, Plus,
  UserPlus, ChevronDown, Pencil
} from 'lucide-react';
import { getSecurityPulse, getRecentThreats, generateLiveThreat, ThreatNode } from '../../services/NeuralGuardService';
import { db, Policy, Transaction, AuditLog, CustomProduct, User } from '../../db';
import {
  getAllAgents, getAllClaims, updateAgentVerification, updateAgentCommissionRate,
  type SpUser, type SpClaim,
} from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';
import { UserRole } from '../../types';

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];

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
  const [users, setUsers] = useState<any[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
        const allUsers = await db.users.toArray();
        const allPolicies = await db.policies.toArray();
        setPolicies(allPolicies);

        if (section === 'users') {
           const allTx = await db.transactions.toArray();
           const stats: any = {};
           
           allTx.forEach(tx => {
               if (!stats[tx.userId]) stats[tx.userId] = { sales: 0, commission: 0 };
               if (tx.type === 'PAYMENT') stats[tx.userId].sales += tx.amount;
               if (tx.type === 'COMMISSION') stats[tx.userId].commission += tx.amount;
           });
           
           // Map stats to users and sort by sales descending
           const mappedUsers = allUsers.map(u => ({
              ...u,
              totalSales: stats[u.id!]?.sales || 0,
              totalCommission: stats[u.id!]?.commission || 0
           })).sort((a, b) => b.totalSales - a.totalSales);

           setUsers(mappedUsers);
        } else {
           setUsers(allUsers);
        }
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

  const filteredUsers = searchTerm ? users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())) : users;

  return (
  <div className="space-y-8 animate-fade-in">
    {isDashboard && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Active Policies" value={policies.length} trend={`+${policies.length}`} icon={FileText} color="bg-primary-500/10 text-primary-500" />
        <StatCard label="Partner Nodes" value={users.length} trend="+12" icon={Users} color="bg-blue-500/10 text-blue-500" />
        <StatCard label="Conversion Rate" value="18.4%" trend="+2.1%" icon={TrendingUp} color="bg-emerald-500/10 text-emerald-500" />
      </div>
    )}
    
    {!isDashboard && (section === 'users') && (
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black uppercase tracking-widest text-sm">Direktori Partner (Top Aktif)</h3>
          <div className="flex items-center gap-3">
             <span className="text-[0.6rem] font-bold text-gray-500 uppercase tracking-widest">{users.length} Total Terdaftar</span>
             <div className="relative">
                <Search size={14} className="text-gray-500 absolute left-3 top-1/2 -translate-y-1/2"/>
                <input 
                  type="text" 
                  placeholder="Cari user..." 
                  className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-primary-500 transition-all font-mono"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
        </div>
        <div className="overflow-x-auto no-scrollbar">
           <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-white/5 text-[0.55rem] font-black uppercase text-gray-500 tracking-[0.2em]">
                  <th className="pb-4 pl-4">Partner Info</th>
                  <th className="pb-4">No. HP</th>
                  <th className="pb-4">Sales (GWP)</th>
                  <th className="pb-4">Komisi (25%)</th>
                  <th className="pb-4 text-right pr-4">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {filteredUsers.slice(0, 200).map((u, i) => (
                  <tr key={i} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                    <td className="py-4 pl-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-emerald-500 flex items-center justify-center font-black text-xs text-white shadow-lg">{u.name[0]}</div>
                        <div>
                          <p className="text-xs font-black uppercase text-white">{u.name}</p>
                          <p className="text-[0.5rem] text-gray-500 tracking-widest">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 font-mono text-[0.6rem] text-gray-400">{u.phone}</td>
                    <td className="py-4 font-black text-emerald-500">{formatIDR(u.totalSales || 0)}</td>
                    <td className="py-4 font-black text-amber-500">{formatIDR(u.totalCommission || 0)}</td>
                    <td className="py-4 text-right pr-4">
                       <Badge color={u.totalSales > 0 ? "emerald" : "gray"}>{u.totalSales > 0 ? 'Active Seller' : 'Registered'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
           {filteredUsers.length > 200 && (
             <div className="p-4 text-center text-xs text-gray-500 font-bold uppercase tracking-widest">
               Menampilkan Top 200 dari {filteredUsers.length} Partner. Gunakan pencarian untuk User lainnya.
             </div>
           )}
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
                  <p className="text-[0.55rem] font-black uppercase tracking-[0.2em] opacity-80">Sistem Keamanan Aktif</p>
                  <p className="text-xs font-bold tracking-tight">{lastNotification}</p>
               </div>
            </div>
         </div>
       )}

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Celah Keamanan Difilter" value={pulse.threatsBlocked24h.toLocaleString()} trend={`+${Math.floor(Math.random() * 5)}`} icon={ShieldAlert} color="bg-primary-500/10 text-primary-500" />
          <StatCard label="Beban Sistem" value={`${pulse.neuralLoad.toFixed(2)}%`} trend="-0.4%" icon={Cpu} color="bg-blue-500/10 text-blue-500" />
          <StatCard label="Latensi Server" value="0.38ms" trend="-0.01" icon={Zap} color="bg-orange-500/10 text-orange-500" />
          <StatCard label="Uptime Server" value={pulse.globalUptime} icon={Globe} color="bg-emerald-500/10 text-emerald-500" />
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
             <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-500"><Terminal size={20}/></div>
                   <div>
                      <h3 className="font-black uppercase tracking-widest text-sm">Monitoring Trafik Real-time</h3>
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
                   <h3 className="font-black uppercase tracking-widest text-sm">Log Mitigasi</h3>
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
                         <p className="text-[0.5rem] font-bold text-gray-500 uppercase tracking-widest">{t.timestamp} • Auto-Neutralized</p>
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

export const LedgerView = () => {
    const [txs, setTxs] = useState<Transaction[]>([]);
    
    useEffect(() => {
        db.transactions.toArray().then(res => setTxs(res.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())));
    }, []);

    const convert = (val: number) => {
        return `Rp ${(val).toLocaleString('id-ID')}`;
    };

    const handleExport = () => {
        const data = txs.map(t => ({
            ID: t.id,
            Tanggal: t.date,
            Tipe: t.type,
            Jumlah: t.amount,
            Status: t.status,
            Ref: t.referenceId,
            Deskripsi: t.description
        }));
        downloadCSV(data, `Buku_Besar_Transaksi`);
    };

    return (
        <div className="space-y-8 animate-fade-in text-white">
           <div className="flex flex-col lg:flex-row justify-between items-end gap-6 mb-4">
              <div>
                 <h2 className="text-3xl font-black uppercase tracking-tighter">Buku <span className="text-emerald-500">Besar</span></h2>
                 <p className="text-[0.6rem] font-bold text-gray-500 uppercase tracking-widest mt-1">Sistem Pencatatan Transaksi Real-time</p>
              </div>
              <div className="flex gap-4">
                 <button onClick={handleExport} className="flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase text-[0.6rem] tracking-widest shadow-xl shadow-emerald-500/10 active:scale-95 transition-all">
                    <FileDown size={18}/> Unduh Excel
                 </button>
              </div>
           </div>

           <Card>
              <div className="overflow-x-auto no-scrollbar">
                 <table className="w-full text-left min-w-[600px]">
                    <thead>
                       <tr className="text-[0.55rem] font-black text-gray-500 uppercase tracking-widest border-b border-white/5">
                          <th className="pb-4 pl-4">Tanggal</th>
                          <th className="pb-4">Tipe Transaksi</th>
                          <th className="pb-4">Deskripsi</th>
                          <th className="pb-4">Jumlah (Rp)</th>
                          <th className="pb-4 text-right pr-4">Status</th>
                       </tr>
                    </thead>
                    <tbody className="text-[0.7rem] font-bold">
                       {txs.slice(0, 100).map((t, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                             <td className="py-4 pl-4 text-gray-400">{new Date(t.date).toLocaleString('id-ID')}</td>
                             <td className="py-4 text-primary-500 font-mono">{t.type}</td>
                             <td className="py-4 text-white max-w-xs truncate" title={t.description}>{t.description}</td>
                             <td className="py-4 font-mono">{t.type === 'COMMISSION' || t.type === 'CLAIM_PAYOUT' || t.type === 'WITHDRAWAL' ? <span className="text-rose-500">-{convert(t.amount)}</span> : <span className="text-emerald-500">+{convert(t.amount)}</span>}</td>
                             <td className="py-4 text-right pr-4">
                                <Badge color={t.status === 'SUCCESS' ? 'emerald' : t.status === 'PENDING' ? 'yellow' : 'rose'}>{t.status}</Badge>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </Card>
        </div>
    );
};

export const ReportsView = ({ compact }: { compact?: boolean }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [viewType, setViewType] = useState<'daily'|'monthly'|'yearly'>('monthly');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        db.transactions.toArray().then(setTransactions);
    }, []);

    const convert = (val: number) => {
        if(val === 0) return '-';
        return `Rp ${(val / 1000000).toLocaleString('id-ID', {minimumFractionDigits: 1, maximumFractionDigits: 1})}Jt`;
    };

    const getAggregatedData = () => {
        const result: any[] = [];
        const today = new Date();
        
        if (viewType === 'monthly') {
            for(let i=0; i<12; i++) {
                const txs = transactions.filter(t => {
                   const d = new Date(t.date);
                   return d.getFullYear() === selectedYear && d.getMonth() === i;
                });
                const gwp = txs.filter(t => t.type === 'PAYMENT').reduce((acc, t) => acc + t.amount, 0);
                const commissions = txs.filter(t => t.type === 'COMMISSION').reduce((acc, t) => acc + t.amount, 0);
                const claims = txs.filter(t => t.type === 'CLAIM_PAYOUT').reduce((acc, t) => acc + t.amount, 0);
                result.push({ period: `${MONTHS[i]} ${selectedYear}`, gwp, commissions, promo: gwp * 0.1, others: gwp * 0.05, claims });
            }
        } else if (viewType === 'yearly') {
            const currentYear = new Date().getFullYear();
            const years = [currentYear - 1, currentYear];
            years.forEach(y => {
                const txs = transactions.filter(t => new Date(t.date).getFullYear() === y);
                const gwp = txs.filter(t => t.type === 'PAYMENT').reduce((acc, t) => acc + t.amount, 0);
                const commissions = txs.filter(t => t.type === 'COMMISSION').reduce((acc, t) => acc + t.amount, 0);
                const claims = txs.filter(t => t.type === 'CLAIM_PAYOUT').reduce((acc, t) => acc + t.amount, 0);
                result.push({ period: `Tahun ${y}`, gwp, commissions, promo: gwp * 0.1, others: gwp * 0.05, claims });
            });
        } else if (viewType === 'daily') {
            for(let i=6; i>=0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                const txs = transactions.filter(t => new Date(t.date).toDateString() === d.toDateString());
                const gwp = txs.filter(t => t.type === 'PAYMENT').reduce((acc, t) => acc + t.amount, 0);
                const commissions = txs.filter(t => t.type === 'COMMISSION').reduce((acc, t) => acc + t.amount, 0);
                const claims = txs.filter(t => t.type === 'CLAIM_PAYOUT').reduce((acc, t) => acc + t.amount, 0);
                result.push({ period: d.toLocaleDateString('id-ID', { day:'numeric', month:'short' }), gwp, commissions, promo: gwp * 0.1, others: gwp * 0.05, claims });
            }
        }
        return result;
    };

    const aggregatedData = getAggregatedData();
    const totalGwp = aggregatedData.reduce((acc, r) => acc + r.gwp, 0);
    const totalClaim = aggregatedData.reduce((acc, r) => acc + r.claims, 0);
    const expenses = aggregatedData.reduce((acc, r) => acc + r.commissions + r.promo + r.others, 0);
    const combinedRatio = totalGwp > 0 ? (((totalClaim + expenses) / totalGwp) * 100).toFixed(1) : "0.0";

    const handleExport = () => {
        downloadCSV(aggregatedData, `Laporan_Keuangan_${viewType}_${selectedYear}`);
    };

    return (
        <div className={`space-y-8 ${compact ? '' : 'animate-fade-in text-white'}`}>
           {!compact && (
              <div className="flex flex-col lg:flex-row justify-between items-end gap-6 mb-4">
                 <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Laporan <span className="text-primary-500">Keuangan</span></h2>
                    <p className="text-[0.6rem] font-bold text-gray-500 uppercase tracking-widest mt-1">Data Transaksi dan Performa Bisnis</p>
                 </div>
                 <div className="flex gap-4">
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                       {[2023, 2024, 2025, 2026].map(y => (
                          <button 
                            key={y} 
                            onClick={() => setSelectedYear(y)}
                            className={`px-4 py-3 rounded-xl text-[0.65rem] font-black uppercase transition-all ${selectedYear === y ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                          >
                             {y}
                          </button>
                       ))}
                    </div>
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                       {(['daily', 'monthly', 'yearly'] as const).map(v => (
                          <button 
                            key={v} 
                            onClick={() => setViewType(v)}
                            className={`px-4 py-3 rounded-xl text-[0.65rem] font-black uppercase transition-all ${viewType === v ? 'bg-primary-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                          >
                             {v === 'daily' ? 'Harian' : v === 'monthly' ? 'Bulanan' : 'Tahunan'}
                          </button>
                       ))}
                    </div>
                    <button onClick={handleExport} className="flex items-center gap-3 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase text-[0.6rem] tracking-widest shadow-xl transition-all">
                       <FileDown size={18}/> Unduh Excel
                    </button>
                 </div>
              </div>
           )}

           <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              <div className="lg:col-span-3 space-y-6">
                 <Card className="p-0">
                    <div className="p-8 border-b border-white/5 flex justify-between items-center">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white"><FileText size={24}/></div>
                          <div>
                             <h3 className="font-black uppercase tracking-widest text-lg text-white">Ringkasan {viewType === 'daily' ? 'Harian' : viewType === 'monthly' ? 'Bulanan' : 'Tahunan'}</h3>
                             <p className="text-[0.6rem] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">Berdasarkan Total Transaksi Masuk</p>
                          </div>
                       </div>
                    </div>
                    
                    <div className="w-full overflow-x-auto">
                       <table className="w-full text-left min-w-[700px]">
                          <thead className="bg-black/20 text-[0.6rem] uppercase tracking-widest text-gray-500 font-black">
                             <tr>
                                <th className="py-4 pl-4 font-bold border-b border-white/5">Periode</th>
                                <th className="py-4 font-bold border-b border-white/5">Premi Masuk</th>
                                <th className="py-4 font-bold border-b border-white/5">Komisi</th>
                                <th className="py-4 font-bold border-b border-white/5">Promo/Marketing</th>
                                <th className="py-4 font-bold border-b border-white/5">Operasional</th>
                                <th className="py-4 font-bold border-b border-white/5">Klaim Dibayar</th>
                                <th className="py-4 border-b border-white/5 text-right pr-4">Status</th>
                             </tr>
                          </thead>
                          <tbody className="text-[0.7rem] font-bold">
                             {aggregatedData.map((row, i) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                   <td className="py-4 pl-4 uppercase text-white font-black">{row.period}</td>
                                   <td className="py-4 text-primary-500 font-mono">{convert(row.gwp)}</td>
                                   <td className="py-4 text-blue-400 font-mono">{convert(row.commissions)}</td>
                                   <td className="py-4 text-emerald-400 font-mono">{convert(row.promo)}</td>
                                   <td className="py-4 text-indigo-400 font-mono">{convert(row.others)}</td>
                                   <td className="py-4 text-rose-500 font-mono">{convert(row.claims)}</td>
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
                       <h3 className="text-sm font-black uppercase tracking-tight">Performa Bisnis</h3>
                    </div>
                    <div className="space-y-4">
                       <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                          <p className="text-[0.5rem] font-black text-gray-400 uppercase tracking-widest">Total GWP</p>
                          <p className="text-2xl font-black text-white">{convert(totalGwp)}</p>
                       </div>
                       <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                          <p className="text-[0.5rem] font-black text-gray-400 uppercase tracking-widest">Rasio Gabungan (Combined Ratio)</p>
                          <p className={`text-2xl font-black ${Number(combinedRatio) > 100 ? 'text-rose-500' : 'text-emerald-500'}`}>~{combinedRatio}%</p>
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
  const [customProducts, setCustomProducts] = useState<CustomProduct[]>([]);
  const [newProduct, setNewProduct] = useState({ name: '', type: 'INSURANCE', basePremium: 100000, rate: 0.05, description: '' });
  const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  useEffect(() => {
    db.customProducts.toArray().then(setCustomProducts);
  }, []);

  const handleExportBackup = async () => {
    setBackupStatus('loading');
    try {
      const [users, policies, claims, transactions, auditLogs, providers, customProds] = await Promise.all([
        db.users.toArray(),
        db.policies.toArray(),
        db.claims.toArray(),
        db.transactions.toArray(),
        db.auditLogs.toArray(),
        db.providers.toArray(),
        db.customProducts.toArray(),
      ]);
      // Strip password hashes from export for safety
      const safeUsers = users.map(({ passwordHash: _ph, salt: _s, ...rest }) => rest);
      const backup = {
        exportedAt: new Date().toISOString(),
        version: 'SP_BACKUP_v1',
        tables: { users: safeUsers, policies, claims, transactions, auditLogs, providers, customProducts: customProds },
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `surepath_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupStatus('done');
      setTimeout(() => setBackupStatus('idle'), 3000);
    } catch {
      setBackupStatus('idle');
    }
  };

  const handleAddCustomProduct = async () => {
    if (!newProduct.name) return;
    await db.customProducts.add({ ...newProduct, isActive: true });
    setNewProduct({ name: '', type: 'INSURANCE', basePremium: 100000, rate: 0.05, description: '' });
    db.customProducts.toArray().then(setCustomProducts);
  };

  const toggleProduct = (id: string) => {
    setProducts(products.map((p: any) => p.id === id ? { ...p, active: !p.active } : p));
  };

  const toggleCustomProduct = async (product: CustomProduct) => {
    await db.customProducts.update(product.id!, { isActive: !product.isActive });
    db.customProducts.toArray().then(setCustomProducts);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Ukuran logo maksimal 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        localStorage.setItem('surepath_custom_logo', reader.result as string);
        window.dispatchEvent(new Event('logo-updated'));
      };
      reader.readAsDataURL(file);
    }
  };

  // Ensure default products is an array to fix map issue
  const safeProducts = Array.isArray(products) ? products : [];

  return (
    <div className="space-y-8 animate-fade-in text-white pb-32">
       <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-500"><Settings size={22}/></div>
          <h3 className="font-black uppercase tracking-widest text-sm">Konfigurasi Sistem</h3>
       </div>

       <div className="grid gap-4">
          <Card className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 text-gray-400`}><Upload size={24}/></div>
              <div>
                <p className="font-black uppercase text-sm">Logo Perusahaan</p>
                <p className="text-[0.6rem] font-bold text-gray-500 uppercase tracking-widest">Update Logo Platform (Maks 2MB)</p>
              </div>
            </div>
            <label className="cursor-pointer px-8 py-3 rounded-2xl text-[0.65rem] font-black uppercase tracking-widest transition-all bg-white/10 hover:bg-white/20 text-white">
              Pilih File
              <input type="file" accept="image/png, image/jpeg, image/svg+xml" className="hidden" onChange={handleLogoUpload} />
            </label>
          </Card>

          <Card className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400"><FileDown size={24}/></div>
              <div>
                <p className="font-black uppercase text-sm">Backup Data</p>
                <p className="text-[0.6rem] font-bold text-gray-500 uppercase tracking-widest">Export semua data DB ke file JSON terenkripsi</p>
              </div>
            </div>
            <button
              onClick={handleExportBackup}
              disabled={backupStatus === 'loading'}
              className="px-8 py-3 rounded-2xl text-[0.65rem] font-black uppercase tracking-widest transition-all disabled:opacity-50"
              style={{ background: backupStatus === 'done' ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              {backupStatus === 'loading' ? 'Mengekspor...' : backupStatus === 'done' ? '✓ Tersimpan' : 'Download Backup'}
            </button>
          </Card>
       </div>

       <div className="grid gap-4 mt-8">
          <h3 className="font-black uppercase tracking-widest text-xs text-gray-400 mb-2">Tambah Produk Baru</h3>
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="Nama Produk (Cth: Asuransi Gempa)" 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500 transition-all font-mono"
                value={newProduct.name}
                onChange={e => setNewProduct({...newProduct, name: e.target.value})}
              />
              <select 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500 transition-all font-mono [&>option]:bg-slate-900"
                value={newProduct.type}
                onChange={e => setNewProduct({...newProduct, type: e.target.value})}
              >
                <option value="INSURANCE">Standard Insurance</option>
                <option value="SERVICES">Additional Services</option>
              </select>
              <div className="relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-mono">Rp</span>
                 <input 
                   type="number" 
                   placeholder="Basic Premium" 
                   className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500 transition-all font-mono"
                   value={newProduct.basePremium}
                   onChange={e => setNewProduct({...newProduct, basePremium: Number(e.target.value)})}
                 />
              </div>
              <div className="relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-mono">% Rate</span>
                 <input 
                   type="number" 
                   step="0.01"
                   placeholder="Multiplier Rate (e.g. 0.05)" 
                   className="w-full bg-white/5 border border-white/10 rounded-xl pl-20 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500 transition-all font-mono"
                   value={newProduct.rate}
                   onChange={e => setNewProduct({...newProduct, rate: Number(e.target.value)})}
                 />
              </div>
              <input 
                type="text" 
                placeholder="Deskripsi Singkat" 
                className="w-full md:col-span-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary-500 transition-all font-mono"
                value={newProduct.description}
                onChange={e => setNewProduct({...newProduct, description: e.target.value})}
              />
            </div>
            <div className="mt-4 flex justify-end">
               <button 
                 onClick={handleAddCustomProduct}
                 className="flex items-center gap-2 px-8 py-3 rounded-2xl text-[0.65rem] font-black uppercase tracking-widest transition-all bg-emerald-500 text-white shadow-emerald-500/20 shadow-xl hover:bg-emerald-600 active:scale-95"
               >
                 <Plus size={16}/> SIMPAN PRODUK
               </button>
            </div>
          </Card>
       </div>

       {customProducts.length > 0 && (
         <div className="grid gap-4 mt-8">
            <h3 className="font-black uppercase tracking-widest text-xs text-gray-400 mb-2">Daftar Produk Tambahan</h3>
            {customProducts.map(p => (
              <Card key={p.id} className="flex items-center justify-between py-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500`}><FileText size={24}/></div>
                  <div>
                    <p className="font-black uppercase text-sm">{p.name}</p>
                    <p className="text-[0.6rem] font-bold text-gray-500 uppercase tracking-widest">Rate: {(p.rate || 0) * 100}% | Premium {formatIDR(p.basePremium)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleCustomProduct(p)}
                  className={`px-8 py-3 rounded-2xl text-[0.65rem] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 ${p.isActive ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-primary-500 text-white shadow-primary-500/20'}`}
                >
                  {p.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              </Card>
            ))}
         </div>
       )}

       <div className="grid gap-4 mt-8">
          <h3 className="font-black uppercase tracking-widest text-xs text-gray-400 mb-2">Manajemen Modul Platform</h3>
          {safeProducts.map(p => (
            <Card key={p.id} className="flex items-center justify-between py-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 ${p.color}`}><p.icon size={24}/></div>
                <div>
                  <p className="font-black uppercase text-sm">{p.label}</p>
                  <p className="text-[0.6rem] font-bold text-gray-500 uppercase tracking-widest">{p.active ? 'Modul Aktif' : 'Modul Dinonaktifkan'}</p>
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

// ── Agent Management View ────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved', REJECTED: 'Rejected', CLOSED: 'Closed',
};
const STATUS_COLOR: Record<string, string> = {
  SUBMITTED: 'bg-amber-500/10 text-amber-400',
  UNDER_REVIEW: 'bg-blue-500/10 text-blue-400',
  APPROVED: 'bg-emerald-500/10 text-emerald-400',
  REJECTED: 'bg-rose-500/10 text-rose-400',
  CLOSED: 'bg-white/5 text-gray-400',
};

export const AgentManagementView = () => {
  const [agents, setAgents] = useState<SpUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRate, setEditRate] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    getAllAgents().then(data => { setAgents(data); setLoading(false); });
  }, []);

  const handleVerify = async (agentId: string, verified: boolean) => {
    setSaving(agentId);
    await updateAgentVerification(agentId, verified);
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, verified } : a));
    setSaving(null);
  };

  const handleRateUpdate = async (agentId: string) => {
    const rate = parseFloat(editRate[agentId] ?? '');
    if (isNaN(rate) || rate < 0 || rate > 1) return;
    setSaving(agentId);
    await updateAgentCommissionRate(agentId, rate);
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, commission_rate: rate } as SpUser : a));
    setEditRate(prev => { const n = { ...prev }; delete n[agentId]; return n; });
    setSaving(null);
  };

  const pending = agents.filter(a => !(a as any).verified);
  const active  = agents.filter(a => (a as any).verified);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin" />
    </div>
  );

  const AgentRow: React.FC<{ a: SpUser }> = ({ a }) => {
    const verified = !!(a as any).verified;
    const rate     = (a as any).commission_rate ?? 0.1;
    const editing  = editRate[a.id] !== undefined;
    return (
      <Card key={a.id} className="py-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Avatar + info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-primary-500/10 text-primary-500 flex items-center justify-center font-black text-sm flex-shrink-0">
              {a.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-black text-sm truncate">{a.name}</p>
              <p className="text-[0.6rem] font-bold text-gray-500 uppercase tracking-widest truncate">{a.email}</p>
              <p className="text-[0.6rem] font-bold text-primary-500 uppercase tracking-widest">{(a as any).agent_code ?? '-'}</p>
            </div>
          </div>

          {/* Commission rate editor */}
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <input
                  type="number"
                  step="0.01" min="0" max="1"
                  value={editRate[a.id]}
                  onChange={e => setEditRate(prev => ({ ...prev, [a.id]: e.target.value }))}
                  className="w-24 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary-500"
                />
                <button
                  disabled={saving === a.id}
                  onClick={() => handleRateUpdate(a.id)}
                  className="px-3 py-2 rounded-xl text-[0.6rem] font-black uppercase tracking-widest bg-emerald-500 text-white"
                >
                  {saving === a.id ? '…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditRate(prev => { const n = { ...prev }; delete n[a.id]; return n; })}
                  className="px-3 py-2 rounded-xl text-[0.6rem] font-black uppercase tracking-widest bg-white/5 text-gray-400"
                >
                  ✕
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditRate(prev => ({ ...prev, [a.id]: String(rate) }))}
                className="px-3 py-2 rounded-xl text-[0.6rem] font-black uppercase tracking-widest bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                Rate: {(rate * 100).toFixed(0)}%
              </button>
            )}
          </div>

          {/* Verify/Reject button */}
          <button
            disabled={saving === a.id}
            onClick={() => handleVerify(a.id, !verified)}
            className={`px-6 py-2.5 rounded-2xl text-[0.65rem] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex-shrink-0 ${
              verified
                ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white'
                : 'bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600'
            }`}
          >
            {saving === a.id ? '…' : verified ? 'Revoke' : 'Approve'}
          </button>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Agents', value: agents.length, color: 'text-white' },
          { label: 'Active', value: active.length, color: 'text-emerald-400' },
          { label: 'Pending', value: pending.length, color: 'text-amber-400' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="py-5 text-center">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-[0.55rem] font-bold text-gray-500 uppercase tracking-widest mt-1">{label}</p>
          </Card>
        ))}
      </div>

      {pending.length > 0 && (
        <div>
          <h3 className="font-black uppercase tracking-widest text-xs text-amber-400 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
            Pending Approval ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map(a => <AgentRow key={a.id} a={a} />)}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-black uppercase tracking-widest text-xs text-gray-400 mb-4">
          Active Agents ({active.length})
        </h3>
        {active.length === 0 ? (
          <Card className="text-center py-10 text-gray-500 text-sm font-bold">No active agents yet.</Card>
        ) : (
          <div className="space-y-3">
            {active.map(a => <AgentRow key={a.id} a={a} />)}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Claims Admin View ────────────────────────────────────────────────────────

export const ClaimsAdminView = () => {
  const [claims, setClaims] = useState<SpClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    getAllClaims().then(data => { setClaims(data); setLoading(false); });
  }, []);

  const handleStatus = async (id: string, status: SpClaim['status']) => {
    await import('../../services/supabaseService').then(m => m.updateClaimStatus(id, status));
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  const visible = filter === 'ALL' ? claims : claims.filter(c => c.status === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-[0.6rem] font-black uppercase tracking-widest transition-all ${
              filter === f ? 'bg-primary-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {f === 'ALL' ? 'All' : STATUS_LABEL[f] ?? f}
            {f === 'ALL' ? ` (${claims.length})` : ` (${claims.filter(c => c.status === f).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <Card className="text-center py-12 text-gray-500 text-sm font-bold">No claims found.</Card>
      ) : (
        <div className="space-y-3">
          {visible.map(claim => (
            <Card key={claim.id} className="py-5">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-black text-sm">{claim.client_name ?? '—'}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[0.5rem] font-black uppercase tracking-widest ${STATUS_COLOR[claim.status] ?? 'bg-white/5 text-gray-400'}`}>
                      {STATUS_LABEL[claim.status] ?? claim.status}
                    </span>
                  </div>
                  <p className="text-[0.6rem] font-bold text-gray-500 uppercase tracking-widest">
                    {claim.claim_number ?? '-'} · {claim.product_type ?? '-'} · {claim.date ?? '-'}
                  </p>
                  {claim.location && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{claim.location}</p>
                  )}
                  {claim.amount_estimated && (
                    <p className="text-xs font-bold text-primary-500 mt-1">Est: {formatIDR(claim.amount_estimated)}</p>
                  )}
                </div>
                {/* Quick status actions */}
                <div className="flex gap-2 flex-wrap flex-shrink-0">
                  {claim.status === 'SUBMITTED' && (
                    <button
                      onClick={() => handleStatus(claim.id, 'UNDER_REVIEW')}
                      className="px-4 py-2 rounded-xl text-[0.6rem] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
                    >
                      Review
                    </button>
                  )}
                  {(claim.status === 'SUBMITTED' || claim.status === 'UNDER_REVIEW') && (
                    <>
                      <button
                        onClick={() => handleStatus(claim.id, 'APPROVED')}
                        className="px-4 py-2 rounded-xl text-[0.6rem] font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatus(claim.id, 'REJECTED')}
                        className="px-4 py-2 rounded-xl text-[0.6rem] font-black uppercase tracking-widest bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {claim.status === 'APPROVED' && (
                    <button
                      onClick={() => handleStatus(claim.id, 'CLOSED')}
                      className="px-4 py-2 rounded-xl text-[0.6rem] font-black uppercase tracking-widest bg-white/5 text-gray-400 hover:bg-white/10 transition-colors"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ── User Management View ─────────────────────────────────────────────────────

type UserWithActive = User & { isActive?: boolean };

const ROLE_FILTERS = ['All', 'MASTER_ADMIN', 'ADMIN', 'FINANCE', 'INSURANCE_ADMIN', 'AGENT', 'CUSTOMER'] as const;

const ROLE_COLOR: Record<string, string> = {
  MASTER_ADMIN: 'rose',
  ADMIN: 'primary',
  FINANCE: 'blue',
  INSURANCE_ADMIN: 'indigo',
  AGENT: 'yellow',
  CUSTOMER: 'emerald',
};

export const UserManagementView = () => {
  const [users, setUsers] = useState<UserWithActive[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [editRoleId, setEditRoleId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: UserRole.CUSTOMER as UserRole });
  const [addError, setAddError] = useState<string | null>(null);

  const load = () => db.users.toArray().then(all => setUsers(all as UserWithActive[]));

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'All' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleRoleChange = async (u: UserWithActive, newRole: UserRole) => {
    if (u.id == null) return;
    await db.users.update(u.id, { role: newRole });
    setEditRoleId(null);
    load();
  };

  const handleToggleActive = async (u: UserWithActive) => {
    if (u.id == null) return;
    await db.users.update(u.id, { isActive: !(u.isActive !== false) } as Partial<User>);
    load();
  };

  const handleAddUser = async () => {
    setAddError(null);
    if (!newUser.name.trim() || !newUser.email.trim()) {
      setAddError('Nama dan email wajib diisi.');
      return;
    }
    const existing = await db.users.where('email').equals(newUser.email).first();
    if (existing) {
      setAddError('Email sudah terdaftar.');
      return;
    }
    await db.users.add({
      name: newUser.name.trim(),
      email: newUser.email.trim(),
      role: newUser.role,
      phone: '',
      nodeId: `SP-NODE-${Date.now()}`,
      trustScore: 70,
      memberSince: new Date().toISOString(),
      verified: false,
    });
    setShowAddModal(false);
    setNewUser({ name: '', email: '', role: UserRole.CUSTOMER });
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Kelola <span className="text-emerald-500">User</span></h2>
          <p className="text-[0.6rem] font-bold text-gray-500 uppercase tracking-widest mt-1">{users.length} User Terdaftar</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase text-[0.6rem] tracking-widest shadow-xl transition-all active:scale-95"
        >
          <UserPlus size={16} /> Tambah Admin
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Cari nama atau email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {ROLE_FILTERS.map(rf => (
            <button
              key={rf}
              onClick={() => setRoleFilter(rf)}
              className={`px-3 py-2 rounded-xl text-[0.6rem] font-black uppercase tracking-widest transition-all ${
                roleFilter === rf ? 'bg-emerald-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {rf === 'All' ? 'All' : rf.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left whitespace-nowrap min-w-[700px]">
            <thead>
              <tr className="border-b border-white/5 text-[0.55rem] font-black uppercase text-gray-500 tracking-[0.2em]">
                <th className="py-4 pl-6">Nama</th>
                <th className="py-4">Email</th>
                <th className="py-4">Role</th>
                <th className="py-4">Status</th>
                <th className="py-4">Member Sejak</th>
                <th className="py-4 text-right pr-6">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {filtered.slice(0, 100).map(u => {
                const isActive = u.isActive !== false;
                const isEditingRole = editRoleId === u.id;
                return (
                  <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-xs flex-shrink-0">
                          {u.name[0].toUpperCase()}
                        </div>
                        <span className="font-bold text-white truncate max-w-[140px]">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 font-mono text-[0.65rem] text-gray-400">{u.email}</td>
                    <td className="py-3.5">
                      {isEditingRole ? (
                        <div className="flex items-center gap-2">
                          <select
                            defaultValue={u.role}
                            onChange={e => handleRoleChange(u, e.target.value as UserRole)}
                            className="bg-[#0a0a0a] border border-white/10 rounded-lg px-2 py-1.5 text-[0.6rem] font-black uppercase text-white focus:outline-none focus:border-emerald-500 [&>option]:bg-slate-900"
                            autoFocus
                            onBlur={() => setEditRoleId(null)}
                          >
                            {Object.values(UserRole).map(r => (
                              <option key={r} value={r}>{r.replace('_', ' ')}</option>
                            ))}
                          </select>
                          <ChevronDown size={12} className="text-gray-500" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Badge color={ROLE_COLOR[u.role] ?? 'primary'}>{u.role.replace('_', ' ')}</Badge>
                          <button
                            onClick={() => setEditRoleId(u.id)}
                            className="p-1 text-gray-600 hover:text-emerald-400 transition-colors"
                            title="Edit Role"
                          >
                            <Pencil size={11} />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5">
                      <Badge color={isActive ? 'emerald' : 'rose'}>{isActive ? 'Aktif' : 'Nonaktif'}</Badge>
                    </td>
                    <td className="py-3.5 text-[0.6rem] text-gray-500 font-mono">
                      {u.memberSince ? new Date(u.memberSince).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="py-3.5 text-right pr-6">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`px-3 py-1.5 rounded-xl text-[0.55rem] font-black uppercase tracking-widest transition-all ${
                          isActive
                            ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white'
                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                        }`}
                      >
                        {isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > 100 && (
            <p className="text-center text-[0.6rem] text-gray-500 font-bold uppercase tracking-widest py-4">
              Menampilkan 100 dari {filtered.length} user. Gunakan filter/pencarian.
            </p>
          )}
          {filtered.length === 0 && (
            <p className="text-center text-[0.7rem] text-gray-600 font-bold py-10">Tidak ada user ditemukan.</p>
          )}
        </div>
      </Card>

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 bg-[#0d0d0d] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
            <h3 className="font-black uppercase tracking-widest text-sm mb-6 flex items-center gap-3">
              <UserPlus size={18} className="text-emerald-500" /> Tambah Admin Baru
            </h3>
            {addError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-bold">{addError}</div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-[0.55rem] font-black text-gray-500 uppercase tracking-widest mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Cth: Budi Santoso"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-[0.55rem] font-black text-gray-500 uppercase tracking-widest mb-1.5">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="admin@surepath.id"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-[0.55rem] font-black text-gray-500 uppercase tracking-widest mb-1.5">Role</label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-all [&>option]:bg-slate-900"
                >
                  {Object.values(UserRole).map(r => (
                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowAddModal(false); setAddError(null); }}
                className="flex-1 py-3 bg-white/5 text-gray-400 rounded-2xl font-black uppercase text-[0.6rem] tracking-widest hover:bg-white/10 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleAddUser}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[0.6rem] tracking-widest hover:bg-emerald-600 shadow-xl transition-all active:scale-95"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
