// ─── EmptyState Primitive ────────────────────────────────────────────────────
//
// Standardizes the empty-state pattern across the app: icon + title +
// description + optional CTA. Replaces the 8+ ad-hoc empty-state renderings
// in CustomerPortal, AgentHome, AdminViews.
//
// Usage:
//   <EmptyState
//     icon={FileText}
//     title="Belum ada polis"
//     description="Beli asuransi pertama Anda untuk melihat polis di sini."
//     action={{ label: 'Beli Asuransi', onClick: navigateToBuy }}
//   />

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}>
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-ds-card2 border border-ds-border flex items-center justify-center mb-4">
          <Icon size={28} className="text-ds-ink3" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-base font-bold text-ds-ink mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-ds-ink2 max-w-xs leading-relaxed mb-6">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} size="md">
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
