import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// ─── notify-admin — Telegram admin notifications ────────────────────────────
//
// SECURITY HISTORY:
// Previous version had two issues:
//   1. If WEBHOOK_SECRET was unset, the function accepted any unauthenticated
//      POST (fail-open). Now fail-closed: if WEBHOOK_SECRET is unset, return 500.
//   2. User-supplied data (name, email, phone, order numbers) was interpolated
//      into Telegram HTML messages without escaping. A name like
//      "</b><b>URGENT: Transfer funds</b>" would render as a fake urgent
//      message in the admin Telegram chat. Now all fields are HTML-escaped.

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const TELEGRAM_CHAT_ID   = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') ?? ''
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? ''

/** Escape HTML special characters for safe Telegram HTML rendering. */
function escapeHtml(s: unknown): string {
  if (s == null) return '-'
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function sendTelegram(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  })
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok', { status: 200 })

  // ── Fail-closed: require WEBHOOK_SECRET to be configured ──────────────
  // Previously: if WEBHOOK_SECRET was unset, the if-block was skipped and
  // any unauthenticated POST was accepted. Now: 500 if not configured.
  if (!WEBHOOK_SECRET) {
    console.error('notify-admin: WEBHOOK_SECRET not configured — rejecting request')
    return new Response(JSON.stringify({ ok: false, error: 'Server misconfiguration' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  const provided = req.headers.get('x-webhook-secret') ?? ''
  if (provided !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const payload = await req.json()
    const { type, table, record } = payload

    // New user registration
    if (table === 'sp_users' && type === 'INSERT') {
      const name  = escapeHtml(record.full_name ?? record.name ?? 'Unknown')
      const email = escapeHtml(record.email ?? '-')
      const phone = escapeHtml(record.phone ?? '-')
      const role  = escapeHtml(record.role ?? 'CUSTOMER')
      const time  = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })

      await sendTelegram(
        `🆕 <b>Pendaftaran Baru – SurePath</b>\n\n` +
        `👤 <b>Nama:</b> ${name}\n` +
        `📧 <b>Email:</b> ${email}\n` +
        `📱 <b>HP:</b> ${phone}\n` +
        `🏷 <b>Role:</b> ${role}\n` +
        `🕐 <b>Waktu:</b> ${time} WIB\n\n` +
        `🔗 <a href="https://myinsurepath.com/admin">Buka Admin Panel</a>`
      )
    }

    // New policy order
    if (table === 'sp_policy_orders' && type === 'INSERT') {
      const orderNo  = escapeHtml(record.order_number ?? record.id ?? '-')
      const client   = escapeHtml(record.client_name ?? '-')
      const product  = escapeHtml(record.product_name ?? '-')
      const premium  = record.total_premium
        ? `Rp ${Number(record.total_premium).toLocaleString('id-ID')}`
        : '-'
      const status   = escapeHtml(record.status ?? 'PENDING')
      const time     = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })

      await sendTelegram(
        `📋 <b>Order Polis Baru – SurePath</b>\n\n` +
        `🔢 <b>No. Order:</b> ${orderNo}\n` +
        `👤 <b>Nasabah:</b> ${client}\n` +
        `📦 <b>Produk:</b> ${product}\n` +
        `💰 <b>Premi:</b> ${premium}\n` +
        `📊 <b>Status:</b> ${status}\n` +
        `🕐 <b>Waktu:</b> ${time} WIB\n\n` +
        `🔗 <a href="https://myinsurepath.com/admin">Buka Admin Panel</a>`
      )
    }

    // New claim submitted
    if (table === 'sp_claims' && type === 'INSERT') {
      const claimId  = escapeHtml(record.id ?? '-')
      const location = escapeHtml(record.location ?? '-')
      const amount   = record.amount_estimated
        ? `Rp ${Number(record.amount_estimated).toLocaleString('id-ID')}`
        : '-'
      const time     = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })

      await sendTelegram(
        `🚨 <b>Klaim Baru Masuk – SurePath</b>\n\n` +
        `🔢 <b>ID Klaim:</b> ${claimId}\n` +
        `📍 <b>Lokasi:</b> ${location}\n` +
        `💸 <b>Est. Nilai:</b> ${amount}\n` +
        `🕐 <b>Waktu:</b> ${time} WIB\n\n` +
        `🔗 <a href="https://myinsurepath.com/admin">Buka Admin Panel</a>`
      )
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-admin error:', err)
    return new Response(JSON.stringify({ ok: false, error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
