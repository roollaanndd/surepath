// tiers.ts — Agent tier definitions, assignment, and approval workflow.
import type { GatewayContext, ActionResult } from './types.ts';

const json = (body: unknown, status = 200): ActionResult => ({ status, body });

const TIER_ASSIGNERS = ['MASTER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'];
const TIER_STRUCTURE_ADMINS = ['MASTER_ADMIN', 'ADMIN'];

async function computeAgentMetrics(db: any, agentId: string) {
  const [ordersRes, commissionsRes] = await Promise.all([
    db.from('sp_policy_orders').select('id', { count: 'exact', head: true }).eq('agent_id', agentId).eq('status', 'ISSUED'),
    db.from('sp_commissions').select('premium_amount').eq('agent_id', agentId),
  ]);
  const totalPremium = ((commissionsRes.data ?? []) as any[]).reduce((s, c) => s + Number(c.premium_amount ?? 0), 0);
  return { policiesCount: ordersRes.count ?? 0, totalPremium };
}

// Find the highest-rank active tier whose thresholds are met by the given metrics.
function resolveEligibleTier(tiers: any[], policiesCount: number, totalPremium: number) {
  const eligible = tiers
    .filter(t => t.is_active)
    .filter(t => (t.min_policies_count == null || policiesCount >= t.min_policies_count)
              && (t.min_premium_amount == null || totalPremium >= t.min_premium_amount))
    .sort((a, b) => b.rank - a.rank);
  return eligible[0] ?? tiers.find(t => t.is_default) ?? null;
}

// Applies a tier to an agent, or queues an approval request if the target
// tier requires it and the caller isn't a qualifying approver.
async function applyOrQueueTier(
  db: any, agentId: string, targetTier: any, currentTierCode: string | null,
  callerId: string, callerRole: string, source: 'MANUAL' | 'AUTO', reason?: string,
): Promise<{ pending: boolean; data: unknown }> {
  const isDowngrade = currentTierCode
    ? (await db.from('sp_agent_tiers').select('rank').eq('code', currentTierCode).maybeSingle()).data?.rank > targetTier.rank
    : false;
  const needsApproval = isDowngrade || (targetTier.requires_approval && !(targetTier.approval_roles ?? []).includes(callerRole));

  if (needsApproval) {
    const { data, error } = await db.from('sp_tier_change_requests').insert({
      agent_id: agentId,
      requested_tier_code: targetTier.code,
      current_tier_code: currentTierCode,
      requested_by: callerId || null,
      reason: reason ?? null,
      source: source === 'AUTO' ? 'AUTO_ELIGIBLE' : 'MANUAL_REQUEST',
    }).select().maybeSingle();
    if (error) throw new Error(error.message);
    return { pending: true, data };
  }

  const { error: updErr } = await db.from('sp_users').update({ tier: targetTier.code, tier_assigned_by: callerId || null, tier_assigned_at: new Date().toISOString() }).eq('id', agentId);
  if (updErr) throw new Error(updErr.message);
  await db.from('sp_agent_tier_history').insert({
    agent_id: agentId, tier_code: targetTier.code, previous_tier_code: currentTierCode,
    source, assigned_by: callerId || null, note: reason ?? null,
  });
  return { pending: false, data: { agent_id: agentId, tier: targetTier.code } };
}

