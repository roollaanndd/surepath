// ─── Shared status metadata map ─────────────────────────────────────────────
// Single source of truth for order/policy/claim status labels + colors + glyphs.
// Previously, Operator used ds-green, Insurer used purple, Admin used emerald-500/10
// for the same ISSUED status — 3 different visuals for the same data.
// Now all apps import from here for consistency.
//
// v2.8.7 (port dari branch desain v3 yang tertinggal):
//  - Icon: setiap status punya bentuk sendiri, bukan hanya warna — badge tetap
//    terbaca bagi pengguna buta warna dan ketika dua status memakai keluarga
//    warna yang sama.
//  - UNDER_REVIEW order kini biru (sebelumnya persis sama dengan SUBMITTED —
//    dua status berbeda tak terbedakan). ISSUED/PAID sedikit lebih pekat agar
//    tidak identik dengan APPROVED.
//  - CLAIM menambahkan CLOSED (ada di union SpClaim['status'], sebelumnya hanya
//    dipetakan lokal di AgentClaims).
//
// Frontend-only: mengimpor lucide-react, jangan diimpor dari kode server.

import {
  Clock, Eye, CheckCircle, FileText, XCircle, Ban, AlertCircle, BadgeCheck,
  type LucideIcon,
} from 'lucide-react';

export interface StatusMeta {
  label: string;        // Indonesian label (most common)
  labelEn: string;      // English label
  badgeClass: string;   // Tailwind classes for badge background + text
  Icon?: LucideIcon;    // shape signal — distinguishes statuses that share a color family
}

export const ORDER_STATUS_META: Record<string, StatusMeta> = {
  SUBMITTED: {
    label: 'Diajukan',
    labelEn: 'Submitted',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    Icon: Clock,
  },
  UNDER_REVIEW: {
    label: 'Ditinjau',
    labelEn: 'Under Review',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
    Icon: Eye,
  },
  APPROVED: {
    label: 'Disetujui',
    labelEn: 'Approved',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
    Icon: CheckCircle,
  },
  ISSUED: {
    label: 'Polis Aktif',
    labelEn: 'Policy Active',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    Icon: FileText,
  },
  REJECTED: {
    label: 'Ditolak',
    labelEn: 'Rejected',
    badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    Icon: XCircle,
  },
  CANCELLED: {
    label: 'Dibatalkan',
    labelEn: 'Cancelled',
    badgeClass: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    Icon: Ban,
  },
};

export const CLAIM_STATUS_META: Record<string, StatusMeta> = {
  SUBMITTED: {
    label: 'Diajukan',
    labelEn: 'Submitted',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    Icon: Clock,
  },
  UNDER_REVIEW: {
    label: 'Ditinjau',
    labelEn: 'Under Review',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
    Icon: AlertCircle,
  },
  APPROVED: {
    label: 'Disetujui',
    labelEn: 'Approved',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
    Icon: CheckCircle,
  },
  REJECTED: {
    label: 'Ditolak',
    labelEn: 'Rejected',
    badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    Icon: XCircle,
  },
  // PAID is the real terminal "claim settled" state the gateway allows
  // (admin_update_claim allowlist).
  PAID: {
    label: 'Dibayarkan',
    labelEn: 'Paid',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    Icon: BadgeCheck,
  },
  CLOSED: {
    label: 'Ditutup',
    labelEn: 'Closed',
    badgeClass: 'bg-slate-100 text-slate-500 dark:bg-slate-500/20 dark:text-slate-400',
    Icon: FileText,
  },
};

export const COMMISSION_STATUS_META: Record<string, StatusMeta> = {
  PENDING: {
    label: 'Pending',
    labelEn: 'Pending',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    Icon: Clock,
  },
  PAID: {
    label: 'Dibayar',
    labelEn: 'Paid',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    Icon: BadgeCheck,
  },
  CANCELLED: {
    label: 'Dibatalkan',
    labelEn: 'Cancelled',
    badgeClass: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    Icon: Ban,
  },
};

// Helper: get status meta with fallback
export function getStatusMeta(status: string, map: Record<string, StatusMeta> = ORDER_STATUS_META): StatusMeta {
  return map[status] ?? {
    label: status,
    labelEn: status,
    badgeClass: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  };
}
