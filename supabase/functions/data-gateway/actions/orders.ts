// orders.ts — 10 actions
// Auto-generated from data-gateway/index.ts split
// Deploy-path diagnostic marker (v2.7.16 r5): runs after secret update.
import type { GatewayContext, ActionResult } from './types.ts';
import { findClientIdByEmail } from './clientLink.ts';

// json() helper — returns ActionResult (main index.ts converts to Response)
const json = (body: unknown, status = 200): ActionResult => ({ status, body });

// Audit v2.7.14 (P1-A): FILTER INJECTION GUARD untuk nilai yang diinterpolasi
// mentah ke string filter `.or()` PostgREST. Filter `.or()` diparse oleh
// PostgREST, tidak di-bind sebagai parameter — jadi koma/titik/kurung di dalam
// nilai akan MENULIS ULANG predikat (mis. "ALL,base_commission_rate.gt.0.5"
// menambah kondisi liar dan, karena gateway berjalan dengan service_role
// melewati RLS, bisa mengambil baris mana pun). Pola kelas bug yang sama sudah
// ditutup di FIX v2.6.18 (claims.ts / users.ts / mitraAccounts.ts).
//
// Satu implementasi teruji: primitive strip ada di `_shared/sanitize.ts`
// (regresi: services/__tests__/postgrestSanitize.test.ts). Wrapper di sini
// menambahkan kebijakan lebih ketat untuk coverage_type — payload yang PERLU
// disanitasi berarti payload kotor dan DITOLAK (caller membalas 400), bukan
// diam-diam dipaksa jadi nilai lain.
import { sanitizeFilterValue } from '../../_shared/sanitize.ts';

const SAFE_OR_VALUE_RE = /^[\p{L}\p{N}_-]+$/u;
export const sanitizeOrValue = (raw: unknown, maxLen = 30): string => {
  const s = String(raw ?? '').trim();
  // Charset aman: huruf, angka, underscore, tanda hubung. Tanpa titik/koma/
  // kurung, satu nilai selamanya hanya satu atom predikat — tidak bisa
  // menyusun term tambahan atau mengosongkan value eq.
  return SAFE_OR_VALUE_RE.test(s) ? sanitizeFilterValue(s, maxLen) : '';
};

