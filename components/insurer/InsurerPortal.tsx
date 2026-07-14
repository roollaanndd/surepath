// InsurerPortal.tsx — Top-level shell for /insurerapp.
// 5-tab bottom-nav (Beranda/Polis/Klaim/Bayar/Profil) matching the
// operator app pattern. Auth via rolling 7-day token stored in localStorage.
// Realtime subscriptions on sp_policy_orders + sp_payments fire popup toasts.

import React, { useState, useEffect } from 'react';
import { Sun, Moon, Bell, Home, FileText, ShieldAlert, Wallet, User } from 'lucide-react';
import { Language } from '../../types';
import { SurePathLogo } from '../Navbar';
import { APP_VERSION } from '../../src/version';
import { supabase } from '../../services/supabaseService';
import { useToast } from '../ui';
import OnboardingFlow, { needsOnboarding } from '../OnboardingFlow';
import InsurerDashboard from './InsurerDashboard';
import InsurerOrders from './InsurerOrders';
import InsurerClaims from './InsurerClaims';
import InsurerPayments from './InsurerPayments';
import InsurerProfile from './InsurerProfile';
import InsurerNotifications from './InsurerNotifications';

interface Props {
  authToken: string;
  onLogout: () => void;
  lang: Language;
}

const TABS = [
  { id: 'home',       labelId: 'Beranda', Icon: Home },
  { id: 'orders',     labelId: 'Polis',   Icon: FileText },
  { id: 'claims',     labelId: 'Klaim',   Icon: ShieldAlert },
  { id: 'payments',   labelId: 'Bayar',   Icon: Wallet },
  { id: 'profile',    labelId: 'Profil',  Icon: User },
];

const InsurerPortal: React.FC<Props> = ({ authToken, onLogout, lang }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('home');
  const [showOnboarding, setShowOnboarding] = useState(() => needsOnboarding('INSURER'));
  const [tabKey, setTabKey] = useState(0);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('sp_dark_mode') === 'true');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [insurerName, setInsurerName] = useState(() => sessionStorage.getItem('SUREPATH_INSURER_NAME') ?? 'Insurer');
  void setInsurerName; // kept for future profile-name updates

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('sp_dark_mode', String(darkMode));
  }, [darkMode]);

  const handleTabChange = (tab: string) => {
    setTabKey(k => k + 1);
    setActiveTab(tab);
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
        return <InsurerProfile authToken={authToken} lang={lang} onLogout={onLogout} insurerName={insurerName} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-ds-bg dark:bg-ds-dk-bg text-ds-ink dark:text-ds-dk-ink transition-colors duration-300 font-sora">
      <div aria-hidden className="sp-ambient" />
      {showOnboarding && (
        <OnboardingFlow role="INSURER" lang={lang === Language.EN ? 'EN' : 'ID'} onComplete={() => setShowOnboarding(false)} />
      )}
      <style>{`
        @keyframes spFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { [data-sp-anim] { animation: none !important; } }
      `}</style>

      {/* Top Header */}
      <header className="fixed top-0 inset-x-0 z-40 sp-glass-strong border-x-0 border-t-0 rounded-none">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center overflow-hidden">
              <SurePathLogo className="w-8 h-8 object-contain" />
            </div>
            <div>
              <div className="font-black text-sm tracking-tighter uppercase leading-none text-ds-ink">
                Sure<span className="text-purple-500">Path</span>
              </div>
              <div className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest leading-none mt-0.5">
                Insurer · <span className="text-purple-500/70 normal-case">{insurerName}</span> <span className="text-ds-ink3/70">v{APP_VERSION}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowNotifications(true)}
              className="relative w-9 h-9 rounded-full bg-ds-card2 border border-ds-border flex items-center justify-center active:scale-90 hover:bg-ds-card transition-all"
              aria-label="Notifikasi"
            >
              <Bell size={15} className="text-ds-ink2" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-purple-500 text-white rounded-full text-[8px] font-black flex items-center justify-center leading-none ring-2 ring-ds-card animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-9 h-9 rounded-full bg-ds-card2 border border-ds-border flex items-center justify-center active:scale-90 hover:bg-ds-card transition-all"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun size={15} className="text-ds-amber" /> : <Moon size={15} className="text-ds-ink2" />}
            </button>

            <button
              onClick={() => handleTabChange('profile')}
              className="w-9 h-9 rounded-full flex items-center justify-center ml-1 text-white text-xs font-black active:scale-90 transition-all ring-2 ring-purple-500/25"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}
              aria-label="Profil"
            >
              {(insurerName ?? 'I')[0].toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-16 pb-32 min-h-screen">
        <div key={tabKey} data-sp-anim style={{ animation: 'spFadeIn 0.25s ease-out' }}>
          {renderTab()}
        </div>
      </main>

      {/* Floating bottom tab nav — bank-style pills (purple identity) */}
      <nav className="fixed bottom-5 inset-x-4 z-50 sp-glass-strong rounded-[2rem]" style={{ boxShadow: '0 18px 40px -16px rgba(11,17,32,0.4)' }}>
        <div className="flex items-center justify-around px-1 py-2">
          {TABS.map(({ id, labelId, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-2xl transition-all duration-300 ease-out active:scale-95 min-w-[46px] min-h-[48px] justify-center"
              >
                <span className="w-9 h-8 rounded-xl flex items-center justify-center transition-colors"
                  style={active ? { background: 'rgba(124,58,237,0.12)', color: '#7c3aed' } : { color: 'var(--ds-ink3)' }}>
                  <Icon size={20} strokeWidth={active ? 2.6 : 2} />
                </span>
                <span
                  className="text-[9px] font-black uppercase tracking-widest leading-none transition-colors"
                  style={{ color: active ? '#7c3aed' : 'var(--ds-ink3)', opacity: active ? 1 : 0.8 }}
                >
                  {labelId}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

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
