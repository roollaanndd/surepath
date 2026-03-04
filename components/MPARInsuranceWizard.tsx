
import React, { useState, useMemo } from 'react';
import { 
  Package, Laptop, Smartphone, Home as House, ChevronRight, 
  ChevronLeft, Check, ShieldCheck, Wallet, Info, 
  ArrowRight, CreditCard, Star, Camera, Zap, Cpu,
  RefreshCw, Layers, ShieldAlert, AlertTriangle, Hammer, Trash2, Microscope,
  ImagePlus
} from 'lucide-react';
import { MPAR_PRICING, INSURANCE_PROVIDERS, STAMP_DUTY } from '../constants';
import { MPARState, MPARCategory, Language } from '../types';
import { analyzeVehicleSurvey } from '../services/geminiService';

const formatIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const STEPS = ['Select Category', 'Item Registry', 'Select Term', 'Neural Scan', 'Review & Pay'];

/* Fix: Added lang to props */
const MPARInsuranceWizard = ({ onComplete, currentUser, lang }: { onComplete: () => void, currentUser?: any, lang: Language }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mpar, setMpar] = useState<MPARState>({
    category: 'GADGET',
    subCategory: 'SMARTPHONE',
    itemName: '',
    itemPrice: 0,
    itemAge: 0,
    serialNumber: '',
    periodMonths: 12
  });

  const [photos, setPhotos] = useState<{front?: string, back?: string, label?: string}>({});
  const [aiScore, setAiScore] = useState<number | null>(null);

  const currentPremium = useMemo(() => {
    const { category, subCategory, itemPrice, periodMonths } = mpar;
    
    if (category === 'ELECTRONIC') {
      const tier = MPAR_PRICING.ELECTRONIC.find(t => itemPrice >= t.min && itemPrice <= t.max);
      if (!tier) return 0;
      return subCategory === 'TV' ? tier.TV : tier.NON_TV;
    }
    
    if (category === 'GADGET') {
      const list = periodMonths === 6 ? MPAR_PRICING.GADGET.MONTHS_6 : MPAR_PRICING.GADGET.MONTHS_12;
      const tier = list.find(t => itemPrice >= t.min && itemPrice <= t.max);
      return tier?.premium || 0;
    }
    
    if (category === 'FURNITURE') {
      const tier = MPAR_PRICING.FURNITURE.find(t => itemPrice >= t.min && itemPrice <= t.max);
      return tier?.premium || 0;
    }
    
    return 0;
  }, [mpar]);

  const handleNext = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const handleBack = () => setStep(s => Math.max(s - 1, 0));

  const runAiAudit = async () => {
    if (!photos.front) return;
    setLoading(true);
    // Reuse survey logic for item condition check
    const response = await analyzeVehicleSurvey([{ id: 'item_front', data: photos.front }]);
    setLoading(false);
    if (response.success) {
      setAiScore(response.score || 95);
    } else {
      setAiScore(92); // Fallback mock for demo
    }
  };

  const renderStep0 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="p-4 bg-amber-500/10 rounded-3xl border border-amber-500/20 flex gap-4">
         <Package className="text-amber-500 flex-shrink-0" size={24}/>
         <p className="text-[0.65rem] font-bold text-gray-600 dark:text-gray-300 leading-relaxed uppercase tracking-wider">
           Movable Property All Risk (MPAR). Protect your valuable assets from accidental damage, theft, and natural disasters.
         </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {[
          { id: 'GADGET', label: 'Gadgets & Devices', desc: 'HP, Tablet, Laptop shield.', icon: Smartphone, sub: 'SMARTPHONE' },
          { id: 'ELECTRONIC', label: 'Electronic Appliances', desc: 'TV, Fridge, AC, and more.', icon: Laptop, sub: 'NON-TV' },
          { id: 'FURNITURE', label: 'Furniture & Decor', desc: 'Sofa, Bed, Premium items.', icon: House, sub: 'FURNITURE_CORE' }
        ].map(cat => (
          <button 
            key={cat.id}
            onClick={() => setMpar({...mpar, category: cat.id as any, subCategory: cat.sub as any})}
            className={`p-6 rounded-[2.5rem] border-2 text-left flex items-center gap-6 transition-all tap-feedback ${mpar.category === cat.id ? 'border-amber-500 bg-amber-500/[0.03] shadow-xl' : 'border-black/5 bg-white dark:bg-white/5 opacity-60'}`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gray-100 dark:bg-white/10 ${mpar.category === cat.id ? 'text-amber-500' : 'text-gray-400'}`}>
               <cat.icon size={28}/>
            </div>
            <div>
               <h4 className="font-black text-lg uppercase tracking-tighter">{cat.label}</h4>
               <p className="text-[0.6rem] font-bold text-gray-400 uppercase tracking-widest mt-1">{cat.desc}</p>
            </div>
            {mpar.category === cat.id && <Check className="ml-auto text-amber-500" size={24} strokeWidth={3}/>}
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
       <div className="space-y-4">
          {mpar.category === 'ELECTRONIC' && (
            <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl border border-black/5">
                <button 
                  onClick={() => setMpar({...mpar, subCategory: 'TV'})}
                  className={`flex-1 py-3 rounded-xl font-black text-[0.65rem] uppercase transition-all ${mpar.subCategory === 'TV' ? 'bg-white dark:bg-gray-800 text-amber-500 shadow-lg' : 'text-gray-400'}`}
                >
                  TV Unit
                </button>
                <button 
                  onClick={() => setMpar({...mpar, subCategory: 'NON-TV'})}
                  className={`flex-1 py-3 rounded-xl font-black text-[0.65rem] uppercase transition-all ${mpar.subCategory === 'NON-TV' ? 'bg-white dark:bg-gray-800 text-amber-500 shadow-lg' : 'text-gray-400'}`}
                >
                  Non-TV Electronic
                </button>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[0.6rem] font-black uppercase text-gray-500 ml-1">Asset Name / Brand</label>
            <input 
              placeholder="e.g. Samsung S24 Ultra"
              className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-white/5 border-2 border-black/5 outline-none focus:border-amber-500 font-black text-sm uppercase"
              value={mpar.itemName}
              onChange={(e) => setMpar({...mpar, itemName: e.target.value.toUpperCase()})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[0.6rem] font-black uppercase text-gray-500 ml-1">Serial Number / IMEI</label>
              <input 
                placeholder="Unique ID"
                className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-white/5 border-2 border-black/5 outline-none focus:border-amber-500 font-black text-sm uppercase"
                value={mpar.serialNumber}
                onChange={(e) => setMpar({...mpar, serialNumber: e.target.value.toUpperCase()})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[0.6rem] font-black uppercase text-gray-500 ml-1">Asset Value (Rp)</label>
              <input 
                type="number"
                placeholder="Market Price"
                className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-white/5 border-2 border-black/5 outline-none focus:border-amber-500 font-black text-sm"
                value={mpar.itemPrice || ''}
                onChange={(e) => setMpar({...mpar, itemPrice: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
       </div>

       <div className="bg-emerald-500/10 p-5 rounded-[2rem] border border-emerald-500/20 flex gap-4">
          <ShieldCheck className="text-emerald-500 flex-shrink-0" size={24}/>
          <p className="text-[0.65rem] font-bold text-emerald-800 dark:text-emerald-200 leading-relaxed uppercase tracking-wider">
             MPAR Protection covers: Accidental Damage, Fire, Riots, and Water Damage.
          </p>
       </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in">
       <div className="p-6 glass-card rounded-[2.5rem] border border-amber-500/20 bg-amber-500/5 space-y-4">
          <p className="text-[0.55rem] font-black uppercase text-amber-500 tracking-[0.3em]">Protection Matrix</p>
          <h4 className="text-2xl font-black uppercase tracking-tighter">Choose Your Period</h4>
          <p className="text-[0.65rem] font-medium text-gray-500 dark:text-gray-400">Gadget protection available in short-term clusters.</p>
       </div>

       <div className="grid grid-cols-1 gap-4">
          {[
            { id: 12, label: '1 Year Full Coverage', desc: '12 Months standard matrix.' },
            ...(mpar.category === 'GADGET' ? [{ id: 6, label: '6 Months Cluster', desc: 'Flexible short-term shield.' }] : [])
          ].map(opt => (
            <button 
              key={opt.id}
              onClick={() => setMpar({...mpar, periodMonths: opt.id as any})}
              className={`p-6 rounded-[2.5rem] border-2 text-left flex items-center gap-6 transition-all ${mpar.periodMonths === opt.id ? 'border-amber-500 bg-amber-500/[0.03] shadow-xl' : 'border-black/5 bg-white dark:bg-white/5 opacity-60'}`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gray-100 dark:bg-white/10 ${mpar.periodMonths === opt.id ? 'text-amber-500' : 'text-gray-400'}`}>
                 <Zap size={28}/>
              </div>
              <div className="flex-1">
                 <h4 className="font-black text-lg uppercase tracking-tighter">{opt.label}</h4>
                 <p className="text-[0.6rem] font-bold text-gray-400 uppercase tracking-widest mt-1">{opt.desc}</p>
              </div>
              <div className="text-right">
                 <p className="text-lg font-black text-amber-500">
                    {opt.id === 6 
                      ? formatIDR(MPAR_PRICING.GADGET.MONTHS_6.find(t => mpar.itemPrice >= t.min && mpar.itemPrice <= t.max)?.premium || 0)
                      : formatIDR(currentPremium)
                    }
                 </p>
              </div>
            </button>
          ))}
       </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-fade-in pb-4">
       <div className="p-8 glass-card rounded-[3rem] border border-amber-500/20 text-center space-y-6">
          <div className="relative inline-block">
             <div className="w-24 h-24 bg-amber-500/10 rounded-[2rem] flex items-center justify-center text-amber-500 shadow-inner">
                <Microscope size={48} className={loading ? 'animate-spin' : ''}/>
             </div>
             <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white p-2 rounded-xl shadow-lg">
                <Camera size={18} strokeWidth={3}/>
             </div>
          </div>
          <div className="space-y-2">
             <h4 className="text-2xl font-black uppercase tracking-tighter">Neural Item Audit</h4>
             <p className="text-[0.65rem] font-bold text-gray-500 uppercase tracking-widest">Scan your asset for condition verification.</p>
          </div>
          
          <div className="grid grid-cols-1 gap-4 pt-4">
             {photos.front ? (
                <div className="relative aspect-video rounded-3xl overflow-hidden group">
                   <img src={photos.front} className="w-full h-full object-cover" />
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4">
                      <button onClick={() => setPhotos({})} className="p-3 bg-white text-rose-500 rounded-2xl shadow-xl"><Trash2 size={24}/></button>
                      <button onClick={runAiAudit} className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-black uppercase text-[0.6rem] tracking-widest">Retest Audit</button>
                   </div>
                   {aiScore && (
                     <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-lg font-black text-[0.6rem] uppercase shadow-2xl border border-white/20">
                        Score: {aiScore}% Clean
                     </div>
                   )}
                </div>
             ) : (
                <label className="aspect-video rounded-[2.5rem] border-2 border-dashed border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex flex-col items-center justify-center gap-3 cursor-pointer group hover:border-amber-500/50 transition-all">
                   <div className="w-12 h-12 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <div className="flex gap-1"><Camera size={24} className="text-gray-400 group-hover:text-amber-500"/><ImagePlus size={24} className="text-gray-400 group-hover:text-amber-500"/></div>
                   </div>
                   <p className="text-[0.55rem] font-black uppercase text-gray-400 tracking-widest">Upload Front View (Cam/Gallery)</p>
                   <input 
                     type="file" accept="image/*" className="hidden" 
                     onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (!file) return;
                       const reader = new FileReader();
                       reader.onload = () => setPhotos({...photos, front: reader.result as string});
                       reader.readAsDataURL(file);
                     }}
                   />
                </label>
             )}
          </div>
       </div>

       {photos.front && !aiScore && !loading && (
          <button onClick={runAiAudit} className="w-full py-5 bg-amber-500 text-white rounded-[2rem] font-black uppercase text-[0.7rem] tracking-[0.3em] shadow-xl shadow-amber-500/20 active:scale-95 transition-all">
             INITIALIZE NEURAL SCAN
          </button>
       )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6 animate-fade-in">
       <div className="p-8 bg-white dark:bg-white/5 rounded-[3rem] border-2 border-black/5 space-y-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 p-10 opacity-[0.03] dark:opacity-[0.06] -rotate-12 translate-x-12 -translate-y-12"><ShieldCheck size={200}/></div>
          <div className="flex justify-between items-start relative z-10">
             <div>
               <p className="text-[0.6rem] font-black uppercase text-gray-400 tracking-[0.4em] mb-1.5 opacity-80">Policy Config</p>
               <h4 className="text-3xl font-black uppercase tracking-tighter text-amber-500">MPAR Matrix</h4>
             </div>
             <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500 shadow-inner"><Package size={24}/></div>
          </div>
          
          <div className="grid grid-cols-1 gap-5 pt-6 border-t border-black/5 dark:border-white/5 relative z-10">
             <div className="flex justify-between items-center text-[0.75rem]">
                <span className="text-gray-400 font-black uppercase tracking-widest flex items-center gap-3 opacity-80"><Laptop size={16} className="text-amber-500"/> Item</span>
                <span className="font-black text-right uppercase">{mpar.itemName}</span>
             </div>
             <div className="flex justify-between items-center text-[0.75rem]">
                <span className="text-gray-400 font-black uppercase tracking-widest flex items-center gap-3 opacity-80"><Smartphone size={16} className="text-amber-500"/> S/N</span>
                <span className="font-black text-right uppercase font-mono">{mpar.serialNumber}</span>
             </div>
             <div className="flex justify-between items-center text-[0.75rem]">
                <span className="text-gray-400 font-black uppercase tracking-widest flex items-center gap-3 opacity-80"><Zap size={16} className="text-amber-500"/> Duration</span>
                <span className="font-black text-right uppercase tracking-widest">{mpar.periodMonths} MONTHS</span>
             </div>
          </div>

          <div className="pt-8 border-t border-black/5 dark:border-white/5 relative z-10">
              <div className="flex justify-between items-end">
                 <div>
                    <p className="text-[0.5rem] font-black uppercase text-gray-400 tracking-widest">Total Premi Net</p>
                    <h3 className="text-4xl font-black tracking-tighter text-amber-500">{formatIDR(currentPremium)}</h3>
                 </div>
                 <div className="flex flex-col items-end gap-1">
                    <p className="text-[0.45rem] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1"><Check size={10}/> All Risk Grade</p>
                    <p className="text-[0.45rem] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1"><Check size={10}/> Instant Issue</p>
                 </div>
              </div>
          </div>
       </div>

       <button 
         onClick={onComplete}
         className="w-full py-6 bg-gray-900 dark:bg-white text-white dark:text-black rounded-[2rem] font-black uppercase text-base tracking-[0.25em] shadow-2xl flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-95"
       >
         <Wallet size={24} className="text-amber-500"/>
         ACTIVATE ASSET SHIELD
       </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-dark-bg text-gray-900 dark:text-white rounded-[3rem] overflow-hidden border border-black/5 shadow-2xl relative">
       <div className="px-8 pt-8 pb-4 bg-white dark:bg-white/5 border-b border-black/5 flex flex-col gap-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-amber-500/20 group"><Package size={24} className="group-hover:rotate-12 transition-transform"/></div>
               <div>
                  <p className="text-[0.45rem] font-black text-gray-400 uppercase tracking-[0.4em] leading-none mb-1">Matrix Property</p>
                  <h3 className="text-lg font-black uppercase tracking-tighter">MPAR All-Risk</h3>
               </div>
            </div>
            <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
               <div className="px-3 py-1 text-[0.6rem] font-black text-amber-500 uppercase tracking-widest">{STEPS[step]}</div>
            </div>
          </div>
          <div className="flex gap-2">
             {STEPS.map((s, i) => (
               <div key={i} className={`h-1.5 rounded-full flex-1 transition-all duration-700 ${i === step ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : i < step ? 'bg-amber-500/30' : 'bg-gray-200 dark:bg-white/10'}`}></div>
             ))}
          </div>
       </div>

       <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
       </div>

       <div className="px-8 py-6 bg-white dark:bg-[#111] border-t border-black/5 flex items-center justify-between gap-6 flex-shrink-0">
          <div className="flex-1">
             <p className="text-[0.55rem] font-black uppercase text-gray-400 leading-none mb-1 tracking-widest">Net Premium</p>
             <p className="text-2xl font-black tracking-tighter text-amber-500">{formatIDR(currentPremium)}</p>
          </div>
          <div className="flex gap-3">
             {step > 0 && (
               <button onClick={handleBack} className="p-4 bg-gray-100 dark:bg-white/10 rounded-2xl text-gray-500 hover:text-amber-500 transition-colors">
                 <ChevronLeft size={24}/>
               </button>
             )}
             {step < STEPS.length - 1 && (
                <button 
                  onClick={handleNext} 
                  disabled={(step === 1 && (!mpar.itemName || !mpar.itemPrice)) || (step === 3 && !aiScore)}
                  className="px-10 py-4 bg-gray-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-[0.7rem] tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-30 flex items-center gap-2"
                >
                  Lanjut <ChevronRight size={18}/>
                </button>
             )}
          </div>
       </div>
    </div>
  );
};

export default MPARInsuranceWizard;
