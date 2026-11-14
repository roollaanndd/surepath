// Admin dashboard primitives — targeted evolution on top of the existing
// AdminDashboard (comment at the top of AdminDashboard.tsx explains the
// intent: "pusat komando bisnis, bukan papan KPI"). This file does not
// replace that; it adds the micro-interactions, feedback surfaces, and
// keyboard power features the operators asked for.
//
// Emerald SurePath palette (same CSS vars the admin shell already uses:
// --ds-admin-forest, --ds-admin-lime, etc). We fall back to hex values so
// these primitives also read in isolated tests / storybook / previews.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Search, ChevronRight, X, Clock, AlertTriangle } from 'lucide-react';

/* ──────────────────────────────────────────────────────────────────────────
   One-time global styles for the admin polish pass. Mounted once by the
   dashboard; keyframes, skeletons, and the row-hover accent live here so
   every piece of the admin surface opts into the same motion vocabulary.
────────────────────────────────────────────────────────────────────────── */
export const AdminStyles: React.FC = () => (
  <style>{`
    @keyframes adm-fade-up { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
    @keyframes adm-shimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
    @keyframes adm-pulse-ring { 0% { transform: scale(1); opacity: .55 } 70% { opacity: 0 } 100% { transform: scale(2.4); opacity: 0 } }
    @keyframes adm-slide-right { from { opacity: 0; transform: translateX(14px) } to { opacity: 1; transform: translateX(0) } }
    @keyframes adm-toast-in { from { opacity: 0; transform: translateY(-14px) scale(.97) } to { opacity: 1; transform: translateY(0) scale(1) } }

    .adm-fade-up { animation: adm-fade-up .35s cubic-bezier(.2,.8,.2,1) both }

    .adm-skel {
      background: linear-gradient(90deg,
        color-mix(in srgb, var(--ds-border, #dce6df) 55%, transparent) 0%,
        color-mix(in srgb, var(--ds-border, #dce6df) 85%, transparent) 40%,
        color-mix(in srgb, var(--ds-border, #dce6df) 55%, transparent) 80%);
      background-size: 800px 100%;
      animation: adm-shimmer 1.6s linear infinite;
      border-radius: 10px;
    }

    /* Row hover accent — a left stripe that slides in on any <tr> inside
       a .adm-table tbody. Same vocabulary as the B2B dashboard, retuned
       to emerald. */
    .adm-table tbody tr { position: relative; transition: background-color .18s ease }
    .adm-table tbody tr::before {
      content: ''; position: absolute; left: 0; top: 10%; bottom: 10%;
      width: 3px; border-radius: 0 3px 3px 0;
      background: linear-gradient(180deg, #076653, #E3EF26);
      transform: translateX(-4px); opacity: 0;
      transition: transform .22s cubic-bezier(.2,.8,.2,1), opacity .18s ease;
    }
    .adm-table tbody tr:hover::before,
    .adm-table tbody tr[data-active="true"]::before { transform: translateX(0); opacity: 1 }

    @media (prefers-reduced-motion: reduce) {
      .adm-fade-up, .adm-skel { animation: none !important }
      .adm-table tbody tr::before { transition: none !important }
    }
  `}</style>
);

/* ──────────────────────────────────────────────────────────────────────────
   CountUp — smooth 0→value tween for the hero premium headline and anywhere
   else a large number lands. Reduced-motion users get the final value
   immediately. `format` takes the interpolated integer and returns the
   display string (e.g. IDR formatting).
────────────────────────────────────────────────────────────────────────── */
export const AdminCountUp: React.FC<{
  value: number;
  duration?: number;
  format?: (n: number) => string;
}> = ({ value, duration = 800, format }) => {
  const [n, setN] = useState(0);
  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const fromRef = useRef(0);

  useEffect(() => {
    if (prefersReduced) { setN(value); fromRef.current = value; return; }
    const start = performance.now();
    const from = fromRef.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 4); // ease-out-quart
      const current = Math.round(from + (value - from) * eased);
      setN(current);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, prefersReduced]);

  return <>{format ? format(n) : n.toLocaleString('id-ID')}</>;
};

