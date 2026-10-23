import React, { useState, useEffect, useRef } from 'react';
import '../../src/styles/portal-modernization.css';
import { Language } from '../../types';
import { House, FileText, Plus, Wallet, UserRound } from 'lucide-react';
import { IcBell } from './AgentIcons';
import PortalHeader from '../shared/PortalHeader';
import PortalTabBar, { type PortalTab } from '../shared/PortalTabBar';
import { scrollPortalToTop } from '../shared/scrollReset';
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
import { AgentNotifications, type SpNotification } from './AgentNotifications';
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

const TABS: PortalTab[] = [
  { id: 'home',       label: 'Beranda', Icon: House },
  { id: 'policy',     label: 'Polis',   Icon: FileText },
  { id: 'quotes',     label: 'Buat',    Icon: Plus, center: true },
  { id: 'commission', label: 'Dompet',  Icon: Wallet },
  { id: 'profile',    label: 'Profil',  Icon: UserRound },
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
  const [notificationPopup, setNotificationPopup] = useState<SpNotification | null>(null);
  const seenNotificationIds = useRef<Set<string>>(new Set());

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
  const [dataLoadError, setDataLoadError] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('sp_dark_mode', String(darkMode));
  }, [darkMode]);

  // Check whether this agent has signed the current agreement version.
  // FIX v1.42.0: fail-closed — if the fetch errors, treat as NOT signed.
  // Previously this was fail-open (let agents bypass the legal gate on network blip).
  useEffect(() => {
    getMyAgreement()
      .then(rec => setAgreementOk(!!rec))
      .catch(() => setAgreementOk(false)); // fail-closed: require explicit acceptance
  }, []);

  const loadData = async () => {
    if (!agent?.id) return;
    setLoading(true);
    setDataLoadError(false);
    try {
      // Keep each dashboard panel independent: a notification outage should not
      // hide otherwise healthy commission, client, or policy data.
      const results = await Promise.allSettled([
        getAgentStats(agent.id, true),
        getAgentCommissions(agent.id, true),
        getAgentClients(agent.id, true),
        getNotifications(agent.id, true),
      ]);
      const [statsResult, commissionsResult, clientsResult, notificationsResult] = results;
      const hasError = results.some(result => result.status === 'rejected');

      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
      else console.error('Error loading agent stats:', statsResult.reason);

      if (commissionsResult.status === 'fulfilled') setCommissions(commissionsResult.value);
      else console.error('Error loading agent commissions:', commissionsResult.reason);

      if (clientsResult.status === 'fulfilled') setClients(clientsResult.value);
      else console.error('Error loading agent clients:', clientsResult.reason);

      if (notificationsResult.status === 'fulfilled') {
        setUnreadCount(notificationsResult.value.filter(n => !n.read).length);
      } else {
        console.error('Error loading agent notifications:', notificationsResult.reason);
      }

      // Tier is optional metadata; a failure here should not break the dashboard.
      try {
        const { data: tierData, error: tierError } = await supabase
          .from('sp_users')
          .select('tier')
          .eq('id', agent.id)
          .single();
        if (tierError) {
          console.error('Error loading optional agent tier metadata:', tierError);
        } else if (tierData?.tier) {
          setAgentTier(tierData.tier);
        }
      } catch (tierError) {
        console.error('Error loading optional agent tier metadata:', tierError);
      }
      setDataLoadError(hasError);
    } catch (err) {
      console.error('Error loading agent data:', err);
      setDataLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [agent?.id]);

  // Account-scoped notification polling. Existing unread items update the badge
  // on login; only newly-arrived items trigger a popup while this account is active.
  useEffect(() => {
    if (!agent?.id) return;
    let cancelled = false;
    let initialized = false;

    const refreshNotifications = async () => {
      try {
        const items = await getNotifications(agent.id, true);
        if (cancelled) return;
        const currentIds = new Set(items.map(item => item.id));
        if (!initialized) {
          seenNotificationIds.current = currentIds;
          const firstUnread = items.find(item => !item.read);
          if (firstUnread) setNotificationPopup(firstUnread);
          initialized = true;
        } else {
          const fresh = items.find(item => !seenNotificationIds.current.has(item.id));
          if (fresh) setNotificationPopup(fresh);
          seenNotificationIds.current = currentIds;
        }
        setUnreadCount(items.filter(item => !item.read).length);
      } catch (error) {
        // Notifications are non-critical; never interrupt the agent workflow.
        console.error('Unable to refresh agent notifications:', error);
      }
    };

    seenNotificationIds.current = new Set();
    void refreshNotifications();
    const interval = window.setInterval(() => { void refreshNotifications(); }, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      seenNotificationIds.current = new Set();
    };
  }, [agent?.id]);

  const handleTabChange = (tab: string) => {
    setTabKey(k => k + 1);
    setActiveTab(tab);
    scrollPortalToTop();
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
    <div className="sp-modern-app sp-agent-premium min-h-screen bg-ds-bg dark:bg-ds-dk-bg text-ds-ink dark:text-ds-dk-ink transition-colors duration-300 font-sora">
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

      <PortalHeader
        portalLabel="Agent Portal"
        userName={agent?.name ?? 'Agent'}
        userCode={agent?.agent_code ?? 'SP-AGT'}
        userMeta={myTierDef && !myTierDef.is_default ? (
          <div className="text-[8px] font-black uppercase tracking-widest" style={{ color: myTierDef.color }}>
            {myTierDef.emoji} {myTierDef.name}
          </div>
        ) : undefined}
        unreadCount={unreadCount}
        onBellClick={() => { setNotificationPopup(null); setShowNotifications(true); }}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(!darkMode)}
        onAvatarClick={() => handleTabChange('profile')}
        BellIcon={IcBell}
        labels={{
          notifications: t('Notifications', 'Notifikasi'),
          theme: t('Toggle theme', 'Ganti tema'),
          profile: t('Profile', 'Profil'),
        }}
      />

      {/* Main Content */}
      <main className="relative z-10 pb-32 min-h-screen" style={{ paddingTop: "calc(4rem + env(safe-area-inset-top, 0px))" }}>
        {loading && activeTab === 'home' ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-ds-green/20 border-t-ds-green animate-spin motion-reduce:animate-none" />
            <p className="text-ds-ink3 text-sm font-bold">{t('Loading your dashboard…', 'Memuat dashboard…')}</p>
          </div>
        ) : (
          <>
            {dataLoadError && (
              <div role="alert" aria-live="polite" className="mx-5 mb-4 rounded-2xl border border-ds-amber/30 bg-ds-amber/10 p-4">
                <p className="text-sm font-bold text-ds-ink">{t('Some dashboard data could not be refreshed.', 'Sebagian data dashboard belum berhasil dimuat.')}</p>
                <p className="mt-1 text-xs text-ds-ink3">{t('You can keep using available sections or retry the refresh.', 'Kamu tetap bisa menggunakan bagian yang tersedia atau mencoba memuat ulang.')}</p>
                <button type="button" onClick={() => void loadData()} disabled={loading} className="mt-3 min-h-10 rounded-xl bg-ds-green px-4 py-2 text-xs font-black text-white disabled:opacity-50">
                  {t('Retry refresh', 'Coba muat ulang')}
                </button>
              </div>
            )}
            <div key={tabKey} data-sp-anim className="sp-page-enter">
              {renderTab()}
            </div>
          </>
        )}
      </main>

      <PortalTabBar tabs={TABS} activeId={activeTab} onSelect={handleTabChange} modernIcons />

      {/* Notification drawer */}
      {showNotifications && (
        <AgentNotifications
          agentId={agent?.id ?? ''}
          lang={lang}
          onClose={() => {
            setShowNotifications(false);
            void getNotifications(agent?.id ?? '', true)
              .then(items => setUnreadCount(items.filter(item => !item.read).length))
              .catch(() => {});
          }}
          onNavigate={handleTabChange}
        />
      )}

      {notificationPopup && !showNotifications && !showOnboarding && (
        <div className="fixed right-4 z-[60] w-[min(22rem,calc(100vw-2rem))] animate-in fade-in slide-in-from-bottom-2"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6.5rem)' }}
          role="status" aria-live="polite">
          <div className="rounded-2xl border border-ds-border bg-ds-card p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-ds-green-tint flex items-center justify-center text-ds-green">
                <IcBell size={18} />
              </div>
              <button type="button" className="min-w-0 flex-1 text-left"
                onClick={() => { setNotificationPopup(null); setShowNotifications(true); }}>
                <span className="block text-[10px] font-black uppercase tracking-widest text-ds-green">{t('New notification', 'Notifikasi baru')}</span>
                <span className="mt-1 block text-sm font-bold text-ds-ink">{notificationPopup.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ds-ink2">{notificationPopup.body}</span>
                <span className="mt-2 block text-xs font-bold text-ds-green">{t('View notifications', 'Lihat notifikasi')}</span>
              </button>
              <button type="button" aria-label={t('Dismiss notification popup', 'Tutup popup notifikasi')}
                onClick={() => setNotificationPopup(null)}
                className="min-h-8 min-w-8 rounded-full text-ds-ink3 hover:bg-ds-card2 flex items-center justify-center">
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Pathy assistant */}
      <PathyChat lang={lang} currentUser={{ name: agent.name, id: agent.id, role: agent.role }} />
    </div>
  );
};

export default AgentPortal;
