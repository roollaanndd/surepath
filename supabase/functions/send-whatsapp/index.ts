import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Server-to-server only (called from xendit-webhook edge function). No browser CORS needed.

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('62')) return digits;
  return '62' + digits;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Content-Type': 'application/json' } });

  const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')          ?? '';
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const { phone, message, event_type = 'GENERAL' } = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: 'phone and message are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const target = normalizePhone(phone);

    // Read FONNTE_TOKEN from Vault (fall back to env for local dev)
    let FONNTE_TOKEN = Deno.env.get('FONNTE_TOKEN') ?? '';
    if (!FONNTE_TOKEN) {
      const { data } = await supabase.rpc('get_app_secret', { secret_name: 'FONNTE_TOKEN' });
      FONNTE_TOKEN = data ?? '';
    }

    let status   = 'FAILED';
    let response = '';

    if (!FONNTE_TOKEN) {
      console.warn('FONNTE_TOKEN not set — WhatsApp message not sent');
      response = 'FONNTE_TOKEN missing';
    } else {
      const fRes = await fetch('https://api.fonnte.com/send', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: FONNTE_TOKEN,
        },
        body: JSON.stringify({
          target,
          message,
          countryCode: '62',
        }),
      });

      const fData = await fRes.json();
      response = JSON.stringify(fData);

      if (fData.status === true || fData.status === 'true') {
        status = 'SENT';
      } else {
        console.error('Fonnte error:', response);
        status = 'FAILED';
      }
    }

    // Log to sp_wa_logs
    await supabase.from('sp_wa_logs').insert({
      phone:      target,
      message,
      event_type,
      status,
      response,
      sent_at:    new Date().toISOString(),
    }).then(({ error: logErr }) => {
      if (logErr) console.warn('sp_wa_logs insert failed:', logErr.message);
    });

    if (status === 'SENT') {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ error: 'Fonnte delivery failed', detail: response }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('send-whatsapp error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
