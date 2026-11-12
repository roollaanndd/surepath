// misc.ts — 4 actions
// Auto-generated from data-gateway/index.ts split
import type { GatewayContext, ActionResult } from './types.ts';
import { wrapUserContent, UNTRUSTED_INPUT_NOTICE } from '../../_shared/promptSafety.ts';

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
        const chatAllowed = await checkRateLimit(`user:${caller.spUser.id}`, 20);
        if (!chatAllowed) return json({ error: 'Terlalu banyak pesan. Coba lagi dalam 1 jam.' }, 429);
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
        // The caller's own display name is user-editable, so it never goes
        // into the system prompt — only the role (a fixed enum, not free
        // text) is safe to interpolate here.
        const systemPrompt = `You are Pathy, a friendly AI assistant for SurePath, an Indonesian InsurTech platform.
You are speaking with a user with role: ${caller.role ?? 'CUSTOMER'}.
You have READ-ONLY access to their data. You CANNOT modify, create, or delete anything.

User's policies:
${policySummary}

User's claims:
${claimSummary}

Guidelines:
- Be warm, concise, helpful. Max 3 sentences unless detailed steps are needed.
- Reply in the same language the user writes in (Bahasa Indonesia or English).
- For billing changes, cancellations, or urgent matters, recommend contacting an agent via WhatsApp.
- Never fabricate policy numbers, amounts, or dates not shown above.

${UNTRUSTED_INPUT_NOTICE}`;
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
            messages: [{ role: 'user', content: wrapUserContent(message) }],
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
        // FIX v2.8.20 (audit 2026-11-11): aksi lama membaca insurer_id/premium
        // dan membuang sisanya, padahal UI (B2BAdminView QuoteForm → website.ts
        // createB2BQuote) mengirim bentuk kanonik SpB2BQuote — insurer_name,
        // premium_amount, valid_until, terms. Hasilnya setiap penawaran
        // tersimpan dengan penanggung kosong dan premi Rp 0. Aksi kini menerima
        // bentuk kanonik, mengambil client_id dari baris pengajuan (bukan dari
        // params), menvalidasi isi, dan menyeragamkan status pengajuan ke
        // QUOTED di sisi server. Jika skema live masih menyimpan sisa kolom
        // lama, kolom yang tidak ada dilempar progresif sampai insert cocok.
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const submissionId = String(params.submission_id ?? '');
        if (!submissionId) return json({ error: 'submission_id required' }, 400);
        const { data: submission, error: subErr } = await db.from('sp_b2b_submissions')
          .select('id, client_id, company_name').eq('id', submissionId).maybeSingle();
        if (subErr) return json({ error: subErr.message }, 400);
        if (!submission) return json({ error: 'Submission not found' }, 404);

        const insurerName = String(params.insurer_name ?? params.insurer_id ?? '').trim();
        const premiumAmount = Number(params.premium_amount ?? params.premium ?? 0);
        const validUntil = params.valid_until ? String(params.valid_until) : null;
        const terms = params.terms !== undefined && params.terms !== null ? String(params.terms) : '';
        if (!insurerName) return json({ error: 'insurer_name wajib diisi' }, 400);
        if (!Number.isFinite(premiumAmount) || premiumAmount <= 0) return json({ error: 'premium_amount harus lebih besar dari nol' }, 400);
        if (!validUntil) return json({ error: 'valid_until wajib diisi' }, 400);

        let quoteRow: Record<string, unknown> = {
          submission_id: submissionId,
          client_id: submission.client_id,
          insurer_name: insurerName,
          premium_amount: premiumAmount,
          coverage_details: (params.coverage_details && typeof params.coverage_details === 'object') ? params.coverage_details : {},
          valid_until: validUntil,
          terms,
          status: 'PENDING',
        };
        // Toleransi drift skema: buang kolom yang tidak ada di tabel live satu
        // per satu berdasarkan pesan error PostgREST (maksimal 5 iterasi).
        let quote: Record<string, unknown> | null = null;
        let lastErr: { message: string } | null = null;
        for (let attempt = 0; attempt < 5 && !quote; attempt++) {
          const { data, error } = await db.from('sp_b2b_quotes').insert(quoteRow).select().single();
          if (!error) { quote = data; break; }
          lastErr = error;
          const m = error.message.match(/column ["']?([a-z_]+)["']? .*does not exist/i) ?? error.message.match(/["']([a-z_]+)["'] .*does not exist/i);
          const missing = m?.[1];
          if (!missing || !(missing in quoteRow)) break;
          delete quoteRow[missing];
        }
        if (!quote) return json({ error: lastErr?.message ?? 'Gagal menyimpan penawaran' }, 400);

        // Selaraskan status pengajuan — panggilan admin_update_b2b_submission
        // dari UI tetap aman karena idempoten.
        await db.from('sp_b2b_submissions').update({ status: 'QUOTED', updated_at: new Date().toISOString() })
          .eq('id', submissionId).then(() => {}, () => {});

        return json({ data: quote });
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

    // ─── save_quote — agent saves their quote ──────────────────────────────
    case 'save_quote': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        // FIX v1.50.0: use canonical sp_users.id so the quote shows up in the
        // agent's own list (which queries by sp_users.id).
        // FIX: the payload column is `quote_data` (NOT NULL). This wrote to
        // `details`, which does not exist on sp_quotes — so every save was
        // rejected and the agent's quote builder reported a save failure.
        const { data, error } = await db.from('sp_quotes').insert({
          agent_id: caller.ownerId,
          client_id: params.client_id ?? null,
          client_name: String(params.client_name ?? ''),
          product_type: String(params.product_type ?? 'CAR'),
          status: String(params.status ?? 'SENT'),
          premium_estimate: Number(params.premium_estimate ?? 0),
          quote_data: params.quote_data ?? params.details ?? {},
        }).select().single();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    default:
      return null; // Not handled by this module
  }
}
