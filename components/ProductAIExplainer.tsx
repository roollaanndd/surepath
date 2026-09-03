import React, { useState, useEffect } from 'react';
import {
  X, FileText, Check, ShieldCheck,
  Activity, Info,
  ArrowRight, Sparkles,
} from 'lucide-react';
import { explainProductAI, ProductExplanation } from '../services/geminiService';
import { Language } from '../types';

interface ProductAIExplainerProps {
  productName: string;
  lang: Language;
  onClose: () => void;
}

// Landing-page product summary generated on demand.
//
// The content of this panel is produced by a language model, so it is labelled
// as such and carries a disclaimer: nothing here is a quotation, a coverage
// commitment, or a substitute for the policy wording. The prompt behind it
// (services/geminiService.ts → explainProductAI) forbids numbers, guarantees
// and invented features for the same reason.
const ProductAIExplainer: React.FC<ProductAIExplainerProps> = ({ productName, lang, onClose }) => {
  const [data, setData] = useState<ProductExplanation | null>(null);
  const [loading, setLoading] = useState(true);
  const isEN = lang === Language.EN;

  useEffect(() => {
    let cancelled = false;
    const fetchExplanation = async () => {
      setLoading(true);
      const res = await explainProductAI(productName, lang);
      if (cancelled) return;
      if (res.success && res.data) setData(res.data);
      setLoading(false);
    };
    fetchExplanation();
    return () => { cancelled = true; };
  }, [productName, lang]);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-3xl glass-card rounded-[2.5rem] border border-white/10 shadow-[0_0_100px_rgba(16,185,129,0.15)] overflow-hidden relative flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <FileText size={26} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-[0.6rem] font-black uppercase text-gray-500 tracking-[0.3em] mb-1">
                {isEN ? 'Product Summary' : 'Ringkasan Produk'}
              </p>
              <h3 className="text-2xl font-black tracking-tight text-white">{productName}</h3>
            </div>
          </div>
          <button onClick={onClose} aria-label={isEN ? 'Close' : 'Tutup'}
            className="p-3 bg-white/5 rounded-2xl hover:bg-rose-500 hover:text-white transition-all border border-white/5">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-8 no-scrollbar bg-slate-900">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-6">
              <Sparkles size={40} className="text-emerald-500 animate-pulse" />
              <p className="text-sm font-bold text-gray-400">
                {isEN ? 'Preparing the summary…' : 'Menyiapkan ringkasan…'}
              </p>
            </div>
          ) : data ? (
            <>
              {/* Summary */}
              <p className="text-lg md:text-xl font-medium leading-relaxed text-gray-200 border-l-4 border-emerald-500 pl-6">
                {data.summary}
              </p>

              {/* Benefits */}
              {data.benefits?.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4">
                  {data.benefits.map((ben, i) => (
                    <div key={i} className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-emerald-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Check size={16} className="text-emerald-500" strokeWidth={3} />
                        </div>
                        <h4 className="font-bold text-base text-white leading-tight">{ben.title}</h4>
                      </div>
                      <p className="text-sm text-gray-400 leading-relaxed">{ben.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Data protection + claim process */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl space-y-3">
                  <div className="flex items-center gap-2.5 text-emerald-500">
                    <ShieldCheck size={16} />
                    <span className="text-[0.6rem] font-black uppercase tracking-widest">
                      {isEN ? 'Your Data' : 'Data Anda'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{data.dataProtection}</p>
                </div>
                <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl space-y-3">
                  <div className="flex items-center gap-2.5 text-blue-400">
                    <Activity size={16} />
                    <span className="text-[0.6rem] font-black uppercase tracking-widest">
                      {isEN ? 'Claim Process' : 'Proses Klaim'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{data.claimProcess}</p>
                </div>
              </div>

              {/* Mandatory disclaimer — this content is model-generated */}
              <div className="flex items-start gap-3 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                <Info size={15} className="flex-shrink-0 mt-0.5 text-gray-500" />
                <p className="text-xs leading-relaxed text-gray-500">
                  {isEN
                    ? 'This summary is generated automatically and is for general information only. It is not a quotation and not a coverage commitment. Actual benefits, exclusions, and premiums follow the policy issued by the OJK-licensed insurer.'
                    : 'Ringkasan ini dibuat secara otomatis dan hanya bersifat informasi umum. Ini bukan penawaran harga dan bukan jaminan pertanggungan. Manfaat, pengecualian, dan premi yang berlaku mengikuti polis yang diterbitkan oleh perusahaan asuransi berizin OJK.'}
                </p>
              </div>
            </>
          ) : (
            <div className="py-20 text-center space-y-3">
              <p className="text-sm font-bold text-gray-300">
                {isEN ? 'The summary could not be loaded right now.' : 'Ringkasan tidak dapat dimuat saat ini.'}
              </p>
              <p className="text-xs text-gray-500">
                {isEN ? 'Please try again, or contact our team.' : 'Silakan coba lagi, atau hubungi tim kami.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="p-6 md:p-8 bg-black/40 border-t border-white/5 flex justify-end">
          <button onClick={onClose}
            className="px-10 py-4 bg-emerald-500 text-white rounded-full font-black uppercase text-[0.7rem] tracking-[0.25em] hover:bg-emerald-600 transition-all shadow-xl active:scale-95 flex items-center gap-3 group">
            {isEN ? 'Close' : 'Tutup'} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductAIExplainer;
