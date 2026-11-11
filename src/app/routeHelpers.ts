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

// ── Pemetaan role → id app (v2.8.9, dipindah dari App.tsx + isolation.tsx) ──
// Satu sumber kebenaran untuk roleToAppId: App.tsx (rolePath/effectiveApps)
// dan isolation.tsx (userAllowedInApp) semula punya dua salinan yang harus
// dijaga sinkron.
export const APP_FOR_ROLE: Record<string, string> = {
  OPERATOR: 'OPERATOR',
  MARKETING: 'MARKETING',
  AGENT: 'AGENT',
  B2B_CLIENT: 'CUSTOMER',
};

export const roleToAppId = (role: any): string =>
  ADMIN_ROLES.includes(role) ? 'ADMIN' : APP_FOR_ROLE[role] ?? 'CUSTOMER';

// Only these ids have a portal route + selector card. The 2026-07-07 backfill
// wrote RAW role names into allowed_apps (ARRAY[role] → 'MASTER_ADMIN',
// 'B2B_CLIENT', 'FINANCE_MANAGER', …), so the stored base list must be
// normalized before it is compared with card ids — otherwise phantom entries
// inflate the effective list and park users on a one-card selector screen
// instead of routing them straight into their portal.
const KNOWN_APP_IDS = ['ADMIN', 'OPERATOR', 'MARKETING', 'AGENT', 'CUSTOMER'];

// ── Effective app list (role-authoritative) ──────────────────────────────────
// allowed_apps is a convenience overlay, but sp_users.role is the source of
// truth for a user's PRIMARY app. Bug history: the 2026-07-07 backfill froze
// allowed_apps = ARRAY[role] once, and nothing re-synced it when an admin
// later changed a role — so agents with a stale ['CUSTOMER'] array were routed
// into the customer app (or blocked from /agapps) while their role said AGENT.
// The server now keeps them in sync (trg_sync_allowed_apps_with_role), and
// this union makes the client correct even against residual bad data: a
// user can always reach the app their own role entitles them to.
//
// v2.8.9 (arahan owner: "pastikan agen tidak berpindah ke app nasabah"):
// agen tidak lagi mendapatkan app pelanggan dari allowed_apps — array basi
// ['CUSTOMER'] maupun hibah eksplisit sama-sama diabaikan. Territory agen
// adalah app agen; hibah app lain (OPERATOR/MARKETING) yang memang
// diberikan admin tetap dihormati.
export const effectiveAppsFor = (user: any): string[] => {
  const base = (Array.isArray(user?.allowed_apps) ? user.allowed_apps : [])
    .filter((a): a is string => typeof a === 'string' && KNOWN_APP_IDS.includes(a));
  if (user?.role === UserRole.AGENT) {
    const withoutCustomer = base.filter(a => a !== 'CUSTOMER');
    return withoutCustomer.includes('AGENT') ? withoutCustomer : [...withoutCustomer, 'AGENT'];
  }
  const roleApp = roleToAppId(user?.role);
  // B2B_CLIENT routes through its own branch (role check in the render), so its
  // role-derived app is CUSTOMER — the union below never grants it /agapps.
  return base.includes(roleApp) ? base : [...base, roleApp];
};

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
  // v2.8.0 — MASTER_ADMIN adalah identitas superuser: setiap app boleh
  // dimasukinya (pantau operasional, bantu proses lintas portal). Ini
  // sengaja di atas union allowed_apps — stale allowed_apps tidak boleh
  // mengunci master admin keluar dari app mana pun. Data yang terlihat
  // tetap dibatasi server-side oleh setiap gateway action.
  if (user.role === UserRole.MASTER_ADMIN) return true;
  // v2.8.9 — role-authoritative, cermin effectiveAppsFor. Dua lubang yang
  // menutup di sini:
  //   • Agen dengan array basi ['CUSTOMER'] dulu DITOLAK di /agapps
  //     (hasAppAccess false) sehingga catch-all CustomerPortal yang merender —
  //     portal nasabah tampil di URL milik agen, tanpa pengguna pindah.
  //   • Agen dengan hibah 'CUSTOMER' di array dulu lolos ke /custapp.
  // Keduanya satu kebijakan: agen hanya berada di app agen.
  if (user.role === UserRole.AGENT) return app === 'AGENT';
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
