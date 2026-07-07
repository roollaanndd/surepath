
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAuth, adminOnly } from '../_shared/auth.ts';

const SYSTEM_PROMPT = `You are an experienced CFO and financial controller at PT Ruang Proteksi Indonesia, an Indonesian insurtech company. You analyze financial data including GWP (Gross Written Premium), commissions, claim payouts, and transaction anomalies.

You are cautious, detail-oriented, and always look for:
1. Revenue trends and growth rates
2. Commission rate compliance (should not exceed agreed rates)
3. Claim ratio health (claims/GWP < 70% is healthy)
4. Anomalous transactions (unusually large, duplicate, or suspicious)
5. Cash flow position
6. Agent performance outliers

Always respond with ONLY valid JSON (no markdown) in this exact shape:
{
  "health_score": <integer 0-100>,
  "summary": {
    "total_gwp": <number>,
    "total_commissions": <number>,
    "total_claims": <number>,
    "commission_ratio": <float 0-1>,
    "claim_ratio": <float 0-1>,
    "net_revenue": <number>
  },
  "anomalies": [
    { "severity": "LOW|MEDIUM|HIGH|CRITICAL", "description": "<Indonesian>", "amount": <number|null> }
  ],
  "recommendations": [
    { "priority": "LOW|MEDIUM|HIGH", "action": "<Indonesian action item>", "impact": "<expected outcome>" }
  ],
  "insights": "<2-3 paragraph narrative in Indonesian analyzing the financial position>",
  "alerts": ["<critical items needing immediate attention in Indonesian>"]
}

Be thorough, conservative, and flag anything unusual. Use Bahasa Indonesia for all text fields.`;

Deno.serve(async (req) => {
  const CORS = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const ANON_KEY             = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  // ── Auth: admin only ──────────────────────────────────────────────────────
  const { caller, errorResponse } = await verifyAuth(req, SUPABASE_URL, ANON_KEY, SUPABASE_SERVICE_KEY, CORS);
  if (errorResponse) return errorResponse;
  const denied = adminOnly(caller!, CORS);
  if (denied) return denied;

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    const { period_days = 30 } = await req.json().catch(() => ({}));
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);


    const since = new Date(Date.now() - period_days * 86400000).toISOString();

    // Fetch financial data in parallel
    const [ordersRes, commissionsRes, paymentsRes] = await Promise.all([
      supabase.from('sp_policy_orders').select('id, order_number, status, total_premium, commission_amount, insurer_name, agent_id, created_at').gte('created_at', since).order('created_at', { ascending: false }),
      supabase.from('sp_commissions').select('id, agent_id, premium_amount, commission_amount, status, created_at').gte('created_at', since),
      supabase.from('sp_payments').select('id, order_id, amount, paid_amount, status, payment_method, created_at').gte('created_at', since),
    ]);

    const orders      = (ordersRes.data ?? []) as any[];
    const commissions = (commissionsRes.data ?? []) as any[];
    const payments    = (paymentsRes.data ?? []) as any[];

    // Pre-compute metrics
    const issuedOrders = orders.filter((o: any) => o.status === 'ISSUED');
    const totalGWP     = issuedOrders.reduce((s: number, o: any) => s + (o.total_premium ?? 0), 0);
    const paidPayments = payments.filter((p: any) => p.status === 'PAID');
    const totalPaid    = paidPayments.reduce((s: number, p: any) => s + (p.paid_amount ?? p.amount ?? 0), 0);
    const totalComm    = commissions.reduce((s: number, c: any) => s + (c.commission_amount ?? 0), 0);

    // Agent commission summary
    const agentCommMap: Record<string, number> = {};
    commissions.forEach((c: any) => {
      agentCommMap[c.agent_id] = (agentCommMap[c.agent_id] ?? 0) + (c.commission_amount ?? 0);
    });
    const topAgentComm = Object.entries(agentCommMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Status distribution
    const statusDist: Record<string, number> = {};
    orders.forEach((o: any) => { statusDist[o.status] = (statusDist[o.status] ?? 0) + 1; });

    // Large transaction flag (>50M IDR single payment)
    const largeTransactions = paidPayments.filter((p: any) => (p.paid_amount ?? p.amount ?? 0) > 50_000_000);

    const userContent = `Analisis data keuangan SurePath untuk ${period_days} hari terakhir (sejak ${since.slice(0,10)}):

RINGKASAN ORDER:
- Total pesanan: ${orders.length}
- Distribusi status: ${JSON.stringify(statusDist)}
- Order diterbitkan (ISSUED): ${issuedOrders.length}
- Total GWP (dari order ISSUED): Rp ${totalGWP.toLocaleString('id-ID')}

PEMBAYARAN:
- Total transaksi pembayaran: ${payments.length}
- Pembayaran berhasil (PAID): ${paidPayments.length}
- Total premi diterima: Rp ${totalPaid.toLocaleString('id-ID')}
- Metode pembayaran: ${JSON.stringify(paidPayments.reduce((acc: any, p: any) => { acc[p.payment_method ?? 'unknown'] = (acc[p.payment_method ?? 'unknown'] ?? 0) + 1; return acc; }, {}))}
- Transaksi > 50 Juta: ${largeTransactions.length} transaksi (perlu verifikasi)

KOMISI:
- Total catatan komisi: ${commissions.length}
- Total komisi dibayar: Rp ${totalComm.toLocaleString('id-ID')}
- Rasio komisi/GWP: ${totalGWP > 0 ? ((totalComm / totalGWP) * 100).toFixed(1) : '0'}%
- Top 5 agen (komisi): ${JSON.stringify(topAgentComm)}

KONDISI KESEHATAN:
- Perbedaan GWP vs pembayaran diterima: Rp ${Math.abs(totalGWP - totalPaid).toLocaleString('id-ID')}
- Pending orders (SUBMITTED + UNDER_REVIEW): ${(statusDist['SUBMITTED'] ?? 0) + (statusDist['UNDER_REVIEW'] ?? 0)}
- Rejected orders: ${statusDist['REJECTED'] ?? 0}

Berikan analisis keuangan lengkap dalam format JSON yang ditentukan.`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      return new Response(JSON.stringify({ error: 'Claude API error', detail: err }), {
        status: 502, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content?.[0]?.text ?? '{}';

    let analysis: any;
    try {
      analysis = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]+\}/);
      analysis = match ? JSON.parse(match[0]) : { health_score: 0, insights: rawText, anomalies: [], recommendations: [], alerts: [], summary: {} };
    }

    return new Response(JSON.stringify({
      ...analysis,
      period_days,
      generated_at: new Date().toISOString(),
      raw_metrics: { totalGWP, totalPaid, totalComm, orderCount: orders.length },
    }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('ai-finance-review error:', err);
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }
});