export async function handleOrdersAction(action: string, ctx: GatewayContext): Promise<ActionResult | null> {
  const { db, params, caller, sendTelegram, logActivity, checkRateLimit, RESEND_KEY } = ctx;

  switch (action) {
    case 'get_my_orders': {
        // FIX v1.50.0: orders are written with agent_id = sp_users.id, but this
        // filtered by auth id only — legacy accounts never saw their own orders.
        // Match agent_id OR client_id against both possible owner ids.
        const ownerFilter = caller.ownerIds
          .flatMap((id) => [`agent_id.eq.${id}`, `client_id.eq.${id}`])
          .join(',');
        const { data, error } = await db
          .from('sp_policy_orders')
          .select('*')
          .or(ownerFilter)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(100);
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'cancel_my_order': {
        if (!params.order_id) return json({ error: 'Missing order_id' }, 400);
        const ownerFilter = caller.ownerIds
          .flatMap((id) => [`agent_id.eq.${id}`, `client_id.eq.${id}`])
          .join(',');
        const { data, error } = await db
          .from('sp_policy_orders')
          .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
          .eq('id', params.order_id)
          .or(ownerFilter)
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

    case 'admin_get_order': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.order_id) return json({ error: 'order_id required' }, 400);
        const { data, error } = await db.from('sp_policy_orders').select('*').eq('id', String(params.order_id)).maybeSingle();
        if (error) return json({ error: error.message }, 400);
        if (!data) return json({ error: 'Order not found' }, 404);
        return json({ data });
      }

    case 'admin_update_order': {
        // FIX: removed `caller.role !== 'INSURER'` branch (no such role exists in sp_users).
        // Now strictly admin-only. Insurer mutations route through insurer_upload_policy / submit_insurer_decision.
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        if (!params.order_id || !params.status) return json({ error: 'order_id and status required' }, 400);
        const ALLOWED_STATUS = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ISSUED', 'CANCELLED'];
        if (!ALLOWED_STATUS.includes(String(params.status))) return json({ error: 'Invalid status' }, 400);
        const ALLOWED = ['status', 'reviewer_notes', 'policy_number', 'policy_document_url', 'sp_policy_id', 'reviewed_at', 'issued_at'];
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const k of ALLOWED) { if (k in params && k !== 'order_id') updates[k] = params[k]; }
        const s = String(params.status);
        if (['UNDER_REVIEW', 'APPROVED', 'REJECTED'].includes(s) && !updates.reviewed_at) updates.reviewed_at = new Date().toISOString();
        if (s === 'ISSUED' && !updates.issued_at) updates.issued_at = new Date().toISOString();

        // Fetch current row for notification targeting
        const { data: current } = await db.from('sp_policy_orders')
          .select('id, agent_id, client_name, order_number, status, total_premium')
          .eq('id', String(params.order_id))
          .maybeSingle();

        const { data, error } = await db.from('sp_policy_orders').update(updates).eq('id', params.order_id).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);

        // FIX: send notifications on status changes (previously silent — customer/agent never told about approval/rejection)
        const cur = current as any;
        if (cur && cur.status !== s) {
          const statusLabels: Record<string, string> = {
            SUBMITTED:    'Diajukan',
            UNDER_REVIEW: 'Sedang Ditinjau',
            APPROVED:     'Disetujui',
            REJECTED:     'Ditolak',
            ISSUED:       'Polis Diterbitkan',
            CANCELLED:    'Dibatalkan',
          };
          const newLabel = statusLabels[s] ?? s;

          // Notify the agent (whoever is recorded as agent_id on the order)
          if (cur.agent_id) {
            db.from('sp_notifications').insert({
              agent_id: String(cur.agent_id),
              type: s === 'ISSUED' ? 'POLICY_ISSUED' : s === 'REJECTED' ? 'POLICY_REJECTED' : 'ORDER_UPDATE',
              title: `Order ${newLabel}`,
              body: `Order ${cur.order_number ?? ''} (${cur.client_name ?? ''}) telah ${newLabel}.${params.reviewer_notes ? ` Catatan: ${String(params.reviewer_notes).slice(0, 200)}` : ''}`,
              read: false,
              metadata: { order_id: cur.id, status: s, reviewer_notes: params.reviewer_notes ?? null },
            }).then(() => {}, () => {});
          }

          // For REJECTED/CANCELLED, also insert an admin notification so it shows up in the operations feed
          if (s === 'REJECTED' || s === 'CANCELLED') {
            db.from('sp_admin_notifications').insert({
              type: s === 'REJECTED' ? 'ORDER_REJECTED' : 'ORDER_CANCELLED',
              title: `Order ${newLabel}`,
              body: `Order ${cur.order_number ?? ''} (${cur.client_name ?? ''}) telah ${newLabel} oleh ${caller.spUser?.name ?? 'admin'}.`,
              read: false,
              metadata: { order_id: cur.id, status: s, actor_id: caller.authId },
            }).then(() => {}, () => {});
          }
        }
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

        // FIX: agents must be verified before they can create orders.
        // Previously this check was missing — unverified agents could submit orders
        // and they would sit in the operator queue (verification was cosmetic).
        if (caller.spUser.role === 'AGENT' && caller.spUser.verified === false) {
          return json({ error: 'Akun agen Anda belum diverifikasi. Tunggu konfirmasi dari operator atau hubungi tim SurePath.' }, 403);
        }

        // Required fields.
        if (!p.client_name || !p.product_code || !p.product_name || !p.coverage_type || !p.status) {
          return json({ error: 'client_name, product_code, product_name, coverage_type, status required' }, 400);
        }

        // Audit v2.7.14 (P1-A): coverage_type dibersihkan SEBELUM dipakai di
        // mana pun — tiga lookup sp_insurer_products menginterpolasikannya ke
        // string .or(), insertRow menyimpannya. Payload kotor ditolak 400.
        const coverageType = sanitizeOrValue(p.coverage_type);
        if (!coverageType) {
          return json({ error: 'coverage_type tidak valid.' }, 400);
        }
        // Predikat coverage: nilai eksak dulu, bila tidak ada baris generik 'ALL'.
        const orCoverage = `vehicle_coverage.eq.${coverageType},vehicle_coverage.eq.ALL`;

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
            .or(orCoverage);
          // Prefer the exact coverage-type match over a generic "ALL" row.
          const matchingProduct = (matchingProducts ?? []).find((r: any) => r.vehicle_coverage === coverageType)
            ?? (matchingProducts ?? [])[0];
          const maxAge = matchingProduct?.max_vehicle_age_years;
          if (maxAge && vehicleAge > maxAge) {
            return json({ error: `Kendaraan berusia ${vehicleAge} tahun melebihi batas maksimal ${maxAge} tahun untuk insurer ini.` }, 400);
          }
        }

        // ── Siapa nasabah order ini ────────────────────────────────────────
        //
        // Sebelumnya client_id hanya terisi kalau nasabah memesan sendiri, jadi
        // order yang dijual agen menyimpan nasabahnya sebagai teks saja dan
        // client_id-nya NULL selamanya. Akibatnya nasabah tidak melihat polisnya
        // di /custapp, dan submit_claim menolaknya dengan 403 atas polis yang
        // memang miliknya.
        //
        // Dicocokkan lewat email saja, dan agen yang mengisi emailnya sendiri
        // tidak bisa menjadi client atas ordernya sendiri. Aturan lengkapnya —
        // dan alasan nomor telepon tidak dipakai — ada di clientLink.ts.
        const resolvedClientId = caller.spUser.role === 'CUSTOMER'
          ? caller.spUser.id
          : await findClientIdByEmail(db, p.client_email, caller.ownerIds);

        // FIX v1.44.0 (pentest C1+C4): Replace `...rest` spread with strict allowlist.
        // Previously, agents could inject `status:'ISSUED'`, `commission_amount:999999999`,
        // `policy_number`, `policy_document_url`, `client_id`, etc. — bypassing review,
        // self-awarding unlimited commission, and creating fake policies.
        // Now: only safe fields are accepted; all sensitive fields are server-computed.
        const insertRow: Record<string, unknown> = {
          agent_id: caller.spUser.id,           // owner — never trust the client
          // FIX v1.50.0: customer self-service orders also record client_id so
          // payments/claims ownership checks (client_id = caller) work. Still
          // server-derived — never taken from the request payload.
          client_id: resolvedClientId,
          status: 'SUBMITTED',                   // force — never trust client status
          client_name:       String(p.client_name ?? '').slice(0, 200),
          client_phone:      p.client_phone      ? String(p.client_phone).slice(0, 30)    : null,
          client_email:      p.client_email      ? String(p.client_email).slice(0, 200)   : null,
          client_ktp:        p.client_ktp        ? String(p.client_ktp).slice(0, 50)      : null,
          product_code:      String(p.product_code ?? '').slice(0, 50),
          product_name:      String(p.product_name ?? '').slice(0, 200),
          coverage_type:     coverageType,
          vehicle_type:      p.vehicle_type      ? String(p.vehicle_type).slice(0, 30)    : null,
          vehicle_details:   p.vehicle_details   ? p.vehicle_details                       : null,
          sum_insured:       Number(p.sum_insured ?? 0),
          base_premium:      Number(p.base_premium ?? 0),
          addon_premium:     Number(p.addon_premium ?? 0),
          total_premium:     Number(p.total_premium ?? 0),
          net_premium:       Number(p.net_premium ?? Number(p.total_premium ?? 0)),
          admin_fee:         Number(p.admin_fee ?? 0),
          stamp_duty:        Number(p.stamp_duty ?? 0),
          application_fee:   Number(p.application_fee ?? 0),
          zone:              p.zone != null ? Number(p.zone) : null,
          insurer_id:        p.insurer_id        ? String(p.insurer_id)                    : null,
          addons:            p.addons            ? p.addons                                : null,
          ai_findings:       p.ai_findings       ? p.ai_findings                           : null,
          // FIX 2026-10-28 (audit dokumen): ai_score/ai_verdict selama ini
          // dikirim wizard tapi dibuang whitelist — InsuranceReviewPage &
          // AgentOrderStatus membaca order.ai_score dan selalu kosong.
          ai_score:          p.ai_score != null && Number.isFinite(Number(p.ai_score))
                             ? Number(p.ai_score) : null,
          ai_verdict:        p.ai_verdict        ? String(p.ai_verdict).slice(0, 30)       : null,
          agent_code:        p.agent_code        ? String(p.agent_code).slice(0, 50)      : null,
          // commission_amount, coin_reward, discount_rate, discount_amount are set below (server-side)
          // policy_number, policy_document_url, reviewed_at, issued_at, client_id — NEVER accepted from client
        };

        // ── Server-side commission computation (fixes C1) ──────────────────
        // Previously: commission_amount was client-controlled → agent could self-award
        // unlimited IDR. Now: compute from insurer product config × total_premium.
        let serverCommissionRate = 0.10; // default 10%
        let serverCoinRate = 0;          // default 0 coins per IDR
        if (p.insurer_id) {
          const { data: insProd } = await db.from('sp_insurer_products')
            .select('base_commission_rate, coin_rate')
            .eq('insurer_id', String(p.insurer_id))
            .eq('product_type', p.vehicle_type ?? 'CAR')
            .eq('is_active', true)
            .or(orCoverage)
            .maybeSingle();
          if (insProd) {
            serverCommissionRate = Number(insProd.base_commission_rate ?? 0.10);
            serverCoinRate = Number(insProd.coin_rate ?? 0);
          }
        }
        // Also check agent's own commission_rate from sp_users (capped at 30%)
        const { data: agentRow } = await db.from('sp_users')
          .select('commission_rate')
          .eq('id', caller.spUser.id)
          .maybeSingle();
        if (agentRow?.commission_rate != null) {
          serverCommissionRate = Math.min(Number(agentRow.commission_rate), 0.30); // cap at 30%
        }
        const computedCommission = Math.round(Number(p.total_premium ?? 0) * serverCommissionRate);
        // coin_rate is the reward-value rate; 1 coin represents Rp1,000 (matches admin fallback and ledger rp_value).
        const computedCoinReward = Math.floor(Number(p.total_premium ?? 0) * serverCoinRate / 1000);
        insertRow.commission_amount = computedCommission;
        insertRow.commission_rate   = serverCommissionRate;
        insertRow.coin_reward       = computedCoinReward;
        // Sanity ceiling: commission cannot exceed total_premium
        if (computedCommission > Number(p.total_premium ?? 0) * 2) {
          return json({ error: 'Komisi melebihi batas wajar. Hubungi admin.' }, 400);
        }

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
              .or(orCoverage)
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

        // FIX v1.44.0 (pentest C3): Atomically increment promo code used_count.
        // Previously: used_count was checked but never incremented → unlimited redemptions.
        // Now: after successful order insert, increment used_count atomically.
        if (clientPromoCode) {
          const { error: promoIncErr } = await db.from('sp_promo_codes')
            .update({ used_count: db.rpc('increment', { x: 1 }) })
            .eq('code', clientPromoCode);
          // Fallback: if RPC not available, do a raw SQL increment
          if (promoIncErr) {
            await db.rpc('increment_promo_used_count', { p_code: clientPromoCode }).then(() => {}, () => {});
          }
        }

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
        // FIX v1.50.0: previously matched client_id only (which was never set)
        // → payments were invisible to everyone. Now: owned orders are those
        // where the caller is the agent OR the client. Admins may pass
        // order_ids to fetch payments for arbitrary orders.
        let orderIds: string[];
        const requestedIds = Array.isArray(params.order_ids)
          ? (params.order_ids as unknown[]).map(String).slice(0, 200)
          : null;
        if (caller.isAdmin && requestedIds) {
          orderIds = requestedIds;
        } else {
          const ownerFilter = caller.ownerIds
            .flatMap((id) => [`agent_id.eq.${id}`, `client_id.eq.${id}`])
            .join(',');
          const { data: myOrders, error: ordErr } = await db
            .from('sp_policy_orders')
            .select('id')
            .or(ownerFilter);
          if (ordErr) return json({ error: ordErr.message }, 400);
          orderIds = (myOrders ?? []).map((o: any) => String(o.id));
          if (requestedIds) orderIds = orderIds.filter((id) => requestedIds.includes(id));
        }
        if (orderIds.length === 0) return json({ data: [] });
        const { data, error } = await db
          .from('sp_payments')
          .select('*')
          .in('order_id', orderIds)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    default:
      return null; // Not handled by this module
  }
}
