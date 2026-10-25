import React, { useState, useEffect, useCallback } from 'react';
import { Download } from 'lucide-react';
import { callGateway, getAdminFinancialReports } from '../../services/supabaseService';
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

// ── Periodic report (merged from the former "Laporan" menu) ─────────────────
//
// Menu cleanup 2026-10-26: ReportsView moved here as a tab. Two integrity
// fixes along the way:
//  1. The old table displayed fabricated expense columns — "Promo/Marketing"
//     = GWP×5% and "Operasional" = GWP×2% were invented multipliers, never
//     real spend data. Removed; the ratio card now states exactly what it
//     aggregates (claims paid + commissions over GWP).
//  2. The export button said "Unduh Excel" while producing a CSV file.
// Year options are derived from the current year instead of a hardcoded
// 2023–2026 list, and the whole section is styled for the light-mode admin.
const PERIOD_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

function downloadCsv(rows: Array<Record<string, string | number>>, filename: string) {
  if (rows.length === 0) return;
  const escape = (val: string | number) => {
    let s = String(val);
    if (/^[=+@\\-]/.test(s)) s = "'" + s; // CSV-injection guard
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map(escape).join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
  ].join('\n');
  const blob = new Blob([String.fromCharCode(65279), csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().getTime()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const PeriodicReportSection: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [viewType, setViewType] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<Array<{ total_premium: number; created_at: string }>>([]);
  const [commissionData, setCommissionData] = useState<Array<{ commission_amount: number; created_at: string }>>([]);
  const [claimsData, setClaimsData] = useState<Array<{ amount_approved: number; created_at: string }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { orders, commissions, claims } = await getAdminFinancialReports(selectedYear);
      setOrderData(orders);
      setCommissionData(commissions);
      setClaimsData(claims);
    } catch (e: any) {
      setLoadError(e?.message ?? 'Gagal memuat laporan periode.');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => { load(); }, [load]);

  const convert = (val: number) => {
    if (val === 0) return '-';
    return `Rp ${(val / 1000000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}Jt`;
  };

  const getAggregatedData = () => {
    const result: Array<{ period: string; gwp: number; commissions: number; claims: number }> = [];
    const today = new Date();
    if (viewType === 'monthly') {
      for (let i = 0; i < 12; i++) {
        const gwp = orderData.filter(o => { const d = new Date(o.created_at); return d.getFullYear() === selectedYear && d.getMonth() === i; }).reduce((acc, o) => acc + (o.total_premium ?? 0), 0);
        const commissions = commissionData.filter(c => { const d = new Date(c.created_at); return d.getFullYear() === selectedYear && d.getMonth() === i; }).reduce((acc, c) => acc + (c.commission_amount ?? 0), 0);
        const claims = claimsData.filter(c => { const d = new Date(c.created_at); return d.getFullYear() === selectedYear && d.getMonth() === i; }).reduce((acc, c) => acc + (c.amount_approved ?? 0), 0);
        result.push({ period: `${PERIOD_MONTHS[i]} ${selectedYear}`, gwp, commissions, claims });
      }
    } else if (viewType === 'yearly') {
      [selectedYear - 1, selectedYear].forEach(y => {
        const gwp = orderData.filter(o => new Date(o.created_at).getFullYear() === y).reduce((acc, o) => acc + (o.total_premium ?? 0), 0);
        const commissions = commissionData.filter(c => new Date(c.created_at).getFullYear() === y).reduce((acc, c) => acc + (c.commission_amount ?? 0), 0);
        const claims = claimsData.filter(c => new Date(c.created_at).getFullYear() === y).reduce((acc, c) => acc + (c.amount_approved ?? 0), 0);
        result.push({ period: `Tahun ${y}`, gwp, commissions, claims });
      });
    } else {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const gwp = orderData.filter(o => new Date(o.created_at).toDateString() === d.toDateString()).reduce((acc, o) => acc + (o.total_premium ?? 0), 0);
        const commissions = commissionData.filter(c => new Date(c.created_at).toDateString() === d.toDateString()).reduce((acc, c) => acc + (c.commission_amount ?? 0), 0);
        const claims = claimsData.filter(c => new Date(c.created_at).toDateString() === d.toDateString()).reduce((acc, c) => acc + (c.amount_approved ?? 0), 0);
        result.push({ period: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), gwp, commissions, claims });
      }
    }
    return result;
  };

  const aggregatedData = getAggregatedData();
  const totalGwp = aggregatedData.reduce((acc, r) => acc + r.gwp, 0);
  const totalClaim = aggregatedData.reduce((acc, r) => acc + r.claims, 0);
  const totalComm = aggregatedData.reduce((acc, r) => acc + r.commissions, 0);
  // Honest ratio: the only expense lines the platform actually records.
  const claimCommissionRatio = totalGwp > 0 ? (((totalClaim + totalComm) / totalGwp) * 100).toFixed(1) : '0.0';

  const handleExport = () => {
    downloadCsv(
      aggregatedData.map(r => ({
        Periode: r.period,
        'Premi Masuk (GWP)': r.gwp,
        'Komisi': r.commissions,
        'Klaim Dibayar': r.claims,
      })),
      `Laporan_Keuangan_${viewType}_${selectedYear}`,
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <div className="flex bg-ds-card2 p-1 rounded-2xl border border-ds-border">
            {Array.from({ length: 4 }, (_, i) => currentYear - 3 + i).map(y => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-4 py-2.5 rounded-xl text-[0.6rem] font-black uppercase transition-all ${selectedYear === y ? 'bg-ds-card text-ds-ink shadow-sm border border-ds-border' : 'text-ds-ink3 hover:text-ds-ink'}`}
              >
                {y}
              </button>
            ))}
          </div>
          <div className="flex bg-ds-card2 p-1 rounded-2xl border border-ds-border">
            {(['daily', 'monthly', 'yearly'] as const).map(v => (
              <button
                key={v}
                onClick={() => setViewType(v)}
                className={`px-4 py-2.5 rounded-xl text-[0.6rem] font-black uppercase transition-all ${viewType === v ? 'bg-emerald-500 text-white shadow-sm' : 'text-ds-ink3 hover:text-ds-ink'}`}
              >
                {v === 'daily' ? 'Harian' : v === 'monthly' ? 'Bulanan' : 'Tahunan'}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={aggregatedData.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[0.6rem] tracking-widest transition-all active:scale-95 disabled:opacity-40"
        >
          <Download size={14} /> Unduh CSV
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        </div>
      ) : loadError ? (
        <div className="p-8 rounded-2xl border border-rose-500/30 bg-rose-500/5 text-center">
          <p className="font-bold text-rose-500 mb-2">Laporan periode gagal dimuat</p>
          <p className="text-xs text-ds-ink3 mb-4">{loadError}</p>
          <button onClick={load} className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold">Coba Lagi</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <div className="lg:col-span-3 rounded-2xl border bg-ds-card border-ds-border shadow-ds-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-ds-border">
              <p className="text-xs font-black uppercase tracking-widest text-ds-ink">
                Ringkasan {viewType === 'daily' ? 'Harian' : viewType === 'monthly' ? 'Bulanan' : 'Tahunan'} {selectedYear}
              </p>
              <p className="text-2xs font-bold text-ds-ink3 uppercase tracking-widest mt-1">
                GWP · komisi · klaim dibayar — agregasi dari pesanan, komisi, dan klaim nyata
              </p>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left min-w-[560px]">
                <thead className="bg-ds-card2 text-2xs uppercase tracking-widest text-ds-ink3 font-black">
                  <tr>
                    <th className="py-3 pl-5 font-bold border-b border-ds-border">Periode</th>
                    <th className="py-3 font-bold border-b border-ds-border">Premi Masuk</th>
                    <th className="py-3 font-bold border-b border-ds-border">Komisi</th>
                    <th className="py-3 pr-5 font-bold border-b border-ds-border text-right">Klaim Dibayar</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-bold">
                  {aggregatedData.map((row, i) => (
                    <tr key={i} className="border-b border-ds-border hover:bg-ds-card2 transition-colors">
                      <td className="py-3 pl-5 uppercase text-ds-ink font-black">{row.period}</td>
                      <td className="py-3 text-ds-green font-mono">{convert(row.gwp)}</td>
                      <td className="py-3 text-ds-blue font-mono">{convert(row.commissions)}</td>
                      <td className="py-3 pr-5 text-rose-500 font-mono text-right">{convert(row.claims)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border bg-ds-card border-ds-border shadow-ds-sm p-5">
              <p className="text-2xs font-black text-ds-ink3 uppercase tracking-widest mb-1">Total GWP</p>
              <p className="text-2xl font-black text-ds-ink">{convert(totalGwp)}</p>
            </div>
            <div className="rounded-2xl border bg-ds-card border-ds-border shadow-ds-sm p-5">
              <p className="text-2xs font-black text-ds-ink3 uppercase tracking-widest mb-1">Rasio (Klaim + Komisi) / GWP</p>
              <p className={`text-2xl font-black ${Number(claimCommissionRatio) > 100 ? 'text-rose-500' : 'text-ds-green'}`}>~{claimCommissionRatio}%</p>
              <p className="mt-2 text-2xs text-ds-ink3 leading-relaxed">
                Hanya memakai beban yang benar-benar tercatat di platform (klaim dibayar + komisi). Biaya operasional/promo tidak dimasukkan karena tidak memiliki sumber data.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FinancialAdmin: React.FC = () => {
  const [tab, setTab] = useState<'overview' | 'periodic'>('overview');
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
    <div className="space-y-8 animate-fade-in">
      {/* ── Header + section tabs ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter">
            Keuangan <span className="text-ds-green">&amp; Laporan</span>
          </h2>
          <p className="text-[9px] font-black uppercase tracking-widest text-ds-ink3 mt-1">
            Data real-time dari Supabase
          </p>
        </div>
        <div className="flex bg-ds-card2 p-1 rounded-2xl border border-ds-border gap-1">
          {([
            { id: 'overview', label: 'Ikhtisar' },
            { id: 'periodic', label: 'Laporan Periode' },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 rounded-xl text-[0.6rem] font-black uppercase tracking-widest transition-all ${
                tab === t.id
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'text-ds-ink3 hover:text-ds-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'periodic' ? (
        <PeriodicReportSection />
      ) : (
      <>
      {/* Range switcher (Ikhtisar only) */}
      <div className="flex bg-ds-card2 p-1 rounded-2xl border border-ds-border gap-1 w-fit">
        {(['THIS_MONTH', 'LAST_MONTH', 'ALL'] as DateRange[]).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-2.5 rounded-xl text-[0.6rem] font-black uppercase tracking-widest transition-all ${
              range === r
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'text-ds-ink3 hover:text-ds-ink'
            }`}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
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
      </>
      )}
    </div>
  );
};

export default FinancialAdmin;
