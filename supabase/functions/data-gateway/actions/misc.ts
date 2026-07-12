// misc.ts — 4 actions
// Auto-generated from data-gateway/index.ts split
import type { GatewayContext, ActionResult } from './types.ts';

// json() helper — returns ActionResult (main index.ts converts to Response)
const json = (body: unknown, status = 200): ActionResult => ({ status, body });

export async function handleMiscAction(action: string, ctx: GatewayContext): Promise<ActionResult | null> {
  const { db, params, caller, sendTelegram, logActivity, checkRateLimit, RESEND_KEY } = ctx;

  switch (action) {
    case 'pathy_chat': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
        if (!ANTHROPIC_KEY) return json({ error: 'AI not configured' }, 503);
        const message = (params?.message as string | undefined)?.trim() ?? '';
        if (!message) return json({ error: 'No message provided' }, 400);
        const [ordersRes, claimsRes] = await Promise.all([
          db.from('sp_policy_orders').select('order_number,product_name,status,created_at').eq('client_id', caller.spUser.id).limit(10),
          db.from('sp_claims').select('claim_number,status,created_at').eq('user_id', caller.spUser.id).limit(5),
        ]);
        const policySummary = (ordersRes.data ?? [])
          .map((o: any) => `- ${o.order_number}: ${o.product_name} (${o.status})`)
          .join('\n') || 'No active policies.';
        const claimSummary = (claimsRes.data ?? [])
          .map((c: any) => `- ${c.claim_number}: ${c.status}`)
          .join('\n') || 'No claims.';
        const systemPrompt = `You are Pathy, a friendly AI assistant for SurePath, an Indonesian InsurTech platform.
You are speaking with ${caller.spUser.name ?? 'a user'} (role: ${caller.role ?? 'CUSTOMER'}).
You have READ-ONLY access to their data. You CANNOT modify, create, or delete anything.

User's policies:
${policySummary}

User's claims:
${claimSummary}

Guidelines:
- Be warm, concise, helpful. Max 3 sentences unless detailed steps are needed.
- Reply in the same language the user writes in (Bahasa Indonesia or English).
- For billing changes, cancellations, or urgent matters, recommend contacting an agent via WhatsApp.
- Never fabricate policy numbers, amounts, or dates not shown above.`;
        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 512,
            system: systemPrompt,
            messages: [{ role: 'user', content: message }],
          }),
        });
        if (!aiRes.ok) return json({ error: `AI service error: ${aiRes.status}` }, 502);
        const aiJson = await aiRes.json();
        const reply = aiJson.content?.[0]?.text ?? 'Maaf, tidak bisa memproses permintaan saat ini.';
        return json({ data: { reply } });
      }

    case 'admin_update_b2b_submission': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const subId = String(params.submission_id ?? '');
        if (!subId) return json({ error: 'submission_id required' }, 400);
        const ALLOWED = ['status', 'notes', 'quoted_premium', 'assigned_to'];
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const k of ALLOWED) { if (k in params) updates[k] = params[k]; }
        const { data, error } = await db.from('sp_b2b_submissions').update(updates).eq('id', subId).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_create_b2b_quote': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const { data, error } = await db.from('sp_b2b_quotes').insert({
          submission_id: String(params.submission_id ?? ''),
          insurer_id: String(params.insurer_id ?? ''),
          premium: Number(params.premium ?? 0),
          coverage_details: params.coverage_details ?? {},
          status: 'PENDING',
        }).select().single();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_update_life_application': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const appId = String(params.application_id ?? '');
        if (!appId) return json({ error: 'application_id required' }, 400);
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (params.status) updates.status = String(params.status);
        if (params.notes !== undefined) updates.insurer_notes = params.notes;
        if (params.policy_number !== undefined) updates.policy_number = params.policy_number;
        const { data, error } = await db.from('sp_life_applications').update(updates).eq('id', appId).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    default:
      return null; // Not handled by this module
  }
}
