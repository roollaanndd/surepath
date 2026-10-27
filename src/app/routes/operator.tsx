import React, { lazy, Suspense } from 'react';
import { RevampedPortalLoader as PortalLoader } from '../../routes/RevampedPortalLoader';
import PortalErrorBoundary from '../../routes/PortalErrorBoundary';
import { hasAppAccess } from '../routeHelpers';
import type { AppRouteProps } from '../routeHelpers';

const OperatorLogin  = lazy(() => import('../../../components/operator/OperatorLogin'));
const OperatorPortal = lazy(() => import('../../../components/operator/OperatorPortal'));

// ─── /operatorapp in all three shades the original tree rendered it ─────────
// App.tsx had three separate checks for this path (lines 620, 688, 709):
// signed-out, signed-in-without-OPERATOR-access (both → OperatorLogin), and
// the real portal. The first two are collapsed in one place here; a signed-in
// OPERATOR gets the portal, everyone else at /operatorapp gets the login.
export const OperatorRoutes: React.FC<AppRouteProps> = ({
  pathname, lang, navigate, currentUser, onAuthSuccess, onLogout,
}) => {
  if (pathname !== '/operatorapp') return null;

  if (currentUser && hasAppAccess(currentUser, 'OPERATOR')) {
    return (
      <PortalErrorBoundary onReset={onLogout}>
        <Suspense fallback={<PortalLoader />}>
          <OperatorPortal operator={currentUser} onLogout={onLogout} lang={lang} />
        </Suspense>
      </PortalErrorBoundary>
    );
  }

  // Direct navigation while signed out (and denial for every other role).
  return (
    <Suspense fallback={<PortalLoader lang={lang} />}>
      <OperatorLogin
        onLoginSuccess={user => { onAuthSuccess(user); navigate('/operatorapp'); }}
        onBack={() => navigate('/')}
      />
    </Suspense>
  );
};
