// Agent + admin notifications (sp_notifications, sp_admin_notifications).

import { supabase, callGateway } from './db';
import type { SpNotification, SpAdminNotification } from './dbTypes';

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getNotifications(agentId: string): Promise<SpNotification[]> {
  // Routed through the gateway (service_role bypasses RLS on sp_notifications)
  const { data, error } = await callGateway('get_my_notifications');
  if (error) {
    console.error('getNotifications:', error);
    // Fallback to direct query (works for agents who have RLS access)
    const { data: fallback } = await supabase
      .from('sp_notifications')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(50);
    return (fallback ?? []) as SpNotification[];
  }
  return (data ?? []) as SpNotification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('sp_notifications').update({ read: true }).eq('id', id);
}

export async function markAllNotificationsRead(agentId: string): Promise<void> {
  await supabase.from('sp_notifications').update({ read: true }).eq('agent_id', agentId).eq('read', false);
}

export async function addNotification(data: Omit<SpNotification, 'id' | 'created_at' | 'read'>): Promise<void> {
  await supabase.from('sp_notifications').insert({ ...data, read: false });
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
