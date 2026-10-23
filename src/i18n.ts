// ─── Shared i18n Hook ────────────────────────────────────────────────────────
//
// Single source of truth for the bilingual (EN/ID) translation function.
// Previously, 30+ files duplicated the same inline pattern:
//   const t = (en: string, id: string) => lang === Language.EN ? en : id;
//
// This module standardizes the pattern and makes it easy to:
//   - Add a third language later
//   - Add a translation dictionary (instead of inline strings)
//   - Add ICU MessageFormat for pluralization/gender
//
// Usage:
//   import { useT } from '../i18n';
//   // inside a component that receives `lang`:
//   const t = useT(lang);
//   <p>{t('Hello', 'Halo')}</p>
//
// For components that don't have `lang` in scope, pass it down via props
// or use the LanguageContext (TODO: create context in a follow-up).

import { Language } from '../types';

export type TranslateFn = (en: string, id: string) => string;

/**
 * Returns a translation function that picks English or Bahasa Indonesia
 * based on the provided language. Standardizes the arg order as (en, id).
 */
export function useT(lang: Language): TranslateFn {
  return (en: string, id: string) => (lang === Language.EN ? en : id);
}

/**
 * Format an IDR amount using the user's locale.
 * Falls back to id-ID (Indonesian) which is the primary market.
 */
export function formatIDR(amount: number, lang?: Language): string {
  const locale = lang === Language.EN ? 'en-US' : 'id-ID';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Short rupiah, for places where the full figure has nowhere to go.
 *
 * A three-up metric row on a 390px phone gives each tile about 70px of content
 * width. "Rp 1.850.000" at 20px needs roughly 140px, so it wrapped — and since
 * a rupiah amount is one unbroken token, wrapping it meant splitting it
 * mid-number: "Rp 1.8 / 50.0 / 00" down three lines on the Customer home.
 * Use this wherever a tile is narrower than its number; use formatIDR
 * everywhere the figure has room, because exact is better when it fits.
 *
 * Indonesian short forms: rb (ribu), jt (juta), M (miliar), T (triliun).
 */
export function formatIDRCompact(amount: number, lang?: Language): string {
  const en = lang === Language.EN;
  const n = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  // One decimal at most, and never a trailing zero: "Rp 2 jt", not "Rp 2,0 jt".
  const short = (value: number, suffix: string) => {
    const rounded = Math.round(value * 10) / 10;
    const text = Number.isInteger(rounded)
      ? String(rounded)
      : String(rounded).replace('.', en ? '.' : ',');
    return `${sign}Rp ${text} ${suffix}`;
  };
  if (n >= 1e12) return short(n / 1e12, 'T');
  if (n >= 1e9) return short(n / 1e9, en ? 'B' : 'M');
  if (n >= 1e6) return short(n / 1e6, en ? 'M' : 'jt');
  if (n >= 1e3) return short(n / 1e3, en ? 'K' : 'rb');
  return formatIDR(amount, lang);
}

/**
 * Format a date for display using the user's locale.
 */
export function formatDate(date: Date | string, lang?: Language): string {
  const locale = lang === Language.EN ? 'en-US' : 'id-ID';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a datetime for display using the user's locale.
 */
export function formatDateTime(date: Date | string, lang?: Language): string {
  const locale = lang === Language.EN ? 'en-US' : 'id-ID';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
