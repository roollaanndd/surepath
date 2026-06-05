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
          <h2 className="font-black text-xl tracking-tight">Polis & Penawaran</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Order aktif & riwayat</p>
        </div>
        <button
          onClick={() => setShowQuoteBuilder(true)}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-br from-[#16a34a] to-[#15803d] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[#16a34a]/30 active:scale-[0.97] hover:brightness-105 transition-all motion-reduce:transition-none motion-reduce:active:scale-100"
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
    <div className="min-h-screen bg-[#EEF4FB] dark:bg-[#0a1929] text-slate-900 dark:text-white transition-colors duration-300 font-sora">
      <style>{`
        @keyframes spFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-sp-anim] { animation: none !important; }
        }
      `}</style>
      {/* Top Header — navy gradient (myBCA-style) */}
      <header
        className="fixed top-0 inset-x-0 z-40"
        style={{ background: 'linear-gradient(135deg, #0B2447 0%, #1a3a6b 65%, #0E7490 100%)' }}
      >
        {/* Top row */}
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
              <SurePathLogo className="w-6 h-6 object-contain" />
            </div>
            <span className="text-white font-black text-[15px] tracking-tight">
              Sure<span style={{ color: '#5CE1E6' }}>Path</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowNotifications(true)}
              className="relative w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
            >
              <Bell size={15} className="text-white" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-400 ring-1 ring-white/20" />
              )}
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
            >
              {darkMode ? <Sun size={14} className="text-amber-300" /> : <Moon size={14} className="text-white" />}
            </button>
            <button
              onClick={() => handleTabChange('profile')}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
            >
              <UserCircle size={14} className="text-white/80" />
            </button>
          </div>
        </div>
        {/* Greeting row */}
        <div className="px-5 pt-1 pb-4">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.25em] leading-none">HALO,</p>
          <p className="text-white font-black text-xl tracking-tight leading-tight mt-0.5">
            {(agent?.name ?? 'Agen').toUpperCase()}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-white/40 text-[10px] font-bold">{agent?.agent_code ?? 'SP-AGT'}</span>
            {agentTier && (
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                agentTier === 'ELITE'
                  ? 'bg-purple-500/30 text-purple-300'
                  : 'bg-amber-500/30 text-amber-300'
              }`}>
                {agentTier === 'ELITE' ? '💎 Elite' : '⭐ Bintang'}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-28 pb-24 min-h-screen">
        {loading && activeTab === 'home' ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-[#16a34a]/20 border-t-[#16a34a] animate-spin motion-reduce:animate-none" />
            <p className="text-slate-400 text-sm font-bold">{t('Loading your dashboard…', 'Memuat dashboard…')}</p>
          </div>
        ) : (
          <div key={tabKey} data-sp-anim style={{ animation: 'spFadeIn 0.25s ease-out' }}>
            {renderTab()}
          </div>
        )}
      </main>

      {/* Bottom Tab Navigation — flat dark navy bar (myBCA-style) */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50"
        style={{ background: '#0B2447', paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}
      >
        <div className="flex items-center justify-around px-2 pt-2 pb-3">
          {TABS.map(({ id, labelId, Icon }, index) => {
            const active = activeTab === id;
            const isCenter = index === 2;
            return (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`flex flex-col items-center gap-1 transition-all duration-200 active:scale-90 motion-reduce:transition-none ${isCenter ? '-mt-7' : ''}`}
              >
                {isCenter ? (
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
                    style={{ background: 'linear-gradient(135deg, #0E7490, #1a3a6b)', boxShadow: '0 4px 20px rgba(14,116,144,0.5)' }}
                  >
                    <Icon size={22} strokeWidth={2.5} className="text-white" />
                  </div>
                ) : (
                  <>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-white/15' : ''}`}>
                      <Icon size={17} strokeWidth={active ? 2.5 : 2} style={{ color: active ? '#5CE1E6' : 'rgba(255,255,255,0.35)' }} />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest leading-none" style={{ color: active ? '#5CE1E6' : 'rgba(255,255,255,0.35)' }}>
                      {labelId}
                    </span>
                  </>
                )}
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
