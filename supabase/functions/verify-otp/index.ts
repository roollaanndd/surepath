import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders as buildCors } from '../_shared/cors.ts'

// ─── Verify OTP ──────────────────────────────────────────────────────────────
//
// SECURITY HISTORY:
// Previous version accepted a client-supplied `email` parameter and, after
// verifying the OTP against a phone number, generated a Supabase magic-link
// for that email and returned the action_link URL in the response. The phone
// and email were completely independent — an attacker could verify their own
// phone OTP and then request a magic link for ANY email (including admins),
// resulting in complete account takeover.
//
// FIXED: The function now ONLY verifies the OTP and marks it used. It does not
// generate magic links for any email. If phone-based login is needed, callers
// should use `supabase.auth.signInWithOtp({ phone })` via the SDK, which
// generates a phone-verified session directly (not an arbitrary email link).
//
// The function also now:
//   - Enforces a max-attempt counter (5 wrong tries locks the code)
//   - Returns generic error messages (no timing-safe check, but no PII leak)
//   - Fails closed on any configuration error

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const MAX_ATTEMPTS = 5

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return '62' + digits.slice(1)
  if (digits.startsWith('62')) return digits
  return '62' + digits
}

Deno.serve(async (req) => {
  const corsHeaders = buildCors(req.headers.get('origin'))
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { phone, code, purpose = 'LOGIN' } = body as { phone?: string; code?: string; purpose?: string }

    if (!phone || !code) {
      return new Response(JSON.stringify({ ok: false, error: 'Phone and code required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalized = normalizePhone(phone)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Find valid, unused, non-expired OTP
    const { data: rows, error: fetchErr } = await supabase
      .from('sp_otp_codes')
      .select('id, code, expires_at, used_at, attempts')
      .eq('phone', normalized)
      .eq('purpose', purpose)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (fetchErr) throw fetchErr

    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Kode otp tidak valid atau sudah kedaluwarsa' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const row = rows[0]

    // ── Attempt counter — lock after MAX_ATTEMPTS wrong tries ──────────────
    const attempts = Number(row.attempts ?? 0)
    if (attempts >= MAX_ATTEMPTS) {
      // Mark as used so it can't be retried
      await supabase
        .from('sp_otp_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', row.id)
      return new Response(JSON.stringify({ ok: false, error: 'Terlalu banyak percobaan. Silakan minta kode baru.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (row.code !== code) {
      // Increment attempts counter
      await supabase
        .from('sp_otp_codes')
        .update({ attempts: attempts + 1 })
        .eq('id', row.id)
      return new Response(JSON.stringify({ ok: false, error: 'Kode otp salah' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Mark OTP used
    await supabase
      .from('sp_otp_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', row.id)

    // ── SECURITY: do NOT generate a magic link for any email ──────────────
    // Previous behavior allowed account takeover. Phone OTP verification now
    // only confirms the phone is valid — the caller must use Supabase Auth's
    // native phone-OTP sign-in (supabase.auth.signInWithOtp({ phone })) to
    // get a session, which binds the session to the verified phone.
    return new Response(JSON.stringify({ ok: true, phone: normalized }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('verify-otp error:', err)
    return new Response(JSON.stringify({ ok: false, error: 'Terjadi kesalahan. Coba lagi.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
