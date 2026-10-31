import React from 'react';

export interface SpEmptyIllustrationProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

/**
 * 1. BELUM ADA POLIS AKTIF (No Active Policies)
 */
export const SpEmptyPoliciesIllustration: React.FC<SpEmptyIllustrationProps> = ({
  size = 160,
  className = '',
  ...props
}) => (
  <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    {/* Ambient Background Blob */}
    <circle cx="80" cy="82" r="56" fill="#E2FBCE" fillOpacity="0.55" />
    <ellipse cx="80" cy="136" rx="42" ry="6" fill="#06231D" fillOpacity="0.08" />

    {/* Back Document Card (Tilted) */}
    <g transform="rotate(-8 66 74)">
      <rect x="38" y="36" width="56" height="74" rx="10" fill="#0C342C" />
      <rect x="46" y="48" width="28" height="5" rx="2.5" fill="#076653" />
      <rect x="46" y="58" width="40" height="4" rx="2" fill="#076653" fillOpacity="0.6" />
    </g>

    {/* Front Policy Card */}
    <rect x="52" y="34" width="64" height="82" rx="12" fill="#FFFDEE" stroke="#06231D" strokeWidth="2.5" />
    <rect x="62" y="46" width="24" height="6" rx="3" fill="#076653" />
    <rect x="62" y="58" width="44" height="4" rx="2" fill="#E2E8E5" />
    <rect x="62" y="67" width="36" height="4" rx="2" fill="#E2E8E5" />

    {/* Center Shield Outline (Dashed / Waiting to be activated) */}
    <path
      d="M84 78L98 83.5V93C98 101.5 92.1 107.8 84 110.5C75.9 107.8 70 101.5 70 93V83.5L84 78Z"
      fill="#E2FBCE"
      stroke="#076653"
      strokeWidth="2"
      strokeDasharray="3 3"
    />

    {/* Floating Action Plus Badge */}
    <circle cx="114" cy="106" r="16" fill="#FF6B2C" stroke="#FFFDEE" strokeWidth="3" />
    <path d="M114 99V113M107 106H121" stroke="#FFFDEE" strokeWidth="3" strokeLinecap="round" />

    {/* Decorative Sparkles */}
    <circle cx="34" cy="52" r="4" fill="#E3EF26" />
    <path d="M124 44V52M120 48H128" stroke="#076653" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * 2. BELUM ADA KLAIM / AMAN TERLINDUNGI (Zero Claims / Peace of Mind)
 */
export const SpEmptyClaimsIllustration: React.FC<SpEmptyIllustrationProps> = ({
  size = 160,
  className = '',
  ...props
}) => (
  <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="80" cy="82" r="56" fill="#E2FBCE" fillOpacity="0.6" />
    <ellipse cx="80" cy="138" rx="40" ry="6" fill="#06231D" fillOpacity="0.08" />

    {/* Outer Radiant Rings */}
    <circle cx="80" cy="78" r="44" stroke="#076653" strokeWidth="1.5" strokeDasharray="4 6" strokeOpacity="0.4" />

    {/* Main Dimensional Shield */}
    <path d="M80 32L116 45.5V74C116 100.2 100.6 118.4 80 125C59.4 118.4 44 100.2 44 74V45.5L80 32Z" fill="#06231D" />
    <path d="M80 38L110 49.3V73.5C110 95.8 97.2 111.3 80 117V38Z" fill="#076653" />

    {/* Checkmark & Smile Ribbon */}
    <circle cx="80" cy="76" r="18" fill="#E3EF26" />
    <path d="M72 76.5L77.5 82L89 70.5" stroke="#06231D" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

    {/* Floating Peace Badge */}
    <rect x="96" y="34" width="34" height="20" rx="10" fill="#FFFDEE" stroke="#06231D" strokeWidth="2" />
    <circle cx="106" cy="44" r="3.5" fill="#10B981" />
    <rect x="113" y="42" width="11" height="4" rx="2" fill="#06231D" />

    <circle cx="36" cy="68" r="4.5" fill="#FF6B2C" />
  </svg>
);

/**
 * 3. BELUM ADA PENAWARAN / QUOTATION (No Quotations Yet)
 */
export const SpEmptyQuotationsIllustration: React.FC<SpEmptyIllustrationProps> = ({
  size = 160,
  className = '',
  ...props
}) => (
  <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="80" cy="82" r="56" fill="#E2FBCE" fillOpacity="0.55" />
    <ellipse cx="80" cy="136" rx="44" ry="6" fill="#06231D" fillOpacity="0.08" />

    {/* Main Quotation Sheet */}
    <rect x="40" y="32" width="66" height="86" rx="12" fill="#FFFDEE" stroke="#06231D" strokeWidth="2.5" />
    <rect x="52" y="46" width="28" height="7" rx="3.5" fill="#076653" />
    <rect x="52" y="60" width="42" height="5" rx="2.5" fill="#E2FBCE" />
    <rect x="52" y="70" width="34" height="5" rx="2.5" fill="#E2E8E5" />

    {/* Price / Rate Tag Box */}
    <rect x="52" y="84" width="42" height="18" rx="6" fill="#06231D" />
    <text x="60" y="97" fill="#E3EF26" fontSize="11" fontWeight="bold" fontFamily="sans-serif">Rp 0</text>

    {/* Floating Calculator Widget */}
    <rect x="88" y="62" width="42" height="54" rx="10" fill="#076653" stroke="#FFFDEE" strokeWidth="2.5" />
    <rect x="95" y="70" width="28" height="10" rx="3" fill="#E3EF26" />
    <circle cx="99" cy="90" r="3" fill="#FFFDEE" />
    <circle cx="109" cy="90" r="3" fill="#FFFDEE" />
    <circle cx="119" cy="90" r="3" fill="#FF6B2C" />
    <circle cx="99" cy="102" r="3" fill="#FFFDEE" />
    <circle cx="109" cy="102" r="3" fill="#FFFDEE" />
    <circle cx="119" cy="102" r="3" fill="#E3EF26" />

    <circle cx="34" cy="94" r="5" fill="#FF6B2C" />
  </svg>
);

/**
 * 4. DOMPET & TRANSAKSI KOSONG (Empty Wallet & Commission History)
 */
export const SpEmptyWalletIllustration: React.FC<SpEmptyIllustrationProps> = ({
  size = 160,
  className = '',
  ...props
}) => (
  <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="80" cy="84" r="56" fill="#E2FBCE" fillOpacity="0.55" />
    <ellipse cx="80" cy="136" rx="44" ry="6" fill="#06231D" fillOpacity="0.08" />

    {/* Floating Coins Waiting to Drop In */}
    <circle cx="64" cy="40" r="12" fill="#E3EF26" stroke="#06231D" strokeWidth="2.5" />
    <path d="M64 35V45M60 38H66.5C67.9 38 67.9 42 66.5 42H60" stroke="#06231D" strokeWidth="2" strokeLinecap="round" />

    <circle cx="98" cy="34" r="9" fill="#FF6B2C" stroke="#FFFDEE" strokeWidth="2" />
    <path d="M78 48V56" stroke="#076653" strokeWidth="2" strokeDasharray="2 3" strokeLinecap="round" />

    {/* Dimensional Wallet Body */}
    <rect x="36" y="58" width="88" height="62" rx="16" fill="#06231D" />
    <path d="M36 72C36 64.3 42.3 58 50 58H110C117.7 58 124 64.3 124 72V78H36V72Z" fill="#076653" />

    {/* Card Sticking Out */}
    <rect x="48" y="48" width="46" height="16" rx="5" fill="#FFFDEE" stroke="#06231D" strokeWidth="2" />

    {/* Magnetic Clasp */}
    <rect x="96" y="79" width="32" height="22" rx="8" fill="#E2FBCE" stroke="#06231D" strokeWidth="2.5" />
    <circle cx="107" cy="90" r="4.5" fill="#06231D" />

    {/* Balance Dash Lines */}
    <rect x="48" y="88" width="32" height="5" rx="2.5" fill="#076653" />
    <rect x="48" y="98" width="20" height="5" rx="2.5" fill="#E3EF26" />
  </svg>
);

/**
 * 5. BELUM ADA KLIEN / PROSPEK AGEN (Empty Client Pipeline)
 */
export const SpEmptyClientsIllustration: React.FC<SpEmptyIllustrationProps> = ({
  size = 160,
  className = '',
  ...props
}) => (
  <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="80" cy="82" r="56" fill="#E2FBCE" fillOpacity="0.55" />
    <ellipse cx="80" cy="136" rx="44" ry="6" fill="#06231D" fillOpacity="0.08" />

    {/* Left & Right Secondary Avatars */}
    <circle cx="44" cy="74" r="16" fill="#0C342C" />
    <circle cx="44" cy="70" r="5.5" fill="#E2FBCE" />
    <path d="M34 84C34 79.5 38.5 77 44 77C49.5 77 54 79.5 54 84" stroke="#E2FBCE" strokeWidth="2.5" strokeLinecap="round" />

    <circle cx="116" cy="74" r="16" fill="#0C342C" />
    <circle cx="116" cy="70" r="5.5" fill="#E2FBCE" />
    <path d="M106 84C106 79.5 110.5 77 116 77C121.5 77 126 79.5 126 84" stroke="#E2FBCE" strokeWidth="2.5" strokeLinecap="round" />

    {/* Center Main Client Profile Card */}
    <rect x="52" y="42" width="56" height="76" rx="16" fill="#FFFDEE" stroke="#06231D" strokeWidth="2.5" />
    <circle cx="80" cy="68" r="14" fill="#076653" />
    <circle cx="80" cy="64" r="5" fill="#E3EF26" />
    <path d="M70 77C70 72.5 74.5 70 80 70C85.5 70 90 72.5 90 77" stroke="#FFFDEE" strokeWidth="2.5" strokeLinecap="round" />

    <rect x="64" y="92" width="32" height="5" rx="2.5" fill="#06231D" />
    <rect x="68" y="101" width="24" height="4" rx="2" fill="#076653" fillOpacity="0.5" />

    {/* Add Client Badge */}
    <circle cx="104" cy="110" r="14" fill="#FF6B2C" stroke="#FFFDEE" strokeWidth="2.5" />
    <path d="M104 104V116M98 110H110" stroke="#FFFDEE" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * 6. ANTREAN TUGAS OPERATOR BERSIH ("All Caught Up!" Work-Queue)
 */
export const SpEmptyOperatorQueueIllustration: React.FC<SpEmptyIllustrationProps> = ({
  size = 160,
  className = '',
  ...props
}) => (
  <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="80" cy="82" r="56" fill="#E2FBCE" fillOpacity="0.65" />
    <ellipse cx="80" cy="136" rx="42" ry="6" fill="#06231D" fillOpacity="0.08" />

    {/* Task Board */}
    <rect x="44" y="34" width="72" height="86" rx="14" fill="#06231D" />
    <rect x="64" y="28" width="32" height="12" rx="6" fill="#076653" stroke="#FFFDEE" strokeWidth="2" />

    {/* Completed Task Rows */}
    {[54, 74, 94].map((y, idx) => (
      <g key={y}>
        <rect x="54" y={y} width="52" height="14" rx="5" fill="#0C342C" />
        <circle cx="62" cy={y + 7} r="4.5" fill="#E3EF26" />
        <path d={`M60 ${y + 7}L61.5 ${y + 8.5}L64.5 ${y + 5.5}`} stroke="#06231D" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="71" y={y + 5} width={idx === 1 ? 22 : 28} height="4" rx="2" fill="#E2FBCE" />
      </g>
    ))}

    {/* Floating Zero-Queue Star Badge */}
    <circle cx="114" cy="44" r="15" fill="#FF6B2C" stroke="#FFFDEE" strokeWidth="2.5" />
    <path d="M108 44.5L112 48.5L120 40" stroke="#FFFDEE" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 7. BELUM ADA NOTIFIKASI (Quiet Notification Bell)
 */
export const SpEmptyNotificationsIllustration: React.FC<SpEmptyIllustrationProps> = ({
  size = 160,
  className = '',
  ...props
}) => (
  <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="80" cy="84" r="54" fill="#E2FBCE" fillOpacity="0.55" />
    <ellipse cx="80" cy="136" rx="38" ry="6" fill="#06231D" fillOpacity="0.08" />

    {/* Bell Clapper */}
    <circle cx="80" cy="114" r="9" fill="#FF6B2C" />

    {/* Dimensional Bell Body */}
    <path
      d="M80 38C63.4 38 50 51.4 50 68V88L42 100C40.7 102 42.1 104.5 44.5 104.5H115.5C117.9 104.5 119.3 102 118 100L110 88V68C110 51.4 96.6 38 80 38Z"
      fill="#076653"
    />
    <path
      d="M80 38C96.6 38 110 51.4 110 68V88L118 100C119.3 102 117.9 104.5 115.5 104.5H80V38Z"
      fill="#06231D"
    />
    <circle cx="80" cy="34" r="6" fill="#E3EF26" />

    {/* Peaceful Sleeping Eyes on Bell */}
    <path d="M66 74C68 77 72 77 74 74" stroke="#FFFDEE" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M86 74C88 77 92 77 94 74" stroke="#E3EF26" strokeWidth="2.5" strokeLinecap="round" />

    {/* Floating Zzz */}
    <path d="M112 42H122L112 52H122" stroke="#076653" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M126 28H133L126 35H133" stroke="#FF6B2C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 8. PENCARIAN TIDAK DITEMUKAN (No Search / Filter Results)
 */
export const SpEmptySearchIllustration: React.FC<SpEmptyIllustrationProps> = ({
  size = 160,
  className = '',
  ...props
}) => (
  <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="80" cy="82" r="56" fill="#E2FBCE" fillOpacity="0.5" />
    <ellipse cx="80" cy="136" rx="42" ry="6" fill="#06231D" fillOpacity="0.08" />

    {/* Background Data Rows */}
    <rect x="34" y="42" width="76" height="22" rx="8" fill="#FFFDEE" stroke="#06231D" strokeWidth="2" />
    <rect x="44" y="50" width="36" height="6" rx="3" fill="#E2E8E5" />

    <rect x="34" y="72" width="76" height="22" rx="8" fill="#FFFDEE" stroke="#06231D" strokeWidth="2" />
    <rect x="44" y="80" width="24" height="6" rx="3" fill="#E2E8E5" />

    {/* Magnifying Glass */}
    <line x1="104" y1="100" x2="124" y2="120" stroke="#06231D" strokeWidth="9" strokeLinecap="round" />
    <line x1="104" y1="100" x2="124" y2="120" stroke="#FF6B2C" strokeWidth="5" strokeLinecap="round" />
    <circle cx="84" cy="80" r="26" fill="#076653" fillOpacity="0.9" stroke="#06231D" strokeWidth="3.5" />
    <circle cx="84" cy="80" r="19" fill="#06231D" />

    {/* Question Mark Inside Lens */}
    <path
      d="M79 74C79 70.7 81.7 68 85 68C88.3 68 91 70.7 91 74C91 76.8 88.5 78 86 79.5C85 80.1 85 81.5 85 83"
      stroke="#E3EF26"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <circle cx="85" cy="89" r="2" fill="#E3EF26" />
  </svg>
);

/**
 * 9. UNGGAH DOKUMEN STNK / KTP / FOTO KENDARAAN (Empty Document Dropzone)
 */
export const SpEmptyDocumentsIllustration: React.FC<SpEmptyIllustrationProps> = ({
  size = 160,
  className = '',
  ...props
}) => (
  <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="80" cy="82" r="56" fill="#E2FBCE" fillOpacity="0.55" />

    {/* OCR Viewfinder Frame */}
    <path
      d="M36 54V42C36 38.7 38.7 36 42 36H54M106 36H118C121.3 36 124 38.7 124 42V54M124 106V118C124 121.3 121.3 124 118 124H106M54 124H42C38.7 124 36 121.3 36 118V106"
      stroke="#076653"
      strokeWidth="3.5"
      strokeLinecap="round"
    />

    {/* ID / STNK Card */}
    <rect x="46" y="54" width="68" height="48" rx="10" fill="#06231D" />
    <rect x="54" y="64" width="18" height="18" rx="4" fill="#E2FBCE" />
    <rect x="78" y="64" width="28" height="5" rx="2.5" fill="#076653" />
    <rect x="78" y="74" width="20" height="5" rx="2.5" fill="#076653" />
    <rect x="54" y="88" width="52" height="5" rx="2.5" fill="#FFFDEE" />

    {/* Upload Cloud Arrow */}
    <circle cx="108" cy="102" r="16" fill="#E3EF26" stroke="#06231D" strokeWidth="2.5" />
    <path d="M108 109V95M108 95L102 101M108 95L114 101" stroke="#06231D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 10. BELUM ADA REWARDS / PROMO / VOUCHER (Empty Rewards & Coins)
 */
export const SpEmptyRewardsIllustration: React.FC<SpEmptyIllustrationProps> = ({
  size = 160,
  className = '',
  ...props
}) => (
  <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="80" cy="84" r="56" fill="#E2FBCE" fillOpacity="0.55" />
    <ellipse cx="80" cy="136" rx="40" ry="6" fill="#06231D" fillOpacity="0.08" />

    {/* Gift Box Base */}
    <rect x="46" y="72" width="68" height="50" rx="10" fill="#06231D" />
    <rect x="73" y="72" width="14" height="50" fill="#E3EF26" />

    {/* Gift Box Lid (Slightly Popped Open) */}
    <g transform="rotate(-6 80 62)">
      <rect x="40" y="54" width="80" height="16" rx="6" fill="#076653" />
      <rect x="73" y="54" width="14" height="16" fill="#E3EF26" />
    </g>

    {/* Ribbon Loops */}
    <path d="M80 52C70 38 56 42 62 52C66 56 80 52 80 52Z" fill="#FF6B2C" />
    <path d="M80 52C90 38 104 42 98 52C94 56 80 52 80 52Z" fill="#FF6B2C" />

    {/* Floating Star & Coin */}
    <circle cx="116" cy="42" r="8" fill="#E3EF26" stroke="#06231D" strokeWidth="2" />
    <circle cx="42" cy="46" r="5" fill="#FF6B2C" />
  </svg>
);

/**
 * 11. VERIFIKASI / TRANSAKSI BERHASIL (Success Celebration State)
 */
export const SpSuccessVerifiedIllustration: React.FC<SpEmptyIllustrationProps> = ({
  size = 160,
  className = '',
  ...props
}) => (
  <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="80" cy="80" r="58" fill="#E2FBCE" />
    <circle cx="80" cy="80" r="42" fill="#076653" />
    <circle cx="80" cy="80" r="30" fill="#06231D" />
    <path d="M67 80.5L76 89.5L95 70.5" stroke="#E3EF26" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />

    {/* Confetti Accents */}
    <circle cx="34" cy="44" r="5" fill="#FF6B2C" />
    <circle cx="128" cy="48" r="6" fill="#E3EF26" stroke="#06231D" strokeWidth="2" />
    <circle cx="30" cy="108" r="4" fill="#076653" />
    <circle cx="126" cy="112" r="5" fill="#FF6B2C" />
  </svg>
);

/**
 * 12. MODE OFFLINE / KONEKSI TERPUTUS (PWA Offline State)
 */
export const SpOfflineConnectionIllustration: React.FC<SpEmptyIllustrationProps> = ({
  size = 160,
  className = '',
  ...props
}) => (
  <svg width={size} height={size} viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="80" cy="82" r="56" fill="#E2FBCE" fillOpacity="0.4" />
    <path
      d="M52 104H110C121 104 130 95 130 84C130 73.8 122.3 65.4 112.4 64.2C108.6 49.2 95 38 78.8 38C59.6 38 44 53.6 44 72.8C36.2 75.2 30.5 82.5 30.5 91C30.5 101.5 39 104 52 104Z"
      fill="#06231D"
    />
    <circle cx="110" cy="102" r="15" fill="#FF6B2C" stroke="#FFFDEE" strokeWidth="3" />
    <path d="M104 96L116 108M116 96L104 108" stroke="#FFFDEE" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// ============================================================================
// REUSABLE SUREPATH 3.0 EMPTY STATE COMPONENT
// ============================================================================

export type SpEmptyStateVariant =
  | 'policies'
  | 'claims'
  | 'quotations'
  | 'wallet'
  | 'clients'
  | 'operator-queue'
  | 'notifications'
  | 'search'
  | 'documents'
  | 'rewards'
  | 'success'
  | 'offline';

export const ILLUSTRATION_MAP: Record<SpEmptyStateVariant, React.FC<SpEmptyIllustrationProps>> = {
  policies: SpEmptyPoliciesIllustration,
  claims: SpEmptyClaimsIllustration,
  quotations: SpEmptyQuotationsIllustration,
  wallet: SpEmptyWalletIllustration,
  clients: SpEmptyClientsIllustration,
  'operator-queue': SpEmptyOperatorQueueIllustration,
  notifications: SpEmptyNotificationsIllustration,
  search: SpEmptySearchIllustration,
  documents: SpEmptyDocumentsIllustration,
  rewards: SpEmptyRewardsIllustration,
  success: SpSuccessVerifiedIllustration,
  offline: SpOfflineConnectionIllustration,
};

export interface SpEmptyStateProps {
  variant: SpEmptyStateVariant;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
}

export const SpEmptyState: React.FC<SpEmptyStateProps> = ({
  variant,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false,
}) => {
  const Illustration = ILLUSTRATION_MAP[variant] ?? SpEmptySearchIllustration;

  return (
    <div
      className={`w-full rounded-3xl bg-white dark:bg-[#0C342C]/60 border border-[#E2E8E5] dark:border-white/10 text-center flex flex-col items-center justify-center ${
        compact ? 'p-6' : 'p-8 sm:p-12'
      }`}
    >
      <div className="mb-4 transition-transform duration-300 hover:scale-105">
        <Illustration size={compact ? 112 : 148} />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-[#06231D] dark:text-[#FFFDEE] max-w-md">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-white/70 max-w-md mt-1.5 leading-relaxed">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-5 py-2.5 rounded-xl bg-[#076653] hover:bg-[#06231D] text-white text-xs font-bold shadow-sm transition-all"
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-4 py-2.5 rounded-xl border border-[#E2E8E5] dark:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 text-xs font-semibold text-gray-700 dark:text-white transition-all"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
