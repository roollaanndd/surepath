// Kerangka apps mitra "Kaca Pagi" (v2.9.0): header kaca + top menu + dock.
//
// Tiga-tiganya khusus apps mitra. PortalHeader / PortalTabBar / SuperAppHeader
// di components/shared tetap dipakai portal lain dan tidak disentuh.
//
//   AgTopBar  — bar kaca yang menempel di atas SEMUA layar (Beranda juga):
//               avatar, sapaan atau judul layar, bel, tema. Di bawahnya top
//               menu: rel pil yang menggeser, berisi tujuan yang dulu hanya
//               bisa dicapai lewat ubin Beranda (Klien, Klaim, Perpanjangan,
//               Jaringan, Peringkat, Endorsemen, Tarik dana, Pathy).
//   AgDock    — navigasi utama lima tujuan. Empat tab sederajat dengan pil
//               hijau yang meluncur ke tab aktif, dan satu tombol oranye
//               "Buat" di tengah — satu-satunya oranye di navigasi.
//
// Kontrak yang dijaga tests/agentApp.spec.ts: <nav aria-label="Navigasi
// utama"> memuat teks Beranda/Polis/Buat/Dompet/Profil, teks "Beranda" hanya
// muncul sekali di layar, dan tombol bernama "Pathy" pertama membuka asisten.

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import AgIcon, { type AgIconName } from './AgIcon';

export interface AgMenuItem {
  id: string;
  label: string;
  icon: AgIconName;
  /** Bila diisi, item ini menjalankan aksi (mis. membuka Pathy) alih-alih pindah layar. */
  onPress?: () => void;
}

const SPRING = { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.8 };

/* ── Bar atas ───────────────────────────────────────────────────────────── */
export const AgTopBar: React.FC<{
  /** Baris kecil di atas (sapaan, atau nama app di layar selain Beranda). */
  eyebrow: string;
  /** Baris besar (nama mitra di Beranda, judul layar di tempat lain). */
  title: string;
  initial: string;
  badge?: React.ReactNode;
  unreadCount: number;
  darkMode: boolean;
  onBellClick: () => void;
  onToggleDark: () => void;
  onAvatarClick: () => void;
  labels: { notifications: string; theme: string; profile: string; menu: string };
  menu: AgMenuItem[];
  activeId: string;
  onSelect: (id: string) => void;
}> = ({
  eyebrow, title, initial, badge, unreadCount, darkMode, onBellClick, onToggleDark, onAvatarClick,
  labels, menu, activeId, onSelect,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Item aktif selalu terlihat di rel, tanpa pengguna harus menggesernya sendiri.
  useEffect(() => {
    const rail = railRef.current;
    const el = rail?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!rail || !el) return;
    const target = el.offsetLeft - (rail.clientWidth - el.offsetWidth) / 2;
    rail.scrollTo({ left: Math.max(0, target), behavior: reduce ? 'auto' : 'smooth' });
  }, [activeId, reduce]);

  return (
    <div className="ag-topbar" data-scrolled={scrolled}>
      <div className="ag-topbar__inner">
        <div className="flex items-center gap-3 px-4 pb-2 pt-2.5">
          <button type="button" onClick={onAvatarClick} aria-label={labels.profile} className="ag-avatar ag-press shrink-0">
            {initial}
          </button>
          <div className="min-w-0 flex-1">
            <p className="ag-caption truncate leading-tight">{eyebrow}</p>
            <div className="flex items-center gap-2">
              <p className="truncate text-[1.0625rem] font-bold leading-tight tracking-[-0.025em]" style={{ color: 'var(--ag-ink)' }}>{title}</p>
              {badge}
            </div>
          </div>
          <button type="button" onClick={onToggleDark} aria-label={labels.theme} className="ag-iconbtn ag-press shrink-0">
            <AgIcon name={darkMode ? 'sun' : 'moon'} size={19} />
          </button>
          <button type="button" onClick={onBellClick} aria-label={unreadCount > 0 ? `${labels.notifications} (${unreadCount})` : labels.notifications} className="ag-iconbtn ag-press shrink-0">
            <AgIcon name="bell" size={19} />
            {unreadCount > 0 && <span className="ag-badge" aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>}
          </button>
        </div>

        <nav aria-label={labels.menu} ref={railRef} className="ag-menu">
          {menu.map(item => {
            const active = !item.onPress && item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => (item.onPress ? item.onPress() : onSelect(item.id))}
                aria-current={active ? 'page' : undefined}
                className="ag-menu__item ag-press"
                style={active ? { ['--ag-icon-accent' as string]: '#fff' } : undefined}
              >
                {active && (
                  <motion.span layoutId="ag-menu-pill" className="ag-menu__pill" transition={reduce ? { duration: 0 } : SPRING} aria-hidden="true" />
                )}
                <AgIcon name={item.icon} size={16} strokeWidth={1.9} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

/* ── Dock ───────────────────────────────────────────────────────────────── */
export interface AgDockTab {
  id: string;
  label: string;
  icon: AgIconName;
  /** Tombol oranye di tengah. */
  create?: boolean;
}

export const AgDock: React.FC<{
  tabs: AgDockTab[];
  activeId: string;
  onSelect: (id: string) => void;
  lockedIds?: string[];
  lockedHint?: string;
}> = ({ tabs, activeId, onSelect, lockedIds, lockedHint }) => {
  const reduce = useReducedMotion();
  return (
    <nav aria-label="Navigasi utama" className="ag-dock">
      {tabs.map(tab => {
        const active = tab.id === activeId;
        const locked = !!lockedIds?.includes(tab.id);
        const ariaLabel = locked && lockedHint ? `${tab.label} — ${lockedHint}` : tab.label;
        const lock = locked && (
          <span className="ag-dock__lock" aria-hidden="true"><AgIcon name="lock" size={9} strokeWidth={2.6} style={{ ['--ag-icon-accent' as string]: '#fff' }} /></span>
        );
        if (tab.create) {
          return (
            <button
              key={tab.id} type="button" onClick={() => onSelect(tab.id)}
              aria-label={ariaLabel} aria-current={active ? 'page' : undefined}
              className="ag-dock__item ag-dock__item--create ag-press"
            >
              <span className="ag-dock__create" aria-hidden="true">
                <AgIcon name={tab.icon} size={26} strokeWidth={2.4} managedId={tab.id} />
              </span>
              <span>{tab.label}</span>
              {lock}
            </button>
          );
        }
        return (
          <button
            key={tab.id} type="button" onClick={() => onSelect(tab.id)}
            aria-label={ariaLabel} aria-current={active ? 'page' : undefined}
            className="ag-dock__item ag-press"
          >
            {active && (
              <motion.span layoutId="ag-dock-pill" className="ag-dock__pill" transition={reduce ? { duration: 0 } : SPRING} aria-hidden="true" />
            )}
            <AgIcon name={tab.icon} size={23} strokeWidth={active ? 2 : 1.7} managedId={tab.id} />
            <span>{tab.label}</span>
            {lock}
          </button>
        );
      })}
    </nav>
  );
};
