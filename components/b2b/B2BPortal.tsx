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
  LayoutDashboard, FileText, FileCheck, Layers, User, Sparkles, ShieldCheck,
} from 'lucide-react';
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
  B2BAmbient, B2BShell, B2BGlass, type B2BNavItem,
} from './dashboard/ui';
import B2BDashboard from './B2BDashboard';

// Lazy-load the heavier screens — each holds its own feature logic (wizards,
// XLSX parser, PDF builder) that isn't needed on the overview.
const B2BNewSubmission = lazy(() => import('./B2BNewSubmission'));
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
  | 'new-single' | 'new-bulk'
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

  const loadData = async () => {
    if (!client?.id) return;
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
  };

  useEffect(() => { void loadData(); }, [client?.id, isMaster]);

  const handleSelect = (id: string) => setActiveId(id as Section);

  const nav: B2BNavItem[] = useMemo(() => [
    { id: 'dashboard', label: t('Dashboard', 'Dashboard'), icon: LayoutDashboard },
    {
      id: 'submissions', label: t('Requests', 'Pengajuan'), icon: FileText,
      badge: submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'REVIEWING').length,
      children: [
        { id: 'submissions', label: t('Single', 'Satuan') },
        { id: 'batches',     label: t('Bulk Fleet', 'Armada Massal') },
      ],
    },
    {
      id: 'quotes', label: t('Quotes', 'Penawaran'), icon: FileCheck,
      badge: quotes.filter(q => q.status === 'PENDING').length,
    },
    {
      id: 'new-single', label: t('Create', 'Buat'), icon: Layers,
      children: [
        { id: 'new-single', label: t('New Request', 'Pengajuan Baru') },
        { id: 'new-bulk',   label: t('Bulk Import', 'Impor Massal') },
      ],
    },
    { id: 'profile', label: t('Profile', 'Profil'), icon: User },
  ], [submissions, quotes, lang]);

  const breadcrumb = useMemo((): string[] => {
    switch (activeId) {
      case 'dashboard':   return [t('Portal B2B', 'Portal B2B'), t('Dashboard', 'Dashboard')];
      case 'new-single':  return [t('Portal B2B', 'Portal B2B'), t('Create', 'Buat'), t('New Request', 'Pengajuan Baru')];
      case 'new-bulk':    return [t('Portal B2B', 'Portal B2B'), t('Create', 'Buat'), t('Bulk Import', 'Impor Massal')];
      case 'submissions': return [t('Portal B2B', 'Portal B2B'), t('Requests', 'Pengajuan'), t('Single', 'Satuan')];
      case 'batches':     return [t('Portal B2B', 'Portal B2B'), t('Requests', 'Pengajuan'), t('Bulk Fleet', 'Armada Massal')];
      case 'quotes':      return [t('Portal B2B', 'Portal B2B'), t('Quotes', 'Penawaran')];
      case 'profile':     return [t('Portal B2B', 'Portal B2B'), t('Profile', 'Profil')];
    }
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
    if (isMaster && (activeId === 'new-single' || activeId === 'new-bulk')) {
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
          />
        );
      case 'new-single':
        return (
          <Suspense fallback={<div className="text-sm text-slate-400 text-center py-16">Memuat…</div>}>
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
          <Suspense fallback={<div className="text-sm text-slate-400 text-center py-16">Memuat…</div>}>
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
          <Suspense fallback={<div className="text-sm text-slate-400 text-center py-16">Memuat…</div>}>
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
          <Suspense fallback={<div className="text-sm text-slate-400 text-center py-16">Memuat…</div>}>
            <B2BBulkBatches clientId={client?.id ?? ''} lang={lang} allClients={isMaster} />
          </Suspense>
        );
      case 'quotes':
        return (
          <Suspense fallback={<div className="text-sm text-slate-400 text-center py-16">Memuat…</div>}>
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
          <Suspense fallback={<div className="text-sm text-slate-400 text-center py-16">Memuat…</div>}>
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
    <div
      className="min-h-screen relative"
      style={{ background: '#f5f7fa', fontFamily: "'Sora', system-ui, sans-serif" }}
    >
      <B2BAmbient />

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
        {renderContent()}
      </B2BShell>

      {/* Pathy floating chat — same instance as before, but the launcher
          has moved into the topbar so it isn't a duplicate FAB. */}
      <PathyChat
        lang={lang}
        currentUser={{ name: client?.company_name, id: client?.id, role: client?.role }}
        hideLauncher
      />
    </div>
  );
};

export default B2BPortal;
