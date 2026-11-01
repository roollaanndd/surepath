import React from 'react';
import { Bell, Moon, Sun } from 'lucide-react';

/**
 * Pita sapaan portal Nasabah — baris paling atas bahasa super app.
 *
 * Bentuknya mengikuti acuan yang diberikan roland (31 Okt 2026): satu pita
 * gradasi hijau lembut yang memuat sapaan menurut waktu dan nama depan, dengan
 * bel notifikasi dan avatar di sisi kanan. Pita ini ikut menggulung bersama
 * isi halaman — ia bukan `PortalHeader` yang menempel di atas layar — karena
 * kartu ringkasan di bawahnya sengaja menindih tepi bawah pita, dan tindihan
 * itu hanya bekerja bila keduanya berada di aliran yang sama.
 *
 * Warna seluruhnya dari token: gradasi --ds-primary-tint → --ds-bg, teks
 * --ds-ink (sapaan) dan --ds-green (nama). Tidak ada nilai mentah dari
 * gambar acuan.
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
}

const ICON_BUTTON =
  'relative flex h-10 w-10 items-center justify-center rounded-full bg-ds-card/80 text-ds-ink2 ' +
  'shadow-ds-sm ring-1 ring-ds-border transition-transform active:scale-95 ' +
  'motion-reduce:transition-none motion-reduce:active:scale-100 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green focus-visible:ring-offset-2 focus-visible:ring-offset-ds-bg';

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
}) => (
  <header
    className="relative overflow-hidden px-5 pb-20"
    style={{
      paddingTop: 'calc(1.25rem + env(safe-area-inset-top, 0px))',
      // Berakhir transparan, bukan pada --ds-bg. Shell portal (.sp-modern-app)
      // sudah membawa wash ambient hangat di pojok kiri atas; bila pita ini
      // ditutup warna solid, wash itu terpotong tepat di tepi bawah pita dan
      // meninggalkan garis sambung yang terlihat. Transparan membuat keduanya
      // menyatu.
      background:
        'linear-gradient(180deg, var(--ds-primary-tint) 0%, color-mix(in srgb, var(--ds-primary-tint) 42%, transparent) 58%, transparent 100%)',
    }}
  >
    {/* Dua lingkaran samar — kedalaman pita, sama seperti awan tipis di acuan.
        Murni dekoratif, karena itu aria-hidden. */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full"
      style={{ background: 'color-mix(in srgb, var(--ds-primary) 10%, transparent)' }}
    />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -left-20 top-6 h-44 w-44 rounded-full"
      style={{ background: 'color-mix(in srgb, var(--ds-primary) 7%, transparent)' }}
    />

    <div className="relative z-10 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ds-ink2">{greeting},</p>
        <h1 className="mt-0.5 truncate text-[1.6rem] font-black leading-tight tracking-tight text-ds-ink">
          {name}
          <span className="text-ds-green">!</span>
        </h1>
        {(subtitle || badge) && (
          <div className="mt-1.5 flex items-center gap-2">
            {subtitle && (
              <span className="truncate text-2xs font-black uppercase tracking-widest text-ds-ink3">{subtitle}</span>
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
          className="flex h-10 w-10 items-center justify-center rounded-full bg-ds-green text-base font-black text-ds-on-green shadow-ds-green ring-2 ring-ds-card transition-transform active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green focus-visible:ring-offset-2 focus-visible:ring-offset-ds-bg"
        >
          {name?.[0]?.toUpperCase() ?? '?'}
        </button>
      </div>
    </div>
  </header>
);

export default SuperAppHeader;
