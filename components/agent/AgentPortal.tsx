import React, { useState, useEffect } from 'react';
import { Home, FileText, Wallet, Sun, Moon, Bell, UserCircle, ShoppingBag } from 'lucide-react';
import { Language } from '../../types';
import { SurePathLogo } from '../Navbar';
import {
  supabase,
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
import AgentBuyMarketplace from './AgentBuyMarketplace';
import AgentCommission from './AgentCommission';
import AgentLeaderboard from './AgentLeaderboard';
import AgentClaims from './AgentClaims';
import { AgentNotifications } from './AgentNotifications';
import AgentProfile from './AgentProfile';
import RenewalManager from './RenewalManager';
import AgentNetwork from './AgentNetwork';
import AgentEndorsements from './AgentEndorsements';
import AgentOrderStatus from './AgentOrderStatus';
import PathyChat from '../shared/PathyChat';

interface Props {
  agent: any;
  onLogout: () => void;
  lang: Language;
}

const TABS = [
  { id: 'home',       labelId: 'Beranda',  Icon: Home },
  { id: 'policy',     labelId: 'Polis',    Icon: FileText },
  { id: 'quotes',     labelId: 'Beli',     Icon: ShoppingBag },
  { id: 'commission', labelId: 'Dompet',   Icon: Wallet },
  { id: 'profile',    labelId: 'Profil',   Icon: UserCircle },
];

// Polis tab: order tracking + quote builder toggle
const PolicyAndQuotes: React.FC<{
  agentId: string; agent: any; clients: SpClient[]; lang: Language; onNavigate: (tab: string) => void;
}> = ({ agentId, agent, clients, lang }) => {
  const [showQuoteBuilder, setShowQuoteBuilder] = React.useState(false);
  if (showQuoteBuilder) {
    return (
      <AgentQuoteBuilder
        agentId={agentId}
        clients={clients}
        lang={lang}
        onBack={() => setShowQuoteBuilder(false)}
        agent={agent}
        quoteOnly
      />
    );
  }
  return (
    <div className="space-y-4 pb-8 font-sora">
      <div className="px-5 pt-5 flex items-center justify-between">
        <div>
          <h2 className="font-black text-xl tracking-tight text-ds-ink">Polis & Penawaran</h2>
          <p className="text-[10px] text-ds-ink3 font-bold uppercase tracking-widest">Order aktif & riwayat</p>
        </div>
        <button
          onClick={() => setShowQuoteBuilder(true)}
          className="px-4 py-2.5 rounded-xl bg-ds-green text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-ds-green active:scale-[0.97] hover:bg-ds-green-dk transition-all motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          📄 Buat Penawaran
        </button>
      </div>
      <AgentOrderStatus agentId={agentId} lang={lang} />
    </div>
  );
};

const AgentPortal: React.FC<Props> = ({ agent, onLogout, lang }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [activeTab, setActiveTab] = useState('home');
  const [tabKey, setTabKey] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    const hour = new Date().getHours();
    return hour < 6 || hour >= 19;
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [agentTier, setAgentTier] = useState<string | null>(null);
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

  // Auto-switch at 7 PM (dark) and 6 AM (light)
  useEffect(() => {
    const id = setInterval(() => {
      const hour = new Date().getHours();
      setDarkMode(hour < 6 || hour >= 19);
    }, 60_000);
    return () => clearInterval(id);
  }, []);

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

      // Fetch tier from DB
      const { data: tierData } = await supabase
        .from('sp_users')
        .select('tier')
        .eq('id', agent?.id)
        .single();
      if (tierData?.tier) setAgentTier(tierData.tier);
    } catch (err) {
      console.error('Error loading agent data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [agent?.id]);

  const handleTabChange = (tab: string) => {
    setTabKey(k => k + 1);
    setActiveTab(tab);
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return (
          <AgentHome
            agent={agent}
            agentId={agent?.id ?? ''}
            stats={stats}
            recentCommissions={commissions.slice(0, 5)}
            onNavigate={handleTabChange}
            lang={lang}
            agentTier={agentTier}
          />
        );
      case 'policy':
        return (
          <PolicyAndQuotes
            agentId={agent?.id ?? ''}
            agent={agent}
            clients={clients}
            lang={lang}
            onNavigate={handleTabChange}
          />
        );
      case 'clients':
        return <AgentCRM agentId={agent?.id ?? ''} lang={lang} />;
      case 'quotes':
        return (
          <AgentBuyMarketplace
            agentId={agent?.id ?? ''}
            agent={agent}
            clients={clients}
            lang={lang}
            onBack={() => handleTabChange('home')}
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
      case 'network':
        return (
          <AgentNetwork
            agentId={agent?.id ?? ''}
            lang={lang}
            agent={agent}
          />
        );
      case 'endorsements':
        return <AgentEndorsements agentId={agent?.id ?? ''} lang={lang} />;
      case 'profile':
        return (
          <AgentProfile
            agent={agent}
            agentId={agent?.id ?? ''}
            lang={lang}
            onLogout={onLogout}
            stats={stats}
            agentTier={agentTier}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-ds-bg text-ds-ink transition-colors duration-300 font-sora">
      <style>{`
        @keyframes spFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-sp-anim] { animation: none !important; }
        }
      `}</style>

      {/* Top Header */}
      <header className="fixed top-0 inset-x-0 z-40 bg-ds-card border-b border-ds-border shadow-ds-sm">
        <div className="flex items-center justify-between px-5 py-3">
          {/* Logo + Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-ds-green-tint flex items-center justify-center overflow-hidden">
              <SurePathLogo className="w-8 h-8 object-contain" />
            </div>
            <div>
              <div className="font-black text-sm tracking-tighter uppercase leading-none text-ds-ink">
                Sure<span className="text-ds-green">Path</span>
              </div>
              <div className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest leading-none mt-0.5">
                Agent Portal
              </div>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            <div className="text-right mr-2">
              <div className="text-xs font-black tracking-tight leading-none text-ds-ink">{agent?.name ?? 'Agent'}</div>
              <div className="text-[10px] font-bold text-ds-green uppercase tracking-widest leading-none mt-0.5">
                {agent?.agent_code ?? 'SP-AGT'}
              </div>
              {agentTier && (
                <div className={`text-[8px] font-black uppercase tracking-widest ${
                  agentTier === 'ELITE' ? 'text-ds-purple' : 'text-ds-amber'
                }`}>
                  {agentTier === 'ELITE' ? '💎 Elite' : '⭐ Bintang'}
                </div>
              )}
            </div>

            {/* Notification bell */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative w-9 h-9 rounded-full bg-ds-card2 border border-ds-border flex items-center justify-center active:scale-90 hover:bg-ds-card transition-all motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              <Bell size={15} className="text-ds-ink2" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-ds-green text-white rounded-full text-[8px] font-black flex items-center justify-center leading-none ring-2 ring-ds-card">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-9 h-9 rounded-full bg-ds-card2 border border-ds-border flex items-center justify-center active:scale-90 hover:bg-ds-card transition-all motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              {darkMode ? <Sun size={15} className="text-ds-amber" /> : <Moon size={15} className="text-ds-ink2" />}
            </button>

            <button
              onClick={() => handleTabChange('profile')}
              className="w-9 h-9 rounded-full bg-ds-card2 border border-ds-border flex items-center justify-center ml-1 active:scale-90 hover:bg-ds-card transition-all motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              <UserCircle size={15} className="text-ds-ink2" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 pb-32 min-h-screen">
        {loading && activeTab === 'home' ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-ds-green/20 border-t-ds-green animate-spin motion-reduce:animate-none" />
            <p className="text-ds-ink3 text-sm font-bold">{t('Loading your dashboard…', 'Memuat dashboard…')}</p>
          </div>
        ) : (
          <div key={tabKey} data-sp-anim style={{ animation: 'spFadeIn 0.25s ease-out' }}>
            {renderTab()}
          </div>
        )}
      </main>

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-ds-card border-t border-ds-border" style={{paddingBottom: 'env(safe-area-inset-bottom)'}}>
        <div className="flex items-center justify-around px-2 pt-2 pb-2">
          {TABS.map(({ id, labelId, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors duration-150"
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.75}
                  className={active ? 'text-ds-green' : 'text-ds-ink3'}
                />
                <span className={`text-[10px] font-medium leading-none ${active ? 'text-ds-green' : 'text-ds-ink3'}`}>
                  {labelId}
                </span>
                {active && <span className="w-1 h-1 rounded-full bg-ds-green mt-0.5" />}
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

      {/* Floating Pathy assistant */}
      <PathyChat lang={lang} />
    </div>
  );
};

export default AgentPortal;
