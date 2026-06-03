import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';

serve(async (req) => {
  const CORS = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')  ?? '';
  const ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  // ── Auth: require a verified Supabase JWT (any authenticated user) ────────
  const { errorResponse } = await verifyAuth(req, SUPABASE_URL, ANON_KEY, undefined, CORS);
  if (errorResponse) return errorResponse;

  try {
    let OPENROUTER_KEY = Deno.env.get('OPENROUTER_KEY') ?? '';
    if (!OPENROUTER_KEY && SUPABASE_URL && SERVICE_KEY) {
      const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data } = await supabase.rpc('get_app_secret', { secret_name: 'OPENROUTER_KEY' });
      OPENROUTER_KEY = data ?? '';
    }

    if (!OPENROUTER_KEY) {
      console.error('OPENROUTER_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 503, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'HTTP-Referer':  'https://myinsurepath.com',
        'X-Title':       'SurePath',
      },
      body,
    });

    const responseText = await orRes.text();
    return new Response(responseText, {
      status:  orRes.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('ai-proxy error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
