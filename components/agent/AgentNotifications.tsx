import React from 'react';
import { Language } from '../../types';
import NotificationDrawer from '../shared/NotificationDrawer';
import { getNotifications, type SpNotification } from '../../services/supabaseService';
import { AgentEmpty } from './AgentArt';

/* Agent notifications — the shared portal drawer with the agent's own
   empty-state illustration. The implementation lives in
   `shared/NotificationDrawer` so every portal stays in sync. */

interface Props {
  agentId: string;
  lang: Language;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

const AgentNotifications: React.FC<Props> = ({ agentId, lang, onClose, onNavigate }) => (
  <NotificationDrawer
    userId={agentId}
    lang={lang}
    onClose={onClose}
    onNavigate={onNavigate}
    emptyArt={AgentEmpty}
  />
);

export { AgentNotifications };
export type { SpNotification };
export { getNotifications };
