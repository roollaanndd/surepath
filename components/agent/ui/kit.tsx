// Primitive "Kaca Pagi" untuk apps mitra (v2.9.0).
//
// Satu tempat untuk bentuk yang berulang di setiap layar mitra: kartu kaca,
// judul bagian, header halaman, tombol, chip, baris daftar, keadaan kosong,
// dan kerangka muat. Gayanya ada di src/styles/agent-glass.css (kelas .ag-*);
// berkas ini hanya menyusun markup dan aksesibilitasnya, tanpa logika data.

import React, { useEffect, useRef, useState } from 'react';
import AgIcon, { type AgIconName } from './AgIcon';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

/* ── Kartu kaca ─────────────────────────────────────────────────────────── */
export const AgGlass: React.FC<{
  children: React.ReactNode;
  className?: string;
  strong?: boolean;
  /** Kartu yang seluruhnya bisa ditekan. */
  onClick?: () => void;
  ariaLabel?: string;
  style?: React.CSSProperties;
}> = ({ children, className, strong, onClick, ariaLabel, style }) => {
  const cls = cx('ag-glass', strong && 'ag-glass--strong', onClick && 'ag-glass--press flex flex-col items-start justify-start text-left w-full', className);
  return onClick ? (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className={cls} style={style}>{children}</button>
  ) : (
    <div className={cls} style={style}>{children}</div>
  );
};

/* ── Judul bagian ───────────────────────────────────────────────────────── */
export const AgSection: React.FC<{
  title: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
  className?: string;
  /** Urutan muncul (stagger) saat layar terbuka. */
  index?: number;
}> = ({ title, action, children, className, index = 0 }) => (
  <section className={cx('ag-rise', className)} style={{ ['--i' as string]: index }} aria-label={title}>
    <div className="mb-3 flex items-center justify-between gap-3 px-5">
      <h2 className="ag-title">{title}</h2>
      {action && (
        <button type="button" onClick={action.onClick} className="ag-btn ag-btn--quiet -mr-2">
          {action.label}
          <AgIcon name="chevron" size={14} strokeWidth={2.2} />
        </button>
      )}
    </div>
    {children}
  </section>
);

/* ── Header halaman (layar selain Beranda) ──────────────────────────────── */
export const AgPageHeader: React.FC<{
  title: string;
  subtitle?: string;
  icon?: AgIconName;
  action?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
}> = ({ title, subtitle, icon, action, onBack, backLabel = 'Kembali' }) => (
  <header className="ag-rise flex items-center gap-3 px-5 pb-4 pt-5">
    {onBack ? (
      <button type="button" onClick={onBack} aria-label={backLabel} className="ag-iconbtn ag-press shrink-0">
        <AgIcon name="back" size={20} strokeWidth={2} />
      </button>
    ) : icon ? (
      <span className="ag-tile h-12 w-12 shrink-0"><AgIcon name={icon} size={24} /></span>
    ) : null}
    <div className="min-w-0 flex-1">
      <h1 className="truncate text-[1.375rem] font-bold leading-tight tracking-[-0.03em]" style={{ color: 'var(--ag-ink)' }}>{title}</h1>
      {subtitle && <p className="ag-caption mt-0.5 truncate">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </header>
);

/* ── Tombol ─────────────────────────────────────────────────────────────── */
type AgButtonVariant = 'primary' | 'spark' | 'glass' | 'quiet';
export const AgButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: AgButtonVariant;
  size?: 'md' | 'sm';
  icon?: AgIconName;
  iconRight?: AgIconName;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  ariaLabel?: string;
}> = ({ children, onClick, variant = 'primary', size = 'md', icon, iconRight, disabled, loading, type = 'button', className, ariaLabel }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || loading}
    aria-label={ariaLabel}
    aria-busy={loading || undefined}
    className={cx('ag-btn ag-press', `ag-btn--${variant}`, size === 'sm' && 'ag-btn--sm', className)}
    style={variant === 'primary' || variant === 'spark' ? { ['--ag-icon-accent' as string]: '#fff' } : undefined}
  >
    {loading
      ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
      : icon && <AgIcon name={icon} size={size === 'sm' ? 16 : 18} strokeWidth={2} />}
    {children}
    {iconRight && !loading && <AgIcon name={iconRight} size={size === 'sm' ? 14 : 16} strokeWidth={2.2} />}
  </button>
);

