
import React, { useState, useMemo } from 'react';
import { Globe, MapPin, Users, ChevronRight, ShieldCheck, Info, Check, ChevronLeft, User, AlertCircle, Wallet, ExternalLink, ArrowRight, Loader2 } from 'lucide-react';
import { createPolicyOrder } from '../services/supabaseService';
import { createXenditInvoice } from '../services/paymentService';
// Porting missing constants from root constants.ts
import { TRAVEL_PRICING, TRAVEL_BENEFITS } from '../constants';
import { TravelState, TravelPlanType, TravelRegion, Language } from '../types';
import ModuleIcon from './shared/ModuleIcon';

const formatIDR = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

/* Fix: Added lang to props */
const TravelInsuranceWizard = ({ onComplete, currentUser, lang: _lang }: { onComplete: () => void, currentUser?: any, lang: Language }) => {
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

  // Local state for traveler KYC data, pre-filled from currentUser
  const [travelerData, setTravelerData] = useState({
    name: currentUser?.name || '',
    nik: currentUser?.ktp || '',
    email: currentUser?.email || '',
    birthDate: ''
  });

  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      <div className="p-4 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 flex gap-4">
         <ModuleIcon id="travel_safe" size={40} className="flex-shrink-0"/>
         <p className="text-[0.65rem] font-bold text-gray-600 dark:text-gray-300 leading-relaxed uppercase tracking-wider">
           Sistem Asuransi Perjalanan Digital. Configure your itinerary for proses persetujuan instan.
         </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Region Tujuan</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'INTERNATIONAL', label: 'International', icon: Globe },
              { id: 'DOMESTIC', label: 'Domestik (RI)', icon: MapPin }
            ].map(r => (
              <button 
                key={r.id}
                onClick={() => setTravel({...travel, region: r.id as TravelRegion, selectedPlan: null})}
                className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all ${travel.region === r.id ? 'border-emerald-500 bg-emerald-500/5 text-emerald-500' : 'border-black/5 bg-white dark:bg-white/5 text-gray-400'}`}
              >
                <r.icon size={18}/>
                <span className="text-[0.65rem] font-black uppercase">{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Tgl Berangkat</label>
            <input
              type="date"
              className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
              value={travel.startDate}
              onChange={(e) => setTravel({...travel, startDate: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Tgl Pulang</label>
            <input
              type="date"
              className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
              value={travel.endDate}
              onChange={(e) => setTravel({...travel, endDate: e.target.value})}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Tipe Trip</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'INDIVIDUAL', label: 'Individu', icon: User },
              { id: 'FAMILY', label: 'Family', icon: Users }
            ].map(t => (
              <button 
                key={t.id}
                onClick={() => setTravel({...travel, participantType: t.id as any, selectedPlan: null})}
                className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition-all ${travel.participantType === t.id ? 'border-emerald-500 bg-emerald-500/5 text-emerald-500' : 'border-black/5 bg-white dark:bg-white/5 text-gray-400'}`}
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
           <div className="px-3 py-1 bg-emerald-500/10 rounded-full text-[0.55rem] font-black text-emerald-500 uppercase">{currentDuration} Days trip</div>
        </div>

        <div className="space-y-3">
          {plans.map(p => {
            const ben = TRAVEL_BENEFITS[p as keyof typeof TRAVEL_BENEFITS];
            const premium = getPremium(p);
            return (
              <div
                key={p}
                onClick={() => setTravel({...travel, selectedPlan: p})}
                className={travel.selectedPlan === p ? "rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-4 cursor-pointer" : "rounded-2xl border border-gray-200 p-4 cursor-pointer active:bg-gray-50 transition-all"}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{p.replace('_', ' ')}</p>
                    <p className="text-lg font-bold text-emerald-600 font-mono mt-1">{formatIDR(premium)}</p>
                  </div>
                  {travel.selectedPlan === p && (
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg">
                      <Check size={14} strokeWidth={4}/>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3 border-t border-gray-100 pt-3">
                   <div>
                      <p className="text-xs text-gray-500">Accident Benefit</p>
                      {/* Fixed: Property 'death' changed to 'deathBenefit' based on constants.ts type */}
                      <p className="text-xs font-semibold text-gray-900 mt-0.5">Rp {ben.deathBenefit}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-xs text-gray-500">Medical Expense</p>
                      {/* Fixed: Property 'medical' changed to 'medicalBenefit' based on constants.ts type */}
                      <p className="text-xs font-semibold text-gray-900 mt-0.5">Rp {ben.medicalBenefit}</p>
                   </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                   {ben.features.map((f, i) => (
                      <span key={i} className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">{f}</span>
                   ))}
                </div>
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
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg"><User size={20}/></div>
                <div>
                   <p className="text-[0.5rem] font-black uppercase text-emerald-400">Identity Registry</p>
                   <p className="text-lg font-black uppercase tracking-tight">Main Traveler</p>
                </div>
             </div>
             <p className="text-[0.55rem] text-gray-400 leading-relaxed font-bold uppercase tracking-widest">Ensure details match your Passport / KTP for automated claim verification.</p>
          </div>
          <Users size={120} className="absolute -right-6 -bottom-6 opacity-10 rotate-12"/>
       </div>

       <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Nama Lengkap (Sesuai KTP/Passport)</label>
            <input
              placeholder="Full Legal Name"
              value={travelerData.name}
              onChange={(e) => setTravelerData({...travelerData, name: e.target.value.toUpperCase()})}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all uppercase"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">NIK / Passport</label>
                <input
                  placeholder="ID Number"
                  value={travelerData.nik}
                  onChange={(e) => setTravelerData({...travelerData, nik: e.target.value.toUpperCase()})}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all uppercase"
                />
             </div>
             <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Tgl Lahir</label>
                <input
                  type="date"
                  value={travelerData.birthDate}
                  onChange={(e) => setTravelerData({...travelerData, birthDate: e.target.value})}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"/>
             </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Email Aktif</label>
            <input
              type="email"
              placeholder="email@provider.com"
              value={travelerData.email}
              onChange={(e) => setTravelerData({...travelerData, email: e.target.value})}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
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
       <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-3">
          <div className="flex justify-between items-center">
             <span className="text-sm text-gray-500">Paket</span>
             <span className="text-sm font-semibold text-gray-900">{travel.selectedPlan?.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between items-center">
             <span className="text-sm text-gray-500">Tujuan</span>
             <span className="text-sm font-semibold text-gray-900">{travel.region}</span>
          </div>
          <div className="flex justify-between items-center">
             <span className="text-sm text-gray-500">Durasi</span>
             <span className="text-sm font-semibold text-gray-900">{currentDuration} Hari ({travel.startDate})</span>
          </div>
          <div className="flex justify-between items-center">
             <span className="text-sm text-gray-500">Peserta</span>
             <span className="text-sm font-semibold text-gray-900">{travel.participantType}</span>
          </div>
          <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
             <span className="text-sm font-bold text-gray-900">Total Premi Net</span>
             <span className="text-base font-bold text-emerald-600 font-mono">{formatIDR(getPremium(travel.selectedPlan!))}</span>
          </div>
       </div>

       <div className="bg-emerald-500/10 p-5 rounded-[2rem] border border-emerald-500/20 flex gap-4">
          <Info className="text-emerald-500 flex-shrink-0" size={24}/>
          <p className="text-[0.6rem] font-bold text-emerald-800 dark:text-emerald-200 leading-relaxed uppercase tracking-wider">
             Polis digital akan dikirim ke Email & WhatsApp dalam <span className="font-black">60 detik</span> setelah pembayaran divalidasi.
          </p>
       </div>

       {error && (
         <div className="bg-rose-500/10 p-5 rounded-[2rem] border border-rose-500/20 flex gap-4 items-center">
            <AlertCircle className="text-rose-500 flex-shrink-0" size={24}/>
            <p className="text-[0.65rem] font-bold text-rose-700 dark:text-rose-300 leading-relaxed uppercase tracking-wider">{error}</p>
         </div>
       )}

       <button
         onClick={handleActivate}
         disabled={isProcessing}
         className="w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all disabled:opacity-40 flex items-center justify-center gap-3"
       >
         {isProcessing ? (
           <><Loader2 size={20} className="animate-spin"/><span>Memproses...</span></>
         ) : (
           <><Wallet size={20}/><span>Beli Sekarang</span></>
         )}
       </button>
    </div>
  );

  const handleActivate = async () => {
    if (isProcessing || !travel.selectedPlan) return;
    setIsProcessing(true);
    setError(null);
    try {
      const premium = getPremium(travel.selectedPlan);
      const order = await createPolicyOrder({
        agent_id: currentUser?.id ?? '',
        client_id: currentUser?.id,
        client_name: travelerData.name || currentUser?.name || 'Nasabah',
        client_phone: currentUser?.phone,
        client_ktp: travelerData.nik || currentUser?.ktp,
        product_code: 'TRAVEL_INSURANCE',
        product_name: `Asuransi Perjalanan ${travel.selectedPlan.replace('_', ' ')} - ${travel.region}`,
        vehicle_type: undefined,
        vehicle_details: null,
        coverage_type: 'TRAVEL',
        zone: 1,
        vehicle_category: 0,
        addons: { region: travel.region, plan: travel.selectedPlan, duration: currentDuration, participantType: travel.participantType, travelerName: travelerData.name, travelerNik: travelerData.nik, travelerBirthDate: travelerData.birthDate, travelerEmail: travelerData.email },
        sum_insured: 0,
        base_premium: Math.round(premium),
        addon_premium: 0,
        admin_fee: 0,
        stamp_duty: 10000,
        total_premium: Math.round(premium),
        ojk_rate: 0,
        discount_rate: 0,
        discount_amount: 0,
        net_premium: Math.round(premium),
        commission_rate: 0,
        commission_amount: 0,
        coin_reward: 0,
        insurer_name: 'SurePath Travel',
        status: 'SUBMITTED',
        start_date: travel.startDate || new Date().toISOString(),
        end_date: travel.endDate || new Date(new Date().setMonth(new Date().getMonth() + 12)).toISOString(),
      });
      if (!order) throw new Error('Gagal membuat order');
      setOrderNumber(order.order_number ?? order.id);
      const invoice = await createXenditInvoice({
        order_id: order.id,
        order_number: order.order_number ?? order.id,
        client_name: travelerData.name || currentUser?.name || 'Nasabah',
        client_email: travelerData.email || currentUser?.email,
        client_phone: currentUser?.phone,
        product_name: order.product_name,
        total_premium: order.total_premium,
      });
      if (invoice?.invoice_url) {
        setInvoiceUrl(invoice.invoice_url);
        window.open(invoice.invoice_url, '_blank', 'noopener,noreferrer');
      }
      setIsSuccess(true);
    } catch (e) {
      console.error('handleActivate travel:', e);
      setError('Gagal memproses pesanan. Silakan coba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };

  const canContinue = useMemo(() => {
    if (step === 0) return travel.startDate && travel.endDate;
    if (step === 1) return travel.selectedPlan !== null;
    return true;
  }, [step, travel]);

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen p-8 text-center bg-[#f0faf7] dark:bg-[#050505] animate-fade-in">
        <div className="w-24 h-24 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl mb-8">
          <ShieldCheck size={56} strokeWidth={2.5}/>
        </div>
        <div className="space-y-4 mb-12">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
            Pesanan <span className="text-emerald-500">Diterima</span>
          </h2>
          <p className="text-[0.7rem] font-bold text-gray-500 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
            Pesanan perjalanan berhasil dikirim. Polis akan diterbitkan setelah pembayaran dikonfirmasi.
          </p>
        </div>
        <div className="w-full max-w-sm bg-white dark:bg-white/5 border border-black/5 rounded-[3rem] p-8 space-y-4 shadow-xl mb-10">
          <div className="flex justify-between items-center text-[0.6rem] font-black uppercase text-gray-400 tracking-widest">
            <span>No. Pesanan</span>
            <span className="text-emerald-500 font-mono">{orderNumber ?? '—'}</span>
          </div>
          <div className="flex justify-between items-center text-[0.6rem] font-black uppercase text-gray-400 tracking-widest">
            <span>Paket</span>
            <span className="font-black">{travel.selectedPlan?.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between items-center text-[0.6rem] font-black uppercase text-gray-400 tracking-widest">
            <span>Status</span>
            <span className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[0.55rem] font-black uppercase tracking-widest">Diproses</span>
          </div>
        </div>
        <div className="w-full max-w-sm space-y-4">
          {invoiceUrl && (
            <a href={invoiceUrl} target="_blank" rel="noopener noreferrer"
              className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
              Buka Halaman Pembayaran <ExternalLink size={18}/>
            </a>
          )}
          <button onClick={onComplete}
            className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
            Kembali ke Beranda <ArrowRight size={18}/>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-28">
       <div className="px-4 pt-4 pb-3 bg-white border-b border-gray-100 flex flex-col gap-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <button onClick={handleBack} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200 transition-colors">
                 <ChevronLeft size={20}/>
               </button>
               <span className="text-base font-semibold text-gray-900">Beli Asuransi Travel</span>
            </div>
            <span className="text-xs text-gray-400">{step + 1}/{STEPS.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
             {STEPS.map((_s, i) => (
               <React.Fragment key={i}>
                 {i > 0 && <div className={i <= step ? "flex-1 h-0.5 bg-emerald-500" : "flex-1 h-0.5 bg-gray-200"}></div>}
                 {i === step ? (
                   <div className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">{i + 1}</div>
                 ) : i < step ? (
                   <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center"><Check size={12} strokeWidth={3}/></div>
                 ) : (
                   <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-xs font-bold flex items-center justify-center">{i + 1}</div>
                 )}
               </React.Fragment>
             ))}
          </div>
       </div>

       <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
       </div>

       <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-white border-t border-gray-100 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex-1">
             <p className="text-xs text-gray-500">Trip Premi</p>
             <p className="text-lg font-bold text-emerald-600 font-mono">{travel.selectedPlan ? formatIDR(getPremium(travel.selectedPlan)) : 'Rp 0'}</p>
          </div>
          <div className="flex gap-2">
             {step < STEPS.length - 1 && (
                <button
                  onClick={handleNext}
                  disabled={!canContinue}
                  className="w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all disabled:opacity-40 px-8 flex items-center gap-2"
                >
                  Lanjut <ChevronRight size={16}/>
                </button>
             )}
          </div>
       </div>
    </div>
  );
};

export default TravelInsuranceWizard;
