import React, { useState, useEffect } from 'react';
import {
  TrendingUp, ChevronRight, Target, Star, Coins,
  FilePlus2, UsersRound, ShieldAlert, FileCheck2,
  Trophy, FileSignature, RefreshCcw, Network, Wallet, UserRound,
} from 'lucide-react';
import PromoBanner from '../PromoBanner';
import { motion, useReducedMotion } from 'motion/react';
import { Language } from '../../types';
import ManagedPortalIcon from '../shared/ManagedPortalIcon';
import { formatIDR } from '../car-wizard/WizardUI';
import { formatIDRCompact } from '../../src/i18n';
import RenewalAlerts from './RenewalAlerts';
import { getAgentOrders } from '../../services/supabaseService';
import { PathyMascot } from '../shared/cards';
import { ClayCard } from '../ui';
import { AgentArtKeyframes } from './AgentArt';
import { PATHY_OPEN_EVENT } from '../shared/PathyChat';
import { useTierDefinitions, getTierByCode } from '../../hooks/useTierDefinitions';
import '../../src/styles/portal-modernization.css';

interface Props {
  agent: any;
  agentId: string;
  stats: any;
  recentCommissions: any[];
  onNavigate: (tab: string) => void;
  lang: Language;
  agentTier?: string | null;
}

