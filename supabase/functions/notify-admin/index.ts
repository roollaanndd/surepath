import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const TELEGRAM_CHAT_ID   = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') ?? ''
// Shared secret for DB webhook calls — set WEBHOOK_SECRET in Supabase env vars
// and configure the same value in the pg_net / Supabase webhook header.
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? ''

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

  // Validate webhook secret if configured
  if (WEBHOOK_SECRET) {
    const provided = req.headers.get('x-webhook-secret') ?? ''
    if (provided !== WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  try {
    const payload = await req.json()
    const { type, table, record } = payload

    // New user registration
    if (table === 'sp_users' && type === 'INSERT') {
      const name  = record.full_name ?? record.name ?? 'Unknown'
      const email = record.email ?? '-'
      const phone = record.phone ?? '-'
      const role  = record.role ?? 'CUSTOMER'
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

    // New policy order (sp_policy_orders is the active orders table)
    if (table === 'sp_policy_orders' && type === 'INSERT') {
      const orderNo  = record.order_number ?? record.id ?? '-'
      const client   = record.client_name ?? '-'
      const product  = record.product_name ?? '-'
      const premium  = record.total_premium
        ? `Rp ${Number(record.total_premium).toLocaleString('id-ID')}`
        : '-'
      const status   = record.status ?? 'PENDING'
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
      const claimId  = record.id ?? '-'
      const location = record.location ?? '-'
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
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
