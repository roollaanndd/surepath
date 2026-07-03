
import React, { useState, useMemo, useEffect } from 'react';
import { Car, ChevronLeft, ChevronRight, ShieldCheck, CheckCircle2, ArrowRight, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
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
import SuccessBurst from './shared/SuccessBurst';

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
  const [showBurst, setShowBurst] = useState(false);
  const [isPayLater, setIsPayLater] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
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
      : grossPremium * (Math.min(coverage.discount || 0, BASE_COMMISSION_PERCENT) / 100);
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

  // Pending-approval checkout: create order with SUBMITTED status, skip Xendit invoice
  const handlePendingApprovalCheckout = async () => {
    if (!premiumBreakdown || !selectedProvider) return;
    setLoading(true);
    try {
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
          make: vehicle.brand, model: vehicle.model, year: vehicle.year,
          color: vehicle.color, plate: vehicle.plate, chassis: vehicle.vin,
          engine: vehicle.engine, usage: vehicle.usage, province: vehicle.regionName,
        },
        coverage_type: coverage.type,
        zone: parseInt(vehicle.region),
        vehicle_category: 1,
        addons: {
          flood: coverage.flood, earthquake: coverage.earthquake, srcc: coverage.srcc,
          terrorism: coverage.terrorism, authorized: coverage.authorized,
          tpl: coverage.tpl, paDriver: coverage.paDriver, paPassenger: coverage.paPassenger,
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
      setInvoiceUrl(null);
      setIsPendingApproval(true);
      localStorage.removeItem('SUREPATH_CAR_WIZARD_PROGRESS');
      setIsSuccess(true);
    } catch (e) {
      console.error('handlePendingApprovalCheckout:', e);
      alert('Gagal memproses pesanan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = () => {
    if (survey.verdict === 'CLEAN') {
      handleNext(); // go to payment step
    } else {
      handlePendingApprovalCheckout();
    }
  };

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

  const handlePaymentResult = async (_method: string, resultStatus: 'SUCCESS' | 'PENDING_PAYMENT') => {
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
      setShowBurst(true);
    } catch (e) {
      console.error('handlePaymentResult:', e);
      alert('Gagal memproses pesanan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
     const iconBg = isPendingApproval ? 'bg-amber-500' : isPayLater ? 'bg-amber-400' : 'bg-emerald-500';
     const burstTitle = isPendingApproval ? 'Pengajuan Terkirim!' : isPayLater ? 'Pesanan Dibuat!' : 'Pembayaran Berhasil!';
     const burstSub = isPendingApproval
       ? 'Pengajuan kamu sedang direview tim kami.'
       : isPayLater ? 'Selesaikan pembayaran lewat link tagihan.' : 'Polis kamu segera diproses. Terima kasih!';
     const statusLabel = isPendingApproval ? 'Menunggu Persetujuan' : isPayLater ? 'Menunggu Pembayaran' : 'Diproses';
     const statusBadgeCls = isPendingApproval ? 'bg-amber-50 text-amber-600 border-amber-200' : isPayLater ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-200';
     return (
        <div className="bg-white min-h-screen pb-28 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
           {showBurst && <SuccessBurst title={burstTitle} subtitle={burstSub} onDone={() => setShowBurst(false)} />}
           <div className={`w-24 h-24 ${iconBg} rounded-2xl flex items-center justify-center text-white shadow-2xl mb-8`}>
              {isPendingApproval ? <Clock size={56} strokeWidth={2.5}/> : isPayLater ? <Clock size={56} strokeWidth={2.5}/> : <ShieldCheck size={56} strokeWidth={2.5}/>}
           </div>

           <div className="space-y-4 mb-12">
              <h2 className="text-2xl font-bold text-gray-900">
                 Pesanan <span className={isPendingApproval || isPayLater ? "text-amber-500" : "text-emerald-500"}>{isPendingApproval ? "Diajukan" : isPayLater ? "Tersimpan" : "Diterima"}</span>
              </h2>
              <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                 {isPendingApproval
                   ? "Pesanan diajukan untuk ditinjau oleh admin/tim asuransi. Halaman pembayaran akan terbuka setelah foto disetujui. Pantau status melalui email atau aplikasi."
                   : isPayLater
                   ? "Pesanan tersimpan. Selesaikan pembayaran di menu Pesanan Saya untuk mengaktifkan perlindungan."
                   : "Pesanan berhasil dikirim ke penanggung. Tim kami akan memproses polis Anda setelah pembayaran dikonfirmasi."}
              </p>
           </div>

           {isPendingApproval && (
              <div className="mx-5 rounded-2xl bg-amber-50 border border-amber-200 p-4 w-full max-w-sm mb-6 text-left space-y-2">
                 <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-amber-500 shrink-0"/>
                    <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Perlu Persetujuan Foto</span>
                 </div>
                 <p className="text-xs text-amber-700/80 leading-relaxed">
                    Foto kendaraan kamu sedang dalam proses review manual. Setelah disetujui, kamu akan mendapat notifikasi dan dapat melanjutkan ke pembayaran.
                 </p>
              </div>
           )}

           <div className="mx-5 rounded-2xl bg-gray-50 border border-gray-100 p-4 w-full max-w-sm mb-10">
              <div className="flex justify-between py-2 border-b border-gray-100">
                 <span className="text-sm text-gray-500">No. Pesanan</span>
                 <span className="text-sm font-semibold text-gray-900 font-mono">{orderNumber ?? '—'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                 <span className="text-sm text-gray-500">Status</span>
                 <span className={`px-3 py-1 rounded-lg border text-xs font-semibold ${statusBadgeCls}`}>
                    {statusLabel}
                 </span>
              </div>
              <div className="flex justify-between py-2">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500"><Car size={16}/></div>
                    <div className="text-left">
                       <p className="text-sm font-semibold text-gray-900">{vehicle.brand} {vehicle.model}</p>
                       <p className="text-xs text-gray-400">{vehicle.plate}</p>
                    </div>
                 </div>
                 {isPendingApproval ? <AlertTriangle size={18} className="text-amber-500"/> : isPayLater ? <AlertTriangle size={18} className="text-amber-500"/> : <CheckCircle2 size={18} className="text-emerald-500"/>}
              </div>
           </div>

           <div className="w-full max-w-sm space-y-4">
              {invoiceUrl && (
                 <a
                   href={invoiceUrl}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all flex items-center justify-center gap-3"
                 >
                   Buka Halaman Pembayaran <ExternalLink size={18}/>
                 </a>
              )}
              <button
                onClick={onComplete}
                className="w-full h-12 rounded-xl bg-gray-900 text-white font-semibold text-sm active:bg-gray-800 transition-all flex items-center justify-center gap-3"
              >
                Kembali ke Beranda <ArrowRight size={18}/>
              </button>
           </div>
        </div>
     );
  }

  return (
    <div className="bg-white min-h-screen pb-28">
       {/* HEADER SECTION */}
       <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
          <button onClick={step > 0 ? handleBack : onComplete} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200 transition-colors flex-shrink-0">
            <ChevronLeft size={20}/>
          </button>
          <h3 className="text-base font-semibold text-gray-900">{STEPS[step].label}</h3>
       </div>

       {/* STEP PROGRESS BAR — premium segmented track */}
       <div className="px-5 pt-3 pb-4">
         {/* Segmented pill track */}
         <div className="flex gap-1 mb-3">
           {STEPS.map((_s, i) => (
             <div
               key={i}
               className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                 i < step
                   ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                   : i === step
                   ? 'bg-emerald-500 shadow-[0_0_8px_rgba(0,193,106,0.5)]'
                   : 'bg-gray-100'
               }`}
             />
           ))}
         </div>
         {/* Step label + counter */}
         <div className="flex items-baseline justify-between">
           <span className="text-sm font-bold text-gray-900">{STEPS[step].label}</span>
           <span className="text-[0.6rem] font-bold text-gray-400 uppercase tracking-widest">Langkah {step + 1}/{STEPS.length}</span>
         </div>
       </div>

       {/* MAIN CONTENT AREA */}
       <div className="px-5 py-4">
          {step === 0 && <StepVehicle vehicle={vehicle} setVehicle={setVehicle} entryMode={entryMode} setEntryMode={setEntryMode} handlePlateChange={handlePlateChange} formatInputCurrency={(val) => new Intl.NumberFormat('id-ID').format(parseInt(val || "0"))} loading={loading} setLoading={setLoading} loadingType={loadingType} setLoadingType={setLoadingType} setStnkResult={setStnkResult} />}
          {step === 1 && <StepCoverage coverage={coverage} setCoverage={setCoverage} premiumBreakdown={premiumBreakdown} />}
          {step === 2 && <StepProviders sortBy={sortBy} setSortBy={setSortBy} sortedProviders={INSURANCE_PROVIDERS} selectedProviderId={selectedProviderId} setSelectedProviderId={setSelectedProviderId} premiumBreakdown={premiumBreakdown} showProviderBreakdown={showProviderBreakdown} setShowProviderBreakdown={setShowProviderBreakdown} />}
          {step === 3 && <StepKYC kycData={kycData} setKycData={setKycData} loading={loading} setLoading={setLoading} loadingType={loadingType} setLoadingType={setLoadingType} verifiedFields={verifiedFields} setVerifiedFields={setVerifiedFields} />}
          {step === 4 && <StepPreSummary vehicle={vehicle} coverage={coverage} premiumBreakdown={premiumBreakdown} showBreakdown={showBreakdown} setShowBreakdown={setShowBreakdown} stnkResult={stnkResult} kycData={kycData} />}
          {step === 5 && <StepSurvey survey={survey} setSurvey={setSurvey} stnkResult={stnkResult} setStnkResult={setStnkResult} loading={loading} setLoading={setLoading} loadingType={loadingType} setLoadingType={setLoadingType} photoValidation={photoValidation} setPhotoValidation={setPhotoValidation} vehicle={vehicle} />}
          {step === 6 && <StepFinal vehicle={vehicle} stnkResult={stnkResult} coverage={coverage} survey={survey} premiumBreakdown={premiumBreakdown} handleFinalPayment={handleNext} setStep={setStep} lang={lang} />}
          {step === 7 && <StepPayment premiumBreakdown={premiumBreakdown} onPaymentSuccess={handlePaymentResult} loading={loading} />}
       </div>

       {/* FOOTER */}
       {step < 7 && (
         <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-white border-t border-gray-100">
            <div className="flex items-center justify-between gap-4 mb-3">
               <div className="flex flex-col min-w-0">
                  <span className="text-xs text-gray-500">Premi Kamu</span>
                  <p className="text-base font-bold text-emerald-600 font-mono">
                     {premiumBreakdown ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(premiumBreakdown.totalPayable) : 'Rp 0'}
                  </p>
               </div>

               <div className="flex items-center gap-3">
                  {step > 0 && (
                     <button
                       onClick={handleBack}
                       aria-label="Kembali"
                       className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200 transition-colors flex-shrink-0"
                     >
                        <ChevronLeft size={20} />
                     </button>
                  )}

                  <button
                     onClick={step === 6 ? handleCheckout : handleNext}
                     disabled={
                       (step === 5 && (survey.verdict === '' || survey.verdict === 'REJECTED' || (loading && loadingType === 'SURVEY'))) ||
                       (step === 6 && survey.verdict === 'REJECTED')
                     }
                     className="w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold text-sm active:bg-emerald-600 transition-all disabled:opacity-40 flex items-center justify-center gap-2 px-6"
                  >
                     {step === 6 ? (
                        survey.verdict === 'CLEAN'
                          ? <>Lanjut ke Pembayaran <ArrowRight size={16}/></>
                          : <>Ajukan untuk Persetujuan <ArrowRight size={16}/></>
                     ) : (
                        <>Lanjut <ChevronRight size={16}/></>
                     )}
                  </button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};

export default CarInsuranceWizard;
