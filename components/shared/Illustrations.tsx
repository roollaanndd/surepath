import React from 'react';

// ─── SurePath Character Illustrations ────────────────────────────────────────
//
// Flat 2D vector art inspired by the JULO reference screenshot.
// Features friendly Indonesian-style characters in relatable poses.
// Used in: hero cards, onboarding, empty states, success screens.
//
// All illustrations are inline SVG — no external assets needed.
// Palette: SurePath emerald (#00C16A, #003B2F) + warm accents.

// ── Shared character: friendly person with short black hair ────────────────
// Reusable across multiple illustrations with different poses/props.

interface IllustrationProps {
  size?: number;
  className?: string;
}

// ─── 1. Hero: Person celebrating with shield (protection success) ──────────
// Used in: CustomerPortal HeroCard (when user has active policy)
export const HeroProtected: React.FC<IllustrationProps> = ({ size = 120, className = '' }) => (
  <svg viewBox="0 0 200 200" width={size} height={size} className={className} fill="none" aria-hidden="true">
    {/* Decorative sparkles */}
    <circle cx="30" cy="40" r="3" fill="rgba(255,255,255,0.4)" />
    <circle cx="170" cy="30" r="4" fill="rgba(255,255,255,0.3)" />
    <circle cx="180" cy="70" r="2.5" fill="rgba(255,255,255,0.5)" />
    <circle cx="20" cy="100" r="2" fill="rgba(255,255,255,0.3)" />

    {/* Shield behind character */}
    <g transform="translate(70, 20)">
      <path d="M30 0L55 10v20c0 20-15 32-25 36-10-4-25-16-25-36V10L30 0z" fill="rgba(0,193,106,0.3)" stroke="rgba(0,193,106,0.5)" strokeWidth="2" />
      <path d="M20 22l7 7 14-15" stroke="#00C16A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>

    {/* Character: celebrating with arms up */}
    {/* Head */}
    <circle cx="100" cy="80" r="18" fill="#F4D4B8" />
    {/* Hair */}
    <path d="M82 75c0-12 8-20 18-20s18 8 18 20c0-3-4-5-8-5s-6 2-10 2-8-2-10-2-8 2-8 5z" fill="#1a1a1a" />
    {/* Eyes (happy - closed/smiling) */}
    <path d="M90 80c2 2 4 2 6 0" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M104 80c2 2 4 2 6 0" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" fill="none" />
    {/* Smile */}
    <path d="M92 88c3 3 8 3 12 0" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" fill="none" />
    {/* Body - green shirt (SurePath brand) */}
    <path d="M75 100c-5 5-8 15-8 25v30h66v-30c0-10-3-20-8-25l-10-5-15 5-15-5z" fill="#00C16A" />
    {/* Arms raised */}
    <path d="M72 105c-8-5-15-12-18-20" stroke="#F4D4B8" strokeWidth="8" strokeLinecap="round" fill="none" />
    <path d="M128 105c8-5 15-12 18-20" stroke="#F4D4B8" strokeWidth="8" strokeLinecap="round" fill="none" />
    {/* Fist details */}
    <circle cx="54" cy="84" r="5" fill="#F4D4B8" />
    <circle cx="146" cy="84" r="5" fill="#F4D4B8" />

    {/* Floating coins */}
    <g transform="translate(140, 50)">
      <circle r="8" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1.5" />
      <text x="0" y="3" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#92400E">Rp</text>
    </g>
    <g transform="translate(150, 75)">
      <circle r="6" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1" opacity="0.7" />
    </g>
  </svg>
);

