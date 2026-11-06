// B2B Dashboard primitives — shell, sidebar, topbar, cards, tables, pills.
// One file, so every B2B screen can import from the same vocabulary and the
// portal reads as one surface. Visual language carries over from B2BLogin:
// indigo-primary (#4338ca), glass panels, drifting radial blobs, Sora.
//
// This is the dashboard (desktop-first) counterpart to the mobile shell
// (PortalHeader + PortalTabBar) the other portals share. B2B users are
// corporate finance operators on laptops, not phone users.

import React, { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Search, Bell, Sun, Moon, LogOut, ChevronRight, X, Menu,
} from 'lucide-react';

/* ──────────────────────────────────────────────────────────────────────────
   Ambient background + global animations.
   Mounted once per portal by <B2BShell>. The dot grid + two drifting blobs
   echo B2BLogin so the signed-in surface feels like the same product as the
   signed-out one.
────────────────────────────────────────────────────────────────────────── */
export const B2BAmbient: React.FC = () => (
  <>
    <style>{`
      @keyframes b2b-drift-a { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(3%,-4%) scale(1.08) } }
      @keyframes b2b-drift-b { 0%,100% { transform: translate(0,0) scale(1) } 50% { transform: translate(-4%,3%) scale(1.1) } }
      @keyframes b2b-pop-in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      .b2b-fade-in { animation: b2b-pop-in .35s cubic-bezier(.2,.8,.2,1) both }
      .b2b-blob { will-change: transform }
      @media (prefers-reduced-motion: reduce) {
        .b2b-fade-in, .b2b-blob { animation: none !important }
      }
      /* Scrollbar neutralizer inside glass panels (dark-mode-safe) */
      .b2b-scroll::-webkit-scrollbar { width: 8px; height: 8px }
      .b2b-scroll::-webkit-scrollbar-thumb { background: rgba(67,56,202,.18); border-radius: 4px }
      .b2b-scroll::-webkit-scrollbar-track { background: transparent }
    `}</style>
    <div aria-hidden className="fixed inset-0 pointer-events-none z-0" style={{
      backgroundImage: 'radial-gradient(rgba(67,56,202,0.06) 1px, transparent 1px)',
      backgroundSize: '28px 28px',
    }} />
    <div aria-hidden className="b2b-blob fixed pointer-events-none z-0" style={{
      top: '-20%', left: '-10%', width: '55%', height: '55%',
      background: 'radial-gradient(ellipse, rgba(5,150,105,0.12) 0%, transparent 70%)',
      animation: 'b2b-drift-a 20s ease-in-out infinite',
    }} />
    <div aria-hidden className="b2b-blob fixed pointer-events-none z-0" style={{
      bottom: '-25%', right: '-15%', width: '60%', height: '60%',
      background: 'radial-gradient(ellipse, rgba(67,56,202,0.10) 0%, transparent 72%)',
      animation: 'b2b-drift-b 22s ease-in-out infinite',
    }} />
  </>
);

/* ──────────────────────────────────────────────────────────────────────────
   Glass surface — the base of every raised element. Two strengths: regular
   (body cards) and strong (sidebar, topbar, elevated panels).
────────────────────────────────────────────────────────────────────────── */
export const B2BGlass: React.FC<{
  strong?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ strong, className = '', style, children }) => (
  <div
    className={`rounded-2xl ${className}`}
    style={{
      background: strong ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(20px) saturate(140%)',
      WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      border: '1px solid rgba(67,56,202,0.12)',
      boxShadow: strong
        ? '0 20px 48px -28px rgba(15,23,42,0.22)'
        : '0 8px 28px -20px rgba(15,23,42,0.16)',
      ...style,
    }}
  >
    {children}
  </div>
);

