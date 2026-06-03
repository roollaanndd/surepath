import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders as buildCors } from '../_shared/cors.ts'

const FONNTE_TOKEN = Deno.env.get('FONNTE_TOKEN') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const OTP_RATE_LIMIT = 3       // max OTPs per window
const OTP_WINDOW_MINUTES = 10  // rolling window

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return '62' + digits.slice(1)
  if (digits.startsWith('62')) return digits
  return '62' + digits
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

serve(async (req) => {
  const corsHeaders = buildCors(req.headers.get('origin'))
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone, purpose = 'LOGIN' } = await req.json()

    if (!phone) {
      return new Response(JSON.stringify({ ok: false, error: 'Phone required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalized = normalizePhone(phone)
    const code = generateOtp()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ── Server-side rate limit: max OTP_RATE_LIMIT requests per OTP_WINDOW_MINUTES ──
    const windowStart = new Date(Date.now() - OTP_WINDOW_MINUTES * 60 * 1000).toISOString()
    const { count: recentCount } = await supabase
      .from('sp_otp_codes')
      .select('id', { count: 'exact', head: true })
      .eq('phone', normalized)
      .eq('purpose', purpose)
      .gte('created_at', windowStart)
    if ((recentCount ?? 0) >= OTP_RATE_LIMIT) {
      return new Response(JSON.stringify({ ok: false, error: `Terlalu banyak permintaan OTP. Coba lagi dalam ${OTP_WINDOW_MINUTES} menit.` }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Invalidate previous unused codes for this phone+purpose
    await supabase
      .from('sp_otp_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('phone', normalized)
      .eq('purpose', purpose)
      .is('used_at', null)

    // Insert new OTP
    const { error: insertErr } = await supabase.from('sp_otp_codes').insert({
      phone: normalized,
      code,
      purpose,
    })

    if (insertErr) throw insertErr

    // Send via Fonnte WhatsApp API
    if (!FONNTE_TOKEN) {
      console.warn('FONNTE_TOKEN not set — OTP not sent via WhatsApp')
    } else {
      const message = `Kode verifikasi SurePath Anda: *${code}*\n\nBerlaku 5 menit. Jangan bagikan ke siapapun.`
      const fRes = await fetch('https://fontee.id/api/send', {
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

    return new Response(JSON.stringify({ ok: true, phone: normalized }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-otp error:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
