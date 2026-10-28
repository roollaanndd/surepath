// Aturan tema Admin CMS.
//
// Default "auto": gelap di luar jam kerja (default 18.00–06.00 waktu lokal
// perangkat). Rentang jam bisa diatur admin dari Pengaturan dan disimpan di
// localStorage. Aturan ini dipisah dari komponen supaya batas jamnya bisa
// diuji tanpa React.

export type AdminThemeMode = 'auto' | 'light' | 'dark';

export const ADMIN_THEME_KEY = 'SP_ADMIN_THEME';

export interface AdminThemeSchedule {
  /** Jam mulai gelap (0–23). */
  start: number;
  /** Jam kembali terang (0–23). */
  end: number;
}

export const ADMIN_THEME_SCHEDULE_KEY = 'SP_ADMIN_THEME_SCHEDULE';

export const DEFAULT_THEME_SCHEDULE: AdminThemeSchedule = { start: 18, end: 6 };

function clampHour(n: unknown): number | null {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  const h = Math.floor(v);
  return h >= 0 && h <= 23 ? h : null;
}

/** Baca jadwal dari localStorage; nilai tidak valid jatuh ke default. */
export function readThemeSchedule(): AdminThemeSchedule {
  try {
    const raw = localStorage.getItem(ADMIN_THEME_SCHEDULE_KEY);
    if (!raw) return { ...DEFAULT_THEME_SCHEDULE };
    const parsed = JSON.parse(raw) as { start?: unknown; end?: unknown };
    const start = clampHour(parsed.start);
    const end = clampHour(parsed.end);
    // start === end berarti rentang ambigu (gelap 24 jam atau 0 jam) —
    // pakai default daripada menebak.
    if (start === null || end === null || start === end) return { ...DEFAULT_THEME_SCHEDULE };
    return { start, end };
  } catch {
    return { ...DEFAULT_THEME_SCHEDULE };
  }
}

/** Simpan jadwal; tidak valid diabaikan (pemanggil sudah memvalidasi UI). */
export function storeThemeSchedule(schedule: AdminThemeSchedule): void {
  const start = clampHour(schedule.start);
  const end = clampHour(schedule.end);
  if (start === null || end === null || start === end) return;
  try {
    localStorage.setItem(ADMIN_THEME_SCHEDULE_KEY, JSON.stringify({ start, end }));
  } catch { /* storage blocked */ }
}

/** Gelap bila dipaksa gelap, atau otomatis di luar rentang jam terang. */
export function resolveAdminDark(
  mode: AdminThemeMode,
  now: Date = new Date(),
  schedule: AdminThemeSchedule = DEFAULT_THEME_SCHEDULE,
): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  const hour = now.getHours();
  const { start, end } = schedule;
  if (start < end) return hour >= start && hour < end;
  // Rentang melintang tengah malam (mis. 18 → 6): gelap dari start sampai end.
  return hour >= start || hour < end;
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
