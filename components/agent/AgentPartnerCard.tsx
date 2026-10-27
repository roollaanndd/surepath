import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Language } from '../../types';
import { formatIDR } from '../car-wizard/WizardUI';
import { AgentArtKeyframes } from './AgentArt';
import type { SpAgentTier } from '../../services/dbTypes';

/* ─── Agent Partner Card — tier-driven premium "bank card" ──────────────────
   Extracted from AgentHome (v2.7.10) so Beranda stays clean and My Profile
   owns the money card, exactly where the member looks for it.

   Colour is tier-driven (owner logic: tier membedakan warna kartu):
   - Graphite ("abu-abu metalik") = STANDARD / starting tier / unknown tier;
     a custom tier that carries its own DB colour keeps graphite as base and
     uses that colour as the accent (ring, glow, chip ink).
   - GOLD keeps the original emerald + gold look — it is the template every
     other tier palette was derived from.
   Purely presentational. */

export interface TierPalette {
  key: string;
  /** Hero band gradient (owner request: hero follows the card colour). */
  band: string;
  /** Partner-card gradient. */
  card: string;
  /** Soft glow orb inside the card. */
  glow: string;
  /** Progress-ring stroke. */
  progress: string;
  /** Money-figure gradient. */
  money: string;
  /** Icon ink inside the white hero chips. */
  chip: string;
}

const GOLD: TierPalette = {
  key: 'GOLD',
  band: 'linear-gradient(165deg, #00B268 0%, #00583A 100%)',
  card: 'linear-gradient(120deg, #0B1120 0%, #0E3B2E 52%, #0B5E3B 100%)',
  glow: 'rgba(0,193,106,0.22)',
  progress: '#00C16A',
  money: 'linear-gradient(160deg, #FFFDF0 10%, #FDE047 55%, #EAB308 100%)',
  chip: '#00A05A',
};

const SILVER: TierPalette = {
  key: 'SILVER',
  band: 'linear-gradient(165deg, #5A6675 0%, #262D3A 100%)',
  card: 'linear-gradient(120deg, #0B0F16 0%, #2A3442 52%, #566475 100%)',
  glow: 'rgba(203,213,225,0.20)',
  progress: '#CBD5E1',
  money: 'linear-gradient(160deg, #FFFFFF 10%, #E2E8F0 55%, #94A3B8 100%)',
  chip: '#64748B',
};

const PLATINUM: TierPalette = {
  key: 'PLATINUM',
  band: 'linear-gradient(165deg, #3D8FB0 0%, #123049 100%)',
  card: 'linear-gradient(120deg, #0A1220 0%, #123A52 52%, #1E6E8E 100%)',
  glow: 'rgba(125,211,252,0.22)',
  progress: '#7DD3FC',
  money: 'linear-gradient(160deg, #F0FDFF 10%, #A5E8FA 55%, #67C3E8 100%)',
  chip: '#1C7FA5',
};

const DIAMOND: TierPalette = {
  key: 'DIAMOND',
  band: 'linear-gradient(165deg, #0E7490 0%, #101B4A 100%)',
  card: 'linear-gradient(120deg, #05091E 0%, #101B4A 52%, #155E75 100%)',
  glow: 'rgba(34,211,238,0.20)',
  progress: '#22D3EE',
  money: 'linear-gradient(160deg, #ECFEFF 10%, #7DE3F0 55%, #22D3EE 100%)',
  chip: '#0891B2',
};

const BRONZE: TierPalette = {
  key: 'BRONZE',
  band: 'linear-gradient(165deg, #A5612B 0%, #3E2210 100%)',
  card: 'linear-gradient(120deg, #140B04 0%, #4A2410 52%, #7A3A12 100%)',
  glow: 'rgba(217,119,6,0.22)',
  progress: '#E08A3C',
  money: 'linear-gradient(160deg, #FFF7EB 10%, #F5B374 55%, #D97706 100%)',
  chip: '#C2410C',
};

const STANDARD: TierPalette = {
  key: 'STANDARD',
  band: 'linear-gradient(165deg, #46505F 0%, #23272E 100%)',
  card: 'linear-gradient(120deg, #10131A 0%, #23272E 52%, #3A4150 100%)',
  glow: 'rgba(148,163,184,0.22)',
  progress: '#9CA3AF',
  money: 'linear-gradient(160deg, #F8FAFC 10%, #CBD5E1 55%, #94A3B8 100%)',
  chip: '#475569',
};

