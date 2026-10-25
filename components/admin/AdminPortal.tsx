
import React, { useState, useEffect, useRef, useCallback, Component, lazy, Suspense } from 'react';
import '../../src/styles/portal-modernization.css';
import {
  LayoutDashboard, Users, Wallet, Settings, LogOut, Search,
  Activity, Menu, ShieldAlert, ClipboardCheck, HardDrive,
  TrendingUp, BarChart3, Bell, CheckCircle,
  Coins, DollarSign, Package, Building2, Car, ArrowLeft,
  Monitor, Sun, Moon, X, Bot, Upload, Loader2, CreditCard, Banknote, FileEdit, Tag, FileImage, RefreshCw, ShieldCheck, Gauge, MessageSquare,
  PanelLeftClose, PanelLeftOpen, UserPlus, CornerDownLeft,
} from 'lucide-react';
// ── Performance: lazy-load all admin views ──────────────────────────────────
// AdminPortal chunk was 724 KB (largest in the app). Each admin view is
// 50-200 KB; loading all 17 eagerly bloated the initial bundle. Now they
// only load when the admin navigates to them.
const BizAdminView = lazy(() => import('./AdminViews').then(m => ({ default: m.BizAdminView })));
const ApprovalsView = lazy(() => import('./AdminViews').then(m => ({ default: m.ApprovalsView })));
const SettingsView = lazy(() => import('./AdminViews').then(m => ({ default: m.SettingsView })));
const InventoryView = lazy(() => import('./AdminViews').then(m => ({ default: m.InventoryView })));
const SecurityView = lazy(() => import('./AdminViews').then(m => ({ default: m.SecurityView })));
const OpsConsoleView = lazy(() => import('./OpsConsoleView'));
const PathyTranscriptsView = lazy(() => import('./PathyTranscriptsView'));
const ActivityLogView = lazy(() => import('./ActivityLogView'));
const LedgerView = lazy(() => import('./AdminViews').then(m => ({ default: m.LedgerView })));
const ReportsView = lazy(() => import('./AdminViews').then(m => ({ default: m.ReportsView })));
const AgentManagementView = lazy(() => import('./AdminViews').then(m => ({ default: m.AgentManagementView })));
const ClaimsAdminView = lazy(() => import('./AdminViews').then(m => ({ default: m.ClaimsAdminView })));
const UserManagementView = lazy(() => import('./AdminViews').then(m => ({ default: m.UserManagementView })));
const PaymentsAdminView = lazy(() => import('./AdminViews').then(m => ({ default: m.PaymentsAdminView })));
const WithdrawalsAdminView = lazy(() => import('./AdminViews').then(m => ({ default: m.WithdrawalsAdminView })));
const RolePermissionsView = lazy(() => import('./AdminViews').then(m => ({ default: m.RolePermissionsView })));
const PolicyOrdersAdmin = lazy(() => import('./PolicyOrdersAdmin'));
const ProductConfigAdmin = lazy(() => import('./ProductConfigAdmin'));
const FinancialAdmin = lazy(() => import('./FinancialAdmin'));
const CommissionLedger = lazy(() => import('./CommissionLedger'));
const AgentAgreementsAdmin = lazy(() => import('./AgentAgreementsAdmin'));
const InsurerAdmin = lazy(() => import('./InsurerAdmin'));
const OjkRateAdmin = lazy(() => import('./OjkRateAdmin'));
const VehiclePricelistAdmin = lazy(() => import('./VehiclePricelistAdmin'));
const WebsiteEditorAdmin = lazy(() => import('./WebsiteEditorAdmin'));
const PortalIconManagerView = lazy(() => import('./PortalIconManager'));
const AIAdminView = lazy(() => import('./AIAdminView'));
const AIFinanceView = lazy(() => import('./AIFinanceView'));
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));
const EndorsementsAdminView = lazy(() => import('./EndorsementsAdminView'));
const B2BAdminView = lazy(() => import('./B2BAdminView'));
const DocumentsAdminView = lazy(() => import('./DocumentsAdminView'));
const TierPromoConfigAdmin = lazy(() => import('./TierPromoConfigAdmin'));
import { scrollPortalToTop } from '../shared/scrollReset';
import { useDarkMode } from '../shared/theme';
import { UserRole } from '../../types';
import {
  AgentArtKeyframes, AgentHero,
  SpotOrders, SpotClients, SpotClaims, SpotWallet, SpotNetwork,
  SpotMarket, SpotProfile, SpotEndorse, SpotTrophy, SpotRenewal, SpotBell,
} from '../agent/AgentArt';
import { getAdminStats, type AdminStats, uploadLogoImage, callGateway, getOnlineUsers, type OnlineUsersResult, getTrafficStats, type TrafficStats, getAdminNotifications, markAdminNotificationRead, getTierChangeRequests, type SpAdminNotification } from '../../services/supabaseService';
import { shouldAutoBackup, performBackup } from '../../services/backupService';
import { formatIDR } from '../car-wizard/WizardUI';
import { formatIDRCompact } from '../../src/i18n';
import { SurePathLogo } from '../Navbar';
import { PathyNavIcon } from '../shared/PathyNavIcon';

// Suspense fallback for lazy-loaded admin views
const AdminViewLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 size={32} className="animate-spin text-ds-green" />
  </div>
);

// ─── Menu definition ─────────────────────────────────────────────────────────
const ALL_ROLES = Object.values(UserRole);

type MenuItem =
  | { id: string; isSeparator: true; groupLabel: string; roles: UserRole[] }
  | { id: string; isSeparator?: false; label: string; icon: React.ElementType; roles: UserRole[] };

