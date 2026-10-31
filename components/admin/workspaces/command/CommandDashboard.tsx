// Admin Portal 2.0 — Command Dashboard: ringkasan bisnis level MASTER_ADMIN.
//
// Sebelumnya layar ini hanya menampilkan 4 KPI generik + daftar tombol tanpa
// aksi (lihat git blame) — jauh di bawah kualitas AdminDashboard.tsx (dibangun
// di PR #332). Rebuild ini memakai bahasa visual yang sama (hero editorial
// ALTITUDE, grafik recharts interaktif, panel data nyata, stagger transition)
// tapi dengan sudut pandang pemilik platform: kesehatan bisnis menyeluruh,
// keputusan tertunda yang paling berisiko, dan postur keamanan — bukan
// sekadar duplikat AdminDashboard.
//
// Semua angka berasal dari sumber data nyata yang sudah ada:
//   - getAdminStats() / getAllOrders()  → services/orders.ts
//   - getAllClaims()                    → services/claims.ts
//   - getAdminWithdrawals()             → services/wallet.ts
//   - getTierChangeRequests()           → services/wallet.ts
//   - getAdminNotifications()          → services/notifications.ts
//   - getOnlineUsers() / getSecurityStats() → services/website.ts
// buildDashboardModel()/groupProducts() (dashboardData.ts) menghitung tren,
// komposisi produk, dan antrean prioritas dari baris yang sama dipakai
// AdminDashboard — tidak ada multiplier atau angka "contoh".
//
// Admin (termasuk workspace MASTER_ADMIN) terang-saja (design.md §4) — tidak
// ada varian dark di sini.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip,
} from 'recharts';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Clock, LogIn, RefreshCw } from 'lucide-react';
import WorkspaceShell from '../shared/WorkspaceShell';
import KpiCard from '../shared/KpiCard';
import { AdminSectionCard } from '../../adminUI';
import { adminNotifMeta, adminNotifTimeAgo } from '../../notifMeta';
import { buildDashboardModel, groupProducts, type DashboardTask } from '../../dashboardData';
import {
  getAdminStats, getAllOrders, getAllClaims, getAdminWithdrawals, getTierChangeRequests,
  getAdminNotifications, getOnlineUsers, getSecurityStats,
  type AdminStats, type OnlineUsersResult, type SecurityStats, type SpAdminNotification,
} from '../../../../services/supabaseService';
import type { SpClaim, SpPolicyOrder, Withdrawal } from '../../../../services/dbTypes';
import { formatIDR } from '../../../car-wizard/WizardUI';
import { formatIDRCompact } from '../../../../src/i18n';
import ModuleIcon from '../../../shared/ModuleIcon';

interface Props {
  userRole: string;
  currentUser: any;
  onLogout: () => void;
}

const PRODUCT_COLORS = ['#076653', '#3B82F6', '#F59E0B', '#8B5CF6', '#94A3B8'];
const idr = (n: number) => formatIDR(Math.round(n));

const TASK_META: Record<DashboardTask['kind'], { iconId: string; className: string; label: string }> = {
  order:      { iconId: 'policy_orders', className: 'bg-amber-500/10 text-amber-800',   label: 'Polis' },
  claim:      { iconId: 'claims_admin', className: 'bg-rose-500/10 text-rose-700',     label: 'Klaim' },
  withdrawal: { iconId: 'withdrawals', className: 'bg-blue-500/10 text-blue-700',     label: 'Penarikan' },
  tier:       { iconId: 'tier_promo', className: 'bg-violet-500/10 text-violet-700', label: 'Tier' },
};

