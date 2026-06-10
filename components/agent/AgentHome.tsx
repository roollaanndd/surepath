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
    PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
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
    <div className="bg-gray-50 min-h-screen pb-28">

      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
              {(agent?.name ?? 'A')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-gray-500">{greeting()}, </p>
              <h2 className="text-base font-semibold text-gray-900">{agent?.name?.split(' ')[0] ?? 'Agen'}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {agentTier && (
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                agentTier === 'ELITE'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {agentTier === 'ELITE' ? '💎 Elite' : '⭐ Bintang'}
              </span>
            )}
            <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold">
              {agent?.agent_code ?? 'SP-AGT'}
            </span>
          </div>
        </div>
      </div>

      {/* Commission Hero Card */}
      <div className="px-5 pt-4">
        <div className="rounded-2xl p-5 bg-gray-900 text-white sp-enter" style={{boxShadow: '0 8px 32px rgba(0,0,0,0.15)'}}>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-1">{t('Commission This Month', 'Komisi Bulan Ini')}</p>
          <div className="flex items-end gap-2">
            <span className="text-gray-400 text-sm font-medium">Rp</span>
            <span className="text-3xl font-bold font-mono text-white">{(stats.totalCommissionMonth / 1000000).toFixed(1)}jt</span>
            <span className="ml-1 mb-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">+18%</span>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex gap-5">
            <div>
              <p className="text-gray-500 text-xs">{t('Coins', 'Koin')}</p>
              <p className="text-white text-sm font-semibold">{coinBalance.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">{t('Clients', 'Klien')}</p>
              <p className="text-white text-sm font-semibold">{stats.clientsCount}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">{t('Policies', 'Polis')}</p>
              <p className="text-white text-sm font-semibold">{stats.totalPolicies}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards 2×2 */}
      <div className="px-5 mt-4 grid grid-cols-2 gap-3 sp-enter sp-enter-d1">
        {/* GWP This Month */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 active:scale-[0.98] transition-transform">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-[#16a34a]/20 rounded-xl flex items-center justify-center">
              <TrendingUp size={14} className="text-[#16a34a]" />
            </div>
            <span className="text-xs text-gray-500 font-medium">
              {t('GWP / Month', 'GWP Bulan Ini')}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 font-mono">
            {formatIDR(stats.totalCommissionMonth * 8)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{t('estimated', 'estimasi')}</div>
        </div>

        {/* Total Clients */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 active:scale-[0.98] transition-transform">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Users size={14} className="text-blue-500" />
            </div>
            <span className="text-xs text-gray-500 font-medium">
              {t('Clients', 'Klien')}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 font-mono">
            {stats.clientsCount}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{t('total', 'total')}</div>
        </div>

        {/* Active Policies */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 active:scale-[0.98] transition-transform">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Shield size={14} className="text-emerald-500" />
            </div>
            <span className="text-xs text-gray-500 font-medium">
              {t('Policies', 'Polis')}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 font-mono">
            {stats.policiesCount}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{t('active', 'aktif')}</div>
        </div>

        {/* Earned This Month */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 active:scale-[0.98] transition-transform">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-violet-500/20 rounded-xl flex items-center justify-center">
              <Wallet size={14} className="text-violet-500" />
            </div>
            <span className="text-xs text-gray-500 font-medium">
              {t('Earned', 'Komisi')}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 font-mono">
            {formatIDR(stats.totalCommissionMonth)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{t('this month', 'bulan ini')}</div>
          {coinBalance > 0 && (
            <div className="text-[10px] text-amber-500 font-bold mt-1">
              🪙 {coinBalance.toLocaleString('id-ID')} poin tersedia
            </div>
          )}
        </div>
      </div>

      {/* Monthly Target Progress */}
      <div className="px-5 mt-4 sp-enter sp-enter-d2">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-500 font-medium">
                {t('Monthly Target', 'Target Bulan Ini')}
              </p>
              <p className="font-bold text-lg text-gray-900">
                {formatIDR(stats.totalCommissionMonth)}
                <span className="text-gray-400 font-medium text-sm"> / {formatIDR(monthlyTarget)}</span>
              </p>
            </div>
            <span className={`text-lg font-bold ${progress >= 100 ? 'text-emerald-500' : 'text-[#16a34a]'}`}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 motion-reduce:transition-none"
              style={{
                width: `${progress}%`,
                background: progress >= 100
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, #16a34a, #4ade80)',
              }}
            />
          </div>
          {progress >= 100 && (
            <p className="text-emerald-500 text-xs font-semibold mt-2">
              {t('Target Achieved! Keep going!', 'Target Tercapai! Terus semangat!')}
            </p>
          )}
          {progress < 100 && (
            <p className="text-gray-400 text-xs font-medium mt-2">
              {formatIDR(monthlyTarget - stats.totalCommissionMonth)} {t('more to reach your target', 'lagi untuk capai target')}
            </p>
          )}
        </div>
      </div>

      {/* Renewal Alerts */}
      <RenewalAlerts agentId={agentId} lang={lang} onNavigate={onNavigate} />

      {/* Quick Action Buttons — 4-col grid, 2 rows */}
      <div className="px-5 mt-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            tab: 'quotes',
            label: t('New Quote', 'Penawaran'),
            icon: FileText,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
          },
          {
            tab: 'clients',
            label: t('Clients', 'Klien'),
            icon: Users,
            color: 'text-[#16a34a]',
            bg: 'bg-[#16a34a]/10',
          },
          {
            tab: 'claims',
            label: t('Claims', 'Klaim'),
            icon: ClipboardList,
            color: 'text-rose-500',
            bg: 'bg-rose-500/10',
          },
          {
            tab: 'policy',
            label: t('Policy', 'Polis'),
            icon: Shield,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
          },
          {
            tab: 'leaderboard',
            label: t('Ranking', 'Ranking'),
            icon: Trophy,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
          },
          {
            tab: 'network',
            label: t('Network', 'Jaringan'),
            icon: Network,
            color: 'text-violet-500',
            bg: 'bg-violet-500/10',
          },
          {
            tab: 'renewals',
            label: t('Renewal', 'Renewal'),
            icon: RefreshCw,
            color: 'text-cyan-500',
            bg: 'bg-cyan-500/10',
          },
          {
            tab: 'endorsements',
            label: t('Endorse', 'Endors'),
            icon: FileEdit,
            color: 'text-indigo-500',
            bg: 'bg-indigo-500/10',
          },
        ].map((action) => (
          <div
            key={`${action.tab}-${action.label}`}
            onClick={() => onNavigate(action.tab)}
            className="flex flex-col items-center gap-2.5 cursor-pointer group active:scale-90 transition-all"
          >
            <div className={`w-14 h-14 ${action.bg} ${action.color} rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300`}>
              <action.icon size={24} strokeWidth={2.5} />
            </div>
            <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-center leading-tight">
              {action.label}
            </span>
          </div>
        ))}
      </div>
      </div>

      {/* Recent Commissions */}
      <div className="px-5 mt-4 sp-enter sp-enter-d4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">{t('Recent Commissions', 'Komisi Terbaru')}</h3>
          <button onClick={() => onNavigate('commission')} className="text-xs font-medium text-emerald-600">{t('All', 'Semua')}</button>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {recentCommissions.length === 0 ? (
            <div className="p-5 text-center">
              <p className="text-sm text-gray-400">{t('No commissions yet', 'Belum ada komisi')}</p>
            </div>
          ) : (
            recentCommissions.slice(0, 3).map((c, i) => (
              <div key={c.id} className={`flex items-center gap-3 px-4 py-3 ${i < Math.min(recentCommissions.length, 3) - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={16} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{productLabel[c.product_type] ?? c.product_type}</p>
                  <p className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-600">+{formatIDR(c.amount)}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColor[c.status] ?? 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* AI Tips */}
      <div className="px-5 mt-4 sp-enter sp-enter-d3">
        <div className="rounded-2xl p-4 bg-gradient-to-br from-slate-900 to-blue-950 border border-blue-800/30">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Lightbulb size={16} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-300 mb-1">SurePath AI</p>
              <p className="text-sm text-gray-300 leading-relaxed">{tip}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AgentHome;
