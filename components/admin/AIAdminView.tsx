import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot, CheckCircle, AlertTriangle, RefreshCw,
  Zap, ChevronRight, Clock, Eye, Sparkles,
} from 'lucide-react';
import {
  getAllOrders, updateOrderStatus, runAIPolicyReview,
  type SpPolicyOrder, type AIPolicyReview,
} from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';

const RISK_COLOR: Record<string, string> = {
  LOW:    'text-ds-green',
  MEDIUM: 'text-ds-amber',
  HIGH:   'text-red-600',
};

const REC_STYLE: Record<string, string> = {
  APPROVE:      'bg-emerald-100 text-emerald-700',
  REJECT:       'bg-red-100 text-red-700',
  REQUEST_INFO: 'bg-amber-100 text-amber-700',
};

interface OrderWithAI extends SpPolicyOrder {
  _aiReview?: AIPolicyReview | null;
  _analyzing?: boolean;
  _error?: string;
}

const AIAdminView: React.FC = () => {
  const [orders, setOrders] = useState<OrderWithAI[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OrderWithAI | null>(null);
  const [applying, setApplying] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [autoThreshold, setAutoThreshold] = useState(90);
  const [runningBatch, setRunningBatch] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const all = await getAllOrders();
    setOrders(all.filter(o => o.status === 'SUBMITTED' || o.status === 'UNDER_REVIEW'));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const analyzeOrder = async (order: OrderWithAI) => {
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, _analyzing: true, _error: undefined } : o));
    const result = await runAIPolicyReview(order.id);
    setOrders(prev => prev.map(o => o.id === order.id
      ? { ...o, _analyzing: false, _aiReview: result, _error: result ? undefined : 'Gagal menganalisis' }
      : o
    ));
    if (selected?.id === order.id) {
      setSelected(prev => prev ? { ...prev, _analyzing: false, _aiReview: result } : null);
    }
  };

  const analyzeAll = async () => {
    setRunningBatch(true);
    const pending = orders.filter(o => !o._aiReview && !o._analyzing);
    // FIX v1.42.0: parallelize with concurrency limit of 5.
    // Previously sequential — 50 orders × ~6s LLM call = 5 minutes.
    // Now: 5 in flight at a time → ~1 minute for 50 orders.
    const CONCURRENCY = 5;
    const queue = [...pending];
    const workers: Promise<void>[] = [];
    for (let w = 0; w < CONCURRENCY; w++) {
      workers.push((async () => {
        while (queue.length > 0) {
          const order = queue.shift();
          if (!order) break;
          await analyzeOrder(order);
        }
      })());
    }
    await Promise.all(workers);
    setRunningBatch(false);
  };

  const applyDecision = async (order: OrderWithAI, rec: AIPolicyReview) => {
    if (rec.recommendation === 'REQUEST_INFO') {
      console.warn('Gunakan "Mulai Review" dan tambahkan catatan untuk meminta informasi tambahan.');
      return;
    }
    setApplying(true);
    const newStatus = rec.recommendation === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    await updateOrderStatus(order.id, newStatus, {
      reviewer_notes: `[AI Admin] ${rec.reasoning}\n\nCatatan: ${rec.suggested_notes}`,
    });
    setOrders(prev => prev.filter(o => o.id !== order.id));
    setSelected(null);
    setApplying(false);
  };

  useEffect(() => {
    if (!autoMode || runningBatch) return;
    const ready = orders.filter(o => o._aiReview && !o._analyzing && (o._aiReview.confidence ?? 0) >= autoThreshold);
    if (ready.length === 0) return;
    ready.forEach(o => {
      if (o._aiReview) applyDecision(o, o._aiReview);
    });
  }, [autoMode, orders, autoThreshold]); // eslint-disable-line react-hooks/exhaustive-deps

  const pendingCount = orders.filter(o => !o._aiReview).length;
  const analyzedCount = orders.filter(o => o._aiReview).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Bot size={14} className="text-ds-green" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ds-ink3">AI Admin Agent</p>
          </div>
          <h2 className="text-2xl font-bold text-ds-ink">Kontrol Polis Otomatis</h2>
          <p className="text-xs text-ds-ink3 mt-1">Analisis cerdas berbasis SurePath AI untuk setiap pengajuan polis</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          {/* Auto-mode toggle */}
          <div className="flex items-center gap-3 rounded-2xl bg-white border border-ds-border shadow-sm px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-ds-ink3">Auto-Apply</span>
            <button
              onClick={() => setAutoMode(!autoMode)}
              className={`relative w-10 h-5 rounded-full transition-colors ${autoMode ? 'bg-emerald-500' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            {autoMode && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-ds-ink3">Min.</span>
                <input
                  type="number"
                  value={autoThreshold}
                  onChange={e => setAutoThreshold(Math.min(100, Math.max(70, +e.target.value)))}
                  className="w-12 h-8 px-1 rounded-xl border border-ds-border bg-white text-xs text-ds-ink text-center focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
                />
                <span className="text-xs text-ds-ink3">% confidence</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={analyzeAll}
              disabled={runningBatch || pendingCount === 0}
              className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 disabled:opacity-40 transition-colors"
            >
              {runningBatch ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
              {runningBatch ? 'Menganalisis…' : `Analisis Semua (${pendingCount})`}
            </button>
            <button onClick={load} className="w-10 h-10 rounded-xl border border-ds-border bg-white flex items-center justify-center text-ds-ink3 hover:text-ds-ink">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Antrean', value: orders.length, color: 'text-ds-ink' },
          { label: 'Teranalisis', value: analyzedCount, color: 'text-blue-600' },
          { label: 'Siap Diproses', value: orders.filter(o => o._aiReview && (o._aiReview.confidence ?? 0) >= 80).length, color: 'text-ds-green' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl bg-white border border-ds-border shadow-sm p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-ds-ink3 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Order list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle size={36} className="mx-auto text-ds-green mb-3" />
          <p className="text-ds-ink font-semibold">Antrean kosong</p>
          <p className="text-sm text-ds-ink3 mt-1">Semua order telah diproses</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const ai = order._aiReview;
            return (
              <div
                key={order.id}
                onClick={() => setSelected(order)}
                className="p-5 rounded-2xl bg-white border border-ds-border shadow-sm cursor-pointer hover:bg-ds-card2 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    {order._analyzing
                      ? <RefreshCw size={16} className="text-ds-green animate-spin" />
                      : ai
                        ? <Bot size={16} className="text-ds-green" />
                        : <Clock size={16} className="text-ds-ink3" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div>
                        <p className="font-semibold text-sm text-ds-ink">{order.client_name}</p>
                        <p className="text-xs text-ds-ink3 uppercase tracking-wide">
                          {order.order_number} · {order.product_name}
                        </p>
                      </div>
                      {ai && (
                        <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${REC_STYLE[ai.recommendation]}`}>
                          {ai.recommendation === 'APPROVE' ? 'Setujui' : ai.recommendation === 'REJECT' ? 'Tolak' : 'Minta Info'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-mono font-semibold text-ds-ink">{formatIDR(order.total_premium)}/thn</span>
                      {ai && (
                        <>
                          <span className={`text-xs font-semibold uppercase ${RISK_COLOR[ai.risk_level]}`}>
                            Risiko: {ai.risk_level}
                          </span>
                          <span className="text-xs text-ds-ink3">Conf: {ai.confidence}%</span>
                        </>
                      )}
                      {order._error && <span className="text-xs text-red-600">{order._error}</span>}
                    </div>
                    {ai && ai.flags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {ai.flags.slice(0, 3).map((f, i) => (
                          <span key={i} className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700 truncate max-w-[180px]">⚠ {f}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {!ai && !order._analyzing && (
                      <button
                        onClick={e => { e.stopPropagation(); analyzeOrder(order); }}
                        className="text-xs font-semibold rounded-xl border border-ds-border bg-white text-ds-ink2 hover:bg-ds-card2 px-3 py-1.5 transition-colors"
                      >
                        Analisis
                      </button>
                    )}
                    <ChevronRight size={14} className="text-ds-ink3 mt-1" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8 px-4">
          <div className="rounded-2xl bg-white shadow-xl w-full max-w-xl">
            <div className="flex items-center justify-between p-6 border-b border-ds-border">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ds-ink3 mb-1">AI Policy Review</p>
                <h3 className="font-bold text-lg text-ds-ink">{selected.order_number}</h3>
                <p className="text-xs text-ds-ink3">{selected.client_name} · {selected.product_name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ds-ink3 hover:text-ds-ink">✕</button>
            </div>
            <div className="p-6 space-y-5">
              {selected._analyzing && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl">
                  <RefreshCw size={16} className="text-ds-green animate-spin" />
                  <p className="text-sm text-emerald-700 font-semibold">Menganalisis dengan AI…</p>
                </div>
              )}
              {selected._aiReview && (
                <>
                  {/* AI Verdict */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className={`p-4 rounded-2xl text-center ${REC_STYLE[selected._aiReview.recommendation]}`}>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-1">Rekomendasi</p>
                      <p className="font-bold text-sm">
                        {selected._aiReview.recommendation === 'APPROVE' ? 'Setujui' : selected._aiReview.recommendation === 'REJECT' ? 'Tolak' : 'Minta Info'}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-ds-card2 border border-ds-border text-center">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ds-ink3 mb-1">Confidence</p>
                      <p className={`font-bold text-xl ${selected._aiReview.confidence >= 80 ? 'text-ds-green' : selected._aiReview.confidence >= 60 ? 'text-ds-amber' : 'text-red-600'}`}>
                        {selected._aiReview.confidence}%
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-ds-card2 border border-ds-border text-center">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ds-ink3 mb-1">Risiko</p>
                      <p className={`font-bold text-sm ${RISK_COLOR[selected._aiReview.risk_level]}`}>{selected._aiReview.risk_level}</p>
                    </div>
                  </div>

                  {/* Reasoning */}
                  <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-2xl text-white p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={14} className="text-blue-300" />
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Analisis AI</p>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">{selected._aiReview.reasoning}</p>
                  </div>

                  {/* Flags */}
                  {selected._aiReview.flags.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-ds-ink3 mb-2">Temuan</p>
                      <ul className="space-y-1.5">
                        {selected._aiReview.flags.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-ds-amber">
                            <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggested notes */}
                  {selected._aiReview.suggested_notes && (
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1">Catatan untuk File</p>
                      <p className="text-xs text-blue-700">{selected._aiReview.suggested_notes}</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  {(selected.status === 'SUBMITTED' || selected.status === 'UNDER_REVIEW') && (
                    <div className="flex gap-3 pt-2">
                      <button
                        disabled={applying}
                        onClick={() => applyDecision(selected, selected._aiReview!)}
                        className={`flex-1 h-10 px-4 rounded-xl text-sm font-semibold transition-all ${
                          selected._aiReview.recommendation === 'APPROVE'
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                            : selected._aiReview.recommendation === 'REJECT'
                              ? 'bg-red-500 hover:bg-red-600 text-white'
                              : 'bg-amber-500 hover:bg-amber-600 text-white'
                        } disabled:opacity-50`}
                      >
                        {applying ? '…' : `Terapkan: ${selected._aiReview.recommendation === 'APPROVE' ? 'Setujui' : selected._aiReview.recommendation === 'REJECT' ? 'Tolak' : 'Minta Info'}`}
                      </button>
                      <button
                        onClick={() => { setSelected(null); }}
                        className="h-10 px-5 rounded-xl text-sm font-semibold border border-ds-border bg-white text-ds-ink2 hover:bg-ds-card2"
                      >
                        Tunda
                      </button>
                    </div>
                  )}
                </>
              )}
              {!selected._aiReview && !selected._analyzing && (
                <div className="text-center py-6">
                  <button
                    onClick={() => { const o = selected; analyzeOrder(o); setSelected(prev => prev ? { ...prev, _analyzing: true } : null); }}
                    className="h-10 px-6 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors"
                  >
                    <Bot size={14} className="inline mr-2" />
                    Analisis dengan AI
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auto-mode banner */}
      {autoMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-3 bg-white border border-ds-border rounded-full px-6 py-3 shadow-xl">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <p className="text-xs font-semibold text-ds-ink2">
              Auto-Apply aktif · Threshold {autoThreshold}% confidence
            </p>
            <button onClick={() => setAutoMode(false)} className="text-ds-ink3 hover:text-ds-ink ml-2">
              <Eye size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAdminView;
