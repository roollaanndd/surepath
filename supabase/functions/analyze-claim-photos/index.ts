
import { createClient } from 'npm:@supabase/supabase-js@2';
import exifr from 'npm:exifr@7.1.3';
import { Image } from 'npm:imagescript@1.3.0';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';

// ─── Claim Photo Forensics + Fraud Detection ─────────────────────────────────
//
// Runs BEFORE a claim exists — the customer reviews this read-out, fills the
// incident form, then submits (submit_claim in data-gateway/actions/claims.ts
// consumes the analysis_id this function returns and persists the trusted,
// server-computed results onto the new sp_claims row; it does NOT trust any
// fraud fields the client echoes back directly).
//
// Per photo:
//   1. EXIF extraction (capture time, GPS, editing-software tag)
//   2. Perceptual (average) hash + near-duplicate lookup against every other
//      analyzed claim/survey photo — the single check no AI vision model can
//      do reliably on its own, and it catches the most common real fraud
//      pattern: reusing the same damage photo across multiple claims.
//   3. AI damage assessment + per-photo fraud/tamper read (merges the
//      existing analyzeClaimPhoto damage rubric with the per-photo fraud
//      checks from analyzeVehicleSurvey — screen photo, stock/downloaded,
//      editing artifacts, plate visibility).
//
// Signals are combined deterministically into a per-photo verdict, then a
// claim-level aggregate (worst-photo-weighted, not averaged).

interface ForensicExif {
  hasExif: boolean;
  captureTimestamp?: string;
  gpsLocation?: { lat: number; lng: number };
  editingSoftware?: string;
  deviceModel?: string;
}

interface ForensicDuplicate {
  isDuplicate: boolean;
  matchedSourceType?: 'CLAIM' | 'SURVEY';
  matchedSourceId?: string;
  similarity?: number;
}

interface DamageAssessmentItem {
  part: string;
  condition: string;
  action: 'Perbaiki' | 'Ganti';
  estimasiBiaya: number;
}

interface ForensicAi {
  authenticityScore: number;
  tamperIndicators: string[];
  damageAssessment: DamageAssessmentItem[];
  isScreenPhoto: boolean;
  isStockOrDownloaded: boolean;
  plateVisible: boolean;
  confidence: number;
  severity: 'Ringan' | 'Sedang' | 'Berat' | 'Total Loss';
}

interface ClaimPhotoForensicReport {
  photoIndex: number;
  photoUrl: string;
  exif: ForensicExif;
  duplicate: ForensicDuplicate;
  ai: ForensicAi;
  verdict: 'CLEAN' | 'FLAGGED' | 'HIGH_RISK';
  flagReasons: string[];
}

const MAX_PHOTOS = 5;
const RATE_LIMIT_PER_HOUR = 15;
const HAMMING_DUPLICATE_THRESHOLD = 6; // out of 64 bits — conservative "near duplicate"
const RATE_LIMIT_ACTION = 'analyze_claim_photos';

const DAMAGE_FRAUD_PROMPT = `Anda adalah Investigator Klaim Neural SurePath — gabungan surveyor kerusakan kendaraan senior DAN auditor anti-fraud. Analisa SATU foto klaim kendaraan ini secara menyeluruh.

BAGIAN 1 — ASESMEN KERUSAKAN
1. Identifikasi SETIAP panel terdampak (Bumper, Lampu, Fender, dll) yang terlihat di foto ini.
2. Berikan kondisi spesifik (Goresan dalam >10cm, Retak, Penyok struktural).
3. Tentukan tindakan: 'Perbaiki' atau 'Ganti'.
4. Estimasi harga dalam Rupiah (IDR) per item.
5. Tentukan severity keseluruhan foto ini: 'Ringan', 'Sedang', 'Berat', atau 'Total Loss'.

BAGIAN 2 — DETEKSI FRAUD / MANIPULASI (per foto ini saja)
Cari tanda-tanda berikut di foto INI:
a) Foto layar / foto-dalam-foto: piksel kasar, cahaya tidak alami, refleksi monitor/layar/HP
b) Foto stok atau unduhan internet: background terlalu bersih, watermark, kualitas terlalu sempurna, tidak ada konteks lokasi nyata
c) Hasil editing digital: bayangan tidak konsisten dalam foto, artefak kompresi tidak wajar di sekitar area kerusakan, tepi yang terlalu tajam/blur selektif di sekitar "kerusakan", warna kerusakan yang tidak menyatu dengan cat sekitarnya
d) Apakah plat nomor kendaraan terlihat di foto ini?

Berikan authenticityScore (0-100, semakin TINGGI = semakin OTENTIK/asli, semakin RENDAH = semakin mencurigakan) dan confidence (0-100, seberapa yakin Anda dengan asesmen ini).

Return JSON only (tanpa teks lain, tanpa markdown fence):
{
  "severity": "Ringan|Sedang|Berat|Total Loss",
  "damageAssessment": [{ "part": string, "condition": string, "action": "Perbaiki|Ganti", "estimasiBiaya": number }],
  "authenticityScore": number,
  "tamperIndicators": string[],
  "isScreenPhoto": boolean,
  "isStockOrDownloaded": boolean,
  "plateVisible": boolean,
  "confidence": number
}`;

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

