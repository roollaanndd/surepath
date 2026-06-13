import React from 'react';
import { Check } from 'lucide-react';

/**
 * SurePath unified card system (DS v2).
 * Premium fintech card primitives shared across customer, agent, b2b and admin
 * mobile surfaces. Presentational only — pass pre-formatted strings/handlers in.
 *
 * Tokens: ds-card / ds-border / ds-ink* / ds-green (#00C16A) / sp-emerald (#003B2F).
 * Radii: 24px (rounded-3xl) for heroes, 16-20px for surfaces. Spacing 16/24/32.
 */

// ── Section label ──────────────────────────────────────────────────────────
export const SectionLabel: React.FC<{
  children: React.ReactNode;
  action?: { label: string; onClick: () => void };
  className?: string;
}> = ({ children, action, className = '' }) => (
  <div className={`flex items-center justify-between mb-3 ${className}`}>
    <p className="text-[10px] font-bold text-ds-ink3 uppercase tracking-widest">{children}</p>
    {action && (
      <button type="button" onClick={action.onClick} className="text-xs font-bold text-ds-green active:scale-95 transition-transform">
        {action.label}
      </button>
    )}
  </div>
);

// ── Base surface card ────────────────────────────────────────────────────────
export const SurfaceCard: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}> = ({ children, onClick, className = '' }) => (
  <div
    onClick={onClick}
    className={`bg-ds-card border border-ds-border rounded-2xl shadow-ds-sm ${
      onClick ? 'cursor-pointer active:scale-[0.98] hover:shadow-ds-md transition-all duration-200' : ''
    } ${className}`}
  >
    {children}
  </div>
);

// ── Dark emerald hero wrapper ─────────────────────────────────────────────────
export const HeroCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div
    className={`rounded-3xl p-5 text-white relative overflow-hidden ${className}`}
    style={{ background: 'linear-gradient(135deg, #003B2F 0%, #005240 60%, #003B2F 100%)', boxShadow: '0 8px 32px rgba(0,59,47,0.5)' }}
  >
    <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(0,193,106,0.18)' }} />
    <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(0,193,106,0.08)' }} />
    <div className="relative z-10">{children}</div>
  </div>
);

// ── Pathy mascot (inline SVG, no asset dependency) ────────────────────────────
export const PathyMascot: React.FC<{ size?: number; className?: string }> = ({ size = 44, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="pathy-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#E6FAF0" />
        <stop offset="100%" stopColor="#B7F0D4" />
      </linearGradient>
    </defs>
    {/* antenna */}
    <line x1="32" y1="6" x2="32" y2="14" stroke="#00C16A" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="32" cy="5" r="3" fill="#00C16A" />
    {/* head */}
    <rect x="12" y="14" width="40" height="34" rx="14" fill="url(#pathy-body)" stroke="#00C16A" strokeWidth="2" />
    {/* face screen */}
    <rect x="18" y="21" width="28" height="20" rx="9" fill="#003B2F" />
    {/* eyes */}
    <circle cx="26" cy="31" r="3.4" fill="#00E07A" />
    <circle cx="38" cy="31" r="3.4" fill="#00E07A" />
    {/* smile */}
    <path d="M26 36.5q6 4 12 0" stroke="#00E07A" strokeWidth="2" strokeLinecap="round" fill="none" />
    {/* ears */}
    <rect x="8" y="26" width="4" height="10" rx="2" fill="#00C16A" />
    <rect x="52" y="26" width="4" height="10" rx="2" fill="#00C16A" />
    {/* shoulders */}
    <path d="M18 48q14 8 28 0v6q-14 7-28 0z" fill="#00C16A" opacity="0.35" />
  </svg>
);

// ── Pathy AI card ──────────────────────────────────────────────────────────────
export const AICard: React.FC<{
  label?: string;
  message: React.ReactNode;
  cta?: { label: string; onClick: () => void };
  suggestion?: { label: string; onClick: () => void };
  className?: string;
}> = ({ label = 'SurePath AI · Pathy', message, cta, suggestion, className = '' }) => (
  <div
    className={`rounded-2xl p-4 relative overflow-hidden ${className}`}
    style={{ background: 'linear-gradient(135deg, #003B2F, #00512E)' }}
  >
    <div className="absolute -top-3 -right-3 w-20 h-20 rounded-full pointer-events-none" style={{ background: 'rgba(0,193,106,0.15)' }} />
    <div className="relative z-10 flex gap-3 items-start">
      <div className="flex-shrink-0 rounded-2xl p-1.5 animate-float" style={{ background: 'rgba(0,193,106,0.18)' }}>
        <PathyMascot size={40} />
      </div>
      <div className="space-y-1.5 flex-1 min-w-0">
        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#00C16A' }}>{label}</p>
        <p className="text-sm leading-relaxed font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>{message}</p>
        {suggestion && (
          <button
            onClick={suggestion.onClick}
            className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white active:scale-95 transition-transform"
            style={{ background: 'rgba(0,193,106,0.22)', border: '1px solid rgba(0,193,106,0.35)' }}
          >
            + {suggestion.label}
          </button>
        )}
        {cta && (
          <button onClick={cta.onClick} className="block text-[10px] font-black uppercase tracking-widest pt-1" style={{ color: '#00C16A' }}>
            {cta.label} →
          </button>
        )}
      </div>
    </div>
  </div>
);

// ── Stat / metric card ─────────────────────────────────────────────────────────
export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  iconBg?: string;
  iconColor?: string;
  progress?: number; // 0-100
  onClick?: () => void;
}> = ({ label, value, sub, icon: Icon, iconBg = 'bg-ds-green-tint', iconColor = 'text-ds-green', progress, onClick }) => (
  <SurfaceCard onClick={onClick} className="p-4">
    <div className="flex items-center gap-2 mb-2">
      {Icon && (
        <div className={`w-7 h-7 ${iconBg} rounded-xl flex items-center justify-center`}>
          <Icon size={14} className={iconColor} />
        </div>
      )}
      <span className="text-[10px] text-ds-ink3 font-bold uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-xl font-black text-ds-ink leading-tight">{value}</div>
    {sub && <div className="text-[10px] text-ds-ink3 mt-0.5">{sub}</div>}
    {typeof progress === 'number' && (
      <div className="mt-2 h-1 bg-ds-border rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, progress))}%`, background: '#00C16A' }} />
      </div>
    )}
  </SurfaceCard>
);

