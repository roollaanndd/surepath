
import React, { useState, useEffect } from 'react';
import { 
  User, ShieldCheck, ChevronRight, Landmark,
  Bell, FileCheck, Zap, LogOut,
  CheckCircle2, Lock, Package, Car, Plane,
  Activity, X, History,
  TrendingUp, Fingerprint, ShieldAlert, BadgeCheck,
  CreditCard, LayoutGrid, Settings,
  Cpu, Microscope, Eye, Send, Loader2
} from 'lucide-react';
import { db, Policy, Claim, Transaction } from '../db';
import { Language } from '../types';
import { formatIDR } from './car-wizard/WizardUI';

interface UserProfileProps {
  currentUser: any;
  onStartClaim?: (policy: Policy) => void;
  lang?: Language;
  onLogout?: () => void;
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

const PasswordResetModal = ({ email, onClose, lang }: { email: string, onClose: () => void, lang: Language }) => {
  const [step, setStep] = useState<'confirm' | 'loading' | 'success'>('confirm');
  const t = (en: string, idn: string) => lang === Language.EN ? en : idn;

  const handleRequestReset = () => {
    setStep('loading');
    setTimeout(() => {
      setStep('success');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-fade-in">
      <div className="bg-white dark:bg-[#0f172a] w-full max-w-md rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden relative p-8 text-center space-y-8">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white transition-colors">
          <X size={24} />
        </button>

        {step === 'confirm' && (
          <div className="space-y-6 animate-pop-in">
            <div className="w-20 h-20 bg-primary-500/10 rounded-[2rem] flex items-center justify-center text-primary-500 mx-auto shadow-inner">
              <Lock size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                {t('Reset Password', 'Reset Kata Sandi')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                {t('We will send a secure link reset to your registered email address:', 'Kami akan mengirimkan tautan link reset aman ke alamat email terdaftar Anda:')}
              </p>
              <p className="text-sm font-black text-primary-500 bg-primary-500/5 py-2 rounded-xl border border-primary-500/10 mt-2">
                {email}
              </p>
            </div>
            <button 
              onClick={handleRequestReset}
              className="w-full py-5 bg-primary-500 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Send size={18} /> {t('Send Reset Link', 'Kirim Link Reset')}
            </button>
          </div>
        )}

        {step === 'loading' && (
          <div className="py-12 space-y-6 animate-pulse">
            <div className="relative w-20 h-20 mx-auto">
               <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-xl"></div>
               <Loader2 size={80} className="text-primary-500 animate-spin relative z-10" />
            </div>
            <div className="space-y-2">
              <p className="text-[0.6rem] font-black uppercase tracking-[0.4em] text-primary-500">{t('Proses Sinkronisasi Link', 'Proses Sinkronisasi Link')}</p>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('Encrypting protocols...', 'Mengenkripsi protokol...')}</p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-6 animate-pop-in">
            <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-2xl animate-draw-check">
              <CheckCircle2 size={40} strokeWidth={3} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                {t('Link Sent!', 'Link Terkirim!')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                {t('Check your inbox (and spam folder) for instructions to reset your password. The link is valid for 15 minutes.', 'Cek kotak masuk (dan folder spam) Anda untuk instruksi reset kata sandi. Tautan berlaku selama 15 menit.')}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all"
            >
              {t('Back to Profile', 'Kembali ke Profil')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const PolicyDetailModal = ({ policy, onClose }: { policy: Policy, onClose: () => void }) => {
  const details = policy.coverageDetails;
  if (!details) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-fade-in overflow-hidden">
       <div className="bg-white dark:bg-[#0f172a] w-full max-w-3xl max-h-[90vh] rounded-[3.5rem] shadow-2xl flex flex-col relative overflow-hidden border border-white/10">
          <div className="p-8 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-white/5">
             <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                   {policy.type === 'CAR' ? <Car size={28}/> : <Plane size={28}/>}
                </div>
                <div>
                   <p className="text-[0.6rem] font-black text-primary-500 uppercase tracking-[0.3em]">Policy Matrix Node</p>
                   <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none mt-1">{policy.policyNumber}</h3>
                </div>
             </div>
             <button onClick={onClose} className="p-3 bg-gray-200 dark:bg-white/10 rounded-full hover:bg-rose-500 hover:text-white transition-all"><X size={24}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
             {/* Section 1: Core Registry */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="space-y-4">
                   <div className="flex items-center gap-3 text-primary-500">
                      <Car size={18}/>
                      <span className="text-[0.7rem] font-black uppercase tracking-widest">Hardware Node</span>
                   </div>
                   <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-[2.5rem] border border-black/5 space-y-4">
                      <div>
                         <p className="text-[0.5rem] font-black text-gray-400 uppercase mb-1">Brand / Model / Year</p>
                         <p className="text-sm font-black uppercase text-slate-900 dark:text-white">{details.vehicle.brand} {details.vehicle.model} ({details.vehicle.year})</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <p className="text-[0.5rem] font-black text-gray-400 uppercase mb-1">Plate Number</p>
                            <p className="text-xs font-black uppercase tracking-widest text-primary-500 bg-primary-500/5 px-2 py-1 rounded w-fit">{details.vehicle.plate}</p>
                         </div>
                         <div>
                            <p className="text-[0.5rem] font-black text-gray-400 uppercase mb-1">Status</p>
                            <Badge color={policy.status === 'ACTIVE' ? 'emerald' : 'amber'}>{policy.status}</Badge>
                         </div>
                      </div>
                   </div>
                </section>

                <section className="space-y-4">
                   <div className="flex items-center gap-3 text-blue-500">
                      <User size={18}/>
                      <span className="text-[0.7rem] font-black uppercase tracking-widest">Subscriber Node</span>
                   </div>
                   <div className="p-6 bg-blue-500/5 rounded-[2.5rem] border border-blue-500/10 space-y-4">
                      <div>
                         <p className="text-[0.5rem] font-black text-blue-400 uppercase mb-1">Identity Name</p>
                         <p className="text-sm font-black uppercase text-blue-600 dark:text-blue-400">{details.kycData?.name}</p>
                      </div>
                      <div>
                         <p className="text-[0.5rem] font-black text-blue-400 uppercase mb-1">ID Number (NIK)</p>
                         <p className="text-xs font-mono font-bold text-gray-500">{details.kycData?.ktp}</p>
                      </div>
                   </div>
                </section>
             </div>

             {/* Section 2: Coverage Matrix */}
             <div className="space-y-4">
                <div className="flex items-center gap-3 text-indigo-500">
                   <ShieldCheck size={18}/>
                   <span className="text-[0.7rem] font-black uppercase tracking-widest">Protection Matrix</span>
                </div>
                <div className="p-8 bg-indigo-500/5 rounded-[3rem] border border-indigo-500/10">
                   <div className="flex justify-between items-center mb-6">
                      <div className="space-y-1">
                         <p className="text-[0.5rem] font-black text-indigo-400 uppercase tracking-widest">Protection Core</p>
                         <p className="text-lg font-black uppercase text-indigo-600 dark:text-indigo-400">{details.coverage.type}</p>
                      </div>
                      <BadgeCheck size={32} className="text-indigo-500 opacity-50"/>
                   </div>
                   <div className="flex flex-wrap gap-3">
                      {details.coverage.authorized && <Badge color="blue">Bengkel Resmi</Badge>}
                      {details.coverage.flood && <Badge color="primary">Banjir & Badai</Badge>}
                      {details.coverage.earthquake && <Badge color="amber">Gempa Bumi</Badge>}
                      {details.coverage.tpl > 0 && <span className="px-4 py-1.5 bg-white dark:bg-white/10 rounded-full text-[0.6rem] font-black uppercase tracking-widest border border-indigo-200">TPL {details.coverage.tpl/1000000}JT Limit</span>}
                   </div>
                </div>
             </div>

             {/* Section 3: Visual Audit (Retrieval) */}
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3 text-emerald-500">
                      <Microscope size={18}/>
                      <span className="text-[0.7rem] font-black uppercase tracking-widest">Audit Evidence Node</span>
                   </div>
                   <Badge color="emerald">Skor Kendaraan: {details.survey?.score}%</Badge>
                </div>
                <div className="grid grid-cols-5 gap-3">
                   {details.survey?.photos && Object.entries(details.survey.photos).map(([key, src]: any) => (
                      <div key={key} className="space-y-2 group cursor-pointer">
                         <div className="relative aspect-square rounded-2xl overflow-hidden border border-black/5 dark:border-white/10 group-hover:border-emerald-500 transition-all">
                            <img src={src} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={key} />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                               <Eye size={16} className="text-white"/>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>

             {/* Section 4: Financial Ledger */}
             <div className="space-y-4 pb-12">
                <div className="flex items-center gap-3 text-amber-500">
                   <Landmark size={18}/>
                   <span className="text-[0.7rem] font-black uppercase tracking-widest">Financial Audit Ledger</span>
                </div>
                <div className="p-8 bg-amber-500/5 rounded-[3rem] border border-amber-500/10 space-y-4">
                   <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
                      <span>Basic Premium ({details.financials?.baseRate}%)</span>
                      <span className="text-slate-900 dark:text-white font-mono">{formatIDR(details.financials?.basicPremium || 0)}</span>
                   </div>
                   <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
                      <span>Sync Fees & Tax</span>
                      <span className="text-slate-900 dark:text-white font-mono">{formatIDR((details.financials?.adminFee || 0) + (details.financials?.stampDuty || 0))}</span>
                   </div>
                   <div className="pt-6 border-t border-amber-500/20 flex justify-between items-end">
                      <div>
                         <p className="text-[0.6rem] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">Total Final Payout</p>
                         <p className="text-3xl font-black text-amber-600 tracking-tighter leading-none">{formatIDR(policy.premium)}</p>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-xl text-amber-600 border border-amber-500/20">
                         <CreditCard size={16}/>
                         <span className="text-[0.55rem] font-black uppercase tracking-widest">{details.financials?.paymentMethod}</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Action Hub */}
          <div className="p-8 border-t border-black/5 dark:border-white/5 bg-gray-50 dark:bg-white/5 flex gap-4">
             <button className="flex-1 py-5 bg-white dark:bg-white/10 border border-black/5 rounded-2xl text-[0.65rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:shadow-lg transition-all">
                <FileCheck size={18}/> E-Policy PDF
             </button>
             <button className="flex-1 py-5 bg-primary-500 text-white rounded-2xl text-[0.65rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-primary-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                <ShieldAlert size={18}/> START CLAIM AI
             </button>
          </div>
       </div>
    </div>
  );
};

const UserProfile: React.FC<UserProfileProps> = ({ currentUser, lang = Language.ID, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const t = (en: string, idn: string) => lang === Language.EN ? en : idn;

  useEffect(() => {
    if (currentUser?.id) {
      db.policies.where('userId').equals(currentUser.id).toArray().then(res => setPolicies(res.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())));
      db.claims.where('userId').equals(currentUser.id).toArray().then(setClaims);
      db.transactions.where('userId').equals(currentUser.id).toArray().then(setTransactions);
    }
  }, [currentUser]);

  const renderOverview = () => (
    <div className="space-y-6 animate-fade-in">
       {/* Identity Stats Grid */}
       <div className="grid grid-cols-2 gap-4">
          <div className="p-6 bg-white dark:bg-white/5 rounded-[2rem] border border-black/5 dark:border-white/5 space-y-2 shadow-sm group hover:border-primary-500/30 transition-all">
             <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-500 group-hover:scale-110 transition-transform"><ShieldCheck size={20}/></div>
             <p className="text-[0.55rem] font-black text-gray-400 uppercase tracking-widest">{t('Active Nodes', 'Asuransi Aktif')}</p>
             <p className="text-3xl font-black">{policies.filter(p => p.status === 'ACTIVE').length}</p>
          </div>
          <div className="p-6 bg-white dark:bg-white/5 rounded-[2rem] border border-black/5 dark:border-white/5 space-y-2 shadow-sm group hover:border-blue-500/30 transition-all">
             <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform"><Zap size={20}/></div>
             <p className="text-[0.55rem] font-black text-gray-400 uppercase tracking-widest">{t('Total Claims', 'Total Klaim')}</p>
             <p className="text-3xl font-black">{claims.length}</p>
          </div>
       </div>

       {/* Financial Snapshot */}
       <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden group border border-white/5">
          <div className="absolute top-0 right-0 p-8 opacity-[0.05] rotate-12 group-hover:rotate-0 transition-transform duration-1000">
             <TrendingUp size={160}/>
          </div>
          <div className="relative z-10 space-y-6">
             <div className="flex justify-between items-center">
                <p className="text-[0.6rem] font-black uppercase tracking-[0.3em] text-primary-400">{t('Total Coverage Value', 'Total Nilai Proteksi')}</p>
                <BadgeCheck size={20} className="text-emerald-500"/>
             </div>
             <h3 className="text-4xl font-black tracking-tighter">{formatIDR(policies.reduce((acc, p) => acc + (p.coverageDetails?.vehicle?.price || 0), 0))}</h3>
             <div className="flex items-center gap-3 py-3 border-t border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
                <span className="text-[0.55rem] font-black text-gray-400 uppercase tracking-widest">{t('Node Financial synchronization active', 'Sinkronisasi data finansial aktif')}</span>
             </div>
          </div>
       </div>

       {/* Recent Activity */}
       <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h4 className="text-[0.65rem] font-black uppercase text-gray-400 tracking-widest">{t('Audit Ledger Feed', 'Log Audit Terkini')}</h4>
            <button onClick={() => setActiveTab('CLAIMS')} className="text-[0.55rem] font-black text-primary-500 uppercase tracking-widest">{t('View All', 'Lihat Semua')}</button>
          </div>
          <div className="space-y-2">
             {transactions.slice(0, 3).map((tx, i) => (
                <div key={i} className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-black/5 flex items-center justify-between group transition-all hover:border-primary-500/20 active:scale-[0.98]">
                   <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'PAYMENT' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                         <History size={18}/>
                      </div>
                      <div>
                         <p className="text-xs font-black uppercase">{tx.type}</p>
                         <p className="text-[0.5rem] text-gray-400 uppercase font-bold">{new Date(tx.date).toLocaleDateString()}</p>
                      </div>
                   </div>
                   <p className={`text-sm font-black ${tx.type === 'PAYMENT' ? 'text-rose-500' : 'text-emerald-500'}`}>{tx.type === 'PAYMENT' ? '-' : '+'}{formatIDR(tx.amount)}</p>
                </div>
             ))}
             {transactions.length === 0 && (
                <div className="py-12 text-center opacity-30 flex flex-col items-center gap-3 bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-dashed border-gray-300">
                   <LayoutGrid size={32}/>
                   <p className="text-[0.6rem] font-black uppercase tracking-widest">{t('No Recent Activity', 'Belum Ada Aktivitas')}</p>
                </div>
             )}
          </div>
       </div>
    </div>
  );

  const renderPolicies = () => (
    <div className="space-y-4 animate-fade-in">
       <div className="flex justify-between items-center px-2">
          <h4 className="text-[0.65rem] font-black uppercase text-gray-400 tracking-widest">{t('Deployed Protection Nodes', 'Simpul Proteksi Terpasang')}</h4>
          <span className="text-[0.6rem] font-bold text-primary-500 bg-primary-500/10 px-3 py-1 rounded-full">{policies.length} Nodes</span>
       </div>
       
       {policies.length === 0 ? (
          <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4 bg-gray-50 dark:bg-white/5 rounded-[3rem] border-2 border-dashed border-gray-300">
             <Package size={48}/>
             <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest">{t('Zero Coverage Detected', 'Tidak Ada Proteksi')}</p>
                <p className="text-[0.55rem] font-bold uppercase">{t('Initialize your matrix.', 'Mulai lindungi aset kamu.')}</p>
             </div>
          </div>
       ) : (
          policies.map(p => (
            <div
               key={p.id}
               onClick={() => setSelectedPolicy(p)}
               className="mx-5 mt-3 rounded-2xl bg-white border border-gray-100 overflow-hidden sp-enter cursor-pointer active:scale-[0.98] transition-all"
            >
               <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        {p.type === 'CAR' ? <Car size={20} className="text-blue-500"/> : <Plane size={20} className="text-blue-500"/>}
                     </div>
                     <div>
                        <p className="text-sm font-semibold text-gray-900">{p.policyNumber}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{p.coverageDetails?.vehicle?.brand || 'SurePath'}</p>
                     </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                     {p.status === 'ACTIVE' && (
                       <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{t('ACTIVE', 'AKTIF')}</span>
                     )}
                     {p.status !== 'ACTIVE' && (
                       <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">{p.status}</span>
                     )}
                     <p className="text-sm font-semibold text-gray-900">{formatIDR(p.premium)}</p>
                  </div>
               </div>
            </div>
          ))
       )}
    </div>
  );

  const renderClaims = () => (
    <div className="space-y-4 animate-fade-in">
       {claims.length === 0 ? (
          <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4 bg-gray-50 dark:bg-white/5 rounded-[3rem] border-2 border-dashed border-gray-300">
             <ShieldAlert size={48}/>
             <p className="text-xs font-black uppercase tracking-widest">{t('No Claims Submitted', 'Belum Ada Klaim')}</p>
          </div>
       ) : (
          claims.map(c => (
            <div key={c.id} className="p-6 bg-white dark:bg-white/5 rounded-[2.5rem] border border-black/5 shadow-sm space-y-4 group">
               <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-500 group-hover:rotate-12 transition-transform"><History size={20}/></div>
                     <div>
                        <p className="text-xs font-black uppercase">{t('Case', 'Kasus')} #{c.id?.toString().slice(-4)}</p>
                        <p className="text-[0.5rem] text-gray-400 font-bold uppercase tracking-widest">{c.date}</p>
                     </div>
                  </div>
                  <span className={`px-4 py-1 rounded-full text-[0.5rem] font-black uppercase tracking-[0.2em] ${c.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>{c.status}</span>
               </div>
               <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-2xl border border-black/5">
                  <div className="flex justify-between mb-2 pb-2 border-b border-black/5">
                     <div>
                        <p className="text-[0.45rem] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{t('Policy Number', 'Nomor Polis')}</p>
                        <p className="text-[0.55rem] font-black uppercase">{c.policyNumber || '-'}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[0.45rem] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{t('Contact', 'Kontak')}</p>
                        <p className="text-[0.55rem] font-black uppercase">{c.contactInfo || '-'}</p>
                     </div>
                  </div>
                  <p className="text-[0.55rem] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('Event Chronology', 'Kronologi Kejadian')}</p>
                  <p className="text-[0.65rem] font-medium line-clamp-2 italic">"{c.chronology}"</p>
               </div>
               <div className="flex justify-between items-center pt-2">
                  <div className="flex -space-x-2">
                     {c.photos?.slice(0, 3).map((p, i) => (
                        <div key={i} className="w-8 h-8 rounded-lg border-2 border-white dark:border-slate-900 bg-slate-200 overflow-hidden">
                           <img src={p} className="w-full h-full object-cover" alt="claim" />
                        </div>
                     ))}
                  </div>
                  <button className="text-[0.55rem] font-black uppercase text-primary-500 flex items-center gap-1">{t('Details', 'Detail')} <ChevronRight size={10}/></button>
               </div>
            </div>
          ))
       )}
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-4 animate-fade-in">
       <div className="space-y-3">
          <p className="text-[0.6rem] font-black uppercase text-gray-400 tracking-widest ml-2">{t('Node Security & Sync', 'Keamanan & Akun')}</p>
          {[
              { id: 'biometric', label: t('Login Biometrik', 'Login Biometrik'), icon: Fingerprint, sub: 'Status: ' + t('Encrypted', 'Terenkripsi'), action: t('Update', 'Update') },
              { id: 'bank', label: t('Ledger Registry', 'Data Rekening'), icon: Landmark, sub: t('Withdrawal Sync', 'Sinkronisasi Dana'), action: t('Manage', 'Kelola') },
              { id: 'password', label: t('Protocol Keys', 'Password & Keamanan'), icon: Lock, sub: t('Update regularly', 'Perbarui berkala'), action: t('Change', 'Ganti') },
              { id: 'comms', label: t('Communication Hub', 'Pusat Notifikasi'), icon: Bell, sub: t('Email & Push', 'Email & Notif'), action: t('Config', 'Atur') },
          ].map((item, i) => (
              <div
                key={i}
                onClick={() => item.id === 'password' && setIsResetModalOpen(true)}
                className="flex items-center gap-3 px-5 py-4 bg-white border-b border-gray-50 active:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
                  <item.icon size={16}/>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 flex-1">{item.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                </div>
                <ChevronRight size={16} className="text-gray-300"/>
              </div>
          ))}
       </div>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen pb-28">
      {selectedPolicy && <PolicyDetailModal policy={selectedPolicy} onClose={() => setSelectedPolicy(null)} />}
      {isResetModalOpen && <PasswordResetModal email={currentUser?.email || ''} onClose={() => setIsResetModalOpen(false)} lang={lang} />}

      {/* Profile Hub Header */}
      <div className="bg-white px-5 pt-12 pb-5 border-b border-gray-100">
        <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
          {currentUser?.name?.[0] || 'M'}
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center">{currentUser?.name || t('Standard Member', 'User SurePath')}</h3>
        <p className="text-sm text-gray-500 text-center mt-0.5">{t('Node ID', 'ID Node')}: {currentUser?.nodeId || 'SP-GENESIS'}</p>

        {/* Trust Score Meter */}
        <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-[2.5rem] border border-black/5 space-y-4 shadow-inner mt-5">
           <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <Cpu size={14} className="text-primary-500"/>
                 <span className="text-[0.6rem] font-black uppercase text-gray-400 tracking-widest">{t('Tingkat Kepercayaan', 'Level Kepercayaan')}</span>
              </div>
              <span className="text-xl font-black text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">{currentUser?.trustScore || 85}%</span>
           </div>
           <div className="h-2.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden shadow-inner">
              <div
                 className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-[2000ms] shadow-[0_0_15px_#10b981]"
                 style={{ width: `${currentUser?.trustScore || 85}%` }}
              ></div>
           </div>
           <p className="text-[0.55rem] font-bold text-gray-500 uppercase leading-relaxed text-center tracking-widest opacity-70">
              {t('High score enables instant payouts.', 'Skor tinggi mengaktifkan pencairan dana instan.')}
           </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100 px-5">
         {[
           { id: 'OVERVIEW', label: t('Matrix', 'Ringkasan'), icon: LayoutGrid },
           { id: 'POLICIES', label: t('Nodes', 'Polis'), icon: ShieldCheck },
           { id: 'CLAIMS', label: t('Activity', 'Histori'), icon: Activity },
           { id: 'SETTINGS', label: t('Secure', 'Akun'), icon: Settings },
         ].map(tab => (
            <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as TabType)}
               className={activeTab === tab.id ? 'py-3 px-4 text-sm font-semibold text-emerald-600 border-b-2 border-emerald-500' : 'py-3 px-4 text-sm font-medium text-gray-400'}
            >
               {tab.label}
            </button>
         ))}
      </div>

      {/* Tab Content Area */}
      <div className="px-2 pb-10 min-h-[400px] pt-3">
         {activeTab === 'OVERVIEW' && renderOverview()}
         {activeTab === 'POLICIES' && renderPolicies()}
         {activeTab === 'CLAIMS' && renderClaims()}
         {activeTab === 'SETTINGS' && renderSettings()}
      </div>

      {/* Footer Actions */}
      <div className="px-5 space-y-4">
        <div className="flex items-center justify-center gap-2 opacity-30">
           <ShieldCheck size={12}/>
           <span className="text-[0.5rem] font-black uppercase tracking-widest">End-to-End Encrypted Registry Access</span>
        </div>
        <button onClick={onLogout} className="mx-5 mt-4 w-full h-12 rounded-xl border border-red-100 bg-red-50 text-red-600 font-semibold text-sm active:bg-red-100 transition-all">
           <LogOut size={18} className="inline mr-2"/> {t('Sign Out from Matrix', 'Keluar dari Jaringan')}
        </button>
      </div>
    </div>
  );
};

export default UserProfile;