/* ──────────────────────────────────────────────────────────────────────────
   Section header — one shape for every panel's heading. Not a decorative
   eyebrow; it's a label + optional action.
────────────────────────────────────────────────────────────────────────── */
export const B2BSectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between gap-3 mb-4">
    <div className="min-w-0">
      <h3 className="text-sm font-black text-slate-900" style={{ letterSpacing: '-0.015em' }}>{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

/* ──────────────────────────────────────────────────────────────────────────
   Status pill — one vocabulary across every list. Tones map to semantic
   roles: neutral (draft), info (submitted), warn (reviewing/awaiting
   payment), success (paid/issued/accepted), danger (rejected/cancelled).
   Content stays whatever text the caller gives (Indonesian labels).
────────────────────────────────────────────────────────────────────────── */
export type B2BPillTone = 'neutral' | 'info' | 'warn' | 'success' | 'danger' | 'accent';
const PILL_STYLE: Record<B2BPillTone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  info:    'bg-blue-50 text-blue-700',
  warn:    'bg-amber-50 text-amber-700',
  success: 'bg-emerald-50 text-emerald-700',
  danger:  'bg-rose-50 text-rose-700',
  accent:  'bg-indigo-50 text-indigo-700',
};
export const B2BPill: React.FC<{ tone?: B2BPillTone; children: React.ReactNode; className?: string }> = ({ tone = 'neutral', children, className = '' }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${PILL_STYLE[tone]} ${className}`}>
    {children}
  </span>
);

/* ──────────────────────────────────────────────────────────────────────────
   KPI card — flat white, mono tabular numerals, optional delta + tiny
   sparkline. Mercury/Linear style: big number, quiet label, no decoration.
────────────────────────────────────────────────────────────────────────── */
export const B2BKpi: React.FC<{
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'accent' | 'warn' | 'success';
  icon?: LucideIcon;
}> = ({ label, value, hint, tone = 'default', icon: Icon }) => {
  const toneCls = {
    default: 'text-slate-900',
    accent:  'text-indigo-600',
    warn:    'text-amber-600',
    success: 'text-emerald-600',
  }[tone];
  return (
    <B2BGlass className="p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(67,56,202,0.08)' }}>
            <Icon size={14} className="text-indigo-600" strokeWidth={2.25} />
          </div>
        )}
      </div>
      <div className={`text-3xl font-black ${toneCls}`} style={{ fontFamily: '"JetBrains Mono","SF Mono",ui-monospace,monospace', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em' }}>
        {value}
      </div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </B2BGlass>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   Data table — row-based, hairline-divided, hover highlight. The dashboard
   list vocabulary. Click a row to call onRowClick; hover an inline button
   with stopPropagation to keep the row click intact.
────────────────────────────────────────────────────────────────────────── */
export interface B2BColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
  hideBelow?: 'md' | 'lg';
}
export function B2BTable<T extends { id: string }>({
  columns, rows, onRowClick, empty, loading,
}: {
  columns: B2BColumn<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  loading?: boolean;
}) {
  if (loading) return <div className="py-16 text-center text-sm text-slate-400">Memuat…</div>;
  if (rows.length === 0) return <div className="py-16 text-center text-sm text-slate-400">{empty ?? 'Belum ada data.'}</div>;

  const alignCls = { left: 'text-left', right: 'text-right', center: 'text-center' };
  const hideCls = (h?: 'md' | 'lg') => h === 'md' ? 'hidden md:table-cell' : h === 'lg' ? 'hidden lg:table-cell' : '';

  return (
    <div className="b2b-scroll overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200/70">
            {columns.map(c => (
              <th
                key={c.key}
                className={`py-2.5 px-3 font-bold text-[10px] text-slate-500 uppercase tracking-widest ${alignCls[c.align ?? 'left']} ${hideCls(c.hideBelow)}`}
                style={{ width: c.width }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-slate-100/70 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-indigo-50/40 transition-colors' : ''}`}
            >
              {columns.map(c => (
                <td
                  key={c.key}
                  className={`py-3 px-3 ${alignCls[c.align ?? 'left']} ${hideCls(c.hideBelow)} text-slate-700`}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Side panel — right-slide drawer for row detail views. Sized for form &
   data read, not full-page. Esc + backdrop click close it.
────────────────────────────────────────────────────────────────────────── */
export const B2BSidePanel: React.FC<{
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
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} aria-hidden className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]" />
      <aside
        role="dialog"
        aria-label={title}
        className="absolute right-0 top-0 bottom-0 w-full sm:w-[480px] shadow-2xl flex flex-col"
        style={{
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          borderLeft: '1px solid rgba(67,56,202,0.14)',
          animation: 'b2b-pop-in .25s cubic-bezier(.2,.8,.2,1) both',
        }}
      >
        <header className="flex items-start justify-between gap-3 p-5 border-b border-slate-200/70">
          <div className="min-w-0">
            <h2 className="font-black text-base text-slate-900" style={{ letterSpacing: '-0.02em' }}>{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <X size={16} />
          </button>
        </header>
        <div className="b2b-scroll flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="border-t border-slate-200/70 p-5 bg-slate-50/50">{footer}</footer>}
      </aside>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   Sidebar nav item — grouping + leaf, with active-state highlight.
────────────────────────────────────────────────────────────────────────── */
export interface B2BNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  children?: { id: string; label: string }[];
}

const B2BNavButton: React.FC<{
  item: B2BNavItem;
  activeId: string;
  onSelect: (id: string) => void;
}> = ({ item, activeId, onSelect }) => {
  const Icon = item.icon;
  const parentActive = item.id === activeId || item.children?.some(c => c.id === activeId);
  const [open, setOpen] = useState(parentActive);

  useEffect(() => { if (parentActive) setOpen(true); }, [parentActive]);

  const handleClick = () => {
    if (item.children?.length) {
      setOpen(o => !o);
      // Also select the first child to show something immediately
      if (!open && item.children[0]) onSelect(item.children[0].id);
    } else {
      onSelect(item.id);
    }
  };

  const base = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150';
  const activeStyle = parentActive
    ? { background: 'linear-gradient(115deg, rgba(67,56,202,0.10), rgba(79,70,229,0.06))', color: '#3730a3' }
    : {};

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className={`${base} ${parentActive ? 'font-bold' : 'text-slate-600 hover:bg-indigo-50/60 hover:text-slate-900 font-medium'}`}
        style={activeStyle}
      >
        <Icon size={16} strokeWidth={parentActive ? 2.25 : 2} />
        <span className="text-xs tracking-wide flex-1">{item.label}</span>
        {typeof item.badge === 'number' && item.badge > 0 && (
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-indigo-600 text-white min-w-[18px] text-center">{item.badge}</span>
        )}
        {item.children?.length ? (
          <ChevronRight size={12} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
        ) : null}
      </button>
      {item.children?.length && open && (
        <div className="ml-7 mt-0.5 space-y-0.5 border-l border-indigo-100 pl-3">
          {item.children.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-colors ${
                c.id === activeId
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-indigo-50/40 font-medium'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
   The shell itself — sidebar + topbar + scroll container. All B2B screens
   mount inside <B2BShell> and get the same chrome for free.
────────────────────────────────────────────────────────────────────────── */
export interface B2BShellProps {
  nav: B2BNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  user: { name: string; code: string; initials: string };
  breadcrumb: string[];
  onLogout: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
  onBellClick?: () => void;
  bellCount?: number;
  rightSlot?: React.ReactNode;    // extra topbar buttons (Pathy trigger lives here)
  children: React.ReactNode;
}

export const B2BShell: React.FC<B2BShellProps> = ({
  nav, activeId, onSelect, user, breadcrumb, onLogout,
  darkMode, onToggleDark, onBellClick, bellCount, rightSlot, children,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Sidebar is a drawer below lg (≤1023px) and a sticky column at lg+. The
  // drawer's open state only matters below lg; above, it's always visible.
  const SidebarInner = () => (
    <div className="h-full flex flex-col">
      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-indigo-100/50">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(115deg, #4338ca 0%, #4f46e5 100%)',
            boxShadow: '0 8px 20px -8px rgba(67,56,202,0.5)',
          }}
        >
          <span className="text-white font-black text-xs tracking-wider">SP</span>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-black text-slate-900" style={{ letterSpacing: '-0.015em' }}>
            Sure<span style={{ color: '#059669' }}>Path</span>
          </div>
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Korporat</div>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="lg:hidden ml-auto p-1.5 text-slate-400 hover:text-slate-900"
          aria-label="Tutup menu"
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto b2b-scroll p-3 space-y-0.5">
        {nav.map(item => (
          <B2BNavButton
            key={item.id}
            item={item}
            activeId={activeId}
            onSelect={(id) => { onSelect(id); setDrawerOpen(false); }}
          />
        ))}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-indigo-100/50">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-indigo-50/60 cursor-pointer" onClick={() => onSelect('profile')}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-black text-xs"
            style={{ background: 'linear-gradient(135deg, #4338ca, #4f46e5)' }}
          >
            {user.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-900 truncate">{user.name}</div>
            <div className="text-[10px] text-slate-500 truncate">{user.code}</div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onLogout(); }}
            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
            aria-label="Keluar"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen flex relative z-10"
      style={{ fontFamily: "'Sora', system-ui, sans-serif" }}
    >
      {/* Sidebar — desktop */}
      <aside
        className="hidden lg:flex flex-col w-60 fixed inset-y-0 left-0 z-20"
        style={{
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          borderRight: '1px solid rgba(67,56,202,0.12)',
        }}
      >
        <SidebarInner />
      </aside>

      {/* Sidebar — mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div onClick={() => setDrawerOpen(false)} aria-hidden className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" />
          <aside
            className="absolute inset-y-0 left-0 w-72 flex flex-col"
            style={{
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(24px) saturate(140%)',
              WebkitBackdropFilter: 'blur(24px) saturate(140%)',
              animation: 'b2b-pop-in .25s cubic-bezier(.2,.8,.2,1) both',
            }}
          >
            <SidebarInner />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-60">
        {/* Topbar */}
        <header
          className="sticky top-0 z-30 flex items-center gap-3 px-4 lg:px-6 h-16"
          style={{
            background: 'rgba(245,247,250,0.72)',
            backdropFilter: 'blur(16px) saturate(140%)',
            WebkitBackdropFilter: 'blur(16px) saturate(140%)',
            borderBottom: '1px solid rgba(67,56,202,0.08)',
          }}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900"
            aria-label="Buka menu"
          >
            <Menu size={18} />
          </button>

          <nav aria-label="Lokasi" className="flex items-center gap-1.5 text-xs min-w-0">
            {breadcrumb.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />}
                <span className={i === breadcrumb.length - 1 ? 'font-bold text-slate-900' : 'text-slate-500'}>
                  {b}
                </span>
              </React.Fragment>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            {rightSlot}
            {onBellClick && (
              <button
                type="button"
                onClick={onBellClick}
                className="relative p-2 rounded-xl hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition-colors"
                aria-label="Notifikasi"
              >
                <Bell size={16} />
                {typeof bellCount === 'number' && bellCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onToggleDark}
              className="p-2 rounded-xl hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition-colors"
              aria-label="Ganti tema"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 b2b-fade-in" key={activeId}>
          {children}
        </main>
      </div>
    </div>
  );
};

/* Small utility: search input scoped to a table/panel header. Not mounted in
   the topbar because B2B search is contextual per-screen, not global. */
export const B2BSearchInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = 'Cari…', className = '' }) => (
  <div className={`relative ${className}`}>
    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs outline-none transition-colors"
      style={{
        background: 'rgba(255,255,255,0.72)',
        border: '1px solid rgba(67,56,202,0.14)',
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(67,56,202,0.45)'; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(67,56,202,0.14)'; }}
    />
  </div>
);

/* Primary action button — indigo gradient, matches B2BLogin's submit. */
export const B2BButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'success';
  icon?: LucideIcon;
}> = ({ variant = 'primary', icon: Icon, children, className = '', ...rest }) => {
  const base = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed';
  const variantCls = {
    primary: 'text-white',
    ghost:   'text-indigo-700 bg-white/60 hover:bg-white border border-indigo-200/60',
    danger:  'text-white',
    success: 'text-white',
  }[variant];
  const style: React.CSSProperties = variant === 'primary'
    ? { background: 'linear-gradient(115deg, #4338ca 0%, #4f46e5 100%)', boxShadow: '0 8px 20px -8px rgba(67,56,202,0.5)' }
    : variant === 'danger'
      ? { background: 'linear-gradient(115deg, #e11d48 0%, #f43f5e 100%)' }
      : variant === 'success'
        ? { background: 'linear-gradient(115deg, #059669 0%, #10b981 100%)' }
        : {};
  return (
    <button {...rest} className={`${base} ${variantCls} ${className}`} style={style}>
      {Icon && <Icon size={13} strokeWidth={2.5} />}
      {children}
    </button>
  );
};
