import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight, ArrowUpRight, Banknote, CalendarDays, CheckCircle2,
  ChevronRight, Clock, FileText, ListChecks, RefreshCw, ShieldAlert,
  TrendingUp, Users, Wallet,
} from 'lucide-react';
import { getAllOrders } from '../../services/orders';
import type { AdminStats, OnlineUsersResult } from '../../services/supabaseService';
import type { SpClaim, SpPolicyOrder, Withdrawal } from '../../services/dbTypes';
import { formatIDR } from '../car-wizard/WizardUI';
import { formatIDRCompact } from '../../src/i18n';
import { buildDashboardModel, groupProducts, type DashboardTask } from './dashboardData';

interface AdminDashboardProps {
  adminStats: AdminStats | null;
  claims: SpClaim[] | null;
  withdrawals: (Withdrawal & { agent_name?: string })[] | null;
  tierPending: number;
  onlineUsers: OnlineUsersResult | null;
  currentUser: { name?: string; email?: string } | null;
  onNavigate: (tab: string) => void;
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  SUBMITTED:    { label: 'Diajukan',     className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  UNDER_REVIEW: { label: 'Ditinjau',     className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  APPROVED:     { label: 'Disetujui',    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  ISSUED:       { label: 'Terbit',       className: 'bg-emerald-600/10 text-emerald-700 border-emerald-600/20' },
  REJECTED:     { label: 'Ditolak',      className: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  CANCELLED:    { label: 'Dibatalkan',   className: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
};

const TASK_META: Record<DashboardTask['kind'], { icon: React.ElementType; className: string; label: string }> = {
  order:      { icon: FileText,    className: 'bg-amber-500/10 text-amber-600',   label: 'Polis' },
  claim:      { icon: ShieldAlert, className: 'bg-rose-500/10 text-rose-600',     label: 'Klaim' },
  withdrawal: { icon: Banknote,    className: 'bg-blue-500/10 text-blue-600',     label: 'Penarikan' },
  tier:       { icon: TrendingUp,  className: 'bg-violet-500/10 text-violet-600', label: 'Tier' },
};

const DONUT_COLORS = ['#0F9D6E', '#3B82F6', '#F59E0B', '#8B5CF6', '#94A3B8'];

const DAY_MS = 86_400_000;

function withinDays(iso: string | undefined, days: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t >= Date.now() - days * DAY_MS;
}

const idr = (n: number) => formatIDR(Math.round(n));
const dayLabel = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(d);
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminStats, claims, withdrawals, tierPending, onlineUsers, currentUser, onNavigate,
}) => {
  const [orders, setOrders] = useState<SpPolicyOrder[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [range, setRange] = useState<30 | 90 | 365>(30);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await getAllOrders(500, true);
      setOrders(rows);
      setUpdatedAt(new Date());
    } catch (e: any) {
      setLoadError(e?.message ?? 'Gagal memuat pesanan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const model = useMemo(() => buildDashboardModel({
    orders: orders ?? [],
    claims: claims ?? [],
    withdrawals: withdrawals ?? [],
    tierPending,
    activeAgents: adminStats?.activeAgents ?? 0,
  }), [orders, claims, withdrawals, tierPending, adminStats?.activeAgents]);

  const scopedOrders = useMemo(
    () => (orders ?? []).filter(o => withinDays(o.created_at, range)),
    [orders, range],
  );
  const products = useMemo(() => groupProducts(scopedOrders), [scopedOrders]);
  const productTotal = products.reduce((n, p) => n + p.count, 0);

  const donut = useMemo(() => {
    if (productTotal === 0) return 'conic-gradient(#E5E7EB 0deg 360deg)';
    let acc = 0;
    const stops = products.map((p, i) => {
      const start = (acc / productTotal) * 360;
      acc += p.count;
      const end = (acc / productTotal) * 360;
      return `${DONUT_COLORS[i % DONUT_COLORS.length]} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [products, productTotal]);

  const now = new Date();
  const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(now);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const firstWeekday = (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7; // Senin = 0
  const renewalByDay = new Map(model.renewals.map(r => [r.day, r.count]));
  const maxMonthPremium = Math.max(1, ...model.months.map(m => m.premium));

  const deltaBadge = (value: number | null, positiveIsGood = true) => {
    if (value === null) return <span className="text-2xs font-bold text-ds-ink3">—</span>;
    const good = positiveIsGood ? value >= 0 : value <= 0;
    const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
    return (
      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-2xs font-black ${
        good ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
      }`}>
        <Icon size={11} /> {Math.abs(value)}%
      </span>
    );
  };

  const kpis = [
    {
      label: 'Total Pesanan', value: String(model.totals.orders), icon: FileText,
      sub: `${model.totals.pendingOrders} perlu keputusan`, delta: model.deltas.orders, tab: 'policy_orders',
    },
    {
      label: 'Premi Diterbitkan', value: formatIDRCompact(model.totals.issuedPremium), icon: Wallet,
      sub: 'Polis berstatus terbit', delta: model.deltas.premium, tab: 'financial',
    },
    {
      label: 'Klaim Menunggu', value: String(model.totals.pendingClaims), icon: ShieldAlert,
      sub: `${claims?.length ?? 0} klaim total`, delta: null, tab: 'claims_admin',
    },
    {
      label: 'Penarikan Pending', value: String(model.totals.pendingWithdrawals), icon: Banknote,
      sub: formatIDRCompact(model.totals.withdrawalAmount), delta: null, tab: 'withdrawals',
    },
  ];

  const hour = now.getHours();
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam';
  const firstName = (currentUser?.name ?? currentUser?.email ?? 'Admin').split(' ')[0];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-2xs font-black uppercase tracking-[0.22em] text-ds-ink3">Dashboard</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-ds-ink">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-xs text-ds-ink3">
            Ringkasan operasional hari ini
            {updatedAt && ` · diperbarui ${updatedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`}
            {onlineUsers && onlineUsers.total > 0 && ` · ${onlineUsers.total} pengguna online`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="dashboard-range">Rentang data</label>
          <select
            id="dashboard-range"
            value={range}
            onChange={e => setRange(Number(e.target.value) as 30 | 90 | 365)}
            className="h-10 rounded-2xl border border-ds-border bg-ds-card px-3 text-xs font-bold text-ds-ink2 outline-none focus:border-ds-green/60"
          >
            <option value={30}>30 hari</option>
            <option value={90}>90 hari</option>
            <option value={365}>1 tahun</option>
          </select>
          <button
            onClick={() => void load()}
            aria-label="Muat ulang dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-ds-border bg-ds-card text-ds-ink3 transition-colors hover:border-ds-green/50 hover:text-ds-ink"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => onNavigate('approvals')}
            className="h-10 rounded-2xl bg-ds-green px-4 text-xs font-black text-white shadow-ds-sm transition-transform active:scale-[0.98]"
          >
            + Buka Antrean
          </button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          <p className="text-xs font-bold text-rose-600">Dashboard gagal memuat pesanan: {loadError}</p>
          <button onClick={() => void load()} className="text-2xs font-black uppercase tracking-widest text-rose-500 hover:text-rose-700">
            Coba lagi
          </button>
        </div>
      )}

      {/* Banner antrean — dua hal yang paling sering menahan pekerjaan */}
      <div className="sp-stagger-cards grid gap-4 md:grid-cols-2">
        <button
          onClick={() => onNavigate('approvals')}
          className="group relative overflow-hidden rounded-[1.75rem] bg-gradient-to-r from-[#06483D] via-[#087A58] to-[#0FA36B] p-5 text-left text-white shadow-ds-md"
        >
          <div aria-hidden className="absolute -right-10 -top-16 h-48 w-48 rounded-full border border-white/15" />
          <div aria-hidden className="absolute -right-24 top-6 h-56 w-56 rounded-full border border-white/10" />
          <p className="text-2xs font-black uppercase tracking-[0.2em] text-emerald-100/80">Perlu keputusan</p>
          <p className="mt-2 text-3xl font-black leading-none">{model.totals.pendingOrders}</p>
          <p className="mt-2 max-w-[240px] text-xs text-emerald-50/85">
            Pesanan menunggu review. Setiap hari tunggu menunda penerbitan polis.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-2xs font-black uppercase tracking-widest text-white">
            Buka antrean <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>

        <button
          onClick={() => onNavigate('withdrawals')}
          className="group relative overflow-hidden rounded-[1.75rem] border border-ds-border bg-gradient-to-r from-[#FFF7E6] via-white to-white p-5 text-left shadow-ds-sm"
        >
          <p className="text-2xs font-black uppercase tracking-[0.2em] text-amber-600">Penarikan mitra</p>
          <p className="mt-2 text-3xl font-black leading-none text-ds-ink">{model.totals.pendingWithdrawals}</p>
          <p className="mt-2 max-w-[260px] text-xs text-ds-ink3">
            Menunggu persetujuan berlapis, total {idr(model.totals.withdrawalAmount)}.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-2xs font-black uppercase tracking-widest text-amber-700">
            Tinjau penarikan <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      </div>

      {/* KPI */}
      <div className="sp-stagger-cards grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          return (
            <button
              key={kpi.label}
              onClick={() => onNavigate(kpi.tab)}
              className="rounded-[1.5rem] border border-ds-border bg-ds-card p-4 sm:p-5 text-left shadow-ds-sm transition-all hover:-translate-y-0.5 hover:shadow-ds-md"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ds-green-tint text-ds-green">
                  <Icon size={18} />
                </span>
                {deltaBadge(kpi.delta)}
              </div>
              <p className="mt-4 text-2xs font-black uppercase tracking-[0.16em] text-ds-ink3">{kpi.label}</p>
              <p className="mt-1 text-2xl font-black tracking-tight text-ds-ink">{kpi.value}</p>
              <p className="mt-1 text-2xs font-semibold text-ds-ink3">{kpi.sub}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">

          {/* Pipeline + pesanan terbaru */}
          <section className="rounded-[1.75rem] border border-ds-border bg-ds-card p-5 shadow-ds-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black tracking-tight text-ds-ink">Pipeline Pesanan</h2>
                <p className="text-2xs text-ds-ink3">Komposisi produk pada {range} hari terakhir</p>
              </div>
              <button onClick={() => onNavigate('policy_orders')} className="text-2xs font-black uppercase tracking-widest text-ds-green hover:underline">
                Lihat semua
              </button>
            </div>

            <div className="mt-5 grid gap-6 md:grid-cols-[180px_1fr]">
              <div className="flex flex-col items-center justify-center">
                <div
                  className="relative flex h-40 w-40 items-center justify-center rounded-full"
                  style={{ background: donut }}
                  role="img"
                  aria-label={`Komposisi ${productTotal} pesanan dari ${products.length} produk`}
                >
                  <div className="flex h-[104px] w-[104px] flex-col items-center justify-center rounded-full bg-ds-card">
                    <span className="text-2xl font-black text-ds-ink">{productTotal}</span>
                    <span className="text-2xs font-bold uppercase tracking-widest text-ds-ink3">Pesanan</span>
                  </div>
                </div>
                <div className="mt-4 w-full space-y-1.5">
                  {products.length === 0 && <p className="text-center text-2xs text-ds-ink3">Belum ada data.</p>}
                  {products.map((p, i) => (
                    <div key={p.key} className="flex items-center gap-2 text-2xs">
                      <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      <span className="min-w-0 flex-1 truncate font-semibold text-ds-ink2">{p.label}</span>
                      <span className="font-black text-ds-ink">{p.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="min-w-0">
                <p className="mb-2 text-2xs font-black uppercase tracking-[0.16em] text-ds-ink3">Pesanan terbaru</p>
                {loading && !orders ? (
                  <div className="space-y-3">
                    {[0, 1, 2, 3].map(i => <div key={i} className="h-10 animate-pulse rounded-xl bg-ds-card2" />)}
                  </div>
                ) : model.recent.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ds-border py-10">
                    <FileText size={22} className="text-ds-ink3" />
                    <p className="mt-2 text-xs font-bold text-ds-ink2">Belum ada pesanan</p>
                    <p className="text-2xs text-ds-ink3">Pesanan dari agen akan muncul di sini.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left">
                      <thead>
                        <tr className="text-2xs uppercase tracking-wider text-ds-ink3">
                          <th className="pb-2 font-black">Nasabah</th>
                          <th className="pb-2 font-black">Nomor</th>
                          <th className="pb-2 text-right font-black">Premi</th>
                          <th className="pb-2 text-right font-black">Status</th>
                          <th className="pb-2 text-right font-black">Tanggal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ds-border">
                        {model.recent.map(o => {
                          const st = STATUS_STYLE[o.status] ?? STATUS_STYLE.SUBMITTED;
                          return (
                            <tr
                              key={o.id}
                              onClick={() => onNavigate('policy_orders')}
                              className="cursor-pointer text-xs transition-colors hover:bg-ds-card2"
                            >
                              <td className="py-2.5 pr-3">
                                <p className="truncate font-bold text-ds-ink">{o.client_name ?? '—'}</p>
                                <p className="truncate text-2xs text-ds-ink3">{o.product_name ?? o.product_code ?? '—'}</p>
                              </td>
                              <td className="py-2.5 pr-3 font-mono text-2xs text-ds-ink2">{o.order_number ?? '—'}</td>
                              <td className="py-2.5 pr-3 text-right font-bold text-ds-ink">{formatIDRCompact(o.total_premium ?? 0)}</td>
                              <td className="py-2.5 pr-3 text-right">
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-2xs font-black ${st.className}`}>{st.label}</span>
                              </td>
                              <td className="py-2.5 text-right text-2xs text-ds-ink3">{dayLabel(o.created_at)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Performa produk + seri premi */}
          <section className="rounded-[1.75rem] border border-ds-border bg-ds-card p-5 shadow-ds-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black tracking-tight text-ds-ink">Performa Produk</h2>
                <p className="text-2xs text-ds-ink3">{range} hari terakhir · {productTotal} pesanan</p>
              </div>
              <button onClick={() => onNavigate('financial')} className="text-2xs font-black uppercase tracking-widest text-ds-green hover:underline">
                Laporan
              </button>
            </div>

            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                {products.length === 0 && <p className="py-6 text-center text-2xs text-ds-ink3">Belum ada pesanan pada rentang ini.</p>}
                {products.map((p, i) => {
                  const share = productTotal > 0 ? Math.round((p.count / productTotal) * 100) : 0;
                  return (
                    <div key={p.key}>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                          <span className="truncate font-bold text-ds-ink2">{p.label}</span>
                        </span>
                        <span className="flex-shrink-0 font-black text-ds-ink">{share}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ds-card2">
                        <div className="h-full rounded-full" style={{ width: `${share}%`, background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      </div>
                      <div className="mt-1 flex justify-between text-2xs text-ds-ink3">
                        <span>{p.count} polis</span>
                        <span>{formatIDRCompact(p.premium)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <p className="mb-3 text-2xs font-black uppercase tracking-[0.16em] text-ds-ink3">Premi per bulan</p>
                <div className="flex h-40 items-end gap-2">
                  {model.months.map(m => {
                    const h = m.premium > 0 ? Math.max(6, Math.round((m.premium / maxMonthPremium) * 128)) : 2;
                    return (
                      <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${m.label}: ${idr(m.premium)} (${m.count} pesanan)`}>
                        <span className="text-[0.55rem] font-bold text-ds-ink3">{m.premium > 0 ? formatIDRCompact(m.premium) : ''}</span>
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600/80 to-emerald-400 transition-all"
                          style={{ height: `${h}px` }}
                        />
                        <span className="text-[0.55rem] font-black uppercase tracking-wider text-ds-ink3">{m.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-5 xl:col-span-4">

          {/* Kalender jatuh tempo */}
          <section className="rounded-[1.75rem] border border-ds-border bg-ds-card p-5 shadow-ds-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-black tracking-tight text-ds-ink">Jatuh Tempo</h2>
                <p className="text-2xs capitalize text-ds-ink3">{monthName}</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ds-green-tint text-ds-green">
                <CalendarDays size={17} />
              </span>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1 text-center">
              {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => (
                <span key={d} className="pb-1 text-[0.55rem] font-black uppercase tracking-wider text-ds-ink3">{d}</span>
              ))}
              {Array.from({ length: firstWeekday }).map((_, i) => <span key={`pad-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const count = renewalByDay.get(day) ?? 0;
                const isToday = day === now.getDate();
                return (
                  <div
                    key={day}
                    className={`relative flex h-8 items-center justify-center rounded-lg text-2xs font-bold ${
                      isToday ? 'bg-ds-green text-white' : count > 0 ? 'bg-amber-500/10 text-amber-700' : 'text-ds-ink2'
                    }`}
                    title={count > 0 ? `${count} polis berakhir` : undefined}
                  >
                    {day}
                    {count > 0 && !isToday && (
                      <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-amber-500" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-ds-card2 px-3 py-2.5">
              <div>
                <p className="text-lg font-black leading-none text-ds-ink">{model.renewalCount}</p>
                <p className="text-2xs text-ds-ink3">polis berakhir bulan ini</p>
              </div>
              <button onClick={() => onNavigate('policy_orders')} className="text-2xs font-black uppercase tracking-widest text-ds-green hover:underline">
                Lihat
              </button>
            </div>
          </section>

          {/* Tugas saya */}
          <section className="rounded-[1.75rem] border border-ds-border bg-ds-card p-5 shadow-ds-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black tracking-tight text-ds-ink">Tugas Saya</h2>
                <p className="text-2xs text-ds-ink3">Yang paling lama menunggu lebih dulu</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ds-green-tint text-ds-green">
                <ListChecks size={17} />
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {model.tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ds-border py-8">
                  <CheckCircle2 size={22} className="text-emerald-500" />
                  <p className="mt-2 text-xs font-bold text-ds-ink2">Tidak ada tugas menunggu</p>
                  <p className="text-2xs text-ds-ink3">Semua antrean bersih.</p>
                </div>
              ) : model.tasks.map(task => {
                const meta = TASK_META[task.kind];
                const Icon = meta.icon;
                return (
                  <button
                    key={task.id}
                    onClick={() => onNavigate(task.tab)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-transparent px-2 py-2 text-left transition-colors hover:border-ds-border hover:bg-ds-card2"
                  >
                    <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${meta.className}`}>
                      <Icon size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-bold text-ds-ink">{task.title}</span>
                        <span className="flex-shrink-0 rounded-full bg-ds-card2 px-1.5 py-0.5 text-[0.5rem] font-black uppercase tracking-wider text-ds-ink3">{meta.label}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-2xs text-ds-ink3">
                        <span className="truncate">{task.subtitle}</span>
                        {task.amount ? <span className="flex-shrink-0">· {formatIDRCompact(task.amount)}</span> : null}
                      </span>
                    </span>
                    <span className="flex flex-shrink-0 items-center gap-1 text-2xs font-bold text-ds-ink3">
                      <Clock size={10} /> {task.ageDays}h
                    </span>
                    <ChevronRight size={14} className="flex-shrink-0 text-ds-ink3" />
                  </button>
                );
              })}
            </div>
          </section>

          {/* Ringkasan cepat */}
          <section className="rounded-[1.75rem] border border-ds-border bg-ds-card p-5 shadow-ds-sm">
            <h2 className="text-sm font-black tracking-tight text-ds-ink">Ringkasan Cepat</h2>
            <div className="sp-stagger-cards mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-ds-card2 p-3">
                <Users size={15} className="text-ds-blue" />
                <p className="mt-2 text-lg font-black text-ds-ink">{model.totals.activeAgents}</p>
                <p className="text-2xs text-ds-ink3">Mitra aktif</p>
              </div>
              <div className="rounded-2xl bg-ds-card2 p-3">
                <TrendingUp size={15} className="text-amber-600" />
                <p className="mt-2 text-lg font-black text-ds-ink">{model.totals.tierPending}</p>
                <p className="text-2xs text-ds-ink3">Tier menunggu</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