// ── Average-hash (aHash): resize to 8x8 greyscale, threshold against the
// mean pixel value. Cheap, rotation/format-tolerant, good enough to catch
// "same photo reused" and "same photo re-compressed/re-saved" cases — not
// meant to catch deliberate cropping/heavy edits, which the AI pass covers.
async function computeAverageHash(bytes: Uint8Array): Promise<bigint | null> {
  try {
    const img = await Image.decode(bytes);
    img.resize(8, 8);
    img.saturation(0); // greyscale
    let sum = 0;
    const values: number[] = [];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const [r, g, b] = Image.colorToRGBA(img.getPixelAt(x + 1, y + 1));
        const grey = (r + g + b) / 3;
        values.push(grey);
        sum += grey;
      }
    }
    const avg = sum / values.length;
    let hash = 0n;
    for (let i = 0; i < values.length; i++) {
      hash = (hash << 1n) | (values[i] >= avg ? 1n : 0n);
    }
    return hash;
  } catch (e) {
    console.error('computeAverageHash failed:', e);
    return null;
  }
}

function hammingDistance(a: bigint, b: bigint): number {
  let x = a ^ b;
  let count = 0;
  while (x > 0n) {
    count += Number(x & 1n);
    x >>= 1n;
  }
  return count;
}

async function extractExif(bytes: Uint8Array): Promise<ForensicExif> {
  try {
    const data = await exifr.parse(bytes, { gps: true, pick: ['DateTimeOriginal', 'CreateDate', 'Software', 'Model', 'Make', 'latitude', 'longitude'] });
    if (!data) return { hasExif: false };
    const captureTimestamp = data.DateTimeOriginal ?? data.CreateDate;
    const gpsLocation = (typeof data.latitude === 'number' && typeof data.longitude === 'number')
      ? { lat: data.latitude, lng: data.longitude }
      : undefined;
    return {
      hasExif: true,
      captureTimestamp: captureTimestamp instanceof Date ? captureTimestamp.toISOString() : undefined,
      gpsLocation,
      editingSoftware: typeof data.Software === 'string' ? data.Software : undefined,
      deviceModel: [data.Make, data.Model].filter(Boolean).join(' ') || undefined,
    };
  } catch (e) {
    console.error('extractExif failed:', e);
    return { hasExif: false };
  }
}

function buildVerdict(exif: ForensicExif, duplicate: ForensicDuplicate, ai: ForensicAi): { verdict: 'CLEAN' | 'FLAGGED' | 'HIGH_RISK'; flagReasons: string[] } {
  const flagReasons: string[] = [];

  if (duplicate.isDuplicate) flagReasons.push(`Foto sangat mirip dengan foto lain di ${duplicate.matchedSourceType === 'SURVEY' ? 'survei kendaraan' : 'klaim'} sebelumnya.`);
  if (ai.isScreenPhoto) flagReasons.push('Terindikasi foto dari layar (foto-dalam-foto).');
  if (ai.isStockOrDownloaded) flagReasons.push('Terindikasi foto stok / unduhan, bukan foto asli kejadian.');
  if (ai.tamperIndicators.length > 0) flagReasons.push(...ai.tamperIndicators);
  if (exif.editingSoftware) flagReasons.push(`Metadata foto menunjukkan telah diedit dengan ${exif.editingSoftware}.`);
  if (ai.authenticityScore < 70) flagReasons.push('Skor keaslian AI di bawah ambang batas normal.');

  const highRisk = duplicate.isDuplicate || ai.isScreenPhoto || ai.isStockOrDownloaded || ai.authenticityScore < 40;
  const flagged = !highRisk && (flagReasons.length > 0 || ai.authenticityScore < 70);

  return { verdict: highRisk ? 'HIGH_RISK' : flagged ? 'FLAGGED' : 'CLEAN', flagReasons };
}

