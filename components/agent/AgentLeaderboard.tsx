import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, RefreshCw, TrendingUp, Star, Crown } from 'lucide-react';
import { Language } from '../../types';
import { getLeaderboard, getAgentStats, type AgentStats } from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';

interface Props {
  agentId: string;
  agentName: string;
  lang: Language;
}

type Tier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

interface LeaderEntry {
  agent_id: string;
  agent_name: string;
  agent_code: string;
  total_commission: number;
}

const getTier = (commission: number): Tier => {
  if (commission >= 30000000) return 'PLATINUM';
  if (commission >= 15000000) return 'GOLD';
  if (commission >= 5000000) return 'SILVER';
  return 'BRONZE';
};

const tierConfig: Record<Tier, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  emoji: string;
  svgColor: string;
}> = {
  BRONZE: {
    label: 'Bronze',
    color: 'text-amber-700 dark:text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-500/20',
    borderColor: 'border-amber-200 dark:border-amber-500/30',
    emoji: '🥉',
    svgColor: '#b45309',
  },
  SILVER: {
    label: 'Silver',
    color: 'text-slate-500 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-white/10',
    borderColor: 'border-slate-200 dark:border-white/20',
    emoji: '🥈',
    svgColor: '#94a3b8',
  },
  GOLD: {
    label: 'Gold',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-500/20',
    borderColor: 'border-yellow-200 dark:border-yellow-500/30',
    emoji: '🥇',
    svgColor: '#ca8a04',
  },
  PLATINUM: {
    label: 'Platinum',
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-500/20',
    borderColor: 'border-violet-200 dark:border-violet-500/30',
    emoji: '💎',
    svgColor: '#7c3aed',
  },
};

const tierMotivation = (tier: Tier, lang: Language): string => {
  const en: Record<Tier, string> = {
    BRONZE: 'Every top agent started here. Keep pushing — Silver is within reach!',
    SILVER: "You're on fire! A few more deals and you hit Gold tier!",
    GOLD: 'Outstanding performance! Only the elite reach Platinum — you\'re almost there!',
    PLATINUM: 'LEGENDARY! You\'re among the top performers in the entire network!',
  };
  const id: Record<Tier, string> = {
    BRONZE: 'Setiap agen top mulai dari sini. Terus semangat — Silver sudah dekat!',
    SILVER: 'Kamu lagi hot! Beberapa deal lagi dan kamu masuk Gold!',
    GOLD: 'Performa luar biasa! Hanya yang terbaik yang mencapai Platinum — kamu hampir sampai!',
    PLATINUM: 'LUAR BIASA! Kamu termasuk top performer di seluruh jaringan!',
  };
  return lang === Language.EN ? en[tier] : id[tier];
};

// Circular SVG Progress
const CircularProgress: React.FC<{ value: number; size?: number; color?: string }> = ({
  value, size = 110, color = '#f97316',
}) => {
  const strokeWidth = 10;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(value, 0), 100) / 100;
  const offset = circ * (1 - pct);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor"
        strokeWidth={strokeWidth} className="text-slate-100 dark:text-white/10" />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  );
};

