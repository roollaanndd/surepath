// Admin Portal 2.0 — Dashboard: pusat komando bisnis, bukan papan KPI.
//
// Reinvented visual language (hero editorial overview, financial
// intelligence charts, business growth insights, activity feed) over the
// SAME data path as before: buildDashboardModel() (dashboardData.ts) and
// adminStats/claims/withdrawals/tierPending/notifications, all already
// fetched by AdminPortal. No new gateway calls, no invented numbers —
// `topAgents` was already in AdminStats and unused here; `notifications` is
// newly passed down from AdminPortal's existing poll, nothing new fetched.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  ArrowDownRight, ArrowUpRight, Award, Banknote, CalendarDays, CheckCircle2,
  ChevronRight, Clock, FileText, ListChecks, RefreshCw, ShieldAlert,
  Sparkles, TrendingUp, Users,
} from 'lucide-react';
import { getAllOrders } from '../../services/orders';
import type { AdminStats, OnlineUsersResult, SpAdminNotification } from '../../services/supabaseService';
import type { SpClaim, SpPolicyOrder, Withdrawal } from '../../services/dbTypes';
import { formatIDR } from '../car-wizard/WizardUI';
import { formatIDRCompact } from '../../src/i18n';
import { buildDashboardModel, groupProducts, type DashboardTask } from './dashboardData';
import { adminNotifMeta, adminNotifTimeAgo } from './notifMeta';

