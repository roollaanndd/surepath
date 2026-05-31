import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Require a Bearer token (Supabase anon key or user JWT)
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')              ?? '';
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Resolve OpenRouter key from env first, fall back to Vault
    let OPENROUTER_KEY = Deno.env.get('OPENROUTER_KEY') ?? '';
    if (!OPENROUTER_KEY && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data } = await supabase.rpc('get_app_secret', { secret_name: 'OPENROUTER_KEY' });
      OPENROUTER_KEY = data ?? '';
    }

    if (!OPENROUTER_KEY) {
      console.error('OPENROUTER_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 503, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Forward the body as-is to OpenRouter (OpenAI-compatible format)
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
