import React from 'react';
import {
  FileText, FileSearch, Trash2, Camera, Loader2, AlertTriangle, Check,
  RefreshCw, ShieldCheck, Activity, ShieldX, Sparkles,
  FileSearch as ManualAuditIcon, Video, Car, CalendarClock, CheckCircle2, ImagePlus
} from 'lucide-react';
import { ScannerOverlay, SmartProcessingView } from './WizardUI';
import { validateVehiclePhoto, analyzeVehicleSurvey, extractStnkData } from '../../services/geminiService';

interface StepSurveyProps {
  survey: any;
  setSurvey: (s: any) => void;
  stnkResult: any;
  setStnkResult: (r: any) => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
  loadingType: 'KTP' | 'STNK' | 'SURVEY' | null;
  setLoadingType: (t: 'KTP' | 'STNK' | 'SURVEY' | null) => void;
  photoValidation: Record<string, { status: 'LOADING' | 'VALID' | 'INVALID', msg?: string }>;
  setPhotoValidation: React.Dispatch<React.SetStateAction<Record<string, { status: 'LOADING' | 'VALID' | 'INVALID', msg?: string }>>>;
  vehicle: any;
}

const StepSurvey: React.FC<StepSurveyProps> = ({
  survey, setSurvey, stnkResult, setStnkResult, loading, setLoading, loadingType, setLoadingType,
  photoValidation, setPhotoValidation, vehicle
}) => {

  const [stnkError, setStnkError] = React.useState<string | null>(null);
  const [surveyActionError, setSurveyActionError] = React.useState<string | null>(null);
  const [analyzing, setAnalyzing] = React.useState(false);

  const handleStnkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStnkError(null);
    setLoading(true);
    setLoadingType('STNK');
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const mimeType = base64.split(';')[0].split(':')[1] || 'image/jpeg';
      try {
        const response = await extractStnkData(base64, mimeType);
        if (response.success && response.data) {
          setSurvey((prev: any) => ({ ...prev, stnk: base64 }));
          setStnkResult({
            ownerName: response.data.owner || 'TIDAK TERDETEKSI',
            plate: response.data.plate || 'TIDAK TERDETEKSI',
            vin: response.data.vin || 'TIDAK TERDETEKSI',
            engine: response.data.engine || 'TIDAK TERDETEKSI',
            color: response.data.color || 'TIDAK TERDETEKSI',
            year: response.data.year || vehicle.year.toString(),
            status: response.data.status
          });
        } else {
          setStnkError('Gagal membaca STNK. Pastikan foto jelas dan tidak terpotong, lalu coba lagi.');
        }
      } finally {
        setLoading(false);
        setLoadingType(null);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = async (file: File, slotId: string, slotLabel: string) => {
    if (!file) return;
    setSurveyActionError(null);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      
      // Optimistic update
      setSurvey((prev: any) => ({ ...prev, photos: { ...prev.photos, [slotId]: base64 } }));
      
      if (file.size > 10 * 1024 * 1024) {
         setPhotoValidation(prev => ({ 
             ...prev, 
             [slotId]: { status: 'INVALID', msg: 'Ukuran file terlalu besar (Maks 10MB)' } 
         }));
         return;
      }

      const img = new Image();
      img.src = base64;
      img.onload = async () => {
          if (img.width < 600 || img.height < 400) {
             setPhotoValidation(prev => ({ 
                 ...prev, 
                 [slotId]: { status: 'INVALID', msg: 'Kualitas foto terlalu rendah' } 
             }));
             return;
          }

          setPhotoValidation(prev => ({ ...prev, [slotId]: { status: 'LOADING' } }));

          try {
            const result = await validateVehiclePhoto(base64, slotLabel);
            setPhotoValidation(prev => ({ 
              ...prev, 
              [slotId]: { 
                status: result.valid ? 'VALID' : 'INVALID',
                msg: result.issue
              } 
            }));
          } catch (e) {
            // A failed AI check is not evidence that the photo is valid.
            setPhotoValidation(prev => ({
              ...prev,
              [slotId]: { status: 'INVALID', msg: 'Validasi AI gagal. Coba unggah ulang atau periksa koneksi.' }
            }));
          }
      };
    };
    reader.readAsDataURL(file);
  };

  const runSurveyAI = async () => {
    setSurveyActionError(null);
    const images = Object.entries(survey.photos).map(([slotId, data]) => ({ slotId, data: data as string }));
    if (images.length < 3) {
      setSurveyActionError('Unggah minimal 3 foto mobil sebelum memulai analisis.');
      return;
    }
    const unverified = images.filter(({ slotId }) => photoValidation[slotId]?.status !== 'VALID');
    if (unverified.length > 0) {
      setSurveyActionError('Analisis belum bisa dimulai. Tunggu validasi selesai dan unggah ulang foto yang gagal atau belum tervalidasi.');
      return;
    }
    setAnalyzing(true);
    setLoading(true);
    setLoadingType('SURVEY');

    const photoEntries = images.map(({ slotId, data }) => ({ id: slotId, data }));

    const expectedData = {
      brand: vehicle.brand,
      model: vehicle.model,
      color: stnkResult?.color || "N/A",
      plate: vehicle.plate
    };

    let response: any;
    try {
      response = await analyzeVehicleSurvey(photoEntries, expectedData);
    } catch {
      response = { success: false };
    }

    setLoading(false);
    setLoadingType(null);
    setAnalyzing(false);

    if (response.success) {
      const finalScore = response.score || 0;
      const isRejected = response.auditVerdict === 'REJECTED';
      const needsManual = (finalScore < 80 || response.auditVerdict === 'REVIEW_REQUIRED') && !isRejected;

      setSurvey((prev: any) => ({
        ...prev,
        score: finalScore,
        summary: response.summary || '',
        underwritingReport: response.underwritingReport || '',
        detailedIssues: response.detailedIssues || [],
        photoFlags: response.photoFlags || [],
        verdict: isRejected ? 'REJECTED' : (needsManual ? 'MANUAL_REQUIRED' : 'CLEAN'),
        rejectionReason: response.rejectionReason || (isRejected ? 'Mobil tidak sesuai dengan data STNK.' : ''),
        manualVerif: needsManual,
        identityMatchScore: response.identityMatchScore,
        bodyConditionScore: response.bodyConditionScore,
        paintConditionScore: response.paintConditionScore,
        glassConditionScore: response.glassConditionScore,
        interiorConditionScore: response.interiorConditionScore,
        fraudRiskScore: response.fraudRiskScore,
        fraudAnalysis: response.fraudAnalysis,
        recommendations: response.recommendations || [],
      }));
    } else {
      setSurvey((prev: any) => ({
        ...prev,
        score: 0,
        verdict: 'MANUAL_REQUIRED',
        underwritingReport: 'AI tidak tersedia — lanjutkan dengan verifikasi manual.',
        manualVerif: true,
      }));
    }
  };

  const submitManualRequest = () => {
    if (!survey.manualDate) {
        console.warn("Pilih tanggal survei");
        return;
    }
    setSurvey((prev: any) => ({ ...prev, manualRequestStatus: 'REQUESTED' }));
  };

  const photoSlots = [
    { id: 'front', label: 'Depan Serong', desc: 'Sisi depan mobil' },
    { id: 'back', label: 'Belakang Serong', desc: 'Sisi belakang mobil' },
    { id: 'right', label: 'Sisi Kanan', desc: 'Samping kanan' },
    { id: 'left', label: 'Sisi Kiri', desc: 'Samping kiri' },
    { id: 'interior', label: 'Dashboard', desc: 'Bagian dalam mobil' }
  ];
  const capturedCount = Object.keys(survey.photos).length;
  
  const verdictData: any = {
    'CLEAN': { icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'LOLOS CEK AI', desc: 'Kondisi mobil baik sesuai standar. Polis bisa langsung aktif.' },
    'REVIEW_REQUIRED': { icon: Activity, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'BUTUH TINJAUAN', desc: 'Ada sedikit catatan. Tim kami akan mengecek secara manual.' },
    'MANUAL_REQUIRED': { icon: ManualAuditIcon, color: 'text-amber-600', bg: 'bg-amber-600/10', label: 'SURVEI MANUAL', desc: 'Skor di bawah 80. Perlu survei fisik atau lewat video call.' },
    'REJECTED': { icon: ShieldX, color: 'text-rose-500', bg: 'bg-rose-500/10', label: 'DITOLAK', desc: 'Data mobil tidak cocok atau ada kerusakan yang cukup berat.' },
  };

  return (
    <div className="space-y-8 animate-fade-in pb-24">
      {!survey.stnk ? (
          <div className="p-6 bg-white dark:bg-white/[0.03] border-2 border-black/5 dark:border-white/5 rounded-[2.5rem] space-y-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-4 mb-2">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 shadow-inner"><FileText size={20}/></div>
                  <div>
                      <div className="flex items-center gap-2">
                          <h4 className="text-[0.7rem] font-black uppercase tracking-[0.2em]">Foto STNK</h4>
                          <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[0.45rem] font-black uppercase tracking-widest rounded-full">WAJIB</span>
                      </div>
                      <p className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">Biar data mobil terisi otomatis</p>
                  </div>
              </div>
              {stnkError && (
                <div className="px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-2">
                  <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                  <p className="text-[0.6rem] font-bold text-rose-500">{stnkError}</p>
                </div>
              )}
              <label className="group relative aspect-[3/1] rounded-[2rem] border-2 border-dashed border-gray-300 dark:border-white/10 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-500/50 transition-all bg-gray-50 dark:bg-white/[0.02]">
                  {loading && loadingType === 'STNK' ? <ScannerOverlay label="Membaca STNK..." /> : (
                  <>
                      <div className="flex gap-3">
                        <FileSearch size={32} className="text-gray-300 group-hover:text-emerald-500 transition-colors"/>
                        <ImagePlus size={32} className="text-gray-300 group-hover:text-emerald-500 transition-colors"/>
                      </div>
                      <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-gray-500">Scan / Unggah STNK</p>
                      <input type="file" accept="image/*" className="hidden" onChange={handleStnkUpload} />
                  </>
                  )}
              </label>
          </div>
      ) : (
          <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 rounded-lg text-white"><Check size={14} strokeWidth={3}/></div>
                  <span className="text-[0.6rem] font-black text-emerald-800 dark:text-emerald-200 uppercase tracking-widest">STNK Terbaca: {stnkResult.plate}</span>
              </div>
              <button onClick={() => setSurvey({...survey, stnk: null})} className="text-gray-400 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
          </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
           <div className="flex items-center gap-3">
              <Camera size={16} className="text-emerald-500"/>
              <h4 className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-gray-500">Foto Kondisi Mobil</h4>
           </div>
           <div className="px-3 py-1 bg-emerald-500/10 rounded-full text-[0.5rem] font-black text-emerald-500 uppercase">{capturedCount}/5 Selesai</div>
        </div>
        
        <p className="text-[0.55rem] font-bold text-gray-400 px-2 -mt-1">
          Foto dari 5 sudut: Depan Serong, Belakang Serong, Sisi Kanan, Sisi Kiri, dan Dashboard
        </p>

        <div className="grid grid-cols-2 gap-3">
           {photoSlots.map((slot, slotIndex) => {
              const validation = photoValidation[slot.id];
              const isLoading = validation?.status === 'LOADING';
              const isInvalid = validation?.status === 'INVALID';
              const isValid = validation?.status === 'VALID';
              const isLastSlot = slotIndex === photoSlots.length - 1;

              return (
              <div key={slot.id} className={`group relative rounded-[2rem] border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 text-center gap-2 overflow-hidden shadow-sm ${isLastSlot ? 'col-span-2 aspect-[3/1]' : 'aspect-video'} ${survey.photos[slot.id] ? (isInvalid ? 'border-rose-500 bg-rose-500/[0.03]' : 'border-emerald-500 bg-emerald-500/[0.03] border-solid') : 'border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.03]'}`}>
                 {survey.photos[slot.id] ? (
                   <>
                      <img loading="lazy" src={survey.photos[slot.id]} className="absolute inset-0 w-full h-full object-cover rounded-[1.8rem]" alt={slot.label} />

                      {/* Loading & Status Overlay */}
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-black/50 backdrop-blur-[4px] transition-all duration-300 z-20" style={{ opacity: isLoading || isInvalid ? 1 : 0 }}>
                         {isLoading && (
                            <div className="flex flex-col items-center gap-3 animate-fade-in w-full px-4">
                               <div className="relative">
                                  <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full"></div>
                                  <Loader2 size={32} className="text-emerald-500 animate-spin relative z-10"/>
                               </div>
                               <div className="space-y-2 text-center w-full">
                                  <span className="text-[0.5rem] font-black text-white uppercase tracking-widest drop-shadow-md">Mengecek...</span>
                               </div>
                            </div>
                         )}
                         {isInvalid && (
                            <div className="flex flex-col items-center gap-2 p-3 bg-rose-500/90 rounded-2xl max-w-[90%] border border-white/10 shadow-xl animate-pop-in">
                               <AlertTriangle size={20} className="text-white"/>
                               <span className="text-[0.45rem] font-black text-white uppercase tracking-widest leading-tight">{validation.msg || 'Foto Kurang Jelas'}</span>
                            </div>
                         )}
                      </div>

                      {isValid && !isLoading && <div className="absolute top-3 right-3 bg-emerald-500 text-white p-1 rounded-full shadow-lg animate-pop-in z-20"><Check size={12} strokeWidth={4}/></div>}

                      <button onClick={() => { const newPhotos = {...survey.photos}; delete newPhotos[slot.id]; setSurvey({...survey, photos: newPhotos, score: 0, verdict: ''}); setPhotoValidation(prev => { const n = {...prev}; delete n[slot.id]; return n; }); }} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white rounded-[1.8rem] backdrop-blur-[2px] cursor-pointer pointer-events-auto z-30"><Trash2 size={24}/></button>

                      <div className="absolute top-3 left-3 px-2 py-0.5 bg-black/60 text-white rounded text-[0.45rem] font-black uppercase tracking-widest z-20">{slot.label}</div>
                   </>
                 ) : (
                   <>
                      <div className="flex gap-2">
                        <Camera size={20} className="text-gray-300 group-hover:text-emerald-500 transition-colors"/>
                        <ImagePlus size={20} className="text-gray-300 group-hover:text-emerald-500 transition-colors"/>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[0.6rem] font-black uppercase text-gray-500">{slot.label}</p>
                        <p className="text-[0.45rem] font-bold uppercase text-gray-400 opacity-60">Foto / Galeri</p>
                      </div>
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => { const file = e.target.files?.[0]; if (file) handlePhotoUpload(file, slot.id, slot.desc); }} />
                   </>
                 )}
              </div>
           )})}
        </div>
      </div>

      {capturedCount >= 3 && (
         <div className="space-y-6 pt-4">
            {loading && loadingType === 'SURVEY' ? (
              <div className="glass-card rounded-[3rem] shadow-2xl relative overflow-hidden bg-white dark:bg-black/20">
                 <SmartProcessingView
                  label="Analisa AI"
                  sublabel="AI SurePath sedang mengecek kecocokan data dan kondisi mobil kamu secara otomatis."
                 />
              </div>
            ) : (survey.score > 0 || survey.verdict === 'REJECTED' || (survey.verdict !== '' && survey.verdict === 'MANUAL_REQUIRED') || survey.verdict === 'REVIEW_REQUIRED') ? (
              <div className="space-y-6 animate-pop-in">
                 <div className={`p-8 rounded-[3rem] border-2 shadow-2xl relative overflow-hidden bg-white dark:bg-[#0a0a0a] ${survey.verdict === 'REJECTED' ? 'border-rose-500/30 shadow-rose-500/5' : survey.verdict === 'MANUAL_REQUIRED' ? 'border-amber-500/30 shadow-amber-500/5' : 'border-emerald-500/30 shadow-emerald-500/5'}`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 mb-8 relative z-10">
                       <div className="flex items-center gap-6">
                          <div className="relative w-24 h-24 flex items-center justify-center">
                             <svg className="w-full h-full transform -rotate-90">
                                <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100 dark:text-gray-800"/>
                                <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={263.8} strokeDashoffset={263.8 - (263.8 * survey.score) / 100} className={`transition-all duration-1000 ${survey.verdict === 'REJECTED' ? 'text-rose-500' : survey.score >= 85 ? 'text-emerald-500 shadow-[0_0_10px_#10b981]' : survey.score >= 80 ? 'text-emerald-400' : 'text-amber-500'}`}/>
                             </svg>
                             <span className={`absolute text-3xl font-black ${survey.verdict === 'REJECTED' ? 'text-rose-500' : ''}`}>{survey.score}</span>
                          </div>
                          <div className="space-y-1">
                             <p className="text-[0.55rem] font-black uppercase text-gray-400 tracking-[0.2em]">Skor Kondisi Mobil</p>
                             <h4 className={`text-2xl font-black uppercase tracking-tighter ${verdictData[survey.verdict]?.color}`}>{verdictData[survey.verdict]?.label}</h4>
                             <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${survey.verdict === 'CLEAN' ? 'bg-emerald-500' : survey.verdict === 'REJECTED' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                                <span className="text-[0.5rem] font-bold text-gray-400 uppercase tracking-widest">{survey.verdict === 'CLEAN' ? 'Lolos Otomatis' : survey.verdict === 'REJECTED' ? 'Data Tidak Cocok' : 'Perlu Tindakan'}</span>
                              </div>
                          </div>
                       </div>
                    </div>
                    
                    {/* Per-category score bars */}
                    {(survey.bodyConditionScore !== undefined) && (
                      <div className="space-y-3 relative z-10">
                        <p className="text-[0.5rem] font-black uppercase text-gray-400 tracking-widest px-1">Skor Per Kategori</p>
                        {[
                          { label: 'Identitas Kendaraan', key: 'identityMatchScore', color: 'bg-blue-500' },
                          { label: 'Kondisi Bodi', key: 'bodyConditionScore', color: 'bg-emerald-500' },
                          { label: 'Kondisi Cat', key: 'paintConditionScore', color: 'bg-teal-500' },
                          { label: 'Kondisi Kaca', key: 'glassConditionScore', color: 'bg-sky-500' },
                          { label: 'Interior / Dashboard', key: 'interiorConditionScore', color: 'bg-violet-500' },
                        ].map(({ label, key, color }) => {
                          const val: number = survey[key] ?? 0;
                          return (
                            <div key={key} className="space-y-1">
                              <div className="flex justify-between items-center px-1">
                                <span className="text-[0.55rem] font-bold text-gray-500 dark:text-gray-400">{label}</span>
                                <span className={`text-[0.55rem] font-black ${val >= 80 ? 'text-emerald-500' : val >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>{val}</span>
                              </div>
                              <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${val}%` }} />
                              </div>
                            </div>
                          );
                        })}
                        {/* Fraud Risk */}
                        {survey.fraudRiskScore !== undefined && (
                          <div className="space-y-1 pt-1 border-t border-black/5 dark:border-white/5">
                            <div className="flex justify-between items-center px-1">
                              <span className="text-[0.55rem] font-bold text-gray-500 dark:text-gray-400">Risiko Fraud</span>
                              <span className={`text-[0.55rem] font-black ${survey.fraudRiskScore <= 20 ? 'text-emerald-500' : survey.fraudRiskScore <= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                                {survey.fraudRiskScore <= 20 ? 'Rendah' : survey.fraudRiskScore <= 50 ? 'Sedang' : 'Tinggi'} ({survey.fraudRiskScore})
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ${survey.fraudRiskScore <= 20 ? 'bg-emerald-500' : survey.fraudRiskScore <= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${survey.fraudRiskScore}%` }} />
                            </div>
                            {survey.fraudAnalysis && (
                              <p className="text-[0.55rem] font-medium text-gray-500 dark:text-gray-400 px-1 leading-relaxed">{survey.fraudAnalysis}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-6 bg-gray-50 dark:bg-white/[0.02] rounded-[2rem] border border-black/5 dark:border-white/5 relative z-10 space-y-4">
                       <div className="flex items-center gap-3">
                          <FileText size={14} className="text-emerald-500"/>
                          <span className="text-[0.55rem] font-black uppercase text-emerald-500 tracking-widest">Laporan Hasil Surveyor AI</span>
                       </div>
                       <p className="text-[0.65rem] font-bold text-gray-600 dark:text-gray-300 leading-relaxed">
                          {survey.underwritingReport || "Laporan kondisi mobil berdasarkan foto yang diunggah."}
                       </p>

                       {survey.rejectionReason && survey.verdict === 'REJECTED' && (
                          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                             <p className="text-[0.5rem] font-black uppercase text-rose-500 tracking-widest mb-1">Penyebab Ditolak</p>
                             <p className="text-[0.65rem] font-bold text-rose-600 dark:text-rose-400">{survey.rejectionReason}</p>
                          </div>
                       )}

                       {survey.detailedIssues && survey.detailedIssues.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
                             <p className="text-[0.5rem] font-black uppercase text-gray-400 tracking-widest">Catatan Kekurangan</p>
                             {survey.detailedIssues.map((issue: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-start text-[0.6rem] bg-white dark:bg-black/20 p-2 rounded-lg border border-black/5">
                                   <span className="font-bold text-gray-700 dark:text-gray-200">{issue.part}: {issue.description}</span>
                                   <span className={`${issue.severity === 'Severe' ? 'text-rose-500' : 'text-amber-500'} font-black uppercase text-[0.5rem] ml-2 shrink-0`}>{issue.severity}</span>
                                </div>
                             ))}
                          </div>
                       )}

                       {survey.recommendations && survey.recommendations.length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-black/5 dark:border-white/5">
                             <p className="text-[0.5rem] font-black uppercase text-gray-400 tracking-widest">Rekomendasi</p>
                             {survey.recommendations.map((rec: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-2 text-[0.6rem]">
                                   <span className="text-emerald-500 font-black mt-0.5">→</span>
                                   <span className="font-medium text-gray-600 dark:text-gray-300">{rec}</span>
                                </div>
                             ))}
                          </div>
                       )}
                    </div>
                 </div>

                 {/* AI can't score notification */}
                 {survey.verdict === 'MANUAL_REQUIRED' && survey.score === 0 && (
                    <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-[2.5rem] border border-amber-200 dark:border-amber-800/40 space-y-4">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0"><AlertTriangle size={20}/></div>
                          <div>
                             <h4 className="text-sm font-black uppercase text-amber-700 dark:text-amber-400 tracking-wide">Perlu Pemeriksaan Manual</h4>
                             <p className="text-[0.55rem] font-bold text-amber-600/70 dark:text-amber-400/70 uppercase tracking-widest">Analisa AI tidak dapat memberikan skor</p>
                          </div>
                       </div>
                       <p className="text-[0.65rem] text-gray-700 dark:text-amber-100/70 font-medium leading-relaxed">
                          Analisa AI tidak dapat memberikan skor saat ini. Pesanan kamu akan ditinjau manual oleh tim/pihak asuransi. Polis belum tentu langsung disetujui. Silakan pantau status melalui email atau aplikasi.
                       </p>
                       <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-300/50 dark:border-amber-700/30">
                          <p className="text-[0.6rem] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">Langkah Selanjutnya</p>
                          <p className="text-[0.6rem] text-amber-700/80 dark:text-amber-300/70 font-medium leading-relaxed">
                             Kamu tetap bisa lanjut ke langkah berikutnya, tetapi halaman pembayaran baru terbuka setelah foto disetujui oleh admin atau pihak asuransi.
                          </p>
                       </div>
                    </div>
                 )}

                 {survey.verdict === 'MANUAL_REQUIRED' && survey.score > 0 && survey.manualRequestStatus === 'NONE' && (
                    <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-[2.5rem] border border-amber-200 dark:border-amber-900/30 space-y-6">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg"><ManualAuditIcon size={20}/></div>
                          <div>
                             <h4 className="text-sm font-black uppercase text-amber-700 dark:text-amber-400 tracking-wide">Butuh Survei Manual</h4>
                             <p className="text-[0.55rem] font-bold text-gray-500 uppercase tracking-widest">Skor di bawah batas minimal 80</p>
                          </div>
                       </div>
                       <p className="text-[0.65rem] text-gray-600 dark:text-gray-300 font-medium">
                          Berdasarkan analisa AI, mobil kamu memerlukan pengecekan tambahan oleh tim kami. Silakan pilih jadwal survei.
                       </p>
                       
                       <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => setSurvey({...survey, manualType: 'VIDEO'})} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${survey.manualType === 'VIDEO' ? 'border-amber-500 bg-amber-500/10 text-amber-600' : 'border-black/5 text-gray-400'}`}>
                             <Video size={20}/>
                             <span className="text-[0.55rem] font-black uppercase tracking-widest">Video Call</span>
                          </button>
                          <button onClick={() => setSurvey({...survey, manualType: 'PHYSICAL'})} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${survey.manualType === 'PHYSICAL' ? 'border-amber-500 bg-amber-500/10 text-amber-600' : 'border-black/5 text-gray-400'}`}>
                             <Car size={20}/>
                             <span className="text-[0.55rem] font-black uppercase tracking-widest">Kunjungan</span>
                          </button>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[0.55rem] font-black uppercase text-gray-500 tracking-widest">Pilih Tanggal & Waktu</label>
                          <div className="relative">
                             <CalendarClock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                             <input 
                                type="datetime-local" 
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-white/5 border border-black/10 rounded-xl text-xs font-bold outline-none focus:border-amber-500"
                                onChange={(e) => setSurvey({...survey, manualDate: e.target.value})}
                             />
                          </div>
                       </div>

                       <button onClick={submitManualRequest} className="w-full py-4 bg-amber-500 text-white rounded-xl font-black uppercase text-[0.65rem] tracking-[0.2em] shadow-lg active:scale-95 transition-all">
                          Konfirmasi Jadwal Survei
                       </button>
                    </div>
                 )}

                 {survey.manualRequestStatus === 'REQUESTED' && (
                    <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-[2.5rem] border border-emerald-200 dark:border-emerald-900/30 text-center space-y-4">
                       <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto shadow-lg shadow-emerald-500/20">
                          <CheckCircle2 size={32}/>
                       </div>
                       <div>
                          <h4 className="text-lg font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-tight">Jadwal Berhasil Dibuat</h4>
                          <p className="text-[0.6rem] font-bold text-gray-500 uppercase tracking-widest mt-1">Petugas akan menghubungi Anda ({survey.manualType})</p>
                       </div>
                       <p className="text-[0.65rem] text-gray-600 font-medium">
                          Anda bisa lanjut ke tahap pembayaran. Polis akan aktif setelah survei selesai dilakukan.
                       </p>
                    </div>
                 )}

                 {(survey.manualRequestStatus === 'NONE' || survey.verdict === 'REJECTED') && (
                    <div className="flex flex-col items-center gap-4 pt-2">
                      <button 
                         onClick={() => { setSurvey({...survey, score: 0, verdict: '', detailedIssues: [], photoFlags: [], underwritingReport: '', rejectionReason: ''}); }}
                         className="px-8 py-3 bg-gray-100 dark:bg-white/5 rounded-full text-[0.6rem] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest hover:text-emerald-500 hover:bg-emerald-500/5 transition-all flex items-center gap-3 active:scale-95 shadow-sm border border-black/5"
                      >
                         <RefreshCw size={14} className="animate-spin-slow"/> Cek Ulang Kondisi Mobil
                      </button>
                      
                      {survey.verdict === 'REJECTED' && (
                         <p className="text-[0.55rem] font-bold text-rose-500 uppercase tracking-widest text-center px-6">Mohon perbaiki data mobil atau ganti foto jika ada kesalahan sebelum cek ulang.</p>
                      )}
                    </div>
                 )}
              </div>
            ) : (
              {surveyActionError && (
                <div role="alert" className="mb-3 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-2">
                  <AlertTriangle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{surveyActionError}</p>
                </div>
              )}
              <button
                onClick={runSurveyAI}
                disabled={analyzing}
                className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {analyzing ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> Menganalisa...</>
                ) : (
                  <><Sparkles size={16} /> Analisa Kendaraan AI</>
                )}
              </button>
            )}
         </div>
      )}
    </div>
  );
};

export default StepSurvey;