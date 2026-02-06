import React from 'react';
import { 
  Car, Smartphone, ShieldCheck, Gauge, CheckCircle2, Shield, Wallet, 
  BrainCircuit, Star, Zap, Info, Droplets, AlertCircle
} from 'lucide-react';
import { formatIDR, PageTransition } from './WizardUI';

interface StepFinalProps {
  vehicle: any;
  stnkResult: any;
  coverage: any;
  survey: any;
  premiumBreakdown: any;
  handleFinalPayment: () => void;
  setStep: (s: number) => void;
}

const StepFinal: React.FC<StepFinalProps> = ({
  vehicle, stnkResult, coverage, survey, premiumBreakdown, handleFinalPayment, setStep
}) => {
  const summaryItems = [
      { label: 'Unit Mobil', value: `${vehicle.brand} ${vehicle.model}`, icon: Car },
      { label: 'Nomor Plat', value: vehicle.plate, icon: Smartphone },
      { label: 'Tipe Proteksi', value: coverage.type === 'COMPREHENSIVE' ? 'All Risk (Lengkap)' : 'TLO (Hilang)', icon: ShieldCheck },
  ];

  return (
    <PageTransition>
      <div className="space-y-6 py-2 pb-24">
        <div className="px-2">
           <h2 className="text-2xl font-black uppercase tracking-tighter">Ringkasan <span className="text-primary-500">Akhir</span></h2>
           <p className="text-xs text-gray-500 font-medium mt-1">Satu langkah lagi asuransi kamu aktif!</p>
        </div>

        <div className={`p-6 rounded-[2.5rem] border-2 flex flex-col gap-4 shadow-sm animate-pop-in ${survey.isDirty ? 'bg-amber-50/50 border-amber-200' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${survey.isDirty ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                    <BrainCircuit size={28}/>
                 </div>
                 <div>
                    <p className={`text-[0.55rem] font-black uppercase tracking-widest ${survey.isDirty ? 'text-amber-600' : 'text-emerald-600'}`}>Analisa Kondisi AI</p>
                    <h4 className="text-lg font-black uppercase text-slate-900 dark:text-white leading-none mt-1">Skor Kondisi: {survey.score}%</h4>
                 </div>
              </div>
              <div className="text-right">
                 <div className={`px-3 py-1 text-white rounded-lg text-[0.45rem] font-black uppercase tracking-widest ${survey.isDirty ? 'bg-amber-500' : 'bg-emerald-500'}`}>Terverifikasi</div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-white dark:bg-black/20 border border-black/5 flex items-center gap-3">
                 <div className={survey.isDirty ? 'text-amber-500' : 'text-emerald-500'}>
                    {survey.isDirty ? <Droplets size={16}/> : <CheckCircle2 size={16}/>}
                 </div>
                 <div>
                    <p className="text-[0.45rem] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Kebersihan</p>
                    <p className="text-[0.65rem] font-black uppercase">{survey.isDirty ? 'Perlu Dicuci' : 'Sangat Bersih'}</p>
                 </div>
              </div>
              <div className="p-3 rounded-2xl bg-white dark:bg-black/20 border border-black/5 flex items-center gap-3">
                 <div className="text-blue-500">
                    <Shield size={16}/>
                 </div>
                 <div>
                    <p className="text-[0.45rem] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Kondisi Bodi</p>
                    <p className="text-[0.65rem] font-black uppercase">{survey.verdict === 'CLEAN' ? 'Mulus' : 'Ada Lecet Halus'}</p>
                 </div>
              </div>
           </div>

           {survey.isDirty && (
              <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex gap-3 items-start">
                 <AlertCircle size={14} className="text-amber-600 mt-0.5 flex-shrink-0"/>
                 <p className="text-[0.6rem] font-bold text-amber-700 leading-tight uppercase">
                    Catatan: {survey.cleanlinessComment || "AI kami menyarankan cuci mobil agar proses klaim ke depan lebih cepat."}
                 </p>
              </div>
           )}
        </div>

        <div className="p-6 bg-white dark:bg-white/5 border border-black/5 rounded-[2.5rem] shadow-sm space-y-4">
           <div className="grid grid-cols-2 gap-6">
              {summaryItems.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                      <p className="text-[0.55rem] font-bold text-gray-400 uppercase tracking-wider">{item.label}</p>
                      <p className={`text-[0.7rem] font-black uppercase truncate text-slate-900 dark:text-white`}>{item.value}</p>
                  </div>
              ))}
              <div className="space-y-1">
                  <p className="text-[0.55rem] font-bold text-gray-400 uppercase tracking-wider">Durasi Asuransi</p>
                  <p className="text-[0.7rem] font-black uppercase text-emerald-500">12 Bulan (Langsung Aktif)</p>
              </div>
           </div>
        </div>

        <div className="p-8 bg-slate-900 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-emerald-500"></div>
           
           <div className="flex justify-between items-start mb-8">
              <div>
                 <p className="text-[0.6rem] font-black text-primary-400 uppercase tracking-widest mb-1">Rincian Bayar</p>
                 <h4 className="text-3xl font-black uppercase tracking-tighter">Total Biaya</h4>
              </div>
              <div className="p-3 bg-white/10 rounded-xl">
                 <Shield size={20} className="text-primary-400"/>
              </div>
           </div>

           <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold opacity-60">
                 <span>Paket Dasar {coverage.type === 'COMPREHENSIVE' ? 'All Risk' : 'TLO'}</span>
                 <span className="font-mono">{formatIDR(premiumBreakdown?.basicPremium || 0)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold opacity-60">
                 <span>Proteksi Tambahan & Admin</span>
                 <span className="font-mono">{formatIDR((premiumBreakdown?.totalPayable || 0) - (premiumBreakdown?.basicPremium || 0) + (premiumBreakdown?.discountAmount || 0))}</span>
              </div>
              
              {premiumBreakdown?.discountAmount > 0 && (
                <div className="flex justify-between text-xs font-black text-emerald-400">
                   <span>Hemat (Potongan Agen)</span>
                   <span className="font-mono">-{formatIDR(premiumBreakdown.discountAmount)}</span>
                </div>
              )}

              <div className="pt-6 mt-4 border-t border-white/20 flex justify-between items-end">
                 <div>
                    <p className="text-[0.7rem] font-black uppercase text-primary-500 mb-1">Harus Dibayar</p>
                    <h3 className="text-4xl font-black tracking-tighter leading-none text-glow-primary">{formatIDR(premiumBreakdown?.totalPayable || 0)}</h3>
                 </div>
                 <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-[0.45rem] font-black uppercase text-white/50">
                    <Zap size={10} className="fill-current"/> Proteksi Instan
                 </div>
              </div>
           </div>
        </div>

        <div className="p-5 bg-amber-50 rounded-[2rem] border border-amber-100 flex gap-4">
           <Info size={24} className="text-amber-500 flex-shrink-0"/>
           <p className="text-[0.6rem] font-bold text-amber-800 leading-relaxed uppercase">
              Dengan bayar, kamu setuju data di atas benar. Polis akan terbit secara <span className="font-black">Digital</span> dalam hitungan menit.
           </p>
        </div>

        <button 
           onClick={handleFinalPayment} 
           className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 group"
        >
           <Wallet size={24} className="text-primary-500 group-hover:rotate-12 transition-transform"/> 
           BAYAR SEKARANG
        </button>
      </div>
    </PageTransition>
  );
};

export default StepFinal;