// InsurerDashboard.tsx — Beranda tab (v2.7.59 redesign).
//
// Hybrid pattern:
//  - Hero: emerald gradient command-center (dari InsurerHero shared)
//  - KPI 2x2: flat white cards, mono numerals, status dot — Mercury-style
//  - Total Premi: dark-navy block dengan angka mono putih
//  - Recent orders: divider-separated rows, mono order number, semantic pill
//
// Data fetching & handlers tidak berubah — hanya presentasi.
import React, { useEffect, useState, useCallback } from 'react';
import { TrendingUp, ShieldCheck, Clock, ChevronRight } from 'lucide-react';
import { Language } from '../../types';
import { SkeletonCard, useToast } from '../ui';
import { useT } from '../../src/i18n';
import { getInsurerDashboard, type InsurerDashboard as InsurerDashboardData } from '../../services/insurerService';
import { ORDER_STATUS_META } from '../../lib/statusMeta';
import InsurerHero, { InsurerHeroChip } from './InsurerHero';

interface Props {
  authToken: string;
  lang: Language;
  onNavigate: (tab: string) => void;
  refreshTick: number;
}

const fmtIdr = (n: number | null) =>
  n != null ? 'Rp ' + n.toLocaleString('id-ID') : '-';

// Status pill meta — warna dari sumber tunggal lib/statusMeta (v2.8.7);
// label pendek khas dashboard dipertahankan.
const STATUS_PILL: Record<string, { cls: string; label: string }> = Object.fromEntries(
  Object.entries(ORDER_STATUS_META).map(([k, m]) => [k, { cls: m.badgeClass, label: k === 'UNDER_REVIEW' ? 'REVIEW' : k }]),
);

const InsurerDashboard: React.FC<Props> = ({ authToken, lang, onNavigate, refreshTick }) => {
  const t = useT(lang);
  void t;
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

  // KPI rows — dot color menandai sentimen tanpa membesarkan ikon.
  const kpis: Array<{ label: string; value: number; dot: string; tab: string }> = [
    { label: 'PENDING',    value: data.kpi.pending,      dot: 'bg-amber-500',   tab: 'orders' },
    { label: 'APPROVED',   value: data.kpi.approved,     dot: 'bg-emerald-500', tab: 'orders' },
    { label: 'PERLU INFO', value: data.kpi.request_info, dot: 'bg-blue-500',    tab: 'orders' },
    { label: 'DECLINED',   value: data.kpi.declined,     dot: 'bg-rose-500',    tab: 'orders' },
  ];

  const recentOrders = data.orders.slice(0, 5);
  const totalPremium = data.orders.reduce((sum, o) => sum + (o.total_premium ?? 0), 0);

  return (
    <div className="px-5 pt-5 space-y-6 pb-4">
      {/* Hero — gradient command center (Option B) */}
      <InsurerHero
        eyebrow="Insurer Command Center"
        title={data.insurer.name}
        description={
          data.kpi.pending > 0
            ? `Ada ${data.kpi.pending} pengajuan menunggu review Anda.`
            : 'Semua pengajuan tertangani. Riwayat tetap siap ditinjau.'
        }
        chips={
          <>
            <InsurerHeroChip>
              <TrendingUp size={11} /> {data.kpi.total} total order
            </InsurerHeroChip>
            <InsurerHeroChip tone="emerald">
              <ShieldCheck size={11} /> {data.kpi.issued} polis terbit
            </InsurerHeroChip>
            {data.kpi.pending > 0 && (
              <InsurerHeroChip tone="amber">
                <Clock size={11} /> {data.kpi.pending} menunggu
              </InsurerHeroChip>
            )}
          </>
        }
      />

      {/* KPI grid — Mercury-style: flat, mono numerals, status dot */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400 mb-3">
          Ringkasan Pengajuan
        </p>
        <div className="grid grid-cols-2 gap-3">
          {kpis.map(k => (
            <button
              key={k.label}
              onClick={() => onNavigate(k.tab)}
              className="group text-left p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-ds-card hover:border-emerald-500/40 hover:shadow-sm active:scale-[0.98] transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  {k.label}
                </span>
                <span className={`inline-block w-2 h-2 rounded-full ${k.dot}`} />
              </div>
              <p className="mt-3 text-[32px] leading-none font-mono font-medium tracking-tight text-slate-900 dark:text-white tabular-nums">
                {k.value}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Total Premi — dark navy block dengan angka mono putih */}
      <div
        className="rounded-2xl p-5 flex items-center justify-between gap-4"
        style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' }}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Total Premi
          </p>
          <p className="mt-1.5 text-xl sm:text-2xl font-mono font-medium text-white tracking-tight tabular-nums truncate">
            {fmtIdr(totalPremium)}
          </p>
        </div>
        <span className="text-[11px] text-slate-400 shrink-0">semua order</span>
      </div>

      {/* Recent orders — divider-separated rows, mono order# */}
      {recentOrders.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Pengajuan Terbaru
            </p>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5 hover:underline"
            >
              Lihat semua <ChevronRight size={13} />
            </button>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-ds-card overflow-hidden">
            {recentOrders.map((o, i) => {
              const pill = STATUS_PILL[o.status] ?? { cls: 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300', label: o.status };
              return (
                <button
                  key={o.id}
                  onClick={() => onNavigate('orders')}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors ${
                    i !== 0 ? 'border-t border-slate-100 dark:border-white/5' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {o.client_name}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                      {o.order_number} · {o.product_name}
                    </p>
                    {o.insurer_decision && (
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {o.insurer_decision === 'APPROVED'     ? '✓ Anda setujui'
                         : o.insurer_decision === 'REQUEST_INFO' ? '? Anda minta info'
                         : '✗ Anda tolak'}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${pill.cls}`}>
                    {pill.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default InsurerDashboard;
