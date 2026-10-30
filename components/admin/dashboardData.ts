// Perhitungan dashboard admin.
//
// Semua angka di dashboard berasal dari baris yang benar-benar ada:
// sp_policy_orders, sp_claims, sp_withdrawals, dan antrean tier. Tidak ada
// multiplier, rasio karangan, atau "estimasi" yang tidak bisa ditelusuri.
//
// Fungsi di sini murni supaya bisa diuji tanpa React maupun Supabase.

import type { SpClaim, SpPolicyOrder, Withdrawal } from '../../services/dbTypes';

export type TaskKind = 'order' | 'claim' | 'withdrawal' | 'tier';

export interface DashboardTask {
  id: string;
  kind: TaskKind;
  title: string;
  subtitle: string;
  tab: string;
  ageDays: number;
  amount?: number;
}

export interface ProductSlice {
  key: string;
  label: string;
  count: number;
  premium: number;
}

export interface MonthSlice {
  key: string;
  label: string;
  premium: number;
  count: number;
}

export interface RenewalDay {
  day: number;
  count: number;
}

export interface DashboardModel {
  totals: {
    orders: number;
    pendingOrders: number;
    issuedPremium: number;
    pendingClaims: number;
    pendingWithdrawals: number;
    withdrawalAmount: number;
    tierPending: number;
    activeAgents: number;
  };
  statusCounts: Record<string, number>;
  products: ProductSlice[];
  months: MonthSlice[];
  recent: SpPolicyOrder[];
  renewals: RenewalDay[];
  renewalCount: number;
  deltas: { orders: number | null; premium: number | null };
  tasks: DashboardTask[];
}

const CLOSED_STATUSES = new Set(['CANCELLED', 'REJECTED']);
const MONTH_LABEL = new Intl.DateTimeFormat('id-ID', { month: 'short', timeZone: 'UTC' });

// Kalender bisnis SurePath mengikuti WIB (UTC+7). Indonesia tidak menerapkan
// DST, sehingga offset tetap +7 sepanjang tahun. Komponen tanggal dihitung
// eksplisit terhadap WIB agar hasilnya sama di mesin apa pun (CI UTC,
// browser admin di zona waktu mana pun) — bukan mengikuti timezone host.
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Instan waktu yang digeser ke WIB; baca komponennya dengan getter UTC. */
function wibView(t: number): Date {
  return new Date(t + WIB_OFFSET_MS);
}

function parseDate(value?: string | null): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

function dayDiff(now: number, value?: string | null): number {
  const t = parseDate(value);
  if (t === null) return 0;
  return Math.max(0, Math.floor((now - t) / 86_400_000));
}

function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Produk: 4 terbesar + "Lainnya", dihitung dari jumlah polis. */
export function groupProducts(orders: readonly SpPolicyOrder[]): ProductSlice[] {
  const map = new Map<string, ProductSlice>();
  for (const order of orders) {
    if (CLOSED_STATUSES.has(order.status)) continue;
    const label = (order.product_name || order.product_code || 'Lainnya').trim();
    const key = label.toLowerCase();
    const row = map.get(key) ?? { key, label, count: 0, premium: 0 };
    row.count += 1;
    row.premium += Number(order.total_premium) || 0;
    map.set(key, row);
  }
  const sorted = [...map.values()].sort((a, b) => b.count - a.count || b.premium - a.premium);
  if (sorted.length <= 4) return sorted;
  const head = sorted.slice(0, 4);
  const rest = sorted.slice(4);
  head.push({
    key: 'other',
    label: 'Lainnya',
    count: rest.reduce((n, p) => n + p.count, 0),
    premium: rest.reduce((n, p) => n + p.premium, 0),
  });
  return head;
}

/** Enam bulan terakhir, termasuk bulan berjalan. */
export function monthlySeries(orders: readonly SpPolicyOrder[], now: Date): MonthSlice[] {
  const buckets: MonthSlice[] = [];
  const index = new Map<string, MonthSlice>();
  const nowW = wibView(now.getTime());
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(nowW.getUTCFullYear(), nowW.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const slice: MonthSlice = {
      key,
      label: MONTH_LABEL.format(d).replace('.', ''),
      premium: 0,
      count: 0,
    };
    buckets.push(slice);
    index.set(key, slice);
  }
  for (const order of orders) {
    if (CLOSED_STATUSES.has(order.status)) continue;
    const t = parseDate(order.created_at);
    if (t === null) continue;
    const d = wibView(t);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const slice = index.get(key);
    if (!slice) continue;
    slice.premium += Number(order.total_premium) || 0;
    slice.count += 1;
  }
  return buckets;
}

