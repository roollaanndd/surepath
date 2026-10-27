import React, { lazy, Suspense } from 'react';
import { RevampedPortalLoader as PortalLoader } from '../../routes/RevampedPortalLoader';
import PortalErrorBoundary from '../../routes/PortalErrorBoundary';
import { hasAppAccess } from '../routeHelpers';
import type { AppRouteProps } from '../routeHelpers';
import { InstallPrompt } from '../../../components/InstallPrompt';

const AgentPortal = lazy(() => import('../../../components/agent/AgentPortal'));

// ─── Agent portal (/agapps and the legacy alias /agentapp) ──────────────────
// The portal expects the Supabase identity in `agent.id` and the agent code in
// `agent.agent_code`; sessions restored from storage carry the code under
// `nodeId` and a missing Supabase id — the mapping below (App.tsx line 719)
// exists precisely for that and must not "simplify" away.
export const AgentRoutes: React.FC<AppRouteProps> = ({
  pathname, lang, currentUser, onLogout,
}) => {
  if (!(pathname === '/agapps' || pathname === '/agentapp')) return null;
  if (!(currentUser && hasAppAccess(currentUser, 'AGENT'))) return null;

  const agentWithSupabaseId = currentUser.supabaseId
    ? { ...currentUser, id: currentUser.supabaseId, agent_code: currentUser.nodeId }
    : { ...currentUser, agent_code: currentUser.nodeId };

  return (
    <>
      <InstallPrompt lang={lang} />
      <PortalErrorBoundary onReset={onLogout}>
        <Suspense fallback={<PortalLoader />}>
          <AgentPortal agent={agentWithSupabaseId} onLogout={onLogout} lang={lang} />
        </Suspense>
      </PortalErrorBoundary>
    </>
  );
};
