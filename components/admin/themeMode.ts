// Aturan tema Admin CMS.
//
// Default "auto": gelap antara 18.00 dan 06.00 waktu lokal perangkat. Aturan
// ini dipisah dari komponen supaya batas jamnya bisa diuji tanpa React.

export type AdminThemeMode = 'auto' | 'light' | 'dark';

export const ADMIN_THEME_KEY = 'SP_ADMIN_THEME';

/** Gelap bila dipaksa gelap, atau otomatis pada 18.00–05.59. */
export function resolveAdminDark(mode: AdminThemeMode, now: Date = new Date()): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  const hour = now.getHours();
  return hour >= 18 || hour < 6;
}

/** Urutan tombol: otomatis → terang → gelap → otomatis. */
export function nextThemeMode(mode: AdminThemeMode): AdminThemeMode {
  if (mode === 'auto') return 'light';
  if (mode === 'light') return 'dark';
  return 'auto';
}

export function themeLabel(mode: AdminThemeMode): string {
  if (mode === 'auto') return 'Otomatis';
  if (mode === 'dark') return 'Gelap';
  return 'Terang';
}
