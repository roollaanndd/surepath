
import React from 'react';
import { ShieldCheck, Info, Car, Smartphone, Shield, ClipboardList, ChevronDown, AlertCircle } from 'lucide-react';
import { formatIDR } from './WizardUI';

interface StepPreSummaryProps {
  vehicle: any;
  coverage: any;
  premiumBreakdown: any;
  showBreakdown: boolean;
  setShowBreakdown: (b: boolean) => void;
}

const StepPreSummary: React.FC<StepPreSummaryProps> = ({
  vehicle, coverage, premiumBreakdown, showBreakdown, setShowBreakdown
}) => {
  return (
    <div className="space-y-8 animate-fade-in">
       <div className="p-8 bg-white dark:bg-white/5 rounded-[3rem] border-2 border-black/5 dark:border-white/5 space-y-8 shadow-2xl relative overflow-hidden text-gray-900 dark:text-white">
          <div className="absolute right-0 top-0 p-10 opacity-[0.03] dark:opacity-[0.06] -rotate-12 translate-x-12 -translate-y-12"><ShieldCheck size={200}/></div>
          <div className="flex justify-between items-start relative z-10">
             <div>
               <p className="text-[0.6rem] font-black uppercase text-gray-400 tracking-[0.4em] mb-1.5 opacity-80">Preliminary Policy Quote</p>
               <h4 className="text-3xl font-black uppercase tracking-tighter text-primary-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">{vehicle.brand} {vehicle.model}</h4>
             </div>
             <div className="p-4 bg-primary-500/10 rounded-2xl text-primary-500 shadow-inner"><Info size={24}/></div>
          </div>
          
          <div className="grid grid-cols-1 gap-5 pt-6 border-t border-black/5 dark:border-white/5 relative z-10">
             <div className="flex justify-between items-center text-[0.75rem]">
                <span className="text-gray-400 font-black uppercase tracking-widest flex items-center gap-3 opacity-80"><Car size={16} className="text-primary-500"/> Unit Kendaraan</span>
                <span className="font-black text-right uppercase">{vehicle.brand} {vehicle.model} ({vehicle.year})</span>
             </div>
             <div className="flex justify-between items-center text-[0.75rem]">
                <span className="text-gray-400 font-black uppercase tracking-widest flex items-center gap-3 opacity-80"><Smartphone size={16} className="text-primary-500"/> Nomor Polisi</span>
                <span className="font-black text-right tracking-[0.15em] bg-gray-900 dark:bg-white text-white dark:text-black px-3 py-1 rounded-lg text-sm">{vehicle.plate}</span>
             </div>
             <div className="flex justify-between items-center text-[0.75rem]">
                <span className="text-gray-400 font-black uppercase tracking-widest flex items-center gap-3 opacity-80"><Shield size={16} className="text-primary-500"/> Tipe Proteksi</span>
                <span className="font-black text-right text-primary-500 tracking-widest">{coverage.type}</span>
             </div>

             <div className="mt-6 overflow-hidden border border-black/5 dark:border-white/5 rounded-[2rem] transition-all duration-500 bg-gray-50/50 dark:bg-white/[0.01] shadow-inner">
                <button 
                    onClick={() => setShowBreakdown(!showBreakdown)}
                    className="w-full p-6 flex justify-between items-center text-[0.75rem] font-black uppercase tracking-widest group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-500/10 rounded-xl flex items-center justify-center"><ClipboardList size={16} className="text-primary-500"/></div>
                        Total Premi Net
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-primary-500 text-2xl tracking-tighter">{formatIDR(premiumBreakdown?.totalPayable || 0)}</span>
                        <div className={`p-2 rounded-full bg-gray-100 dark:bg-white/5 transition-transform duration-500 ${showBreakdown ? 'rotate-180 bg-primary-500 text-white shadow-lg' : ''}`}>
                            <ChevronDown size={20}/>
                        </div>
                    </div>
                </button>
                
                {showBreakdown && (
                    <div className="px-8 pb-8 space-y-3.5 animate-fade-in border-t border-black/5 dark:border-white/5 pt-5 bg-white/[0.2] dark:bg-black/[0.2]">
                        <div className="flex justify-between text-[0.65rem] font-black uppercase tracking-[0.15em]">
                            <span className="text-gray-400">Premi Dasar ({premiumBreakdown?.baseRate}%)</span>
                            <span className="dark:text-white">{formatIDR(premiumBreakdown?.basicPremium || 0)}</span>
                        </div>
                        {premiumBreakdown?.expansions.map((exp: any, i: number) => (
                            <div key={i} className="flex justify-between text-[0.65rem] font-black uppercase tracking-[0.15em]">
                                <span className="text-gray-400">{exp.name} ({exp.rate}%)</span>
                                <span className="dark:text-white">{formatIDR(exp.val)}</span>
                            </div>
                        ))}
                    </div>
                )}
             </div>
          </div>
       </div>

       <div className="bg-amber-50 dark:bg-amber-950/20 p-6 rounded-[2.5rem] border border-amber-200 dark:border-amber-900/30 flex gap-5 shadow-sm animate-pop-in">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0 animate-pulse"><AlertCircle size={24}/></div>
          <p className="text-[0.7rem] font-black text-amber-800 dark:text-amber-200 leading-relaxed uppercase tracking-wider">
             Langkah Selanjutnya: <span className="text-amber-600 dark:text-amber-400">Audit Digital & Registrasi STNK</span>. Siapkan dokumen fisik STNK dan unit kendaraan Anda untuk Proses Scanning.
          </p>
       </div>
    </div>
  );
};

export default StepPreSummary;
