import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { SurePathLogo } from '../Navbar';
import { APP_VERSION } from '../../src/version';

/* Shared accessible header for customer, agent and internal portals. */
export interface PortalHeaderProps {
  portalLabel: string;
  userName: string;
  userCode?: string;
  userMeta?: React.ReactNode;
  avatarInitial?: string;
  unreadCount?: number;
  onBellClick: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
  onAvatarClick: () => void;
  BellIcon: React.ComponentType<{ size?: number; className?: string }>;
  labels: { notifications: string; theme: string; profile: string };
}

const CONTROL =
  'w-9 h-9 rounded-full bg-ds-card2 border border-ds-border flex items-center justify-center ' +
  'active:scale-90 hover:bg-ds-card transition-all motion-reduce:transition-none motion-reduce:active:scale-100 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green focus-visible:ring-offset-2 focus-visible:ring-offset-ds-card';

const PortalHeader: React.FC<PortalHeaderProps> = ({
  portalLabel, userName, userCode, userMeta, avatarInitial,
  unreadCount = 0, onBellClick, darkMode, onToggleDark, onAvatarClick,
  BellIcon, labels,
}) => (
  <header className="fixed top-0 inset-x-0 z-40 sp-glass-strong border-x-0 border-t-0 rounded-none" style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingLeft: "env(safe-area-inset-left, 0px)", paddingRight: "env(safe-area-inset-right, 0px)" }}>
    <div className="flex items-center justify-between gap-2 px-5 py-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-ds-green-tint flex items-center justify-center overflow-hidden">
          <SurePathLogo className="w-8 h-8 object-contain" />
        </div>
        <div className="min-w-0">
          <div className="font-black text-sm tracking-tighter uppercase leading-none text-ds-ink">
            Sure<span className="text-ds-green">Path</span>
          </div>
          <div className="text-2xs font-bold text-ds-ink3 uppercase tracking-wider leading-none mt-0.5 truncate">
            {portalLabel} <span className="text-ds-green/70 normal-case hidden min-[420px]:inline">v{APP_VERSION}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <div className="text-right mr-2 min-w-0 max-w-[6.5rem] sm:max-w-[11rem]">
          <div className="text-xs font-black tracking-tight leading-none text-ds-ink truncate">{userName}</div>
          {userCode && (
            <div className="text-2xs font-bold text-ds-green uppercase tracking-wider leading-none mt-0.5 truncate">
              {userCode}
            </div>
          )}
          {userMeta}
        </div>

        <button
          onClick={onBellClick}
          aria-label={unreadCount > 0 ? `${labels.notifications}, ${unreadCount} belum dibaca` : labels.notifications}
          className={`relative ${CONTROL}`}
        >
          <BellIcon size={18} className="text-ds-ink2" />
          {unreadCount > 0 && (
            <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-ds-green text-ds-on-green rounded-full text-[8px] font-black flex items-center justify-center leading-none ring-2 ring-ds-card">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button onClick={onToggleDark} aria-label={labels.theme} aria-pressed={darkMode} className={CONTROL}>
          {darkMode ? <Sun size={15} className="text-ds-amber" /> : <Moon size={15} className="text-ds-ink2" />}
        </button>

        <button
          onClick={onAvatarClick}
          aria-label={labels.profile}
          className="w-9 h-9 rounded-full flex items-center justify-center ml-1 text-white text-xs font-black active:scale-90 transition-all motion-reduce:transition-none motion-reduce:active:scale-100 ring-2 ring-ds-green/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green focus-visible:ring-offset-2 focus-visible:ring-offset-ds-card"
          style={{ background: 'linear-gradient(135deg, #047857, #003B2F)' }}
        >
          {(avatarInitial ?? userName?.[0] ?? 'S').toUpperCase()}
        </button>
      </div>
    </div>
  </header>
);

export default PortalHeader;
