import { describe, expect, it } from 'vitest';
import { nextThemeMode, resolveAdminDark, themeLabel } from '../../components/admin/themeMode';

const at = (hour: number, minute = 0) => new Date(2026, 9, 28, hour, minute, 0);

describe('tema admin otomatis', () => {
  it('gelap mulai 18.00 dan tetap gelap sampai 05.59', () => {
    expect(resolveAdminDark('auto', at(17, 59))).toBe(false);
    expect(resolveAdminDark('auto', at(18, 0))).toBe(true);
    expect(resolveAdminDark('auto', at(23, 30))).toBe(true);
    expect(resolveAdminDark('auto', at(5, 59))).toBe(true);
    expect(resolveAdminDark('auto', at(6, 0))).toBe(false);
    expect(resolveAdminDark('auto', at(12, 0))).toBe(false);
  });

  it('pilihan manual menang atas jam', () => {
    expect(resolveAdminDark('light', at(23, 0))).toBe(false);
    expect(resolveAdminDark('dark', at(9, 0))).toBe(true);
  });

  it('tombol berputar otomatis → terang → gelap → otomatis', () => {
    expect(nextThemeMode('auto')).toBe('light');
    expect(nextThemeMode('light')).toBe('dark');
    expect(nextThemeMode('dark')).toBe('auto');
  });

  it('label jujur untuk setiap mode', () => {
    expect(themeLabel('auto')).toBe('Otomatis');
    expect(themeLabel('light')).toBe('Terang');
    expect(themeLabel('dark')).toBe('Gelap');
  });
});
