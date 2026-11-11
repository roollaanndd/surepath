// SlaTimer — the operator's queue urgency chip (roadmap #10).
//
// Color IS the information: emerald = comfortably inside the SLA, amber =
// second half of the budget, rose = breached. Shows elapsed/target hours so
// an operator triages by number, not by remembering when each row arrived.

import { slaState } from '../../services/adminMetrics';

const STYLES = {
  OK: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  WARN: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  BREACH: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
} as const;

interface Props {
  /** Elapsed hours (e.g. claim age). */
  hours: number;
  /** SLA budget in hours (claim review 24, order approval 48). */
  targetHours: number;
  className?: string;
}

export default function SlaTimer({ hours, targetHours, className = '' }: Props) {
  const state = slaState(hours, targetHours);
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full tabular-nums ${STYLES[state]} ${className}`}
      title={`SLA ${targetHours}j — ${state}`}
    >
      {hours >= 24 ? `${(hours / 24).toFixed(1)} hri` : `${Math.max(0, Math.round(hours))} j`} / {targetHours}j
    </span>
  );
}
