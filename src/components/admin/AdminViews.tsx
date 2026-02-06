
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
  Fingerprint, ZapOff, Globe, Wallet, CheckSquare, Plus, Calendar, MoreVertical, X
} from 'lucide-react';
import { getSecurityPulse, getRecentThreats, generateLiveThreat, ThreatNode } from '../../services/NeuralGuardService';
import { db, User as DBUser, Policy } from '../../db';
import { formatIDR } from '../car-wizard/WizardUI';

const Card: React.FC<{ children?: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
  <div className={`p-8 bg-white/[0.03] border border-white/5 rounded-[3rem] relative overflow-hidden backdrop-blur-sm group hover:border-primary-500/30 transition-all duration-500 shadow-xl ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, color = "primary" }: { children?: React.ReactNode, color?: string }) => {
  const styles: any = {
    primary: "bg-primary-500/10 text-primary-500 border-primary-500/20",
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    rose: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    yellow: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
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

export const FinanceView = ({ isDashboard, section }: { isDashboard?: boolean, section?: string }) => (
  <div className="space-y-8 animate-fade-in">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard label="Total Premium" value="Rp 12.4B" trend="+8.2%" icon={CreditCard} color="bg-emerald-500/10 text-emerald-500" />
      <StatCard label="Vault Liquidity" value="Rp 4.8B" trend="+2.4%" icon={Wallet} color="bg-blue-500/10 text-blue-500" />
      <StatCard label="Payout Velocity" value="42s" trend="-4s" icon={Zap} color="bg-orange-500/10 text-orange-500" />
    </div>
  </div>
);

export const ApprovalsView = () => {
    const [policies, setPolicies] = useState<Policy[]>([]);
    useEffect(() => {
        db.policies.where('status').equals('PENDING').toArray().then(setPolicies);
    }, []);

    return (
        <div className="space-y-8 animate-fade-in">
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

export const VerificationsView = () => (
  <div className="space-y-8 animate-fade-in">
    <Card>
      <div className="flex items-center gap-4 mb-8">
        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500"><UserCheck size={22}/></div>
        <h3 className="font-black uppercase tracking-widest text-sm">KYC Neural Verification</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500 font-black">J{i}</div>
              <div>
                <p className="text-xs font-black uppercase">Member ID #00{i}</p>
                <p className="text-[0.5rem] text-gray-500 uppercase tracking-widest">NIK Match: 99.4%</p>
              </div>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><Check size={14}/></div>
          </div>
        ))}
      </div>
    </Card>
  </div>
);

export const InventoryView = () => (
  <div className="space-y-8 animate-fade-in">
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
    <div className="space-y-8 animate-fade-in">
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

export const TasksView = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  
  return (
    <div className="relative h-full flex flex-col">
      <div className="flex flex-col gap-6 mb-6">
         <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-500"><CheckSquare size={22}/></div>
               <div>
                  <h3 className="font-black uppercase tracking-widest text-sm">Task Force</h3>
                  <p className="text-[0.5rem] font-bold text-gray-500 uppercase tracking-widest">Active Directives</p>
               </div>
            </div>
         </div>
      </div>
      <div className="py-12 text-center opacity-40 space-y-4">
         <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto"><CheckSquare size={32}/></div>
         <p className="text-xs font-black uppercase tracking-widest">No Active Tasks</p>
      </div>
    </div>
  );
};