/* ──────────────────────────────────────────────────────────────────────────
   Skeletons — shimmer rectangles that mirror the shape they replace, not
   generic grey bars. Admin dashboard composes AdminSkeletonHero /
   AdminSkeletonKpiRow / AdminSkeletonTable from these primitives.
────────────────────────────────────────────────────────────────────────── */
export const AdminSkeleton: React.FC<{
  width?: number | string;
  height?: number | string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}> = ({ width = '100%', height = 14, rounded = 'md', className = '' }) => {
  const rc = { sm: 4, md: 10, lg: 16, full: 999 }[rounded];
  return (
    <span
      role="status"
      aria-busy="true"
      aria-label="Memuat"
      className={`adm-skel block ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: rc,
      }}
    />
  );
};

export const AdminSkeletonHero: React.FC = () => (
  <section
    className="relative overflow-hidden rounded-[1.75rem] p-6 sm:p-7"
    style={{ background: 'var(--ds-admin-hero, linear-gradient(120deg, #0f3d31, #143f31))' }}
  >
    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 flex-1 space-y-3">
        <AdminSkeleton width={160} height={10} />
        <AdminSkeleton width={120} height={10} />
        <AdminSkeleton width={320} height={44} />
        <AdminSkeleton width={240} height={12} />
      </div>
      <div className="w-full lg:w-[280px] space-y-2">
        <AdminSkeleton width="100%" height={10} />
        <AdminSkeleton width="100%" height={64} rounded="lg" />
      </div>
    </div>
  </section>
);

export const AdminSkeletonKpiRow: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-[1.5rem] border border-ds-border bg-ds-card p-4 space-y-2">
        <AdminSkeleton width={44} height={44} rounded="lg" />
        <AdminSkeleton width={90} height={10} />
        <AdminSkeleton width={70} height={22} />
        <AdminSkeleton width={110} height={9} />
      </div>
    ))}
  </div>
);

export const AdminSkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 py-2.5">
        {Array.from({ length: cols }).map((__, j) => (
          <AdminSkeleton
            key={j}
            height={13}
            width={j === 0 ? '30%' : j === cols - 1 ? '10%' : '16%'}
          />
        ))}
      </div>
    ))}
  </div>
);

/* v2.9.6 — Full page skeleton dengan bentuk konten yang akan muncul.
 *
 * Varian:
 *  • dashboard: hero + KPI strip + two columns
 *  • list     : judul + filter + tabel
 *  • form     : judul + 4 field + action bar
 *  • chart    : judul + KPI + chart area + legend
 *
 * Pakai .sp-stagger / inline animation delay supaya setiap bagian masuk
 * bergantian. Tidak ada spinner — bentuk konten yang menyerupai final
 * membuat loading terasa lebih cepat (reduce perceived latency).
 */
export const AdminPageSkeleton: React.FC<{ variant?: 'dashboard' | 'list' | 'form' | 'chart' }> = ({ variant = 'dashboard' }) => {
  if (variant === 'form') {
    return (
      <div className="max-w-3xl mx-auto space-y-4 py-3" role="status" aria-busy="true" aria-label="Memuat…">
        <AdminSkeleton width="45%" height={22} />
        <AdminSkeleton width="70%" height={11} />
        <div className="rounded-2xl border border-ds-border bg-ds-card p-5 space-y-3 mt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ animationDelay: `${i * 60}ms` }}>
              <AdminSkeleton width={80} height={9} />
              <AdminSkeleton height={40} rounded="lg" className="mt-1.5" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3">
          <AdminSkeleton width={120} height={38} rounded="lg" />
          <AdminSkeleton width={120} height={38} rounded="lg" />
        </div>
      </div>
    );
  }
  if (variant === 'list') {
    return (
      <div className="max-w-7xl mx-auto space-y-4" role="status" aria-busy="true" aria-label="Memuat…">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <AdminSkeleton width={200} height={22} />
            <AdminSkeleton width={320} height={11} />
          </div>
          <AdminSkeleton width={140} height={38} rounded="lg" />
        </div>
        <div className="rounded-2xl border border-ds-border bg-ds-card p-4">
          <div className="flex items-center gap-2 mb-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <AdminSkeleton key={i} width={78} height={28} rounded="full" />
            ))}
            <AdminSkeleton width={240} height={30} rounded="lg" className="ml-auto" />
          </div>
          <AdminSkeletonTable rows={7} cols={5} />
        </div>
      </div>
    );
  }
  if (variant === 'chart') {
    return (
      <div className="max-w-7xl mx-auto space-y-5" role="status" aria-busy="true" aria-label="Memuat…">
        <div className="space-y-2">
          <AdminSkeleton width={200} height={22} />
          <AdminSkeleton width={340} height={11} />
        </div>
        <AdminSkeletonKpiRow count={4} />
        <div className="rounded-2xl border border-ds-border bg-ds-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <AdminSkeleton width={160} height={14} />
            <div className="flex gap-2">
              <AdminSkeleton width={60} height={26} rounded="full" />
              <AdminSkeleton width={60} height={26} rounded="full" />
            </div>
          </div>
          <AdminSkeleton height={260} rounded="lg" />
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <AdminSkeleton width={12} height={12} rounded="full" />
                <AdminSkeleton width={70} height={10} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  /* dashboard */
  return (
    <div className="max-w-7xl mx-auto space-y-5" role="status" aria-busy="true" aria-label="Memuat…">
      <AdminSkeletonHero />
      <AdminSkeletonKpiRow count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-ds-border bg-ds-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <AdminSkeleton width={160} height={14} />
              <AdminSkeleton width={60} height={10} />
            </div>
            <AdminSkeletonTable rows={4} cols={3} />
          </div>
        ))}
      </div>
    </div>
  );
};

/** Peta id tab admin → varian skeleton yang paling cocok. Tab yang tidak
 *  terdaftar jatuh ke 'dashboard'. */
export const ADMIN_VIEW_SKELETON_VARIANT: Record<string, 'dashboard' | 'list' | 'form' | 'chart'> = {
  dashboard: 'dashboard',
  ops_console: 'dashboard',
  analytics: 'chart',
  financial: 'chart',
  policy_orders: 'list',
  approvals: 'list',
  claims_admin: 'list',
  endorsements: 'list',
  documents: 'list',
  payments: 'list',
  withdrawals: 'list',
  agents: 'list',
  agent_agreements: 'list',
  commission_ledger: 'list',
  manual_credit: 'list',
  credit_approvals: 'list',
  b2b: 'list',
  user_mgmt: 'list',
  contact_leads: 'list',
  vehicle_pricelist: 'list',
  activity_log: 'list',
  security: 'list',
  pathy_logs: 'list',
  product_config: 'form',
  tier_promo: 'form',
  insurers: 'form',
  ojk_rates: 'form',
  b2b_fleet_rates: 'form',
  b2b_plans: 'form',
  website_editor: 'form',
  portal_icons: 'form',
  tnc_admin: 'form',
  settings: 'form',
  ai_admin: 'dashboard',
  ai_finance: 'dashboard',
  pathy_ai: 'dashboard',
};

/* ──────────────────────────────────────────────────────────────────────────
   Pill — base and age-smart. Age pill colours itself from how many hours
   an item has been waiting: fresh (<2h) is neutral, 2-6h amber, >6h red.
   Admin uses it for the Tugas Saya queue and the Pesanan Terbaru overdue
   badge.
────────────────────────────────────────────────────────────────────────── */
export type AdminPillTone = 'neutral' | 'info' | 'warn' | 'success' | 'danger' | 'accent';
const PILL_STYLE: Record<AdminPillTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200',
  info:    'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  warn:    'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  danger:  'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  accent:  'bg-lime-50 text-emerald-800 dark:bg-lime-500/15 dark:text-lime-300',
};
export const AdminPill: React.FC<{
  tone?: AdminPillTone;
  children: React.ReactNode;
  className?: string;
}> = ({ tone = 'neutral', children, className = '' }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-wider ${PILL_STYLE[tone]} ${className}`}>
    {children}
  </span>
);

/** Smart tone from an "hours waited" value. Used for the task queue and
 *  the overdue badge on recent orders. */
export const AdminAgePill: React.FC<{ hours: number; className?: string }> = ({ hours, className }) => {
  const tone: AdminPillTone = hours > 24 ? 'danger' : hours > 6 ? 'warn' : hours > 2 ? 'accent' : 'neutral';
  const h = Math.max(0, Math.floor(hours));
  return (
    <AdminPill tone={tone} className={className}>
      <Clock size={9} strokeWidth={2.5} /> {h >= 24 ? `${Math.floor(h / 24)}h` : `${h}j`}
    </AdminPill>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   LiveDot — pulsing status indicator. Emerald when fresh (≤ staleAfter
   seconds), amber otherwise. Mounted next to the hero's "diperbarui" text
   so the operator can tell at a glance whether the data is still live.
────────────────────────────────────────────────────────────────────────── */
export const AdminLiveDot: React.FC<{
  updatedAt: Date | null;
  staleAfter?: number; // seconds
  className?: string;
}> = ({ updatedAt, staleAfter = 30, className = '' }) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(t);
  }, []);
  const ageSec = updatedAt ? Math.floor((now - updatedAt.getTime()) / 1000) : null;
  const stale = ageSec === null || ageSec > staleAfter;
  const color = stale ? '#d97706' : '#34d399'; // amber-600 / emerald-400
  const label = ageSec === null ? 'belum sinkron' : ageSec < 5 ? 'baru saja' : `sinkron ${ageSec < 60 ? `${ageSec}d` : `${Math.floor(ageSec / 60)}m`} lalu`;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title={label}>
      <span className="relative inline-block h-2 w-2">
        <span className="absolute inset-0 rounded-full" style={{ background: color }} />
        {!stale && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{
              background: color,
              animation: 'adm-pulse-ring 1.8s cubic-bezier(.2,.8,.2,1) infinite',
            }}
          />
        )}
      </span>
      <span className="text-2xs font-bold uppercase tracking-widest text-white/70">{label}</span>
    </span>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   Pill-group range toggle — replaces the native <select> in the hero so
   the range chooser reads as part of the brand. Keyboard-accessible.
