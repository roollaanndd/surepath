import React, { useState, useEffect, useRef } from 'react';
import '../../src/styles/portal-modernization.css';
// Harus SETELAH portal-modernization.css: lapisan "Kaca Pagi" menimpa kanvas
// dan permukaan lama di bawah .ag-app.
import '../../src/styles/agent-glass.css';
import { Language } from '../../types';
import { AgTopBar, AgDock, type AgDockTab, type AgMenuItem } from './ui/shell';
import { AgHomeSkeleton, AgIcon } from './ui/kit';
import { scrollPortalToTop } from '../shared/scrollReset';
import {
  supabase,
  getAgentCommissions,
  getAgentClients,
  getAgentStats,
  getNotifications,
  getMyAgreement,
  getMyAccountTrust,
  getMyWallet,
  type SpCommission,
  type SpClient,
  type AgentStats,
} from '../../services/supabaseService';
import AgentAgreementGate from './AgentAgreementGate';
import { AgentVerificationBanner, AgentLockedFeature } from './AgentVerificationPending';
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
import PathyChat, { PATHY_OPEN_EVENT } from '../shared/PathyChat';
import { SectionLabel } from '../shared/cards';
import OnboardingFlow, { needsOnboarding } from '../OnboardingFlow';
import { useTierDefinitions, getTierByCode } from '../../hooks/useTierDefinitions';
import { useDarkMode } from '../shared/theme';

interface Props {
  agent: any;
  onLogout: () => void;
  lang: Language;
}

// Dock "Kaca Pagi" (v2.9.0): lima tujuan yang sama dengan sebelumnya, urutan
// yang sama. Empat tab sederajat dengan pil hijau yang meluncur ke tab aktif;
// "Buat" menjadi tombol oranye di tengah — aksi utama mitra, dan satu-satunya
// oranye di navigasi.
const TABS: AgDockTab[] = [
  { id: 'home',       label: 'Beranda', icon: 'home' },
  { id: 'policy',     label: 'Polis',   icon: 'policy' },
  { id: 'quotes',     label: 'Buat',    icon: 'plus', create: true },
  { id: 'commission', label: 'Dompet',  icon: 'wallet' },
  { id: 'profile',    label: 'Profil',  icon: 'profile' },
];

// Urutan layar untuk arah transisi: pindah ke layar yang lebih kanan masuk
// dari kanan, sebaliknya dari kiri.
const SCREEN_ORDER = ['home', 'clients', 'claims', 'renewals', 'network', 'leaderboard', 'endorsements', 'policy', 'quotes', 'commission', 'wallet', 'profile'];

// Tab yang aksi intinya ditolak server selama akun belum diverifikasi:
// "Buat" menerbitkan order (create_policy_order) dan "Dompet" memindahkan uang
// (agent_request_withdrawal). Lihat AgentVerificationPending.tsx untuk sebabnya.
const LOCKED_WHILE_PENDING: Record<string, string> = {
  quotes: 'Buat',
  commission: 'Dompet',
  wallet: 'Dompet',
};

