
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

    // Atomically claim the withdrawal. Two requests may both have read APPROVED above;
    // the conditional update ensures only one can transition APPROVED → PROCESSING.
    // A failed/empty claim must never call Xendit.
    const { data: claimedWithdrawal, error: claimError } = await supabase
      .from('sp_withdrawals')
      .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
      .eq('id', withdrawal_id)
      .eq('status', 'APPROVED')
      .select('id')
      .maybeSingle();

    if (claimError) {
      console.error('Withdrawal claim failed:', claimError.code ?? 'unknown');
      return new Response(JSON.stringify({ error: 'Could not claim withdrawal for processing' }), {
        status: 409, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }
    if (!claimedWithdrawal) {
      return new Response(JSON.stringify({ error: 'Withdrawal is already being processed or is no longer approved' }), {
        status: 409, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

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
      // Provider error bodies may contain sensitive account/payment details.
      // Do not return or persist the raw body. The HTTP status is enough for triage.
      const providerStatus = xenditRes.status;
      console.error('Xendit disbursement response was not successful:', { status: providerStatus });

      // A 5xx response is ambiguous: the provider may have accepted the payout
      // before failing to respond. Keep the withdrawal PROCESSING and do not
      // refund the wallet automatically; an operator must reconcile provider state.
      if (providerStatus >= 500) {
        await supabase.from('sp_withdrawals').update({
          failure_reason: `Provider outcome uncertain (HTTP ${providerStatus}); reconciliation required`,
          updated_at: new Date().toISOString(),
        }).eq('id', withdrawal_id).eq('status', 'PROCESSING');

        return new Response(JSON.stringify({ error: 'Provider outcome uncertain; withdrawal requires reconciliation' }), {
          status: 502, headers: { ...CORS, 'Content-Type': 'application/json' }
        });
      }

      // A 4xx response indicates a rejected request; reverse the wallet deduction.
      await supabase.rpc('reverse_withdrawal', {
        p_withdrawal_id: withdrawal_id,
        p_agent_id:      wd.agent_id,
        p_amount:        wd.amount,
        p_reason:        `Disbursement rejected by provider (HTTP ${providerStatus})`,
      });

      await supabase.from('sp_withdrawals').update({
        status:         'FAILED',
        failure_reason: `Provider rejected disbursement (HTTP ${providerStatus})`,
        updated_at:     new Date().toISOString(),
      }).eq('id', withdrawal_id).eq('status', 'PROCESSING');

      // Notify agent
      await supabase.from('sp_notifications').insert({
        agent_id: wd.agent_id,
        type:     'SYSTEM',
        title:    'Penarikan Dana Gagal',
        body:     `Penarikan IDR ${wd.net_amount.toLocaleString('id-ID')} gagal diproses. Dana dikembalikan ke dompet Anda.`,
        metadata: { withdrawal_id },
        read:     false,
      });

      return new Response(JSON.stringify({ error: 'Xendit disbursement failed; contact an administrator if the issue persists' }), {
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
    // A network failure can happen after the provider accepted the payout.
    // Keep PROCESSING for reconciliation; do not automatically refund/retry an
    // outcome that is unknown, and never expose raw provider/runtime errors.
    console.error('xendit-disburse unexpected failure:', err instanceof Error ? err.name : 'unknown');
    return new Response(JSON.stringify({ error: 'Internal error; withdrawal requires reconciliation' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }
});
