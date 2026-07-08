// orders.ts — 10 actions
// Auto-generated from data-gateway/index.ts split
import type { GatewayContext, ActionResult } from './types.ts';

// json() helper — returns ActionResult (main index.ts converts to Response)
const json = (body: unknown, status = 200): ActionResult => ({ status, body });

export async function handleOrdersAction(action: string, ctx: GatewayContext): Promise<ActionResult | null> {
  const { db, params, caller, sendTelegram, logActivity, checkRateLimit, RESEND_KEY } = ctx;

  switch (action) {
    case 'get_my_orders': {
        const { data, error } = await db
          .from('sp_policy_orders')
          .select('*')
          .eq('agent_id', caller.authId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'cancel_my_order': {
        if (!params.order_id) return json({ error: 'Missing order_id' }, 400);
        const { data, error } = await db
          .from('sp_policy_orders')
          .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
          .eq('id', params.order_id)
          .eq('agent_id', caller.authId)
          .in('status', ['SUBMITTED', 'UNDER_REVIEW'])
          .select()
          .maybeSingle();
        if (error) return json({ error: error.message }, 400);
        if (!data) return json({ error: 'Order not found or cannot be cancelled' }, 404);
        return json({ data });
      }

    case 'admin_send_insurer_review_link': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const orderId = String(params.order_id ?? '');
        if (!orderId) return json({ error: 'order_id required' }, 400);

        // Fetch order
        const { data: order, error: ordErr } = await db.from('sp_policy_orders')
          .select('id, order_number, client_name, product_name, total_premium, insurer_id, insurer_name, status')
          .eq('id', orderId)
          .maybeSingle();
        if (ordErr) return json({ error: ordErr.message }, 400);
        if (!order) return json({ error: 'Order not found' }, 404);
        if (!order.insurer_id) return json({ error: 'Order has no insurer assigned' }, 400);

        // Fetch insurer email
        const { data: ins, error: insErr } = await db.from('sp_insurers')
          .select('id, name, admin_email, pic_email, pic_name')
          .eq('id', order.insurer_id)
          .maybeSingle();
        if (insErr) return json({ error: insErr.message }, 400);
        const insurerEmail = ins?.pic_email || ins?.admin_email;
        if (!insurerEmail) return json({ error: 'Insurer has no email configured' }, 400);

        // Check if there's already an active (non-expired, non-actioned) token
        const { data: existing } = await db.from('sp_review_tokens')
          .select('id, token, expires_at, insurer_action')
          .eq('order_id', orderId)
          .is('insurer_action', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1);
        let reviewToken: string;
        let reviewUrl: string;
        if (existing && existing.length > 0) {
          // Reuse existing active token
          reviewToken = existing[0].token;
        } else {
          // Create new token (7-day expiry)
          reviewToken = crypto.randomUUID();
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          const { error: tkErr } = await db.from('sp_review_tokens').insert({
            token: reviewToken,
            order_id: orderId,
            created_by: caller.authId,
            expires_at: expiresAt,
            accessed_count: 0,
          });
          if (tkErr) return json({ error: tkErr.message }, 400);
        }

        const appOrigin = 'https://myinsurepath.com';
        reviewUrl = `${appOrigin}/review/${reviewToken}`;

        // Update token with review URL
        await db.from('sp_review_tokens').update({ review_url: reviewUrl }).eq('token', reviewToken).then(() => {}, () => {});

        // Send email via Resend
        if (insurerEmail && RESEND_KEY) {
          const esc = (s: string) => s.replace(/[&<>"']/g, (c) =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
          const premiumFmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(order.total_premium ?? 0);
          const subject = `Pengajuan Polis Baru: ${order.order_number} - ${order.client_name}`;
          const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:#003B2F;padding:28px 32px;">
  <span style="font-size:20px;font-weight:900;color:#fff;">Sure<span style="color:#00C16A;">Path</span></span>
  <span style="display:block;font-size:10px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:3px;text-transform:uppercase;margin-top:2px;">Insurer Review Request</span>
</td></tr>
<tr><td style="padding:32px;">
  <p style="font-size:14px;color:#64748b;margin:0 0 8px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">Kepada ${esc(ins?.pic_name || 'Tim ' + (ins?.name || 'Penanggung'))}</p>
  <h1 style="font-size:24px;font-weight:900;color:#0f172a;margin:0 0 24px;letter-spacing:-1px;line-height:1.3;">Terdapat pengajuan polis<br/>baru yang perlu ditinjau</h1>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px;"><tr><td style="padding:20px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">No. Order</td>
          <td align="right" style="padding:6px 0;font-size:13px;font-weight:800;color:#00C16A;font-family:monospace;">${esc(order.order_number)}</td></tr>
      <tr><td style="padding:6px 0;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">Nasabah</td>
          <td align="right" style="padding:6px 0;font-size:13px;font-weight:700;color:#0f172a;">${esc(order.client_name)}</td></tr>
      <tr><td style="padding:6px 0;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">Produk</td>
          <td align="right" style="padding:6px 0;font-size:13px;font-weight:700;color:#0f172a;">${esc(order.product_name)}</td></tr>
      <tr><td style="padding:6px 0;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;border-top:1px solid #e2e8f0;">Total Premi</td>
          <td align="right" style="padding:6px 0;font-size:16px;font-weight:900;color:#00C16A;border-top:1px solid #e2e8f0;">${premiumFmt}</td></tr>
    </table>
  </td></tr></table>
  <a href="${reviewUrl}" style="display:block;background:#00C16A;color:#fff;font-size:14px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:16px 24px;border-radius:12px;text-align:center;margin-bottom:16px;">Review Pengajuan Ini</a>
  <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.6;">Link review berlaku 7 hari. Di link tersebut Anda dapat: menyetujui, meminta informasi tambahan, atau menolak pengajuan.</p>
</td></tr>
<tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;">
  <span style="font-size:11px;color:#94a3b8;font-weight:600;">PT Ruang Proteksi Indonesia · myinsurepath.com</span>
</td></tr>
</table></td></tr></table>
</body></html>`;
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: 'SurePath <noreply@myinsurepath.com>', to: [insurerEmail], subject, html }),
          }).then(() => {}, () => {});
        }

        // Send Telegram alert
        sendTelegram(
          `Link Review Insurer Dikirim - SurePath\n\n` +
          `Insurer: ${ins?.name ?? '-'}\n` +
          `No. Order: ${order.order_number}\n` +
          `Nasabah: ${order.client_name}\n` +
          `Email PIC: ${insurerEmail}\n` +
          `Link: ${reviewUrl}\n\n` +
          `Insurer dapat: Approve / Request Info / Decline`
        );

        // Create admin notification
        db.from('sp_admin_notifications').insert({
          type: 'INSURER_REVIEW_SENT',
          title: 'Link Review Dikirim ke Insurer',
          body: `${ins?.name ?? 'Insurer'} — ${order.order_number} (${order.client_name})`,
          order_id: orderId,
          read: false,
          metadata: { order_id: orderId, review_url: reviewUrl, insurer_email: insurerEmail },
        }).then(() => {}, () => {});

        return json({ data: { success: true, review_url: reviewUrl, insurer_email: insurerEmail } });
      }

    case 'admin_queue_summary': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const [
          pendingOrdersRes, pendingClaimsRes, pendingWithdrawalsRes,
          pendingAgentsRes, unreadNotifsRes, paymentsRes,
        ] = await Promise.all([
          db.from('sp_policy_orders').select('id', { count: 'exact', head: true }).in('status', ['SUBMITTED', 'UNDER_REVIEW']),
          db.from('sp_claims').select('id', { count: 'exact', head: true }).in('status', ['SUBMITTED', 'UNDER_REVIEW']),
          db.from('sp_withdrawals').select('id', { count: 'exact', head: true }).in('status', ['PENDING_L1', 'PENDING_L2', 'PENDING_L3']),
          db.from('sp_users').select('id', { count: 'exact', head: true }).eq('role', 'AGENT').eq('verified', false),
          db.from('sp_admin_notifications').select('id', { count: 'exact', head: true }).eq('read', false),
          db.from('sp_payments').select('id, status, paid_amount').in('status', ['PENDING', 'PAID']),
        ]);
        const payments = (paymentsRes.data ?? []) as any[];
        const totalPaid = payments.filter((p: any) => p.status === 'PAID').length;
        const totalPendingPayments = payments.filter((p: any) => p.status === 'PENDING').length;
        return json({
          data: {
            pendingOrders:       pendingOrdersRes.count ?? 0,
            pendingClaims:       pendingClaimsRes.count ?? 0,
            pendingWithdrawals:  pendingWithdrawalsRes.count ?? 0,
            pendingAgents:       pendingAgentsRes.count ?? 0,
            unreadNotifications: unreadNotifsRes.count ?? 0,
            paidPayments:        totalPaid,
            pendingPayments:     totalPendingPayments,
          },
        });
      }

    case 'admin_list_orders': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        let q = db.from('sp_policy_orders').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(Number(params.limit ?? 500));
        if (params.status) q = q.eq('status', String(params.status));
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_update_order': {
        if (!caller.isAdmin && caller.role !== 'INSURER') return json({ error: 'Forbidden' }, 403);
        if (!params.order_id || !params.status) return json({ error: 'order_id and status required' }, 400);
        const ALLOWED_STATUS = ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ISSUED', 'CANCELLED'];
        if (!ALLOWED_STATUS.includes(String(params.status))) return json({ error: 'Invalid status' }, 400);
        const ALLOWED = ['status', 'reviewer_notes', 'policy_number', 'policy_document_url', 'sp_policy_id', 'reviewed_at', 'issued_at'];
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const k of ALLOWED) { if (k in params && k !== 'order_id') updates[k] = params[k]; }
        const s = String(params.status);
        if (['UNDER_REVIEW', 'APPROVED', 'REJECTED'].includes(s) && !updates.reviewed_at) updates.reviewed_at = new Date().toISOString();
        if (s === 'ISSUED' && !updates.issued_at) updates.issued_at = new Date().toISOString();
        const { data, error } = await db.from('sp_policy_orders').update(updates).eq('id', params.order_id).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_list_payments': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const { data, error } = await db.from('sp_payments')
          .select('*, sp_policy_orders!order_id(order_number, client_name, product_name)')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(Number(params.limit ?? 200));
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_transaksi_overview': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const [usersRes, ordersRes, paymentsRes, commissionsRes] = await Promise.all([
          db.from('sp_users').select('id', { count: 'exact', head: true }).in('role', ['CUSTOMER', 'B2B_CLIENT']),
          db.from('sp_policy_orders').select('id', { count: 'exact', head: true }),
          db.from('sp_payments').select('paid_amount').eq('status', 'PAID'),
          db.from('sp_commissions').select('commission_amount'),
        ]);
        const totalPembayaranMasuk = ((paymentsRes.data ?? []) as any[]).reduce((s: number, p: any) => s + (p.paid_amount ?? 0), 0);
        const totalKomisiAgen = ((commissionsRes.data ?? []) as any[]).reduce((s: number, c: any) => s + (c.commission_amount ?? 0), 0);
        return json({ data: { totalCustomers: usersRes.count ?? 0, totalOrders: ordersRes.count ?? 0, totalPembayaranMasuk, totalKomisiAgen } });
      }

    case 'create_policy_order': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const p = params as Record<string, any>;

        // Required fields.
        if (!p.client_name || !p.product_code || !p.product_name || !p.coverage_type || !p.status) {
          return json({ error: 'client_name, product_code, product_name, coverage_type, status required' }, 400);
        }

        // Server-side validation: core premium fields must be positive numbers.
        const POSITIVE_NUM = ['base_premium', 'total_premium'];
        for (const k of POSITIVE_NUM) {
          const v = Number(p[k]);
          if (!Number.isFinite(v) || v <= 0) {
            return json({ error: `${k} must be a positive number` }, 400);
          }
        }
        // Other numeric fields (when present) must be non-negative.
        const NON_NEGATIVE_NUM = ['addon_premium', 'admin_fee', 'stamp_duty', 'sum_insured', 'discount_amount', 'commission_amount', 'coin_reward', 'net_premium'];
        for (const k of NON_NEGATIVE_NUM) {
          if (k in p && p[k] != null) {
            const v = Number(p[k]);
            if (!Number.isFinite(v) || v < 0) {
              return json({ error: `${k} must be a non-negative number` }, 400);
            }
          }
        }

        // Server-side vehicle-age-vs-insurer-limit check. The client (agent
        // wizard) already filters this, but that's advisory only — re-verify
        // here so it can't be bypassed by calling the gateway directly with a
        // stale/edited payload. Silently skipped when no insurer is chosen yet
        // or the vehicle year isn't present (e.g. non-vehicle products).
        if (p.insurer_id && p.vehicle_type && p.vehicle_details?.year) {
          const vehicleAge = new Date().getFullYear() - Number(p.vehicle_details.year);
          const { data: matchingProducts } = await db
            .from('sp_insurer_products')
            .select('max_vehicle_age_years, vehicle_coverage')
            .eq('insurer_id', p.insurer_id)
            .eq('product_type', p.vehicle_type)
            .eq('is_active', true)
            .or(`vehicle_coverage.eq.${p.coverage_type},vehicle_coverage.eq.ALL`);
          // Prefer the exact coverage-type match over a generic "ALL" row.
          const matchingProduct = (matchingProducts ?? []).find((r: any) => r.vehicle_coverage === p.coverage_type)
            ?? (matchingProducts ?? [])[0];
          const maxAge = matchingProduct?.max_vehicle_age_years;
          if (maxAge && vehicleAge > maxAge) {
            return json({ error: `Kendaraan berusia ${vehicleAge} tahun melebihi batas maksimal ${maxAge} tahun untuk insurer ini.` }, 400);
          }
        }

        // Build the insert from the client payload, then OVERRIDE the owner.
        // Strip any client-supplied owner/identity fields that must be trusted.
        const { id: _omitId, order_number: _omitOrderNumber, created_at: _omitCreated, updated_at: _omitUpdated, agent_id: _omitAgent, ...rest } = p;
        const insertRow: Record<string, unknown> = {
          ...rest,
          agent_id: caller.spUser.id, // owner — never trust the client
        };

        // ── Server-side promo code validation ───────────────────────────────
        // SECURITY: The client sends discount_rate + discount_amount in the
        // payload. Without this check, a user could bypass the promo code UI
        // and just send discount_rate: 0.25 directly. We re-validate the code
        // server-side and override the discount fields with the authoritative
        // values from sp_promo_codes.
        //
        // If no promoCode is provided but discount_rate > 0, we zero it out
        // (no discount without a valid code).
        const clientDiscountRate = Number(p.discount_rate ?? 0);
        const clientPromoCode = String(p.promoCode ?? p.promo_code ?? '').trim().toUpperCase();

        if (clientPromoCode) {
          // Validate the code against sp_promo_codes
          const { data: promoRow } = await db
            .from('sp_promo_codes')
            .select('code, discount_type, discount_value, min_premium, usage_limit, used_count, valid_from, valid_to, is_active')
            .eq('code', clientPromoCode)
            .eq('is_active', true)
            .maybeSingle();

          if (!promoRow) {
            return json({ error: `Kode promo "${clientPromoCode}" tidak valid atau sudah tidak aktif` }, 400);
          }

          // Check date range (existing schema: valid_from / valid_to)
          const now = new Date();
          if (new Date(promoRow.valid_from) > now) {
            return json({ error: 'Kode promo belum berlaku' }, 400);
          }
          if (promoRow.valid_to && new Date(promoRow.valid_to) < now) {
            return json({ error: 'Kode promo sudah kedaluwarsa' }, 400);
          }
          // Check usage limit (existing schema: usage_limit / used_count)
          if (promoRow.usage_limit !== null && promoRow.used_count >= promoRow.usage_limit) {
            return json({ error: 'Kuota kode promo sudah habis' }, 400);
          }
          // Check minimum premium
          const orderTotal = Number(p.total_premium ?? 0);
          if (Number(promoRow.min_premium) > 0 && orderTotal < Number(promoRow.min_premium)) {
            return json({ error: `Minimum pembelian Rp ${Number(promoRow.min_premium).toLocaleString('id-ID')} untuk kode promo ini` }, 400);
          }

          // Override the discount fields with the authoritative values
          // SECURITY: fetch the insurer's max_discount_rate and clamp the
          // promo discount to it — prevents a malicious client from bypassing
          // the UI cap by sending a higher discount_rate directly.
          let insurerMaxDiscount = 1; // default: no cap (100%)
          if (p.insurer_id) {
            const { data: insurerProduct } = await db
              .from('sp_insurer_products')
              .select('max_discount_rate')
              .eq('insurer_id', p.insurer_id)
              .eq('product_type', p.vehicle_type ?? 'CAR')
              .eq('is_active', true)
              .or(`vehicle_coverage.eq.${p.coverage_type},vehicle_coverage.eq.ALL`)
              .maybeSingle();
            if (insurerProduct?.max_discount_rate != null) {
              insurerMaxDiscount = Number(insurerProduct.max_discount_rate);
            }
          }

          if (promoRow.discount_type === 'PERCENT') {
            // Cap at: min(promo_value, insurer_max_discount)
            const promoRate = Number(promoRow.discount_value) / 100;
            const validatedDiscountRate = Math.min(promoRate, insurerMaxDiscount);
            insertRow.discount_rate = validatedDiscountRate;
            insertRow.discount_amount = Math.round(orderTotal * validatedDiscountRate);
          } else {
            // NOMINAL — fixed IDR amount
            const nominalDiscount = Number(promoRow.discount_value);
            insertRow.discount_rate = orderTotal > 0 ? nominalDiscount / orderTotal : 0;
            insertRow.discount_amount = Math.min(nominalDiscount, orderTotal);
          }
          insertRow.promo_code = promoRow.code;
        } else if (clientDiscountRate > 0) {
          // No promo code but client sent a discount — zero it out
          console.warn(`[data-gateway] create_policy_order: caller ${caller.authId} sent discount_rate=${clientDiscountRate} without a promo code — zeroing out`);
          insertRow.discount_rate = 0;
          insertRow.discount_amount = 0;
        }

        const { data, error } = await db.from('sp_policy_orders').insert(insertRow).select().single();
        if (error) return json({ error: error.message }, 400);

        // Admin Telegram + insurer email alerts (non-blocking)
        const order     = data as Record<string, any>;
        const orderTime = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        const premiumStr = order.total_premium
          ? `Rp ${Number(order.total_premium).toLocaleString('id-ID')}`
          : '-';
        // ── Operator/admin in-app notification (for /operatorapp realtime feed) ──
        db.from('sp_admin_notifications').insert({
          type: 'NEW_ORDER',
          title: 'Pengajuan Polis Baru',
          body: `${String(order.client_name ?? '-')} · ${String(order.product_name ?? '-')} · ${premiumStr}`,
          order_id: order.id,
          read: false,
          metadata: { order_id: order.id, order_number: order.order_number, status: order.status },
        }).then(() => {}, () => {});
        sendTelegram(
          `Order Polis Baru - SurePath\n\n` +
          `No. Order: ${order.order_number ?? order.id}\n` +
          `Nasabah: ${order.client_name ?? '-'}\n` +
          `Produk: ${order.product_name ?? '-'}\n` +
          `Premi: ${premiumStr}\n` +
          `Status: ${order.status ?? '-'}\n` +
          `Waktu: ${orderTime} WIB\n\n` +
          `Buka Admin Panel: https://myinsurepath.com/admin`
        );
        // NOTE: Insurer review link is NOT sent here. It's sent only after
        // operator approves the order (via admin_send_insurer_review_link
        // action called from OperatorOrders.handleApprove). Sending it here
        // would notify the insurer before SurePath has reviewed the order.

        return json({ data });
      }

    case 'get_my_payments': {
        if (!caller.spUser) return json({ error: 'No profile' }, 403);
        const { data: myOrders, error: ordErr } = await db
          .from('sp_policy_orders')
          .select('id')
          .eq('client_id', caller.spUser.id);
        if (ordErr) return json({ error: ordErr.message }, 400);
        const orderIds = (myOrders ?? []).map((o: any) => o.id);
        if (orderIds.length === 0) return json({ data: [] });
        const { data, error } = await db
          .from('sp_payments')
          .select('*')
          .in('order_id', orderIds)
          .order('created_at', { ascending: false });
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    default:
      return null; // Not handled by this module
  }
}