────────────────────────────────────────────────────────────────────────── */
export function AdminRangeToggle<T extends string | number>({
  options, value, onChange, ariaLabel,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-full p-0.5"
      style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}
    >
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-colors ${
              active ? 'bg-white text-ds-admin-forest shadow-sm' : 'text-white/80 hover:text-white'
            }`}
            style={active ? { color: '#0f3d31' } : {}}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Toast system — top-right stack, max 3, auto-dismiss 3.5s, slide-in.
   Same contract as the B2B portal's useB2BToast, retuned emerald.
────────────────────────────────────────────────────────────────────────── */
type ToastVariant = 'success' | 'error' | 'info';
interface Toast { id: number; variant: ToastVariant; msg: string }

const AdminToastContext = React.createContext<{
  push: (variant: ToastVariant, msg: string) => void;
}>({ push: () => {} });

export const useAdminToast = () => {
  const { push } = React.useContext(AdminToastContext);
  return {
    success: (msg: string) => push('success', msg),
    error:   (msg: string) => push('error', msg),
    info:    (msg: string) => push('info', msg),
  };
};

export const AdminToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (variant: ToastVariant, msg: string) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-2), { id, variant, msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const tone: Record<ToastVariant, { bg: string; icon: string }> = {
    success: { bg: 'rgba(7,102,83,0.98)',  icon: '✓' },
    error:   { bg: 'rgba(225,29,72,0.98)', icon: '!' },
    info:    { bg: 'rgba(15,61,49,0.98)',  icon: 'i' },
  };

  return (
    <AdminToastContext.Provider value={{ push }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-4 right-4 z-[90] flex flex-col gap-2 pointer-events-none"
        style={{ maxWidth: 'calc(100vw - 2rem)' }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl text-white shadow-xl"
            style={{
              background: tone[t.variant].bg,
              boxShadow: `0 16px 40px -20px ${tone[t.variant].bg}`,
              animation: 'adm-toast-in .3s cubic-bezier(.2,.8,.2,1) both',
              minWidth: 260, maxWidth: 420,
            }}
          >
            <span
              className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-black flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.22)' }}
            >
              {tone[t.variant].icon}
            </span>
            <span className="text-xs font-bold leading-snug">{t.msg}</span>
          </div>
        ))}
      </div>
    </AdminToastContext.Provider>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   Command palette (⌘K / Ctrl+K). Takes the flattened admin leaf list +
   onNavigate. Fuzzy-ish contains match, arrow nav, enter opens.
────────────────────────────────────────────────────────────────────────── */
export interface AdminPaletteEntry {
  id: string;
  label: string;
  group: string;
  icon?: LucideIcon;
}

export const AdminCommandPalette: React.FC<{
  entries: AdminPaletteEntry[];
  onSelect: (id: string) => void;
}> = ({ entries, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typingInField = (e.target as HTMLElement | null)?.tagName?.match(/^(INPUT|TEXTAREA|SELECT)$/i);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setOpen(o => !o); return;
      }
      if (!open) {
        // Lone "/" without meta also opens, matches the hero copy's hint.
        if (!typingInField && e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault(); setOpen(true);
        }
        return;
      }
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) { setQ(''); setCursor(0); setTimeout(() => inputRef.current?.focus(), 40); }
  }, [open]);

  const results = useMemo(() => {
    if (!q) return entries;
    const needle = q.toLowerCase();
    return entries.filter(e =>
      e.label.toLowerCase().includes(needle) ||
      e.group.toLowerCase().includes(needle));
  }, [q, entries]);

  const pick = (id: string) => { onSelect(id); setOpen(false); };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center pt-24"
      onClick={() => setOpen(false)}
    >
      <div aria-hidden className="absolute inset-0" style={{ background: 'rgba(15,23,42,0.42)', backdropFilter: 'blur(3px)' }} />
      <div
        role="dialog"
        aria-label="Cari halaman"
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-xl mx-4 bg-ds-card shadow-2xl"
        style={{
          borderRadius: 18,
          border: '1px solid var(--ds-border, #dce6df)',
          animation: 'adm-fade-up .22s cubic-bezier(.2,.8,.2,1) both',
        }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-ds-border">
          <Search size={14} className="text-ds-ink3" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => { setQ(e.target.value); setCursor(0); }}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
              if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
              if (e.key === 'Enter' && results[cursor]) { e.preventDefault(); pick(results[cursor].id); }
            }}
            placeholder="Cari menu, halaman, atau fitur…"
            className="flex-1 bg-transparent outline-none text-sm text-ds-ink placeholder-ds-ink3"
          />
          <kbd className="text-2xs font-bold px-1.5 py-0.5 rounded bg-ds-card2 text-ds-ink3 border border-ds-border">ESC</kbd>
        </div>
        <div className="max-h-[22rem] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="text-center text-xs text-ds-ink3 py-8">Tidak ada hasil.</div>
          ) : (
            results.map((r, i) => {
              const RI = r.icon;
              const active = i === cursor;
              return (
                <button
                  key={r.id + i}
                  type="button"
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => pick(r.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    active
                      ? 'bg-ds-admin-lime-tint text-ds-admin-forest'
                      : 'text-ds-ink hover:bg-ds-card2'
                  }`}
                >
                  {RI
                    ? <RI size={14} className={active ? 'text-ds-admin-forest' : 'text-ds-ink3'} />
                    : <span className="w-3.5 h-3.5 rounded bg-ds-card2" />}
                  <span className="text-xs font-bold flex-1 truncate">{r.label}</span>
                  <span className="text-2xs font-bold text-ds-ink3 uppercase tracking-widest">{r.group}</span>
                  {active && <ChevronRight size={12} />}
                </button>
              );
            })
          )}
        </div>
        <div className="flex items-center gap-2 px-4 py-2 border-t border-ds-border text-2xs text-ds-ink3">
          <kbd className="font-bold px-1.5 py-0.5 rounded bg-ds-card2 border border-ds-border">↑↓</kbd>
          <span>navigasi</span>
          <kbd className="font-bold px-1.5 py-0.5 rounded bg-ds-card2 border border-ds-border">↵</kbd>
          <span>pilih</span>
          <span className="ml-auto">
            <kbd className="font-bold px-1.5 py-0.5 rounded bg-ds-card2 border border-ds-border">⌘ K</kbd>
            <span className="ml-1">atau</span>
            <kbd className="ml-1 font-bold px-1.5 py-0.5 rounded bg-ds-card2 border border-ds-border">/</kbd>
          </span>
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   FocusBar — a dismissible, sticky single-row bar that appears above the
   hero when there is something urgent (e.g. approvals > 24h). Hides when
   nothing is urgent or the operator dismissed it for this session.
