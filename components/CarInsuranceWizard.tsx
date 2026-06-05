
import React, { useState, useMemo, useEffect } from 'react';
import { Car, X, ChevronLeft, ChevronRight, ShieldCheck, CheckCircle2, ArrowRight, Clock, AlertTriangle, Sparkles, ExternalLink } from 'lucide-react';
import { getOJKRate, EXPANSION_RATES, AUTHORIZED_WORKSHOP_RATE, STAMP_DUTY, PLATE_REGIONS, INSURANCE_PROVIDERS, BASE_COMMISSION_PERCENT } from '../constants';
import { InsuranceType, Language } from '../types';
import { DamageIssue, PhotoFlag } from '../services/geminiService';
import { getVehicleMarketValue, createPolicyOrder } from '../services/supabaseService';
import { createXenditInvoice } from '../services/paymentService';

// Import Steps
import StepVehicle from './car-wizard/StepVehicle';
import StepCoverage from './car-wizard/StepCoverage';
import StepProviders from './car-wizard/StepProviders';
import StepKYC from './car-wizard/StepKYC';
import StepPreSummary from './car-wizard/StepPreSummary';
import StepSurvey from './car-wizard/StepSurvey';
import StepFinal from './car-wizard/StepFinal';
import StepPayment from './car-wizard/StepPayment';

const STEPS = [
  { id: 'VEHICLE', label: 'Data Mobil' },
  { id: 'COVERAGE', label: 'Pilih Proteksi' },
  { id: 'PROVIDERS', label: 'Pilih Perusahaan' },
  { id: 'KYC', label: 'Data Diri' },
  { id: 'PRESUMMARY', label: 'Cek Pesanan' },
  { id: 'SURVEY', label: 'Cek Kondisi' },
  { id: 'REVIEW', label: 'Ringkasan' },
  { id: 'PAYMENT', label: 'Bayar' }
];

