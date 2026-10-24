import React, { useState, useEffect } from 'react';
import { Home, FilePlus, ClipboardList, FileCheck, UserCircle, Bell } from 'lucide-react';
import { Language } from '../../types';
import PortalTabBar, { type PortalTab } from '../shared/PortalTabBar';
import PortalHeader from '../shared/PortalHeader';
import { scrollPortalToTop } from '../shared/scrollReset';
import {
  getB2BSubmissions,
  getB2BQuotes,
  type SpB2BSubmission,
  type SpB2BQuote,
} from '../../services/supabaseService';
import B2BHome from './B2BHome';
import B2BNewSubmission from './B2BNewSubmission';
import B2BSubmissions from './B2BSubmissions';
import B2BQuotes from './B2BQuotes';
import B2BProfile from './B2BProfile';

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

  const [activeTab, setActiveTab] = useState('home');
  const [darkMode, setDarkMode] = useState(false);
  const [submissions, setSubmissions] = useState<SpB2BSubmission[]>([]);
  const [quotes, setQuotes] = useState<SpB2BQuote[]>([]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const loadData = async () => {
    if (!client?.id) return;
    const [subs, qs] = await Promise.all([
      getB2BSubmissions(client.id),
      getB2BQuotes(client.id),
    ]);
    setSubmissions(subs);
    setQuotes(qs);
  };

  useEffect(() => { loadData(); }, [client?.id]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    scrollPortalToTop();
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return (
          <B2BHome
            client={client}
            submissions={submissions}
            quotes={quotes}
            onNavigate={handleTabChange}
            lang={lang}
          />
        );
      case 'new':
        return (
          <B2BNewSubmission
            clientId={client?.id ?? ''}
            client={client}
            onDone={() => { loadData(); handleTabChange('submissions'); }}
            lang={lang}
          />
        );
      case 'submissions':
        return (
          <B2BSubmissions
            clientId={client?.id ?? ''}
            lang={lang}
            onNavigate={handleTabChange}
          />
        );
      case 'quotes':
        return <B2BQuotes clientId={client?.id ?? ''} lang={lang} companyName={client?.company_name} />;
      case 'profile':
        return (
          <B2BProfile
            client={client}
            clientId={client?.id ?? ''}
            lang={lang}
            onLogout={onLogout}
          />
        );
      default:
        return null;
    }
  };

  const companyInitials = (client?.company_name ?? 'B2B')
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
        userName={client?.company_name ?? 'Company'}
        userCode={t('B2B Client', 'Klien B2B')}
        avatarInitial={companyInitials}
        onBellClick={() => {}}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(!darkMode)}
        onAvatarClick={() => handleTabChange('profile')}
        BellIcon={Bell}
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
    </div>
  );
};

export default B2BPortal;
