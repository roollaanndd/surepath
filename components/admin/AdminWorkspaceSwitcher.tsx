import React from 'react';
import { WORKSPACE_META, type AdminWorkspaceKey } from '../../src/admin/roleConfig';

/**
 * v2.8.0 — Pengalih workspace untuk MASTER_ADMIN.
 *
 * Memperbaiki temuan audit high #1: empat dashboard workspace
 * (Collections/Business Support/Agent Onboarding/Marketing) sudah lama
 * terbangun penuh dan memanggil gateway nyata, tapi tidak pernah bisa
 * dijangkau karena role-nya tidak ada di UserRole. Daripada membangun role
 * baru, master admin — pemegang semua akses — kini bisa membuka setiap
 * workspace langsung dari tab dashboard.
 */
const ORDER: AdminWorkspaceKey[] = [
  'command', 'ops', 'finance', 'collections', 'support', 'onboarding', 'marketing', 'insurer',
];

const AdminWorkspaceSwitcher: React.FC<{
  value: AdminWorkspaceKey;
  onChange: (key: AdminWorkspaceKey) => void;
}> = ({ value, onChange }) => (
  <div className="flex flex-wrap gap-1.5 pb-4" role="tablist" aria-label="Pilih workspace">
    {ORDER.map(key => {
      const meta = WORKSPACE_META[key];
      const active = key === value;
      return (
        <button
          key={key}
          role="tab"
          aria-selected={active}
          onClick={() => onChange(key)}
          className={`px-3 py-1.5 rounded-full text-2xs font-black uppercase tracking-wider border transition-colors ${
            active
              ? 'text-white border-transparent'
              : 'bg-ds-card2 text-ds-ink3 border-ds-border hover:text-ds-ink2'
          }`}
          style={active ? { backgroundColor: meta.accent } : undefined}
        >
          {meta.title.replace(' Workspace', '').replace(' Command Center', '')}
        </button>
      );
    })}
  </div>
);

export default AdminWorkspaceSwitcher;
