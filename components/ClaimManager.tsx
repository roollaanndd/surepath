import React, { useState, useEffect } from 'react';
import { Camera, BrainCircuit, CheckCircle2, Smartphone, ArrowRight, MapPin, FileText, AlertCircle, Loader2, ShieldCheck, ShieldAlert, ShieldQuestion, ChevronRight, Rocket, Users, HeartPulse, Receipt, Building2, RefreshCw, Car, Activity, Zap, ClipboardList, ImagePlus, X } from 'lucide-react';
import { analyzeHealthReceipt, ClaimAnalysisData, HealthClaimData } from '../services/geminiService';
import type { ClaimPhotoForensicReport } from '../services/dbTypes';
import { db, Claim } from '../db';
import { SmartProcessingView } from './car-wizard/WizardUI';
import { Language } from '../types';
import { Badge } from './shared/UI';
import { submitClaim, uploadClaimPhoto, analyzeClaimPhotos, ClaimPhotoAnalysisResult } from '../services/supabaseService';
import ClaimSensePanel from './shared/ClaimSensePanel';
import { consumeClaimPrefill } from '../services/claimHandoff';

const MAX_CLAIM_PHOTOS = 5;

const VERDICT_META: Record<string, { label: string; color: string; Icon: any }> = {
  CLEAN:           { label: 'Foto Terverifikasi',   color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', Icon: ShieldCheck },
  REVIEW_REQUIRED: { label: 'Perlu Tinjauan Admin',  color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',       Icon: ShieldQuestion },
  REJECTED:        { label: 'Foto Berisiko Tinggi',  color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',          Icon: ShieldAlert },
};

const PHOTO_VERDICT_META: Record<string, { label: string; color: string }> = {
  CLEAN:     { label: 'OK', color: 'bg-emerald-500/10 text-emerald-500' },
  FLAGGED:   { label: 'Ditandai', color: 'bg-amber-500/10 text-amber-500' },
  HIGH_RISK: { label: 'Risiko Tinggi', color: 'bg-rose-500/10 text-rose-500' },
};

const formatIDR = (num: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
  }).format(num);
};

const DRAFT_KEY = 'SUREPATH_CLAIM_DRAFT_V1';

interface ReportForm {
  policyNumber: string;
  contactInfo: string;
  chronology: string;
  location: string;
  date: string;
  time: string;
  thirdPartyInvolved: boolean;
}

const ClaimManager = ({ onComplete, lang, currentUser: currentUserProp }: { onComplete: () => void, lang: Language, currentUser?: any }) => {
  const [claimType, setClaimType] = useState<'AUTO' | 'HEALTH' | null>(null);
  const [step, setStep] = useState<'select' | 'upload' | 'analyzing' | 'result' | 'reporting' | 'success'>('select');
  const [claimResult, setClaimResult] = useState<ClaimAnalysisData | null>(null);
  const [healthResult, setHealthResult] = useState<HealthClaimData | null>(null);
  const [activeTab, setActiveTab] = useState<'evidence' | 'reasoning' | 'steps' | 'verification'>('evidence');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [photoBase64, setPhotoBase64] = useState<string>('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [photoReports, setPhotoReports] = useState<ClaimPhotoForensicReport[]>([]);
  const [fraudAggregate, setFraudAggregate] = useState<ClaimPhotoAnalysisResult['aggregate'] | null>(null);
  const [analysisId, setAnalysisId] = useState<string | undefined>(undefined);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [reportForm, setReportForm] = useState<ReportForm>({
    policyNumber: '',
    contactInfo: '',
    chronology: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    thirdPartyInvolved: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Pathy worked out which policy applies and what happened; jump straight to
  // the photo step with those fields filled. Read once — see claimHandoff.ts.
  useEffect(() => {
    const pre = consumeClaimPrefill();
    if (!pre) return;
    setClaimType('AUTO');
    setStep('upload');
    setReportForm(f => ({
      ...f,
      policyNumber: pre.policyNumber || f.policyNumber,
      chronology: pre.description || f.chronology,
      date: pre.incidentDate || f.date,
    }));
  }, []);

  const t = (en: string, idn: string) => lang === Language.EN ? en : idn;


  useEffect(() => {
    if (currentUserProp) {
      setCurrentUser(currentUserProp);
    } else {
      const savedSession = localStorage.getItem('SUREPATH_SESSION');
      if (savedSession) setCurrentUser(JSON.parse(savedSession));
    }
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) setHasDraft(true);
  }, [currentUserProp]);

  useEffect(() => {
    if (step !== 'success' && step !== 'select') {
      const draftData = {
        claimType,
        step,
        claimResult,
        healthResult,
        photoBase64,
        photoUrls,
        photoReports,
        fraudAggregate,
        analysisId,
        reportForm,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    }
  }, [claimType, step, claimResult, healthResult, photoBase64, photoUrls, photoReports, fraudAggregate, analysisId, reportForm]);

  const loadDraft = () => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      const data = JSON.parse(draft);
      setClaimType(data.claimType);
      setStep(data.step);
      setClaimResult(data.claimResult);
      setHealthResult(data.healthResult);
      setPhotoBase64(data.photoBase64);
      setPhotoUrls(data.photoUrls ?? []);
      setPhotoReports(data.photoReports ?? []);
      setFraudAggregate(data.fraudAggregate ?? null);
      setAnalysisId(data.analysisId);
      setReportForm(data.reportForm);
      setHasDraft(false);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
    setStep('select');
  };

  const handleHealthUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStep('analyzing');
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPhotoBase64(base64);
      const response = await analyzeHealthReceipt(base64);
      if (response.success && response.data) {
        setHealthResult(response.data);
        setStep('result');
      } else {
        console.warn(t('Failed to read receipt.', 'Gagal membaca kuitansi.'));
        setStep('upload');
      }
    };
    reader.readAsDataURL(file);
  };

  // Vehicle claims: up to MAX_CLAIM_PHOTOS are uploaded to Storage immediately
  // on selection (each gets its own slot), then analyzed together in one pass
  // once the customer taps "Analisa Foto" — this lets the AI + duplicate-hash
  // check reason across all angles instead of one photo in isolation.
  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !currentUser?.id) return;
    if (photoUrls.length >= MAX_CLAIM_PHOTOS) return;
    const slot = photoUrls.length;
    setUploadingSlot(slot);
    setAnalyzeError(null);
    try {
      const url = await uploadClaimPhoto(file, currentUser.id, slot);
      if (url) {
        setPhotoUrls(prev => [...prev, url]);
      } else {
        setAnalyzeError(t('Failed to upload photo. Try again.', 'Gagal mengunggah foto. Coba lagi.'));
      }
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyzePhotos = async () => {
    if (photoUrls.length === 0) return;
    setStep('analyzing');
    setAnalyzeError(null);
    try {
      const response = await analyzeClaimPhotos(photoUrls);
      if (response.success && response.aggregate) {
        setClaimResult({
          severity: response.aggregate.severity,
          totalEstimasi: response.aggregate.totalEstimasi,
          rincianPart: response.aggregate.rincianPart.map(p => ({
            namaPart: p.part, kondisi: p.condition, tindakan: p.action, estimasiBiaya: p.estimasiBiaya,
          })),
          aiInsight: response.aggregate.aiInsight,
          technicalReasoning: response.aggregate.flagSummary.join(' ') || t('No anomalies detected across the submitted photos.', 'Tidak ditemukan anomali pada foto yang diunggah.'),
          rekomendasiBengkel: 'Partner',
          nextSteps: [
            t('Our team will verify the incident details.', 'Tim kami akan memverifikasi detail kejadian.'),
            t('You will be contacted regarding the repair process.', 'Anda akan dihubungi terkait proses perbaikan.'),
          ],
        });
        setPhotoReports(response.photoReports ?? []);
        setFraudAggregate(response.aggregate);
        setAnalysisId(response.analysisId);
        setStep('result');
      } else {
        setAnalyzeError(response.error ?? t('Could not analyze the photos. Please try again.', 'Foto tidak dapat dianalisa. Coba lagi ya.'));
        setStep('upload');
      }
    } catch {
      setAnalyzeError(t('Could not analyze the photos. Please try again.', 'Foto tidak dapat dianalisa. Coba lagi ya.'));
      setStep('upload');
    }
  };

  const handleFinalReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reportForm.chronology.length < 10) {
      console.warn(t("Please provide more details.", "Berikan kronologi lebih detail."));
      return;
    }
    
    if (!currentUser) return;
    setIsSubmitting(true);

    try {
        const amount = claimType === 'AUTO' ? (claimResult?.totalEstimasi || 0) : (healthResult?.totalAmount || 0);
        const photosForRecord = claimType === 'AUTO' ? photoUrls : [photoBase64];

        const newClaim: Claim = {
            userId: currentUser.id,
            policyNumber: reportForm.policyNumber,
            contactInfo: reportForm.contactInfo,
            date: reportForm.date,
            time: reportForm.time,
            location: reportForm.location,
            chronology: reportForm.chronology,
            thirdPartyInvolved: reportForm.thirdPartyInvolved,
            status: 'SUBMITTED',
            amountEstimated: amount,
            photos: photosForRecord,
            aiAnalysis: claimType === 'AUTO' ? claimResult : healthResult,
            createdAt: new Date().toISOString()
        };

        await db.claims.add(newClaim);
        localStorage.removeItem(DRAFT_KEY);

        // Sync to Supabase for admin visibility. For AUTO claims, analysisId
        // tells the gateway to pull the trusted, server-computed fraud report
        // onto the new claim row (see submit_claim in data-gateway/actions/claims.ts).
        submitClaim({
          user_id: currentUser?.id,
          client_name: currentUser?.name ?? reportForm.contactInfo,
          policy_number: reportForm.policyNumber,
          product_type: claimType === 'AUTO' ? 'CAR' : 'HEALTH',
          date: reportForm.date,
          location: reportForm.location,
          chronology: reportForm.chronology,
          status: 'SUBMITTED',
          amount_estimated: amount,
          photos: photosForRecord,
          analysis_id: claimType === 'AUTO' ? analysisId : undefined,
        }).catch(() => {});

        setTimeout(() => {
            setIsSubmitting(false);
            setStep('success');
        }, 1500);
    } catch (e) {
        console.error("Save failed", e);
        console.warn(t("Error submitting claim.", "Gagal mengirim laporan."));
        setIsSubmitting(false);
    }
  };

  const Header = ({ title, showBack = false, onBack = () => {} }: { title: string, showBack?: boolean, onBack?: () => void }) => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        {showBack && (
          <button onClick={onBack} className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl hover:text-emerald-500 transition-colors border border-black/5">
            <ChevronRight className="rotate-180" size={20}/>
          </button>
        )}
        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 shadow-inner">
          <ShieldCheck size={24}/>
        </div>
        <h3 className="text-xl font-black uppercase tracking-tight">{title}</h3>
      </div>
    </div>
  );

  if (step === 'select') {
    return (
      <div className="space-y-10 animate-fade-in flex flex-col h-full justify-center px-4">
        {hasDraft && (
           <div className="p-6 bg-amber-50 border border-amber-200 rounded-[2rem] flex flex-col gap-4 animate-pop-in">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg"><RefreshCw size={20}/></div>
                 <p className="text-xs font-bold text-amber-800 leading-tight">Kamu punya laporan yang belum selesai. Ingin melanjutkan?</p>
              </div>
              <div className="flex gap-2">
                 <button onClick={loadDraft} className="flex-1 py-3 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">Lanjutkan</button>
                 <button onClick={clearDraft} className="px-5 py-3 bg-white text-amber-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-200">Mulai Baru</button>
              </div>
           </div>
        )}

        <div className="text-center space-y-4">
           <Badge variant="brand">{t('Simplified Claims', 'Lapor Klaim Mudah')}</Badge>
           <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-tight">{t('Submit', 'Laporkan')} <span className="text-emerald-500">{t('Your Case', 'Masalahmu')}</span></h2>
           <p className="text-sm text-gray-500 font-bold uppercase tracking-widest max-w-xs mx-auto opacity-60">{t('Fast process, no complicated forms.', 'Proses cepat, tanpa formulir ribet.')}</p>
        </div>
        <div className="grid gap-5">
           <button 
             onClick={() => { setClaimType('AUTO'); setStep('upload'); }}
             className="p-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-xl flex items-center gap-8 group hover:border-emerald-500 transition-all active:scale-95"
           >
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform shadow-inner"><Car size={40}/></div>
              <div className="text-left">
                 <h3 className="font-black text-2xl uppercase tracking-tight">{t('Car Claim', 'Klaim Mobil')}</h3>
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">{t('Submit photos of damage', 'Kirim foto kerusakan')}</p>
              </div>
           </button>
           <button 
             onClick={() => { setClaimType('HEALTH'); setStep('upload'); }}
             className="p-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-xl flex items-center gap-8 group hover:border-emerald-500 transition-all active:scale-95"
           >
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform shadow-inner"><HeartPulse size={40}/></div>
              <div className="text-left">
                 <h3 className="font-black text-2xl uppercase tracking-tight">{t('Medical Claim', 'Klaim Medis')}</h3>
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">{t('Upload medical receipts', 'Kirim kuitansi rumah sakit')}</p>
              </div>
           </button>
        </div>
      </div>
    );
  }

  if (step === 'upload' && claimType === 'HEALTH') {
    return (
      <div className="space-y-6 animate-fade-in flex flex-col h-full justify-center">
        <Header title={t("Receipt Check", "Cek Kuitansi")} />
        <div className="aspect-square relative rounded-[3rem] overflow-hidden bg-gray-50 dark:bg-white/5 border-2 border-dashed border-emerald-500/20 flex flex-col items-center justify-center group cursor-pointer shadow-inner">
          <div className="w-24 h-24 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform shadow-xl">
            <Camera size={48} />
          </div>
          <p className="text-2xl font-black uppercase text-gray-400 group-hover:text-emerald-500 transition-colors tracking-tight">
            {t("Upload Image", "Upload Foto")}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 font-bold uppercase tracking-widest text-center px-12 opacity-60">
            {t("Upload your hospital billing photo.", "Unggah foto tagihan rumah sakit.")}
          </p>
          <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleHealthUpload} />
        </div>
        <button onClick={() => setStep('select')} className="w-full py-4 text-xs font-black uppercase text-gray-400">Kembali</button>
      </div>
    );
  }

  if (step === 'upload' && claimType === 'AUTO') {
    const slots = Array.from({ length: MAX_CLAIM_PHOTOS });
    return (
      <div className="space-y-6 animate-fade-in flex flex-col h-full justify-center">
        <Header title={t("Vehicle Check", "Cek Kendaraan")} />
        <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-center px-4 opacity-70">
          {t(`Add up to ${MAX_CLAIM_PHOTOS} photos from different angles — more angles help us verify authenticity and estimate cost accurately.`, `Tambahkan hingga ${MAX_CLAIM_PHOTOS} foto dari berbagai sudut — semakin banyak sudut, semakin akurat verifikasi keaslian dan estimasi biaya.`)}
        </p>
        {analyzeError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-600">{analyzeError}</div>
        )}
        <div className="grid grid-cols-3 gap-3">
          {slots.map((_, i) => {
            const url = photoUrls[i];
            const isUploading = uploadingSlot === i;
            const isNextEmptySlot = i === photoUrls.length && !isUploading;
            if (url) {
              return (
                <div key={i} className="relative aspect-square rounded-3xl overflow-hidden border-2 border-emerald-500/30 shadow-md group">
                  <img src={url} alt={`photo-${i}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemovePhoto(i)}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            }
            if (isUploading) {
              return (
                <div key={i} className="aspect-square rounded-3xl bg-gray-50 dark:bg-white/5 border-2 border-dashed border-emerald-500/20 flex items-center justify-center">
                  <Loader2 className="animate-spin text-emerald-500" size={24} />
                </div>
              );
            }
            if (isNextEmptySlot) {
              return (
                <div key={i} className="relative aspect-square rounded-3xl bg-gray-50 dark:bg-white/5 border-2 border-dashed border-emerald-500/30 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 transition-colors">
                  <ImagePlus size={24} className="text-emerald-500 mb-1" />
                  <span className="text-[0.5rem] font-black uppercase text-gray-400">{t('Add', 'Tambah')}</span>
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAddPhoto} />
                </div>
              );
            }
            return <div key={i} className="aspect-square rounded-3xl bg-gray-50/50 dark:bg-white/[0.02] border-2 border-dashed border-gray-200 dark:border-white/5" />;
          })}
        </div>
        <div className="space-y-3">
          <button
            onClick={handleAnalyzePhotos}
            disabled={photoUrls.length === 0 || uploadingSlot !== null}
            className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-3"
          >
            <BrainCircuit size={20} /> {t('Analyze Photos', 'Analisa Foto')} {photoUrls.length > 0 && `(${photoUrls.length})`}
          </button>
          <button onClick={() => setStep('select')} className="w-full py-4 text-xs font-black uppercase text-gray-400">Kembali</button>
        </div>
      </div>
    );
  }

  if (step === 'analyzing') {
    return (
      <div className="glass-card rounded-[3rem] h-full flex flex-col items-center justify-center animate-pop-in bg-white dark:bg-midnight overflow-hidden">
        <SmartProcessingView 
          label={t("Analyzing Evidence...", "Menganalisa Bukti...")} 
          sublabel={t("Our AI is checking your photo to estimate the claim.", "Sistem Cerdas kami sedang memeriksa foto kamu untuk menghitung estimasi klaim.")}
        />
      </div>
    );
  }

  if (step === 'result') {
    const isAuto = claimType === 'AUTO';
    return (
       <div className="space-y-6 animate-pop-in h-full flex flex-col pb-6">
          <Header title={t("Check Result", "Hasil Pengecekan")} />
          
          {/* Main Hero Card */}
          <div className="p-8 bg-slate-900 rounded-[3rem] text-white relative overflow-hidden shadow-2xl transition-all hover:scale-[1.02]">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
               {isAuto ? <Car size={120}/> : <HeartPulse size={120}/>}
            </div>
            <div className="relative z-10 space-y-5">
               <div className="flex justify-between items-center">
                  <p className="text-[0.6rem] font-black uppercase text-emerald-400 tracking-[0.4em]">{t('Estimasi Klaim', 'Estimasi Klaim')}</p>
                  <div className={`px-3 py-1 rounded-lg font-black text-[0.5rem] uppercase tracking-widest border border-white/20 ${isAuto && claimResult?.severity === 'Ringan' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                     {isAuto ? `${claimResult?.severity} Severity` : 'Catatan Medis'}
                  </div>
               </div>
               <h3 className="text-5xl font-black tracking-tighter leading-none">{formatIDR(isAuto ? claimResult?.totalEstimasi || 0 : healthResult?.totalAmount || 0)}</h3>
               <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                  <span className="text-[0.55rem] font-black uppercase tracking-widest text-emerald-400">{t('Real-time Verification Active', 'Verifikasi Real-time Aktif')}</span>
               </div>
            </div>
          </div>

          {/* Photo Verification banner */}
          {isAuto && fraudAggregate && (
             <div className={`p-5 rounded-[2rem] border flex items-center gap-4 ${VERDICT_META[fraudAggregate.fraudVerdict].color}`}>
                {React.createElement(VERDICT_META[fraudAggregate.fraudVerdict].Icon, { size: 28, className: 'shrink-0' })}
                <div className="flex-1">
                   <p className="text-xs font-black uppercase tracking-widest">{VERDICT_META[fraudAggregate.fraudVerdict].label}</p>
                   <p className="text-[0.6rem] font-bold opacity-70 mt-0.5">{t(`Authenticity score: ${100 - fraudAggregate.fraudScore}/100`, `Skor keaslian: ${100 - fraudAggregate.fraudScore}/100`)}</p>
                </div>
             </div>
          )}

          {/* Sub Navigation */}
          <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl shadow-inner border border-black/5">
             {[
               { id: 'evidence', label: t('Breakdown', 'Rincian'), icon: ClipboardList },
               { id: 'reasoning', label: t('AI Reasoning', 'Analisa'), icon: BrainCircuit },
               ...(isAuto && photoReports.length > 0 ? [{ id: 'verification', label: t('Photos', 'Foto'), icon: ShieldCheck }] : []),
               { id: 'steps', label: t('Langkah Selanjutnya', 'Langkah Selanjutnya'), icon: Zap }
             ].map(tab => (
               <button 
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as any)}
                 className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[0.6rem] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-emerald-500 shadow-md scale-105' : 'text-gray-400 hover:text-gray-600'}`}
               >
                 <tab.icon size={14}/> {tab.label}
               </button>
             ))}
          </div>

          {/* Detailed Content Area */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 px-1 min-h-[300px]">
             {activeTab === 'evidence' && (
                <div className="space-y-3 animate-fade-in">
                   {isAuto ? (
                      claimResult?.rincianPart.map((p, i) => (
                         <div key={i} className="p-5 bg-white dark:bg-white/5 rounded-[2rem] border border-black/5 flex items-center justify-between group hover:border-emerald-500/30 transition-all shadow-sm">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors">
                                  <Activity size={20}/>
                               </div>
                               <div>
                                  <p className="text-[0.7rem] font-black uppercase text-slate-800 dark:text-white leading-none mb-1.5">{p.namaPart}</p>
                                  <div className="flex items-center gap-2">
                                     <span className={`px-2 py-0.5 rounded text-[0.45rem] font-black uppercase border ${p.tindakan === 'Ganti' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>{p.tindakan}</span>
                                     <span className="text-[0.55rem] text-gray-400 font-medium italic">"{p.kondisi}"</span>
                                  </div>
                               </div>
                            </div>
                            <p className="text-sm font-black text-emerald-500">{formatIDR(p.estimasiBiaya)}</p>
                         </div>
                      ))
                   ) : (
                      healthResult?.billingItems.map((item, i) => (
                         <div key={i} className="p-5 bg-white dark:bg-white/5 rounded-[2rem] border border-black/5 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500"><Receipt size={20}/></div>
                               <div>
                                  <p className="text-xs font-black uppercase text-slate-800 dark:text-white">{item.item}</p>
                                  <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest mt-1">Catatan Medis</p>
                               </div>
                            </div>
                            <p className="text-sm font-black text-rose-500">{formatIDR(item.cost)}</p>
                         </div>
                      ))
                   )}
                </div>
             )}

             {activeTab === 'reasoning' && (
                <div className="space-y-6 animate-fade-in">
                   <div className="p-8 bg-emerald-500/5 rounded-[2.5rem] border border-emerald-500/10 space-y-4">
                      <div className="flex items-center gap-3 text-emerald-500">
                         <BrainCircuit size={20}/>
                         <span className="text-[0.65rem] font-black uppercase tracking-widest">{t('AI Structural Analysis', 'Analisa Struktural AI')}</span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed text-slate-700 dark:text-gray-300 italic">
                         "{isAuto ? claimResult?.technicalReasoning : healthResult?.diagnosisSummary}"
                      </p>
                   </div>
                   
                   {isAuto && (
                     <div className="p-8 bg-blue-500/5 rounded-[2.5rem] border border-blue-500/10 flex items-center gap-6">
                        <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg"><Building2 size={24}/></div>
                        <div className="flex-1">
                           <p className="text-[0.55rem] font-black uppercase text-blue-400 tracking-widest">Bengkel Rekanan</p>
                           <h4 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white leading-none mt-1">{claimResult?.rekomendasiBengkel}</h4>
                        </div>
                     </div>
                   )}
                </div>
             )}

             {activeTab === 'verification' && (
                <div className="space-y-3 animate-fade-in">
                   {photoReports.map((r) => {
                      const meta = PHOTO_VERDICT_META[r.verdict] ?? PHOTO_VERDICT_META.CLEAN;
                      return (
                         <div key={r.photoIndex} className="p-4 bg-white dark:bg-white/5 rounded-[2rem] border border-black/5 flex gap-4 shadow-sm">
                            <img src={r.photoUrl} alt={`verify-${r.photoIndex}`} className="w-16 h-16 rounded-2xl object-cover shrink-0" />
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2 mb-1">
                                  <p className="text-[0.65rem] font-black uppercase text-slate-800 dark:text-white">{t(`Photo ${r.photoIndex + 1}`, `Foto ${r.photoIndex + 1}`)}</p>
                                  <span className={`px-2 py-0.5 rounded text-[0.45rem] font-black uppercase ${meta.color}`}>{meta.label}</span>
                               </div>
                               {r.flagReasons.length > 0 ? (
                                  <ul className="space-y-1">
                                     {r.flagReasons.map((reason, i) => (
                                        <li key={i} className="text-[0.6rem] text-gray-500 dark:text-gray-400 leading-snug">• {reason}</li>
                                     ))}
                                  </ul>
                               ) : (
                                  <p className="text-[0.6rem] text-gray-400 italic">{t('No issues found.', 'Tidak ada masalah ditemukan.')}</p>
                               )}
                            </div>
                         </div>
                      );
                   })}
                </div>
             )}

             {activeTab === 'steps' && (
                <div className="space-y-4 animate-fade-in">
                   {(isAuto ? claimResult?.nextSteps : [t('Review medical record', 'Tinjau catatan medis'), t('Proses pencairan klaim', 'Proses pencairan klaim')])?.map((step, i) => (
                      <div key={i} className="flex gap-5 items-start p-6 bg-white dark:bg-white/5 rounded-[2rem] border border-black/5">
                         <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-black text-xs shrink-0">{i+1}</div>
                         <p className="text-sm font-bold text-slate-600 dark:text-gray-400 pt-1">{step}</p>
                      </div>
                   ))}
                </div>
             )}
          </div>

          <div className="space-y-4">
             <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200">
                <AlertCircle className="text-amber-500 shrink-0" size={20}/>
                <p className="text-[0.6rem] font-bold text-amber-700 leading-tight uppercase tracking-wide">
                   {t('Once you continue, photos and details can no longer be edited.', 'Setelah lanjut, foto dan detail tidak bisa diubah lagi.')}
                </p>
             </div>
             <button onClick={() => setStep('reporting')} className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[2rem] font-black uppercase text-sm tracking-[0.3em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4">
                {t('Kirim Klaim', 'Kirim Klaim')} <ArrowRight size={20}/>
             </button>
          </div>
       </div>
    );
  }

  if (step === 'reporting') {
    return (
      <div className="animate-fade-in flex flex-col h-full">
        <Header title={t("Incident Details", "Detail Kejadian")} showBack onBack={() => setStep('result')} />
        <form onSubmit={handleFinalReport} className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-6 pt-2">
          <div className="space-y-1.5">
            <label className="text-[0.55rem] font-black uppercase tracking-widest text-gray-400 ml-2">{t('Policy Number', 'Nomor Polis')}</label>
            <div className="relative">
              <FileText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
              <input 
                type="text" required placeholder={t("e.g. POL-12345", "Contoh: POL-12345")}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-white/5 border-2 border-slate-100 dark:border-white/5 text-sm outline-none focus:border-emerald-500 font-bold" 
                value={reportForm.policyNumber}
                onChange={(e) => setReportForm({...reportForm, policyNumber: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[0.55rem] font-black uppercase tracking-widest text-gray-400 ml-2">{t('Contact Info', 'Info Kontak')}</label>
            <div className="relative">
              <Smartphone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
              <input 
                type="text" required placeholder={t("Phone / Email", "No. HP / Email")}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-white/5 border-2 border-slate-100 dark:border-white/5 text-sm outline-none focus:border-emerald-500 font-bold" 
                value={reportForm.contactInfo}
                onChange={(e) => setReportForm({...reportForm, contactInfo: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[0.55rem] font-black uppercase tracking-widest text-gray-400 ml-2">{t('Where it happened?', 'Lokasi Kejadian')}</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
              <input 
                type="text" required placeholder={t("Address or location...", "Alamat atau lokasi...")}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-white/5 border-2 border-slate-100 dark:border-white/5 text-sm outline-none focus:border-emerald-500 font-bold" 
                value={reportForm.location}
                onChange={(e) => setReportForm({...reportForm, location: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[0.55rem] font-black uppercase tracking-widest text-gray-400 ml-2">{t('Describe Event', 'Ceritakan Kejadiannya')}</label>
            <textarea 
              required rows={4} placeholder={t("Explain how it happened...", "Ceritakan detail kejadiannya...")}
              className="w-full px-6 py-4 rounded-[2rem] bg-white dark:bg-white/5 border-2 border-slate-100 dark:border-white/5 text-sm outline-none focus:border-emerald-500 resize-none font-medium leading-relaxed shadow-inner" 
              value={reportForm.chronology}
              onChange={(e) => setReportForm({...reportForm, chronology: e.target.value})}
            />
          </div>

          <div className="pt-2">
            <label className={`flex items-center gap-5 p-6 bg-white dark:bg-white/5 border-2 rounded-[2.5rem] cursor-pointer transition-all shadow-sm ${reportForm.thirdPartyInvolved ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-50'}`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${reportForm.thirdPartyInvolved ? 'bg-emerald-500 text-white shadow-lg' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                <Users size={28}/>
              </div>
              <div className="flex-1">
                <p className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">{t('Others involved?', 'Ada orang lain terlibat?')}</p>
              </div>
              <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${reportForm.thirdPartyInvolved ? 'bg-emerald-500 border-emerald-500 shadow-lg' : 'border-slate-200'}`}>
                {reportForm.thirdPartyInvolved && <Check size={18} className="text-white" strokeWidth={3}/>}
              </div>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={reportForm.thirdPartyInvolved}
                onChange={(e) => setReportForm({...reportForm, thirdPartyInvolved: e.target.checked})}
              />
            </label>
          </div>
        </form>

        {/* ClaimSense AI — estimate cost + working days + fraud risk before submit */}
        {claimType === 'AUTO' && (
          <div className="mt-4">
            <ClaimSensePanel
              claimData={{
                description: reportForm.chronology || 'Claim description not provided',
                vehicleBrand: 'Customer vehicle',
                sumInsured: claimResult?.totalEstimasi ?? 0,
                policyAgeDays: 0,
                claimHistoryCount: 0,
              }}
            />
          </div>
        )}

        <button
          onClick={handleFinalReport} disabled={isSubmitting}
          className="mt-6 w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[2rem] font-black uppercase text-sm tracking-[0.3em] shadow-2xl flex items-center justify-center gap-4 disabled:opacity-50 transition-all active:scale-95 group relative overflow-hidden"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={24}/> : <Rocket size={24} className="relative z-10"/>}
          <span className="relative z-10">{t('Ajukan Klaim', 'Ajukan Klaim')}</span>
        </button>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="text-center space-y-10 py-10 animate-pop-in flex flex-col h-full justify-center items-center">
        <div className="w-32 h-32 bg-emerald-500 rounded-[3rem] flex items-center justify-center text-white shadow-2xl border-4 border-white dark:border-[#0f172a] animate-pop-in">
           <CheckCircle2 size={72} strokeWidth={2.5} />
        </div>
        <div className="space-y-4 px-8">
          <h3 className="text-4xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">{t('Klaim Diterima!', 'Klaim Diterima!')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-bold uppercase tracking-widest max-w-sm">
            {t('Klaim kamu telah kami terima. Tim kami akan meninjau dalam 24 jam. Cek status di menu Klaim.', 'Klaim kamu telah kami terima. Tim kami akan meninjau dalam 24 jam. Cek status di menu Klaim.')}
          </p>
        </div>
        <button onClick={onComplete} className="w-full max-w-sm py-6 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[2.5rem] font-black uppercase text-sm tracking-[0.3em] shadow-2xl transition-all active:scale-95">{t('Selesai', 'Selesai')}</button>
      </div>
    );
  }

  return null;
};

const Check = ({ size, className, strokeWidth }: { size: number, className?: string, strokeWidth?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth || 2} strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>
);


export default ClaimManager;