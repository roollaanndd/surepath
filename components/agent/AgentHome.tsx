import React, { useState, useEffect } from 'react';
import {
  TrendingUp, ChevronRight, Target, Star, Coins,
  FilePlus2, UsersRound, ShieldAlert, FileCheck2
} from 'lucide-react';
import PromoBanner from '../PromoBanner';
import { motion, useReducedMotion } from 'motion/react';
import { Language } from '../../types';
import ManagedPortalIcon from '../shared/ManagedPortalIcon';
import { formatIDR } from '../car-wizard/WizardUI';
import RenewalAlerts from './RenewalAlerts';
import { getAgentOrders } from '../../services/supabaseService';
import { PathyMascot } from '../shared/cards';
import { ClayCard } from '../ui';
import { AgentArtKeyframes, SpotTrophy } from './AgentArt';
import { useTierDefinitions, getTierByCode } from '../../hooks/useTierDefinitions';

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
  const [activeQuotesCount, setActiveQuotesCount] = useState(0);
  const [savedDraftProduct, setSavedDraftProduct] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const { tiers } = useTierDefinitions();
  const myTierDef = getTierByCode(tiers, agentTier);

  useEffect(() => {
    if (!agentId) return;
    getAgentOrders(agentId)
      .then(orders => setActiveQuotesCount(orders.filter(order =>
        ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(order.status)
      ).length))
      .catch(error => console.error('Unable to load active agent quotes:', error));

    try {
      const raw = window.sessionStorage.getItem('surepath:agent-quote-draft:' + agentId);
      const draft = raw ? JSON.parse(raw) : null;
      setSavedDraftProduct(draft?.product ?? null);
    } catch {
      setSavedDraftProduct(null);
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

  // Custom hand-drawn duotone icons (AgentIcons) — Stitch design system tiles
  const quickActions = [
    { tab: 'quotes',  label: t('New quote', 'Penawaran'), Ic: FilePlus2, color: 'text-ds-green', tint: 'rgba(0,193,106,0.14)' },
    { tab: 'clients', label: t('Clients', 'Klien'),       Ic: UsersRound, color: 'text-ds-green', tint: 'rgba(0,193,106,0.14)' },
    { tab: 'claims',  label: t('Claims', 'Klaim'),        Ic: ShieldAlert, color: 'text-ds-green', tint: 'rgba(0,193,106,0.14)' },
    { tab: 'policy',  label: t('Policies', 'Polis'),      Ic: FileCheck2, color: 'text-ds-green', tint: 'rgba(0,193,106,0.14)' },
  ];

  return (
    <div className="bg-ds-bg min-h-screen pb-28">
      <PromoBanner />

      {savedDraftProduct && (
        <div className="mx-5 mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3" role="status">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-700 shrink-0"><FilePlus2 size={18} /></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-emerald-950">{t('Continue your saved quote', 'Lanjutkan draf penawaran')}</p>
            <p className="text-xs text-emerald-800 mt-0.5">{t('Your progress is saved for this session.', 'Progres tersimpan untuk sesi ini.')}</p>
          </div>
          <button type="button" onClick={() => onNavigate('quotes')} className="min-h-10 rounded-xl bg-emerald-700 px-3 text-xs font-bold text-white">{t('Resume', 'Lanjutkan')}</button>
        </div>
      )}

      {/* Greeting */}
      <motion.div className="px-5 pt-10 pb-2 sm:pt-12" {...reveal(0)}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ds-ink3 font-medium">{greeting()},</p>
            <h2 className="text-[26px] leading-tight font-black text-ds-ink tracking-tight">
              {agent?.name?.split(' ')[0] ?? 'Mitra'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {myTierDef && !myTierDef.is_default && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                style={{ background: `${myTierDef.color}22`, color: myTierDef.color }}
              >
                {myTierDef.emoji ? <span>{myTierDef.emoji}</span> : <Star size={11} />}
                {myTierDef.name}
              </span>
            )}
            <div className="w-10 h-10 rounded-2xl bg-ds-green flex items-center justify-center text-white font-black text-sm shadow-ds-green">
              {(agent?.name ?? 'A')[0].toUpperCase()}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Commission Hero — premium bank-card look, the focal point of the screen */}
      <motion.div className="px-5 pt-3 sm:pt-4" {...reveal(1)}>
        <AgentArtKeyframes />
        <div className="rounded-[1.75rem] p-6 text-white relative overflow-hidden" style={{ background: 'linear-gradient(120deg, #0B1120 0%, #0E3B2E 52%, #0B5E3B 100%)', boxShadow: '0 16px 44px -12px rgba(11,17,32,0.55)' }}>
          {/* glow + fine card pattern */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(0,193,106,0.22)' }} />
          <svg aria-hidden className="absolute inset-0 w-full h-full opacity-[0.10] pointer-events-none" preserveAspectRatio="none" viewBox="0 0 320 200" fill="none">
            <circle cx="290" cy="-10" r="110" stroke="#fff" strokeWidth="1" />
            <circle cx="290" cy="-10" r="80" stroke="#fff" strokeWidth="1" />
            <circle cx="290" cy="-10" r="50" stroke="#fff" strokeWidth="1" />
            <circle cx="10" cy="210" r="90" stroke="#fff" strokeWidth="1" />
            <circle cx="10" cy="210" r="60" stroke="#fff" strokeWidth="1" />
          </svg>
          {/* card chip + contactless (bank-card identity) */}
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="inline-block w-9 h-7 rounded-md" style={{ background: 'linear-gradient(135deg, #FDE047, #EAB308)', boxShadow: 'inset 0 0 0 1px rgba(113,63,18,0.35)' }}>
                <svg viewBox="0 0 36 28" className="w-full h-full" fill="none"><path d="M0 14h36M18 0v28M6 7h24M6 21h24" stroke="rgba(113,63,18,0.45)" strokeWidth="1.4" /></svg>
              </span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M8 8c2.2 2.2 2.2 5.8 0 8M12.5 5.5c3.6 3.6 3.6 9.4 0 13M17 3c5 5 5 13 0 18" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" /></svg>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.22em] text-white/45">SurePath · Partner Card</span>
          </div>

          <div className="relative z-10 flex items-center gap-5">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: 'rgba(253,224,71,0.75)' }}>
                {t('Commission this month', 'Komisi Bulan Ini')}
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-white/40 text-base font-medium">Rp</span>
                <span className="text-3xl sm:text-4xl font-black font-mono leading-none tracking-tight break-words"
                  style={{ backgroundImage: 'linear-gradient(160deg, #FFFDF0 10%, #FDE047 55%, #EAB308 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
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
              { label: t('Active quotes', 'Penawaran berjalan'), value: String(activeQuotesCount) },
              { label: t('Clients', 'Klien'), value: String(stats.clientsCount) },
              { label: t('Policies', 'Polis'), value: String(stats.policiesCount) },
            ].map((s, i) => (
              <div key={s.label} className={`flex-1 ${i > 0 ? 'pl-4 border-l border-white/10' : ''}`}>
                <p className="text-white/40 text-[9px] font-medium uppercase tracking-wider mb-0.5">{s.label}</p>
                <p className="text-white text-base font-black font-mono">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="relative z-10 mt-4 flex items-center justify-between">
            <p className="text-white/35 text-[10px] font-medium">
              {t('Target', 'Target')}: <span className="text-white/60 font-bold">{formatIDR(monthlyTarget)}</span>
            </p>
            <p className="text-white/45 text-[11px] font-black tracking-[0.24em] font-mono uppercase">
              {agent?.agent_code ?? 'SP-AGT'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Secondary performance — metrics NOT shown in the hero (no duplication) */}
      <motion.div className="px-5 mt-5" {...reveal(2)}>
        <div className="sp-glass rounded-[1.5rem] p-5 flex items-center">
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
        <div className="sp-glass rounded-[1.5rem] p-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center p-1 flex-shrink-0 animate-float"
              style={{ background: 'linear-gradient(135deg, rgba(0,193,106,0.16), rgba(253,224,71,0.20))', boxShadow: 'inset 0 0 0 1.5px rgba(0,193,106,0.25)' }}>
              <PathyMascot size={32} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-ds-green mb-1.5">{t('AI Sales Coach · Pathy', 'Pelatih AI · Pathy')}</p>
              <p className="text-sm font-bold text-ds-ink leading-snug">{dailyTip}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 mt-4 pt-4 border-t border-ds-border">
            <div className="w-8 h-8 rounded-xl bg-ds-green-tint flex items-center justify-center flex-shrink-0 text-ds-green">
              <Target size={20} />
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

      {/* Quick Actions — floating white tiles with custom duotone icons */}
      <motion.div className="px-5 mt-7" {...reveal(5)}>
        <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest mb-4">{t('Quick Actions', 'Aksi Cepat')}</p>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={`${action.tab}-${action.label}`}
              onClick={() => onNavigate(action.tab)}
              className={`flex flex-col items-center gap-2 py-3.5 px-1 rounded-2xl bg-ds-card ${action.color} cursor-pointer group active:scale-[0.98] hover:-translate-y-0.5 transition-all duration-200 ring-1 ring-ds-border/70 dark:ring-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green`}
              style={{ boxShadow: '0 10px 30px -12px rgba(11,17,32,0.12)', ['--ic-tint' as string]: action.tint }}
            >
              <span className="w-11 h-11 rounded-xl bg-ds-green-tint/70 flex items-center justify-center"><ManagedPortalIcon id={action.tab} size={23} imageClassName="w-[23px] h-[23px] object-contain group-hover:scale-105 transition-transform duration-200" fallback={<action.Ic size={23} strokeWidth={1.9} className="group-hover:scale-105 transition-transform duration-200" />} /></span>
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
        <ClayCard padding="none" className="overflow-hidden">
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
        </ClayCard>
      </motion.div>

      {/* Leaderboard Teaser */}
      <motion.div className="px-5 mt-5 pb-4" {...reveal(7)}>
        <button
          onClick={() => onNavigate('leaderboard')}
          className="w-full rounded-[1.75rem] p-4 flex items-center gap-3 active:scale-[0.98] transition-transform relative overflow-hidden text-left"
          style={{ background: 'linear-gradient(120deg, #0B1120 0%, #1F2937 60%, #78350F 130%)', boxShadow: '0 12px 30px -14px rgba(11,17,32,0.5)' }}
        >
          <div aria-hidden className="absolute -top-10 -right-6 w-36 h-36 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(253,224,71,0.25), transparent 70%)' }} />
          <div className="flex-1 relative z-10">
            <p className="text-sm font-black text-white">{t('Agent Leaderboard', 'Papan Peringkat')}</p>
            <p className="text-xs text-white/55 mt-0.5">{t('See your ranking this month', 'Lihat ranking agen bulan ini')}</p>
          </div>
          <div className="relative z-10 flex-shrink-0 -my-2"><SpotTrophy size={64} /></div>
          <ChevronRight size={16} className="text-white/50 flex-shrink-0 relative z-10" />
        </button>
      </motion.div>

    </div>
  );
};

export default AgentHome;
