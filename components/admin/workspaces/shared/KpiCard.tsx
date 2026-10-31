import React from 'react';
import { AdminKpiCard, type KpiTone } from '../../adminUI';

// Single owner for admin KPI cards.
//
// The role dashboards used to render their own card here (hardcoded #00C16A,
// text-[10px] labels) while `adminUI.AdminKpiCard` — the primitive the redesign
// spec names — had no consumers at all. This file is now a thin adapter onto
// that primitive so there is exactly one KPI card in the admin CMS: the seven
// workspaces keep their `accent` API, the pixels come from adminUI.

const ACCENT_TONE: Record<string, KpiTone> = {
  '#00C16A': 'green',
  '#22C55E': 'green',
  '#F59E0B': 'amber',
  '#F97316': 'amber',
  '#3B82F6': 'blue',
  '#06B6D4': 'blue',
  '#EF4444': 'rose',
  '#A855F7': 'violet',
};

interface KpiCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  /** Icon Manager id for the illustrated SurePath icon. */
  iconId: string;
  /** Legacy hex accent kept for the seven workspace dashboards; mapped to a ds tone. */
  accent?: string;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, sublabel, iconId, accent = '#00C16A', onClick }) => (
  <AdminKpiCard
    label={label}
    value={value}
    sub={sublabel}
    iconId={iconId}
    tone={ACCENT_TONE[accent.toUpperCase()] ?? 'green'}
    onClick={onClick}
  />
);

export default KpiCard;