Deno.serve(async (req) => {
  const CORS = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const { caller, errorResponse } = await verifyAuth(req, SUPABASE_URL, ANON_KEY, SERVICE_KEY, CORS);
  if (errorResponse) return errorResponse;
  if (!caller) return json({ success: false, error: 'Unauthorized' }, 401, CORS);

  const db = createClient(SUPABASE_URL, SERVICE_KEY);

  // ── Rate limit: 15 analyses / hour / user (DB-backed, same pattern as the
  // data-gateway's checkRateLimit — survives cold starts, unlike an
  // in-memory Map) ──────────────────────────────────────────────────────
  const now = new Date();
  const hourBucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}`;
  const identifier = `user:${caller.authId}`;
  let rateOk = true;
  try {
    const { error: insErr } = await db.from('sp_rate_limits').insert({ identifier, action: RATE_LIMIT_ACTION, hour_bucket: hourBucket, request_count: 1, last_request: now.toISOString() });
    if (insErr) {
      const { data, error: rpcErr } = await db.rpc('increment_rate_limit', { p_identifier: identifier, p_action: RATE_LIMIT_ACTION, p_hour_bucket: hourBucket });
      rateOk = !rpcErr && (data ?? 1) <= RATE_LIMIT_PER_HOUR;
    }
  } catch { rateOk = false; }
  if (!rateOk) return json({ success: false, error: 'Terlalu banyak permintaan analisa foto. Coba lagi dalam 1 jam.' }, 429, CORS);

  try {
    const { photo_urls } = await req.json() as { photo_urls?: string[] };
    if (!Array.isArray(photo_urls) || photo_urls.length === 0) {
      return json({ success: false, error: 'photo_urls is required' }, 400, CORS);
    }
    if (photo_urls.length > MAX_PHOTOS) {
      return json({ success: false, error: `Maksimum ${MAX_PHOTOS} foto per klaim` }, 400, CORS);
    }
    // Only accept our own claim-photos bucket URLs — prevents SSRF via
    // arbitrary attacker-supplied fetch targets.
    for (const url of photo_urls) {
      if (typeof url !== 'string' || !url.includes('/storage/v1/object/public/claim-photos/')) {
        return json({ success: false, error: 'Invalid photo URL' }, 400, CORS);
      }
    }

    let openRouterKey = Deno.env.get('OPENROUTER_KEY') ?? '';
    if (!openRouterKey) {
      const { data } = await db.rpc('get_app_secret', { secret_name: 'OPENROUTER_KEY' });
      openRouterKey = data ?? '';
    }
    if (!openRouterKey) {
      console.error('OPENROUTER_KEY not configured for analyze-claim-photos');
      return json({ success: false, error: 'AI service not configured' }, 503, CORS);
    }

    const photoReports: ClaimPhotoForensicReport[] = [];
    const photoHashes: (string | null)[] = [];

    for (let i = 0; i < photo_urls.length; i++) {
      const photoUrl = photo_urls[i];

      let bytes: Uint8Array | null = null;
      try {
        const res = await fetch(photoUrl);
        if (res.ok) bytes = new Uint8Array(await res.arrayBuffer());
      } catch (e) {
        console.error('fetch photo failed:', e);
      }

      const exif: ForensicExif = bytes ? await extractExif(bytes) : { hasExif: false };
      const hash = bytes ? await computeAverageHash(bytes) : null;
      photoHashes.push(hash !== null ? hash.toString() : null);

      // ── Duplicate lookup ────────────────────────────────────────────────
      let duplicate: ForensicDuplicate = { isDuplicate: false };
      if (hash !== null) {
        const { data: candidates } = await db
          .from('sp_photo_hashes')
          .select('photo_hash, source_type, source_id')
          .order('created_at', { ascending: false })
          .limit(5000);
        for (const c of candidates ?? []) {
          try {
            const dist = hammingDistance(hash, BigInt((c as any).photo_hash));
            if (dist <= HAMMING_DUPLICATE_THRESHOLD) {
              duplicate = {
                isDuplicate: true,
                matchedSourceType: (c as any).source_type,
                matchedSourceId: (c as any).source_id,
                similarity: Math.round(((64 - dist) / 64) * 100),
              };
              break;
            }
          } catch { /* skip malformed row */ }
        }
      }

      // ── AI damage + fraud read ──────────────────────────────────────────
      let ai: ForensicAi = {
        authenticityScore: 70, tamperIndicators: [], damageAssessment: [],
        isScreenPhoto: false, isStockOrDownloaded: false, plateVisible: false,
        confidence: 0, severity: 'Sedang',
      };
      try {
        const mime = photoUrl.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openRouterKey}`,
            'HTTP-Referer': 'https://myinsurepath.com',
            'X-Title': 'SurePath',
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o',
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: DAMAGE_FRAUD_PROMPT },
                { type: 'image_url', image_url: { url: photoUrl } },
              ],
            }],
            temperature: 0.2,
            max_tokens: 1200,
            response_format: { type: 'json_object' },
          }),
        });
        if (orRes.ok) {
          const orData = await orRes.json();
          const content: string = orData?.choices?.[0]?.message?.content ?? '';
          const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
          const parsed = JSON.parse(cleaned);
          ai = {
            authenticityScore: typeof parsed.authenticityScore === 'number' ? Math.max(0, Math.min(100, parsed.authenticityScore)) : 70,
            tamperIndicators: Array.isArray(parsed.tamperIndicators) ? parsed.tamperIndicators.slice(0, 10) : [],
            damageAssessment: Array.isArray(parsed.damageAssessment) ? parsed.damageAssessment : [],
            isScreenPhoto: Boolean(parsed.isScreenPhoto),
            isStockOrDownloaded: Boolean(parsed.isStockOrDownloaded),
            plateVisible: Boolean(parsed.plateVisible),
            confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(100, parsed.confidence)) : 50,
            severity: ['Ringan', 'Sedang', 'Berat', 'Total Loss'].includes(parsed.severity) ? parsed.severity : 'Sedang',
          };
        } else {
          console.error('OpenRouter error:', orRes.status, await orRes.text());
        }
      } catch (e) {
        console.error('AI analysis failed for photo', i, e);
      }

      const { verdict, flagReasons } = buildVerdict(exif, duplicate, ai);
      photoReports.push({ photoIndex: i, photoUrl, exif, duplicate, ai, verdict, flagReasons });
    }

    // ── Claim-level aggregate — worst-photo-weighted, not averaged ─────────
    const worstVerdict = photoReports.reduce<'CLEAN' | 'FLAGGED' | 'HIGH_RISK'>((acc, r) => {
      const rank = { CLEAN: 0, FLAGGED: 1, HIGH_RISK: 2 };
      return rank[r.verdict] > rank[acc] ? r.verdict : acc;
    }, 'CLEAN');
    const fraudVerdict: 'CLEAN' | 'REVIEW_REQUIRED' | 'REJECTED' =
      worstVerdict === 'HIGH_RISK' ? 'REJECTED' : worstVerdict === 'FLAGGED' ? 'REVIEW_REQUIRED' : 'CLEAN';
    const worstAuthenticity = Math.min(...photoReports.map(r => r.ai.authenticityScore));
    const fraudScore = Math.max(0, 100 - worstAuthenticity);

    const severityRank = { 'Ringan': 0, 'Sedang': 1, 'Berat': 2, 'Total Loss': 3 };
    const worstSeverity = photoReports.reduce((acc, r) => severityRank[r.ai.severity] > severityRank[acc] ? r.ai.severity : acc, 'Ringan' as ForensicAi['severity']);
    const rincianPart = photoReports.flatMap(r => r.ai.damageAssessment);
    const totalEstimasi = rincianPart.reduce((sum, p) => sum + (Number(p.estimasiBiaya) || 0), 0);
    const flagSummary = [...new Set(photoReports.flatMap(r => r.flagReasons))];

    // ── Persist to the trusted staging table ────────────────────────────────
    const { data: analysisRow, error: stagingErr } = await db
      .from('sp_claim_photo_analyses')
      .insert({
        user_id: caller.authId,
        photo_urls,
        photo_hashes: photoHashes,
        photo_reports: photoReports,
        fraud_score: fraudScore,
        fraud_verdict: fraudVerdict,
      })
      .select('id')
      .single();
    if (stagingErr) {
      console.error('sp_claim_photo_analyses insert failed:', stagingErr);
      return json({ success: false, error: 'Gagal menyimpan hasil analisa' }, 500, CORS);
    }

    return json({
      success: true,
      analysisId: (analysisRow as any).id,
      photoReports,
      aggregate: {
        fraudScore,
        fraudVerdict,
        severity: worstSeverity,
        totalEstimasi,
        rincianPart,
        aiInsight: fraudVerdict === 'CLEAN'
          ? 'Semua foto lolos verifikasi keaslian.'
          : `${flagSummary.length} indikasi memerlukan perhatian: ${flagSummary.slice(0, 2).join(' ')}`,
        flagSummary,
      },
    }, 200, CORS);
  } catch (err) {
    console.error('analyze-claim-photos error:', err);
    return json({ success: false, error: 'Terjadi kesalahan saat menganalisa foto.' }, 500, CORS);
  }
});
