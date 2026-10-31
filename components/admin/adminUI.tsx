import React from 'react';
import { AlertTriangle, RefreshCw, type LucideIcon } from 'lucide-react';
import { getStatusMeta, type StatusMeta } from '../../lib/statusMeta';
import { ILLUSTRATION_MAP, type SpEmptyStateVariant } from '../shared/SpEmptyState';
import ModuleIcon from '../shared/ModuleIcon';

// ─── Admin design-system primitives ──────────────────────────────────────────
//
// The admin CMS previously hand-rolled every KPI card, status badge, empty
// state and error banner per view (30+ copies with drifting paddings, radii
// and tone palettes). These primitives standardise that surface on the shared
// ds-* tokens so the whole admin portal renders one coherent, light-only,
// enterprise look. They are intentionally dependency-free presentational
// components — no data fetching, no state — so any view can adopt them
// without coupling to a provider.

// ── KPI card ─────────────────────────────────────────────────────────────────

export type KpiTone = 'green' | 'amber' | 'blue' | 'rose' | 'violet' | 'lime';

const KPI_TONE: Record<KpiTone, { icon: string; value: string }> = {
  green:  { icon: 'bg-ds-green-tint text-ds-green',      value: 'text-ds-ink' },
  amber:  { icon: 'bg-ds-amber-lt text-ds-amber',        value: 'text-ds-ink' },
  blue:   { icon: 'bg-ds-blue-lt text-ds-blue',          value: 'text-ds-ink' },
  rose:   { icon: 'bg-rose-50 text-rose-700 dark:text-rose-200',            value: 'text-ds-ink' },
  violet: { icon: 'bg-ds-purple-lt text-ds-purple',      value: 'text-ds-ink' },
  lime:   { icon: 'bg-lime-50 text-lime-700',            value: 'text-ds-ink' },
};

export const AdminKpiCard: React.FC<{
  label: string;
  value: React.ReactNode;
  /** Exact untruncated value, shown on hover when the compact value is rounded. */
  exact?: string;
  sub?: string;
  /** SurePath illustrated icon (Icon Manager id). Preferred over `icon`. */
  iconId?: string;
  icon?: LucideIcon;
  tone?: KpiTone;
  loading?: boolean;
  onClick?: () => void;
  href?: string;
}> = ({ label, value, exact, sub, iconId, icon: Icon, tone = 'green', loading, onClick, href }) => {
  const t = KPI_TONE[tone];
  const inner = (
    <>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${t.icon}`}>
          {iconId ? <ModuleIcon id={iconId} size={30} /> : Icon ? <Icon size={17} /> : null}
        </div>
        {onClick && (
          <span className="text-2xs font-bold text-ds-green opacity-0 group-hover:opacity-100 transition-opacity">
            Buka →
          </span>
        )}
      </div>
      <p
        className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums leading-none mb-1.5 ${t.value}`}
        title={exact ?? (typeof value === 'string' || typeof value === 'number' ? String(value) : undefined)}
      >
        {loading ? <span className="inline-block w-16 h-6 rounded-lg bg-ds-card2 animate-pulse align-middle" /> : value}
      </p>
      <p className="text-2xs font-bold uppercase tracking-wider text-ds-ink3">{label}</p>
      {sub && <p className="mt-1 text-2xs font-semibold text-ds-ink3 leading-snug">{sub}</p>}
    </>
  );
  const cls =
    'group text-left p-4 sm:p-5 rounded-2xl border bg-ds-card border-ds-border shadow-ds-sm transition-all duration-200 ease-out ' +
    (onClick || href
      ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-ds-md hover:border-ds-green/40 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-green/40'
      : '');
  if (href) {
    return (
      <a href={href} onClick={onClick} className={cls}>
        {inner}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  }
  return <div className={cls}>{inner}</div>;
};