────────────────────────────────────────────────────────────────────────── */
export const AdminFocusBar: React.FC<{
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  storageKey?: string;
}> = ({ message, actionLabel, onAction, storageKey = 'sp_admin_focus_dismissed' }) => {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const flag = sessionStorage.getItem(storageKey);
      if (flag === '1') setDismissed(true);
    } catch { /* ignore */ }
  }, [storageKey]);

  if (dismissed) return null;
  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(storageKey, '1'); } catch { /* ignore */ }
  };

  return (
    <div
      role="alert"
      className="adm-fade-up flex items-center gap-3 rounded-2xl px-4 py-2.5 mb-5"
      style={{
        background: 'linear-gradient(120deg, rgba(180,83,9,0.09), rgba(217,119,6,0.06))',
        border: '1px solid rgba(217,119,6,0.3)',
      }}
    >
      <AlertTriangle size={16} className="text-amber-700 flex-shrink-0" strokeWidth={2.25} />
      <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex-1">{message}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-[11px] font-black uppercase tracking-widest text-amber-800 hover:text-amber-900 underline underline-offset-2"
        >
          {actionLabel}
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Tutup"
        className="p-1 rounded text-amber-700/70 hover:text-amber-900 hover:bg-amber-500/10 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   SidePanel — right-slide drawer for row details (e.g. a calendar day's
   expiring policies). Esc + backdrop close, scoped z-index between the
   portal shell (z-50) and the toast stack (z-90).
