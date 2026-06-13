
import React from 'react';
import { 
  Car, Smartphone, ShieldCheck, CheckCircle2, Shield, Wallet, 
  BrainCircuit, Zap } from 'lucide-react';
import { formatIDR, PageTransition } from './WizardUI';
import { Language } from '../../types';

interface StepFinalProps {
  vehicle: any;
  stnkResult: any;
  coverage: any;
  survey: any;
  premiumBreakdown: any;
  handleFinalPayment: () => void;
  setStep: (s: number) => void;
  lang: Language;
}

const StepFinal: React.FC<StepFinalProps> = ({
  vehicle, coverage, survey, premiumBreakdown, handleFinalPayment, lang
}) => {
  const t = (en: string, idn: string) => lang === Language.EN ? en : idn;

  const summaryItems = [
      { label: t('Vehicle', 'Unit Mobil'), value: `${vehicle.brand} ${vehicle.model}`, icon: Car },
      { label: t('Plate Number', 'Nomor Plat'), value: vehicle.plate, icon: Smartphone },
      { label: t('Coverage', 'Tipe Proteksi'), value: coverage.type === 'COMPREHENSIVE' ? t('All Risk', 'All Risk (Lengkap)') : t('Total Loss', 'TLO (Hanya Hilang)'), icon: ShieldCheck },
  ];

  return (
    <PageTransition>
      <div className="space-y-6 py-2 pb-24">
        <div className="px-2">
           <h2 className="text-2xl font-black uppercase tracking-tighter">{t('Final', 'Ringkasan')} <span className="text-emerald-500">{t('Summary', 'Akhir')}</span></h2>
           <p className="text-xs text-gray-500 font-medium mt-1">{t('One more step to get your protection.', 'Satu langkah lagi asuransi kamu aktif!')}</p>
        </div>

        <div className={`p-8 rounded-[3rem] border-2 flex flex-col gap-6 shadow-sm animate-pop-in ${survey.score < 80 ? 'bg-amber-50/50 border-amber-200' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${survey.score < 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                    <BrainCircuit size={32}/>
                 </div>
                 <div>
                    <p className={`text-[0.6rem] font-black uppercase tracking-[0.3em] ${survey.score < 80 ? 'text-amber-600' : 'text-emerald-600'}`}>{t('AUDIT SCORE', 'ANALISA KONDISI')}</p>
                    <h4 className="text-2xl font-black uppercase text-slate-900 dark:text-white leading-none mt-1">{survey.score}% Verified</h4>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-[1.8rem] bg-white dark:bg-black/20 border border-black/5 flex items-center gap-4 shadow-sm">
                 <div className={survey.score < 90 ? 'text-amber-500' : 'text-emerald-500'}>
                    <CheckCircle2 size={20}/>
                 </div>
                 <div>
                    <p className="text-[0.5rem] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{t('Integrity', 'Integritas')}</p>
                    <p className="text-[0.7rem] font-black uppercase">{survey.score > 90 ? 'High Fidelity' : 'Acceptable'}</p>
                 </div>
              </div>
              <div className="p-4 rounded-[1.8rem] bg-white dark:bg-black/20 border border-black/5 flex items-center gap-4 shadow-sm">
                 <div className="text-blue-500">
                    <Shield size={20}/>
                 </div>
                 <div>
                    <p className="text-[0.5rem] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{t('Audit Type', 'Tipe Audit')}</p>
                    <p className="text-[0.7rem] font-black uppercase">Vision-Based</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="p-8 bg-white dark:bg-white/5 border border-black/5 rounded-[3rem] shadow-sm space-y-6">
           <div className="grid grid-cols-2 gap-8">
              {summaryItems.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                      <p className="text-[0.55rem] font-bold text-gray-400 uppercase tracking-[0.2em]">{item.label}</p>
                      <p className={`text-sm font-black uppercase truncate text-slate-900 dark:text-white`}>{item.value}</p>
                  </div>
              ))}
              <div className="space-y-1.5">
                  <p className="text-[0.55rem] font-bold text-gray-400 uppercase tracking-[0.2em]">{t('Period', 'Durasi Asuransi')}</p>
                  <p className="text-sm font-black uppercase text-emerald-500">12 {t('Months', 'Bulan')}</p>
              </div>
           </div>
        </div>

        <div className="p-10 bg-slate-900 rounded-[4rem] text-white relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-emerald-500 animate-mesh"></div>
           
           <div className="flex justify-between items-start mb-10">
              <div>
                 <p className="text-[0.65rem] font-black text-emerald-400 uppercase tracking-[0.4em] mb-1.5">{t('PAYMENT SUMMARY', 'RINGKASAN BAYAR')}</p>
                 <h4 className="text-4xl font-black uppercase tracking-tighter">{t('Premi Audit', 'Rincian Premi')}</h4>
              </div>
              <div className="p-4 bg-white/10 rounded-2xl shadow-xl">
                 <Wallet size={24} className="text-emerald-400"/>
              </div>
           </div>

           <div className="space-y-4">
              <div className="flex justify-between text-xs font-bold opacity-60 uppercase tracking-widest">
                 <span>{t('Core Module', 'Modul Dasar')}</span>
                 <span className="font-mono text-lg">{formatIDR(premiumBreakdown?.basicPremium || 0)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold opacity-60 uppercase tracking-widest">
                 <span>{t('Expansions & Admin', 'Add-on & Admin')}</span>
                 <span className="font-mono text-lg">{formatIDR((premiumBreakdown?.totalPayable || 0) - (premiumBreakdown?.basicPremium || 0) + (premiumBreakdown?.discountAmount || 0))}</span>
              </div>
              
              {premiumBreakdown?.discountAmount > 0 && (
                <div className="flex justify-between text-xs font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                   <span className="flex items-center gap-2"><Zap size={14}/> {t('Commission Offset', 'Potongan Komisi')}</span>
                   <span className="font-mono text-lg">-{formatIDR(premiumBreakdown.discountAmount)}</span>
                </div>
              )}

              <div className="pt-8 mt-4 border-t border-white/20 flex justify-between items-end">
                 <div>
                    <p className="text-[0.75rem] font-black uppercase text-emerald-500 mb-2 tracking-[0.3em]">{t('TOTAL PAYABLE', 'TOTAL HARUS DIBAYAR')}</p>
                    <h3 className="text-5xl font-black tracking-tighter leading-none text-glow-primary">{formatIDR(premiumBreakdown?.totalPayable || 0)}</h3>
                 </div>
                 <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-[0.55rem] font-black uppercase text-white/50 tracking-widest">
                    <Shield size={12}/> {t('Verified', 'Terverifikasi')}
                 </div>
              </div>
           </div>
        </div>

        <button 
           onClick={handleFinalPayment} 
           className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[2.5rem] font-black uppercase text-base tracking-[0.4em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 group border border-white/5"
        >
           <Wallet size={28} className="text-emerald-500 group-hover:rotate-12 transition-transform"/> 
           {t('AUTHENTICATE & PAY', 'OTORISASI & BAYAR')}
        </button>
      </div>
    </PageTransition>
  );
};

export default StepFinal;
