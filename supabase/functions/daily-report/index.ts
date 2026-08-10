
import { createClient } from 'npm:@supabase/supabase-js@2';

// Admin daily digest — new users, orders, claims, payments for the day.
// Delivered via Telegram AND email (Resend), so admins get it even if only one
// channel is configured. Called by Supabase cron (see cron.job daily-report),
// never from a browser.
//
// Auth: accepts the internal cron header `x-supabase-cron: 1` (same pattern as
// backup-daily) OR `Authorization: Bearer <CRON_SECRET>` for manual/legacy runs.

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';

function fmtIDR(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(1)} jt`;
  if (n >= 1_000)         return `Rp ${(n / 1_000).toFixed(0)} rb`;
  return `Rp ${n}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok');

  // Authorize: internal cron header OR bearer CRON_SECRET.
  const isCron = req.headers.get('x-supabase-cron') === '1';
  const authHeader = req.headers.get('authorization') ?? '';
  const providedSecret = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const secretOk = CRON_SECRET !== '' && providedSecret === CRON_SECRET;
  if (!isCron && !secretOk) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const BOT_TOKEN    = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
    const CHAT_ID      = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') ?? '';
    const RESEND_KEY   = Deno.env.get('RESEND_API_KEY') ?? Deno.env.get('RESEND_KEY') ?? '';
    const ADMIN_EMAIL  = Deno.env.get('ADMIN_DIGEST_EMAIL') ?? '';

    const db  = createClient(SUPABASE_URL, SUPABASE_KEY);
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    const [usersRes, paymentsRes, ordersRes, agentsRes, customersRes, claimsRes, adminEmailsRes] = await Promise.all([
      db.from('sp_users').select('id, name, role, created_at').gte('created_at', todayISO),
      db.from('sp_payments').select('amount, paid_amount, paid_at').eq('status', 'PAID').gte('paid_at', todayISO),
      db.from('sp_policy_orders').select('status, total_premium, product_name, created_at').gte('created_at', todayISO),
      db.from('sp_users').select('id', { count: 'exact', head: true }).eq('role', 'AGENT').eq('verified', true),
      db.from('sp_users').select('id', { count: 'exact', head: true }).eq('role', 'CUSTOMER'),
      db.from('sp_claims').select('id, status').gte('created_at', todayISO),
      // Admin recipients for the email channel
      db.from('sp_users').select('email').in('role', ['MASTER_ADMIN', 'ADMIN']),
    ]);

    const newUsers    = usersRes.data ?? [];
    const payments    = paymentsRes.data ?? [];
    const orders      = ordersRes.data ?? [];
    const claimsToday = claimsRes.data ?? [];

    const newAgents    = newUsers.filter(u => u.role === 'AGENT');
    const newCustomers = newUsers.filter(u => u.role === 'CUSTOMER');
    const newB2B       = newUsers.filter(u => u.role === 'B2B_CLIENT');

    const gwpToday = payments.reduce((s, p) => s + (p.paid_amount ?? p.amount ?? 0), 0);
    const ordersSubmitted = orders.filter(o => o.status === 'SUBMITTED').length;
    const ordersIssued    = orders.filter(o => o.status === 'ISSUED').length;

    const totalAgents    = agentsRes.count ?? 0;
    const totalCustomers = customersRes.count ?? 0;

    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

    let msg = `📊 <b>Laporan Harian SurePath</b>\n`;
    msg += `📅 ${dateStr} · ${timeStr} WIB\n\n`;
    msg += `💰 <b>Transaksi Hari Ini</b>\n`;
    msg += `  GWP Terbayar: <b>${fmtIDR(gwpToday)}</b>\n`;
    msg += `  Pembayaran sukses: <b>${payments.length}</b>\n`;
    msg += `  Order masuk: <b>${ordersSubmitted}</b>\n`;
    msg += `  Polis terbit: <b>${ordersIssued}</b>\n\n`;
    msg += `👥 <b>Pendaftaran Baru</b>\n`;
    msg += `  🏢 Agen baru: <b>${newAgents.length}</b>\n`;
    msg += `  👤 Nasabah baru: <b>${newCustomers.length}</b>\n`;
    msg += `  🏭 Klien korporat: <b>${newB2B.length}</b>\n`;
    if (newAgents.length > 0) {
      msg += `  ↳ ${newAgents.slice(0, 3).map(a => a.name).join(', ')}${newAgents.length > 3 ? ` +${newAgents.length - 3}` : ''}\n`;
    }
    msg += `\n📈 <b>Klaim Hari Ini:</b> ${claimsToday.length}\n\n`;
    msg += `🏦 <b>Platform</b>\n`;
    msg += `  Agen aktif: <b>${totalAgents.toLocaleString('id-ID')}</b>\n`;
    msg += `  Total nasabah: <b>${totalCustomers.toLocaleString('id-ID')}</b>\n\n`;
    msg += `<a href="https://myinsurepath.com/admin">Buka Dashboard →</a>`;

    const channels: Record<string, unknown> = {};

    // ── Telegram ──────────────────────────────────────────────────────────────
    if (BOT_TOKEN && CHAT_ID) {
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: CHAT_ID, text: msg, parse_mode: 'HTML', disable_web_page_preview: true }),
        });
        channels.telegram = { ok: tgRes.ok, status: tgRes.status };
      } catch (e) {
        channels.telegram = { ok: false, error: String(e) };
      }
    } else {
      channels.telegram = { ok: false, skipped: 'TELEGRAM_BOT_TOKEN/CHAT_ID not set' };
    }

    // ── Email (Resend) — to configured ADMIN_DIGEST_EMAIL + all admin accounts ──
    const recipients = [
      ...(ADMIN_EMAIL ? [ADMIN_EMAIL] : []),
      ...((adminEmailsRes.data ?? []).map((r: { email: string }) => r.email).filter(Boolean)),
    ];
    const uniqueRecipients = [...new Set(recipients)];
    if (RESEND_KEY && uniqueRecipients.length > 0) {
      const html = `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
        <h2 style="color:#059669;margin:0 0 4px">📊 Laporan Harian SurePath</h2>
        <p style="color:#64748b;margin:0 0 16px;font-size:13px">${dateStr} · ${timeStr} WIB</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#64748b">GWP Terbayar</td><td align="right"><b>${fmtIDR(gwpToday)}</b></td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Pembayaran sukses</td><td align="right"><b>${payments.length}</b></td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Order masuk</td><td align="right"><b>${ordersSubmitted}</b></td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Polis terbit</td><td align="right"><b>${ordersIssued}</b></td></tr>
          <tr><td colspan="2" style="border-top:1px solid #e2e8f0;padding-top:8px"></td></tr>
          <tr><td style="padding:6px 0;color:#64748b">🏢 Agen baru</td><td align="right"><b>${newAgents.length}</b></td></tr>
          <tr><td style="padding:6px 0;color:#64748b">👤 Nasabah baru</td><td align="right"><b>${newCustomers.length}</b></td></tr>
          <tr><td style="padding:6px 0;color:#64748b">🏭 Klien korporat</td><td align="right"><b>${newB2B.length}</b></td></tr>
          <tr><td style="padding:6px 0;color:#64748b">📈 Klaim hari ini</td><td align="right"><b>${claimsToday.length}</b></td></tr>
          <tr><td colspan="2" style="border-top:1px solid #e2e8f0;padding-top:8px"></td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Agen aktif (total)</td><td align="right"><b>${totalAgents.toLocaleString('id-ID')}</b></td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Total nasabah</td><td align="right"><b>${totalCustomers.toLocaleString('id-ID')}</b></td></tr>
        </table>
        <p style="margin-top:20px"><a href="https://myinsurepath.com/admin" style="background:#059669;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Buka Dashboard →</a></p>
      </div>`;
      try {
        const mailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'SurePath <noreply@myinsurepath.com>',
            to: uniqueRecipients,
            subject: `📊 Laporan Harian SurePath — ${dateStr}`,
            html,
          }),
        });
        channels.email = { ok: mailRes.ok, status: mailRes.status, recipients: uniqueRecipients.length };
      } catch (e) {
        channels.email = { ok: false, error: String(e) };
      }
    } else {
      channels.email = { ok: false, skipped: RESEND_KEY ? 'no admin recipients' : 'RESEND_API_KEY not set' };
    }

    return new Response(JSON.stringify({ ok: true, channels }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('daily-report error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});
