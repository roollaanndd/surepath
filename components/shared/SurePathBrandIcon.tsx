import React from 'react';

export interface SpIllustrationProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

/**
 * 1. SUREPATH BRAND SHIELD ("Your Path to Protection")
 */
export const SpShieldBrandIcon: React.FC<SpIllustrationProps> = ({ size = 64, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <rect x="6" y="6" width="52" height="52" rx="16" fill="#E2FBCE" fillOpacity="0.55" />
    <path d="M32 10L50 17.5V31.5C50 44.2 42.3 53.6 32 57C21.7 53.6 14 44.2 14 31.5V17.5L32 10Z" fill="#06231D" />
    <path d="M32 13L47 19.3V31.3C47 42.1 40.5 50.2 32 53.3V13Z" fill="#076653" />
    <path d="M22 40C24.5 32 29 29 35 27.5C39.5 26.3 42 23 43 19" stroke="#E3EF26" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="43" cy="19" r="3.5" fill="#FF6B2C" stroke="#FFFDEE" strokeWidth="1.5" />
    <circle cx="22" cy="40" r="2.5" fill="#E3EF26" />
  </svg>
);

/**
 * 2. CAR PROTECTION (Asuransi Mobil + AI Smart Scan)
 */
export const SpCarProtectionIcon: React.FC<SpIllustrationProps> = ({ size = 64, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="32" cy="32" r="26" fill="#E2FBCE" fillOpacity="0.6" />
    {/* Radar Scan Arc */}
    <path d="M16 22C24 14 40 14 48 22" stroke="#076653" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />
    {/* Shield Backdrop */}
    <path d="M32 12L46 17.5V28C46 37.5 39.8 44.2 32 47C24.2 44.2 18 37.5 18 28V17.5L32 12Z" fill="#0C342C" />
    {/* Car Body */}
    <path d="M17 35L21.5 25.5C22.3 23.9 23.9 23 25.7 23H38.3C40.1 23 41.7 23.9 42.5 25.5L47 35V44C47 45.7 45.7 47 44 47H20C18.3 47 17 45.7 17 44V35Z" fill="#076653" />
    <path d="M21 33L24 26.5H40L43 33H21Z" fill="#FFFDEE" />
    {/* Headlights in Electric Lime */}
    <rect x="20" y="36.5" width="6" height="3.5" rx="1.75" fill="#E3EF26" />
    <rect x="38" y="36.5" width="6" height="3.5" rx="1.75" fill="#E3EF26" />
    <rect x="28" y="37.5" width="8" height="2" rx="1" fill="#E2FBCE" />
    {/* Wheels */}
    <circle cx="23" cy="46" r="4.5" fill="#06231D" stroke="#FFFDEE" strokeWidth="1.5" />
    <circle cx="41" cy="46" r="4.5" fill="#06231D" stroke="#FFFDEE" strokeWidth="1.5" />
    {/* AI Scan Node */}
    <circle cx="47" cy="18" r="4" fill="#FF6B2C" />
    <path d="M45.5 18L46.7 19.2L49 16.8" stroke="#FFFDEE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 3. MOTORCYCLE PROTECTION (Asuransi Motor Komprehensif & TLO)
 */
export const SpMotoProtectionIcon: React.FC<SpIllustrationProps> = ({ size = 64, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <rect x="8" y="8" width="48" height="48" rx="18" fill="#E2FBCE" fillOpacity="0.6" />
    <circle cx="20" cy="42" r="7" fill="#06231D" stroke="#076653" strokeWidth="2.5" />
    <circle cx="20" cy="42" r="2.5" fill="#E3EF26" />
    <circle cx="45" cy="42" r="7" fill="#06231D" stroke="#076653" strokeWidth="2.5" />
    <circle cx="45" cy="42" r="2.5" fill="#E3EF26" />
    <path d="M20 42L27 29H36L40 36H29L25 42" fill="#076653" />
    <path d="M35 23H41L45 42" stroke="#0C342C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M23 29H33C34.7 29 36 30.3 36 32V33H21L23 29Z" fill="#06231D" />
    <circle cx="44" cy="26" r="3" fill="#E3EF26" />
    {/* Mini Shield Badge */}
    <path d="M26 14L33 17V22.5C33 26.8 30 29.8 26 31C22 29.8 19 26.8 19 22.5V17L26 14Z" fill="#FF6B2C" />
    <path d="M23.5 22L25.3 23.8L28.8 20.3" stroke="#FFFDEE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 4. TRAVEL SAFE (Asuransi Perjalanan & Direct Payout)
 */
export const SpTravelSafeIcon: React.FC<SpIllustrationProps> = ({ size = 64, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="30" cy="34" r="22" fill="#076653" />
    <path d="M12 34H48M30 12C35.5 18 38 26 38 34C38 42 35.5 50 30 56M30 12C24.5 18 22 26 22 34C22 42 24.5 50 30 56" stroke="#0C342C" strokeWidth="2" />
    {/* Orbit Path */}
    <path d="M12 46C20 26 36 20 52 16" stroke="#E3EF26" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 5" />
    {/* Stylized Jet */}
    <path d="M53 13L38 18L42 22L34 28L37 31L45 25L49 29L53 13Z" fill="#FFFDEE" stroke="#06231D" strokeWidth="1.5" strokeLinejoin="round" />
    {/* Instant Payout Tag */}
    <circle cx="46" cy="45" r="8" fill="#FF6B2C" />
    <path d="M43 45L45 47L49.5 42.5" stroke="#FFFDEE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 5. PERSONAL SAFETY (Kecelakaan Diri / Personal Accident)
 */
export const SpPersonalSafetyIcon: React.FC<SpIllustrationProps> = ({ size = 64, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M32 8L52 16V31C52 44.8 43.2 54.5 32 58C20.8 54.5 12 44.8 12 31V16L32 8Z" fill="#06231D" />
    <path d="M32 12L48 18.5V30.5C48 41.8 41 49.8 32 53V12Z" fill="#076653" />
    {/* Protected Person Silhouette */}
    <circle cx="32" cy="24" r="6" fill="#E3EF26" />
    <path d="M21 43C21 37.5 25.9 33 32 33C38.1 33 43 37.5 43 43V45H21V43Z" fill="#FFFDEE" />
    {/* Medical Cross Badge */}
    <circle cx="45" cy="44" r="8" fill="#FF6B2C" stroke="#FFFDEE" strokeWidth="2" />
    <path d="M45 40.5V47.5M41.5 44H48.5" stroke="#FFFDEE" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

/**
 * 6. ITEM SHIELD (Proteksi Barang, Gadget & Elektronik)
 */
export const SpItemShieldIcon: React.FC<SpIllustrationProps> = ({ size = 64, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <rect x="8" y="10" width="48" height="44" rx="16" fill="#E2FBCE" fillOpacity="0.65" />
    {/* Laptop / Tablet Base */}
    <rect x="14" y="18" width="28" height="22" rx="4" fill="#06231D" />
    <rect x="17" y="21" width="22" height="15" rx="2" fill="#076653" />
    <path d="M11 40H45L42 44H14L11 40Z" fill="#0C342C" />
    {/* Smartphone Foreground */}
    <rect x="34" y="22" width="16" height="28" rx="4" fill="#06231D" stroke="#FFFDEE" strokeWidth="2" />
    <rect x="37" y="26" width="10" height="19" rx="1.5" fill="#076653" />
    {/* Shield Overlay */}
    <path d="M42 29L46 31V35C46 38 44.3 40.2 42 41C39.7 40.2 38 38 38 35V31L42 29Z" fill="#E3EF26" />
    <circle cx="24" cy="14" r="3" fill="#FF6B2C" />
  </svg>
);

/**
 * 7. FAMILY HEALTH (Kesehatan Keluarga & AI Medical Assistant)
 */
export const SpFamilyHealthIcon: React.FC<SpIllustrationProps> = ({ size = 64, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="32" cy="32" r="25" fill="#E2FBCE" fillOpacity="0.6" />
    {/* Dimensional Heart */}
    <path d="M32 51C32 51 13 39.2 13 24.8C13 18.5 17.8 14 23.5 14C27.2 14 30.3 16 32 19C33.7 16 36.8 14 40.5 14C46.2 14 51 18.5 51 24.8C51 39.2 32 51 32 51Z" fill="#076653" />
    <path d="M32 51C32 51 51 39.2 51 24.8C51 18.5 46.2 14 40.5 14C36.8 14 33.7 16 32 19V51Z" fill="#06231D" />
    {/* ECG Pulse Line in Electric Lime */}
    <path d="M18 31H25L28 24L33 38L36.5 29H46" stroke="#E3EF26" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    {/* AI Sparkle Badge */}
    <circle cx="47" cy="17" r="6" fill="#FF6B2C" />
    <path d="M47 13.5V20.5M43.5 17H50.5" stroke="#FFFDEE" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * 8. CLIMATE SHIELD (Proteksi Iklim & Cuaca Ekstrem)
 */
export const SpClimateShieldIcon: React.FC<SpIllustrationProps> = ({ size = 64, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="24" cy="24" r="10" fill="#E3EF26" />
    {/* Protective Umbrella / Shield Canopy */}
    <path d="M14 36C14 25.5 22.5 17 33 17C43.5 17 52 25.5 52 36H14Z" fill="#076653" />
    <path d="M33 17C43.5 17 52 25.5 52 36H33V17Z" fill="#06231D" />
    <path d="M33 36V47C33 49.8 30.8 52 28 52C25.5 52 23.5 50 23.5 47.5" stroke="#06231D" strokeWidth="3.5" strokeLinecap="round" />
    {/* Raindrops deflected */}
    <path d="M18 44L16 49M25 44L23 49M43 44L41 49" stroke="#076653" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="48" cy="22" r="4" fill="#FF6B2C" />
  </svg>
);

/**
 * 9. STNK & KTP OCR SCANNER (Pemindai Dokumen Otomatis)
 */
export const SpStnkOcrIcon: React.FC<SpIllustrationProps> = ({ size = 64, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    {/* Viewfinder Corners */}
    <path d="M12 20V14C12 12.9 12.9 12 14 12H20M44 12H50C51.1 12 52 12.9 52 14V20M52 44V50C52 51.1 51.1 52 50 52H44M20 52H14C12.9 52 12 51.1 12 50V44" stroke="#076653" strokeWidth="3" strokeLinecap="round" />
    {/* STNK Card */}
    <rect x="16" y="18" width="32" height="28" rx="4" fill="#06231D" />
    <rect x="20" y="23" width="10" height="8" rx="1.5" fill="#E2FBCE" />
    <rect x="33" y="23" width="11" height="3" rx="1.5" fill="#076653" />
    <rect x="33" y="28" width="8" height="3" rx="1.5" fill="#076653" />
    <rect x="20" y="36" width="24" height="4" rx="2" fill="#FFFDEE" />
    {/* Laser Scan Line */}
    <line x1="10" y1="33" x2="54" y2="33" stroke="#E3EF26" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="50" cy="33" r="4" fill="#FF6B2C" />
  </svg>
);

/**
 * 10. AI VISUAL VEHICLE DAMAGE AUDIT (Deteksi Skor Kondisi Kendaraan)
 */
export const SpAiVehicleAuditIcon: React.FC<SpIllustrationProps> = ({ size = 64, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <rect x="8" y="10" width="48" height="44" rx="14" fill="#06231D" />
    {/* Wireframe Car Silhouette */}
    <path d="M16 36L20 26H44L48 36V42H16V36Z" fill="#076653" stroke="#E2FBCE" strokeWidth="1.5" />
    {/* AI Detection Bounding Boxes */}
    <rect x="18" y="32" width="10" height="8" rx="1.5" stroke="#E3EF26" strokeWidth="2" strokeDasharray="2 2" />
    <rect x="35" y="25" width="11" height="9" rx="1.5" stroke="#FF6B2C" strokeWidth="2" />
    {/* AI Eye / Sparkle */}
    <circle cx="46" cy="18" r="4" fill="#E3EF26" />
    <path d="M18 19H28" stroke="#E2FBCE" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * 11. INSTANT OJK QUOTE & QR E-QUOTATION
 */
export const SpInstantQuoteIcon: React.FC<SpIllustrationProps> = ({ size = 64, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <rect x="14" y="8" width="34" height="46" rx="6" fill="#06231D" />
    <rect x="18" y="12" width="26" height="38" rx="3" fill="#FFFDEE" />
    <rect x="22" y="17" width="18" height="4" rx="2" fill="#076653" />
    <rect x="22" y="24" width="12" height="3" rx="1.5" fill="#0C342C" fillOpacity="0.4" />
    {/* Mini QR Code Box */}
    <rect x="22" y="31" width="12" height="12" rx="2" fill="#06231D" />
    <rect x="24" y="33" width="3" height="3" fill="#E3EF26" />
    <rect x="29" y="33" width="3" height="3" fill="#FFFDEE" />
    <rect x="24" y="38" width="3" height="3" fill="#FFFDEE" />
    <rect x="29" y="38" width="3" height="3" fill="#E3EF26" />
    {/* Lightning Badge */}
    <circle cx="46" cy="42" r="10" fill="#FF6B2C" />
    <path d="M47 36L42 43H46.5L45 48L50 41H45.5L47 36Z" fill="#E3EF26" />
  </svg>
);

/**
 * 12. FAST CLAIM TRACKER (Pengajuan & Pelacakan Klaim)
 */
export const SpFastClaimIcon: React.FC<SpIllustrationProps> = ({ size = 64, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <circle cx="32" cy="32" r="24" fill="#E2FBCE" />
    <path d="M32 12C43 12 52 21 52 32C52 43 43 52 32 52C21 52 12 43 12 32" stroke="#076653" strokeWidth="4" strokeLinecap="round" />
    <circle cx="32" cy="32" r="15" fill="#06231D" />
    <path d="M26 32.5L30.5 37L39 27.5" stroke="#E3EF26" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="17" cy="18" r="4.5" fill="#FF6B2C" />
  </svg>
);

/**
 * 13. AGENT WALLET, COMMISSION & COINS (Dompet Komisi Real-Time)
 */
export const SpWalletCommissionIcon: React.FC<SpIllustrationProps> = ({ size = 64, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    {/* Floating Gold/Lime Coins */}
    <circle cx="26" cy="16" r="7" fill="#E3EF26" stroke="#06231D" strokeWidth="2" />
    <circle cx="38" cy="14" r="6" fill="#FF6B2C" stroke="#FFFDEE" strokeWidth="1.5" />
    {/* Wallet Body */}
    <rect x="10" y="20" width="44" height="32" rx="8" fill="#06231D" />
    <path d="M10 28C10 23.6 13.6 20 18 20H46C50.4 20 54 23.6 54 28V31H10V28Z" fill="#076653" />
    {/* Wallet Clasp */}
    <rect x="38" y="31" width="16" height="11" rx="4" fill="#E2FBCE" />
    <circle cx="43.5" cy="36.5" r="2.5" fill="#06231D" />
    <path d="M18 42H30" stroke="#E3EF26" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/**
 * 14. OJK COMPLIANCE & VERIFIED SECURITY
 */
export const SpVerifiedSecurityIcon: React.FC<SpIllustrationProps> = ({ size = 64, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M32 8L50 15V30C50 43 42.2 52.8 32 56C21.8 52.8 14 43 14 30V15L32 8Z" fill="#076653" />
    <rect x="23" y="28" width="18" height="15" rx="3.5" fill="#FFFDEE" />
    <path d="M27 28V24C27 21.2 29.2 19 32 19C34.8 19 37 21.2 37 24V28" stroke="#E3EF26" strokeWidth="3" strokeLinecap="round" />
    <circle cx="32" cy="35" r="2.5" fill="#06231D" />
  </svg>
);

/**
 * 15. PORTAL ICON: ADMIN COMMAND CMS
 */
export const SpPortalAdminIcon: React.FC<SpIllustrationProps> = ({ size = 64, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <rect x="8" y="10" width="48" height="44" rx="12" fill="#06231D" />
    <rect x="15" y="34" width="7" height="12" rx="2" fill="#076653" />
    <rect x="26" y="26" width="7" height="20" rx="2" fill="#E2FBCE" />
    <rect x="37" y="18" width="7" height="28" rx="2" fill="#E3EF26" />
    <path d="M16 25L27 19L39 14" stroke="#FF6B2C" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="39" cy="14" r="3" fill="#FF6B2C" />
  </svg>
);

/**
 * 16. PORTAL ICON: AGENT STUDIO
 */
export const SpPortalAgentIcon: React.FC<SpIllustrationProps> = ({ size = 64, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <rect x="10" y="18" width="44" height="34" rx="9" fill="#0C342C" />
    <path d="M24 18V14C24 11.8 25.8 10 28 10H36C38.2 10 40 11.8 40 14V18" stroke="#076653" strokeWidth="3.5" />
    <path d="M10 31L32 37L54 31" stroke="#E2FBCE" strokeWidth="2" />
    <rect x="27" y="31" width="10" height="8" rx="2" fill="#E3EF26" />
    <circle cx="48" cy="18" r="6" fill="#FF6B2C" />
  </svg>
);

/**
 * 17. PORTAL ICON: CUSTOMER PROTECTION
 */
export const SpPortalCustomerIcon: React.FC<SpIllustrationProps> = ({ size = 64, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M32 10L52 26V50C52 52.2 50.2 54 48 54H16C13.8 54 12 52.2 12 50V26L32 10Z" fill="#076653" />
    <path d="M32 22L44 27V36C44 43 38.8 48.2 32 50C25.2 48.2 20 43 20 36V27L32 22Z" fill="#06231D" />
    <path d="M27.5 36L30.8 39.2L37 33" stroke="#E3EF26" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * 18. PORTAL ICON: OPERATOR WORK-QUEUE
 */
export const SpPortalOperatorIcon: React.FC<SpIllustrationProps> = ({ size = 64, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <rect x="10" y="12" width="44" height="40" rx="10" fill="#06231D" />
    <rect x="17" y="20" width="18" height="4" rx="2" fill="#E2FBCE" />
    <rect x="17" y="30" width="24" height="4" rx="2" fill="#076653" />
    <rect x="17" y="40" width="14" height="4" rx="2" fill="#076653" />
    <circle cx="44" cy="22" r="4" fill="#E3EF26" />
    <circle cx="44" cy="42" r="4" fill="#FF6B2C" />
  </svg>
);

/**
 * 19. PORTAL ICON: INSURER UNDERWRITING HUB
 */
export const SpPortalInsurerIcon: React.FC<SpIllustrationProps> = ({ size = 64, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <path d="M32 10L54 22H10L32 10Z" fill="#076653" />
    <rect x="15" y="25" width="6" height="21" rx="2" fill="#06231D" />
    <rect x="29" y="25" width="6" height="21" rx="2" fill="#06231D" />
    <rect x="43" y="25" width="6" height="21" rx="2" fill="#06231D" />
    <rect x="10" y="48" width="44" height="6" rx="3" fill="#0C342C" />
    <circle cx="32" cy="17" r="3" fill="#E3EF26" />
  </svg>
);

/**
 * 20. PORTAL ICON: B2B & FLEET CORPORATE PORTAL
 */
export const SpPortalB2bIcon: React.FC<SpIllustrationProps> = ({ size = 64, className = '', ...props }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
    <rect x="12" y="12" width="22" height="40" rx="5" fill="#06231D" />
    <rect x="30" y="22" width="22" height="30" rx="5" fill="#076653" />
    <rect x="17" y="18" width="5" height="5" rx="1" fill="#E3EF26" />
    <rect x="17" y="27" width="5" height="5" rx="1" fill="#E2FBCE" />
    <rect x="36" y="28" width="5" height="5" rx="1" fill="#FFFDEE" />
    <rect x="36" y="37" width="5" height="5" rx="1" fill="#E3EF26" />
    <circle cx="48" cy="16" r="5" fill="#FF6B2C" />
  </svg>
);

type BrandIconProps = { id: string; size?: number; className?: string; active?: boolean };

/**
 * Maps an Icon Manager id to one of the bespoke "Brand" illustrations above.
 * Ids with no dedicated brand artwork fall back to the generic illustrative set,
 * loaded lazily to avoid a require cycle with PathyNavIcon.
 */
const BRAND_ICON_BY_ID: Record<string, React.FC<SpIllustrationProps>> = {
  car_protection: SpCarProtectionIcon,
  travel_safe: SpTravelSafeIcon,
  personal_safety: SpPersonalSafetyIcon,
  item_shield: SpItemShieldIcon,
  family_health: SpFamilyHealthIcon,
  quotes: SpInstantQuoteIcon,
  claims: SpFastClaimIcon,
  claims_admin: SpFastClaimIcon,
  commission: SpWalletCommissionIcon,
  commission_ledger: SpWalletCommissionIcon,
  withdraw: SpWalletCommissionIcon,
  withdrawals: SpWalletCommissionIcon,
  security: SpVerifiedSecurityIcon,
  documents: SpStnkOcrIcon,
  vehicle_pricelist: SpAiVehicleAuditIcon,
};

export const PORTAL_BRAND_ICONS = {
  ADMIN: SpPortalAdminIcon,
  AGENT: SpPortalAgentIcon,
  CUSTOMER: SpPortalCustomerIcon,
  OPERATOR: SpPortalOperatorIcon,
  INSURER: SpPortalInsurerIcon,
  B2B: SpPortalB2bIcon,
} as const;

export default function SurePathBrandIcon({ id, size = 48, className = '' }: BrandIconProps) {
  const Art = BRAND_ICON_BY_ID[id] ?? SpShieldBrandIcon;
  return <Art size={size} className={className} />;
}
