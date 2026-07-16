// claims.ts — 4 actions
// Auto-generated from data-gateway/index.ts split
import type { GatewayContext, ActionResult } from './types.ts';

// json() helper — returns ActionResult (main index.ts converts to Response)
const json = (body: unknown, status = 200): ActionResult => ({ status, body });

export async function handleClaimsAction(action: string, ctx: GatewayContext): Promise<ActionResult | null> {
  const { db, params, caller, sendTelegram, logActivity, checkRateLimit, RESEND_KEY } = ctx;

  switch (action) {
    case 'get_my_claims': {
        // FIX v1.50.0: match both owner ids (legacy accounts have
        // sp_users.id ≠ auth id; older claims were written with auth id).
        const { data, error } = await db
          .from('sp_claims')
          .select('*')
          .in('user_id', caller.ownerIds)
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
          user_id: caller.ownerId,
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

        // ── Claim photo fraud analysis: pull TRUSTED, server-computed results ──
        // We never trust fraud_score/fraud_verdict/photo_reports if the client
        // sends them directly — that would let the exact fraudster this
        // feature targets simply claim "CLEAN" regardless of what
        // analyze-claim-photos actually found. Instead, the client only sends
        // back the analysisId it got from that edge function; we look up the
        // row it staged (service_role write), verify it belongs to this
        // caller, hasn't expired, and hasn't already been consumed by another
        // claim, then use ONLY the staged values.
        let stagedAnalysis: Record<string, any> | null = null;
        if (params.analysis_id) {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          const { data: staged } = await db
            .from('sp_claim_photo_analyses')
            .select('*')
            .eq('id', String(params.analysis_id))
            .in('user_id', caller.ownerIds)
            .is('consumed_at', null)
            .gte('created_at', oneHourAgo)
            .maybeSingle();
          if (staged) {
            stagedAnalysis = staged;
            insertRow.photo_urls = staged.photo_urls ?? null;
            insertRow.ai_fraud_score = staged.fraud_score ?? null;
            insertRow.ai_fraud_verdict = staged.fraud_verdict ?? null;
            insertRow.ai_photo_reports = staged.photo_reports ?? null;
            insertRow.ai_analyzed_at = staged.created_at ?? new Date().toISOString();
            // photos (legacy jsonb column) mirrors photo_urls when present so
            // old UI code paths that still read `photos` keep working.
            if (!insertRow.photos && staged.photo_urls) insertRow.photos = staged.photo_urls;
          }
        }

        // Derive agent_id + policy_id from linked policy order (if policy_number or policy_id provided)
        if (params.policy_id) {
          insertRow.policy_id = String(params.policy_id);
          const { data: linkedOrder } = await db.from('sp_policy_orders')
            .select('agent_id, client_id, insurer_id')
            .eq('id', String(params.policy_id))
            .maybeSingle();
          if (linkedOrder) {
            // FIX v1.42.0: verify the caller owns this policy (as agent_id OR client_id).
            // Previously any authenticated user could link a claim to any policy.
            const lo = linkedOrder as any;
            const isOwner = caller.ownerIds.includes(lo.agent_id) || caller.ownerIds.includes(lo.client_id);
            if (!isOwner && !caller.isAdmin) {
              return json({ error: 'Polis tidak ditemukan atau bukan milik Anda.' }, 403);
            }
            insertRow.agent_id = lo.agent_id;
            if (lo.client_id) insertRow.client_id = lo.client_id;
          }
        } else if (params.policy_number) {
          const { data: linkedOrder } = await db.from('sp_policy_orders')
            .select('id, agent_id, client_id, insurer_id')
            .eq('order_number', String(params.policy_number))
            .maybeSingle();
          if (linkedOrder) {
            // FIX v1.42.0: verify ownership here too
            const lo = linkedOrder as any;
            const isOwner = caller.ownerIds.includes(lo.agent_id) || caller.ownerIds.includes(lo.client_id);
            if (!isOwner && !caller.isAdmin) {
              return json({ error: 'Polis tidak ditemukan atau bukan milik Anda.' }, 403);
            }
            insertRow.policy_id = lo.id;
            insertRow.agent_id  = lo.agent_id;
            if (lo.client_id) insertRow.client_id = lo.client_id;
          }
        }

        const { data, error } = await db
          .from('sp_claims')
          .insert(insertRow)
          .select()
          .single();
        if (error) return json({ error: error.message }, 400);

        // ── Consume the staged photo analysis (prevents reuse across multiple
        // claims) and record the perceptual hashes for future duplicate checks
        if (stagedAnalysis) {
          db.from('sp_claim_photo_analyses').update({ consumed_at: new Date().toISOString() }).eq('id', stagedAnalysis.id).then(() => {}, () => {});
          const hashes: (string | null)[] = Array.isArray(stagedAnalysis.photo_hashes) ? stagedAnalysis.photo_hashes : [];
          const urls: string[] = Array.isArray(stagedAnalysis.photo_urls) ? stagedAnalysis.photo_urls : [];
          const hashRows = urls
            .map((url, i) => ({ photo_hash: hashes[i], photo_url: url }))
            .filter(r => r.photo_hash != null)
            .map(r => ({ photo_hash: r.photo_hash, source_type: 'CLAIM', source_id: (data as any).id, photo_url: r.photo_url }));
          if (hashRows.length > 0) db.from('sp_photo_hashes').insert(hashRows).then(() => {}, () => {});
        }

        // ── Operator/admin in-app notification ──────────────────────────────
        db.from('sp_admin_notifications').insert({
          type: 'NEW_CLAIM',
          title: 'Klaim Baru Diajukan',
          body: `${String((data as any).claim_type ?? 'Klaim')} · ${String((data as any).client_name ?? 'Nasabah')} · Rp ${Number((data as any).amount_estimated ?? 0).toLocaleString('id-ID')}`,
          read: false,
          metadata: { claim_id: (data as any).id, user_id: caller.authId, agent_id: insertRow.agent_id ?? null },
        }).then(() => {}, () => {});

        // NEW: distinct fraud-alert notification when photo verification wasn't clean
        if (insertRow.ai_fraud_verdict && insertRow.ai_fraud_verdict !== 'CLEAN') {
          db.from('sp_admin_notifications').insert({
            type: 'CLAIM_FRAUD_ALERT',
            title: insertRow.ai_fraud_verdict === 'REJECTED' ? 'Klaim Berisiko Tinggi — Foto Mencurigakan' : 'Klaim Perlu Tinjauan — Foto Ditandai',
            body: `${String((data as any).client_name ?? 'Nasabah')} · Skor fraud: ${insertRow.ai_fraud_score}/100 · ${String((data as any).claim_number ?? (data as any).id)}`,
            read: false,
            metadata: { claim_id: (data as any).id, user_id: caller.authId, fraud_score: insertRow.ai_fraud_score, fraud_verdict: insertRow.ai_fraud_verdict },
          }).then(() => {}, () => {});
        }

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
