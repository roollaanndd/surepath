import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer, XAxis, YAxis, Legend,
} from 'recharts';
import { callGateway } from '../../services/supabaseService';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface KPI { gwpYTD: number; policiesIssued: number; activeAgents: number; claimsRatio: number | null }
interface MonthPoint { month: string; gwp: number }
interface ProductSlice { name: string; value: number }
interface AgentBar { name: string; gwp: number }
interface PaymentFunnel { paid: number; pending: number; expired: number }
interface PipelineCounts { SUBMITTED: number; UNDER_REVIEW: number; APPROVED: number; ISSUED: number }

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const PRODUCT_COLORS = ['#3b82f6','#06b6d4','#10b981','#8b5cf6','#f59e0b'];
const PRODUCTS = ['CAR','MOTORCYCLE','TRAVEL','PA','MPAR'];
const PIPE_LABELS: Record<string, string> = {
  SUBMITTED: 'Diajukan', UNDER_REVIEW: 'Ditinjau', APPROVED: 'Disetujui', ISSUED: 'Diterbitkan',
};
const PIPE_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-amber-500', UNDER_REVIEW: 'bg-blue-500', APPROVED: 'bg-emerald-500', ISSUED: 'bg-orange-500',
};

function formatM(v: number) { return `${(v / 1_000_000).toFixed(1)} Jt`; }
function formatIDR(v: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = ({ h = 'h-32', cls = '' }: { h?: string; cls?: string }) => (
  <div className={`${h} ${cls} rounded-2xl bg-ds-card2 animate-pulse`} />
);

// ─── KPI Card ──────────────────────────────────────────────────────────────────
const KPICard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="p-5 rounded-2xl bg-ds-card2 border border-ds-border flex flex-col gap-1">
    <p className="text-[0.55rem] font-black uppercase tracking-widest text-ds-ink3">{label}</p>
    <p className="text-2xl font-black text-white leading-none">{value}</p>
    {sub && <p className="text-[0.6rem] text-ds-ink3">{sub}</p>}
  </div>
);

// ─── Section wrapper ───────────────────────────────────────────────────────────
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="p-5 rounded-2xl bg-ds-card2 border border-ds-border">
    <p className="text-[0.6rem] font-black uppercase tracking-widest text-ds-ink3 mb-4">{title}</p>
    {children}
  </div>
);

