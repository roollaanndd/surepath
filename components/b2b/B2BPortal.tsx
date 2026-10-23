import React, { useState, useEffect } from 'react';
import { Home, FilePlus, ClipboardList, FileCheck, UserCircle, ShieldCheck, Bell, Sun, Moon } from 'lucide-react';
import { Language } from '../../types';
import ManagedPortalIcon from '../shared/ManagedPortalIcon';
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

const TABS = [
  { id: 'home',        labelEn: 'Home',       labelId: 'Beranda',    Icon: Home },
  { id: 'new',         labelEn: 'New Quote',  labelId: 'Kuotasi',    Icon: FilePlus },
  { id: 'submissions', labelEn: 'Submissions',labelId: 'Pengajuan',  Icon: ClipboardList },
  { id: 'quotes',      labelEn: 'Quotes',     labelId: 'Penawaran',  Icon: FileCheck },
  { id: 'profile',     labelEn: 'Profile',    labelId: 'Profil',     Icon: UserCircle },
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
      <header className="fixed top-0 inset-x-0 z-40 sp-glass-strong border-x-0 border-t-0 rounded-none" style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingLeft: "env(safe-area-inset-left, 0px)", paddingRight: "env(safe-area-inset-right, 0px)" }}>
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-ds-green-tint flex items-center justify-center">
              <ShieldCheck size={18} className="text-ds-green" strokeWidth={2.2} />
            </div>
            <div>
              <div className="font-black text-sm tracking-tighter uppercase leading-none">
                Sure<span className="text-emerald-500">Path</span>{' '}
                <span className="text-emerald-500">B2B</span>
              </div>
              <div className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest leading-none">
                {t('Client Portal', 'Portal Klien')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="text-right mr-2">
              <div className="text-xs font-black tracking-tight leading-none truncate max-w-[120px]">
                {client?.company_name ?? 'Company'}
              </div>
              <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest leading-none mt-0.5">
                {t('B2B Client', 'Klien B2B')}
              </div>
            </div>

            <button type="button" aria-label={t("Notifications", "Notifikasi")} className="relative w-9 h-9 rounded-full bg-ds-card2 border border-ds-border flex items-center justify-center">
              <Bell size={15} className="text-ds-ink2" />
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              aria-label={t("Toggle theme", "Ganti tema")}
              aria-pressed={darkMode}
              className="w-9 h-9 rounded-full bg-ds-card2 border border-ds-border flex items-center justify-center"
            >
              {darkMode
                ? <Sun size={15} className="text-ds-amber" />
                : <Moon size={15} className="text-ds-ink2" />
              }
            </button>

            <button
              onClick={() => handleTabChange('profile')}
              className="w-9 h-9 rounded-full flex items-center justify-center ml-1 text-white text-xs font-black ring-2 ring-ds-green/25" style={{ background: "linear-gradient(135deg, #00C16A, #047857)" }}
            >
              {companyInitials}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-[calc(7rem+env(safe-area-inset-bottom))] min-h-screen" style={{ paddingTop: "calc(4rem + env(safe-area-inset-top, 0px))" }}>
        <div key={activeTab} className="sp-page-enter">
          {renderTab()}
        </div>
      </main>

      {/* Bottom Tab Navigation */}
      <nav aria-label={t("Main navigation", "Navigasi utama")} className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] inset-x-4 z-50 sp-glass-strong rounded-[2rem] border border-ds-border/70" style={{ boxShadow: "0 18px 40px -16px rgba(11,17,32,0.4)" }}>
        <div className="flex items-center justify-around px-1 py-2.5">
          {TABS.map(({ id, labelEn, labelId, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleTabChange(id)}
                aria-label={lang === Language.EN ? labelEn : labelId}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-2xl min-w-[52px] min-h-[48px] justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green ${active ? "text-ds-green" : "text-ds-ink3 hover:text-ds-ink2"}`}
              >
                <span aria-hidden="true" className={`w-9 h-8 rounded-xl flex items-center justify-center ${active ? "bg-ds-green-tint" : ""}`}><ManagedPortalIcon id={id} size={21} imageClassName="w-[21px] h-[21px] object-contain" fallback={<Icon size={21} strokeWidth={active ? 2.3 : 1.8} />} /></span>
                <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                  {lang === Language.EN ? labelEn : labelId}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default B2BPortal;
