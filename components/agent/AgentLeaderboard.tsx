import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, RefreshCw, TrendingUp, Star, Crown } from 'lucide-react';
import { Language } from '../../types';
import { getLeaderboard, getAgentStats, type AgentStats } from '../../services/supabaseService';
import { formatIDR } from '../car-wizard/WizardUI';
import { AgentArtKeyframes, AgentHero, SpotTrophy, AgentEmpty } from './AgentArt';
import { useTierDefinitions, getTierByCode } from '../../hooks/useTierDefinitions';
import type { SpAgentTier } from '../../services/dbTypes';

interface Props {
  agentId: string;
  agentName: string;
  lang: Language;
  agentTier?: string | null;
}

interface LeaderEntry {
  agent_id: string;
  agent_name: string;
  agent_code: string;
  tier: string | null;
  total_commission: number;
}

// Tint helpers — tiers only carry a single brand hex color now, so
// backgrounds/borders are derived with alpha suffixes instead of fixed
// Tailwind classes (which assumed a fixed set of tier names).
const tint = (hex: string, alpha: string) => `${hex}${alpha}`;

const thresholdLabel = (tier: SpAgentTier, lang: Language): string => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const parts: string[] = [];
  if (tier.min_premium_amount) parts.push(`≥ ${formatIDR(tier.min_premium_amount)}`);
  if (tier.min_policies_count) parts.push(`≥ ${tier.min_policies_count} ${t('policies', 'polis')}`);
  return parts.length > 0 ? parts.join(' · ') : t('Starting tier', 'Tier awal');
};

const initials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const rankMedal: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

