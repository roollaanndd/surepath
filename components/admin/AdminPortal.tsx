
import React, { useState, useEffect, useRef, useCallback, Component, lazy, Suspense } from 'react';
import '../../src/styles/portal-modernization.css';
import { LogOut, Search, Menu, Bell, CheckCircle, X, Upload, Loader2, RefreshCw, PanelLeftClose, PanelLeftOpen, CornerDownLeft, Keyboard } from 'lucide-react';
import { adminNotifMeta, adminNotifTimeAgo } from './notifMeta';
// ── Performance: lazy-load all admin views ──────────────────────────────────
// AdminPortal chunk was 724 KB (largest in the app). Each admin view is
// 50-200 KB; loading all 17 eagerly bloated the initial bundle. Now they
// only load when the admin navigates to them.
const SettingsView = lazy(() => import('./AdminViews').then(m => ({ default: m.SettingsView })));
const SecurityView = lazy(() => import('./AdminViews').then(m => ({ default: m.SecurityView })));
const OpsConsoleView = lazy(() => import('./OpsConsoleView'));
const PathyTranscriptsView = lazy(() => import('./PathyTranscriptsView'));
const ActivityLogView = lazy(() => import('./ActivityLogView'));
const AgentManagementView = lazy(() => import('./AdminViews').then(m => ({ default: m.AgentManagementView })));
const ClaimsAdminView = lazy(() => import('./AdminViews').then(m => ({ default: m.ClaimsAdminView })));
const UserManagementView = lazy(() => import('./AdminViews').then(m => ({ default: m.UserManagementView })));
const PaymentsAdminView = lazy(() => import('./AdminViews').then(m => ({ default: m.PaymentsAdminView })));
const WithdrawalsAdminView = lazy(() => import('./AdminViews').then(m => ({ default: m.WithdrawalsAdminView })));
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
const AdminDashboard = lazy(() => import('./AdminDashboard'));
const EndorsementsAdminView = lazy(() => import('./EndorsementsAdminView'));
const B2BAdminView = lazy(() => import('./B2BAdminView'));
const DocumentsAdminView = lazy(() => import('./DocumentsAdminView'));
const TierPromoConfigAdmin = lazy(() => import('./TierPromoConfigAdmin'));
import { scrollPortalToTop } from '../shared/scrollReset';
import { applyDarkMode, readDarkMode } from '../shared/theme';
import { UserRole } from '../../types';
import { getAdminStats, type AdminStats, uploadLogoImage, getOnlineUsers, type OnlineUsersResult, getAdminNotifications, markAdminNotificationRead, getTierChangeRequests, type SpAdminNotification, getAllClaims, getAdminWithdrawals, type SpClaim, type Withdrawal } from '../../services/supabaseService';
import { shouldAutoBackup, performBackup } from '../../services/backupService';
import { SurePathLogo } from '../Navbar';
import { PathyNavIcon } from '../shared/PathyNavIcon';
import { buildVisibleNav, groupForSection, sectionForLeaf, ADMIN_MENU_ITEMS as MENU_ITEMS } from './navigation';
// Workspace dashboards per peran (fitur branch redesign — role workspaces):
// peran tertentu memperoleh dashboard khusus menggantikan DashboardView umum.
import { getAdminWorkspace } from '../../src/admin/roleConfig';
import CommandDashboard from './workspaces/command/CommandDashboard';
import FinanceDashboard from './workspaces/finance/FinanceDashboard';
import InsurerLiaisonDashboard from './workspaces/insurer/InsurerLiaisonDashboard';
import CollectionsDashboard from './workspaces/collections/CollectionsDashboard';
import BusinessSupportDashboard from './workspaces/support/BusinessSupportDashboard';
import AgentOnboardingDashboard from './workspaces/onboarding/AgentOnboardingDashboard';
import MarketingDashboard from './workspaces/marketing/MarketingDashboard';
import ModuleIcon from '../shared/ModuleIcon';

// Suspense fallback for lazy-loaded admin views
const AdminViewLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 size={32} className="animate-spin text-ds-green" />
  </div>
);

// ─── Menu definition ────────────────────────────────────────────────────────
// MENU_ITEMS kini diimpor dari ./navigation (ADMIN_MENU_ITEMS) — satu sumber
// kebenaran bersama dengan matriks izin di Pengaturan (anti-drift).

// ── Bar navigasi bawah (< 1024px) ────────────────────────────────────────────
// Empat tujuan tersibuk; sisanya tetap lewat drawer. Difilter per izin role
// dengan allowedLeafIds, jadi role tanpa akses tidak pernah melihat tombolnya.
const BOTTOM_NAV: Array<{ id: string; label: string }> = [
  { id: 'dashboard',    label: 'Ringkasan' },
  { id: 'approvals',    label: 'Review' },
  { id: 'policy_orders', label: 'Polis' },
  { id: 'claims_admin', label: 'Klaim' },
];

const formatRole = (role: string) =>
  role.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// ── Subjudul per view (visual only) ──────────────────────────────────────────
