// Model navigasi Admin CMS.
//
// 29 view lama tetap hidup dan tetap punya id sendiri — yang berubah hanya
// cara mencapainya: sidebar menampilkan 17 section dalam 6 grup, dan view
// yang saling berhubungan menjadi tab di dalam section. Dengan begitu tidak
// ada kapabilitas yang hilang, deep link lama tetap bekerja, dan badge
// antrean cukup dijumlahkan di level section.
//
// File ini sengaja bebas React *runtime*: ikon hanya nilai komponen yang
// dilempar-liwat, tidak ada JSX di sini, jadi tetap bisa diuji sebagai data.

import type { ComponentType } from 'react';
import {
  LayoutDashboard, Users, Settings as SettingsIcon, Activity, ShieldAlert,
  ClipboardCheck, TrendingUp, Coins, DollarSign, Package, Building2, Car,
  Monitor, Bot, CreditCard, Banknote, FileEdit, Tag, FileImage,
  ShieldCheck, Gauge, MessageSquare, UserPlus,
} from 'lucide-react';
import { UserRole } from '../../types';

const ALL_ROLES = Object.values(UserRole);

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

// ── Definisi menu kanonik (dipindah dari AdminPortal) ────────────────────────
//
// Satu-satunya sumber kebenaran untuk: sidebar, izin per role di
// RolePermissionsView, dan command palette. Matriks izin di Pengaturan
// diturunkan dari sini — bukan disalin manual — supaya tidak bisa
// tidak-sinkron lagi (bug lama: 4 menu mati terdaftar, 11 menu nyata hilang,
// klik "Simpan" diam-diam mencabut akses menu yang tidak terdaftar).

export type AdminMenuItem =
  | { id: string; isSeparator: true; groupLabel: string; roles: readonly string[] }
  | { id: string; isSeparator?: false; label: string; icon: ComponentType<{ size?: number; className?: string }>; roles: readonly string[] };

