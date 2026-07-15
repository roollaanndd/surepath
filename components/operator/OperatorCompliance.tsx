// ─────────────────────────────────────────────────────────────────────────────
// OperatorCompliance.tsx — Operator app's compliance & user-data surface.
//
// Scope (per product decision): Operator gets visibility into the same
// compliance data as CMS admins — identity verification queue (incl. T&C
// status per user), T&C acceptance audit trail, signed agent agreements,
// and the documents library — but NOT the broader account-management
// powers (role changes, app access, suspension) that live in the CMS-only
// UserManagementView. Reuses the admin components directly since the
// data-gateway already authorizes OPERATOR for every admin_* action.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { ShieldCheck, FileCheck, FileText, FolderOpen } from 'lucide-react';
import IdentityVerificationAdmin from '../admin/IdentityVerificationAdmin';
import TncRecordsAdmin from '../admin/TncRecordsAdmin';
import AgentAgreementsAdmin from '../admin/AgentAgreementsAdmin';
import DocumentsAdminView from '../admin/DocumentsAdminView';

type SubTab = 'identity' | 'tnc' | 'agreements' | 'documents';

const SUB_TABS: Array<{ id: SubTab; label: string; Icon: React.ElementType }> = [
  { id: 'identity',   label: 'Verifikasi Identitas', Icon: ShieldCheck },
  { id: 'tnc',        label: 'Riwayat T&K',          Icon: FileCheck },
  { id: 'agreements', label: 'Perjanjian Mitra',     Icon: FileText },
  { id: 'documents',  label: 'Dokumen',              Icon: FolderOpen },
];

const OperatorCompliance: React.FC = () => {
  const [tab, setTab] = useState<SubTab>('identity');

  return (
    <div className="px-4 pt-4 space-y-4">
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {SUB_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
              tab === id ? 'bg-ds-green text-white shadow-ds-green' : 'bg-ds-card border border-ds-border text-ds-ink3'
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* The admin views below render on a dark CMS-style surface; wrap them
          so they read cleanly inside the operator app's light/dark shell. */}
      <div className="bg-[#0b1120] rounded-3xl p-4 -mx-1">
        {tab === 'identity' && <IdentityVerificationAdmin />}
        {tab === 'tnc' && <TncRecordsAdmin />}
        {tab === 'agreements' && <AgentAgreementsAdmin />}
        {tab === 'documents' && <DocumentsAdminView />}
      </div>
    </div>
  );
};

export default OperatorCompliance;
