
import React, { useState, useEffect } from 'react';
import { Filter, Star, Coins, CheckCircle2, MinusCircle, ReceiptText, Check, Scale, X, ArrowRight, ShieldCheck, Zap, Clock } from 'lucide-react';
import { STAMP_DUTY } from '../../constants';
import { formatIDR } from './WizardUI';
import { db, DBProvider } from '../../db';
import { ProviderIcon } from '../shared/IconRenderer';

interface StepProvidersProps {
  sortBy: 'RATING' | 'PRICE';
  setSortBy: (s: 'RATING' | 'PRICE') => void;
  sortedProviders: any[]; // will be replaced internally
  selectedProviderId: string | null;
  setSelectedProviderId: (id: string | null) => void;
  premiumBreakdown: any;
  showProviderBreakdown: boolean;
  setShowProviderBreakdown: (b: boolean) => void;
}

const ComparisonModal = ({ isOpen, onClose, providers, selectedIds, premiumBreakdown, onSelectProvider }: any) => {
  if (!isOpen) return null;
  
  const comparisonData = providers.filter((p: any) => selectedIds.includes(p.id));

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
       <div className="bg-white dark:bg-gray-900 w-full max-w-5xl max-h-[90vh] rounded-[3rem] overflow-hidden flex flex-col border border-white/10 shadow-2xl relative">
          <div className="p-6 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-white/5">
             <div>
                <h3 className="text-xl font-black uppercase tracking-tighter">Matriks Perbandingan</h3>
                <p className="text-[0.6rem] font-bold text-gray-500 uppercase tracking-widest">Analisa Berdampingan</p>
             </div>
             <button onClick={onClose} className="p-3 rounded-full bg-gray-200 dark:bg-white/10 hover:bg-rose-500 hover:text-white transition-all">
                <X size={20}/>
             </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 no-scrollbar bg-[#f8fafc] dark:bg-[#050505]">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {comparisonData.map((p: any) => {
                   const price = (premiumBreakdown?.netPremium || 0) + p.adminFee + STAMP_DUTY;
                   return (
                     <div key={p.id} className="p-6 rounded-[2.5rem] bg-white dark:bg-white/[0.03] border-2 border-black/5 dark:border-white/5 flex flex-col gap-6 shadow-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all text-slate-900 dark:text-white">
                        <div className="text-center space-y-3 relative z-10">
                           <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-white/10 rounded-2xl flex items-center justify-center shadow-sm text-2xl font-black text-gray-500 dark:text-gray-300">
                               <ProviderIcon name={p.logo} size={32}/>
                           </div>
                           <div>
                             <h4 className="font-black text-lg uppercase tracking-tight">{p.name}</h4>
                             <div className="flex items-center justify-center gap-1.5 mt-1">
                                <Star size={12} className="fill-amber-500 text-amber-500"/>
                                <span className="text-xs font-bold">{p.rating} / 5.0</span>
                             </div>
                           </div>
                        </div>
                        
                        <div className="space-y-3 bg-gray-50 dark:bg-black/20 p-4 rounded-2xl border border-black/5 dark:border-white/5">
                           <div className="flex justify-between items-center">
                              <span className="text-[0.55rem] font-black uppercase text-gray-400">Biaya Admin</span>
                              <span className="text-xs font-black">{formatIDR(p.adminFee)}</span>
                           </div>
                           <div className="flex justify-between items-center pt-2 border-t border-black/5 dark:border-white/5">
                              <span className="text-[0.55rem] font-black uppercase text-gray-400">Total Akhir</span>
                              <span className="text-sm font-black text-emerald-500">{formatIDR(price)}</span>
                           </div>
                        </div>

                        <button 
                          onClick={() => onSelectProvider(p.id)}
                          className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-[0.65rem] tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                          Pilih Node Ini <ArrowRight size={14}/>
                        </button>
                     </div>
                   )
                })}
             </div>
          </div>
       </div>
    </div>
  )
}

