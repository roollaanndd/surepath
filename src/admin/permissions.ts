import { UserRole } from '../../types';

const FINANCE_ROLES = [UserRole.FINANCE, UserRole.FINANCE_MANAGER, UserRole.FINANCE_DIRECTOR, UserRole.MASTER_ADMIN];
const ALL_ADMINS = [UserRole.MASTER_ADMIN, UserRole.ADMIN, UserRole.FINANCE, UserRole.FINANCE_MANAGER, UserRole.FINANCE_DIRECTOR, UserRole.INSURANCE_ADMIN, UserRole.MARKETING];

export function isMasterAdmin(role?: UserRole | string | null): boolean {
  return role === UserRole.MASTER_ADMIN;
}

export function isFinance(role?: UserRole | string | null): boolean {
  return !!role && FINANCE_ROLES.includes(role as UserRole);
}

export function isAdmin(role?: UserRole | string | null): boolean {
  return !!role && (ALL_ADMINS.includes(role as UserRole) || role === UserRole.MASTER_ADMIN);
}

export function canApprovePayout(role?: UserRole | string | null): boolean {
  return role === UserRole.FINANCE_MANAGER || role === UserRole.FINANCE_DIRECTOR || role === UserRole.MASTER_ADMIN;
}

export function canMarkPayoutPaid(role?: UserRole | string | null): boolean {
  return role === UserRole.FINANCE || role === UserRole.FINANCE_MANAGER || role === UserRole.FINANCE_DIRECTOR || role === UserRole.MASTER_ADMIN;
}

export function canEditProducts(role?: UserRole | string | null): boolean {
  return role === UserRole.INSURANCE_ADMIN || role === UserRole.MASTER_ADMIN || role === UserRole.ADMIN;
}

export function canManageUsers(role?: UserRole | string | null): boolean {
  return role === UserRole.MASTER_ADMIN || role === UserRole.ADMIN;
}

export function canViewAuditLogs(role?: UserRole | string | null): boolean {
  return role === UserRole.MASTER_ADMIN;
}

export function canImpersonate(role?: UserRole | string | null): boolean {
  return role === UserRole.MASTER_ADMIN;
}
