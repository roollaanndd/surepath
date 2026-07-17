// quotations.ts — e-quotation actions (3 actions)
//
// Backs the QR code printed on every quotation slip PDF:
//   save_quotation            (authed)  — snapshot a generated quotation
//   get_public_quotation      (public)  — load the e-quotation page by code
//   confirm_public_quotation  (public)  — customer signals intent to proceed
//
// The public confirm is an intent signal only; binding confirmation always
// remains with the insurer (stated on the PDF and the e-quotation page).

import type { GatewayContext, ActionResult } from './types.ts';

const json = (body: unknown, status = 200): ActionResult => ({ status, body });

// Payload fields safe to expose on the public e-quotation page. The stored
// payload is a full QuotationSlipData snapshot; chassis/engine numbers and
// address stay server-side.
const PUBLIC_PAYLOAD_FIELDS = [
  'quotationNumber', 'slipType', 'issueDate', 'productName', 'productLine',
  'preparedForCompany', 'insurer', 'insurerShort', 'insurerLogoUrl',
  'periodStart', 'periodEnd', 'objectSummary',
  'coverageCondition', 'additionalCoverage', 'deductible', 'klausulList',
  'sumInsuredItems', 'totalSumInsured', 'currency',
  'premiumComponents', 'subtotalPremium', 'discountLabel', 'discountAmount',
  'premiumAfterDiscount', 'policyFee', 'stampDuty', 'totalPremium',
  'subjectivityList', 'termsList',
  'bankName', 'bankAccount', 'bankAccountName', 'paymentDueDate', 'transferMemo',
  'agentName', 'agentPhone', 'validUntil',
];

function publicPayload(payload: Record<string, unknown> | null): Record<string, unknown> {
  const src = payload ?? {};
  const out: Record<string, unknown> = {};
  for (const k of PUBLIC_PAYLOAD_FIELDS) {
    if (src[k] !== undefined) out[k] = src[k];
  }
  return out;
}

