import React, { useState, useMemo } from 'react';
import { Database, Edit3, ChevronDown, CheckCircle2, FileDown, Loader2 } from 'lucide-react';
import { VEHICLE_BRANDS, getModelsForBrand, getMarketValueForYear } from '../../services/vehicleDatabase';
import { extractStnkOcr, type StnkOcrResult } from '../../services/stnkOcr';
import { compressImageBase64 } from '../../services/geminiService';
import { ScannerOverlay, formatIDR } from './WizardUI';
import { StnkCaptureCard, StnkOcrNotice } from '../shared/StnkScanCard';
import { REGEX } from '../../services/authService';

interface StepVehicleProps {
  vehicle: any;
  setVehicle: (v: any) => void;
  entryMode: 'DATABASE' | 'MANUAL';
  setEntryMode: (m: 'DATABASE' | 'MANUAL') => void;
  handlePlateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  formatInputCurrency: (val: string) => string;
  loading: boolean;
  setLoading: (l: boolean) => void;
  loadingType: 'KTP' | 'STNK' | 'SURVEY' | null;
  setLoadingType: (t: 'KTP' | 'STNK' | 'SURVEY' | null) => void;
  setStnkResult?: (res: any) => void; 
}

const StepVehicle: React.FC<StepVehicleProps> = ({ 
  vehicle, setVehicle, entryMode, setEntryMode, handlePlateChange, formatInputCurrency,
  loading, setLoading, loadingType, setLoadingType, setStnkResult
}) => {
  const [extractedStnk, setExtractedStnk] = useState<any>(null);
  const [stnkOcrResult, setStnkOcrResult] = useState<StnkOcrResult | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [stnkBase64, setStnkBase64] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const isVinValid = useMemo(() => REGEX.VIN.test(vehicle.vin), [vehicle.vin]);
  const isPlateValid = useMemo(() => REGEX.PLATE.test(vehicle.plate), [vehicle.plate]);

  const availableModels = useMemo(
    () => getModelsForBrand(vehicle.brand),
    [vehicle.brand]
  );

  const marketPriceEntry = useMemo(() => {
    if (entryMode !== 'DATABASE' || !vehicle.brand || !vehicle.model) return null;
    const base = getMarketValueForYear(vehicle.brand, vehicle.model, vehicle.year);
    if (!base) return null;
    return { min: Math.round(base * 0.95), max: Math.round(base * 1.05) };
  }, [entryMode, vehicle.brand, vehicle.model, vehicle.year]);

  const generateStnkPdf = async () => {
    if (!stnkBase64 || !extractedStnk) return;
    setIsGeneratingPdf(true);
    try {
      const doc = new (await import('jspdf')).jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const date = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      
      // --- Watermark ---
      doc.setTextColor(240, 240, 240);
      doc.setFontSize(80);
      doc.setFont('helvetica', 'bold');
      doc.text("SUREPATH", pageWidth / 2, pageHeight / 2 + 20, { align: 'center', angle: 45 });

      // --- Header ---
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      // Accent line
      doc.setFillColor(0, 193, 106); 
      doc.rect(0, 45, pageWidth, 2, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text("SUREPATH", 20, 22);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("VEHICLE VERIFICATION", 20, 32);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text("HASIL VERIFIKASI STNK", pageWidth - 20, 22, { align: 'right' });
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(`Waktu: ${date}`, pageWidth - 20, 32, { align: 'right' });

      let currentY = 60;

      // --- Helper for Section Titles ---
      const addSectionTitle = (title: string, y: number) => {
        doc.setFillColor(0, 193, 106); 
        doc.roundedRect(20, y - 4, 4, 14, 1, 1, 'F');
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 28, y + 6);
        return y + 20;
      };

      // --- Section: Data Kendaraan ---
      currentY = addSectionTitle("DATA KENDARAAN TERDETEKSI", currentY);
      
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(20, currentY, pageWidth - 40, 80, 3, 3, 'FD');

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFont('helvetica', 'normal');
      
      doc.text("Nama Pemilik", 25, currentY + 10);
      doc.text("Nomor Polisi", 25, currentY + 20);
      doc.text("Merk / Tipe", 25, currentY + 30);
      doc.text("Tahun", 25, currentY + 40);
      doc.text("No. Rangka (VIN)", 25, currentY + 50);
      doc.text("No. Mesin", 25, currentY + 60);
      doc.text("Warna", 25, currentY + 70);
      
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      doc.text(extractedStnk.ownerName || '-', 80, currentY + 10);
      doc.text(extractedStnk.plate || '-', 80, currentY + 20);
      doc.text(`${extractedStnk.brand} ${extractedStnk.model}` || '-', 80, currentY + 30);
      doc.text(extractedStnk.year?.toString() || '-', 80, currentY + 40);
      doc.text(extractedStnk.vin || '-', 80, currentY + 50);
      doc.text(extractedStnk.engine || '-', 80, currentY + 60);
      doc.text(extractedStnk.color || '-', 80, currentY + 70);

      currentY += 95;

      // --- Section: Lampiran Dokumen ---
      currentY = addSectionTitle("LAMPIRAN DOKUMEN ASLI", currentY);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(20, currentY, pageWidth - 40, 95, 3, 3, 'FD');

      try {
        doc.addImage(stnkBase64, 'JPEG', 25, currentY + 5, pageWidth - 50, 85);
      } catch (e) {
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'italic');
        doc.text("[Gambar STNK tidak dapat dimuat]", pageWidth / 2, currentY + 45, { align: 'center' });
      }

      // --- Footer ---
      doc.setFillColor(248, 250, 252);
      doc.rect(0, pageHeight - 30, pageWidth, 30, 'F');
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text("Dokumen ini diterbitkan secara otomatis oleh sistem SurePath dan sah tanpa tanda tangan basah.", pageWidth / 2, pageHeight - 18, { align: 'center' });
      doc.text(`Timestamp: ${new Date().toISOString()}`, pageWidth / 2, pageHeight - 12, { align: 'center' });

      doc.save(`STNK_SurePath_${extractedStnk.plate.replace(' ', '_')}.pdf`);
    } catch (err) {
      console.error(err);
      console.warn("Gagal membuat PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleStnkAutofill = async (file: File) => {
    const mimeType = file.type;
    setLoading(true);
    setLoadingType('STNK');
    setExtractedStnk(null);
    setStnkOcrResult(null);
    setShowManualForm(false);

    const reader = new FileReader();
    reader.onload = async () => {
        const base64 = reader.result as string;

        // Keep only a downscaled copy in component state. This is read back
        // solely by generateStnkPdf, and holding the raw multi-megabyte camera
        // capture for the rest of the wizard is memory the Android WebView does
        // not have to spare.
        compressImageBase64(base64, 1600).then(setStnkBase64, () => setStnkBase64(base64));

        // Use the new structured STNK OCR service. Falls back to the legacy
        // Gemini path automatically if the new edge function isn't deployed.
        const result = await extractStnkOcr(base64, mimeType);
        setLoading(false);
        setLoadingType(null);

        setStnkOcrResult(result);

        // Build the legacy extractedStnk shape for backward compatibility
        // (generateStnkPdf and the success banner read it).
        const cleanData = {
            ownerName: result.ownerName ?? '',
            plate: result.plate ?? '',
            brand: result.brand ?? '',
            model: result.model ?? '',
            color: result.color ?? '',
            year: result.year ? String(result.year) : '',
            vin: result.vin ?? '',
            engine: result.engineNo ?? '',
            status: result.status === 'OK' ? 'OK' : result.status === 'PARTIAL' ? 'OK' : 'UNCLEAR',
        };

        if (result.ok || result.status === 'PARTIAL') {
            setExtractedStnk(cleanData);
            if (setStnkResult) setStnkResult(cleanData);

            const matchedBrand = result.brand && VEHICLE_BRANDS.includes(result.brand) ? result.brand : '';
            const matchedModel = matchedBrand
              ? (getModelsForBrand(matchedBrand).find(m => result.model && m.toUpperCase() === result.model.toUpperCase()) ?? result.model)
              : result.model;

            const yearInt = result.year ?? new Date().getFullYear();
            const price = matchedBrand && matchedModel ? (getMarketValueForYear(matchedBrand, matchedModel, yearInt) ?? 0) : 0;

            setVehicle((prev: any) => ({
                ...prev,
                brand: matchedBrand || result.brand || prev.brand,
                model: matchedModel || result.model || prev.model,
                year: yearInt || prev.year,
                plate: result.plate || prev.plate,
                vin: result.vin || prev.vin,
                engine: result.engineNo || prev.engine,
                color: result.color || prev.color,
                price: price || prev.price,
                manualPrice: !price,
                condition: yearInt < new Date().getFullYear() ? 'USED' : 'NEW'
            }));

            if (!matchedBrand) setEntryMode('MANUAL');
            else setEntryMode('DATABASE');
            setShowManualForm(true);
        } else {
            // OCR couldn't read the document at all — fall through to manual entry.
            setExtractedStnk(null);
            setEntryMode('MANUAL');
            setShowManualForm(true);
            if (result.notes) {
              console.warn('STNK OCR failed:', result.notes);
            }
        }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      {loading && loadingType === 'STNK' && <ScannerOverlay label="Sedang Membaca STNK..." />}

      {!extractedStnk && !showManualForm && (
        <StnkCaptureCard
          onPick={handleStnkAutofill}
          scanning={loading && loadingType === 'STNK'}
          heading={{ title: 'Data Mobil', subtitle: 'Foto STNK agar data terisi otomatis' }}
          secondaryAction={{ label: 'Atau Isi Data Secara Manual', onClick: () => setShowManualForm(true) }}
        />
      )}

      {(extractedStnk || showManualForm) && (
        <div className="space-y-6 animate-pop-in">
           {/* Hasil OCR — satu susunan untuk portal Nasabah dan Mitra
               (shared/StnkScanCard). Tombol arsip PDF tetap milik layar ini. */}
           <StnkOcrNotice
             result={stnkOcrResult}
             trailing={extractedStnk ? (
               <button
                 onClick={generateStnkPdf}
                 disabled={isGeneratingPdf}
                 className="flex shrink-0 items-center gap-2 px-4 py-2 bg-white dark:bg-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 transition-colors shadow-sm disabled:opacity-50"
               >
                 {isGeneratingPdf ? <Loader2 size={12} className="animate-spin"/> : <FileDown size={12}/>}
                 Simpan PDF
               </button>
             ) : undefined}
           />

           <div className="flex bg-gray-100 dark:bg-white/[0.03] p-1.5 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-inner">
                <button onClick={() => setEntryMode('DATABASE')} className={`flex-1 py-4 rounded-[1.8rem] text-[0.65rem] font-black uppercase tracking-widest transition-all ${entryMode === 'DATABASE' ? 'bg-white dark:bg-gray-800 shadow-xl text-emerald-500 scale-100' : 'text-gray-400 scale-95'}`}><Database size={16} className="inline mr-2"/> Pilih Merk</button>
                <button onClick={() => setEntryMode('MANUAL')} className={`flex-1 py-4 rounded-[1.8rem] text-[0.65rem] font-black uppercase tracking-widest transition-all ${entryMode === 'MANUAL' ? 'bg-white dark:bg-gray-800 shadow-xl text-emerald-500 scale-100' : 'text-gray-400 scale-95'}`}><Edit3 size={16} className="inline mr-2"/> Ketik Manual</button>
           </div>

           <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                    <label className="text-[0.6rem] font-black uppercase text-gray-400 ml-2 tracking-[0.2em]">Merk Mobil</label>
                    <div className="relative group">
                        {entryMode === 'DATABASE' ? (
                            <select
                                className="w-full p-5 rounded-[1.8rem] bg-white dark:bg-white/[0.03] border-2 border-black/5 dark:border-white/5 outline-none focus:border-emerald-500 font-black text-sm appearance-none transition-all text-emerald-500 uppercase"
                                value={vehicle.brand}
                                onChange={(e) => setVehicle({...vehicle, brand: e.target.value, model: ''})}
                            >
                                <option value="">Pilih Merk</option>
                                {VEHICLE_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        ) : (
                            <input className="w-full p-5 rounded-[1.8rem] bg-white dark:bg-white/[0.03] border-2 border-black/5 dark:border-white/5 outline-none focus:border-emerald-500 font-black text-sm text-emerald-500 uppercase" value={vehicle.brand} onChange={e => setVehicle({...vehicle, brand: e.target.value.toUpperCase()})} />
                        )}
                        {entryMode === 'DATABASE' && <ChevronDown size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>}
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[0.6rem] font-black uppercase text-gray-400 ml-2 tracking-[0.2em]">Tipe / Model</label>
                    <div className="relative group">
                        {entryMode === 'DATABASE' && vehicle.brand ? (
                            <select
                                className="w-full p-5 rounded-[1.8rem] bg-white dark:bg-white/[0.03] border-2 border-black/5 dark:border-white/5 outline-none focus:border-emerald-500 font-black text-sm appearance-none transition-all text-emerald-500 uppercase"
                                value={vehicle.model}
                                onChange={(e) => {
                                    const model = e.target.value;
                                    const yearPrice = getMarketValueForYear(vehicle.brand, model, vehicle.year);
                                    setVehicle({
                                        ...vehicle,
                                        model,
                                        ...(yearPrice ? { price: yearPrice, manualPrice: false } : {})
                                    });
                                }}
                            >
                                <option value="">Pilih Model</option>
                                {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        ) : (
                            <input className="w-full p-5 rounded-[1.8rem] bg-white dark:bg-white/[0.03] border-2 border-black/5 dark:border-white/5 outline-none focus:border-emerald-500 font-black text-sm text-emerald-500 uppercase" value={vehicle.model} onChange={e => setVehicle({...vehicle, model: e.target.value.toUpperCase()})} />
                        )}
                        {entryMode === 'DATABASE' && vehicle.brand && <ChevronDown size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>}
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
                 <div className="space-y-2">
                    <label className="text-[0.6rem] font-black uppercase text-gray-400 ml-2 tracking-widest">Tahun</label>
                    <div className="relative">
                        <select className="w-full p-5 rounded-[1.8rem] bg-white dark:bg-white/[0.03] border-2 border-black/5 outline-none focus:border-emerald-500 font-black text-sm appearance-none" value={vehicle.year} onChange={e => setVehicle({...vehicle, year: parseInt(e.target.value)})}>
                            {Array.from({ length: new Date().getFullYear() - 2000 + 1 }, (_, i) => new Date().getFullYear() - i).map(y => (<option key={y} value={y}>{y}</option>))}
                        </select>
                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[0.6rem] font-black uppercase text-gray-400 ml-2 tracking-widest">Harga Mobil (Rp)</label>
                    <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-400 text-sm">Rp</span>
                        <input className="w-full pl-12 pr-5 py-5 rounded-[1.8rem] bg-white dark:bg-white/[0.03] border-2 border-black/5 focus:border-emerald-500 outline-none font-black text-lg text-emerald-500 shadow-inner" value={formatInputCurrency(vehicle.price.toString())} onChange={e => setVehicle({...vehicle, price: parseInt(e.target.value.replace(/\D/g, "") || "0"), manualPrice: true})} />
                    </div>
                    {marketPriceEntry && (
                        <p className="text-[0.5rem] font-bold text-emerald-500 ml-2 mt-1">
                            Estimasi pasar {vehicle.year}: {formatIDR(marketPriceEntry.min)} – {formatIDR(marketPriceEntry.max)}
                        </p>
                    )}
                 </div>
                 <div className="space-y-2 col-span-2 lg:col-span-1">
                    <label className="text-[0.6rem] font-black uppercase text-gray-400 ml-2 tracking-widest">Plat Nomor</label>
                    <div className="relative h-[72px] rounded-[1.8rem] bg-white dark:bg-[#0a0a0a] border-2 p-1 flex items-center justify-center shadow-inner group transition-all overflow-hidden" style={{ borderColor: vehicle.plate.length > 0 ? (isPlateValid ? '#10b98144' : '#f43f5e44') : 'rgba(0,0,0,0.1)' }}>
                        <input placeholder="B 1234 XYZ" className={`w-full bg-transparent text-center font-black text-2xl tracking-[0.2em] uppercase outline-none ${vehicle.plate.length > 0 ? (isPlateValid ? 'text-emerald-500' : 'text-rose-500') : 'text-black dark:text-white'}`} value={vehicle.plate} onChange={handlePlateChange} />
                        {isPlateValid && <CheckCircle2 size={16} className="absolute right-4 text-emerald-500 animate-pop-in"/>}
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div className="space-y-2">
                    <label className="text-[0.6rem] font-black uppercase text-gray-400 ml-2 tracking-widest">Nomor Rangka (VIN)</label>
                    <div className="relative">
                        <input maxLength={17} placeholder="Cek di STNK" className={`w-full p-5 rounded-[1.8rem] bg-white dark:bg-white/[0.03] border-2 outline-none focus:border-emerald-500 font-mono font-bold text-sm uppercase transition-all ${vehicle.vin.length > 0 ? (isVinValid ? 'border-emerald-500/20 text-emerald-500' : 'border-rose-500/20 text-rose-500') : 'border-black/5'}`} value={vehicle.vin} onChange={e => setVehicle({...vehicle, vin: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")})} />
                        {isVinValid && <CheckCircle2 size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500 animate-pop-in"/>}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[0.6rem] font-black uppercase text-gray-400 ml-2 tracking-widest">Nomor Mesin</label>
                    <input placeholder="Cek di STNK" className="w-full p-5 rounded-[1.8rem] bg-white dark:bg-white/[0.03] border-2 border-black/5 outline-none focus:border-emerald-500 font-mono font-bold text-sm uppercase transition-all" value={vehicle.engine} onChange={e => setVehicle({...vehicle, engine: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")})} />
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StepVehicle;