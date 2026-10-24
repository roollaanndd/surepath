// ─────────────────────────────────────────────────────────────────────────────
// OperatorPortal.tsx — Top-level shell for /operatorapp (internal staff).
//
// Layout matches the agent app: glass header + bottom-nav (Beranda / Polis /
// Klaim / Tarik / Profil) + main scroll area. Realtime subscriptions on
// sp_admin_notifications + sp_policy_orders + sp_claims + sp_withdrawals fire
// popup toasts + bump the bell badge count.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Home, FileText, ShieldAlert, Wallet, User, UserCheck } from 'lucide-react';
import { Language } from '../../types';
import { scrollPortalToTop } from '../shared/scrollReset';
import PortalHeader from '../shared/PortalHeader';
import PortalTabBar, { type PortalTab } from '../shared/PortalTabBar';
import { supabase } from '../../services/supabaseService';
import { useToast } from '../ui';
import OnboardingFlow, { needsOnboarding } from '../OnboardingFlow';
import OperatorDashboard from './OperatorDashboard';
import OperatorOrders from './OperatorOrders';
import OperatorClaims from './OperatorClaims';
import OperatorWithdrawals from './OperatorWithdrawals';
import OperatorAgents from './OperatorAgents';
import OperatorProfile from './OperatorProfile';
import OperatorNotifications from './OperatorNotifications';
import { useDarkMode } from '../shared/theme';

interface Props {
  operator: any;
  onLogout: () => void;
  lang: Language;
}

const TABS: { id: string; labelId: string; Icon: PortalTab['Icon']; glyph: PortalTab['glyph'] }[] = [
  { id: 'home',         labelId: 'Beranda', Icon: Home,        glyph: 'home' },
  { id: 'orders',       labelId: 'Polis',   Icon: FileText,    glyph: 'document' },
  { id: 'claims',       labelId: 'Klaim',   Icon: ShieldAlert, glyph: 'shield' },
  { id: 'withdrawals',  labelId: 'Tarik',   Icon: Wallet,      glyph: 'withdraw' },
  { id: 'agents',       labelId: 'Agen',    Icon: UserCheck,   glyph: 'network' },
  { id: 'profile',      labelId: 'Profil',  Icon: User,        glyph: 'people' },
];

const OperatorPortal: React.FC<Props> = ({ operator, onLogout, lang }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('home');
  const [showOnboarding, setShowOnboarding] = useState(() => needsOnboarding('OPERATOR'));
  const [tabKey, setTabKey] = useState(0);
  const [darkMode, setDarkMode] = useDarkMode();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // bump on every realtime event so child components can refetch
  const [refreshTick, setRefreshTick] = useState(0);
  const lastNotifIdRef = useRef<string | null>(null);

  const handleTabChange = (tab: string) => {
    setTabKey(k => k + 1);
    setActiveTab(tab);
    scrollPortalToTop();
  };

  // ── Realtime: refresh queue + popup toast on new admin notifications ───────
  useEffect(() => {
    if (!operator?.supabaseId && !operator?.id) return;
    const channel = supabase
      .channel('operator-admin-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sp_admin_notifications' },
        (payload: any) => {
          const row = payload.new;
          if (!row) return;
          // Skip echo of the most recently seen notif (de-dupe)
          if (lastNotifIdRef.current === row.id) return;
          lastNotifIdRef.current = row.id;
          setUnreadCount(c => c + 1);
          setRefreshTick(t => t + 1);
          // Popup toast — pick variant by type
          const type = String(row.type ?? '');
          const variant: 'success' | 'info' | 'warning' = type === 'NEW_PAYMENT' ? 'success'
            : type === 'NEW_CLAIM' || type === 'NEW_WITHDRAWAL' ? 'warning'
            : 'info';
          const title = String(row.title ?? 'Notifikasi baru');
          const body  = String(row.body ?? '');
          const message = `${title}${body ? ' — ' + body : ''}`;
          if (variant === 'success') toast.success(message, { duration: 6000 });
          else if (variant === 'warning') toast.warning(message, { duration: 6000 });
          else toast.info(message, { duration: 6000 });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sp_policy_orders' },
        () => setRefreshTick(t => t + 1),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sp_claims' },
        () => setRefreshTick(t => t + 1),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sp_withdrawals' },
        () => setRefreshTick(t => t + 1),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sp_payments' },
        () => setRefreshTick(t => t + 1),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [operator?.id, operator?.supabaseId, toast]);

  const onNotificationsOpen = () => {
    setShowNotifications(true);
  };

  const onNotificationsClose = () => {
    setShowNotifications(false);
    // unreadCount will be re-fetched by OperatorNotifications on mount
    setTimeout(() => setUnreadCount(0), 300);
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return <OperatorDashboard operator={operator} lang={lang} onNavigate={handleTabChange} refreshTick={refreshTick} />;
      case 'orders':
        return <OperatorOrders operator={operator} lang={lang} refreshTick={refreshTick} />;
      case 'claims':
        return <OperatorClaims operator={operator} lang={lang} refreshTick={refreshTick} />;
      case 'withdrawals':
        return <OperatorWithdrawals operator={operator} lang={lang} refreshTick={refreshTick} />;
      case 'agents':
        return <OperatorAgents operator={operator} lang={lang} refreshTick={refreshTick} />;
      case 'profile':
        return <OperatorProfile operator={operator} lang={lang} onLogout={onLogout}
                 darkMode={darkMode} onToggleDark={() => setDarkMode(!darkMode)} />;
      default:
        return null;
    }
  };

  return (
    <div className="sp-modern-app min-h-screen bg-ds-bg dark:bg-ds-dk-bg text-ds-ink dark:text-ds-dk-ink transition-colors duration-300 font-sora antialiased">
      <div aria-hidden className="sp-ambient" />
      {showOnboarding && (
        <OnboardingFlow role="OPERATOR" lang={lang === Language.EN ? 'EN' : 'ID'} onComplete={() => setShowOnboarding(false)} />
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
      {/* Was a hand-copied PortalHeader. Consolidated so the shared one's
          fixes reach this portal too, instead of being re-applied by hand. */}
      <PortalHeader
        portalLabel="Operator"
        userName={operator?.name ?? 'Operator'}
        userCode={operator?.nodeId ?? 'SP-OP'}
        unreadCount={unreadCount}
        onBellClick={onNotificationsOpen}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(!darkMode)}
        onAvatarClick={() => handleTabChange('profile')}
        BellIcon={Bell}
        labels={{ notifications: 'Notifikasi', theme: 'Ganti tema', profile: 'Profil' }}
      />

      {/* Main Content */}
      <main className="relative z-10 pb-[calc(6rem+env(safe-area-inset-bottom))] min-h-screen" style={{ paddingTop: "calc(4rem + env(safe-area-inset-top, 0px))" }}>
        <div key={tabKey} data-sp-anim className="sp-page-enter">
          {renderTab()}
        </div>
      </main>

      {/* Floating bottom tab nav — bank-style pills */}
      <PortalTabBar
        tabs={TABS.map(({ id, labelId, Icon, glyph }) => ({ id, label: labelId, Icon, glyph }))}
        activeId={activeTab}
        onSelect={handleTabChange}
        modernIcons
      />

      {/* Notification drawer */}
      {showNotifications && (
        <OperatorNotifications
          lang={lang}
          onClose={onNotificationsClose}
          onNavigate={handleTabChange}
        />
      )}
    </div>
  );
};

export default OperatorPortal;
