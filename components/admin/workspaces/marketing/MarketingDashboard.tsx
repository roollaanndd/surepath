import React, { useEffect, useState } from 'react';
import { Users, Target, TrendingUp, Building2, RefreshCw, Megaphone } from 'lucide-react';
import WorkspaceShell from '../shared/WorkspaceShell';
import KpiCard from '../shared/KpiCard';
import { callGateway } from '../../../../services/db';
import { getAllB2BSubmissions } from '../../../../services/website';

interface Props {
  userRole: string;
  currentUser: any;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
}

const formatIDR = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

export const MarketingDashboard: React.FC<Props> = ({ userRole, currentUser, onLogout, darkMode, onToggleDark }) => {
  const [team, setTeam] = useState<any[]>([]);
  const [b2b, setB2b] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [t, b] = await Promise.allSettled([
        callGateway('admin_marketing_overview', {}),
        getAllB2BSubmissions(),
      ]);
      if (t.status === 'fulfilled') setTeam(((t.value as any)?.data ?? []) as any[]);
      if (b.status === 'fulfilled') setB2b(((b.value as any) ?? []) as any[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totalAgents = team.reduce((s, m) => s + Number(m.jumlah_agen ?? 0), 0);
  const totalProductive = team.reduce((s, m) => s + Number(m.agen_produktif ?? 0), 0);
  const totalTarget = team.reduce((s, m) => s + Number(m.monthly_target ?? 0), 0);
  const openB2b = b2b.filter(s => !['APPROVED', 'REJECTED', 'CONVERTED', 'CLOSED'].includes(String(s.status ?? '').toUpperCase()));

  return (
    <WorkspaceShell
      workspace="marketing"
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
        <div className="relative overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top,_#2E1065,_#0B0418)] p-6 text-white">
          <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-purple-400/10 blur-3xl" />
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-300">Marketing Workspace</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Leads, tim & pertumbuhan</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/70">Pantau produktivitas handler, pipeline B2B, dan target bulanan dalam satu tampilan.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Handler Marketing" value={team.length} sublabel="Tim aktif" icon={Users} accent="#A855F7" />
          <KpiCard label="Agen Terkelola" value={totalAgents} sublabel="Di bawah tim" icon={TrendingUp} accent="#3B82F6" />
          <KpiCard label="Agen Produktif" value={totalProductive} sublabel="Punya order" icon={Target} accent="#22C55E" />
          <KpiCard label="Pipeline B2B" value={openB2b.length} sublabel="Perlu tindak lanjut" icon={Building2} accent="#F59E0B" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-3xl border border-ds-border bg-ds-card shadow-ds-sm">
            <div className="flex items-center justify-between border-b border-ds-border px-6 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-ds-ink3">Kinerja Tim</p>
                <h3 className="text-lg font-black tracking-tight">Handler & Agen</h3>
              </div>
              {totalTarget > 0 && (
                <span className="rounded-full bg-ds-card2 px-3 py-1 text-xs font-bold text-ds-ink3">Target {formatIDR(totalTarget)}</span>
              )}
            </div>
            <div className="divide-y divide-ds-border">
              {!loading && team.length === 0 && (
                <p className="px-6 py-10 text-center text-sm text-ds-ink3">Belum ada handler marketing.</p>
              )}
              {team.map(m => {
                const conv = Number(m.jumlah_agen ?? 0) > 0
                  ? Math.round((Number(m.agen_produktif ?? 0) / Number(m.jumlah_agen ?? 1)) * 100)
                  : 0;
                return (
                  <div key={m.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{m.name}</p>
                      <p className="truncate text-xs text-ds-ink3">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-black tabular-nums">{m.jumlah_agen ?? 0}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-ds-ink3">Agen</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black tabular-nums">{conv}%</p>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-ds-ink3">Produktif</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-ds-border bg-ds-card shadow-ds-sm">
            <div className="border-b border-ds-border px-6 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-ds-ink3">Pipeline</p>
              <h3 className="text-lg font-black tracking-tight">Pengajuan B2B</h3>
            </div>
            <div className="divide-y divide-ds-border">
              {!loading && openB2b.length === 0 && (
                <p className="px-6 py-10 text-center text-sm text-ds-ink3">Tidak ada pengajuan B2B terbuka.</p>
              )}
              {openB2b.slice(0, 6).map(s => (
                <div key={s.id} className="flex items-center gap-3 px-6 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ds-purple-lt text-ds-purple">
                    <Megaphone size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{s.company_name ?? s.company ?? 'Perusahaan'}</p>
                    <p className="text-xs text-ds-ink3">{s.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
};

export default MarketingDashboard;