export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  // OVERVIEW
  { id: '_sep1', isSeparator: true, groupLabel: 'Overview',           roles: ALL_ROLES },
  { id: 'dashboard',        label: 'Dashboard',          icon: LayoutDashboard, roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.INSURANCE_ADMIN] },
  { id: 'ops_console',      label: 'Konsol Operasi',     icon: Gauge,           roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.INSURANCE_ADMIN] },
  { id: 'analytics',        label: 'Analytics',          icon: TrendingUp,      roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE] },
  // NASABAH & TRANSAKSI
  // Menu cleanup 2026-10-26 (before→after map in the redesign report):
  //  - 'users' (BizAdminView) removed — duplicate directory; its partner
  //    leaderboard now lives as the "Partner Aktif" tab of Kelola Akun.
  //  - 'transactions' (LedgerView) removed — a third read-only aggregation of
  //    data already managed in Pembayaran, Komisi and Penarikan.
  //  - 'reports' merged into 'financial' as its "Laporan Periode" tab.
  { id: '_sep2', isSeparator: true, groupLabel: 'Nasabah & Transaksi', roles: ALL_ROLES },
  { id: 'user_mgmt',        label: 'Pengguna & Akses',   icon: Users,           roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN] },
  { id: 'payments',         label: 'Pembayaran Xendit',  icon: CreditCard,      roles: [UserRole.MASTER_ADMIN, UserRole.FINANCE, UserRole.ADMIN] },
  { id: 'withdrawals',      label: 'Penarikan Mitra',    icon: Banknote,        roles: [UserRole.MASTER_ADMIN, UserRole.FINANCE, UserRole.FINANCE_MANAGER, UserRole.FINANCE_DIRECTOR, UserRole.ADMIN] },
  // POLIS & KLAIM
  //  - 'inventory' (honest "module not connected" stub) removed from nav — a
  //    dead-end menu item; the component stays for future re-wiring.
  { id: '_sep3', isSeparator: true, groupLabel: 'Polis & Klaim',      roles: ALL_ROLES },
  { id: 'policy_orders',    label: 'Pesanan Polis',       icon: Activity,        roles: [UserRole.MASTER_ADMIN, UserRole.INSURANCE_ADMIN, UserRole.ADMIN] },
  { id: 'approvals',        label: 'Antrean Review',      icon: ClipboardCheck,  roles: [UserRole.MASTER_ADMIN, UserRole.INSURANCE_ADMIN, UserRole.ADMIN] },
  { id: 'claims_admin',     label: 'Antrean Klaim',       icon: ShieldAlert,     roles: [UserRole.MASTER_ADMIN, UserRole.INSURANCE_ADMIN] },
  { id: 'endorsements',     label: 'Endorsement',         icon: FileEdit,        roles: [UserRole.MASTER_ADMIN, UserRole.INSURANCE_ADMIN, UserRole.ADMIN] },
  { id: 'documents',        label: 'Dokumen',             icon: FileImage,       roles: [UserRole.MASTER_ADMIN, UserRole.INSURANCE_ADMIN, UserRole.ADMIN] },
  // MITRA & KOMISI
  { id: '_sep4', isSeparator: true, groupLabel: 'Mitra & Komisi',     roles: ALL_ROLES },
  { id: 'agents',           label: 'Manajemen Mitra',     icon: UserPlus,        roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN] },
  { id: 'agent_agreements', label: 'Perjanjian Mitra',    icon: ShieldCheck,     roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.INSURANCE_ADMIN] },
  { id: 'commission_ledger',label: 'Komisi',              icon: Coins,           roles: [UserRole.MASTER_ADMIN, UserRole.FINANCE, UserRole.ADMIN] },
  { id: 'b2b',              label: 'B2B',                 icon: Building2,       roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.INSURANCE_ADMIN] },
  // PRODUK & ASURANSI
  { id: '_sep5', isSeparator: true, groupLabel: 'Produk & Asuransi',  roles: ALL_ROLES },
  { id: 'product_config',   label: 'Produk',              icon: Package,         roles: [UserRole.MASTER_ADMIN] },
  { id: 'tier_promo',       label: 'Tier & Promo',        icon: Tag,             roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER] },
  { id: 'insurers',         label: 'Perusahaan Asuransi', icon: Building2,       roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN] },
  { id: 'ojk_rates',        label: 'Rate OJK',            icon: ShieldCheck,     roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.INSURANCE_ADMIN] },
  // 'financial' absorbs the former 'reports' menu; ADMIN gains access to match
  // the reports audience it replaces.
  { id: 'financial',        label: 'Keuangan & Laporan',  icon: DollarSign,      roles: [UserRole.MASTER_ADMIN, UserRole.FINANCE, UserRole.ADMIN] },
  // PLATFORM
  { id: '_sep6', isSeparator: true, groupLabel: 'Platform',           roles: ALL_ROLES },
  { id: 'vehicle_pricelist',label: 'Database Kendaraan',  icon: Car,             roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN] },
  { id: 'website_editor',   label: 'Editor Website',      icon: Monitor,         roles: [UserRole.MASTER_ADMIN] },
  { id: 'portal_icons',     label: 'Icon Manager',         icon: FileImage,       roles: [UserRole.MASTER_ADMIN] },
  { id: 'ai_admin',         label: 'AI Admin Agent',      icon: Bot,             roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.INSURANCE_ADMIN] },
  { id: 'ai_finance',       label: 'AI Finance Agent',    icon: Bot,             roles: [UserRole.MASTER_ADMIN, UserRole.FINANCE] },
  { id: 'pathy_logs',       label: 'Rekaman Pathy',       icon: MessageSquare,   roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN] },
  { id: 'activity_log',     label: 'Jejak Aktivitas',     icon: Activity,        roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN] },
  { id: 'security',         label: 'Keamanan',            icon: ShieldAlert,     roles: [UserRole.MASTER_ADMIN] },
  { id: 'settings',         label: 'Pengaturan',          icon: SettingsIcon,    roles: [UserRole.MASTER_ADMIN] },
];

/** Leaf menu (tanpa separator) — satu-satunya daftar id yang sah. */
export const MENU_LEAF_ITEMS = ADMIN_MENU_ITEMS.filter(
  (m): m is Extract<AdminMenuItem, { isSeparator?: false }> => !m.isSeparator,
);

/** Matriks izin di Pengaturan diturunkan dari sini — anti-drift. */
export const PERMISSION_MENU_IDS: ReadonlyArray<{ id: string; label: string }> =
  MENU_LEAF_ITEMS.map(m => ({ id: m.id, label: m.label }));

/** Set id leaf yang diizinkan default untuk sebuah role (dari deklarasi menu). */
export function defaultPermissionsFor(role: string): string[] {
  return MENU_LEAF_ITEMS.filter(m => m.roles.includes(role)).map(m => m.id);
}

/** Kunci localStorage untuk override izin per role. */
export const SP_ROLE_PERMISSIONS_KEY = 'SP_ROLE_PERMISSIONS';