const MENU_ITEMS: MenuItem[] = [
  // OVERVIEW
  { id: '_sep1', isSeparator: true, groupLabel: 'Overview',           roles: ALL_ROLES },
  { id: 'ops_console',      label: 'Konsol Operasi',      icon: Gauge,           roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.INSURANCE_ADMIN] },
  { id: 'dashboard',        label: 'Dashboard',          icon: LayoutDashboard, roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.INSURANCE_ADMIN] },
  { id: 'reports',          label: 'Laporan',             icon: BarChart3,       roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE] },
  { id: 'analytics',        label: 'Analytics',           icon: TrendingUp,      roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE] },
  // NASABAH & TRANSAKSI
  { id: '_sep2', isSeparator: true, groupLabel: 'Nasabah & Transaksi', roles: ALL_ROLES },
  { id: 'users',            label: 'Pengguna',            icon: Users,           roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN] },
  { id: 'user_mgmt',        label: 'Kelola Akun',         icon: Users,           roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN] },
  { id: 'transactions',     label: 'Transaksi',           icon: Wallet,          roles: [UserRole.MASTER_ADMIN, UserRole.FINANCE] },
  { id: 'payments',         label: 'Pembayaran Xendit',   icon: CreditCard,      roles: [UserRole.MASTER_ADMIN, UserRole.FINANCE, UserRole.ADMIN] },
  { id: 'withdrawals',      label: 'Penarikan Mitra',     icon: Banknote,        roles: [UserRole.MASTER_ADMIN, UserRole.FINANCE, UserRole.FINANCE_MANAGER, UserRole.FINANCE_DIRECTOR, UserRole.ADMIN] },
  // POLIS & KLAIM
  { id: '_sep3', isSeparator: true, groupLabel: 'Polis & Klaim',      roles: ALL_ROLES },
  { id: 'policy_orders',    label: 'Pesanan Polis',       icon: Activity,        roles: [UserRole.MASTER_ADMIN, UserRole.INSURANCE_ADMIN, UserRole.ADMIN] },
  { id: 'approvals',        label: 'Antrean Polis',       icon: ClipboardCheck,  roles: [UserRole.MASTER_ADMIN, UserRole.INSURANCE_ADMIN, UserRole.ADMIN] },
  { id: 'claims_admin',     label: 'Antrean Klaim',       icon: ClipboardCheck,  roles: [UserRole.MASTER_ADMIN, UserRole.INSURANCE_ADMIN] },
  { id: 'inventory',        label: 'Data Polis',          icon: HardDrive,       roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN] },
  { id: 'endorsements',     label: 'Endorsement',         icon: FileEdit,        roles: [UserRole.MASTER_ADMIN, UserRole.INSURANCE_ADMIN, UserRole.ADMIN] },
  { id: 'documents',        label: 'Dokumen',             icon: FileImage,       roles: [UserRole.MASTER_ADMIN, UserRole.INSURANCE_ADMIN, UserRole.ADMIN] },
  // MITRA & KOMISI
  { id: '_sep4', isSeparator: true, groupLabel: 'Mitra & Komisi',     roles: ALL_ROLES },
  { id: 'agents',           label: 'Manajemen Mitra',     icon: Bell,            roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN] },
  { id: 'agent_agreements', label: 'Perjanjian Mitra',    icon: ShieldCheck,     roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.INSURANCE_ADMIN] },
  { id: 'commission_ledger',label: 'Komisi',              icon: Coins,           roles: [UserRole.MASTER_ADMIN, UserRole.FINANCE, UserRole.ADMIN] },
  { id: 'b2b',              label: 'B2B',                 icon: Building2,       roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.INSURANCE_ADMIN] },
  // PRODUK & ASURANSI
  { id: '_sep5', isSeparator: true, groupLabel: 'Produk & Asuransi',  roles: ALL_ROLES },
  { id: 'product_config',   label: 'Produk',              icon: Package,         roles: [UserRole.MASTER_ADMIN] },
  { id: 'tier_promo',       label: 'Tier & Promo',        icon: Tag,             roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE_MANAGER] },
  { id: 'insurers',         label: 'Perusahaan Asuransi', icon: Building2,       roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN] },
  { id: 'ojk_rates',        label: 'Rate OJK',            icon: ShieldCheck,     roles: [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.INSURANCE_ADMIN] },
  { id: 'financial',        label: 'Keuangan',            icon: DollarSign,      roles: [UserRole.MASTER_ADMIN, UserRole.FINANCE] },
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
  { id: 'settings',         label: 'Pengaturan',          icon: Settings,        roles: [UserRole.MASTER_ADMIN] },
];

const formatRole = (role: string) =>
  role.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// ── Per-tab hero art + subtitle (visual only) ────────────────────────────────
const TAB_ART: Record<string, React.ComponentType<{ size?: number }>> = {
  reports: SpotTrophy, analytics: SpotNetwork,
  users: SpotClients, user_mgmt: SpotProfile,
  transactions: SpotWallet, payments: SpotWallet, withdrawals: SpotWallet,
  policy_orders: SpotOrders, approvals: SpotOrders, claims_admin: SpotClaims,
  inventory: SpotOrders, endorsements: SpotEndorse, documents: SpotOrders,
  agents: SpotProfile, agent_agreements: SpotEndorse, commission_ledger: SpotWallet,
  b2b: SpotMarket, product_config: SpotMarket, tier_promo: SpotTrophy,
  insurers: SpotMarket, ojk_rates: SpotClaims, financial: SpotWallet,
  vehicle_pricelist: SpotRenewal, website_editor: SpotMarket,
  ai_admin: SpotBell, ai_finance: SpotBell, security: SpotClaims, settings: SpotEndorse,
};

const TAB_SUBTITLE: Record<string, string> = {
  reports: 'Ringkasan performa bisnis dan operasional.',
  analytics: 'Analitik traffic, funnel, dan pertumbuhan.',
  users: 'Data nasabah terdaftar di platform.',
  user_mgmt: 'Kelola akun, peran, dan akses pengguna.',
  transactions: 'Buku besar seluruh transaksi platform.',
  payments: 'Pembayaran premi via Xendit.',
  withdrawals: 'Pencairan komisi mitra — approval berlapis.',
  policy_orders: 'Semua pesanan polis lintas produk.',
  approvals: 'Antrean pengajuan yang menunggu keputusan.',
  claims_admin: 'Antrean klaim yang perlu ditinjau.',
  inventory: 'Arsip polis yang telah diterbitkan.',
  endorsements: 'Permintaan perubahan polis dari mitra.',
  documents: 'Dokumen nasabah dan polis.',
  agents: 'Kelola jaringan mitra SurePath.',
  agent_agreements: 'Perjanjian keagenan yang ditandatangani.',
  commission_ledger: 'Buku komisi mitra per polis.',
  b2b: 'Pengajuan dan penawaran korporasi.',
  product_config: 'Konfigurasi produk, komisi, dan koin.',
  tier_promo: 'Pengaturan tier mitra dan kode promo.',
  insurers: 'Perusahaan asuransi rekanan.',
  ojk_rates: 'Tarif acuan resmi OJK (SEOJK).',
  financial: 'Kesehatan keuangan platform.',
  vehicle_pricelist: 'Database harga kendaraan.',
  website_editor: 'Kelola konten website publik.',
  ai_admin: 'Asisten AI untuk tugas administratif.',
  ai_finance: 'Asisten AI untuk analisis keuangan.',
  security: 'Audit keamanan dan sesi pengguna.',
  settings: 'Pengaturan platform.',
};

// ─── Theme helpers ────────────────────────────────────────────────────────────

