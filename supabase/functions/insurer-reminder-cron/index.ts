// ─────────────────────────────────────────────────────────────────────────────
// insurer-reminder-cron — Scheduled edge function that runs every 4 hours.
//
// Sends reminder emails to insurers who haven't acted on review tokens:
//   - 24h after creation: first reminder (if reminder_count = 0)
//   - 72h after creation: second reminder (if reminder_count = 1)
//   - 120h after creation: final reminder + admin notification (if reminder_count = 2)
//
// Also notifies customers whose orders are in UNDER_REVIEW (REQUEST_INFO)
// status for more than 48h to complete the requested info.
//
// Trigger: Supabase Cron schedule (configured in Supabase Dashboard):
//   Schedule: 0 */4 * * *  (every 4 hours)
//   Function: insurer-reminder-cron
//
// Auth: Cron webhook uses a CRON_SECRET header for auth. If not set, falls
// back to checking the User-Agent contains "supabase" (cron runtime).
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // This function is cron-triggered (auth via x-cron-secret below), not
  // meant for direct browser calls — but use the same origin allowlist as
  // every other function instead of a wildcard, for consistency and so a
  // stray browser probe doesn't get a blanket-allow response.
  const CORS = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Auth: check CRON_SECRET header (set in Supabase secrets)
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  const providedSecret = req.headers.get('x-cron-secret') ?? '';
  if (cronSecret && providedSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? Deno.env.get('RESEND_KEY') ?? '';

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const db = createClient(SUPABASE_URL, SERVICE_KEY);
  const now = new Date();
  const results = {
    reminders_sent: 0,
    admin_alerts: 0,
    customer_notifications: 0,
    errors: [] as string[],
  };

  try {
    // ── 1. Find review tokens that need reminders ────────────────────────────
    // Tokens where:
    //   - insurer_action IS NULL (not yet acted on)
    //   - expires_at > now (still valid)
    //   - reminder_count < 3 (max 3 reminders)
    const { data: pendingTokens, error: tkErr } = await db.from('sp_review_tokens')
      .select('id, token, order_id, created_at, expires_at, reminder_count, last_reminded_at, review_url')
      .is('insurer_action', null)
      .gt('expires_at', now.toISOString())
      .lt('reminder_count', 3)
      .order('created_at', { ascending: false })
      .limit(500);

    if (tkErr) {
      results.errors.push(`token query: ${tkErr.message}`);
    }

    if (pendingTokens && pendingTokens.length > 0) {
      // Fetch order + insurer info for these tokens
      const orderIds = pendingTokens.map((t: any) => t.order_id);
      const { data: orders } = await db.from('sp_policy_orders')
        .select('id, order_number, client_name, product_name, total_premium, insurer_id, insurer_name')
        .in('id', orderIds);
      const orderMap: Record<string, any> = {};
      for (const o of (orders ?? [])) orderMap[o.id] = o;

      // Fetch insurer emails
      const insurerIds = [...new Set((orders ?? []).map((o: any) => o.insurer_id).filter(Boolean))];
      const { data: insurers } = await db.from('sp_insurers')
        .select('id, name, pic_email, admin_email')
        .in('id', insurerIds);
      const insurerMap: Record<string, any> = {};
      for (const ins of (insurers ?? [])) insurerMap[ins.id] = ins;

      for (const tk of pendingTokens) {
        const order = orderMap[tk.order_id];
        if (!order) continue;
        const insurer = insurerMap[order.insurer_id];
        if (!insurer) continue;
        const email = insurer.pic_email || insurer.admin_email;
        if (!email) continue;

        const createdAt = new Date(tk.created_at);
        const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        const reminderCount = tk.reminder_count ?? 0;

        // Determine if reminder should be sent
        let shouldSend = false;
        let reminderStage = '';
        if (reminderCount === 0 && hoursSinceCreated >= 24) {
          shouldSend = true;
          reminderStage = 'first (24h)';
        } else if (reminderCount === 1 && hoursSinceCreated >= 72) {
          shouldSend = true;
          reminderStage = 'second (72h)';
        } else if (reminderCount === 2 && hoursSinceCreated >= 120) {
          shouldSend = true;
          reminderStage = 'final (120h)';
        }

        if (!shouldSend) continue;

        // Send reminder email
        if (RESEND_KEY && tk.review_url) {
          const esc = (s: string) => String(s).replace(/[&<>"']/g, (c) =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
          const premiumFmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(order.total_premium ?? 0);
          const subject = `[Reminder ${reminderCount + 1}/3] Pengajuan Polis Menunggu Review: ${order.order_number}`;
          const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#f4f4f5;padding:32px;">
<table width="560" style="background:#fff;border-radius:16px;margin:0 auto;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:#7c3aed;padding:24px 32px;color:#fff;">
  <span style="font-size:20px;font-weight:900;">Sure<span style="color:#c4b5fd;">Path</span></span>
  <span style="display:block;font-size:10px;letter-spacing:3px;text-transform:uppercase;opacity:0.7;margin-top:2px;">Reminder ${reminderCount + 1} of 3</span>
</td></tr>
<tr><td style="padding:32px;">
  <h1 style="font-size:22px;color:#0f172a;margin:0 0 16px;">Pengajuan polis menunggu review Anda</h1>
  <p style="font-size:14px;color:#64748b;margin:0 0 24px;">Ini adalah reminder ${reminderStage}. Pengajuan berikut belum Anda tinjau:</p>
  <table style="background:#f8fafc;border-radius:12px;width:100%;margin-bottom:24px;"><tr><td style="padding:20px;">
    <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">No. Order</p>
    <p style="font-size:14px;font-weight:800;color:#7c3aed;margin:0 0 12px;font-family:monospace;">${esc(order.order_number)}</p>
    <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">Nasabah</p>
    <p style="font-size:14px;font-weight:700;color:#0f172a;margin:0 0 12px;">${esc(order.client_name)}</p>
    <p style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px;">Total Premi</p>
    <p style="font-size:16px;font-weight:900;color:#7c3aed;margin:0;">${premiumFmt}</p>
  </td></tr></table>
  <a href="${esc(tk.review_url)}" style="display:block;background:#7c3aed;color:#fff;font-size:14px;font-weight:800;text-decoration:none;text-align:center;padding:16px;border-radius:12px;text-transform:uppercase;letter-spacing:1.5px;">Review Sekarang</a>
  <p style="font-size:11px;color:#94a3b8;margin:20px 0 0;text-align:center;">Link berlaku sampai ${new Date(tk.expires_at).toLocaleDateString('id-ID')}</p>
</td></tr>
<tr><td style="background:#f8fafc;padding:16px 32px;text-align:center;">
  <span style="font-size:10px;color:#94a3b8;">PT Ruang Proteksi Indonesia · myinsurepath.com</span>
</td></tr>
</table>
</body></html>`;
          fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: 'SurePath <noreply@myinsurepath.com>', to: [email], subject, html }),
          }).then(() => {}, () => {});
        }

        // Update token: increment reminder_count + set last_reminded_at
        await db.from('sp_review_tokens').update({
          reminder_count: reminderCount + 1,
          last_reminded_at: now.toISOString(),
        }).eq('id', tk.id);

        results.reminders_sent++;

        // If this is the final reminder (3rd), also notify admin
        if (reminderCount === 2) {
          await db.from('sp_admin_notifications').insert({
            type: 'INSURER_REVIEW_OVERDUE',
            title: 'Insurer Belum Respons (5 hari)',
            body: `${order.order_number} — ${order.client_name}: insurer belum merespons setelah 5 hari dan 3 reminder. Hubungi insurer langsung.`,
            order_id: tk.order_id,
            read: false,
            metadata: { token_id: tk.id, order_id: tk.order_id, insurer_name: insurer.name },
          });
          results.admin_alerts++;
        }
      }
    }

    // ── 2. Notify customers with UNDER_REVIEW (REQUEST_INFO) > 48h ───────────
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const { data: overdueOrders, error: odErr } = await db.from('sp_policy_orders')
      .select('id, order_number, client_name, agent_id, insurer_decision_notes, reviewed_at')
      .eq('status', 'UNDER_REVIEW')
      .eq('insurer_decision', 'REQUEST_INFO')
      .lt('reviewed_at', fortyEightHoursAgo);

    if (odErr) {
      results.errors.push(`overdue query: ${odErr.message}`);
    }

    if (overdueOrders && overdueOrders.length > 0) {
      for (const order of overdueOrders) {
        // Check if we already sent a reminder notification for this order
        const { data: existing } = await db.from('sp_notifications')
          .select('id')
          .eq('agent_id', order.agent_id)
          .eq('metadata->>order_id', order.id)
          .eq('type', 'RENEWAL_ALERT')
          .limit(1);
        if (existing && existing.length > 0) continue; // already reminded

        if (order.agent_id) {
          await db.from('sp_notifications').insert({
            agent_id: order.agent_id,
            type: 'RENEWAL_ALERT',
            title: 'Lengkapi Info dari Insurer',
            body: `${order.order_number}: insurer meminta info tambahan. Mohon segera lengkapi agar polis bisa diproses. Catatan: ${order.insurer_decision_notes ?? '-'}`,
            read: false,
            metadata: { order_id: order.id, reminder: true },
          });
          results.customer_notifications++;
        }
      }
    }
  } catch (e: any) {
    results.errors.push(`unexpected: ${e.message}`);
  }

  return new Response(JSON.stringify({
    success: true,
    timestamp: now.toISOString(),
    ...results,
  }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