interface AdminDashboardProps {
  adminStats: AdminStats | null;
  claims: SpClaim[] | null;
  withdrawals: (Withdrawal & { agent_name?: string })[] | null;
  tierPending: number;
  onlineUsers: OnlineUsersResult | null;
  notifications?: SpAdminNotification[];
  currentUser: { name?: string; email?: string } | null;
  onNavigate: (tab: string) => void;
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  SUBMITTED:    { label: 'Diajukan',     className: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20' },
  UNDER_REVIEW: { label: 'Ditinjau',     className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20' },
  APPROVED:     { label: 'Disetujui',    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' },
  ISSUED:       { label: 'Terbit',       className: 'bg-emerald-600/10 text-emerald-700 border-emerald-600/20' },
  REJECTED:     { label: 'Ditolak',      className: 'bg-rose-500/10 text-rose-700 dark:text-rose-200 border-rose-500/20' },
  CANCELLED:    { label: 'Dibatalkan',   className: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
};

const TASK_META: Record<DashboardTask['kind'], { icon: React.ElementType; className: string; label: string }> = {
  order:      { icon: FileText,    className: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',   label: 'Polis' },
  claim:      { icon: ShieldAlert, className: 'bg-rose-500/10 text-rose-700 dark:text-rose-200',     label: 'Klaim' },
  withdrawal: { icon: Banknote,    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',     label: 'Penarikan' },
  tier:       { icon: TrendingUp,  className: 'bg-violet-500/10 text-violet-700 dark:text-violet-300', label: 'Tier' },
};

// Palet produk: lime sebagai aksen pertama (sesuai brief, dipakai hemat),
// sisanya dari token semantik yang sudah ada — bukan palet baru.
const PRODUCT_COLORS = ['#076653', '#3B82F6', '#F59E0B', '#8B5CF6', '#94A3B8'];

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
  adminStats, claims, withdrawals, tierPending, onlineUsers, notifications, currentUser, onNavigate,
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
  const pieData = useMemo(
    () => products.map((p, i) => ({ ...p, fill: PRODUCT_COLORS[i % PRODUCT_COLORS.length] })),
    [products],
  );

  const now = new Date();
  const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(now);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const firstWeekday = (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7; // Senin = 0
  const renewalByDay = new Map(model.renewals.map(r => [r.day, r.count]));

  const deltaBadge = (value: number | null) => {
    if (value === null) return <span className="text-2xs font-bold text-ds-ink3">—</span>;
    const good = value >= 0;
    const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
    return (
      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-2xs font-black ${
        good ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-700 dark:text-rose-200'
      }`}>
        <Icon size={11} /> {Math.abs(value)}%
      </span>
    );
  };

  const secondaryStats = [
    { label: 'Total Pesanan', value: String(model.totals.orders), icon: FileText, sub: `${model.totals.pendingOrders} perlu keputusan`, tab: 'policy_orders' },
    { label: 'Klaim Menunggu', value: String(model.totals.pendingClaims), icon: ShieldAlert, sub: `${claims?.length ?? 0} klaim total`, tab: 'claims_admin' },
    { label: 'Penarikan Pending', value: String(model.totals.pendingWithdrawals), icon: Banknote, sub: formatIDRCompact(model.totals.withdrawalAmount), tab: 'withdrawals' },
    { label: 'Mitra Aktif', value: String(model.totals.activeAgents), icon: Users, sub: `${model.totals.tierPending} tier menunggu`, tab: 'agents' },
  ];

  // Mitra terbaik: adminStats.topAgents sudah dihitung server-side (getAdminStats)
  // dan sebelumnya tidak dipakai di mana pun pada dashboard — bukan data baru.
  const topAgents = (adminStats?.topAgents ?? []).slice(0, 5);

  const recentNotifications = (notifications ?? []).slice(0, 6);

  const hour = now.getHours();
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam';
  const firstName = (currentUser?.name ?? currentUser?.email ?? 'Admin').split(' ')[0];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Executive overview: satu hero editorial, bukan 4 kartu kembar ── */}
      <section
        className="relative overflow-hidden rounded-[1.75rem] p-6 text-white shadow-ds-md sm:p-7"
        style={{ background: 'var(--ds-admin-hero)' }}
      >
        <div aria-hidden className="absolute -right-16 -top-20 h-64 w-64 rounded-full border border-white/10" />
        <div aria-hidden className="absolute -right-32 top-10 h-72 w-72 rounded-full border border-white/5" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-2xs font-black uppercase tracking-[0.24em] text-ds-admin-lime">
              {greeting}, {firstName}
            </p>
            <p className="mt-2 text-2xs font-bold uppercase tracking-widest text-white/60">Premi Diterbitkan</p>
            <p className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">{idr(model.totals.issuedPremium)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {deltaBadge(model.deltas.premium)}
              <span className="text-xs text-white/70">vs 30 hari sebelumnya</span>
              {updatedAt && (
                <span className="text-2xs text-white/50">
                  · diperbarui {updatedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {onlineUsers && onlineUsers.total > 0 && (
                <span className="text-2xs text-white/50">· {onlineUsers.total} pengguna online</span>
              )}
            </div>
          </div>

          {/* Sparkline tren 6 bulan — recharts, data sama dengan model.months */}
          <div className="flex w-full flex-col gap-2 lg:w-[280px]">
            <div className="flex items-center justify-between text-2xs font-bold uppercase tracking-widest text-white/60">
              <span>Tren premi 6 bulan</span>
              <Sparkles size={13} className="text-ds-admin-lime" />
            </div>
            <div className="h-16 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={model.months} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="heroSparkline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E3EF26" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#E3EF26" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="premium"
                    stroke="#E3EF26"
                    strokeWidth={2}
                    fill="url(#heroSparkline)"
                    isAnimationActive
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-2xs font-semibold text-white/50">
              <span>{model.months[0]?.label}</span>
              <span>{model.months[model.months.length - 1]?.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="dashboard-range">Rentang data</label>
            <select
              id="dashboard-range"
              value={range}
              onChange={e => setRange(Number(e.target.value) as 30 | 90 | 365)}
              className="h-10 rounded-2xl border border-white/20 bg-white/10 px-3 text-xs font-bold text-white outline-none backdrop-blur-sm focus:border-ds-admin-lime/60"
            >
              <option className="text-ds-ink" value={30}>30 hari</option>
              <option className="text-ds-ink" value={90}>90 hari</option>
              <option className="text-ds-ink" value={365}>1 tahun</option>
            </select>
            <button
              onClick={() => void load()}
              aria-label="Muat ulang dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-colors hover:border-ds-admin-lime/50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </section>

      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          <p className="text-xs font-bold text-rose-700 dark:text-rose-200">Dashboard gagal memuat pesanan: {loadError}</p>
          <button onClick={() => void load()} className="text-2xs font-black uppercase tracking-widest text-rose-700 dark:text-rose-200 hover:text-rose-700">
            Coba lagi
          </button>
        </div>
      )}

      {/* ── Operational intelligence: apa yang butuh perhatian sekarang ── */}
      <div className="sp-stagger-cards grid gap-4 md:grid-cols-2">
        <button
          onClick={() => onNavigate('approvals')}
          className="group relative overflow-hidden rounded-[1.75rem] p-5 text-left text-white shadow-ds-md"
          style={{ background: 'linear-gradient(120deg, var(--ds-admin-forest), var(--ds-admin-emerald))' }}
        >
          <p className="text-2xs font-black uppercase tracking-[0.2em] text-ds-admin-lime-tint">Perlu keputusan</p>
          <p className="mt-2 text-3xl font-black leading-none">{model.totals.pendingOrders}</p>
          <p className="mt-2 max-w-[240px] text-xs text-white/80">
            Pesanan menunggu review. Setiap hari tunggu menunda penerbitan polis.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-2xs font-black uppercase tracking-widest text-white">
            Buka antrean <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>

        <button
          onClick={() => onNavigate('withdrawals')}
          className="group relative overflow-hidden rounded-[1.75rem] border border-ds-border p-5 text-left shadow-ds-sm"
          style={{ background: 'linear-gradient(120deg, var(--ds-admin-warm-white), #ffffff)' }}
        >
          <p className="text-2xs font-black uppercase tracking-[0.2em] text-amber-800 dark:text-amber-300">Penarikan mitra</p>
          <p className="mt-2 text-3xl font-black leading-none text-ds-ink">{model.totals.pendingWithdrawals}</p>
          <p className="mt-2 max-w-[260px] text-xs text-ds-ink3">
            Menunggu persetujuan berlapis, total {idr(model.totals.withdrawalAmount)}.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-2xs font-black uppercase tracking-widest text-amber-700">
            Tinjau penarikan <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      </div>

      {/* Statistik sekunder: kompak, bukan 4 kartu identik berulang dari hero */}
      <div className="sp-stagger-cards grid grid-cols-2 gap-4 xl:grid-cols-4">
        {secondaryStats.map(kpi => {
          const Icon = kpi.icon;
          return (
            <button
              key={kpi.label}
              onClick={() => onNavigate(kpi.tab)}
              className="rounded-[1.5rem] border border-ds-border bg-ds-card p-4 text-left shadow-ds-sm transition-all hover:-translate-y-0.5 hover:shadow-ds-md"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ds-admin-lime-tint text-ds-admin-forest">
                <Icon size={16} />
              </span>
              <p className="mt-3 text-2xs font-black uppercase tracking-[0.16em] text-ds-ink3">{kpi.label}</p>
              <p className="mt-1 text-xl font-black tracking-tight text-ds-ink">{kpi.value}</p>
              <p className="mt-1 text-2xs font-semibold text-ds-ink3">{kpi.sub}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-8">

          {/* Financial intelligence: tren premi + komposisi produk, recharts interaktif */}
          <section className="rounded-[1.75rem] border border-ds-border bg-ds-card p-5 shadow-ds-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black tracking-tight text-ds-ink">Financial Intelligence</h2>
                <p className="text-2xs text-ds-ink3">Tren premi & komposisi produk — {range} hari terakhir</p>
              </div>
              <button onClick={() => onNavigate('financial')} className="text-2xs font-black uppercase tracking-widest text-ds-admin-forest hover:underline">
                Laporan
              </button>
            </div>

            <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_200px]">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={model.months} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="premiumTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#076653" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#076653" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      formatter={(value: number) => [idr(value), 'Premi']}
                      labelFormatter={(label: string) => label}
                      contentStyle={{ borderRadius: 12, border: '1px solid var(--ds-border)', fontSize: 12 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="premium"
                      stroke="#076653"
                      strokeWidth={2.5}
                      fill="url(#premiumTrend)"
                      dot={{ r: 3, fill: '#076653' }}
                      isAnimationActive
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="h-36 w-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData.length ? pieData : [{ key: 'empty', label: 'Belum ada data', count: 1, fill: '#E5E7EB' }]}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={42}
                        outerRadius={64}
                        paddingAngle={2}
                        isAnimationActive
                      >
                        {(pieData.length ? pieData : [{ key: 'empty', fill: '#E5E7EB' }]).map(p => (
                          <Cell key={p.key} fill={p.fill} stroke="none" />
                        ))}
                      </Pie>
                      {pieData.length > 0 && (
                        <Tooltip
                          formatter={(value: number, _n, entry: any) => [`${value} pesanan`, entry?.payload?.label]}
                          contentStyle={{ borderRadius: 12, border: '1px solid var(--ds-border)', fontSize: 12 }}
                        />
                      )}
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full space-y-1.5">
                  {products.length === 0 && <p className="text-center text-2xs text-ds-ink3">Belum ada data.</p>}
                  {pieData.map(p => (
                    <div key={p.key} className="flex items-center gap-2 text-2xs">
                      <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: p.fill }} />
                      <span className="min-w-0 flex-1 truncate font-semibold text-ds-ink2">{p.label}</span>
                      <span className="font-black text-ds-ink">{p.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Pesanan terbaru */}
          <section className="rounded-[1.75rem] border border-ds-border bg-ds-card p-5 shadow-ds-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black tracking-tight text-ds-ink">Pesanan Terbaru</h2>
                <p className="text-2xs text-ds-ink3">{productTotal} pesanan pada {range} hari terakhir</p>
              </div>
              <button onClick={() => onNavigate('policy_orders')} className="text-2xs font-black uppercase tracking-widest text-ds-admin-forest hover:underline">
                Lihat semua
              </button>
            </div>

            <div className="mt-4 min-w-0">
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
          </section>

          {/* Business growth insights: mitra terbaik — data nyata dari getAdminStats */}
          <section className="rounded-[1.75rem] border border-ds-border bg-ds-card p-5 shadow-ds-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black tracking-tight text-ds-ink">Mitra Terbaik</h2>
                <p className="text-2xs text-ds-ink3">Berdasarkan premi yang dihasilkan</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ds-admin-lime-tint text-ds-admin-forest">
                <Award size={17} />
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {topAgents.length === 0 ? (
                <p className="py-6 text-center text-2xs text-ds-ink3">Belum ada data performa mitra.</p>
              ) : topAgents.map((a, i) => (
                <button
                  key={a.agent_id}
                  onClick={() => onNavigate('agents')}
                  className="flex w-full items-center gap-3 rounded-2xl border border-transparent px-2 py-2 text-left transition-colors hover:border-ds-border hover:bg-ds-card2"
                >
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-ds-admin-forest text-2xs font-black text-white">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="truncate text-xs font-bold text-ds-ink">{a.name}</span>
                    <span className="block text-2xs text-ds-ink3">{a.orders} pesanan</span>
                  </span>
                  <span className="flex-shrink-0 text-xs font-black text-ds-ink">{formatIDRCompact(a.premium)}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5 xl:col-span-4">

          {/* Activity intelligence: notifikasi platform, data sama dengan bell header */}
          <section className="rounded-[1.75rem] border border-ds-border bg-ds-card p-5 shadow-ds-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-black tracking-tight text-ds-ink">Aktivitas Terbaru</h2>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ds-admin-lime-tint text-ds-admin-forest">
                <Sparkles size={16} />
              </span>
            </div>
            <div className="mt-3 space-y-1">
              {recentNotifications.length === 0 ? (
                <p className="py-6 text-center text-2xs text-ds-ink3">Belum ada aktivitas.</p>
              ) : recentNotifications.map(n => {
                const meta = adminNotifMeta(n.type);
                const Icon = meta.Icon;
                return (
                  <div key={n.id} className="flex items-start gap-2.5 rounded-xl px-1 py-1.5">
                    <span className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-ds-card2 ${meta.cls}`}>
                      <Icon size={12} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-ds-ink">{n.title}</span>
                      <span className="block text-2xs text-ds-ink3">{adminNotifTimeAgo(n.created_at)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Kalender jatuh tempo */}
          <section className="rounded-[1.75rem] border border-ds-border bg-ds-card p-5 shadow-ds-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-black tracking-tight text-ds-ink">Jatuh Tempo</h2>
                <p className="text-2xs capitalize text-ds-ink3">{monthName}</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ds-admin-lime-tint text-ds-admin-forest">
                <CalendarDays size={17} />
              </span>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1 text-center">
              {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => (
                <span key={d} className="pb-1 text-2xs font-black uppercase tracking-wider text-ds-ink3">{d}</span>
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
                      isToday ? 'bg-ds-admin-forest text-white' : count > 0 ? 'bg-amber-500/10 text-amber-700' : 'text-ds-ink2'
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
              <button onClick={() => onNavigate('policy_orders')} className="text-2xs font-black uppercase tracking-widest text-ds-admin-forest hover:underline">
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
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ds-admin-lime-tint text-ds-admin-forest">
                <ListChecks size={17} />
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {model.tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ds-border py-8">
                  <CheckCircle2 size={22} className="text-emerald-700 dark:text-emerald-300" />
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
                        <span className="flex-shrink-0 rounded-full bg-ds-card2 px-1.5 py-0.5 text-2xs font-black uppercase tracking-wider text-ds-ink3">{meta.label}</span>
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
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