const CarInsuranceWizard = ({ onComplete, currentUser, lang }: { onComplete: () => void, currentUser?: any, lang: Language }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<'KTP' | 'STNK' | 'SURVEY' | null>(null);
  const [entryMode, setEntryMode] = useState<'DATABASE' | 'MANUAL'>('DATABASE');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showProviderBreakdown, setShowProviderBreakdown] = useState(false);
  const [sortBy, setSortBy] = useState<'RATING' | 'PRICE'>('RATING');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPayLater, setIsPayLater] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  const [vehicle, setVehicle] = useState({
    brand: '', model: '', year: 2025, isOther: false,
    price: 0, basePrice: 0, manualPrice: false, plate: '',
    vin: '', engine: '', color: '',
    region: '3' as '1'|'2'|'3', regionName: 'Region Lainnya', usage: 'PRIVATE', condition: 'NEW'
  });

  // Auto-populate price from admin vehicle DB when brand/model/year change
  useEffect(() => {
    if (!vehicle.brand || !vehicle.model || vehicle.manualPrice) return;
    let cancelled = false;
    getVehicleMarketValue(vehicle.brand, vehicle.model, vehicle.year).then(val => {
      if (!cancelled && val && val > 0) {
        setVehicle(prev => prev.manualPrice ? prev : { ...prev, price: val, basePrice: val });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [vehicle.brand, vehicle.model, vehicle.year, vehicle.manualPrice]);

  const [coverage, setCoverage] = useState({
    type: InsuranceType.COMPREHENSIVE as InsuranceType,
    flood: false, earthquake: false, srcc: false, 
    terrorism: false, authorized: false, 
    tpl: 0, 
    paDriver: 0, 
    paPassenger: 0,
    promo: '', discount: 0, discountType: 'PERCENT' as 'NOMINAL' | 'PERCENT'
  });

  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [kycData, setKycData] = useState({ 
    name: currentUser?.name || '', 
    ktp: currentUser?.ktp || '', 
    address: currentUser?.address || '', 
    email: currentUser?.email || '', 
    phone: currentUser?.phone || '', 
    photo: null as string|null 
  });
  const [verifiedFields, setVerifiedFields] = useState<Set<string>>(new Set());
  
  const [stnkResult, setStnkResult] = useState({
    ownerName: '',
    plate: '',
    vin: '',
    engine: '',
    color: '',
    year: '',
    status: ''
  });

  const [survey, setSurvey] = useState({ 
    stnk: null as string|null, 
    photos: {} as Record<string, string>, 
    score: 0, 
    summary: '',
    underwritingReport: '',
    detailedIssues: [] as DamageIssue[], 
    photoFlags: [] as PhotoFlag[],
    verdict: '' as 'CLEAN' | 'REVIEW_REQUIRED' | 'REJECTED' | 'MANUAL_REQUIRED' | '',
    rejectionReason: '',
    manualVerif: false, 
    manualRequestStatus: 'NONE' as 'NONE' | 'REQUESTED',
    manualDate: '',
    manualType: 'VIDEO' as 'VIDEO' | 'PHYSICAL',
    accessories: '' 
  });

  const [photoValidation, setPhotoValidation] = useState<Record<string, { status: 'LOADING' | 'VALID' | 'INVALID', msg?: string }>>({});

  const selectedProvider = useMemo(() => INSURANCE_PROVIDERS.find(p => p.id === selectedProviderId), [selectedProviderId]);

  const premiumBreakdown = useMemo(() => {
    if (!vehicle.price) return null;
    const baseRate = getOJKRate(vehicle.price / 1000000, vehicle.region, coverage.type);
    const basicPremium = (vehicle.price * baseRate) / 100;
    
    const expansions = [];
    if (coverage.authorized) expansions.push({ name: 'Bengkel Resmi (Authorized)', val: (vehicle.price * AUTHORIZED_WORKSHOP_RATE) / 100, rate: AUTHORIZED_WORKSHOP_RATE });
    if (coverage.flood) expansions.push({ name: 'Banjir & Angin Ribut', val: (vehicle.price * EXPANSION_RATES.FLOOD) / 100, rate: EXPANSION_RATES.FLOOD });
    if (coverage.earthquake) expansions.push({ name: 'Gempa & Tsunami', val: (vehicle.price * EXPANSION_RATES.EARTHQUAKE) / 100, rate: EXPANSION_RATES.EARTHQUAKE });
    
    const srccRate = coverage.type === InsuranceType.COMPREHENSIVE ? EXPANSION_RATES.SRCC.COMPREHENSIVE : EXPANSION_RATES.SRCC.TLO;
    if (coverage.srcc) expansions.push({ name: 'SRCC (Kerusuhan)', val: (vehicle.price * srccRate) / 100, rate: srccRate });

    const tsRate = coverage.type === InsuranceType.COMPREHENSIVE ? EXPANSION_RATES.TERRORISM.COMPREHENSIVE : EXPANSION_RATES.TERRORISM.TLO;
    if (coverage.terrorism) expansions.push({ name: 'Terorisme & Sabotase', val: (vehicle.price * tsRate) / 100, rate: tsRate });

    const tplPremium = (coverage.tpl / 100); 
    const paDriverPremium = (coverage.paDriver * EXPANSION_RATES.PA_DRIVER) / 100;
    const paPassengerPremium = (coverage.paPassenger * 4 * EXPANSION_RATES.PA_PASSENGER) / 100; // Assume 4 passengers

    const expansionTotal = expansions.reduce((acc: number, curr: any) => acc + curr.val, 0) + tplPremium + paDriverPremium + paPassengerPremium;
    const grossPremium = basicPremium + expansionTotal;
    
    const discountAmount = coverage.discountType === 'NOMINAL'
      ? Math.min(Math.max(coverage.discount || 0, 0), grossPremium)
      : grossPremium * (Math.min(coverage.discount || 0, 25) / 100);
    const discountPercent = grossPremium > 0 ? (discountAmount / grossPremium) * 100 : 0;
    const netPremium = grossPremium - discountAmount;

    return {
        baseRate, basicPremium, expansions, expansionTotal, tplPremium, paDriverPremium, paPassengerPremium, grossPremium, discountPercent, discountAmount,
        adminFee: selectedProvider?.adminFee || 0,
        stampDuty: STAMP_DUTY,
        netPremium,
        applicationFee: 5000,
        totalPayable: netPremium + (selectedProvider?.adminFee || 0) + STAMP_DUTY + 5000
    };
  }, [vehicle, coverage, selectedProvider]);

  const handleNext = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const handleBack = () => setStep(s => Math.max(s - 1, 0));

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputVal = e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, "");
    const prefix = inputVal.split(' ')[0];
    const regionInfo = PLATE_REGIONS[prefix];
    
    setVehicle({
      ...vehicle, 
      plate: inputVal, 
      region: regionInfo?.region || '3', 
      regionName: regionInfo ? `${regionInfo.name} (Region ${regionInfo.region})` : 'Luar Kota'
    });
  };

  const handlePaymentResult = async (method: string, resultStatus: 'SUCCESS' | 'PENDING_PAYMENT') => {
    if (!premiumBreakdown || !selectedProvider) return;
    setLoading(true);
    try {
      const payLaterMode = resultStatus === 'PENDING_PAYMENT';
      setIsPayLater(payLaterMode);

      const commissionAmount = Math.round((premiumBreakdown.grossPremium * BASE_COMMISSION_PERCENT) / 100);
      const coinReward = Math.round((premiumBreakdown.grossPremium * (selectedProvider.extraCoinsPercent || 0)) / 100);

      const order = await createPolicyOrder({
        agent_id: currentUser?.id ?? '',
        client_id: currentUser?.id,
        client_name: kycData.name,
        client_phone: kycData.phone,
        client_ktp: kycData.ktp,
        product_code: 'CAR_INSURANCE',
        product_name: `Asuransi Kendaraan ${coverage.type === InsuranceType.COMPREHENSIVE ? 'Komprehensif' : 'TLO'} - ${selectedProvider.name}`,
        vehicle_type: 'CAR',
        vehicle_details: {
          make: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          plate: vehicle.plate,
          chassis: vehicle.vin,
          engine: vehicle.engine,
          usage: vehicle.usage,
          province: vehicle.regionName,
        },
        coverage_type: coverage.type,
        zone: parseInt(vehicle.region),
        vehicle_category: 1,
        addons: {
          flood: coverage.flood, earthquake: coverage.earthquake,
          srcc: coverage.srcc, terrorism: coverage.terrorism,
          authorized: coverage.authorized, tpl: coverage.tpl,
          paDriver: coverage.paDriver, paPassenger: coverage.paPassenger,
        },
        sum_insured: vehicle.price,
        base_premium: Math.round(premiumBreakdown.basicPremium),
        addon_premium: Math.round(premiumBreakdown.expansionTotal),
        admin_fee: premiumBreakdown.adminFee,
        stamp_duty: premiumBreakdown.stampDuty,
        total_premium: Math.round(premiumBreakdown.totalPayable),
        ojk_rate: premiumBreakdown.baseRate,
        discount_rate: (premiumBreakdown.discountPercent || 0) / 100,
        discount_amount: Math.round(premiumBreakdown.discountAmount || 0),
        net_premium: Math.round(premiumBreakdown.netPremium),
        commission_rate: BASE_COMMISSION_PERCENT / 100,
        commission_amount: commissionAmount,
        coin_reward: coinReward,
        ai_score: survey.score,
        ai_verdict: survey.verdict || undefined,
        ai_findings: survey.detailedIssues,
        insurer_name: selectedProvider.name,
        status: 'SUBMITTED',
        start_date: new Date().toISOString(),
        end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
      });

      if (!order) throw new Error('Gagal membuat order di server');

      setOrderNumber(order.order_number ?? order.id);

      // Create Xendit invoice for immediate payment
      let link: string | null = null;
      if (!payLaterMode) {
        const invoice = await createXenditInvoice({
          order_id: order.id,
          order_number: order.order_number ?? order.id,
          client_name: kycData.name,
          client_email: kycData.email || undefined,
          client_phone: kycData.phone || undefined,
          product_name: order.product_name,
          total_premium: order.total_premium,
        });
        if (invoice?.invoice_url) {
          link = invoice.invoice_url;
          window.open(link, '_blank', 'noopener,noreferrer');
        }
      }

      setInvoiceUrl(link);
      localStorage.removeItem('SUREPATH_CAR_WIZARD_PROGRESS');
      setIsSuccess(true);
    } catch (e) {
      console.error('handlePaymentResult:', e);
      alert('Gagal memproses pesanan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
     return (
        <div className="flex flex-col items-center justify-center h-full min-h-screen p-8 text-center bg-[#f0faf7] dark:bg-[#050505] animate-fade-in">
           {isPayLater ? (
              <div className="w-24 h-24 bg-amber-500 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl mb-8 animate-pop-in">
                 <Clock size={56} strokeWidth={2.5}/>
              </div>
           ) : (
              <div className="w-24 h-24 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl mb-8 animate-pop-in">
                 <ShieldCheck size={56} strokeWidth={2.5}/>
              </div>
           )}

           <div className="space-y-4 mb-12">
              <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                 Pesanan <span className={isPayLater ? "text-amber-500" : "text-emerald-500"}>{isPayLater ? "Tersimpan" : "Diterima"}</span>
              </h2>
              <p className="text-[0.7rem] font-bold text-gray-500 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                 {isPayLater
                   ? "Pesanan tersimpan. Selesaikan pembayaran di menu Pesanan Saya untuk mengaktifkan perlindungan."
                   : "Pesanan berhasil dikirim ke penanggung. Tim kami akan memproses polis Anda setelah pembayaran dikonfirmasi."}
              </p>
           </div>

           <div className="w-full max-w-sm bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-[3rem] p-8 space-y-6 shadow-xl mb-10">
              <div className="flex justify-between items-center text-[0.6rem] font-black uppercase text-gray-400 tracking-widest">
                 <span>No. Pesanan</span>
                 <span className="text-primary-500 font-mono">{orderNumber ?? '—'}</span>
              </div>
              <div className="flex justify-between items-center text-[0.6rem] font-black uppercase text-gray-400 tracking-widest">
                 <span>Status</span>
                 <span className={`px-3 py-1 rounded-lg border text-[0.55rem] font-black uppercase tracking-widest ${isPayLater ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                    {isPayLater ? 'Menunggu Pembayaran' : 'Diproses'}
                 </span>
              </div>
              <div className="pt-6 border-t border-black/5 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500"><Car size={20}/></div>
                    <div className="text-left">
                       <p className="text-xs font-black uppercase text-slate-900 dark:text-white">{vehicle.brand} {vehicle.model}</p>
                       <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">{vehicle.plate}</p>
                    </div>
                 </div>
                 {isPayLater ? <AlertTriangle size={20} className="text-amber-500"/> : <CheckCircle2 size={20} className="text-emerald-500"/>}
              </div>
           </div>

           <div className="w-full max-w-sm space-y-4">
              {invoiceUrl && (
                 <a
                   href={invoiceUrl}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                 >
                   Buka Halaman Pembayaran <ExternalLink size={18}/>
                 </a>
              )}
              <button
                onClick={onComplete}
                className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                Kembali ke Beranda <ArrowRight size={18}/>
              </button>
           </div>
        </div>
     );
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#f0faf7] dark:bg-[#050505] text-gray-900 dark:text-white overflow-hidden relative">
       {/* HEADER SECTION */}
       <div className="px-6 pt-6 pb-4 bg-white/80 dark:bg-black/40 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 flex flex-col gap-5 flex-shrink-0 relative z-[100]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-slate-900 dark:bg-white rounded-2xl flex items-center justify-center text-white dark:text-black shadow-xl group border border-white/10 transition-transform hover:scale-105">
                  <Car size={24} className="group-hover:rotate-12 transition-transform text-primary-500"/>
               </div>
               <div>
                  <h3 className="text-lg font-black uppercase tracking-tighter leading-none">Asuransi <span className="text-primary-500">Mobil</span></h3>
                  <p className="text-[0.45rem] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1.5">Pendaftaran Cepat SurePath</p>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <button onClick={onComplete} className="p-2.5 text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-white/5 rounded-xl transition-all border border-black/5"><X size={20}/></button>
            </div>
          </div>
          
          <div className="flex items-center justify-between px-1">
             <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-black/5">
                <span className="text-[0.55rem] font-black text-primary-500 uppercase tracking-widest">{STEPS[step].label}</span>
             </div>
             <p className="text-[0.5rem] font-black text-gray-400 uppercase tracking-[0.2em]">Tahap {step + 1} / {STEPS.length}</p>
          </div>

          <div className="flex gap-1.5 px-1">
             {STEPS.map((_s, i) => (
               <div key={i} className={`h-1 rounded-full flex-1 transition-all duration-700 ${i === step ? 'bg-primary-500 shadow-[0_0_10px_#f97316]' : i < step ? 'bg-primary-500/40' : 'bg-gray-100 dark:bg-white/10'}`}></div>
             ))}
          </div>
       </div>

       {/* MAIN CONTENT AREA */}
       <div className="flex-1 overflow-y-auto px-6 py-6 no-scrollbar relative z-10">
          <div className="max-w-xl mx-auto">
            {step === 0 && <StepVehicle vehicle={vehicle} setVehicle={setVehicle} entryMode={entryMode} setEntryMode={setEntryMode} handlePlateChange={handlePlateChange} formatInputCurrency={(val) => new Intl.NumberFormat('id-ID').format(parseInt(val || "0"))} loading={loading} setLoading={setLoading} loadingType={loadingType} setLoadingType={setLoadingType} setStnkResult={setStnkResult} />}
            {step === 1 && <StepCoverage coverage={coverage} setCoverage={setCoverage} premiumBreakdown={premiumBreakdown} />}
            {step === 2 && <StepProviders sortBy={sortBy} setSortBy={setSortBy} sortedProviders={INSURANCE_PROVIDERS} selectedProviderId={selectedProviderId} setSelectedProviderId={setSelectedProviderId} premiumBreakdown={premiumBreakdown} showProviderBreakdown={showProviderBreakdown} setShowProviderBreakdown={setShowProviderBreakdown} />}
            {step === 3 && <StepKYC kycData={kycData} setKycData={setKycData} loading={loading} setLoading={setLoading} loadingType={loadingType} setLoadingType={setLoadingType} verifiedFields={verifiedFields} setVerifiedFields={setVerifiedFields} />}
            {step === 4 && <StepPreSummary vehicle={vehicle} coverage={coverage} premiumBreakdown={premiumBreakdown} showBreakdown={showBreakdown} setShowBreakdown={setShowBreakdown} stnkResult={stnkResult} kycData={kycData} />}
            {step === 5 && <StepSurvey survey={survey} setSurvey={setSurvey} stnkResult={stnkResult} setStnkResult={setStnkResult} loading={loading} setLoading={setLoading} loadingType={loadingType} setLoadingType={setLoadingType} photoValidation={photoValidation} setPhotoValidation={setPhotoValidation} vehicle={vehicle} />}
            {step === 6 && <StepFinal vehicle={vehicle} stnkResult={stnkResult} coverage={coverage} survey={survey} premiumBreakdown={premiumBreakdown} handleFinalPayment={handleNext} setStep={setStep} lang={lang} />}
            {step === 7 && <StepPayment premiumBreakdown={premiumBreakdown} onPaymentSuccess={handlePaymentResult} loading={loading} />}
          </div>
       </div>

       {/* REVAMPED FRIENDLY FOOTER */}
       {step < 7 && (
         <div className="px-6 py-5 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-3xl border-t border-gray-100 dark:border-white/10 sticky bottom-0 z-[100] shadow-[0_-25px_50px_-12px_rgba(0,0,0,0.15)] rounded-t-[2.5rem] transition-all">
            <div className="max-w-xl mx-auto">
               <div className="flex items-center justify-between gap-5">
                  {/* Premium Display - More Friendly */}
                  <div className="flex flex-col min-w-0">
                     <div className="flex items-center gap-1.5 mb-1 opacity-70">
                        <Sparkles size={12} className="text-primary-500 fill-primary-500"/>
                        <span className="text-[0.6rem] font-black uppercase text-gray-500 tracking-wider">Premi Kamu</span>
                     </div>
                     <div className="flex items-baseline gap-1">
                        <span className="text-[0.7rem] font-black text-primary-500">Rp</span>
                        <p className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">
                           {premiumBreakdown ? (premiumBreakdown.totalPayable / 1000).toLocaleString('id-ID') : '0'}
                           <span className="text-[0.65rem] font-bold text-gray-400 ml-1 uppercase">rb</span>
                        </p>
                     </div>
                  </div>
                  
                  {/* Navigation Buttons - Enhanced UX */}
                  <div className="flex items-center gap-3">
                     {step > 0 && (
                        <button 
                          onClick={handleBack} 
                          aria-label="Kembali"
                          className="w-12 h-12 flex items-center justify-center bg-gray-50 dark:bg-white/5 rounded-2xl text-gray-400 hover:text-slate-900 dark:hover:text-white transition-all border border-black/5 active:scale-90"
                        >
                           <ChevronLeft size={20} />
                        </button>
                     )}
                     
                     <button 
                        onClick={handleNext} 
                        disabled={(step === 5 && survey.score === 0) || (step === 6 && survey.verdict === 'REJECTED')}
                        className={`h-14 px-8 rounded-2xl font-black uppercase text-[0.7rem] tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-30 shadow-xl group
                           ${step === 6 ? 'bg-brand-500 text-white shadow-brand-500/25' : 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-slate-900/15'}
                        `}
                     >
                        {step === 6 ? (
                           <>
                              Checkout <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                           </>
                        ) : (
                           <>
                              Lanjut, Yuk! <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform"/>
                           </>
                        )}
                     </button>
                  </div>
               </div>
               
               {/* Context Info - Micro-guidance */}
               <div className="mt-4 flex items-center justify-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-primary-500 animate-pulse"></div>
                  <p className="text-[0.55rem] font-bold text-gray-400 uppercase tracking-widest">
                     {step === 0 && "Lengkapi data mobil kesayanganmu"}
                     {step === 1 && "Pilih perlindungan yang paling pas"}
                     {step === 2 && "Pilih perusahaan asuransi favoritmu"}
                     {step === 3 && "Yuk, verifikasi KTP kamu sebentar"}
                     {step === 4 && "Cek lagi detail pesananmu ya"}
                     {step === 5 && "Saatnya audit visual pintar AI"}
                     {step === 6 && "Sedikit lagi perlindungan aktif!"}
                  </p>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};

export default CarInsuranceWizard;
