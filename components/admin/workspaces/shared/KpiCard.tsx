import React from 'react';
import { ArrowRight } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent?: string;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, sublabel, icon: Icon, accent = '#00C16A', onClick }) => (
  <button
    onClick={onClick}
    className="group relative w-full overflow-hidden rounded-3xl border border-ds-border bg-ds-card p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-ds-md"
  >
    <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${accent}, transparent)` }} />
    <div className="relative flex items-start justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-ds-ink3">{label}</p>
        <p className="mt-2 text-2xl font-black tracking-tight text-ds-ink tabular-nums sm:text-3xl">{value}</p>
        {sublabel && <p className="mt-1 text-xs font-bold text-ds-ink3">{sublabel}</p>}
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: `${accent}1A`, color: accent }}>
        <Icon size={18} />
      </div>
    </div>
    {onClick && (
      <div className="relative mt-4 flex items-center gap-1 text-xs font-bold opacity-0 transition-opacity group-hover:opacity-100" style={{ color: accent }}>
        Lihat detail
        <ArrowRight size={12} />
      </div>
    )}
  </button>
);

export default KpiCard;