const avatarColors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-pink-500', 'bg-indigo-500'];
const avatarColor = (name: string) => avatarColors[(name.charCodeAt(0) ?? 0) % avatarColors.length];
const initials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const rankMedal: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const AgentLeaderboard: React.FC<Props> = ({ agentId, lang }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);

  const MONTHLY_TARGET = 10000000;

  const loadData = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);
    try {
      const [lb, st] = await Promise.all([
        getLeaderboard(),
        getAgentStats(agentId),
      ]);
      setLeaderboard(lb);
      setStats(st);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => { loadData(); }, [loadData]);

  const myCommission = stats?.totalCommissionMonth ?? 0;
  const myTier = getTier(myCommission);
  const tierCfg = tierConfig[myTier];
  const progress = Math.min((myCommission / MONTHLY_TARGET) * 100, 100);

  const myEntry = leaderboard.find(e => e.agent_id === agentId);
  const myRank = myEntry ? leaderboard.indexOf(myEntry) + 1 : null;

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5 pb-32">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-black tracking-tight text-2xl">{t('Leaderboard', 'Papan Peringkat')}</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t('This Month', 'Bulan Ini')}</p>
        </div>
        <button
          onClick={loadData}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin text-primary-500' : 'text-slate-500'} />
        </button>
      </div>

      {/* Monthly Target Card with circular progress */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl p-5">
        <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-4">
          {t('My Monthly Target', 'Target Bulanan Saya')}
        </p>
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <CircularProgress value={progress} size={110} color={tierCfg.svgColor} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-black text-xl leading-none">{Math.round(progress)}%</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                {t('done', 'tercapai')}
              </span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('Earned', 'Komisi Bulan Ini')}</p>
              <p className="font-black text-xl tracking-tight">{formatIDR(myCommission)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('Target', 'Target')}</p>
              <p className="font-bold text-sm text-slate-500">{formatIDR(MONTHLY_TARGET)}</p>
            </div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${tierCfg.bgColor} border ${tierCfg.borderColor}`}>
              <span className="text-sm">{tierCfg.emoji}</span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${tierCfg.color}`}>
                {tierCfg.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* My Rank Card */}
      <div className={`rounded-[2rem] border p-5 shadow-lg ${tierCfg.bgColor} ${tierCfg.borderColor}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={`text-[10px] font-black uppercase tracking-widest ${tierCfg.color} mb-1`}>
              {t('My Rank', 'Peringkat Saya')}
            </p>
            {myRank ? (
              <div className="flex items-baseline gap-2">
                <span className={`font-black text-5xl tracking-tighter ${tierCfg.color}`}>#{myRank}</span>
                <span className={`text-sm font-bold opacity-60 ${tierCfg.color}`}>/ {leaderboard.length}</span>
              </div>
            ) : (
              <p className={`font-black text-2xl tracking-tight ${tierCfg.color}`}>
                {loading ? '…' : t('Not ranked yet', 'Belum ada peringkat')}
              </p>
            )}
            <p className={`text-sm font-medium mt-2 leading-relaxed max-w-[220px] ${tierCfg.color} opacity-80`}>
              {tierMotivation(myTier, lang)}
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/40 dark:bg-white/10 flex items-center justify-center flex-shrink-0">
            {myTier === 'PLATINUM'
              ? <Crown size={28} className={tierCfg.color} />
              : <Trophy size={28} className={tierCfg.color} />
            }
          </div>
        </div>
      </div>

      {/* Tier legend */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-lg p-5">
        <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-3">
          {t('Tier Requirements', 'Syarat Tier')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {([
            ['BRONZE', '< Rp 5M'],
            ['SILVER', 'Rp 5M – 15M'],
            ['GOLD', 'Rp 15M – 30M'],
            ['PLATINUM', '> Rp 30M'],
          ] as [Tier, string][]).map(([tier, range]) => {
            const cfg = tierConfig[tier];
            const active = myTier === tier;
            return (
              <div
                key={tier}
                className={`rounded-xl px-3 py-2 border transition-all ${cfg.bgColor} ${cfg.borderColor} ${active ? 'ring-2 ring-offset-1' : ''}`}
                style={active ? { ringColor: cfg.svgColor } : {}}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{cfg.emoji}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
                  {active && <Star size={10} className={`${cfg.color} ml-auto`} fill="currentColor" />}
                </div>
                <p className={`text-[10px] font-bold mt-0.5 opacity-70 ${cfg.color}`}>{range}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top 10 Leaderboard List */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">
            {t('Top Agents', 'Agen Terbaik')}
          </p>
          <div className="flex items-center gap-1 text-primary-500">
            <TrendingUp size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {t('This Month', 'Bulan Ini')}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="px-5 pb-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-slate-50 dark:bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="px-5 pb-8 text-center">
            <Trophy size={36} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="font-black text-slate-400">{t('No data yet', 'Belum ada data')}</p>
            <p className="text-slate-300 dark:text-slate-600 text-sm mt-1">
              {t(
                'Convert quotes to policies to appear on the leaderboard.',
                'Konversikan kuotasi ke polis untuk muncul di papan peringkat.',
              )}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-white/5">
            {leaderboard.map((entry, idx) => {
              const rank = idx + 1;
              const isMe = entry.agent_id === agentId;
              const entryTier = getTier(entry.total_commission);
              const entryCfg = tierConfig[entryTier];
              const medal = rankMedal[rank];

              return (
                <div
                  key={entry.agent_id}
                  className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${
                    isMe ? 'bg-primary-500/5 dark:bg-primary-500/10' : ''
                  }`}
                >
                  {/* Rank badge */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-black ${
                    rank <= 3
                      ? 'bg-transparent'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                  }`}>
                    {medal ?? rank}
                  </div>

                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-xl ${avatarColor(entry.agent_name)} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white font-black text-xs">{initials(entry.agent_name)}</span>
                  </div>

                  {/* Name & code */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-sm truncate ${isMe ? 'text-primary-500' : ''}`}>
                      {entry.agent_name}
                      {isMe && (
                        <span className="ml-1 text-[10px] font-bold opacity-70">
                          {t('(You)', '(Kamu)')}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {entry.agent_code && (
                        <span className="text-[9px] font-bold text-slate-400">{entry.agent_code}</span>
                      )}
                      <span className={`text-[9px] ${entryCfg.color}`}>{entryCfg.emoji}</span>
                    </div>
                  </div>

                  {/* Commission */}
                  <div className="text-right flex-shrink-0">
                    <p className={`font-black text-sm ${isMe ? 'text-primary-500' : 'text-emerald-500'}`}>
                      {formatIDR(entry.total_commission)}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold">{t('commission', 'komisi')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="h-4" />
    </div>
  );
};

export default AgentLeaderboard;