// ─── Settings error boundary ─────────────────────────────────────────────────
class SettingsErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e: Error) { console.error('[SettingsView error]', e); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center text-ds-ink">
          <p className="mb-4 text-sm font-bold text-ds-ink2">
            Terjadi kesalahan saat memuat pengaturan. Coba refresh halaman.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-6 py-2.5 rounded-xl bg-ds-green-tint border border-ds-green/30 text-ds-green font-extrabold text-[0.7rem] cursor-pointer tracking-[0.1em] uppercase transition-colors hover:bg-ds-green hover:text-white"
          >
            Coba Lagi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
const AdminPortal = ({
  onLogout, products, setProducts, userRole, currentUser,
}: {
  onLogout: () => void;
  products: any[];
  setProducts: any;
  userRole: UserRole;
  currentUser?: any;
}) => {
  const [activeTab, setActiveTab]     = useState('dashboard');
  const [isMobile, setIsMobile]       = useState(window.innerWidth < 1024);
  const [mobileMenuOpen, setMobileOpen] = useState(false);
  const [adminStats, setAdminStats]   = useState<AdminStats | null>(null);
  // The CMS opens dark unless the user has chosen otherwise; `useDarkMode`
  // stores that choice, so unlike before it survives a reload.
  const [darkMode, setDarkMode]       = useDarkMode(true);
  const [logoUrl, setLogoUrl]         = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'running' | 'ok' | 'fail'>('idle');
  const logoInputRef = useRef<HTMLInputElement>(null);
  // Preserve sidebar position without resetting scroll on every parent render.
  const sidebarScrollTop = useRef(0);
  const setSidebarNavRef = useCallback((node: HTMLElement | null) => {
    if (node) node.scrollTop = sidebarScrollTop.current;
  }, []);
  // The CMS content area is its own scroll container, so switching views has to
  // return it to the top explicitly — otherwise a view opened from halfway down
  // a long table renders already scrolled.
  const contentRef = useRef<HTMLDivElement>(null);
  const goToTab = useCallback((tab: string) => {
    setActiveTab(tab);
    scrollPortalToTop(contentRef.current);
  }, []);
  const [transaksiStats, setTransaksiStats] = useState<{
    totalCustomers: number;
    totalOrders: number;
    totalPembayaranMasuk: number;
    totalKomisiAgen: number;
  } | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUsersResult | null>(null);
  const [trafficStats, setTrafficStats] = useState<TrafficStats | null>(null);
  const [notifications, setNotifications] = useState<SpAdminNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  // ── Revamp 2026-10-25: interactive shell upgrades ────────────────────────
  // (a) Collapsible desktop sidebar — icon rail for power users, persisted.
  const [rail, setRail] = useState(() => localStorage.getItem('SP_ADMIN_RAIL') === '1');
  const toggleRail = useCallback(() => {
    setRail(prev => {
      localStorage.setItem('SP_ADMIN_RAIL', prev ? '0' : '1');
      return !prev;
    });
  }, []);
  // (b) Live queue badges on nav items — the admin sees pending work WITHOUT
  // opening each view (audit 6-b #7: approval queues lacked discoverability).
  const [tierPending, setTierPending] = useState(0);
  // (c) Command palette (Ctrl/Cmd+K) — the header search was a dead input;
  // it now drives fuzzy menu navigation.
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);
  const paletteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);

    const refreshStats = () => {
      getAdminStats().then(setAdminStats).catch(() => {});
      callGateway('admin_transaksi_overview', {}).then(({ data }) => {
        if (data) setTransaksiStats(data as any);
      }).catch(() => {});
    };
    refreshStats();
    const statsInterval = setInterval(refreshStats, 120000);

    // Online users
    getOnlineUsers().then(setOnlineUsers).catch(() => {});
    const onlineInterval = setInterval(() => getOnlineUsers().then(setOnlineUsers).catch(() => {}), 60000);

    // Traffic stats
    getTrafficStats().then(setTrafficStats).catch(() => {});

    // Notifications — load on mount, refresh every 60s
    const loadNotifs = () => getAdminNotifications().then(setNotifications).catch(() => {});
    loadNotifs();
    const notifInterval = setInterval(loadNotifs, 60000);

    // Pending tier-approval queue — feeds the nav badge on "Tier & Promo".
    const loadTierQueue = () => getTierChangeRequests('PENDING').then(r => setTierPending(r.length)).catch(() => {});
    loadTierQueue();
    const tierInterval = setInterval(loadTierQueue, 60000);

    // Auto daily backup — runs silently on admin portal open if >23h since last
    if (shouldAutoBackup()) {
      setBackupStatus('running');
      performBackup(undefined, 'AUTO')
        .then(r => setBackupStatus(r.success ? 'ok' : 'fail'))
        .catch(() => setBackupStatus('fail'))
        .finally(() => setTimeout(() => setBackupStatus('idle'), 8000));
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(statsInterval);
      clearInterval(onlineInterval);
      clearInterval(notifInterval);
      clearInterval(tierInterval);
    };
  }, []);

  // ── Command palette keyboard wiring ───────────────────────────────────────
  useEffect(() => {
    if (!paletteOpen) return;
    setPaletteIndex(0);
    const t = setTimeout(() => paletteInputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [paletteOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(v => !v);
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Role-based menu with localStorage overrides ────────────────────────────
  const filteredMenu = (() => {
    if (userRole === UserRole.MASTER_ADMIN) return MENU_ITEMS.filter(m => m.roles.includes(userRole));
    try {
      const saved = localStorage.getItem('SP_ROLE_PERMISSIONS');
      if (saved) {
        const perms: Record<string, string[]> = JSON.parse(saved);
        const allowed = perms[userRole] ?? null;
        if (allowed) {
          return MENU_ITEMS.filter(m => {
            if (m.isSeparator) return m.roles.includes(userRole);
            return allowed.includes(m.id);
          });
        }
      }
    } catch { /* fall through to default */ }
    return MENU_ITEMS.filter(m => m.roles.includes(userRole));
  })();

  // Command palette results — declared after filteredMenu (TDZ-safe).
  const paletteResults = (() => {
    const items = filteredMenu.filter(m => !m.isSeparator) as Array<{ id: string; label: string; icon: React.ElementType }>;
    const q = paletteQuery.trim().toLowerCase();
    if (!q) return items.slice(0, 8);
    return items.filter(m => m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
  })();
  // Live work-queue badges: order approval queue + tier approval queue.
  const approvalQueueCount = adminStats
    ? (adminStats.ordersByStatus?.SUBMITTED ?? 0) + (adminStats.ordersByStatus?.UNDER_REVIEW ?? 0)
    : 0;
  const navBadgeFor = (id: string): number =>
    id === 'approvals' ? approvalQueueCount : id === 'tier_promo' ? tierPending : 0;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const url = await uploadLogoImage(file);
    setLogoUploading(false);
    if (url) setLogoUrl(url);
    e.target.value = '';
  };

  // ── Sidebar ────────────────────────────────────────────────────────────
  // Revamp 2026-10-25: collapsible icon rail (desktop), live work-queue badges,
  // active-state accent bar. The sidebar itself is always the dark-green brand
  // gradient, so white text is intentional there.
  const isRail = !isMobile && rail;
  const SidebarContent = () => (
    <div className="sp-modern-app flex flex-col h-full min-h-0">
      {/* Top row — back link + collapse toggle */}
      <div className={`mb-4 flex items-center ${isRail ? 'justify-center' : 'justify-between'}`}>
        {!isRail && (
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest transition-colors text-white/50 hover:text-white"
          >
            <ArrowLeft size={13} /> Kembali
          </button>
        )}
        {!isMobile && (
          <button
            onClick={toggleRail}
            className="p-1.5 rounded-lg text-white/45 hover:text-white hover:bg-white/10 transition-all"
            title={isRail ? 'Perlebar sidebar' : 'Ciutkan sidebar'}
            aria-label={isRail ? 'Perlebar sidebar' : 'Ciutkan sidebar'}
          >
            {isRail ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        )}
      </div>

      {/* Logo */}
      <div className={`mb-5 pb-4 border-b border-white/10 ${isRail ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center gap-3 ${isRail ? 'justify-center' : ''}`}>
          <div className="relative group flex-shrink-0">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25 overflow-hidden cursor-pointer transition-transform hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #00C16A, #047857)' }}
              onClick={() => logoInputRef.current?.click()}
              title="Klik untuk ganti logo"
            >
              {logoUploading ? (
                <Loader2 size={16} className="text-white animate-spin" />
              ) : logoUrl ? (
                <img loading="lazy" src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <SurePathLogo className="w-6 h-6 text-white" />
              )}
            </div>
            {!isRail && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center pointer-events-none">
                <Upload size={8} className="text-white" />
              </div>
            )}
          </div>
          {!isRail && (
            <div className="min-w-0 flex-1">
              <h1 className="font-black text-lg tracking-tight leading-none text-white">
                Sure<span className="text-emerald-300">Path</span>
              </h1>
              <button
                onClick={() => logoInputRef.current?.click()}
                className="text-[0.45rem] font-bold uppercase tracking-[0.3em] mt-0.5 transition-colors text-emerald-100/70 hover:text-white"
              >
                {logoUrl ? 'Ganti Logo ↑' : 'Admin Panel · Upload Logo'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Nav — scrollable */}
      <nav
        ref={setSidebarNavRef}
        onScroll={event => { sidebarScrollTop.current = event.currentTarget.scrollTop; }}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar space-y-0.5 pr-1"
      >
        {filteredMenu.map(item => {
          if (item.isSeparator) {
            if (isRail) return <div key={item.id} className="mx-auto my-2.5 h-px w-6 bg-white/15 rounded-full" />;
            return (
              <div key={item.id} className="mt-4 mb-1 px-2">
                <p className="text-[0.58rem] font-black uppercase tracking-[0.22em] text-white/45">{(item as any).groupLabel}</p>
              </div>
            );
          }
          const navItem = item as { id: string; label: string; icon: React.ElementType; roles: UserRole[] };
          const badge = navBadgeFor(navItem.id);
          const active = activeTab === navItem.id;
          return (
            <button
              key={navItem.id}
              onClick={() => { goToTab(navItem.id); setMobileOpen(false); }}
              title={isRail ? navItem.label : undefined}
              className={`relative w-full flex items-center rounded-2xl transition-all text-left sp-interactive-surface group/nav ${
                isRail ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-2.5'
              } ${
                active
                  ? 'bg-white/[0.14] text-white shadow-sm'
                  : 'text-white/65 border border-transparent hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {active && (
                <span aria-hidden className={`absolute rounded-full bg-emerald-300 ${isRail ? 'left-0 top-1/2 -translate-y-1/2 w-[3px] h-7' : 'left-0 top-1/2 -translate-y-1/2 w-1 h-6'}`} />
              )}
              <span className={`relative flex-shrink-0 ${active ? 'drop-shadow-sm' : ''}`}>
                <PathyNavIcon id={navItem.id} size={isRail ? 30 : 28} active={active} />
                {isRail && badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-[0.55rem] font-black text-emerald-950 flex items-center justify-center shadow">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              {!isRail && (
                <>
                  <span className="text-[0.68rem] font-bold tracking-wide flex-1 min-w-0 truncate">{navItem.label}</span>
                  {badge > 0 && (
                    <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-amber-400/90 text-[0.6rem] font-black text-emerald-950 flex items-center justify-center shadow-sm">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* User footer — always visible */}
      <div className={`mt-4 flex-shrink-0 border border-white/10 bg-white/[0.06] rounded-2xl ${isRail ? 'p-2 flex flex-col items-center gap-2' : 'p-4 space-y-3'}`}>
        <div className={`min-w-0 ${isRail ? '' : 'flex items-center gap-2.5'}`}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white flex-shrink-0 ring-2 ring-emerald-500/25"
            style={{ background: 'linear-gradient(135deg, #00C16A, #047857)' }}
            title={currentUser?.email ?? formatRole(userRole)}>
            {(currentUser?.name ?? userRole)[0].toUpperCase()}
          </div>
          {!isRail && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black truncate text-white">{formatRole(userRole)}</p>
              <p className="text-[0.65rem] font-medium truncate text-white/55">{currentUser?.email ?? 'Admin'}</p>
            </div>
          )}
        </div>
        <button
          onClick={onLogout}
          title="Keluar"
          className={`transition-all font-black uppercase tracking-widest flex items-center justify-center border border-white/10 bg-white/[0.06] text-white/75 hover:bg-rose-500 hover:text-white hover:border-rose-400/40 ${
            isRail ? 'w-9 h-9 rounded-xl' : 'w-full py-2.5 rounded-xl text-[0.6rem] gap-2'
          }`}
        >
          <LogOut size={13} /> {!isRail && 'Keluar'}
        </button>
      </div>
    </div>
  );

  // ── Sidebar widths ─────────────────────────────────────────────────────────
  const sidebarBg = 'bg-gradient-to-b from-[#073F37] via-[#06483D] to-[#052F2A] border-white/10 shadow-[8px_0_32px_-20px_rgba(3,30,25,0.7)]';

  // ── Dashboard content ──────────────────────────────────────────────────────
  const DashboardView = () => (
    <div className="space-y-8">
      {/* Command banner — bank-grade hero, same theme as Agent/Operator apps */}
      <div className="relative overflow-hidden rounded-[1.75rem] px-6 py-6 text-white"
        style={{ background: 'linear-gradient(120deg, #073F37 0%, #08775A 58%, #10A875 100%)', boxShadow: '0 16px 44px -14px rgba(5,75,54,0.28)' }}>
        <div aria-hidden className="absolute -top-14 -right-12 w-56 h-56 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,193,106,0.26), transparent 70%)' }} />
        <svg aria-hidden className="absolute right-0 top-0 h-full opacity-[0.12] pointer-events-none" viewBox="0 0 200 140" fill="none">
          <circle cx="176" cy="16" r="74" stroke="#fff" strokeWidth="1.2" />
          <circle cx="176" cy="16" r="48" stroke="#fff" strokeWidth="1.2" />
          <circle cx="176" cy="16" r="26" stroke="#fff" strokeWidth="1.2" />
        </svg>
        <div className="relative z-10 flex items-center gap-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-2xs font-black uppercase tracking-[0.2em] text-emerald-300">Sistem aktif</p>
            </div>
            <h2 className="text-3xl font-black tracking-tight leading-none">
              Halo, {(currentUser?.name ?? formatRole(userRole)).split(' ')[0]} 👋
            </h2>
            <p className="text-xs text-white/65 mt-2 leading-relaxed">
              Pusat kendali SurePath — pantau pesanan, pembayaran, komisi, dan mitra dalam satu tempat.
            </p>
          </div>
          <div className="hidden sm:block flex-shrink-0 -my-2"><SpotNetwork size={84} /></div>
          <button
            onClick={() => {
              getAdminStats().then(setAdminStats).catch(() => {});
              callGateway('admin_transaksi_overview', {}).then(({ data }) => { if (data) setTransaksiStats(data as any); }).catch(() => {});
            }}
            className="relative z-10 flex items-center gap-2 px-4 py-2 rounded-2xl text-2xs font-black uppercase tracking-wider transition-all bg-white/10 border border-white/15 text-white/85 hover:bg-white/20 self-start"
            title="Refresh data"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Quick actions — one-tap jump into the busiest flows. Only shows
          actions the current role can actually reach. */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'approvals', label: 'Proses Antrean Polis', icon: ClipboardCheck },
          { id: 'claims_admin', label: 'Tinjau Klaim', icon: ShieldAlert },
          { id: 'withdrawals', label: 'Cairkan Komisi', icon: Banknote },
          { id: 'agents', label: 'Kelola Mitra', icon: UserPlus },
        ]
          .filter(a => filteredMenu.some(m => !m.isSeparator && m.id === a.id))
          .map(a => (
            <button key={a.id} onClick={() => goToTab(a.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border bg-ds-card border-ds-border text-ds-ink2 text-2xs font-bold tracking-wide shadow-ds-sm hover:shadow-ds-md hover:border-ds-green/40 hover:text-ds-green transition-all active:scale-[0.97]">
              <a.icon size={14} /> {a.label}
            </button>
          ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Pesanan',     value: adminStats?.totalOrders ?? '—', exact: undefined,                            icon: Activity,   to: 'policy_orders',     color: 'bg-ds-amber-lt text-ds-amber' },
          { label: 'Premi Diterbitkan', value: adminStats ? formatIDRCompact(adminStats.totalPremiumIssued) : '—', exact: adminStats ? formatIDR(adminStats.totalPremiumIssued) : undefined, icon: TrendingUp, to: 'policy_orders',     color: 'bg-ds-green-tint text-ds-green' },
          { label: 'Premi Dibayar',     value: adminStats ? formatIDRCompact(adminStats.totalPremiumPaid) : '—', exact: adminStats ? formatIDR(adminStats.totalPremiumPaid) : undefined,  icon: CheckCircle, to: 'payments',          color: 'bg-ds-blue-lt text-ds-blue' },
          { label: 'Mitra Aktif',       value: adminStats?.activeAgents ?? '—', exact: undefined,                            icon: Users,      to: 'agents',            color: 'bg-ds-amber-lt text-ds-amber' },
        ].map(card => (
          <button key={card.label} type="button" onClick={() => goToTab(card.to)}
            className={`group p-4 sm:p-6 rounded-3xl border text-left transition-all cursor-pointer active:scale-[0.98] ${'bg-ds-card border-ds-border rounded-3xl shadow-ds-sm hover:shadow-ds-md hover:border-ds-green/40'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${card.color}`}>
              <card.icon size={20} />
            </div>
            <p className={`text-xl sm:text-2xl font-black tracking-tight mb-1 tabular-nums ${'text-ds-ink'}`} title={card.exact}>{card.value}</p>
            <p className={`text-2xs font-bold uppercase tracking-wider ${'text-ds-ink3'}`}>{card.label}</p>
            <p className={`mt-2 text-2xs font-bold opacity-0 group-hover:opacity-100 transition-opacity text-ds-green`}>Lihat detail →</p>
          </button>
        ))}
      </div>

      {/* Transaksi Overview + Online Users */}
      <div>
        <p className={`text-2xs font-black uppercase tracking-[0.2em] mb-3 ${'text-ds-ink3'}`}>Transaksi Overview</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Pelanggan',       value: transaksiStats ? transaksiStats.totalCustomers : '—', exact: undefined,                              icon: Users,      to: 'users',             color: 'bg-ds-purple-lt text-ds-purple' },
            { label: 'Total Pesanan',          value: transaksiStats ? transaksiStats.totalOrders : '—', exact: undefined,                                 icon: Activity,   to: 'policy_orders',     color: 'bg-ds-amber-lt text-ds-amber' },
            { label: 'Pembayaran Masuk',       value: transaksiStats ? formatIDRCompact(transaksiStats.totalPembayaranMasuk) : '—', exact: transaksiStats ? formatIDR(transaksiStats.totalPembayaranMasuk) : undefined,             icon: CreditCard, to: 'payments',          color: 'bg-ds-green-tint text-ds-green' },
            { label: 'Total Komisi Mitra',     value: transaksiStats ? formatIDRCompact(transaksiStats.totalKomisiAgen) : '—', exact: transaksiStats ? formatIDR(transaksiStats.totalKomisiAgen) : undefined,                  icon: Coins,      to: 'commission_ledger', color: 'bg-ds-amber-lt text-ds-amber' },
          ].map(card => (
            <button key={card.label} type="button" onClick={() => goToTab(card.to)}
              className={`group p-4 sm:p-6 rounded-3xl border text-left transition-all cursor-pointer active:scale-[0.98] ${'bg-ds-card border-ds-border rounded-3xl shadow-ds-sm hover:shadow-ds-md hover:border-ds-green/40'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${card.color}`}>
                <card.icon size={20} />
              </div>
              <p className={`text-xl sm:text-2xl font-black tracking-tight mb-1 tabular-nums ${'text-ds-ink'}`} title={card.exact}>{card.value}</p>
              <p className={`text-2xs font-bold uppercase tracking-wider ${'text-ds-ink3'}`}>{card.label}</p>
              <p className={`mt-2 text-2xs font-bold opacity-0 group-hover:opacity-100 transition-opacity text-ds-green`}>Lihat detail →</p>
            </button>
          ))}
          {/* Online Users Card */}
          <button type="button" onClick={() => goToTab('security')}
            className={`group p-4 sm:p-6 rounded-3xl border text-left transition-all cursor-pointer active:scale-[0.98] ${'bg-ds-card border-ds-border shadow-ds-sm hover:shadow-ds-md hover:border-ds-green/40'}`}>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${'bg-ds-green-tint text-ds-green'}`}>
                <Users size={20} />
              </div>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <p className={`text-2xl font-black tracking-tight mb-0.5 ${'text-ds-ink'}`}>
              {onlineUsers ? onlineUsers.total : '—'}
            </p>
            <p className={`text-2xs font-bold uppercase tracking-wider mb-2 ${'text-ds-ink3'}`}>Pengguna Online</p>
            {onlineUsers && onlineUsers.total > 0 && (
              <p className={`text-2xs font-bold ${'text-ds-ink3'}`}>
                {Object.entries(onlineUsers.byRole).map(([role, count]) => `${count} ${role}`).join(' · ')}
              </p>
            )}
            <p className={`mt-2 text-2xs font-bold opacity-0 group-hover:opacity-100 transition-opacity text-ds-green`}>Lihat detail →</p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order funnel */}
        <div className={`p-6 rounded-3xl border ${'bg-ds-card border-ds-border shadow-ds-sm'}`}>
          <p className={`text-2xs font-black uppercase tracking-wider mb-5 ${'text-ds-ink3'}`}>Status Pesanan</p>
          {adminStats
            ? (['SUBMITTED','UNDER_REVIEW','APPROVED','ISSUED','REJECTED'] as const).map(st => {
                const count = adminStats.ordersByStatus[st] ?? 0;
                const pct = adminStats.totalOrders > 0 ? (count / adminStats.totalOrders) * 100 : 0;
                const clr: Record<string, string> = {
                  SUBMITTED: 'bg-amber-500', UNDER_REVIEW: 'bg-blue-500',
                  APPROVED: 'bg-emerald-500', ISSUED: 'bg-orange-500', REJECTED: 'bg-rose-500',
                };
                const labels: Record<string, string> = {
                  SUBMITTED: 'Diajukan', UNDER_REVIEW: 'Ditinjau',
                  APPROVED: 'Disetujui', ISSUED: 'Diterbitkan', REJECTED: 'Ditolak',
                };
                return (
                  <div key={st} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={`font-bold ${'text-ds-ink3'}`}>{labels[st]}</span>
                      <span className={`font-black ${'text-ds-ink'}`}>{count}</span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${'bg-ds-card2'}`}>
                      <div className={`h-full ${clr[st]} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            : <p className={`text-xs ${'text-ds-ink3'}`}>Memuat…</p>
          }
        </div>

        {/* Top agents */}
        <div className={`p-6 rounded-3xl border ${'bg-ds-card border-ds-border shadow-ds-sm'}`}>
          <p className={`text-2xs font-black uppercase tracking-wider mb-5 ${'text-ds-ink3'}`}>Mitra Teratas</p>
          {adminStats
            ? adminStats.topAgents.length === 0
              ? <p className={`text-xs ${'text-ds-ink3'}`}>Belum ada data.</p>
              : adminStats.topAgents.map((a, i) => (
                  <div key={a.agent_id} className="flex items-center gap-3 mb-3">
                    <span className={`text-[10px] font-black w-4 ${'text-ds-ink3'}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${'text-ds-ink'}`}>{a.name}</p>
                      <p className={`text-[9px] ${'text-ds-ink3'}`}>{a.orders} pesanan</p>
                    </div>
                    <span className="text-[10px] font-black text-ds-green">{formatIDR(a.premium)}</span>
                  </div>
                ))
            : <p className={`text-xs ${'text-ds-ink3'}`}>Memuat…</p>
          }
          {adminStats && adminStats.pendingCommissions > 0 && (
            <div className={`mt-4 pt-4 border-t flex justify-between text-xs ${'border-ds-border'}`}>
              <span className={'text-ds-ink3'}>Komisi tertunda</span>
              <span className="font-black text-ds-amber">{formatIDR(adminStats.pendingCommissions)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Traffic 7 Hari */}
      <div className={`p-6 rounded-3xl border ${'bg-ds-card border-ds-border shadow-ds-sm'}`}>
        <p className={`text-2xs font-black uppercase tracking-wider mb-5 ${'text-ds-ink3'}`}>Traffic Website — 7 Hari Terakhir</p>
        {trafficStats ? (
          <div className="space-y-4">
            {/* Bar chart */}
            <div className="flex items-end gap-2 h-28">
              {trafficStats.daily.map(d => {
                const maxCount = Math.max(...trafficStats.daily.map(x => x.count), 1);
                const pct = (d.count / maxCount) * 100;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t-sm transition-all duration-700 ${'bg-ds-blue'}`}
                      style={{ height: `${Math.max(pct, 4)}%` }}
                      title={`${d.date}: ${d.count} views`}
                    />
                    <span className={`text-[0.45rem] font-mono ${'text-ds-ink3'}`}>
                      {d.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Top pages */}
            {trafficStats.topPages.length > 0 && (
              <div className="space-y-1.5">
                <p className={`text-[0.5rem] font-black uppercase tracking-widest ${'text-ds-ink3'}`}>Halaman Terpopuler</p>
                {trafficStats.topPages.map(p => (
                  <div key={p.page} className="flex items-center justify-between">
                    <span className={`text-[0.65rem] font-mono truncate max-w-[200px] ${'text-ds-ink2'}`}>{p.page}</span>
                    <span className={`text-[0.65rem] font-black ${'text-ds-blue'}`}>{p.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className={`text-xs ${'text-ds-ink3'}`}>Memuat…</p>
        )}
      </div>
    </div>
  );

  // ── Content router ─────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':        return <DashboardView />;
      case 'reports':          return <ReportsView />;
      case 'analytics':        return <AnalyticsDashboard />;
      case 'inventory':        return <InventoryView />;
      case 'transactions':     return <LedgerView />;
      case 'approvals':        return <ApprovalsView />;
      case 'users':            return <BizAdminView section="users" />;
      case 'user_mgmt':        return <UserManagementView />;
      case 'policy_orders':    return <PolicyOrdersAdmin />;
      case 'agents':           return <AgentManagementView />;
      case 'agent_agreements': return <AgentAgreementsAdmin />;
      case 'claims_admin':     return <ClaimsAdminView />;
      case 'financial':        return <FinancialAdmin />;
      case 'insurers':         return <InsurerAdmin />;
      case 'ojk_rates':        return <OjkRateAdmin />;
      case 'vehicle_pricelist':return <VehiclePricelistAdmin />;
      case 'commission_ledger':return <CommissionLedger />;
      case 'payments':         return <PaymentsAdminView />;
      case 'withdrawals':      return <WithdrawalsAdminView />;
      case 'endorsements':     return <EndorsementsAdminView />;
      case 'documents':        return <DocumentsAdminView />;
      case 'b2b':              return <B2BAdminView />;
      case 'product_config':   return <ProductConfigAdmin />;
      case 'tier_promo':       return <TierPromoConfigAdmin />;
      case 'website_editor':   return <WebsiteEditorAdmin />;
      case 'portal_icons':     return <PortalIconManagerView />;
      case 'ai_admin':         return <AIAdminView />;
      case 'ai_finance':       return <AIFinanceView />;
      case 'ops_console':      return <OpsConsoleView />;
      case 'pathy_logs':       return <PathyTranscriptsView />;
      case 'activity_log':     return <ActivityLogView />;
      case 'security':         return <SecurityView />;
      case 'settings':         return <SettingsErrorBoundary><SettingsView products={products} setProducts={setProducts} currentUserRole={userRole} /></SettingsErrorBoundary>;
      case 'role_permissions': return <RolePermissionsView currentUserRole={userRole} />;
      default:                 return null;
    }
  };

  // ── Layout vars ────────────────────────────────────────────────────────────
  const rootBg   = 'bg-ds-bg text-ds-ink';
  const headerBg = 'sp-glass-strong border-ds-border shadow-ds-sm transition-[background-color,border-color,box-shadow] duration-300';
  const inputBg  = 'bg-ds-card2 border-ds-border text-ds-ink placeholder-ds-ink3';

  return (
    <div className={`sp-modern-app flex h-[100dvh] overflow-hidden font-sans ${rootBg}`}>
      {/* ── Animated background ───────────────────────────────────────────── */}
      <style>{`
        @keyframes orb1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(60px,-40px) scale(1.15)} }
        @keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-50px,30px) scale(0.9)} 66%{transform:translate(40px,50px) scale(1.1)} }
        @keyframes orb3 { 0%,100%{transform:translate(0,0) scale(1.05)} 50%{transform:translate(-30px,-60px) scale(0.95)} }
        @keyframes spPalette { from{opacity:0;transform:translateY(-8px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
        .sp-palette-pop { animation: spPalette 160ms ease-out both; }
        @media (prefers-reduced-motion: reduce) { .sp-palette-pop { animation: none; } }
      `}</style>
      <div style={{ position:'fixed', top:'10%', left:'5%', width:600, height:600, borderRadius:'50%', background:'rgba(16,185,129,0.07)', filter:'blur(120px)', animation:'orb1 18s ease-in-out infinite', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', top:'30%', right:'8%', width:500, height:500, borderRadius:'50%', background:'rgba(59,130,246,0.05)', filter:'blur(120px)', animation:'orb2 24s ease-in-out infinite', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', bottom:'10%', left:'40%', width:700, height:700, borderRadius:'50%', background:'rgba(245,158,11,0.05)', filter:'blur(120px)', animation:'orb3 20s ease-in-out infinite', pointerEvents:'none', zIndex:0 }} />

      {/* ── Desktop sidebar ────────────────────────────────────────────────── */}
      {!isMobile && (
        <aside className={`border-r flex flex-col flex-shrink-0 z-20 sp-glass-strong transition-[width,padding] duration-300 ease-out ${isRail ? 'w-[76px] p-3' : 'w-64 p-6'} ${sidebarBg}`}>
          {SidebarContent()}
        </aside>
      )}

      {/* ── Mobile sidebar overlay ─────────────────────────────────────────── */}
      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 z-[1000]">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setMobileOpen(false)} />
          <aside className={`absolute top-0 left-0 bottom-0 w-64 border-r flex flex-col p-6 z-10 sp-glass-strong ${sidebarBg} shadow-ds-sm`} style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))" }}>
            {SidebarContent()}
          </aside>
        </div>
      )}

      {/* ── Command palette (Ctrl/Cmd+K) — replaces the old dead search input ── */}
      {paletteOpen && (
        <div className="fixed inset-0 z-[1100] flex items-start justify-center pt-[12vh] px-4" onMouseDown={() => setPaletteOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg rounded-3xl border bg-ds-card border-ds-border shadow-2xl overflow-hidden sp-palette-pop"
            onMouseDown={e => e.stopPropagation()}
            role="dialog"
            aria-label="Cari menu"
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-ds-border">
              <Search size={17} className="text-ds-ink3 flex-shrink-0" />
              <input
                ref={paletteInputRef}
                value={paletteQuery}
                onChange={e => setPaletteQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setPaletteIndex(i => Math.min(i + 1, Math.max(paletteResults.length - 1, 0))); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setPaletteIndex(i => Math.max(i - 1, 0)); }
                  else if (e.key === 'Enter' && paletteResults[paletteIndex]) {
                    goToTab(paletteResults[paletteIndex].id);
                    setPaletteOpen(false); setPaletteQuery('');
                  }
                }}
                placeholder="Ketik nama menu… (mis. penarikan, tier, klaim)"
                className="flex-1 bg-transparent outline-none text-sm font-semibold text-ds-ink placeholder-ds-ink3"
              />
              <kbd className="px-1.5 py-0.5 rounded-md bg-ds-card2 border border-ds-border text-[0.55rem] font-black text-ds-ink3">ESC</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {paletteResults.length === 0 ? (
                <p className="text-center py-8 text-xs font-bold text-ds-ink3">Tidak ada menu yang cocok.</p>
              ) : paletteResults.map((r, i) => (
                <button
                  key={r.id}
                  onMouseEnter={() => setPaletteIndex(i)}
                  onClick={() => { goToTab(r.id); setPaletteOpen(false); setPaletteQuery(''); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${i === paletteIndex ? 'bg-ds-green-tint' : 'hover:bg-ds-card2'}`}
                >
                  <r.icon size={16} className={i === paletteIndex ? 'text-ds-green' : 'text-ds-ink3'} />
                  <span className={`text-xs font-bold flex-1 min-w-0 truncate ${i === paletteIndex ? 'text-ds-ink' : 'text-ds-ink2'}`}>{r.label}</span>
                  {i === paletteIndex && <CornerDownLeft size={13} className="text-ds-green flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Header */}
        <header className={`min-h-16 border-b flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10 flex-shrink-0 ${headerBg}`} style={{ paddingTop: "env(safe-area-inset-top, 0px)", minHeight: "calc(4rem + env(safe-area-inset-top, 0px))" }}>
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {isMobile && (
              <button onClick={() => setMobileOpen(true)} className={`p-2 rounded-xl ${'bg-ds-card2 text-ds-ink3'}`}>
                <Menu size={20} />
              </button>
            )}
            <button
              onClick={() => setPaletteOpen(true)}
              title="Cari menu (Ctrl+K)"
              className={`flex items-center gap-2 flex-1 min-w-0 max-w-xs rounded-xl py-2 px-3 text-xs font-medium outline-none border transition-all hover:border-ds-green/50 focus:border-ds-green/60 ${inputBg}`}
            >
              <Search size={15} className="text-ds-ink3 flex-shrink-0" />
              <span className="text-ds-ink3 truncate">Cari menu…</span>
              <span className="ml-auto hidden sm:flex items-center flex-shrink-0 px-1.5 py-0.5 rounded-md bg-ds-bg/60 border border-ds-border text-[0.55rem] font-black text-ds-ink3 tracking-wider">
                {/Mac/i.test(navigator.userAgent) ? '⌘K' : 'Ctrl K'}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentUser?.email && (
              <span className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl text-2xs font-bold uppercase tracking-wider border ${'bg-ds-card2 border-ds-border text-ds-ink3'}`}>
                <span className={`w-5 h-5 rounded-full bg-emerald-500/20 text-ds-green flex items-center justify-center font-black text-badge`}>
                  {(currentUser.name ?? currentUser.email)[0].toUpperCase()}
                </span>
                {currentUser.email}
              </span>
            )}
            {/* Day / Night toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl border transition-all ${'bg-ds-card2 border-ds-border text-ds-amber hover:bg-ds-card'}`}
              title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
            >
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            {/* Auto-backup status indicator.
                Hidden below `sm` on purpose: the header already carries the
                search field and four controls, and at 390px this badge was the
                thing that broke — flex squeezed it until every letter wrapped
                onto its own line ("B/A/C/K/U/P/...") and the control next to it
                was pushed off the edge. `whitespace-nowrap shrink-0` stops it
                shattering at any width where it does show. */}
            {backupStatus !== 'idle' && (
              <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-2xs font-black uppercase tracking-wider border whitespace-nowrap shrink-0 ${
                backupStatus === 'running' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                backupStatus === 'ok'      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                             'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {backupStatus === 'running' && <Loader2 size={10} className="animate-spin" />}
                {backupStatus === 'ok'      && <CheckCircle size={10} />}
                {backupStatus === 'running' ? 'Backup berjalan...' : backupStatus === 'ok' ? 'Backup selesai' : 'Backup gagal'}
              </div>
            )}
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(v => !v)}
                className={`relative p-2 rounded-xl border ${'bg-ds-card2 border-ds-border text-ds-ink3'}`}
              >
                <Bell size={17} />
                {notifications.some(n => !n.read) && (
                  <span className={`absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 ${'border-ds-bg'}`}>
                    <span className="sr-only">{notifications.filter(n => !n.read).length} notifikasi baru</span>
                  </span>
                )}
              </button>
              {showNotifications && (
                <div
                  className={`absolute right-0 top-full mt-2 w-80 rounded-2xl border shadow-2xl z-50 overflow-hidden ${'bg-ds-card border-ds-border shadow-ds-lg'}`}
                  onMouseLeave={() => setShowNotifications(false)}
                >
                  <div className={`px-4 py-3 border-b flex items-center justify-between ${'border-ds-border'}`}>
                    <p className={`text-[0.6rem] font-black uppercase tracking-widest ${'text-ds-ink3'}`}>Notifikasi</p>
                    {notifications.some(n => !n.read) && (
                      <button
                        onClick={async () => {
                          await Promise.all(notifications.filter(n => !n.read).map(n => markAdminNotificationRead(n.id)));
                          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                        }}
                        className="text-[0.55rem] font-bold text-ds-green hover:text-emerald-400"
                      >
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto no-scrollbar">
                    {notifications.length === 0 ? (
                      <p className={`text-center py-8 text-xs font-bold ${'text-ds-ink3'}`}>Tidak ada notifikasi</p>
                    ) : notifications.slice(0, 20).map(n => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={async () => {
                          if (!n.read) {
                            await markAdminNotificationRead(n.id);
                            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
                          }
                          // Navigate to relevant tab if type matches
                          if (n.type === 'NEW_AGENT') goToTab('agents');
                          else if (n.type === 'NEW_CUSTOMER') goToTab('users');
                          setShowNotifications(false);
                        }}
                        className={`w-full text-left px-4 py-3 border-b transition-colors ${'border-ds-border hover:bg-ds-card2'} ${!n.read ? 'bg-ds-green-tint' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />}
                          <div className={!n.read ? '' : 'pl-3.5'}>
                            <p className={`text-xs font-black leading-tight ${'text-ds-ink'}`}>{n.title}</p>
                            <p className={`text-[0.6rem] font-medium mt-0.5 ${'text-ds-ink3'}`}>{n.body}</p>
                            <p className={`text-[0.5rem] font-bold mt-1 ${'text-ds-ink2'}`}>
                              {new Date(n.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Mobile close */}
            {isMobile && (
              <button
                onClick={onLogout}
                className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                title="Keluar"
              >
                <X size={17} />
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <div ref={contentRef} className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 no-scrollbar ${'bg-ds-card2'}`}>
          <div className="max-w-7xl mx-auto">
            <AgentArtKeyframes />
            {/* Themed hero banner for every view (dashboard has its own) */}
            {activeTab !== 'dashboard' && (() => {
              const item = MENU_ITEMS.find(m => !m.isSeparator && m.id === activeTab) as { label?: string } | undefined;
              if (!item?.label) return null;
              const Art = TAB_ART[activeTab] ?? SpotOrders;
              return (
                <AgentHero
                  title={item.label}
                  subtitle={TAB_SUBTITLE[activeTab]}
                  art={<Art size={72} />}
                  className="mb-6 lg:mb-8"
                />
              );
            })()}
            <Suspense fallback={<AdminViewLoader />}>
              <div key={activeTab} className="sp-page-enter">
                {renderContent()}
              </div>
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPortal;
