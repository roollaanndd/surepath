import React, { useState, useMemo, useEffect } from 'react';
import { Car, RefreshCw, X, ChevronLeft, ChevronRight, Zap, ShieldCheck, CheckCircle2, FileText, ArrowRight } from 'lucide-react';
import { getOJKRate, EXPANSION_RATES, AUTHORIZED_WORKSHOP_RATE, STAMP_DUTY, PLATE_REGIONS, INSURANCE_PROVIDERS } from '../constants';
import { InsuranceType } from '../types';
import { db, Policy, Transaction } from '../db';
import { DamageIssue, PhotoFlag } from '../services/geminiService';
import { formatIDR } from './car-wizard/WizardUI';

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
  { id: 'VEHICLE', label: 'Unit' },
  { id: 'COVERAGE', label: 'Polis' },
  { id: 'PROVIDERS', label: 'Opsi' },
  { id: 'KYC', label: 'Nasabah' },
  { id: 'PRESUMMARY', label: 'Rincian' },
  { id: 'SURVEY', label: 'Audit' },
  { id: 'REVIEW', label: 'Review' },
  { id: 'PAYMENT', label: 'Bayar' }
];

const CarInsuranceWizard = ({ onComplete, currentUser }: { onComplete: () => void, currentUser?: any }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<'KTP' | 'STNK' | 'SURVEY' | null>(null);
  const [entryMode, setEntryMode] = useState<'DATABASE' | 'MANUAL'>('DATABASE');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showProviderBreakdown, setShowProviderBreakdown] = useState(false);
  const [sortBy, setSortBy] = useState<'RATING' | 'PRICE'>('RATING');
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedPolicy, setGeneratedPolicy] = useState<Policy | null>(null);

  const [vehicle, setVehicle] = useState({
    brand: '', model: '', year: 2025, isOther: false, 
    price: 0, basePrice: 0, manualPrice: false, plate: '', 
    vin: '', engine: '',
    region: '3' as '1'|'2'|'3', regionName: 'Region Lainnya', usage: 'PRIVATE', condition: 'NEW'
  });

  const [coverage, setCoverage] = useState({
    type: InsuranceType.COMPREHENSIVE as InsuranceType,
    flood: false, earthquake: false, srcc: false, 
    terrorism: false, authorized: false, 
    tpl: 0, paDriver: false, paPassenger: false,
    promo: '', discount: 0, discountType: 'NOMINAL' as 'NOMINAL' | 'PERCENT'
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
    const expansionTotal = expansions.reduce((acc: number, curr: any) => acc + curr.val, 0) + tplPremium;
    const grossPremium = basicPremium + expansionTotal;
    const discountPercent = Math.min(coverage.discount || 0, 25);
    const discountAmount = grossPremium * (discountPercent / 100);
    const netPremium = grossPremium - discountAmount;
    return {
        baseRate, basicPremium, expansions, tplPremium, grossPremium, discountPercent, discountAmount,
        adminFee: selectedProvider?.adminFee || 0, stampDuty: STAMP_DUTY,
        netPremium, totalPayable: netPremium + (selectedProvider?.adminFee || 0) + STAMP_DUTY
    };
  }, [vehicle, coverage, selectedProvider]);

  const sortedProviders = useMemo(() => {
    return [...INSURANCE_PROVIDERS].sort((a, b) => {
      if (sortBy === 'RATING') return b.rating - a.rating;
      if (sortBy === 'PRICE') {
          const priceA = (premiumBreakdown?.netPremium || 0) + a.adminFee;
          const priceB = (premiumBreakdown?.netPremium || 0) + b.adminFee;
          return priceA - priceB;
      }
      return 0;
    });
  }, [sortBy, premiumBreakdown]);

  const handleNext = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const handleBack = () => setStep(s => Math.max(s - 1, 0));

  const formatInputCurrency = (value: string) => {
    const numeric = value.replace(/\D/g, "");
    if (!numeric) return "";
    return new Intl.NumberFormat('id-ID').format(parseInt(numeric));
  };

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const parts = val.match(/^([A-Z]{1,2})([0-9]{0,4})([A-Z]{0,3})$/);
    if (parts) {
      const plate = `${parts[1]}${parts[2] ? ' ' + parts[2] : ''}${parts[3] ? ' ' + parts[3] : ''}`;
      const prefix = parts[1];
      const regionInfo = PLATE_REGIONS[prefix];
      setVehicle({ ...vehicle, plate, region: regionInfo?.region || '3', regionName: regionInfo ? `${regionInfo.name} (Region ${regionInfo.region})` : 'Region 3 (Lainnya)' });
    } else { setVehicle({...vehicle, plate: val}); }
  };

  const handlePaymentSuccess = async (method: string) => {
    if (!currentUser || !premiumBreakdown) return;
    try {
      const isManualPending = survey.verdict === 'MANUAL_REQUIRED' || survey.manualRequestStatus === 'REQUESTED';
      
      const newPolicy: Policy = {
        userId: currentUser.id,
        type: 'CAR',
        status: isManualPending ? 'PENDING' : 'ACTIVE',
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        premium: premiumBreakdown.totalPayable,
        providerId: selectedProvider?.name || selectedProviderId || '',
        policyNumber: `POL-AUTO-${Date.now().toString().slice(-8)}`,
        createdAt: new Date().toISOString(),
        coverageDetails: { 
            vehicle: { ...vehicle, ...stnkResult }, 
            coverage, 
            survey, 
            kycData,
            financials: { ...premiumBreakdown, paymentMethod: method } 
        }
      };

      const policyId = await db.policies.add(newPolicy);
      setGeneratedPolicy({ ...newPolicy, id: policyId });

      await db.transactions.add({
        userId: currentUser.id,
        type: 'PAYMENT',
        amount: premiumBreakdown.totalPayable,
        status: 'SUCCESS',
        description: `Payment for ${newPolicy.policyNumber} via ${method}`,
        date: new Date().toISOString(),
        referenceId: policyId.toString()
      });

      localStorage.removeItem('SUREPATH_CAR_WIZARD_PROGRESS');
      setIsSuccess(true);
    } catch (e) {
      alert("Neural sync error: Gagal menyimpan data polis. " + e);
    }
  };

  if (isSuccess && generatedPolicy) {
     return (
        <div className="flex flex-col items-center justify-center h-full min-h-screen p-8 text-center bg-[#f0faf7] dark:bg-[#050505] animate-fade-in">
           <div className="w-24 h-24 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl mb-8 animate-pop-in">
              <ShieldCheck size={56} strokeWidth={2.5}/>
           </div>
           <div className="space-y-4 mb-12">
              <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Policy <span className="text-emerald-500">Live</span></h2>
              <p className="text-[0.7rem] font-bold text-gray-500 uppercase tracking-widest max-w-sm mx-auto">
                 Neural Node Activated. Your protection matrix has been synchronized with our core registry.
              </p>
           </div>

           <div className="w-full max-w-sm bg-white dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-[3rem] p-8 space-y-6 shadow-xl mb-10">
              <div className="flex justify-between items-center text-[0.6rem] font-black uppercase text-gray-400 tracking-widest">
                 <span>Policy Node ID</span>
                 <span className="text-primary-500 font-mono">{generatedPolicy.policyNumber}</span>
              </div>
              <div className="flex justify-between items-center text-[0.6rem] font-black uppercase text-gray-400 tracking-widest">
                 <span>Status</span>
                 <BadgeComponent color="emerald">{generatedPolicy.status}</BadgeComponent>
              </div>
              <div className="pt-6 border-t border-black/5 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500"><Car size={20}/></div>
                    <div className="text-left">
                       <p className="text-xs font-black uppercase text-slate-900 dark:text-white">{vehicle.brand} {vehicle.model}</p>
                       <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">{vehicle.plate}</p>
                    </div>
                 </div>
                 <FileText size={20} className="text-primary-500"/>
              </div>
           </div>

           <div className="w-full max-w-sm space-y-4">
              <button 
                onClick={onComplete}
                className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-sm tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                Go to Dashboard <ArrowRight size={18}/>
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
                  <h3 className="text-lg font-black uppercase tracking-tighter leading-none">Sure<span className="text-primary-500">Path</span> <span className="text-gray-400">Auto</span></h3>
                  <p className="text-[0.45rem] font-bold text-gray-400 uppercase tracking-[0.3em] mt-1.5">Penerbitan Polis AI v4.0</p>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <button onClick={onComplete} className="p-2.5 text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-white/5 rounded-xl transition-all border border-black/5"><X size={20}/></button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-black/5">
                <span className="text-[0.55rem] font-black text-primary-500 uppercase tracking-widest">{STEPS[step].label}</span>
             </div>
             <p className="text-[0.5rem] font-black text-gray-400 uppercase tracking-[0.2em]">Step {step + 1} of {STEPS.length}</p>
          </div>

          <div className="flex gap-1.5">
             {STEPS.map((s, i) => (
               <div key={i} className={`h-1 rounded-full flex-1 transition-all duration-700 ${i === step ? 'bg-primary-500 shadow-[0_0_10px_#10b981]' : i < step ? 'bg-primary-500/30' : 'bg-gray-100 dark:bg-white/10'}`}></div>
             ))}
          </div>
       </div>

       {/* MAIN CONTENT AREA */}
       <div className="flex-1 overflow-y-auto px-6 py-8 no-scrollbar relative z-10">
          <div className="max-w-xl mx-auto">
            {step === 0 && <StepVehicle vehicle={vehicle} setVehicle={setVehicle} entryMode={entryMode} setEntryMode={setEntryMode} handlePlateChange={handlePlateChange} formatInputCurrency={formatInputCurrency} loading={loading} setLoading={setLoading} loadingType={loadingType} setLoadingType={setLoadingType} setStnkResult={setStnkResult} />}
            {step === 1 && <StepCoverage coverage={coverage} setCoverage={setCoverage} premiumBreakdown={premiumBreakdown} />}
            {step === 2 && <StepProviders sortBy={sortBy} setSortBy={setSortBy} sortedProviders={sortedProviders} selectedProviderId={selectedProviderId} setSelectedProviderId={setSelectedProviderId} premiumBreakdown={premiumBreakdown} showProviderBreakdown={showProviderBreakdown} setShowProviderBreakdown={setShowProviderBreakdown} />}
            {step === 3 && <StepKYC kycData={kycData} setKycData={setKycData} loading={loading} setLoading={setLoading} loadingType={loadingType} setLoadingType={setLoadingType} verifiedFields={verifiedFields} setVerifiedFields={setVerifiedFields} />}
            {step === 4 && <StepPreSummary vehicle={vehicle} coverage={coverage} premiumBreakdown={premiumBreakdown} showBreakdown={showBreakdown} setShowBreakdown={setShowBreakdown} stnkResult={stnkResult} kycData={kycData} />}
            {step === 5 && <StepSurvey survey={survey} setSurvey={setSurvey} stnkResult={stnkResult} setStnkResult={setStnkResult} loading={loading} setLoading={setLoading} loadingType={loadingType} setLoadingType={setLoadingType} photoValidation={photoValidation} setPhotoValidation={setPhotoValidation} vehicle={vehicle} />}
            {step === 6 && <StepFinal vehicle={vehicle} stnkResult={stnkResult} coverage={coverage} survey={survey} premiumBreakdown={premiumBreakdown} handleFinalPayment={handleNext} setStep={setStep} />}
            {step === 7 && <StepPayment premiumBreakdown={premiumBreakdown} onPaymentSuccess={handlePaymentSuccess} loading={loading} />}
          </div>
       </div>

       {/* FOOTER */}
       {step < 7 && (
         <div className="px-6 py-6 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-2xl border-t border-gray-100 dark:border-white/5 sticky bottom-0 z-[100] shadow-[0_-15px_40px_rgba(0,0,0,0.04)]">
            <div className="max-w-xl mx-auto flex items-center justify-between gap-6">
               <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5"><Zap size={10} className="text-primary-500 fill-primary-500"/><span className="text-[0.5rem] font-black uppercase text-gray-400 tracking-[0.2em]">Estimasi Premi</span></div>
                  <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none">{premiumBreakdown ? formatIDR(premiumBreakdown.totalPayable) : 'Rp 0'}</p>
               </div>
               <div className="flex items-center gap-3">
                  {step > 0 && (<button onClick={handleBack} className="w-12 h-12 flex items-center justify-center bg-gray-50 dark:bg-white/5 rounded-2xl text-gray-400 hover:text-slate-900 dark:hover:text-white transition-all border border-black/5 active:scale-90"><ChevronLeft size={20}/></button>)}
                  <button 
                     onClick={handleNext} 
                     disabled={(step === 5 && survey.score === 0) || (step === 6 && survey.verdict === 'REJECTED')}
                     className="h-14 px-8 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-[0.65rem] tracking-[0.2em] shadow-xl shadow-slate-900/10 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-30 group"
                  >
                     {step === 6 ? 'Checkout' : 'Lanjut'} <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform"/>
                  </button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};

const BadgeComponent = ({ children, color = "primary" }: { children?: React.ReactNode, color?: string }) => {
  const styles: any = {
    primary: "bg-primary-500/10 text-primary-500 border-primary-500/20",
    emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-500 border-blue-200",
    amber: "bg-amber-500/10 text-amber-600 border-amber-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-lg text-[0.45rem] font-black uppercase tracking-widest border ${styles[color] || styles.primary}`}>{children}</span>
  );
};

export default CarInsuranceWizard;