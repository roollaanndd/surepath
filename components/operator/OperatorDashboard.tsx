// OperatorDashboard.tsx — Beranda tab. Aggregated queue summary + quick stats.
import React, { useEffect, useState, useCallback } from 'react';
import { FileText, ShieldAlert, Wallet, UserCheck, Bell, TrendingUp, Clock, Eye } from 'lucide-react';
import { Language } from '../../types';
import { SectionLabel } from '../shared/cards';
import { SkeletonCard, useToast } from '../ui';
import { useT } from '../../src/i18n';
import { getQueueSummary, listPendingAgents, type QueueSummary, type OperatorAgent } from '../../services/operatorService';
import { AgentArtKeyframes, SpotOrders } from '../agent/AgentArt';

interface Props {
  operator: any;
  lang: Language;
  onNavigate: (tab: string) => void;
  refreshTick: number;
}

const OperatorDashboard: React.FC<Props> = ({ operator, lang, onNavigate, refreshTick }) => {
  const t = useT(lang);
  void t; // i18n helper — strings will be translated incrementally
  const toast = useToast();
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
    { label: 'Agen Perlu Verifikasi', value: summary?.pendingAgents ?? 0,  icon: UserCheck,   color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', tab: 'agents' },
  ];

  return (
    <div className="px-5 pt-5 space-y-6 pb-4">
      {/* Hero greeting — bank-grade command card */}
      <AgentArtKeyframes />
      <div className="relative overflow-hidden rounded-[1.75rem] p-5 text-white"
        style={{ background: 'linear-gradient(120deg, #0B1120 0%, #0E3B2E 55%, #0B5E3B 100%)', boxShadow: '0 16px 44px -14px rgba(11,17,32,0.55)' }}>
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,193,106,0.28) 0%, transparent 70%)' }} />
        <svg aria-hidden className="absolute right-0 top-0 h-full opacity-[0.12] pointer-events-none" viewBox="0 0 200 140" fill="none">
          <circle cx="175" cy="18" r="72" stroke="#fff" strokeWidth="1.2" />
          <circle cx="175" cy="18" r="48" stroke="#fff" strokeWidth="1.2" />
          <circle cx="175" cy="18" r="26" stroke="#fff" strokeWidth="1.2" />
        </svg>
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-2xs font-bold uppercase tracking-wider text-white/55 whitespace-nowrap">Operator Command Center</p>
            <h1 className="text-2xl font-black tracking-tight mt-1">{t('Hello', 'Halo')}, {operator?.name?.split(' ')[0] ?? 'Operator'} 👋</h1>
            <p className="text-xs text-white/75 mt-1.5 leading-relaxed">
              {summary && summary.pendingOrders + summary.pendingClaims + summary.pendingWithdrawals + summary.pendingAgents > 0
                ? `Ada ${summary.pendingOrders + summary.pendingClaims + summary.pendingWithdrawals + summary.pendingAgents} pengajuan menunggu konfirmasi Anda.`
                : 'Tidak ada pengajuan pending saat ini. Pekerjaan rapi! 🎉'}
            </p>
          </div>
          <div className="flex-shrink-0 -my-2"><SpotOrders size={78} /></div>
        </div>
        <div className="relative z-10 flex items-center gap-3 mt-4 pt-3.5 border-t border-white/10">
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur px-2.5 py-1 rounded-full">
            <TrendingUp size={11} className="text-ds-green" />
            <span className="text-2xs font-bold">{summary?.paidPayments ?? 0} pembayaran</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur px-2.5 py-1 rounded-full">
            <Clock size={11} className="text-amber-300" />
            <span className="text-2xs font-bold">{summary?.pendingPayments ?? 0} pending</span>
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
              <c.icon size={20} className={c.color} />
              <p className="text-2xl font-black tracking-tight mt-2 text-ds-ink tabular-nums">{c.value}</p>
              <p className="text-2xs font-bold text-ds-ink3 uppercase tracking-wider mt-0.5 leading-tight">{c.label}</p>
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
          <SectionLabel action={{ label: 'Lihat semua', onClick: () => onNavigate('agents') }}>
            Agen Menunggu Verifikasi
          </SectionLabel>
          <div className="space-y-2">
            {pendingAgents.slice(0, 5).map(a => (
              <button
                key={a.id}
                onClick={() => onNavigate('agents')}
                className="w-full p-3 rounded-2xl border border-ds-border bg-ds-card flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
              >
                <div className="w-10 h-10 rounded-full bg-ds-green-tint flex items-center justify-center font-black text-ds-green overflow-hidden">
                  {a.profile_photo_url ? (
                    <img loading="lazy" src={a.profile_photo_url} alt={a.name} className="w-full h-full object-cover" />
                  ) : (
                    (a.name?.charAt(0)?.toUpperCase() ?? '?')
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ds-ink truncate">{a.name}</p>
                  <p className="text-xs text-ds-ink3 truncate">{a.email} · {a.phone ?? '-'}</p>
                  <p className="text-2xs font-bold text-ds-ink3 uppercase tracking-wider mt-0.5">{a.agent_code ?? 'SP-AGT-???'}</p>
                </div>
                <Eye size={14} className="text-ds-ink3 shrink-0" />
              </button>
            ))}
            <button
              onClick={() => onNavigate('agents')}
              className="w-full py-2.5 rounded-2xl text-xs font-bold bg-ds-green-tint text-ds-green active:scale-95 transition-transform"
            >
              Verifikasi semua agen →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorDashboard;
