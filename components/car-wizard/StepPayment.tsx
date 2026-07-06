
import React, { useState } from 'react';
import {
  Smartphone, Landmark, Check, CreditCard,
  Lock, ShieldCheck, Zap,
  Loader2, Info, CalendarClock
} from 'lucide-react';
import { formatIDR } from './WizardUI';
import { ClayCard, LiveBadge } from '../ui';

interface StepPaymentProps {
  premiumBreakdown: any;
  onPaymentSuccess: (method: string, status: 'SUCCESS' | 'PENDING_PAYMENT') => Promise<void>;
  loading: boolean;
}

const StepPayment: React.FC<StepPaymentProps> = ({ premiumBreakdown, onPaymentSuccess, loading }) => {
  const [method, setMethod] = useState<'VA' | 'EWALLET' | 'CARD' | null>(null);
  const [selectedSubMethod, setSelectedSubMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await onPaymentSuccess(selectedSubMethod || 'SurePath Gateway', 'SUCCESS');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayLater = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await onPaymentSuccess('PAY_LATER', 'PENDING_PAYMENT');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Payment methods ──────────────────────────────────────────────────────
  // Order reflects Indonesian payment-volume share (GoPay > DANA > OVO > QRIS
  // > ShopeePay > BCA VA > Mandiri VA > BNI VA > LinkAja > Credit Card).
  // Logos still hot-linked from Wikipedia — TODO: self-host as SVG in
  // /public/payment-logos/ in a follow-up sprint (Wikipedia ToS + reliability).
  const eWallets = [
    { id: 'GOPAY', name: 'GoPay', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/GoPay_logo.svg' },
    { id: 'DANA', name: 'DANA', icon: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Logo_dana_blue.svg' },
    { id: 'OVO', name: 'OVO', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Logo_ovo_purple.svg' },
    { id: 'SHOPEEPAY', name: 'ShopeePay', icon: 'https://upload.wikimedia.org/wikipedia/commons/6/63/Shopee_Pay_logo.svg' },
    { id: 'LINKAJA', name: 'LinkAja', icon: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/LinkAja_logo.svg' },
    { id: 'QRIS', name: 'QRIS / Semua Dompet Digital', icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_QRIS.svg' },
  ];

  const vaBanks = [
    { id: 'BCA', name: 'BCA Virtual Account', icon: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Logo_BCA.svg' },
    { id: 'MANDIRI', name: 'Mandiri Virtual Account', icon: 'https://upload.wikimedia.org/wikipedia/id/f/fa/Bank_Mandiri_logo.svg' },
    { id: 'BNI', name: 'BNI Virtual Account', icon: 'https://upload.wikimedia.org/wikipedia/id/5/55/BNI_logo.svg' },
  ];

  const creditCards = [
    { id: 'VISA', name: 'Visa', icon: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg' },
    { id: 'MASTERCARD', name: 'Mastercard', icon: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <ClayCard variant="hero" padding="lg" gradientBorder>
         <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500"></div>
         <div className="flex justify-between items-start mb-8 relative z-10">
            <div className="space-y-1">
               <p className="text-[0.6rem] font-black text-gray-400 uppercase tracking-[0.2em]">Total Tagihan Premi</p>
               {/* Livin'-style bold large number for the amount */}
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

         {/* Social proof — "Sedang Ramai" pattern from Livin' (Image 1) */}
         <div className="mb-4 relative z-10">
            <LiveBadge count={12} label="polis mobil terjual minggu ini" color="#F59E0B" />
         </div>

         <div className="grid grid-cols-3 gap-3 relative z-10">
            <button
               onClick={() => { setMethod('VA'); setSelectedSubMethod(null); }}
               className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all duration-300 active:scale-95 ${method === 'VA' ? 'border-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'border-black/5 text-gray-400 hover:border-black/10 dark:bg-white/5'}`}
               style={method === 'VA' ? { background: 'linear-gradient(135deg, #00C16A 0%, #009E52 100%)' } : {}}
            >
               <Landmark size={24}/>
               <span className="text-[0.5rem] font-black uppercase tracking-widest">Bank VA</span>
            </button>
            <button
               onClick={() => { setMethod('EWALLET'); setSelectedSubMethod(null); }}
               className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all duration-300 active:scale-95 ${method === 'EWALLET' ? 'border-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'border-black/5 text-gray-400 hover:border-black/10 dark:bg-white/5'}`}
               style={method === 'EWALLET' ? { background: 'linear-gradient(135deg, #00C16A 0%, #009E52 100%)' } : {}}
            >
               <Smartphone size={24}/>
               <span className="text-[0.5rem] font-black uppercase tracking-widest">Dompet Digital</span>
            </button>
            <button
               onClick={() => { setMethod('CARD'); setSelectedSubMethod(null); }}
               className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all duration-300 active:scale-95 ${method === 'CARD' ? 'border-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'border-black/5 text-gray-400 hover:border-black/10 dark:bg-white/5'}`}
               style={method === 'CARD' ? { background: 'linear-gradient(135deg, #00C16A 0%, #009E52 100%)' } : {}}
            >
               <CreditCard size={24}/>
               <span className="text-[0.5rem] font-black uppercase tracking-widest">Kartu Kredit</span>
            </button>
         </div>
      </ClayCard>

      <div className="min-h-[220px] animate-fade-in">
         {method === 'VA' && (
            <div className="space-y-3">
               <p className="text-[0.6rem] font-black text-gray-400 ml-4 uppercase tracking-[0.2em]">Pilih Bank</p>
               {vaBanks.map(bank => (
                  <button 
                     key={bank.id}
                     onClick={() => setSelectedSubMethod(bank.name)}
                     className={`w-full p-6 bg-white dark:bg-white/5 rounded-[2rem] border-2 transition-all flex items-center justify-between group active:scale-[0.98] ${selectedSubMethod === bank.name ? 'border-emerald-500 shadow-xl shadow-emerald-500/15' : 'border-black/5'}`}
                  >
                     <div className="flex items-center gap-5">
                        <img src={bank.icon} className="h-5 w-auto grayscale group-hover:grayscale-0 transition-all opacity-60 group-hover:opacity-100" alt={bank.name} />
                        <span className="text-sm font-black uppercase tracking-tight text-gray-700 dark:text-gray-200">{bank.name}</span>
                     </div>
                     <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedSubMethod === bank.name ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-black/10'}`}>
                        {selectedSubMethod === bank.name && <Check size={14} strokeWidth={4}/>}
                     </div>
                  </button>
               ))}
            </div>
         )}

         {method === 'EWALLET' && (
            <div className="space-y-3">
               <p className="text-[0.6rem] font-black text-gray-400 ml-4 uppercase tracking-[0.2em]">Pilih Dompet Digital</p>
               <div className="grid grid-cols-1 gap-3">
                  {eWallets.map(wallet => (
                     <button 
                        key={wallet.id}
                        onClick={() => setSelectedSubMethod(wallet.name)}
                        className={`w-full p-6 bg-white dark:bg-white/5 rounded-[2rem] border-2 transition-all flex items-center justify-between group active:scale-[0.98] ${selectedSubMethod === wallet.name ? 'border-emerald-500 shadow-xl shadow-emerald-500/15' : 'border-black/5'}`}
                     >
                        <div className="flex items-center gap-5">
                           <img src={wallet.icon} className="h-8 w-auto object-contain" alt={wallet.name} />
                           <span className="text-sm font-black uppercase tracking-tight text-gray-700 dark:text-gray-200">{wallet.name}</span>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedSubMethod === wallet.name ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-black/10'}`}>
                           {selectedSubMethod === wallet.name && <Check size={14} strokeWidth={4}/>}
                        </div>
                     </button>
                  ))}
               </div>
            </div>
         )}

         {method === 'CARD' && (
            <div className="space-y-3">
               <p className="text-[0.6rem] font-black text-gray-400 ml-4 uppercase tracking-[0.2em]">Pilih Kartu Kredit</p>
               <div className="grid grid-cols-1 gap-3">
                  {creditCards.map(card => (
                     <button 
                        key={card.id}
                        onClick={() => setSelectedSubMethod(card.name)}
                        className={`w-full p-6 bg-white dark:bg-white/5 rounded-[2rem] border-2 transition-all flex items-center justify-between group active:scale-[0.98] ${selectedSubMethod === card.name ? 'border-emerald-500 shadow-xl shadow-emerald-500/15' : 'border-black/5'}`}
                     >
                        <div className="flex items-center gap-5">
                           <img src={card.icon} className="h-6 w-auto object-contain" alt={card.name} />
                           <span className="text-sm font-black uppercase tracking-tight text-gray-700 dark:text-gray-200">{card.name}</span>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedSubMethod === card.name ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-black/10'}`}>
                           {selectedSubMethod === card.name && <Check size={14} strokeWidth={4}/>}
                        </div>
                     </button>
                  ))}
               </div>
               <p className="text-[0.5rem] text-gray-400 ml-4 mt-2 leading-relaxed">Transaksi diproses aman oleh Xendit. Data kartu tidak disimpan SurePath.</p>
            </div>
         )}

         {!method && (
            <div className="flex flex-col items-center justify-center py-12 opacity-40 text-center space-y-4">
               <Zap size={48} strokeWidth={1.5} className="text-emerald-500 animate-pulse"/>
               <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] max-w-[220px]">Pilih metode pembayaran untuk mengaktifkan polis</p>
            </div>
         )}
      </div>

      <div className="space-y-4">
         <button
            onClick={handlePay}
            disabled={!selectedSubMethod || isProcessing || loading}
            className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[2.5rem] font-black uppercase text-base tracking-[0.3em] shadow-2xl active:scale-[0.98] transition-all disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-4 relative overflow-hidden"
         >
            {isProcessing || loading ? (
               <>
                  <Loader2 size={24} className="animate-spin text-emerald-500"/>
                  <span>Memproses...</span>
               </>
            ) : (
               <>
                  <Zap size={24} className="text-emerald-500 fill-emerald-500"/>
                  <span>LANJUT KE TAGIHAN</span>
               </>
            )}
         </button>

         {!isProcessing && (
           <button 
              onClick={handlePayLater}
              className="w-full py-5 bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 rounded-[2.5rem] font-black uppercase text-[0.65rem] tracking-[0.3em] active:scale-95 transition-all flex items-center justify-center gap-3 group hover:border-emerald-500 hover:text-emerald-600"
           >
              <CalendarClock size={18} className="group-hover:text-emerald-500 transition-colors"/>
              BAYAR NANTI (PROSES DULU)
           </button>
         )}
         
         <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 opacity-40 pt-4">
            <div className="flex items-center gap-2"><ShieldCheck size={12}/><span className="text-[0.45rem] font-black uppercase tracking-widest">PCI-DSS Secure</span></div>
            <div className="flex items-center gap-2"><Smartphone size={12}/><span className="text-[0.45rem] font-black uppercase tracking-widest">Gateway Terverifikasi</span></div>
            <div className="flex items-center gap-2"><Info size={12}/><span className="text-[0.45rem] font-black uppercase tracking-widest">SurePath Protection</span></div>
         </div>
      </div>
    </div>
  );
};

export default StepPayment;
