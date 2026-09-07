// ─── KTP OCR Service ────────────────────────────────────────────────────────
// AI-powered OCR for the Indonesian national ID card (KTP), mirroring the
// shape and guarantees of stnkOcr.ts so both documents behave the same way.
//
// Why this file exists: KTP extraction used to live as a bare call to
// geminiService.extractKtpData() straight inside StepKYC's file-input handler.
// Two problems came with that:
//
//   1. It authenticated with the anon key, which ai-proxy rejects — so it
//      always failed, and the caller swallowed the failure and left the form
//      blank with no explanation. (The auth bug is fixed in geminiService.)
//   2. The raw model output went into the form unvalidated: a NIK that came
//      back as 15 digits, or with spaces, was written straight into the field.
//
// Everything now goes through extractKtpOcr(), which normalises and validates
// before anything reaches a form or a quotation. Pathy uses the same call, so
// the chat and the buy-wizard read a KTP identically.

import { extractKtpData } from './geminiService';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface KtpOcrResult {
  /** True when name, NIK and address are all present and valid. */
  ok: boolean;
  /** 'OK' everything readable · 'PARTIAL' some fields missing · 'UNCLEAR' nothing usable. */
  status: 'OK' | 'PARTIAL' | 'UNCLEAR';
  /** Normalised fields (null = missing or failed validation). */
  name: string | null;
  nik: string | null;
  address: string | null;
  /** Per-field validation outcome, so the UI can mark which ones to re-check. */
  validation: { name: boolean; nik: boolean; address: boolean };
  /** Indonesian, user-facing note when something needs attention. */
  notes?: string;
  source: 'ai-proxy' | 'failed';
}

// NIK is exactly 16 digits. Anything else is a misread, not a valid identity
// number — better to return null and let the user type it than to prefill a
// wrong number they will scroll past.
const NIK_RE = /^[0-9]{16}$/;

function cleanText(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const out = v
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .toUpperCase();
  return out.length >= 2 ? out : null;
}

function cleanNik(v: unknown): string | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  // Models like to format the NIK with spaces, dots or dashes — strip them all.
  const digits = String(v).replace(/\D/g, '');
  return NIK_RE.test(digits) ? digits : null;
}

const EMPTY: KtpOcrResult = {
  ok: false,
  status: 'UNCLEAR',
  name: null,
  nik: null,
  address: null,
  validation: { name: false, nik: false, address: false },
  source: 'failed',
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Extract name / NIK / address from a KTP photo.
 *
 * @param base64 Data URL (`data:image/jpeg;base64,…`) or raw base64.
 * @returns Normalised, validated result — never throws.
 */
export async function extractKtpOcr(base64: string): Promise<KtpOcrResult> {
  let raw: any = null;
  try {
    const res = await extractKtpData(base64);
    if (!res.success || !res.data) {
      return { ...EMPTY, notes: 'Foto KTP belum bisa dibaca. Coba foto ulang dengan cahaya lebih terang.' };
    }
    raw = res.data;
  } catch (e) {
    console.warn('extractKtpOcr:', e);
    return { ...EMPTY, notes: 'Layanan pembaca KTP sedang tidak tersedia. Isi datanya manual dulu ya.' };
  }

  return normaliseKtp(raw);
}

/**
 * Pure normaliser — exported so the same rules can be unit-tested and reused
 * wherever a KTP payload arrives from somewhere other than the OCR call.
 */
export function normaliseKtp(raw: Record<string, unknown>): KtpOcrResult {
  const name = cleanText(raw?.name, 120);
  const nik = cleanNik(raw?.nik);
  const address = cleanText(raw?.address, 300);

  const validation = { name: !!name, nik: !!nik, address: !!address };
  const readCount = Object.values(validation).filter(Boolean).length;

  const status: KtpOcrResult['status'] =
    readCount === 3 ? 'OK' : readCount === 0 ? 'UNCLEAR' : 'PARTIAL';

  let notes: string | undefined;
  if (status === 'UNCLEAR') {
    notes = 'Belum ada data yang terbaca. Pastikan seluruh KTP masuk frame dan tidak silau.';
  } else if (!nik && raw?.nik) {
    // The model returned something for NIK but it wasn't 16 digits.
    notes = 'NIK belum terbaca utuh (harus 16 digit) — mohon periksa dan lengkapi.';
  } else if (status === 'PARTIAL') {
    notes = 'Sebagian data belum terbaca — mohon lengkapi kolom yang kosong.';
  }

  return {
    ok: status === 'OK',
    status,
    name,
    nik,
    address,
    validation,
    notes,
    source: 'ai-proxy',
  };
}
