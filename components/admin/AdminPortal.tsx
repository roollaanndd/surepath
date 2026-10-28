
import React, { useState, useEffect, useRef, useCallback, Component, lazy, Suspense } from 'react';
import '../../src/styles/portal-modernization.css';
import {
  LogOut, Search, Menu, Bell, CheckCircle, X, Upload, Loader2, RefreshCw,
  PanelLeftClose, PanelLeftOpen, CornerDownLeft, Sun, Moon, Clock,
} from 'lucide-react';
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
import { applyDarkMode, readDarkMode, storeDarkMode } from '../shared/theme';
import { UserRole } from '../../types';
import { getAdminStats, type AdminStats, uploadLogoImage, getOnlineUsers, type OnlineUsersResult, getAdminNotifications, markAdminNotificationRead, getTierChangeRequests, type SpAdminNotification, getAllClaims, getAdminWithdrawals, type SpClaim, type Withdrawal } from '../../services/supabaseService';
import { shouldAutoBackup, performBackup } from '../../services/backupService';
import { SurePathLogo } from '../Navbar';
import { PathyNavIcon } from '../shared/PathyNavIcon';
import { buildVisibleNav, groupForSection, sectionForLeaf, ADMIN_MENU_ITEMS as MENU_ITEMS } from './navigation';
import { ADMIN_THEME_KEY, nextThemeMode, resolveAdminDark, themeLabel as modeLabel, type AdminThemeMode } from './themeMode';
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

// Suspense fallback for lazy-loaded admin views
const AdminViewLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 size={32} className="animate-spin text-ds-green" />
  </div>
);

