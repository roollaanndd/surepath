// ─── Generic document reader ────────────────────────────────────────────────
//
// stnkOcr.ts and ktpOcr.ts each read ONE document really well, because each
// knows what its document contains — a plate matched against the vehicle
// database, a NIK that is 16 digits or nothing. That is the right design for
// those two, and the wrong design for everything else the user might hold up
// to the camera.
//
// This is the front door for "just take a photo". It classifies first, then
// routes: an STNK goes to the STNK reader (which also resolves the market
// value off the price database), a KTP goes to the KTP reader, and anything
// else keeps the generic structured read. So the specialist readers keep their
// guarantees and the user keeps a single button.
//
// Nothing here uploads an image anywhere except the ai-proxy call the other
// readers already make: the field map is what travels onward to Pathy.

import { extractDocumentData } from './geminiService';
import { extractStnkOcr } from './stnkOcr';
import { extractKtpOcr } from './ktpOcr';
import { getMarketValueForYear, getMarketValueForMotoYear } from './vehicleDatabase';

export type DocKind = 'STNK' | 'KTP' | 'SIM' | 'POLIS' | 'INVOICE' | 'DOC';

const KINDS: DocKind[] = ['STNK', 'KTP', 'SIM', 'POLIS', 'INVOICE', 'DOC'];

export interface DocOcrResult {
  ok: boolean;
  type: DocKind;
  /** Human label for the chip in the composer, e.g. "Kuitansi bengkel". */
  label: string;
  /** Flat field map — only scalars, only what was actually read. */
  fields: Record<string, string | number>;
  confidence: number;
  notes?: string;
}

/** 40 fields is already far more than any of these documents carries. */
const MAX_FIELDS = 40;
const MAX_VALUE_CHARS = 300;

const DEFAULT_LABEL: Record<DocKind, string> = {
  STNK: 'STNK',
  KTP: 'KTP',
  SIM: 'SIM',
  POLIS: 'Dokumen polis',
  INVOICE: 'Invoice / kuitansi',
  DOC: 'Dokumen',
};

/**
 * Keeps only flat scalars. The model is asked for a flat map, but "asked for"
 * is not "guaranteed", and everything here ends up in a database row and back
 * in a prompt as tool output.
 */
function flatten(raw: unknown): Record<string, string | number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_FIELDS) break;
    const key = k.trim().slice(0, 40);
    if (!key) continue;
    if (typeof v === 'number' && Number.isFinite(v)) { out[key] = v; continue; }
    if (typeof v === 'string') {
      const value = v.trim().slice(0, MAX_VALUE_CHARS);
      // "-", "N/A" and friends are the model filling a blank it was told to
      // leave out. Storing them would turn "not read" into "read as unknown".
      if (!value || /^(-|n\/?a|null|none|tidak\s+terbaca)$/i.test(value)) continue;
      out[key] = value;
      continue;
    }
    if (typeof v === 'boolean') out[key] = v ? 'ya' : 'tidak';
  }
  return out;
}

function asKind(v: unknown): DocKind {
  const t = String(v ?? '').trim().toUpperCase();
  return (KINDS as string[]).includes(t) ? (t as DocKind) : 'DOC';
}

function clampConfidence(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0.6;
  return Math.max(0, Math.min(1, n > 1 ? n / 100 : n));
}

/** STNK read through the specialist reader, incl. market value resolution. */
async function readStnk(base64: string): Promise<DocOcrResult | null> {
  const res = await extractStnkOcr(base64);
  if (res.status === 'UNCLEAR' && !res.plate && !res.brand) return null;

  let marketValue: number | null = null;
  if (res.brand && res.model && res.year) {
    marketValue = getMarketValueForYear(res.brand, res.model, res.year)
      ?? getMarketValueForMotoYear(res.brand, res.model, res.year);
  }

  const fields: Record<string, string | number> = {};
  const put = (k: string, v: unknown) => {
    if (v === null || v === undefined || v === '') return;
    fields[k] = typeof v === 'number' ? v : String(v).slice(0, MAX_VALUE_CHARS);
  };
  put('plate', res.plate);
  put('brand', res.brand);
  put('model', res.model);
  put('variant', res.variant);
  put('year', res.year);
  put('vin', res.vin);
  put('engine_no', res.engineNo);
  put('color', res.color);
  put('owner_name', res.ownerName);
  put('province', res.region);
  put('zone', res.zone);
  put('market_value', marketValue);

  return {
    ok: res.ok,
    type: 'STNK',
    label: DEFAULT_LABEL.STNK,
    fields,
    confidence: clampConfidence(res.confidence),
    notes: res.notes,
  };
}

/** KTP read through the specialist reader (NIK validated to 16 digits). */
async function readKtp(base64: string): Promise<DocOcrResult | null> {
  const res = await extractKtpOcr(base64);
  if (res.status === 'UNCLEAR') return null;

  const fields: Record<string, string | number> = {};
  if (res.name) fields.name = res.name;
  if (res.nik) fields.nik = res.nik;
  if (res.address) fields.address = res.address;

  return {
    ok: res.ok,
    type: 'KTP',
    label: DEFAULT_LABEL.KTP,
    fields,
    confidence: res.ok ? 1 : 0.6,
    notes: res.notes,
  };
}

/**
 * Read whatever this is.
 *
 * @param base64 Data URL or raw base64 of the photo.
 * @param hint   Force a document kind (the "Foto STNK" shortcut still exists).
 * @returns null when nothing usable could be read — the caller shows the
 *          "try another photo" message rather than attaching an empty doc.
 */
export async function extractDocumentOcr(
  base64: string,
  hint?: DocKind,
): Promise<DocOcrResult | null> {
  if (hint === 'STNK') return await readStnk(base64);
  if (hint === 'KTP') return await readKtp(base64);

  const res = await extractDocumentData(base64);
  if (!res.success || !res.data) return null;

  const kind = asKind(res.data.doc_type);

  // Classified as one of the two we read properly → re-read with the reader
  // that validates. Costs one extra call on the two documents that matter most
  // and are most often photographed badly.
  if (kind === 'STNK') return (await readStnk(base64)) ?? genericFrom(res.data, 'STNK');
  if (kind === 'KTP') return (await readKtp(base64)) ?? genericFrom(res.data, 'KTP');

  return genericFrom(res.data, kind);
}

function genericFrom(data: Record<string, unknown>, kind: DocKind): DocOcrResult | null {
  const fields = flatten(data.fields);
  if (Object.keys(fields).length === 0) return null;
  const label = String(data.label ?? '').trim().slice(0, 60) || DEFAULT_LABEL[kind];
  const notes = String(data.notes ?? '').trim().slice(0, 200);
  return {
    ok: true,
    type: kind,
    label,
    fields,
    confidence: clampConfidence(data.confidence),
    notes: notes || undefined,
  };
}