────────────────────────────────────────────────────────────────────────── */
export const AdminSidePanel: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, footer, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]">
      <div
        onClick={onClose}
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'rgba(15,23,42,0.28)', backdropFilter: 'blur(2px)' }}
      />
      <aside
        role="dialog"
        aria-label={title}
        className="absolute right-0 top-0 bottom-0 w-full sm:w-[480px] flex flex-col bg-ds-card"
        style={{
          borderLeft: '1px solid var(--ds-border, #dce6df)',
          animation: 'adm-slide-right .26s cubic-bezier(.2,.8,.2,1) both',
          boxShadow: '-20px 0 60px -30px rgba(15,23,42,0.4)',
        }}
      >
        <header className="flex items-start justify-between gap-3 p-5 border-b border-ds-border">
          <div className="min-w-0">
            <h2 className="font-black text-base text-ds-ink" style={{ letterSpacing: '-0.015em' }}>{title}</h2>
            {subtitle && <p className="text-xs text-ds-ink3 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="p-1.5 rounded-lg hover:bg-ds-card2 text-ds-ink3 hover:text-ds-ink transition-colors"
          >
            <X size={16} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="border-t border-ds-border p-5 bg-ds-card2/40">{footer}</footer>}
      </aside>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   Inline sparkline — tiny trend line for the secondary KPI cards. Takes
   up to ~40 values, scales to the width given, no axis. Pure SVG, no
   recharts to avoid pulling it into the KPI chunk.
