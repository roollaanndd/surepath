// ─── STNK OCR Service ───────────────────────────────────────────────────────
// AI-powered OCR for Indonesian vehicle registration documents (STNK).
//
// Architecture:
//   1. Client uploads STNK photo (file → base64)
//   2. Client calls extractStnkOcr(base64), which invokes the `stnk-ocr`
//      Supabase edge function (server-side) with the image.
//   3. The edge function proxies the image to the OpenRouter multimodal model
//      (gpt-4o-mini via the existing ai-proxy pattern) with a structured
//      extraction prompt, then returns a JSON object with every STNK field.
//   4. The client normalises + validates each field against REGEX (plate, VIN,
//      engine) and the vehicle database (brand/model), and returns a typed
//      StnkOcrResult.
//   5. If the server function is unreachable or returns an error, the client
//      falls back to the legacy `extractStnkData` path (Gemini Vision via the
//      ai-proxy directly) so the flow never hard-fails.
//
// Why a server-side edge function instead of calling the AI directly from the
// browser:
//   - Keeps the OpenRouter API key in Supabase secrets (already configured
//     for ai-proxy), never exposed to the client.
//   - Allows server-side image preprocessing if needed in future.
//   - Returns a single normalised schema regardless of which upstream AI
//     provider is used (currently OpenRouter, but could swap to Google Vision
//     or self-hosted models without changing the client).
//
// Schema is derived from:
//   - Real Indonesian STNK fields (Tanda Bukti Registrasi Kendaraan Bermotor)
//   - types.ts SpPolicyOrder.vehicle_details shape
//   - services/vehicleDatabase.ts VEHICLE_BRANDS for fuzzy matching

import { supabase } from './supabaseService';
import { VEHICLE_BRANDS, getModelsForBrand } from './vehicleDatabase';
import { REGEX } from './authService';
import { lookupPlate } from './plateCodes';
import { extractStnkData as legacyExtractStnkData, compressImageBase64 } from './geminiService';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Raw structured response from the stnk-ocr edge function. */
export interface StnkOcrRaw {
  status: 'OK' | 'PARTIAL' | 'UNCLEAR' | 'ERROR';
  /** Per-field confidence 0–1 (averaged from the model's self-assessment). */
  confidence: number;
  fields: {
    owner_name?: string;
    plate?: string;
    brand?: string;
    model?: string;
    variant?: string;
    color?: string;
    year?: string;
    vin?: string;
    engine_no?: string;
    fuel?: string;
    cylinder_cc?: string;
    chassis_type?: string;
    registration_date?: string;
    expiry_date?: string;
    region?: string;
  };
  /** Plain-language notes from the model (e.g. "VIN partially obscured"). */
  notes?: string;
}

/** Normalised + validated result the UI consumes. */
export interface StnkOcrResult {
  /** True when every required field is present and passes validation. */
  ok: boolean;
  /** 'OK' all required fields, 'PARTIAL' some missing, 'UNCLEAR' image quality issue. */
  status: StnkOcrRaw['status'];
  /** Overall confidence 0–1. */
  confidence: number;
  notes?: string;

  /** Normalised fields (null = couldn't extract / invalid). */
  ownerName: string | null;
  plate: string | null;
  brand: string | null;        // matched against VEHICLE_BRANDS
  model: string | null;        // matched against getModelsForBrand(brand)
  variant: string | null;
  color: string | null;
  year: number | null;
  vin: string | null;          // validated against REGEX.VIN (17 chars, no I/O/Q)
  engineNo: string | null;
  fuel: string | null;
  cylinderCc: number | null;
  chassisType: string | null;
  registrationDate: string | null; // ISO yyyy-mm-dd or null
  expiryDate: string | null;       // ISO yyyy-mm-dd or null
  region: string | null;           // Indonesian province name from plate prefix
  zone: 1 | 2 | 3 | null;          // OJK zone derived from region

  /** True when each field passed its own validation check. */
  validation: {
    plate: boolean;
    vin: boolean;
    year: boolean;
    brand: boolean;
    model: boolean;
  };

