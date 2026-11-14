// B2BPortal — dashboard shell host for the corporate portal.
//
// Replaces the earlier mobile shell (PortalHeader + PortalTabBar) with a
// desktop-first sidebar + topbar via <B2BShell>. The portal is a laptop
// tool for corporate ops teams; mobile is still supported (sidebar
// collapses to a drawer below lg, content reflows), but the primary
// layout is now dense-information, data-forward dashboard.
//
// Data fetching, auth model, and gateway calls stay identical — the shell
// just wraps the same screens.

import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, Plus, User, Sparkles, ShieldCheck, CalendarDays, History,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Language, UserRole } from '../../types';
import {
  getB2BSubmissions, getAllB2BSubmissions,
  getB2BQuotes, getAllB2BQuotes,
  getB2BBulkBatches, adminListB2BUsers,
  type SpB2BSubmission, type SpB2BQuote, type SpB2BBatch,
} from '../../services/supabaseService';
import PathyChat, { PATHY_OPEN_EVENT } from '../shared/PathyChat';
import { useDarkMode } from '../shared/theme';
import {
  B2BAmbient, B2BShell, B2BGlass, B2BToastProvider, B2BCommandPalette,
  B2BPageSkeleton,
  type B2BNavItem,
} from './dashboard/ui';
import B2BDashboard from './B2BDashboard';
import B2BFleetCalendar from './B2BFleetCalendar';

// Lazy-load the heavier screens — each holds its own feature logic (wizards,
// XLSX parser, PDF builder) that isn't needed on the overview.
const B2BNewSubmission = lazy(() => import('./B2BNewSubmission'));
const B2BUnitOrder     = lazy(() => import('./B2BUnitOrder'));
const B2BBulkImport    = lazy(() => import('./B2BBulkImport'));
const B2BSubmissions   = lazy(() => import('./B2BSubmissions'));
const B2BBulkBatches   = lazy(() => import('./B2BBulkBatches'));
const B2BQuotes        = lazy(() => import('./B2BQuotes'));
const B2BProfile       = lazy(() => import('./B2BProfile'));

interface Props {
  client: any;
  onLogout: () => void;
  lang: Language;
}

// Section ids drive both the sidebar (B2BNavItem.id) and the render switch.
// Single/Massal split lives inside Pengajuan & Ajuan as sub-items — lets a
// multifinance partner jump straight to Bulk without hunting a toggle.
type Section =
  | 'dashboard'
  | 'fleet'
  | 'new-unit' | 'new-single' | 'new-bulk'
  | 'submissions' | 'batches'
  | 'quotes'
  | 'profile';

