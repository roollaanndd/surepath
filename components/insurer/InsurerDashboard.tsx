// InsurerDashboard.tsx — Beranda tab. KPI cards + recent activity.

import React, { useEffect, useState, useCallback } from 'react';
import { FileText, CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Clock, TrendingUp, Eye } from 'lucide-react';
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
    { label: 'Menunggu Review', value: data.kpi.pending,      icon: Clock,         color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/30',     tab: 'orders' },
    { label: 'Disetujui',        value: data.kpi.approved,     icon: CheckCircle2,  color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', tab: 'orders' },
    { label: 'Perlu Info',       value: data.kpi.request_info, icon: AlertTriangle, color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/30',      tab: 'orders' },
    { label: 'Ditolak',          value: data.kpi.declined,     icon: XCircle,       color: 'text-rose-500',    bg: 'bg-rose-50 dark:bg-rose-950/30',      tab: 'orders' },
  ];

  const recentOrders = data.orders.slice(0, 5);
  const totalPremium = data.orders.reduce((sum, o) => sum + (o.total_premium ?? 0), 0);

  return (
    <div className="px-5 pt-5 space-y-6 pb-4">
      {/* Hero — bank-grade command card (emerald identity) */}
      <AgentArtKeyframes />
      <div className="relative overflow-hidden rounded-[1.75rem] p-5 text-white"
        style={{ background: 'linear-gradient(120deg, #0B1120 0%, #064e3b 55%, #065f46 100%)', boxShadow: '0 16px 44px -14px rgba(11,17,32,0.55)' }}>
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.30) 0%, transparent 70%)' }} />
        <svg aria-hidden className="absolute right-0 top-0 h-full opacity-[0.12] pointer-events-none" viewBox="0 0 200 140" fill="none">
          <circle cx="176" cy="16" r="74" stroke="#fff" strokeWidth="1.2" />
          <circle cx="176" cy="16" r="48" stroke="#fff" strokeWidth="1.2" />
          <circle cx="176" cy="16" r="26" stroke="#fff" strokeWidth="1.2" />
        </svg>
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-2xs font-bold uppercase tracking-[0.16em] text-white/55">Insurer Command Center</p>
            <h1 className="text-2xl font-black tracking-tight mt-1">{data.insurer.name}</h1>
            <p className="text-xs text-white/75 mt-1.5 leading-relaxed">
              {data.kpi.pending > 0
                ? `Ada ${data.kpi.pending} pengajuan menunggu review Anda.`
                : 'Tidak ada pengajuan pending. Pekerjaan rapi! 🎉'}
            </p>
          </div>
          <div className="flex-shrink-0 -my-2"><SpotOrders size={78} /></div>
        </div>
        <div className="relative z-10 flex items-center gap-3 mt-4 pt-3.5 border-t border-white/10">
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur px-2.5 py-1 rounded-full">
            <TrendingUp size={11} className="text-emerald-300" />
            <span className="text-2xs font-bold">{data.kpi.total} total order</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur px-2.5 py-1 rounded-full">
            <ShieldCheck size={11} className="text-emerald-300" />
            <span className="text-2xs font-bold">{data.kpi.issued} polis terbit</span>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div>
        <SectionLabel>Ringkasan Pengajuan</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          {kpiCards.map(c => (
            <button
              key={c.label}
              onClick={() => onNavigate(c.tab)}
              className={`text-left p-4 rounded-2xl border border-ds-border bg-ds-card hover:shadow-ds-md active:scale-[0.98] transition-all duration-200 ${c.bg}`}
            >
              <c.icon size={20} className={c.color} />
              <p className="text-2xl font-black tracking-tight mt-2 text-ds-ink tabular-nums">{c.value}</p>
              <p className="text-2xs font-bold text-ds-ink3 uppercase tracking-wider mt-0.5 leading-tight">{c.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Total premium */}
      <div className="p-4 rounded-2xl border border-ds-border bg-ds-card">
        <p className="text-2xs font-bold text-ds-ink3 uppercase tracking-wider">Total Premi (semua order)</p>
        <p className="text-2xl font-black text-emerald-500 mt-1">{fmtIdr(totalPremium)}</p>
      </div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div>
          <SectionLabel action={{ label: 'Lihat semua', onClick: () => onNavigate('orders') }}>
            Pengajuan Terbaru
          </SectionLabel>
          <div className="space-y-2">
            {recentOrders.map(o => (
              <button
                key={o.id}
                onClick={() => onNavigate('orders')}
                className="w-full p-3 rounded-2xl border border-ds-border bg-ds-card flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center font-black text-emerald-500 shrink-0">
                  <FileText size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ds-ink truncate">{o.client_name}</p>
                  <p className="text-xs text-ds-ink3 truncate">{o.order_number} · {o.product_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-2xs font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                      o.status === 'SUBMITTED' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
                      : o.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                      : o.status === 'UNDER_REVIEW' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                      : o.status === 'ISSUED' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
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
