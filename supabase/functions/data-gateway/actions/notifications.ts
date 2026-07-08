// notifications.ts — 8 actions
// Auto-generated from data-gateway/index.ts split
import type { GatewayContext, ActionResult } from './types.ts';

// json() helper — returns ActionResult (main index.ts converts to Response)
const json = (body: unknown, status = 200): ActionResult => ({ status, body });

export async function handleNotificationsAction(action: string, ctx: GatewayContext): Promise<ActionResult | null> {
  const { db, params, caller, sendTelegram, logActivity, checkRateLimit, RESEND_KEY } = ctx;

  switch (action) {
    case 'get_my_notifications': {
        const { data, error } = await db
          .from('sp_notifications')
          .select('*')
          .eq('agent_id', caller.authId)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'mark_my_notification_read': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const notifId = String(params.notification_id ?? '');
        if (!notifId) return json({ error: 'notification_id required' }, 400);
        const { error } = await db.from('sp_notifications')
          .update({ read: true }).eq('id', notifId).eq('agent_id', caller.authId);
        if (error) return json({ error: error.message }, 400);
        return json({ data: { success: true } });
      }

    case 'mark_all_my_notifications_read': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const { error } = await db.from('sp_notifications')
          .update({ read: true }).eq('agent_id', caller.authId).eq('read', false);
        if (error) return json({ error: error.message }, 400);
        return json({ data: { success: true } });
      }

    case 'create_notification': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const { data, error } = await db.from('sp_notifications').insert({
          agent_id: caller.authId,
          type: String(params.type ?? 'SYSTEM'),
          title: String(params.title ?? ''),
          body: String(params.body ?? ''),
          read: false,
          metadata: params.metadata ?? null,
          order_id: params.order_id ?? null,
        }).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_list_notifications': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        let q = db.from('sp_admin_notifications').select('*').order('created_at', { ascending: false }).limit(Number(params.limit ?? 50));
        if (params.unread_only) q = q.eq('read', false);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_mark_notification_read': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.notification_id) return json({ error: 'notification_id required' }, 400);
        await db.from('sp_admin_notifications').update({ read: true }).eq('id', params.notification_id);
        return json({ data: { success: true } });
      }

    case 'admin_create_notification': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const { data, error } = await db.from('sp_admin_notifications').insert({ ...params, read: false }).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_mark_all_notifications_read': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const { error: updErr } = await db.from('sp_admin_notifications').update({ read: true }).eq('read', false);
        if (updErr) return json({ error: updErr.message }, 400);
        return json({ data: { success: true } });
      }

    default:
      return null; // Not handled by this module
  }
}
