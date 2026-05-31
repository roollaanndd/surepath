
import React from 'react';
// Added comment above fix
// Fix: Removed unused 'Card' from imports as it is not exported from './shared/UI'.
import { Badge } from './shared/UI';
import { 
  Car, Zap, 
  ShieldCheck, ChevronRight, MessageCircle, 
  ShoppingBag, Bell, ArrowUpRight, Activity
} from 'lucide-react';
import { formatIDR } from './car-wizard/WizardUI';

const MobilePortal = ({ currentUser, setPage, lang }: { currentUser: any, setPage: (p: string) => void, lang: string }) => {
  const t = (en: string, id: string) => lang === 'EN' ? en : id;

  return (
    <div className="pb-32 px-5 pt-8 space-y-10 animate-fade-in transition-all duration-700">
       {/* Greeting Hub */}
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center border border-slate-100 shadow-xl overflow-hidden active:scale-95 transition-all">
                <div className="w-full h-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white text-2xl font-black uppercase">
                   {currentUser?.name?.[0]}
                </div>
             </div>
             <div>
                <h3 className="text-2xl font-black tracking-tighter text-slate-900">Halo, {currentUser?.name.split(' ')[0]}!</h3>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded-lg w-fit">
                   <ShieldCheck size={12} className="text-emerald-500 animate-pulse"/>
                   <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{t("SECURE NODE", "KONEKSI AMAN")}</span>
                </div>
             </div>
          </div>
          <div className="flex gap-2">
             <button onClick={() => setPage('profile')} className="p-3.5 bg-white rounded-2xl shadow-lg border border-slate-100 text-slate-400 active:bg-slate-50 transition-all relative">
                <Bell size={22}/>
                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
             </button>
          </div>
       </div>

       {/* Neural Active Status Card */}
       <div className="p-8 bg-slate-900 rounded-[3rem] text-white shadow-[0_20px_50px_rgba(15,23,42,0.3)] relative overflow-hidden group border border-white/5 active:scale-[0.98] transition-all">
          <div className="absolute top-[-20%] right-[-10%] opacity-10 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-1000">
             <Activity size={240}/>
          </div>
          <div className="relative z-10 space-y-8">
             <div className="flex justify-between items-start">
                <div className="space-y-1">
                   <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em]">{t("ACTIVE PROTECTION", "PROTEKSI AKTIF")}</p>
                   <h4 className="text-3xl font-black uppercase tracking-tighter leading-none">{t("All Systems Clear", "Kondisi Aman")}</h4>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl border border-white/10 shadow-xl backdrop-blur-md">
                   <ShieldCheck size={24} className="text-emerald-400"/>
                </div>
             </div>
             
             <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center group-hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400"><Car size={20}/></div>
                   <div className="text-left">
                      <p className="text-xs font-black uppercase tracking-tight">Toyota Fortuner</p>
                      <p className="text-[8px] font-bold uppercase text-gray-500 tracking-widest">B 1234 XYZ</p>
                   </div>
                </div>
                <button onClick={() => setPage('profile')} className="p-2 text-emerald-400 hover:translate-x-1 transition-transform"><ChevronRight size={20}/></button>
             </div>
          </div>
       </div>

       {/* Quick Actions Matrix */}
       <div className="space-y-5">
          <div className="flex justify-between items-center px-2">
             <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">{t("Quick", "Menu")} <span className="text-emerald-500">{t("Actions", "Pintar")}</span></h3>
             <Badge variant="brand">{t("60s Claims", "Klaim 60dtk")}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <button onClick={() => setPage('products')} className="p-6 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center text-center gap-4 active:bg-emerald-50 transition-all group">
                <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500"><ShoppingBag size={28}/></div>
                <div className="space-y-0.5">
                   <span className="text-xs font-black uppercase tracking-widest text-slate-900">{t("New Policy", "Polis Baru")}</span>
                   <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{t("Deployment Hub", "Cek Proteksi")}</p>
                </div>
             </button>
             <button onClick={() => setPage('claims')} className="p-6 bg-emerald-600 rounded-[2.5rem] shadow-xl shadow-emerald-600/20 flex flex-col items-center text-center gap-4 active:scale-95 transition-all group text-white">
                <div className="w-16 h-16 rounded-3xl bg-white/20 text-white flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500"><Zap size={28}/></div>
                <div className="space-y-0.5">
                   <span className="text-xs font-black uppercase tracking-widest">{t("Start Claim", "Lapor Klaim")}</span>
                   <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest">{t("Express Path", "Jalur AI")}</p>
                </div>
             </button>
          </div>
       </div>

       {/* Recent Neural Feed */}
       <div className="space-y-5 pb-8">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">{t("Activity", "Laporan")} <span className="text-emerald-500">{t("Feed", "Terkini")}</span></h3>
            <button onClick={() => setPage('profile')} className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">{t("All Ledger", "Semua")} <ArrowUpRight size={10}/></button>
          </div>
          <div className="p-6 bg-white rounded-[2.2rem] shadow-sm border border-slate-50 text-center text-slate-400 text-sm font-bold">
             {t('No recent activity.', 'Belum ada aktivitas terkini.')}
          </div>
       </div>

       {/* Floating Support Button for Mobile */}
       <button onClick={() => setPage('help')} className="fixed bottom-32 right-6 w-16 h-16 bg-white rounded-3xl shadow-2xl flex items-center justify-center text-emerald-500 border border-emerald-50 active:scale-90 transition-all group z-40">
          <div className="absolute inset-0 bg-emerald-500/10 rounded-3xl blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
          <MessageCircle size={28} strokeWidth={2.5} className="relative z-10"/>
       </button>
    </div>
  );
};

export default MobilePortal;
