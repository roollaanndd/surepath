
import React, { useState } from 'react';
import { Database, Edit3, ChevronDown, User, Briefcase, Building2, Zap, Timer, FileSearch, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';
import { CAR_DATABASE } from '../../constants';
import { extractStnkData } from '../../services/geminiService';
import { ScannerOverlay } from './WizardUI';

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
  // Store all extracted STNK info for editing
  const [extractedStnk, setExtractedStnk] = useState<any>(null);

  const handleStnkAutofill = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setLoadingType('STNK');
    setExtractedStnk(null);
    
    const reader = new FileReader();
    reader.onload = async () => {
        const base64 = reader.result as string;
        const response = await extractStnkData(base64);
        setLoading(false);
        setLoadingType(null);

        if (response.success && response.data) {
            const data = response.data;
            const cleanData = {
                ownerName: data.owner || '',
                plate: data.plate || '',
                brand: data.brand || '',
                model: data.model || '',
                color: data.color || '',
                year: data.year || '',
                vin: data.vin || '',
                engine: data.engine || '',
                status: data.status || 'OK'
            };

            setExtractedStnk(cleanData);

            // Populate STNK Result for parent
            if (setStnkResult) {
                setStnkResult(cleanData);
            }

            // Database Matching
            const match = CAR_DATABASE.find(c => 
                data.brand.toUpperCase().includes(c.brand) || 
                (c.modelName && data.brand.toUpperCase().includes(c.modelName))
            );

            const yearInt = parseInt(data.year) || 2025;
            const price = match ? (match.yearPrices[yearInt] || match.yearPrices[2024] || 0) * 1000000 : 0;

            // Autofill Main Form
            setVehicle((prev: any) => ({
                ...prev,
                brand: match?.brand || data.brand.split(' ')[0] || prev.brand,
                model: match?.modelName || data.model || prev.model,
                year: yearInt || prev.year,
                plate: data.plate || prev.plate,
                vin: data.vin || prev.vin,
                engine: data.engine || prev.engine,
                price: price || prev.price,
                manualPrice: !price,
                condition: yearInt < new Date().getFullYear() ? 'USED' : 'NEW'
            }));

            if (!match) {
                setEntryMode('MANUAL');
            } else {
                setEntryMode('DATABASE');
            }
        } else {
            alert('Gagal mengekstrak data STNK. Silakan isi manual.');
        }
    };
    reader.readAsDataURL(file);
  };

  const handleStnkEdit = (field: string, value: string) => {
      const newStnk = { ...extractedStnk, [field]: value.toUpperCase() };
      setExtractedStnk(newStnk);
      if (setStnkResult) setStnkResult(newStnk);
      
      // Update main vehicle state for the edited field
      if (field === 'brand') setVehicle((prev: any) => ({ ...prev, brand: value.toUpperCase() }));
      if (field === 'model') setVehicle((prev: any) => ({ ...prev, model: value.toUpperCase() }));
      if (field === 'plate') setVehicle((prev: any) => ({ ...prev, plate: value.toUpperCase() }));
      if (field === 'year') setVehicle((prev: any) => ({ ...prev, year: parseInt(value) || prev.year }));
      if (field === 'vin') setVehicle((prev: any) => ({ ...prev, vin: value.toUpperCase() }));
      if (field === 'engine') setVehicle((prev: any) => ({ ...prev, engine: value.toUpperCase() }));
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Loading Overlay */}
      {loading && loadingType === 'STNK' && <ScannerOverlay label="Neural STNK Decryption" />}

      {/* STNK Express Button */}
      <label className="block w-full p-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[2rem] cursor-pointer shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.01] transition-all active:scale-95 group">
         <div className="bg-white dark:bg-black/20 rounded-[1.9rem] p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <FileSearch size={24}/>
                </div>
                <div>
                    <h4 className="text-sm font-black uppercase tracking-tight text-gray-900 dark:text-white">Autofill with STNK</h4>
                    <p className="text-[0.55rem] font-bold text-gray-500 dark:text-emerald-100 uppercase tracking-widest flex items-center gap-1"><Sparkles size={10}/> AI Vision Extraction</p>
                </div>
            </div>
            <div className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[0.6rem] font-black uppercase tracking-widest group-hover:bg-emerald-600 transition-colors">
                Upload
            </div>
         </div>
         <input type="file" accept="image/*" className="hidden" onChange={handleStnkAutofill} />
      </label>

      {/* Extracted Info Visual Feedback & Edit Form */}
      {extractedStnk && (
        <div className="animate-pop-in bg-white dark:bg-white/5 border border-emerald-500/20 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><FileSearch size={120} className="rotate-12"/></div>
           <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 size={24} className="text-emerald-500 flex-shrink-0"/>
              <div>
                 <p className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">Neural Scan Complete</p>
                 <p className="text-[0.55rem] font-bold text-gray-400 uppercase tracking-widest">Verify & Edit Extracted Data</p>
              </div>
              <button onClick={() => setExtractedStnk(null)} className="ml-auto p-2 bg-gray-100 dark:bg-white/10 rounded-full hover:bg-rose-500 hover:text-white transition-all"><RefreshCw size={14}/></button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              {/* Primary Identity */}
              <div className="space-y-1">
                 <label className="text-[0.5rem] font-black uppercase text-gray-400 ml-1">Nama Pemilik (STNK)</label>
                 <input 
                    value={extractedStnk.ownerName} 
                    onChange={(e) => handleStnkEdit('ownerName', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-xl text-xs font-bold uppercase focus:border-emerald-500 outline-none"
                 />
              </div>
              <div className="space-y-1">
                 <label className="text-[0.5rem] font-black uppercase text-gray-400 ml-1">Warna Kendaraan</label>
                 <input 
                    value={extractedStnk.color} 
                    onChange={(e) => handleStnkEdit('color', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-black/5 dark:border-white/10 rounded-xl text-xs font-bold uppercase focus:border-emerald-500 outline-none"
                 />
              </div>
           </div>
        </div>
      )}

      <div className="flex bg-gray-100 dark:bg-white/[0.03] p-1 rounded-[1.8rem] border border-black/5 dark:border-white/5">
         <button 
           onClick={() => setEntryMode('DATABASE')}
           className={`flex-1 py-3.5 rounded-[1.5rem] text-[0.65rem] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${entryMode === 'DATABASE' ? 'bg-white dark:bg-gray-800 shadow-xl text-primary-500' : 'text-gray-400'}`}
         >
           <Database size={16}/> Neural Database
         </button>
         <button 
           onClick={() => { setEntryMode('MANUAL'); setVehicle((v: any) => ({ ...v, brand: '', model: '', basePrice: 0 })); }}
           className={`flex-1 py-3.5 rounded-[1.5rem] text-[0.65rem] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${entryMode === 'MANUAL' ? 'bg-white dark:bg-gray-800 shadow-xl text-primary-500' : 'text-gray-400'}`}
         >
           <Edit3 size={16}/> Manual Registry
         </button>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[0.6rem] font-black uppercase text-gray-500 ml-2 tracking-[0.2em]">Merk Kendaraan</label>
            {entryMode === 'DATABASE' ? (
                <div className="relative group">
                    <select 
                        className="w-full p-5 rounded-[1.8rem] bg-white dark:bg-white/[0.03] border-2 border-black/5 dark:border-white/5 outline-none focus:border-primary-500 font-black text-sm appearance-none transition-all cursor-pointer group-hover:border-black/10 text-primary-500"
                        value={vehicle.brand}
                        onChange={(e) => {
                            const val = e.target.value;
                            const unit = CAR_DATABASE.find(c => c.brand === val);
                            const p = (unit?.yearPrices[2024] || 0) * 1000000;
                            setVehicle({...vehicle, brand: val, model: unit?.modelName || '', price: p, basePrice: p});
                        }}
                    >
                        <option value="">Pilih Merk</option>
                        {Array.from(new Set(CAR_DATABASE.map(c => c.brand))).sort().map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <ChevronDown size={20}/>
                    </div>
                </div>
            ) : (
                <input 
                    placeholder="Contoh: Toyota"
                    value={vehicle.brand}
                    className="w-full p-5 rounded-[1.8rem] bg-white dark:bg-white/[0.03] border-2 border-black/5 dark:border-white/5 outline-none focus:border-primary-500 font-black text-sm transition-all text-primary-500 uppercase"
                    onChange={(e) => setVehicle({...vehicle, brand: e.target.value.toUpperCase()})}
                />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[0.6rem] font-black uppercase text-gray-500 ml-2 tracking-[0.2em]">Tipe Model</label>
            <input 
              readOnly={entryMode === 'DATABASE' && !vehicle.brand}
              placeholder={entryMode === 'DATABASE' ? (vehicle.brand ? `Model ${vehicle.brand}` : "Pilih Merk") : "Contoh: Avanza G"}
              value={vehicle.model}
              className={`w-full p-5 rounded-[1.8rem] bg-white dark:bg-white/[0.03] border-2 border-black/5 dark:border-white/5 outline-none focus:border-primary-500 font-black text-sm transition-all ${entryMode === 'DATABASE' ? 'bg-gray-50 dark:bg-black/20 text-gray-400' : 'text-primary-500 uppercase'}`}
              onChange={(e) => setVehicle({...vehicle, model: e.target.value.toUpperCase()})}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[0.6rem] font-black uppercase text-gray-500 ml-2 tracking-widest">Tahun</label>
            <div className="relative group">
                <select 
                className="w-full p-5 rounded-[1.8rem] bg-white dark:bg-white/[0.03] border-2 border-black/5 dark:border-white/5 outline-none focus:border-primary-500 font-black text-sm appearance-none"
                value={vehicle.year}
                onChange={(e) => setVehicle({...vehicle, year: parseInt(e.target.value)})}
                >
                {Array.from({ length: 11 }, (_, i) => 2025 - i).map(y => (
                    <option key={y} value={y}>{y}{y === 2025 ? ' (Gress)' : ''}</option>
                ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <ChevronDown size={20}/>
                </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[0.6rem] font-black uppercase text-gray-500 ml-2 tracking-widest">Harga OTR</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-400 text-sm">Rp</span>
              <input 
                type="text"
                inputMode="numeric"
                className="w-full pl-12 pr-5 py-5 rounded-[1.8rem] bg-white dark:bg-white/[0.03] border-2 border-black/5 dark:border-white/5 focus:border-primary-500 outline-none font-black text-lg text-primary-500"
                value={formatInputCurrency(vehicle.price.toString())}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setVehicle({...vehicle, price: parseInt(val || "0"), manualPrice: true});
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[0.6rem] font-black uppercase text-gray-500 ml-2 tracking-widest">Plat Polisi</label>
            <div className="relative h-[72px] rounded-[1.8rem] bg-white dark:bg-[#0a0a0a] border-2 border-black/10 dark:border-white/10 p-1 flex items-center justify-center shadow-inner group transition-all focus-within:border-primary-500">
               <input 
                 placeholder="B 1234 XYZ"
                 maxLength={12}
                 className="w-full bg-transparent text-center font-black text-2xl tracking-[0.2em] text-black dark:text-white uppercase outline-none placeholder:text-gray-300 dark:placeholder:text-gray-800"
                 value={vehicle.plate}
                 onChange={handlePlateChange}
               />
               <div className="absolute right-6 text-[0.45rem] font-black text-primary-500/60 uppercase tracking-widest leading-none text-right">
                    {vehicle.regionName.split('(')[0]} <br/>
                    <span className="text-[0.35rem] opacity-50">Region {vehicle.region}</span>
               </div>
            </div>
          </div>
        </div>

        {/* Chassis and Engine Numbers Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div className="space-y-2">
                <label className="text-[0.6rem] font-black uppercase text-gray-500 ml-2 tracking-[0.2em]">Nomor Rangka (VIN)</label>
                <input 
                    placeholder="Contoh: MHF123..."
                    value={vehicle.vin}
                    onChange={(e) => setVehicle({...vehicle, vin: e.target.value.toUpperCase()})}
                    className="w-full p-5 rounded-[1.8rem] bg-white dark:bg-white/[0.03] border-2 border-black/5 dark:border-white/5 outline-none focus:border-primary-500 font-black text-sm text-primary-500 uppercase transition-all font-mono"
                />
            </div>
            <div className="space-y-2">
                <label className="text-[0.6rem] font-black uppercase text-gray-500 ml-2 tracking-[0.2em]">Nomor Mesin</label>
                <input 
                    placeholder="Contoh: K14B..."
                    value={vehicle.engine}
                    onChange={(e) => setVehicle({...vehicle, engine: e.target.value.toUpperCase()})}
                    className="w-full p-5 rounded-[1.8rem] bg-white dark:bg-white/[0.03] border-2 border-black/5 dark:border-white/5 outline-none focus:border-primary-500 font-black text-sm text-primary-500 uppercase transition-all font-mono"
                />
            </div>
        </div>
      </div>

      <div className="space-y-5">
        <label className="text-[0.65rem] font-black uppercase text-gray-500 ml-2 tracking-[0.3em]">Usage & Conditions Matrix</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="grid grid-cols-3 gap-3">
                {[
                    { id: 'PRIVATE', icon: User, label: 'Pribadi' },
                    { id: 'COMMERCIAL', icon: Briefcase, label: 'Niaga' },
                    { id: 'DINAS', icon: Building2, label: 'Dinas' }
                ].map(u => (
                    <button 
                        key={u.id}
                        onClick={() => setVehicle({...vehicle, usage: u.id as any})}
                        className={`p-4 rounded-[1.8rem] border-2 flex flex-col items-center text-center gap-2 transition-all tap-feedback ${vehicle.usage === u.id ? 'border-primary-500 bg-primary-500/[0.03] shadow-lg' : 'border-black/5 bg-white dark:bg-white/[0.03] opacity-60'}`}
                    >
                        <u.icon size={22} className={vehicle.usage === u.id ? 'text-primary-500' : 'text-gray-400'}/>
                        <span className={`text-[0.55rem] font-black uppercase tracking-widest ${vehicle.usage === u.id ? 'text-primary-600' : 'text-gray-500'}`}>{u.label}</span>
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
                {[
                    { id: 'NEW', icon: Zap, label: 'Gress (Baru)' },
                    { id: 'USED', icon: Timer, label: 'Bekas' }
                ].map(c => (
                    <button 
                        key={c.id}
                        onClick={() => setVehicle({...vehicle, condition: c.id as any})}
                        className={`p-4 rounded-[1.8rem] border-2 flex flex-col items-center text-center gap-2 transition-all tap-feedback ${vehicle.condition === c.id ? 'border-primary-500 bg-primary-500/[0.03] shadow-lg' : 'border-black/5 bg-white dark:bg-white/[0.03] opacity-60'}`}
                    >
                        <c.icon size={22} className={vehicle.condition === c.id ? 'text-primary-500' : 'text-gray-400'}/>
                        <span className={`text-[0.55rem] font-black uppercase tracking-widest ${vehicle.condition === c.id ? 'text-primary-600' : 'text-gray-500'}`}>{c.label}</span>
                    </button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default StepVehicle;
