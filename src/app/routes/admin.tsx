import React, { lazy, Suspense } from 'react';
import { RevampedPortalLoader as PortalLoader } from '../../routes/RevampedPortalLoader';
import PortalErrorBoundary from '../../routes/PortalErrorBoundary';
import { ADMIN_ROLES } from '../routeHelpers';
import type { AppRouteProps } from '../routeHelpers';

const AdminLogin  = lazy(() => import('../../../components/admin/AdminLogin'));
const AdminPortal = lazy(() => import('../../../components/admin/AdminPortal'));

// ─── Admin CMS: login gate + the portal catch-all ───────────────────────────
// Order-sensitive. This module sits BEFORE the operator module and BEFORE the
// AuthGate entry gate, because App.tsx handled:
//   1. signed-out visitors on /admin and /admin/** → AdminLogin (line 628)
//   2. a signed-in admin on ANY pathname → AdminPortal (line 636, catch-all)
// an admin hitting /operatorapp or /select-app therefore lands in the CMS —
// that odd-but-intentional behavior is preserved, not "fixed" here. Admins
// hitting the public marketing pages get those pages instead, because the
// public module runs earlier in the chain (App.tsx 567–613 precede 636).
export const AdminRoutes: React.FC<AppRouteProps> = ({
  pathname, lang, navigate, currentUser, onAuthSuccess, onLogout, products, setProducts,
}) => {
  if (!currentUser) {
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      return (
        <Suspense fallback={<PortalLoader lang={lang} />}>
          <AdminLogin
            onLoginSuccess={user => { onAuthSuccess(user); navigate('/admin'); }}
            onBack={() => navigate('/')}
          />
        </Suspense>
      );
    }
    return null;
  }

  if (ADMIN_ROLES.includes(currentUser.role)) {
    return (
      <PortalErrorBoundary onReset={onLogout}>
        <Suspense fallback={<PortalLoader />}>
          <AdminPortal
            onLogout={onLogout}
            products={products}
            setProducts={setProducts}
            userRole={currentUser.role}
            currentUser={currentUser}
          />
        </Suspense>
      </PortalErrorBoundary>
    );
  }
  return null;
};
