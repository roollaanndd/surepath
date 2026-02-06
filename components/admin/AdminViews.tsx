
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  TrendingUp, Users, Zap, ShieldCheck, 
  CreditCard, ArrowUpRight, Activity, 
  AlertCircle, CheckCircle2, Search,
  Eye, FileText, User,
  ClipboardCheck, UserCheck, XCircle, CheckCircle, Check, Settings, ShieldAlert,
  HardDrive, RefreshCw, 
  ChevronRight, Trash2, Smartphone, Plane, Package,
  Car, Lock, Terminal, Shield, ShieldX, Radio,
  Fingerprint, Globe, Wallet, CheckSquare, Plus, X,
  ImagePlus, Cpu,
  FileSpreadsheet,
  Mail,
  UserPlus,
  Loader2,
  Download,
  Upload
} from 'lucide-react';
import { getSecurityPulse, getRecentThreats, generateLiveThreat, ThreatNode } from '../../services/NeuralGuardService';
import { db, User as DBUser, Policy, Claim, Transaction } from '../../db';
import { formatIDR } from '../car-wizard/WizardUI';
import { UserRole } from '../../types';
import { hashPassword } from '../../services/authService';

export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    alert("Tidak ada data untuk diekspor.");
    return;
  }
  
  // Flattening simple objects for CSV
  const flatten = (obj: any) => {
    const res: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(res, flatten(value));
      } else {
        res[key] = value;
      }
    }
    return res;
  };

  const flattenedData = data.map(item => flatten(item));
  const headers = Object.keys(flattenedData[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of flattenedData) {
    const values = headers.map(header => {
      const val = row[header];
      const escaped = ('' + (val ?? '')).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const Card: React.FC<{ children?: React.ReactNode, className?: string }> = ({ children, className = "" }) => (
  <div className={`p-8 bg-white/[0.03] border border-white/5 rounded-[3rem] relative overflow-hidden backdrop-blur-sm group hover:border-primary-500/30 transition-all duration-500 shadow-xl ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, color = "primary" }: { children?: React.ReactNode, color?: string }) => {
  const styles: any = {
    primary: "bg-primary-500/10 text-primary-500 border-primary-500/20",
    blue: "bg-blue-500/10 text-blue-500 border-blue-200",
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

const AddUserForm = ({ onUserAdded }: { onUserAdded: () => void }) => {
    const [isExpanding, setIsExpanding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', role: UserRole.CUSTOMER });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const existing = await db.users.where('email').equals(form.email).first();
            if (existing) {
                alert("Email sudah terdaftar.");
                setLoading(false);
                return;
            }
            const defaultCreds = await hashPassword('Surepath123!');
            const newUser: DBUser = {
                name: form.name,
                email: form.email,
                phone: '0812' + Math.floor(10000000 + Math.random() * 90000000),
                role: form.role,
                nodeId: `SP-${form.role.substring(0,3)}-${Math.floor(1000+Math.random()*9000)}`,
                trustScore: 90,
                memberSince: new Date().toISOString(),
                verified: true,
                passwordHash: defaultCreds.hash,
                salt: defaultCreds.salt
            };
            await db.users.add(newUser);
            alert(`User ${form.name} berhasil ditambahkan. Pass: Surepath123!`);
            setForm({ name: '', email: '', role: UserRole.CUSTOMER });
            setIsExpanding(false);
            onUserAdded();
        } catch (err) {
            alert("Gagal sinkronisasi user baru.");
        } finally {
            setLoading(false);
        }
    };

    if (!isExpanding) {
        return (
            <button 
                onClick={() => setIsExpanding(true)}
                className="w-full py-6 border-2 border-dashed border-white/10 rounded-[2.5rem] flex items-center justify-center gap-4 text-gray-500 hover:text-primary-500 hover:border-primary-500/50 transition-all group"
            >
                <UserPlus size={24} className="group-hover:scale-110 transition-transform"/>
                <span className="text-xs font-black uppercase tracking-[0.3em]">Tambah User Baru (Node Admin)</span>
            </button>
        );
    }

    return (
        <Card className="border-primary-500/30 animate-pop-in mb-8">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary-500 rounded-xl text-white shadow-lg"><UserPlus size={20}/></div>
                    <h4 className="font-black uppercase tracking-widest text-sm">Registrasi Simpul Baru</h4>
                </div>
                <button onClick={() => setIsExpanding(false)} className="p-2 bg-white/5 rounded-full hover:bg-rose-500 transition-all"><X size={18}/></button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                    <label className="text-[0.55rem] font-black uppercase text-gray-500 ml-2">Nama Lengkap</label>
                    <input required className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-xs outline-none focus:border-primary-500" placeholder="John Doe" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[0.55rem] font-black uppercase text-gray-500 ml-2">Email Jaringan</label>
                    <input required type="email" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-xs outline-none focus:border-primary-500" placeholder="email@surepath.ai" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[0.55rem] font-black uppercase text-gray-500 ml-2">Peran Sistem</label>
                    <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-xs outline-none focus:border-primary-500" value={form.role} onChange={e => setForm({...form, role: e.target.value as UserRole})}>
                        <option value={UserRole.CUSTOMER}>CUSTOMER</option>
                        <option value={UserRole.AGENT}>AGENT</option>
                        <option value={UserRole.ADMIN}>ADMIN</option>
                        <option value={UserRole.FINANCE}>FINANCE</option>
                    </select>
                </div>
                <div className="md:col-span-3">
                    <button type="submit" disabled={loading} className="w-full py-4 bg-primary-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2">
                        {loading ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>}
                        Sinkronisasi Node User
                    </button>
                </div>
            </form>
        </Card>
    );
};

export const BizAdminView = ({ isDashboard, section, userRole }: { isDashboard?: boolean, section?: string, userRole?: UserRole }) => {
  const [users, setUsers] = useState<DBUser[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    const allUsers = await db.users.toArray();
    const allPolicies = await db.policies.toArray();
    setUsers(allUsers);
    setPolicies(allPolicies);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, section]);

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const newUsers: DBUser[] = [];
      const defaultCreds = await hashPassword('Surepath123!');

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const userObj: any = {};
        headers.forEach((header, index) => {
          userObj[header] = values[index];
        });

        // Mapping simple required fields if they match expected CSV headers
        if (userObj.email && userObj.name) {
          newUsers.push({
            name: userObj.name,
            email: userObj.email,
            phone: userObj.phone || '0812' + Math.floor(10000000 + Math.random() * 90000000),
            role: (userObj.role as UserRole) || UserRole.CUSTOMER,
            nodeId: userObj.nodeId || `SP-IMP-${Math.floor(1000 + Math.random() * 9000)}`,
            trustScore: Number(userObj.trustScore) || 85,
            memberSince: userObj.memberSince || new Date().toISOString(),
            verified: true,
            passwordHash: defaultCreds.hash,
            salt: defaultCreds.salt
          });
        }
      }

      if (newUsers.length > 0) {
        try {
          await db.users.bulkAdd(newUsers);
          alert(`${newUsers.length} user berhasil diimpor.`);
          fetchData();
        } catch (err) {
          console.error(err);
          alert("Gagal impor data. Pastikan email unik dan format sesuai.");
        }
      } else {
        alert("Tidak ada data valid yang ditemukan di CSV.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (section === 'transactions') {
     return (
        <div className="space-y-8 animate-fade-in">
           <Card>
              <h3 className="font-black uppercase tracking-widest text-sm mb-6">Traffic Polis & Transaksi Real-time</h3>
              <div className="space-y-4">
                 {policies.length > 0 ? policies.map((p, i) => (
                    <div key={i} className="p-4 bg-white/5 rounded-2xl flex items-center justify-between border border-white/5 group hover:border-primary-500/30 transition-all">
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
                 )) : (
                    <div className="py-12 text-center text-gray-500 uppercase font-black text-[0.6rem] tracking-[0.3em]">Belum ada transaksi di buku besar</div>
                 )}
              </div>
           </Card>
        </div>
     )
  }

  return (
    <div className="space-y-8 animate-fade-in">
        {userRole === UserRole.MASTER_ADMIN && section === 'users' && (
          <div className="space-y-4">
            <AddUserForm onUserAdded={fetchData} />
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => exportToCSV(users, "USERS_DATABASE")}
                className="py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                <Download size={18} className="text-primary-500"/> Ekspor CSV
              </button>
              <label className="py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-white/10 transition-all">
                <Upload size={18} className="text-brand-500"/> Impor Excel/CSV
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
              </label>
            </div>
          </div>
        )}
        
        {section === 'users' && (
            <Card>
                <div className="flex justify-between items-center mb-8">
                    <h3 className="font-black uppercase tracking-widest text-sm">Direktori Simpul Pengguna</h3>
                    <div className="flex items-center gap-3">
                        <span className="text-[0.6rem] font-bold text-gray-500 uppercase tracking-widest">{users.length} Node Terdaftar</span>
                        <Search size={18} className="text-gray-500"/>
                    </div>
                </div>
                <div className="space-y-4">
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
                                <Badge color={u.verified ? "emerald" : "yellow"}>{u.verified ? 'VERIFIED' : 'PENDING'}</Badge>
                                <p className="text-[0.5rem] font-mono text-gray-500 mt-1 uppercase">{u.email}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        )}
    </div>
  );
};

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
      setLastNotification(`${newThreat.type} diredam dari ${newThreat.ip}`);
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
            <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20">
               <ShieldCheck size={20} className="animate-pulse"/>
               <div className="space-y-0.5">
                  <p className="text-[0.55rem] font-black uppercase tracking-widest opacity-80">Neural Guard Aktif</p>
                  <p className="text-xs font-bold tracking-tight">{lastNotification}</p>
               </div>
            </div>
         </div>
       )}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Ancaman Dicegah" value={pulse.threatsBlocked24h.toLocaleString()} trend="+4" icon={ShieldAlert} color="bg-rose-500/10 text-rose-500" />
          <StatCard label="Beban Neural" value={`${pulse.neuralLoad.toFixed(2)}%`} trend="-0.4%" icon={Cpu} color="bg-blue-500/10 text-blue-500" />
          <StatCard label="Latensi Shield" value="0.32ms" trend="-0.02" icon={Zap} color="bg-primary-500/10 text-primary-500" />
          <StatCard label="Uptime Jaringan" value="99.99%" icon={Globe} color="bg-emerald-500/10 text-emerald-500" />
       </div>
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
             <div className="flex items-center gap-4 mb-10">
                <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-500"><Terminal size={20}/></div>
                <h3 className="font-black uppercase tracking-widest text-sm">Traffic Neural real-time</h3>
             </div>
             <div className="h-56 flex items-end gap-1 px-2 border-b border-white/5">
                {activeTraffic.map((h, i) => (
                   <div key={i} className="flex-1 bg-primary-500 transition-all duration-700 rounded-t-sm" style={{ height: `${h}%`, opacity: 0.1 + (i / 40) * 0.9 }}></div>
                ))}
             </div>
          </Card>
          <Card>
             <h3 className="font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2"><ShieldX size={14} className="text-rose-500"/> Log Mitigasi</h3>
             <div className="space-y-3">
                {threats.map((t, i) => (
                   <div key={i} className={`p-3 bg-white/5 rounded-xl flex justify-between items-center border border-white/5`}>
                      <div className="space-y-0.5">
                         <p className="text-[0.65rem] font-black uppercase text-gray-300">{t.type}</p>
                         <p className="text-[0.5rem] font-mono text-gray-500">{t.ip}</p>
                      </div>
                      <Badge color="rose">BLOCKED</Badge>
                   </div>
                ))}
             </div>
          </Card>
       </div>
    </div>
  );
};

export const ApprovalsView = () => {
    const [policies, setPolicies] = useState<Policy[]>([]);
    useEffect(() => {
        db.policies.where('status').equals('PENDING').toArray().then(setPolicies);
    }, []);

    const approve = async (id: number) => {
        await db.policies.update(id, { status: 'ACTIVE' });
        db.policies.where('status').equals('PENDING').toArray().then(setPolicies);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-black uppercase tracking-tighter ml-2">Antrean <span className="text-primary-500">Persetujuan</span></h3>
            {policies.length > 0 ? policies.map(p => (
                <div key={p.id} className="p-6 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-between group hover:border-primary-500/50 transition-all">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center"><ClipboardCheck size={28}/></div>
                        <div>
                            <p className="text-xs font-black uppercase text-white">{p.policyNumber}</p>
                            <p className="text-[0.55rem] text-gray-500 font-bold uppercase tracking-widest">{p.type} • {formatIDR(p.premium)}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-3 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><XCircle size={18}/></button>
                        <button onClick={() => approve(p.id!)} className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"><CheckCircle size={18}/></button>
                    </div>
                </div>
            )) : (
                <div className="py-20 text-center text-gray-500 uppercase font-black tracking-widest text-xs border-2 border-dashed border-white/5 rounded-[3rem]">Tidak ada antrean pending</div>
            )}
        </div>
    );
};

export const ClaimsListView = () => {
    const [claims, setClaims] = useState<Claim[]>([]);
    useEffect(() => {
        db.claims.toArray().then(setClaims);
    }, []);

    return (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-black uppercase tracking-tighter ml-2">Log <span className="text-primary-500">Klaim Neural</span></h3>
            <div className="grid gap-4">
                {claims.map(c => (
                    <Card key={c.id} className="py-6">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 bg-primary-500/10 text-primary-500 rounded-2xl flex items-center justify-center"><Activity size={24}/></div>
                                <div>
                                    <p className="text-xs font-black uppercase">CASE #{c.id}</p>
                                    <p className="text-[0.5rem] font-bold text-gray-500 uppercase tracking-widest mt-1">{c.date} • ESTIMASI {formatIDR(c.amountEstimated)}</p>
                                </div>
                            </div>
                            <Badge color={c.status === 'PAID' ? 'emerald' : 'yellow'}>{c.status}</Badge>
                        </div>
                        <p className="mt-4 text-[0.65rem] text-gray-400 font-medium italic border-l-2 border-primary-500 pl-4">"{c.chronology}"</p>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export const FinanceView = ({ section }: { section?: string }) => {
    const [totalGWP, setTotalGWP] = useState(0);
    const [txCount, setTxCount] = useState(0);

    useEffect(() => {
        db.policies.toArray().then(res => setTotalGWP(res.reduce((acc, curr) => acc + curr.premium, 0)));
        db.transactions.count().then(setTxCount);
    }, []);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard label="Total GWP (Real)" value={formatIDR(totalGWP)} trend="+Live" icon={Wallet} color="bg-emerald-500/10 text-emerald-500" />
                <StatCard label="Transaksi Diproses" value={txCount} trend="+Real" icon={CreditCard} color="bg-blue-500/10 text-blue-500" />
                <StatCard label="Rasio Klaim" value="3.2%" trend="-0.4%" icon={TrendingUp} color="bg-amber-500/10 text-amber-500" />
            </div>
        </div>
    );
};

export const InventoryView = () => (
  <div className="space-y-8 animate-fade-in">
    <Card>
      <div className="flex items-center gap-4 mb-8">
        <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-500"><HardDrive size={22}/></div>
        <h3 className="font-black uppercase tracking-widest text-sm">Produk & Inventaris Matriks</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 text-[0.55rem] font-black uppercase text-gray-500 tracking-[0.2em]">
              <th className="pb-4 pl-4">ASSET NAME</th>
              <th className="pb-4">CATEGORY</th>
              <th className="pb-4">RISK GRADE</th>
              <th className="pb-4 text-right pr-4">AVAILABILITY</th>
            </tr>
          </thead>
          <tbody className="text-xs">
             {[
               { n: 'Auto-Matrix v4', c: 'Retail', r: 'LOW', a: 'ACTIVE' },
               { n: 'Travel-Parametric', c: 'Retail', r: 'MEDIUM', a: 'ACTIVE' },
               { n: 'Property-Core', c: 'Corporate', r: 'HIGH', a: 'STANDBY' }
             ].map((item, i) => (
                <tr key={i} className="border-b border-white/[0.02]">
                    <td className="py-4 pl-4 font-black uppercase">{item.n}</td>
                    <td className="py-4 text-gray-500">{item.c}</td>
                    <td className="py-4"><Badge color={item.r === 'LOW' ? 'emerald' : 'yellow'}>{item.r}</Badge></td>
                    <td className="py-4 text-right pr-4"><span className="text-[0.6rem] font-black text-primary-500">{item.a}</span></td>
                </tr>
             ))}
          </tbody>
        </table>
      </div>
    </Card>
  </div>
);

export const SettingsView = ({ products, setProducts }: { products: any[], setProducts: any }) => {
  const toggle = (id: string) => setProducts(products.map((p: any) => p.id === id ? { ...p, active: !p.active } : p));
  return (
    <div className="space-y-6">
        <h3 className="text-xl font-black uppercase tracking-tighter px-2">Konfigurasi <span className="text-primary-500">Global</span></h3>
        <div className="grid gap-4">
            {products.map(p => (
                <Card key={p.id} className="py-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 ${p.color}`}><p.icon size={24}/></div>
                        <p className="font-black uppercase text-sm">{p.label}</p>
                    </div>
                    <button onClick={() => toggle(p.id)} className={`px-6 py-2.5 rounded-xl font-black text-[0.65rem] uppercase tracking-widest ${p.active ? 'bg-rose-500' : 'bg-emerald-500'} text-white`}>
                        {p.active ? 'Matikan' : 'Aktifkan'}
                    </button>
                </Card>
            ))}
        </div>
    </div>
  );
};
