// InsurerDashboard.tsx — Beranda tab. KPI cards + recent activity.

import React, { useEffect, useState, useCallback } from 'react';
import { FileText, CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Clock, TrendingUp, Eye, Banknote } from 'lucide-react';
import { Language } from '../../types';
import { SectionLabel } from '../shared/cards';
import { SkeletonCard, useToast } from '../ui';
import { useT } from '../../src/i18n';
import { AgentArtKeyframes, SpotOrders } from '../agent/AgentArt';
import { getInsurerDashboard, type InsurerDashboard as InsurerDashboardData } from '../../services/insurerService';

interface Props {
  authToken: string;
  lang: Language;
  onNavigate: (tab: string) => void;
  refreshTick: number;
}

const fmtIdr = (n: number | null) => n != null ? 'Rp ' + n.toLocaleString('id-ID') : '-';

const InsurerDashboard: React.FC<Props> = ({ authToken, lang, onNavigate, refreshTick }) => {
  const t = useT(lang);
  void t; // i18n helper — strings will be translated incrementally
  const toast = useToast();
  const [data, setData] = useState<InsurerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getInsurerDashboard(authToken);
      setData(d);
    } catch (e: any) {
      console.error('InsurerDashboard load:', e);
      toast.error(`Gagal memuat dashboard: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [authToken, toast]);

  useEffect(() => { load(); }, [load, refreshTick]);

  if (loading) {
    return (
      <div className="px-5 pt-5 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!data) return null;

  const kpiCards = [
    { label: 'Menunggu Review', value: data.kpi.pending,      icon: Clock,         color: 'text-ds-amber',   bg: 'bg-amber-50 dark:bg-amber-950/30',     tab: 'orders' },
    { label: 'Disetujui',        value: data.kpi.approved,     icon: CheckCircle2,  color: 'text-ds-green', bg: 'bg-emerald-50 dark:bg-emerald-950/30', tab: 'orders' },
    { label: 'Perlu Info',       value: data.kpi.request_info, icon: AlertTriangle, color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/30',      tab: 'orders' },
    { label: 'Ditolak',          value: data.kpi.declined,     icon: XCircle,       color: 'text-rose-500',    bg: 'bg-rose-50 dark:bg-rose-950/30',      tab: 'orders' },
  ];

  const recentOrders = data.orders.slice(0, 5);
  const totalPremium = data.orders.reduce((sum, o) => sum + (o.total_premium ?? 0), 0);

  return (
    <div className="px-5 pt-5 space-y-6 pb-4">
      {/* Hero — bank-grade command card (emerald identity) */}
      <AgentArtKeyframes />
      <div className="relative overflow-hidden rounded-[1.75rem] p-5 sm:p-6 text-white"
        style={{ background: 'linear-gradient(120deg, #0B1120 0%, #0E3B2E 55%, #065f46 100%)', boxShadow: '0 18px 50px -16px rgba(6,78,59,0.6)' }}>
        <div aria-hidden className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,193,106,0.28), transparent 70%)' }} />
        <svg aria-hidden className="absolute right-0 top-0 h-full opacity-[0.10] pointer-events-none" viewBox="0 0 200 140" fill="none">
          <circle cx="176" cy="16" r="74" stroke="#fff" strokeWidth="1.2" />
          <circle cx="176" cy="16" r="48" stroke="#fff" strokeWidth="1.2" />
          <circle cx="176" cy="16" r="26" stroke="#fff" strokeWidth="1.2" />
        </svg>
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-2xs font-black uppercase tracking-[0.22em] text-emerald-300">Insurer Command Center</p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">{data.insurer.name}</h1>
            <p className="text-xs sm:text-sm text-white/80 mt-1.5 leading-relaxed">
              {data.kpi.pending > 0
                ? `Ada ${data.kpi.pending} pengajuan menunggu review Anda.`
                : 'Semua pengajuan tertangani. Riwayat tetap siap ditinjau.'}
            </p>
          </div>
          <div className="hidden sm:block flex-shrink-0 -my-2"><SpotOrders size={86} /></div>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-2 mt-4 pt-3.5 border-t border-white/10">
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur px-2.5 py-1 rounded-full">
            <TrendingUp size={11} className="text-emerald-300" />
            <span className="text-2xs font-bold">{data.kpi.total} total order</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur px-2.5 py-1 rounded-full">
            <ShieldCheck size={11} className="text-emerald-300" />
            <span className="text-2xs font-bold">{data.kpi.issued} polis terbit</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur px-2.5 py-1 rounded-full">
            <Clock size={11} className="text-amber-300" />
            <span className="text-2xs font-bold">{data.kpi.pending} menunggu</span>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div>
        <SectionLabel>Ringkasan Pengajuan</SectionLabel>
        <div className="sp-stagger-cards grid grid-cols-2 gap-3">
          {kpiCards.map(c => (
            <button
              key={c.label}
              onClick={() => onNavigate(c.tab)}
              className={`group text-left p-4 rounded-3xl border border-ds-border bg-ds-card hover:shadow-ds-md hover:border-ds-green/40 active:scale-[0.98] transition-all duration-200 ${c.bg}`}
            >
              <div className="flex items-center justify-between">
                <c.icon size={20} className={c.color} />
                <span className="text-2xs font-bold text-ds-green opacity-0 group-hover:opacity-100 transition-opacity">Lihat →</span>
              </div>
              <p className="text-2xl font-black tracking-tight mt-2 text-ds-ink tabular-nums">{c.value}</p>
              <p className="text-2xs font-bold text-ds-ink3 uppercase tracking-wider mt-0.5 leading-tight">{c.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Total premium */}
      <div className="p-4 rounded-2xl border border-ds-border bg-ds-card flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xs font-bold text-ds-ink3 uppercase tracking-wider">Total Premi (semua order)</p>
          <p className="text-2xl font-black text-ds-green mt-1 truncate">{fmtIdr(totalPremium)}</p>
        </div>
        <span className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-ds-green">
          <Banknote size={20} />
        </span>
      </div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div>
          <SectionLabel action={{ label: 'Lihat semua', onClick: () => onNavigate('orders') }}>
            Pengajuan Terbaru
          </SectionLabel>
          <div className="sp-stagger-cards space-y-2">
            {recentOrders.map(o => (
              <button
                key={o.id}
                onClick={() => onNavigate('orders')}
                className="w-full p-3 rounded-3xl border border-ds-border bg-ds-card flex items-center gap-3 text-left hover:shadow-ds-md hover:border-ds-green/40 active:scale-[0.98] transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center font-black text-ds-green shrink-0">
                  <FileText size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ds-ink truncate">{o.client_name}</p>
                  <p className="text-xs text-ds-ink3 truncate">{o.order_number} · {o.product_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-2xs font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                      o.status === 'SUBMITTED' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
                      : o.status === 'APPROVED' ? 'bg-emerald-50 text-ds-green dark:bg-emerald-950/30 dark:text-emerald-400'
                      : o.status === 'UNDER_REVIEW' ? 'bg-amber-50 text-ds-amber dark:bg-amber-950/30 dark:text-amber-400'
                      : o.status === 'ISSUED' ? 'bg-emerald-50 text-ds-green dark:bg-emerald-950/30 dark:text-emerald-400'
                      : o.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'
                      : 'bg-ds-card2 text-ds-ink3'
                    }`}>
                      {o.status.replace('_', ' ')}
                    </span>
                    {o.insurer_decision && (
                      <span className="text-2xs font-bold text-ds-ink3">
                        · {o.insurer_decision === 'APPROVED' ? '✓ Anda setujui' : o.insurer_decision === 'REQUEST_INFO' ? '? Anda minta info' : '✗ Anda tolak'}
                      </span>
                    )}
                  </div>
                </div>
                <Eye size={14} className="text-ds-ink3 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InsurerDashboard;
