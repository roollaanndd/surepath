
import React, { useState, useMemo, useEffect } from 'react';
import { Car, RefreshCw, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getOJKRate, EXPANSION_RATES, AUTHORIZED_WORKSHOP_RATE, STAMP_DUTY, PLATE_REGIONS, INSURANCE_PROVIDERS } from '../constants';
import { InsuranceType, Language } from '../types';
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

const STEPS = [
  { id: 'VEHICLE', label: 'Unit' },
  { id: 'COVERAGE', label: 'Polis' },
  { id: 'PROVIDERS', label: 'Opsi' },
  { id: 'KYC', label: 'Nasabah' },
  { id: 'PRESUMMARY', label: 'Rincian' },
  { id: 'SURVEY', label: 'Audit' },
  { id: 'FINAL', label: 'Bayar' }
];

const STORAGE_KEY = 'SUREPATH_CAR_WIZARD_PROGRESS';

/* Fix: Added lang prop to CarInsuranceWizard component */
const CarInsuranceWizard = ({ onComplete, currentUser, lang = Language.ID }: { onComplete: () => void, currentUser?: any, lang?: Language }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<'KTP' | 'STNK' | 'SURVEY' | null>(null);
  const [entryMode, setEntryMode] = useState<'DATABASE' | 'MANUAL'>('DATABASE');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showProviderBreakdown, setShowProviderBreakdown] = useState(false);
  const [sortBy, setSortBy] = useState<'RATING' | 'PRICE'>('RATING');

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

  // --- PERSISTENCE LOGIC ---
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.step !== undefined) setStep(data.step);
        if (data.vehicle) setVehicle(data.vehicle);
        if (data.coverage) setCoverage(data.coverage);
        if (data.selectedProviderId) setSelectedProviderId(data.selectedProviderId);
        if (data.kycData) setKycData(data.kycData);
        if (data.survey) setSurvey(data.survey);
        if (data.stnkResult) setStnkResult(data.stnkResult);
      } catch (err) {
        console.error("Failed to restore wizard progress", err);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const stateToSave = {
        step,
        vehicle,
        coverage,
        selectedProviderId,
        kycData,
        survey,
        stnkResult
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (err) {
        console.warn("Storage quota exceeded");
      }
    }, 1000); 
    return () => clearTimeout(timer);
  }, [step, vehicle, coverage, selectedProviderId, kycData, survey, stnkResult]);

  const clearProgress = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  useEffect(() => {
    if (vehicle.condition === 'NEW') {
        setVehicle(prev => ({ ...prev, year: 2025 }));
    }
  }, [vehicle.condition]);

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
    const netPremium = basicPremium + expansionTotal;

    return {
        baseRate, basicPremium, expansions, tplPremium,
        adminFee: selectedProvider?.adminFee || 0,
        stampDuty: STAMP_DUTY,
        netPremium,
        totalPayable: netPremium + (selectedProvider?.adminFee || 0) + STAMP_DUTY
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
    let val = e.target.value.toUpperCase();
    val = val.replace(/[^A-Z0-9]/g, "");
    const parts = val.match(/^([A-Z]{1,2})([0-9]{0,4})([A-Z]{0,3})$/);
    if (parts) {
      const plate = `${parts[1]}${parts[2] ? ' ' + parts[2] : ''}${parts[3] ? ' ' + parts[3] : ''}`;
      const prefix = parts[1];
      const regionInfo = PLATE_REGIONS[prefix];
      setVehicle({
        ...vehicle, 
        plate, 
        region: regionInfo?.region || '3', 
        regionName: regionInfo ? `${regionInfo.name} (Region ${regionInfo.region})` : 'Region 3 (Lainnya)'
      });
    } else {
      setVehicle({...vehicle, plate: val});
    }
  };

  const handleFinalPayment = async () => {
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
        providerId: selectedProviderId || '',
        policyNumber: `POL-CR-${Date.now()}`,
        createdAt: new Date().toISOString(),
        coverageDetails: {
          vehicle: { ...vehicle, ...stnkResult },
          coverage: coverage,
          survey: survey
        }
      };

      const policyId = await db.policies.add(newPolicy);

      const newTransaction: Transaction = {
        userId: currentUser.id,
        type: 'PAYMENT',
        amount: premiumBreakdown.totalPayable,
        status: isManualPending ? 'PENDING' : 'SUCCESS',
        description: `Payment for Policy ${newPolicy.policyNumber}`,
        date: new Date().toISOString(),
        referenceId: policyId.toString()
      };

      await db.transactions.add(newTransaction);

      clearProgress();
      onComplete();
    } catch (e) {
      console.error("DB Error", e);
      alert("Gagal memproses pembayaran. Coba lagi.");
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#f0faf7] dark:bg-dark-bg text-gray-900 dark:text-white overflow-hidden relative selection:bg-primary-100">
       <div className="px-8 pt-8 pb-4 bg-white dark:bg-white/5 border-b border-black/5 flex flex-col gap-6 flex-shrink-0 relative z-[100] shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
               <div className="w-14 h-14 bg-midnight rounded-[1.8rem] flex items-center justify-center text-white shadow-2xl group border border-white/10"><Car size={28} className="group-hover:rotate-12 transition-transform text-primary-500"/></div>
               <div>
                  <p className="text-[0.55rem] font-black text-gray-400 uppercase tracking-[0.4em] leading-none mb-1.5">Auto-Neural Module</p>
                  <h3 className="text-xl font-black uppercase tracking-tighter leading-none">Sure<span className="text-primary-500">Path</span> Registry</h3>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <button 
                onClick={() => { if(confirm("Restart progress?")) { clearProgress(); window.location.reload(); } }} 
                className="p-3 text-gray-400 hover:text-rose-500 bg-gray-50 dark:bg-white/5 rounded-2xl transition-all border border-black/5"
               >
                  <RefreshCw size={20}/>
               </button>
               <button onClick={onComplete} className="p-3 text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-white/5 rounded-2xl transition-all border border-black/5">
                 <X size={24}/>
               </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
             <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl border border-black/5">
                <div className="px-4 py-1.5 text-[0.65rem] font-black text-primary-600 uppercase tracking-widest">{STEPS[step].label}</div>
             </div>
             <p className="text-[0.6rem] font-black text-gray-400 uppercase tracking-[0.2em]">Step {step + 1} of {STEPS.length}</p>
          </div>

          <div className="flex gap-2.5">
             {STEPS.map((s, i) => (<div key={i} className={`h-2 rounded-full flex-1 transition-all duration-700 ${i === step ? 'bg-primary-500 shadow-[0_0_15px_#10b981]' : i < step ? 'bg-primary-500/30' : 'bg-gray-200 dark:bg-white/10'}`}></div>))}
          </div>
       </div>

       <div className="flex-1 overflow-y-auto px-8 py-10 no-scrollbar relative z-10">
          <div className="max-w-xl mx-auto">
            {step === 0 && (
                <StepVehicle 
                    vehicle={vehicle} setVehicle={setVehicle} 
                    entryMode={entryMode} setEntryMode={setEntryMode} 
                    handlePlateChange={handlePlateChange} formatInputCurrency={formatInputCurrency} 
                    loading={loading} setLoading={setLoading}
                    loadingType={loadingType} setLoadingType={setLoadingType}
                    setStnkResult={setStnkResult}
                />
            )}
            {step === 1 && <StepCoverage coverage={coverage} setCoverage={setCoverage} />}
            {step === 2 && (
                <StepProviders 
                    sortBy={sortBy} setSortBy={setSortBy} 
                    sortedProviders={sortedProviders} selectedProviderId={selectedProviderId} 
                    setSelectedProviderId={setSelectedProviderId} premiumBreakdown={premiumBreakdown} 
                    showProviderBreakdown={showProviderBreakdown} setShowProviderBreakdown={setShowProviderBreakdown} 
                />
            )}
            {step === 3 && (
                <StepKYC 
                    kycData={kycData} setKycData={setKycData} 
                    loading={loading} setLoading={setLoading} 
                    loadingType={loadingType} setLoadingType={setLoadingType} 
                    verifiedFields={verifiedFields} setVerifiedFields={setVerifiedFields} 
                />
            )}
            {step === 4 && (
                /* Fix: Pass missing stnkResult and kycData props to StepPreSummary */
                <StepPreSummary 
                    vehicle={vehicle} coverage={coverage} 
                    premiumBreakdown={premiumBreakdown} showBreakdown={showBreakdown} 
                    setShowBreakdown={setShowBreakdown}
                    stnkResult={stnkResult}
                    kycData={kycData}
                />
            )}
            {step === 5 && (
                <StepSurvey 
                    survey={survey} setSurvey={setSurvey} 
                    stnkResult={stnkResult} setStnkResult={setStnkResult} 
                    loading={loading} setLoading={setLoading} 
                    loadingType={loadingType} setLoadingType={setLoadingType} 
                    photoValidation={photoValidation} setPhotoValidation={setPhotoValidation} 
                    vehicle={vehicle} 
                />
            )}
            {step === 6 && (
                <StepFinal 
                    vehicle={vehicle} stnkResult={stnkResult} 
                    coverage={coverage} survey={survey} 
                    premiumBreakdown={premiumBreakdown} handleFinalPayment={handleFinalPayment} 
                    setStep={setStep} 
                    lang={lang}
                />
            )}
          </div>
       </div>

       <div className="px-8 py-8 bg-white dark:bg-[#111] border-t border-black/5 flex items-center justify-between gap-8 flex-shrink-0 sticky bottom-0 z-[100] shadow-[0_-20px_50px_rgba(0,0,0,0.05)]">
          <div className="flex-1">
             <p className="text-[0.6rem] font-black uppercase text-gray-400 leading-none mb-1.5 tracking-[0.2em]">Matrix Premium Est.</p>
             <p className="text-3xl font-black tracking-tighter text-primary-500 leading-none">{premiumBreakdown ? formatIDR(premiumBreakdown.totalPayable) : 'Rp 0'}</p>
          </div>
          <div className="flex gap-4">
             {step > 0 && (<button onClick={handleBack} className="p-5 bg-gray-50 dark:bg-white/5 rounded-3xl text-gray-400 hover:text-primary-500 transition-all shadow-sm border border-black/5 active:scale-95"><ChevronLeft size={28}/></button>)}
             {step < STEPS.length - 1 && (
                <button 
                  onClick={handleNext} 
                  disabled={(step === 5 && (survey.score === 0 || (survey.verdict === 'MANUAL_REQUIRED' && survey.manualRequestStatus !== 'REQUESTED')))}
                  className="px-12 py-5 bg-midnight dark:bg-white text-white dark:text-black rounded-[1.8rem] font-black uppercase text-[0.75rem] tracking-[0.3em] shadow-2xl transition-all active:scale-95 flex items-center gap-3 disabled:opacity-30 disabled:grayscale group"
                >
                  {step === 5 && survey.manualVerif ? 'Submisi HQ Review' : 'Next Cycle'} <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform"/>
                </button>
             )}
          </div>
       </div>
    </div>
  );
};

export default CarInsuranceWizard;
