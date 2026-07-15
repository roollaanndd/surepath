// ClaimSensePanel.tsx — AI-powered claim analysis component
// Shows: severity, cost breakdown, estimated working days, fraud risk
// NOTE: AI only estimates — settlement is always by insurer.

import React, { useState } from 'react';
import { Brain, AlertTriangle, Clock, Wrench, Shield, Loader2, TrendingDown } from 'lucide-react';
import { analyzeClaim, type ClaimAnalysis } from '../../services/aiGateway';
import { useToast } from '../ui';

interface Props {
  claimData: {
    description: string;
    vehicleBrand?: string;
    vehicleModel?: string;
    vehicleYear?: number;
    sumInsured?: number;
    policyAgeDays?: number;
    claimHistoryCount?: number;
  };
  onAnalysisComplete?: (analysis: ClaimAnalysis) => void;
}

const ClaimSensePanel: React.FC<Props> = ({ claimData, onAnalysisComplete }) => {
  const toast = useToast();
  const [analysis, setAnalysis] = useState<ClaimAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await analyzeClaim(claimData);
      setAnalysis(result);
      onAnalysisComplete?.(result);
      toast.success('Analisis klaim selesai');
    } catch (e: any) {
      toast.error(`Gagal menganalisis: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const severityColors: Record<string, string> = {
    MINOR: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
    MODERATE: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    MAJOR: 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400',
    SEVERE: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400',
    TOTAL_LOSS: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400',
  };

  const fraudColor = analysis
    ? analysis.fraudRiskScore > 70 ? 'text-rose-600'
      : analysis.fraudRiskScore > 40 ? 'text-amber-600'
      : 'text-emerald-600'
    : '';

  return (
    <div className="rounded-2xl border border-ds-border bg-ds-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <Brain size={16} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-ds-ink">ClaimSense AI</h3>
          <p className="text-[10px] text-ds-ink3">AI-powered claim estimation</p>
        </div>
      </div>

      {/* Analyze button */}
      {!analysis && (
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Menganalisis...
            </>
          ) : (
            <>
              <Brain size={14} />
              Analisis Klaim dengan AI
            </>
          )}
        </button>
      )}

      {/* Results */}
      {analysis && (
        <div className="space-y-3">
          {/* Severity badge */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ds-ink3">Severity</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${severityColors[analysis.severity] ?? 'bg-gray-100 text-gray-600'}`}>
              {analysis.severity.replace('_', ' ')}
            </span>
          </div>

          {/* Cost breakdown */}
          {analysis.estimatedCost.parts.length > 0 && (
            <div className="bg-ds-bg rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-ds-ink3">
                <Wrench size={10} /> Cost Breakdown
              </div>
              {analysis.estimatedCost.parts.map((part, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-ds-ink2">{part.name}</span>
                  <span className="font-mono font-bold text-ds-ink">Rp {part.cost.toLocaleString('id-ID')}</span>
                </div>
              ))}
              {analysis.estimatedCost.labor > 0 && (
                <div className="flex justify-between text-xs pt-1 border-t border-ds-border">
                  <span className="text-ds-ink2">Labor</span>
                  <span className="font-mono font-bold text-ds-ink">Rp {analysis.estimatedCost.labor.toLocaleString('id-ID')}</span>
                </div>
              )}
              {analysis.estimatedCost.paint > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-ds-ink2">Paint</span>
                  <span className="font-mono font-bold text-ds-ink">Rp {analysis.estimatedCost.paint.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between text-xs pt-2 border-t-2 border-ds-border">
                <span className="font-bold text-ds-ink">Total Estimasi</span>
                <span className="font-mono font-black text-ds-green">Rp {analysis.estimatedCost.total.toLocaleString('id-ID')}</span>
              </div>
              <p className="text-[10px] text-ds-ink3 text-right">Range: {analysis.estimatedCost.range}</p>
            </div>
          )}

          {/* Working days */}
          <div className="flex items-center justify-between bg-ds-bg rounded-xl p-3">
            <div className="flex items-center gap-1.5">
              <Clock size={14} className="text-ds-green" />
              <span className="text-xs font-bold text-ds-ink">Estimasi Waktu Kerja</span>
            </div>
            <span className="text-sm font-black text-ds-ink">{analysis.estimatedWorkingDays} hari</span>
          </div>

          {/* Fraud risk */}
          <div className="flex items-center justify-between bg-ds-bg rounded-xl p-3">
            <div className="flex items-center gap-1.5">
              <Shield size={14} className="text-ds-green" />
              <span className="text-xs font-bold text-ds-ink">Fraud Risk Score</span>
            </div>
            <span className={`text-sm font-black ${fraudColor}`}>{analysis.fraudRiskScore}/100</span>
          </div>

          {/* Fraud indicators */}
          {analysis.fraudIndicators.length > 0 && (
            <div className="bg-rose-50 dark:bg-rose-950/20 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-600">
                <AlertTriangle size={10} /> Fraud Indicators
              </div>
              {analysis.fraudIndicators.map((ind, i) => (
                <p key={i} className="text-[11px] text-rose-700 dark:text-rose-400">• {ind}</p>
              ))}
            </div>
          )}

          {/* Recommendation */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">
              <TrendingDown size={10} /> Rekomendasi AI
            </div>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">{analysis.recommendation}</p>
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-2.5">
            <p className="text-[10px] text-amber-700 dark:text-amber-400 text-center">
              ⚠️ {analysis.disclaimer}
            </p>
          </div>

          {/* Re-analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full py-2 rounded-xl border border-ds-border text-ds-ink3 text-xs font-bold active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
            Analisis Ulang
          </button>
        </div>
      )}
    </div>
  );
};

export default ClaimSensePanel;
