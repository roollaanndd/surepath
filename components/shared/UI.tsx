// ─── Legacy shared primitives ────────────────────────────────────────────────
//
// This file used to export a second `Button` alongside the design-system
// primitive in `components/ui/Button.tsx`: two different components under one
// name, with different heights, radii and variant vocabularies, so "use the
// Button primitive" meant nothing until you knew which import was in scope.
// It had zero call sites, as did `GlassCard`, so both are gone.
//
// `Section` stays — the landing page uses it (Features, ProductModules) — and
// `Badge` stays for ClaimManager and ContactPage, now drawing from design
// tokens rather than raw palette classes, like everything else.
//
// Nothing new belongs here — add it to `components/ui/` instead.

import React from 'react';

export const Section: React.FC<{ children?: React.ReactNode, id?: string, className?: string }> = ({ children, id, className = "" }) => (
  <section id={id} className={`py-32 px-6 md:px-12 lg:px-20 ${className}`}>
    <div className="max-w-7xl mx-auto">
      {children}
    </div>
  </section>
);

export const Badge: React.FC<{
  children?: React.ReactNode,
  className?: string,
  variant?: 'success' | 'info' | 'warning' | 'brand'
}> = ({ children, className = "", variant = 'brand' }) => {
  const styles = {
    brand:   "bg-ds-green-tint text-ds-green border-ds-green/20",
    success: "bg-ds-green-tint text-ds-green border-ds-green/20",
    info:    "bg-ds-blue-lt text-ds-blue border-ds-blue/20",
    warning: "bg-ds-amber-lt text-ds-amber border-ds-amber/20",
  };
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest ${styles[variant]} ${className}`}>
      {children}
    </div>
  );
};
