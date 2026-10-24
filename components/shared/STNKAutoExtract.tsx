// STNKAutoExtract.tsx — Upload STNK → AI extracts vehicle data → generates quote
// Integrates with AgentQuoteBuilder + Customer buy flow

import React, { useState, useRef } from 'react';
import { Camera, Loader2, Car, Sparkles, CheckCircle, ArrowRight } from 'lucide-react';
import { extractSTNKAndRecommend, type STNKExtractionResult, type QuoteRecommendation } from '../../services/aiGateway';
import { useToast } from '../ui';

interface Props {
  onExtracted?: (data: { extraction: STNKExtractionResult; recommendation: QuoteRecommendation }) => void;
  compact?: boolean;
}

const STNKAutoExtract: React.FC<Props> = ({ onExtracted, compact = false }) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ extraction: STNKExtractionResult; recommendation: QuoteRecommendation } | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG)');
      return;
    }

    setLoading(true);
    try {
      // Convert to data URL
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        try {
          const res = await extractSTNKAndRecommend(dataUrl);
          setResult(res);
          onExtracted?.(res);
          toast.success('STNK berhasil dibaca! Rekomendasi siap.');
        } catch (e: any) {
          toast.error(`Gagal menganalisis STNK: ${e.message}`);
        } finally {
          setLoading(false);
        }
      };
      reader.onerror = () => {
        toast.error('Gagal membaca file');
        setLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      toast.error(`Error: ${e.message}`);
      setLoading(false);
    }
  };

  const fmtIDR = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  return (
    <div className={`rounded-2xl border border-ds-border bg-ds-card ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <Sparkles size={16} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-ds-ink">AI STNK Extract</h3>
          <p className="text-[10px] text-ds-ink3">Upload STNK → auto-quote</p>
        </div>
      </div>

      {/* Upload area */}
      {!result && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-full border-2 border-dashed border-ds-border rounded-xl py-6 flex flex-col items-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={24} className="animate-spin text-ds-green" />
                <p className="text-xs font-bold text-ds-ink3">AI sedang membaca STNK...</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-ds-green-tint flex items-center justify-center">
                  <Camera size={20} className="text-ds-green" />
                </div>
                <p className="text-xs font-bold text-ds-ink">Foto / Upload STNK</p>
                <p className="text-[10px] text-ds-ink3">AI akan ekstrak data kendaraan otomatis</p>
              </>
            )}
          </button>
        </>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* Extracted data */}
          <div className="bg-ds-bg rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-ds-green">
              <CheckCircle size={10} /> Data STNK
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-ds-ink3 text-[10px]">Merk/Model</p>
                <p className="font-bold text-ds-ink">{result.extraction.brand} {result.extraction.model}</p>
              </div>
              <div>
                <p className="text-ds-ink3 text-[10px]">Tahun</p>
                <p className="font-bold text-ds-ink">{result.extraction.year}</p>
              </div>
              <div>
                <p className="text-ds-ink3 text-[10px]">No. Polisi</p>
                <p className="font-mono font-bold text-ds-ink">{result.extraction.plateNumber}</p>
              </div>
              <div>
                <p className="text-ds-ink3 text-[10px]">Kategori</p>
                <p className="font-bold text-ds-ink">{result.extraction.vehicleCategory}</p>
              </div>
              <div className="col-span-2">
                <p className="text-ds-ink3 text-[10px]">Estimasi Nilai Pasar</p>
                <p className="font-mono font-black text-ds-green">{fmtIDR(result.extraction.estimatedMarketValue)}</p>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-ds-green">
              <Car size={10} /> Rekomendasi AI
            </div>
            <div className="space-y-1">
              <p className="text-xs text-ds-ink">
                <span className="text-ds-ink3">Insurer:</span>{' '}
                <span className="font-bold">{result.recommendation.recommendedInsurer}</span>
              </p>
              <p className="text-xs text-ds-ink">
                <span className="text-ds-ink3">Produk:</span>{' '}
                <span className="font-bold">{result.recommendation.recommendedProduct}</span>
              </p>
              <p className="text-xs text-ds-ink">
                <span className="text-ds-ink3">Coverage:</span>{' '}
                <span className="font-bold">{result.recommendation.coverageType}</span>
              </p>
              <div className="flex justify-between items-center pt-1 border-t border-emerald-200 dark:border-emerald-800">
                <span className="text-xs text-ds-ink3">Estimasi Premi:</span>
                <span className="font-mono font-black text-ds-green">{fmtIDR(result.recommendation.estimatedPremium)}</span>
              </div>
              <p className="text-[10px] text-ds-ink3 text-right">
                Range: {fmtIDR(result.recommendation.premiumRange.min)} - {fmtIDR(result.recommendation.premiumRange.max)}
              </p>
            </div>

            {/* Features */}
            {result.recommendation.features.length > 0 && (
              <div className="pt-1">
                <p className="text-[10px] font-bold text-ds-ink3 mb-1">Features:</p>
                {result.recommendation.features.slice(0, 3).map((f, i) => (
                  <p key={i} className="text-[10px] text-ds-ink2">✓ {f}</p>
                ))}
              </div>
            )}
          </div>

          {/* Alternative options */}
          {result.recommendation.alternativeOptions.length > 0 && (
            <div className="bg-ds-bg rounded-xl p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ds-ink3 mb-1">Alternatif Lain</p>
              {result.recommendation.alternativeOptions.map((alt, i) => (
                <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-ds-border last:border-0">
                  <div>
                    <p className="font-bold text-ds-ink">{alt.insurer}</p>
                    <p className="text-[10px] text-ds-ink3">{alt.pros}</p>
                  </div>
                  <span className="font-mono font-bold text-ds-ink">{fmtIDR(alt.premium)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Next steps */}
          {result.recommendation.nextSteps.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ds-amber mb-1">Next Steps</p>
              {result.recommendation.nextSteps.map((step, i) => (
                <p key={i} className="text-[11px] text-amber-800 dark:text-amber-300">{i + 1}. {step}</p>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => { setResult(null); }}
              className="flex-1 py-2 rounded-xl border border-ds-border text-ds-ink3 text-xs font-bold active:scale-95 transition-transform"
            >
              Upload Ulang
            </button>
            <button
              onClick={() => onExtracted?.(result)}
              className="flex-1 py-2 rounded-xl bg-ds-green text-ds-on-green text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-1"
            >
              Lanjut <ArrowRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default STNKAutoExtract;
