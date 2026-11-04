
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';

// ─── Create Xendit Invoice for a B2B bulk batch ─────────────────────────────
//
// Mirrors create-xendit-invoice, for sp_b2b_batches instead of
// sp_policy_orders: one aggregate invoice settles an entire uploaded fleet
// (e.g. 253 financed vehicles' TLO premium in one shot). Same discipline —
// the amount is always read from the DB row the gateway already computed
// and persisted (never from the request body), and the caller must own the
// batch (or be an admin).

Deno.serve(async (req) => {
  const CORS = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')             ?? '';
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const ANON_KEY             = Deno.env.get('SUPABASE_ANON_KEY')         ?? '';

  try {
    const body = await req.json().catch(() => ({}));
    const { batch_id } = body as { batch_id?: string };

    if (!batch_id) {
      return json(CORS, { error: 'batch_id is required' }, 400);
    }

    const { caller, errorResponse } = await verifyAuth(req, SUPABASE_URL, ANON_KEY, SUPABASE_SERVICE_KEY, CORS);
    if (errorResponse) return errorResponse;
    if (!caller) {
      return json(CORS, { error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: batch, error: batchErr } = await supabase
      .from('sp_b2b_batches')
      .select('id, batch_number, client_id, company_name, item_count, total_amount, status')
      .eq('id', batch_id)
      .maybeSingle();

    if (batchErr) {
      console.error('create-b2b-bulk-invoice: batch fetch error:', batchErr);
      return json(CORS, { error: 'Could not load batch' }, 500);
    }
    if (!batch) {
      return json(CORS, { error: 'Batch not found' }, 404);
    }

    const isOwner = batch.client_id === caller.authId;
    if (!isOwner && !caller.isAdmin) {
      return json(CORS, { error: 'Forbidden: you do not own this batch' }, 403);
    }

    if (batch.status !== 'SUBMITTED') {
      return json(CORS, { error: `Batch is not in a payable state (status: ${batch.status})` }, 409);
    }

    const totalAmount = Number(batch.total_amount);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      console.error(`create-b2b-bulk-invoice: batch ${batch_id} has invalid total_amount=${batch.total_amount}`);
      return json(CORS, { error: 'Batch amount is invalid' }, 500);
    }
    if (totalAmount < 1000) {
      return json(CORS, { error: 'Batch amount below minimum (Rp 1,000)' }, 400);
    }

    const [xskRes, appUrlRes] = await Promise.all([
      supabase.rpc('get_app_secret', { secret_name: 'XENDIT_SECRET_KEY' }),
      supabase.rpc('get_app_secret', { secret_name: 'APP_URL' }),
    ]);
    const XENDIT_SECRET_KEY = Deno.env.get('XENDIT_SECRET_KEY') || xskRes.data || '';
    const APP_URL = Deno.env.get('APP_URL') || appUrlRes.data || 'https://myinsurepath.com';

    if (!XENDIT_SECRET_KEY) {
      console.error('create-b2b-bulk-invoice: XENDIT_SECRET_KEY not configured');
      return json(CORS, { error: 'Payment service not configured' }, 500);
    }

    const external_id = `${batch.batch_number ?? batch.id}-${Date.now()}`;

    const xenditPayload: Record<string, unknown> = {
      external_id,
      amount:           totalAmount,
      description:      `Premi Asuransi TLO Massal – ${batch.company_name ?? 'B2B'} (${batch.item_count} unit)`,
      invoice_duration: 86400, // 24 hours
      currency:         'IDR',
      customer: {
        given_names: batch.company_name ?? 'B2B Client',
      },
      customer_notification_preference: {
        invoice_created:  ['whatsapp'],
        invoice_reminder: ['whatsapp'],
        invoice_paid:     ['whatsapp'],
      },
      items: [
        {
          name:     `TLO Massal — ${batch.item_count} unit`,
          quantity: 1,
          price:    totalAmount,
          category: 'Insurance',
        },
      ],
      payment_methods:       ['VIRTUAL_ACCOUNT', 'QR_CODE', 'EWALLET', 'CREDIT_CARD'],
      success_redirect_url:  `${APP_URL}/payment/success?batch=${batch.id}`,
      failure_redirect_url:  `${APP_URL}/payment/failed?batch=${batch.id}`,
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
      console.error('create-b2b-bulk-invoice: Xendit API error:', xenditRes.status, errText);
      return json(CORS, { error: 'Payment provider error' }, 502);
    }

    const xenditData = await xenditRes.json();
    const { id: xendit_invoice_id, invoice_url, status } = xenditData;

    const { error: dbErr } = await supabase.from('sp_payments').insert({
      batch_id: batch.id,
      external_id,
      xendit_invoice_id,
      invoice_url,
      amount:   totalAmount,
      currency: 'IDR',
      status:   status ?? 'PENDING',
    });

    if (dbErr) {
      console.error('create-b2b-bulk-invoice: DB insert error:', dbErr);
    }

    await supabase.from('sp_b2b_batches').update({ status: 'INVOICED', updated_at: new Date().toISOString() }).eq('id', batch.id).eq('status', 'SUBMITTED');

    return json(CORS, {
      invoice_url,
      xendit_invoice_id,
      external_id,
      status: 'PENDING',
    }, 200);
  } catch (err) {
    console.error('create-b2b-bulk-invoice error:', err);
    return json(CORS, { error: 'Internal error' }, 500);
  }
});

function json(CORS: Record<string, string>, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
