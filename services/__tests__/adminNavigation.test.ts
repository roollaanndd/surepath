import { describe, expect, it } from 'vitest';
import {
  ADMIN_NAV,
  ALL_CHILD_IDS,
  LEGACY_LEAF_IDS,
  buildVisibleNav,
  groupForSection,
  sectionForLeaf,
} from '../../components/admin/navigation';

describe('navigasi Admin CMS', () => {
  it('6 grup, 17 section — konsolidasi dari 29 item lama', () => {
    expect(ADMIN_NAV).toHaveLength(6);
    expect(ADMIN_NAV.flatMap(g => g.sections)).toHaveLength(17);
  });

  it('tidak ada view lama yang hilang atau terdaftar dua kali', () => {
    expect(new Set(ALL_CHILD_IDS).size).toBe(ALL_CHILD_IDS.length);
    expect([...ALL_CHILD_IDS].sort()).toEqual([...LEGACY_LEAF_IDS].sort());
    expect(ALL_CHILD_IDS).toHaveLength(29);
  });

  it('setiap section punya minimal satu view', () => {
    for (const group of ADMIN_NAV) {
      for (const section of group.sections) {
        expect(section.childIds.length, `${group.id}/${section.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('memetakan view ke section yang benar', () => {
    expect(sectionForLeaf('withdrawals')?.id).toBe('cash');
    expect(sectionForLeaf('tier_promo')?.id).toBe('products');
    expect(sectionForLeaf('ojk_rates')?.id).toBe('insurers');
    expect(sectionForLeaf('settings')?.id).toBe('settings');
    expect(sectionForLeaf('tidak_ada')).toBeUndefined();
  });

  it('menemukan grup dari section', () => {
    expect(groupForSection('cash')?.id).toBe('money');
    expect(groupForSection('overview')?.id).toBe('today');
    expect(groupForSection('tidak_ada')).toBeUndefined();
  });

  it('menyembunyikan section kosong saat peran hanya boleh melihat sebagian menu', () => {
    const nav = buildVisibleNav(['payments', 'withdrawals']);
    expect(nav).toHaveLength(1);
    expect(nav[0].group.id).toBe('money');
    expect(nav[0].sections).toHaveLength(1);
    expect(nav[0].sections[0].children).toEqual(['payments', 'withdrawals']);
  });

  it('urutan tab mengikuti konfigurasi, bukan urutan izin', () => {
    const nav = buildVisibleNav(['documents', 'policy_orders']);
    const orders = nav[0].sections.find(s => s.id === 'orders');
    expect(orders?.children).toEqual(['policy_orders', 'documents']);
  });

  it('izin yang tidak dikenal menghasilkan navigasi kosong, bukan crash', () => {
    expect(buildVisibleNav([])).toEqual([]);
    expect(buildVisibleNav(['bukan_menu'])).toEqual([]);
  });
});
