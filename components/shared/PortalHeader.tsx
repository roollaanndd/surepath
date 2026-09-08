import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { SurePathLogo } from '../Navbar';
import { APP_VERSION } from '../../src/version';

/* ─── PortalHeader — the one fixed header for every SurePath portal ──────────
   Extracted from the Agent portal so Customer, Agent (and later Operator /
   Insurer) share one piece of chrome instead of drifting apart.

   Geometry is fixed on purpose — 36px controls, 36px logo tile, glass strip:
   pass content in, not classNames. */

export interface PortalHeaderProps {
  /** Portal name under the wordmark, e.g. "Portal Nasabah" */
  portalLabel: string;
  /** Name shown on the right */
  userName: string;
  /** Small emerald code under the name, e.g. agent code / member id */
  userCode?: string;
  /** Optional extra line under the code (agent tier chip) */
  userMeta?: React.ReactNode;
  /** Initial shown in the avatar; defaults to the first letter of userName */
  avatarInitial?: string;
  unreadCount?: number;
  onBellClick: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
  /** Avatar taps go to the profile tab */
  onAvatarClick: () => void;
  /** Bell glyph — each portal passes its own duotone icon */
  BellIcon: React.ComponentType<{ size?: number; className?: string }>;
  /** Accessible labels (portals are bilingual) */
  labels: { notifications: string; theme: string; profile: string };
}

const CONTROL =
  'w-9 h-9 rounded-full bg-ds-card2 border border-ds-border flex items-center justify-center ' +
  'active:scale-90 hover:bg-ds-card transition-all motion-reduce:transition-none motion-reduce:active:scale-100';

const PortalHeader: React.FC<PortalHeaderProps> = ({
  portalLabel, userName, userCode, userMeta, avatarInitial,
  unreadCount = 0, onBellClick, darkMode, onToggleDark, onAvatarClick,
  BellIcon, labels,
}) => (
  <header className="fixed top-0 inset-x-0 z-40 sp-glass-strong border-x-0 border-t-0 rounded-none">
    <div className="flex items-center justify-between gap-2 px-5 py-3">
      {/* Logo + wordmark */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-ds-green-tint flex items-center justify-center overflow-hidden">
          <SurePathLogo className="w-8 h-8 object-contain" />
        </div>
        <div className="min-w-0">
          <div className="font-black text-sm tracking-tighter uppercase leading-none text-ds-ink">
            Sure<span className="text-ds-green">Path</span>
          </div>
          {/* The version is a diagnostic — it yields to the portal name on
              narrow screens; both profile pages always show it in full. */}
          <div className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest leading-none mt-0.5 truncate">
            {portalLabel} <span className="text-ds-green/70 normal-case hidden min-[420px]:inline">v{APP_VERSION}</span>
          </div>
        </div>
      </div>

      {/* Identity + controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Identity — truncates rather than wrapping: a wrapped name would grow
            the fixed header past the 64px the portals pad their content by. */}
        <div className="text-right mr-2 min-w-0 max-w-[6.5rem] sm:max-w-[11rem]">
          <div className="text-xs font-black tracking-tight leading-none text-ds-ink truncate">{userName}</div>
          {userCode && (
            <div className="text-[10px] font-bold text-ds-green uppercase tracking-widest leading-none mt-0.5 truncate">
              {userCode}
            </div>
          )}
          {userMeta}
        </div>

        <button onClick={onBellClick} aria-label={labels.notifications} className={`relative ${CONTROL}`}>
          <BellIcon size={18} className="text-ds-ink2" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-ds-green text-white rounded-full text-[8px] font-black flex items-center justify-center leading-none ring-2 ring-ds-card">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button onClick={onToggleDark} aria-label={labels.theme} className={CONTROL}>
          {darkMode ? <Sun size={15} className="text-ds-amber" /> : <Moon size={15} className="text-ds-ink2" />}
        </button>

        <button
          onClick={onAvatarClick}
          aria-label={labels.profile}
          className="w-9 h-9 rounded-full flex items-center justify-center ml-1 text-white text-xs font-black active:scale-90 transition-all motion-reduce:transition-none motion-reduce:active:scale-100 ring-2 ring-ds-green/25"
          style={{ background: 'linear-gradient(135deg, #00C16A, #047857)' }}
        >
          {(avatarInitial ?? userName?.[0] ?? 'S').toUpperCase()}
        </button>
      </div>
    </div>
  </header>
);

export default PortalHeader;
