import React, { useState } from 'react';
import { Check, Clock, Loader2, ShieldCheck, Lock, Info } from 'lucide-react';
import { formatIDR } from './WizardUI';
import { ClayCard } from '../ui';

interface StepPaymentProps {
  premiumBreakdown: any;
  onPaymentSuccess: (method: string, status: 'SUCCESS' | 'PENDING_PAYMENT') => Promise<void>;
  loading: boolean;
}

const StepPayment: React.FC<StepPaymentProps> = ({ premiumBreakdown, onPaymentSuccess, loading }) => {
  const [method, setMethod] = useState<'BCA_TRANSFER' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = async () => {
    if (!method) return;
    setIsProcessing(true);
    try {
      await onPaymentSuccess('BCA_TRANSFER', 'PENDING_PAYMENT');
    } catch (e) {
      console.error('Payment error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayLater = async () => {
    setIsProcessing(true);
    try {
      await onPaymentSuccess('BCA_TRANSFER', 'PENDING_PAYMENT');
    } catch (e) {
      console.error('Pay later error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const comingSoonMethods = [
    { id: 'VA', name: 'Virtual Account', icon: '🏦' },
    { id: 'EWALLET', name: 'E-Wallet', icon: '📱' },
    { id: 'QRIS', name: 'QRIS', icon: '📳' },
    { id: 'CARD', name: 'Kartu Kredit', icon: '💳' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <ClayCard variant="hero" padding="lg" gradientBorder>
         <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500"></div>
         <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="space-y-1">
               <p className="text-[0.6rem] font-black text-gray-400 uppercase tracking-[0.2em]">Total Tagihan</p>
               <h3 className="text-4xl font-black text-emerald-500 tracking-tighter drop-shadow-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {formatIDR(premiumBreakdown?.totalPayable || 0)}
               </h3>
            </div>
            <div className="flex flex-col items-end">
               <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full mb-2 border border-blue-500/20">
                  <Lock size={10}/>
                  <span className="text-[0.45rem] font-black uppercase tracking-widest">Aman</span>
               </div>
               <p className="text-[0.5rem] font-bold text-gray-400 uppercase">INV: SP-{Date.now().toString().slice(-6)}</p>
            </div>
         </div>

         {/* Active: BCA Bank Transfer */}
         <div className="relative z-10 space-y-3">
            <button
               onClick={() => setMethod('BCA_TRANSFER')}
               className={`w-full p-5 bg-white dark:bg-white/5 rounded-2xl border-2 transition-all flex items-center justify-between group active:scale-[0.98] ${method === 'BCA_TRANSFER' ? 'border-emerald-500 shadow-xl shadow-emerald-500/15' : 'border-black/5 dark:border-white/10'}`}
            >
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs">BCA</div>
                  <div>
                     <p className="text-sm font-black text-gray-700 dark:text-gray-200">Transfer Bank BCA</p>
                     <p className="text-[0.6rem] text-gray-400">PT Ruang Proteksi Indonesia</p>
                     <p className="text-xs font-mono font-bold text-emerald-600">5730-807-807</p>
                  </div>
               </div>
               <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${method === 'BCA_TRANSFER' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-black/10 dark:border-white/20'}`}>
                  {method === 'BCA_TRANSFER' && <Check size={14} strokeWidth={4}/>}
               </div>
            </button>

            {method === 'BCA_TRANSFER' && (
               <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 space-y-2">
                  <div className="flex items-start gap-2">
                     <Info size={14} className="text-amber-500 shrink-0 mt-0.5"/>
                     <div className="space-y-1.5">
                        <p className="text-[0.65rem] font-bold text-amber-800 dark:text-amber-200">Panduan Pembayaran:</p>
                        <ol className="text-[0.6rem] text-amber-700 dark:text-amber-300 space-y-1 list-decimal list-inside">
                           <li>Transfer ke BCA a.n. <strong>PT Ruang Proteksi Indonesia</strong> — <strong>5730-807-807</strong></li>
                           <li>Cantumkan <strong>Nomor QS</strong> sebagai berita transfer</li>
                           <li>Simpan bukti transfer, kirim ke agen atau WhatsApp SurePath</li>
                        </ol>
                        <p className="text-[0.55rem] text-amber-600 dark:text-amber-400 italic pt-1">
                           Pembayaran BUKAN otomatis menjamin coverage aktif. Coverage aktif hanya jika polis resmi dari asuransi sudah terbit.
                        </p>
                     </div>
                  </div>
               </div>
            )}
         </div>

         {/* Coming Soon */}
         <div className="relative z-10 mt-4">
            <p className="text-[0.55rem] font-black text-gray-400 ml-4 uppercase tracking-[0.2em] mb-2">Metode Lainnya</p>
            <div className="grid grid-cols-2 gap-2">
               {comingSoonMethods.map(m => (
                  <div key={m.id} className="p-3 rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] flex items-center gap-2 opacity-60">
                     <span className="text-lg">{m.icon}</span>
                     <div className="flex-1 min-w-0">
                        <p className="text-[0.6rem] font-bold text-gray-400 truncate">{m.name}</p>
                     </div>
                     <span className="text-[0.4rem] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">Soon</span>
                  </div>
               ))}
            </div>
         </div>
      </ClayCard>

      <div className="space-y-4">
         <button
            onClick={handlePay}
            disabled={!method || isProcessing || loading}
            className="w-full h-14 rounded-2xl bg-emerald-500 text-white font-black text-sm uppercase tracking-widest active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
         >
            {isProcessing ? <Loader2 size={18} className="animate-spin"/> : <ShieldCheck size={18}/>}
            {isProcessing ? 'Memproses...' : 'Konfirmasi Pembayaran'}
         </button>

         <button
            onClick={handlePayLater}
            className="w-full h-12 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2"
         >
            <Clock size={14}/> Bayar Nanti
         </button>

         <p className="text-[0.5rem] text-gray-400 text-center leading-relaxed px-4">
            Pembayaran dikonfirmasi manual oleh tim kami (1×24 jam). Coverage aktif hanya setelah polis resmi dari asuransi diterbitkan.
         </p>
      </div>
    </div>
  );
};

export default StepPayment;