// ── Quick action grid ────────────────────────────────────────────────────────
export interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  color?: string;
  bg?: string;
  onClick: () => void;
}

export const ActionGrid: React.FC<{ actions: QuickAction[]; cols?: number }> = ({ actions, cols = 4 }) => (
  <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
    {actions.map((a) => (
      <button
        type="button"
        key={a.id}
        onClick={a.onClick}
        className="flex flex-col items-center gap-2 group active:scale-90 transition-transform focus:outline-none"
      >
        <div className={`w-14 h-14 ${a.bg ?? 'bg-ds-green-tint'} ${a.color ?? 'text-ds-green'} rounded-2xl flex items-center justify-center shadow-ds-sm group-hover:scale-105 transition-transform duration-200`}>
          <a.icon size={24} strokeWidth={2} />
        </div>
        <span className="text-[10px] font-bold text-ds-ink2 text-center leading-tight">{a.label}</span>
      </button>
    ))}
  </div>
);

// ── Coverage row (checkmark line for hero) ────────────────────────────────────
export const CoverageRow: React.FC<{ label: string; active?: boolean }> = ({ label, active = true }) => (
  <div className="flex items-center gap-2">
    <div
      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: active ? '#00C16A' : 'rgba(255,255,255,0.15)' }}
    >
      {active && <Check size={10} className="text-white" strokeWidth={3} />}
    </div>
    <span className="text-[12px] font-medium" style={{ color: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.4)' }}>
      {label}
    </span>
  </div>
);

// ── Featured promo card ────────────────────────────────────────────────────────
export const FeaturedCard: React.FC<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  cta: { label: string; onClick: () => void };
  illustration?: React.ReactNode;
  gradient?: string;
}> = ({ eyebrow, title, subtitle, cta, illustration, gradient = 'linear-gradient(135deg, #4D7CFE 0%, #003B2F 120%)' }) => (
  <div className="rounded-3xl p-5 relative overflow-hidden text-white" style={{ background: gradient, minHeight: 132 }}>
    <div className="absolute -bottom-6 -right-4 opacity-90 pointer-events-none">{illustration}</div>
    <div className="relative z-10 max-w-[62%]">
      {eyebrow && <p className="text-[9px] font-black uppercase tracking-widest text-white/70 mb-1">{eyebrow}</p>}
      <h4 className="text-lg font-black leading-tight mb-1">{title}</h4>
      {subtitle && <p className="text-[11px] text-white/70 leading-snug mb-3">{subtitle}</p>}
      <button
        onClick={cta.onClick}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black bg-white text-[#003B2F] active:scale-95 transition-transform shadow-lg"
      >
        {cta.label} →
      </button>
    </div>
  </div>
);

// ── Pipeline stat (agent) — compact column metric ─────────────────────────────
export const PipelineStat: React.FC<{ label: string; value: React.ReactNode; accent?: string }> = ({ label, value, accent = '#00C16A' }) => (
  <div className="flex-1 text-center">
    <p className="text-2xl font-black text-ds-ink leading-none" style={{ color: accent }}>{value}</p>
    <p className="text-[9px] font-bold text-ds-ink3 uppercase tracking-wider mt-1">{label}</p>
  </div>
);
