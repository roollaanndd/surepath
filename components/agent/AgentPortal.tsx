import React, { useState, useEffect } from 'react';
import { Home, Users, FileText, Wallet, Trophy, Sun, Moon, ShieldCheck, Bell, ClipboardList, UserCircle, RefreshCw, Network, FileEdit } from 'lucide-react';
import { Language } from '../../types';
import {
  getAgentCommissions,
  getAgentClients,
  getAgentStats,
  getNotifications,
  type SpCommission,
  type SpClient,
  type AgentStats,
} from '../../services/supabaseService';
import AgentHome from './AgentHome';
import AgentCRM from './AgentCRM';
import AgentQuoteBuilder from './AgentQuoteBuilder';
import AgentCommission from './AgentCommission';
import AgentLeaderboard from './AgentLeaderboard';
import AgentClaims from './AgentClaims';
import { AgentNotifications } from './AgentNotifications';
import AgentProfile from './AgentProfile';
import RenewalManager from './RenewalManager';
import AgentNetwork from './AgentNetwork';
import AgentEndorsements from './AgentEndorsements';

interface Props {
  agent: any;
  onLogout: () => void;
  lang: Language;
}

const TABS = [
  { id: 'home',        labelEn: 'Home',    labelId: 'Beranda',  Icon: Home },
  { id: 'clients',     labelEn: 'Clients', labelId: 'Klien',    Icon: Users },
  { id: 'quotes',      labelEn: 'Quotes',  labelId: 'Kuotasi',  Icon: FileText },
  { id: 'claims',      labelEn: 'Claims',  labelId: 'Klaim',    Icon: ClipboardList },
  { id: 'commission',  labelEn: 'Wallet',  labelId: 'Komisi',   Icon: Wallet },
  { id: 'leaderboard', labelEn: 'Rank',    labelId: 'Peringkat',Icon: Trophy },
  { id: 'renewals',     labelEn: 'Renewals',  labelId: 'Renewal',  Icon: RefreshCw },
  { id: 'network',      labelEn: 'Network',   labelId: 'Jaringan', Icon: Network },
  { id: 'endorsements', labelEn: 'Endorse',   labelId: 'Endors',   Icon: FileEdit },
  { id: 'profile',      labelEn: 'Profile',   labelId: 'Profil',   Icon: UserCircle },
];

const AgentPortal: React.FC<Props> = ({ agent, onLogout, lang }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [activeTab, setActiveTab] = useState('home');
  const [darkMode, setDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [stats, setStats] = useState<AgentStats>({
    totalCommissionMonth: 0,
    totalCommissionAllTime: 0,
    clientsCount: 0,
    policiesCount: 0,
    pendingCommission: 0,
  });
  const [commissions, setCommissions] = useState<SpCommission[]>([]);
  const [clients, setClients] = useState<SpClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const loadData = async () => {
    if (!agent?.id) return;
    setLoading(true);
    try {
      const [statsData, commissionsData, clientsData, notifData] = await Promise.all([
        getAgentStats(agent.id),
        getAgentCommissions(agent.id),
        getAgentClients(agent.id),
        getNotifications(agent.id),
      ]);
      setStats(statsData);
      setCommissions(commissionsData);
      setClients(clientsData);
      setUnreadCount(notifData.filter(n => !n.read).length);
    } catch (err) {
      console.error('Error loading agent data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [agent?.id]);

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return (
          <AgentHome
            agent={agent}
            agentId={agent?.id ?? ''}
            stats={stats}
            recentCommissions={commissions.slice(0, 5)}
            onNavigate={setActiveTab}
            lang={lang}
          />
        );
      case 'clients':
        return <AgentCRM agentId={agent?.id ?? ''} lang={lang} />;
      case 'quotes':
        return (
          <AgentQuoteBuilder
            agentId={agent?.id ?? ''}
            clients={clients}
            lang={lang}
            onBack={() => setActiveTab('home')}
            agent={agent}
          />
        );
      case 'claims':
        return <AgentClaims agentId={agent?.id ?? ''} lang={lang} />;
      case 'commission':
        return <AgentCommission agentId={agent?.id ?? ''} lang={lang} />;
      case 'leaderboard':
        return (
          <AgentLeaderboard
            agentId={agent?.id ?? ''}
            agentName={agent?.name ?? ''}
            lang={lang}
          />
        );
      case 'renewals':
        return (
          <RenewalManager
            agentId={agent?.id ?? ''}
            lang={lang}
            agent={agent}
          />
        );
      case 'profile':
        return (
          <AgentProfile
            agent={agent}
            agentId={agent?.id ?? ''}
            lang={lang}
            onLogout={onLogout}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen bg-[#fafaf9] dark:bg-[#0a0a0a] text-slate-900 dark:text-white transition-colors duration-300`}>
      {/* Top Header */}
      <header className="fixed top-0 inset-x-0 z-40 bg-white/90 dark:bg-[#111]/90 backdrop-blur-xl border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <ShieldCheck size={16} className="text-white" strokeWidth={3} />
            </div>
            <div>
              <div className="font-black text-sm tracking-tighter uppercase leading-none">
                Sure<span className="text-primary-500">Path</span>
              </div>
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                Agent Portal
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="text-right mr-2">
              <div className="text-xs font-black tracking-tight leading-none">{agent?.name ?? 'Agent'}</div>
              <div className="text-[10px] font-bold text-primary-500 uppercase tracking-widest leading-none mt-0.5">
                {agent?.agent_code ?? 'SP-AGT'}
              </div>
            </div>

            {/* Notification bell */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center"
            >
              <Bell size={14} className="text-slate-600 dark:text-slate-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary-500 text-white rounded-full text-[8px] font-black flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center"
            >
              {darkMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-slate-600" />}
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center ml-1"
            >
              <UserCircle size={14} className="text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 pb-32 min-h-screen">
        {loading && activeTab === 'home' ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin" />
            <p className="text-slate-400 text-sm font-bold">{t('Loading your dashboard…', 'Memuat dashboard…')}</p>
          </div>
        ) : (
          renderTab()
        )}
      </main>

      {/* Bottom Tab Navigation — 6 tabs */}
      <nav className="fixed bottom-6 inset-x-3 z-50 bg-white/90 dark:bg-[#111]/90 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.25)] border border-slate-100 dark:border-white/5">
        <div className="flex items-center justify-around px-1 py-2.5">
          {TABS.map(({ id, labelEn, labelId, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-2xl transition-all duration-200 ${
                  active
                    ? 'bg-primary-500 text-white scale-110 shadow-lg shadow-orange-500/30'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                <span className="text-[8px] font-black uppercase tracking-widest leading-none">
                  {lang === Language.EN ? labelEn : labelId}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Notification drawer */}
      {showNotifications && (
        <AgentNotifications
          agentId={agent?.id ?? ''}
          lang={lang}
          onClose={() => { setShowNotifications(false); setUnreadCount(0); }}
          onNavigate={setActiveTab}
        />
      )}
    </div>
  );
};

export default AgentPortal;
