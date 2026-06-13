
import React, { useState, useEffect } from 'react';
import { 
  X, Cpu, Zap, ShieldCheck, Terminal, 
  Activity, Binary, 
  ArrowRight, BrainCircuit
} from 'lucide-react';
import { explainProductAI, ProductExplanation } from '../services/geminiService';
import { Language } from '../types';

interface ProductAIExplainerProps {
  productName: string;
  lang: Language;
  onClose: () => void;
}

const ProductAIExplainer: React.FC<ProductAIExplainerProps> = ({ productName, lang, onClose }) => {
  const [data, setData] = useState<ProductExplanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fetchExplanation = async () => {
      setLoading(true);
      const res = await explainProductAI(productName, lang);
      if (res.success && res.data) {
        setData(res.data);
      }
      setLoading(false);
    };
    
    fetchExplanation();
    
    // Simulate diagnostic loading
    const interval = setInterval(() => {
      setProgress(p => (p >= 100 ? 100 : p + 2));
    }, 40);
    return () => clearInterval(interval);
  }, [productName, lang]);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-4xl glass-card rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(16,185,129,0.2)] overflow-hidden relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-[1.5rem] flex items-center justify-center border border-emerald-500/20 shadow-inner">
               <Cpu size={32} className="text-emerald-500 animate-pulse"/>
            </div>
            <div>
              <p className="text-[0.6rem] font-black uppercase text-gray-500 tracking-[0.4em] mb-1">Product Analysis</p>
              <h3 className="text-2xl font-black uppercase tracking-tighter text-white">
                Details: <span className="text-emerald-500">{productName}</span>
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl hover:bg-rose-500 hover:text-white transition-all border border-white/5 group">
            <X size={24}/>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-12 no-scrollbar bg-slate-900 relative">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-8 animate-pulse">
               <div className="relative">
                  <div className="w-24 h-24 border-4 border-emerald-500/20 rounded-full animate-ping opacity-20"></div>
                  <BrainCircuit size={64} className="text-emerald-500 relative z-10" />
               </div>
               <div className="text-center space-y-3">
                  <p className="text-[0.8rem] font-black text-white uppercase tracking-[0.6em]">Analyzing Product</p>
                  <div className="w-64 h-1 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-emerald-500 shadow-[0_0_20px_#10b981]" style={{ width: `${progress}%` }}></div>
                  </div>
                  <p className="text-[0.55rem] font-mono text-gray-500 uppercase tracking-widest">Loading Details...</p>
               </div>
            </div>
          ) : data ? (
            <>
              {/* Summary Section */}
              <div className="space-y-6 animate-fade-in">
                 <div className="flex items-center gap-4 text-emerald-500">
                    <Terminal size={18}/>
                    <p className="text-[0.7rem] font-black uppercase tracking-[0.3em]">Summary</p>
                 </div>
                 <p className="text-xl md:text-2xl font-medium leading-relaxed text-gray-200 border-l-4 border-emerald-500 pl-8">
                    {data.technicalSummary}
                 </p>
              </div>

              {/* Grid Features */}
              <div className="grid md:grid-cols-2 gap-6 animate-fade-in animation-delay-200">
                 {data.benefits.map((ben, i) => (
                    <div key={i} className="p-8 bg-white/[0.03] border border-white/5 rounded-[2.5rem] group hover:border-emerald-500/30 transition-all">
                       <div className="flex items-center gap-4 mb-6">
                          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                             <Zap size={20} className="text-white"/>
                          </div>
                          <h4 className="font-black text-lg uppercase tracking-tight text-white">{ben.title}</h4>
                       </div>
                       <p className="text-[0.9rem] text-gray-400 leading-relaxed font-medium">
                          {ben.desc}
                       </p>
                    </div>
                 ))}
              </div>

              {/* Stats Footer Section */}
              <div className="grid md:grid-cols-3 gap-6 animate-fade-in animation-delay-400 pt-6">
                 <div className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl space-y-4">
                    <div className="flex items-center gap-3 text-emerald-500">
                       <ShieldCheck size={18}/>
                       <span className="text-[0.6rem] font-black uppercase tracking-widest">Security Grade</span>
                    </div>
                    <p className="text-[0.85rem] font-bold text-gray-300 uppercase leading-relaxed">{data.securityProtocol}</p>
                 </div>
                 
                 <div className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex flex-col justify-center items-center text-center gap-4">
                    <p className="text-[0.6rem] font-black text-emerald-500 uppercase tracking-widest">Impact Score</p>
                    <div className="relative w-24 h-24 flex items-center justify-center">
                       <svg className="w-full h-full transform -rotate-90">
                          <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5"/>
                          <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={276.4} strokeDashoffset={276.4 - (276.4 * data.impactScore / 100)} className="text-emerald-500 drop-shadow-[0_0_10px_#10b981] transition-all duration-[2000ms]"/>
                       </svg>
                       <span className="absolute text-2xl font-black text-white">{data.impactScore}</span>
                    </div>
                 </div>

                 <div className="p-8 bg-blue-500/5 border border-blue-500/10 rounded-3xl space-y-4">
                    <div className="flex items-center gap-3 text-blue-500">
                       <Activity size={18}/>
                       <span className="text-[0.6rem] font-black uppercase tracking-widest">Payout Logic</span>
                    </div>
                    <p className="text-[0.85rem] font-bold text-gray-300 uppercase leading-relaxed">{data.payoutLogic}</p>
                 </div>
              </div>
            </>
          ) : (
             <div className="py-20 text-center text-rose-500 uppercase font-black tracking-widest">
                Data Fetch Error: Connection Terminated.
             </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="p-8 bg-black/40 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-4 opacity-40">
              <Binary size={16}/>
              <span className="text-[0.55rem] font-mono uppercase tracking-[0.4em]">SECURE_SESSION_ACTIVE</span>
           </div>
           <button onClick={onClose} className="px-12 py-5 bg-emerald-500 text-white rounded-full font-black uppercase text-[0.7rem] tracking-[0.3em] hover:bg-emerald-600 transition-all shadow-xl active:scale-95 flex items-center gap-4 group">
              Get Started <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform"/>
           </button>
        </div>
      </div>
    </div>
  );
};

export default ProductAIExplainer;
