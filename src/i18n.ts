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
