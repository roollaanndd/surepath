import { UserRole } from '../../types';

export const ADMIN_ROLES = [
  UserRole.MASTER_ADMIN,
  UserRole.ADMIN,
  UserRole.FINANCE,
  UserRole.FINANCE_MANAGER,
  UserRole.FINANCE_DIRECTOR,
  UserRole.INSURANCE_ADMIN,
];

export const isPublicStandalonePath = (path: string): boolean =>
  /^\/(q|review)\//.test(path) || path.startsWith('/payment/');

export const rolePath = (user: any): string => {
  const app = user?.default_app || user?.active_app;
  if (Array.isArray(user?.allowed_apps) && user.allowed_apps.length >= 2) {
    return '/select-app';
  }
  if (app === 'ADMIN' || (user?.role && ADMIN_ROLES.includes(user.role))) {
    if (user?.allowed_apps && Array.isArray(user.allowed_apps) && !user.allowed_apps.includes('ADMIN')) {
      return '/';
    }
    return '/admin';
  }
  if (app === 'OPERATOR' || user?.role === UserRole.OPERATOR) return '/operatorapp';
  if (app === 'MARKETING' || user?.role === UserRole.MARKETING) return '/marketingapp';
  if (app === 'B2B_CLIENT' || user?.role === UserRole.B2B_CLIENT) return '/b2b';
  const role = user?.role;
  return ADMIN_ROLES.includes(role)
    ? '/admin'
    : role === UserRole.OPERATOR
      ? '/operatorapp'
      : role === UserRole.MARKETING
        ? '/marketingapp'
        : role === UserRole.AGENT
          ? '/agapps'
          : role === UserRole.B2B_CLIENT
            ? '/b2b'
            : '/custapp';
};

export const hasAppAccess = (user: any, app: 'CUSTOMER' | 'AGENT' | 'OPERATOR' | 'ADMIN' | 'MARKETING' | 'B2B'): boolean => {
  if (!user) return false;
  const allowed: string[] | null | undefined = user.allowed_apps;
  if (Array.isArray(allowed) && allowed.length > 0) {
    return allowed.includes(app);
  }
  if (app === 'ADMIN') return ADMIN_ROLES.includes(user.role);
  if (app === 'OPERATOR') return user.role === UserRole.OPERATOR;
  if (app === 'MARKETING') return user.role === UserRole.MARKETING;
  if (app === 'B2B') return user.role === UserRole.B2B_CLIENT;
  if (app === 'AGENT') return user.role === UserRole.AGENT;
  if (app === 'CUSTOMER') return true;
  return false;
};

export const MARKETING_PAGES: Record<string, any> = {
  '/products': null,
  '/ai': null,
  '/how-it-works': null,
  '/about': null,
  '/contact': null,
};

export const STATIC_INFO_PAGES = ['careers', 'agents', 'partnership', 'privacy', 'terms', 'security', 'cookie'];
