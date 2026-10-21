import React from 'react';
import { PathyNavIcon } from './PathyNavIcon';
import ManagedPortalIcon from './ManagedPortalIcon';

/* Shared bottom navigation for customer and agent portals. */
export interface PortalTab {
  id: string;
  label: string;
  Icon: React.ElementType<{ size?: number; strokeWidth?: number; className?: string }>;
  center?: boolean;
  overlay?: boolean;
}

export interface PortalTabBarProps {
  tabs: PortalTab[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Use crisp Lucide line icons in the customer portal; keep the branded mascot in the agent portal. */
  modernIcons?: boolean;
}

const GREEN_GRADIENT = 'linear-gradient(135deg, #00C16A, #047857)';
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green focus-visible:ring-offset-2 focus-visible:ring-offset-ds-card';

const PortalTabBar: React.FC<PortalTabBarProps> = ({ tabs, activeId, onSelect, modernIcons = false }) => (
  <nav
    aria-label="Navigasi utama"
    className="fixed inset-x-4 z-50 sp-glass-strong rounded-[2rem]"
    style={{
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)',
      boxShadow: '0 18px 40px -16px rgba(11,17,32,0.4)',
    }}
  >
    <div className="flex items-end justify-around px-2 pt-2 pb-2">
      {tabs.map(({ id, label, Icon, center, overlay }) => {
        const active = !overlay && activeId === id;

        if (center) {
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={`relative -mt-8 flex flex-col items-center gap-1 active:scale-95 transition-transform motion-reduce:transition-none motion-reduce:active:scale-100 ${FOCUS_RING}`}
            >
              <span
                aria-hidden="true"
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white transition-all ${active ? 'scale-105 ring-4 ring-ds-green/35' : ''}`}
                style={{
                  background: GREEN_GRADIENT,
                  boxShadow: '0 12px 26px -8px rgba(0,193,106,0.65), inset 0 1px 0 rgba(255,255,255,0.25)',
                  ['--ic-tint' as string]: 'rgba(255,255,255,0.18)',
                }}
              >
                <ManagedPortalIcon id={id} size={34} imageClassName="w-[34px] h-[34px] object-contain" fallback={<PathyNavIcon id={id} size={34} active={active} />} />
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
            type="button"
            onClick={() => onSelect(id)}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all duration-300 ease-out active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 min-w-[52px] min-h-[48px] justify-center sp-interactive-surface ${active ? 'bg-ds-green-tint' : ''} ${FOCUS_RING}`}
          >
            {/* Penanda tab aktif. Sebelumnya status aktif hanya dibedakan
                warna hijau pada ikon dan label — terlalu halus untuk dilihat
                sekilas, apalagi di layar terang. Batang ini memberi satu
                isyarat bentuk, bukan hanya warna, jadi ia tetap terbaca oleh
                mata yang sulit membedakan warna. */}
            <span
              aria-hidden="true"
              className={`absolute -top-0.5 left-1/2 -translate-x-1/2 h-1 rounded-full bg-ds-green transition-all duration-300 ease-out motion-reduce:transition-none ${active ? 'w-6 opacity-100' : 'w-0 opacity-0'}`}
            />
            <span
              aria-hidden="true"
              className={`w-9 h-8 rounded-xl flex items-center justify-center transition-colors ${active ? 'text-ds-green' : 'text-ds-ink3'}`}
              style={active ? undefined : { ['--ic-tint' as string]: 'rgba(120,130,125,0.12)' }}
            >
              <ManagedPortalIcon id={id} size={22} imageClassName="w-[22px] h-[22px] object-contain" fallback={modernIcons ? <Icon size={22} strokeWidth={active ? 2.6 : 1.8} /> : <PathyNavIcon id={id} size={28} active={active} />} />
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
