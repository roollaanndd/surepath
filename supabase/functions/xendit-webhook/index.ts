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
    const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')          ?? '';
    const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabaseConfig = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Read secrets from Vault (fall back to env vars for local dev)
    let XENDIT_WEBHOOK_TOKEN = Deno.env.get('XENDIT_WEBHOOK_TOKEN') ?? '';
    let APP_URL = Deno.env.get('APP_URL') ?? '';
    if (!XENDIT_WEBHOOK_TOKEN || !APP_URL) {
      const [wt, au] = await Promise.all([
        supabaseConfig.rpc('get_app_secret', { secret_name: 'XENDIT_WEBHOOK_TOKEN' }),
        supabaseConfig.rpc('get_app_secret', { secret_name: 'APP_URL' }),
      ]);
      if (!XENDIT_WEBHOOK_TOKEN) XENDIT_WEBHOOK_TOKEN = wt.data ?? '';
      if (!APP_URL) APP_URL = au.data ?? 'https://myinsurepath.com';
    }

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

    const supabase = supabaseConfig;

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
      return new Response('ok', { status: 200, headers: CORS });
    }

    // If PAID — advance order to UNDER_REVIEW, auto-generate review token, notify all parties
    if (status === 'PAID' && payment.order_id) {
      // Fetch full order details
      const { data: order } = await supabase
        .from('sp_policy_orders')
        .select('agent_id, order_number, client_name, client_phone, product_name, total_premium, insurer_name')
        .eq('id', payment.order_id)
        .single();

      // Move order status: SUBMITTED → UNDER_REVIEW
      await supabase
        .from('sp_policy_orders')
        .update({ status: 'UNDER_REVIEW', updated_at: new Date().toISOString() })
        .eq('id', payment.order_id)
        .in('status', ['SUBMITTED']);

      if (order) {
        // Auto-generate review token if not already exists
        const { data: existingToken } = await supabase
          .from('sp_review_tokens')
          .select('token, review_url')
          .eq('order_id', payment.order_id)
          .limit(1)
          .maybeSingle();

        let reviewUrl = existingToken?.review_url;

        if (!existingToken) {
          const { data: newToken } = await supabase
            .from('sp_review_tokens')
            .insert({
              order_id:   payment.order_id,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .select('token')
            .single();

          if (newToken) {
            reviewUrl = `${APP_URL}/review/${(newToken as any).token}`;
            await supabase
              .from('sp_review_tokens')
              .update({ review_url: reviewUrl })
              .eq('token', (newToken as any).token);
          }
        }

        // Create admin broadcast notification with review link
        await supabase.from('sp_admin_notifications').insert({
          type:       'PAYMENT_CONFIRMED',
          title:      `Pembayaran Diterima – ${order.order_number ?? ''}`,
          body:       `Premi ${order.product_name} untuk ${order.client_name} telah dibayar. Order masuk antrean review.`,
          order_id:   payment.order_id,
          review_url: reviewUrl ?? null,
          metadata:   {
            amount:        paid_amount,
            payment_method,
            insurer_name:  order.insurer_name,
          },
          read: false,
        });

        // Notify agent
        if (order.agent_id) {
          await supabase.from('sp_notifications').insert({
            agent_id: order.agent_id,
            type:     'SYSTEM',
            title:    `Pembayaran Diterima – ${order.order_number ?? ''}`,
            body:     `Premi ${order.product_name ?? 'asuransi'} untuk ${order.client_name ?? ''} telah dibayar. Order sedang dalam review.`,
            metadata: { link: 'quotes', order_id: payment.order_id, review_url: reviewUrl ?? null },
            read:     false,
          });
        }

        // Send WhatsApp to agent
        if (order.agent_id) {
          const { data: agentUser } = await supabase
            .from('sp_users')
            .select('phone')
            .eq('id', order.agent_id)
            .single();

          if (agentUser?.phone) {
            const waMsg = `✅ *Pembayaran Diterima*\n\nOrder ${order.order_number ?? ''} untuk ${order.client_name ?? 'klien'} telah dibayar.\nProses review sedang berjalan.\n\nSurePath Insurance`;
            await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              },
              body: JSON.stringify({ phone: agentUser.phone, message: waMsg, event_type: 'PAYMENT_CONFIRMED' }),
            }).catch(() => {});
          }
        }

        // Credit agent wallet with commission earned on this order
        if (order.agent_id) {
          const { data: orderDetails } = await supabase
            .from('sp_policy_orders')
            .select('commission_amount, coin_reward, order_number')
            .eq('id', payment.order_id)
            .single();

          if (orderDetails?.commission_amount && orderDetails.commission_amount > 0) {
            await supabase.rpc('credit_agent_wallet', {
              p_agent_id:       order.agent_id,
              p_amount:         orderDetails.commission_amount,
              p_reference_id:   payment.order_id,
              p_reference_type: 'ORDER',
              p_description:    `Komisi order ${orderDetails.order_number ?? ''} telah dikreditkan`,
            });
          }
        }
      }
    }

    // If EXPIRED — update order and notify agent
    if (status === 'EXPIRED' && payment.order_id) {
      const { data: order } = await supabase
        .from('sp_policy_orders')
        .select('agent_id, order_number, product_name, client_name')
        .eq('id', payment.order_id)
        .single();

      if (order?.agent_id) {
        await supabase.from('sp_notifications').insert({
          agent_id: order.agent_id,
          type:     'SYSTEM',
          title:    `Invoice Kadaluarsa – ${order.order_number ?? ''}`,
          body:     `Invoice pembayaran untuk ${order.client_name} telah kadaluarsa. Buat invoice baru jika diperlukan.`,
          metadata: { link: 'quotes', order_id: payment.order_id },
          read:     false,
        });
      }
    }

    return new Response('ok', { status: 200, headers: CORS });

  } catch (err) {
    console.error('xendit-webhook error:', err);
    return new Response('ok', { status: 200, headers: CORS });
  }
});
