import { describe, expect, it } from 'vitest';
import { filterLabel } from '../../components/admin/filterLabels';

describe('label filter pesanan', () => {
  it('memberi label untuk filter gabungan PENDING', () => {
    expect(filterLabel('PENDING')).toBe('Perlu Keputusan');
    expect(filterLabel('ALL')).toBe('Semua');
  });

  it('tidak pernah mengembalikan undefined untuk status yang dikenal', () => {
    for (const status of ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'ISSUED', 'REJECTED', 'CANCELLED']) {
      expect(typeof filterLabel(status)).toBe('string');
      expect(filterLabel(status).length).toBeGreaterThan(0);
    }
  });

  it('memakai nilai asli untuk filter yang tidak dikenal, bukan crash', () => {
    expect(filterLabel('STATUS_BARU')).toBe('STATUS_BARU');
  });
});
