
import { createClient } from 'npm:@supabase/supabase-js@2';

// ─── Send WhatsApp ───────────────────────────────────────────────────────────
//
// SECURITY HISTORY:
// Previous version had no authentication. Anyone with the function URL could
// send arbitrary WhatsApp messages from SurePath's official number to any
// phone — enabling cost abuse, phishing, and spam.
//
// FIXED: Accepts EITHER:
//   (a) A Supabase service_role key in the Authorization header (for
//       server-to-server calls from other edge functions like xendit-webhook)
//   (b) A valid Supabase JWT + admin role (for admin-triggered messages,
//       future feature)
//
// Browser-origin requests without a valid admin JWT are rejected.

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('62')) return digits;
  return '62' + digits;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Content-Type': 'application/json' } });

  const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')          ?? '';
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const ANON_KEY             = Deno.env.get('SUPABASE_ANON_KEY')         ?? '';

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ANON_KEY) {
    console.error('send-whatsapp: missing env vars');
    return jsonResponse({ error: 'Server misconfiguration' }, 500);
  }

  // ── Auth check ──────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return jsonResponse({ error: 'Unauthorized: missing bearer token' }, 401);
  }

  // Path A: caller is another edge function using the service_role key
  if (token === SUPABASE_SERVICE_KEY) {
    // Authorized — proceed
  } else {
    // Path B: caller is a browser/admin — verify the JWT and require admin role
    try {
      const authClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData, error: userErr } = await authClient.auth.getUser();
      if (userErr || !userData?.user) {
        return jsonResponse({ error: 'Unauthorized: invalid token' }, 401);
      }
      const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data: spUser } = await db
        .from('sp_users')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle();
      const ADMIN_ROLES = ['MASTER_ADMIN', 'ADMIN', 'FINANCE', 'FINANCE_MANAGER', 'FINANCE_DIRECTOR', 'INSURANCE_ADMIN'];
      if (!spUser?.role || !ADMIN_ROLES.includes(spUser.role)) {
        return jsonResponse({ error: 'Forbidden: admin only' }, 403);
      }
    } catch (e) {
      console.warn('send-whatsapp auth check failed:', e);
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const { phone, message, event_type = 'GENERAL' } = await req.json();

    if (!phone || !message) {
      return jsonResponse({ error: 'phone and message are required' }, 400);
    }

    // Cap message length to prevent abuse
    if (message.length > 2000) {
      return jsonResponse({ error: 'Message too long (max 2000 chars)' }, 400);
    }

    const target = normalizePhone(phone);

    // Read FONNTE_TOKEN from Vault (fall back to env for local dev)
    let FONNTE_TOKEN = Deno.env.get('FONNTE_TOKEN') ?? '';
    if (!FONNTE_TOKEN) {
      const { data } = await supabase.rpc('get_app_secret', { secret_name: 'FONNTE_TOKEN' });
      FONNTE_TOKEN = data ?? '';
    }

    let status = 'FAILED';
    let response = '';

    if (!FONNTE_TOKEN) {
      console.warn('FONNTE_TOKEN not set — WhatsApp message not sent');
      response = 'FONNTE_TOKEN missing';
    } else {
      const fRes = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
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

    // Log to sp_wa_logs (truncate response to 500 chars to avoid bloat)
    await supabase.from('sp_wa_logs').insert({
      phone:      target,
      message,
      event_type,
      status,
      response:   response.slice(0, 500),
      sent_at:    new Date().toISOString(),
    }).then(({ error: logErr }) => {
      if (logErr) console.warn('sp_wa_logs insert failed:', logErr.message);
    });

    if (status === 'SENT') {
      return jsonResponse({ success: true }, 200);
    }

    return jsonResponse({ error: 'Fonnte delivery failed' }, 502);
  } catch (err) {
    console.error('send-whatsapp error:', err);
    return jsonResponse({ error: 'Internal error' }, 500);
  }
});
