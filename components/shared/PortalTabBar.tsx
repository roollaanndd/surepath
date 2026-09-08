import React from 'react';

/* ─── PortalTabBar — the one floating bottom nav for every SurePath portal ───
   Extracted from the Agent portal (bank-style pill with a raised center
   action) so Customer and Agent share the exact same geometry, icon sizes and
   active treatment.

   A tab flagged `center` is rendered raised above the bar. It may either be a
   real page (`id` switches the tab) or an overlay action such as opening
   Pathy — pass `overlay: true` and it will not be highlighted as a page. */

export interface PortalTab {
  id: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  /** Raised center action (one per bar) */
  center?: boolean;
  /** Center action opens an overlay instead of switching page */
  overlay?: boolean;
}

export interface PortalTabBarProps {
  tabs: PortalTab[];
  activeId: string;
  onSelect: (id: string) => void;
}

const GREEN_GRADIENT = 'linear-gradient(135deg, #00C16A, #047857)';

const PortalTabBar: React.FC<PortalTabBarProps> = ({ tabs, activeId, onSelect }) => (
  <nav
    className="fixed bottom-5 inset-x-4 z-50 sp-glass-strong rounded-[2rem]"
    style={{ boxShadow: '0 18px 40px -16px rgba(11,17,32,0.4)' }}
  >
    <div className="flex items-end justify-around px-2 pt-2 pb-2">
      {tabs.map(({ id, label, Icon, center, overlay }) => {
        const active = !overlay && activeId === id;

        if (center) {
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className="relative -mt-8 flex flex-col items-center gap-1 active:scale-95 transition-transform motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              <span
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white transition-all ${active ? 'scale-105' : ''}`}
                style={{
                  background: GREEN_GRADIENT,
                  boxShadow: '0 12px 26px -8px rgba(0,193,106,0.65), inset 0 1px 0 rgba(255,255,255,0.25)',
                  ['--ic-tint' as string]: 'rgba(255,255,255,0.18)',
                }}
              >
                <Icon size={26} />
              </span>
              <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${active ? 'text-ds-green' : 'text-ds-ink3'}`}>
                {label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all duration-300 ease-out active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 min-w-[52px] min-h-[48px] justify-center"
          >
            <span
              className={`w-9 h-8 rounded-xl flex items-center justify-center transition-colors ${active ? 'bg-ds-green-tint text-ds-green' : 'text-ds-ink3'}`}
              style={active ? undefined : { ['--ic-tint' as string]: 'rgba(120,130,125,0.12)' }}
            >
              <Icon size={23} />
            </span>
            <span className={`text-[9px] font-black uppercase tracking-widest leading-none transition-colors ${active ? 'text-ds-green' : 'text-ds-ink3 opacity-80'}`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  </nav>
);

export default PortalTabBar;
