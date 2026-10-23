
import { createClient } from 'npm:@supabase/supabase-js@2';

// Server-to-server: called by Xendit payment gateway (no browser CORS needed).
const CORS = { 'Content-Type': 'application/json' };

Deno.serve(async (req) => {
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

    // Verify Xendit callback token — fail-closed: reject if token not configured
    const callbackToken = req.headers.get('x-callback-token') ?? '';
    if (!XENDIT_WEBHOOK_TOKEN) {
      console.error('XENDIT_WEBHOOK_TOKEN not set — rejecting webhook');
      return new Response('Server misconfiguration', { status: 500, headers: CORS });
    }
    if (callbackToken !== XENDIT_WEBHOOK_TOKEN) {
      console.warn('Invalid webhook token');
      return new Response('Unauthorized', { status: 401, headers: CORS });
    }

    const payload = await req.json();
    // SECURITY: do not log full payload — it contains payer_email, phone, etc.
    // Log only the fields we act on.
    console.log('Xendit webhook:', {
      external_id: payload?.external_id,
      status: payload?.status,
      payment_method: payload?.payment_method,
      paid_amount: payload?.paid_amount,
    });

    const { external_id, id: xendit_invoice_id, status, payment_method, payment_channel, paid_amount, paid_at } = payload;
    const normalizedStatus = typeof status === 'string' ? status.toUpperCase() : 'PENDING';

    if (!external_id) {
      return new Response('Missing external_id', { status: 400, headers: CORS });
    }

    const supabase = supabaseConfig;

    // ── IDEMPOTENCY: fetch the existing payment row first ─────────────────
    // Xendit retries webhooks on non-2xx and sometimes on network timeouts.
    // If this payment was already marked PAID, this is a replay — return 200
    // immediately without re-crediting commission / coins / overrides.
    const { data: existingPayment } = await supabase
      .from('sp_payments')
      .select('id, status, order_id')
      .eq('external_id', external_id)
      .maybeSingle();

    if (existingPayment?.status === 'PAID') {
      console.log(`Webhook replay for ${external_id} — already PAID, skipping commission credit`);
      return new Response('ok', { status: 200, headers: CORS });
    }

    // Update sp_payments
    const { data: payment, error: payErr } = await supabase
      .from('sp_payments')
      .update({
        status:          normalizedStatus,
        payment_method:  payment_method ?? null,
        payment_channel: payment_channel ?? null,
        paid_amount:     paid_amount ?? null,
        paid_at:         paid_at ? new Date(paid_at).toISOString() : null,
        payer_email:     null, // drop PII we don't need
        xendit_payload:  { external_id, status, payment_method, payment_channel, paid_amount, paid_at },
        updated_at:      new Date().toISOString(),
      })
      .eq('external_id', external_id)
      // Atomic replay guard: PostgreSQL rechecks this predicate after a concurrent
      // update commits, so only one PAID callback can transition this row and run
      // the downstream wallet/commission side effects.
      .neq('status', 'PAID')
      .select('order_id, amount')
      .maybeSingle();

    if (payErr) {
      console.error('Payment update failed:', payErr.code ?? 'unknown');
      return new Response('ok', { status: 200, headers: CORS });
    }
    if (!payment) {
      // Already PAID (including a concurrent duplicate), or no matching payment.
      // Never repeat downstream credits for a callback that did not claim the row.
      return new Response('ok', { status: 200, headers: CORS });
    }

    // If PAID — advance order to UNDER_REVIEW, auto-generate review token, notify all parties
    if (normalizedStatus === 'PAID' && payment.order_id) {
      // ── AMOUNT VERIFICATION: prevent fraud via tampered order rows ──────
      // Compare the amount Xendit actually received against the order's
      // total_premium. If they don't match (within Rp 100 rounding tolerance),
      // do NOT credit commission — flag for manual review.
      const { data: order } = await supabase
        .from('sp_policy_orders')
        .select('agent_id, order_number, client_name, client_phone, product_name, product_code, total_premium, insurer_name, commission_amount, commission_rate, coin_reward')
        .eq('id', payment.order_id)
        .single();

      const expectedAmount = Number(order?.total_premium ?? 0);
      const actualPaid = Number(paid_amount ?? 0);
      const amountMismatch = order && Math.abs(actualPaid - expectedAmount) > 100;

      if (amountMismatch) {
        console.error(`Amount mismatch for order ${payment.order_id}: expected ${expectedAmount}, paid ${actualPaid}`);
        // Mark the order for manual review instead of auto-advancing.
        await supabase
          .from('sp_policy_orders')
          .update({
            status: 'SUBMITTED',
            updated_at: new Date().toISOString(),
            // Stash the mismatch in metadata for the admin to investigate
            // (assumes a jsonb column exists; if not, this is a no-op)
          })
          .eq('id', payment.order_id)
          .in('status', ['SUBMITTED']);

        await supabase.from('sp_admin_notifications').insert({
          type:     'PAYMENT_AMOUNT_MISMATCH',
          title:    `Mismatch Pembayaran – ${order?.order_number ?? ''}`,
          body:     `Dibayar Rp ${actualPaid.toLocaleString('id-ID')}, seharusnya Rp ${expectedAmount.toLocaleString('id-ID')}. Order memerlukan review manual.`,
          order_id: payment.order_id,
          metadata: { expected: expectedAmount, paid: actualPaid },
          read:     false,
        });

        return new Response('ok', { status: 200, headers: CORS });
      }

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
            const waMsg = `✅ *Pembayaran Diterima*\n\nOrder ${order.order_number ?? ''} untuk ${order.client_name ?? 'klien'} telah dibayar.\nProses review sedang berjalan.\n\nPT Ruang Proteksi Indonesia`;
            await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              },
              body: JSON.stringify({ phone: agentUser.phone, message: waMsg, event_type: 'PAYMENT_CONFIRMED' }),
            }).then(() => {}, () => {});
          }
        }

        // Credit agent wallet + tier-based coin bonus + 2-layer downline overrides
        // `order` already includes commission_amount + coin_reward + order_number
        // from the amount-verification fetch above; no second DB call needed.
        if (order.agent_id) {
          const orderDetails = order;

          if (orderDetails?.commission_amount && orderDetails.commission_amount > 0) {
            // Fetch selling agent's tier and upline chain (max 2 levels)
            const { data: agentRow } = await supabase
              .from('sp_users')
              .select('upline_id, tier')
              .eq('id', order.agent_id)
              .single();

            // Live tier rates from sp_agent_tiers (CMS-configurable) — fetch the
            // full set once; cheap and keeps this in sync with the admin panel
            // instead of a hardcoded duplicate that silently drifts.
            const { data: tierRows } = await supabase
              .from('sp_agent_tiers')
              .select('code, coin_bonus_rate, l1_override_rate, l2_override_rate, is_default');
            const TIER_CFG: Record<string, { coinBonusRate: number; l1OverrideRate: number; l2OverrideRate: number }> = {};
            let defaultCode = 'STANDARD';
            for (const r of (tierRows ?? []) as any[]) {
              TIER_CFG[r.code] = { coinBonusRate: Number(r.coin_bonus_rate ?? 0), l1OverrideRate: Number(r.l1_override_rate ?? 0), l2OverrideRate: Number(r.l2_override_rate ?? 0) };
              if (r.is_default) defaultCode = r.code;
            }
            const STANDARD_CFG = TIER_CFG[defaultCode] ?? { coinBonusRate: 0, l1OverrideRate: 0.02, l2OverrideRate: 0 };

            // 1. Credit selling agent's commission
            await supabase.rpc('credit_agent_wallet', {
              p_agent_id:       order.agent_id,
              p_amount:         orderDetails.commission_amount,
              p_reference_id:   payment.order_id,
              p_reference_type: 'ORDER',
              p_description:    `Komisi order ${orderDetails.order_number ?? ''} telah dikreditkan`,
            });

            // 1b. Record the same commission in sp_commissions.
            //
            // credit_agent_wallet() moves the money; this row is what people
            // actually read. The agent's Komisi page, admin_financial_reports,
            // admin_stats and admin_transaksi_overview all aggregate
            // sp_commissions — and until now nothing but admin_create_commission
            // ever wrote to it. The result was two ledgers that could never
            // agree: wallet balances growing while the P&L reported Rp 0 of
            // commission expense.
            //
            // No extra replay guard is needed. The sp_payments update above
            // claims the row with `.neq('status','PAID')`, so only one callback
            // reaches this block per payment.
            const { error: commErr } = await supabase.from('sp_commissions').insert({
              agent_id:          order.agent_id,
              order_id:          payment.order_id,
              order_number:      orderDetails.order_number ?? null,
              client_name:       orderDetails.client_name ?? null,
              product_type:      orderDetails.product_code ?? orderDetails.product_name ?? null,
              premium_amount:    orderDetails.total_premium ?? null,
              commission_rate:   orderDetails.commission_rate ?? null,
              commission_amount: orderDetails.commission_amount,
              status:            'PAID',
              paid_at:           new Date().toISOString(),
              coin_reward:       orderDetails.coin_reward ?? 0,
            });
            if (commErr) console.error('Commission ledger insert failed:', commErr.code ?? 'unknown');

            // 2. Tier-based coin bonus for selling agent.
            // The base coin reward is awarded by the Admin policy-issuance flow;
            // this payment webhook only adds the configured tier bonus.
            const agentTierCfg = agentRow?.tier ? (TIER_CFG[agentRow.tier] ?? STANDARD_CFG) : STANDARD_CFG;
            if (orderDetails.coin_reward && orderDetails.coin_reward > 0 && agentTierCfg.coinBonusRate > 0) {
              const bonusCoins = Math.round(orderDetails.coin_reward * agentTierCfg.coinBonusRate);
              if (bonusCoins > 0) {
                const { error: coinErr } = await supabase.from('sp_coin_ledger').insert({
                  agent_id:    order.agent_id,
                  coins:       bonusCoins,
                  rp_value:    bonusCoins * 1000,
                  type:        'EARNED',
                  order_id:    payment.order_id,
                  description: `Bonus koin tier ${agentRow?.tier} – order ${orderDetails.order_number ?? ''}`,
                });
                if (coinErr) console.error('Tier coin bonus credit failed:', coinErr.code ?? 'unknown');
              }
            }

            // 3. L1 upline override (based on L1 upline's own tier)
            if (agentRow?.upline_id) {
              const { data: l1Row } = await supabase
                .from('sp_users')
                .select('upline_id, tier')
                .eq('id', agentRow.upline_id)
                .single();

              const l1TierCfg = l1Row?.tier ? (TIER_CFG[l1Row.tier] ?? STANDARD_CFG) : STANDARD_CFG;
              const l1Override = Math.round(orderDetails.commission_amount * l1TierCfg.l1OverrideRate);
              if (l1Override > 0) {
                await supabase.rpc('credit_override_commission', {
                  p_upline_id:    agentRow.upline_id,
                  p_amount:       l1Override,
                  p_reference_id: payment.order_id,
                  p_description:  `Override L1 dari downline – order ${orderDetails.order_number ?? ''}`,
                });
              }

              // 4. L2 upline override (grandparent — max 2 levels)
              if (l1Row?.upline_id) {
                const { data: l2Row } = await supabase
                  .from('sp_users')
                  .select('tier')
                  .eq('id', l1Row.upline_id)
                  .single();

                const l2TierCfg = l2Row?.tier ? (TIER_CFG[l2Row.tier] ?? STANDARD_CFG) : STANDARD_CFG;
                const l2Override = Math.round(orderDetails.commission_amount * l2TierCfg.l2OverrideRate);
                if (l2Override > 0) {
                  await supabase.rpc('credit_override_commission', {
                    p_upline_id:    l1Row.upline_id,
                    p_amount:       l2Override,
                    p_reference_id: payment.order_id,
                    p_description:  `Override L2 dari downline – order ${orderDetails.order_number ?? ''}`,
                  });
                }
              }
            }
          }
        }
      }

      // ── Customer referral reward (double-sided Rp 25k/Rp 25k) ───────────
      // If the paying customer has an upline_id (referrer), and this is the
      // referee's first PAID order, credit both sides with a Rp 25k discount
      // token. Idempotent via UNIQUE(referrer_id, referee_id) constraint.
      if (order.agent_id) {
        try {
          // Check if the customer (agent_id on a self-purchase order) has a referrer
          const { data: customerProfile } = await supabase
            .from('sp_users')
            .select('upline_id, role, name')
            .eq('id', order.agent_id)
            .single();

          if (customerProfile?.upline_id && customerProfile.role === 'CUSTOMER') {
            // Check if this is the referee's first PAID order
            const { count: paidOrderCount } = await supabase
              .from('sp_payments')
              .select('id', { count: 'exact', head: true })
              .eq('order_id' as any, payment.order_id)  // current order
              .eq('status', 'PAID');

            // Check if this order_id is the first PAID for this customer
            // (simpler: just check if a referral reward already exists for this pair)
            const { data: existingReward } = await supabase
              .from('sp_referral_rewards')
              .select('id')
              .eq('referrer_id', customerProfile.upline_id)
              .eq('referee_id', order.agent_id)
              .maybeSingle();

            if (!existingReward) {
              // Credit referrer: Rp 25k discount token
              await supabase.from('sp_referral_rewards').insert({
                referrer_id: customerProfile.upline_id,
                referee_id:  order.agent_id,
                order_id:    payment.order_id,
                reward_type: 'DISCOUNT_TOKEN',
                reward_amount: 25000,
                reward_recipient: 'REFERRER',
                status: 'ISSUED',
                issued_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
                notes: `Referral reward — referrer credit for order ${orderDetails.order_number ?? ''}`,
              });

              // Credit referee (new customer): Rp 25k discount token
              await supabase.from('sp_referral_rewards').insert({
                referrer_id: customerProfile.upline_id,
                referee_id:  order.agent_id,
                order_id:    payment.order_id,
                reward_type: 'DISCOUNT_TOKEN',
                reward_amount: 25000,
                reward_recipient: 'REFEREE',
                status: 'ISSUED',
                issued_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
                notes: `Referral reward — referee credit for order ${orderDetails.order_number ?? ''}`,
              });

              // Notify both parties
              await supabase.from('sp_notifications').insert([
                {
                  agent_id: customerProfile.upline_id,
                  type: 'SYSTEM',
                  title: 'Hadiah Referral Diterima! 🎁',
                  body: 'Temannya telah membeli polis pertama. Kamu mendapat diskon Rp 25.000 untuk perpanjangan polis berikutnya.',
                  metadata: { reward_type: 'referral_referrer' },
                  read: false,
                },
                {
                  agent_id: order.agent_id,
                  type: 'SYSTEM',
                  title: 'Bonus Referral Diterima! 🎁',
                  body: 'Selamat! Kamu mendapat diskon Rp 25.000 untuk pembelian polis berikutnya.',
                  metadata: { reward_type: 'referral_referee' },
                  read: false,
                },
              ]);

              console.log(`Referral reward issued: referrer=${customerProfile.upline_id}, referee=${order.agent_id}`);
            }
          }
        } catch (refErr) {
          // Non-blocking — referral rewards are a nice-to-have, must not break the payment flow
          console.warn('Referral reward failed (non-blocking):', refErr);
        }
      }
    }

    // If EXPIRED — update order and notify agent
    if (normalizedStatus === 'EXPIRED' && payment.order_id) {
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
