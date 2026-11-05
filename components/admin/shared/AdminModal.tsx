// AdminModal — wrapper modal terpadu untuk Admin CMS (v2.7.58).
//
// Sebelum ini tiap modal menulis boilerplate overlay+container sendiri, dan
// backdrop-nya bervariasi dari `bg-slate-900/35` (lembut) sampai `bg-black/80`
// ("lembaran hitam" — keluhan owner). Modal ini menetapkan standar:
//
//   Backdrop: `bg-slate-900/40 dark:bg-slate-950/55 backdrop-blur-[3px]`
//   Container: `max-w-{sm|md|lg|xl|2xl}`, `max-h-[92dvh]`, scroll contained
//   Sticky footer: optional, menempel di bawah saat konten scroll
//
// Modal yang butuh backdrop lebih gelap (CredentialModal — menampilkan
// kata sandi, perlu perhatian) boleh pakai `tone="prominent"`.
//
// Interaksi aksesibilitas:
//   - Klik backdrop → onClose kecuali dismissible={false}
//   - role="dialog", aria-modal, aria-labelledby dari title
//   - Esc untuk close (document listener, dibersihkan saat unmount)
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export type AdminModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AdminModalTone = 'default' | 'prominent';

const SIZE_CLS: Record<AdminModalSize, string> = {
  sm:  'max-w-sm',
  md:  'max-w-md',
  lg:  'max-w-lg',
  xl:  'max-w-xl',
  '2xl': 'max-w-2xl',
};

const BACKDROP_CLS: Record<AdminModalTone, string> = {
  // Standar: lembut, terlihat tapi tidak menutup konteks. Mode gelap pakai
  // slate-950 (bukan hitam murni) supaya tidak kontras keras ke border card.
  default:   'bg-slate-900/40 dark:bg-slate-950/55 backdrop-blur-[3px]',
  // Prominent: dipakai saat modal menampilkan info sekali-tampil (kata sandi
  // sementara) — backdrop lebih gelap untuk menarik perhatian, tapi tetap
  // di bawah `bg-black/80` yang lama.
  prominent: 'bg-slate-900/65 dark:bg-slate-950/75 backdrop-blur-sm',
};

export interface AdminModalProps {
  onClose: () => void;
  /** Judul dialog — muncul di header dan dipakai aria-labelledby. */
  title: React.ReactNode;
  /** Deskripsi tipis di bawah judul. */
  subtitle?: React.ReactNode;
  /** Ikon kiri judul; sebaiknya ikon lucide kecil (18px). */
  icon?: React.ReactNode;
  size?: AdminModalSize;
  tone?: AdminModalTone;
  /** Klik backdrop + Esc ditolak bila false (contoh: sedang proses upload). */
  dismissible?: boolean;
  /** Tombol X di kanan atas. Default true. */
  showClose?: boolean;
  /** Footer yang menempel di bawah saat konten scroll (tombol aksi). */
  footer?: React.ReactNode;
  children?: React.ReactNode;
  /** zIndex kustom untuk modal berlapis (default 200). */
  zIndex?: number;
  /** Id dialog — otomatis kalau tidak diberi. */
  id?: string;
}

let idCounter = 0;
function useAutoId(prefix: string): string {
  const ref = useRef<string | null>(null);
  if (ref.current === null) ref.current = `${prefix}-${++idCounter}`;
  return ref.current;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  onClose,
  title,
  subtitle,
  icon,
  size = 'xl',
  tone = 'default',
  dismissible = true,
  showClose = true,
  footer,
  children,
  zIndex = 200,
  id,
}) => {
  const titleId = useAutoId(id ?? 'admin-modal');

  useEffect(() => {
    if (!dismissible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, dismissible]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-5"
      style={{ zIndex }}
    >
      <div
        className={`absolute inset-0 ${BACKDROP_CLS[tone]} transition-opacity`}
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 w-full ${SIZE_CLS[size]} max-h-[92dvh] flex flex-col bg-white dark:bg-ds-card text-slate-900 dark:text-white border border-slate-200 dark:border-ds-border rounded-2xl sm:rounded-3xl shadow-[0_24px_80px_rgba(15,23,42,0.22)] overflow-hidden`}
      >
        {/* Header: non-scroll, dengan close button */}
        <div className="flex items-start justify-between gap-3 px-5 sm:px-7 pt-5 sm:pt-6 pb-3">
          <div className="flex-1 min-w-0">
            <h3
              id={titleId}
              className="font-bold tracking-tight text-base sm:text-lg flex items-center gap-2.5"
            >
              {icon && <span className="text-ds-green shrink-0">{icon}</span>}
              <span className="truncate">{title}</span>
            </h3>
            {subtitle && (
              <p className="mt-1 text-xs sm:text-[13px] text-slate-500 dark:text-ds-ink3 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {showClose && dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="shrink-0 -mt-1 -mr-1 w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-ds-ink3 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Body: scroll-area */}
        <div className="flex-1 overflow-y-auto overscroll-contain no-scrollbar px-5 sm:px-7 pb-5">
          {children}
        </div>

        {/* Footer: sticky di luar scroll-area supaya selalu terlihat */}
        {footer && (
          <div className="border-t border-slate-100 dark:border-ds-border px-5 sm:px-7 py-4 bg-white dark:bg-ds-card">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminModal;
