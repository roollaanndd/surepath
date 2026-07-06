// ─── UnderlineTabs — Livin'/Astro-style tab navigation ───────────────────────
//
// Horizontal tabs with an animated underline indicator. Common pattern in
// Indonesian fintech apps (Livin' transaction filter, Astro month picker).
// Replaces the pill-style tabs currently scattered across the app.
//
// Usage:
//   <UnderlineTabs
//     tabs={[
//       { id: 'active', label: 'Aktif' },
//       { id: 'history', label: 'Riwayat' },
//       { id: 'rejected', label: 'Ditolak' },
//     ]}
//     activeId={active}
//     onChange={setActive}
//   />
//
// Reference: Screenshot_20260607_232228_Livin' by Mandiri.jpg (transaction filter),
//            Screenshot_20260706_024355_Astro.jpg (month picker)

import React from 'react';
import { useHaptic } from './useHaptic';

export interface UnderlineTab {
  id: string;
  label: string;
  /** Optional badge count (e.g. "3" pending) */
  badge?: number;
}

export interface UnderlineTabsProps {
  tabs: UnderlineTab[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const UnderlineTabs: React.FC<UnderlineTabsProps> = ({
  tabs,
  activeId,
  onChange,
  className = '',
}) => {
  const haptic = useHaptic();

  return (
    <div
      className={`flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-ds-border ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              haptic.selection();
              onChange(tab.id);
            }}
            className={[
              'relative flex items-center gap-1.5 px-4 py-3 whitespace-nowrap transition-colors',
              'text-sm font-bold',
              isActive ? 'text-ds-green' : 'text-ds-ink2 hover:text-ds-ink',
            ].join(' ')}
          >
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={[
                  'min-w-[18px] h-[18px] px-1 rounded-full text-[0.55rem] font-black flex items-center justify-center',
                  isActive
                    ? 'bg-ds-green text-white'
                    : 'bg-ds-card2 text-ds-ink2 border border-ds-border',
                ].join(' ')}
              >
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
            {/* Animated underline indicator */}
            <span
              className={[
                'absolute bottom-0 left-2 right-2 h-[3px] rounded-full transition-all duration-300',
                isActive ? 'bg-ds-green opacity-100' : 'bg-transparent opacity-0',
              ].join(' ')}
              style={{
                boxShadow: isActive ? '0 1px 8px var(--ds-primary)' : 'none',
              }}
            />
          </button>
        );
      })}
    </div>
  );
};

export default UnderlineTabs;