// ── Status badge ─────────────────────────────────────────────────────────────
// Thin wrapper over the shared statusMeta maps so admin tables use exactly the
// same labels + colors as the customer/agent/operator portals.

export const AdminStatusBadge: React.FC<{
  status: string;
  map?: Record<string, StatusMeta>;
  size?: 'xs' | 'sm';
}> = ({ status, map, size = 'sm' }) => {
  const meta = getStatusMeta(status, map);
  const cls =
    size === 'xs'
      ? 'px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-widest transition-colors duration-150'
      : 'px-2.5 py-1 rounded-full text-2xs font-black uppercase tracking-widest transition-colors duration-150';
  return (
    <span className={`${cls} ${meta.badgeClass} border border-black/5 whitespace-nowrap`}>
      {meta.label}
    </span>
  );
};

// ── Empty state ──────────────────────────────────────────────────────────────

export const AdminEmptyState: React.FC<{
  icon?: LucideIcon;
  /** SurePath illustrated icon (Icon Manager id); takes priority over `icon`. */
  iconId?: string;
  /** Illustrated SurePath empty-state variant; takes priority over `icon` when set. */
  illustration?: SpEmptyStateVariant;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon: Icon, iconId, illustration, title, hint, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
    {illustration ? (
      <div className="mb-3">
        {React.createElement(ILLUSTRATION_MAP[illustration], { size: 128 })}
      </div>
    ) : (
      <div className="w-14 h-14 rounded-2xl bg-ds-card2 border border-ds-border flex items-center justify-center text-ds-ink3 mb-4">
        {iconId ? <ModuleIcon id={iconId} size={40} /> : Icon && <Icon size={24} />}
      </div>
    )}
    <p className="text-sm font-black uppercase tracking-widest text-ds-ink">{title}</p>
    {hint && <p className="mt-2 max-w-md text-xs leading-relaxed text-ds-ink3">{hint}</p>}
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-5 px-5 py-2.5 rounded-xl bg-ds-green-tint border border-ds-green/30 text-ds-green font-black text-2xs uppercase tracking-widest transition-colors hover:bg-ds-green hover:text-white"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

// ── Error banner ─────────────────────────────────────────────────────────────

export const AdminErrorBanner: React.FC<{
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}> = ({ message, onRetry, retrying }) => (
  <div
    role="alert"
    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3"
  >
    <div className="flex items-center gap-2.5 min-w-0">
      <AlertTriangle size={15} className="text-rose-700 dark:text-rose-200 flex-shrink-0" />
      <p className="text-xs font-bold text-rose-700 truncate">{message}</p>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-2xs font-black uppercase tracking-widest text-rose-700 dark:text-rose-200 transition-colors hover:bg-rose-100 disabled:opacity-50"
      >
        <RefreshCw size={11} className={retrying ? 'animate-spin' : ''} />
        {retrying ? 'Memuat…' : 'Coba Lagi'}
      </button>
    )}
  </div>
);

// ── Page header (for views that opt into the cleaner hierarchy) ──────────────

export const AdminPageHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div className="min-w-0">
      <h2 className="text-2xl font-black uppercase tracking-tight text-ds-ink leading-tight">{title}</h2>
      {subtitle && (
        <p className="text-2xs font-bold uppercase tracking-widest text-ds-ink3 mt-1">{subtitle}</p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap">{actions}</div>}
  </div>
);

// ── Section card shell ───────────────────────────────────────────────────────

export const AdminSectionCard: React.FC<{
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, actions, children, className = '' }) => (
  <div className={`rounded-2xl border bg-ds-card border-ds-border shadow-ds-sm ${className}`}>
    {(title || actions) && (
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
        {title && (
          <p className="text-2xs font-black uppercase tracking-[0.18em] text-ds-ink3">{title}</p>
        )}
        {actions}
      </div>
    )}
    <div className={title ? 'px-5 pb-5' : 'p-5'}>{children}</div>
  </div>
);
