// insurers.ts — 21 actions
// Auto-generated from data-gateway/index.ts split
import type { GatewayContext, ActionResult } from './types.ts';

// json() helper — returns ActionResult (main index.ts converts to Response)
const json = (body: unknown, status = 200): ActionResult => ({ status, body });

// SLA upload softcopy polis setelah insurer APPROVED (jam). Dipakai untuk
// mengisi sp_policy_orders.policy_upload_deadline; reminder popup (insurer
// app) dan email cron membaca kolom itu.
const POLICY_UPLOAD_SLA_HOURS = 72;

export async function handleInsurersAction(action: string, ctx: GatewayContext): Promise<ActionResult | null> {
  const { db, params, caller, sendTelegram, logActivity, checkRateLimit, RESEND_KEY } = ctx;

  switch (action) {
    case 'admin_list_insurer_tokens': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const { data, error } = await db.from('sp_insurer_auth_tokens')
          .select('id, insurer_id, token, email, expires_at, used_at, created_at')
          .order('created_at', { ascending: false })
          .limit(Number(params.limit ?? 200));
        if (error) return json({ error: error.message }, 400);
        // Enrich with insurer name
        const insurerIds = [...new Set((data ?? []).map((t: any) => t.insurer_id))];
        const { data: insurers } = await db.from('sp_insurers')
          .select('id, name')
          .in('id', insurerIds);
        const insurerMap: Record<string, string> = {};
        for (const ins of (insurers ?? [])) insurerMap[ins.id] = ins.name;
        const enriched = (data ?? []).map((t: any) => ({ ...t, insurer_name: insurerMap[t.insurer_id] ?? 'Unknown' }));
        return json({ data: enriched });
      }

    case 'admin_revoke_insurer_token': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const tokenId = String(params.token_id ?? '');
        if (!tokenId) return json({ error: 'token_id required' }, 400);
        const { error } = await db.from('sp_insurer_auth_tokens').delete().eq('id', tokenId);
        if (error) return json({ error: error.message }, 400);
        // Audit notification
        db.from('sp_admin_notifications').insert({
          type: 'INSURER_TOKEN_REVOKED',
          title: 'Token Insurer Dihapus',
          body: `Admin menghapus token akses insurer.`,
          read: false,
          metadata: { token_id: tokenId, revoked_by: caller.authId },
        }).then(() => {}, () => {});
        return json({ data: { success: true } });
      }

    case 'admin_generate_insurer_token': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const insurerId = String(params.insurer_id ?? '');
        if (!insurerId) return json({ error: 'insurer_id required' }, 400);
        // Fetch insurer
        const { data: ins, error: insErr } = await db.from('sp_insurers')
          .select('id, name, pic_email, admin_email')
          .eq('id', insurerId)
          .maybeSingle();
        if (insErr) return json({ error: insErr.message }, 400);
        if (!ins) return json({ error: 'Insurer not found' }, 404);
        const email = ins.pic_email || ins.admin_email;
        if (!email) return json({ error: 'Insurer has no email configured (pic_email or admin_email)' }, 400);
        // Generate new token (7-day rolling)
        const newToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { error: tkErr } = await db.from('sp_insurer_auth_tokens').insert({
          insurer_id: insurerId,
          token: newToken,
          email,
          expires_at: expiresAt,
        });
        if (tkErr) return json({ error: tkErr.message }, 400);
        const magicLink = `https://myinsurepath.com/insurerapp?token=${newToken}`;
        // Audit notification
        db.from('sp_admin_notifications').insert({
          type: 'INSURER_TOKEN_GENERATED',
          title: 'Token Insurer Baru Dibuat',
          body: `Token akses baru untuk ${ins.name}. Link: ${magicLink}`,
          read: false,
          metadata: { insurer_id: insurerId, token_id: newToken, generated_by: caller.authId },
        }).then(() => {}, () => {});
        return json({ data: { success: true, token: newToken, magic_link: magicLink, insurer_name: ins.name, email } });
      }

    case 'admin_list_review_tokens': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const { data, error } = await db.from('sp_review_tokens')
          .select('id, token, order_id, expires_at, insurer_action, insurer_notes, actioned_at, accessed_count, last_accessed_at, created_at, review_url')
          .order('created_at', { ascending: false })
          .limit(Number(params.limit ?? 200));
        if (error) return json({ error: error.message }, 400);
        // Enrich with order info
        const orderIds = [...new Set((data ?? []).map((t: any) => t.order_id))];
        const { data: orders } = await db.from('sp_policy_orders')
          .select('id, order_number, client_name, product_name, insurer_name, status')
          .in('id', orderIds);
        const orderMap: Record<string, any> = {};
        for (const o of (orders ?? [])) orderMap[o.id] = o;
        const enriched = (data ?? []).map((t: any) => ({
          ...t,
          order_number: orderMap[t.order_id]?.order_number ?? null,
          client_name: orderMap[t.order_id]?.client_name ?? null,
          product_name: orderMap[t.order_id]?.product_name ?? null,
          insurer_name: orderMap[t.order_id]?.insurer_name ?? null,
          order_status: orderMap[t.order_id]?.status ?? null,
        }));
        return json({ data: enriched });
      }

    case 'admin_list_insurer_activity': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        let q = db.from('sp_insurer_activity_log')
          .select('id, insurer_id, order_id, action, details, ip_address, user_agent, created_at')
          .order('created_at', { ascending: false })
          .limit(Number(params.limit ?? 100));
        if (params.insurer_id) q = q.eq('insurer_id', params.insurer_id);
        if (params.action) q = q.eq('action', params.action);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        // Enrich with insurer name + order number
        const insurerIds = [...new Set((data ?? []).map((l: any) => l.insurer_id).filter(Boolean))];
        const orderIds = [...new Set((data ?? []).map((l: any) => l.order_id).filter(Boolean))];
        const [insRes, ordRes] = await Promise.all([
          insurerIds.length > 0 ? db.from('sp_insurers').select('id, name').in('id', insurerIds) : Promise.resolve({ data: [] }),
          orderIds.length > 0 ? db.from('sp_policy_orders').select('id, order_number, client_name').in('id', orderIds) : Promise.resolve({ data: [] }),
        ]);
        const insMap: Record<string, string> = {};
        for (const i of (insRes.data ?? [])) insMap[i.id] = i.name;
        const ordMap: Record<string, any> = {};
        for (const o of (ordRes.data ?? [])) ordMap[o.id] = o;
        const enriched = (data ?? []).map((l: any) => ({
          ...l,
          insurer_name: l.insurer_id ? (insMap[l.insurer_id] ?? 'Unknown') : null,
          order_number: l.order_id ? (ordMap[l.order_id]?.order_number ?? null) : null,
          client_name: l.order_id ? (ordMap[l.order_id]?.client_name ?? null) : null,
        }));
        return json({ data: enriched });
      }

    case 'admin_get_insurer_api_config': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const insurerId = String(params.insurer_id ?? '');
        if (!insurerId) return json({ error: 'insurer_id required' }, 400);
        const { data, error } = await db.from('sp_insurer_api_configs')
          .select('*')
          .eq('insurer_id', insurerId)
          .maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_create_insurer': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const { data, error } = await db.from('sp_insurers').insert({
          name: String(params.name ?? ''), code: String(params.code ?? ''),
          description: String(params.description ?? ''), is_active: true,
          admin_name: String(params.admin_name ?? ''), admin_email: String(params.admin_email ?? ''),
          pic_name: String(params.pic_name ?? ''), pic_email: String(params.pic_email ?? ''),
          pic_phone: String(params.pic_phone ?? ''),
        }).select().single();
        if (error) return json({ error: error.message }, 400);
        logActivity(null, null, 'INSURER_CREATED', { insurer_id: (data as any)?.id, name: params.name });
        return json({ data });
      }

    case 'admin_update_insurer': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const insurerId = String(params.insurer_id ?? '');
        if (!insurerId) return json({ error: 'insurer_id required' }, 400);
        const ALLOWED = ['name', 'code', 'description', 'is_active', 'admin_name', 'admin_email', 'pic_name', 'pic_email', 'pic_phone', 'logo_url'];
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const k of ALLOWED) { if (k in params) updates[k] = params[k]; }
        const { data, error } = await db.from('sp_insurers').update(updates).eq('id', insurerId).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_delete_insurer': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const insurerId = String(params.insurer_id ?? '');
        if (!insurerId) return json({ error: 'insurer_id required' }, 400);
        const { error } = await db.from('sp_insurers').delete().eq('id', insurerId);
        if (error) return json({ error: error.message }, 400);
        logActivity(insurerId, null, 'INSURER_DELETED', { insurer_id: insurerId });
        return json({ data: { success: true } });
      }

    case 'admin_save_insurer_product': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const insurerId = String(params.insurer_id ?? '');
        if (!insurerId) return json({ error: 'insurer_id required' }, 400);
        const payload: Record<string, unknown> = {
          insurer_id: insurerId,
          product_type: String(params.product_type ?? 'CAR'),
          vehicle_coverage: String(params.vehicle_coverage ?? 'COMPREHENSIVE'),
          base_commission_rate: Number(params.base_commission_rate ?? 0.1),
          max_discount_rate: Number(params.max_discount_rate ?? 0.25),
          coin_rate: Number(params.coin_rate ?? 0),
          stamp_duty: Number(params.stamp_duty ?? 10000),
          policy_cost: Number(params.policy_cost ?? 50000),
          authorized_garage_rate: Number(params.authorized_garage_rate ?? 0.0025),
          authorized_garage_max_age_years: Number(params.authorized_garage_max_age_years ?? 5),
          is_active: params.is_active !== false,
        };
        if (params.max_vehicle_age_years) payload.max_vehicle_age_years = Number(params.max_vehicle_age_years);
        if (params.id) {
          const { data, error } = await db.from('sp_insurer_products').update(payload).eq('id', params.id).select().maybeSingle();
          if (error) return json({ error: error.message }, 400);
          return json({ data });
        } else {
          const { data, error } = await db.from('sp_insurer_products').insert(payload).select().single();
          if (error) return json({ error: error.message }, 400);
          return json({ data });
        }
      }

    case 'admin_delete_insurer_product': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const productId = String(params.product_id ?? '');
        if (!productId) return json({ error: 'product_id required' }, 400);
        const { error } = await db.from('sp_insurer_products').delete().eq('id', productId);
        if (error) return json({ error: error.message }, 400);
        return json({ data: { success: true } });
      }

    case 'admin_save_ojk_rate_set': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const { data, error } = await db.from('sp_ojk_rate_sets').insert({
          version: String(params.version ?? ''),
          source_reference: String(params.source_reference ?? ''),
          effective_date: String(params.effective_date ?? new Date().toISOString().slice(0, 10)),
          is_active: false,
          rates: params.rates ?? {},
        }).select().single();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_activate_ojk_rate_set': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const rateSetId = String(params.rate_set_id ?? '');
        if (!rateSetId) return json({ error: 'rate_set_id required' }, 400);
        await db.from('sp_ojk_rate_sets').update({ is_active: false }).eq('is_active', true);
        const { data, error } = await db.from('sp_ojk_rate_sets').update({ is_active: true, updated_at: new Date().toISOString() }).eq('id', rateSetId).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }

    case 'admin_delete_ojk_rate_set': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const rateSetId = String(params.rate_set_id ?? '');
        if (!rateSetId) return json({ error: 'rate_set_id required' }, 400);
        const { error } = await db.from('sp_ojk_rate_sets').delete().eq('id', rateSetId);
        if (error) return json({ error: error.message }, 400);
        return json({ data: { success: true } });
      }

    case 'admin_save_insurer_api_config': {
        if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
        const insurerId = String(params.insurer_id ?? '');
        const endpointUrl = String(params.endpoint_url ?? '');
        const apiKey = String(params.api_key ?? '');
        const webhookSecret = String(params.webhook_secret ?? '');
        const isActive = params.is_active !== false;
        if (!insurerId || !endpointUrl) return json({ error: 'insurer_id and endpoint_url required' }, 400);
        // SSRF guard: block private IPs + localhost
        const isPrivate = /^(https?:\/\/)(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.|::1|fc00:|fe80:)/i.test(endpointUrl);
        if (isPrivate) return json({ error: 'Endpoint URL tidak boleh private/localhost' }, 400);
        const { data, error } = await db.from('sp_insurer_api_configs')
          .upsert({
            insurer_id: insurerId,
            endpoint_url: endpointUrl,
            api_key: apiKey || null,
            webhook_secret: webhookSecret || null,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'insurer_id' })
          .select()
          .maybeSingle();
        if (error) return json({ error: error.message }, 400);
        logActivity(insurerId, null, 'API_CONFIG_SAVED', { endpoint_url: endpointUrl, is_active: isActive });
        return json({ data });
      }

    case 'get_insurer_review': {
        const token = String(params.token ?? '');
        if (!token) return json({ error: 'token required' }, 400);
        // Load token
        const { data: rt, error: rtErr } = await db.from('sp_review_tokens')
          .select('id, token, order_id, expires_at, insurer_action, insurer_notes, actioned_at, accessed_count, reminder_count')
          .eq('token', token)
          .maybeSingle();
        if (rtErr) return json({ error: rtErr.message }, 400);
        if (!rt) return json({ error: 'Invalid token' }, 404);
        if (new Date(rt.expires_at) < new Date()) return json({ error: 'Token expired' }, 410);
        // Increment accessed_count (non-blocking)
        db.from('sp_review_tokens').update({ accessed_count: (rt.accessed_count ?? 0) + 1, last_accessed_at: new Date().toISOString() })
          .eq('id', rt.id).then(() => {}, () => {});
        // Load order
        const { data: order, error: ordErr } = await db.from('sp_policy_orders')
          .select('*')
          .eq('id', rt.order_id)
          .maybeSingle();
        if (ordErr) return json({ error: ordErr.message }, 400);
        if (!order) return json({ error: 'Order not found' }, 404);
        // Load insurer info
        let insurer: any = null;
        if (order.insurer_id) {
          const { data: ins } = await db.from('sp_insurers')
            .select('id, name, logo_url, admin_name, admin_email, pic_name, pic_email, pic_phone')
            .eq('id', order.insurer_id)
            .maybeSingle();
          insurer = ins;
        }
        // ── Log activity (review page opened) ───────────────────────────────
        logActivity(order.insurer_id ?? null, rt.order_id, 'REVIEW_OPENED', { token_id: rt.id, accessed_count: (rt.accessed_count ?? 0) + 1 });
        return json({ data: { token: rt, order, insurer } });
      }

    case 'submit_insurer_decision': {
        const token = String(params.token ?? '');
        const action = String(params.action ?? '');
        const notes = String(params.notes ?? '');
        if (!token || !action) return json({ error: 'token and action required' }, 400);
        const VALID_ACTIONS = ['APPROVED', 'REQUEST_INFO', 'DECLINED'];
        if (!VALID_ACTIONS.includes(action)) return json({ error: 'Invalid action' }, 400);
        // Notes required for REQUEST_INFO and DECLINED
        if ((action === 'REQUEST_INFO' || action === 'DECLINED') && notes.trim().length < 5) {
          return json({ error: 'Notes required (min 5 chars) for REQUEST_INFO and DECLINED' }, 400);
        }
        // Load token
        const { data: rt, error: rtErr } = await db.from('sp_review_tokens')
          .select('id, order_id, expires_at, insurer_action')
          .eq('token', token)
          .maybeSingle();
        if (rtErr) return json({ error: rtErr.message }, 400);
        if (!rt) return json({ error: 'Invalid token' }, 404);
        if (new Date(rt.expires_at) < new Date()) return json({ error: 'Token expired' }, 410);
        if (rt.insurer_action) return json({ error: 'Token already acted on', existing_action: rt.insurer_action }, 409);
        // Update token
        const ts = new Date().toISOString();
        const { error: updTokenErr } = await db.from('sp_review_tokens').update({
          insurer_action: action,
          insurer_notes: notes,
          actioned_at: ts,
        }).eq('id', rt.id);
        if (updTokenErr) return json({ error: updTokenErr.message }, 400);
        // Map insurer action → order status
        const orderStatus = action === 'APPROVED' ? 'APPROVED'
          : action === 'REQUEST_INFO' ? 'UNDER_REVIEW'
          : 'REJECTED'; // DECLINED → REJECTED
        // Update order — APPROVED memulai SLA upload polis (72 jam)
        const { data: order, error: ordErr } = await db.from('sp_policy_orders').update({
          status: orderStatus,
          insurer_decision: action,
          insurer_decision_notes: notes,
          insurer_decision_at: ts,
          insurer_review_token_id: rt.id,
          reviewer_notes: `Insurer ${action}: ${notes}`,
          reviewed_at: ts,
          updated_at: ts,
          ...(action === 'APPROVED'
            ? { policy_upload_deadline: new Date(Date.now() + POLICY_UPLOAD_SLA_HOURS * 3600 * 1000).toISOString() }
            : {}),
        }).eq('id', rt.order_id).select('id, order_number, client_name, agent_id, product_name, insurer_id').maybeSingle();
        if (ordErr) return json({ error: ordErr.message }, 400);
        // Insert admin notification
        const decisionLabel = action === 'APPROVED' ? 'menyetujui' : action === 'REQUEST_INFO' ? 'meminta info tambahan untuk' : 'menolak';
        db.from('sp_admin_notifications').insert({
          type: `INSURER_${action}`,
          title: `Insurer ${decisionLabel} pengajuan`,
          body: `${order?.order_number ?? 'Order'} — ${order?.client_name ?? ''}: ${notes || '(tanpa catatan)'}`,
          order_id: rt.order_id,
          read: false,
          metadata: { order_id: rt.order_id, action, notes, insurer_id: order?.insurer_id },
        }).then(() => {}, () => {});
        // Insert user/agent notification
        if (order?.agent_id) {
          const userTitle = action === 'APPROVED' ? 'Pengajuan polis disetujui insurer'
            : action === 'REQUEST_INFO' ? 'Insurer meminta info tambahan'
            : 'Pengajuan polis ditolak insurer';
          const userBody = `${order?.order_number ?? ''}: ${notes || 'Mohon lengkapi persyaratan dari insurer.'}`;
          db.from('sp_notifications').insert({
            agent_id: order.agent_id,
            type: 'CLAIM_UPDATE',
            title: userTitle,
            body: userBody,
            read: false,
            metadata: { order_id: rt.order_id, action, notes },
          }).then(() => {}, () => {});
        }
        // Send Telegram alert to admin team
        const tgTime = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        sendTelegram(
          `Insurer Decision - SurePath\n\n` +
          `Order: ${order?.order_number ?? rt.order_id}\n` +
          `Nasabah: ${order?.client_name ?? '-'}\n` +
          `Decision: ${action}\n` +
          `Notes: ${notes || '-'}\n` +
          `Waktu: ${tgTime} WIB`
        );
        // ── Log activity ────────────────────────────────────────────────────
        logActivity(order?.insurer_id ?? null, rt.order_id, 'DECISION_SUBMITTED', { action, notes, via: 'review_token' });
        return json({ data: { success: true, order_status: orderStatus, action } });
      }

    case 'get_insurer_dashboard': {
        const token = String(params.token ?? '');
        if (!token) return json({ error: 'token required' }, 400);
        // Validate insurer auth token (rolling 7-day, multi-use)
        const { data: authToken, error: authErr } = await db.from('sp_insurer_auth_tokens')
          .select('id, insurer_id, email, expires_at, used_at')
          .eq('token', token)
          .maybeSingle();
        if (authErr) return json({ error: authErr.message }, 400);
        if (!authToken) return json({ error: 'Invalid token' }, 404);
        if (new Date(authToken.expires_at) < new Date()) return json({ error: 'Token expired' }, 410);
        // ── Rate limit per insurer (200 req/hour) ───────────────────────────
        const insurerAllowed = await checkRateLimit(`insurer:${authToken.insurer_id}`, 200);
        if (!insurerAllowed) {
          return json({ error: 'Rate limit exceeded untuk insurer ini. Coba lagi dalam 1 jam.' }, 429);
        }
        // Load insurer
        const { data: insurer, error: insErr } = await db.from('sp_insurers')
          .select('id, name, logo_url, admin_name, admin_email, pic_name, pic_email, pic_phone')
          .eq('id', authToken.insurer_id)
          .maybeSingle();
        if (insErr) return json({ error: insErr.message }, 400);
        if (!insurer) return json({ error: 'Insurer not found' }, 404);
        // ── Log activity ────────────────────────────────────────────────────
        logActivity(authToken.insurer_id, null, 'DASHBOARD_VIEWED', { email: authToken.email });
        // Load orders for this insurer
        const { data: orders, error: ordErr } = await db.from('sp_policy_orders')
          .select('id, order_number, client_name, client_phone, product_name, product_code, coverage_type, sum_insured, total_premium, net_premium, status, insurer_decision, insurer_decision_notes, insurer_decision_at, policy_number, policy_document_url, policy_upload_deadline, vehicle_image_url, vehicle_details, created_at, reviewed_at, issued_at')
          .eq('insurer_id', insurer.id)
          .order('created_at', { ascending: false })
          .limit(200);
        if (ordErr) return json({ error: ordErr.message }, 400);
        // KPI counts
        const awaitingPolicyOrders = (orders ?? []).filter((o: any) =>
          o.insurer_decision === 'APPROVED' && !o.policy_document_url && o.status !== 'ISSUED' && o.status !== 'CANCELLED');
        const kpi = {
          total: orders?.length ?? 0,
          pending: (orders ?? []).filter((o: any) => !o.insurer_decision).length,
          approved: (orders ?? []).filter((o: any) => o.insurer_decision === 'APPROVED').length,
          request_info: (orders ?? []).filter((o: any) => o.insurer_decision === 'REQUEST_INFO').length,
          declined: (orders ?? []).filter((o: any) => o.insurer_decision === 'DECLINED').length,
          issued: (orders ?? []).filter((o: any) => o.status === 'ISSUED').length,
          awaiting_policy: awaitingPolicyOrders.length,
        };
        // Auto-renew token (rolling 7-day) — non-blocking
        const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        db.from('sp_insurer_auth_tokens').update({ expires_at: newExpiry, used_at: new Date().toISOString() })
          .eq('id', authToken.id).then(() => {}, () => {});
        return json({ data: { insurer, orders: orders ?? [], kpi, token_expires_at: newExpiry } });
      }

    case 'insurer_submit_decision_authed': {
        const token = String(params.token ?? '');
        const orderId = String(params.order_id ?? '');
        const action = String(params.action ?? '');
        const notes = String(params.notes ?? '');
        if (!token || !orderId || !action) return json({ error: 'token, order_id, action required' }, 400);
        const VALID_ACTIONS = ['APPROVED', 'REQUEST_INFO', 'DECLINED'];
        if (!VALID_ACTIONS.includes(action)) return json({ error: 'Invalid action' }, 400);
        if ((action === 'REQUEST_INFO' || action === 'DECLINED') && notes.trim().length < 5) {
          return json({ error: 'Notes required (min 5 chars) for REQUEST_INFO and DECLINED' }, 400);
        }
        // Validate auth token
        const { data: authToken, error: authErr } = await db.from('sp_insurer_auth_tokens')
          .select('id, insurer_id, expires_at')
          .eq('token', token)
          .maybeSingle();
        if (authErr) return json({ error: authErr.message }, 400);
        if (!authToken) return json({ error: 'Invalid token' }, 404);
        if (new Date(authToken.expires_at) < new Date()) return json({ error: 'Token expired' }, 410);
        // Verify order belongs to this insurer
        const { data: order, error: ordErr } = await db.from('sp_policy_orders')
          .select('id, order_number, client_name, agent_id, product_name, insurer_id, status, insurer_decision')
          .eq('id', orderId)
          .eq('insurer_id', authToken.insurer_id)
          .maybeSingle();
        if (ordErr) return json({ error: ordErr.message }, 400);
        if (!order) return json({ error: 'Order not found or not assigned to your insurer' }, 404);
        if (order.insurer_decision) return json({ error: 'Order already has a decision', existing_action: order.insurer_decision }, 409);
        // Map action → order status
        const orderStatus = action === 'APPROVED' ? 'APPROVED'
          : action === 'REQUEST_INFO' ? 'UNDER_REVIEW' : 'REJECTED';
        const ts = new Date().toISOString();
        const { error: updErr } = await db.from('sp_policy_orders').update({
          status: orderStatus,
          insurer_decision: action,
          insurer_decision_notes: notes,
          insurer_decision_at: ts,
          reviewer_notes: `Insurer ${action}: ${notes}`,
          reviewed_at: ts,
          updated_at: ts,
          ...(action === 'APPROVED'
            ? { policy_upload_deadline: new Date(Date.now() + POLICY_UPLOAD_SLA_HOURS * 3600 * 1000).toISOString() }
            : {}),
        }).eq('id', orderId);
        if (updErr) return json({ error: updErr.message }, 400);
        // Notifications
        const decisionLabel = action === 'APPROVED' ? 'menyetujui' : action === 'REQUEST_INFO' ? 'meminta info tambahan untuk' : 'menolak';
        db.from('sp_admin_notifications').insert({
          type: `INSURER_${action}`,
          title: `Insurer ${decisionLabel} pengajuan`,
          body: `${order.order_number} — ${order.client_name}: ${notes || '(tanpa catatan)'}`,
          order_id: orderId,
          read: false,
          metadata: { order_id: orderId, action, notes, insurer_id: authToken.insurer_id },
        }).then(() => {}, () => {});
        if (order.agent_id) {
          const userTitle = action === 'APPROVED' ? 'Pengajuan polis disetujui insurer'
            : action === 'REQUEST_INFO' ? 'Insurer meminta info tambahan'
            : 'Pengajuan polis ditolak insurer';
          db.from('sp_notifications').insert({
            agent_id: order.agent_id,
            type: 'CLAIM_UPDATE',
            title: userTitle,
            body: `${order.order_number}: ${notes || 'Mohon lengkapi persyaratan dari insurer.'}`,
            read: false,
            metadata: { order_id: orderId, action, notes },
          }).then(() => {}, () => {});
        }
        sendTelegram(
          `Insurer Decision (Dashboard) - SurePath\n\nOrder: ${order.order_number}\nNasabah: ${order.client_name}\nDecision: ${action}\nNotes: ${notes || '-'}`
        );
        // ── Log activity ────────────────────────────────────────────────────
        logActivity(authToken.insurer_id, orderId, 'DECISION_SUBMITTED', { action, notes, via: 'dashboard' });
        return json({ data: { success: true, order_status: orderStatus, action } });
      }

    case 'insurer_list_payments': {
        const token = String(params.token ?? '');
        if (!token) return json({ error: 'token required' }, 400);
        const { data: authToken, error: authErr } = await db.from('sp_insurer_auth_tokens')
          .select('id, insurer_id, expires_at')
          .eq('token', token)
          .maybeSingle();
        if (authErr) return json({ error: authErr.message }, 400);
        if (!authToken) return json({ error: 'Invalid token' }, 404);
        if (new Date(authToken.expires_at) < new Date()) return json({ error: 'Token expired' }, 410);
        // Get all order IDs for this insurer
        const { data: orders } = await db.from('sp_policy_orders')
          .select('id, order_number, client_name, product_name, total_premium, insurer_id')
          .eq('insurer_id', authToken.insurer_id);
        const orderIds = (orders ?? []).map((o: any) => o.id);
        if (orderIds.length === 0) return json({ data: { payments: [], orders: [] } });
        // Fetch payments for these orders
        const { data: payments, error: payErr } = await db.from('sp_payments')
          .select('id, order_id, amount, currency, status, payment_method, payment_channel, paid_amount, paid_at, payer_email, created_at, updated_at')
          .in('order_id', orderIds)
          .order('created_at', { ascending: false })
          .limit(200);
        if (payErr) return json({ error: payErr.message }, 400);
        // Map order_id → order info for easy lookup
        const orderMap: Record<string, any> = {};
        for (const o of (orders ?? [])) orderMap[o.id] = o;
        const enrichedPayments = (payments ?? []).map((p: any) => ({
          ...p,
          order_number: orderMap[p.order_id]?.order_number ?? null,
          client_name: orderMap[p.order_id]?.client_name ?? null,
          product_name: orderMap[p.order_id]?.product_name ?? null,
          total_premium: orderMap[p.order_id]?.total_premium ?? null,
        }));
        return json({ data: { payments: enrichedPayments } });
      }

    case 'insurer_upload_policy': {
        const token = String(params.token ?? '');
        const orderId = String(params.order_id ?? '');
        const policyDocumentUrl = String(params.policy_document_url ?? '');
        const policyNumber = String(params.policy_number ?? '');
        if (!token || !orderId || !policyDocumentUrl) return json({ error: 'token, order_id, policy_document_url required' }, 400);
        // Validate insurer auth token
        const { data: authToken, error: authErr } = await db.from('sp_insurer_auth_tokens')
          .select('id, insurer_id, expires_at')
          .eq('token', token)
          .maybeSingle();
        if (authErr) return json({ error: authErr.message }, 400);
        if (!authToken) return json({ error: 'Invalid token' }, 404);
        if (new Date(authToken.expires_at) < new Date()) return json({ error: 'Token expired' }, 410);
        // Verify order belongs to this insurer
        const { data: order, error: ordErr } = await db.from('sp_policy_orders')
          .select('id, order_number, insurer_id, status, client_name, agent_id')
          .eq('id', orderId)
          .eq('insurer_id', authToken.insurer_id)
          .maybeSingle();
        if (ordErr) return json({ error: ordErr.message }, 400);
        if (!order) return json({ error: 'Order not found or not assigned to your insurer' }, 404);
        // Update order
        const ts = new Date().toISOString();
        const { data: updated, error: updErr } = await db.from('sp_policy_orders').update({
          policy_document_url: policyDocumentUrl,
          policy_number: policyNumber || null,
          status: 'ISSUED',
          issued_at: ts,
          updated_at: ts,
        }).eq('id', orderId).select().maybeSingle();
        if (updErr) return json({ error: updErr.message }, 400);
        // Notifications
        db.from('sp_admin_notifications').insert({
          type: 'POLICY_ISSUED',
          title: 'Polis Diterbitkan oleh Insurer',
          body: `${order.order_number} — ${order.client_name}: polis ${policyNumber || '(no number)'} telah diterbitkan.`,
          order_id: orderId,
          read: false,
          metadata: { order_id: orderId, policy_number: policyNumber, insurer_id: authToken.insurer_id },
        }).then(() => {}, () => {});
        if (order.agent_id) {
          db.from('sp_notifications').insert({
            agent_id: order.agent_id,
            type: 'SYSTEM',
            title: 'Polis Diterbitkan!',
            body: `${order.order_number}: polis ${policyNumber || ''} sudah diterbitkan oleh insurer.`,
            read: false,
            metadata: { order_id: orderId, policy_number: policyNumber },
          }).then(() => {}, () => {});
        }
        // ── Log activity ────────────────────────────────────────────────────
        logActivity(authToken.insurer_id, orderId, 'POLICY_UPLOADED', { policy_number: policyNumber, document_url: policyDocumentUrl });
        return json({ data: { success: true, order: updated } });
      }

    default:
      return null; // Not handled by this module
  }
}
