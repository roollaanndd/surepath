// Notifikasi admin: ikon per tipe + waktu relatif.
//
// Diekstrak dari AdminPortal (Admin Portal 2.0, 2026-10-31) supaya satu
// sumber kebenaran dipakai baik oleh panel bell di header maupun kartu
// "Aktivitas Terbaru" di dashboard — sebelumnya logiknya hanya ada di
// AdminPortal dan dashboard tidak menerima notifikasi sama sekali.

import type { ComponentType } from 'react';
import {
  AlertTriangle, BadgeCheck, Building2, ClipboardList, FileText, Info,
  ShieldCheck, UserPlus, UserX, XCircle,
} from 'lucide-react';

export interface AdminNotifMeta {
  Icon: ComponentType<{ size?: number; className?: string }>;
  cls: string;
}

// Tipe nyata yang dikirim data-gateway ke sp_admin_notifications. Tipe tak
// dikenal jatuh ke Info; prefiks umum tetap dicocokkan supaya tipe baru dari
// backend tidak tampil tanpa ikon.
const ADMIN_NOTIF_META: Record<string, AdminNotifMeta> = {
  NEW_ORDER:          { Icon: ClipboardList, cls: 'text-ds-blue' },
  NEW_CLAIM:          { Icon: FileText,      cls: 'text-ds-blue' },
  CLAIM_FRAUD_ALERT:  { Icon: AlertTriangle, cls: 'text-rose-700 dark:text-rose-200' },
  POLICY_ISSUED:      { Icon: ShieldCheck,   cls: 'text-ds-green' },
  ORDER_REJECTED:     { Icon: XCircle,       cls: 'text-rose-700 dark:text-rose-200' },
  ORDER_CANCELLED:    { Icon: XCircle,       cls: 'text-ds-ink3' },
  AGENT_VERIFIED:     { Icon: BadgeCheck,    cls: 'text-ds-green' },
  AGENT_REJECTED:     { Icon: UserX,         cls: 'text-rose-700 dark:text-rose-200' },
  NEW_AGENT:          { Icon: UserPlus,      cls: 'text-ds-green' },
  NEW_CUSTOMER:       { Icon: UserPlus,      cls: 'text-ds-blue' },
  NEW_ADMIN:          { Icon: UserPlus,      cls: 'text-ds-blue' },
  SECURITY:           { Icon: AlertTriangle, cls: 'text-rose-700 dark:text-rose-200' },
  SYSTEM:             { Icon: Info,          cls: 'text-ds-ink3' },
};

export function adminNotifMeta(type: string): AdminNotifMeta {
  if (ADMIN_NOTIF_META[type]) return ADMIN_NOTIF_META[type];
  if (type.startsWith('INSURER_')) return { Icon: Building2, cls: 'text-ds-blue' };
  if (type.startsWith('CLAIM_'))   return { Icon: FileText, cls: 'text-ds-blue' };
  if (type.startsWith('ORDER_'))   return { Icon: ClipboardList, cls: 'text-ds-blue' };
  if (type.startsWith('NEW_'))     return { Icon: UserPlus, cls: 'text-ds-green' };
  return { Icon: Info, cls: 'text-ds-ink3' };
}

export function adminNotifTimeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'Baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hr lalu`;
}