// ─── Custom tooltip ────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ds-card border border-ds-border rounded-xl px-3 py-2 text-xs">
      {label && <p className="text-ds-ink3 mb-1">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? '#00C16A' }} className="font-bold">
          {p.name}: {typeof p.value === 'number' && p.value > 1_000 ? formatIDR(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────
const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [gwpTrend, setGwpTrend] = useState<MonthPoint[]>([]);
  const [productMix, setProductMix] = useState<ProductSlice[]>([]);
  const [topAgents, setTopAgents] = useState<AgentBar[]>([]);
  const [paymentFunnel, setPaymentFunnel] = useState<PaymentFunnel | null>(null);
  const [pipeline, setPipeline] = useState<PipelineCounts | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: analyticsRaw } = await callGateway('admin_analytics_data', {});
      const analyticsData = (analyticsRaw as any) ?? {};
      const orders = (analyticsData.orders ?? []) as any[];
      const agents = (analyticsData.agents ?? []) as any[];
      const claims = (analyticsData.claims ?? []) as any[];
      const payments = (analyticsData.payments ?? []) as any[];

      // ── KPI ────────────────────────────────────────────────────────────────
      const issuedOrders = orders.filter((o: any) => o.status === 'ISSUED');
      const gwpYTD = issuedOrders.reduce((s: number, o: any) => s + (o.total_premium ?? 0), 0);
      // Claim rows alone do not establish the full earned-premium denominator.
      // Do not present a misleading percentage until the gateway provides a
      // period-aligned premium denominator for the same population.
      const claimsRatio: number | null = null;
      setKpi({
        gwpYTD,
        policiesIssued: issuedOrders.length,
        activeAgents: agents.length,
        claimsRatio: claimsRatio === null ? null : Math.round(claimsRatio * 10) / 10,
      });

      // ── GWP Trend: last 6 months ────────────────────────────────────────────
      const trend: Record<string, number> = {};
      const cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      orders
        .filter((o: any) => ['ISSUED','APPROVED'].includes(o.status))
        .forEach((o: any) => {
          const d = new Date(o.created_at);
          if (!Number.isNaN(d.getTime()) && d >= cutoff) {
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            trend[key] = (trend[key] ?? 0) + (o.total_premium ?? 0);
          }
        });
      const trendData: MonthPoint[] = [];
      for (let i = 5; i >= 0; i--) {
        const period = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = period.getMonth();
        const key = `${period.getFullYear()}-${m}`;
        trendData.push({ month: `${MONTH_NAMES[m]} ${period.getFullYear()}`, gwp: Math.round((trend[key] ?? 0) / 1_000_000 * 10) / 10 });
      }
      setGwpTrend(trendData);

      // ── Product mix ─────────────────────────────────────────────────────────
      const prodMap: Record<string, number> = {};
      orders
        .filter((o: any) => o.status === 'ISSUED')
        .forEach((o: any) => {
          const key = PRODUCTS.find(p => o.product_code?.toUpperCase().includes(p)) ?? 'CAR';
          prodMap[key] = (prodMap[key] ?? 0) + (o.total_premium ?? 0);
        });
      setProductMix(PRODUCTS.map(p => ({ name: p, value: prodMap[p] ?? 0 })).filter(x => x.value > 0));

      // ── Top 5 agents this month ─────────────────────────────────────────────
      const agentNameMap: Record<string, string> = {};
      agents.forEach((a: any) => { agentNameMap[a.id] = a.name ?? 'Mitra'; });
      const agentGWP: Record<string, number> = {};
      orders
        .filter((o: any) => o.status === 'ISSUED' && o.created_at >= monthStart)
        .forEach((o: any) => {
          if (o.agent_id) agentGWP[o.agent_id] = (agentGWP[o.agent_id] ?? 0) + (o.total_premium ?? 0);
        });
      const top5 = Object.entries(agentGWP)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, gwp]) => ({ name: agentNameMap[id] ?? 'Mitra', gwp }));
      setTopAgents(top5);

      // ── Payment funnel ──────────────────────────────────────────────────────
      const pf = { paid: 0, pending: 0, expired: 0 };
      payments.forEach((p: any) => {
        if (p.status === 'PAID') pf.paid++;
        else if (p.status === 'PENDING') pf.pending++;
        else if (p.status === 'EXPIRED' || p.status === 'FAILED') pf.expired++;
      });
      setPaymentFunnel(pf);

      // ── Order pipeline ──────────────────────────────────────────────────────
      const pipe = { SUBMITTED: 0, UNDER_REVIEW: 0, APPROVED: 0, ISSUED: 0 };
      orders.forEach((o: any) => {
        if (o.status in pipe) (pipe as any)[o.status]++;
      });
      setPipeline(pipe);

      setLoading(false);
    };

    load().catch((e) => {
      console.error('AnalyticsDashboard load failed:', e);
      setLoadError(e?.message ?? 'Gagal memuat data analytics');
      setLoading(false);
    });
  }, []);

  const maxPipeVal = pipeline ? Math.max(...Object.values(pipeline), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[0.55rem] font-black uppercase tracking-[0.35em] text-emerald-500 mb-1">Analytics</p>
        <h2 className="text-3xl font-black tracking-tight text-white">Dashboard Analitik</h2>
      </div>

      {/* KPI Row */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <Skeleton key={i} h="h-24" />)}
        </div>
      ) : loadError && !kpi ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="col-span-full p-8 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-center">
            <p className="text-rose-600 dark:text-rose-400 font-bold text-sm mb-2">Gagal memuat data analytics</p>
            <p className="text-rose-500 dark:text-rose-500/70 text-xs mb-4">{loadError}</p>
            <button
              onClick={() => { setLoading(true); setLoadError(null); window.location.reload(); }}
              className="px-4 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold active:scale-95 transition-transform"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      ) : kpi ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="GWP YTD" value={formatM(kpi.gwpYTD * 1_000_000 > 0 ? kpi.gwpYTD : 0)} sub={formatIDR(kpi.gwpYTD)} />
          <KPICard label="Polis Diterbitkan" value={kpi.policiesIssued.toLocaleString('id-ID')} sub="Status ISSUED" />
          <KPICard label="Mitra Aktif" value={kpi.activeAgents.toLocaleString('id-ID')} sub="Terverifikasi" />
          <KPICard label="Claims Ratio" value={kpi.claimsRatio === null ? 'N/A' : `${kpi.claimsRatio}%`} sub="Menunggu denominator premi terverifikasi" />
        </div>
      ) : null}

      {/* GWP Trend + Product Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          {loading ? <Skeleton h="h-64" /> : (
            <Section title="Tren GWP — 6 Bulan Terakhir (Juta IDR)">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={gwpTrend}>
                  <defs>
                    <linearGradient id="gwpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00C16A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00C16A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}Jt`} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="gwp" name="GWP" stroke="#00C16A" strokeWidth={2} fill="url(#gwpGrad)" dot={{ fill: '#00C16A', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </Section>
          )}
        </div>

        <div className="lg:col-span-2">
          {loading ? <Skeleton h="h-64" /> : (
            <Section title="Pendapatan per Produk">
              {productMix.length === 0 ? (
                <p className="text-xs text-ds-ink3 text-center py-16">Belum ada data</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={productMix} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {productMix.map((_, i) => <Cell key={i} fill={PRODUCT_COLORS[i % PRODUCT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTip />} formatter={(v: any) => formatIDR(v)} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', color: '#9ca3af' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Section>
          )}
        </div>
      </div>

      {/* Top Agents + Payment Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          {loading ? <Skeleton h="h-64" /> : (
            <Section title="Top 5 Mitra Bulan Ini (GWP)">
              {topAgents.length === 0 ? (
                <p className="text-xs text-ds-ink3 text-center py-16">Belum ada data bulan ini</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topAgents} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => formatM(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#d1d5db', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="gwp" name="GWP" fill="#00C16A" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Section>
          )}
        </div>

        <div>
          {loading ? <Skeleton h="h-64" /> : (
            <Section title="Funnel Pembayaran">
              {paymentFunnel && (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { label: 'Dibayar', count: paymentFunnel.paid },
                    { label: 'Pending', count: paymentFunnel.pending },
                    { label: 'Kedaluwarsa', count: paymentFunnel.expired },
                  ]}>
                    <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="count" name="Jumlah" radius={[4, 4, 0, 0]}>
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#ef4444" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Section>
          )}
        </div>
      </div>

      {/* Order Status Pipeline */}
      {loading ? <Skeleton h="h-40" /> : pipeline && (
        <Section title="Pipeline Status Pesanan">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.keys(PIPE_LABELS) as Array<keyof typeof PIPE_LABELS>).map(st => {
              const count = (pipeline as any)[st] ?? 0;
              const pct = Math.round((count / maxPipeVal) * 100);
              return (
                <div key={st} className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[0.6rem] font-bold uppercase tracking-wide text-ds-ink3">{PIPE_LABELS[st]}</span>
                    <span className="text-sm font-black text-white">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-ds-card2 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${PIPE_COLORS[st]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
