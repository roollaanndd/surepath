// ─── Push Notification Service ───────────────────────────────────────────────
//
// Lock-screen push notifications are deferred to a future sprint (requires
// Firebase Cloud Messaging setup — see docs/AUDIT_2026-07-06.md).
//
// In-app notifications (the bell icon in the header) work without this service
// — they use sp_notifications + sp_admin_notifications tables directly.
//
// This stub keeps the import surface stable so callers don't break.

export const initializePushNotifications = async () => {
  // No-op — push notifications not configured. See AUDIT_2026-07-06.md.
};

export async function requestNotificationPermission(_userId: string): Promise<string | null> {
  return null;
}

export function onForegroundMessage(_callback: (payload: any) => void): () => void {
  return () => {};
}

export async function unregisterPushNotifications(): Promise<void> {
  // No-op
}
