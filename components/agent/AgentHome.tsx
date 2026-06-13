import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, Shield, ChevronRight,
  FileText, ClipboardList,
  Trophy, Network, RefreshCw, FileEdit, Target,
  Gem, Star, Coins,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Language } from '../../types';
import { formatIDR } from '../car-wizard/WizardUI';
import RenewalAlerts from './RenewalAlerts';
import { getAgentCoinBalance } from '../../services/supabaseService';
import { PathyMascot } from '../shared/cards';

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
  const reduce = useReducedMotion();

  useEffect(() => {
    if (agentId) {
      getAgentCoinBalance(agentId).then(setCoinBalance);
    }
  }, [agentId]);

  const monthlyTarget = agent?.monthly_target ?? 10000000;
  const progress = Math.min((stats.totalCommissionMonth / monthlyTarget) * 100, 100);
  const conversion = stats.clientsCount ? Math.round((stats.policiesCount / stats.clientsCount) * 100) : 0;

  // Subtle staggered entrance — collapses to static under reduced motion.
  const reveal = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] as const },
        };

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

  const quickActions = [
    { tab: 'quotes',       label: t('Quote', 'Penawaran'),  icon: FileText,      color: 'text-ds-blue',   bg: 'bg-blue-50'       },
    { tab: 'clients',      label: t('Clients', 'Klien'),    icon: Users,         color: 'text-ds-green',  bg: 'bg-ds-green-tint' },
    { tab: 'claims',       label: t('Claims', 'Klaim'),     icon: ClipboardList, color: 'text-rose-500',  bg: 'bg-rose-50'       },
    { tab: 'policy',       label: t('Policy', 'Polis'),     icon: Shield,        color: 'text-ds-green',  bg: 'bg-ds-green-tint' },
    { tab: 'leaderboard',  label: t('Rank', 'Ranking'),     icon: Trophy,        color: 'text-ds-amber',  bg: 'bg-amber-50'      },
    { tab: 'network',      label: t('Network', 'Jaringan'), icon: Network,       color: 'text-ds-purple', bg: 'bg-ds-purple-lt'  },
    { tab: 'renewals',     label: t('Renewal', 'Renewal'),  icon: RefreshCw,     color: 'text-ds-blue',   bg: 'bg-blue-50'       },
    { tab: 'endorsements', label: t('Endorse', 'Endors'),   icon: FileEdit,      color: 'text-ds-ink2',   bg: 'bg-ds-card2'      },
  ];

  return (
    <div className="bg-ds-bg min-h-screen pb-28">

      {/* Greeting */}
      <motion.div className="px-5 pt-12 pb-1" {...reveal(0)}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-ds-ink3 font-medium">{greeting()},</p>
            <h2 className="text-2xl font-black text-ds-ink tracking-tight">
              {agent?.name?.split(' ')[0] ?? 'Agen'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {agentTier && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                agentTier === 'ELITE'
                  ? 'bg-ds-purple-lt text-ds-purple'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {agentTier === 'ELITE' ? <Gem size={11} /> : <Star size={11} />}
                {agentTier === 'ELITE' ? t('Elite', 'Elite') : t('Top Agent', 'Agen Top')}
              </span>
            )}
            <div className="w-10 h-10 rounded-2xl bg-ds-green flex items-center justify-center text-white font-black text-sm shadow-ds-green">
              {(agent?.name ?? 'A')[0].toUpperCase()}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Commission Hero — the single focal point of the screen */}
      <motion.div className="px-5 pt-4" {...reveal(1)}>
        <div className="rounded-[1.75rem] p-6 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #003B2F 0%, #005240 60%, #003B2F 100%)', boxShadow: '0 12px 40px rgba(0,59,47,0.45)' }}>
          <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(0,193,106,0.18)' }} />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(0,193,106,0.07)' }} />

          <div className="relative z-10 flex items-center gap-5">
            <div className="flex-1 min-w-0">
              <p className="text-white/50 text-[9px] font-black uppercase tracking-[0.18em] mb-2">
                {t('Commission this month', 'Komisi Bulan Ini')}
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-white/40 text-base font-medium">Rp</span>
                <span className="text-4xl font-black text-white font-mono leading-none tracking-tight">
                  {stats.totalCommissionMonth >= 1000000
                    ? `${(stats.totalCommissionMonth / 1000000).toFixed(1)}jt`
                    : stats.totalCommissionMonth.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Progress ring toward monthly target */}
            <div className="flex-shrink-0 flex flex-col items-center gap-1">
              <div className="relative">
                <svg width="78" height="78" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="38" fill="none" stroke="#00C16A" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray="238.76" strokeDashoffset={238.76 * (1 - progress / 100)}
                    transform="rotate(-90 50 50)"
                    style={{ transition: reduce ? undefined : 'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-black text-white leading-none">{Math.round(progress)}%</span>
                </div>
              </div>
              <p className="text-[8px] text-white/40 font-bold uppercase tracking-wider">{t('of target', 'dr target')}</p>
            </div>
          </div>

          {/* Inline micro-stats — the only place coins/clients/policies live */}
          <div className="relative z-10 mt-5 pt-4 border-t border-white/10 flex">
            {[
              { label: t('Coins', 'Koin'), value: coinBalance.toLocaleString('id-ID') },
              { label: t('Clients', 'Klien'), value: String(stats.clientsCount) },
              { label: t('Policies', 'Polis'), value: String(stats.policiesCount) },
            ].map((s, i) => (
              <div key={s.label} className={`flex-1 ${i > 0 ? 'pl-4 border-l border-white/10' : ''}`}>
                <p className="text-white/40 text-[9px] font-medium uppercase tracking-wider mb-0.5">{s.label}</p>
                <p className="text-white text-base font-black font-mono">{s.value}</p>
              </div>
            ))}
          </div>

          <p className="relative z-10 mt-4 text-white/35 text-[10px] font-medium">
            {t('Target', 'Target')}: <span className="text-white/60 font-bold">{formatIDR(monthlyTarget)}</span>
          </p>
        </div>
      </motion.div>

      {/* Secondary performance — metrics NOT shown in the hero (no duplication) */}
      <motion.div className="px-5 mt-5" {...reveal(2)}>
        <div className="bg-ds-card rounded-[1.5rem] border border-ds-border shadow-ds-sm p-5 flex items-center">
          <div className="flex-1 pr-5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp size={13} className="text-ds-green" />
              <p className="text-[10px] text-ds-ink3 font-medium uppercase tracking-wider">{t('GWP / Month', 'GWP Bulan Ini')}</p>
            </div>
            <p className="text-xl font-black text-ds-ink font-mono leading-none">{formatIDR(stats.totalCommissionMonth * 8)}</p>
            <p className="text-[10px] text-ds-ink3 mt-1">{t('estimated', 'estimasi')}</p>
          </div>
          <div className="flex-1 pl-5 border-l border-ds-border">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Target size={13} className="text-ds-amber" />
              <p className="text-[10px] text-ds-ink3 font-medium uppercase tracking-wider">{t('Conversion', 'Konversi')}</p>
            </div>
            <p className="text-xl font-black text-ds-ink font-mono leading-none">{conversion}%</p>
            <p className="text-[10px] text-ds-ink3 mt-1">{t('clients to policies', 'klien → polis')}</p>
          </div>
        </div>
      </motion.div>

      {/* Sales Coach — calm card, deliberately quieter than the hero */}
      <motion.div className="px-5 mt-5" {...reveal(3)}>
        <div className="bg-ds-card rounded-[1.5rem] border border-ds-border shadow-ds-sm p-5">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-ds-green-tint flex items-center justify-center p-1 flex-shrink-0 animate-float">
              <PathyMascot size={30} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-ds-green mb-1.5">{t('AI Sales Coach · Pathy', 'Pelatih AI · Pathy')}</p>
              <p className="text-sm font-bold text-ds-ink leading-snug">{dailyTip}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 mt-4 pt-4 border-t border-ds-border">
            <div className="w-7 h-7 rounded-xl bg-ds-green-tint flex items-center justify-center flex-shrink-0">
              <Target size={13} className="text-ds-green" />
            </div>
            <div>
              <p className="text-[9px] text-ds-ink3 font-medium">{t('Daily Goal', 'Target Harian')}</p>
              <p className="text-xs font-black text-ds-ink">{t(`Contact ${dailyContactGoal} clients`, `Hubungi ${dailyContactGoal} klien`)}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Renewal Alerts */}
      <motion.div {...reveal(4)}>
        <RenewalAlerts agentId={agentId} lang={lang} onNavigate={onNavigate} />
      </motion.div>

      {/* Quick Actions */}
      <motion.div className="px-5 mt-7" {...reveal(5)}>
        <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest mb-4">{t('Quick Actions', 'Aksi Cepat')}</p>
        <div className="grid grid-cols-4 gap-y-5 gap-x-3">
          {quickActions.map((action) => (
            <button
              key={`${action.tab}-${action.label}`}
              onClick={() => onNavigate(action.tab)}
              className="flex flex-col items-center gap-2 cursor-pointer group active:scale-90 transition-transform"
            >
              <div className={`w-14 h-14 ${action.bg} ${action.color} rounded-2xl flex items-center justify-center shadow-ds-sm group-hover:scale-105 transition-transform duration-200`}>
                <action.icon size={22} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-bold text-ds-ink2 text-center leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Recent Commissions */}
      <motion.div className="px-5 mt-7" {...reveal(6)}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-ds-ink">{t('Recent Commissions', 'Komisi Terbaru')}</h3>
          <button onClick={() => onNavigate('commission')} className="text-xs font-bold text-ds-green">{t('View All', 'Semua')}</button>
        </div>
        <div className="bg-ds-card rounded-[1.5rem] border border-ds-border shadow-ds-sm overflow-hidden">
          {recentCommissions.length === 0 ? (
            <div className="p-8 flex flex-col items-center text-center gap-2">
              <div className="w-11 h-11 rounded-2xl bg-ds-green-tint flex items-center justify-center">
                <Coins size={20} className="text-ds-green" />
              </div>
              <p className="text-sm font-bold text-ds-ink">{t('No commissions yet', 'Belum ada komisi')}</p>
              <p className="text-xs text-ds-ink3 max-w-[14rem]">{t('Close your first policy to start earning.', 'Tutup polis pertamamu untuk mulai dapat komisi.')}</p>
            </div>
          ) : (
            recentCommissions.slice(0, 3).map((c, i) => (
              <div
                key={c.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${i < Math.min(recentCommissions.length, 3) - 1 ? 'border-b border-ds-border' : ''}`}
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
      </motion.div>

      {/* Leaderboard Teaser */}
      <motion.div className="px-5 mt-5 pb-4" {...reveal(7)}>
        <button
          onClick={() => onNavigate('leaderboard')}
          className="w-full rounded-[1.5rem] border border-ds-border bg-ds-card shadow-ds-sm p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
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
      </motion.div>

    </div>
  );
};

export default AgentHome;
