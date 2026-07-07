// OperatorDashboard.tsx — Beranda tab. Aggregated queue summary + quick stats.
import React, { useEffect, useState, useCallback } from 'react';
import { FileText, ShieldAlert, Wallet, UserCheck, Bell, TrendingUp, Clock } from 'lucide-react';
import { Language } from '../../types';
import { SectionLabel } from '../shared/cards';
import { SkeletonCard, useToast, useConfirmDialog } from '../ui';
import { getQueueSummary, listPendingAgents, verifyAgent, type QueueSummary, type OperatorAgent } from '../../services/operatorService';

interface Props {
  operator: any;
  lang: Language;
  onNavigate: (tab: string) => void;
  refreshTick: number;
}

const OperatorDashboard: React.FC<Props> = ({ operator, onNavigate, refreshTick }) => {
  const toast = useToast();
  const confirm = useConfirmDialog();
  const [summary, setSummary] = useState<QueueSummary | null>(null);
  const [pendingAgents, setPendingAgents] = useState<OperatorAgent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, agents] = await Promise.all([
        getQueueSummary(),
        listPendingAgents(),
      ]);
      setSummary(s);
      setPendingAgents(agents);
    } catch (e: any) {
      console.error('OperatorDashboard load:', e);
      toast.error(`Gagal memuat dashboard: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load, refreshTick]);

  const handleVerifyAgent = async (userId: string, name: string) => {
    const ok = await confirm({
      title: 'Verifikasi Agen',
      description: `Setujui ${name} sebagai agen terverifikasi? Agen ini dapat mulai bertransaksi setelah diverifikasi.`,
      confirmLabel: 'Verifikasi',
      variant: 'primary',
    });
    if (!ok) return;
    try {
      await verifyAgent(userId);
      toast.success(`${name} berhasil diverifikasi`);
      load();
    } catch (e: any) {
      toast.error(`Gagal verifikasi: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div className="px-5 pt-5 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const queueCards = [
    { label: 'Polis Pending',   value: summary?.pendingOrders ?? 0,        icon: FileText,    color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/30',     tab: 'orders' },
    { label: 'Klaim Pending',   value: summary?.pendingClaims ?? 0,        icon: ShieldAlert, color: 'text-rose-500',    bg: 'bg-rose-50 dark:bg-rose-950/30',     tab: 'claims' },
    { label: 'Penarikan Pending', value: summary?.pendingWithdrawals ?? 0, icon: Wallet,      color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/30',   tab: 'withdrawals' },
    { label: 'Agen Perlu Verifikasi', value: summary?.pendingAgents ?? 0,  icon: UserCheck,   color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', tab: 'home' },
  ];

  return (
    <div className="px-5 pt-5 space-y-6 pb-4">
      {/* Hero greeting */}
      <div className="relative overflow-hidden rounded-3xl p-5 text-white"
        style={{ background: 'linear-gradient(135deg, #003B2F 0%, #005240 60%, #003B2F 100%)' }}>
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle, rgba(0,193,106,0.35) 0%, transparent 70%)' }} />
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Operator Dashboard</p>
          <h1 className="text-2xl font-black tracking-tight mt-1">Halo, {operator?.name?.split(' ')[0] ?? 'Operator'} 👋</h1>
          <p className="text-xs text-white/80 mt-1.5 leading-relaxed">
            {summary && summary.pendingOrders + summary.pendingClaims + summary.pendingWithdrawals + summary.pendingAgents > 0
              ? `Ada ${summary.pendingOrders + summary.pendingClaims + summary.pendingWithdrawals + summary.pendingAgents} pengajuan menunggu konfirmasi Anda.`
              : 'Tidak ada pengajuan pending saat ini. Pekerjaan rapi! 🎉'}
          </p>
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur px-2.5 py-1 rounded-full">
              <TrendingUp size={11} className="text-ds-green" />
              <span className="text-[10px] font-bold">{summary?.paidPayments ?? 0} pembayaran</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur px-2.5 py-1 rounded-full">
              <Clock size={11} className="text-amber-300" />
              <span className="text-[10px] font-bold">{summary?.pendingPayments ?? 0} pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Queue cards */}
      <div>
        <SectionLabel>Antrian Konfirmasi</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          {queueCards.map(c => (
            <button
              key={c.label}
              onClick={() => onNavigate(c.tab)}
              className={`text-left p-4 rounded-2xl border border-ds-border bg-ds-card hover:shadow-ds-md active:scale-[0.98] transition-all duration-200 ${c.bg}`}
            >
              <div className="flex items-center justify-between">
                <c.icon size={20} className={c.color} />
                {c.value > 0 && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-ds-ink3 bg-ds-card2 px-2 py-0.5 rounded-full">
                    {c.value}
                  </span>
                )}
              </div>
              <p className="text-2xl font-black tracking-tight mt-2 text-ds-ink">{c.value}</p>
              <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest mt-0.5">{c.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Quick notif summary */}
      <div>
        <SectionLabel action={{ label: 'Lihat semua', onClick: () => onNavigate('home') }}>
          Notifikasi Belum Dibaca
        </SectionLabel>
        <div className="p-4 rounded-2xl border border-ds-border bg-ds-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-ds-green-tint flex items-center justify-center">
            <Bell size={18} className="text-ds-green" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-ds-ink">{summary?.unreadNotifications ?? 0} notifikasi belum dibaca</p>
            <p className="text-xs text-ds-ink3">Notifikasi pop-up muncul otomatis saat ada pengajuan baru</p>
          </div>
        </div>
      </div>

      {/* Pending agent verifications */}
      {pendingAgents.length > 0 && (
        <div>
          <SectionLabel>Agen Menunggu Verifikasi</SectionLabel>
          <div className="space-y-2">
            {pendingAgents.slice(0, 5).map(a => (
              <div key={a.id} className="p-3 rounded-2xl border border-ds-border bg-ds-card flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-ds-green-tint flex items-center justify-center font-black text-ds-green">
                  {a.name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ds-ink truncate">{a.name}</p>
                  <p className="text-xs text-ds-ink3 truncate">{a.email} · {a.phone ?? '-'}</p>
                  <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest mt-0.5">{a.agent_code ?? 'SP-AGT-???'}</p>
                </div>
                <button
                  onClick={() => handleVerifyAgent(a.id, a.name)}
                  className="px-3 py-2 rounded-xl bg-ds-green text-white text-xs font-bold active:scale-95 transition-transform"
                >
                  Verifikasi
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorDashboard;
