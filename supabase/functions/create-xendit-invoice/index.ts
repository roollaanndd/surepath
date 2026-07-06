
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';

// ─── Create Xendit Invoice ───────────────────────────────────────────────────
//
// SECURITY: This function previously trusted the client-supplied `total_premium`,
// `client_name`, `client_email`, `client_phone`, and `order_id` verbatim. A
// malicious user could create an invoice for someone else's order with a
// tampered amount, pay it, and have the order marked UNDER_REVIEW + commission
// credited at the (fraudulent) amount stored on the order row.
//
// Fixed flow:
//   1. Verify the caller is authenticated AND owns the order (agent_id or
//      client_id match) — never trust the request body's order_id alone.
//   2. Fetch `total_premium`, `client_*`, `product_name` from sp_policy_orders
//      in the DB. Ignore any client-supplied values for these fields.
//   3. Use the DB-sourced amount for the Xendit invoice.
//   4. Redact Xendit error details in the response (log full error server-side).

Deno.serve(async (req) => {
  const CORS = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')             ?? '';
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const ANON_KEY             = Deno.env.get('SUPABASE_ANON_KEY')         ?? '';

  try {
    const body = await req.json().catch(() => ({}));
    const { order_id } = body as { order_id?: string };

    if (!order_id) {
      return json(CORS, { error: 'order_id is required' }, 400);
    }

    // ── Auth + ownership verification ──────────────────────────────────────
    // Use serviceKey so verifyAuth can look up the caller's role via sp_users.
    const { caller, errorResponse } = await verifyAuth(req, SUPABASE_URL, ANON_KEY, SUPABASE_SERVICE_KEY, CORS);
    if (errorResponse) return errorResponse;
    if (!caller) {
      return json(CORS, { error: 'Unauthorized' }, 401);
    }

    // ── Fetch the order from the DB (service_role bypasses RLS) ────────────
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: order, error: orderErr } = await supabase
      .from('sp_policy_orders')
      .select('id, order_number, agent_id, client_id, client_name, client_phone, product_name, total_premium, status')
      .eq('id', order_id)
      .maybeSingle();

    if (orderErr) {
      console.error('create-xendit-invoice: order fetch error:', orderErr);
      return json(CORS, { error: 'Could not load order' }, 500);
    }
    if (!order) {
      return json(CORS, { error: 'Order not found' }, 404);
    }

    // Ownership: caller must be the agent or the client on the order.
    // Admins can also create invoices for any order (for support scenarios).
    const isOwner = order.agent_id === caller.authId || order.client_id === caller.authId;
    if (!isOwner && !caller.isAdmin) {
      return json(CORS, { error: 'Forbidden: you do not own this order' }, 403);
    }

    // Status check: only SUBMITTED orders can have invoices created.
    // (UNDER_REVIEW / APPROVED / ISSUED / CANCELLED / REJECTED are past the
    // payment step or have been cancelled.)
    if (order.status !== 'SUBMITTED') {
      return json(CORS, { error: `Order is not in a payable state (status: ${order.status})` }, 409);
    }

    // ── Server-side amount validation ──────────────────────────────────────
    const totalPremium = Number(order.total_premium);
    if (!Number.isFinite(totalPremium) || totalPremium <= 0) {
      console.error(`create-xendit-invoice: order ${order_id} has invalid total_premium=${order.total_premium}`);
      return json(CORS, { error: 'Order amount is invalid' }, 500);
    }
    // Xendit minimum invoice amount is Rp 1,000
    if (totalPremium < 1000) {
      return json(CORS, { error: 'Order amount below minimum (Rp 1,000)' }, 400);
    }

    // ── Resolve secrets from Vault ─────────────────────────────────────────
    const [xskRes, appUrlRes] = await Promise.all([
      supabase.rpc('get_app_secret', { secret_name: 'XENDIT_SECRET_KEY' }),
      supabase.rpc('get_app_secret', { secret_name: 'APP_URL' }),
    ]);
    const XENDIT_SECRET_KEY = Deno.env.get('XENDIT_SECRET_KEY') || xskRes.data || '';
    const APP_URL = Deno.env.get('APP_URL') || appUrlRes.data || 'https://myinsurepath.com';

    if (!XENDIT_SECRET_KEY) {
      console.error('create-xendit-invoice: XENDIT_SECRET_KEY not configured');
      return json(CORS, { error: 'Payment service not configured' }, 500);
    }

    // ── Build Xendit invoice (all PII from DB, never from request body) ────
    const external_id = `${order.order_number ?? order.id}-${Date.now()}`;
    const customerPhone = order.client_phone
      ? `+62${String(order.client_phone).replace(/^0/, '').replace(/\D/g, '')}`
      : undefined;

    const xenditPayload: Record<string, unknown> = {
      external_id,
      amount:           totalPremium,
      description:      `Premi Asuransi – ${order.product_name ?? 'SurePath Insurance'}`,
      invoice_duration: 86400, // 24 hours
      currency:         'IDR',
      customer: {
        given_names:   order.client_name ?? 'Customer',
        mobile_number: customerPhone,
        // email deliberately omitted — Xendit sends invoice emails that could
        // be used for phishing if a malicious actor could substitute an
        // arbitrary email. Admin notifications go through SurePath's own
        // notify-admin flow.
      },
      customer_notification_preference: {
        invoice_created:  ['whatsapp'],
        invoice_reminder: ['whatsapp'],
        invoice_paid:     ['whatsapp'],
      },
      items: [
        {
          name:     order.product_name ?? 'Insurance Premium',
          quantity: 1,
          price:    totalPremium,
          category: 'Insurance',
        },
      ],
      payment_methods:       ['VIRTUAL_ACCOUNT', 'QR_CODE', 'EWALLET', 'CREDIT_CARD'],
      success_redirect_url:  `${APP_URL}/payment/success?order=${order.id}`,
      failure_redirect_url:  `${APP_URL}/payment/failed?order=${order.id}`,
    };

    const xenditRes = await fetch('https://api.xendit.co/v2/invoices', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Basic ${btoa(XENDIT_SECRET_KEY + ':')}`,
      },
      body: JSON.stringify(xenditPayload),
    });

    if (!xenditRes.ok) {
      const errText = await xenditRes.text();
      console.error('create-xendit-invoice: Xendit API error:', xenditRes.status, errText);
      // Don't echo upstream error details to the client
      return json(CORS, { error: 'Payment provider error' }, 502);
    }

    const xenditData = await xenditRes.json();
    const { id: xendit_invoice_id, invoice_url, status } = xenditData;

    // ── Persist payment record ──────────────────────────────────────────────
    const { error: dbErr } = await supabase.from('sp_payments').insert({
      order_id: order.id,
      external_id,
      xendit_invoice_id,
      invoice_url,
      amount:   totalPremium,
      currency: 'IDR',
      status:   status ?? 'PENDING',
    });

    if (dbErr) {
      console.error('create-xendit-invoice: DB insert error:', dbErr);
      // Don't fail the response — the invoice was created and the user needs
      // the URL to pay. The next webhook will reconcile.
    }

    return json(CORS, {
      invoice_url,
      xendit_invoice_id,
      external_id,
      status: 'PENDING',
    }, 200);
  } catch (err) {
    console.error('create-xendit-invoice error:', err);
    return json(CORS, { error: 'Internal error' }, 500);
  }
});

function json(CORS: Record<string, string>, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
