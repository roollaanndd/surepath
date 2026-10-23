import React, { useState, useEffect } from 'react';
import { callGateway } from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';

// ── Types ────────────────────────────────────────────────────────────────────

type DateRange = 'THIS_MONTH' | 'LAST_MONTH' | 'ALL';

interface KpiData {
  gwp: number;
  netPremiumPaid: number;
  totalCommission: number;
  pendingCommission: number;
  outstandingCoins: number;
  discountGiven: number;
  activeAgents: number;
}

interface OrderRow {
  id: string;
  order_number?: string;
  client_name: string;
  product_name: string;
  total_premium: number;
  discount_amount?: number;
  net_premium?: number;
  commission_amount?: number;
  coin_reward?: number;
  created_at?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function exportOrdersCSV(rows: OrderRow[]) {
  if (!rows.length) return;
  const columns: Array<[string, (row: OrderRow) => string | number]> = [
    ['Order', r => r.order_number ?? r.id],
    ['Klien', r => r.client_name ?? ''],
    ['Produk', r => r.product_name ?? ''],
    ['Premi Bruto IDR', r => r.total_premium ?? 0],
    ['Diskon IDR', r => r.discount_amount ?? 0],
    ['Premi Bersih IDR', r => r.net_premium ?? 0],
    ['Komisi IDR', r => r.commission_amount ?? 0],
    ['Koin', r => r.coin_reward ?? 0],
    ['Tanggal', r => r.created_at ?? ''],
  ];
  const escape = (value: string | number) => {
    let s = String(value);
    if (/^[=+@\\-]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const csv = [columns.map(([name]) => escape(name)).join(','), ...rows.map(row => columns.map(([, get]) => escape(get(row))).join(','))].join(String.fromCharCode(13, 10));
  const blob = new Blob([String.fromCharCode(65279), csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `surepath-order-keuangan-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function getDateRange(range: DateRange): { from: string | null; to: string | null } {
  const now = new Date();
  if (range === 'ALL') return { from: null, to: null };

  if (range === 'THIS_MONTH') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    return { from, to };
  }

  // LAST_MONTH
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
  return { from, to };
}

function fmtDate(iso?: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, sub }) => (
  <div className="bg-ds-card2 border border-ds-border rounded-[2rem] p-6 flex flex-col gap-3">
    <p className="text-[9px] font-black uppercase tracking-widest text-ds-ink3">{label}</p>
    <p className="text-3xl font-black text-white leading-none">{value}</p>
    {sub && <p className="text-[10px] text-ds-ink2 font-semibold">{sub}</p>}
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

const FinancialAdmin: React.FC = () => {
  const [range, setRange] = useState<DateRange>('THIS_MONTH');
  const [kpi, setKpi] = useState<KpiData>({
    gwp: 0,
    netPremiumPaid: 0,
    totalCommission: 0,
    pendingCommission: 0,
    outstandingCoins: 0,
    discountGiven: 0,
    activeAgents: 0,
  });
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const { from, to } = getDateRange(range);

      try {
      const { data: finRaw, error } = await callGateway('admin_financial_detail', { from, to });
      if (error) throw new Error(String(error));
      const finData = (finRaw as any) ?? {};
      const ordersRes = { data: finData.orders ?? [], error: null, count: null };
      const commRes   = { data: finData.commissions ?? [], error: null };
      const payRes    = { data: finData.payments ?? [], error: null };
      const coinRes   = { data: finData.coins ?? [], error: null };
      const agentsRes = { count: finData.agent_count ?? 0, error: null };

      if (cancelled) return;

      const issuedOrders = ((ordersRes.data ?? []) as OrderRow[]);
      const commissions  = (commRes.data ?? []) as Array<{ commission_amount: number; status: string }>;
      const payments     = (payRes.data  ?? []) as Array<{ paid_amount: number; status: string }>;
      const coinRows     = (coinRes.data  ?? []) as Array<{ coins: number; type: string }>;

      const gwp              = issuedOrders.reduce((s, o) => s + (o.total_premium ?? 0), 0);
      const discountGiven    = issuedOrders.reduce((s, o) => s + (o.discount_amount ?? 0), 0);
      const netPremiumPaid   = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + (p.paid_amount ?? 0), 0);
      const totalCommission  = commissions.reduce((s, c) => s + (c.commission_amount ?? 0), 0);
      const pendingCommission = commissions.filter(c => c.status === 'PENDING').reduce((s, c) => s + (c.commission_amount ?? 0), 0);

      const earnedCoins   = coinRows.filter(r => r.type === 'EARNED').reduce((s, r) => s + (r.coins ?? 0), 0);
      const redeemedCoins = coinRows.filter(r => r.type === 'REDEEMED').reduce((s, r) => s + Math.abs(r.coins ?? 0), 0);
      const outstandingCoins = Math.max(0, earnedCoins - redeemedCoins);

      setKpi({
        gwp,
        netPremiumPaid,
        totalCommission,
        pendingCommission,
        outstandingCoins,
        discountGiven,
        activeAgents: agentsRes.count ?? 0,
      });
      setOrders(issuedOrders.slice(0, 50));
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Gagal memuat laporan keuangan.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [range, retryKey]);

  const RANGE_LABELS: Record<DateRange, string> = {
    THIS_MONTH: 'Bulan Ini',
    LAST_MONTH: 'Bulan Lalu',
    ALL: 'Semua',
  };

  return (
    <div className="space-y-8 animate-fade-in text-white">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter">
            Laporan <span className="text-emerald-500">Keuangan</span>
          </h2>
          <p className="text-[9px] font-black uppercase tracking-widest text-ds-ink3 mt-1">
            Data real-time dari Supabase
          </p>
        </div>
        <div className="flex bg-ds-card2 p-1 rounded-2xl border border-ds-border gap-1">
          {(['THIS_MONTH', 'LAST_MONTH', 'ALL'] as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2.5 rounded-xl text-[0.6rem] font-black uppercase tracking-widest transition-all ${
                range === r
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'text-ds-ink3 hover:text-white'
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        </div>
      ) : loadError ? (
        <div className="p-8 rounded-2xl border border-rose-500/30 bg-rose-500/5 text-center">
          <p className="font-bold text-rose-400 mb-2">Laporan keuangan gagal dimuat</p>
          <p className="text-xs text-ds-ink3 mb-4">{loadError}</p>
          <button onClick={() => setRetryKey(v => v + 1)} className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold">Coba Lagi</button>
        </div>
      ) : (
        <>
          {/* ── Row 1: Primary KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="GWP (Premi Bruto)" value={formatIDR(kpi.gwp)} sub="Polis ISSUED" />
            <KpiCard label="Net Premium Terbayar" value={formatIDR(kpi.netPremiumPaid)} sub="Pembayaran PAID" />
            <KpiCard label="Total Komisi" value={formatIDR(kpi.totalCommission)} sub="Semua status" />
            <KpiCard
              label="Komisi Pending"
              value={formatIDR(kpi.pendingCommission)}
              sub={`${kpi.totalCommission > 0 ? ((kpi.pendingCommission / kpi.totalCommission) * 100).toFixed(1) : 0}% dari total`}
            />
          </div>

          {/* ── Row 2: Secondary KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Koin Beredar" value={kpi.outstandingCoins.toLocaleString('id-ID')} sub="Earned − Redeemed" />
            <KpiCard
              label="Nilai Koin"
              value={formatIDR(kpi.outstandingCoins * 1000)}
              sub="× Rp 1.000 / koin"
            />
            <KpiCard label="Diskon Diberikan" value={formatIDR(kpi.discountGiven)} sub="Polis ISSUED" />
            <KpiCard label="Mitra Aktif" value={kpi.activeAgents.toLocaleString('id-ID')} sub="Role AGENT" />
          </div>

          {/* ── Recent Issued Orders ── */}
          <div className="bg-ds-card2 border border-ds-border rounded-[2rem] overflow-hidden">
            <div className="px-6 py-5 border-b border-ds-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-ds-ink3">
                  Order Terbaru — Status ISSUED
                </p>
                <p className="text-[10px] text-ds-ink3 mt-1">Maksimal 50 order terbaru untuk periode yang dipilih</p>
              </div>
              <button
                type="button"
                onClick={() => exportOrdersCSV(orders)}
                disabled={orders.length === 0}
                className="px-4 py-2 rounded-xl border border-ds-border text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Ekspor CSV ({orders.length})
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[720px]">
                <thead>
                  <tr className="text-ds-ink3 text-[9px] font-black uppercase tracking-widest border-b border-ds-border">
                    <th className="px-6 py-3 text-left">Order#</th>
                    <th className="px-4 py-3 text-left">Klien</th>
                    <th className="px-4 py-3 text-left">Produk</th>
                    <th className="px-4 py-3 text-right">Premi</th>
                    <th className="px-4 py-3 text-right">Diskon</th>
                    <th className="px-4 py-3 text-right">Net</th>
                    <th className="px-4 py-3 text-right">Komisi</th>
                    <th className="px-4 py-3 text-right">Koin</th>
                    <th className="px-6 py-3 text-right">Tgl</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-ds-ink2 font-bold">
                        Tidak ada data untuk periode ini.
                      </td>
                    </tr>
                  ) : (
                    orders.map(order => (
                      <tr
                        key={order.id}
                        className="border-b border-ds-border hover:bg-ds-card2 transition-colors"
                      >
                        <td className="px-6 py-3 font-mono text-emerald-400 whitespace-nowrap">
                          {order.order_number ?? order.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">
                          {order.client_name}
                        </td>
                        <td className="px-4 py-3 text-ds-ink3 whitespace-nowrap">
                          {order.product_name}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-white whitespace-nowrap">
                          {formatIDR(order.total_premium ?? 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-rose-400 whitespace-nowrap">
                          {order.discount_amount ? formatIDR(order.discount_amount) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400 whitespace-nowrap">
                          {order.net_premium ? formatIDR(order.net_premium) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-amber-400 whitespace-nowrap">
                          {order.commission_amount ? formatIDR(order.commission_amount) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-ds-ink3 whitespace-nowrap">
                          {order.coin_reward ? order.coin_reward.toLocaleString('id-ID') : '—'}
                        </td>
                        <td className="px-6 py-3 text-right text-ds-ink3 whitespace-nowrap">
                          {fmtDate(order.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FinancialAdmin;
