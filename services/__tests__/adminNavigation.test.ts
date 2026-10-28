import { describe, expect, it } from 'vitest';
import {
  ADMIN_NAV,
  ADMIN_MENU_ITEMS,
  ALL_CHILD_IDS,
  LEGACY_LEAF_IDS,
  MENU_LEAF_ITEMS,
  PERMISSION_MENU_IDS,
  buildVisibleNav,
  defaultPermissionsFor,
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

  // ── Anti-drift: matriks izin Pengaturan vs menu nyata ────────────────────
  // Bug lama: matriks manual memuat 4 menu mati dan kehilangan 11 menu nyata,
  // sehingga "Simpan" di Pengaturan diam-diam mencabut akses menu tak terdaftar.

  it('matriks izin identik dengan leaf menu nyata (anti-drift)', () => {
    const matrixIds = PERMISSION_MENU_IDS.map(m => m.id).sort();
    expect(matrixIds).toEqual([...LEGACY_LEAF_IDS].sort());
  });

  it('setiap leaf menu terdaftar di matriks persis sekali', () => {
    expect(PERMISSION_MENU_IDS).toHaveLength(MENU_LEAF_ITEMS.length);
    expect(new Set(PERMISSION_MENU_IDS.map(m => m.id)).size).toBe(MENU_LEAF_ITEMS.length);
  });

  it('menu tanpa separator tidak punya id yang bentrok dengan section', () => {
    const leafIds = new Set(MENU_LEAF_ITEMS.map(m => m.id));
    expect(ADMIN_MENU_ITEMS.filter(m => !m.isSeparator)).toHaveLength(leafIds.size);
  });

  it('default izin tiap role adalah subset id yang sah dan mencakup dashboard', () => {
    const valid = new Set<string>(LEGACY_LEAF_IDS);
    for (const role of ['ADMIN', 'FINANCE', 'INSURANCE_ADMIN', 'FINANCE_MANAGER', 'FINANCE_DIRECTOR']) {
      const perms = defaultPermissionsFor(role);
      expect(perms.length, role).toBeGreaterThan(0);
      for (const id of perms) expect(valid.has(id), `${role}#${id}`).toBe(true);
    }
    expect(defaultPermissionsFor('ADMIN')).toContain('dashboard');
    expect(defaultPermissionsFor('MASTER_ADMIN')).toHaveLength(LEGACY_LEAF_IDS.length);
  });
});