const StepProviders: React.FC<StepProvidersProps> = ({
  sortBy, setSortBy, selectedProviderId, setSelectedProviderId,
  premiumBreakdown, showProviderBreakdown, setShowProviderBreakdown
}) => {
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [dynamicProviders, setDynamicProviders] = useState<DBProvider[]>([]);

  useEffect(() => {
    db.providers.toArray().then(providers => {
      // Filter active providers (checking both boolean true and number 1 for safety)
      const activeProviders = providers.filter(p => p.isActive === true || (p.isActive as any) === 1);
      setDynamicProviders(activeProviders);
    });
  }, []);

  const sortedList = [...dynamicProviders].sort((a, b) => {
    if (sortBy === 'RATING') return b.rating - a.rating;
    if (sortBy === 'PRICE') {
        const priceA = (premiumBreakdown?.netPremium || 0) + a.adminFee;
        const priceB = (premiumBreakdown?.netPremium || 0) + b.adminFee;
        return priceA - priceB;
    }
    return 0;
  });

  const toggleCompare = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCompareList(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSelectFromModal = (id: string) => {
    setSelectedProviderId(id);
    setShowCompareModal(false);
    setCompareList([]);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24 relative">
       <ComparisonModal 
          isOpen={showCompareModal} 
          onClose={() => setShowCompareModal(false)}
          providers={sortedList}
          selectedIds={compareList}
          premiumBreakdown={premiumBreakdown}
          onSelectProvider={handleSelectFromModal}
       />

       {compareList.length > 1 && (
         <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-pop-in">
            <button 
              onClick={() => setShowCompareModal(true)}
              className="bg-indigo-600 text-white pl-6 pr-8 py-3.5 rounded-full shadow-[0_20px_40px_-10px_rgba(79,70,229,0.5)] flex items-center gap-4 hover:scale-105 active:scale-95 transition-all border border-indigo-400/30"
            >
               <div className="bg-white/20 p-1.5 rounded-full">
                  <Scale size={18} className="text-white"/>
               </div>
               <span className="text-xs font-black uppercase tracking-widest">Bandingkan ({compareList.length})</span>
            </button>
         </div>
       )}

       <div className="flex items-center justify-between px-2 bg-gray-100 dark:bg-white/[0.03] p-3 rounded-[1.5rem] border border-black/5 dark:border-white/5">
          <div className="flex items-center gap-3 text-gray-500 ml-2">
            <Filter size={16} className="text-emerald-500"/>
            <span className="text-[0.6rem] font-black uppercase tracking-[0.2em]">Urutkan Data:</span>
          </div>
          <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm">
             <button 
                onClick={() => setSortBy('RATING')}
                className={`px-5 py-2 rounded-lg text-[0.6rem] font-black uppercase transition-all flex items-center gap-2 ${sortBy === 'RATING' ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
             >
                <Star size={12} className={sortBy === 'RATING' ? 'fill-white' : ''}/> Rating
             </button>
             <button 
                onClick={() => setSortBy('PRICE')}
                className={`px-5 py-2 rounded-lg text-[0.6rem] font-black uppercase transition-all flex items-center gap-2 ${sortBy === 'PRICE' ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
             >
                <Coins size={12}/> Harga
             </button>
          </div>
       </div>

       <div className="space-y-5">
         {sortedList.map((p, cardIdx) => {
           const finalPremi = (premiumBreakdown?.netPremium || 0) + p.adminFee + STAMP_DUTY;
           const isSelected = selectedProviderId === p.id;
           const isComparing = compareList.includes(p.id);

           return (
             <div
               key={p.id}
               onClick={() => setSelectedProviderId(p.id)}
               style={{ animationDelay: `${cardIdx * 80}ms` }}
               className={`p-6 rounded-[2.8rem] border-2 cursor-pointer transition-all duration-300 relative overflow-hidden group tap-feedback bg-white dark:bg-white/[0.03] animate-fade-in ${isSelected ? 'border-emerald-500 shadow-2xl scale-[1.01] ring-4 ring-emerald-500/15' : 'border-black/5 hover:border-emerald-500/30 hover:shadow-lg hover:scale-[1.005]'}`}
             >
                <button 
                  onClick={(e) => toggleCompare(e, p.id)}
                  className={`absolute top-6 left-6 z-20 px-3 py-1.5 rounded-full flex items-center gap-2 transition-all border ${isComparing ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-gray-100 dark:bg-white/10 border-transparent text-gray-400 hover:bg-gray-200 dark:hover:bg-white/20'}`}
                >
                   <Scale size={12}/>
                   <span className="text-[0.5rem] font-black uppercase tracking-widest">{isComparing ? 'Membandingkan' : 'Bandingkan'}</span>
                </button>

                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 pt-8 sm:pt-0">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-[1.8rem] flex items-center justify-center font-black text-2xl shadow-inner transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${isSelected ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                      <ProviderIcon name={p.logo} size={32}/>
                    </div>
                    <div>
                       <h4 className="font-black text-lg uppercase tracking-tighter leading-tight text-slate-900 dark:text-white">{p.name}</h4>
                       <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => <Star key={i} size={11} className={`${i <= Math.floor(p.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-white/10'}`}/>)}
                          </div>
                          <span className="text-[0.65rem] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">{p.rating}</span>
                       </div>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto text-left sm:text-right pt-3 sm:pt-0 border-t sm:border-t-0 border-black/5 dark:border-white/5 flex flex-col justify-center">
                    <p className={`text-2xl font-black tracking-tighter leading-none transition-colors ${isSelected ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`}>{formatIDR(finalPremi)}</p>
                    <p className="text-[0.5rem] text-gray-400 uppercase font-black mt-2 tracking-[0.2em] opacity-80">Total Premi Bersih</p>
                  </div>
               </div>

               {/* Details Section */}
               <div className="mt-4 border-t border-black/5 dark:border-white/5 pt-5 space-y-5 mb-2">
                   {/* Quick stats row */}
                   <div className="flex flex-wrap gap-2">
                       <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                           <Coins size={13} className="fill-amber-600 dark:fill-amber-400" />
                           <span className="text-[0.6rem] font-black uppercase tracking-wider">+{p.extraCoinsPercent}% Cashback Koin</span>
                       </div>
                       {(p as any).authorizedGarage && (
                           <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                               <ShieldCheck size={13} />
                               <span className="text-[0.6rem] font-black uppercase tracking-wider">Bengkel Resmi</span>
                           </div>
                       )}
                       {(p as any).claimSpeed && (
                           <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30">
                               <Clock size={13} />
                               <span className="text-[0.6rem] font-black uppercase tracking-wider">Klaim {(p as any).claimSpeed}</span>
                           </div>
                       )}
                   </div>

                   {/* Benefits */}
                   {(p as any).benefits && (p as any).benefits.length > 0 && (
                       <div className="space-y-2">
                           <p className="text-[0.55rem] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1.5"><Zap size={11} className="text-emerald-500"/> Keunggulan Utama</p>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                               {(p as any).benefits.map((b: string, i: number) => (
                                   <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-black/5">
                                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                       <span className="text-[0.6rem] font-medium text-gray-600 dark:text-gray-300 leading-tight">{b}</span>
                                   </div>
                               ))}
                           </div>
                       </div>
                   )}

                   {/* Pros / Cons */}
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="space-y-2">
                           <p className="text-[0.55rem] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest flex items-center gap-1.5">
                               <CheckCircle2 size={12} /> Kelebihan
                           </p>
                           <ul className="space-y-1.5">
                               {p.advantages?.map((adv: string, i: number) => (
                                   <li key={i} className="flex items-start gap-2">
                                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                       <span className="text-xs font-medium text-gray-600 dark:text-gray-300 leading-relaxed">{adv}</span>
                                   </li>
                               ))}
                           </ul>
                       </div>
                       <div className="space-y-2">
                           <p className="text-[0.55rem] font-black uppercase text-rose-500 dark:text-rose-400 tracking-widest flex items-center gap-1.5">
                               <MinusCircle size={12} /> Kekurangan
                           </p>
                           <ul className="space-y-1.5">
                               {p.disadvantages?.map((dis: string, i: number) => (
                                   <li key={i} className="flex items-start gap-2">
                                       <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                                       <span className="text-xs font-medium text-gray-600 dark:text-gray-300 leading-relaxed">{dis}</span>
                                   </li>
                               ))}
                           </ul>
                       </div>
                   </div>
               </div>

               {isSelected && (
                 <div className="mt-6 pt-5 border-t border-black/5 dark:border-white/5">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowProviderBreakdown(!showProviderBreakdown); }}
                      className="w-full py-4 px-6 bg-emerald-500/10 text-emerald-500 rounded-2xl text-[0.65rem] font-black uppercase flex items-center justify-center gap-3 hover:bg-emerald-500 hover:text-white transition-all shadow-sm active:scale-95"
                    >
                      <ReceiptText size={18}/>
                      {showProviderBreakdown ? 'Sembunyikan Rincian' : 'Audit Rincian Biaya'}
                    </button>
                    
                    {showProviderBreakdown && (
                      <div className="mt-5 space-y-4 animate-fade-in px-5 py-4 bg-gray-50 dark:bg-black/40 rounded-3xl border border-black/5 dark:border-white/5 shadow-inner">
                        <div className="flex justify-between text-[0.65rem] font-black uppercase tracking-widest">
                          <span className="text-gray-400">Premi Dasar</span>
                          <span className="text-gray-900 dark:text-white font-mono">{formatIDR(premiumBreakdown?.basicPremium || 0)}</span>
                        </div>
                        <div className="flex justify-between text-[0.65rem] font-black uppercase tracking-widest">
                          <span className="text-gray-400">Biaya Admin ({p.name})</span>
                          <span className="text-gray-900 dark:text-white font-mono">{formatIDR(p.adminFee || 0)}</span>
                        </div>
                        <div className="flex justify-between text-[0.65rem] font-black uppercase tracking-widest">
                          <span className="text-gray-400">Biaya Materai OJK</span>
                          <span className="text-gray-900 dark:text-white font-mono">{formatIDR(premiumBreakdown?.stampDuty || 0)}</span>
                        </div>
                      </div>
                    )}
                 </div>
               )}

               {isSelected && (
                  <div className="absolute top-0 right-0 p-6 pointer-events-none">
                     <div className="w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-2xl animate-pop-in border-4 border-white dark:border-gray-900">
                        <Check size={22} strokeWidth={4}/>
                     </div>
                  </div>
               )}
             </div>
           );
         })}
       </div>
    </div>
  );
};

export default StepProviders;
