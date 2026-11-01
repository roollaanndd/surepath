import React from 'react';
import { Bell, Moon, Sun } from 'lucide-react';
import SuperAppBackdrop, { dayPartOf, type DayPart } from './SuperAppBackdrop';

/**
 * Pita sapaan super app — baris paling atas Beranda.
 *
 * Bentuknya mengikuti acuan yang diberikan roland (31 Okt 2026), dan warnanya
 * mengikuti permintaannya berikutnya (1 Nov 2026): pita hijau korporat dengan
 * latar bergambar yang bervariasi, menggantikan pita tier lama yang untuk
 * tier bawaan tercat arang `#46505F → #23272E` — "hitam dan terlalu polos".
 *
 * Pita ini ikut menggulung bersama isi halaman — ia bukan `PortalHeader` yang
 * menempel di atas layar — karena kartu ringkasan di bawahnya sengaja
 * menindih tepi bawahnya, dan tindihan itu hanya bekerja bila keduanya berada
 * di aliran yang sama.
 *
 * Warnanya dari token hijau korporat yang sudah ada (`--ds-primary-hero`,
 * `--ds-primary-hover`, `--ds-primary`), bukan dari lapisan `--ds-admin-*`:
 * lapisan itu sengaja dibatasi untuk CMS admin yang tidak punya mode gelap,
 * sedangkan portal Mitra punya. Aksen lime-nya dibawa oleh ilustrasinya.
 * Teksnya putih di atas `#003B2F` → 14,8:1, jauh di atas ambang AA.
 */
export interface SuperAppHeaderProps {
  /** Sapaan menurut jam, mis. "Selamat Pagi". */
  greeting: string;
  /** Nama depan pengguna. */
  name: string;
  /** Baris kecil di bawah nama, mis. kode mitra. */
  subtitle?: string;
  /** Lencana kecil di samping nama, mis. tier mitra. */
  badge?: React.ReactNode;
  unreadCount: number;
  darkMode: boolean;
  onBellClick: () => void;
  onToggleDark: () => void;
  onAvatarClick: () => void;
  labels: { notifications: string; theme: string; profile: string };
  /**
   * Bagian hari untuk adegan latarnya. Diisi pemanggil supaya satu jam bisa
   * dipaksa dalam tes dan tangkapan layar; bawaannya jam setempat.
   */
  dayPart?: DayPart;
}

const ICON_BUTTON =
  'relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white ' +
  'ring-1 ring-white/25 backdrop-blur-sm transition-transform active:scale-95 ' +
  'motion-reduce:transition-none motion-reduce:active:scale-100 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

export const SuperAppHeader: React.FC<SuperAppHeaderProps> = ({
  greeting,
  name,
  subtitle,
  badge,
  unreadCount,
  darkMode,
  onBellClick,
  onToggleDark,
  onAvatarClick,
  labels,
  dayPart,
}) => {
  const part = dayPart ?? dayPartOf(new Date().getHours());
  // Mode gelap memakai ujung yang lebih dalam supaya pita tidak menyala di
  // layar yang sudah gelap; terang memakai hijau korporat penuh.
  const band = darkMode
    ? 'linear-gradient(160deg, #04241C 0%, #063025 48%, #0A5741 100%)'
    : 'linear-gradient(160deg, #003B2F 0%, #04543F 46%, #0A7A52 100%)';

  return (
    <header
      className="relative isolate overflow-hidden rounded-b-[2.25rem] px-5 pb-20 text-white"
      style={{
        paddingTop: 'calc(1.25rem + env(safe-area-inset-top, 0px))',
        background: band,
      }}
    >
      <SuperAppBackdrop part={part} />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white/80">{greeting},</p>
          <h1 className="mt-0.5 truncate text-[1.6rem] font-black leading-tight tracking-tight text-white">
            {name}
            <span style={{ color: '#E3EF26' }}>!</span>
          </h1>
          {(subtitle || badge) && (
            <div className="mt-1.5 flex items-center gap-2">
              {subtitle && (
                <span className="truncate text-2xs font-black uppercase tracking-widest text-white/70">{subtitle}</span>
              )}
              {badge}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onToggleDark} aria-label={labels.theme} className={ICON_BUTTON}>
            {darkMode ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
          </button>

          <button type="button" onClick={onBellClick} aria-label={labels.notifications} className={ICON_BUTTON}>
            <Bell size={18} strokeWidth={2} />
            {unreadCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ds-red px-1 text-2xs font-black text-white"
                aria-hidden="true"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            <span className="sr-only">{unreadCount > 0 ? String(unreadCount) : ''}</span>
          </button>

          <button
            type="button"
            onClick={onAvatarClick}
            aria-label={labels.profile}
            className="flex h-10 w-10 items-center justify-center rounded-full text-base font-black transition-transform active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            style={{ background: '#E3EF26', color: '#06231D', boxShadow: '0 6px 16px -8px rgba(0,0,0,.6)' }}
          >
            {name?.[0]?.toUpperCase() ?? '?'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default SuperAppHeader;
