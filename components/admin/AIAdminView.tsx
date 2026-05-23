import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot, CheckCircle, AlertTriangle, RefreshCw,
  Zap, ChevronRight, Clock, Eye,
} from 'lucide-react';
import {
  getAllOrders, updateOrderStatus, runAIPolicyReview,
  type SpPolicyOrder, type AIPolicyReview,
} from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';

const RISK_COLOR: Record<string, string> = {
  LOW:    'text-emerald-400',
  MEDIUM: 'text-amber-400',
  HIGH:   'text-rose-400',
};

const REC_STYLE: Record<string, string> = {
  APPROVE:      'bg-emerald-500 text-white',
  REJECT:       'bg-rose-500 text-white',
  REQUEST_INFO: 'bg-amber-500 text-black',
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
    for (const order of pending) {
      await analyzeOrder(order);
    }
    setRunningBatch(false);
  };

  const applyDecision = async (order: OrderWithAI, rec: AIPolicyReview) => {
    if (rec.recommendation === 'REQUEST_INFO') {
      alert('Gunakan "Mulai Review" dan tambahkan catatan untuk meminta informasi tambahan.');
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
            <div className="w-7 h-7 bg-violet-500/15 rounded-xl flex items-center justify-center">
              <Bot size={14} className="text-violet-400" />
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-violet-400">AI Admin Agent</p>
          </div>
          <h2 className="text-2xl font-black text-white">Kontrol Polis Otomatis</h2>
          <p className="text-xs text-slate-400 mt-1">Analisis cerdas berbasis Claude AI untuk setiap pengajuan polis</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          {/* Auto-mode toggle */}
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Auto-Apply</span>
            <button
              onClick={() => setAutoMode(!autoMode)}
              className={`relative w-10 h-5 rounded-full transition-colors ${autoMode ? 'bg-violet-500' : 'bg-white/10'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            {autoMode && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">Min.</span>
                <input
                  type="number"
                  value={autoThreshold}
                  onChange={e => setAutoThreshold(Math.min(100, Math.max(70, +e.target.value)))}
                  className="w-10 bg-white/10 border border-white/10 rounded-lg px-1 py-0.5 text-[10px] text-white text-center"
                />
                <span className="text-[10px] text-slate-400">% confidence</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={analyzeAll}
              disabled={runningBatch || pendingCount === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 disabled:opacity-40 transition-colors"
            >
              {runningBatch ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
              {runningBatch ? 'Menganalisis…' : `Analisis Semua (${pendingCount})`}
            </button>
            <button onClick={load} className="w-9 h-9 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-white">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Antrean', value: orders.length, color: 'text-white' },
          { label: 'Teranalisis', value: analyzedCount, color: 'text-violet-400' },
          { label: 'Siap Diproses', value: orders.filter(o => o._aiReview && (o._aiReview.confidence ?? 0) >= 80).length, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Order list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle size={36} className="mx-auto text-emerald-500 mb-3" />
          <p className="text-white font-black">Antrean kosong</p>
          <p className="text-sm text-slate-400 mt-1">Semua order telah diproses</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const ai = order._aiReview;
            return (
              <div
                key={order.id}
                onClick={() => setSelected(order)}
                className="p-5 bg-white/[0.02] border border-white/5 rounded-[2rem] cursor-pointer hover:border-violet-500/20 hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    {order._analyzing
                      ? <RefreshCw size={16} className="text-violet-400 animate-spin" />
                      : ai
                        ? <Bot size={16} className="text-violet-400" />
                        : <Clock size={16} className="text-slate-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div>
                        <p className="font-black text-sm text-white">{order.client_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {order.order_number} · {order.product_name}
                        </p>
                      </div>
                      {ai && (
                        <span className={`flex-shrink-0 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${REC_STYLE[ai.recommendation]}`}>
                          {ai.recommendation === 'APPROVE' ? 'Setujui' : ai.recommendation === 'REJECT' ? 'Tolak' : 'Minta Info'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[10px] font-bold text-orange-500">{formatIDR(order.total_premium)}/thn</span>
                      {ai && (
                        <>
                          <span className={`text-[9px] font-black uppercase ${RISK_COLOR[ai.risk_level]}`}>
                            Risiko: {ai.risk_level}
                          </span>
                          <span className="text-[9px] text-slate-400">Conf: {ai.confidence}%</span>
                        </>
                      )}
                      {order._error && <span className="text-[9px] text-rose-400">{order._error}</span>}
                    </div>
                    {ai && ai.flags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {ai.flags.slice(0, 3).map((f, i) => (
                          <span key={i} className="text-[8px] font-bold bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full truncate max-w-[180px]">⚠ {f}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {!ai && !order._analyzing && (
                      <button
                        onClick={e => { e.stopPropagation(); analyzeOrder(order); }}
                        className="text-[9px] font-black uppercase tracking-widest bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 px-3 py-1.5 rounded-full transition-colors"
                      >
                        Analisis
                      </button>
                    )}
                    <ChevronRight size={14} className="text-slate-500 mt-1" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8 px-4">
          <div className="bg-[#111] rounded-[2.5rem] border border-white/10 w-full max-w-xl shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-violet-400 mb-1">AI Policy Review</p>
                <h3 className="font-black text-lg">{selected.order_number}</h3>
                <p className="text-xs text-slate-400">{selected.client_name} · {selected.product_name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-5">
              {selected._analyzing && (
                <div className="flex items-center gap-3 p-4 bg-violet-500/10 rounded-2xl">
                  <RefreshCw size={16} className="text-violet-400 animate-spin" />
                  <p className="text-sm text-violet-300 font-bold">Menganalisis dengan AI…</p>
                </div>
              )}
              {selected._aiReview && (
                <>
                  {/* AI Verdict */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className={`p-4 rounded-2xl text-center ${REC_STYLE[selected._aiReview.recommendation]}`}>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-1">Rekomendasi</p>
                      <p className="font-black text-sm">
                        {selected._aiReview.recommendation === 'APPROVE' ? 'Setujui' : selected._aiReview.recommendation === 'REJECT' ? 'Tolak' : 'Minta Info'}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Confidence</p>
                      <p className={`font-black text-xl ${selected._aiReview.confidence >= 80 ? 'text-emerald-400' : selected._aiReview.confidence >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {selected._aiReview.confidence}%
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Risiko</p>
                      <p className={`font-black text-sm ${RISK_COLOR[selected._aiReview.risk_level]}`}>{selected._aiReview.risk_level}</p>
                    </div>
                  </div>

                  {/* Reasoning */}
                  <div className="bg-white/5 rounded-2xl p-4">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Analisis AI</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{selected._aiReview.reasoning}</p>
                  </div>

                  {/* Flags */}
                  {selected._aiReview.flags.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Temuan</p>
                      <ul className="space-y-1.5">
                        {selected._aiReview.flags.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-amber-400">
                            <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggested notes */}
                  {selected._aiReview.suggested_notes && (
                    <div className="bg-blue-500/10 rounded-2xl p-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-1">Catatan untuk File</p>
                      <p className="text-xs text-blue-300">{selected._aiReview.suggested_notes}</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  {(selected.status === 'SUBMITTED' || selected.status === 'UNDER_REVIEW') && (
                    <div className="flex gap-3 pt-2">
                      <button
                        disabled={applying}
                        onClick={() => applyDecision(selected, selected._aiReview!)}
                        className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                          selected._aiReview.recommendation === 'APPROVE'
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                            : selected._aiReview.recommendation === 'REJECT'
                              ? 'bg-rose-500 hover:bg-rose-400 text-white'
                              : 'bg-amber-500 hover:bg-amber-400 text-black'
                        } disabled:opacity-50`}
                      >
                        {applying ? '…' : `Terapkan: ${selected._aiReview.recommendation === 'APPROVE' ? 'Setujui' : selected._aiReview.recommendation === 'REJECT' ? 'Tolak' : 'Minta Info'}`}
                      </button>
                      <button
                        onClick={() => { setSelected(null); }}
                        className="px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-white/5 text-slate-400 hover:bg-white/10"
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
                    className="px-6 py-3 bg-violet-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-violet-400 transition-colors"
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
          <div className="flex items-center gap-3 bg-violet-900/90 border border-violet-500/30 backdrop-blur-xl rounded-full px-6 py-3 shadow-2xl">
            <div className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
            <p className="text-xs font-black uppercase tracking-widest text-violet-300">
              Auto-Apply aktif · Threshold {autoThreshold}% confidence
            </p>
            <button onClick={() => setAutoMode(false)} className="text-violet-400 hover:text-white ml-2">
              <Eye size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAdminView;
