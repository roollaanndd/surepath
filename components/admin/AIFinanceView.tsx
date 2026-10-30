import React, { useState, useCallback } from 'react';
import {
  Bot, TrendingUp, AlertTriangle, CheckCircle, RefreshCw,
  DollarSign, BarChart3, ShieldAlert, Zap,
} from 'lucide-react';
import { runAIFinanceReview, type AIFinanceReview } from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';

const SEVERITY_BG: Record<string, string> = {
  LOW:      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  MEDIUM:   'bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/20',
  HIGH:     'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  CRITICAL: 'bg-red-600/20 text-red-700 dark:text-red-400 border-red-500/30',
};

const PRIORITY_COLOR: Record<string, string> = {
  LOW:    'text-ds-ink3',
  MEDIUM: 'text-amber-800 dark:text-amber-400',
  HIGH:   'text-rose-700 dark:text-rose-300',
};

const HEALTH_COLOR = (score: number) => {
  if (score >= 75) return 'text-emerald-700 dark:text-emerald-400';
  if (score >= 50) return 'text-amber-800 dark:text-amber-400';
  return 'text-rose-700 dark:text-rose-300';
};

const HEALTH_LABEL = (score: number) => {
  if (score >= 75) return 'Sehat';
  if (score >= 50) return 'Perlu Perhatian';
  return 'Kritis';
};