/* ─── Home in the "saturated brand hero" pattern (ref: messaging-app home) ──
 * Source image: tinted hero band → avatar + 4 round quick icons → dark
 * premium card bridging hero & sheet → white sheet with two icon-grid
 * sections. SurePath translation: the saturated band is ds-green (the fill
 * the app already pairs with ds-on-green ink); the "Mail VIP" card is the
 * agent's own commission/target bank-card — SurePath has no paywall, so the
 * dark premium spot carries real money data, not a fake upsell; and both
 * grids route to real portal destinations (every tile → handleTabChange).
 * Kept 1:1 from the previous home: the draft-resume banner, the monthly
 * target ring with micro-stats, GWP & conversion, the Pathy sales coach,
 * RenewalAlerts and the recent-commissions list. Layout only — no screen,
 * tool or destination was added or removed. */

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

  // Staggered entrance — static under reduced motion (unchanged from before).
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
    t('Clients who buy Travel insurance are 3A- more likely to add a PA policy within 6 months.', 'Klien Travel 3A- lebih mungkin tambah polis PA dalam 6 bulan. Follow up sekarang!'),
    t('Follow up with a prospect within 24 hours to increase conversion by 60%.', 'Follow-up dalam 24 jam tingkatkan konversi 60%. Hubungi 3 prospek hari ini.'),
    t('Referrals close 4A- faster than cold leads. Ask every happy client for one.', 'Referral 4A- lebih cepat closing. Minta referensi dari setiap klien puas hari ini.'),
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

  /** Round quick-icon tile ON the hero band (ref: Send / Draft / Backup row). */
  const heroTile = (label: string, target: string, Icon: React.ElementType<{ size?: number; className?: string }>) => (
    <button
      key={target + label}
      type="button"
      onClick={() => onNavigate(target)}
      className="flex flex-col items-center gap-1.5 rounded-2xl py-1.5 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sp-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-ds-green"
      aria-label={label}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-sp-emerald shadow-[0_6px_16px_-6px_rgba(0,59,47,0.55)] transition-transform duration-200 group-active:scale-95 motion-reduce:transition-none">
        <Icon size={24} strokeWidth={2} />
      </span>
      <span className="text-2xs font-bold leading-tight text-ds-on-green/95">{label}</span>
    </button>
  );

  /** Section tile for the white sheets (ref: "Email Function" grid). */
  const gridTile = (opts: {
    label: string; sub?: string; onAction: () => void; TintIcon: React.ReactNode; tint: string;
  }) => (
    <button
      key={opts.label}
      type="button"
      onClick={opts.onAction}
      aria-label={opts.sub ?? opts.label}
      className="flex flex-col items-center gap-2 rounded-2xl bg-ds-card py-3.5 px-1 ring-1 ring-ds-border/60 cursor-pointer group active:scale-[0.97] hover:-translate-y-0.5 transition-all duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green focus-visible:ring-offset-2 focus-visible:ring-offset-ds-bg"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none" style={{ background: opts.tint }}>
        {opts.TintIcon}
      </span>
      <span className="text-2xs font-bold leading-tight text-ds-ink2 text-center">{opts.label}</span>
    </button>
  );
  const greenTint = 'rgba(0,193,106,0.13)';

  return (
    <div className="sp-agent-home">
      {/* ─── Saturated brand hero band ─────────────────────────────────────── */}
      <div className="w-full bg-ds-green text-ds-on-green rounded-b-[2.25rem] pb-24">
        <motion.div className="sp-agent-home__greeting px-5 pt-6 sm:pt-8" {...reveal(0)}>
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sp-emerald text-white text-xl font-black ring-[3px] ring-white/40">
                {(agent?.name ?? 'A')[0].toUpperCase()}
              </div>
              {myTierDef && !myTierDef.is_default && (
                <span
                  className="absolute -bottom-1 -right-1.5 rounded-full text-2xs"
                  title={myTierDef.name}
                >
                  {myTierDef.emoji}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium opacity-80">{greeting()},</p>
              <h2 className="text-[22px] leading-tight font-black tracking-tight truncate">
                {agent?.name?.split(' ')[0] ?? 'Mitra'}
              </h2>
              <p className="text-2xs font-bold uppercase tracking-wider opacity-75 truncate">
                {agent?.agent_code ?? 'SP-AGT'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 cursor-pointer active:scale-90 transition-transform motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sp-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-ds-green"
              aria-label={t('Open profile', 'Buka profil')}
            >
              <ChevronRight size={20} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
          {myTierDef && !myTierDef.is_default && (
            <span
              className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-2xs font-bold uppercase tracking-wider"
            >
              {myTierDef.emoji ?? <Star size={11} />} {myTierDef.name}
            </span>
          )}
        </motion.div>

        {/* Four round quick actions sit ON the band (ref: Send/Draft/Deleted/Backup) */}
        <motion.nav
          className="sp-agent-home__quick-actions mt-5 px-5"
          aria-label={t('Quick actions', 'Aksi cepat')}
          {...reveal(1)}
        >
          <div className="grid grid-cols-4 gap-2">
            {heroTile(t('New quote', 'Kutipan'), 'quotes', FilePlus2)}
            {heroTile(t('Claims', 'Klaim'), 'claims', ShieldAlert)}
            {heroTile(t('Network', 'Jaringan'), 'network', Network)}
            {heroTile(t('Renewals', 'Renewals'), 'renewals', RefreshCcw)}
          </div>
        </motion.nav>
      </div>

      {/* ─── Dark premium card — bridges hero band and white sheet ────────── */}
      <motion.div className="sp-agent-home__commission relative z-10 px-5" style={{ marginTop: '-6.5rem' }} {...reveal(2)}>
        <AgentArtKeyframes />
        <div className="rounded-[1.75rem] p-6 text-white relative overflow-hidden" style={{ background: 'linear-gradient(120deg, #0B1120 0%, #0E3B2E 52%, #0B5E3B 100%)', boxShadow: '0 16px 44px -12px rgba(11,17,32,0.55)' }}>
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(0,193,106,0.22)' }} />
          <svg aria-hidden className="absolute inset-0 w-full h-full opacity-[0.10] pointer-events-none" preserveAspectRatio="none" viewBox="0 0 320 200" fill="none">
            <circle cx="290" cy="-10" r="110" stroke="#fff" strokeWidth="1" />
            <circle cx="290" cy="-10" r="80" stroke="#fff" strokeWidth="1" />
            <circle cx="290" cy="-10" r="50" stroke="#fff" strokeWidth="1" />
            <circle cx="10" cy="210" r="90" stroke="#fff" strokeWidth="1" />
            <circle cx="10" cy="210" r="60" stroke="#fff" strokeWidth="1" />
          </svg>
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="inline-block w-9 h-7 rounded-md" style={{ background: 'linear-gradient(135deg, #FDE047, #EAB308)', boxShadow: 'inset 0 0 0 1px rgba(113,63,18,0.35)' }}>
                <svg viewBox="0 0 36 28" className="w-full h-full" fill="none"><path d="M0 14h36M18 0v28M6 7h24M6 21h24" stroke="rgba(113,63,18,0.45)" strokeWidth="1.4" /></svg>
              </span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M8 8c2.2 2.2 2.2 5.8 0 8M12.5 5.5c3.6 3.6 3.6 9.4 0 13M17 3c5 5 5 13 0 18" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" /></svg>
            </div>
            <span className="text-2xs font-black uppercase tracking-[0.14em] text-white/45 whitespace-nowrap">SurePath A� Partner Card</span>
          </div>

          <div className="relative z-10 flex items-center gap-5">
            <div className="flex-1 min-w-0">
              <p className="text-2xs font-black uppercase tracking-[0.12em] mb-2 whitespace-nowrap text-ds-amber-on-dark">
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
              <p className="text-2xs text-white/45 font-bold uppercase tracking-wide whitespace-nowrap">{t('of target', 'dr target')}</p>
            </div>
          </div>

          {/* Inline micro-stats */}
          <div className="relative z-10 mt-5 pt-4 border-t border-white/10 flex items-stretch">
            {[
              { label: t('Quotes', 'Penawaran'), value: String(activeQuotesCount) },
              { label: t('Clients', 'Klien'), value: String(stats.clientsCount) },
              { label: t('Policies', 'Polis'), value: String(stats.policiesCount) },
            ].map((s, i) => (
              <div key={s.label} className={`flex-1 min-w-0 flex flex-col ${i > 0 ? 'pl-3 border-l border-white/10' : ''}`}>
                <p className="flex-1 text-white/45 text-2xs font-medium uppercase tracking-wide leading-tight mb-1">{s.label}</p>
                <p className="text-white text-base font-black font-mono tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="relative z-10 mt-4 flex items-center justify-between">
            <p className="text-white/40 text-2xs font-medium">
              {t('Target', 'Target')}: <span className="text-white/60 font-bold">{formatIDR(monthlyTarget)}</span>
            </p>
            <button
              type="button"
              onClick={() => onNavigate('commission')}
              className="rounded-full bg-ds-green px-3.5 py-1.5 text-2xs font-black text-ds-on-green cursor-pointer active:scale-95 transition-transform motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              {t('View wallet', 'Buka dompet')}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ─── White content sheet — pulls up under the card (ref: Email Function sheet) ── */}
      <div className="relative z-0 -mt-12 rounded-t-[2rem] bg-ds-bg pt-16 pb-28 shadow-[0_-14px_30px_-18px_rgba(11,17,32,0.18)]">
        {savedDraftProduct && (
          <div className="sp-agent-home__draft mx-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3" role="status">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-700 shrink-0"><FilePlus2 size={18} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-emerald-950">{t('Continue your saved quote', 'Lanjutkan draf penawaran')}</p>
              <p className="text-xs text-emerald-800 mt-0.5">{t('Your progress is saved for this session.', 'Progres tersimpan untuk sesi ini.')}</p>
            </div>
            <button type="button" onClick={() => onNavigate('quotes')} className="min-h-10 rounded-xl bg-emerald-700 px-3 text-xs font-bold text-white cursor-pointer">{t('Resume', 'Lanjutkan')}</button>
          </div>
        )}

        <div className="px-5 pt-4">
          <PromoBanner />
        </div>

        {/* Fitur Mitra — every tile is a real portal destination */}
        <motion.section className="sp-agent-home__fitur px-5 mt-5" aria-label={t('Partner features', 'Fitur Mitra')} {...reveal(3)}>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-sm font-black text-ds-ink">{t('Partner Features', 'Fitur Mitra')}</h3>
            <button onClick={() => onNavigate('policy')} className="text-xs font-bold text-ds-green cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green rounded">
              {t('View More', 'Selengkapnya')}
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {gridTile({ label: t('New quote', 'Kutipan'), tint: greenTint, onAction: () => onNavigate('quotes'), TintIcon: <ManagedPortalIcon id="quotes" size={23} imageClassName="w-[23px] h-[23px] object-contain group-hover:scale-105 transition-transform duration-200" fallback={<FilePlus2 size={23} strokeWidth={1.9} className="text-ds-green group-hover:scale-105 transition-transform duration-200" />} /> })}
            {gridTile({ label: t('Policies', 'Polis'), tint: greenTint, onAction: () => onNavigate('policy'), TintIcon: <ManagedPortalIcon id="policy" size={23} imageClassName="w-[23px] h-[23px] object-contain group-hover:scale-105 transition-transform duration-200" fallback={<FileCheck2 size={23} strokeWidth={1.9} className="text-ds-green group-hover:scale-105 transition-transform duration-200" />} /> })}
            {gridTile({ label: t('Clients', 'Klien'), tint: greenTint, onAction: () => onNavigate('clients'), TintIcon: <ManagedPortalIcon id="clients" size={23} imageClassName="w-[23px] h-[23px] object-contain group-hover:scale-105 transition-transform duration-200" fallback={<UsersRound size={23} strokeWidth={1.9} className="text-ds-green group-hover:scale-105 transition-transform duration-200" />} /> })}
            {gridTile({ label: t('Claims', 'Klaim'), tint: greenTint, onAction: () => onNavigate('claims'), TintIcon: <ManagedPortalIcon id="claims" size={23} imageClassName="w-[23px] h-[23px] object-contain group-hover:scale-105 transition-transform duration-200" fallback={<ShieldAlert size={23} strokeWidth={1.9} className="text-ds-green group-hover:scale-105 transition-transform duration-200" />} /> })}
            {gridTile({ label: t('Renewals', 'Renewals'), tint: greenTint, onAction: () => onNavigate('renewals'), TintIcon: <RefreshCcw size={23} strokeWidth={1.9} className="text-ds-green" /> })}
            {gridTile({ label: t('Network', 'Jaringan'), tint: greenTint, onAction: () => onNavigate('network'), TintIcon: <Network size={23} strokeWidth={1.9} className="text-ds-green" /> })}
            {gridTile({ label: t('Leaderboard', 'Papan Skor'), tint: greenTint, onAction: () => onNavigate('leaderboard'), TintIcon: <Trophy size={23} strokeWidth={1.9} className="text-ds-green" /> })}
            {gridTile({ label: t('Endorsements', 'Endorsemen'), tint: greenTint, onAction: () => onNavigate('endorsements'), TintIcon: <FileSignature size={23} strokeWidth={1.9} className="text-ds-green" /> })}
          </div>
        </motion.section>

        {/* Other Tools — the softer, multicoloured section (ref: Other Tools) */}
        <motion.section className="sp-agent-home__lainnya px-5 mt-5" aria-label={t('Other tools', 'Lainnya')} {...reveal(4)}>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-sm font-black text-ds-ink">{t('Other Tools', 'Lainnya')}</h3>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {gridTile({ label: t('Wallet', 'Dompet'), tint: 'var(--ds-warning-tint)', onAction: () => onNavigate('wallet'), TintIcon: <Wallet size={22} strokeWidth={1.9} className="text-ds-amber" /> })}
            {gridTile({ label: t('Commission', 'Komisi'), tint: 'var(--ds-info-tint)', onAction: () => onNavigate('commission'), TintIcon: <Coins size={22} strokeWidth={1.9} className="text-ds-blue" /> })}
            {gridTile({
              label: 'Pathy', tint: 'var(--ds-purple-lt)',
              onAction: () => window.dispatchEvent(new Event(PATHY_OPEN_EVENT)),
              TintIcon: <PathyMascot size={26} />,
            })}
            {gridTile({ label: t('Profile', 'Profil'), tint: 'var(--ds-green-tint)', onAction: () => onNavigate('profile'), TintIcon: <UserRound size={22} strokeWidth={1.9} className="text-ds-green" /> })}
          </div>
        </motion.section>

        {/* Secondary performance — kept, tucks between the grids and the coach */}
        <motion.div className="sp-agent-home__gwp px-5 mt-5" {...reveal(5)}>
          <div className="sp-glass rounded-[1.5rem] p-5 flex items-center">
            <div className="flex-1 pr-5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp size={13} className="text-ds-green" />
                <p className="text-2xs text-ds-ink3 font-medium uppercase tracking-wider">{t('GWP / Month', 'GWP Bulan Ini')}</p>
              </div>
              <p className="text-xl font-black text-ds-ink font-mono leading-none tabular-nums whitespace-nowrap"
                title={formatIDR(stats.totalCommissionMonth * 8)}>
                {formatIDRCompact(stats.totalCommissionMonth * 8, lang)}
              </p>
              <p className="text-2xs text-ds-ink3 mt-1">{t('estimated', 'estimasi')}</p>
            </div>
            <div className="flex-1 pl-5 border-l border-ds-border">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Target size={13} className="text-ds-amber" />
                <p className="text-2xs text-ds-ink3 font-medium uppercase tracking-wider">{t('Conversion', 'Konversi')}</p>
              </div>
              <p className="text-xl font-black text-ds-ink font-mono leading-none">{conversion}%</p>
              <p className="text-2xs text-ds-ink3 mt-1">{t('clients to policies', 'klien → polis')}</p>
            </div>
          </div>
        </motion.div>

        {/* Sales Coach — calm card (kept from previous home) */}
        <motion.div className="sp-agent-home__coach px-5 mt-5" {...reveal(6)}>
          <div className="sp-glass rounded-[1.5rem] p-5">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center p-1 flex-shrink-0 animate-float"
                style={{ background: 'linear-gradient(135deg, rgba(0,193,106,0.16), rgba(253,224,71,0.20))', boxShadow: 'inset 0 0 0 1.5px rgba(0,193,106,0.25)' }}>
                <PathyMascot size={32} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xs font-black uppercase tracking-wider text-ds-green mb-1.5">{t('AI Sales Coach — Pathy', 'Pelatih AI — Pathy')}</p>
                <p className="text-sm font-bold text-ds-ink leading-snug">{dailyTip}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 mt-4 pt-4 border-t border-ds-border">
              <div className="w-8 h-8 rounded-xl bg-ds-green-tint flex items-center justify-center flex-shrink-0 text-ds-green">
                <Target size={20} />
              </div>
              <div>
                <p className="text-2xs text-ds-ink3 font-medium">{t('Daily Goal', 'Target Harian')}</p>
                <p className="text-xs font-black text-ds-ink">{t(`Contact ${dailyContactGoal} clients`, `Hubungi ${dailyContactGoal} klien`)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Renewal Alerts */}
        <motion.div {...reveal(7)}>
          <RenewalAlerts agentId={agentId} lang={lang} onNavigate={onNavigate} />
        </motion.div>

        {/* Recent Commissions */}
        <motion.div className="sp-agent-home__commissions px-5 mt-7" {...reveal(8)}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-ds-ink">{t('Recent Commissions', 'Komisi Terbaru')}</h3>
            <button onClick={() => onNavigate('commission')} className="text-xs font-bold text-ds-green cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green rounded">
              {t('View All', 'Semua')}
            </button>
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
                    <p className="text-2xs text-ds-ink3">{new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-ds-green">+{formatIDR(c.amount)}</p>
                    <span className={`text-2xs font-bold px-1.5 py-0.5 rounded-full ${statusColor[c.status] ?? 'bg-ds-card2 text-ds-ink2'}`}>{c.status}</span>
                  </div>
                </div>
              ))
            )}
          </ClayCard>
        </motion.div>
      </div>
    </div>
  );
};

export default AgentHome;