  /** Source of the result — useful for debugging. */
  source: 'stnk-ocr-edge' | 'legacy-gemini' | 'fallback-empty';
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Extract structured data from an STNK photo.
 *
 * @param base64  Either a data URL (`data:image/jpeg;base64,...`) or raw base64.
 * @param mime    Mime type if `base64` is raw (defaults to image/jpeg).
 * @returns       Normalised + validated StnkOcrResult.
 */
export async function extractStnkOcr(
  base64: string,
  mime = 'image/jpeg',
): Promise<StnkOcrResult> {
  // Downscale FIRST. This path used to post the raw camera capture, which is
  // the single cause behind both halves of the bug report: a 4-12 MB phone
  // photo becomes a ~5.5-16 MB base64 request body, big enough to exhaust the
  // Android WebView (the app looks like it closed itself) and big enough for
  // the edge function to reject before the model sees anything (which reads as
  // "the AI cannot read my STNK"). 1600px keeps STNK text legible — the legacy
  // Gemini path has read these fine at 1200px — while cutting the payload by
  // roughly an order of magnitude. compressImageBase64 resolves to the input
  // unchanged if the image fails to load, so this cannot make the flow worse.
  const compressed = await compressImageBase64(base64, 1600);

  // Strip data: prefix if present (Supabase functions want raw base64).
  const rawBase64 = compressed.includes(',')
    ? compressed.split(',')[1] ?? compressed
    : compressed;

  // The compressor re-encodes to JPEG, so the caller's mime (e.g. image/png
  // or image/heic) would now mislabel the bytes and the model would fail to
  // decode them. Read the type back off the data: prefix instead, and only
  // fall back to the caller's value when compression returned the original.
  const mimeMatch = compressed.match(/^data:([^;,]+)[;,]/);
  const effectiveMime = mimeMatch ? mimeMatch[1] : mime;

  // Try the new structured edge function first.
  try {
    const { data, error } = await supabase.functions.invoke('stnk-ocr', {
      body: { image_base64: rawBase64, mime_type: effectiveMime },
    });

    if (error) {
      console.warn('stnk-ocr edge function error:', error);
    } else if (data && (data as StnkOcrRaw).fields) {
      return normalise(data as StnkOcrRaw, 'stnk-ocr-edge');
    }
  } catch (e) {
    console.warn('stnk-ocr edge function threw:', e);
  }

  // Fallback: legacy geminiService.extractStnkData path (uses the same AI
  // proxy under the hood). Returns a subset of fields but keeps the flow
  // working if the new edge function isn't deployed yet.
  try {
    const legacy = await legacyExtractStnkData(compressed, effectiveMime);
    if (legacy.success && legacy.data) {
      return normaliseFromLegacy(legacy.data);
    }
  } catch (e) {
    console.warn('legacy STNK extract failed:', e);
  }

  // Final fallback: empty result so the UI can prompt for manual entry.
  return emptyResult();
}

// ─── Normalisation & validation ──────────────────────────────────────────────

function emptyResult(): StnkOcrResult {
  return {
    ok: false,
    status: 'ERROR',
    confidence: 0,
    ownerName: null, plate: null, brand: null, model: null, variant: null,
    color: null, year: null, vin: null, engineNo: null, fuel: null,
    cylinderCc: null, chassisType: null, registrationDate: null,
    expiryDate: null, region: null, zone: null,
    validation: { plate: false, vin: false, year: false, brand: false, model: false },
    source: 'fallback-empty',
  };
}

function normalise(raw: StnkOcrRaw, source: StnkOcrResult['source']): StnkOcrResult {
  const f = raw.fields ?? {};

  // Plate — uppercase + collapse whitespace, validate against REGEX.PLATE.
  const plateRaw = (f.plate ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
  const plateValid = REGEX.PLATE.test(plateRaw);
  const plate = plateValid ? plateRaw : (plateRaw || null);

  // Resolve plate prefix → province → zone via the shared plateCodes module
  // (same path used by the customer car wizard). Falls back to f.region if
  // the model supplied one but the prefix isn't recognised.
  let region: string | null = null;
  let zone: 1 | 2 | 3 | null = null;
  if (plate) {
    const entry = lookupPlate(plate);
    if (entry) {
      region = entry.province;
      // We can't import getZone here without creating a cycle (ojkRates is
      // imported by CarInsuranceWizard which imports this service). Inline
      // the simple lookup: province → zone via the same default map.
      zone = provinceZone(entry.province);
    }
  }
  if (!region && f.region) {
    region = f.region;
    zone = provinceZone(f.region);
  }

  // Brand — fuzzy match against VEHICLE_BRANDS (case-insensitive contains).
  const brandRaw = (f.brand ?? '').trim();
  const matchedBrand = VEHICLE_BRANDS.find(b =>
    brandRaw.toUpperCase().includes(b.toUpperCase()) ||
    b.toUpperCase().includes(brandRaw.toUpperCase()),
  );
  const brand = matchedBrand ?? (brandRaw || null);
  const brandValid = !!matchedBrand;

  // Model — fuzzy match against getModelsForBrand(brand) when brand matched.
  let model: string | null = null;
  let modelValid = false;
  if (matchedBrand) {
    const models = getModelsForBrand(matchedBrand);
    const modelRaw = (f.model ?? '').trim();
    const matchedModel = models.find(m =>
      modelRaw && (
        m.toUpperCase().includes(modelRaw.toUpperCase()) ||
        modelRaw.toUpperCase().includes(m.toUpperCase())
      )
    );
    model = matchedModel ?? (modelRaw || null);
    modelValid = !!matchedModel;
  } else {
    model = (f.model ?? '').trim() || null;
  }

  // Variant — pass-through.
  const variant = (f.variant ?? '').trim() || null;

  // Color — pass-through, trimmed.
  const color = (f.color ?? '').trim() || null;

  // Year — 4-digit number between 1980 and currentYear+1.
  const yearRaw = (f.year ?? '').trim();
  const yearNum = parseInt(yearRaw, 10);
  const currentYear = new Date().getFullYear();
  const yearValid = /^\d{4}$/.test(yearRaw) && yearNum >= 1980 && yearNum <= currentYear + 1;
  const year = yearValid ? yearNum : null;

  // VIN — 17 chars, no I/O/Q per ISO 3779 (REGEX.VIN enforces this).
  const vinRaw = (f.vin ?? '').trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
  const vinValid = REGEX.VIN.test(vinRaw);
  const vin = vinRaw.length > 0 ? vinRaw : null;

  // Engine number — alphanumeric, typically 6–12 chars. No strict regex
  // (varies by manufacturer); just trim + uppercase.
  const engineNo = (f.engine_no ?? '').trim().toUpperCase().replace(/\s+/g, '') || null;

  // Fuel — normalise to one of the standard values.
  const fuelRaw = (f.fuel ?? '').trim().toUpperCase();
  const fuelMap: Record<string, string> = {
    'BENSIN': 'BENSIN',
    'PETROL': 'BENSIN',
    'GASOLINE': 'BENSIN',
    'SOLAR': 'DIESEL',
    'DIESEL': 'DIESEL',
    'HYBRID': 'HYBRID',
    'LISTRIK': 'LISTRIK',
    'ELECTRIC': 'LISTRIK',
    'EV': 'LISTRIK',
    'LPG': 'LPG',
    'BBM': 'BENSIN',
  };
  const fuel = fuelRaw ? (fuelMap[fuelRaw] ?? fuelRaw) : null;

  // Cylinder capacity — numeric cc.
  const ccRaw = (f.cylinder_cc ?? '').replace(/[^\d]/g, '');
  const cylinderCc = ccRaw ? parseInt(ccRaw, 10) : null;

  // Chassis type — pass-through.
  const chassisType = (f.chassis_type ?? '').trim() || null;

  // Dates — accept dd-mm-yyyy, dd/mm/yyyy, yyyy-mm-dd, return ISO yyyy-mm-dd.
  const registrationDate = normaliseDate(f.registration_date);
  const expiryDate = normaliseDate(f.expiry_date);

  // Validation summary — required fields for a binding insurance quote.
  const validation = {
    plate: plateValid,
    vin: vinValid,
    year: yearValid,
    brand: brandValid,
    model: modelValid,
  };
  const requiredValid = validation.plate && validation.year && validation.brand && validation.model;
  // VIN is strongly recommended but not blocking — many STNK photos obscure
  // it; the wizard can still proceed with manual VIN entry.
  const ok = requiredValid && raw.status !== 'UNCLEAR';

  return {
    ok,
    status: raw.status,
    confidence: raw.confidence ?? 0,
    notes: raw.notes,
    ownerName: (f.owner_name ?? '').trim() || null,
    plate, brand, model, variant, color, year, vin, engineNo, fuel,
    cylinderCc, chassisType, registrationDate, expiryDate, region, zone,
    validation,
    source,
  };
}

/** Map the legacy geminiService.extractStnkData shape to the new schema. */
function normaliseFromLegacy(d: any): StnkOcrResult {
  return normalise({
    status: d.status === 'OK' ? 'OK' : 'UNCLEAR',
    confidence: 0.6,
    fields: {
      owner_name: d.owner,
      plate: d.plate,
      brand: d.brand,
      model: d.model,
      color: d.color,
      year: d.year,
      vin: d.vin,
      engine_no: d.engine,
    },
    notes: 'Extracted via legacy Gemini Vision fallback.',
  }, 'legacy-gemini');
}

/** Convert assorted date formats to ISO yyyy-mm-dd. */
function normaliseDate(input?: string): string | null {
  if (!input) return null;
  const s = input.trim();
  // yyyy-mm-dd
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  // dd-mm-yyyy or dd/mm/yyyy
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  // dd-mm-yy (2-digit year)
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
  if (m) {
    const yy = parseInt(m[3], 10);
    const yyyy = yy + (yy > 70 ? 1900 : 2000);
    return `${yyyy}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

/** Inline copy of the province → zone mapping (kept here to avoid a cycle). */
function provinceZone(province: string): 1 | 2 | 3 {
  const p = province.toLowerCase();
  // Zone 1 — Sumatera
  if (/aceh|sumatera|riau|jambi|bengkulu|lampung|bangka|belitung/.test(p)) return 1;
  // Zone 2 — DKI Jakarta, Jawa Barat, Banten
  if (/dki jakarta|jakarta|jawa barat|banten/.test(p)) return 2;
  // Zone 3 — everything else (default)
  return 3;
}