// ─── 2. Onboarding: Person with umbrella (protection start) ────────────────
// Used in: OnboardingFlow slide 1
export const OnboardingProtection: React.FC<IllustrationProps> = ({ size = 200, className = '' }) => (
  <svg viewBox="0 0 240 240" width={size} height={size} className={className} fill="none" aria-hidden="true">
    {/* Umbrella */}
    <path d="M120 30c-40 0-70 25-75 55h150c-5-30-35-55-75-55z" fill="#00C16A" />
    <path d="M120 30c-40 0-70 25-75 55h75V30z" fill="#009E52" />
    <path d="M45 85h150" stroke="#003B2F" strokeWidth="3" strokeLinecap="round" />
    <line x1="120" y1="85" x2="120" y2="140" stroke="#003B2F" strokeWidth="3" strokeLinecap="round" />
    <path d="M120 140c-5 5-5 10 0 15" stroke="#003B2F" strokeWidth="3" strokeLinecap="round" fill="none" />

    {/* Rain drops */}
    <g opacity="0.4">
      <line x1="60" y1="50" x2="55" y2="65" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
      <line x1="180" y1="50" x2="175" y2="65" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
      <line x1="90" y1="40" x2="85" y2="55" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
      <line x1="150" y1="40" x2="145" y2="55" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
    </g>

    {/* Character under umbrella */}
    {/* Head */}
    <circle cx="120" cy="120" r="16" fill="#F4D4B8" />
    {/* Hair */}
    <path d="M104 116c0-10 7-16 16-16s16 6 16 16c-2-2-5-3-8-3s-5 1-8 1-5-1-8-1-6 1-8 3z" fill="#1a1a1a" />
    {/* Eyes */}
    <circle cx="114" cy="120" r="1.5" fill="#1a1a1a" />
    <circle cx="126" cy="120" r="1.5" fill="#1a1a1a" />
    {/* Smile */}
    <path d="M114 126c3 2 6 2 9 0" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    {/* Body */}
    <path d="M100 140c-4 4-6 12-6 20v25h52v-25c0-8-2-16-6-20l-8-4-12 4-12-4z" fill="#3B82F6" />
    {/* Arms holding umbrella handle */}
    <path d="M115 140c0 8 2 15 5 20" stroke="#F4D4B8" strokeWidth="6" strokeLinecap="round" fill="none" />

    {/* Ground */}
    <ellipse cx="120" cy="200" rx="50" ry="6" fill="rgba(0,193,106,0.1)" />
  </svg>
);

// ─── 3. Onboarding: Person with car (buying insurance) ──────────────────────
// Used in: OnboardingFlow slide 2
export const OnboardingCar: React.FC<IllustrationProps> = ({ size = 200, className = '' }) => (
  <svg viewBox="0 0 240 200" width={size} height={size} className={className} fill="none" aria-hidden="true">
    {/* Car */}
    <g transform="translate(40, 90)">
      {/* Car body */}
      <rect x="0" y="20" width="160" height="50" rx="12" fill="#003B2F" />
      {/* Car roof */}
      <path d="M30 20L45 0h70l15 20z" fill="#003B2F" />
      {/* Windows */}
      <path d="M38 18L50 5h25v13z" fill="rgba(255,255,255,0.3)" />
      <path d="M80 5h25l10 13H80z" fill="rgba(255,255,255,0.3)" />
      {/* Wheels */}
      <circle cx="35" cy="72" r="14" fill="#1a1a1a" />
      <circle cx="35" cy="72" r="6" fill="#666" />
      <circle cx="125" cy="72" r="14" fill="#1a1a1a" />
      <circle cx="125" cy="72" r="6" fill="#666" />
      {/* Headlight */}
      <circle cx="155" cy="35" r="4" fill="#FBBF24" />
    </g>

    {/* Character next to car — inspecting */}
    {/* Head */}
    <circle cx="50" cy="60" r="14" fill="#F4D4B8" />
    {/* Hair */}
    <path d="M36 56c0-9 6-14 14-14s14 5 14 14c-2-2-4-2-7-2s-4 1-7 1-4-1-7-1-5 0-7 2z" fill="#1a1a1a" />
    {/* Eyes (focused — looking at car) */}
    <circle cx="54" cy="60" r="1.5" fill="#1a1a1a" />
    <circle cx="46" cy="60" r="1.5" fill="#1a1a1a" />
    {/* Smile */}
    <path d="M46 66c3 2 6 2 8 0" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    {/* Body */}
    <path d="M36 75c-3 3-5 10-5 18v22h38v-22c0-8-2-15-5-18l-7-3-7 3-7-3z" fill="#00C16A" />
    {/* Arm pointing at car */}
    <path d="M68 85c10 5 18 10 22 15" stroke="#F4D4B8" strokeWidth="6" strokeLinecap="round" fill="none" />

    {/* Checkmark badge */}
    <g transform="translate(180, 70)">
      <circle r="16" fill="#00C16A" />
      <path d="M-7 0l5 5 10-10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>
  </svg>
);

