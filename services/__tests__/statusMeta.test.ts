import { describe, expect, it } from 'vitest';
import {
  CLAIM_STATUS_META, COMMISSION_STATUS_META, ORDER_STATUS_META, getStatusMeta,
} from '../../lib/statusMeta';
import type { SpClaim, SpCommission, SpPolicyOrder } from '../../services/dbTypes';

// Literal yang menutup union status: jika union di dbTypes bertambah, blok ini
// gagal kompilasi dan memaksa peta statusMeta (plus penggunaannya) ditinjau.
const ORDER_UNION: Record<SpPolicyOrder['status'], true> = {
  SUBMITTED: true, UNDER_REVIEW: true, APPROVED: true, ISSUED: true, REJECTED: true, CANCELLED: true,
};
const CLAIM_UNION: Record<SpClaim['status'], true> = {
  SUBMITTED: true, UNDER_REVIEW: true, APPROVED: true, REJECTED: true, PAID: true, CLOSED: true,
};
const COMMISSION_UNION: Record<SpCommission['status'], true> = {
  PENDING: true, PAID: true, CANCELLED: true,
};

const MAPS: Array<[string, Record<string, unknown>]> = [
  ['ORDER_STATUS_META', ORDER_STATUS_META],
  ['CLAIM_STATUS_META', CLAIM_STATUS_META],
  ['COMMISSION_STATUS_META', COMMISSION_STATUS_META],
];

describe('lib/statusMeta sebagai sumber tunggal status', () => {
  it('menutup semua status union dbTypes — tidak ada status tanpa meta', () => {
    expect(Object.keys(ORDER_STATUS_META).sort()).toEqual(Object.keys(ORDER_UNION).sort());
    expect(Object.keys(CLAIM_STATUS_META).sort()).toEqual(Object.keys(CLAIM_UNION).sort());
    expect(Object.keys(COMMISSION_STATUS_META).sort()).toEqual(Object.keys(COMMISSION_UNION).sort());
  });

  it.each(MAPS)('%s: label lengkap, badgeClass valid, dan ikon terdefinisi', (_name, map) => {
    for (const [status, meta] of Object.entries(map)) {
      const m = meta as { label: string; labelEn: string; badgeClass: string; Icon?: unknown };
      expect(m.label, `${status}.label`).toBeTruthy();
      expect(m.labelEn, `${status}.labelEn`).toBeTruthy();
      expect(m.badgeClass, `${status}.badgeClass`).toMatch(/bg-/);
      expect(m.badgeClass, `${status}.badgeClass`).toMatch(/text-/);
      expect(m.badgeClass, `${status}.badgeClass`).toMatch(/dark:/);
      expect(m.Icon, `${status}.Icon`).toBeDefined();
    }
  });

  it.each(MAPS)('%s: tidak ada dua status dengan warna identik', (_name, map) => {
    const classes = Object.entries(map).map(([s, m]) => [s, (m as { badgeClass: string }).badgeClass] as const);
    for (let i = 0; i < classes.length; i++) {
      for (let j = i + 1; j < classes.length; j++) {
        expect(classes[i][1], `${classes[i][0]} vs ${classes[j][0]}`).not.toBe(classes[j][1]);
      }
    }
  });

  it.each(MAPS)('%s: tidak ada dua status dengan bentuk ikon identik', (_name, map) => {
    const icons = Object.entries(map).map(([s, m]) => [s, (m as { Icon?: unknown }).Icon] as const);
    for (let i = 0; i < icons.length; i++) {
      for (let j = i + 1; j < icons.length; j++) {
        expect(icons[i][1], `${icons[i][0]} vs ${icons[j][0]}`).not.toBe(icons[j][1]);
      }
    }
  });

  it('UNDER_REVIEW order dibedakan dari SUBMITTED (bug v2.8.6: warna persis sama)', () => {
    expect(ORDER_STATUS_META.SUBMITTED.badgeClass).not.toBe(ORDER_STATUS_META.UNDER_REVIEW.badgeClass);
  });

  it('getStatusMeta memberi fallback netral untuk status tak dikenal', () => {
    const meta = getStatusMeta('STATUS_MISTERIUS');
    expect(meta.label).toBe('STATUS_MISTERIUS');
    expect(meta.badgeClass).toMatch(/bg-gray/);
    expect(meta.Icon).toBeUndefined();
    // Peta kustom tetap didukung (dipakai AdminStatusBadge).
    expect(getStatusMeta('PAID', CLAIM_STATUS_META).label).toBe('Dibayarkan');
  });
});
