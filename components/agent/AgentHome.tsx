import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, Shield, Wallet, ChevronRight,
  FileText, ClipboardList,
  Trophy, Network, RefreshCw, FileEdit, Target, Zap
} from 'lucide-react';
import { Language } from '../../types';
import { formatIDR } from '../car-wizard/WizardUI';
import RenewalAlerts from './RenewalAlerts';
import { getAgentCoinBalance } from '../../services/supabaseService';
import { PathyMascot, PipelineStat, SectionLabel } from '../shared/cards';

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

  const salesTips = [
    t('Clients who buy Travel insurance are 3× more likely to add a PA policy within 6 months.', 'Klien Travel 3× lebih mungkin tambah polis PA dalam 6 bulan. Follow up sekarang!'),
    t('Follow up with a prospect within 24 hours to increase conversion by 60%.', 'Follow-up dalam 24 jam tingkatkan konversi 60%. Hubungi 3 prospek hari ini.'),
    t('Referrals close 4× faster than cold leads. Ask every happy client for one.', 'Referral 4× lebih cepat closing. Minta referensi dari setiap klien puas hari ini.'),
    t('Cross-selling MPAR to car insurance clients adds avg Rp 90k commission per deal.', 'Cross-sell MPAR ke klien asuransi mobil = tambahan komisi Rp 90rb per deal!'),
  ];
  const dailyTip = salesTips[new Date().getDate() % salesTips.length];
  const dailyContactGoal = 3;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 11) return t('Good Morning', 'Selamat Pagi');
    if (h < 15) return t('Good Afternoon', 'Selamat Siang');
    if (h < 18) return t('Good Evening', 'Selamat Sore');
    return t('Good Night', 'Selamat Malam');
  };

  return (
    <div className="bg-ds-bg min-h-screen pb-28">

      {/* Inline header — greeting */}
      <div className="px-5 pt-12 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-ds-ink3 font-medium">{greeting()},</p>
            <h2 className="text-xl font-black text-ds-ink tracking-tight">
              {agent?.name?.split(' ')[0] ?? 'Agen'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {agentTier && (
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                agentTier === 'ELITE'
                  ? 'bg-ds-purple-lt text-ds-purple'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {agentTier === 'ELITE' ? '💎 Elite' : '⭐ Top Agent'}
              </span>
            )}
            <div className="w-10 h-10 rounded-2xl bg-ds-green flex items-center justify-center text-white font-black text-sm shadow-ds-green">
              {(agent?.name ?? 'A')[0].toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Commission Hero Card */}
      <div className="px-5 pt-3">
        <div className="rounded-3xl p-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #003B2F 0%, #005240 60%, #003B2F 100%)', boxShadow: '0 8px 32px rgba(0,59,47,0.5)' }}>
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full blur-2xl pointer-events-none" style={{ background: 'rgba(0,193,106,0.15)' }} />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(0,193,106,0.07)' }} />
          <div className="relative z-10 flex items-center gap-4">
            {/* Commission amount + stats */}
            <div className="flex-1">
              <p className="text-white/50 text-[9px] font-black uppercase tracking-widest mb-1.5">
                {t('My Commission', 'Komisi Saya')}
              </p>
              <div className="flex items-baseline gap-1.5 mb-3">
                <span className="text-white/40 text-sm font-medium">Rp</span>
                <span className="text-3xl font-black text-white font-mono leading-none">
                  {stats.totalCommissionMonth >= 1000000
                    ? `${(stats.totalCommissionMonth / 1000000).toFixed(1)}jt`
                    : stats.totalCommissionMonth.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex gap-4 pt-3 border-t border-white/10">
                <div>
                  <p className="text-white/35 text-[9px] font-medium">{t('Coins', 'Koin')}</p>
                  <p className="text-white text-sm font-black">{coinBalance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-white/35 text-[9px] font-medium">{t('Clients', 'Klien')}</p>
                  <p className="text-white text-sm font-black">{stats.clientsCount}</p>
                </div>
                <div>
                  <p className="text-white/35 text-[9px] font-medium">{t('Policies', 'Polis')}</p>
                  <p className="text-white text-sm font-black">{stats.policiesCount}</p>
                </div>
              </div>
            </div>
            {/* SVG Progress Ring */}
            <div className="flex-shrink-0 flex flex-col items-center gap-1">
              <div className="relative">
                <svg width="76" height="76" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8"/>
                  <circle
                    cx="50" cy="50" r="38"
                    fill="none"
                    stroke="#00C16A"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="238.76"
                    strokeDashoffset={238.76 * (1 - progress / 100)}
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-black text-white leading-none">{Math.round(progress)}%</span>
                </div>
              </div>
              <p className="text-[8px] text-white/35 font-bold text-center uppercase tracking-wider leading-tight">
                {t('of target', 'dr target')}
              </p>
            </div>
          </div>
          {/* Target label below */}
          <div className="relative z-10 mt-3 pt-3 border-t border-white/8">
            <p className="text-white/30 text-[9px] font-medium">
              {t('Target this month', 'Target bulan ini')}: <span className="text-white/60 font-bold">{formatIDR(monthlyTarget)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Sales Coach Card */}
      <div className="px-5 mt-3">
        <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #00C16A, #009E52)' }}>
          <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center p-1 animate-float">
                <PathyMascot size={26} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/80">{t('AI Sales Coach · Pathy', 'Pelatih AI · Pathy')}</p>
            </div>
            <p className="text-sm font-bold text-white leading-snug mb-3">{dailyTip}</p>
            <div className="flex items-center gap-4 pt-3 border-t border-white/20">
              <div className="flex items-center gap-1.5">
                <Target size={12} className="text-white/70" />
                <div>
                  <p className="text-[9px] text-white/60 font-medium">{t('Daily Goal', 'Target Harian')}</p>
                  <p className="text-xs font-black text-white">{t(`Contact ${dailyContactGoal} clients`, `Hubungi ${dailyContactGoal} klien`)}</p>
                </div>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div>
                <p className="text-[9px] text-white/60 font-medium">{t('Monthly Target', 'Target Bulan')}</p>
                <p className="text-xs font-black text-white">{formatIDR(monthlyTarget)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Pipeline */}
      <div className="px-5 mt-3">
        <SectionLabel>{t('Sales Pipeline', 'Pipeline Penjualan')}</SectionLabel>
        <div className="bg-ds-card rounded-2xl border border-ds-border shadow-ds-sm p-4 flex items-center divide-x divide-ds-border">
          <PipelineStat label={t('Clients', 'Klien')} value={stats.clientsCount} accent="#4D7CFE" />
          <PipelineStat label={t('Policies', 'Polis')} value={stats.policiesCount} accent="#00C16A" />
          <PipelineStat label={t('Conversion', 'Konversi')} value={`${stats.clientsCount ? Math.round((stats.policiesCount / stats.clientsCount) * 100) : 0}%`} accent="#F5B942" />
        </div>
      </div>

      {/* Stat Cards 2×2 */}
      <div className="px-5 mt-3 grid grid-cols-2 gap-3">
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
          <div className="text-[10px] text-ds-ink3 mt-0.5">{t('total active', 'total aktif')}</div>
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
            <span className="text-[10px] text-ds-ink3 font-medium">{t('Commission', 'Komisi')}</span>
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
          <button onClick={() => onNavigate('commission')} className="text-xs font-bold text-ds-green">{t('View All', 'Semua')}</button>
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

      {/* Leaderboard Teaser */}
      <div className="px-5 mt-4 pb-4">
        <button
          onClick={() => onNavigate('leaderboard')}
          className="w-full rounded-2xl border border-ds-border bg-ds-card shadow-ds-sm p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <Trophy size={20} className="text-ds-amber" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-black text-ds-ink">{t('Agent Leaderboard', 'Papan Peringkat')}</p>
            <p className="text-xs text-ds-ink3">{t('See your ranking this month', 'Lihat ranking agen bulan ini')}</p>
          </div>
          <ChevronRight size={16} className="text-ds-ink3 flex-shrink-0" />
        </button>
      </div>

    </div>
  );
};

export default AgentHome;
