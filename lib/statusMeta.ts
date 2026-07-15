// ─── Shared status metadata map ─────────────────────────────────────────────
// Single source of truth for order/policy/claim status labels + colors.
// Previously, Operator used ds-green, Insurer used purple, Admin used emerald-500/10
// for the same ISSUED status — 3 different visuals for the same data.
// Now all apps import from here for consistency.

export interface StatusMeta {
  label: string;        // Indonesian label (most common)
  labelEn: string;      // English label
  badgeClass: string;   // Tailwind classes for badge background + text
}

export const ORDER_STATUS_META: Record<string, StatusMeta> = {
  SUBMITTED: {
    label: 'Diajukan',
    labelEn: 'Submitted',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  },
  UNDER_REVIEW: {
    label: 'Ditinjau',
    labelEn: 'Under Review',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  },
  APPROVED: {
    label: 'Disetujui',
    labelEn: 'Approved',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  },
  ISSUED: {
    label: 'Polis Aktif',
    labelEn: 'Policy Active',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  },
  REJECTED: {
    label: 'Ditolak',
    labelEn: 'Rejected',
    badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400',
  },
  CANCELLED: {
    label: 'Dibatalkan',
    labelEn: 'Cancelled',
    badgeClass: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  },
};

export const CLAIM_STATUS_META: Record<string, StatusMeta> = {
  SUBMITTED: {
    label: 'Diajukan',
    labelEn: 'Submitted',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  },
  UNDER_REVIEW: {
    label: 'Ditinjau',
    labelEn: 'Under Review',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  },
  APPROVED: {
    label: 'Disetujui',
    labelEn: 'Approved',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  },
  REJECTED: {
    label: 'Ditolak',
    labelEn: 'Rejected',
    badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400',
  },
  PAID: {
    label: 'Dibayarkan',
    labelEn: 'Paid',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  },
};

export const COMMISSION_STATUS_META: Record<string, StatusMeta> = {
  PENDING: {
    label: 'Pending',
    labelEn: 'Pending',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  },
  PAID: {
    label: 'Dibayar',
    labelEn: 'Paid',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  },
  CANCELLED: {
    label: 'Dibatalkan',
    labelEn: 'Cancelled',
    badgeClass: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
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
