// ─────────────────────────────────────────────────────────────────────────────
// OperatorPortal.tsx — Top-level shell for /operatorapp (internal staff).
//
// Layout matches the agent app: glass header + bottom-nav (Beranda / Polis /
// Klaim / Tarik / Profil) + main scroll area. Realtime subscriptions on
// sp_admin_notifications + sp_policy_orders + sp_claims + sp_withdrawals fire
// popup toasts + bump the bell badge count.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Bell, UserCircle, Home, FileText, ShieldAlert, Wallet, User } from 'lucide-react';
import { Language } from '../../types';
import { SurePathLogo } from '../Navbar';
import { APP_VERSION } from '../../src/version';
import { supabase } from '../../services/supabaseService';
import { useToast } from '../ui';
import OperatorDashboard from './OperatorDashboard';
import OperatorOrders from './OperatorOrders';
import OperatorClaims from './OperatorClaims';
import OperatorWithdrawals from './OperatorWithdrawals';
import OperatorProfile from './OperatorProfile';
import OperatorNotifications from './OperatorNotifications';

interface Props {
  operator: any;
  onLogout: () => void;
  lang: Language;
}

const TABS = [
  { id: 'home',         labelId: 'Beranda', Icon: Home },
  { id: 'orders',       labelId: 'Polis',   Icon: FileText },
  { id: 'claims',       labelId: 'Klaim',   Icon: ShieldAlert },
  { id: 'withdrawals',  labelId: 'Tarik',   Icon: Wallet },
  { id: 'profile',      labelId: 'Profil',  Icon: User },
];

const OperatorPortal: React.FC<Props> = ({ operator, onLogout, lang }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('home');
  const [tabKey, setTabKey] = useState(0);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('sp_dark_mode') === 'true');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // bump on every realtime event so child components can refetch
  const [refreshTick, setRefreshTick] = useState(0);
  const lastNotifIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('sp_dark_mode', String(darkMode));
  }, [darkMode]);

  const handleTabChange = (tab: string) => {
    setTabKey(k => k + 1);
    setActiveTab(tab);
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
      case 'profile':
        return <OperatorProfile operator={operator} lang={lang} onLogout={onLogout} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-ds-bg text-ds-ink transition-colors duration-300 font-sora">
      <div aria-hidden className="sp-ambient" />
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
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-ds-green-tint flex items-center justify-center overflow-hidden">
              <SurePathLogo className="w-8 h-8 object-contain" />
            </div>
            <div>
              <div className="font-black text-sm tracking-tighter uppercase leading-none text-ds-ink">
                Sure<span className="text-ds-green">Path</span>
              </div>
              <div className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest leading-none mt-0.5">
                Operator <span className="text-ds-green/70 normal-case">v{APP_VERSION}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="text-right mr-2">
              <div className="text-xs font-black tracking-tight leading-none text-ds-ink">{operator?.name ?? 'Operator'}</div>
              <div className="text-[10px] font-bold text-ds-green uppercase tracking-widest leading-none mt-0.5">
                {operator?.nodeId ?? 'SP-OP'}
              </div>
            </div>

            <button
              onClick={onNotificationsOpen}
              className="relative w-9 h-9 rounded-full bg-ds-card2 border border-ds-border flex items-center justify-center active:scale-90 hover:bg-ds-card transition-all motion-reduce:transition-none motion-reduce:active:scale-100"
              aria-label="Notifikasi"
            >
              <Bell size={15} className="text-ds-ink2" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-ds-green text-white rounded-full text-[8px] font-black flex items-center justify-center leading-none ring-2 ring-ds-card animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-9 h-9 rounded-full bg-ds-card2 border border-ds-border flex items-center justify-center active:scale-90 hover:bg-ds-card transition-all motion-reduce:transition-none motion-reduce:active:scale-100"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun size={15} className="text-ds-amber" /> : <Moon size={15} className="text-ds-ink2" />}
            </button>

            <button
              onClick={() => handleTabChange('profile')}
              className="w-9 h-9 rounded-full bg-ds-card2 border border-ds-border flex items-center justify-center ml-1 active:scale-90 hover:bg-ds-card transition-all motion-reduce:transition-none motion-reduce:active:scale-100"
              aria-label="Profil"
            >
              <UserCircle size={15} className="text-ds-ink2" />
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

      {/* Floating bottom tab nav */}
      <nav className="fixed bottom-6 inset-x-3 z-50 sp-glass-strong rounded-[3rem]">
        <div className="flex items-center justify-around px-1 py-2.5">
          {TABS.map(({ id, labelId, Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-300 ease-out active:scale-95 min-w-[52px] min-h-[48px] justify-center"
                style={active ? {
                  background: 'rgba(0, 193, 106, 0.12)',
                  color: '#00C16A',
                  transform: 'scale(1.05)',
                  boxShadow: '0 4px 20px rgba(0,193,106,0.20)',
                } : {
                  color: 'var(--ds-ink3)',
                }}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.8 : 2}
                  style={active ? { color: '#00C16A' } : { color: 'var(--ds-ink3)' }}
                />
                <span
                  className="text-[9px] font-black uppercase tracking-widest leading-none"
                  style={active ? { color: '#00C16A' } : { color: 'var(--ds-ink3)' }}
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
