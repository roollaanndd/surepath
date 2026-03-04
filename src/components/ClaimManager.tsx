
import React, { useState, useMemo, useEffect } from 'react';
import { Camera, BrainCircuit, CheckCircle2, Scan, Smartphone, ArrowRight, MapPin, Calendar, Clock, FileText, AlertCircle, Loader2, FileSearch, Trash2, ShieldCheck, ChevronRight, Info, Rocket, Users, HeartPulse, Receipt, Building2, Stethoscope } from 'lucide-react';
import { analyzeClaimPhoto, summarizeClaimDocument, analyzeHealthReceipt, ClaimAnalysisData, DocumentSummary, HealthClaimData } from '../services/geminiService';
import { db, Claim } from '../db';
import { NeuralBot, NeuralProcessingView } from './car-wizard/WizardUI';
// Added missing Language import
import { Language } from '../types';

const formatIDR = (num: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
  }).format(num);
};

interface ReportForm {
  chronology: string;
  location: string;
  date: string;
  time: string;
  thirdPartyInvolved: boolean;
}

// Added missing lang prop
const ClaimManager = ({ onComplete, lang }: { onComplete: () => void, lang: Language }) => {
  const [claimType, setClaimType] = useState<'AUTO' | 'HEALTH' | null>(null);
  const [step, setStep] = useState<'select' | 'upload' | 'analyzing' | 'result' | 'docUpload' | 'docSummary' | 'reporting' | 'success'>('select');
  const [claimResult, setClaimResult] = useState<ClaimAnalysisData | null>(null);
  const [healthResult, setHealthResult] = useState<HealthClaimData | null>(null);
  const [docSummary, setDocSummary] = useState<DocumentSummary | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [activeTab, setActiveTab] = useState<'evidence' | 'reasoning' | 'steps'>('evidence');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [photoBase64, setPhotoBase64] = useState<string>('');

  // Translation helper
  const t = (en: string, idn: string) => lang === Language.EN ? en : idn;

  useEffect(() => {
    const saved = localStorage.getItem('SUREPATH_SESSION');
    if (saved) setCurrentUser(JSON.parse(saved));
  }, []);

  const [reportForm, setReportForm] = useState<ReportForm>({
    chronology: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    thirdPartyInvolved: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dateLimits = useMemo(() => {
    const today = new Date();
    const max = today.toISOString().split('T')[0];
    const minDate = new Date();
    minDate.setDate(today.getDate() - 7);
    const min = minDate.toISOString().split('T')[0];
    return { min, max };
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStep('analyzing');
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPhotoBase64(base64);
      
      if (claimType === 'AUTO') {
        const response = await analyzeClaimPhoto(base64);
        if (response.success && response.data) {
          setClaimResult(response.data);
          setStep('result');
        } else {
          alert(response.error || t('Neural audit failed. Please use a clearer photo.', 'Audit neural gagal. Mohon gunakan foto yang lebih jelas.'));
          setStep('upload');
        }
      } else if (claimType === 'HEALTH') {
        const response = await analyzeHealthReceipt(base64);
        if (response.success && response.data) {
          setHealthResult(response.data);
          setStep('result');
        } else {
          alert(response.error || t('Medical receipt audit failed.', 'Audit neural kuitansi gagal.'));
          setStep('upload');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSummarizing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const response = await summarizeClaimDocument(base64);
      setIsSummarizing(false);
      if (response.success && response.data) {
        setDocSummary(response.data);
        setStep('docSummary');
      } else {
        alert(response.error || t('Failed to summarize document.', 'Gagal meringkas dokumen.'));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFinalReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reportForm.chronology.length < 20) {
      alert(t("Provide more chronology details (min. 20 characters).", "Berikan kronologi lebih detail (min. 20 karakter)."));
      return;
    }
    
    if (!currentUser) return;
    setIsSubmitting(true);

    try {
        const amount = claimType === 'AUTO' ? (claimResult?.totalEstimasi || 0) : (healthResult?.totalAmount || 0);
        
        const newClaim: Claim = {
            userId: currentUser.id,
            date: reportForm.date,
            time: reportForm.time,
            location: reportForm.location,
            chronology: reportForm.chronology,
            thirdPartyInvolved: reportForm.thirdPartyInvolved,
            status: 'SUBMITTED',
            amountEstimated: amount,
            photos: [photoBase64],
            aiAnalysis: claimType === 'AUTO' ? claimResult : healthResult,
            createdAt: new Date().toISOString()
        };

        await db.claims.add(newClaim);
        setTimeout(() => {
            setIsSubmitting(false);
            setStep('success');
        }, 1500);
    } catch (error) {
        console.error("Claim save failed", error);
        alert(t("Failed to save claim.", "Gagal menyimpan klaim."));
        setIsSubmitting(false);
    }
  };

  const Header = ({ title, showBack = false, onBack = () => {} }: { title: string, showBack?: boolean, onBack?: () => void }) => (
    <div className="flex items-center gap-3 mb-3">
      {showBack && (
        <button onClick={onBack} className="p-2 bg-gray-100 dark:bg-white/5 rounded-full hover:text-primary-500 transition-colors">
          <ChevronRight className="rotate-180" size={16}/>
        </button>
      )}
      <div className="w-7 h-7 bg-primary-500/10 rounded-lg flex items-center justify-center text-primary-500">
        <ShieldCheck size={16}/>
      </div>
      <h3 className="text-lg font-black uppercase tracking-tight">{title}</h3>
    </div>
  );

  if (step === 'select') {
    return (
      <div className="space-y-6 animate-fade-in flex flex-col h-full justify-center px-4">
        <div className="text-center mb-6">
           <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">{t('Smart Report', 'Lapor Klaim')} <span className="text-primary-500">{t('Claim', 'Pintar')}</span></h2>
           <p className="text-xs text-gray-500 font-bold uppercase mt-2 tracking-widest">{t('Select your insurance type', 'Pilih tipe asuransi kamu')}</p>
        </div>
        <div className="grid gap-4">
           <button 
             onClick={() => { setClaimType('AUTO'); setStep('upload'); }}
             className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-lg flex items-center gap-6 group hover:border-primary-500/50 transition-all active:scale-95"
           >
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500"><Smartphone size={32}/></div>
              <div className="text-left">
                 <h3 className="font-black text-xl uppercase tracking-tight">{t('Vehicle Claim', 'Klaim Kendaraan')}</h3>
                 <p className="text-[0.6rem] font-bold text-gray-400 uppercase tracking-widest mt-1">{t('AI visual damage audit', 'Audit kerusakan visual AI')}</p>
              </div>
           </button>
           <button 
             onClick={() => { setClaimType('HEALTH'); setStep('upload'); }}
             className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-lg flex items-center gap-6 group hover:border-primary-500/50 transition-all active:scale-95"
           >
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500"><HeartPulse size={32}/></div>
              <div className="text-left">
                 <h3 className="font-black text-xl uppercase tracking-tight">{t('Health Claim', 'Klaim Kesehatan')}</h3>
                 <p className="text-[0.6rem] font-bold text-gray-400 uppercase tracking-widest mt-1">{t('AI medical receipt extraction', 'Ekstraksi kuitansi medis AI')}</p>
              </div>
           </button>
        </div>
      </div>
    );
  }

  if (step === 'upload') {
    return (
      <div className="space-y-3 animate-fade-in flex flex-col h-full justify-center">
        <Header title={claimType === 'AUTO' ? t("Vehicle Claim", "Klaim Kendaraan") : t("Health Claim", "Klaim Kesehatan")} showBack onBack={() => setStep('select')} />
        <div className="aspect-[4/3] relative rounded-[2rem] overflow-hidden bg-gray-100 dark:bg-white/5 border-2 border-dashed border-primary-500/30 flex flex-col items-center justify-center group cursor-pointer shadow-inner">
          <div className="w-14 h-14 bg-primary-500/10 rounded-full flex items-center justify-center text-primary-500 mb-2 group-hover:scale-110 transition-transform">
            <Camera size={28} />
          </div>
          <p className="text-base font-black uppercase text-gray-400 group-hover:text-primary-500 transition-colors tracking-tight">
            {claimType === 'AUTO' ? t("Damage Photo", "Foto Kerusakan") : t("Medical Receipt Photo", "Foto Kuitansi RS")}
          </p>
          <p className="text-[0.5rem] text-gray-400 mt-1 font-bold uppercase tracking-widest text-center px-4">
            {claimType === 'AUTO' ? t("Snap a photo of the damage.", "Ambil foto kerusakan yang terjadi.") : t("Upload hospital billing or receipt.", "Unggah kuitansi atau billing medis.")}
          </p>
          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleUpload} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl bg-white dark:bg-white/5 border border-black/5 flex flex-col items-center text-center gap-1.5">
            <Scan size={18} className="text-primary-500" />
            <p className="text-[0.45rem] font-black uppercase tracking-widest text-gray-500">Secure Check</p>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-white/5 border border-black/5 flex flex-col items-center text-center gap-1.5">
            <Rocket size={18} className="text-primary-500" />
            <p className="text-[0.45rem] font-black uppercase tracking-widest text-gray-500">Express Submit</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'analyzing') {
    return (
      <div className="glass-card rounded-[2.5rem] h-full flex flex-col items-center justify-center animate-pop-in bg-white dark:bg-midnight overflow-hidden">
        <NeuralProcessingView 
          label={claimType === 'AUTO' ? t("Damage Audit", "Audit Kerusakan") : t("Medical Audit", "Audit Medis")} 
          sublabel={claimType === 'AUTO' ? t("Calculating repair costs...", "Menghitung biaya perbaikan...") : t("Parsing hospital billing data...", "Memproses data billing RS...")}
        />
      </div>
    );
  }

  if (step === 'result') {
    if (claimType === 'AUTO' && claimResult) {
      return (
        <div className="space-y-3 animate-pop-in h-full flex flex-col pb-2">
          <Header title={t("AI Audit Results", "Hasil Audit AI")} showBack onBack={() => setStep('upload')} />
          <div className="p-4 glass-card rounded-[2rem] border-2 border-primary-500/20 bg-primary-500/5 relative overflow-hidden flex-shrink-0">
            <div className="absolute top-3 right-3">
              <div className="px-2 py-0.5 bg-primary-500 text-white rounded-md font-black text-[0.45rem] uppercase tracking-widest">{claimResult.severity} Damage</div>
            </div>
            <p className="text-[0.45rem] font-black uppercase text-primary-500 tracking-[0.3em] mb-1">{t('Estimated Repair Cost', 'Estimasi Biaya Perbaikan')}</p>
            <h3 className="text-3xl font-black tracking-tighter mb-1">{formatIDR(claimResult.totalEstimasi)}</h3>
            <p className="text-[0.6rem] font-bold text-gray-600 dark:text-gray-300 leading-tight border-l-2 border-primary-500 pl-2">AI Analysis: {claimResult.aiInsight}</p>
          </div>

          <div className="flex bg-gray-100 dark:bg-white/5 p-0.5 rounded-lg text-[0.5rem] font-black uppercase tracking-widest">
              <button onClick={() => setActiveTab('evidence')} className={`flex-1 py-1.5 rounded-md transition-all ${activeTab === 'evidence' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-500' : 'text-gray-400'}`}>{t('Visual Analysis', 'Analisa Visual')}</button>
              <button onClick={() => setActiveTab('reasoning')} className={`flex-1 py-1.5 rounded-md transition-all ${activeTab === 'reasoning' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-500' : 'text-gray-400'}`}>{t('Tech Summary', 'Ringkasan Teknis')}</button>
          </div>

          <div className="flex-1 overflow-y-auto pr-0.5 no-scrollbar min-h-0">
            {activeTab === 'evidence' && (
              <div className="animate-fade-in space-y-2 p-1">
                {claimResult.rincianPart?.map((p, i) => (
                  <div key={i} className="p-3 bg-white dark:bg-white/5 rounded-xl border border-black/5 flex items-center justify-between shadow-sm">
                    <div className="flex-1">
                      <p className="font-black uppercase text-[0.6rem] tracking-tight">{p.namaPart}</p>
                      <p className="text-[0.45rem] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{p.kondisi}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-black text-[0.7rem] text-primary-500 leading-none">{formatIDR(p.estimasiBiaya)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'reasoning' && (
              <div className="p-4 space-y-4">
                 <div className="p-4 bg-primary-50 dark:bg-primary-900/10 rounded-2xl">
                    <p className="text-[0.6rem] font-black text-primary-500 uppercase mb-2 tracking-widest">{t('Workshop Recommendation', 'Rekomendasi Bengkel')}</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white uppercase">{claimResult.rekomendasiBengkel}</p>
                 </div>
              </div>
            )}
          </div>

          <button onClick={() => setStep('reporting')} className="py-4 bg-primary-500 text-white rounded-xl font-black uppercase text-[0.65rem] tracking-widest shadow-lg shadow-primary-500/20 transition-all active:scale-95">{t('Next to Report', 'Lanjut Lapor')}</button>
        </div>
      );
    } else if (claimType === 'HEALTH' && healthResult) {
      return (
        <div className="space-y-4 animate-pop-in h-full flex flex-col pb-2">
           <Header title={t("Neural Receipt Parsing", "Parsing Kuitansi Neural")} showBack onBack={() => setStep('upload')} />
           <div className="p-6 bg-rose-500/5 rounded-[2.5rem] border-2 border-rose-500/20 relative overflow-hidden flex-shrink-0">
              <div className="absolute top-0 right-0 p-6 opacity-10"><HeartPulse size={80}/></div>
              <p className="text-[0.55rem] font-black uppercase text-rose-500 tracking-[0.3em] mb-1">{t('Total Medical Expenses', 'Total Biaya Medis')}</p>
              <h3 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">{formatIDR(healthResult.totalAmount)}</h3>
              <div className="flex items-center gap-2 mt-4">
                 <BadgeCheck className="text-emerald-500" size={14}/>
                 <span className="text-[0.5rem] font-bold text-emerald-600 uppercase">{t('Document Validity:', 'Validitas Dokumen:')} {healthResult.confidenceScore}%</span>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
              <div className="grid grid-cols-2 gap-3">
                 <div className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-black/5">
                    <p className="text-[0.45rem] font-black text-gray-400 uppercase mb-1">{t('Hospital', 'Rumah Sakit')}</p>
                    <p className="text-[0.65rem] font-black uppercase flex items-center gap-2"><Building2 size={10} className="text-primary-500"/> {healthResult.hospitalName}</p>
                 </div>
                 <div className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-black/5">
                    <p className="text-[0.45rem] font-black text-gray-400 uppercase mb-1">{t('Treatment Date', 'Tgl Perawatan')}</p>
                    <p className="text-[0.65rem] font-black uppercase flex items-center gap-2"><Calendar size={10} className="text-primary-500"/> {healthResult.treatmentDate}</p>
                 </div>
              </div>

              <div className="p-5 bg-white dark:bg-white/5 rounded-[2rem] border border-black/5">
                 <p className="text-[0.5rem] font-black text-gray-400 uppercase mb-3 flex items-center gap-2"><Stethoscope size={12}/> {t('Diagnosis / Care', 'Diagnosa / Perawatan')}</p>
                 <p className="text-[0.7rem] font-medium leading-relaxed italic text-slate-700 dark:text-gray-300">"{healthResult.diagnosisSummary}"</p>
              </div>

              <div className="space-y-2">
                 <p className="text-[0.5rem] font-black text-gray-400 uppercase ml-2 tracking-widest">{t('Billing Details', 'Rincian Billing')}</p>
                 {healthResult.billingItems?.map((item, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl flex justify-between items-center border border-black/5">
                       <span className="text-[0.6rem] font-bold uppercase text-gray-600 dark:text-gray-400">{item.item}</span>
                       <span className="text-[0.65rem] font-black">{formatIDR(item.cost)}</span>
                    </div>
                 ))}
              </div>
           </div>

           <button onClick={() => setStep('reporting')} className="py-4 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-[0.65rem] tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3">
             <Rocket size={16}/> {t('Send Reimbursement', 'Kirim Reimbursement')}
           </button>
        </div>
      );
    }
  }

  if (step === 'docUpload') {
    return (
      <div className="space-y-4 animate-fade-in flex flex-col h-full justify-center">
        <Header title={t("Accelerated Document Audit", "Audit Dokumen Cepat")} showBack onBack={() => setStep('result')} />
        <div className="p-6 rounded-[2rem] border-2 border-dashed border-gray-300 dark:border-white/10 flex flex-col items-center justify-center text-center gap-3 relative bg-gray-50 dark:bg-white/5">
          {isSummarizing ? (
            <div className="py-6 space-y-3">
              <Loader2 className="animate-spin text-primary-500 mx-auto" size={28}/>
              <p className="text-[0.55rem] font-black uppercase text-gray-400 animate-pulse">{t('Syncing to Insurer...', 'Sinkronisasi ke Asuransi...')}</p>
            </div>
          ) : (
            <>
              <FileSearch size={32} className="text-gray-300"/>
              <div className="space-y-0.5">
                <p className="font-black text-xs uppercase tracking-tight">{t('Rapid Document Upload', 'Upload Dokumen Kilat')}</p>
                <p className="text-[0.45rem] font-bold text-gray-400 uppercase tracking-widest">{t('Instant data extraction for claim speed', 'Ekstraksi data instan untuk klaim cepat')}</p>
              </div>
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleDocUpload} />
            </>
          )}
        </div>
        {!isSummarizing && <button onClick={() => setStep('result')} className="w-full py-3 text-[0.5rem] font-black uppercase text-gray-400 tracking-widest">{t('Back to Audit', 'Kembali ke Audit')}</button>}
      </div>
    );
  }

  if (step === 'docSummary' && docSummary) {
    return (
      <div className="space-y-3 animate-pop-in h-full flex flex-col">
        <Header title={t("Claim Summary", "Ringkasan Klaim")} showBack onBack={() => setStep('docUpload')} />
        <div className="p-4 bg-primary-50/5 border border-primary-500/20 rounded-xl space-y-1">
          <p className="text-[0.4rem] font-black text-primary-500 uppercase tracking-widest">{t('Express Path Policy', 'Polis Jalur Ekspres')}</p>
          <p className="font-black text-base tracking-tight uppercase">{docSummary.policyNumber}</p>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-1">
          <div className="space-y-1.5">
             <p className="text-[0.5rem] font-black uppercase text-gray-400 ml-1">{t('Pre-Validated Data', 'Data Terverifikasi')}</p>
             <div className="grid gap-1.5">
               {docSummary.keyPoints.map((point, i) => (
                 <div key={i} className="flex gap-2 p-2.5 bg-white dark:bg-white/5 border border-black/5 rounded-xl text-[0.6rem] font-medium items-start">
                   <div className="w-3 h-3 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0 mt-0.5">
                     <CheckCircle2 size={8}/>
                   </div>
                   {point}
                 </div>
               ))}
             </div>
          </div>
          <div className="p-3 bg-gray-100 dark:bg-white/5 rounded-xl space-y-1 border border-black/5">
            <p className="text-[0.45rem] font-black uppercase text-gray-400">{t('Submission Risk Level', 'Tingkat Risiko Pengajuan')}</p>
            <p className="text-[0.6rem] italic font-bold leading-snug">{docSummary.riskAssessment}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button onClick={() => setStep('docUpload')} className="py-3 bg-white dark:bg-white/5 border border-black/5 rounded-xl font-black uppercase text-[0.5rem] tracking-widest">{t('Rescan Docs', 'Scan Ulang')}</button>
          <button onClick={() => setStep('reporting')} className="py-3 bg-primary-500 text-white rounded-xl font-black uppercase text-[0.5rem] tracking-widest shadow-lg">{t('Confirm Submission', 'Konfirmasi Kirim')}</button>
        </div>
      </div>
    );
  }

  if (step === 'reporting') {
    return (
      <div className="animate-fade-in flex flex-col h-full">
        <Header title={t("Express Incident Report", "Laporan Kejadian Kilat")} showBack onBack={() => setStep('result')} />
        <form onSubmit={handleFinalReport} className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[0.45rem] font-black uppercase tracking-widest text-gray-400 ml-1">{t('Date (Event)', 'Tanggal (Kejadian)')}</label>
              <div className="relative">
                <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary-500 pointer-events-none" />
                <input 
                  type="date" required 
                  min={dateLimits.min} max={dateLimits.max}
                  className="w-full pl-8 pr-2 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-black/5 text-[0.65rem] outline-none focus:border-primary-500 font-bold" 
                  value={reportForm.date}
                  onChange={(e) => setReportForm({...reportForm, date: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[0.45rem] font-black uppercase tracking-widest text-gray-400 ml-1">{t('Time', 'Waktu')}</label>
              <div className="relative">
                <Clock size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary-500 pointer-events-none" />
                <input 
                  type="time" required 
                  className="w-full pl-8 pr-2 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-black/5 text-[0.65rem] outline-none focus:border-primary-500 font-bold" 
                  value={reportForm.time}
                  onChange={(e) => setReportForm({...reportForm, time: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[0.45rem] font-black uppercase tracking-widest text-gray-400 ml-1">{t('Incident Location', 'Lokasi TKP')}</label>
            <div className="relative">
              <MapPin size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary-500" />
              <input 
                type="text" required placeholder={t("Detailed address...", "Alamat detail...")}
                className="w-full pl-8 pr-2 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-black/5 text-[0.65rem] outline-none focus:border-primary-500 font-bold" 
                value={reportForm.location}
                onChange={(e) => setReportForm({...reportForm, location: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[0.45rem] font-black uppercase tracking-widest text-gray-400 ml-1">{t('Brief Chronology', 'Kronologi Singkat')}</label>
            <textarea 
              required rows={3} placeholder={t("Describe the incident in detail...", "Apa yang terjadi secara detail?")}
              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-black/5 text-[0.6rem] outline-none focus:border-primary-500 resize-none font-medium leading-tight shadow-inner" 
              value={reportForm.chronology}
              onChange={(e) => setReportForm({...reportForm, chronology: e.target.value})}
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 p-4 bg-white dark:bg-white/5 border border-black/5 rounded-2xl cursor-pointer hover:border-primary-500/30 transition-all">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${reportForm.thirdPartyInvolved ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                <Users size={20}/>
              </div>
              <div className="flex-1">
                <p className="text-[0.65rem] font-black uppercase tracking-widest">{t('Third Party Involved?', 'Pihak Ketiga Terlibat?')}</p>
                <p className="text-[0.45rem] font-bold text-gray-400 uppercase">{t('Is anyone else involved?', 'Apakah ada orang lain yang terlibat?')}</p>
              </div>
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${reportForm.thirdPartyInvolved ? 'bg-primary-500 border-primary-500' : 'border-gray-200'}`}>
                {reportForm.thirdPartyInvolved && <Check size={14} className="text-white" strokeWidth={4}/>}
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

        <button 
          onClick={handleFinalReport} disabled={isSubmitting}
          className="mt-2 w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-[0.55rem] tracking-[0.2em] shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={14}/> : <Rocket size={14}/>}
          {t('Send Express Claim', 'Kirim Klaim Kilat')}
        </button>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="text-center space-y-4 py-4 animate-pop-in flex flex-col h-full justify-center">
        <div className="w-20 h-20 bg-emerald-500 rounded-full mx-auto flex items-center justify-center text-white shadow-2xl shadow-emerald-500/30">
          <CheckCircle2 size={40} strokeWidth={3} />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-black uppercase tracking-tighter">{t('Claim', 'Klaim')} <span className="text-primary-500">{t('Submitted', 'Tersubmit')}</span></h3>
          <p className="text-[0.55rem] text-gray-500 dark:text-gray-400 px-4 leading-relaxed font-bold uppercase tracking-widest">
            {t('Neural OS acceleration active. Your files have been validated and sent directly to the insurer. Status will update in', 'Akselerasi Neural OS aktif. Berkas Anda telah divalidasi dan dikirim langsung ke tim asuransi. Status akan diperbarui dalam')} <span className="text-primary-500">60 {t('minutes', 'menit')}</span>.
          </p>
        </div>
        <div className="p-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-black/5 text-left">
          <p className="text-[0.4rem] font-black text-gray-400 uppercase tracking-widest mb-0.5">Rapid Reference Hash</p>
          <p className="text-[0.55rem] font-mono text-primary-500 break-all leading-tight">SP-SPD-{Date.now().toString().slice(-8)}</p>
        </div>
        <button onClick={onComplete} className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase text-[0.5rem] tracking-widest shadow-xl transition-all active:scale-95">{t('Done', 'Selesai')}</button>
      </div>
    );
  }

  return null;
};

const BadgeCheck = ({ className, size }: { className?: string, size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);

const Wrench = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
);

const Check = ({ size, className, strokeWidth }: { size: number, className?: string, strokeWidth?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth || 2} strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>
);

export default ClaimManager;
