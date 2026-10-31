// Admin Portal 2.0 — shared FilterBar.
//
// Extracted from the search+chip toolbar that PolicyOrdersAdmin.tsx (and
// several other admin views) each hand-rolled with their own markup. This
// is presentation only: it owns no state and fetches nothing — the caller
// still owns `search`/`active` and the filtering logic, exactly as before.
// A later PR wires this into more admin views; PolicyOrdersAdmin is the
// first production consumer (see git history for that migration).
import React from 'react';
import { RefreshCw, Search } from 'lucide-react';

export interface FilterChip {
  id: string;
  label: string;
  /** Shown in parentheses after the label, e.g. a queue count. Omit to hide. */
  count?: number;
}

export interface FilterBarProps {
  chips: FilterChip[];
  active: string;
  onActiveChange: (id: string) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Extra controls rendered after the chips (date range, export, …). */
  extra?: React.ReactNode;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  chips, active, onActiveChange, search, onSearchChange, searchPlaceholder,
  onRefresh, refreshing, extra,
}) => (
  <div className="flex gap-3 flex-wrap items-center">
    {onSearchChange && (
      <div className="relative flex-1 min-w-48">
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-ds-ink3" />
        <input
          value={search ?? ''}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder ?? 'Cari…'}
          className="w-full pl-10 pr-4 py-2.5 bg-ds-card2 border border-ds-border rounded-2xl text-sm text-ds-ink focus:outline-none focus:border-ds-admin-forest"
        />
      </div>
    )}
    <div className="flex gap-2 flex-wrap">
      {chips.map(chip => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onActiveChange(chip.id)}
          aria-pressed={active === chip.id}
          className={`px-3 py-2 rounded-full text-2xs font-black uppercase tracking-widest transition-all ${
            active === chip.id ? 'bg-ds-admin-forest text-white' : 'bg-ds-card2 text-ds-ink3 hover:bg-ds-border/40'
          }`}
        >
          {chip.label}
          {chip.count !== undefined && ` (${chip.count})`}
        </button>
      ))}
    </div>
    {extra}
    {onRefresh && (
      <button
        type="button"
        onClick={onRefresh}
        aria-label="Muat ulang"
        className="w-9 h-9 flex-shrink-0 rounded-full bg-ds-card2 flex items-center justify-center text-ds-ink3 hover:text-ds-ink"
      >
        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
      </button>
    )}
  </div>
);

export default FilterBar;
