import React, { useEffect, useState } from 'react';
import { Banknote, Wallet, ArrowDownToLine, AlertTriangle, FileText, RefreshCw } from 'lucide-react';
import WorkspaceShell from '../shared/WorkspaceShell';
import KpiCard from '../shared/KpiCard';
import { getAdminStats } from '../../../../services/orders';
import { callGateway } from '../../../../services/db';

interface Props {
  userRole: string;
  currentUser: any;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
}

const formatIDR = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
const formatIDRCompact = (n: number) => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  return `Rp ${n.toLocaleString('id-ID')}`;
};

export const FinanceDashboard: React.FC<Props> = ({ userRole, currentUser, onLogout, darkMode, onToggleDark }) => {
  const [stats, setStats] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, w] = await Promise.allSettled([
        getAdminStats(),
        callGateway('admin_list_withdrawals', { status: 'PENDING', limit: 10 }),
      ]);
      if (s.status === 'fulfilled') setStats(s.value);
      if (w.status === 'fulfilled') setWithdrawals((w.value as any)?.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <WorkspaceShell
      workspace="finance"
      userRole={userRole}
      userName={currentUser?.name}
      darkMode={darkMode}
      onToggleDark={onToggleDark}
      onLogout={onLogout}
      actions={
        <button
          onClick={load}
          className="flex h-9 items-center gap-1.5 rounded-full border border-ds-border px-3 text-xs font-bold text-ds-ink3 transition-all hover:text-ds-ink"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      }
    >
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top,_#0F3D2E,_#061813)] p-6 text-white">
          <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-2xs font-black uppercase tracking-[0.3em] text-emerald-300">Finance Workspace</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Kontrol arus kas & komisi</h2>
              <p className="mt-2 max-w-xl text-sm text-white/70">Fokus pada penarikan tertunda, komisi agen, pembayaran masuk, dan rekonsiliasi yang butuh persetujuan.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">Penarikan menunggu: {withdrawals.length}</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">Komisi tertunda: {stats ? formatIDRCompact(stats.pendingCommissions) : '—'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Premi Dibayar" value={stats ? formatIDRCompact(stats.totalPremiumPaid) : '—'} sublabel="Akumulasi terbayar" icon={Banknote} accent="#22C55E" />
          <KpiCard label="Premi Diterbitkan" value={stats ? formatIDRCompact(stats.totalPremiumIssued) : '—'} sublabel="Nilai polis terbit" icon={FileText} accent="#3B82F6" />
          <KpiCard label="Komisi Tertunda" value={stats ? formatIDRCompact(stats.pendingCommissions) : '—'} sublabel="Menunggu cairkan" icon={Wallet} accent="#F59E0B" />
          <KpiCard label="Penarikan Pending" value={withdrawals.length} sublabel="Butuh persetujuan" icon={ArrowDownToLine} accent="#EF4444" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-3xl border border-ds-border bg-ds-card shadow-ds-sm">
            <div className="flex items-center justify-between border-b border-ds-border px-6 py-4">
              <div>
                <p className="text-2xs font-black uppercase tracking-[0.22em] text-ds-ink3">Antrian Penarikan</p>
                <h3 className="text-lg font-black tracking-tight">Prioritas Hari Ini</h3>
              </div>
              <button className="text-xs font-bold text-ds-green">Lihat semua</button>
            </div>
            <div className="divide-y divide-ds-border">
              {withdrawals.length === 0 && !loading && (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <AlertTriangle size={18} className="text-ds-ink3" />
                  <p className="text-sm font-bold">Tidak ada penarikan pending</p>
                  <p className="text-xs text-ds-ink3">Semua antrian penarikan sudah tertangani.</p>
                </div>
              )}
              {withdrawals.map((w: any) => (
                <div key={w.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold">{w.agent_name || w.agent_id}</p>
                    <p className="text-xs text-ds-ink3">{w.bank_name} • {w.account_number}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-black tabular-nums">{formatIDR(w.amount)}</p>
                      <p className="text-2xs font-bold uppercase tracking-[0.18em] text-ds-ink3">{w.status}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="rounded-full border border-ds-border px-3 py-1 text-xs font-bold">Tolak</button>
                      <button className="rounded-full bg-ds-green px-3 py-1 text-xs font-bold text-ds-on-green">Setujui</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-ds-border bg-ds-card shadow-ds-sm">
            <div className="border-b border-ds-border px-6 py-4">
              <p className="text-2xs font-black uppercase tracking-[0.22em] text-ds-ink3">Aksi Cepat</p>
              <h3 className="text-lg font-black tracking-tight">Finance Tools</h3>
            </div>
            <div className="grid gap-2 p-4">
              {[
                { label: 'Komisi Ledger', desc: 'Lihat & filter komisi' },
                { label: 'Rekonsiliasi Xendit', desc: 'Cocokkan pembayaran' },
                { label: 'Daftar Penarikan', desc: 'Kelola seluruh penarikan' },
                { label: 'Laporan Keuangan', desc: 'Export harian/bulanan' },
                { label: 'Dompet Agen', desc: 'Saldo & mutasi' },
              ].map(item => (
                <button key={item.label} className="flex items-center justify-between rounded-2xl border border-ds-border px-4 py-3 text-left transition-all hover:border-ds-green/40 hover:shadow-ds-sm">
                  <div>
                    <p className="text-sm font-bold">{item.label}</p>
                    <p className="text-xs text-ds-ink3">{item.desc}</p>
                  </div>
                  <ArrowDownToLine size={14} className="text-ds-ink3" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
};

export default FinanceDashboard;
