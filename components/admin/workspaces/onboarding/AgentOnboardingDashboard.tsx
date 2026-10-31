import React, { useEffect, useState } from 'react';
import { UserCheck, UserX, RefreshCw } from 'lucide-react';
import WorkspaceShell from '../shared/WorkspaceShell';
import KpiCard from '../shared/KpiCard';
import { callGateway } from '../../../../services/db';

interface Props {
  userRole: string;
  currentUser: any;
  onLogout: () => void;
}

export const AgentOnboardingDashboard: React.FC<Props> = ({ userRole, currentUser, onLogout }) => {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await callGateway('admin_list_pending_agents', { limit: 100 });
      if ((res as any)?.error) setError(String((res as any).error));
      else setPending(((res as any)?.data ?? []) as any[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const decide = async (agentId: string, approve: boolean) => {
    setBusyId(agentId);
    setError(null);
    try {
      const res = await callGateway('admin_verify_agent', { agent_id: agentId, approve });
      if ((res as any)?.error) setError(String((res as any).error));
      else setPending(prev => prev.filter(a => a.id !== agentId));
    } finally {
      setBusyId(null);
    }
  };

  const withAgreement = pending.filter(a => a.agreement).length;
  const missingDocs = pending.filter(a => !a.ktp_document_url && !a.ktp).length;

  return (
    <WorkspaceShell
      workspace="onboarding"
      userRole={userRole}
      userName={currentUser?.name}
      onLogout={onLogout}
      actions={
        <button onClick={load} className="flex h-9 items-center gap-1.5 rounded-full border border-ds-border px-3 text-xs font-bold text-ds-ink3 transition-all hover:text-ds-ink">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      }
    >
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top,_#431407,_#1A0A03)] p-6 text-white">
          <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-orange-400/10 blur-3xl" />
          <div className="relative">
            <p className="text-2xs font-black uppercase tracking-[0.3em] text-orange-300">Agent Onboarding</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Registrasi, KYC & aktivasi agen</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/70">Tinjau pendaftaran mitra, pastikan dokumen lengkap, lalu aktifkan. Setiap keputusan tercatat dan mitra menerima notifikasi.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Menunggu Review" value={pending.length} sublabel="Pendaftaran baru" iconId="approvals" accent="#F97316" />
          <KpiCard label="Dengan Perjanjian" value={withAgreement} sublabel="Sudah setuju" iconId="policy" accent="#3B82F6" />
          <KpiCard label="Dokumen Kurang" value={missingDocs} sublabel="Perlu tindak lanjut" iconId="documents" accent="#F59E0B" />
          <KpiCard label="Siap Aktif" value={Math.max(0, pending.length - missingDocs)} sublabel="Dokumen lengkap" iconId="agents" accent="#22C55E" />
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-700 dark:text-rose-200">
            {error}
          </div>
        )}

        <div className="rounded-3xl border border-ds-border bg-ds-card shadow-ds-sm">
          <div className="flex items-center justify-between border-b border-ds-border px-6 py-4">
            <div>
              <p className="text-2xs font-black uppercase tracking-[0.22em] text-ds-ink3">Antrean Verifikasi</p>
              <h3 className="text-lg font-black tracking-tight">Registrasi Mitra</h3>
            </div>
            <span className="rounded-full bg-ds-card2 px-3 py-1 text-xs font-bold text-ds-ink3">{pending.length} pending</span>
          </div>
          <div className="divide-y divide-ds-border">
            {!loading && pending.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <UserCheck size={18} className="text-ds-ink3" />
                <p className="text-sm font-bold">Tidak ada pendaftaran menunggu</p>
                <p className="text-xs text-ds-ink3">Semua pendaftaran mitra sudah ditinjau.</p>
              </div>
            )}
            {pending.map(a => (
              <div key={a.id} className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-ds-orange-lt text-sm font-black text-ds-orange">
                    {(a.name ?? '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{a.name}</p>
                    <p className="truncate text-xs text-ds-ink3">{a.email} · {a.agent_code ?? 'Tanpa kode'}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-2xs font-bold uppercase tracking-wide">
                      <span className={a.agreement ? 'text-ds-green' : 'text-ds-amber'}>
                        {a.agreement ? 'Perjanjian ✓' : 'Perjanjian belum ada'}
                      </span>
                      <span className={a.ktp_document_url || a.ktp ? 'text-ds-green' : 'text-ds-amber'}>
                        {a.ktp_document_url || a.ktp ? 'KTP ✓' : 'KTP kurang'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={busyId === a.id}
                    onClick={() => decide(a.id, false)}
                    className="flex items-center gap-1.5 rounded-full border border-ds-border px-4 py-1.5 text-xs font-bold text-ds-red transition-all hover:border-ds-red/40 disabled:opacity-50"
                  >
                    <UserX size={12} /> Tolak
                  </button>
                  <button
                    disabled={busyId === a.id}
                    onClick={() => decide(a.id, true)}
                    className="flex items-center gap-1.5 rounded-full bg-ds-green px-4 py-1.5 text-xs font-bold text-ds-on-green transition-all hover:opacity-90 disabled:opacity-50"
                  >
                    <UserCheck size={12} /> Verifikasi
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
};

export default AgentOnboardingDashboard;
