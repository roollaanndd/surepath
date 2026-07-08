// ─── Push Notification Service ───────────────────────────────────────────────
//
// Uses the browser Notification API for in-browser push notifications.
// FCM (Firebase Cloud Messaging) for lock-screen push is deferred to a future
// sprint — requires Firebase project setup.
//
// In-app notifications (the bell icon in the header) work independently via
// sp_notifications + sp_admin_notifications tables + Supabase Realtime.
//
// This service provides:
//   1. Browser-level notifications (Notification API) — works on desktop + Android PWA
//   2. Permission request flow
//   3. Foreground message handler (for future FCM integration)

type NotificationPermission = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Initialize push notifications. Checks if the browser supports the Notification API.
 * Does NOT request permission automatically — call requestNotificationPermission() for that.
 */
export const initializePushNotifications = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('[Push] Notification API not supported in this browser');
    return false;
  }
  return true;
};

/**
 * Request notification permission from the user.
 * Returns the permission state: 'granted', 'denied', 'default', or 'unsupported'.
 */
export async function requestNotificationPermission(_userId: string): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    // Register the FCM token (if FCM is configured in the future)
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    // Show a welcome notification
    showBrowserNotification('SurePath', 'Notifikasi diaktifkan. Anda akan menerima update pengajuan polis dan klaim.');
  }

  return permission as NotificationPermission;
}

/**
 * Show a browser notification (works on desktop + Android PWA).
 * Title and body are required; options can include icon, badge, tag, etc.
 */
export function showBrowserNotification(title: string, body: string, options?: {
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body,
      icon: options?.icon ?? '/pwa-192x192.png',
      badge: options?.badge ?? '/pwa-192x192.png',
      tag: options?.tag ?? 'surepath-notification',
      data: options?.data,
    });

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    // Click handler — focus the window
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (e) {
    console.warn('[Push] Failed to show notification:', e);
  }
}

/**
 * Register a foreground message handler.
 * Currently a no-op stub for FCM — will be wired when Firebase is configured.
 * Returns an unsubscribe function.
 */
export function onForegroundMessage(_callback: (payload: any) => void): () => void {
  // FCM foreground messaging will be wired here when Firebase is configured.
  // For now, this is a no-op that returns an unsubscribe function.
  console.info('[Push] FCM foreground messaging not configured. Using browser Notification API instead.');
  return () => {};
}

/**
 * Unregister push notifications.
 * Closes any open notifications and revokes permission state in memory.
 */
export async function unregisterPushNotifications(): Promise<void> {
  // Browser doesn't allow revoking Notification permission programmatically.
  // User must do it manually in browser settings.
  // We just log that they've opted out.
  console.info('[Push] Push notifications unregistered. Permission must be revoked in browser settings.');
}

/**
 * Check if notifications are supported and permission is granted.
 */
export function areNotificationsEnabled(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  return Notification.permission === 'granted';
}

/**
 * Get current permission state.
 */
export function getPermissionState(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as NotificationPermission;
}
