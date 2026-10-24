import { UserRole } from '../../types';

export type AdminWorkspaceKey =
  | 'command'
  | 'ops'
  | 'finance'
  | 'collections'
  | 'marketing'
  | 'support'
  | 'onboarding'
  | 'insurer';

export const ADMIN_WORKSPACE_ROLES: UserRole[] = [
  UserRole.MASTER_ADMIN,
  UserRole.ADMIN,
  UserRole.FINANCE,
  UserRole.FINANCE_MANAGER,
  UserRole.FINANCE_DIRECTOR,
  UserRole.INSURANCE_ADMIN,
  UserRole.MARKETING,
  UserRole.OPERATOR,
];

export const WORKSPACE_BY_ROLE: Record<string, AdminWorkspaceKey> = {
  [UserRole.MASTER_ADMIN]: 'command',
  [UserRole.ADMIN]: 'ops',
  [UserRole.FINANCE]: 'finance',
  [UserRole.FINANCE_MANAGER]: 'finance',
  [UserRole.FINANCE_DIRECTOR]: 'finance',
  [UserRole.INSURANCE_ADMIN]: 'insurer',
  [UserRole.MARKETING]: 'marketing',
};

export function getAdminWorkspace(role?: UserRole | string | null): AdminWorkspaceKey | null {
  if (!role) return null;
  if (role in WORKSPACE_BY_ROLE) {
    return WORKSPACE_BY_ROLE[role];
  }
  // Support common role variants if present
  const r = String(role).toUpperCase();
  if (r === 'COLLECTIONS') return 'collections';
  if (r === 'BUSINESS_SUPPORT' || r === 'SUPPORT' || r === 'CS') return 'support';
  if (r === 'AGENT_REGISTRATIONS' || r === 'ONBOARDING' || r === 'AGENT_ONBOARDING') return 'onboarding';
  return null;
}

export function isAdminWorkspaceRole(role?: UserRole | string | null): boolean {
  if (!role) return false;
  const r = role as UserRole;
  if ([UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.FINANCE_MANAGER, UserRole.FINANCE_DIRECTOR, UserRole.INSURANCE_ADMIN, UserRole.MARKETING].includes(r)) {
    return true;
  }
  const s = String(role).toUpperCase();
  return ['COLLECTIONS', 'BUSINESS_SUPPORT', 'SUPPORT', 'CS', 'AGENT_REGISTRATIONS', 'ONBOARDING', 'AGENT_ONBOARDING'].includes(s);
}

export const WORKSPACE_META: Record<AdminWorkspaceKey, { title: string; subtitle: string; accent: string }> = {
  command: { title: 'Command Center', subtitle: 'Pengawasan menyeluruh & keamanan', accent: '#00C16A' },
  ops: { title: 'Ops Command Center', subtitle: 'Operasional harian SurePath', accent: '#3B82F6' },
  finance: { title: 'Finance Workspace', subtitle: 'Komisi, penarikan & rekonsiliasi', accent: '#22C55E' },
  collections: { title: 'Collections Workspace', subtitle: 'Penagihan & aging piutang', accent: '#F59E0B' },
  marketing: { title: 'Marketing Workspace', subtitle: 'Leads, kampanye & pertumbuhan', accent: '#A855F7' },
  support: { title: 'Business Support Workspace', subtitle: 'Tiket, lookup & eskalasi', accent: '#06B6D4' },
  onboarding: { title: 'Agent Onboarding Workspace', subtitle: 'Registrasi, KYC & aktivasi agen', accent: '#F97316' },
  insurer: { title: 'Insurer Liaison Workspace', subtitle: 'Review polis & koordinasi insurer', accent: '#10B981' },
};
