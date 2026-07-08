// claims.ts — 4 actions
// Auto-generated from data-gateway/index.ts split
import type { GatewayContext, ActionResult } from './types.ts';

// json() helper — returns ActionResult (main index.ts converts to Response)
const json = (body: unknown, status = 200): ActionResult => ({ status, body });

export async function handleClaimsAction(action: string, ctx: GatewayContext): Promise<ActionResult | null> {
  const { db, params, caller, sendTelegram, logActivity, checkRateLimit, RESEND_KEY } = ctx;

  switch (action) {
    case 'get_my_claims': {
        const { data, error } = await db
          .from('sp_claims')
          .select('*')
          .eq('user_id', caller.authId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'submit_claim': {
        const insertRow: Record<string, unknown> = {
          user_id: caller.authId,
          claim_type: String(params.claim_type ?? 'VEHICLE'),
          description: String(params.description ?? ''),
          location: String(params.location ?? ''),
          amount_estimated: Number(params.amount_estimated ?? 0),
          status: 'SUBMITTED',
        };
        const { data, error } = await db
          .from('sp_claims')
          .insert(insertRow)
          .select()
          .single();
        if (error) return json({ error: error.message }, 400);
        // ── Operator/admin in-app notification ──────────────────────────────
        db.from('sp_admin_notifications').insert({
          type: 'NEW_CLAIM',
          title: 'Klaim Baru Diajukan',
          body: `${String((data as any).claim_type ?? 'Klaim')} · Rp ${Number((data as any).amount_estimated ?? 0).toLocaleString('id-ID')}`,
          read: false,
          metadata: { claim_id: (data as any).id, user_id: caller.authId },
        }).then(() => {}, () => {});
        return json({ data });
      }

    case 'admin_list_claims': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        let q = db.from('sp_claims').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(Number(params.limit ?? 200));
        if (params.status) q = q.eq('status', params.status);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_update_claim': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.claim_id || !params.status) return json({ error: 'claim_id and status required' }, 400);
        const VALID = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID'];
        if (!VALID.includes(String(params.status))) return json({ error: 'Invalid status' }, 400);
        const updates: Record<string, unknown> = { status: params.status, updated_at: new Date().toISOString() };
        if (params.adjuster_notes) updates.adjuster_notes = params.adjuster_notes;
        const { data, error } = await db.from('sp_claims').update(updates).eq('id', params.claim_id).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    default:
      return null; // Not handled by this module
  }
}
