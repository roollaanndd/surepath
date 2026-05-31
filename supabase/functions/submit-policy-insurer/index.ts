import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Adapters ──────────────────────────────────────────────────────────────────

async function manualAdapter(
  order: any,
  insurerName: string,
  supabase: ReturnType<typeof createClient>,
): Promise<{ policy_number: string | null; method: 'MANUAL' }> {
  const msg = `Pengajuan polis manual diperlukan untuk order ${order.order_number ?? order.id} ke ${insurerName}`;

  // Insert admin notification
  await supabase.from('sp_admin_notifications').insert({
    type: 'MANUAL_SUBMISSION',
    title: `Pengajuan Manual: ${order.order_number ?? order.id}`,
    body: msg,
    order_id: order.id,
    read: false,
  });

  console.log('manual adapter:', msg);
  return { policy_number: null, method: 'MANUAL' };
}

async function restAdapter(
  order: any,
  config: { api_endpoint: string; api_key: string; headers?: Record<string, string> },
  _supabase: ReturnType<typeof createClient>,
): Promise<{ policy_number: string | null; method: 'API' }> {
  const payload = {
    order_id:     order.id,
    order_number: order.order_number,
    client_name:  order.client_name,
    client_ktp:   order.client_ktp,
    vehicle:      order.vehicle_details,
    coverage:     order.coverage_type,
    sum_insured:  order.sum_insured,
    total_premium: order.total_premium,
    start_date:   order.start_date,
    end_date:     order.end_date,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.api_key}`,
    ...(config.headers ?? {}),
  };

  const res = await fetch(config.api_endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('restAdapter error:', res.status, errText);
    throw new Error(`Insurer API responded ${res.status}: ${errText}`);
  }

  const data = await res.json();
  // Expect insurer API to return { policy_number: string } or similar
  const policy_number: string | null = data?.policy_number ?? data?.policyNumber ?? data?.policy_no ?? null;

  return { policy_number, method: 'API' };
}

// ── Main Handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  try {
    const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return json({ success: false, error: 'Server misconfiguration' }, 500);
    }

    const { order_id } = await req.json() as { order_id: string };
    if (!order_id) return json({ success: false, error: 'order_id required' }, 400);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Fetch order
    const { data: order, error: orderErr } = await supabase
      .from('sp_policy_orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderErr || !order) {
      return json({ success: false, error: 'Order not found' }, 404);
    }

    // 2. Look up insurer from sp_insurer_products (joined on insurer_id)
    let insurerName = order.insurer_name ?? 'Penanggung';

    if (order.insurer_id) {
      const { data: insurerRow } = await supabase
        .from('sp_insurers')
        .select('name')
        .eq('id', order.insurer_id)
        .maybeSingle();
      if (insurerRow?.name) insurerName = insurerRow.name;
    }

    // 3. Check for API config (table may not exist yet)
    let apiConfig: { api_endpoint: string; api_key: string; headers?: Record<string, string> } | null = null;

    try {
      const { data: configRow } = await supabase
        .from('sp_insurer_api_configs')
        .select('api_endpoint, api_key, extra_headers')
        .eq('insurer_id', order.insurer_id ?? '')
        .eq('is_active', true)
        .maybeSingle();

      if (configRow?.api_endpoint && configRow?.api_key) {
        apiConfig = {
          api_endpoint: configRow.api_endpoint,
          api_key:      configRow.api_key,
          headers:      configRow.extra_headers ?? undefined,
        };
      }
    } catch {
      // Table doesn't exist yet — continue with manual flow
    }

    // 4. Route to adapter
    let policyNumber: string | null = null;
    let method: 'API' | 'MANUAL';

    if (apiConfig) {
      const adapterResult = await restAdapter(order, apiConfig, supabase);
      policyNumber = adapterResult.policy_number;
      method = adapterResult.method;
    } else {
      const adapterResult = await manualAdapter(order, insurerName, supabase);
      policyNumber = adapterResult.policy_number;
      method = adapterResult.method;
    }

    // 5. Update order if we received a policy number
    if (policyNumber) {
      await supabase
        .from('sp_policy_orders')
        .update({ policy_number: policyNumber, updated_at: new Date().toISOString() })
        .eq('id', order_id);
    }

    return json({
      success: true,
      order_id,
      order_number: order.order_number,
      policy_number: policyNumber,
      method,
      insurer_name: insurerName,
    });

  } catch (err) {
    console.error('submit-policy-insurer error:', err);
    return json({ success: false, error: String(err) }, 500);
  }
});
