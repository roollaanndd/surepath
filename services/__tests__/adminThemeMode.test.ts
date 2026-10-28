import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME_SCHEDULE,
  nextThemeMode,
  resolveAdminDark,
  themeLabel,
  type AdminThemeSchedule,
} from '../../components/admin/themeMode';

// now dibuat per jam: jam lokal mesin uji tidak relevan karena kita selalu
// memasukkan Date dengan jam eksplisit lewat konstruktor tahun-bulan-hari.
const at = (hour: number) => new Date(2026, 9, 28, hour, 0, 0);

describe('mode tema admin', () => {
  it('mode eksplisit selalu menang atas jadwal', () => {
    for (const hour of [0, 6, 12, 18, 23]) {
      expect(resolveAdminDark('dark', at(hour))).toBe(true);
      expect(resolveAdminDark('light', at(hour))).toBe(false);
    }
  });

  it('jadwal default: gelap 18.00–05.59, terang 06.00–17.59', () => {
    expect(resolveAdminDark('auto', at(18))).toBe(true);
    expect(resolveAdminDark('auto', at(23))).toBe(true);
    expect(resolveAdminDark('auto', at(0))).toBe(true);
    expect(resolveAdminDark('auto', at(5))).toBe(true);
    expect(resolveAdminDark('auto', at(6))).toBe(false);
    expect(resolveAdminDark('auto', at(12))).toBe(false);
    expect(resolveAdminDark('auto', at(17))).toBe(false);
  });

  it('rentang melintang tengah malam (22 → 5) dihitung benar', () => {
    const s: AdminThemeSchedule = { start: 22, end: 5 };
    expect(resolveAdminDark('auto', at(23), s)).toBe(true);
    expect(resolveAdminDark('auto', at(2), s)).toBe(true);
    expect(resolveAdminDark('auto', at(4), s)).toBe(true);
    expect(resolveAdminDark('auto', at(5), s)).toBe(false);
    expect(resolveAdminDark('auto', at(12), s)).toBe(false);
    expect(resolveAdminDark('auto', at(21), s)).toBe(false);
    expect(resolveAdminDark('auto', at(22), s)).toBe(true);
  });

  it('rentang dalam hari (1 → 7) gelap hanya di dalam rentang', () => {
    const s: AdminThemeSchedule = { start: 1, end: 7 };
    expect(resolveAdminDark('auto', at(0), s)).toBe(false);
    expect(resolveAdminDark('auto', at(1), s)).toBe(true);
    expect(resolveAdminDark('auto', at(6), s)).toBe(true);
    expect(resolveAdminDark('auto', at(7), s)).toBe(false);
    expect(resolveAdminDark('auto', at(12), s)).toBe(false);
  });

  it('jadwal default dipakai bila parameter jadwal tidak diberikan', () => {
    expect(DEFAULT_THEME_SCHEDULE).toEqual({ start: 18, end: 6 });
  });

  it('siklus tombol dan label konsisten', () => {
    expect(nextThemeMode('auto')).toBe('light');
    expect(nextThemeMode('light')).toBe('dark');
    expect(nextThemeMode('dark')).toBe('auto');
    expect(themeLabel('auto')).toBe('Otomatis');
    expect(themeLabel('dark')).toBe('Gelap');
    expect(themeLabel('light')).toBe('Terang');
  });
});
