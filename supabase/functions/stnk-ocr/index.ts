import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';

// ─── STNK OCR Edge Function ──────────────────────────────────────────────────
// Receives an STNK photo (base64), proxies it to the OpenRouter multimodal
// model with a structured extraction prompt, and returns a normalised JSON
// object covering every field on a real Indonesian STNK.
//
// The OpenRouter key is sourced from Supabase Vault (secret: OPENROUTER_KEY)
// or the function's own env. The key is never exposed to the client — the
// browser only ever calls this edge function.
//
// Schema is documented in services/stnkOcr.ts (StnkOcrRaw) and matches the
// prompt below 1:1 so the client can normalise without surprises.

interface StnkOcrResponse {
  status: 'OK' | 'PARTIAL' | 'UNCLEAR' | 'ERROR';
  confidence: number;
  fields: Record<string, string>;
  notes?: string;
}

const EXTRACTION_PROMPT = `You are a senior OCR engine specialised in Indonesian vehicle registration documents (STNK / Surat Tanda Nomor Kendaraan).

Perform high-precision OCR on this STNK image. Extract every field you can read with confidence. If a field is obscured, blurry, or not present, return an empty string for it — do NOT guess.

Return STRICT JSON ONLY (no markdown fences, no prose) with this exact shape:

{
  "status": "OK" | "PARTIAL" | "UNCLEAR",
  "confidence": 0.0-1.0,
  "fields": {
    "owner_name":        "Nama Pemilik (as printed)",
    "plate":             "B 1234 XYZ format (uppercase, single space between groups)",
    "brand":             "Merk Kendaraan (TOYOTA, HONDA, etc.)",
    "model":             "Tipe/Model (AVANZA 1.3 G, etc.)",
    "variant":           "Sub-variant if printed (e.g. 1.3 E CVT)",
    "color":             "Warna",
    "year":              "4-digit year of manufacture",
    "vin":               "Nomor Rangka / NIK — 17 chars, uppercase, NO letters I/O/Q",
    "engine_no":         "Nomor Mesin — alphanumeric, uppercase",
    "fuel":              "BENSIN | DIESEL | HYBRID | LISTRIK | LPG",
    "cylinder_cc":       "Cylinder capacity in cc (digits only)",
    "chassis_type":      "Jenis Chassis (e.g. SEDAN, MPV, SUV, PICKUP)",
    "registration_date": "Tanggal Registrasi (dd-mm-yyyy)",
    "expiry_date":       "Berlaku Hingga (dd-mm-yyyy)",
    "region":            "Provinsi / Wilayah (e.g. DKI Jakarta, Jawa Barat)"
  },
  "notes": "Brief Indonesian note about quality issues or anything ambiguous (max 1 sentence, or empty string)"
}

Rules:
- "status" = "OK" when ALL of: plate, brand, model, year, vin, engine_no are readable.
- "status" = "PARTIAL" when some required fields are missing but the document is clearly an STNK.
- "status" = "UNCLEAR" when the image is blurry, rotated, partially captured, or not an STNK at all.
- "confidence" is your overall self-assessed confidence (0.0 to 1.0) for the readable fields.
- For "plate": preserve the standard format with single spaces (e.g. "B 1234 ABC", "AB 123 CD"). Remove any leading/trailing whitespace.
- For "vin": remove all whitespace and dashes. If the printed VIN uses letters I, O, or Q (which VIN spec forbids), substitute them with the most likely valid VIN character (1, 0, 0 respectively) and mention this in "notes".
- For "fuel": normalise to the canonical BENSIN/DIESEL/HYBRID/LISTRIK/LPG values. If the document says "Premium" or "Pertamax", use "BENSIN".
- For dates: use dd-mm-yyyy format. If only yyyy-mm-dd is visible, convert to dd-mm-yyyy.
- If the image is rotated, mentally rotate it before extracting.
- Output JSON ONLY. Do not include any text outside the JSON object.`;

// ── Handler ─────────────────────────────────────────────────────────────────

