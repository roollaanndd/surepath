import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-callback-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const XENDIT_WEBHOOK_TOKEN = Deno.env.get('XENDIT_WEBHOOK_TOKEN') ?? '';
    const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')          ?? '';
    const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Verify Xendit callback token
    const callbackToken = req.headers.get('x-callback-token') ?? '';
    if (XENDIT_WEBHOOK_TOKEN && callbackToken !== XENDIT_WEBHOOK_TOKEN) {
      console.warn('Invalid webhook token');
      return new Response('Unauthorized', { status: 401, headers: CORS });
    }

    const payload = await req.json();
    console.log('Xendit webhook payload:', JSON.stringify(payload));

    const { external_id, id: xendit_invoice_id, status, payment_method, payment_channel, paid_amount, paid_at, payer_email } = payload;

    if (!external_id) {
      return new Response('Missing external_id', { status: 400, headers: CORS });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Update sp_payments
    const { data: payment, error: payErr } = await supabase
      .from('sp_payments')
      .update({
        status:          status?.toUpperCase() ?? 'PENDING',
        payment_method:  payment_method ?? null,
        payment_channel: payment_channel ?? null,
        paid_amount:     paid_amount ?? null,
        paid_at:         paid_at ? new Date(paid_at).toISOString() : null,
        payer_email:     payer_email ?? null,
        xendit_payload:  payload,
        updated_at:      new Date().toISOString(),
      })
      .eq('external_id', external_id)
      .select('order_id, amount')
      .single();

    if (payErr || !payment) {
      console.error('Payment update error:', payErr);
      // Still return 200 so Xendit doesn't retry indefinitely
      return new Response('ok', { status: 200, headers: CORS });
    }

    // If payment is PAID — advance the policy order to UNDER_REVIEW and notify agent
    if (status === 'PAID' && payment.order_id) {
      // Get order details for the notification
      const { data: order } = await supabase
        .from('sp_policy_orders')
        .select('agent_id, order_number, client_name, product_name, total_premium')
        .eq('id', payment.order_id)
        .single();

      // Move order status: SUBMITTED → UNDER_REVIEW (payment confirmed)
      await supabase
        .from('sp_policy_orders')
        .update({
          status:     'UNDER_REVIEW',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.order_id)
        .in('status', ['SUBMITTED']); // only advance if still at SUBMITTED

      // Notify agent
      if (order?.agent_id) {
        await supabase.from('sp_notifications').insert({
          agent_id: order.agent_id,
          type:     'SYSTEM',
          title:    `Pembayaran Diterima – ${order.order_number ?? ''}`,
          body:     `Premi ${order.product_name ?? 'asuransi'} untuk ${order.client_name ?? ''} telah dibayar. Order sedang dalam review.`,
          metadata: { link: 'quotes', order_id: payment.order_id },
          read:     false,
        });
      }
    }

    return new Response('ok', { status: 200, headers: CORS });

  } catch (err) {
    console.error('xendit-webhook error:', err);
    // Return 200 to prevent Xendit from retrying on our bug
    return new Response('ok', { status: 200, headers: CORS });
  }
});
