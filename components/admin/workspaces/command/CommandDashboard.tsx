import React, { useEffect, useState } from 'react';
import { Activity, Users, ShieldCheck, AlertTriangle, RefreshCw, BarChart3, Settings, KeyRound } from 'lucide-react';
import WorkspaceShell from '../shared/WorkspaceShell';
import KpiCard from '../shared/KpiCard';
import { getAdminStats } from '../../../../services/orders';

interface Props {
  userRole: string;
  currentUser: any;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
}

const formatIDRCompact = (n: number) => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  return `Rp ${n.toLocaleString('id-ID')}`;
};

export const CommandDashboard: React.FC<Props> = ({ userRole, currentUser, onLogout, darkMode, onToggleDark }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const s = await getAdminStats();
      setStats(s);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <WorkspaceShell
      workspace="command"
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
        <div className="relative overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top,_#0B1120,_#020617)] p-6 text-white">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative">
            <p className="text-2xs font-black uppercase tracking-[0.3em] text-emerald-300">Master Admin • Command Center</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Pengawasan platform secara menyeluruh</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/70">Satu tempat untuk melihat kesehatan bisnis, risiko, persetujuan kritikal, audit, dan konfigurasi sistem.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total Pesanan" value={stats?.totalOrders ?? '—'} sublabel="Semua status" icon={Activity} accent="#3B82F6" />
          <KpiCard label="Premi Diterbitkan" value={stats ? formatIDRCompact(stats.totalPremiumIssued) : '—'} sublabel="Nilai polis" icon={BarChart3} accent="#22C55E" />
          <KpiCard label="Mitra Aktif" value={stats?.activeAgents ?? '—'} sublabel="Agen terverifikasi" icon={Users} accent="#A855F7" />
          <KpiCard label="Komisi Tertunda" value={stats ? formatIDRCompact(stats.pendingCommissions) : '—'} sublabel="Perlu review" icon={AlertTriangle} accent="#F59E0B" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-3xl border border-ds-border bg-ds-card shadow-ds-sm">
            <div className="flex items-center justify-between border-b border-ds-border px-6 py-4">
              <div>
                <p className="text-2xs font-black uppercase tracking-[0.22em] text-ds-ink3">Funnel Pesanan</p>
                <h3 className="text-lg font-black tracking-tight">Status Real-time</h3>
              </div>
            </div>
            <div className="grid gap-3 p-6 sm:grid-cols-2">
              {(Object.entries(stats?.ordersByStatus || {}) as [string, number][]).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-2xl border border-ds-border px-4 py-3">
                  <span className="text-sm font-bold">{k.replace('_', ' ')}</span>
                  <span className="text-sm font-black tabular-nums">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-ds-border bg-ds-card shadow-ds-sm">
            <div className="border-b border-ds-border px-6 py-4">
              <p className="text-2xs font-black uppercase tracking-[0.22em] text-ds-ink3">Keamanan & Kontrol</p>
              <h3 className="text-lg font-black tracking-tight">Aksi Kritis</h3>
            </div>
            <div className="grid gap-2 p-4">
              {[
                { label: 'Audit Logs', desc: 'Riwayat aksi sensitif', icon: ShieldCheck },
                { label: 'Manajemen User & Role', desc: 'Assign role & akses', icon: Users },
                { label: 'Konfigurasi Sistem', desc: 'Produk, tarif, pengaturan', icon: Settings },
                { label: 'Keamanan', desc: 'Sesi, izin, hardening', icon: KeyRound },
              ].map(item => (
                <button key={item.label} className="flex items-center gap-3 rounded-2xl border border-ds-border px-4 py-3 text-left transition-all hover:border-ds-green/40 hover:shadow-ds-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ds-green-tint text-ds-green">
                    <item.icon size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{item.label}</p>
                    <p className="text-xs text-ds-ink3">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
};

export default CommandDashboard;
