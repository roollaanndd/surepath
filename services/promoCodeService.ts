// ─── Promo Code Service ─────────────────────────────────────────────────────
//
// Validates promo codes against the sp_promo_codes CMS table. Replaces the
// hardcoded PROMO_CODES constant in constants.ts (which was unused anyway —
// the wizard used a discount slider instead, leaking ~25% of margin).
//
// The discount slider in StepCoverage let any customer self-select up to 25%
// off with no code, no eligibility check, no scarcity. This service restores
// margin control: discounts only apply when a valid code is entered.
//
// Validation rules (mirrored in the data-gateway server-side check):
//   1. Code exists in sp_promo_codes (case-insensitive)
//   2. is_active = true
//   3. starts_at <= now() <= ends_at (or ends_at IS NULL)
//   4. uses_count < max_uses (or max_uses IS NULL)
//   5. order total >= min_premium (checked at order submission, not here)
//
// The client-side check is for instant UX feedback only. The server
// (data-gateway create_policy_order action) MUST re-validate before applying
// the discount — never trust the client.

import { supabase } from './supabaseService';

export interface PromoCodeValidation {
  valid: boolean;
  code?: string;
  discountType?: 'PERCENT' | 'NOMINAL';
  discountValue?: number;
  description?: string;
  error?: string;
}

/**
 * Validate a promo code client-side (for instant UX feedback).
 * The server re-validates at order submission.
 */
export async function validatePromoCode(
  code: string,
  orderTotal?: number,
): Promise<PromoCodeValidation> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return { valid: false, error: 'Masukkan kode promo' };
  }

  try {
    const { data, error } = await supabase
      .from('sp_promo_codes')
      .select('code, description, discount_type, discount_value, min_premium, max_uses, uses_count, starts_at, ends_at, is_active')
      .eq('code', normalized)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('validatePromoCode:', error);
      return { valid: false, error: 'Gagal memvalidasi kode. Coba lagi.' };
    }

    if (!data) {
      return { valid: false, error: 'Kode tidak ditemukan atau sudah tidak aktif' };
    }

    // Check date range
    const now = new Date();
    const startsAt = new Date(data.starts_at);
    const endsAt = data.ends_at ? new Date(data.ends_at) : null;
    if (now < startsAt) {
      return { valid: false, error: 'Kode belum berlaku' };
    }
    if (endsAt && now > endsAt) {
      return { valid: false, error: 'Kode sudah kedaluwarsa' };
    }

    // Check usage limit
    if (data.max_uses !== null && data.uses_count >= data.max_uses) {
      return { valid: false, error: 'Kuota kode sudah habis' };
    }

    // Check minimum premium (optional — only if orderTotal provided)
    if (orderTotal !== undefined && Number(data.min_premium) > 0 && orderTotal < Number(data.min_premium)) {
      return {
        valid: false,
        error: `Minimum pembelian Rp ${Number(data.min_premium).toLocaleString('id-ID')} untuk kode ini`,
      };
    }

    return {
      valid: true,
      code: data.code,
      discountType: data.discount_type as 'PERCENT' | 'NOMINAL',
      discountValue: Number(data.discount_value),
      description: data.description ?? undefined,
    };
  } catch (e) {
    console.error('validatePromoCode error:', e);
    return { valid: false, error: 'Terjadi kesalahan. Coba lagi.' };
  }
}

/**
 * Convert a validated promo code into a `coverage.discount` percent value
 * that the existing premium calculation in CarInsuranceWizard can consume.
 *
 * - PERCENT: discount = discountValue (e.g., 25 means 25%)
 * - NOMINAL: discount = (discountValue / orderTotal) * 100, capped at the
 *            insurer's max_discount_percent
 *
 * Returns 0 if the code is invalid or the discount can't be computed.
 */
export function promoToDiscountPercent(
  validation: PromoCodeValidation,
  orderTotal: number,
  maxDiscountPercent: number = 25,
): number {
  if (!validation.valid || !validation.discountType || validation.discountValue === undefined) {
    return 0;
  }
  if (validation.discountType === 'PERCENT') {
    return Math.min(validation.discountValue, maxDiscountPercent);
  }
  // NOMINAL — convert IDR amount to a percent of orderTotal
  if (orderTotal <= 0) return 0;
  const percent = (validation.discountValue / orderTotal) * 100;
  return Math.min(percent, maxDiscountPercent);
}
