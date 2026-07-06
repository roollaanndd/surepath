// ─── Push Notification Service (FCM via Firebase) ────────────────────────────
//
// Implements web push notifications using Firebase Cloud Messaging (FCM).
// Customers + agents receive lock-screen notifications for:
//   - Payment confirmed (PAID)
//   - Policy issued (ISSUED)
//   - Claim status update
//   - Withdrawal approved/disbursed
//   - Referral reward received
//
// Flow:
//   1. On first login, request Notification permission
//   2. Get FCM token via Firebase Messaging
//   3. Store token on sp_users.fcm_token via data-gateway
//   4. Edge functions (xendit-webhook, etc.) send push via FCM API
//
// The FCM token is stored per-device. Multiple devices per user are supported
// by appending to an array (or replacing — simpler for v1).
//
// Firebase config is in firebase-blueprint.json — Vite imports it via env vars.

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, deleteToken, isSupported } from 'firebase/messaging';
import { supabase } from './supabaseService';

// Firebase config — sourced from environment variables set in Vercel.
// These are public-facing config values (not secrets) — Firebase web config
// is designed to be visible in the client bundle. Security comes from
// FCM server key + Firestore Security Rules, not from hiding this config.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: ReturnType<typeof initializeApp> | null = null;
let messaging: ReturnType<typeof getMessaging> | null = null;
let initialized = false;

/**
 * Initialize Firebase + FCM messaging. Safe to call multiple times.
 * Returns false if FCM is not supported in this environment (e.g., iOS Safari
 * without PWA install, or insecure context).
 */
async function init(): Promise<boolean> {
  if (initialized) return messaging !== null;
  initialized = true;

  // Check if all required config values are present
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.messagingSenderId) {
    console.warn('[push] Firebase config incomplete — push notifications disabled');
    return false;
  }

  // Check if FCM is supported (requires service worker + secure context)
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('[push] FCM not supported in this browser');
      return false;
    }
    app = initializeApp(firebaseConfig);
    messaging = getMessaging(app);
    return true;
  } catch (e) {
    console.warn('[push] Firebase init failed:', e);
    return false;
  }
}

/**
 * Request notification permission + get FCM token.
 * Called after first login (don't prompt before the user has context).
 *
 * @param userId  The Supabase auth user ID — used to store the token server-side
 * @returns       The FCM token if successful, null if denied/unsupported
 */
export async function requestNotificationPermission(_userId: string): Promise<string | null> {
  const ok = await init();
  if (!ok || !messaging) return null;

  // Check if permission is already granted
  if (Notification.permission === 'denied') {
    console.warn('[push] Permission previously denied');
    return null;
  }

  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[push] Permission not granted');
      return null;
    }
  }

  try {
    // Get the FCM token — this requires a service worker registered at /firebase-messaging-sw.js
    // VitePWA registers a service worker; we need to register the FCM SW separately
    // or configure VitePWA to include the FCM messaging handler.
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
    });

    if (token) {
      // Store the token on the user's profile via data-gateway
      await supabase.functions.invoke('data-gateway', {
        body: { action: 'update_fcm_token', params: { token } },
      });
      console.log('[push] FCM token registered');
      return token;
    }
  } catch (e) {
    console.warn('[push] getToken failed:', e);
  }
  return null;
}

/**
 * Listen for foreground messages (when the app is open).
 * Shows an in-app toast for incoming notifications.
 */
export function onForegroundMessage(callback: (payload: any) => void): () => void {
  if (!messaging) {
    init().then(() => {
      if (messaging) {
        onMessage(messaging, callback);
      }
    });
    return () => {};
  }
  return onMessage(messaging, callback);
}

/**
 * Unregister the current device's FCM token.
 * Called on logout so the device stops receiving notifications.
 */
export async function unregisterPushNotifications(): Promise<void> {
  const ok = await init();
  if (!ok || !messaging) return;
  try {
    await deleteToken(messaging);
    console.log('[push] FCM token deleted');
  } catch (e) {
    console.warn('[push] deleteToken failed:', e);
  }
}

// Legacy compat — old code called initializePushNotifications()
export const initializePushNotifications = async () => {
  console.log('[push] initializePushNotifications called — use requestNotificationPermission(userId) instead');
};