/** The default-tier graphite swatch in `sp_agent_tiers.color` (#6b7280) is
 *  treated as "no explicit colour" — it must not hijack custom-tier accents. */
const isRealCustomColor = (color?: string | null): color is string =>
  !!color && /^#?[0-9a-fA-F]{6}$/.test(color.trim()) && !/^#?6b7280$/i.test(color.trim());

const hexToRgba = (hex: string, alpha: number): string => {
  const n = parseInt(hex.trim().replace('#', ''), 16);
  const b = n & 255;
  const g = (n >> 8) & 255;
  const r = (n >> 16) & 255;
  return `rgba(${r},${g},${b},${alpha})`;
};

/** Keyword match first (tier codes are free-form rows in sp_agent_tiers), so a
 *  row literally named "Digital Gold" reads GOLD even without rank metadata.
 *  A tier flagged is_default is the STANDARD member tier and always graphite. */
const KEYWORD_PALETTES: [needle: string, palette: TierPalette][] = [
  ['GOLD', GOLD], ['EMERALD', GOLD],
  ['SILVER', SILVER],
  ['PLATINUM', PLATINUM], ['ICE', PLATINUM],
  ['DIAMOND', DIAMOND],
  ['BRONZE', BRONZE], ['COPPER', BRONZE],
];

export function resolveTierPalette(tier?: SpAgentTier | null): TierPalette {
  if (tier && tier.is_default) {
    // Custom colour on the starting tier still colourises the accent.
    if (isRealCustomColor(tier.color)) return standardWith(tier.color);
    return STANDARD;
  }
  const code = (tier?.code ?? '').toUpperCase();
  for (const [needle, palette] of KEYWORD_PALETTES) {
    if (code.includes(needle)) return palette;
  }
  if (isRealCustomColor(tier?.color)) return standardWith(tier!.color!.trim());
  return STANDARD;
}

function standardWith(color: string): TierPalette {
  return {
    ...STANDARD,
    key: 'CUSTOM',
    progress: color,
    glow: hexToRgba(color, 0.22),
    chip: color,
  };
}

interface Props {
  stats: { totalCommissionMonth: number; clientsCount: number; policiesCount: number };
  activeQuotesCount: number;
  monthlyTarget: number;
  lang: Language;
  tier?: SpAgentTier | null;
  onNavigate?: (tab: string) => void;
}

const AgentPartnerCard: React.FC<Props> = ({ stats, activeQuotesCount, monthlyTarget, lang, tier, onNavigate }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;
  const reduce = useReducedMotion();
  const palette = resolveTierPalette(tier);
  const progress = monthlyTarget > 0 ? Math.min((stats.totalCommissionMonth / monthlyTarget) * 100, 100) : 0;

  return (
    <div>
      <AgentArtKeyframes />
      <div className="rounded-[1.75rem] p-6 text-white relative overflow-hidden" style={{ background: palette.card, boxShadow: '0 16px 44px -12px rgba(11,17,32,0.55)' }}>
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none" style={{ background: palette.glow }} />
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
          <span className="text-2xs font-black uppercase tracking-[0.14em] text-white/45 whitespace-nowrap">SurePath A✦ Partner Card</span>
        </div>

        <div className="relative z-10 flex items-center gap-5">
          <div className="flex-1 min-w-0">
            <p className="text-2xs font-black uppercase tracking-[0.12em] mb-2 whitespace-nowrap text-ds-amber-on-dark">
              {t('Commission this month', 'Komisi Bulan Ini')}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-white/40 text-base font-medium">Rp</span>
              <span className="text-3xl sm:text-4xl font-black font-mono leading-none tracking-tight break-words"
                style={{ backgroundImage: palette.money, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
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
                  cx="50" cy="50" r="38" fill="none" stroke={palette.progress} strokeWidth="8" strokeLinecap="round"
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
          {onNavigate && (
            <motion.button
              whileTap={reduce ? undefined : { scale: 0.95 }}
              type="button"
              onClick={() => onNavigate('commission')}
              className="rounded-full px-3.5 py-1.5 text-2xs font-black cursor-pointer"
              style={{ background: palette.progress, color: '#0B1120' }}
            >
              {t('View wallet', 'Buka dompet')}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentPartnerCard;
