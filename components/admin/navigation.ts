// Model navigasi Admin CMS.
//
// 29 view lama tetap hidup dan tetap punya id sendiri — yang berubah hanya
// cara mencapainya: sidebar menampilkan 17 section dalam 6 grup, dan view
// yang saling berhubungan menjadi tab di dalam section. Dengan begitu tidak
// ada kapabilitas yang hilang, deep link lama tetap bekerja, dan badge
// antrean cukup dijumlahkan di level section.
//
// File ini sengaja bebas React supaya bisa diuji sebagai data murni.

export interface NavSection {
  id: string;
  label: string;
  /** Urutan tab. Anak pertama adalah tujuan default saat section diklik. */
  childIds: string[];
}

export interface NavGroup {
  id: string;
  label: string;
  sections: NavSection[];
}

export const ADMIN_NAV: NavGroup[] = [
  {
    id: 'today',
    label: 'Hari Ini',
    sections: [
      { id: 'overview', label: 'Ringkasan', childIds: ['dashboard', 'ops_console', 'analytics'] },
    ],
  },
  {
    id: 'policies',
    label: 'Polis & Klaim',
    sections: [
      { id: 'review', label: 'Antrean Review', childIds: ['approvals'] },
      { id: 'orders', label: 'Pesanan Polis', childIds: ['policy_orders', 'endorsements', 'documents'] },
      { id: 'claims', label: 'Klaim', childIds: ['claims_admin'] },
    ],
  },
  {
    id: 'partners',
    label: 'Mitra',
    sections: [
      { id: 'agents', label: 'Manajemen Mitra', childIds: ['agents', 'agent_agreements'] },
      { id: 'b2b', label: 'B2B', childIds: ['b2b'] },
      { id: 'users', label: 'Pengguna & Akses', childIds: ['user_mgmt'] },
    ],
  },
  {
    id: 'money',
    label: 'Keuangan',
    sections: [
      { id: 'cash', label: 'Pembayaran & Penarikan', childIds: ['payments', 'withdrawals'] },
      { id: 'commission', label: 'Komisi', childIds: ['commission_ledger'] },
      { id: 'finance', label: 'Keuangan & Laporan', childIds: ['financial'] },
    ],
  },
  {
    id: 'catalog',
    label: 'Katalog & Harga',
    sections: [
      { id: 'products', label: 'Produk & Tier', childIds: ['product_config', 'tier_promo'] },
      { id: 'insurers', label: 'Asuransi & Rate', childIds: ['insurers', 'ojk_rates'] },
      { id: 'vehicles', label: 'Harga Kendaraan', childIds: ['vehicle_pricelist'] },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    sections: [
      { id: 'content', label: 'Konten Web', childIds: ['website_editor', 'portal_icons'] },
      { id: 'ai', label: 'AI & Pathy', childIds: ['ai_admin', 'ai_finance', 'pathy_logs'] },
      { id: 'audit', label: 'Jejak & Keamanan', childIds: ['activity_log', 'security'] },
      { id: 'settings', label: 'Pengaturan', childIds: ['settings'] },
    ],
  },
];

export interface VisibleSection extends NavSection {
  /** Anak yang lolos filter peran/izin; selalu ≥1. */
  children: string[];
}

export interface VisibleGroup {
  group: NavGroup;
  sections: VisibleSection[];
}

/** Semua id view yang pernah ada di menu lama — dipakai test cakupan. */
export const LEGACY_LEAF_IDS = [
  'dashboard', 'ops_console', 'analytics',
  'user_mgmt', 'payments', 'withdrawals',
  'policy_orders', 'approvals', 'claims_admin', 'endorsements', 'documents',
  'agents', 'agent_agreements', 'commission_ledger', 'b2b',
  'product_config', 'tier_promo', 'insurers', 'ojk_rates', 'financial',
  'vehicle_pricelist', 'website_editor', 'portal_icons', 'ai_admin', 'ai_finance',
  'pathy_logs', 'activity_log', 'security', 'settings',
] as const;

export const ALL_SECTION_IDS = ADMIN_NAV.flatMap(g => g.sections.map(s => s.id));

export const ALL_CHILD_IDS = ADMIN_NAV.flatMap(g => g.sections.flatMap(s => s.childIds));

export function sectionForLeaf(leafId: string): NavSection | undefined {
  for (const group of ADMIN_NAV) {
    for (const section of group.sections) {
      if (section.childIds.includes(leafId)) return section;
    }
  }
  return undefined;
}

export function groupForSection(sectionId: string): NavGroup | undefined {
  return ADMIN_NAV.find(g => g.sections.some(s => s.id === sectionId));
}

/**
 * Buang grup/section yang tidak punya satu pun anak yang boleh dilihat.
 * Urutan tab mengikuti `childIds`, bukan urutan izin.
 */
export function buildVisibleNav(allowedLeafIds: readonly string[]): VisibleGroup[] {
  const allowed = new Set(allowedLeafIds);
  const result: VisibleGroup[] = [];
  for (const group of ADMIN_NAV) {
    const sections: VisibleSection[] = [];
    for (const section of group.sections) {
      const children = section.childIds.filter(id => allowed.has(id));
      if (children.length > 0) sections.push({ ...section, children });
    }
    if (sections.length > 0) result.push({ group, sections });
  }
  return result;
}