/** Polis aktif yang berakhir pada bulan berjalan. */
export function renewalDays(orders: readonly SpPolicyOrder[], now: Date): RenewalDay[] {
  const counts = new Map<number, number>();
  const nowW = wibView(now.getTime());
  for (const order of orders) {
    if (order.status !== 'ISSUED') continue;
    const t = parseDate(order.end_date);
    if (t === null) continue;
    const d = wibView(t);
    if (d.getUTCFullYear() !== nowW.getUTCFullYear() || d.getUTCMonth() !== nowW.getUTCMonth()) continue;
    counts.set(d.getUTCDate(), (counts.get(d.getUTCDate()) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day - b.day);
}

export function buildDashboardModel(input: {
  orders: readonly SpPolicyOrder[];
  claims: readonly SpClaim[];
  withdrawals: readonly (Withdrawal & { agent_name?: string })[];
  tierPending: number;
  activeAgents: number;
  now?: Date;
}): DashboardModel {
  const nowDate = input.now ?? new Date();
  const now = nowDate.getTime();

  const statusCounts: Record<string, number> = {};
  let issuedPremium = 0;
  for (const order of input.orders) {
    statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1;
    if (order.status === 'ISSUED') issuedPremium += Number(order.total_premium) || 0;
  }

  const pendingOrders = input.orders.filter(o => o.status === 'SUBMITTED' || o.status === 'UNDER_REVIEW');
  const pendingClaims = input.claims.filter(c => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW');
  const pendingWithdrawals = input.withdrawals.filter(w => String(w.status).startsWith('PENDING'));

  // Delta 30 hari berjalan vs 30 hari sebelumnya.
  const last30 = now - 30 * 86_400_000;
  const prev30 = now - 60 * 86_400_000;
  let curCount = 0;
  let prevCount = 0;
  let curPremium = 0;
  let prevPremium = 0;
  for (const order of input.orders) {
    if (CLOSED_STATUSES.has(order.status)) continue;
    const t = parseDate(order.created_at);
    if (t === null) continue;
    const premium = Number(order.total_premium) || 0;
    if (t >= last30) { curCount += 1; curPremium += premium; }
    else if (t >= prev30) { prevCount += 1; prevPremium += premium; }
  }

  const tasks: DashboardTask[] = [];
  for (const order of [...pendingOrders].sort((a, b) => (parseDate(a.created_at) ?? 0) - (parseDate(b.created_at) ?? 0)).slice(0, 3)) {
    tasks.push({
      id: `order-${order.id}`,
      kind: 'order',
      title: `Pesanan ${order.order_number ?? '—'}`,
      subtitle: `${order.client_name ?? 'Nasabah'} · ${order.product_name ?? order.product_code ?? 'Produk'}`,
      tab: 'policy_orders',
      ageDays: dayDiff(now, order.created_at),
      amount: Number(order.total_premium) || 0,
    });
  }
  for (const claim of [...pendingClaims].sort((a, b) => (parseDate(a.created_at) ?? 0) - (parseDate(b.created_at) ?? 0)).slice(0, 2)) {
    tasks.push({
      id: `claim-${claim.id}`,
      kind: 'claim',
      title: `Klaim ${claim.claim_number ?? '—'}`,
      subtitle: claim.client_name ?? claim.product_type ?? 'Nasabah',
      tab: 'claims_admin',
      ageDays: dayDiff(now, claim.created_at),
      amount: Number((claim as any).amount_claimed ?? claim.amount_approved ?? 0) || 0,
    });
  }
  for (const wd of [...pendingWithdrawals].sort((a, b) => (parseDate(a.created_at) ?? 0) - (parseDate(b.created_at) ?? 0)).slice(0, 2)) {
    tasks.push({
      id: `wd-${wd.id}`,
      kind: 'withdrawal',
      title: `Penarikan ${wd.agent_name ?? 'Mitra'}`,
      subtitle: String(wd.status).replace('PENDING_', 'Menunggu L'),
      tab: 'withdrawals',
      ageDays: dayDiff(now, wd.created_at),
      amount: Number(wd.amount) || 0,
    });
  }
  if (input.tierPending > 0) {
    tasks.push({
      id: 'tier',
      kind: 'tier',
      title: `${input.tierPending} permintaan tier`,
      subtitle: 'Menunggu persetujuan',
      tab: 'tier_promo',
      ageDays: 0,
    });
  }

  const renewals = renewalDays(input.orders, nowDate);

  return {
    totals: {
      orders: input.orders.length,
      pendingOrders: pendingOrders.length,
      issuedPremium,
      pendingClaims: pendingClaims.length,
      pendingWithdrawals: pendingWithdrawals.length,
      withdrawalAmount: pendingWithdrawals.reduce((n, w) => n + (Number(w.amount) || 0), 0),
      tierPending: input.tierPending,
      activeAgents: input.activeAgents,
    },
    statusCounts,
    products: groupProducts(input.orders),
    months: monthlySeries(input.orders, nowDate),
    recent: [...input.orders]
      .filter(o => !CLOSED_STATUSES.has(o.status))
      .sort((a, b) => (parseDate(b.created_at) ?? 0) - (parseDate(a.created_at) ?? 0))
      .slice(0, 6),
    renewals,
    renewalCount: renewals.reduce((n, r) => n + r.count, 0),
    deltas: {
      orders: pctDelta(curCount, prevCount),
      premium: pctDelta(curPremium, prevPremium),
    },
    tasks: tasks.sort((a, b) => b.ageDays - a.ageDays).slice(0, 7),
  };
}
