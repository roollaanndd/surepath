import React, { useState, useEffect } from 'react';
import { Trophy, RefreshCw, TrendingUp, Target } from 'lucide-react';
import { Language } from '../../types';
import { getLeaderboard, getAgentCommissions, type SpCommission } from '../../services/supabaseService';

const formatIDR = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

interface Props {
  agentId: string;
  agentName: string;
  lang: Language;
}

interface LeaderEntry {
  agent_id: string;
  agent_name: string;
  agent_code: string;
  total_commission: number;
}

function getTier(amount: number): { label: string; labelId: string; color: string; bg: string } {
  if (amount >= 30_000_000) return { label: 'PLATINUM', labelId: 'PLATINUM', color: 'text-purple-500', bg: 'bg-purple-500/10' };
  if (amount >= 15_000_000) return { label: 'GOLD', labelId: 'GOLD', color: 'text-amber-500', bg: 'bg-amber-500/10' };
  if (amount >= 5_000_000) return { label: 'SILVER', labelId: 'SILVER', color: 'text-slate-400', bg: 'bg-slate-400/10' };
  return { label: 'BRONZE', labelId: 'BRONZE', color: 'text-orange-700', bg: 'bg-orange-700/10' };
}

function CircularProgress({ value, size = 120 }: { value: number; size?: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200 dark:text-white/10" />
      <circle
        cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        className="text-primary-500 transition-all duration-700"
      />
      <text x="50" y="54" textAnchor="middle" className="fill-slate-900 dark:fill-white" fontSize="18" fontWeight="900">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

const AgentLeaderboard: React.FC<Props> = ({ agentId, agentName, lang }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [board, setBoard] = useState<LeaderEntry[]>([]);
  const [myCommissions, setMyCommissions] = useState<SpCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const MONTHLY_TARGET = 50_000_000;

  const loadData = async () => {
    setLoading(true);
    const [lb, comms] = await Promise.all([
      getLeaderboard(),
      getAgentCommissions(agentId),
    ]);
    setBoard(lb);
    setMyCommissions(comms);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [agentId]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const monthlyEarned = myCommissions
    .filter(c => c.status === 'PAID' && (c.created_at ?? '') >= startOfMonth)
    .reduce((s, c) => s + c.commission_amount, 0);

  const myRank = board.findIndex(e => e.agent_id === agentId) + 1;
  const tier = getTier(monthlyEarned);
  const progress = (monthlyEarned / MONTHLY_TARGET) * 100;

  const MOTIVATION: Record<string, { en: string; id: string }> = {
    PLATINUM: { en: '🔥 Legendary! You are dominating the board!', id: '🔥 Luar biasa! Kamu mendominasi papan peringkat!' },
    GOLD: { en: '⭐ Gold status! Keep pushing to Platinum!', id: '⭐ Status Gold! Terus kejar Platinum!' },
    SILVER: { en: '💪 You\'re rising! Push to Gold tier!', id: '💪 Terus naik! Kejar Gold tier!' },
    BRONZE: { en: '🚀 Every sale counts. Keep going!', id: '🚀 Setiap penjualan penting. Terus semangat!' },
  };
  const motive = MOTIVATION[tier.label] || MOTIVATION.BRONZE;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin" />
        <p className="text-slate-400 text-sm font-bold">{t('Loading rankings…', 'Memuat peringkat…')}</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 space-y-5 pb-8">

      {/* Target progress */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-white/5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('Monthly Target', 'Target Bulanan')}</div>
            <div className="font-black text-xl tracking-tighter mt-0.5">{formatIDR(MONTHLY_TARGET)}</div>
          </div>
          <div className={`px-3 py-1.5 rounded-full ${tier.bg} ${tier.color} text-xs font-black uppercase tracking-widest`}>
            {tier.label}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <CircularProgress value={progress} size={100} />
          <div className="flex-1">
            <div className="text-2xl font-black text-primary-500 tracking-tighter">{formatIDR(monthlyEarned)}</div>
            <div className="text-xs text-slate-400 font-bold mt-1">{t('earned this month', 'komisi bulan ini')}</div>
            <div className="text-xs text-slate-500 mt-3 leading-relaxed">{lang === Language.EN ? motive.en : motive.id}</div>
          </div>
        </div>

        {progress < 100 && (
          <div className="mt-4 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Target size={12} className="text-primary-500" />
              {t('Need', 'Butuh')} <span className="text-slate-800 dark:text-white">{formatIDR(MONTHLY_TARGET - monthlyEarned)}</span> {t('more to hit target', 'lagi untuk capai target')}
            </div>
          </div>
        )}
      </div>

      {/* My rank card */}
      {myRank > 0 && (
        <div className="bg-primary-500 rounded-3xl p-5 text-white shadow-lg shadow-orange-500/20">
          <div className="text-xs font-black uppercase tracking-widest opacity-75 mb-1">{t('Your Current Rank', 'Peringkat Kamu')}</div>
          <div className="flex items-center gap-3">
            <div className="text-5xl font-black leading-none">#{myRank}</div>
            <div>
              <div className="font-bold text-sm opacity-90">{agentName}</div>
              <div className="text-xs opacity-70 flex items-center gap-1 mt-0.5">
                <TrendingUp size={11} /> {t('of', 'dari')} {board.length} {t('agents this month', 'agen bulan ini')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-base tracking-tighter flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" /> {t('Top Agents', 'Agen Terbaik')}
          </h3>
          <button onClick={loadData} className="p-2 rounded-xl bg-slate-100 dark:bg-white/10">
            <RefreshCw size={13} className="text-slate-500" />
          </button>
        </div>

        {board.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">{t('No data yet for this month.', 'Belum ada data bulan ini.')}</div>
        ) : (
          <div className="space-y-2">
            {board.map((entry, i) => {
              const isMe = entry.agent_id === agentId;
              const rankColors = ['text-amber-500', 'text-slate-400', 'text-orange-700'];
              return (
                <div
                  key={entry.agent_id}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${isMe ? 'border-primary-500/30 bg-primary-500/5' : 'border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900'}`}
                >
                  <div className={`w-8 text-center font-black text-lg ${rankColors[i] || 'text-slate-400'}`}>
                    {i < 3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center font-black text-blue-600 text-sm flex-shrink-0">
                    {entry.agent_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-black text-sm truncate ${isMe ? 'text-primary-500' : ''}`}>
                      {entry.agent_name} {isMe && <span className="text-[10px]">(You)</span>}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{entry.agent_code}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-sm text-emerald-500">{formatIDR(entry.total_commission)}</div>
                    <div className="text-[10px] text-slate-400">{t('commission', 'komisi')}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentLeaderboard;