// ─── Menu definition ────────────────────────────────────────────────────────
// MENU_ITEMS kini diimpor dari ./navigation (ADMIN_MENU_ITEMS) — satu sumber
// kebenaran bersama dengan matriks izin di Pengaturan (anti-drift).

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
  const [logoUrl, setLogoUrl]         = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'running' | 'ok' | 'fail'>('idle');
  const logoInputRef = useRef<HTMLInputElement>(null);
  // Tema admin: default otomatis (gelap 18.00–06.00). Preferensi aplikasi lain
  // di memori tetap dipulihkan saat keluar dari CMS.
  const [themeMode, setThemeMode] = useState<AdminThemeMode>(() => {
    try {
      const saved = localStorage.getItem(ADMIN_THEME_KEY);
      return saved === 'light' || saved === 'dark' ? saved : 'auto';
    } catch { return 'auto'; }
  });
  const [isDarkNow, setIsDarkNow] = useState(() => resolveAdminDark('auto'));
  const priorTheme = useRef(readDarkMode(false));
  useEffect(() => {
    // Disalin ke lokal: cleanup tidak boleh membaca ref yang bisa berubah.
    const restoreTheme = priorTheme.current;
    const apply = () => {
      const dark = resolveAdminDark(themeMode);
      applyDarkMode(dark);
      storeDarkMode(dark);
      setIsDarkNow(dark);
    };
    apply();
    const timer = window.setInterval(apply, 5 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') apply(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      applyDarkMode(restoreTheme);
      storeDarkMode(restoreTheme);
    };
  }, [themeMode]);
  const cycleTheme = useCallback(() => {
    setThemeMode(prev => {
      const next = nextThemeMode(prev);
      try { localStorage.setItem(ADMIN_THEME_KEY, next); } catch { /* storage blocked */ }
      return next;
    });
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
  // Live operational queues feeding both the dashboard KPIs and the nav badges:
  // claims awaiting review + withdrawals stuck in the L1–L3 approval ladder.
  // Both are read via the existing admin gateway actions their views already
  // use — no new backend surface, no fake numbers.
  const [claimsQueue, setClaimsQueue] = useState<SpClaim[] | null>(null);
  const [withdrawalQueue, setWithdrawalQueue] = useState<Withdrawal[] | null>(null);
  // Kesegaran data: kapan poll terakhir selesai dan apakah ada yang gagal.
  // Ditampilkan di header supaya admin tahu angka yang dilihat bukan angka basi.
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [syncState, setSyncState] = useState<'ok' | 'partial' | 'syncing'>('syncing');
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
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);
  const paletteInputRef = useRef<HTMLInputElement>(null);

  // Satu titik refresh untuk KPI + antrean. Status kesegaran ditampilkan di
  // header supaya admin tahu angka yang dilihat bukan angka basi.
  const refreshStats = useCallback(() => {
    setSyncState('syncing');
    const tasks: Promise<unknown>[] = [
      getAdminStats().then(setAdminStats),
      // Queue summaries (dashboard KPIs + nav badges). A failed poll must not
      // blank out KPIs that were already rendered; the header shows "sebagian".
      getAllClaims().then(setClaimsQueue),
      getAdminWithdrawals(200, true).then(setWithdrawalQueue),
    ];
    void Promise.allSettled(tasks).then(results => {
      setSyncState(results.some(r => r.status === 'rejected') ? 'partial' : 'ok');
      setLastSyncAt(new Date());
    });
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);

    refreshStats();
    const statsInterval = setInterval(refreshStats, 120000);

    // Online users
    getOnlineUsers().then(setOnlineUsers).catch(() => {});
    const onlineInterval = setInterval(() => getOnlineUsers().then(setOnlineUsers).catch(() => {}), 60000);

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
  }, [refreshStats]);

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
        setShowNotifications(false);
        setMobileOpen(false);
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
    if (userRole === UserRole.MASTER_ADMIN) return MENU_ITEMS.filter(m => m.roles.includes(userRole));
    try {
      const saved = localStorage.getItem('SP_ROLE_PERMISSIONS');
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

  // Command palette results — declared after filteredMenu (TDZ-safe).
  const paletteResults = (() => {
    const items = filteredMenu.filter(m => !m.isSeparator) as Array<{ id: string; label: string; icon: React.ElementType }>;
    const q = paletteQuery.trim().toLowerCase();
    if (!q) return items.slice(0, 8);
    return items.filter(m => m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
  })();
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
                Sure<span className="text-emerald-300">Path</span>
              </h1>
              <p className="text-[0.5rem] font-bold uppercase tracking-[0.3em] mt-1 text-emerald-100/60">
                Admin Console
              </p>
            </div>
          )}
        </div>
        {!isMobile && (
          <button
            onClick={toggleRail}
            className="p-1.5 rounded-lg text-white/45 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
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
                <p className="text-[0.55rem] font-black uppercase tracking-[0.24em] text-white/40">{group.label}</p>
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
                      ? 'border border-white/10 bg-white/[0.14] text-white shadow-sm'
                      : 'border border-transparent text-white/65 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  {active && (
                    <span aria-hidden className={`sp-accent-bar absolute rounded-full bg-emerald-300 ${isRail ? 'left-0 top-1/2 -translate-y-1/2 w-[3px] h-7' : 'left-0 top-1/2 -translate-y-1/2 w-1 h-6'}`} />
                  )}
                  <span className={`relative flex-shrink-0 ${active ? 'drop-shadow-sm' : ''}`}>
                    <PathyNavIcon id={first} size={isRail ? 30 : 28} active={active} />
                    {isRail && badge > 0 && (
                      <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-[0.55rem] font-black text-emerald-950 flex items-center justify-center shadow">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </span>
                  {!isRail && (
                    <>
                      <span className="text-[0.68rem] font-bold tracking-wide flex-1 min-w-0 truncate">{section.label}</span>
                      {badge > 0 && (
                        <span className="sp-badge-pop flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-amber-400/90 text-[0.6rem] font-black text-emerald-950 flex items-center justify-center shadow-sm">
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
  // Dashboard baru: layout 3 kolom dengan data yang bisa ditelusuri.
  // PENTING: render <AdminDashboard /> langsung di router (bukan lewat komponen
  // inline yang didefinisikan di body render) — komponen inline mendapat identitas
  // fungsi baru setiap render sehingga React me-remount seluruh dashboard pada
  // setiap poll 60–120 detik dan state internalnya (filter, pilihan) hilang.


  // ── Content router ─────────────────────────────────────────────────────────
  const renderContent = () => {
    // Role-based workspace routing (branch redesign): peran ber-workspace tetap
    // mendapat dashboard khusus di tab dashboard. Tema mengikuti isDarkNow;
    // gelap/terang di workspace melompat langsung ke mode sengaja (bukan siklus).
    const ws = getAdminWorkspace(userRole);
    if (activeTab === 'dashboard' && ws) {
      const dashProps = {
        userRole,
        currentUser,
        onLogout,
        darkMode: isDarkNow,
        onToggleDark: () => {
          const next: AdminThemeMode = isDarkNow ? 'light' : 'dark';
          try { localStorage.setItem(ADMIN_THEME_KEY, next); } catch { /* storage blocked */ }
          setThemeMode(next);
        },
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

  const themeLabel = modeLabel(themeMode);
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
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-[0.55rem] font-black text-emerald-950 flex items-center justify-center">
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
          .sp-palette-pop, .sp-drawer-in, .sp-fade-in, .sp-pop-in,
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
            <button
              type="button"
              onClick={refreshStats}
              title="Muat ulang data sekarang"
              aria-label={`Kesegaran data: ${syncState === 'partial' ? 'sebagian gagal dimuat' : 'tersinkron'}`}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-2xs font-bold whitespace-nowrap shrink-0 transition-colors ${'bg-ds-card2 border-ds-border text-ds-ink3 hover:border-ds-green/50'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${syncState === 'partial' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <span>
                {lastSyncAt
                  ? `Tersinkron ${lastSyncAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Menyinkronkan…'}
              </span>
              <RefreshCw size={11} className={syncState === 'syncing' ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={cycleTheme}
              title={`Tema: ${themeLabel} (klik untuk ganti)`}
              aria-label={`Ganti tema admin. Sekarang ${themeLabel}.`}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-2xs font-bold whitespace-nowrap shrink-0 transition-colors ${'bg-ds-card2 border-ds-border text-ds-ink3 hover:border-ds-green/50'}`}
            >
              {themeMode === 'auto' ? <Clock size={14} /> : isDarkNow ? <Moon size={14} /> : <Sun size={14} />}
              <span className="hidden xl:inline">{themeLabel}</span>
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
                <>
                {/* Klik di mana pun di luar panel menutupnya (dulu hanya
                    onMouseLeave, yang membuat panel menempel terbuka). */}
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} aria-hidden />
                <div
                  className={`absolute right-0 top-full mt-2 w-80 rounded-2xl border shadow-2xl z-50 overflow-hidden sp-pop-in ${'bg-ds-card border-ds-border shadow-ds-lg'}`}
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
                          else if (n.type === 'NEW_CUSTOMER') goToTab('user_mgmt');
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
                </>
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
            {activeTab === 'dashboard' && sectionTabs && (
              <div className="mb-4">{sectionTabs}</div>
            )}

            {activeTab !== 'dashboard' && activeSection && (
              <div className="mb-6">
                {activeGroup && (
                  <p className={`text-[0.58rem] font-black uppercase tracking-[0.22em] mb-1 ${'text-ds-ink3'}`}>
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
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPortal;
