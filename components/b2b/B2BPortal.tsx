import React, { useState, useEffect } from 'react';
import { Home, FilePlus, ClipboardList, FileCheck, UserCircle, ShieldCheck, Bell, Sun, Moon } from 'lucide-react';
import { Language } from '../../types';
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

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return (
          <B2BHome
            client={client}
            submissions={submissions}
            quotes={quotes}
            onNavigate={setActiveTab}
            lang={lang}
          />
        );
      case 'new':
        return (
          <B2BNewSubmission
            clientId={client?.id ?? ''}
            client={client}
            onDone={() => { loadData(); setActiveTab('submissions'); }}
            lang={lang}
          />
        );
      case 'submissions':
        return (
          <B2BSubmissions
            clientId={client?.id ?? ''}
            lang={lang}
            onNavigate={setActiveTab}
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
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#0a0a0a] text-slate-900 dark:text-white transition-colors duration-300">
      {/* Top Header */}
      <header className="fixed top-0 inset-x-0 z-40 bg-white/90 dark:bg-[#111]/90 backdrop-blur-xl border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <ShieldCheck size={16} className="text-white" strokeWidth={3} />
            </div>
            <div>
              <div className="font-black text-sm tracking-tighter uppercase leading-none">
                Sure<span className="text-emerald-500">Path</span>{' '}
                <span className="text-emerald-500">B2B</span>
              </div>
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
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

            <button className="relative w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center">
              <Bell size={14} className="text-slate-600 dark:text-slate-300" />
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center"
            >
              {darkMode
                ? <Sun size={14} className="text-amber-400" />
                : <Moon size={14} className="text-slate-600" />
              }
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center ml-1 text-white text-[10px] font-black"
            >
              {companyInitials}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 pb-[calc(7rem+env(safe-area-inset-bottom))] min-h-screen">
        {renderTab()}
      </main>

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] inset-x-3 z-50 bg-white/90 dark:bg-[#111]/90 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.25)] border border-slate-100 dark:border-white/5">
        <div className="flex items-center justify-around px-1 py-2.5">
          {TABS.map(({ id, labelEn, labelId, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-2xl transition-all duration-200 ${
                  active
                    ? 'bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/30'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span className="text-[10px] font-bold tracking-wide leading-tight">
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
