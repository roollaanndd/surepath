// InsurerAIPanel.tsx — AI-powered insurer decision recommendation
// Shows: APPROVE/DECLINE/REQUEST_INFO + risk score + reasoning + red flags
// NOTE: AI recommends — final decision is always by insurer.

import React, { useState } from 'react';
import { Brain, AlertTriangle, CheckCircle, XCircle, HelpCircle, Loader2, Shield } from 'lucide-react';
import { getInsurerAIRecommendation, type InsurerAIRecommendation } from '../../services/aiGateway';
import { useToast } from '../ui';

interface Props {
  orderData: {
    orderNumber: string;
    clientName: string;
    vehicleBrand: string;
    vehicleModel: string;
    vehicleYear: number;
    sumInsured: number;
    totalPremium: number;
    coverageType: string;
    insurerName: string;
    agentName: string;
    agentVerified: boolean;
    promoCode?: string;
    discountRate?: number;
    previousClaims?: number;
  };
  onRecommendation?: (rec: InsurerAIRecommendation) => void;
}

const InsurerAIPanel: React.FC<Props> = ({ orderData, onRecommendation }) => {
  const toast = useToast();
  const [rec, setRec] = useState<InsurerAIRecommendation | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await getInsurerAIRecommendation(orderData);
      setRec(result);
      onRecommendation?.(result);
      toast.success('Rekomendasi AI siap');
    } catch (e: any) {
      toast.error(`Gagal: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const decisionConfig = {
    APPROVE: { icon: CheckCircle, color: 'text-ds-green', bg: 'bg-emerald-50 dark:bg-emerald-950/20', label: 'APPROVE' },
    DECLINE: { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/20', label: 'DECLINE' },
    REQUEST_INFO: { icon: HelpCircle, color: 'text-ds-amber', bg: 'bg-amber-50 dark:bg-amber-950/20', label: 'REQUEST INFO' },
  };

  const riskColor = rec
    ? rec.riskScore > 70 ? 'text-rose-600'
      : rec.riskScore > 40 ? 'text-ds-amber'
      : 'text-ds-green'
    : '';

  return (
    <div className="rounded-2xl border border-ds-border bg-ds-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
          <Brain size={16} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-ds-ink">InsurerAI</h3>
          <p className="text-[10px] text-ds-ink3">AI decision recommendation</p>
        </div>
      </div>

      {/* Analyze button */}
      {!rec && (
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Menganalisis...
            </>
          ) : (
            <>
              <Brain size={14} />
              Dapatkan Rekomendasi AI
            </>
          )}
        </button>
      )}

      {/* Results */}
      {rec && (
        <div className="space-y-3">
          {/* Decision badge */}
          {(() => {
            const cfg = decisionConfig[rec.decision] ?? decisionConfig.REQUEST_INFO;
            const Icon = cfg.icon;
            return (
              <div className={`flex items-center gap-2 ${cfg.bg} rounded-xl p-3`}>
                <Icon size={20} className={cfg.color} />
                <div>
                  <p className={`text-sm font-black ${cfg.color}`}>{cfg.label}</p>
                  <p className="text-[10px] text-ds-ink3">Confidence: {rec.confidence}</p>
                </div>
              </div>
            );
          })()}

          {/* Risk score */}
          <div className="flex items-center justify-between bg-ds-bg rounded-xl p-3">
            <div className="flex items-center gap-1.5">
              <Shield size={14} className="text-ds-green" />
              <span className="text-xs font-bold text-ds-ink">Risk Score</span>
            </div>
            <span className={`text-sm font-black ${riskColor}`}>{rec.riskScore}/100</span>
          </div>

          {/* Reasoning */}
          <div className="bg-ds-bg rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ds-ink3 mb-1">Reasoning</p>
            <p className="text-xs text-ds-ink2 leading-relaxed">{rec.reasoning}</p>
          </div>

          {/* Red flags */}
          {rec.redFlags.length > 0 && (
            <div className="bg-rose-50 dark:bg-rose-950/20 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-600">
                <AlertTriangle size={10} /> Red Flags
              </div>
              {rec.redFlags.map((flag, i) => (
                <p key={i} className="text-[11px] text-rose-700 dark:text-rose-400">• {flag}</p>
              ))}
            </div>
          )}

          {/* Suggested terms */}
          {rec.suggestedTerms && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-3 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ds-green">Suggested Terms</p>
              {rec.suggestedTerms.deductible && (
                <p className="text-xs text-emerald-800 dark:text-emerald-300">Deductible: {rec.suggestedTerms.deductible}</p>
              )}
              {rec.suggestedTerms.tplLimit && (
                <p className="text-xs text-emerald-800 dark:text-emerald-300">TPL Limit: {rec.suggestedTerms.tplLimit}</p>
              )}
              {rec.suggestedTerms.additionalEndorsements && rec.suggestedTerms.additionalEndorsements.length > 0 && (
                <div>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">Endorsements:</p>
                  {rec.suggestedTerms.additionalEndorsements.map((e, i) => (
                    <p key={i} className="text-[11px] text-emerald-700 dark:text-emerald-400 pl-2">• {e}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-2.5">
            <p className="text-[10px] text-amber-700 dark:text-amber-400 text-center">
              ⚠️ {rec.disclaimer}
            </p>
          </div>

          {/* Re-analyze */}
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

export default InsurerAIPanel;