export const CommandDashboard: React.FC<Props> = ({ userRole, currentUser, onLogout }) => {
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<SpPolicyOrder[] | null>(null);
  const [claims, setClaims] = useState<SpClaim[]>([]);
  const [withdrawals, setWithdrawals] = useState<(Withdrawal & { agent_name?: string })[]>([]);
  const [tierPending, setTierPending] = useState(0);
  const [notifications, setNotifications] = useState<SpAdminNotification[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUsersResult | null>(null);
  const [security, setSecurity] = useState<SecurityStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [range, setRange] = useState<30 | 90 | 365>(30);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const results = await Promise.allSettled([
        getAdminStats(),
        getAllOrders(500, true),
        getAllClaims(),
        getAdminWithdrawals(200, true),
        getTierChangeRequests('PENDING'),
        getAdminNotifications(),
        getOnlineUsers(),
        getSecurityStats(),
      ]);
      const [s, o, c, w, t, n, ou, sec] = results;
      if (s.status === 'fulfilled') setAdminStats(s.value);
      if (o.status === 'fulfilled') setOrders(o.value); else setLoadError(String((o as PromiseRejectedResult).reason?.message ?? 'Gagal memuat pesanan.'));
      if (c.status === 'fulfilled') setClaims(c.value);
      if (w.status === 'fulfilled') setWithdrawals(w.value);
      if (t.status === 'fulfilled') setTierPending(t.value.length);
      if (n.status === 'fulfilled') setNotifications(n.value);
      if (ou.status === 'fulfilled') setOnlineUsers(ou.value);
      if (sec.status === 'fulfilled') setSecurity(sec.value);
      setUpdatedAt(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const model = useMemo(() => buildDashboardModel({
    orders: orders ?? [],
    claims,
    withdrawals,
    tierPending,
    activeAgents: adminStats?.activeAgents ?? 0,
  }), [orders, claims, withdrawals, tierPending, adminStats?.activeAgents]);

  const DAY_MS = 86_400_000;
  const withinRange = useCallback((iso: string | undefined) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return Number.isFinite(t) && t >= Date.now() - range * DAY_MS;
  }, [range]);

  const scopedOrders = useMemo(() => (orders ?? []).filter(o => withinRange(o.created_at)), [orders, withinRange]);
  const products = useMemo(() => groupProducts(scopedOrders), [scopedOrders]);
  const pieData = useMemo(() => products.map((p, i) => ({ ...p, fill: PRODUCT_COLORS[i % PRODUCT_COLORS.length] })), [products]);

  const topAgents = (adminStats?.topAgents ?? []).slice(0, 5);
  const recentNotifications = notifications.slice(0, 6);
  const priorityTasks = model.tasks.slice(0, 5);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam';
  const firstName = (currentUser?.name ?? currentUser?.email ?? 'Master Admin').split(' ')[0];

  const deltaBadge = (value: number | null) => {
    if (value === null) return <span className="text-2xs font-bold text-ds-ink3">—</span>;
    const good = value >= 0;
    const Icon = good ? ArrowUpRight : ArrowDownRight;
    return (
      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-2xs font-black ${
        good ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-700'
      }`}>
        <Icon size={11} /> {Math.abs(value)}%
      </span>
    );
  };

  const onlineByRole = Object.entries(onlineUsers?.byRole ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <WorkspaceShell
      workspace="command"
      userRole={userRole}
      userName={currentUser?.name}
      onLogout={onLogout}
      actions={
        <button
          onClick={() => void load()}
          className="flex h-9 items-center gap-1.5 rounded-full border border-ds-border px-3 text-xs font-bold text-ds-ink3 transition-all hover:border-ds-admin-forest/40 hover:text-ds-ink"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      }
    >
      <div className="animate-fade-in space-y-5">

        {/* ── Hero: pandangan pemilik platform, bukan 4 kartu kembar ── */}
        <section
          className="relative overflow-hidden rounded-[1.75rem] p-6 text-white shadow-ds-md sm:p-7"
          style={{ background: 'var(--ds-admin-hero)' }}
        >
          <div aria-hidden className="absolute -right-16 -top-20 h-64 w-64 rounded-full border border-white/10" />
          <div aria-hidden className="absolute -right-32 top-10 h-72 w-72 rounded-full border border-white/5" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-2xs font-black uppercase tracking-[0.24em] text-ds-admin-lime">
                {greeting}, {firstName} · Command Center
              </p>
              <p className="mt-2 text-2xs font-bold uppercase tracking-widest text-white/60">Premi Diterbitkan (Seluruh Platform)</p>
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

            <div className="flex w-full flex-col gap-2 lg:w-[280px]">
              <div className="flex items-center justify-between text-2xs font-bold uppercase tracking-widest text-white/60">
                <span>Tren premi 6 bulan</span>
                <ModuleIcon id="analytics" size={22} />
              </div>
              <div className="h-16 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={model.months} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="commandHeroSparkline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E3EF26" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="#E3EF26" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="premium" stroke="#E3EF26" strokeWidth={2} fill="url(#commandHeroSparkline)" isAnimationActive />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between text-2xs font-semibold text-white/50">
                <span>{model.months[0]?.label}</span>
                <span>{model.months[model.months.length - 1]?.label}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="command-range">Rentang data</label>
              <select
                id="command-range"
                value={range}
                onChange={e => setRange(Number(e.target.value) as 30 | 90 | 365)}
                className="h-10 rounded-2xl border border-white/20 bg-white/10 px-3 text-xs font-bold text-white outline-none backdrop-blur-sm transition-colors focus:border-ds-admin-lime/60"
              >
                <option className="text-ds-ink" value={30}>30 hari</option>
                <option className="text-ds-ink" value={90}>90 hari</option>
                <option className="text-ds-ink" value={365}>1 tahun</option>
              </select>
            </div>
          </div>
        </section>

        {loadError && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-xs font-bold text-rose-700">Gagal memuat sebagian data: {loadError}</p>
            <button onClick={() => void load()} className="text-2xs font-black uppercase tracking-widest text-rose-700 hover:underline">
              Coba lagi
            </button>
          </div>
        )}

        {/* ── Keputusan berisiko tinggi, level platform ── */}
        <div className="sp-stagger-cards grid gap-4 md:grid-cols-2">
          <div
            className="group relative overflow-hidden rounded-[1.75rem] p-5 text-white shadow-ds-md transition-transform hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(120deg, var(--ds-admin-forest), var(--ds-admin-emerald))' }}
          >
            <p className="text-2xs font-black uppercase tracking-[0.2em] text-ds-admin-lime-tint">Perlu keputusan</p>
            <p className="mt-2 text-3xl font-black leading-none">{model.totals.pendingOrders}</p>
            <p className="mt-2 max-w-[260px] text-xs text-white/80">
              Pesanan menunggu review admin sebelum polis diterbitkan.
            </p>
          </div>
          <div
            className="group relative overflow-hidden rounded-[1.75rem] border border-ds-border p-5 text-left shadow-ds-sm transition-transform hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(120deg, var(--ds-admin-warm-white), #ffffff)' }}
          >
            <p className="text-2xs font-black uppercase tracking-[0.2em] text-amber-800">Penarikan mitra</p>
            <p className="mt-2 text-3xl font-black leading-none text-ds-ink">{model.totals.pendingWithdrawals}</p>
            <p className="mt-2 max-w-[280px] text-xs text-ds-ink3">
              Menunggu persetujuan berlapis, total {idr(model.totals.withdrawalAmount)}.
            </p>
          </div>
        </div>

        {/* ── Statistik platform ── */}
        <div className="sp-stagger-cards grid grid-cols-2 gap-4 xl:grid-cols-4">
          <KpiCard label="Total Pesanan" value={adminStats?.totalOrders ?? model.totals.orders} sublabel="Seluruh status" iconId="policy_orders" accent="#3B82F6" />
          <KpiCard label="Mitra Aktif" value={model.totals.activeAgents} sublabel={`${model.totals.tierPending} tier menunggu`} iconId="agents" accent="#A855F7" />
          <KpiCard label="Komisi Tertunda" value={adminStats ? formatIDRCompact(adminStats.pendingCommissions) : '—'} sublabel="Perlu review" iconId="commission" accent="#F59E0B" />
          <KpiCard label="Klaim Menunggu" value={model.totals.pendingClaims} sublabel={`${claims.length} klaim total`} iconId="claims_admin" accent="#EF4444" />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="space-y-5 xl:col-span-8">

            {/* Financial Intelligence */}
            <section className="rounded-[1.75rem] border border-ds-border bg-ds-card p-5 shadow-ds-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black tracking-tight text-ds-ink">Financial Intelligence</h2>
                  <p className="text-2xs text-ds-ink3">Tren premi & komposisi produk — {range} hari terakhir, seluruh platform</p>
                </div>
              </div>

              <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_200px]">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={model.months} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="commandPremiumTrend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#076653" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#076653" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <Tooltip
                        formatter={(value: number) => [idr(value), 'Premi']}
                        labelFormatter={(label: string) => label}
                        contentStyle={{ borderRadius: 12, border: '1px solid var(--ds-border)', fontSize: 12 }}
                      />
                      <Area type="monotone" dataKey="premium" stroke="#076653" strokeWidth={2.5} fill="url(#commandPremiumTrend)" dot={{ r: 3, fill: '#076653' }} isAnimationActive />
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

            {/* Mitra Terbaik */}
            <AdminSectionCard className="rounded-[1.75rem]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black tracking-tight text-ds-ink">Mitra Terbaik</h2>
                  <p className="text-2xs text-ds-ink3">Berdasarkan premi yang dihasilkan</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ds-admin-lime-tint text-ds-admin-forest">
                  <ModuleIcon id="tier_promo" size={30} />
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {topAgents.length === 0 ? (
                  <p className="py-6 text-center text-2xs text-ds-ink3">Belum ada data performa mitra.</p>
                ) : topAgents.map((a, i) => (
                  <div key={a.agent_id} className="flex w-full items-center gap-3 rounded-2xl border border-transparent px-2 py-2 transition-colors hover:border-ds-border hover:bg-ds-card2">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-ds-admin-forest text-2xs font-black text-white">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-ds-ink">{a.name}</span>
                      <span className="block text-2xs text-ds-ink3">{a.orders} pesanan</span>
                    </span>
                    <span className="flex-shrink-0 text-xs font-black text-ds-ink">{formatIDRCompact(a.premium)}</span>
                  </div>
                ))}
              </div>
            </AdminSectionCard>

            {/* Antrean Prioritas */}
            <AdminSectionCard className="rounded-[1.75rem]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black tracking-tight text-ds-ink">Antrean Prioritas</h2>
                  <p className="text-2xs text-ds-ink3">Yang paling lama menunggu di seluruh platform</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ds-admin-lime-tint text-ds-admin-forest">
                  <ModuleIcon id="approvals" size={30} />
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {priorityTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ds-border py-8">
                    <ModuleIcon id="security" size={36} />
                    <p className="mt-2 text-xs font-bold text-ds-ink2">Tidak ada tugas menunggu</p>
                    <p className="text-2xs text-ds-ink3">Semua antrean bersih.</p>
                  </div>
                ) : priorityTasks.map(task => {
                  const meta = TASK_META[task.kind];
                  return (
                    <div key={task.id} className="flex w-full items-center gap-3 rounded-2xl border border-transparent px-2 py-2 transition-colors hover:border-ds-border hover:bg-ds-card2">
                      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${meta.className}`}>
                        <ModuleIcon id={meta.iconId} size={28} />
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
                    </div>
                  );
                })}
              </div>
            </AdminSectionCard>
          </div>

          <div className="space-y-5 xl:col-span-4">

            {/* Platform Health & Keamanan — sudut pandang khas MASTER_ADMIN */}
            <AdminSectionCard className="rounded-[1.75rem]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-black tracking-tight text-ds-ink">Kesehatan & Keamanan Platform</h2>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ds-admin-lime-tint text-ds-admin-forest">
                  <ModuleIcon id="security" size={30} />
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-ds-card2 px-3 py-2.5">
                  <p className="flex items-center gap-1 text-2xs font-bold text-ds-ink3"><LogIn size={11} /> Sesi aktif</p>
                  <p className="mt-1 text-lg font-black text-ds-ink">{security?.activeSessionsCount ?? '—'}</p>
                </div>
                <div className="rounded-2xl bg-ds-card2 px-3 py-2.5">
                  <p className="flex items-center gap-1 text-2xs font-bold text-ds-ink3"><AlertTriangle size={11} /> Login gagal (24j)</p>
                  <p className="mt-1 text-lg font-black text-ds-ink">{security?.failedLogins24h ?? 0}</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xs font-bold uppercase tracking-wider text-ds-ink3">Pengguna online per peran</p>
                <div className="mt-2 space-y-1.5">
                  {onlineByRole.length === 0 ? (
                    <p className="py-3 text-center text-2xs text-ds-ink3">Tidak ada aktivitas langsung.</p>
                  ) : onlineByRole.map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between text-2xs">
                      <span className="font-semibold text-ds-ink2">{role.replace(/_/g, ' ')}</span>
                      <span className="font-black text-ds-ink">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              {security?.lastLoginAt && (
                <p className="mt-3 text-2xs text-ds-ink3">Login terakhir tercatat {adminNotifTimeAgo(security.lastLoginAt)}.</p>
              )}
            </AdminSectionCard>

            {/* Aktivitas Terbaru */}
            <AdminSectionCard className="rounded-[1.75rem]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-black tracking-tight text-ds-ink">Aktivitas Terbaru</h2>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ds-admin-lime-tint text-ds-admin-forest">
                  <ModuleIcon id="notifications" size={30} />
                </span>
              </div>
              <div className="mt-3 space-y-1">
                {recentNotifications.length === 0 ? (
                  <p className="py-6 text-center text-2xs text-ds-ink3">Belum ada aktivitas.</p>
                ) : recentNotifications.map(n => {
                  const meta = adminNotifMeta(n.type);
                  return (
                    <div key={n.id} className="flex items-start gap-2.5 rounded-xl px-1 py-1.5">
                      <span className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-ds-card2 ${meta.cls}`}>
                        <ModuleIcon id={meta.iconId} size={24} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-ds-ink">{n.title}</span>
                        <span className="block text-2xs text-ds-ink3">{adminNotifTimeAgo(n.created_at)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </AdminSectionCard>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
};

export default CommandDashboard;
