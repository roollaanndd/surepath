
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAuth, adminOnly } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const CORS = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS });

  try {
    const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')             ?? '';
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const ANON_KEY             = Deno.env.get('SUPABASE_ANON_KEY')         ?? '';

    // ── Auth: require a verified admin JWT ────────────────────────────────
    const { caller, errorResponse } = await verifyAuth(req, SUPABASE_URL, ANON_KEY, SUPABASE_SERVICE_KEY, CORS);
    if (errorResponse) return errorResponse;
    const denied = adminOnly(caller!, CORS);
    if (denied) return denied;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get Xendit key from Vault
    let XENDIT_SECRET_KEY = Deno.env.get('XENDIT_SECRET_KEY') ?? '';
    if (!XENDIT_SECRET_KEY) {
      const { data } = await supabase.rpc('get_app_secret', { secret_name: 'XENDIT_SECRET_KEY' });
      XENDIT_SECRET_KEY = data ?? '';
    }
    if (!XENDIT_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'XENDIT_SECRET_KEY not configured' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    const { withdrawal_id } = await req.json();
    if (!withdrawal_id) {
      return new Response(JSON.stringify({ error: 'withdrawal_id required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    // Fetch withdrawal + agent details
    const { data: wd, error: wdErr } = await supabase
      .from('sp_withdrawals')
      .select('*, sp_users!agent_id(name, email, phone)')
      .eq('id', withdrawal_id)
      .single();

    if (wdErr || !wd) {
      return new Response(JSON.stringify({ error: 'Withdrawal not found' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    if (wd.status !== 'APPROVED') {
      return new Response(JSON.stringify({ error: 'Withdrawal not in APPROVED state' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    // Mark as PROCESSING first to prevent double-trigger
    await supabase.from('sp_withdrawals')
      .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
      .eq('id', withdrawal_id);

    const external_id = `WD-${withdrawal_id.replace(/-/g, '').slice(0, 16)}-${Date.now()}`;

    // Call Xendit Disbursement API
    const xenditBody = {
      external_id,
      bank_code:            wd.bank_code,
      account_holder_name:  wd.account_holder_name,
      account_number:       wd.account_number,
      description:          `SurePath Agent Commission Withdrawal`,
      amount:               wd.net_amount,
    };

    const xenditRes = await fetch('https://api.xendit.co/disbursements', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Basic ${btoa(XENDIT_SECRET_KEY + ':')}`,
      },
      body: JSON.stringify(xenditBody),
    });

    if (!xenditRes.ok) {
      const errText = await xenditRes.text();
      console.error('Xendit disbursement error:', errText);

      // Reverse the wallet deduction
      await supabase.rpc('reverse_withdrawal', {
        p_withdrawal_id: withdrawal_id,
        p_agent_id:      wd.agent_id,
        p_amount:        wd.amount,
        p_reason:        'Disbursement gagal: ' + errText.slice(0, 100),
      });

      await supabase.from('sp_withdrawals').update({
        status:         'FAILED',
        failure_reason: errText.slice(0, 500),
        updated_at:     new Date().toISOString(),
      }).eq('id', withdrawal_id);

      // Notify agent
      await supabase.from('sp_notifications').insert({
        agent_id: wd.agent_id,
        type:     'SYSTEM',
        title:    'Penarikan Dana Gagal',
        body:     `Penarikan IDR ${wd.net_amount.toLocaleString('id-ID')} gagal diproses. Dana dikembalikan ke dompet Anda.`,
        metadata: { withdrawal_id },
        read:     false,
      });

      return new Response(JSON.stringify({ error: 'Xendit disbursement failed', detail: errText }), {
        status: 502, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    const xenditData = await xenditRes.json();

    await supabase.from('sp_withdrawals').update({
      status:                 'DISBURSED',
      xendit_disbursement_id: xenditData.id,
      xendit_reference:       external_id,
      disbursed_at:           new Date().toISOString(),
      updated_at:             new Date().toISOString(),
    }).eq('id', withdrawal_id);

    // Notify agent of success
    await supabase.from('sp_notifications').insert({
      agent_id: wd.agent_id,
      type:     'SYSTEM',
      title:    'Penarikan Dana Berhasil',
      body:     `IDR ${wd.net_amount.toLocaleString('id-ID')} telah ditransfer ke rekening ${wd.bank_code} ${wd.account_number}.`,
      metadata: { withdrawal_id, xendit_disbursement_id: xenditData.id },
      read:     false,
    });

    return new Response(
      JSON.stringify({ success: true, xendit_disbursement_id: xenditData.id }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('xendit-disburse error:', err);
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }
});
