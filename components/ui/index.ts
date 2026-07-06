// ─── SurePath UI Library — World-Class Component Primitives ──────────────────
//
// Single import surface for the new design system primitives. Each component
// consumes only the v3 design tokens (no inline styles allowed) and meets
// WCAG AA accessibility standards.
//
// Migration guide (existing components → ui/ primitives):
//   - <button className="bg-emerald-500 ...">  →  <Button variant="primary">
//   - <button className="w-8 h-8 ..."><Icon/></button>  →  <IconButton aria-label="...">
//   - <div className="rounded-2xl border ...">  →  <Card>
//   - alert('...')  →  toast.error('...')
//   - window.confirm('...')  →  const ok = await confirm({ ... })
//   - <div className="animate-spin ...">  →  <SkeletonCard />

export { Button, type ButtonProps } from './Button';
export { IconButton, type IconButtonProps } from './IconButton';
export { Card, type CardProps } from './Card';
export { ToastProvider, useToast } from './Toast';
export { ConfirmDialogProvider, useConfirmDialog } from './ConfirmDialog';
export { Skeleton, SkeletonCard, SkeletonList, SkeletonText } from './Skeleton';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { useHaptic, type HapticPattern } from './useHaptic';

// Modern duotone icon system (Phosphor Icons) — for hero/feature moments
export {
  ShieldCheckDuotone, ShieldStarDuotone, LockKeyDuotone, CertificateDuotone,
  CarDuotone, MotorcycleDuotone, AirplaneDuotone, UmbrellaDuotone,
  WalletDuotone, CreditCardDuotone, QrCodeDuotone, ReceiptDuotone,
  TrendUpDuotone, TrophyDuotone, MedalDuotone, CrownDuotone, TargetDuotone,
  UserDuotone, UsersDuotone, UserCircleDuotone, UserPlusDuotone,
  ChatDuotone, BellDuotone, BellRingingDuotone,
  FileTextDuotone, FileCheckDuotone,
  CheckCircleDuotone, WarningDuotone, InfoDuotone, SparkleDuotone,
  ClockDuotone, CalendarCheckDuotone,
} from './ModernIcon';

// Trust signals — drop into headers at conversion moments
export { OjkBadge, EncryptionBadge, LicensedInsurersBadge, TrustBar } from './TrustBadges';

// Floating WhatsApp button — for marketing pages only
export { FloatingWhatsApp } from './FloatingWhatsApp';

// ── Modern patterns (Livin' / Astro inspired) ───────────────────────────────
// Claymorphism card — soft, rounded, tangible. For hero moments.
export { ClayCard, type ClayCardProps } from './ClayCard';
// Livin'-style circular action grid (4-col, icon + label)
export { CircularActionGrid, type CircularAction, type CircularActionGridProps } from './CircularActionGrid';
// Floating action button — primary CTA above the bottom nav
export { FAB, type FABProps } from './FAB';
// Underline tabs — Livin'/Astro-style horizontal tab navigation
export { UnderlineTabs, type UnderlineTab, type UnderlineTabsProps } from './UnderlineTabs';
// "Sedang Ramai" live badge — pulsing dot + count for social proof
export { LiveBadge, type LiveBadgeProps } from './LiveBadge';