// Circular SVG Progress
const CircularProgress: React.FC<{ value: number; size?: number; color?: string }> = ({
  value, size = 110, color = '#00C896',
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
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E2E8F0"
        strokeWidth={strokeWidth} />
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

const AgentLeaderboard: React.FC<Props> = ({ agentId, lang, agentTier }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { tiers } = useTierDefinitions();

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
  const myTier = getTierByCode(tiers, agentTier) ?? tiers.find(t2 => t2.is_default) ?? tiers[0] ?? null;
  const nextTier = myTier ? tiers.find(t2 => t2.rank === myTier.rank + 1) ?? null : null;
  const progress = Math.min((myCommission / MONTHLY_TARGET) * 100, 100);

  const myEntry = leaderboard.find(e => e.agent_id === agentId);
  const myRank = myEntry ? leaderboard.indexOf(myEntry) + 1 : null;

  const color = myTier?.color ?? '#6b7280';

  return (
    <div className="bg-ds-bg min-h-screen pb-28">

      {/* Page header — hero banner */}
      <div className="px-5 pt-5">
        <AgentArtKeyframes />
        <AgentHero
          title={t('Leaderboard', 'Papan Peringkat')}
          subtitle={t('Top performing partners this month.', 'Mitra dengan performa terbaik bulan ini.')}
          art={<SpotTrophy size={76} />}
        >
          <button
            onClick={loadData}
            className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 border border-white/15 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 motion-reduce:active:scale-100 transition-transform"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin motion-reduce:animate-none' : ''} />
            {t('Refresh', 'Perbarui')}
          </button>
        </AgentHero>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-4">

        {/* Monthly Target Card with circular progress */}
        <div className="sp-glass rounded-[2rem] p-5">
          <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest mb-4">
            {t('My Monthly Target', 'Target Bulanan Saya')}
          </p>
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <CircularProgress value={progress} size={110} color={color} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="font-black text-xl leading-none text-ds-ink">{Math.round(progress)}%</span>
                <span className="text-[9px] text-ds-ink3 font-bold uppercase tracking-widest mt-0.5">
                  {t('done', 'tercapai')}
                </span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-[10px] text-ds-ink3 font-bold uppercase tracking-widest">{t('Earned', 'Komisi Bulan Ini')}</p>
                <p className="font-black text-xl tracking-tight text-ds-ink">{formatIDR(myCommission)}</p>
              </div>
              <div>
                <p className="text-[10px] text-ds-ink3 font-bold uppercase tracking-widest">{t('Target', 'Target')}</p>
                <p className="font-bold text-sm text-ds-ink2">{formatIDR(MONTHLY_TARGET)}</p>
              </div>
              {myTier && (
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border"
                  style={{ background: tint(color, '14'), borderColor: tint(color, '33') }}
                >
                  {myTier.emoji && <span className="text-sm">{myTier.emoji}</span>}
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>
                    {myTier.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* My Rank Card */}
        <div className="rounded-[2rem] border p-5 shadow-ds-sm" style={{ background: tint(color, '0d'), borderColor: tint(color, '33') }}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color }}>
                {t('My Rank', 'Peringkat Saya')}
              </p>
              {myRank ? (
                <div className="flex items-baseline gap-2">
                  <span className="font-black text-5xl tracking-tighter" style={{ color }}>#{myRank}</span>
                  <span className="text-sm font-bold opacity-60" style={{ color }}>/ {leaderboard.length}</span>
                </div>
              ) : (
                <p className="font-black text-2xl tracking-tight" style={{ color }}>
                  {loading ? '…' : t('Not ranked yet', 'Belum ada peringkat')}
                </p>
              )}
              <p className="text-sm font-medium mt-2 leading-relaxed max-w-[220px] opacity-80" style={{ color }}>
                {nextTier
                  ? t(
                      `Keep going — reach ${nextTier.name} for even better benefits!`,
                      `Terus semangat — capai ${nextTier.name} untuk benefit lebih baik!`,
                    )
                  : t('You\'ve reached the top tier — amazing work!', 'Kamu sudah di tier tertinggi — kerja luar biasa!')}
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/40 flex items-center justify-center flex-shrink-0">
              {!nextTier
                ? <Crown size={28} style={{ color }} />
                : <Trophy size={28} style={{ color }} />
              }
            </div>
          </div>
        </div>

        {/* Tier legend — dynamic, admin-configured */}
        {tiers.length > 0 && (
          <div className="sp-glass rounded-[2rem] p-5">
            <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest mb-3">
              {t('Tier Requirements', 'Syarat Tier')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {tiers.map(tierDef => {
                const active = myTier?.code === tierDef.code;
                return (
                  <div
                    key={tierDef.code}
                    className={`rounded-xl px-3 py-2 border transition-all ${active ? 'ring-2 ring-offset-1' : ''}`}
                    style={{
                      background: tint(tierDef.color, '0d'),
                      borderColor: tint(tierDef.color, '33'),
                      ...(active ? ({ '--tw-ring-color': tierDef.color } as React.CSSProperties) : {}),
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      {tierDef.emoji && <span className="text-sm">{tierDef.emoji}</span>}
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: tierDef.color }}>{tierDef.name}</span>
                      {active && <Star size={10} style={{ color: tierDef.color }} className="ml-auto" fill="currentColor" />}
                    </div>
                    <p className="text-[10px] font-bold mt-0.5 opacity-70" style={{ color: tierDef.color }}>{thresholdLabel(tierDef, lang)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Top Agents Leaderboard List */}
        <div className="sp-glass rounded-[2rem] overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest">
              {t('Top Partners', 'Mitra Terbaik')}
            </p>
            <div className="flex items-center gap-1 text-ds-green">
              <TrendingUp size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {t('This Month', 'Bulan Ini')}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="px-5 pb-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-ds-card2 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <AgentEmpty
              title={t('No data yet', 'Belum ada data')}
              desc={t(
                'Convert quotes to policies to appear on the leaderboard.',
                'Konversikan penawaran ke polis untuk muncul di papan peringkat.',
              )}
            />
          ) : (
            <div className="divide-y divide-ds-border">
              {leaderboard.map((entry, idx) => {
                const rank = idx + 1;
                const isMe = entry.agent_id === agentId;
                const entryTier = getTierByCode(tiers, entry.tier);
                const medal = rankMedal[rank];

                return (
                  <div
                    key={entry.agent_id}
                    className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                      isMe ? 'bg-ds-green-tint' : rank === 1 ? 'bg-ds-navy' : 'bg-ds-card'
                    }`}
                  >
                    {/* Rank badge */}
                    <div className={`w-6 text-center text-xs font-bold ${rank === 1 ? 'text-ds-green' : 'text-ds-ink3'}`}>
                      {medal ?? rank}
                    </div>

                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      rank === 1 ? 'bg-ds-green text-white' : 'bg-ds-green-tint text-ds-green'
                    }`}>
                      {initials(entry.agent_name)}
                    </div>

                    {/* Name & code */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${
                        rank === 1 ? 'text-white' : isMe ? 'text-ds-green' : 'text-ds-ink'
                      }`}>
                        {entry.agent_name}
                        {isMe && (
                          <span className="ml-1 text-[10px] font-bold opacity-70">
                            {t('(You)', '(Kamu)')}
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {entry.agent_code && (
                          <span className={`text-[9px] font-bold ${rank === 1 ? 'text-white/50' : 'text-ds-ink3'}`}>{entry.agent_code}</span>
                        )}
                        {entryTier?.emoji && <span className="text-[9px]">{entryTier.emoji}</span>}
                      </div>
                    </div>

                    {/* Commission */}
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold font-mono ${rank === 1 ? 'text-ds-green' : 'text-ds-green'}`}>
                        {formatIDR(entry.total_commission)}
                      </p>
                      <p className={`text-[9px] font-bold ${rank === 1 ? 'text-white/50' : 'text-ds-ink3'}`}>{t('commission', 'komisi')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
};

export default AgentLeaderboard;
