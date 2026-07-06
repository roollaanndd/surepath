import React, { useState, useCallback } from 'react';
import { Info, Building, CloudRain, Zap, AlertCircle, AlertTriangle, Ticket, Check, Loader2, X } from 'lucide-react';
import { formatIDR } from './WizardUI';
import { InsuranceType } from '../../types';
import { TPL_OPTIONS } from '../../services/ojkRates';
import { validatePromoCode, promoToDiscountPercent, type PromoCodeValidation } from '../../services/promoCodeService';
import { useHaptic } from '../ui';

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
  const haptic = useHaptic();

  // ── Promo code state ─────────────────────────────────────────────────────
  // Replaces the discount slider. Customers enter a code; we validate it
  // against sp_promo_codes (CMS) and apply the discount. Default discount = 0
  // unless a valid code is entered — restores margin that was previously
  // being given away silently via the slider.
  const [promoInput, setPromoInput] = useState(coverage.promoCode ?? '');
  const [promoValidation, setPromoValidation] = useState<PromoCodeValidation | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);

  const orderTotal = premiumBreakdown?.totalPayable ?? premiumBreakdown?.grossPremium ?? 0;

  const handleApplyPromo = useCallback(async () => {
    const code = promoInput.trim();
    if (!code) {
      setPromoValidation({ valid: false, error: 'Masukkan kode promo' });
      haptic.error();
      return;
    }
    setPromoChecking(true);
    setPromoValidation(null);
    try {
      const result = await validatePromoCode(code, orderTotal);
      setPromoValidation(result);
      if (result.valid) {
        const discountPercent = promoToDiscountPercent(result, orderTotal, discountCap);
        setCoverage({
          ...coverage,
          promoCode: result.code,
          discount: discountPercent,
          discountType: result.discountType === 'NOMINAL' ? 'NOMINAL' : 'PERCENT',
        });
        haptic.success();
      } else {
        // Clear the discount on invalid code
        setCoverage({ ...coverage, promoCode: '', discount: 0 });
        haptic.error();
      }
    } catch (e) {
      setPromoValidation({ valid: false, error: 'Terjadi kesalahan. Coba lagi.' });
      setCoverage({ ...coverage, promoCode: '', discount: 0 });
      haptic.error();
    } finally {
      setPromoChecking(false);
    }
  }, [promoInput, orderTotal, discountCap, coverage, setCoverage, haptic]);

  const handleRemovePromo = useCallback(() => {
    setPromoInput('');
    setPromoValidation(null);
    setCoverage({ ...coverage, promoCode: '', discount: 0, discountType: 'PERCENT' });
    haptic.tap();
  }, [coverage, setCoverage, haptic]);

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

       {/* ── Promo code input (replaces the discount slider) ────────────────── */}
       <div className="p-6 bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-[2.5rem] shadow-sm space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center"><Ticket size={20}/></div>
             <div>
                <p className="text-[0.6rem] font-black uppercase tracking-widest text-gray-500">Punya Kode Promo?</p>
                <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest opacity-80">Maks. diskon {discountCap}% · komisi mitra</p>
             </div>
          </div>

          {promoValidation?.valid ? (
            // ── Valid code applied — show success state with remove button ──
            <div className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
               <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center"><Check size={14} strokeWidth={3}/></div>
                  <div>
                     <p className="text-xs font-black text-emerald-700 dark:text-emerald-300">{promoValidation.code}</p>
                     <p className="text-[0.55rem] font-bold text-emerald-600 dark:text-emerald-400">
                        {promoValidation.discountType === 'PERCENT'
                           ? `Diskon ${promoValidation.discountValue}%`
                           : `Diskon ${formatIDR(promoValidation.discountValue ?? 0)}`}
                        {coverage.discount < (promoValidation.discountValue ?? 0) && promoValidation.discountType === 'PERCENT'
                           ? ` (dibatasi ${discountCap}%)`
                           : ''}
                     </p>
                  </div>
               </div>
               <button
                  onClick={handleRemovePromo}
                  aria-label="Hapus kode promo"
                  className="w-7 h-7 rounded-lg bg-white dark:bg-white/10 text-gray-400 hover:text-rose-500 flex items-center justify-center transition-colors"
               >
                  <X size={14}/>
               </button>
            </div>
          ) : (
            // ── Input + apply button ────────────────────────────────────────
            <div className="flex gap-2">
               <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleApplyPromo(); }}
                  placeholder=" Contoh: WELCOME10"
                  className="flex-1 h-12 px-4 rounded-2xl border-2 border-black/5 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-mono font-bold tracking-wider text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/30 focus:outline-none focus:border-emerald-500 uppercase"
               />
               <button
                  onClick={handleApplyPromo}
                  disabled={promoChecking || !promoInput.trim()}
                  className="h-12 px-5 rounded-2xl bg-amber-500 text-white font-black text-xs uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
               >
                  {promoChecking ? <Loader2 size={14} className="animate-spin"/> : null}
                  {promoChecking ? 'Cek...' : 'Pakai'}
               </button>
            </div>
          )}

          {/* Validation feedback */}
          {promoValidation && !promoValidation.valid && promoValidation.error && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-500/5 rounded-xl border border-rose-500/20">
               <AlertCircle size={14} className="text-rose-500 shrink-0"/>
               <p className="text-[0.6rem] font-bold text-rose-600 dark:text-rose-400">{promoValidation.error}</p>
            </div>
          )}

          {/* Discount amount display (when a valid code is applied) */}
          {promoValidation?.valid && premiumBreakdown && premiumBreakdown.discountAmount > 0 && (
            <div className="p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-center">
               <p className="text-[0.45rem] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                  Total Hemat Kamu
               </p>
               <p className="text-sm font-black text-emerald-500">{formatIDR(premiumBreakdown.discountAmount)}</p>
            </div>
          )}

          <p className="text-[0.5rem] text-gray-400 italic flex items-center gap-1.5">
             <Info size={9}/> Coba <span className="font-mono font-bold">WELCOME10</span> untuk diskon 10%.
          </p>
       </div>
    </div>
  );
};

export default StepCoverage;