export async function handleQuotationsAction(action: string, ctx: GatewayContext): Promise<ActionResult | null> {
  const { db, params, caller, checkRateLimit } = ctx;

  switch (action) {
    // ── save_quotation (authed) ─────────────────────────────────────────────
    // Upserts by code so re-downloading the same quotation refreshes the
    // snapshot instead of duplicating rows.
    case 'save_quotation': {
      if (!caller.spUser) return json({ error: 'No profile' }, 403);
      const allowed = await checkRateLimit(`user:${caller.spUser.id}`, 60);
      if (!allowed) return json({ error: 'Rate limit exceeded. Coba lagi dalam 1 jam.' }, 429);

      const code = String(params.code ?? '').trim();
      const payload = (params.payload ?? {}) as Record<string, unknown>;
      const quotationNumber = String(params.quotation_number ?? payload.quotationNumber ?? '').trim();
      if (!/^[A-Za-z0-9_-]{8,40}$/.test(code)) return json({ error: 'Invalid quotation code' }, 400);
      if (!quotationNumber) return json({ error: 'Missing quotation number' }, 400);

      const row = {
        code,
        quotation_number: quotationNumber,
        product_type: String(params.product_type ?? 'MOTOR').slice(0, 20),
        product_name: params.product_name ? String(params.product_name).slice(0, 120) : null,
        payload,
        customer_name: params.customer_name ? String(params.customer_name).slice(0, 120) : null,
        insurer_name: params.insurer_name ? String(params.insurer_name).slice(0, 120) : null,
        agent_name: params.agent_name ? String(params.agent_name).slice(0, 120) : null,
        agent_phone: params.agent_phone ? String(params.agent_phone).slice(0, 32) : null,
        total_premium: typeof params.total_premium === 'number' ? params.total_premium : null,
        valid_until: params.valid_until ? String(params.valid_until).slice(0, 10) : null,
        source_app: params.source_app ? String(params.source_app).slice(0, 20) : null,
        created_by: caller.spUser.id,
        order_id: params.order_id ? String(params.order_id) : null,
        // QR link lives 14 days from (re)generation — re-downloading the PDF
        // refreshes the window. Separate from valid_until (commercial validity).
        link_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await db
        .from('sp_quotations')
        .upsert(row, { onConflict: 'code' })
        .select('id, code')
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ data });
    }

    // ── get_public_quotation (public, rate-limited by IP in index.ts) ──────
    case 'get_public_quotation': {
      const code = String(params.code ?? '').trim();
      if (!/^[A-Za-z0-9_-]{8,40}$/.test(code)) return json({ error: 'Invalid quotation code' }, 400);

      const { data: q, error } = await db
        .from('sp_quotations')
        .select('code, quotation_number, product_type, product_name, status, payload, customer_name, insurer_name, agent_name, agent_phone, total_premium, valid_until, link_expires_at, confirmed_at, created_at')
        .eq('code', code)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!q) return json({ error: 'Quotation not found' }, 404);

      // First open marks it viewed (best-effort, non-blocking)
      if (q.status === 'SENT') {
        db.from('sp_quotations')
          .update({ status: 'VIEWED', viewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('code', code)
          .then(() => {}, () => {});
      }

      // Expired when the commercial validity passed OR the 14-day QR link
      // window (link_expires_at, null on pre-migration rows) has closed.
      const expired =
        (q.valid_until ? new Date(q.valid_until + 'T23:59:59') < new Date() : false) ||
        (q.link_expires_at ? new Date(q.link_expires_at) < new Date() : false);
      return json({
        data: {
          code: q.code,
          quotation_number: q.quotation_number,
          product_type: q.product_type,
          product_name: q.product_name,
          status: expired && q.status !== 'CONFIRMED' && q.status !== 'PAID' ? 'EXPIRED' : q.status,
          customer_name: q.customer_name,
          insurer_name: q.insurer_name,
          agent_name: q.agent_name,
          agent_phone: q.agent_phone,
          total_premium: q.total_premium,
          valid_until: q.valid_until,
          link_expires_at: q.link_expires_at,
          confirmed_at: q.confirmed_at,
          created_at: q.created_at,
          payload: publicPayload(q.payload),
        },
      });
    }

    // ── confirm_public_quotation (public, rate-limited by IP in index.ts) ──
    case 'confirm_public_quotation': {
      const code = String(params.code ?? '').trim();
      if (!/^[A-Za-z0-9_-]{8,40}$/.test(code)) return json({ error: 'Invalid quotation code' }, 400);
      const name = String(params.name ?? '').trim().slice(0, 120);
      const phone = String(params.phone ?? '').trim().slice(0, 32);
      if (!name) return json({ error: 'Nama wajib diisi' }, 400);

      const { data: q, error } = await db
        .from('sp_quotations')
        .select('id, code, quotation_number, status, customer_name, agent_name, total_premium, valid_until, link_expires_at')
        .eq('code', code)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!q) return json({ error: 'Quotation not found' }, 404);
      if (q.status === 'PAID') return json({ error: 'Quotation sudah dibayar' }, 409);
      if (
        (q.valid_until && new Date(q.valid_until + 'T23:59:59') < new Date()) ||
        (q.link_expires_at && new Date(q.link_expires_at) < new Date())
      ) {
        return json({ error: 'Quotation sudah kedaluwarsa. Hubungi agen/tim SurePath untuk penawaran baru.' }, 410);
      }

      const { error: updErr } = await db
        .from('sp_quotations')
        .update({
          status: 'CONFIRMED',
          confirmed_at: new Date().toISOString(),
          confirmed_name: name,
          confirmed_phone: phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('code', code);
      if (updErr) return json({ error: updErr.message }, 500);

      ctx.sendTelegram(
        `✅ <b>E-Quotation dikonfirmasi</b>\n` +
        `No: ${q.quotation_number}\n` +
        `Nasabah: ${name}${phone ? ` (${phone})` : ''}\n` +
        `Agen: ${q.agent_name ?? '-'}\n` +
        `Premi: ${q.total_premium ?? '-'}\n` +
        `https://myinsurepath.com/q/${q.code}`
      );

      return json({ data: { ok: true, status: 'CONFIRMED' } });
    }

    default:
      return null;
  }
}