// ─── 4. Onboarding: Person with phone (AI claims) ───────────────────────────
// Used in: OnboardingFlow slide 3
export const OnboardingClaim: React.FC<IllustrationProps> = ({ size = 200, className = '' }) => (
  <svg viewBox="0 0 240 200" width={size} height={size} className={className} fill="none" aria-hidden="true">
    {/* Phone */}
    <g transform="translate(90, 30)">
      <rect x="0" y="0" width="60" height="110" rx="10" fill="#003B2F" />
      <rect x="5" y="10" width="50" height="80" rx="4" fill="rgba(255,255,255,0.1)" />
      {/* Camera icon on screen */}
      <circle cx="30" cy="40" r="12" fill="rgba(0,193,106,0.3)" stroke="#00C16A" strokeWidth="2" />
      <circle cx="30" cy="40" r="6" fill="#00C16A" />
      {/* AI scan lines */}
      <line x1="10" y1="60" x2="50" y2="60" stroke="rgba(0,193,106,0.4)" strokeWidth="1.5" />
      <line x1="10" y1="68" x2="45" y2="68" stroke="rgba(0,193,106,0.3)" strokeWidth="1.5" />
      <line x1="10" y1="76" x2="50" y2="76" stroke="rgba(0,193,106,0.4)" strokeWidth="1.5" />
    </g>

    {/* Character holding phone */}
    {/* Head */}
    <circle cx="60" cy="60" r="14" fill="#F4D4B8" />
    {/* Hair */}
    <path d="M46 56c0-9 6-14 14-14s14 5 14 14c-2-2-4-2-7-2s-4 1-7 1-4-1-7-1-5 0-7 2z" fill="#1a1a1a" />
    {/* Eyes (looking at phone) */}
    <circle cx="64" cy="60" r="1.5" fill="#1a1a1a" />
    <circle cx="56" cy="60" r="1.5" fill="#1a1a1a" />
    {/* Smile */}
    <path d="M56 66c3 2 6 2 8 0" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    {/* Body */}
    <path d="M46 75c-3 3-5 10-5 18v30h38v-30c0-8-2-15-5-18l-7-3-7 3-7-3z" fill="#7C3AED" />
    {/* Arm holding phone */}
    <path d="M72 85c8 3 15 8 18 15" stroke="#F4D4B8" strokeWidth="6" strokeLinecap="round" fill="none" />

    {/* Sparkles around phone (AI magic) */}
    <g fill="#FBBF24">
      <path d="M170 25l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" />
      <circle cx="180" cy="60" r="2" />
      <circle cx="75" cy="35" r="2" />
    </g>
  </svg>
);

// ─── 5. Empty State: Person searching (no policies yet) ─────────────────────
// Used in: CustomerPortal empty state, agent empty states
export const EmptyStateSearch: React.FC<IllustrationProps> = ({ size = 120, className = '' }) => (
  <svg viewBox="0 0 160 160" width={size} height={size} className={className} fill="none" aria-hidden="true">
    {/* Magnifying glass */}
    <g transform="translate(95, 20)">
      <circle cx="20" cy="20" r="22" stroke="#00C16A" strokeWidth="4" fill="rgba(0,193,106,0.08)" />
      <line x1="36" y1="36" x2="50" y2="50" stroke="#00C16A" strokeWidth="5" strokeLinecap="round" />
    </g>

    {/* Character — curious, looking through magnifying glass */}
    <circle cx="60" cy="70" r="16" fill="#F4D4B8" />
    {/* Hair */}
    <path d="M44 66c0-10 7-16 16-16s16 6 16 16c-2-2-5-3-8-3s-5 1-8 1-5-1-8-1-6 1-8 3z" fill="#1a1a1a" />
    {/* Eyes (one squinting) */}
    <circle cx="54" cy="70" r="1.5" fill="#1a1a1a" />
    <path d="M64 68c2 2 2 4 0 4" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    {/* Mouth (small 'o' of curiosity) */}
    <circle cx="60" cy="78" r="2" fill="#1a1a1a" />
    {/* Body */}
    <path d="M44 88c-3 3-5 10-5 18v22h42v-22c0-8-2-15-5-18l-8-4-8 4-8-4z" fill="#3B82F6" />
    {/* Arm holding magnifying glass */}
    <path d="M75 95c10 0 20 5 25 12" stroke="#F4D4B8" strokeWidth="6" strokeLinecap="round" fill="none" />

    {/* Question marks floating */}
    <text x="20" y="30" fontSize="14" fontWeight="bold" fill="rgba(0,193,106,0.4)" opacity="0.6">?</text>
    <text x="130" y="50" fontSize="10" fontWeight="bold" fill="rgba(0,193,106,0.3)" opacity="0.5">?</text>
  </svg>
);

