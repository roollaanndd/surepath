// User profile + auth actions
import { ok, err, type GatewayContext, type ActionResult } from './types.ts';

export async function handleUserAction(action: string, ctx: GatewayContext): Promise<ActionResult | null> {
  const { db, params, caller } = ctx;

  switch (action) {
    case 'get_my_profile': {
      if (!caller.spUser) return err('No SurePath profile linked to this account', 404);
      return ok(caller.spUser);
    }

    case 'update_my_profile': {
      if (!caller.spUser) return err('No profile', 403);
      const SAFE = ['name', 'phone', 'address', 'profile_photo_url', 'ktp_document_url'];
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const k of SAFE) { if (k in params) updates[k] = params[k]; }
      const { data, error } = await db.from('sp_users').update(updates).eq('id', caller.spUser.id).select().maybeSingle();
      if (error) return err(error.message);
      return ok(data);
    }

    case 'get_user_profile': {
      if (!caller.spUser) return err('No profile', 403);
      const targetId = params.user_id ? String(params.user_id) : caller.spUser.id;
      if (targetId !== caller.spUser.id && !caller.isAdmin) return err('Forbidden', 403);
      const { data, error } = await db.from('sp_users').select('id, email, name, phone, role, agent_code, tier, verified, commission_rate, created_at').eq('id', targetId).maybeSingle();
      if (error) return err(error.message);
      return ok(data);
    }

    case 'update_fcm_token': {
      if (!caller.spUser) return err('No profile', 403);
      const token = String(params.token ?? '').trim();
      if (!token) return err('Missing token');
      const { error } = await db.from('sp_users').update({ fcm_token: token, updated_at: new Date().toISOString() }).eq('id', caller.spUser.id);
      if (error) return err(error.message);
      return ok({ ok: true });
    }

    default:
      return null; // Not handled by this module
  }
}
