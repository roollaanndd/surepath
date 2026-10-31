// Notifikasi admin: ikon per tipe + waktu relatif.
//
// Diekstrak dari AdminPortal (Admin Portal 2.0, 2026-10-31) supaya satu
// sumber kebenaran dipakai baik oleh panel bell di header maupun kartu
// "Aktivitas Terbaru" di dashboard — sebelumnya logiknya hanya ada di
// AdminPortal dan dashboard tidak menerima notifikasi sama sekali.

export interface AdminNotifMeta {
  /** Icon Manager id — rendered with ModuleIcon (SurePath illustrated set). */
  iconId: string;
  cls: string;
}

// Tipe nyata yang dikirim data-gateway ke sp_admin_notifications. Tipe tak
// dikenal jatuh ke Info; prefiks umum tetap dicocokkan supaya tipe baru dari
// backend tidak tampil tanpa ikon.
const ADMIN_NOTIF_META: Record<string, AdminNotifMeta> = {
  NEW_ORDER:          { iconId: 'policy_orders', cls: 'text-ds-blue' },
  NEW_CLAIM:          { iconId: 'claims_admin', cls: 'text-ds-blue' },
  CLAIM_FRAUD_ALERT:  { iconId: 'security', cls: 'text-rose-700 dark:text-rose-200' },
  POLICY_ISSUED:      { iconId: 'policy', cls: 'text-ds-green' },
  ORDER_REJECTED:     { iconId: 'approvals', cls: 'text-rose-700 dark:text-rose-200' },
  ORDER_CANCELLED:    { iconId: 'policy_orders', cls: 'text-ds-ink3' },
  AGENT_VERIFIED:     { iconId: 'agents', cls: 'text-ds-green' },
  AGENT_REJECTED:     { iconId: 'agents', cls: 'text-rose-700 dark:text-rose-200' },
  NEW_AGENT:          { iconId: 'agents', cls: 'text-ds-green' },
  NEW_CUSTOMER:       { iconId: 'clients', cls: 'text-ds-blue' },
  NEW_ADMIN:          { iconId: 'user_mgmt', cls: 'text-ds-blue' },
  SECURITY:           { iconId: 'security', cls: 'text-rose-700 dark:text-rose-200' },
  SYSTEM:             { iconId: 'settings', cls: 'text-ds-ink3' },
};

export function adminNotifMeta(type: string): AdminNotifMeta {
  if (ADMIN_NOTIF_META[type]) return ADMIN_NOTIF_META[type];
  if (type.startsWith('INSURER_')) return { iconId: 'insurers', cls: 'text-ds-blue' };
  if (type.startsWith('CLAIM_'))   return { iconId: 'claims_admin', cls: 'text-ds-blue' };
  if (type.startsWith('ORDER_'))   return { iconId: 'policy_orders', cls: 'text-ds-blue' };
  if (type.startsWith('NEW_'))     return { iconId: 'users', cls: 'text-ds-green' };
  return { iconId: 'notifications', cls: 'text-ds-ink3' };
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
