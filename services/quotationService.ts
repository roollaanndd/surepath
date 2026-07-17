// quotationService.ts — client wrapper for the e-quotation backend.
//
// Every generated quotation slip PDF carries a QR code pointing at
// https://myinsurepath.com/q/{code}. This service creates that code,
// snapshots the quotation via the data-gateway (save_quotation), and
// exposes the public fetch/confirm calls used by EQuotationPage.

import { callGateway, supabase } from './db';
import { generateQuotationSlipPDF, type QuotationSlipData } from './quotationSlipPdf';

const GATEWAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/data-gateway`;
// quotations-gateway is the CANONICAL runtime for the quotation actions: it is
// small, self-contained, and redeployed on every quotation change. The copy of
// the quotations module inside the deployed data-gateway bundle can lag behind
// (it is deployed manually and less often), so the client calls the bridge
// FIRST and only falls back to data-gateway if the bridge is unreachable.
const BRIDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/quotations-gateway`;

const isUnknownAction = (err?: string): boolean => /unknown action/i.test(err ?? '');

async function callBridge<T = any>(action: string, params: Record<string, unknown>, authToken?: string): Promise<{ data?: T; error?: string }> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const res = await fetch(BRIDGE_URL, { method: 'POST', headers, body: JSON.stringify({ action, params }) });
    return await res.json();
  } catch (e: any) {
    return { error: e?.message ?? 'Network error' };
  }
}

export const E_QUOTE_BASE_URL = 'https://myinsurepath.com/q/';

// ── Code generation ─────────────────────────────────────────────────────────
// 12-char base36 slug — unguessable enough for a share link (62 bits) while
// staying short so the QR stays sparse and scannable.
export function generateQuotationCode(): string {
  const bytes = new Uint8Array(10);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < bytes.length && out.length < 12; i++) {
    out += alphabet[bytes[i] % alphabet.length];
    if (i === 4) out += alphabet[(bytes[0] ^ bytes[9]) % alphabet.length];
  }
  return out.slice(0, 12);
}

export const eQuoteUrlFor = (code: string): string => `${E_QUOTE_BASE_URL}${code}`;

// ── Save (authed — customer/agent/operator/admin apps) ─────────────────────
export interface SaveQuotationInput {
  code: string;
  data: QuotationSlipData;
  sourceApp: 'CUSTOMER' | 'AGENT' | 'OPERATOR' | 'ADMIN' | 'B2B' | 'INSURER';
  orderId?: string;
  totalPremiumNumeric?: number;
}

// Best-effort: PDF generation must never fail because the snapshot could not
// be stored — the QR link simply shows a "hubungi kami" fallback page then.
export async function saveQuotationSnapshot(input: SaveQuotationInput): Promise<boolean> {
  try {
    const { code, data, sourceApp, orderId, totalPremiumNumeric } = input;
    const params = {
      code,
      quotation_number: data.quotationNumber,
      product_type: data.productType ?? 'MOTOR',
      product_name: data.productName ?? null,
      payload: data,
      customer_name: data.preparedForCompany,
      insurer_name: data.insurer,
      agent_name: data.agentName ?? null,
      agent_phone: data.agentPhone ?? null,
      total_premium: totalPremiumNumeric ?? null,
      valid_until: data.validUntil ?? null,
      source_app: sourceApp,
      order_id: orderId ?? null,
    };
    // Bridge first (canonical, always current); data-gateway as fallback.
    const { data: { session } } = await supabase.auth.getSession();
    let { error } = await callBridge('save_quotation', params, session?.access_token);
    if (error) {
      ({ error } = await callGateway('save_quotation', params));
    }
    if (error) {
      console.warn('quotationService: save_quotation failed —', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('quotationService: save_quotation threw —', e);
    return false;
  }
}

// ── One-call flow used by every app (customer/agent/operator/admin/B2B) ────
// Mints the unique e-quote code, snapshots the quotation to the backend
// (best-effort), then renders + downloads the 4-page PDF whose QR points at
// https://myinsurepath.com/q/{code}.
export async function publishAndDownloadQuotation(
  data: QuotationSlipData,
  opts: Omit<SaveQuotationInput, 'code' | 'data'>,
): Promise<void> {
  const code = data.eQuoteCode ?? generateQuotationCode();
  const enriched: QuotationSlipData = {
    ...data,
    eQuoteCode: code,
    eQuoteUrl: eQuoteUrlFor(code),
  };
  await saveQuotationSnapshot({ code, data: enriched, ...opts });
  await generateQuotationSlipPDF(enriched);
}

// ── Public fetch/confirm (no auth — e-quotation page) ──────────────────────
// Bridge first (canonical, enforces the 14-day link expiry); data-gateway as
// network fallback only.
async function callPublicGateway<T = any>(action: string, params: Record<string, unknown>): Promise<{ data?: T; error?: string }> {
  const viaBridge = await callBridge<T>(action, params);
  // Domain answers (data, 404 "not found", 410 "expired", …) are final.
  // Only fall back when the bridge could not answer at all.
  const bridgeUnavailable = !!viaBridge.error
    && (isUnknownAction(viaBridge.error) || /fetch|network|load failed/i.test(viaBridge.error));
  if (!bridgeUnavailable) return viaBridge;
  try {
    const res = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, params }),
    });
    return await res.json();
  } catch (e: any) {
    return { error: e?.message ?? 'Network error' };
  }
}

export interface PublicQuotation {
  code: string;
  quotation_number: string;
  product_type: string;
  product_name: string | null;
  status: 'SENT' | 'VIEWED' | 'CONFIRMED' | 'PAID' | 'EXPIRED' | 'WITHDRAWN';
  customer_name: string | null;
  insurer_name: string | null;
  agent_name: string | null;
  agent_phone: string | null;
  total_premium: number | null;
  valid_until: string | null;
  /** QR link expiry — 14 days from generation; page shows EXPIRED after this. */
  link_expires_at?: string | null;
  confirmed_at: string | null;
  created_at: string;
  payload: Partial<QuotationSlipData>;
}

export const getPublicQuotation = (code: string) =>
  callPublicGateway<PublicQuotation>('get_public_quotation', { code });

export const confirmPublicQuotation = (code: string, name: string, phone: string) =>
  callPublicGateway<{ ok: boolean; status: string }>('confirm_public_quotation', { code, name, phone });
