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
        // FIX: previously this dropped 7 of 10 fields the UI sends, AND never set agent_id.
        // Now accepts the full claim payload and derives agent_id from the linked policy order.
        const claimType = String(params.claim_type ?? params.product_type ?? 'VEHICLE').toUpperCase();
        const description = String(params.description ?? params.chronology ?? '').slice(0, 5000);
        const insertRow: Record<string, unknown> = {
          user_id: caller.authId,
          claim_type: claimType,
          description,
          location: String(params.location ?? '').slice(0, 500),
          amount_estimated: Number(params.amount_estimated ?? 0),
          status: 'SUBMITTED',
          // NEW fields (previously dropped):
          client_name:    params.client_name    ? String(params.client_name).slice(0, 200)    : null,
          policy_number:  params.policy_number  ? String(params.policy_number).slice(0, 100)  : null,
          product_type:   params.product_type   ? String(params.product_type).slice(0, 50)    : claimType,
          chronology:     params.chronology     ? String(params.chronology).slice(0, 5000)    : null,
          photos:         params.photos         ? params.photos                               : null,
          incident_date:  params.incident_date ?? params.date ?? null,
        };

        // Derive agent_id + policy_id from linked policy order (if policy_number or policy_id provided)
        if (params.policy_id) {
          insertRow.policy_id = String(params.policy_id);
          const { data: linkedOrder } = await db.from('sp_policy_orders')
            .select('agent_id, client_id, insurer_id')
            .eq('id', String(params.policy_id))
            .maybeSingle();
          if (linkedOrder) {
            insertRow.agent_id = (linkedOrder as any).agent_id;
            if ((linkedOrder as any).client_id) insertRow.client_id = (linkedOrder as any).client_id;
          }
        } else if (params.policy_number) {
          const { data: linkedOrder } = await db.from('sp_policy_orders')
            .select('id, agent_id, client_id, insurer_id')
            .eq('order_number', String(params.policy_number))
            .maybeSingle();
          if (linkedOrder) {
            insertRow.policy_id = (linkedOrder as any).id;
            insertRow.agent_id  = (linkedOrder as any).agent_id;
            if ((linkedOrder as any).client_id) insertRow.client_id = (linkedOrder as any).client_id;
          }
        }

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
          body: `${String((data as any).claim_type ?? 'Klaim')} · ${String((data as any).client_name ?? 'Nasabah')} · Rp ${Number((data as any).amount_estimated ?? 0).toLocaleString('id-ID')}`,
          read: false,
          metadata: { claim_id: (data as any).id, user_id: caller.authId, agent_id: insertRow.agent_id ?? null },
        }).then(() => {}, () => {});

        // NEW: Notify the agent (if linked) that one of their customers filed a claim
        if (insertRow.agent_id) {
          db.from('sp_notifications').insert({
            agent_id: String(insertRow.agent_id),
            type: 'NEW_CLAIM',
            title: 'Klaim Baru dari Nasabah',
            body: `${String((data as any).client_name ?? 'Nasabah')} mengajukan klaim ${String((data as any).claim_type ?? '')} senilai Rp ${Number((data as any).amount_estimated ?? 0).toLocaleString('id-ID')}.`,
            read: false,
            metadata: { claim_id: (data as any).id, user_id: caller.authId },
          }).then(() => {}, () => {});
        }
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
        if (params.adjuster_notes) updates.adjuster_notes = String(params.adjuster_notes).slice(0, 5000);

        // Fetch current row for notification targeting
        const { data: current } = await db.from('sp_claims')
          .select('id, user_id, agent_id, claim_type, status, amount_estimated')
          .eq('id', String(params.claim_id))
          .maybeSingle();

        const { data, error } = await db.from('sp_claims').update(updates).eq('id', params.claim_id).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);

        // NEW: Notify the customer (and agent) about the claim status change
        const statusLabels: Record<string, string> = {
          UNDER_REVIEW: 'Sedang Ditinjau',
          APPROVED:     'Disetujui',
          REJECTED:     'Ditolak',
          PAID:         'Dibayarkan',
          SUBMITTED:    'Diajukan',
        };
        const newLabel = statusLabels[String(params.status)] ?? String(params.status);
        const cur = current as any;
        if (cur?.user_id) {
          db.from('sp_notifications').insert({
            agent_id: String(cur.user_id),
            type: 'CLAIM_UPDATE',
            title: `Klaim ${newLabel}`,
            body: `Status klaim ${String(cur.claim_type ?? '')} Anda telah diperbarui menjadi: ${newLabel}.${params.adjuster_notes ? ` Catatan: ${String(params.adjuster_notes).slice(0, 200)}` : ''}`,
            read: false,
            metadata: { claim_id: cur.id, status: params.status, adjuster_notes: params.adjuster_notes ?? null },
          }).then(() => {}, () => {});
        }
        if (cur?.agent_id && cur.agent_id !== cur.user_id) {
          db.from('sp_notifications').insert({
            agent_id: String(cur.agent_id),
            type: 'CLAIM_UPDATE',
            title: `Klaim Nasabah ${newLabel}`,
            body: `Klaim ${String(cur.claim_type ?? '')} untuk nasabah Anda telah diperbarui menjadi: ${newLabel}.`,
            read: false,
            metadata: { claim_id: cur.id, status: params.status },
          }).then(() => {}, () => {});
        }
        return json({ data });
      }

    default:
      return null; // Not handled by this module
  }
}
