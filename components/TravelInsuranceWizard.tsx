
import React, { useState, useMemo } from 'react';
import { 
  Plane, Globe, MapPin, Calendar, Users, ChevronRight, 
  ShieldCheck, Info, Check, 
  ChevronLeft, User, AlertCircle, 
  Wallet} from 'lucide-react';
// Porting missing constants from root constants.ts
import { TRAVEL_PRICING, TRAVEL_BENEFITS } from '../constants';
import { TravelState, TravelPlanType, TravelRegion, Language } from '../types';

const formatIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

/* Fix: Added lang to props */
const TravelInsuranceWizard = ({ onComplete, currentUser }: { onComplete: () => void, currentUser?: any, lang: Language }) => {
  const [step, setStep] = useState(0);
  const [travel, setTravel] = useState<TravelState>({
    destination: '',
    region: 'INTERNATIONAL',
    startDate: '',
    endDate: '',
    duration: 1,
    tripType: 'SINGLE',
    participantType: 'INDIVIDUAL',
    travelers: { adults: 1, children: 0, details: [] },
    selectedPlan: null
  });

  const STEPS = ['Trip Detail', 'Select Plan', 'Traveler Data', 'Review & Pay'];

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)) + 1);
  };

  const currentDuration = useMemo(() => calculateDuration(travel.startDate, travel.endDate), [travel.startDate, travel.endDate]);

  // Fix: Access band.rates[plan] to match updated constants.ts structure
  const getPremium = (plan: TravelPlanType) => {
    const regionPricing = TRAVEL_PRICING[travel.region as keyof typeof TRAVEL_PRICING] as any;
    if (!regionPricing) return 0;

    const list = regionPricing[travel.participantType as keyof typeof regionPricing] || regionPricing.INDIVIDUAL;
    const band = list.find((b: any) => currentDuration <= b.maxDays) || list[list.length - 1];
    
    return band.rates[plan] || 0;
  };

  const handleNext = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const handleBack = () => setStep(s => Math.max(s - 1, 0));

  const renderStep0 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="p-4 bg-primary-500/10 rounded-3xl border border-primary-500/20 flex gap-4">
         <Globe className="text-primary-500 flex-shrink-0" size={24}/>
         <p className="text-[0.65rem] font-bold text-gray-600 dark:text-gray-300 leading-relaxed uppercase tracking-wider">
           Sistem Asuransi Perjalanan Digital. Configure your itinerary for proses persetujuan instan.
         </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-[0.6rem] font-black uppercase text-gray-500 ml-1 tracking-widest">Region Tujuan</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'INTERNATIONAL', label: 'International', icon: Globe },
              { id: 'DOMESTIC', label: 'Domestik (RI)', icon: MapPin }
            ].map(r => (
              <button 
                key={r.id}
                onClick={() => setTravel({...travel, region: r.id as TravelRegion, selectedPlan: null})}
                className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all ${travel.region === r.id ? 'border-primary-500 bg-primary-500/5 text-primary-500' : 'border-black/5 bg-white dark:bg-white/5 text-gray-400'}`}
              >
                <r.icon size={18}/>
                <span className="text-[0.65rem] font-black uppercase">{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[0.6rem] font-black uppercase text-gray-500 ml-1">Tgl Berangkat</label>
            <input 
              type="date" 
              className="w-full p-4 rounded-2xl bg-white dark:bg-white/5 border-2 border-black/5 outline-none focus:border-primary-500 font-black text-sm"
              value={travel.startDate}
              onChange={(e) => setTravel({...travel, startDate: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[0.6rem] font-black uppercase text-gray-500 ml-1">Tgl Pulang</label>
            <input 
              type="date" 
              className="w-full p-4 rounded-2xl bg-white dark:bg-white/5 border-2 border-black/5 outline-none focus:border-primary-500 font-black text-sm"
              value={travel.endDate}
              onChange={(e) => setTravel({...travel, endDate: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[0.6rem] font-black uppercase text-gray-500 ml-1 tracking-widest">Tipe Trip</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'INDIVIDUAL', label: 'Individu', icon: User },
              { id: 'FAMILY', label: 'Family', icon: Users }
            ].map(t => (
              <button 
                key={t.id}
                onClick={() => setTravel({...travel, participantType: t.id as any, selectedPlan: null})}
                className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all ${travel.participantType === t.id ? 'border-primary-500 bg-primary-500/5 text-primary-500' : 'border-black/5 bg-white dark:bg-white/5 text-gray-400'}`}
              >
                <t.icon size={18}/>
                <span className="text-[0.65rem] font-black uppercase">{t.label}</span>
              </button>
            ))}
          </div>
          {travel.participantType === 'FAMILY' && (
             <p className="text-[0.5rem] text-amber-500 font-bold uppercase mt-2">* Paket Family: Maks. 2 Dewasa + 2 Anak.</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep1 = () => {
    const plans: TravelPlanType[] = travel.region === 'INTERNATIONAL' 
      ? ['PLATINUM', 'GOLD', 'ASIA_EXTRA'] 
      : ['GARUDA_1', 'GARUDA_2'];

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between mb-2">
           <h4 className="text-[0.65rem] font-black uppercase text-gray-400 tracking-widest">Recommended Plan Matrix</h4>
           <div className="px-3 py-1 bg-primary-500/10 rounded-full text-[0.55rem] font-black text-primary-500 uppercase">{currentDuration} Days trip</div>
        </div>

        <div className="space-y-3">
          {plans.map(p => {
            const ben = TRAVEL_BENEFITS[p as keyof typeof TRAVEL_BENEFITS];
            const premium = getPremium(p);
            return (
              <div 
                key={p}
                onClick={() => setTravel({...travel, selectedPlan: p})}
                className={`p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all relative overflow-hidden group ${travel.selectedPlan === p ? 'border-primary-500 bg-primary-500/5 shadow-xl scale-[1.02]' : 'border-black/5 bg-white dark:bg-white/5 opacity-70'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <p className="text-[0.5rem] font-black text-primary-500 uppercase tracking-widest">Paket</p>
                    <h5 className="text-xl font-black uppercase tracking-tighter">{p.replace('_', ' ')}</h5>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-primary-500">{formatIDR(premium)}</p>
                    <p className="text-[0.45rem] text-gray-400 uppercase font-bold tracking-widest">Total Premi</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5 border-t border-black/5 pt-4">
                   <div className="space-y-1">
                      <p className="text-[0.45rem] font-black uppercase text-gray-400">Accident Benefit</p>
                      {/* Fixed: Property 'death' changed to 'deathBenefit' based on constants.ts type */}
                      <p className="text-xs font-black text-gray-900 dark:text-white tracking-tight">Rp {ben.deathBenefit}</p>
                   </div>
                   <div className="space-y-1 text-right">
                      <p className="text-[0.45rem] font-black uppercase text-gray-400">Medical Expense</p>
                      {/* Fixed: Property 'medical' changed to 'medicalBenefit' based on constants.ts type */}
                      <p className="text-xs font-black text-gray-900 dark:text-white tracking-tight">Rp {ben.medicalBenefit}</p>
                   </div>
                </div>

                <div className="flex flex-wrap gap-2">
                   {ben.features.map((f, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-white/5 rounded-full text-[0.45rem] font-black uppercase text-gray-500 tracking-widest">{f}</span>
                   ))}
                </div>

                {travel.selectedPlan === p && (
                  <div className="absolute top-4 right-4">
                     <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white shadow-lg animate-pop-in">
                        <Check size={14} strokeWidth={4}/>
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

  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in pb-20">
       <div className="p-6 bg-gradient-to-br from-gray-900 to-black rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 space-y-4">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg"><User size={20}/></div>
                <div>
                   <p className="text-[0.5rem] font-black uppercase text-primary-400">Identity Registry</p>
                   <p className="text-lg font-black uppercase tracking-tight">Main Traveler</p>
                </div>
             </div>
             <p className="text-[0.55rem] text-gray-400 leading-relaxed font-bold uppercase tracking-widest">Ensure details match your Passport / KTP for automated claim verification.</p>
          </div>
          <Users size={120} className="absolute -right-6 -bottom-6 opacity-10 rotate-12"/>
       </div>

       <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[0.5rem] font-black uppercase text-gray-400 ml-1">Nama Lengkap (Sesuai KTP/Passport)</label>
            <input 
              placeholder="Full Legal Name"
              defaultValue={currentUser?.name || ''}
              className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-white/5 border-2 border-black/5 outline-none focus:border-primary-500 font-black text-sm uppercase"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1.5">
                <label className="text-[0.5rem] font-black uppercase text-gray-400 ml-1">NIK / Passport</label>
                <input 
                  placeholder="ID Number" 
                  defaultValue={currentUser?.ktp || ''}
                  className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-white/5 border-2 border-black/5 outline-none focus:border-primary-500 font-black text-sm uppercase"
                />
             </div>
             <div className="space-y-1.5">
                <label className="text-[0.5rem] font-black uppercase text-gray-400 ml-1">Tgl Lahir</label>
                <input type="date" className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-white/5 border-2 border-black/5 outline-none focus:border-primary-500 font-black text-sm"/>
             </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[0.5rem] font-black uppercase text-gray-400 ml-1">Email Aktif</label>
            <input 
              type="email"
              placeholder="email@provider.com"
              defaultValue={currentUser?.email || ''}
              className="w-full px-5 py-4 rounded-2xl bg-white dark:bg-white/5 border-2 border-black/5 outline-none focus:border-primary-500 font-black text-sm"
            />
          </div>
       </div>

       <div className="bg-amber-50 dark:bg-amber-950/20 p-5 rounded-[2rem] border border-amber-100 dark:border-amber-900/30 flex gap-4">
          <AlertCircle className="text-amber-500 flex-shrink-0" size={24}/>
          <p className="text-[0.65rem] font-medium text-amber-800 dark:text-amber-200 leading-relaxed uppercase tracking-wide">
             Usia peserta 71 - 80 tahun dikenakan tambahan premi <span className="font-black">25%</span> dan jaminan manfaat disesuaikan menjadi <span className="font-black">75%</span>.
          </p>
       </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-fade-in">
       <div className="p-8 bg-white dark:bg-white/5 rounded-[3rem] border-2 border-black/5 space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 p-8 opacity-5"><Plane size={120}/></div>
          <div className="flex justify-between items-start relative z-10">
             <div className="space-y-1">
               <p className="text-[0.5rem] font-black uppercase text-gray-400 tracking-[0.3em]">Ringkasan Perjalanan</p>
               <h4 className="text-2xl font-black uppercase tracking-tighter text-primary-500">{travel.selectedPlan?.replace('_', ' ')}</h4>
             </div>
             <div className="p-3 bg-primary-500/10 rounded-2xl text-primary-500"><ShieldCheck size={24}/></div>
          </div>
          
          <div className="grid grid-cols-1 gap-4 pt-6 border-t border-black/5 relative z-10">
             <div className="flex justify-between items-center text-[0.65rem]">
                <span className="text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2"><MapPin size={12}/> Tujuan</span>
                <span className="font-black text-right uppercase">{travel.region}</span>
             </div>
             <div className="flex justify-between items-center text-[0.65rem]">
                <span className="text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2"><Calendar size={12}/> Durasi</span>
                <span className="font-black text-right uppercase tracking-widest">{currentDuration} Hari ({travel.startDate})</span>
             </div>
             <div className="flex justify-between items-center text-[0.65rem]">
                <span className="text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2"><Users size={12}/> Peserta</span>
                <span className="font-black text-right uppercase">{travel.participantType}</span>
             </div>
          </div>

          <div className="pt-6 border-t border-black/5 relative z-10">
              <div className="flex justify-between items-end">
                 <div>
                    <p className="text-[0.5rem] font-black uppercase text-gray-400 tracking-widest">Total Premi Net</p>
                    <h3 className="text-3xl font-black tracking-tighter text-primary-500">{formatIDR(getPremium(travel.selectedPlan!))}</h3>
                 </div>
                 <div className="flex flex-col items-end gap-1">
                    <p className="text-[0.45rem] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1"><Check size={10}/> All Fees Included</p>
                    <p className="text-[0.45rem] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1"><Check size={10}/> Instant Payout Ready</p>
                 </div>
              </div>
          </div>
       </div>

       <div className="bg-emerald-500/10 p-5 rounded-[2rem] border border-emerald-500/20 flex gap-4">
          <Info className="text-emerald-500 flex-shrink-0" size={24}/>
          <p className="text-[0.6rem] font-bold text-emerald-800 dark:text-emerald-200 leading-relaxed uppercase tracking-wider">
             Polis digital akan dikirim ke Email & WhatsApp dalam <span className="font-black">60 detik</span> setelah pembayaran divalidasi.
          </p>
       </div>

       <button 
         onClick={onComplete}
         className="w-full py-6 bg-gray-900 dark:bg-white text-white dark:text-black rounded-[2rem] font-black uppercase text-base tracking-[0.25em] shadow-2xl flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-95"
       >
         <Wallet size={24} className="text-primary-500"/>
         BAYAR SEKARANG
       </button>
    </div>
  );

  const canContinue = useMemo(() => {
    if (step === 0) return travel.startDate && travel.endDate;
    if (step === 1) return travel.selectedPlan !== null;
    return true;
  }, [step, travel]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-dark-bg text-gray-900 dark:text-white rounded-[3rem] overflow-hidden border border-black/5 shadow-2xl relative">
       <div className="px-8 pt-8 pb-4 bg-white dark:bg-white/5 border-b border-black/5 flex flex-col gap-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary-500/20 group"><Plane size={24} className="group-hover:rotate-12 transition-transform"/></div>
               <div>
                  <p className="text-[0.45rem] font-black text-gray-400 uppercase tracking-[0.4em] leading-none mb-1">Matrix Travel</p>
                  <h3 className="text-lg font-black uppercase tracking-tighter">Beli Asuransi Travel</h3>
               </div>
            </div>
            <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
               <div className="px-3 py-1 text-[0.6rem] font-black text-primary-500 uppercase tracking-widest">{STEPS[step]}</div>
            </div>
          </div>
          <div className="flex gap-2">
             {STEPS.map((_s, i) => (
               <div key={i} className={`h-1.5 rounded-full flex-1 transition-all duration-700 ${i === step ? 'bg-primary-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : i < step ? 'bg-primary-500/30' : 'bg-gray-200 dark:bg-white/10'}`}></div>
             ))}
          </div>
       </div>

       <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
       </div>

       <div className="px-8 py-6 bg-white dark:bg-[#111] border-t border-black/5 flex items-center justify-between gap-6 flex-shrink-0">
          <div className="flex-1">
             <p className="text-[0.55rem] font-black uppercase text-gray-400 leading-none mb-1 tracking-widest">Trip Premi</p>
             <p className="text-2xl font-black tracking-tighter text-primary-500">{travel.selectedPlan ? formatIDR(getPremium(travel.selectedPlan)) : 'Rp 0'}</p>
          </div>
          <div className="flex gap-3">
             {step > 0 && (
               <button onClick={handleBack} className="p-4 bg-gray-100 dark:bg-white/10 rounded-2xl text-gray-500 hover:text-primary-500 transition-colors">
                 <ChevronLeft size={24}/>
               </button>
             )}
             {step < STEPS.length - 1 && (
                <button 
                  onClick={handleNext} 
                  disabled={!canContinue}
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

export default TravelInsuranceWizard;
