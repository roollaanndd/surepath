import React, { lazy, Suspense } from 'react';
import { RevampedPortalLoader as PortalLoader } from '../../routes/RevampedPortalLoader';
import type { AppRouteProps } from '../routeHelpers';

const AuthGate   = lazy(() => import('../../../components/AuthGate'));
const AppSelector = lazy(() => import('../../../components/AppSelector'));

// ─── Password recovery gate — claims EVERY path ─────────────────────────────
// ?reset=1 / a recovery hash renders the AuthGate reset form on ANY pathname,
// before the standalone pages get a say (App.tsx moved this before /payment,
// /review, /q for exactly that reason — recovery links judged by the URL
// params, not the route).
export const RecoveryGateRoutes: React.FC<AppRouteProps> = ({
  lang, isPasswordRecovery, onAuthSuccess, loginError, onDismissLoginError,
}) => {
  if (!isPasswordRecovery) return null;
  return (
    <Suspense fallback={<PortalLoader lang={lang} />}>
      <AuthGate
        initialLang={lang}
        initialMode="RESET_PASSWORD"
        onAuthSuccess={onAuthSuccess}
        externalError={loginError}
        onDismissExternalError={onDismissLoginError}
      />
    </Suspense>
  );
};

// ─── Login gate for the AuthGate-based apps ─────────────────────────────────
// /login, /custapp, /agapps when signed out (App.tsx line 615). Signed-in
// visitors of these paths are NOT claimed here — they flow on to the portals'
// catch-alls, matching the original tree.
export const AuthEntryRoutes: React.FC<AppRouteProps> = ({
  pathname, lang, currentUser, onAuthSuccess, loginError, onDismissLoginError, onNeedsRoleSelection,
}) => {
  if (currentUser) return null;
  if (!['/login', '/custapp', '/agapps'].includes(pathname)) return null;
  return (
    <Suspense fallback={<PortalLoader />}>
      <AuthGate
        onAuthSuccess={onAuthSuccess}
        initialLang={lang}
        externalError={loginError}
        onDismissExternalError={onDismissLoginError}
        onNeedsRoleSelection={onNeedsRoleSelection}
      />
    </Suspense>
  );
};

// ─── Multi-app selector (/select-app) ───────────────────────────────────────
// Shown when a signed-in user holds 2+ entries in allowed_apps. Deliberately
// placed AFTER the admin module in the chain: an ADMIN lands in the CMS on
// any pathname — the selector never reached an admin in the original tree
// (App.tsx line 636 precedes 647), and that stays true here. routing itself
// goes through `resolvePortalPath`, i.e. App.tsx's own tested rolePath.
export const SelectAppRoutes: React.FC<AppRouteProps> = ({
  pathname, navigate, currentUser, onLogout, resolvePortalPath,
}) => {
  if (pathname !== '/select-app' || !currentUser) return null;
  const allowed: string[] = Array.isArray(currentUser.allowed_apps) ? currentUser.allowed_apps : [];
  if (allowed.length <= 1) {
    // Single app or no allowed_apps — redirect to the right place
    navigate(resolvePortalPath(currentUser));
    return null;
  }
  const handleAppSelect = (app: 'CUSTOMER' | 'AGENT' | 'OPERATOR' | 'ADMIN') => {
    const target = app === 'ADMIN' ? '/admin'
      : app === 'OPERATOR' ? '/operatorapp'
      : app === 'AGENT' ? '/agapps' : '/custapp';
    navigate(target);
  };
  return (
    <Suspense fallback={<PortalLoader />}>
      <AppSelector user={currentUser} onSelect={handleAppSelect} onLogout={onLogout} />
    </Suspense>
  );
};

// ─── Final fallback: the terminal signed-out AuthGate (App.tsx line 774) ─────
// Only reached when every portal, every public page and the HomePage claim
// declined — i.e. a signed-out visitor in app (standalone/display) mode on an
// unclaimed path.
export const DefaultAuthGateRoutes: React.FC<AppRouteProps> = ({
  lang, currentUser, onAuthSuccess, loginError, onDismissLoginError, onNeedsRoleSelection,
}) => {
  if (currentUser) return null;
  return (
    <Suspense fallback={<PortalLoader />}>
      <AuthGate
        onAuthSuccess={onAuthSuccess}
        initialLang={lang}
        externalError={loginError}
        onDismissExternalError={onDismissLoginError}
        onNeedsRoleSelection={onNeedsRoleSelection}
      />
    </Suspense>
  );
};