────────────────────────────────────────────────────────────────────────── */
export const AdminSparkline: React.FC<{
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  className?: string;
}> = ({ data, width = 72, height = 22, stroke = '#076653', className = '' }) => {
  if (data.length < 2) return <svg width={width} height={height} className={className} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = Math.max(1, max - min);
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = (i * stepX).toFixed(1);
    const y = (height - 2 - ((v - min) / span) * (height - 4)).toFixed(1);
    return `${x},${y}`;
  }).join(' ');
  const area = `0,${height} ${points} ${width},${height}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      <polygon points={area} fill={stroke} opacity={0.12} />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   Time-of-day helpers — power the hero's shift-aware copy and the order
   in which the dashboard renders its columns. One source of truth so the
   greeting text and the layout agree about whether it is morning.
────────────────────────────────────────────────────────────────────────── */
export type ShiftPhase = 'morning' | 'midday' | 'evening';
export function currentShift(now = new Date()): ShiftPhase {
  const h = now.getHours();
  if (h < 11) return 'morning';
  if (h < 17) return 'midday';
  return 'evening';
}
export function shiftGreeting(phase: ShiftPhase): string {
  return phase === 'morning' ? 'Selamat pagi'
    : phase === 'midday' ? 'Selamat siang'
    : 'Selamat sore';
}
