import { UserRole } from '../../types';
import { type Language } from '../../types';
import type { Dispatch, SetStateAction } from 'react';

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

// The props object App.tsx hands to src/app/routes/index.tsx; every route
// module's screen mapping hangs from it. Each module decides for itself
// whether it claims the current `pathname` (returns JSX) or declines (returns
// null); the dispatcher in index.tsx preserves the original gate order of the
// pre-split App.tsx render tree. IMPORTANT for anyone tempted to reuse
// `rolePath` for routing: prefer the supplied `resolvePortalPath` prop — that
// is App.tsx's own tested function. This file's `rolePath` carries the
// default_app/active_app semantics that have not been reviewed for
// production routing.
export interface AppRouteProps {
  pathname: string;
  lang: Language;
  setLang: (l: Language) => void;
  /** Persisting variant (App.tsx handleSetLang) — only the financing workspace consumes it. */
  persistLang?: (l: Language) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  navigate: (path: string) => void;
  /** Signed-in profile, otherwise null. */
  currentUser: any;
  /** PWA standalone mode — gates the logged-out HomePage fallback. */
  appMode: boolean;
  /** ?reset=1 or a recovery hash — the recovery gate claims every path. */
  isPasswordRecovery: boolean;
  loginError: string | null;
  onDismissLoginError: () => void;
  onNeedsRoleSelection: (user: { id: string; name: string; email: string }) => void;
  onAuthSuccess: (user: any) => void;
  onLogout: () => void;
  /**
   * The ONLY authority mapping a signed-in user to their portal path.
   * Intentionally receives the tested rolePath from App.tsx, NOT routeHelpers.rolePath.
   */
  resolvePortalPath: (user: any) => string;
  products: any[];
  setProducts: Dispatch<SetStateAction<any[]>>;
}
