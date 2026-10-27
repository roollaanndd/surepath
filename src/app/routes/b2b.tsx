import React, { lazy, Suspense } from 'react';
import { RevampedPortalLoader as PortalLoader } from '../../routes/RevampedPortalLoader';
import PortalErrorBoundary from '../../routes/PortalErrorBoundary';
import type { AppRouteProps } from '../routeHelpers';
import { UserRole } from '../../../types';

const B2BPortal = lazy(() => import('../../../components/b2b/B2BPortal'));

// ─── B2B corporate portal — signed-in catch-all (App.tsx line 735) ──────────
// Claims ANY pathname for a signed-in B2B_CLIENT. Importance of staying after
// the public module: the corporate user still gets the public marketing pages
// on /products, /blog etc. — original behavior, kept on purpose. Note the
// guard is the raw role check from App.tsx (NOT hasAppAccess — B2B never
// appears in allowed_apps either way, and the equality-driven client check is
// what the original tree used).
export const B2BRoutes: React.FC<AppRouteProps> = ({
  currentUser, onLogout, lang,
}) => {
  if (!(currentUser && currentUser.role === UserRole.B2B_CLIENT)) return null;
  return (
    <PortalErrorBoundary onReset={onLogout}>
      <Suspense fallback={<PortalLoader />}>
        <B2BPortal client={currentUser} onLogout={onLogout} lang={lang} />
      </Suspense>
    </PortalErrorBoundary>
  );
};
