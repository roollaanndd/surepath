import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };

function wib(dt: Date | string) {
  return new Date(dt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
}

function fmtIDR(n: number) {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000)     return `Rp ${(n / 1_000_000).toFixed(1)} jt`;
  if (n >= 1_000)         return `Rp ${(n / 1_000).toFixed(0)} rb`;
  return `Rp ${n}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const BOT_TOKEN    = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
    const CHAT_ID      = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') ?? '';

    if (!BOT_TOKEN || !CHAT_ID) {
      return new Response('Telegram not configured', { status: 500, headers: CORS });
    }

    const db  = createClient(SUPABASE_URL, SUPABASE_KEY);
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    // Run all queries in parallel
    const [usersRes, paymentsRes, ordersRes, agentsRes, customersRes, claimsRes] = await Promise.all([
      // New registrations today (any role)
      db.from('sp_users').select('id, name, role, created_at').gte('created_at', todayISO),
      // Paid transactions today
      db.from('sp_payments').select('amount, paid_amount, paid_at').eq('status', 'PAID').gte('paid_at', todayISO),
      // Orders today
      db.from('sp_policy_orders').select('status, total_premium, product_name, created_at').gte('created_at', todayISO),
      // Total active agents
      db.from('sp_users').select('id', { count: 'exact', head: true }).eq('role', 'AGENT').eq('verified', true),
      // Total customers
      db.from('sp_users').select('id', { count: 'exact', head: true }).eq('role', 'CUSTOMER'),
      // Claims submitted today
      db.from('sp_claims').select('id, status').gte('created_at', todayISO),
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
    msg += `\n`;

    msg += `📈 <b>Klaim Hari Ini:</b> ${claimsToday.length}\n\n`;

    msg += `🏦 <b>Platform</b>\n`;
    msg += `  Agen aktif: <b>${totalAgents.toLocaleString('id-ID')}</b>\n`;
    msg += `  Total nasabah: <b>${totalCustomers.toLocaleString('id-ID')}</b>\n\n`;

    msg += `<a href="https://myinsurepath.com/admin">Buka Dashboard →</a>`;

    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: msg, parse_mode: 'HTML', disable_web_page_preview: true }),
    });

    const tgData = await tgRes.json();
    return new Response(JSON.stringify({ ok: true, telegram: tgData }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('daily-report error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: CORS });
  }
});
