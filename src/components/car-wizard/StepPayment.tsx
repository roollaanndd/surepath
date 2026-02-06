import React, { useState } from 'react';
import { 
  CreditCard, Wallet, Smartphone, Landmark, Check, 
  ChevronRight, Lock, ShieldCheck, Zap, ArrowRight,
  Clock, Copy, AlertCircle, Loader2, Info
} from 'lucide-react';
import { formatIDR } from './WizardUI';

interface StepPaymentProps {
  premiumBreakdown: any;
  onPaymentSuccess: (method: string) => void;
  loading: boolean;
}

const StepPayment: React.FC<StepPaymentProps> = ({ premiumBreakdown, onPaymentSuccess, loading }) => {
  const [method, setMethod] = useState<'VA' | 'EWALLET' | 'CC' | null>(null);
  const [selectedSubMethod, setSelectedSubMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = () => {
    setIsProcessing(true);
    // Simulate Xendit Gateway handshake
    setTimeout(() => {
      setIsProcessing(false);
      onPaymentSuccess(selectedSubMethod || 'SurePath Gateway');
    }, 2800);
  };

  const vaBanks = [
    { id: 'BCA', name: 'BCA Virtual Account', icon: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Logo_BCA.svg' },
    { id: 'MANDIRI', name: 'Mandiri Virtual Account', icon: 'https://upload.wikimedia.org/wikipedia/id/f/fa/Bank_Mandiri_logo.svg' },
    { id: 'BNI', name: 'BNI Virtual Account', icon: 'https://upload.wikimedia.org/wikipedia/id/5/55/BNI_logo.svg' }
  ];

  const eWallets = [
    { id: 'OVO', name: 'OVO', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Logo_ovo_purple.svg' },
    { id: 'DANA', name: 'DANA', icon: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Logo_dana_blue.svg' },
    { id: 'QRIS', name: 'QRIS / All E-Wallets', icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_QRIS.svg' }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* Invoice Header */}
      <div className="bg-white dark:bg-white/5 rounded-[2.5rem] border border-black/5 dark:border-white/5 p-8 shadow-xl relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-primary-500"></div>
         <div className="flex justify-between items-start mb-8 relative z-10">
            <div className="space-y-1">
               <p className="text-[0.6rem] font-black text-gray-400 uppercase tracking-[0.2em]">Matrix Invoice Amount</p>
               <h3 className="text-4xl font-black text-primary-500 tracking-tighter drop-shadow-sm">{formatIDR(premiumBreakdown?.totalPayable || 0)}</h3>
            </div>
            <div className="flex flex-col items-end">
               <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full mb-2 border border-blue-500/20">
                  <Lock size={10}/>
                  <span className="text-[0.45rem] font-black uppercase tracking-widest">Neural Secure</span>
               </div>
               <p className="text-[0.5rem] font-bold text-gray-400 uppercase">INV: SP-{Date.now().toString().slice(-6)}</p>
            </div>
         </div>

         {/* Method Selection Toggles */}
         <div className="grid grid-cols-3 gap-3 relative z-10">
            <button 
               onClick={() => { setMethod('VA'); setSelectedSubMethod(null); }}
               className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 ${method === 'VA' ? 'border-primary-500 bg-primary-500/5 text-primary-600' : 'border-black/5 text-gray-400 hover:border-black/10 dark:bg-white/5'}`}
            >
               <Landmark size={24}/>
               <span className="text-[0.5rem] font-black uppercase tracking-widest">Bank VA</span>
            </button>
            <button 
               onClick={() => { setMethod('EWALLET'); setSelectedSubMethod(null); }}
               className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 ${method === 'EWALLET' ? 'border-primary-500 bg-primary-500/5 text-primary-600' : 'border-black/5 text-gray-400 hover:border-black/10 dark:bg-white/5'}`}
            >
               <Smartphone size={24}/>
               <span className="text-[0.5rem] font-black uppercase tracking-widest">E-Wallet</span>
            </button>
            <button 
               onClick={() => { setMethod('CC'); setSelectedSubMethod('Credit Card'); }}
               className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 ${method === 'CC' ? 'border-primary-500 bg-primary-500/5 text-primary-600' : 'border-black/5 text-gray-400 hover:border-black/10 dark:bg-white/5'}`}
            >
               <CreditCard size={24}/>
               <span className="text-[0.5rem] font-black uppercase tracking-widest">Card</span>
            </button>
         </div>
      </div>

      {/* Sub-Method Details Area */}
      <div className="min-h-[250px] animate-fade-in">
         {method === 'VA' && (
            <div className="space-y-3">
               <p className="text-[0.6rem] font-black text-gray-400 ml-4 uppercase tracking-[0.2em]">Select Transfer Protocol</p>
               {vaBanks.map(bank => (
                  <button 
                     key={bank.id}
                     onClick={() => setSelectedSubMethod(bank.name)}
                     className={`w-full p-6 bg-white dark:bg-white/5 rounded-[2rem] border-2 transition-all flex items-center justify-between group active:scale-[0.98] ${selectedSubMethod === bank.name ? 'border-primary-500 shadow-xl' : 'border-black/5'}`}
                  >
                     <div className="flex items-center gap-5">
                        <img src={bank.icon} className="h-5 w-auto grayscale group-hover:grayscale-0 transition-all opacity-60 group-hover:opacity-100" alt={bank.name} />
                        <span className="text-sm font-black uppercase tracking-tight text-gray-700 dark:text-gray-200">{bank.name}</span>
                     </div>
                     <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedSubMethod === bank.name ? 'bg-primary-500 border-primary-500 text-white' : 'border-black/10'}`}>
                        {selectedSubMethod === bank.name && <Check size={14} strokeWidth={4}/>}
                     </div>
                  </button>
               ))}
            </div>
         )}

         {method === 'EWALLET' && (
            <div className="space-y-3">
               <p className="text-[0.6rem] font-black text-gray-400 ml-4 uppercase tracking-[0.2em]">Select Digital Node</p>
               <div className="grid grid-cols-1 gap-3">
                  {eWallets.map(wallet => (
                     <button 
                        key={wallet.id}
                        onClick={() => setSelectedSubMethod(wallet.name)}
                        className={`w-full p-6 bg-white dark:bg-white/5 rounded-[2rem] border-2 transition-all flex items-center justify-between group active:scale-[0.98] ${selectedSubMethod === wallet.name ? 'border-primary-500 shadow-xl' : 'border-black/5'}`}
                     >
                        <div className="flex items-center gap-5">
                           <img src={wallet.icon} className="h-8 w-auto object-contain" alt={wallet.name} />
                           <span className="text-sm font-black uppercase tracking-tight text-gray-700 dark:text-gray-200">{wallet.name}</span>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedSubMethod === wallet.name ? 'bg-primary-500 border-primary-500 text-white' : 'border-black/10'}`}>
                           {selectedSubMethod === wallet.name && <Check size={14} strokeWidth={4}/>}
                        </div>
                     </button>
                  ))}
               </div>
            </div>
         )}

         {method === 'CC' && (
            <div className="p-8 bg-white dark:bg-white/5 rounded-[3rem] border-2 border-primary-500/20 space-y-6 shadow-lg">
               <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                     <CreditCard size={20} className="text-primary-500"/>
                     <h4 className="text-lg font-black uppercase tracking-tighter">Secure Card Access</h4>
                  </div>
                  <div className="flex gap-2">
                     <div className="w-8 h-5 bg-gray-100 dark:bg-white/10 rounded flex items-center justify-center text-[0.4rem] font-black">VISA</div>
                     <div className="w-8 h-5 bg-gray-100 dark:bg-white/10 rounded flex items-center justify-center text-[0.4rem] font-black">MC</div>
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="space-y-1.5">
                     <label className="text-[0.5rem] font-black text-gray-400 uppercase tracking-widest ml-1">PAN (Card Number)</label>
                     <div className="relative">
                        <CreditCard size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input className="w-full bg-gray-50 dark:bg-black/40 border border-black/5 dark:border-white/5 rounded-xl py-4 pl-12 pr-4 text-xs font-mono tracking-widest outline-none focus:border-primary-500" placeholder="4242 4242 4242 4242" />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-[0.5rem] font-black text-gray-400 uppercase tracking-widest ml-1">Expiry (MM/YY)</label>
                        <input className="w-full bg-gray-50 dark:bg-black/40 border border-black/5 dark:border-white/5 rounded-xl py-4 px-4 text-xs font-mono outline-none focus:border-primary-500" placeholder="12 / 28" />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[0.5rem] font-black text-gray-400 uppercase tracking-widest ml-1">CVC / CVV</label>
                        <input className="w-full bg-gray-50 dark:bg-black/40 border border-black/5 dark:border-white/5 rounded-xl py-4 px-4 text-xs font-mono outline-none focus:border-primary-500" placeholder="***" type="password" />
                     </div>
                  </div>
               </div>
            </div>
         )}

         {!method && (
            <div className="flex flex-col items-center justify-center py-16 opacity-30 text-center space-y-4">
               <AlertCircle size={48} strokeWidth={1.5}/>
               <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] max-w-[200px]">Waiting for checkout protocol selection</p>
            </div>
         )}
      </div>

      {/* Action Footer */}
      <div className="space-y-5">
         <button 
            onClick={handlePay}
            disabled={!selectedSubMethod || isProcessing}
            className="w-full py-6 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[2.5rem] font-black uppercase text-base tracking-[0.3em] shadow-2xl active:scale-[0.98] transition-all disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-4 relative overflow-hidden"
         >
            {isProcessing ? (
               <>
                  <Loader2 size={24} className="animate-spin text-primary-500"/>
                  <span>Matrix Handshake...</span>
               </>
            ) : (
               <>
                  <Zap size={24} className="text-primary-500 fill-primary-500"/>
                  <span>AUTHENTICATE & PAY</span>
               </>
            )}
         </button>
         
         <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 opacity-40">
            <div className="flex items-center gap-2"><ShieldCheck size={12}/><span className="text-[0.45rem] font-black uppercase tracking-widest">PCI-DSS Level 1</span></div>
            <div className="flex items-center gap-2"><Smartphone size={12}/><span className="text-[0.45rem] font-black uppercase tracking-widest">Xendit Handshake</span></div>
            <div className="flex items-center gap-2"><Info size={12}/><span className="text-[0.45rem] font-black uppercase tracking-widest">Powered by SurePath Pay</span></div>
         </div>
      </div>
    </div>
  );
};

export default StepPayment;