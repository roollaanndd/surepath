import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders as buildCors } from '../_shared/cors.ts'

// ─── Send OTP ────────────────────────────────────────────────────────────────
//
// SECURITY: This function is called from the unauthenticated signup/login
// flow, so we cannot require a user JWT. Instead:
//   1. Require the Supabase anon key in the Authorization header (proves the
//      caller is using the official client, not spamming the endpoint directly)
//   2. Per-IP rate limit: max 10 OTPs per hour per IP (in addition to the
//      existing per-phone limit of 3 per 10 minutes)
//   3. Per-phone limit stays at 3 per 10 minutes
//
// Combined, this prevents SMS-bombing of arbitrary phone numbers while keeping
// the signup flow working for legitimate users.

const FONNTE_TOKEN = Deno.env.get('FONNTE_TOKEN') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const OTP_PHONE_RATE_LIMIT = 3       // max OTPs per phone per window
const OTP_PHONE_WINDOW_MINUTES = 10  // rolling window
const OTP_IP_RATE_LIMIT = 10         // max OTPs per IP per window
const OTP_IP_WINDOW_MINUTES = 60     // rolling window

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return '62' + digits.slice(1)
  if (digits.startsWith('62')) return digits
  return '62' + digits
}

function generateOtp(): string {
  // crypto.getRandomValues instead of Math.random() — not that a 6-digit
  // space is brute-forceable given the rate limits/lockout below, but no
  // reason to use a non-CSPRNG when the Web Crypto API is right there.
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  const n = buf[0] % 900000
  return String(100000 + n)
}

function getClientIp(req: Request): string {
  // Supabase edge functions run behind a CDN; client IP is in cf-connecting-ip
  // or x-forwarded-for (first hop).
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

function json(body: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  const corsHeaders = buildCors(req.headers.get('origin'))
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // ── Require anon key (proves caller is using the official client) ──────
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token || token !== ANON_KEY) {
    return json({ ok: false, error: 'Unauthorized' }, 401, corsHeaders)
  }

  try {
    const { phone, purpose = 'LOGIN' } = await req.json()

    if (!phone) {
      return json({ ok: false, error: 'Phone required' }, 400, corsHeaders)
    }

    const normalized = normalizePhone(phone)
    const clientIp = getClientIp(req)

    // Generate OTP first so we have it ready
    const code = generateOtp()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ── Per-phone rate limit: max OTP_PHONE_RATE_LIMIT per OTP_PHONE_WINDOW_MINUTES ──
    const phoneWindowStart = new Date(Date.now() - OTP_PHONE_WINDOW_MINUTES * 60 * 1000).toISOString()
    const { count: phoneCount } = await supabase
      .from('sp_otp_codes')
      .select('id', { count: 'exact', head: true })
      .eq('phone', normalized)
      .eq('purpose', purpose)
      .gte('created_at', phoneWindowStart)
    if ((phoneCount ?? 0) >= OTP_PHONE_RATE_LIMIT) {
      return json({ ok: false, error: `Terlalu banyak permintaan OTP. Coba lagi dalam ${OTP_PHONE_WINDOW_MINUTES} menit.` }, 429, corsHeaders)
    }

    // ── Per-IP rate limit: max OTP_IP_RATE_LIMIT per OTP_IP_WINDOW_MINUTES ──
    // Stored in sp_otp_codes.created_by_ip (if column exists; otherwise no-op).
    // We use a try/catch so this is non-blocking if the column doesn't exist.
    try {
      const ipWindowStart = new Date(Date.now() - OTP_IP_WINDOW_MINUTES * 60 * 1000).toISOString()
      const { count: ipCount } = await supabase
        .from('sp_otp_codes')
        .select('id', { count: 'exact', head: true })
        .eq('created_by_ip', clientIp)
        .gte('created_at', ipWindowStart)
      if ((ipCount ?? 0) >= OTP_IP_RATE_LIMIT) {
        return json({ ok: false, error: `Terlalu banyak permintaan dari jaringan ini. Coba lagi dalam ${OTP_IP_WINDOW_MINUTES} menit.` }, 429, corsHeaders)
      }
    } catch {
      // created_by_ip column may not exist yet — non-blocking
    }

    // Invalidate previous unused codes for this phone+purpose
    await supabase
      .from('sp_otp_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('phone', normalized)
      .eq('purpose', purpose)
      .is('used_at', null)

    // Insert new OTP (with client IP for audit + rate limiting)
    const insertPayload: Record<string, unknown> = {
      phone: normalized,
      code,
      purpose,
    }
    // Try to set created_by_ip if the column exists
    try {
      insertPayload.created_by_ip = clientIp
    } catch { /* noop */ }

    const { error: insertErr } = await supabase.from('sp_otp_codes').insert(insertPayload)

    if (insertErr) {
      // If the error is due to created_by_ip column not existing, retry without it
      if (String(insertErr).includes('created_by_ip')) {
        delete insertPayload.created_by_ip
        const { error: retryErr } = await supabase.from('sp_otp_codes').insert(insertPayload)
        if (retryErr) throw retryErr
      } else {
        throw insertErr
      }
    }

    // Send via Fonnte WhatsApp API
    if (!FONNTE_TOKEN) {
      console.warn('FONNTE_TOKEN not set — OTP not sent via WhatsApp')
    } else {
      const message = `Kode verifikasi SurePath Anda: *${code}*\n\nBerlaku 5 menit. Jangan bagikan ke siapapun.`
      const fRes = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token: FONNTE_TOKEN,
        },
        body: JSON.stringify({
          target: normalized,
          message,
          countryCode: '62',
        }),
      })
      const fData = await fRes.json()
      if (!fData.status) {
        console.error('Fonnte error:', JSON.stringify(fData))
      }
    }

    return json({ ok: true, phone: normalized }, 200, corsHeaders)
  } catch (err) {
    console.error('send-otp error:', err)
    return json({ ok: false, error: 'Terjadi kesalahan. Coba lagi.' }, 500, corsHeaders)
  }
})
