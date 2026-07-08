// agents.ts — 5 actions
// Auto-generated from data-gateway/index.ts split
import type { GatewayContext, ActionResult } from './types.ts';

// json() helper — returns ActionResult (main index.ts converts to Response)
const json = (body: unknown, status = 200): ActionResult => ({ status, body });

export async function handleAgentsAction(action: string, ctx: GatewayContext): Promise<ActionResult | null> {
  const { db, params, caller, sendTelegram, logActivity, checkRateLimit, RESEND_KEY } = ctx;

  switch (action) {
    case 'admin_list_pending_agents': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const { data: agents, error: agErr } = await db.from('sp_users')
          .select('id, email, name, phone, agent_code, ktp, address, trust_score, commission_rate, profile_photo_url, ktp_document_url, verified, created_at')
          .eq('role', 'AGENT')
          .eq('verified', false)
          .order('created_at', { ascending: false })
          .limit(Number(params.limit ?? 100));
        if (agErr) return json({ error: agErr.message }, 400);
        // Fetch agreements for these agent ids (parallel)
        const agentIds = (agents ?? []).map((a: any) => a.id);
        let agreements: any[] = [];
        if (agentIds.length > 0) {
          const { data: agrData } = await db.from('sp_agent_agreements')
            .select('agent_id, agreement_no, full_name, ktp_number, accepted_at, user_agent')
            .in('agent_id', agentIds)
            .order('accepted_at', { ascending: false });
          agreements = agrData ?? [];
        }
        // Map: agent_id → latest agreement
        const agrMap: Record<string, any> = {};
        for (const a of agreements) {
          if (!agrMap[a.agent_id]) agrMap[a.agent_id] = a; // first = latest (sorted desc)
        }
        const result = (agents ?? []).map((a: any) => ({
          ...a,
          agreement: agrMap[a.id] ?? null,
        }));
        return json({ data: result });
      }

    case 'admin_get_agent_detail': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.agent_id) return json({ error: 'agent_id required' }, 400);
        const { data: agent, error: agErr } = await db.from('sp_users')
          .select('*')
          .eq('id', String(params.agent_id))
          .maybeSingle();
        if (agErr) return json({ error: agErr.message }, 400);
        if (!agent) return json({ error: 'Agent not found' }, 404);
        // Fetch all agreements for this agent (history)
        const { data: agrHistory } = await db.from('sp_agent_agreements')
          .select('id, agreement_no, doc_version, full_name, ktp_number, accepted_at, user_agent')
          .eq('agent_id', String(params.agent_id))
          .order('accepted_at', { ascending: false });
        return json({ data: { agent, agreements: agrHistory ?? [] } });
      }

    case 'admin_verify_agent': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.agent_id) return json({ error: 'agent_id required' }, 400);
        const approve = params.approve !== false; // default true
        const { data, error } = await db.from('sp_users')
          .update({
            verified: !!approve,
            trust_score: approve ? 85 : 50,
            updated_at: new Date().toISOString(),
          })
          .eq('id', String(params.agent_id))
          .select('id, name, email, verified, trust_score')
          .maybeSingle();
        if (error) return json({ error: error.message }, 400);
        // Insert admin notification about the decision
        db.from('sp_admin_notifications').insert({
          type: approve ? 'AGENT_VERIFIED' : 'AGENT_REJECTED',
          title: approve ? 'Agen Diverifikasi' : 'Agen Ditolak',
          body: `${String((data as any)?.name ?? 'Agen')} (${String((data as any)?.email ?? '')}) ${approve ? 'telah diverifikasi' : 'ditolak oleh operator'}.`,
          read: false,
          metadata: { agent_id: params.agent_id, approved: approve, reviewer_id: caller.authId },
        }).then(() => {}, () => {});
        return json({ data });
      }

    case 'admin_list_clients': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        // Non-admins can only see their own clients; admins can see all
        let q = db.from('sp_clients').select('*').order('created_at', { ascending: false }).limit(Number(params.limit ?? 200));
        if (caller.isAdmin && params.agent_id) {
          q = q.eq('agent_id', params.agent_id);
        } else if (!caller.isAdmin) {
          q = q.eq('agent_id', caller.spUser.id);
        }
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_list_policies': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        let q = db.from('sp_policies').select('*').order('created_at', { ascending: false }).limit(Number(params.limit ?? 200));
        if (params.agent_id) q = q.eq('agent_id', params.agent_id);
        if (params.status)   q = q.eq('status', params.status);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    default:
      return null; // Not handled by this module
  }
}
