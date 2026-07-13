import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Language } from '../../types';
import { SurePathLogo } from '../Navbar';
import { IcHome, IcPolicy, IcCreate, IcWallet, IcProfile, IcBell } from './AgentIcons';
import { APP_VERSION } from '../../src/version';
import {
  supabase,
  getAgentCommissions,
  getAgentClients,
  getAgentStats,
  getNotifications,
  getMyAgreement,
  type SpCommission,
  type SpClient,
  type AgentStats,
} from '../../services/supabaseService';
import AgentAgreementGate from './AgentAgreementGate';
import AgentHome from './AgentHome';
import AgentCRM from './AgentCRM';
import AgentQuoteBuilder from './AgentQuoteBuilder';
import AgentCommission from './AgentCommission';
import AgentWalletView from './AgentWallet';
import AgentLeaderboard from './AgentLeaderboard';
import AgentClaims from './AgentClaims';
import { AgentNotifications } from './AgentNotifications';
import AgentProfile from './AgentProfile';
import RenewalManager from './RenewalManager';
import AgentNetwork from './AgentNetwork';
import AgentEndorsements from './AgentEndorsements';
import AgentOrderStatus from './AgentOrderStatus';
import PathyChat from '../shared/PathyChat';
import { SectionLabel } from '../shared/cards';
import OnboardingFlow, { needsOnboarding } from '../OnboardingFlow';
import { useTierDefinitions, getTierByCode } from '../../hooks/useTierDefinitions';

interface Props {
  agent: any;
  onLogout: () => void;
  lang: Language;
}

const TABS = [
  { id: 'home',       labelId: 'Beranda',  Icon: IcHome },
  { id: 'policy',     labelId: 'Polis',    Icon: IcPolicy },
  { id: 'quotes',     labelId: 'Buat',     Icon: IcCreate },
  { id: 'commission', labelId: 'Dompet',   Icon: IcWallet },
  { id: 'profile',    labelId: 'Profil',   Icon: IcProfile },
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
    <div className="space-y-4 pb-8">
      <div className="px-5 pt-5">
        <SectionLabel action={{ label: '+ Buat Penawaran', onClick: () => setShowQuoteBuilder(true) }}>
          Polis &amp; Penawaran
        </SectionLabel>
      </div>
      <div className="px-5">
        <AgentOrderStatus agentId={agentId} lang={lang} />
      </div>
    </div>
  );
};

