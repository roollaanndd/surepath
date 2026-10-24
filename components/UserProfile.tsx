
import React, { useState, useEffect } from 'react';
import { APP_VERSION } from '../src/version';
import { 
  User, ShieldCheck, ChevronRight, Landmark,
  Bell, FileCheck, Zap, LogOut,
  CheckCircle2, Lock, Package, Car, Plane,
  X, History,
  Fingerprint, ShieldAlert, BadgeCheck,
  CreditCard, LayoutGrid, 
  Microscope, Eye, Send, Loader2
} from 'lucide-react';
import { db, Policy, Claim, Transaction } from '../db';
import { Language } from '../types';
import { formatIDR } from './car-wizard/WizardUI';
import { getTncRecord, type TncRecord } from '../services/supabaseService';
import AccessibilitySettings from './customer/AccessibilitySettings';
import ChangePasswordModal from './shared/ChangePasswordModal';

interface UserProfileProps {
  currentUser: any;
  onStartClaim?: (policy: Policy) => void;
  lang?: Language;
  onLogout?: () => void;
}

type TabType = 'OVERVIEW' | 'POLICIES' | 'CLAIMS' | 'SETTINGS';

const Badge = ({ children, color = "primary" }: { children?: React.ReactNode, color?: string }) => {
  const styles: any = {
    primary: "bg-ds-green-tint text-ds-green border-green-200",
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
            <div className="w-20 h-20 bg-ds-green-tint rounded-[2rem] flex items-center justify-center text-ds-green mx-auto shadow-inner">
              <Lock size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                {t('Reset Password', 'Reset Kata Sandi')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                {t('We will send a secure link reset to your registered email address:', 'Kami akan mengirimkan tautan link reset aman ke alamat email terdaftar Anda:')}
              </p>
              <p className="text-sm font-black text-ds-green bg-ds-green-tint py-2 rounded-xl border border-green-100 mt-2">
                {email}
              </p>
            </div>
            <button 
              onClick={handleRequestReset}
              className="w-full py-5 bg-ds-green text-ds-on-green rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-ds-green active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Send size={18} /> {t('Send Reset Link', 'Kirim Link Reset')}
            </button>
          </div>
        )}

        {step === 'loading' && (
          <div className="py-12 space-y-6 animate-pulse">
            <div className="relative w-20 h-20 mx-auto">
               <div className="absolute inset-0 bg-ds-green-tint rounded-full blur-xl"></div>
               <Loader2 size={80} className="text-ds-green animate-spin relative z-10" />
            </div>
            <div className="space-y-2">
              <p className="text-[0.6rem] font-black uppercase tracking-[0.4em] text-ds-green">{t('Proses Sinkronisasi Link', 'Proses Sinkronisasi Link')}</p>
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
                <div className="w-14 h-14 bg-ds-green rounded-2xl flex items-center justify-center text-ds-on-green shadow-ds-green">
                   {policy.type === 'CAR' ? <Car size={28}/> : <Plane size={28}/>}
                </div>
                <div>
                   <p className="text-[0.6rem] font-black text-ds-green uppercase tracking-[0.3em]">Policy Matrix Node</p>
                   <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none mt-1">{policy.policyNumber}</h3>
                </div>
             </div>
             <button onClick={onClose} className="p-3 bg-gray-200 dark:bg-white/10 rounded-full hover:bg-rose-500 hover:text-white transition-all"><X size={24}/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
             {/* Section 1: Core Registry */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="space-y-4">
                   <div className="flex items-center gap-3 text-ds-green">
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
                            <p className="text-xs font-black uppercase tracking-widest text-ds-green bg-ds-green-tint px-2 py-1 rounded w-fit">{details.vehicle.plate}</p>
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
                            <img loading="lazy" src={src} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={key} />
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
             <button className="flex-1 py-5 bg-ds-green text-ds-on-green rounded-2xl text-[0.65rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-ds-green hover:scale-[1.02] active:scale-95 transition-all">
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
  const [tncRecord, setTncRecord] = useState<TncRecord | null>(null);

  const t = (en: string, idn: string) => lang === Language.EN ? en : idn;

  useEffect(() => {
    if (currentUser?.id) {
      db.policies.where('userId').equals(currentUser.id).toArray().then(res => setPolicies(res.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())));
      db.claims.where('userId').equals(currentUser.id).toArray().then(setClaims);
      db.transactions.where('userId').equals(currentUser.id).toArray().then(setTransactions);
      getTncRecord(currentUser.supabaseId ?? currentUser.id).then(setTncRecord).catch(() => {});
    }
  }, [currentUser]);

  const renderOverview = () => (
    <div className="space-y-4 animate-fade-in">
       {/* Stats Grid */}
       <div className="grid grid-cols-2 gap-3">
          <div className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-4 space-y-2">
             <div className="w-9 h-9 bg-ds-green-tint rounded-xl flex items-center justify-center"><ShieldCheck size={18} className="text-ds-green"/></div>
             <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest">{t('Active Policies', 'Asuransi Aktif')}</p>
             <p className="text-3xl font-black text-ds-ink">{policies.filter(p => p.status === 'ACTIVE').length}</p>
          </div>
          <div className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-4 space-y-2">
             <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center"><Zap size={18} className="text-ds-blue"/></div>
             <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest">{t('Total Claims', 'Total Klaim')}</p>
             <p className="text-3xl font-black text-ds-ink">{claims.length}</p>
          </div>
       </div>

       {/* Coverage hero */}
       <div className="rounded-2xl p-5 bg-ds-navy text-white relative overflow-hidden shadow-ds-lg">
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full blur-2xl pointer-events-none" style={{ background: 'rgba(0,200,150,0.12)' }} />
          <div className="relative z-10">
             <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">{t('Total Coverage Value', 'Total Nilai Proteksi')}</p>
             <h3 className="text-2xl font-black tracking-tight">{formatIDR(policies.reduce((acc, p) => acc + (p.coverageDetails?.vehicle?.price || 0), 0))}</h3>
             <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-ds-green animate-pulse" />
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{t('Coverage active', 'Proteksi aktif')}</span>
             </div>
          </div>
       </div>

       {/* Recent Activity */}
       <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest">{t('Recent Activity', 'Aktivitas Terkini')}</p>
            <button onClick={() => setActiveTab('CLAIMS')} className="text-[10px] font-bold text-ds-green uppercase tracking-widest">{t('View All', 'Lihat Semua')}</button>
          </div>
          <div className="space-y-2">
             {transactions.slice(0, 3).map((tx, i) => (
                <div key={i} className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-3 flex items-center justify-between active:scale-[0.98] transition-transform">
                   <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tx.type === 'PAYMENT' ? 'bg-rose-50 text-ds-red' : 'bg-ds-green-tint text-ds-green'}`}>
                         <History size={16}/>
                      </div>
                      <div>
                         <p className="text-xs font-black text-ds-ink uppercase">{tx.type}</p>
                         <p className="text-[10px] text-ds-ink3 font-medium">{new Date(tx.date).toLocaleDateString()}</p>
                      </div>
                   </div>
                   <p className={`text-sm font-black ${tx.type === 'PAYMENT' ? 'text-ds-red' : 'text-ds-green'}`}>{tx.type === 'PAYMENT' ? '-' : '+'}{formatIDR(tx.amount)}</p>
                </div>
             ))}
             {transactions.length === 0 && (
                <div className="py-10 text-center flex flex-col items-center gap-3 bg-ds-card rounded-2xl border border-dashed border-ds-border">
                   <LayoutGrid size={28} className="text-ds-ink3"/>
                   <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest">{t('No Recent Activity', 'Belum Ada Aktivitas')}</p>
                </div>
             )}
          </div>
       </div>
    </div>
  );

  const renderPolicies = () => (
    <div className="space-y-3 animate-fade-in">
       <div className="flex justify-between items-center">
          <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest">{t('My Policies', 'Polis Saya')}</p>
          <span className="text-[10px] font-bold text-ds-green bg-ds-green-tint px-2.5 py-1 rounded-full">{policies.length} {t('total', 'total')}</span>
       </div>
       {policies.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center gap-3 bg-ds-card rounded-2xl border border-dashed border-ds-border">
             <div className="w-12 h-12 rounded-2xl bg-ds-card2 flex items-center justify-center"><Package size={24} className="text-ds-ink3"/></div>
             <div className="space-y-1">
                <p className="text-sm font-black text-ds-ink2">{t('No policies yet', 'Belum ada polis')}</p>
                <p className="text-xs text-ds-ink3">{t('Start protecting yourself today', 'Mulai lindungi dirimu sekarang')}</p>
             </div>
          </div>
       ) : (
          policies.map(p => (
            <div
               key={p.id}
               onClick={() => setSelectedPolicy(p)}
               className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
            >
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                     {p.type === 'CAR' ? <Car size={18} className="text-ds-blue"/> : <Plane size={18} className="text-ds-blue"/>}
                  </div>
                  <div>
                     <p className="text-sm font-black text-ds-ink">{p.policyNumber}</p>
                     <p className="text-xs text-ds-ink3 mt-0.5">{p.coverageDetails?.vehicle?.brand || 'SurePath'}</p>
                  </div>
               </div>
               <div className="flex flex-col items-end gap-1">
                  {p.status === 'ACTIVE' ? (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-ds-green-tint text-ds-green">{t('ACTIVE', 'AKTIF')}</span>
                  ) : (
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-ds-amber">{p.status}</span>
                  )}
                  <p className="text-sm font-black text-ds-ink">{formatIDR(p.premium)}</p>
               </div>
            </div>
          ))
       )}
    </div>
  );

  const renderClaims = () => (
    <div className="space-y-3 animate-fade-in">
       {claims.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center gap-3 bg-ds-card rounded-2xl border border-dashed border-ds-border">
             <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center"><ShieldAlert size={24} className="text-ds-red"/></div>
             <p className="text-sm font-black text-ds-ink2">{t('No Claims Submitted', 'Belum Ada Klaim')}</p>
             <p className="text-xs text-ds-ink3">{t('Your claims will appear here', 'Klaim Anda akan muncul di sini')}</p>
          </div>
       ) : (
          claims.map(c => (
            <div key={c.id} className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-4 space-y-3">
               <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                     <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center flex-shrink-0"><History size={16} className="text-ds-red"/></div>
                     <div>
                        <p className="text-xs font-black text-ds-ink uppercase">{t('Case', 'Kasus')} #{c.id?.toString().slice(-4)}</p>
                        <p className="text-[10px] text-ds-ink3 font-medium">{c.date}</p>
                     </div>
                  </div>
                  <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full ${c.status === 'PAID' ? 'bg-ds-green-tint text-ds-green' : 'bg-amber-50 text-ds-amber'}`}>{c.status}</span>
               </div>
               <div className="p-3 bg-ds-card2 rounded-xl border border-ds-border">
                  <div className="flex justify-between mb-2 pb-2 border-b border-ds-border">
                     <div>
                        <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest mb-0.5">{t('Policy Number', 'Nomor Polis')}</p>
                        <p className="text-xs font-black text-ds-ink uppercase">{c.policyNumber || '-'}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest mb-0.5">{t('Contact', 'Kontak')}</p>
                        <p className="text-xs font-black text-ds-ink uppercase">{c.contactInfo || '-'}</p>
                     </div>
                  </div>
                  <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest mb-1">{t('Chronology', 'Kronologi')}</p>
                  <p className="text-xs text-ds-ink2 line-clamp-2 italic">"{c.chronology}"</p>
               </div>
               <div className="flex justify-between items-center">
                  <div className="flex -space-x-2">
                     {c.photos?.slice(0, 3).map((p, i) => (
                        <div key={i} className="w-8 h-8 rounded-lg border-2 border-ds-card bg-ds-card2 overflow-hidden">
                           <img loading="lazy" src={p} className="w-full h-full object-cover" alt="claim" />
                        </div>
                     ))}
                  </div>
                  <button className="text-[10px] font-black text-ds-green flex items-center gap-1">{t('Details', 'Detail')} <ChevronRight size={10}/></button>
               </div>
            </div>
          ))
       )}
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-3 animate-fade-in">
       <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest">{t('Security & Account', 'Keamanan & Akun')}</p>
       <div className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm overflow-hidden">
          {[
              { id: 'biometric', label: t('Biometric Login', 'Login Biometrik'), icon: Fingerprint, sub: t('Encrypted', 'Terenkripsi') },
              { id: 'bank', label: t('Bank Account', 'Data Rekening'), icon: Landmark, sub: t('Withdrawal sync', 'Sinkronisasi dana') },
              { id: 'password', label: t('Password & Security', 'Password & Keamanan'), icon: Lock, sub: t('Update regularly', 'Perbarui berkala') },
              { id: 'comms', label: t('Notifications', 'Notifikasi'), icon: Bell, sub: t('Email & Push', 'Email & Notif') },
          ].map((item, i, arr) => (
              <div
                key={i}
                onClick={() => item.id === 'password' && setIsResetModalOpen(true)}
                className={`flex items-center gap-3 px-4 py-3.5 active:bg-ds-card2 transition-colors cursor-pointer ${i < arr.length - 1 ? 'border-b border-ds-border' : ''}`}
              >
                <div className="w-8 h-8 rounded-xl bg-ds-card2 border border-ds-border flex items-center justify-center text-ds-ink3 flex-shrink-0">
                  <item.icon size={15}/>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-ds-ink">{item.label}</p>
                  <p className="text-xs text-ds-ink3 mt-0.5">{item.sub}</p>
                </div>
                <ChevronRight size={15} className="text-ds-ink3"/>
              </div>
          ))}
       </div>

       {/* T&C Acceptance Record */}
       <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest pt-1">{t('Terms & Conditions', 'Syarat & Ketentuan')}</p>
       {tncRecord ? (
         <div className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-4 space-y-3">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-xl bg-ds-green-tint flex items-center justify-center flex-shrink-0">
               <FileCheck size={15} className="text-ds-green" />
             </div>
             <div className="flex-1">
               <p className="text-sm font-bold text-ds-ink">{t('Terms Accepted', 'S&K Telah Disetujui')}</p>
               <p className="text-xs text-ds-ink3">
                 {new Date(tncRecord.accepted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                 {' · '}{tncRecord.tnc_version}
               </p>
             </div>
             <span className="text-[10px] font-black text-ds-green bg-ds-green-tint px-2 py-0.5 rounded-full">✓ Sah</span>
           </div>
           <div className="bg-ds-card2 rounded-xl px-3 py-2.5">
             <p className="text-[9px] font-bold text-ds-ink3 uppercase tracking-widest mb-1">{t('Reference Number', 'Nomor Referensi')}</p>
             <p className="text-sm font-black text-ds-ink font-mono tracking-wide">{tncRecord.reference_number}</p>
           </div>
           <p className="text-[9px] text-ds-ink3 leading-relaxed">
             {t(
               'This reference number is your legal proof of acceptance. Keep it for dispute resolution.',
               'Nomor referensi ini adalah bukti hukum persetujuan Anda. Simpan untuk keperluan sengketa.',
             )}
           </p>
         </div>
       ) : (
         <div className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-4 flex items-center gap-3">
           <div className="w-8 h-8 rounded-xl bg-ds-card2 border border-ds-border flex items-center justify-center text-ds-ink3 flex-shrink-0">
             <FileCheck size={15} />
           </div>
           <p className="text-sm text-ds-ink3">{t('No acceptance record found', 'Belum ada rekaman persetujuan')}</p>
         </div>
       )}

       {/* Accessibility — Display Size */}
       <AccessibilitySettings lang={lang} />
    </div>
  );

  return (
    <div className="bg-ds-bg min-h-screen pb-28">
      {selectedPolicy && <PolicyDetailModal policy={selectedPolicy} onClose={() => setSelectedPolicy(null)} />}
      {isResetModalOpen && <ChangePasswordModal email={currentUser?.email || ''} onClose={() => setIsResetModalOpen(false)} lang={lang} />}

      {/* Profile Header */}
      <div className="px-4 pt-4 pb-4 space-y-4">
        {/* Avatar + Name */}
        <div className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-ds-green flex items-center justify-center text-ds-on-green font-black text-xl shadow-ds-green flex-shrink-0">
            {currentUser?.name?.[0] || 'M'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black text-ds-ink tracking-tight truncate">{currentUser?.name || t('SurePath Member', 'Nasabah SurePath')}</h3>
            <p className="text-xs text-ds-ink3 mt-0.5">{currentUser?.email || ''}</p>
            <p className="text-[10px] font-bold text-ds-green uppercase tracking-widest mt-0.5">{currentUser?.nodeId || 'SP-GENESIS'}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest">{t('Trust', 'Kepercayaan')}</p>
            <p className="text-xl font-black text-ds-green">{currentUser?.trustScore || 85}%</p>
          </div>
        </div>

        {/* Trust Score bar */}
        <div className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-4 space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest">{t('Trust Score', 'Skor Kepercayaan')}</p>
            <span className="text-[10px] font-bold text-ds-green">{t('High score = instant payouts', 'Skor tinggi = pencairan instan')}</span>
          </div>
          <div className="h-2 bg-ds-card2 rounded-full overflow-hidden">
            <div
              className="h-full bg-ds-green rounded-full transition-all duration-[1500ms]"
              style={{ width: `${currentUser?.trustScore || 85}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-ds-card border-b border-ds-border px-4 gap-1">
         {[
           { id: 'OVERVIEW', label: t('Overview', 'Ringkasan') },
           { id: 'POLICIES', label: t('Policies', 'Polis') },
           { id: 'CLAIMS', label: t('Claims', 'Klaim') },
           { id: 'SETTINGS', label: t('Account', 'Akun') },
         ].map(tab => (
            <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as TabType)}
               className={`py-3 px-3 text-xs font-bold transition-colors border-b-2 ${activeTab === tab.id ? 'text-ds-green border-ds-green' : 'text-ds-ink3 border-transparent'}`}
            >
               {tab.label}
            </button>
         ))}
      </div>

      {/* Tab Content */}
      <div className="px-4 pt-4 pb-6 min-h-[400px]">
         {activeTab === 'OVERVIEW' && renderOverview()}
         {activeTab === 'POLICIES' && renderPolicies()}
         {activeTab === 'CLAIMS' && renderClaims()}
         {activeTab === 'SETTINGS' && renderSettings()}
      </div>

      {/* Logout */}
      <div className="px-4 pb-32 relative z-30">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (onLogout) onLogout();
          }}
          onTouchStart={(e) => e.stopPropagation()}
          className="w-full h-12 rounded-2xl bg-rose-50 border border-rose-100 text-ds-red font-bold text-sm flex items-center justify-center gap-2 active:bg-rose-100 hover:bg-rose-100 transition-colors touch-manipulation"
          style={{ minHeight: '48px' }}
        >
          <LogOut size={16}/> {t('Sign Out', 'Keluar')}
        </button>
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400 mt-4">
          SurePath · v{APP_VERSION}
        </p>
      </div>
    </div>
  );
};

export default UserProfile;
