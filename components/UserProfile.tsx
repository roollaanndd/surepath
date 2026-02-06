import React, { useState, useEffect } from 'react';
import { 
  User, ShieldCheck, Mail, Phone, ChevronRight, Landmark,
  Bell, FileCheck, Award, Zap, Globe, LogOut,
  CheckCircle2, Wallet, Lock, Package, Car, Plane,
  Activity, X, Info, Calendar, MapPin, History,
  TrendingUp, Fingerprint, ShieldAlert, BadgeCheck,
  CreditCard, LayoutGrid, Clock, AlertCircle, Settings,
  Cpu, Hash, Palette, Microscope, Eye, QrCode
} from 'lucide-react';
import { db, Policy, Claim, Transaction } from '../db';
import { UserRole } from '../types';
import { formatIDR } from './car-wizard/WizardUI';

interface UserProfileProps {
  currentUser: any;
  onStartClaim?: (policy: Policy) => void;
}

type TabType = 'OVERVIEW' | 'POLICIES' | 'CLAIMS' | 'SETTINGS';

const Badge = ({ children, color = "primary" }: { children?: React.ReactNode, color?: string }) => {
  const styles: any = {
    primary: "bg-primary-500/10 text-primary-500 border-primary-500/20",
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-500 border-blue-200",
    amber: "bg-amber-500/10 text-amber-600 border-amber-200",
    rose: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[0.55rem] font-black uppercase tracking-widest border ${styles[color] || styles.primary}`}>
      {children}
    </span>
  );
};

const UserProfile: React.FC<UserProfileProps> = ({ currentUser, onStartClaim }) => {
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (currentUser?.id) {
      db.policies.where('userId').equals(currentUser.id).toArray().then(res => setPolicies(res.sort((a,b) => b.id! - a.id!)));
      db.claims.where('userId').equals(currentUser.id).toArray().then(setClaims);
      db.transactions.where('userId').equals(currentUser.id).toArray().then(setTransactions);
    }
  }, [currentUser]);

  const renderOverview = () => (
    <div className="space-y-6 animate-fade-in">
       <div className="grid grid-cols-2 gap-4">
          <div className="p-6 bg-white dark:bg-white/5 rounded-[2rem] border border-black/5 dark:border-white/5 space-y-2 shadow-sm group hover:border-primary-500/30 transition-all">
             <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-500 group-hover:scale-110 transition-transform"><ShieldCheck size={20}/></div>
             <p className="text-[0.55rem] font-black text-gray-400 uppercase tracking-widest">Asuransi Aktif</p>
             <p className="text-3xl font-black">{policies.filter(p => p.status === 'ACTIVE').length}</p>
          </div>
          <div className="p-6 bg-white dark:bg-white/5 rounded-[2rem] border border-black/5 dark:border-white/5 space-y-2 shadow-sm group hover:border-blue-500/30 transition-all">
             <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform"><Zap size={20}/></div>
             <p className="text-[0.55rem] font-black text-gray-400 uppercase tracking-widest">Total Klaim</p>
             <p className="text-3xl font-black">{claims.length}</p>
          </div>
       </div>

       <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden group border border-white/5 shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-[0.05] rotate-12 group-hover:rotate-0 transition-transform duration-1000">
             <TrendingUp size={160}/>
          </div>
          <div className="relative z-10 space-y-6">
             <div className="flex justify-between items-center">
                <p className="text-[0.6rem] font-black uppercase tracking-[0.3em] text-primary-400">Total Aset Terlindungi</p>
                <BadgeCheck size={20} className="text-emerald-500"/>
             </div>
             <h3 className="text-4xl font-black tracking-tighter leading-none">{formatIDR(policies.reduce((acc, p) => acc + (p.coverageDetails?.vehicle?.price || 0), 0))}</h3>
             <div className="flex items-center gap-3 py-3 border-t border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[0.55rem] font-black text-gray-500 uppercase tracking-widest">Data sinkron otomatis dengan sistem OJK</span>
             </div>
          </div>
       </div>
    </div>
  );

  const renderPolicies = () => (
    <div className="space-y-4 animate-fade-in pb-10">
       {policies.map(p => (
         <div key={p.id} className="p-6 bg-white dark:bg-white/5 rounded-[2.5rem] border border-black/5 shadow-sm space-y-6 group hover:border-primary-500/30 transition-all">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-[1.8rem] flex items-center justify-center shadow-inner ${p.type === 'CAR' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                     {p.type === 'CAR' ? <Car size={28}/> : <Plane size={28}/>}
                  </div>
                  <div>
                     <p className="text-[0.5rem] font-black text-gray-400 uppercase tracking-widest mb-1">Unit {p.coverageDetails?.vehicle?.brand || 'SurePath'}</p>
                     <p className="text-lg font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">{p.policyNumber}</p>
                  </div>
               </div>
               <Badge color={p.status === 'ACTIVE' ? 'emerald' : 'amber'}>{p.status === 'ACTIVE' ? 'AKTIF' : p.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
               <button className="py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl text-[0.55rem] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">Lihat Detail</button>
               <button onClick={() => onStartClaim?.(p)} className="py-3 bg-primary-500 text-white rounded-2xl text-[0.55rem] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-primary-500/20">Lapor Klaim</button>
            </div>
         </div>
       ))}
       {policies.length === 0 && (
          <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4 bg-gray-50 dark:bg-white/5 rounded-[2.5rem] border-2 border-dashed border-gray-300">
             <Package size={48}/>
             <p className="text-xs font-black uppercase tracking-widest">Belum ada asuransi aktif</p>
          </div>
       )}
    </div>
  );

  const renderClaims = () => (
    <div className="space-y-4 animate-fade-in pb-10">
       {claims.map(c => (
         <div key={c.id} className="p-6 bg-white dark:bg-white/5 rounded-[2.5rem] border border-black/5 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-500"><History size={20}/></div>
                  <div>
                     <p className="text-xs font-black uppercase">Klaim #{c.id?.toString().slice(-4)}</p>
                     <p className="text-[0.5rem] text-gray-400 font-bold uppercase tracking-widest">{c.date}</p>
                  </div>
               </div>
               <Badge color={c.status === 'PAID' ? 'emerald' : 'amber'}>{c.status}</Badge>
            </div>
            <p className="text-[0.65rem] font-medium text-gray-600 dark:text-gray-400 line-clamp-2 italic leading-relaxed">"{c.chronology}"</p>
         </div>
       ))}
       {claims.length === 0 && (
          <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
             <ShieldAlert size={48}/>
             <p className="text-xs font-black uppercase tracking-widest">Belum ada riwayat klaim</p>
          </div>
       )}
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-4 animate-fade-in pb-10">
       <div className="space-y-3">
          <p className="text-[0.6rem] font-black uppercase text-gray-400 tracking-widest ml-2">Keamanan & Data</p>
          {[
              { label: 'Login Biometrik', icon: Fingerprint, color: 'text-blue-500', sub: 'Status: Aktif', action: 'Kelola' },
              { label: 'Data Bank', icon: Landmark, color: 'text-emerald-500', sub: 'Pencairan Klaim Cepat', action: 'Kelola' },
              { label: 'Ganti Kata Sandi', icon: Lock, color: 'text-rose-500', sub: 'Keamanan Akun', action: 'Ganti' },
          ].map((item, i) => (
              <div key={i} className="p-5 bg-white dark:bg-white/5 rounded-[2.2rem] border border-black/5 flex items-center justify-between group cursor-pointer hover:border-primary-500/20 transition-all active:scale-[0.98]">
                <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center ${item.color} shadow-inner`}>
                      <item.icon size={22}/>
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-tight text-gray-900 dark:text-white leading-none mb-1.5">{item.label}</p>
                      <p className="text-[0.55rem] font-bold text-gray-400 uppercase tracking-widest">{item.sub}</p>
                    </div>
                </div>
                <ChevronRight size={16} className="text-gray-300"/>
              </div>
          ))}
       </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-32">
      <div className="p-10 bg-white dark:bg-[#0c0c0c] rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-white/5 text-center space-y-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-500 to-emerald-500 opacity-30"></div>
        <div className="relative inline-block">
          <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-[3rem] flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-2xl overflow-hidden group">
            <div className="w-full h-full bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-4xl font-black text-slate-500 dark:text-slate-400">
               {currentUser?.name?.[0] || 'M'}
            </div>
          </div>
          <div className="absolute bottom-1 right-1 w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white border-4 border-white dark:border-slate-900 shadow-lg animate-pulse">
            <BadgeCheck size={20} strokeWidth={3}/>
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">{currentUser?.name || 'User SurePath'}</h3>
          <p className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-[0.4em]">ID Anggota: {currentUser?.nodeId}</p>
        </div>
        <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-[2.5rem] border border-black/5 space-y-4 shadow-inner">
           <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                 <Cpu size={14} className="text-primary-500"/>
                 <span className="text-[0.6rem] font-black uppercase text-gray-400 tracking-widest">Skor Kepercayaan</span>
              </div>
              <span className="text-xl font-black text-emerald-500">{currentUser?.trustScore || 85}%</span>
           </div>
           <div className="h-2.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-[2000ms]" style={{ width: `${currentUser?.trustScore || 85}%` }}></div>
           </div>
        </div>
      </div>

      <div className="flex bg-gray-100 dark:bg-white/5 p-1.5 rounded-[2.2rem] border border-black/5 dark:border-white/10 mx-2 shadow-inner">
         {[
           { id: 'OVERVIEW', label: 'Ringkasan', icon: LayoutGrid },
           { id: 'POLICIES', label: 'Polis', icon: ShieldCheck },
           { id: 'CLAIMS', label: 'Histori', icon: Activity },
           { id: 'SETTINGS', label: 'Akun', icon: Settings },
         ].map(tab => (
            <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id as TabType)}
               className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-[1.8rem] transition-all duration-300 active:scale-95 ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 shadow-xl text-primary-500 scale-105' : 'text-gray-400'}`}
            >
               <tab.icon size={18} strokeWidth={activeTab === tab.id ? 3 : 2}/>
               <span className="text-[0.5rem] font-black uppercase tracking-[0.2em]">{tab.label}</span>
            </button>
         ))}
      </div>

      <div className="px-2">
         {activeTab === 'OVERVIEW' && renderOverview()}
         {activeTab === 'POLICIES' && renderPolicies()}
         {activeTab === 'CLAIMS' && renderClaims()}
         {activeTab === 'SETTINGS' && renderSettings()}
      </div>

      <div className="px-6 space-y-4">
        <button className="w-full py-6 bg-rose-500/10 text-rose-500 rounded-[2.5rem] border border-rose-500/20 font-black uppercase text-xs tracking-[0.3em] flex items-center justify-center gap-3 active:scale-95 transition-all group hover:bg-rose-500 hover:text-white">
           <LogOut size={18}/> Keluar Aplikasi
        </button>
      </div>
    </div>
  );
};

export default UserProfile;