const AgentPortal: React.FC<Props> = ({ agent, onLogout, lang }) => {
  const t = (en: string, id: string) => lang === Language.EN ? en : id;

  const [activeTab, setActiveTab] = useState('home');
  const [showOnboarding, setShowOnboarding] = useState(() => needsOnboarding('AGENT'));
  // Legal agreement gate — null = checking, false = must accept, true = signed
  const [agreementOk, setAgreementOk] = useState<boolean | null>(null);
  const [tabKey, setTabKey] = useState(0);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('sp_dark_mode') === 'true');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [agentTier, setAgentTier] = useState<string | null>(null);
  const { tiers } = useTierDefinitions();
  const myTierDef = getTierByCode(tiers, agentTier);
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
    localStorage.setItem('sp_dark_mode', String(darkMode));
  }, [darkMode]);

  // Check whether this agent has signed the current agreement version
  useEffect(() => {
    getMyAgreement()
      .then(rec => setAgreementOk(!!rec))
      .catch(() => setAgreementOk(true)); // fail-open on transient error; recheck next load
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
          <AgentQuoteBuilder
            agentId={agent?.id ?? ''}
            clients={clients}
            lang={lang}
            onBack={() => handleTabChange('home')}
            agent={agent}
            quoteOnly
          />
        );
      case 'claims':
        return <AgentClaims agentId={agent?.id ?? ''} lang={lang} />;
      case 'commission':
        return <AgentCommission agentId={agent?.id ?? ''} lang={lang} onNavigate={handleTabChange} />;
      case 'wallet':
        return <AgentWalletView />;
      case 'leaderboard':
        return (
          <AgentLeaderboard
            agentId={agent?.id ?? ''}
            agentName={agent?.name ?? ''}
            lang={lang}
            agentTier={agentTier}
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

  // Legal agreement gate blocks all app access until signed
  if (agreementOk === false) {
    return <AgentAgreementGate agent={agent} lang={lang} onAccepted={() => setAgreementOk(true)} />;
  }

  return (
    <div className="min-h-screen bg-ds-bg text-ds-ink transition-colors duration-300 font-sora">
      <div aria-hidden className="sp-ambient" />
      {showOnboarding && agreementOk && (
        <OnboardingFlow role="AGENT" lang={lang === Language.EN ? 'EN' : 'ID'} onComplete={() => setShowOnboarding(false)} />
      )}
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
      <header className="fixed top-0 inset-x-0 z-40 sp-glass-strong border-x-0 border-t-0 rounded-none">
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
                Agent Portal <span className="text-ds-green/70 normal-case">v{APP_VERSION}</span>
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
              {myTierDef && !myTierDef.is_default && (
                <div className="text-[8px] font-black uppercase tracking-widest" style={{ color: myTierDef.color }}>
                  {myTierDef.emoji} {myTierDef.name}
                </div>
              )}
            </div>

            {/* Notification bell */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative w-9 h-9 rounded-full bg-ds-card2 border border-ds-border flex items-center justify-center active:scale-90 hover:bg-ds-card transition-all motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              <IcBell size={18} className="text-ds-ink2" />
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
              className="w-9 h-9 rounded-full flex items-center justify-center ml-1 text-white text-xs font-black active:scale-90 transition-all motion-reduce:transition-none motion-reduce:active:scale-100 ring-2 ring-ds-green/25"
              style={{ background: 'linear-gradient(135deg, #00C16A, #047857)' }}
            >
              {(agent?.name ?? 'A')[0].toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-16 pb-32 min-h-screen">
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

      {/* Floating bottom tab nav — bank-style with raised center action */}
      <nav className="fixed bottom-5 inset-x-4 z-50 sp-glass-strong rounded-[2rem]" style={{ boxShadow: '0 18px 40px -16px rgba(11,17,32,0.4)' }}>
        <div className="flex items-end justify-around px-2 pt-2 pb-2">
          {TABS.map(({ id, labelId, Icon }, idx) => {
            const active = activeTab === id;
            const center = idx === 2;
            if (center) {
              return (
                <button
                  key={id}
                  onClick={() => handleTabChange(id)}
                  className="relative -mt-8 flex flex-col items-center gap-1 active:scale-95 transition-transform"
                >
                  <span className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white transition-all ${active ? 'scale-105' : ''}`}
                    style={{ background: 'linear-gradient(135deg, #00C16A, #047857)', boxShadow: '0 12px 26px -8px rgba(0,193,106,0.65), inset 0 1px 0 rgba(255,255,255,0.25)', ['--ic-tint' as string]: 'rgba(255,255,255,0.18)' }}>
                    <Icon size={26} />
                  </span>
                  <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${active ? 'text-ds-green' : 'text-ds-ink3'}`}>
                    {labelId}
                  </span>
                </button>
              );
            }
            return (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all duration-300 ease-out active:scale-95 min-w-[52px] min-h-[48px] justify-center"
              >
                <span className={`w-9 h-8 rounded-xl flex items-center justify-center transition-colors ${active ? 'bg-ds-green-tint text-ds-green' : 'text-ds-ink3'}`}
                  style={active ? undefined : { ['--ic-tint' as string]: 'rgba(120,130,125,0.12)' }}>
                  <Icon size={23} />
                </span>
                <span className={`text-[9px] font-black uppercase tracking-widest leading-none transition-colors ${active ? 'text-ds-green' : 'text-ds-ink3 opacity-80'}`}>
                  {labelId}
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

      {/* Floating Pathy assistant */}
      <PathyChat lang={lang} currentUser={{ name: agent.name, id: agent.id, role: agent.role }} />
    </div>
  );
};

export default AgentPortal;
