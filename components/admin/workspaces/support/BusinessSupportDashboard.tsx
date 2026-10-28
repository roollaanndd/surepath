import React, { useEffect, useState } from 'react';
import { ClipboardList, Search, Headphones, AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
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

export const BusinessSupportDashboard: React.FC<Props> = ({ userRole, currentUser, onLogout, darkMode, onToggleDark }) => {
  const [queue, setQueue] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [q, c, o] = await Promise.allSettled([
        callGateway('admin_queue_summary', {}),
        callGateway('admin_list_claims', { limit: 20 }),
        callGateway('admin_list_orders', { limit: 20 }),
      ]);
      if (q.status === 'fulfilled') setQueue((q.value as any)?.data ?? null);
      if (c.status === 'fulfilled') setClaims(((c.value as any)?.data ?? []) as any[]);
      if (o.status === 'fulfilled') setOrders(((o.value as any)?.data ?? []) as any[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const pendingClaims = claims.filter(c => ['SUBMITTED', 'UNDER_REVIEW', 'PENDING'].includes(String(c.status ?? '').toUpperCase()));

  return (
    <WorkspaceShell
      workspace="support"
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
        <div className="relative overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top,_#083344,_#021820)] p-6 text-white">
          <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative">
            <p className="text-2xs font-black uppercase tracking-[0.3em] text-cyan-300">Business Support</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Tiket, lookup & eskalasi</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/70">Lini pertama untuk nasabah dan mitra: cari order/klaim, jelaskan status, dan eskalasikan ke tim yang tepat.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Order Menunggu" value={queue?.pendingOrders ?? '—'} sublabel="Perlu tindak lanjut" icon={ClipboardList} accent="#3B82F6" />
          <KpiCard label="Klaim Berjalan" value={queue?.pendingClaims ?? pendingClaims.length} sublabel="Status aktif" icon={ShieldCheck} accent="#22C55E" />
          <KpiCard label="Notifikasi Baru" value={queue?.unreadNotifications ?? '—'} sublabel="Belum dibaca" icon={Headphones} accent="#06B6D4" />
          <KpiCard label="Pembayaran Pending" value={queue?.pendingPayments ?? '—'} sublabel="Cek status" icon={AlertTriangle} accent="#F59E0B" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-ds-border bg-ds-card shadow-ds-sm">
            <div className="flex items-center justify-between border-b border-ds-border px-6 py-4">
              <div>
                <p className="text-2xs font-black uppercase tracking-[0.22em] text-ds-ink3">Antrian Klaim</p>
                <h3 className="text-lg font-black tracking-tight">Klaim Terbaru</h3>
              </div>
              <Search size={16} className="text-ds-ink3" />
            </div>
            <div className="divide-y divide-ds-border">
              {!loading && pendingClaims.length === 0 && (
                <p className="px-6 py-10 text-center text-sm text-ds-ink3">Tidak ada klaim berjalan.</p>
              )}
              {pendingClaims.slice(0, 8).map(c => (
                <div key={c.id} className="flex items-center justify-between px-6 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{c.claim_number ?? c.id}</p>
                    <p className="text-xs text-ds-ink3">{c.product_type ?? 'Klaim'} · {c.status}</p>
                  </div>
                  <button className="rounded-full border border-ds-border px-3 py-1 text-xs font-bold">Detail</button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-ds-border bg-ds-card shadow-ds-sm">
            <div className="flex items-center justify-between border-b border-ds-border px-6 py-4">
              <div>
                <p className="text-2xs font-black uppercase tracking-[0.22em] text-ds-ink3">Lookup Order</p>
                <h3 className="text-lg font-black tracking-tight">Order Terbaru</h3>
              </div>
              <Search size={16} className="text-ds-ink3" />
            </div>
            <div className="divide-y divide-ds-border">
              {!loading && orders.length === 0 && (
                <p className="px-6 py-10 text-center text-sm text-ds-ink3">Belum ada order.</p>
              )}
              {orders.slice(0, 8).map(o => (
                <div key={o.id} className="flex items-center justify-between px-6 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{o.order_number} · {o.client_name}</p>
                    <p className="text-xs text-ds-ink3">{o.product_name ?? 'Asuransi'} · {o.status}</p>
                  </div>
                  <button className="rounded-full border border-ds-border px-3 py-1 text-xs font-bold">Detail</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
};

export default BusinessSupportDashboard;