const AIFinanceView: React.FC = () => {
  const [analysis, setAnalysis] = useState<AIFinanceReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState(30);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await runAIFinanceReview(period);
    if (!result) {
      setError('Gagal menjalankan analisis. Layanan AI belum dikonfigurasi. Hubungi administrator sistem.');
    } else {
      setAnalysis(result);
    }
    setLoading(false);
  }, [period]);

  const s = analysis?.summary;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-emerald-500/15 rounded-xl flex items-center justify-center">
              <Bot size={14} className="text-emerald-700 dark:text-emerald-400" />
            </div>
            <p className="text-2xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">AI Finance Agent</p>
          </div>
          <h2 className="text-2xl font-black text-ds-ink">Analisis Keuangan Cerdas</h2>
          <p className="text-xs text-ds-ink3 mt-1">Analisis keuangan mendalam dengan kecerdasan buatan SurePath AI</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-ds-card2 border border-ds-border rounded-2xl px-3 py-2">
            <span className="text-2xs font-black uppercase tracking-widest text-ds-ink3">Periode</span>
            <select
              value={period}
              onChange={e => setPeriod(+e.target.value)}
              className="bg-transparent text-ds-ink text-2xs font-black focus:outline-none"
            >
              {[7, 14, 30, 60, 90].map(d => (
                <option key={d} value={d} className="bg-ds-card">{d} hari</option>
              ))}
            </select>
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-50 transition-colors"
          >
            {loading ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
            {loading ? 'Menganalisis…' : 'Jalankan Analisis'}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {!analysis && !loading && !error && (
        <div className="text-center py-20 bg-white/[0.01] border border-ds-border rounded-[2rem]">
          <div className="w-16 h-16 mx-auto bg-emerald-500/10 rounded-[1.5rem] flex items-center justify-center mb-4">
            <BarChart3 size={28} className="text-emerald-700 dark:text-emerald-400" />
          </div>
          <p className="text-ds-ink font-black text-lg mb-2">Siap Menganalisis</p>
          <p className="text-ds-ink3 text-sm mb-6 max-w-xs mx-auto">
            Klik "Jalankan Analisis" untuk mendapatkan laporan keuangan mendalam dari AI Finance Agent
          </p>
          <button
            onClick={runAnalysis}
            className="px-8 py-3 bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-400 transition-colors"
          >
            <Bot size={14} className="inline mr-2" />
            Jalankan Analisis
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center py-20 gap-4">
          <div className="w-14 h-14 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3">AI sedang menganalisis data keuangan…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3">
          <AlertTriangle size={16} className="text-rose-700 dark:text-rose-300 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-700 dark:text-rose-200">{error}</p>
        </div>
      )}

      {/* Results */}
      {analysis && !loading && (
        <>
          {/* Critical alerts */}
          {analysis.alerts.length > 0 && (
            <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-[2rem] space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert size={14} className="text-red-700 dark:text-red-400" />
                <p className="text-2xs font-black uppercase tracking-widest text-red-700 dark:text-red-400">Peringatan Kritis</p>
              </div>
              {analysis.alerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-red-700 dark:text-red-300 font-black text-sm mt-0.5">!</span>
                  <p className="text-sm text-red-700 dark:text-red-300">{alert}</p>
                </div>
              ))}
            </div>
          )}

          {/* Health score + summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2 md:col-span-1 bg-ds-card2 border border-ds-border rounded-[2rem] p-6 flex flex-col items-center justify-center">
              <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3 mb-2">Skor Kesehatan</p>
              <p className={`text-5xl font-black ${HEALTH_COLOR(analysis.health_score)}`}>{analysis.health_score}</p>
              <p className={`text-2xs font-black uppercase tracking-widest mt-1 ${HEALTH_COLOR(analysis.health_score)}`}>{HEALTH_LABEL(analysis.health_score)}</p>
            </div>
            {s && [
              { label: 'Total GWP', value: formatIDR(s.total_gwp), icon: TrendingUp, color: 'text-emerald-700 dark:text-emerald-400' },
              { label: 'Total Komisi', value: formatIDR(s.total_commissions), icon: DollarSign, color: 'text-blue-700 dark:text-blue-400' },
              { label: 'Pendapatan Bersih', value: formatIDR(s.net_revenue ?? (s.total_gwp - s.total_commissions - (s.total_claims ?? 0))), icon: CheckCircle, color: 'text-emerald-700 dark:text-emerald-400' },
            ].map(metric => (
              <div key={metric.label} className="bg-ds-card2 border border-ds-border rounded-[2rem] p-5">
                <div className={`w-8 h-8 rounded-xl bg-ds-card2 flex items-center justify-center mb-3 ${metric.color}`}>
                  <metric.icon size={16} />
                </div>
                <p className={`text-xl font-black ${metric.color}`}>{metric.value}</p>
                <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3 mt-1">{metric.label}</p>
              </div>
            ))}
          </div>

          {/* Key ratios */}
          {s && (
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: 'Rasio Komisi',
                  value: `${((s.commission_ratio ?? 0) * 100).toFixed(1)}%`,
                  target: '< 25%',
                  ok: (s.commission_ratio ?? 0) < 0.25,
                },
                {
                  label: 'Rasio Klaim',
                  value: `${((s.claim_ratio ?? 0) * 100).toFixed(1)}%`,
                  target: '< 70%',
                  ok: (s.claim_ratio ?? 0) < 0.70,
                },
              ].map(ratio => (
                <div key={ratio.label} className={`p-4 rounded-2xl border ${ratio.ok ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3">{ratio.label}</p>
                    <span className={`text-2xs font-black ${ratio.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-300'}`}>{ratio.ok ? '✓' : '✗'} Target {ratio.target}</span>
                  </div>
                  <p className={`text-2xl font-black ${ratio.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-300'}`}>{ratio.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* AI Insights */}
          <div className="bg-ds-card2 border border-ds-border rounded-[2rem] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bot size={14} className="text-emerald-700 dark:text-emerald-400" />
              <p className="text-2xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Analisis AI</p>
            </div>
            <p className="text-sm text-ds-ink2 leading-relaxed whitespace-pre-line">{analysis.insights}</p>
          </div>

          {/* Anomalies */}
          {analysis.anomalies.length > 0 && (
            <div className="space-y-3">
              <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3">Anomali Terdeteksi ({analysis.anomalies.length})</p>
              {analysis.anomalies.map((a, i) => (
                <div key={i} className={`flex items-start gap-3 p-4 rounded-2xl border ${SEVERITY_BG[a.severity] ?? SEVERITY_BG.MEDIUM}`}>
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-2xs font-black uppercase tracking-widest opacity-70">{a.severity}</span>
                      {a.amount && <span className="text-2xs font-black">{formatIDR(a.amount)}</span>}
                    </div>
                    <p className="text-sm font-medium">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div className="space-y-3">
              <p className="text-2xs font-black uppercase tracking-widest text-ds-ink3">Rekomendasi Tindakan</p>
              {analysis.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-ds-card2 border border-ds-border rounded-2xl">
                  <div className={`w-6 h-6 rounded-full bg-ds-card2 flex items-center justify-center flex-shrink-0 text-xs font-black ${PRIORITY_COLOR[r.priority]}`}>{i + 1}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-2xs font-black uppercase tracking-widest ${PRIORITY_COLOR[r.priority]}`}>{r.priority}</span>
                    </div>
                    <p className="text-sm font-bold text-ds-ink">{r.action}</p>
                    <p className="text-xs text-ds-ink3 mt-0.5">{r.impact}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <p className="text-2xs text-ds-ink2 text-center">
            Analisis dihasilkan {analysis.generated_at ? new Date(analysis.generated_at).toLocaleString('id-ID') : ''}
            {' '}· Periode {analysis.period_days} hari · Didukung SurePath AI
          </p>
        </>
      )}
    </div>
  );
};

export default AIFinanceView;
