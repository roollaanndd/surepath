import React from 'react';
import { FileCheck, Send, RefreshCw } from 'lucide-react';
import WorkspaceShell from '../shared/WorkspaceShell';
import KpiCard from '../shared/KpiCard';

interface Props {
  userRole: string;
  currentUser: any;
  onLogout: () => void;
}

export const InsurerLiaisonDashboard: React.FC<Props> = ({ userRole, currentUser, onLogout }) => {
  return (
    <WorkspaceShell
      workspace="insurer"
      userRole={userRole}
      userName={currentUser?.name}
      onLogout={onLogout}
      actions={
        <button className="flex h-9 items-center gap-1.5 rounded-full border border-ds-border px-3 text-xs font-bold text-ds-ink3 transition-all hover:text-ds-ink">
          <RefreshCw size={14} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      }
    >
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top,_#053B2F,_#021C16)] p-6 text-white">
          <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative">
            <p className="text-2xs font-black uppercase tracking-[0.3em] text-emerald-300">Insurer Liaison</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Review, follow-up & koordinasi insurer</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/70">Percepat turnaround review, kelola review token, pantau SLA, dan pastikan polis terbit tepat waktu.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Menunggu Review" value="—" sublabel="Butuh tindak lanjut" iconId="approvals" accent="#F59E0B" />
          <KpiCard label="Review Terkirim" value="—" sublabel="Token aktif" iconId="insurers" accent="#3B82F6" />
          <KpiCard label="Siap Terbit" value="—" sublabel="Disetujui, menunggu polis" iconId="policy" accent="#22C55E" />
          <KpiCard label="Lewat SLA" value="—" sublabel="Perlu eskalasi" iconId="security" accent="#EF4444" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-ds-border bg-ds-card shadow-ds-sm">
            <div className="flex items-center justify-between border-b border-ds-border px-6 py-4">
              <div>
                <p className="text-2xs font-black uppercase tracking-[0.22em] text-ds-ink3">Antrian Prioritas</p>
                <h3 className="text-lg font-black tracking-tight">Review Insurer</h3>
              </div>
              <button className="text-xs font-bold text-ds-green">Lihat semua</button>
            </div>
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <FileCheck size={18} className="text-ds-ink3" />
              <p className="text-sm font-bold">Antrian review akan muncul di sini</p>
              <p className="text-xs text-ds-ink3">Terhubung ke order yang menunggu review insurer</p>
            </div>
          </div>
          <div className="rounded-3xl border border-ds-border bg-ds-card shadow-ds-sm">
            <div className="border-b border-ds-border px-6 py-4">
              <p className="text-2xs font-black uppercase tracking-[0.22em] text-ds-ink3">Aksi Cepat</p>
              <h3 className="text-lg font-black tracking-tight">Insurer Tools</h3>
            </div>
            <div className="grid gap-2 p-4">
              {[
                { label: 'Kirim Review Link', desc: 'Generate & kirim token' },
                { label: 'Review Tokens', desc: 'Kelola token aktif/expired' },
                { label: 'Produk Per Insurer', desc: 'Konfigurasi produk & tarif' },
                { label: 'Aktivitas Insurer', desc: 'Timeline & SLA' },
                { label: 'OJK Rate Sets', desc: 'Kelola set tarif' },
              ].map(item => (
                <button key={item.label} className="flex items-center justify-between rounded-2xl border border-ds-border px-4 py-3 text-left transition-all hover:border-ds-green/40 hover:shadow-ds-sm">
                  <div>
                    <p className="text-sm font-bold">{item.label}</p>
                    <p className="text-xs text-ds-ink3">{item.desc}</p>
                  </div>
                  <Send size={14} className="text-ds-ink3" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
};

export default InsurerLiaisonDashboard;
