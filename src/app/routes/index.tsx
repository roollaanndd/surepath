import React, { lazy, Suspense } from 'react';
import { RevampedPortalLoader as PortalLoader } from '../../routes/RevampedPortalLoader';
import { InstallPrompt } from '../../../components/InstallPrompt';
import type { AppRouteProps } from '../routeHelpers';
import { RecoveryGateRoutes, AuthEntryRoutes, SelectAppRoutes, DefaultAuthGateRoutes } from './auth';
import { StandaloneRoutes } from './standalone';
import { InsurerRoutes } from './insurer';
import { PublicRoutes } from './public';
import { AdminRoutes } from './admin';
import { OperatorRoutes } from './operator';
import { MarketingRoutes } from './marketing';
import { AgentRoutes } from './agent';
import { B2BRoutes } from './b2b';
import { CustomerRoutes } from './customer';

const HomePage = lazy(() => import('../../../src/pages/HomePage'));

// ─── App.tsx's render tree, split per portal ────────────────────────────────
// The chain below mirrors the pre-split App.tsx if-order EXACTLY. Reordering
// breaks real semantics — the invariants that must stay true:
//   • recovery beats every standalone page (?reset=1 wins even on /q/{code})
//   • payment/review/q are claimed before ANY login surface and portal
//   • insurer token flow dictates /insurer-portal + /insurerapp
//   • marketing/product/blog/static pages render for SIGNED-IN users too —
//     before every portal catch-all (App.tsx 567–613)
//   • the Admin CMS claims ANY pathname for a signed-in admin (line 636),
//     BEFORE select-app (647) — the selector never reached an admin
//   • /operatorapp resolves login-vs-portal internally (620 + 688 + 709)
//   • the AuthGate entry gate runs for signed-out /login//custapp//agapps
//   • B2B and Customer are the signed-in catch-alls, in that order (735, 745)
//   • the logged-out homepage exists only OUTSIDE app/standalone mode (759)
//   • the terminal AuthGate is signed-out + app mode only (774)
// Modules are pure pathname/props → JSX mappings (no hooks), so they are
// invoked in order and the first non-null result wins; declaring a claim
// means an earlier module swallowed the path, and null means "not mine".
export const AppRoutes: React.FC<AppRouteProps> = (props) => {
  const recovery = RecoveryGateRoutes(props);
  if (recovery) return recovery;

  const standalone = StandaloneRoutes(props);
  if (standalone) return standalone;

  const insurer = InsurerRoutes(props);
  if (insurer) return insurer;

  // The public/marketing module declares its own narrow prop contract (pre-
  // split it received exactly these seven), so it is fed explicitly rather
  // than with the full AppRouteProps object.
  const publicContent = PublicRoutes({
    pathname: props.pathname,
    lang: props.lang,
    setLang: props.setLang,
    persistLang: props.persistLang,
    darkMode: props.darkMode,
    setDarkMode: props.setDarkMode,
    navigate: props.navigate,
    onSignIn: () => props.navigate('/login'),
  });
  if (publicContent) return publicContent;

  const admin = AdminRoutes(props);
  if (admin) return admin;

  const operator = OperatorRoutes(props);
  if (operator) return operator;

  const authGate = AuthEntryRoutes(props);
  if (authGate) return authGate;

  const selectApp = SelectAppRoutes(props);
  if (selectApp) return selectApp;

  const marketing = MarketingRoutes(props);
  if (marketing) return marketing;

  const agent = AgentRoutes(props);
  if (agent) return agent;

  const b2b = B2BRoutes(props);
  if (b2b) return b2b;

  const customer = CustomerRoutes(props);
  if (customer) return customer;

  // Logged-out visitor outside PWA standalone mode → marketing homepage.
  if (!props.appMode) {
    return (
      <React.Fragment>
        <Suspense fallback={<PortalLoader />}>
          <HomePage
            onSignIn={() => props.navigate('/login')}
            navigate={props.navigate}
            lang={props.lang}
            setLang={props.setLang}
            darkMode={props.darkMode}
            setDarkMode={props.setDarkMode}
          />
        </Suspense>
        <InstallPrompt lang={props.lang} />
      </React.Fragment>
    );
  }

  const fallbackGate = DefaultAuthGateRoutes(props);
  if (fallbackGate) return fallbackGate;

  // Unreachable by construction — the terminal AuthGate claims every
  // signed-out path once the HomePage branch declined.
  return null;
};
