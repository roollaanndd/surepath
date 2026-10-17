// Agent + admin notifications (sp_notifications, sp_admin_notifications).

import { supabase, callGateway } from './db';
import type { SpNotification, SpAdminNotification } from './dbTypes';

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getNotifications(agentId: string, strict = false): Promise<SpNotification[]> {
  // Routed through the gateway (service_role bypasses RLS on sp_notifications)
  const { data, error } = await callGateway('get_my_notifications');
  if (error) {
    console.error('getNotifications:', error);
    // Fallback to direct query (works for agents who have RLS access)
    const { data: fallback, error: fallbackError } = await supabase
      .from('sp_notifications')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (fallbackError && strict) throw fallbackError;
    return (fallback ?? []) as SpNotification[];
  }
  return (data ?? []) as SpNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  // Use gateway for audit trail + RLS bypass
  await callGateway('mark_my_notification_read', { notification_id: id }).catch(() => {
    // Fallback to direct update (works for agent's own notifications via RLS)
    supabase.from('sp_notifications').update({ read: true }).eq('id', id).then(() => {}, () => {});
  });
}

export async function markAllNotificationsRead(agentId: string): Promise<void> {
  await callGateway('mark_all_my_notifications_read', {}).catch(() => {
    supabase.from('sp_notifications').update({ read: true }).eq('agent_id', agentId).eq('read', false).then(() => {}, () => {});
  });
}

export async function addNotification(data: Omit<SpNotification, 'id' | 'created_at' | 'read'>): Promise<void> {
  // Route through gateway for audit + RLS consistency
  await callGateway('create_notification', data).catch(() => {
    // Fallback: direct insert (RLS allows agent to insert own notifications)
    supabase.from('sp_notifications').insert({ ...data, read: false }).then(() => {}, () => {});
  });
}

// ─── Admin Notifications ──────────────────────────────────────────────────────

export async function createAdminNotification(data: Omit<SpAdminNotification, 'id' | 'created_at' | 'read'>): Promise<void> {
  await callGateway('admin_create_notification', data).catch(() => {});
}

export async function getAdminNotifications(unreadOnly = false): Promise<SpAdminNotification[]> {
  const { data, error } = await callGateway('admin_list_notifications', { unread_only: unreadOnly, limit: 50 });
  if (error) { console.error('getAdminNotifications:', error); return []; }
  return (data ?? []) as SpAdminNotification[];
}

export async function markAdminNotificationRead(id: string): Promise<void> {
  await callGateway('admin_mark_notification_read', { notification_id: id }).catch(() => {});
}
