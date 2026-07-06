// ─── Analytics Service ───────────────────────────────────────────────────────
//
// Single entry point for all conversion + product analytics events.
// Currently sends to GA4 (gtag) and Sentry breadcrumbs. Can be extended to
// PostHog / Mixpanel / Amplitude by adding their SDK init + a third track
// call below.
//
// Usage:
//   import { track, setUserId } from '../services/analytics';
//
//   // On signup/login:
//   setUserId(user.id);
//   track('signup', { role: 'CUSTOMER', method: 'google' });
//
//   // On quote creation:
//   track('quote_created', { product_type: 'CAR_INSURANCE', sum_insured: 150000000 });
//
//   // On payment success:
//   track('payment_success', { order_id, premium: 2350000, payment_method: 'QRIS' });
//
// Events tracked (defined as a union for type safety):
//   - signup (role, method)
//   - login (role, method)
//   - quote_created (product_type, sum_insured)
//   - quote_saved (product_type)
//   - payment_initiated (order_id, premium, payment_method)
//   - payment_success (order_id, premium, payment_method)
//   - payment_failed (order_id, reason)
//   - claim_submitted (claim_type, vehicle_type)
//   - withdrawal_requested (amount)
//   - withdrawal_approved (amount, tier)
//   - policy_issued (order_id, insurer_name)
//   - stnk_ocr_scanned (confidence, source)
//   - referral_shared (channel: 'whatsapp' | 'copy' | 'link')
//   - referral_applied (source: 'url' | 'manual')
//   - wizard_step_completed (step_name, step_index)
//   - wizard_abandoned (step_name, step_index)
//   - pwa_install_prompt_shown
//   - pwa_install_accepted
//   - search_performed (query, source)

declare global {
  interface Window {
    gtag?: (
      command: 'event' | 'config' | 'consent',
      targetOrEvent: string,
      params?: Record<string, unknown>,
    ) => void;
    // gtag 'set' takes a single object payload (no target string)
    gtagSet?: (params: Record<string, unknown>) => void;
  }
}

export type AnalyticsEvent =
  | 'signup' | 'login'
  | 'quote_created' | 'quote_saved'
  | 'payment_initiated' | 'payment_success' | 'payment_failed'
  | 'claim_submitted'
  | 'withdrawal_requested' | 'withdrawal_approved'
  | 'policy_issued'
  | 'stnk_ocr_scanned'
  | 'referral_shared' | 'referral_applied'
  | 'wizard_step_completed' | 'wizard_abandoned'
  | 'pwa_install_prompt_shown' | 'pwa_install_accepted'
  | 'search_performed';

/**
 * Track a product/conversion event. Safely no-ops if gtag isn't loaded.
 *
 * Always called from the client (browser). For edge-function-side tracking
 * (e.g., xendit-webhook payment_success), replicate the same event name +
 * params into the GA4 Measurement Protocol via a server-side fetch — see
 * the `trackServerSide()` helper below.
 */
export function track(event: AnalyticsEvent, params?: Record<string, unknown>): void {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', event, params);
    }
  } catch (e) {
    // Never let analytics break the actual product flow
    console.warn('[analytics] track failed:', e);
  }

  // Mirror to Sentry as a breadcrumb for better error context
  try {
    const Sentry = (window as any).__SENTRY__;
    if (Sentry?.addBreadcrumb) {
      Sentry.addBreadcrumb({
        category: 'analytics',
        message: event,
        level: 'info',
        data: params,
      });
    }
  } catch {
    // no-op
  }
}

/**
 * Set the user ID for all subsequent events. Call once on login/signup.
 * Also sets Sentry user context so errors are attributable.
 */
export function setUserId(userId: string, extra?: Record<string, unknown>): void {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      // gtag('set', { user_id, ... }) — the 'set' command takes a single
      // object payload. We cast to any here because the overloaded gtag
      // type signature in this app only models 'event'/'config'/'consent'.
      const payload: Record<string, unknown> = { user_id: userId };
      if (extra) Object.assign(payload, extra);
      (window.gtag as any)('set', payload);
    }
  } catch (e) {
    console.warn('[analytics] setUserId failed:', e);
  }

  try {
    const Sentry = (window as any).__SENTRY__;
    if (Sentry?.setUser) {
      Sentry.setUser({ id: userId, ...extra });
    }
  } catch {
    // no-op
  }
}

/**
 * Clear the user ID on logout.
 */
export function clearUserId(): void {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      (window.gtag as any)('set', { user_id: null });
    }
  } catch {
    // no-op
  }

  try {
    const Sentry = (window as any).__SENTRY__;
    if (Sentry?.setUser) {
      Sentry.setUser(null);
    }
  } catch {
    // no-op
  }
}

/**
 * Server-side tracking via GA4 Measurement Protocol.
 * Used by edge functions (xendit-webhook, data-gateway) to fire events that
 * originate server-side (e.g., payment_success when the webhook receives PAID
 * status from Xendit).
 *
 * Requires GA4_MEASUREMENT_ID + GA4_API_SECRET in the edge function env.
 *
 * This is a type reference only — the actual server-side implementation lives
 * in `supabase/functions/_shared/analytics.ts` (Deno-only).
 */
export async function trackServerSide(
  _event: AnalyticsEvent,
  _params: Record<string, unknown>,
  _userId?: string,
): Promise<void> {
  // No-op on the client. See the Deno implementation in
  // supabase/functions/_shared/analytics.ts for the actual server-side fetch.
  return;
}