// ─── 6. Success: Person with checkmark (claim approved) ─────────────────────
// Used in: Claim success screen, payment success
export const SuccessCheck: React.FC<IllustrationProps> = ({ size = 120, className = '' }) => (
  <svg viewBox="0 0 160 160" width={size} height={size} className={className} fill="none" aria-hidden="true">
    {/* Big checkmark circle */}
    <g transform="translate(40, 10)">
      <circle cx="40" cy="40" r="35" fill="rgba(0,193,106,0.15)" stroke="#00C16A" strokeWidth="3" />
      <path d="M25 40l10 10 20-20" stroke="#00C16A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>

    {/* Character — happy, thumbs up */}
    <circle cx="80" cy="90" r="16" fill="#F4D4B8" />
    {/* Hair */}
    <path d="M64 86c0-10 7-16 16-16s16 6 16 16c-2-2-5-3-8-3s-5 1-8 1-5-1-8-1-6 1-8 3z" fill="#1a1a1a" />
    {/* Eyes (happy — closed/smiling) */}
    <path d="M70 90c2 2 4 2 6 0" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M84 90c2 2 4 2 6 0" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" fill="none" />
    {/* Big smile */}
    <path d="M72 98c4 4 10 4 14 0" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" fill="none" />
    {/* Body */}
    <path d="M64 108c-3 3-5 10-5 18v20h42v-20c0-8-2-15-5-18l-8-4-8 4-8-4z" fill="#00C16A" />
    {/* Thumbs up */}
    <circle cx="55" cy="115" r="6" fill="#F4D4B8" />
    <path d="M55 109c0-4 2-6 4-6" stroke="#F4D4B8" strokeWidth="5" strokeLinecap="round" fill="none" />

    {/* Confetti */}
    <g fill="#FBBF24">
      <rect x="20" y="20" width="3" height="8" rx="1" transform="rotate(20 20 20)" />
      <rect x="130" y="30" width="3" height="6" rx="1" transform="rotate(-15 130 30)" />
      <circle cx="15" cy="60" r="2" />
      <circle cx="140" cy="80" r="2" fill="#7C3AED" />
      <rect x="135" y="110" width="3" height="5" rx="1" fill="#3B82F6" transform="rotate(30 135 110)" />
    </g>
  </svg>
);

// ─── 7. Agent: Person with money/commission (earning) ───────────────────────
// Used in: AgentHome commission section, wallet
export const AgentEarning: React.FC<IllustrationProps> = ({ size = 120, className = '' }) => (
  <svg viewBox="0 0 160 160" width={size} height={size} className={className} fill="none" aria-hidden="true">
    {/* Floating money */}
    <g transform="translate(100, 15)">
      <rect x="-12" y="-8" width="24" height="16" rx="3" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1.5" />
      <text x="0" y="4" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#92400E">Rp</text>
    </g>
    <g transform="translate(120, 40)">
      <rect x="-10" y="-7" width="20" height="14" rx="3" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1" opacity="0.7" />
    </g>

    {/* Character — happy holding money */}
    <circle cx="60" cy="60" r="16" fill="#F4D4B8" />
    {/* Hair */}
    <path d="M44 56c0-10 7-16 16-16s16 6 16 16c-2-2-5-3-8-3s-5 1-8 1-5-1-8-1-6 1-8 3z" fill="#1a1a1a" />
    {/* Eyes (happy) */}
    <path d="M50 60c2 2 4 2 6 0" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M64 60c2 2 4 2 6 0" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" fill="none" />
    {/* Smile */}
    <path d="M52 68c4 3 8 3 12 0" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" fill="none" />
    {/* Body — emerald shirt */}
    <path d="M44 78c-3 3-5 10-5 18v30h42v-30c0-8-2-15-5-18l-8-4-8 4-8-4z" fill="#003B2F" />
    {/* Arm holding money */}
    <path d="M75 88c8 2 15 5 20 10" stroke="#F4D4B8" strokeWidth="6" strokeLinecap="round" fill="none" />
    {/* Money in hand */}
    <rect x="92" y="92" width="16" height="11" rx="2" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1" />

    {/* Coins falling */}
    <g fill="#FBBF24" stroke="#F59E0B" strokeWidth="1">
      <circle cx="30" cy="100" r="4" />
      <circle cx="25" cy="120" r="3" opacity="0.6" />
    </g>
  </svg>
);

// Export all
export const AllIllustrations = {
  HeroProtected,
  OnboardingProtection,
  OnboardingCar,
  OnboardingClaim,
  EmptyStateSearch,
  SuccessCheck,
  AgentEarning,
};