/* ── Chip status ────────────────────────────────────────────────────────── */
export type AgChipTone = 'green' | 'spark' | 'mute' | 'danger';
export const AgChip: React.FC<{ children: React.ReactNode; tone?: AgChipTone; icon?: AgIconName; className?: string }> = ({
  children, tone = 'green', icon, className,
}) => (
  <span className={cx('ag-chip', tone !== 'green' && `ag-chip--${tone}`, className)}>
    {icon && <AgIcon name={icon} size={12} strokeWidth={2.2} />}
    {children}
  </span>
);

/* ── Wadah ikon ─────────────────────────────────────────────────────────── */
export const AgTile: React.FC<{ icon: AgIconName; size?: number; iconSize?: number; managedId?: string; className?: string }> = ({
  icon, size = 44, iconSize, managedId, className,
}) => (
  <span className={cx('ag-tile shrink-0', className)} style={{ width: size, height: size, borderRadius: Math.round(size * 0.38) }}>
    <AgIcon name={icon} size={iconSize ?? Math.round(size * 0.5)} managedId={managedId} />
  </span>
);

/* ── Baris daftar ───────────────────────────────────────────────────────── */
export const AgRow: React.FC<{
  icon?: AgIconName;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}> = ({ icon, title, subtitle, trailing, onClick, className }) => {
  const body = (
    <>
      {icon && <AgTile icon={icon} size={40} />}
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-semibold" style={{ color: 'var(--ag-ink)' }}>{title}</span>
        {subtitle && <span className="ag-caption mt-0.5 block truncate">{subtitle}</span>}
      </span>
      {trailing}
      {onClick && !trailing && <AgIcon name="chevron" size={16} strokeWidth={2} className="opacity-50" />}
    </>
  );
  return onClick
    ? <button type="button" onClick={onClick} className={cx('ag-row ag-press w-full', className)}>{body}</button>
    : <div className={cx('ag-row', className)}>{body}</div>;
};

/* ── Keadaan kosong ─────────────────────────────────────────────────────── */
export const AgEmpty: React.FC<{
  icon: AgIconName;
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
}> = ({ icon, title, body, action }) => (
  <div className="flex flex-col items-center gap-2 px-6 py-9 text-center">
    <AgTile icon={icon} size={56} />
    <p className="mt-2 text-[0.9375rem] font-semibold" style={{ color: 'var(--ag-ink)' }}>{title}</p>
    {body && <p className="ag-caption max-w-[17rem]">{body}</p>}
    {action && <AgButton variant="glass" size="sm" onClick={action.onClick} className="mt-3">{action.label}</AgButton>}
  </div>
);

/* ── Kerangka muat ──────────────────────────────────────────────────────── */
export const AgSkeleton: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <span aria-hidden="true" className={cx('ag-skel block', className)} style={style} />
);

/** Kerangka Beranda: bentuknya mengikuti layar yang akan muncul. */
export const AgHomeSkeleton: React.FC<{ label: string }> = ({ label }) => (
  <div role="status" aria-label={label} className="space-y-5 px-5 pt-5">
    <AgSkeleton className="h-[204px] w-full" style={{ borderRadius: 30 }} />
    <div className="grid grid-cols-4 gap-3">
      {Array.from({ length: 8 }, (_, i) => <AgSkeleton key={i} className="h-[78px]" style={{ borderRadius: 20 }} />)}
    </div>
    <AgSkeleton className="h-[132px] w-full" style={{ borderRadius: 26 }} />
    <AgSkeleton className="h-[96px] w-full" style={{ borderRadius: 24 }} />
  </div>
);

/* ── Angka yang menghitung naik ─────────────────────────────────────────── */
/** Menghitung dari 0 ke `value` sekali saat muncul; langsung ke nilai akhir
 *  bila pengguna meminta gerak dikurangi. `format` menerima angka antara. */
export const AgCountUp: React.FC<{ value: number; format: (n: number) => string; durationMs?: number }> = ({
  value, format, durationMs = 900,
}) => {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(0);
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !Number.isFinite(value)) { setShown(value); return undefined; }
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);
  return <>{format(shown)}</>;
};

export { AgIcon };
export type { AgIconName };