export async function handleTiersAction(action: string, ctx: GatewayContext): Promise<ActionResult | null> {
  const { db, params, caller } = ctx;

  switch (action) {
    case 'get_tier_definitions': {
        if (!caller.spUser) return json({ error: 'Unauthorized' }, 401);
        const { data, error } = await db.from('sp_agent_tiers').select('*').eq('is_active', true).order('rank', { ascending: true });
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'get_my_tier_progress': {
        if (!caller.spUser) return json({ error: 'Unauthorized' }, 401);
        const agentId = caller.spUser.id;
        const [{ data: tiers }, metrics] = await Promise.all([
          db.from('sp_agent_tiers').select('*').eq('is_active', true).order('rank', { ascending: true }),
          computeAgentMetrics(db, agentId),
        ]);
        const allTiers = tiers ?? [];
        const currentTier = allTiers.find((t: any) => t.code === caller.spUser?.tier) ?? null;
        const nextTier = allTiers.find((t: any) => t.rank === (currentTier?.rank ?? -1) + 1) ?? null;
        return json({ data: { currentTier, nextTier, ...metrics } });
      }

    case 'admin_list_tiers': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const { data, error } = await db.from('sp_agent_tiers').select('*').order('rank', { ascending: true });
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_create_tier': {
        if (!TIER_STRUCTURE_ADMINS.includes(caller.role ?? '')) return json({ error: 'Forbidden: only MASTER_ADMIN/ADMIN can create tiers' }, 403);
        if (!params.code || !params.name) return json({ error: 'code and name required' }, 400);
        const insertRow: Record<string, unknown> = {
          code: String(params.code).toUpperCase().trim(),
          name: String(params.name),
          rank: Number(params.rank ?? 0),
          color: params.color ? String(params.color) : '#6b7280',
          emoji: params.emoji ? String(params.emoji) : null,
          min_policies_count: params.min_policies_count != null ? Number(params.min_policies_count) : null,
          min_premium_amount: params.min_premium_amount != null ? Number(params.min_premium_amount) : null,
          coin_bonus_rate: Number(params.coin_bonus_rate ?? 0),
          l1_override_rate: Number(params.l1_override_rate ?? 0),
          l2_override_rate: Number(params.l2_override_rate ?? 0),
          benefits: params.benefits ?? {},
          requires_approval: Boolean(params.requires_approval),
          approval_roles: params.approval_roles ?? ['MASTER_ADMIN'],
          is_active: params.is_active !== false,
          updated_by: caller.authId || null,
        };
        const { data, error } = await db.from('sp_agent_tiers').insert(insertRow).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_update_tier': {
        if (!TIER_STRUCTURE_ADMINS.includes(caller.role ?? '')) return json({ error: 'Forbidden: only MASTER_ADMIN/ADMIN can edit tiers' }, 403);
        if (!params.code) return json({ error: 'code required' }, 400);
        const ALLOWED = ['name', 'rank', 'color', 'emoji', 'min_policies_count', 'min_premium_amount', 'coin_bonus_rate', 'l1_override_rate', 'l2_override_rate', 'benefits', 'requires_approval', 'approval_roles', 'is_active', 'is_default'];
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: caller.authId || null };
        for (const k of ALLOWED) { if (k in params) updates[k] = params[k]; }
        if (Object.keys(updates).length === 2) return json({ error: 'No valid fields to update' }, 400);

        // Only one default tier — clear the others first if this one is being set as default.
        if (updates.is_default === true) {
          await db.from('sp_agent_tiers').update({ is_default: false }).neq('code', params.code);
        }
        const { data, error } = await db.from('sp_agent_tiers').update(updates).eq('code', params.code).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_delete_tier': {
        if (!TIER_STRUCTURE_ADMINS.includes(caller.role ?? '')) return json({ error: 'Forbidden: only MASTER_ADMIN/ADMIN can delete tiers' }, 403);
        if (!params.code) return json({ error: 'code required' }, 400);
        const { count } = await db.from('sp_users').select('id', { count: 'exact', head: true }).eq('tier', params.code);
        if ((count ?? 0) > 0) return json({ error: `Tidak bisa dihapus: ${count} agen masih memiliki tier ini. Pindahkan mereka dahulu.` }, 400);
        const { error } = await db.from('sp_agent_tiers').update({ is_active: false }).eq('code', params.code);
        if (error) return json({ error: error.message }, 400);
        return json({ data: { success: true } });
      }

    case 'admin_reorder_tiers': {
        if (!TIER_STRUCTURE_ADMINS.includes(caller.role ?? '')) return json({ error: 'Forbidden: only MASTER_ADMIN/ADMIN can reorder tiers' }, 403);
        const order = params.order as Array<{ code: string; rank: number }> | undefined;
        if (!Array.isArray(order) || order.length === 0) return json({ error: 'order array required' }, 400);
        for (const { code, rank } of order) {
          await db.from('sp_agent_tiers').update({ rank, updated_at: new Date().toISOString() }).eq('code', code);
        }
        return json({ data: { success: true } });
      }

    case 'admin_assign_agent_tier': {
        if (!TIER_ASSIGNERS.includes(caller.role ?? '')) return json({ error: 'Your role is not permitted to assign tiers' }, 403);
        if (!params.agent_id || !params.tier_code) return json({ error: 'agent_id and tier_code required' }, 400);
        const [{ data: targetTier }, { data: agentRow }] = await Promise.all([
          db.from('sp_agent_tiers').select('*').eq('code', String(params.tier_code)).eq('is_active', true).maybeSingle(),
          db.from('sp_users').select('tier').eq('id', String(params.agent_id)).maybeSingle(),
        ]);
        if (!targetTier) return json({ error: 'Tier tidak ditemukan atau nonaktif' }, 404);
        try {
          const result = await applyOrQueueTier(db, String(params.agent_id), targetTier, agentRow?.tier ?? null, caller.authId, caller.role ?? '', 'MANUAL', params.reason ? String(params.reason) : undefined);
          return json({ data: result.data, pending: result.pending });
        } catch (e) {
          return json({ error: (e as Error).message }, 400);
        }
      }

    case 'admin_list_tier_requests': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        let q = db.from('sp_tier_change_requests').select('*, sp_users!agent_id(name, email, agent_code)').order('requested_at', { ascending: false }).limit(Number(params.limit ?? 200));
        if (params.status) q = q.eq('status', String(params.status));
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_approve_tier_request': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.request_id) return json({ error: 'request_id required' }, 400);
        const { data: reqRow, error: reqErr } = await db.from('sp_tier_change_requests').select('*').eq('id', params.request_id).maybeSingle();
        if (reqErr || !reqRow) return json({ error: 'Request not found' }, 404);
        if (reqRow.status !== 'PENDING') return json({ error: 'Request sudah diproses' }, 400);
        const { data: targetTier } = await db.from('sp_agent_tiers').select('*').eq('code', reqRow.requested_tier_code).maybeSingle();
        if (!targetTier) return json({ error: 'Tier target tidak ditemukan' }, 404);
        if (targetTier.requires_approval && !(targetTier.approval_roles ?? []).includes(caller.role ?? '')) {
          return json({ error: 'Role Anda tidak berwenang menyetujui tier ini' }, 403);
        }

        const ts = new Date().toISOString();
        await db.from('sp_users').update({ tier: targetTier.code, tier_assigned_by: caller.authId, tier_assigned_at: ts }).eq('id', reqRow.agent_id);
        await db.from('sp_agent_tier_history').insert({
          agent_id: reqRow.agent_id, tier_code: targetTier.code, previous_tier_code: reqRow.current_tier_code,
          source: reqRow.source === 'AUTO_ELIGIBLE' ? 'AUTO' : 'MANUAL', assigned_by: caller.authId, note: 'Disetujui via antrean persetujuan',
        });
        const { data, error } = await db.from('sp_tier_change_requests').update({ status: 'APPROVED', approved_by: caller.authId, approved_at: ts, updated_at: ts }).eq('id', params.request_id).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_reject_tier_request': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.request_id) return json({ error: 'request_id required' }, 400);
        const ts = new Date().toISOString();
        const { data, error } = await db.from('sp_tier_change_requests').update({
          status: 'REJECTED', rejected_by: caller.authId, rejected_at: ts,
          rejection_reason: params.reason ? String(params.reason) : null, updated_at: ts,
        }).eq('id', params.request_id).eq('status', 'PENDING').select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        if (!data) return json({ error: 'Request not found or already processed' }, 404);
        return json({ data });
      }

    case 'admin_evaluate_agent_tier': {
        if (!TIER_ASSIGNERS.includes(caller.role ?? '')) return json({ error: 'Your role is not permitted to evaluate tiers' }, 403);
        if (!params.agent_id) return json({ error: 'agent_id required' }, 400);
        const [{ data: tiers }, metrics, { data: agentRow }] = await Promise.all([
          db.from('sp_agent_tiers').select('*'),
          computeAgentMetrics(db, String(params.agent_id)),
          db.from('sp_users').select('tier').eq('id', String(params.agent_id)).maybeSingle(),
        ]);
        const suggested = resolveEligibleTier(tiers ?? [], metrics.policiesCount, metrics.totalPremium);
        if (!suggested) return json({ error: 'Tidak ada tier aktif untuk dievaluasi' }, 400);
        if (suggested.code === agentRow?.tier) return json({ data: { changed: false, tier: suggested.code, metrics } });
        if (!params.apply) return json({ data: { changed: true, suggested_tier: suggested.code, current_tier: agentRow?.tier ?? null, metrics } });
        try {
          const result = await applyOrQueueTier(db, String(params.agent_id), suggested, agentRow?.tier ?? null, caller.authId, caller.role ?? '', 'AUTO');
          return json({ data: { ...result.data, metrics }, pending: result.pending });
        } catch (e) {
          return json({ error: (e as Error).message }, 400);
        }
      }

    case 'admin_evaluate_all_agents': {
        if (!TIER_ASSIGNERS.includes(caller.role ?? '')) return json({ error: 'Your role is not permitted to evaluate tiers' }, 403);
        const [{ data: tiers }, { data: agents }] = await Promise.all([
          db.from('sp_agent_tiers').select('*'),
          db.from('sp_users').select('id, tier').eq('role', 'AGENT'),
        ]);
        let applied = 0, queued = 0, unchanged = 0;
        for (const agent of (agents ?? [])) {
          const metrics = await computeAgentMetrics(db, agent.id);
          const suggested = resolveEligibleTier(tiers ?? [], metrics.policiesCount, metrics.totalPremium);
          if (!suggested || suggested.code === agent.tier) { unchanged++; continue; }
          try {
            const result = await applyOrQueueTier(db, agent.id, suggested, agent.tier ?? null, caller.authId, caller.role ?? '', 'AUTO');
            if (result.pending) queued++; else applied++;
          } catch { /* skip agent on error, continue batch */ }
        }
        return json({ data: { total: (agents ?? []).length, applied, queued, unchanged } });
      }

    default:
      return null;
  }
}
