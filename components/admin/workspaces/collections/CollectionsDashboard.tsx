import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Wallet, RefreshCw, Phone, FileWarning } from 'lucide-react';
import WorkspaceShell from '../shared/WorkspaceShell';
import KpiCard from '../shared/KpiCard';
import { callGateway } from '../../../../services/db';

interface Props {
  userRole: string;
  currentUser: any;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
}

const UNPAID = ['PENDING_PAYMENT', 'AWAITING_PAYMENT', 'PENDING', 'UNPAID', 'SUBMITTED'];

const daysSince = (iso?: string | null) => {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
};

const agingBucket = (days: number) => {
  if (days <= 7) return '0-7 hari';
  if (days <= 14) return '8-14 hari';
  if (days <= 30) return '15-30 hari';
  return '>30 hari';
};

const formatIDR = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

export const CollectionsDashboard: React.FC<Props> = ({ userRole, currentUser, onLogout, darkMode, onToggleDark }) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await callGateway('admin_list_orders', { limit: 300 });
      const rows = ((res as any)?.data ?? []) as any[];
      setOrders(rows.filter(o => UNPAID.includes(String(o.status ?? '').toUpperCase())));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const overdue = orders.map(o => ({ ...o, days: daysSince(o.created_at) })).sort((a, b) => b.days - a.days);
  const total = overdue.reduce((s, o) => s + Number(o.total_premium ?? 0), 0);
  const over30 = overdue.filter(o => o.days > 30);
  const buckets = overdue.reduce<Record<string, number>>((acc, o) => {
    const k = agingBucket(o.days);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <WorkspaceShell
      workspace="collections"
      userRole={userRole}
      userName={currentUser?.name}
      darkMode={darkMode}
      onToggleDark={onToggleDark}
      onLogout={onLogout}
      actions={
        <button onClick={load} className="flex h-9 items-center gap-1.5 rounded-full border border-ds-border px-3 text-xs font-bold text-ds-ink3 transition-all hover:text-ds-ink">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      }
    >
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top,_#3B2A08,_#130E02)] p-6 text-white">
          <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-300">Collections Workspace</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Penagihan & aging piutang</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/70">Fokus ke tagihan yang belum dibayar: prioritas umur piutang, follow-up hari ini, dan eskalasi di atas 30 hari.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Tagihan Terbuka" value={overdue.length} sublabel="Belum dibayar" icon={FileWarning} accent="#F59E0B" />
          <KpiCard label="Nilai Piutang" value={formatIDR(total)} sublabel="Total outstanding" icon={Wallet} accent="#3B82F6" />
          <KpiCard label="Lewat 30 Hari" value={over30.length} sublabel="Perlu eskalasi" icon={AlertTriangle} accent="#EF4444" />
          <KpiCard label="Follow-up Hari Ini" value={overdue.filter(o => o.days > 0).length} sublabel="Siap dihubungi" icon={Phone} accent="#22C55E" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-3xl border border-ds-border bg-ds-card shadow-ds-sm">
            <div className="flex items-center justify-between border-b border-ds-border px-6 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-ds-ink3">Antrian Penagihan</p>
                <h3 className="text-lg font-black tracking-tight">Prioritas Tertua</h3>
              </div>
              <span className="rounded-full bg-ds-card2 px-3 py-1 text-xs font-bold text-ds-ink3">{overdue.length} tagihan</span>
            </div>
            <div className="divide-y divide-ds-border">
              {!loading && overdue.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <Clock size={18} className="text-ds-ink3" />
                  <p className="text-sm font-bold">Tidak ada tagihan terbuka</p>
                  <p className="text-xs text-ds-ink3">Semua pembayaran sudah tertagih.</p>
                </div>
              )}
              {overdue.slice(0, 10).map(o => (
                <div key={o.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{o.order_number} · {o.client_name}</p>
                    <p className="text-xs text-ds-ink3">{o.product_name ?? 'Asuransi'} · {agingBucket(o.days)} · {o.days} hari</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-black tabular-nums">{formatIDR(Number(o.total_premium ?? 0))}</p>
                    <button className="rounded-full border border-ds-border px-3 py-1 text-xs font-bold hover:border-ds-green/40">Hubungi</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-ds-border bg-ds-card shadow-ds-sm">
            <div className="border-b border-ds-border px-6 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-ds-ink3">Aging</p>
              <h3 className="text-lg font-black tracking-tight">Umur Piutang</h3>
            </div>
            <div className="grid gap-2 p-4">
              {['0-7 hari', '8-14 hari', '15-30 hari', '>30 hari'].map(k => (
                <div key={k} className="flex items-center justify-between rounded-2xl border border-ds-border px-4 py-3">
                  <span className="text-sm font-bold">{k}</span>
                  <span className="text-sm font-black tabular-nums">{buckets[k] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
};

export default CollectionsDashboard;