const TAB_SUBTITLE: Record<string, string> = {
  analytics: 'Analitik traffic, funnel, dan pertumbuhan.',
  user_mgmt: 'Kelola akun, peran, akses, dan pantau partner teraktif.',
  payments: 'Pembayaran premi via Xendit.',
  withdrawals: 'Pencairan komisi mitra — approval berlapis.',
  policy_orders: 'Semua pesanan polis lintas produk.',
  approvals: 'Antrean pengajuan yang menunggu keputusan.',
  claims_admin: 'Antrean klaim yang perlu ditinjau.',
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
  financial: 'Kesehatan keuangan dan laporan periode platform.',
  vehicle_pricelist: 'Database harga kendaraan.',
  website_editor: 'Kelola konten website publik.',
  ai_admin: 'Asisten AI untuk tugas administratif.',
  ai_finance: 'Asisten AI untuk analisis keuangan.',
  ops_console: 'Konsol operasional harian lintas tim.',
  portal_icons: 'Kelola ikon ilustratif seluruh portal.',
  pathy_logs: 'Transkrip percakapan asisten Pathy.',
  activity_log: 'Riwayat aktivitas admin untuk audit.',
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

// Notifikasi (ikon per tipe + waktu relatif): diekstrak ke notifMeta.ts
// (Admin Portal 2.0) supaya panel bell di header ini dan kartu "Aktivitas
// Terbaru" di AdminDashboard memakai satu sumber kebenaran yang sama.

// ─── Kesegaran data per sumber ───────────────────────────────────────────────
type AdminSourceKey = 'stats' | 'claims' | 'withdrawals' | 'tier' | 'notif' | 'online';
const ADMIN_SOURCE_LABELS: Record<AdminSourceKey, string> = {
  stats: 'Statistik dashboard',
  claims: 'Antrean klaim',
  withdrawals: 'Antrean penarikan',
  tier: 'Antrean tier',
  notif: 'Notifikasi',
  online: 'Pengguna online',
};

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
  const [logoUrl, setLogoUrl]         = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'running' | 'ok' | 'fail'>('idle');
  const logoInputRef = useRef<HTMLInputElement>(null);
  // Tema admin: TERANG TETAP (design.md §4 — light-only, tanpa auto-hours).
  // Kunci shared `sp_dark_mode` milik portal customer/agent TIDAK ditulis:
  // admin hanya memadamkan class dark pada <html> selama CMS terpasang,
  // lalu memulihkannya mengikuti preferensi tersimpan saat CMS ditutup.
  // (Dulu admin menimpa sp_dark_mode setiap 5 menit lewat auto-dark — bug
  // lintas-portal yang ikut tertutup dengan light-only.)
  useEffect(() => {
    applyDarkMode(false);
    return () => {
      applyDarkMode(readDarkMode());
    };
  }, []);
  const [permsVersion, setPermsVersion] = useState(0);
  // Preferensi tersimpan di Pengaturan (izin menu) disinkronkan ke shell
  // secara live lewat event — tidak perlu reload.
  useEffect(() => {
    const onPermsChanged = () => setPermsVersion(v => v + 1);
    window.addEventListener('sp-admin-perms-changed', onPermsChanged);
    return () => {
      window.removeEventListener('sp-admin-perms-changed', onPermsChanged);
    };
  }, []);
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
  const [onlineUsers, setOnlineUsers] = useState<OnlineUsersResult | null>(null);
  const [notifications, setNotifications] = useState<SpAdminNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifUnreadOnly, setNotifUnreadOnly] = useState(false);
  // Live operational queues feeding both the dashboard KPIs and the nav badges:
  // claims awaiting review + withdrawals stuck in the L1–L3 approval ladder.
  // Both are read via the existing admin gateway actions their views already
  // use — no new backend surface, no fake numbers.
  const [claimsQueue, setClaimsQueue] = useState<SpClaim[] | null>(null);
  const [withdrawalQueue, setWithdrawalQueue] = useState<Withdrawal[] | null>(null);
  // Kesegaran data PER SUMBER: admin melihat sumber mana yang gagal, bukan
  // sekadar agregat "sebagian". Popover di header merinci tiap sumber.
  const [health, setHealth] = useState<Record<AdminSourceKey, { ok: boolean | null; at: Date | null }>>({
    stats: { ok: null, at: null },
    claims: { ok: null, at: null },
    withdrawals: { ok: null, at: null },
    tier: { ok: null, at: null },
    notif: { ok: null, at: null },
    online: { ok: null, at: null },
  });
  const [healthOpen, setHealthOpen] = useState(false);
  const markSource = useCallback((key: AdminSourceKey, ok: boolean) => {
    setHealth(prev => ({ ...prev, [key]: { ok, at: new Date() } }));
  }, []);
  // ── Revamp 2026-10-25: interactive shell upgrades ────────────────────────
  // (a) Collapsible desktop sidebar — icon rail for power users, persisted.
  const [rail, setRail] = useState(() => {
    try { return localStorage.getItem('SP_ADMIN_RAIL') === '1'; } catch { return false; }
  });
  const toggleRail = useCallback(() => {
    setRail(prev => {
      try { localStorage.setItem('SP_ADMIN_RAIL', prev ? '0' : '1'); } catch { /* storage blocked */ }
      return !prev;
    });
  }, []);
  // (b) Live queue badges on nav items — the admin sees pending work WITHOUT
  // opening each view (audit 6-b #7: approval queues lacked discoverability).
  const [tierPending, setTierPending] = useState(0);
  // (c) Command palette (Ctrl/Cmd+K) — the header search was a dead input;
  // it now drives fuzzy menu navigation.
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Lags `paletteOpen` on the way to closed so the palette can play its
  // exit transition (fade + scale down) instead of vanishing the instant
  // Escape/backdrop/Enter flips `paletteOpen` to false.
  const [paletteVisible, setPaletteVisible] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);
  const paletteInputRef = useRef<HTMLInputElement>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Satu titik refresh untuk KPI + antrean. Kegagalan per sumber dicatat di
  // health map — KPI yang sudah ter-render tidak diblankout oleh poll gagal.
  const refreshStats = useCallback(() => {
    const tasks: Promise<unknown>[] = [
      getAdminStats().then(setAdminStats),
      getAllClaims().then(setClaimsQueue),
      getAdminWithdrawals(200, true).then(setWithdrawalQueue),
    ];
    void Promise.allSettled(tasks).then(results => {
      markSource('stats', results[0].status === 'fulfilled');
      markSource('claims', results[1].status === 'fulfilled');
      markSource('withdrawals', results[2].status === 'fulfilled');
    });
  }, [markSource]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);

    refreshStats();
    const statsInterval = setInterval(refreshStats, 120000);

    // Online users
    const loadOnline = () => getOnlineUsers()
      .then(r => { setOnlineUsers(r); markSource('online', true); })
      .catch(() => markSource('online', false));
    loadOnline();
    const onlineInterval = setInterval(loadOnline, 60000);

    // Notifications — load on mount, refresh every 60s
    const loadNotifs = () => getAdminNotifications()
      .then(r => { setNotifications(r); markSource('notif', true); })
      .catch(() => markSource('notif', false));
    loadNotifs();
    const notifInterval = setInterval(loadNotifs, 60000);

    // Pending tier-approval queue — feeds the nav badge on "Tier & Promo".
    const loadTierQueue = () => getTierChangeRequests('PENDING')
      .then(r => { setTierPending(r.length); markSource('tier', true); })
      .catch(() => markSource('tier', false));
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
  }, [refreshStats, markSource]);

  // ── Command palette keyboard wiring ───────────────────────────────────────
  useEffect(() => {
    if (!paletteOpen) return;
    setPaletteIndex(0);
    const t = setTimeout(() => paletteInputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [paletteOpen]);

  // Exit-transition timing for the command palette — mirrors the
  // spPaletteOut keyframe duration defined below.
  useEffect(() => {
    if (paletteOpen) {
      setPaletteVisible(true);
      return;
    }
    if (!paletteVisible) return;
    const t = setTimeout(() => setPaletteVisible(false), 140);
    return () => clearTimeout(t);
  }, [paletteOpen, paletteVisible]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(v => !v);
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
        setShowNotifications(false);
        setShortcutsOpen(false);
        setHealthOpen(false);
        setMobileOpen(false);
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Jangan mencuri '?' saat sedang mengetik di field.
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return;
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Role-based menu with localStorage overrides ────────────────────────────
  // Izin tersimpan kosong diperlakukan salah konfigurasi (bukan "tidak boleh
  // melihat apa-apa") — kalau tidak, satu klik salah di matriks izin mengunci
  // seluruh role dari menu DAN dari halaman Pengaturan yang bisa memperbaikinya.
  const filteredMenu = (() => {
    // permsEpoch membuat render bergantung pada versi izin: saat halaman
    // Pengaturan men-dispatch 'sp-admin-perms-changed', bump state memicu
    // pembacaan ulang localStorage di sini — sidebar sinkron tanpa reload.
    const permsEpoch = permsVersion;
    if (userRole === UserRole.MASTER_ADMIN) return MENU_ITEMS.filter(m => m.roles.includes(userRole));
    try {
      const saved = permsEpoch >= 0 ? localStorage.getItem('SP_ROLE_PERMISSIONS') : null;
      if (saved) {
        const perms: Record<string, string[]> = JSON.parse(saved);
        const allowed = perms[userRole] ?? null;
        if (allowed && allowed.length > 0) {
          return MENU_ITEMS.filter(m => {
            if (m.isSeparator) return m.roles.includes(userRole);
            return allowed.includes(m.id);
          });
        }
      }
    } catch { /* fall through to default */ }
    return MENU_ITEMS.filter(m => m.roles.includes(userRole));
  })();

  // Sidebar hanya menampilkan 17 section; view yang bertetangga menjadi tab.
  // filteredMenu tetap berisi 29 leaf supaya izin per-role dan command palette
  // tidak berubah perilakunya.
  const visibleNav = buildVisibleNav(
    filteredMenu.filter(m => !m.isSeparator).map(m => m.id),
  );
  const allowedLeafIds = new Set(filteredMenu.filter(m => !m.isSeparator).map(m => m.id));
  const activeSection = sectionForLeaf(activeTab);
  const activeSectionChildren = activeSection
    ? activeSection.childIds.filter(id => allowedLeafIds.has(id))
    : [];
  const activeGroup = activeSection ? groupForSection(activeSection.id) : undefined;

  // Kesegaran data: baris popover + agregat untuk pil header.
  const healthRows = (Object.keys(ADMIN_SOURCE_LABELS) as AdminSourceKey[])
    .map(key => ({ key, label: ADMIN_SOURCE_LABELS[key], ...health[key] }));
  const failedSourceCount = healthRows.filter(r => r.ok === false).length;
  const lastSyncAt = healthRows.reduce<Date | null>(
    (acc, r) => (r.at && (!acc || r.at > acc) ? r.at : acc), null,
  );
  const syncState: 'ok' | 'partial' | 'syncing' =
    failedSourceCount > 0 ? 'partial'
    : healthRows.some(r => r.ok === null) ? 'syncing'
    : 'ok';

  // Command palette = aksi cepat + navigasi menu (TDZ-safe: semua dependensi
  // sudah dideklarasikan di atas blok ini).
  type PaletteRow = { key: string; label: string; icon?: React.ElementType; iconId?: string; onSelect: () => void };
  const closePalette = () => { setPaletteOpen(false); setPaletteQuery(''); };
  const quickActions: PaletteRow[] = [
    { key: 'act-refresh', label: 'Muat ulang data dashboard', icon: RefreshCw, onSelect: () => { refreshStats(); closePalette(); } },
    { key: 'act-rail', label: rail ? 'Perlebar sidebar' : 'Ciutkan sidebar', icon: rail ? PanelLeftOpen : PanelLeftClose, onSelect: () => { toggleRail(); closePalette(); } },
  ];
  const q = paletteQuery.trim().toLowerCase();
  const filteredActions = q
    ? quickActions.filter(a => a.label.toLowerCase().includes(q))
    : quickActions;
  const menuItems = filteredMenu.filter(m => !m.isSeparator) as Array<{ id: string; label: string }>;
  const filteredMenus = (q
    ? menuItems.filter(m => m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))
    : menuItems
  ).slice(0, 8).map<PaletteRow>(m => ({
    key: m.id,
    label: m.label,
    iconId: m.id,
    onSelect: () => { goToTab(m.id); closePalette(); },
  }));
  const paletteRows = [...filteredActions, ...filteredMenus];
  const paletteActionCount = filteredActions.length;
  // Live work-queue badges: order approval queue, tier approval queue,
  // claim review queue and pending withdrawals — discovered from the same
  // polls that power the dashboard, so the nav never invents a count.
  const approvalQueueCount = adminStats
    ? (adminStats.ordersByStatus?.SUBMITTED ?? 0) + (adminStats.ordersByStatus?.UNDER_REVIEW ?? 0)
    : 0;
  const claimsPendingCount = (claimsQueue ?? []).filter(
    c => c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW',
  ).length;
  const withdrawalsPendingCount = (withdrawalQueue ?? []).filter(
    w => typeof w.status === 'string' && w.status.startsWith('PENDING'),
  ).length;
  const navBadgeFor = (id: string): number => {
    switch (id) {
      case 'approvals':    return approvalQueueCount;
      case 'tier_promo':   return tierPending;
      case 'claims_admin': return claimsPendingCount;
      case 'withdrawals':  return withdrawalsPendingCount;
      default:             return 0;
    }
  };
  const navBadgeForSection = (childIds: readonly string[]): number =>
    childIds.reduce((total, id) => total + navBadgeFor(id), 0);
  // Notifikasi: hitungan belum-dibaca + daftar terfilter untuk panel.
  const unreadNotifCount = notifications.filter(n => !n.read).length;
  const visibleNotifications = (notifUnreadOnly
    ? notifications.filter(n => !n.read)
    : notifications
  ).slice(0, 30);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const url = await uploadLogoImage(file);
      if (url) {
        setLogoUrl(url);
      } else {
        console.error('[AdminPortal] uploadLogoImage returned no url');
      }
    } catch (err) {
      // Upload gagal tidak boleh diam-diam: operator mengira logo sudah ganti.
      console.error('[AdminPortal] logo upload failed:', err);
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  // ── Sidebar ────────────────────────────────────────────────────────────
  // Revamp 2026-10-25: collapsible icon rail (desktop), live work-queue badges,
  // active-state accent bar. The sidebar itself is always the dark-green brand
  // gradient, so white text is intentional there.
  const isRail = !isMobile && rail;
  const SidebarContent = () => (
    <div className="sp-modern-app flex flex-col h-full min-h-0">
      {/* Header sidebar: identitas + toggle collapse dalam satu baris bersih.
          Logout cukup satu pintu (footer) — tombol "Kembali" duplikat dihapus.
          Ganti logo tetap lewat klik logo (tooltip menjelaskan). */}
      <div className={`mb-5 pb-4 border-b border-white/10 ${isRail ? 'flex flex-col items-center gap-2.5' : 'flex items-center justify-between gap-2'}`}>
        <div className={`flex items-center gap-3 ${isRail ? '' : 'min-w-0'}`}>
          <div className="relative group flex-shrink-0">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25 overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95"
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
            <div className="min-w-0">
              <h1 className="font-black text-lg tracking-tight leading-none text-white">
                Sure<span className="text-[color:var(--sp-admin-green,#08784E)]">Path</span>
              </h1>
              <p className="text-2xs font-bold uppercase tracking-[0.3em] mt-1 text-emerald-100/60">
                Admin Console
              </p>
            </div>
          )}
        </div>
        {!isMobile && (
          <button
            onClick={toggleRail}
            className="p-1.5 rounded-lg text-ds-ink3 hover:text-ds-ink hover:bg-ds-card2 transition-all flex-shrink-0"
            title={isRail ? 'Perlebar sidebar' : 'Ciutkan sidebar'}
            aria-label={isRail ? 'Perlebar sidebar' : 'Ciutkan sidebar'}
          >
            {isRail ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        )}
      </div>

      {/* Nav — scrollable */}
      <nav
        ref={setSidebarNavRef}
        onScroll={event => { sidebarScrollTop.current = event.currentTarget.scrollTop; }}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar space-y-0.5 pr-1"
      >
        {visibleNav.map(({ group, sections }, groupIndex) => (
          <div key={group.id} className="sp-nav-group">
            {isRail ? (
              <div className="mx-auto my-2.5 h-px w-6 bg-white/15 rounded-full" />
            ) : (
              <div className={`${groupIndex === 0 ? 'mt-1' : 'mt-5'} mb-1.5 px-2`}>
                <p className="text-2xs font-black uppercase tracking-[0.24em] text-ds-ink3">{group.label}</p>
              </div>
            )}
            {sections.map(section => {
              const first = section.children[0];
              const badge = navBadgeForSection(section.children);
              const active = section.children.includes(activeTab);
              return (
                <button
                  key={section.id}
                  onClick={() => { goToTab(first); setMobileOpen(false); }}
                  title={isRail ? section.label : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={`relative w-full flex items-center rounded-2xl transition-all text-left sp-interactive-surface group/nav ${
                    isRail ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-2.5'
                  } ${
                    active
                      ? 'border border-ds-green/25 bg-ds-green-tint text-ds-green shadow-sm'
                      : 'border border-transparent text-ds-ink2 hover:text-ds-ink hover:bg-ds-card2'
                  }`}
                >
                  {active && (
                    <span aria-hidden className={`sp-accent-bar absolute rounded-full bg-emerald-300 ${isRail ? 'left-0 top-1/2 -translate-y-1/2 w-[3px] h-7' : 'left-0 top-1/2 -translate-y-1/2 w-1 h-6'}`} />
                  )}
                  <span className={`relative flex-shrink-0 ${active ? 'drop-shadow-sm' : ''}`}>
                    <PathyNavIcon id={first} size={isRail ? 30 : 28} active={active} />
                    {isRail && badge > 0 && (
                      <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-2xs font-black text-emerald-950 flex items-center justify-center shadow">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </span>
                  {!isRail && (
                    <>
                      <span className="text-2xs font-bold tracking-wide flex-1 min-w-0 truncate">{section.label}</span>
                      {badge > 0 && (
                        <span className="sp-badge-pop flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-amber-400/90 text-2xs font-black text-emerald-950 flex items-center justify-center shadow-sm">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
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
              <p className="text-2xs font-medium truncate text-ds-ink3">{currentUser?.email ?? 'Admin'}</p>
            </div>
          )}
        </div>
        <button
          onClick={onLogout}
          title="Keluar"
          className={`transition-all font-black uppercase tracking-widest flex items-center justify-center border border-ds-border bg-ds-card2 text-ds-ink2 hover:bg-rose-500 hover:text-white hover:border-rose-400/40 ${
            isRail ? 'w-9 h-9 rounded-xl' : 'w-full py-2.5 rounded-xl text-2xs gap-2'
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
  // Dashboard baru: layout 3 kolom dengan data yang bisa ditelusuri.
  // PENTING: render <AdminDashboard /> langsung di router (bukan lewat komponen
  // inline yang didefinisikan di body render) — komponen inline mendapat identitas
  // fungsi baru setiap render sehingga React me-remount seluruh dashboard pada
  // setiap poll 60–120 detik dan state internalnya (filter, pilihan) hilang.


  // ── Content router ─────────────────────────────────────────────────────────
  const renderContent = () => {
    // Role-based workspace routing (branch redesign): peran ber-workspace tetap
    // mendapat dashboard khusus di tab dashboard. Tema workspace mengikuti
    // tema shell (terang tetap — design.md §4).
    const ws = getAdminWorkspace(userRole);
    if (activeTab === 'dashboard' && ws) {
      const dashProps = {
        userRole,
        currentUser,
        onLogout,
      };
      switch (ws) {
        case 'command':     return <CommandDashboard {...dashProps} />;
        case 'finance':     return <FinanceDashboard {...dashProps} />;
        case 'insurer':     return <InsurerLiaisonDashboard {...dashProps} />;
        case 'collections': return <CollectionsDashboard {...dashProps} />;
        case 'support':     return <BusinessSupportDashboard {...dashProps} />;
        case 'onboarding':  return <AgentOnboardingDashboard {...dashProps} />;
        case 'marketing':   return <MarketingDashboard {...dashProps} />;
        // null/peran tak terdaftar jatuh ke switch umum di bawah.
      }
    }
    switch (activeTab) {
      case 'dashboard':
        return (
          <AdminDashboard
            adminStats={adminStats}
            claims={claimsQueue}
            withdrawals={withdrawalQueue}
            tierPending={tierPending}
            onlineUsers={onlineUsers}
            notifications={notifications}
            currentUser={currentUser}
            onNavigate={goToTab}
          />
        );
      case 'analytics':        return <AnalyticsDashboard />;
      // Satu layar keputusan: antrean review hanyalah mode "PENDING" dari
      // Pesanan Polis, lengkap dengan dokumen, pembayaran, dan riwayat.
      case 'approvals':        return <PolicyOrdersAdmin initialPending />;
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
      default:                 return null;
    }
  };

  // ── Layout vars ────────────────────────────────────────────────────────────
  const rootBg   = 'bg-ds-bg text-ds-ink';
  const headerBg = 'sp-glass-strong border-ds-border shadow-ds-sm transition-[background-color,border-color,box-shadow] duration-300';
  const inputBg  = 'bg-ds-card2 border-ds-border text-ds-ink placeholder-ds-ink3';

  const sectionTabs = activeSection && activeSectionChildren.length > 1 ? (
    <div
      role="tablist"
      aria-label={`Tab ${activeSection.label}`}
      className={`flex gap-1 overflow-x-auto no-scrollbar p-1 rounded-2xl border ${'bg-ds-card border-ds-border'}`}
    >
      {activeSectionChildren.map(id => {
        const leaf = MENU_ITEMS.find(m => !m.isSeparator && m.id === id) as { label?: string } | undefined;
        const badge = navBadgeFor(id);
        const selected = id === activeTab;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={selected}
            onClick={() => goToTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              selected
                ? 'bg-ds-green-tint text-ds-green shadow-ds-sm'
                : 'text-ds-ink3 hover:text-ds-ink hover:bg-ds-card2'
            }`}
          >
            {leaf?.label ?? id}
            {badge > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-2xs font-black text-emerald-950 flex items-center justify-center">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div className={`sp-modern-app flex h-[100dvh] overflow-hidden font-sans ${rootBg}`}>
      {/* ── Animated background ───────────────────────────────────────────── */}
      <style>{`
        @keyframes orb1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(60px,-40px) scale(1.15)} }
        @keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-50px,30px) scale(0.9)} 66%{transform:translate(40px,50px) scale(1.1)} }
        @keyframes orb3 { 0%,100%{transform:translate(0,0) scale(1.05)} 50%{transform:translate(-30px,-60px) scale(0.95)} }
        @keyframes spPalette { from{opacity:0;transform:translateY(-8px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
        .sp-palette-pop { animation: spPalette 160ms ease-out both; }
        @keyframes spPaletteOut { from{opacity:1;transform:translateY(0) scale(1)} to{opacity:0;transform:translateY(-6px) scale(.98)} }
        .sp-palette-pop-out { animation: spPaletteOut 140ms ease-in both; }
        @keyframes spDrawer { from{transform:translateX(-18px);opacity:0} to{transform:translateX(0);opacity:1} }
        .sp-drawer-in { animation: spDrawer 240ms cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes spFade { from{opacity:0} to{opacity:1} }
        .sp-fade-in { animation: spFade 200ms ease-out both; }
        @keyframes spPop { from{opacity:0;transform:translateY(-6px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        .sp-pop-in { animation: spPop 160ms cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes spNavGroup { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        .sp-nav-group { animation: spNavGroup 320ms ease-out both; }
        .sp-nav-group:nth-child(2) { animation-delay: 40ms; }
        .sp-nav-group:nth-child(3) { animation-delay: 80ms; }
        .sp-nav-group:nth-child(4) { animation-delay: 120ms; }
        .sp-nav-group:nth-child(5) { animation-delay: 160ms; }
        .sp-nav-group:nth-child(6) { animation-delay: 200ms; }
        @keyframes spAccent { from{transform:translateY(-50%) scaleY(0)} to{transform:translateY(-50%) scaleY(1)} }
        .sp-accent-bar { animation: spAccent 180ms cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes spBadgePop { from{transform:scale(.5)} to{transform:scale(1)} }
        .sp-badge-pop { animation: spBadgePop 220ms cubic-bezier(0.34,1.56,0.64,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .sp-palette-pop, .sp-palette-pop-out, .sp-drawer-in, .sp-fade-in, .sp-pop-in,
          .sp-nav-group, .sp-accent-bar, .sp-badge-pop { animation: none; }
        }
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
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md sp-fade-in" onClick={() => setMobileOpen(false)} />
          <aside className={`absolute top-0 left-0 bottom-0 w-64 border-r flex flex-col p-6 z-10 sp-glass-strong ${sidebarBg} shadow-ds-sm sp-drawer-in`} style={{ paddingTop: "calc(1.5rem + env(safe-area-inset-top, 0px))" }}>
            {SidebarContent()}
          </aside>
        </div>
      )}

      {/* ── Command palette (Ctrl/Cmd+K) — replaces the old dead search input ── */}
      {paletteVisible && (
        <div
          className={`fixed inset-0 z-[1100] flex items-start justify-center pt-[12vh] px-4 transition-opacity duration-150 ${paletteOpen ? 'opacity-100' : 'opacity-0'}`}
          onMouseDown={() => setPaletteOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className={`relative w-full max-w-lg rounded-3xl border bg-ds-card border-ds-border shadow-2xl overflow-hidden ${paletteOpen ? 'sp-palette-pop' : 'sp-palette-pop-out'}`}
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
                  if (e.key === 'ArrowDown') { e.preventDefault(); setPaletteIndex(i => Math.min(i + 1, Math.max(paletteRows.length - 1, 0))); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setPaletteIndex(i => Math.max(i - 1, 0)); }
                  else if (e.key === 'Enter') { paletteRows[paletteIndex]?.onSelect(); }
                }}
                placeholder="Cari menu atau aksi… (mis. penarikan, tier, muat ulang)"
                className="flex-1 bg-transparent outline-none text-sm font-semibold text-ds-ink placeholder-ds-ink3"
              />
              <kbd className="px-1.5 py-0.5 rounded-md bg-ds-card2 border border-ds-border text-2xs font-black text-ds-ink3">ESC</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {paletteRows.length === 0 ? (
                <p className="text-center py-8 text-xs font-bold text-ds-ink3">Tidak ada menu atau aksi yang cocok.</p>
              ) : paletteRows.map((r, i) => (
                <React.Fragment key={r.key}>
                  {i === 0 && paletteActionCount > 0 && (
                    <p className="px-3 pt-2 pb-1 text-2xs font-black uppercase tracking-[0.2em] text-ds-ink3">Aksi cepat</p>
                  )}
                  {i === paletteActionCount && paletteActionCount < paletteRows.length && (
                    <p className="px-3 pt-2 pb-1 text-2xs font-black uppercase tracking-[0.2em] text-ds-ink3">Menu</p>
                  )}
                  <button
                    onMouseEnter={() => setPaletteIndex(i)}
                    onClick={r.onSelect}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${i === paletteIndex ? 'bg-ds-green-tint' : 'hover:bg-ds-card2'}`}
                  >
                    {r.iconId ? <ModuleIcon id={r.iconId} size={24} /> : r.icon ? <r.icon size={16} className={i === paletteIndex ? 'text-ds-green' : 'text-ds-ink3'} /> : null}
                    <span className={`text-xs font-bold flex-1 min-w-0 truncate ${i === paletteIndex ? 'text-ds-ink' : 'text-ds-ink2'}`}>{r.label}</span>
                    {i === paletteIndex && <CornerDownLeft size={13} className="text-ds-green flex-shrink-0" />}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Shortcut overlay (?) ──────────────────────────────────────────── */}
      {shortcutsOpen && (
        <div className="fixed inset-0 z-[1100] flex items-start justify-center pt-[16vh] px-4" onMouseDown={() => setShortcutsOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md rounded-3xl border bg-ds-card border-ds-border shadow-2xl overflow-hidden sp-pop-in"
            onMouseDown={e => e.stopPropagation()}
            role="dialog"
            aria-label="Bantuan shortcut keyboard"
          >
            <div className={`px-5 py-4 border-b flex items-center gap-2.5 ${'border-ds-border'}`}>
              <Keyboard size={16} className="text-ds-green flex-shrink-0" />
              <p className="text-sm font-black text-ds-ink">Shortcut Keyboard</p>
              <kbd className={`ml-auto px-1.5 py-0.5 rounded-md bg-ds-card2 border border-ds-border text-2xs font-black text-ds-ink3`}>ESC</kbd>
            </div>
            <div className="p-3">
              {[
                { keys: /Mac/i.test(navigator.userAgent) ? '⌘ K' : 'Ctrl K', desc: 'Cari menu & aksi cepat' },
                { keys: '?', desc: 'Buka bantuan shortcut ini' },
                { keys: '↑ ↓', desc: 'Navigasi hasil pencarian' },
                { keys: 'Enter', desc: 'Jalankan item terpilih' },
                { keys: 'Esc', desc: 'Tutup panel yang terbuka' },
              ].map(s => (
                <div key={s.keys} className="flex items-center justify-between px-3 py-2.5 rounded-xl">
                  <span className="text-xs font-bold text-ds-ink2">{s.desc}</span>
                  <kbd className="px-2 py-1 rounded-lg bg-ds-card2 border border-ds-border text-2xs font-black text-ds-ink2 whitespace-nowrap">{s.keys}</kbd>
                </div>
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
              <span className="ml-auto hidden sm:flex items-center flex-shrink-0 px-1.5 py-0.5 rounded-md bg-ds-bg/60 border border-ds-border text-2xs font-black text-ds-ink3 tracking-wider">
                {/Mac/i.test(navigator.userAgent) ? '⌘K' : 'Ctrl K'}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentUser?.email && (
              <span className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl text-2xs font-bold uppercase tracking-wider border ${'bg-ds-card2 border-ds-border text-ds-ink3'}`}>
                <span className={`w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-900 dark:text-emerald-100 flex items-center justify-center font-black text-badge`}>
                  {(currentUser.name ?? currentUser.email)[0].toUpperCase()}
                </span>
                {currentUser.email}
              </span>
            )}
            {/* Kesegaran data per sumber: klik membuka rincian tiap sumber. */}
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => { setHealthOpen(v => !v); refreshStats(); }}
                title="Kesegaran data per sumber — klik untuk rincian"
                aria-label={`Kesegaran data: ${syncState === 'partial' ? `${failedSourceCount} sumber gagal dimuat` : 'tersinkron'}`}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-2xs font-bold whitespace-nowrap shrink-0 transition-colors ${'bg-ds-card2 border-ds-border text-ds-ink3 hover:border-ds-green/50'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${syncState === 'partial' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <span>
                  {syncState === 'partial'
                    ? `${failedSourceCount} sumber gagal`
                    : lastSyncAt
                      ? `Tersinkron ${lastSyncAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                      : 'Menyinkronkan…'}
                </span>
                <RefreshCw size={11} className={syncState === 'syncing' ? 'animate-spin' : ''} />
              </button>
              {healthOpen && (
                <>
                <div className="fixed inset-0 z-40" onClick={() => setHealthOpen(false)} aria-hidden />
                <div className={`absolute right-0 top-full mt-2 w-72 rounded-2xl border shadow-2xl z-50 overflow-hidden sp-pop-in ${'bg-ds-card border-ds-border shadow-ds-lg'}`}>
                  <div className={`px-4 py-3 border-b flex items-center justify-between ${'border-ds-border'}`}>
                    <p className={`text-2xs font-black uppercase tracking-widest ${'text-ds-ink3'}`}>Kesegaran Data</p>
                    <button onClick={refreshStats} className="text-2xs font-bold text-ds-green hover:text-emerald-400">Muat ulang</button>
                  </div>
                  <div className="py-1">
                    {healthRows.map(r => (
                      <div key={r.key} className="flex items-center gap-2.5 px-4 py-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.ok === null ? 'bg-ds-ink3/40' : r.ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className={`text-xs font-bold flex-1 min-w-0 truncate ${r.ok === false ? 'text-ds-ink' : 'text-ds-ink2'}`}>{r.label}</span>
                        <span className="text-2xs font-bold text-ds-ink3 whitespace-nowrap">
                          {r.ok === false
                            ? 'gagal'
                            : r.at
                              ? r.at.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                              : '…'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className={`px-4 py-2.5 border-t text-2xs font-bold ${'border-ds-border text-ds-ink3'}`}>
                    Semua angka berasal dari poll gateway nyata — bukan angka karangan.
                  </p>
                </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              title="Bantuan shortcut (tekan ?)"
              aria-label="Bantuan shortcut keyboard"
              className={`hidden lg:flex items-center p-2 rounded-xl border text-ds-ink3 transition-colors ${'bg-ds-card2 border-ds-border hover:border-ds-green/50'}`}
            >
              <Keyboard size={15} />
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
                backupStatus === 'running' ? 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300' :
                backupStatus === 'ok'      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                                             'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-200'
              }`}>
                {backupStatus === 'running' && <Loader2 size={10} className="animate-spin" />}
                {backupStatus === 'ok'      && <CheckCircle size={10} />}
                {backupStatus === 'running' ? 'Backup berjalan...' : backupStatus === 'ok' ? 'Backup selesai' : 'Backup gagal'}
              </div>
            )}
            {/* Notifications — pusat notifikasi mini: filter belum-dibaca,
                ikon per tipe, waktu relatif, badge angka. */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(v => !v)}
                className={`relative p-2 rounded-xl border ${'bg-ds-card2 border-ds-border text-ds-ink3'}`}
                aria-label={`Notifikasi${unreadNotifCount > 0 ? `, ${unreadNotifCount} belum dibaca` : ''}`}
              >
                <Bell size={17} />
                {unreadNotifCount > 0 && (
                  <span style={{ color: '#FFFFFF' }} className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-2xs font-black flex items-center justify-center border-2 ${'border-ds-bg'}`}>
                    {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <>
                {/* Klik di mana pun di luar panel menutupnya (dulu hanya
                    onMouseLeave, yang membuat panel menempel terbuka). */}
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} aria-hidden />
                <div
                  className={`absolute right-0 top-full mt-2 w-80 rounded-2xl border shadow-2xl z-50 overflow-hidden sp-pop-in ${'bg-ds-card border-ds-border shadow-ds-lg'}`}
                >
                  <div className={`px-4 py-3 border-b flex items-center justify-between gap-2 ${'border-ds-border'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <p className={`text-2xs font-black uppercase tracking-widest ${'text-ds-ink3'}`}>Notifikasi</p>
                      <button
                        onClick={() => setNotifUnreadOnly(v => !v)}
                        className={`px-2 py-0.5 rounded-full text-2xs font-black transition-colors whitespace-nowrap ${notifUnreadOnly ? 'bg-emerald-500 text-white' : 'bg-ds-card2 text-ds-ink3 border border-ds-border hover:border-ds-green/50'}`}
                      >
                        Belum dibaca{unreadNotifCount > 0 ? ` (${unreadNotifCount})` : ''}
                      </button>
                    </div>
                    {unreadNotifCount > 0 && (
                      <button
                        onClick={async () => {
                          await Promise.all(notifications.filter(n => !n.read).map(n => markAdminNotificationRead(n.id)));
                          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                        }}
                        className="text-2xs font-bold text-ds-green hover:text-emerald-400 whitespace-nowrap"
                      >
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto no-scrollbar">
                    {visibleNotifications.length === 0 ? (
                      <p className={`text-center py-8 text-xs font-bold ${'text-ds-ink3'}`}>
                        {notifUnreadOnly ? 'Semua notifikasi sudah dibaca.' : 'Tidak ada notifikasi'}
                      </p>
                    ) : visibleNotifications.map(n => {
                      const meta = adminNotifMeta(n.type);
                      return (
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
                            else if (n.type === 'NEW_CUSTOMER') goToTab('user_mgmt');
                            else if (n.type === 'NEW_ORDER' || n.type === 'ORDER_REJECTED' || n.type === 'ORDER_CANCELLED') goToTab('policy_orders');
                            else if (n.type === 'NEW_CLAIM' || n.type === 'CLAIM_FRAUD_ALERT') goToTab('claims_admin');
                            setShowNotifications(false);
                          }}
                          className={`w-full text-left px-4 py-3 border-b transition-colors ${'border-ds-border hover:bg-ds-card2'} ${!n.read ? 'bg-ds-green-tint' : ''}`}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className={`w-9 h-9 rounded-lg bg-ds-card2 flex items-center justify-center flex-shrink-0 ${meta.cls}`}>
                              <ModuleIcon id={meta.iconId} size={26} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-black leading-tight ${'text-ds-ink'}`}>{n.title}</p>
                              <p className={`text-2xs font-medium mt-0.5 ${'text-ds-ink3'}`}>{n.body}</p>
                              <p className={`text-2xs font-bold mt-1 ${'text-ds-ink2'}`}>
                                {adminNotifTimeAgo(n.created_at)}
                                {' · '}
                                {new Date(n.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                </>
              )}
            </div>
            {/* Mobile close */}
            {isMobile && (
              <button
                onClick={onLogout}
                className="p-2 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-200 hover:bg-rose-500 hover:text-white transition-all"
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
            {activeTab === 'dashboard' && sectionTabs && (
              <div className="mb-4">{sectionTabs}</div>
            )}

            {activeTab !== 'dashboard' && activeSection && (
              <div className="mb-6">
                {activeGroup && (
                  <p className={`text-2xs font-black uppercase tracking-[0.22em] mb-1 ${'text-ds-ink3'}`}>
                    {activeGroup.label}
                  </p>
                )}
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${'text-ds-ink'}`}>
                    {activeSection.label}
                  </h1>
                  {TAB_SUBTITLE[activeTab] && (
                    <p className="text-xs text-ds-ink3">{TAB_SUBTITLE[activeTab]}</p>
                  )}
                </div>
                {sectionTabs && <div className="mt-3">{sectionTabs}</div>}
              </div>
            )}

            <Suspense fallback={<AdminViewLoader />}>
              <div key={activeTab} className="sp-page-enter">
                {renderContent()}
              </div>
            </Suspense>

            {/* Ruang untuk bar navigasi bawah di layar < 1024px. */}
            {isMobile && <div aria-hidden className="h-20" />}
          </div>
        </div>

        {/* ── Bar navigasi bawah (< 1024px) ──────────────────────────────────
            Sebelumnya satu-satunya jalan berpindah di layar kecil adalah
            drawer di balik ikon hamburger: dua ketukan untuk setiap tujuan,
            tanpa petunjuk posisi. Spesifikasi redesign meminta bar bawah,
            jadi empat tujuan tersibuk plus pintu ke menu lengkap duduk
            permanen di jempol, dan drawer tetap untuk 17 section sisanya. */}
        {isMobile && (
          <nav
            aria-label="Navigasi utama"
            className={`fixed bottom-0 left-0 right-0 z-30 flex items-stretch border-t ${headerBg}`}
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {BOTTOM_NAV
              .filter(item => allowedLeafIds.has(item.id))
              .map(item => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => goToTab(item.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-2xs font-black uppercase tracking-wider transition-colors ${
                      active ? 'text-ds-green' : 'text-ds-ink3'
                    }`}
                  >
                    {/* Always mounted so the indicator can transition in/out instead of
                        popping instantly when the active tab changes. */}
                    <span
                      aria-hidden
                      className={`absolute top-0 h-0.5 w-8 rounded-full bg-ds-green transition-all duration-200 ease-out ${
                        active ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
                      }`}
                    />
                    <ModuleIcon id={item.id} size={26} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu lengkap"
              className="relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-2xs font-black uppercase tracking-wider text-ds-ink3 transition-colors"
            >
              <Menu size={19} />
              <span>Menu</span>
            </button>
          </nav>
        )}
      </main>
    </div>
  );
};

export default AdminPortal;