const B2BPortal: React.FC<Props> = ({ client, onLogout, lang }) => {
  const t = (en: string, id: string) => (lang === Language.EN ? en : id);
  const isMaster = client?.role === UserRole.MASTER_ADMIN;

  const [activeId, setActiveId] = useState<Section>('dashboard');
  const [darkMode, setDarkMode] = useDarkMode();
  const [submissions, setSubmissions] = useState<SpB2BSubmission[]>([]);
  const [quotes, setQuotes] = useState<SpB2BQuote[]>([]);
  const [bulkBatches, setBulkBatches] = useState<SpB2BBatch[]>([]);
  const [companyByClient, setCompanyByClient] = useState<Record<string, string>>({});
  const [initialLoading, setInitialLoading] = useState(true);
  // v2.8.6 — kegagalan muat data portal tidak lagi menyamar jadi "belum ada
  // data". Banner jujur + tombol coba lagi, baik di dashboard maupun layar
  // daftar (yang memuat data masing-masing).
  const [loadError, setLoadError] = useState(false);

  const loadData = async () => {
    if (!client?.id) return;
    setLoadError(false);
    try {
      if (isMaster) {
        const [subs, qs, batches, clients] = await Promise.all([
          getAllB2BSubmissions(),
          getAllB2BQuotes(),
          getB2BBulkBatches({ all: true }),
          adminListB2BUsers(),
        ]);
        setSubmissions(subs);
        setQuotes(qs);
        setBulkBatches(batches);
        setCompanyByClient(Object.fromEntries(
          clients.map(c => [c.id, c.company_name || c.name || '—']),
        ));
        setInitialLoading(false);
        return;
      }
      const [subs, qs, batches] = await Promise.all([
        getB2BSubmissions(client.id),
        getB2BQuotes(client.id),
        getB2BBulkBatches(),
      ]);
      setSubmissions(subs);
      setQuotes(qs);
      setBulkBatches(batches);
      setInitialLoading(false);
    } catch (error) {
      console.error('Unable to load B2B portal data:', error);
      setLoadError(true);
      setInitialLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, [client?.id, isMaster]);

  const handleSelect = (id: string) => {
    // "new-order" adalah parent header-only — klik membuka dropdown dan
    // pilih item pertama (Order Unit). Dicegah agar activeId tetap valid.
    if (id === 'new-order') { setActiveId('new-unit'); return; }
    if (id === 'history')   { setActiveId('batches'); return; }
    setActiveId(id as Section);
  };

  // v2.9.5 — Rearrange: pisahkan "Buat" (aksi utama, oranye) dari "Riwayat"
  // (status/lihat). Pola ini pola app modern — Compose/Create jadi CTA
  // paling menonjol dan terpisah dari daftar. Kalender dipindah ke bawah
  // sebagai alat bantu. Group label membantu scan sidebar lebih cepat.
  const pendingRequests = submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'REVIEWING').length;
  const pendingQuotes = quotes.filter(q => q.status === 'PENDING').length;

  const nav: B2BNavItem[] = useMemo(() => [
    { id: 'dashboard', label: t('Dashboard', 'Dashboard'), icon: LayoutDashboard, groupLabel: t('Overview', 'Ikhtisar') },
    {
      id: 'new-order',
      label: t('Create order', 'Buat order'),
      icon: Plus,
      featured: true,
      groupLabel: t('Create', 'Aksi'),
      children: [
        { id: 'new-unit',   label: t('Unit (Vehicle)', 'Order Unit') },
        { id: 'new-bulk',   label: t('Bulk Import', 'Impor Massal') },
        { id: 'new-single', label: t('Other Request', 'Pengajuan Lain') },
      ],
    },
    {
      id: 'history',
      label: t('Activity', 'Riwayat'),
      icon: History,
      badge: pendingRequests + pendingQuotes,
      groupLabel: t('Monitor', 'Pantau'),
      children: [
        { id: 'batches',     label: t('Orders & Batches', 'Order Unit & Batch') },
        { id: 'submissions', label: t('Requests', 'Pengajuan') },
        { id: 'quotes',      label: t('Quotes', 'Penawaran') },
      ],
    },
    { id: 'fleet', label: t('Fleet Calendar', 'Kalender Armada'), icon: CalendarDays, groupLabel: t('Monitor', 'Pantau') },
    { id: 'profile', label: t('Profile', 'Profil'), icon: User, groupLabel: t('Account', 'Akun') },
  ], [pendingRequests, pendingQuotes, lang]);

  const breadcrumb = useMemo((): string[] => {
    const root = t('Portal B2B', 'Portal B2B');
    const crCreate = t('Create', 'Buat');
    const crMonitor = t('Activity', 'Riwayat');
    switch (activeId) {
      case 'dashboard':   return [root, t('Dashboard', 'Dashboard')];
      case 'fleet':       return [root, t('Fleet Calendar', 'Kalender Armada')];
      case 'new-unit':    return [root, crCreate, t('Unit Order', 'Order Unit')];
      case 'new-single':  return [root, crCreate, t('Other Request', 'Pengajuan Lain')];
      case 'new-bulk':    return [root, crCreate, t('Bulk Import', 'Impor Massal')];
      case 'submissions': return [root, crMonitor, t('Requests', 'Pengajuan')];
      case 'batches':     return [root, crMonitor, t('Orders & Batches', 'Order Unit & Batch')];
      case 'quotes':      return [root, crMonitor, t('Quotes', 'Penawaran')];
      case 'profile':     return [root, t('Profile', 'Profil')];
    }
    return [root];
  }, [activeId, lang]);

  const masterName = client?.name || 'Master Admin';
  const displayName = isMaster ? masterName : (client?.company_name ?? 'Company');
  const userCode = isMaster
    ? t('Master Admin · Monitor', 'Master Admin · Mode Pantau')
    : t('B2B Client', 'Klien B2B');
  const initials = (isMaster ? masterName : (client?.company_name ?? 'B2B'))
    .split(' ').slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase();

  const openPathy = () => window.dispatchEvent(new CustomEvent(PATHY_OPEN_EVENT));

  const renderContent = () => {
    if (isMaster && (activeId === 'new-unit' || activeId === 'new-single' || activeId === 'new-bulk')) {
      return (
        <div className="max-w-md mx-auto mt-8">
          <B2BGlass className="p-6 text-center space-y-3">
            <div className="mx-auto w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(79,70,229,0.1)' }}>
              <ShieldCheck size={18} className="text-indigo-600" />
            </div>
            <p className="font-black text-sm text-slate-900">{t('Monitor Mode', 'Mode Pantau')}</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('Submissions are created by B2B client accounts. As Master Admin you can review all client submissions in Requests and Quotes.',
                 'Pengajuan dibuat oleh akun klien B2B. Sebagai Master Admin, Anda dapat memantau seluruh ajuan klien pada Pengajuan dan Penawaran.')}
            </p>
          </B2BGlass>
        </div>
      );
    }

    switch (activeId) {
      case 'fleet':
        return <B2BFleetCalendar lang={lang} />;

      case 'dashboard':
        return (
          <B2BDashboard
            client={client}
            submissions={submissions}
            quotes={quotes}
            bulkBatches={bulkBatches}
            onNavigate={handleSelect}
            onNavigateBulk={handleSelect}
            onPathyOpen={openPathy}
            companyByClient={companyByClient}
            lang={lang}
            loading={initialLoading}
            loadError={loadError}
            onRetry={() => { loadData(); }}
          />
        );
      case 'new-unit':
        return (
          <Suspense fallback={<B2BPageSkeleton variant="form" />}>
            <B2BUnitOrder
              clientId={client?.id ?? ''}
              client={client}
              onDone={() => { loadData(); handleSelect('batches'); }}
              lang={lang}
            />
          </Suspense>
        );
      case 'new-single':
        return (
          <Suspense fallback={<B2BPageSkeleton variant="form" />}>
            <B2BNewSubmission
              clientId={client?.id ?? ''}
              client={client}
              onDone={() => { loadData(); handleSelect('submissions'); }}
              lang={lang}
            />
          </Suspense>
        );
      case 'new-bulk':
        return (
          <Suspense fallback={<B2BPageSkeleton variant="form" />}>
            <B2BBulkImport
              clientId={client?.id ?? ''}
              client={client}
              onDone={() => { loadData(); handleSelect('batches'); }}
              lang={lang}
            />
          </Suspense>
        );
      case 'submissions':
        return (
          <Suspense fallback={<B2BPageSkeleton variant="list" />}>
            <B2BSubmissions
              clientId={client?.id ?? ''}
              lang={lang}
              onNavigate={(t) => handleSelect(t === 'quotes' ? 'quotes' : 'submissions')}
              allClients={isMaster}
            />
          </Suspense>
        );
      case 'batches':
        return (
          <Suspense fallback={<B2BPageSkeleton variant="list" />}>
            <B2BBulkBatches clientId={client?.id ?? ''} lang={lang} allClients={isMaster} />
          </Suspense>
        );
      case 'quotes':
        return (
          <Suspense fallback={<B2BPageSkeleton variant="list" />}>
            <B2BQuotes
              clientId={client?.id ?? ''}
              lang={lang}
              companyName={client?.company_name}
              allClients={isMaster}
              companyByClient={companyByClient}
            />
          </Suspense>
        );
      case 'profile':
        return (
          <Suspense fallback={<B2BPageSkeleton variant="form" />}>
            <B2BProfile
              client={client}
              clientId={client?.id ?? ''}
              lang={lang}
              onLogout={onLogout}
              masterView={isMaster}
            />
          </Suspense>
        );
    }
  };

  return (
    <B2BToastProvider>
    <div
      className="sp-b2b-root min-h-screen relative"
      style={{ background: '#f5f7fa', fontFamily: "'Sora', system-ui, sans-serif" }}
    >
      <B2BAmbient />
      <B2BCommandPalette nav={nav} onSelect={handleSelect} />

      <B2BShell
        nav={nav}
        activeId={activeId}
        onSelect={handleSelect}
        user={{ name: displayName, code: userCode, initials }}
        breadcrumb={breadcrumb}
        onLogout={onLogout}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(!darkMode)}
        rightSlot={
          <button
            type="button"
            onClick={openPathy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white transition-all duration-150 hover:scale-[1.03] active:scale-95"
            style={{
              background: 'linear-gradient(115deg, #087a58 0%, #059669 100%)',
              boxShadow: '0 6px 16px -6px rgba(5,150,105,0.4)',
            }}
            aria-label={t('Ask Pathy', 'Tanya Pathy')}
          >
            <Sparkles size={13} strokeWidth={2.5} />
            <span className="hidden sm:inline">Pathy</span>
          </button>
        }
      >
        <PageTransition pageKey={activeId}>
          {renderContent()}
        </PageTransition>
      </B2BShell>

      {/* Pathy floating chat — same instance as before, but the launcher
          has moved into the topbar so it isn't a duplicate FAB. */}
      <PathyChat
        lang={lang}
        currentUser={{ name: client?.company_name, id: client?.id, role: client?.role }}
        hideLauncher
      />
    </div>
    </B2BToastProvider>
  );
};

/* v2.9.5 — Transisi halaman: fade + slide-up ringan saat berpindah tab,
 * serupa agent app .ag-screen tapi disesuaikan dengan konteks dashboard.
 * `mode="wait"` memastikan screen lama keluar sebelum yang baru masuk —
 * tidak ada dua layar yang di-render bersamaan. Pengguna reduced-motion
 * tetap mendapat pergantian langsung tanpa animasi. */
const PageTransition: React.FC<{ pageKey: string; children: React.ReactNode }> = ({ pageKey, children }) => {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pageKey}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: 'blur(4px)' }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, filter: 'blur(2px)' }}
        transition={reduce ? { duration: 0 } : { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default B2BPortal;
