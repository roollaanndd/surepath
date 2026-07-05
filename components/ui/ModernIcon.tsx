// ─── ModernIcon — Phosphor Icons wrapper for fancy/modern look ───────────────
//
// Phosphor Icons (https://phosphoricons.com/) provides 6 weight variants:
//   thin, light, regular, bold, fill, duotone
//
// The "duotone" variant gives the fancy, modern, two-tone look that
// Series-D apps (Mercury, Linear, Vercel) use. It renders the icon with a
// lighter background layer + darker foreground layer — perceived as more
// premium than flat Lucide icons.
//
// Usage:
//   import { ShieldCheckDuotone, CarDuotone, LightningDuotone } from './components/ui/ModernIcon';
//   <ShieldCheckDuotone size={32} className="text-ds-green" />
//
// For functional UI chrome (bottom nav, form fields, small icons), keep using
// Lucide — it's already installed, consistent, and lighter weight. Use
// ModernIcon for hero/feature/empty-state moments where the duotone look
// adds perceived quality.
//
// To keep the bundle small, we import only the icons we need by name. Add
// new icons to the imports below as needed.

import React from 'react';
import {
  // Trust / security
  ShieldCheck, ShieldStar, LockKey, Certificate, SealCheck,
  // Insurance / vehicle
  Car, CarProfile, Motorcycle, AirplaneTilt, Umbrella,
  // Money / payments
  Wallet, CurrencyCircleDollar, CreditCard, QrCode, Receipt,
  // Growth / agent
  TrendUp, Trophy, Medal, Crown, Target,
  // User / people
  User, Users, UserCircle, UserPlus,
  // Communication
  ChatCircle, ChatTeardropDots, Bell, BellRinging,
  // Documents
  FileText, Files, ClipboardText,
  // Status / feedback
  CheckCircle, Warning, Info, XCircle, Sparkle,
  // Time
  Clock, Calendar, CalendarCheck,
  // Misc utility
  Gear, MagnifyingGlass, Plus, Minus, ArrowRight, ArrowLeft,
  House, List, CaretRight, CaretDown,
} from '@phosphor-icons/react';

export type ModernIconVariant = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';

export interface ModernIconProps {
  size?: number;
  variant?: ModernIconVariant;
  className?: string;
  color?: string;
  'aria-label'?: string;
  'aria-hidden'?: boolean;
}

const baseProps = (size: number, variant: ModernIconVariant, className: string, color?: string, ariaLabel?: string, ariaHidden?: boolean) => ({
  size,
  weight: variant as any,  // Phosphor's `weight` accepts the same union
  className,
  color,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden ?? (ariaLabel ? undefined : true),
});

// ── Re-exported icon components (duotone by default) ────────────────────────
// Each is a thin wrapper so callers don't have to specify the variant every time.

export const ShieldCheckDuotone: React.FC<ModernIconProps & { name?: never }> = (p) =>
  <ShieldCheck {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const ShieldStarDuotone: React.FC<ModernIconProps> = (p) =>
  <ShieldStar {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const LockKeyDuotone: React.FC<ModernIconProps> = (p) =>
  <LockKey {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const CertificateDuotone: React.FC<ModernIconProps> = (p) =>
  <Certificate {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const CarDuotone: React.FC<ModernIconProps> = (p) =>
  <CarProfile {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const MotorcycleDuotone: React.FC<ModernIconProps> = (p) =>
  <Motorcycle {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const AirplaneDuotone: React.FC<ModernIconProps> = (p) =>
  <AirplaneTilt {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const UmbrellaDuotone: React.FC<ModernIconProps> = (p) =>
  <Umbrella {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const WalletDuotone: React.FC<ModernIconProps> = (p) =>
  <Wallet {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const CreditCardDuotone: React.FC<ModernIconProps> = (p) =>
  <CreditCard {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const QrCodeDuotone: React.FC<ModernIconProps> = (p) =>
  <QrCode {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const ReceiptDuotone: React.FC<ModernIconProps> = (p) =>
  <Receipt {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const TrendUpDuotone: React.FC<ModernIconProps> = (p) =>
  <TrendUp {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const TrophyDuotone: React.FC<ModernIconProps> = (p) =>
  <Trophy {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const MedalDuotone: React.FC<ModernIconProps> = (p) =>
  <Medal {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const CrownDuotone: React.FC<ModernIconProps> = (p) =>
  <Crown {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const TargetDuotone: React.FC<ModernIconProps> = (p) =>
  <Target {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const UserDuotone: React.FC<ModernIconProps> = (p) =>
  <User {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const UsersDuotone: React.FC<ModernIconProps> = (p) =>
  <Users {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const UserCircleDuotone: React.FC<ModernIconProps> = (p) =>
  <UserCircle {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const UserPlusDuotone: React.FC<ModernIconProps> = (p) =>
  <UserPlus {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const ChatDuotone: React.FC<ModernIconProps> = (p) =>
  <ChatCircle {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const BellDuotone: React.FC<ModernIconProps> = (p) =>
  <Bell {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const BellRingingDuotone: React.FC<ModernIconProps> = (p) =>
  <BellRinging {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const FileTextDuotone: React.FC<ModernIconProps> = (p) =>
  <FileText {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const FileCheckDuotone: React.FC<ModernIconProps> = (p) =>
  <SealCheck {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const CheckCircleDuotone: React.FC<ModernIconProps> = (p) =>
  <CheckCircle {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const WarningDuotone: React.FC<ModernIconProps> = (p) =>
  <Warning {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const InfoDuotone: React.FC<ModernIconProps> = (p) =>
  <Info {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const SparkleDuotone: React.FC<ModernIconProps> = (p) =>
  <Sparkle {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const ClockDuotone: React.FC<ModernIconProps> = (p) =>
  <Clock {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

export const CalendarCheckDuotone: React.FC<ModernIconProps> = (p) =>
  <CalendarCheck {...baseProps(p.size ?? 24, p.variant ?? 'duotone', p.className, p.color, p['aria-label'], p['aria-hidden'])} />;

// Re-export the raw Phosphor icons for callers who want full control
export {
  ShieldCheck, ShieldStar, LockKey, Certificate, SealCheck,
  Car, CarProfile, Motorcycle, AirplaneTilt, Umbrella,
  Wallet, CurrencyCircleDollar, CreditCard, QrCode, Receipt,
  TrendUp, Trophy, Medal, Crown, Target,
  User, Users, UserCircle, UserPlus,
  ChatCircle, ChatTeardropDots, Bell, BellRinging,
  FileText, Files, ClipboardText,
  CheckCircle, Warning, Info, XCircle, Sparkle,
  Clock, Calendar, CalendarCheck,
  Gear, MagnifyingGlass, Plus, Minus, ArrowRight, ArrowLeft,
  House, List, CaretRight, CaretDown,
};
