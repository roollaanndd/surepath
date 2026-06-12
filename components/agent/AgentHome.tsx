import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, Shield, Wallet, ChevronRight,
  FileText, Lightbulb, Star, ClipboardList,
  Trophy, Network, RefreshCw, FileEdit
} from 'lucide-react';
import { Language } from '../../types';
import { formatIDR } from '../car-wizard/WizardUI';
import RenewalAlerts from './RenewalAlerts';
import { getAgentCoinBalance } from '../../services/supabaseService';

interface Props {
  agent: any;
  agentId: string;
  stats: any;
  recentCommissions: any[];
  onNavigate: (tab: string) => void;
  lang: Language;
  agentTier?: string | null;
}

const AgentHome: React.FC<Props> = ({ agent, agentId, stats, recentCommissions, onNavigate, lang, agentTier }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const [coinBalance, setCoinBalance] = useState(0);

  useEffect(() => {
    if (agentId) {
      getAgentCoinBalance(agentId).then(setCoinBalance);
    }
  }, [agentId]);

  const monthlyTarget = agent?.monthly_target ?? 10000000;
  const progress = Math.min((stats.totalCommissionMonth / monthlyTarget) * 100, 100);

  const statusColor: Record<string, string> = {
    PAID: 'bg-emerald-100 text-emerald-700',
    PENDING: 'bg-amber-100 text-amber-700',
    CANCELLED: 'bg-rose-100 text-rose-700',
  };

  const productLabel: Record<string, string> = {
    CAR: t('Auto', 'Mobil'),
    TRAVEL: t('Travel', 'Perjalanan'),
    PA: t('Personal Acc.', 'Kecelakaan Diri'),
    MPAR: t('Gadget', 'Gadget'),
  };

  const tips = [
    t('Clients who buy Travel insurance are 3× more likely to add a PA policy within 6 months.', 'Klien yang beli asuransi Travel 3× lebih mungkin menambah polis PA dalam 6 bulan.'),
    t('Following up with a prospect within 24 hours increases conversion by 60%.', 'Follow-up ke prospek dalam 24 jam meningkatkan konversi hingga 60%.'),
    t('Referrals close 4× faster than cold leads. Ask every happy client for one.', 'Referral menutup 4× lebih cepat dari prospek biasa. Minta setiap klien senang untuk merujuk.'),
    t('Cross-selling MPAR to car insurance clients adds an average Rp 90.000 commission per deal.', 'Cross-selling MPAR ke klien asuransi mobil menambah rata-rata komisi Rp 90.000 per deal.'),
  ];
  const tip = tips[new Date().getDate() % tips.length];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 11) return t('Good Morning', 'Selamat Pagi');
    if (h < 15) return t('Good Afternoon', 'Selamat Siang');
    if (h < 18) return t('Good Evening', 'Selamat Sore');
    return t('Good Night', 'Selamat Malam');
  };

  return (
    <div className="bg-ds-bg min-h-screen pb-28">

      {/* Header */}
      <div className="bg-ds-card px-5 pt-12 pb-5 border-b border-ds-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-ds-green flex items-center justify-center text-white font-black text-sm shadow-ds-green">
              {(agent?.name ?? 'A')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-ds-ink3">{greeting()}</p>
              <h2 className="text-base font-black text-ds-ink">{agent?.name?.split(' ')[0] ?? 'Agen'}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {agentTier && (
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                agentTier === 'ELITE'
                  ? 'bg-ds-purple-lt text-ds-purple'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {agentTier === 'ELITE' ? '💎 Elite' : '⭐ Bintang'}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full bg-ds-card2 border border-ds-border text-ds-ink2 text-[10px] font-bold">
              {agent?.agent_code ?? 'SP-AGT'}
            </span>
          </div>
        </div>
      </div>

      {/* Commission Hero Card */}
      <div className="px-5 pt-4">
        <div className="rounded-3xl p-5 bg-ds-navy text-white relative overflow-hidden shadow-ds-navy">
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full blur-2xl pointer-events-none" style={{ background: 'rgba(0,200,150,0.12)' }} />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(0,200,150,0.06)' }} />
          <div className="relative z-10">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">
              {t('Commission This Month', 'Komisi Bulan Ini')}
            </p>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-white/50 text-sm font-medium">Rp</span>
              <span className="text-3xl font-black text-white font-mono">
                {(stats.totalCommissionMonth / 1000000).toFixed(1)}jt
              </span>
              <span className="mb-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(0,200,150,0.2)', color: '#00C896' }}>+18%</span>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-white/40 text-[10px] font-medium">
                  {formatIDR(stats.totalCommissionMonth)} / {formatIDR(monthlyTarget)}
                </span>
                <span className="text-[10px] font-black" style={{ color: '#00C896' }}>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 motion-reduce:transition-none"
                  style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #00C896, #009E78)' }}
                />
              </div>
              {progress >= 100 && (
                <p className="text-[10px] font-bold mt-1" style={{ color: '#00C896' }}>
                  {t('Target Achieved! 🎉', 'Target Tercapai! 🎉')}
                </p>
              )}
            </div>

            <div className="flex gap-5 pt-3 border-t border-white/10">
              <div>
                <p className="text-white/40 text-[10px]">{t('Coins', 'Koin')}</p>
                <p className="text-white text-sm font-bold">{coinBalance.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-white/40 text-[10px]">{t('Clients', 'Klien')}</p>
                <p className="text-white text-sm font-bold">{stats.clientsCount}</p>
              </div>
              <div>
                <p className="text-white/40 text-[10px]">{t('Policies', 'Polis')}</p>
                <p className="text-white text-sm font-bold">{stats.totalPolicies}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards 2×2 */}
      <div className="px-5 mt-4 grid grid-cols-2 gap-3">
        <div className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-4 active:scale-[0.98] transition-transform">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-ds-green-tint rounded-xl flex items-center justify-center">
              <TrendingUp size={14} className="text-ds-green" />
            </div>
            <span className="text-[10px] text-ds-ink3 font-medium">{t('GWP / Month', 'GWP Bulan Ini')}</span>
          </div>
          <div className="text-xl font-black text-ds-ink font-mono">{formatIDR(stats.totalCommissionMonth * 8)}</div>
          <div className="text-[10px] text-ds-ink3 mt-0.5">{t('estimated', 'estimasi')}</div>
        </div>

        <div className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-4 active:scale-[0.98] transition-transform">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users size={14} className="text-ds-blue" />
            </div>
            <span className="text-[10px] text-ds-ink3 font-medium">{t('Clients', 'Klien')}</span>
          </div>
          <div className="text-xl font-black text-ds-ink font-mono">{stats.clientsCount}</div>
          <div className="text-[10px] text-ds-ink3 mt-0.5">{t('total', 'total')}</div>
        </div>

        <div className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-4 active:scale-[0.98] transition-transform">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-ds-green-tint rounded-xl flex items-center justify-center">
              <Shield size={14} className="text-ds-green" />
            </div>
            <span className="text-[10px] text-ds-ink3 font-medium">{t('Policies', 'Polis')}</span>
          </div>
          <div className="text-xl font-black text-ds-ink font-mono">{stats.policiesCount}</div>
          <div className="text-[10px] text-ds-ink3 mt-0.5">{t('active', 'aktif')}</div>
        </div>

        <div className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-4 active:scale-[0.98] transition-transform">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-ds-purple-lt rounded-xl flex items-center justify-center">
              <Wallet size={14} className="text-ds-purple" />
            </div>
            <span className="text-[10px] text-ds-ink3 font-medium">{t('Earned', 'Komisi')}</span>
          </div>
          <div className="text-xl font-black text-ds-ink font-mono">{formatIDR(stats.totalCommissionMonth)}</div>
          <div className="text-[10px] text-ds-ink3 mt-0.5">{t('this month', 'bulan ini')}</div>
          {coinBalance > 0 && (
            <div className="text-[10px] text-ds-amber font-bold mt-1">🪙 {coinBalance.toLocaleString('id-ID')} poin</div>
          )}
        </div>
      </div>

      {/* Renewal Alerts */}
      <RenewalAlerts agentId={agentId} lang={lang} onNavigate={onNavigate} />

      {/* Quick Actions */}
      <div className="px-5 mt-4">
        <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest mb-3">{t('Quick Actions', 'Aksi Cepat')}</p>
        <div className="grid grid-cols-4 gap-3">
          {[
            { tab: 'quotes',       label: t('Quote', 'Penawaran'),  icon: FileText,      color: 'text-ds-blue',   bg: 'bg-blue-50'       },
            { tab: 'clients',      label: t('Clients', 'Klien'),    icon: Users,         color: 'text-ds-green',  bg: 'bg-ds-green-tint' },
            { tab: 'claims',       label: t('Claims', 'Klaim'),     icon: ClipboardList, color: 'text-rose-500',  bg: 'bg-rose-50'       },
            { tab: 'policy',       label: t('Policy', 'Polis'),     icon: Shield,        color: 'text-ds-green',  bg: 'bg-ds-green-tint' },
            { tab: 'leaderboard',  label: t('Rank', 'Ranking'),     icon: Trophy,        color: 'text-ds-amber',  bg: 'bg-amber-50'      },
            { tab: 'network',      label: t('Network', 'Jaringan'), icon: Network,       color: 'text-ds-purple', bg: 'bg-ds-purple-lt'  },
            { tab: 'renewals',     label: t('Renewal', 'Renewal'),  icon: RefreshCw,     color: 'text-ds-blue',   bg: 'bg-blue-50'       },
            { tab: 'endorsements', label: t('Endorse', 'Endors'),   icon: FileEdit,      color: 'text-ds-ink2',   bg: 'bg-ds-card2'      },
          ].map((action) => (
            <div
              key={`${action.tab}-${action.label}`}
              onClick={() => onNavigate(action.tab)}
              className="flex flex-col items-center gap-2 cursor-pointer group active:scale-90 transition-transform"
            >
              <div className={`w-14 h-14 ${action.bg} ${action.color} rounded-2xl flex items-center justify-center shadow-ds-sm group-hover:scale-105 transition-transform duration-200`}>
                <action.icon size={22} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-bold text-ds-ink2 text-center leading-tight">{action.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Commissions */}
      <div className="px-5 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-ds-ink">{t('Recent Commissions', 'Komisi Terbaru')}</h3>
          <button onClick={() => onNavigate('commission')} className="text-xs font-bold text-ds-green">{t('All', 'Semua')}</button>
        </div>
        <div className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm overflow-hidden">
          {recentCommissions.length === 0 ? (
            <div className="p-5 text-center">
              <p className="text-sm text-ds-ink3">{t('No commissions yet', 'Belum ada komisi')}</p>
            </div>
          ) : (
            recentCommissions.slice(0, 3).map((c, i) => (
              <div
                key={c.id}
                className={`flex items-center gap-3 px-4 py-3 ${i < Math.min(recentCommissions.length, 3) - 1 ? 'border-b border-ds-border' : ''}`}
              >
                <div className="w-9 h-9 rounded-xl bg-ds-green-tint flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={16} className="text-ds-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ds-ink truncate">{productLabel[c.product_type] ?? c.product_type}</p>
                  <p className="text-[10px] text-ds-ink3">{new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-ds-green">+{formatIDR(c.amount)}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusColor[c.status] ?? 'bg-ds-card2 text-ds-ink2'}`}>{c.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* AI Tips */}
      <div className="px-5 mt-4 pb-4">
        <div className="rounded-2xl p-4 bg-ds-purple-lt border border-purple-100">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-ds-sm">
              <Lightbulb size={16} className="text-ds-purple" />
            </div>
            <div>
              <p className="text-[10px] font-black text-ds-purple uppercase tracking-wider mb-1">SurePath AI</p>
              <p className="text-sm text-ds-ink leading-relaxed">{tip}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AgentHome;
