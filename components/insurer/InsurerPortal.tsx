// InsurerPortal.tsx — Top-level shell for /insurerapp.
// 5-tab bottom-nav (Beranda/Polis/Klaim/Bayar/Profil) matching the
// operator app pattern. Auth via rolling 7-day token stored in
// sessionStorage (narrower blast radius than the localStorage the token
// previously lived in). Realtime subscriptions on sp_policy_orders +
// sp_payments fire popup toasts.

import React, { useState, useEffect } from 'react';
import { Bell, Home, FileText, ShieldAlert, Wallet, User } from 'lucide-react';
import { Language } from '../../types';
import { scrollPortalToTop } from '../shared/scrollReset';
import PortalHeader from '../shared/PortalHeader';
import PortalTabBar, { type PortalTab } from '../shared/PortalTabBar';
import { supabase } from '../../services/supabaseService';
import { useToast } from '../ui';
import OnboardingFlow, { needsOnboarding } from '../OnboardingFlow';
import InsurerDashboard from './InsurerDashboard';
import InsurerOrders from './InsurerOrders';
import InsurerClaims from './InsurerClaims';
import InsurerPayments from './InsurerPayments';
import InsurerProfile from './InsurerProfile';
import InsurerNotifications from './InsurerNotifications';
import { useDarkMode } from '../shared/theme';

interface Props {
  authToken: string;
  onLogout: () => void;
  lang: Language;
}

const TABS: { id: string; labelId: string; Icon: PortalTab['Icon']; glyph: PortalTab['glyph'] }[] = [
  { id: 'home',       labelId: 'Beranda', Icon: Home,        glyph: 'home' },
  { id: 'orders',     labelId: 'Polis',   Icon: FileText,    glyph: 'document' },
  { id: 'claims',     labelId: 'Klaim',   Icon: ShieldAlert, glyph: 'shield' },
  { id: 'payments',   labelId: 'Bayar',   Icon: Wallet,      glyph: 'payment' },
  { id: 'profile',    labelId: 'Profil',  Icon: User,        glyph: 'people' },
];

const InsurerPortal: React.FC<Props> = ({ authToken, onLogout, lang }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('home');
  const [showOnboarding, setShowOnboarding] = useState(() => needsOnboarding('INSURER'));
  const [tabKey, setTabKey] = useState(0);
  const [darkMode, setDarkMode] = useDarkMode();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [insurerName, setInsurerName] = useState(() => sessionStorage.getItem('SUREPATH_INSURER_NAME') ?? 'Insurer');
  void setInsurerName; // kept for future profile-name updates

  const handleTabChange = (tab: string) => {
    setTabKey(k => k + 1);
    setActiveTab(tab);
    scrollPortalToTop();
  };

  // ── Realtime: refresh + popup toast on new orders/payments ────────────────
  useEffect(() => {
    if (!authToken) return;
    const channel = supabase
      .channel('insurer-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sp_policy_orders' },
        (payload: any) => {
          const row = payload.new;
          if (!row) return;
          setRefreshTick(t => t + 1);
          setUnreadCount(c => c + 1);
          toast.info(`Pengajuan polis baru: ${row.client_name ?? '-'} — ${row.product_name ?? '-'}`, { duration: 6000 });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sp_policy_orders' },
        () => setRefreshTick(t => t + 1),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sp_payments' },
        () => setRefreshTick(t => t + 1),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [authToken, toast]);

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return <InsurerDashboard authToken={authToken} lang={lang} onNavigate={handleTabChange} refreshTick={refreshTick} />;
      case 'orders':
        return <InsurerOrders authToken={authToken} lang={lang} refreshTick={refreshTick} />;
      case 'claims':
        return <InsurerClaims authToken={authToken} lang={lang} refreshTick={refreshTick} />;
      case 'payments':
        return <InsurerPayments authToken={authToken} lang={lang} refreshTick={refreshTick} />;
      case 'profile':
        return <InsurerProfile authToken={authToken} lang={lang} onLogout={onLogout} insurerName={insurerName}
                 darkMode={darkMode} onToggleDark={() => setDarkMode(!darkMode)} />;
      default:
        return null;
    }
  };

  return (
    <div className="sp-modern-app min-h-screen bg-ds-bg dark:bg-ds-dk-bg text-ds-ink dark:text-ds-dk-ink transition-colors duration-300 font-sora">
      <div aria-hidden className="sp-ambient" />
      {showOnboarding && (
        <OnboardingFlow role="INSURER" lang={lang === Language.EN ? 'EN' : 'ID'} onComplete={() => setShowOnboarding(false)} />
      )}
      <style>{`
        @keyframes spFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { [data-sp-anim] { animation: none !important; } }
      `}</style>

      {/* Top Header */}
      {/* Was a hand-copied PortalHeader whose subtitle crammed portal, insurer
          name and version onto one line — at 390px it wrapped to three. The
          shared header gives each its own slot. */}
      <PortalHeader
        portalLabel="Insurer"
        userName={insurerName}
        unreadCount={unreadCount}
        onBellClick={() => setShowNotifications(true)}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(!darkMode)}
        onAvatarClick={() => handleTabChange('profile')}
        BellIcon={Bell}
        labels={{ notifications: 'Notifikasi', theme: 'Ganti tema', profile: 'Profil' }}
      />

      {/* Main Content */}
      <main className="relative z-10 pb-32 min-h-screen" style={{ paddingTop: "calc(4rem + env(safe-area-inset-top, 0px))" }}>
        <div key={tabKey} data-sp-anim className="sp-page-enter">
          {renderTab()}
        </div>
      </main>

      {/* Floating bottom tab nav — bank-style pills (emerald identity) */}
      <PortalTabBar
        tabs={TABS.map(({ id, labelId, Icon, glyph }) => ({ id, label: labelId, Icon, glyph }))}
        activeId={activeTab}
        onSelect={handleTabChange}
        modernIcons
      />

      {/* Notification drawer */}
      {showNotifications && (
        <InsurerNotifications
          authToken={authToken}
          lang={lang}
          onClose={() => { setShowNotifications(false); setUnreadCount(0); }}
          onNavigate={handleTabChange}
        />
      )}
    </div>
  );
};

export default InsurerPortal;
