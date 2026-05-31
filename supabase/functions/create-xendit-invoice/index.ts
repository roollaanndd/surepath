import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')        ?? '';
    const SUPABASE_SERVICE_KEY= Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Read config secrets from Vault
    const vaultClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const [xsk, appUrlRes] = await Promise.all([
      vaultClient.rpc('get_app_secret', { secret_name: 'XENDIT_SECRET_KEY' }),
      vaultClient.rpc('get_app_secret', { secret_name: 'APP_URL' }),
    ]);
    const APP_URL = Deno.env.get('APP_URL') || appUrlRes.data || 'https://myinsurepath.com';

    // Resolve XENDIT_SECRET_KEY (env var takes priority, then Vault result from above)
    const XENDIT_SECRET_KEY = Deno.env.get('XENDIT_SECRET_KEY') || xsk.data || '';

    if (!XENDIT_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'XENDIT_SECRET_KEY not configured' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { order_id, order_number, client_name, client_email, client_phone, product_name, total_premium, items } = body;

    if (!order_id || !total_premium) {
      return new Response(JSON.stringify({ error: 'order_id and total_premium are required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    // external_id must be unique per invoice
    const external_id = `${order_number ?? order_id}-${Date.now()}`;

    // Build Xendit invoice payload
    const xenditPayload: Record<string, unknown> = {
      external_id,
      amount:           total_premium,
      description:      `Premi Asuransi – ${product_name ?? 'SurePath Insurance'}`,
      invoice_duration: 86400, // 24 hours
      currency:         'IDR',
      customer: {
        given_names:   client_name   ?? 'Customer',
        email:         client_email  ?? undefined,
        mobile_number: client_phone  ? `+62${client_phone.replace(/^0/, '').replace(/\D/g, '')}` : undefined,
      },
      customer_notification_preference: {
        invoice_created:  ['whatsapp', 'email'],
        invoice_reminder: ['whatsapp'],
        invoice_paid:     ['whatsapp', 'email'],
      },
      items: items ?? [
        {
          name:     product_name ?? 'Insurance Premium',
          quantity: 1,
          price:    total_premium,
          category: 'Insurance',
        },
      ],
      payment_methods:       ['VIRTUAL_ACCOUNT', 'QR_CODE', 'EWALLET', 'CREDIT_CARD'],
      success_redirect_url:  `${APP_URL}/payment/success?order=${order_id}`,
      failure_redirect_url:  `${APP_URL}/payment/failed?order=${order_id}`,
    };

    // Call Xendit API
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
      console.error('Xendit error:', errText);
      return new Response(JSON.stringify({ error: 'Xendit API error', detail: errText }), {
        status: 502, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    const xenditData = await xenditRes.json();
    const { id: xendit_invoice_id, invoice_url, status } = xenditData;

    // Persist payment record in Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error: dbErr } = await supabase.from('sp_payments').insert({
      order_id,
      external_id,
      xendit_invoice_id,
      invoice_url,
      amount:   total_premium,
      currency: 'IDR',
      status:   status ?? 'PENDING',
    });

    if (dbErr) console.error('DB insert error:', dbErr);

    return new Response(
      JSON.stringify({ invoice_url, xendit_invoice_id, external_id, status: 'PENDING' }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('create-xendit-invoice error:', err);
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }
});
