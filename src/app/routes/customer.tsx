import React, { lazy, Suspense } from 'react';
import { RevampedPortalLoader as PortalLoader } from '../../routes/RevampedPortalLoader';
import PortalErrorBoundary from '../../routes/PortalErrorBoundary';
import type { AppRouteProps } from '../routeHelpers';
import PromoBanner from '../../../components/PromoBanner';
import { InstallPrompt } from '../../../components/InstallPrompt';

const CustomerPortal = lazy(() => import('../../../components/customer/CustomerPortal'));

// ─── Customer app — the signed-in catch-all ALL the way last (App.tsx 745) ──
// ANY signed-in user whose role did not match an earlier gate (AGENT at the
// admin CMS excluded by that module, B2B_CLIENT restricted to its own portal)
// ends up here — including an OPERATOR visiting /agapps, who therefore sees
// the customer app, exactly like the original tree. There is deliberately NO
// role guard after this point: CustomerPortal is what `if (currentUser)`
// rendered.
export const CustomerRoutes: React.FC<AppRouteProps> = ({
  lang, currentUser, onLogout, products,
}) => {
  if (!currentUser) return null;
  return (
    <>
      <InstallPrompt lang={lang} />
      <PromoBanner />
      <PortalErrorBoundary onReset={onLogout}>
        <Suspense fallback={<PortalLoader />}>
          <CustomerPortal currentUser={currentUser} onLogout={onLogout} lang={lang} products={products} />
        </Suspense>
      </PortalErrorBoundary>
    </>
  );
};