// Polis tab: order tracking + quote builder toggle
const PolicyAndQuotes: React.FC<{
  agentId: string; agent: any; clients: SpClient[]; lang: Language; onNavigate: (tab: string) => void;
  /** Akun belum diverifikasi — jalur pembuatan penawaran disembunyikan di sini juga. */
  pendingVerification?: boolean;
}> = ({ agentId, agent, clients, lang, pendingVerification = false }) => {
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
        <SectionLabel action={pendingVerification ? undefined : { label: '+ Buat Penawaran', onClick: () => setShowQuoteBuilder(true) }}>
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
  // Akun belum diverifikasi operator → mode terbatas (lihat AgentVerificationPending).
  // Fail-OPEN dengan sengaja: server tetap penjaga setiap aksi berisiko, jadi
  // menebak "belum terverifikasi" saat jaringan gagal hanya akan mengunci mitra
  // sah dari fitur yang sebenarnya boleh mereka pakai.
  const [pendingVerification, setPendingVerification] = useState(false);
  const [tabKey, setTabKey] = useState(0);
  const [screenDir, setScreenDir] = useState<'forward' | 'back'>('forward');
  const [darkMode, setDarkMode] = useDarkMode();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPopup, setNotificationPopup] = useState<SpNotification | null>(null);
  const seenNotificationIds = useRef<Set<string>>(new Set());

  const [agentTier, setAgentTier] = useState<string | null>(() => (agent as any)?.tier ?? null);
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
  // Saldo dompet komisi untuk kartu ringkasan di beranda. null = belum terbaca;
  // kartunya menampilkan "—" dan mengatakannya, tidak pernah menebak angka nol.
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [clients, setClients] = useState<SpClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoadError, setDataLoadError] = useState(false);

  // Check whether this agent has signed the current agreement version.
  // FIX v1.42.0: fail-closed — if the fetch errors, treat as NOT signed.
  // Previously this was fail-open (let agents bypass the legal gate on network blip).
  useEffect(() => {
    getMyAgreement()
      .then(rec => setAgreementOk(!!rec))
      .catch(() => setAgreementOk(false)); // fail-closed: require explicit acceptance
  }, []);

  // Tier kepercayaan datang dari server (`get_my_profile` → `trust_tier`), jadi
  // aturan tier — termasuk masa tenggang akun lama — hidup di satu tempat saja.
  useEffect(() => {
    let cancelled = false;
    getMyAccountTrust()
      .then(trust => { if (!cancelled && trust) setPendingVerification(trust.tier < 2); })
      .catch(() => {}); // fail-open, lihat catatan pada state di atas
    return () => { cancelled = true; };
  }, [agent?.id]);

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
        getMyWallet(true),
      ]);
      const [statsResult, commissionsResult, clientsResult, notificationsResult, walletResult] = results;
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

      if (walletResult.status === 'fulfilled') setWalletBalance(walletResult.value?.balance ?? 0);
      else console.error('Error loading agent wallet:', walletResult.reason);

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

  // ── Tier freshness (fixes "admin changed my tier but the app still shows
  // the old one") ──────────────────────────────────────────────────────────
  // loadData() only runs on mount, and mobile PWA agents keep the JS session
  // alive for days — a tier assigned meanwhile was invisible until a full
  // reload. This lightweight refresher re-reads sp_users.tier when the app
  // regains focus and every 5 minutes while visible. It intentionally does
  // NOT touch the heavy dashboard loaders.
  useEffect(() => {
    if (!agent?.id) return;
    let cancelled = false;
    const refreshTier = async () => {
      try {
        const { data, error } = await supabase
          .from('sp_users')
          .select('tier')
          .eq('id', agent.id)
          .single();
        if (!cancelled && !error && data) {
          const next = (data as any).tier ?? null;
          setAgentTier(prev => (prev === next ? prev : next));
        }
      } catch { /* tier is optional — never surface this */ }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') refreshTier(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshTier();
    }, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.clearInterval(intervalId);
    };
  }, [agent?.id]);

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
    setScreenDir(SCREEN_ORDER.indexOf(tab) < SCREEN_ORDER.indexOf(activeTab) ? 'back' : 'forward');
    setTabKey(k => k + 1);
    setActiveTab(tab);
    scrollPortalToTop();
  };

  // Top menu: tujuan yang sebelumnya hanya bisa dicapai lewat ubin Beranda,
  // kini satu ketukan dari layar mana pun. Item pertama sengaja bernama
  // "Ringkasan", bukan "Beranda" — nama itu milik dock.
  const menu: AgMenuItem[] = [
    { id: 'home',         label: t('Overview', 'Ringkasan'),     icon: 'spark' },
    { id: 'clients',      label: t('Clients', 'Klien'),          icon: 'clients' },
    { id: 'claims',       label: t('Claims', 'Klaim'),           icon: 'claims' },
    { id: 'renewals',     label: t('Renewals', 'Perpanjangan'),  icon: 'renewals' },
    { id: 'network',      label: t('Network', 'Jaringan'),       icon: 'network' },
    { id: 'leaderboard',  label: t('Ranking', 'Peringkat'),      icon: 'rank' },
    { id: 'endorsements', label: t('Endorsements', 'Endorsemen'), icon: 'endorsements' },
    { id: 'wallet',       label: t('Withdraw', 'Tarik Dana'),    icon: 'withdraw' },
    { id: 'pathy',        label: 'Pathy',                        icon: 'pathy', onPress: () => window.dispatchEvent(new Event(PATHY_OPEN_EVENT)) },
  ];

  const screenTitle: Record<string, string> = {
    policy: t('Policies & quotes', 'Polis & Penawaran'),
    clients: t('Clients', 'Klien'),
    quotes: t('New quote', 'Buat Penawaran'),
    claims: t('Claims', 'Klaim'),
    commission: t('Commission', 'Komisi'),
    wallet: t('Wallet', 'Dompet'),
    leaderboard: t('Ranking', 'Peringkat'),
    renewals: t('Renewals', 'Perpanjangan'),
    network: t('Network', 'Jaringan'),
    endorsements: t('Endorsements', 'Endorsemen'),
    profile: t('Profile', 'Profil'),
  };
  const hour = new Date().getHours();
  const greeting = hour < 11 ? t('Good morning', 'Selamat pagi')
    : hour < 15 ? t('Good afternoon', 'Selamat siang')
    : hour < 18 ? t('Good evening', 'Selamat sore')
    : t('Good night', 'Selamat malam');
  const firstName = (agent?.name ?? 'Mitra').split(' ')[0];
  const openNotifications = () => { setNotificationPopup(null); setShowNotifications(true); };

  const renderTab = () => {
    const lockedLabel = pendingVerification ? LOCKED_WHILE_PENDING[activeTab] : undefined;
    if (lockedLabel) {
      return (
        <AgentLockedFeature
          lang={lang}
          feature={lockedLabel}
          onOpenProfile={() => handleTabChange('profile')}
        />
      );
    }
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
            walletBalance={walletBalance}
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
            pendingVerification={pendingVerification}
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
            onNavigate={handleTabChange}
            stats={stats}
            agentTier={agentTier}
            darkMode={darkMode}
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
    <div className="sp-modern-app sp-agent-premium ag-app min-h-screen text-ds-ink dark:text-ds-dk-ink transition-colors duration-300 font-sora">
      {/* Cahaya di belakang kaca: tiga bercak buram yang bergeser sangat pelan. */}
      <div aria-hidden className="ag-aurora"><i /><i /><i /></div>
      {showOnboarding && agreementOk && (
        <OnboardingFlow role="AGENT" lang={lang === Language.EN ? 'EN' : 'ID'} onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Satu bar kaca untuk semua layar. Di Beranda ia menyapa; di layar lain
          ia menyebut layarnya, supaya mitra selalu tahu sedang berada di mana. */}
      <AgTopBar
        eyebrow={activeTab === 'home' ? `${greeting},` : `${t('SurePath Partner', 'SurePath Mitra')} · ${agent?.agent_code ?? 'SP-AGT'}`}
        title={activeTab === 'home' ? firstName : (screenTitle[activeTab] ?? firstName)}
        initial={(agent?.name?.[0] ?? 'M').toUpperCase()}
        badge={myTierDef && !myTierDef.is_default ? (
          <span className="ag-chip shrink-0" style={{ color: myTierDef.color, background: `${myTierDef.color}1f` }}>
            <span aria-hidden="true">{myTierDef.emoji}</span> {myTierDef.name}
          </span>
        ) : undefined}
        unreadCount={unreadCount}
        darkMode={darkMode}
        onBellClick={openNotifications}
        onToggleDark={() => setDarkMode(!darkMode)}
        onAvatarClick={() => handleTabChange('profile')}
        labels={{
          notifications: t('Notifications', 'Notifikasi'),
          theme: t('Toggle theme', 'Ganti tema'),
          profile: t('Profile', 'Profil'),
          menu: t('Feature menu', 'Menu fitur'),
        }}
        menu={menu}
        activeId={activeTab}
        onSelect={handleTabChange}
      />

      {/* Main Content */}
      <main
        className="relative z-10 pb-36 min-h-screen"
        style={{ paddingTop: 'calc(6.75rem + env(safe-area-inset-top, 0px))' }}
      >
        {loading && activeTab === 'home' ? (
          <AgHomeSkeleton label={t('Loading your dashboard…', 'Memuat dashboard…')} />
        ) : (
          <>
            {dataLoadError && (
              <div role="alert" aria-live="polite" className="ag-glass ag-glass--strong mx-5 mb-4 mt-3 p-4">
                <p className="text-sm font-semibold" style={{ color: 'var(--ag-ink)' }}>{t('Some dashboard data could not be refreshed.', 'Sebagian data dashboard belum berhasil dimuat.')}</p>
                <p className="ag-caption mt-1">{t('You can keep using available sections or retry the refresh.', 'Kamu tetap bisa menggunakan bagian yang tersedia atau mencoba memuat ulang.')}</p>
                <button type="button" onClick={() => void loadData()} disabled={loading} className="ag-btn ag-btn--primary ag-btn--sm ag-press mt-3">
                  {t('Retry refresh', 'Coba muat ulang')}
                </button>
              </div>
            )}
            {pendingVerification && (
              <div className="pt-3">
                <AgentVerificationBanner
                  lang={lang}
                  onOpenProfile={activeTab === 'profile' ? undefined : () => handleTabChange('profile')}
                />
              </div>
            )}
            <div key={tabKey} data-sp-anim data-dir={screenDir} className="ag-screen">
              {renderTab()}
            </div>
          </>
        )}
      </main>

      <AgDock
        tabs={TABS}
        activeId={activeTab}
        onSelect={handleTabChange}
        lockedIds={pendingVerification ? Object.keys(LOCKED_WHILE_PENDING) : undefined}
        lockedHint={t('awaiting verification', 'menunggu verifikasi')}
      />

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
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6.75rem)' }}
          role="status" aria-live="polite">
          <div className="ag-glass ag-glass--strong p-4" style={{ boxShadow: 'var(--ag-shadow-lift)' }}>
            <div className="flex items-start gap-3">
              <div className="ag-tile h-10 w-10 shrink-0">
                <AgIcon name="bell" size={20} managedId="notifications" />
              </div>
              <button type="button" className="min-w-0 flex-1 text-left"
                onClick={() => { setNotificationPopup(null); setShowNotifications(true); }}>
                <span className="block text-xs font-semibold" style={{ color: 'var(--ag-orange-ink)' }}>{t('New notification', 'Notifikasi baru')}</span>
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