serve(async (req) => {
  const CORS = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  // Auth: any authenticated user (customer or agent)
  const { errorResponse } = await verifyAuth(req, SUPABASE_URL, ANON_KEY, undefined, CORS);
  if (errorResponse) return errorResponse;

  try {
    const { image_base64, mime_type } = await req.json() as {
      image_base64: string;
      mime_type?: string;
    };

    if (!image_base64) {
      return json({
        status: 'ERROR',
        confidence: 0,
        fields: {},
        notes: 'image_base64 is required',
      } satisfies StnkOcrResponse, 400);
    }

    // Reject oversized payloads (~5 MB base64 ≈ 3.75 MB image) to prevent DoS
    if (image_base64.length > 5 * 1024 * 1024) {
      return json({
        status: 'ERROR',
        confidence: 0,
        fields: {},
        notes: 'Image too large (max 5 MB)',
      } satisfies StnkOcrResponse, 413);
    }

    // ── Look up OpenRouter key (Vault first, env fallback) ─────────────────
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    let openRouterKey = Deno.env.get('OPENROUTER_KEY') ?? '';

    if (!openRouterKey && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data } = await supabase.rpc('get_app_secret', { secret_name: 'OPENROUTER_KEY' });
      openRouterKey = data ?? '';
    }

    if (!openRouterKey) {
      console.error('OPENROUTER_KEY not configured for stnk-ocr');
      return json({
        status: 'ERROR',
        confidence: 0,
        fields: {},
        notes: 'AI service not configured',
      } satisfies StnkOcrResponse, 503);
    }

    // ── Build the image_url content part ───────────────────────────────────
    // OpenRouter expects data URLs for vision input. The client sends raw
    // base64 (no data: prefix); wrap it here.
    const mime = mime_type ?? 'image/jpeg';
    const dataUrl = `data:${mime};base64,${image_base64}`;

    // ── Call OpenRouter with the multimodal prompt ─────────────────────────
    // Using gpt-4o-mini for cost-effective but accurate OCR. The same model
    // is used by the legacy geminiService.extractStnkData path, so quality
    // should match.
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterKey}`,
        'HTTP-Referer': 'https://myinsurepath.com',
        'X-Title': 'SurePath',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: EXTRACTION_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        }],
        // Slight temperature drop for OCR — we want deterministic, structured
        // output rather than creative interpretation.
        temperature: 0.1,
        // Cap response size — the JSON we want is small.
        max_tokens: 800,
        // Request JSON output if the upstream provider supports it (no-op for
        // providers that ignore this field).
        response_format: { type: 'json_object' },
      }),
    });

    if (!orRes.ok) {
      const errText = await orRes.text();
      console.error('OpenRouter error:', orRes.status, errText);
      return json({
        status: 'ERROR',
        confidence: 0,
        fields: {},
        notes: 'AI provider error',
      } satisfies StnkOcrResponse, 502);
    }

    const orData = await orRes.json();
    const content: string = orData?.choices?.[0]?.message?.content ?? '';

    if (!content) {
      return json({
        status: 'ERROR',
        confidence: 0,
        fields: {},
        notes: 'Empty AI response',
      } satisfies StnkOcrResponse, 502);
    }

    // Parse the JSON the model returned (strip any stray markdown fences just
    // in case the response_format hint was ignored).
    const cleaned = content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('Failed to parse AI JSON:', cleaned.slice(0, 500));
      return json({
        status: 'ERROR',
        confidence: 0,
        fields: {},
        notes: 'AI returned malformed JSON',
      } satisfies StnkOcrResponse, 502);
    }

    // Echo back with a normalised shape so the client doesn't have to worry
    // about model quirks.
    const result: StnkOcrResponse = {
      status: parsed.status ?? 'PARTIAL',
      confidence: typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5,
      fields: parsed.fields ?? {},
      notes: parsed.notes ?? '',
    };

    return json(result);
  } catch (err) {
    console.error('stnk-ocr error:', err);
    return json({
      status: 'ERROR',
      confidence: 0,
      fields: {},
      notes: String(err),
    } satisfies StnkOcrResponse, 500);
  }
});
