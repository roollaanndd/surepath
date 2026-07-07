// InsurerDashboard.tsx — Beranda tab. KPI cards + recent activity.

import React, { useEffect, useState, useCallback } from 'react';
import { FileText, CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Clock, TrendingUp, Eye } from 'lucide-react';
import { Language } from '../../types';
import { SectionLabel } from '../shared/cards';
import { SkeletonCard, useToast } from '../ui';
import { getInsurerDashboard, type InsurerDashboard as InsurerDashboardData } from '../../services/insurerService';

interface Props {
  authToken: string;
  lang: Language;
  onNavigate: (tab: string) => void;
  refreshTick: number;
}

const fmtIdr = (n: number | null) => n != null ? 'Rp ' + n.toLocaleString('id-ID') : '-';

const InsurerDashboard: React.FC<Props> = ({ authToken, onNavigate, refreshTick }) => {
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
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl p-5 text-white"
        style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 60%, #4c1d95 100%)' }}>
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)' }} />
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Selamat datang</p>
          <h1 className="text-2xl font-black tracking-tight mt-1">{data.insurer.name}</h1>
          <p className="text-xs text-white/80 mt-1.5 leading-relaxed">
            {data.kpi.pending > 0
              ? `Ada ${data.kpi.pending} pengajuan menunggu review Anda.`
              : 'Tidak ada pengajuan pending. Pekerjaan rapi! 🎉'}
          </p>
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur px-2.5 py-1 rounded-full">
              <TrendingUp size={11} className="text-purple-300" />
              <span className="text-[10px] font-bold">{data.kpi.total} total order</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur px-2.5 py-1 rounded-full">
              <ShieldCheck size={11} className="text-emerald-300" />
              <span className="text-[10px] font-bold">{data.kpi.issued} polis terbit</span>
            </div>
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
              <div className="flex items-center justify-between">
                <c.icon size={20} className={c.color} />
                {c.value > 0 && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-ds-ink3 bg-ds-card2 px-2 py-0.5 rounded-full">
                    {c.value}
                  </span>
                )}
              </div>
              <p className="text-2xl font-black tracking-tight mt-2 text-ds-ink">{c.value}</p>
              <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest mt-0.5">{c.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Total premium */}
      <div className="p-4 rounded-2xl border border-ds-border bg-ds-card">
        <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest">Total Premi (semua order)</p>
        <p className="text-2xl font-black text-purple-500 mt-1">{fmtIdr(totalPremium)}</p>
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
                <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center font-black text-purple-500 shrink-0">
                  <FileText size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ds-ink truncate">{o.client_name}</p>
                  <p className="text-xs text-ds-ink3 truncate">{o.order_number} · {o.product_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                      o.status === 'SUBMITTED' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
                      : o.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                      : o.status === 'UNDER_REVIEW' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                      : o.status === 'ISSUED' ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400'
                      : o.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'
                      : 'bg-ds-card2 text-ds-ink3'
                    }`}>
                      {o.status.replace('_', ' ')}
                    </span>
                    {o.insurer_decision && (
                      <span className="text-[9px] font-bold text-ds-ink3">
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
