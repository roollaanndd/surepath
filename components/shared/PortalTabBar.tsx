import React from 'react';
import { Lock } from 'lucide-react';
import { PathyNavIcon } from './PathyNavIcon';
import ManagedPortalIcon, { type SurePathGlyph } from './ManagedPortalIcon';

/* Shared bottom navigation for customer and agent portals. */
export interface PortalTab {
  id: string;
  label: string;
  /** Overrides the glyph when no admin icon is uploaded; see ManagedPortalIcon. */
  glyph?: SurePathGlyph;
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
  /**
   * Tab yang fiturnya sedang terkunci — mis. mitra yang belum diverifikasi
   * operator. Tab tetap bisa ditekan (layarnya menjelaskan sebabnya, yang jauh
   * lebih berguna daripada tombol mati), tapi diberi satu penanda bentuk, bukan
   * hanya warna, dan sebabnya ikut ke nama aksesibilitasnya.
   */
  lockedIds?: string[];
  /** Keterangan singkat untuk tab terkunci, mis. "menunggu verifikasi". */
  lockedHint?: string;
  /**
   * Bentuk bar. `raised` (bawaan) = empat tab dengan satu tombol tengah yang
   * menonjol, bentuk yang dipakai lima portal sejak v2.3.0. `flat` = lima tab
   * sederajat dengan tab aktif berupa lingkaran hijau pekat — bahasa navigasi
   * super app yang dipakai portal Nasabah sejak v2.7.35. Tab bertanda `center`
   * kehilangan tonjolannya di mode `flat`; letakkan aksinya di tombol
   * mengambang (FAB) bila ia memang sebuah aksi, bukan halaman.
   */
  variant?: 'raised' | 'flat';
}

const GREEN_GRADIENT = 'linear-gradient(135deg, #00C16A, #047857)';
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green focus-visible:ring-offset-2 focus-visible:ring-offset-ds-card';

const PortalTabBar: React.FC<PortalTabBarProps> = ({ tabs, activeId, onSelect, modernIcons = false, lockedIds, lockedHint, variant = 'raised' }) => (
  <nav
    aria-label="Navigasi utama"
    className="fixed inset-x-4 z-50 sp-glass-strong sp-bottom-nav rounded-[2rem]"
    data-nav-variant={variant}
    style={{
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)',
      boxShadow: '0 18px 40px -16px rgba(11,17,32,0.4)',
    }}
  >
    <div className="flex items-end justify-around px-2 pt-2 pb-2">
      {tabs.map(({ id, label, Icon, center, overlay, glyph }) => {
        const active = !overlay && activeId === id;
        const raisedCentre = center && variant === 'raised';
        const locked = !!lockedIds?.includes(id);
        const ariaLabel = locked && lockedHint ? `${label} — ${lockedHint}` : label;
        const LockBadge = locked ? (
          <span aria-hidden="true"
            className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-ds-amber text-ds-card">
            <Lock size={9} strokeWidth={3} />
          </span>
        ) : null;

        if (raisedCentre) {
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-label={ariaLabel}
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
                <ManagedPortalIcon id={id} glyph={glyph} size={34} imageClassName="w-[34px] h-[34px] object-contain" fallback={<PathyNavIcon id={id} size={34} active={active} />} />
              </span>
              <span className={`text-2xs font-black uppercase tracking-wide leading-none ${active ? 'text-ds-green' : 'text-ds-ink3'}`}>
                {label}
              </span>
              {LockBadge}
            </button>
          );
        }

        if (variant === 'flat') {
          // Bahasa super app: lima tab sederajat, yang aktif ditandai lingkaran
          // penuh berisi ikonnya. Lingkaran itu adalah penanda BENTUK, bukan
          // sekadar warna, jadi tab aktif tetap terbaca oleh mata yang sulit
          // membedakan warna — syarat yang sama yang dipenuhi batang hijau di
          // varian `raised`.
          //
          // Isinya tint + cincin hijau, bukan hijau pekat seperti di acuan.
          // Sebabnya: ikon navigasi SurePath adalah ilustrasi berwarna (mint,
          // lime, tinta gelap) yang dipilih otomatis oleh ManagedPortalIcon,
          // bukan glif satu warna seperti pada acuan. Di atas #00C16A pekat,
          // isian mint dan pale-nya hampir hilang. Tint menjaga ikon tetap
          // terbaca sambil mempertahankan isyarat "lingkaran terisi" yang sama.
          //
          // Cincinnya memakai --ds-green-text, bukan --ds-primary: sebagai
          // garis di atas bar putih, #00C16A hanya 2,18:1 — di bawah ambang
          // 3:1 WCAG 1.4.11 untuk komponen antarmuka. #047857 memberi 5,1:1,
          // dan token itu sudah berbalik sendiri ke #00E07A di tema gelap,
          // tempat nilai terang justru yang terbaca.
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-label={ariaLabel}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 px-0.5 py-1 rounded-2xl transition-all duration-300 ease-out active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 min-w-[48px] min-h-[52px] justify-center ${FOCUS_RING}`}
            >
              <span
                aria-hidden="true"
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 ease-out motion-reduce:transition-none ${active ? 'bg-ds-green-tint text-ds-green ring-2 ring-ds-green-text scale-105' : 'text-ds-ink3'}`}
                style={active ? undefined : { ['--ic-tint' as string]: 'rgba(120,130,125,0.12)' }}
              >
                <ManagedPortalIcon
                  id={id}
                  glyph={glyph}
                  size={22}
                  imageClassName="w-[22px] h-[22px] object-contain"
                  fallback={modernIcons ? <Icon size={22} strokeWidth={active ? 2.6 : 1.9} /> : <PathyNavIcon id={id} size={26} active={active} />}
                />
              </span>
              <span className={`text-2xs font-black tracking-tight leading-none transition-colors ${active ? 'text-ds-green' : 'text-ds-ink3'}`}>
                {label}
              </span>
              {LockBadge}
            </button>
          );
        }

        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-label={ariaLabel}
            aria-current={active ? 'page' : undefined}
            className={`relative flex flex-col items-center gap-1 px-1.5 py-1.5 rounded-2xl transition-all duration-300 ease-out active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 min-w-[52px] min-h-[48px] justify-center sp-interactive-surface ${active ? 'bg-ds-green-tint' : ''} ${FOCUS_RING}`}
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
              <ManagedPortalIcon id={id} glyph={glyph} size={22} imageClassName="w-[22px] h-[22px] object-contain" fallback={modernIcons ? <Icon size={22} strokeWidth={active ? 2.6 : 1.8} /> : <PathyNavIcon id={id} size={28} active={active} />} />
            </span>
            <span className={`text-2xs font-black uppercase tracking-wide leading-none transition-colors ${active ? 'text-ds-green' : 'text-ds-ink3 opacity-80'}`}>
              {label}
            </span>
            {LockBadge}
          </button>
        );
      })}
    </div>
  </nav>
);

export default PortalTabBar;
