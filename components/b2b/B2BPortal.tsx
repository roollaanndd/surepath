import React, { useState, useEffect } from 'react';
import { Home, FilePlus, ClipboardList, FileCheck, UserCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { Language, UserRole } from '../../types';
import PortalTabBar, { type PortalTab } from '../shared/PortalTabBar';
import PortalHeader from '../shared/PortalHeader';
import { scrollPortalToTop } from '../shared/scrollReset';
import PathyChat, { PATHY_OPEN_EVENT } from '../shared/PathyChat';
import {
  getB2BSubmissions,
  getAllB2BSubmissions,
  getB2BQuotes,
  getAllB2BQuotes,
  getB2BBulkBatches,
  adminListB2BUsers,
  type SpB2BSubmission,
  type SpB2BQuote,
  type SpB2BBatch,
} from '../../services/supabaseService';
import B2BHome from './B2BHome';
import B2BNewSubmission from './B2BNewSubmission';
import B2BSubmissions from './B2BSubmissions';
import B2BQuotes from './B2BQuotes';
import B2BProfile from './B2BProfile';
import B2BBulkImport from './B2BBulkImport';
import B2BBulkBatches from './B2BBulkBatches';
import { useDarkMode } from '../shared/theme';

interface Props {
  client: any;
  onLogout: () => void;
  lang: Language;
}

// Five text tabs share the bar here, where Customer and Agent each spend one
// slot on a narrow centre button. "Pengajuan" and "Penawaran" never had the
// width, and were rendering as "PENGAJ/UAN". The short forms carry the same
// meaning and match the verb the Agent portal already uses for "create".
const TABS: { id: string; labelEn: string; labelId: string; Icon: PortalTab['Icon']; glyph: PortalTab['glyph'] }[] = [
  { id: 'home',        labelEn: 'Home',     labelId: 'Beranda', Icon: Home,          glyph: 'home' },
  { id: 'new',         labelEn: 'New',      labelId: 'Buat',    Icon: FilePlus,      glyph: 'quote' },
  { id: 'submissions', labelEn: 'Requests', labelId: 'Ajuan',   Icon: ClipboardList, glyph: 'document' },
  { id: 'quotes',      labelEn: 'Quotes',   labelId: 'Tawaran', Icon: FileCheck,     glyph: 'wallet' },
  { id: 'profile',     labelEn: 'Profile',  labelId: 'Profil',  Icon: UserCircle,    glyph: 'people' },
];

const B2BPortal: React.FC<Props> = ({ client, onLogout, lang }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  // v2.8.1 — MASTER_ADMIN masuk portal B2B dalam MODE PANTAU: melihat ajuan,
  // penawaran dan batch massal milik SEMUA klien korporat (RLS/gateway sudah
  // mengizinkan admin), tanpa bisa membuat pengajuan atau bertindak atas
  // penawaran milik klien. Klien B2B biasa tidak melihat perubahan apa pun.
  const isMaster = client?.role === UserRole.MASTER_ADMIN;

  const [activeTab, setActiveTab] = useState('home');
  const [darkMode, setDarkMode] = useDarkMode();
  const [submissions, setSubmissions] = useState<SpB2BSubmission[]>([]);
  const [quotes, setQuotes] = useState<SpB2BQuote[]>([]);
  const [bulkBatches, setBulkBatches] = useState<SpB2BBatch[]>([]);
  // Mode pantau: peta client_id → nama perusahaan (dari admin_list_b2b_users)
  // untuk melabeli kartu penawaran, yang tidak membawa company_name sendiri.
  const [companyByClient, setCompanyByClient] = useState<Record<string, string>>({});
  // "Buat"/"Ajuan" each hold two flows (single submission vs. bulk fleet
  // import). A 6th tab would reopen the width bug the comment below the TABS
  // array describes (5 short labels already fill PortalTabBar's budget), so
  // the bulk flow is a mode switch inside these two tabs instead.
  const [bulkMode, setBulkMode] = useState(false);

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

  useEffect(() => { loadData(); }, [client?.id, isMaster]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    scrollPortalToTop();
  };

  const modeToggle = (onLabel: string, offLabel: string) => (
    <div className="flex justify-center gap-1.5 pt-5 pb-1">
      <button
        onClick={() => setBulkMode(false)}
        className={`px-3 py-1.5 rounded-full text-2xs font-black uppercase tracking-wider transition-colors ${!bulkMode ? 'bg-ds-green text-ds-on-green' : 'bg-ds-card2 text-ds-ink3'}`}
      >
        {offLabel}
      </button>
      <button
        onClick={() => setBulkMode(true)}
        className={`px-3 py-1.5 rounded-full text-2xs font-black uppercase tracking-wider transition-colors ${bulkMode ? 'bg-ds-green text-ds-on-green' : 'bg-ds-card2 text-ds-ink3'}`}
      >
        {onLabel}
      </button>
    </div>
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return (
          <B2BHome
            client={client}
            submissions={submissions}
            quotes={quotes}
            bulkBatches={bulkBatches}
            onNavigate={handleTabChange}
            onNavigateBulk={(tab) => { setBulkMode(true); handleTabChange(tab); }}
            lang={lang}
          />
        );
      case 'new':
        if (isMaster) {
          return (
            <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
              <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 p-5 text-center space-y-2">
                <ShieldCheck size={28} className="mx-auto text-indigo-500" />
                <p className="font-black text-sm">{t('Monitor Mode', 'Mode Pantau')}</p>
                <p className="text-xs text-ds-ink2 leading-relaxed">
                  {t(
                    'Submissions are created by B2B client accounts. As Master Admin you can review all client submissions in the Requests and Quotes tabs.',
                    'Pengajuan dibuat oleh akun klien B2B. Sebagai Master Admin, Anda dapat memantau seluruh ajuan klien pada tab Ajuan dan Tawaran.',
                  )}
                </p>
              </div>
            </div>
          );
        }
        return (
          <>
            {modeToggle(t('Bulk Import', 'Impor Massal'), t('Single Submission', 'Pengajuan Satuan'))}
            {bulkMode ? (
              <B2BBulkImport
                clientId={client?.id ?? ''}
                client={client}
                onDone={() => { loadData(); setBulkMode(false); handleTabChange('submissions'); }}
                lang={lang}
              />
            ) : (
              <B2BNewSubmission
                clientId={client?.id ?? ''}
                client={client}
                onDone={() => { loadData(); handleTabChange('submissions'); }}
                lang={lang}
              />
            )}
          </>
        );
      case 'submissions':
        return (
          <>
            {!isMaster && modeToggle(t('Bulk Batches', 'Batch Massal'), t('Single Submissions', 'Pengajuan Satuan'))}
            {bulkMode ? (
              <B2BBulkBatches clientId={client?.id ?? ''} lang={lang} allClients={isMaster} />
            ) : (
              <B2BSubmissions
                clientId={client?.id ?? ''}
                lang={lang}
                onNavigate={handleTabChange}
                allClients={isMaster}
              />
            )}
          </>
        );
      case 'quotes':
        return (
          <B2BQuotes
            clientId={client?.id ?? ''}
            lang={lang}
            companyName={client?.company_name}
            allClients={isMaster}
            companyByClient={companyByClient}
          />
        );
      case 'profile':
        return (
          <B2BProfile
            client={client}
            clientId={client?.id ?? ''}
            lang={lang}
            onLogout={onLogout}
            masterView={isMaster}
          />
        );
      default:
        return null;
    }
  };

  const masterName = client?.name || 'Master Admin';
  const companyInitials = (isMaster ? masterName : (client?.company_name ?? 'B2B'))
    .split(' ').slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase();

  return (
    <div className="sp-modern-app min-h-screen bg-ds-bg dark:bg-ds-dk-bg text-ds-ink dark:text-ds-dk-ink transition-colors duration-300 font-sora">
      <div aria-hidden className="sp-ambient" />
      {/* Top Header */}
      {/* Was a hand-copied PortalHeader that had drifted: it carried the same
          squeeze bugs the shared one has since been fixed for, and its three
          controls had no focus ring and the avatar no accessible name. */}
      <PortalHeader
        portalLabel="B2B"
        userName={isMaster ? masterName : (client?.company_name ?? 'Company')}
        userCode={isMaster
          ? t('Master Admin · Monitor', 'Master Admin · Mode Pantau')
          : t('B2B Client', 'Klien B2B')}
        avatarInitial={companyInitials}
        onBellClick={() => {}}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(!darkMode)}
        onAvatarClick={() => handleTabChange('profile')}
        labels={{
          notifications: t('Notifications', 'Notifikasi'),
          theme: t('Toggle theme', 'Ganti tema'),
          profile: t('Profile', 'Profil'),
        }}
      />

      {/* Main Content */}
      <main className="pb-[calc(7rem+env(safe-area-inset-bottom))] min-h-screen" style={{ paddingTop: "calc(4rem + env(safe-area-inset-top, 0px))" }}>
        <div key={activeTab} className="sp-page-enter">
          {renderTab()}
        </div>
      </main>

      {/* Bottom Tab Navigation */}
      <PortalTabBar
        tabs={TABS.map(({ id, labelEn, labelId, Icon, glyph }) => ({ id, label: lang === Language.EN ? labelEn : labelId, Icon, glyph }))}
        activeId={activeTab}
        onSelect={handleTabChange}
        modernIcons
      />

      {/* v2.8.0 — Pathy di portal B2B: bedah Excel armada, hitung premi per
          baris, bantu alur pengajuan. Trigger mengapung, bukan tab keenam —
          bar tab sudah penuh (lihat komentar TABS di atas). */}
      <PathyChat
        lang={lang}
        currentUser={{ name: client?.company_name, id: client?.id, role: client?.role }}
        hideLauncher
      />
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent(PATHY_OPEN_EVENT))}
        aria-label={t('Tanya Pathy', 'Ask Pathy')}
        className="fixed bottom-28 right-4 z-[60] w-14 h-14 rounded-full bg-emerald-600 text-white shadow-[0_12px_32px_-8px_rgba(5,150,105,0.6)] ring-2 ring-emerald-400/40 flex items-center justify-center active:scale-90 transition-transform duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/50"
      >
        <Sparkles size={22} />
      </button>
    </div>
  );
};

export default B2BPortal;
