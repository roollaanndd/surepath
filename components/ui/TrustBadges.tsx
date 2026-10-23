// ─── TrustBadges ─────────────────────────────────────────────────────────────
//
// Reusable trust-signal components for placement at conversion moments:
//   - AuthGate header (signup/login)
//   - CustomerPortal header (logged-in customer)
//   - StepPayment header (payment step — the highest-stakes moment)
//
// Surfaces the OJK compliance + insurer licensing + encryption signals that
// Indonesian insurance buyers explicitly look for. Previously these were
// buried in the footer of the marketing site only — invisible at the moment
// of conversion.

import React from 'react';
import { ShieldCheck, Lock, FileCheck } from 'lucide-react';

export const OjkBadge: React.FC<{ className?: string; compact?: boolean }> = ({ className = '', compact = false }) => (
  <div
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ds-green-tint border border-ds-green/30 ${className}`}
    title="Bekerja sama dengan perusahaan asuransi berijin OJK"
  >
    <ShieldCheck size={12} className="text-ds-green" />
    <span className="text-2xs font-black uppercase tracking-wider text-ds-green-dk">
      {compact ? 'OJK' : 'Mitra Asuransi Berizin OJK'}
    </span>
  </div>
);

export const EncryptionBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ds-card2 border border-ds-border ${className}`}
    title="Pembayaran dienkripsi end-to-end. Data kamu tidak dibagikan ke pihak ketiga."
  >
    <Lock size={12} className="text-ds-ink2" />
    <span className="text-2xs font-black uppercase tracking-wider text-ds-ink2">
      PCI-DSS · Enkripsi
    </span>
  </div>
);

export const LicensedInsurersBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ds-card2 border border-ds-border ${className}`}
    title="Semua perusahaan asuransi mitra SurePath berizin resmi OJK"
  >
    <FileCheck size={12} className="text-ds-ink2" />
    <span className="text-2xs font-black uppercase tracking-wider text-ds-ink2">
      Mitra Berizin OJK
    </span>
  </div>
);

/**
 * Combined trust bar — drop into headers at conversion moments.
 * Renders 3 badges in a row, wraps on small screens.
 */
export const TrustBar: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
    <OjkBadge />
    <LicensedInsurersBadge />
    <EncryptionBadge />
  </div>
);

export default TrustBar;
