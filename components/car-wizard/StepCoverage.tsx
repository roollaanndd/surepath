import React from 'react';
import { Info, Building, CloudRain, Zap, AlertCircle, AlertTriangle, Percent, ArrowDown } from 'lucide-react';
import { formatIDR } from './WizardUI';
import { InsuranceType } from '../../types';
import { TPL_OPTIONS } from '../../services/ojkRates';

interface StepCoverageProps {
  coverage: any;
  setCoverage: (c: any) => void;
  premiumBreakdown?: any;
  /** CMS-backed discount cap (percent). From selected insurer product's
   *  max_discount_rate × 100. Falls back to 25 when no product is selected
   *  yet so the slider remains usable before the provider step. */
  maxDiscountPercent?: number;
}

const StepCoverage: React.FC<StepCoverageProps> = ({ coverage, setCoverage, premiumBreakdown, maxDiscountPercent = 25 }) => {
  const discountCap = Math.max(0, Math.min(100, maxDiscountPercent));
  return (
    <div className="space-y-6 animate-fade-in">
       <div className="p-1.5 bg-gray-100 dark:bg-white/[0.03] rounded-[1.8rem] flex gap-1.5 border border-black/5 dark:border-white/5">
          {([InsuranceType.COMPREHENSIVE, InsuranceType.TLO]).map(t => (
            <button
              key={t}
              onClick={() => setCoverage({...coverage, type: t})}
              className={`flex-1 py-4.5 rounded-[1.5rem] text-[0.75rem] font-black uppercase tracking-widest transition-all duration-300 ${coverage.type === t ? 'text-white shadow-xl scale-100 shadow-emerald-500/25' : 'text-gray-400 opacity-60 scale-95 hover:opacity-100'}`}
              style={coverage.type === t ? { background: 'linear-gradient(135deg, #00C16A 0%, #009E52 100%)' } : {}}
            >
              {t === InsuranceType.COMPREHENSIVE ? 'Lengkap (All Risk)' : 'Hanya Hilang (TLO)'}
            </button>
          ))}
       </div>

       <div className="space-y-4">
          <label className="text-[0.65rem] font-black uppercase text-gray-500 ml-2 tracking-widest">Tanggung Jawab Pihak Ketiga (TPL)</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
             {TPL_OPTIONS.map(opt => (
                <button
                   key={opt.value}
                   onClick={() => setCoverage({...coverage, tpl: opt.value})}
                   className={`p-4 rounded-[1.5rem] border-2 transition-all flex flex-col items-center gap-1 tap-feedback ${coverage.tpl === opt.value ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600 shadow-lg' : 'border-black/5 bg-white dark:bg-white/[0.03] text-gray-400 opacity-70'}`}
                >
                   <span className="font-black text-[0.7rem]">{opt.value === 0 ? 'TIDAK ADA' : `${opt.value/1000000}JT`}</span>
                   <span className="text-[0.45rem] font-bold opacity-60">Limit Ganti Rugi</span>
                </button>
             ))}
          </div>
          <p className="text-[0.55rem] font-bold text-gray-400 ml-2 italic flex items-center gap-1.5"><Info size={10} className="text-emerald-500"/> Manfaat biaya ganti rugi jika kamu menabrak orang/kendaraan lain.</p>
       </div>

       <div className="grid grid-cols-2 gap-4">
          {[
            { id: 'authorized', label: 'Bengkel Resmi', icon: Building, desc: 'Perbaikan di Dealer' },
            { id: 'flood', label: 'Banjir & Angin', icon: CloudRain, desc: 'Bencana Alam' },
            { id: 'earthquake', label: 'Gempa & Tsunami', icon: Zap, desc: 'Gempa Bumi' },
            { id: 'srcc', label: 'Kerusuhan (SRCC)', icon: AlertCircle, desc: 'Huru-hara & Riot' },
            { id: 'terrorism', label: 'Terorisme & Sabotase', icon: AlertTriangle, desc: 'TS / Sabotase' },
          ].map(opt => (
            <button 
              key={opt.id}
              onClick={() => setCoverage({...coverage, [opt.id]: !coverage[opt.id as keyof typeof coverage]})}
              className={`p-5 rounded-[2rem] border-2 text-left flex flex-col gap-2.5 transition-all tap-feedback ${coverage[opt.id as keyof typeof coverage] ? 'border-emerald-500 bg-emerald-500/5 shadow-lg ring-1 ring-emerald-500/20' : 'border-black/5 bg-white dark:bg-white/[0.03] opacity-60 hover:opacity-100'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${coverage[opt.id as keyof typeof coverage] ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                 <opt.icon size={20}/>
              </div>
              <div>
                <p className="text-[0.65rem] font-black uppercase leading-tight tracking-tight">{opt.label}</p>
                <p className="text-[0.45rem] font-black text-gray-400 uppercase tracking-widest mt-1 opacity-80">{opt.desc}</p>
              </div>
            </button>
          ))}
       </div>

       <div className="p-6 bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-[2.5rem] shadow-sm space-y-5">
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center"><Percent size={20}/></div>
                <div>
                   <p className="text-[0.6rem] font-black uppercase tracking-widest text-gray-500">Punya Kode Diskon?</p>
                   <p className="text-[0.5rem] font-bold text-amber-500 uppercase tracking-widest opacity-80">Maks. diskon = maks. komisi ({discountCap}%)</p>
                </div>
             </div>
             <div className="text-right">
                <p className="text-xl font-black text-amber-500">{coverage.discount}%</p>
             </div>
          </div>

          <div className="relative h-2 bg-gray-100 dark:bg-white/10 rounded-full">
             <div
               className="absolute top-0 left-0 h-full bg-amber-500 rounded-full transition-all"
               style={{ width: `${discountCap > 0 ? (coverage.discount / discountCap) * 100 : 0}%` }}
             ></div>
             <input
               type="range"
               min="0"
               max={discountCap}
               step="1"
               value={Math.min(coverage.discount, discountCap)}
               onChange={(e) => setCoverage({...coverage, discount: parseInt(e.target.value)})}
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
             />
             <div
                className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-4 border-amber-500 rounded-full shadow-lg pointer-events-none transition-all"
                style={{ left: `${discountCap > 0 ? (Math.min(coverage.discount, discountCap) / discountCap) * 100 : 0}%`, transform: 'translate(-50%, -50%)' }}
             ></div>
          </div>

          {premiumBreakdown && premiumBreakdown.discountAmount > 0 && (
             <div className="grid grid-cols-1 gap-4 pt-2">
                <div className="p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-center">
                   <p className="text-[0.45rem] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1"><ArrowDown size={10}/> Total Hemat Kamu</p>
                   <p className="text-sm font-black text-emerald-500">{formatIDR(premiumBreakdown.discountAmount)}</p>
                </div>
             </div>
          )}
       </div>
    </div>
  );
};

export default StepCoverage;