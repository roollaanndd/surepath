import React, { lazy, Suspense } from 'react';
import { RevampedPortalLoader as PortalLoader } from '../../routes/RevampedPortalLoader';
import PortalErrorBoundary from '../../routes/PortalErrorBoundary';
import { hasAppAccess } from '../routeHelpers';
import type { AppRouteProps } from '../routeHelpers';

const MarketingPortal = lazy(() => import('../../../components/marketing/MarketingPortal'));

// ─── Marketing/sales CRM portal (/marketingapp) ─────────────────────────────
// Uses the same Supabase Auth identity as agents and customers — there is no
// dedicated login screen; a signed-out visitor at /marketingapp flows on and
// ends up wherever the tail of the chain sends them (HomePage / AuthGate),
// matching App.tsx line 699 where the portal only renders with access.
export const MarketingRoutes: React.FC<AppRouteProps> = ({
  pathname, lang, currentUser, onLogout,
}) => {
  if (pathname !== '/marketingapp') return null;
  if (!(currentUser && hasAppAccess(currentUser, 'MARKETING'))) return null;
  return (
    <PortalErrorBoundary onReset={onLogout}>
      <Suspense fallback={<PortalLoader />}>
        <MarketingPortal marketing={currentUser} onLogout={onLogout} lang={lang} />
      </Suspense>
    </PortalErrorBoundary>
  );
};
