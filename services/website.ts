// Website CMS config, page views/traffic, online users, security stats,
// insurer portal auth, review tokens, AI reviews, promo codes, B2B
// submissions/quotes, and Pathy chat.
//
// Anything customer- or portal-facing that isn't tied to a specific agent's
// wallet/clients/orders ends up here.

import { supabase, callGateway, callPublicGateway } from './db';
import { createAdminNotification } from './notifications';
import { recordPathyTurn } from './pathyLog';
import type {
  SpWebsiteConfig,
  SpPolicyOrder,
  SpInsurer,
  SpReviewToken,
  TrafficStats,
  OnlineUsersResult,
  SecurityStats,
  SpPromoCode,
  AIPolicyReview,
  AIFinanceReview,
  SpB2BSubmission,
  SpB2BQuote,
} from './dbTypes';

// ─── Website CMS Config (sp_website_config) ──────────────────────────────────

export async function fetchWebsiteSection(sectionKey: string): Promise<SpWebsiteConfig | null> {
  const { data, error } = await supabase
    .from('sp_website_config')
    .select('*')
    .eq('section_key', sectionKey)
    .single();
  if (error) return null;
  return data as SpWebsiteConfig;
}

export async function fetchAllWebsiteSections(): Promise<SpWebsiteConfig[]> {
  const { data, error } = await supabase
    .from('sp_website_config')
    .select('*')
    .order('section_key');
  if (error) return [];
  return (data ?? []) as SpWebsiteConfig[];
}

export async function upsertWebsiteSection(payload: Partial<SpWebsiteConfig> & { section_key: string }): Promise<SpWebsiteConfig | null> {
  const { data, error } = await supabase
    .from('sp_website_config')
    .upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict: 'section_key' })
    .select()
    .single();
  if (error) { console.error('upsertWebsiteSection:', error); return null; }
  return data as SpWebsiteConfig;
}

export async function resetWebsiteSection(sectionKey: string): Promise<void> {
  await supabase
    .from('sp_website_config')
    .update({ headline: null, subtitle: null, cta_text: null, cta_secondary_text: null, bg_type: 'none', bg_value: null, is_visible: true, extra_json: {}, updated_at: new Date().toISOString() })
    .eq('section_key', sectionKey);
}

// ─── Page views / traffic ─────────────────────────────────────────────────────

export async function recordPageView(page: string): Promise<void> {
  await supabase.from('sp_page_views').insert({
    page,
    ts: new Date().toISOString(),
    user_agent: navigator.userAgent.slice(0, 200),
  });
}

export async function getTrafficStats(): Promise<TrafficStats> {
  const { data, error } = await callGateway('admin_traffic_stats', {});
  if (error || !data) return { daily: [], topPages: [] };
  const rows = (data as any[]);
  const dailyMap: Record<string, number> = {};
  const pageMap: Record<string, number> = {};
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dailyMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const row of rows) {
    const date = (row.ts as string).slice(0, 10);
    if (date in dailyMap) dailyMap[date]++;
    pageMap[row.page] = (pageMap[row.page] ?? 0) + 1;
  }
  const daily = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));
  const topPages = Object.entries(pageMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([page, count]) => ({ page, count }));
  return { daily, topPages };
}

// ─── Online Users / Heartbeat ─────────────────────────────────────────────────

export async function recordUserHeartbeat(userId: string, role: string): Promise<void> {
  await supabase.from('sp_user_sessions').upsert(
    { user_id: userId, role, last_seen: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
}

export async function getOnlineUsers(): Promise<OnlineUsersResult> {
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('sp_user_sessions')
    .select('role')
    .gte('last_seen', since);
  if (error || !data) return { total: 0, byRole: {} };
  const byRole: Record<string, number> = {};
  for (const row of data as { role: string }[]) {
    byRole[row.role] = (byRole[row.role] ?? 0) + 1;
  }
  return { total: data.length, byRole };
}

// ─── Security stats ───────────────────────────────────────────────────────────

export function getFailedLoginAttempts(): number {
  let total = 0;
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('sp_rate_limit_')) continue;
    try {
      const val = JSON.parse(localStorage.getItem(key) ?? '{}');
      if (val.resetAt && val.resetAt > cutoff) total += val.count ?? 0;
    } catch { /* ignore */ }
  }
  return total;
}

export function getRateLimitBlocks(): Array<{ email: string; attempts: number; until: number }> {
  const entries: Array<{ email: string; attempts: number; until: number }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('sp_rate_limit_')) continue;
    try {
      const val = JSON.parse(localStorage.getItem(key) ?? '{}');
      const email = key.replace('sp_rate_limit_', '');
      entries.push({ email, attempts: val.count ?? 0, until: val.resetAt ?? 0 });
    } catch { /* ignore */ }
  }
  return entries.sort((a, b) => b.attempts - a.attempts);
}

export async function getSecurityStats(): Promise<SecurityStats> {
  const { data } = await callGateway('admin_security_stats', {});
  const d = (data as any) ?? {};
  return {
    failedLogins24h: getFailedLoginAttempts(),
    activeSessionsCount: d.activeSessionsCount ?? 0,
    lastLoginAt: d.lastLoginAt ?? null,
    blockedEntries: getRateLimitBlocks(),
  };
}

export async function getSessionActivityByHour(): Promise<Array<{ hour: number; count: number }>> {
  const { data } = await callGateway('admin_security_stats', {});
  const rows: Array<{ last_seen: string }> = (data as any)?.sessionsByHour ?? [];
  const buckets: Record<number, number> = {};
  for (const row of rows) {
    const h = new Date(row.last_seen).getHours();
    buckets[h] = (buckets[h] ?? 0) + 1;
  }
  return Array.from({ length: 24 }, (_, h) => ({ hour: h, count: buckets[h] ?? 0 }));
}

// ─── Insurer Portal Auth ──────────────────────────────────────────────────────

export async function createInsurerAuthToken(insurer_id: string, email: string): Promise<string | null> {
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
  const { error } = await supabase.from('sp_insurer_auth_tokens').insert({
    insurer_id, token, email, expires_at,
  });
  if (error) {
    // Table may not exist yet — gracefully degrade
    console.warn('createInsurerAuthToken:', error.message);
    return token; // return token anyway so URL still works when table exists
  }
  return token;
}

export async function validateInsurerAuthToken(token: string): Promise<SpInsurer | null> {
  const { data, error } = await supabase
    .from('sp_insurer_auth_tokens')
    .select('*, sp_insurers(*)')
    .eq('token', token)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (error || !data) return null;
  // Mark as used
  await supabase.from('sp_insurer_auth_tokens').update({ used_at: new Date().toISOString() }).eq('token', token);
  return (data.sp_insurers as SpInsurer) ?? null;
}

export async function getInsurerOrders(insurerId: string): Promise<SpPolicyOrder[]> {
  const { data, error } = await supabase
    .from('sp_policy_orders')
    .select('*')
    .eq('insurer_id', insurerId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getInsurerOrders:', error); return []; }
  return (data ?? []) as SpPolicyOrder[];
}

// ─── Review Tokens ────────────────────────────────────────────────────────────

export async function createReviewToken(orderId: string, createdBy?: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('sp_review_tokens')
    .insert({
      order_id: orderId,
      created_by: createdBy ?? null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('token')
    .single();
  if (error) { console.error('createReviewToken:', error); return null; }
  return (data as any).token as string;
}

// getOrderByToken/submitInsurerReview go through the data-gateway (service
// role) instead of direct table access — sp_policy_orders has zero RLS
// policies (deny-all except service_role), so the old direct-table-access
// version of these two functions was silently broken for the unauthenticated
// insurer review page. get_insurer_review/submit_insurer_decision are the
// existing, more complete gateway equivalents (they also handle admin/agent
// notifications, Telegram alerts, and activity logging).
export async function getOrderByToken(
  token: string
): Promise<{ order: SpPolicyOrder; tokenRecord: SpReviewToken } | null> {
  const { data, error } = await callPublicGateway('get_insurer_review', { token });
  if (error || !data) return null;
  return { order: data.order as SpPolicyOrder, tokenRecord: data.token as SpReviewToken };
}

export async function submitInsurerReview(
  token: string,
  action: 'APPROVED' | 'REQUEST_INFO' | 'DECLINED',
  notes: string
): Promise<boolean> {
  const { error } = await callPublicGateway('submit_insurer_decision', { token, action, notes });
  if (error) { console.error('submitInsurerReview:', error); return false; }
  return true;
}

// ─── Auto-send review link on order submission ────────────────────────────────

export async function autoSendReviewLink(
  orderId: string,
  orderNumber: string,
  clientName: string,
  insurerWa?: string,
  insurerEmail?: string
): Promise<string | null> {
  const token = await createReviewToken(orderId);
  if (!token) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://surepath.app';
  const reviewUrl = `${origin}/review/${token}`;

  // Update token with the review URL
  await supabase.from('sp_review_tokens').update({ review_url: reviewUrl }).eq('token', token);

  // Send email to insurer admin if email is configured
  try {
    if (insurerEmail) {
      // Create a dashboard auth token for the insurer
      const { data: insurerRow } = await supabase
        .from('sp_policy_orders')
        .select('insurer_id, insurer_name')
        .eq('id', orderId)
        .maybeSingle();

      let dashboardUrl = reviewUrl; // fallback
      if (insurerRow?.insurer_id) {
        const dashToken = await createInsurerAuthToken(insurerRow.insurer_id, insurerEmail);
        if (dashToken) {
          const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://surepath.app';
          dashboardUrl = `${appOrigin}/insurer-portal?token=${dashToken}`;
        }
      }

      const { data: orderRow } = await supabase
        .from('sp_policy_orders')
        .select('order_number, client_name, product_name, total_premium, insurer_name')
        .eq('id', orderId)
        .maybeSingle();

      await supabase.functions.invoke('send-insurer-email', {
        body: {
          to: insurerEmail,
          order_number: orderRow?.order_number ?? orderId,
          client_name: orderRow?.client_name ?? clientName,
          product_name: orderRow?.product_name ?? 'Asuransi',
          total_premium: orderRow?.total_premium ?? 0,
          insurer_name: orderRow?.insurer_name ?? 'Penanggung',
          review_url: reviewUrl,
          dashboard_url: dashboardUrl,
        },
      });
    }
  } catch (emailErr) {
    console.warn('autoSendReviewLink: email send failed (non-fatal):', emailErr);
  }

  // Create admin notification with the link
  await createAdminNotification({
    type: 'NEW_ORDER',
    title: `Order Baru: ${orderNumber}`,
    body: `Order dari ${clientName} siap ditinjau. Salin link dan kirimkan ke penanggung.`,
    order_id: orderId,
    review_url: reviewUrl,
    metadata: { insurer_wa: insurerWa ?? null },
  });

  return reviewUrl;
}

// ─── AI Policy Review ─────────────────────────────────────────────────────────

export async function runAIPolicyReview(orderId: string): Promise<AIPolicyReview | null> {
  // sp_policy_orders has no direct-access RLS policies (service_role/gateway
  // only) — fetch via the gateway instead of the anon-keyed client, which
  // would otherwise be denied even for admins.
  const { data: order, error } = await callGateway('admin_get_order', { order_id: orderId });
  if (error || !order) return null;

  const { data: fnData, error: fnError } = await supabase.functions.invoke('ai-policy-review', {
    body: { order_id: orderId, order },
  });
  if (fnError) { console.error('runAIPolicyReview:', fnError); return null; }
  return fnData as AIPolicyReview;
}

// ─── AI Finance Review ────────────────────────────────────────────────────────

export async function runAIFinanceReview(periodDays = 30): Promise<AIFinanceReview | null> {
  const { data: fnData, error: fnError } = await supabase.functions.invoke('ai-finance-review', {
    body: { period_days: periodDays },
  });
  if (fnError) { console.error('runAIFinanceReview:', fnError); return null; }
  return fnData as AIFinanceReview;
}

// ─── Promo Codes ──────────────────────────────────────────────────────────────

export async function getPromoCodes(): Promise<SpPromoCode[]> {
  const { data, error } = await supabase
    .from('sp_promo_codes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getPromoCodes:', error); return []; }
  return (data ?? []) as SpPromoCode[];
}

export async function createPromoCode(
  payload: Omit<SpPromoCode, 'id' | 'used_count' | 'created_at' | 'updated_at'>,
): Promise<SpPromoCode | null> {
  const { data, error } = await supabase
    .from('sp_promo_codes')
    .insert({ ...payload, used_count: 0 })
    .select()
    .single();
  if (error) { console.error('createPromoCode:', error); return null; }
  return data as SpPromoCode;
}

export async function updatePromoCode(id: string, updates: Partial<SpPromoCode>): Promise<boolean> {
  const { error } = await supabase
    .from('sp_promo_codes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { console.error('updatePromoCode:', error); return false; }
  return true;
}

export async function validatePromoCode(
  code: string,
  productType: string,
): Promise<{ valid: boolean; promo?: SpPromoCode; message?: string }> {
  const { data, error } = await supabase
    .from('sp_promo_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .single();

  if (error || !data) return { valid: false, message: 'Kode promo tidak ditemukan.' };
  const p = data as SpPromoCode;
  const now = new Date().toISOString();
  if (now < p.valid_from) return { valid: false, message: 'Kode promo belum aktif.' };
  if (now > p.valid_to)   return { valid: false, message: 'Kode promo sudah kadaluarsa.' };
  if (p.used_count >= p.usage_limit) return { valid: false, message: 'Kuota kode promo habis.' };
  if (!p.applicable_products.includes('ALL') && !p.applicable_products.includes(productType)) {
    return { valid: false, message: 'Kode promo tidak berlaku untuk produk ini.' };
  }
  return { valid: true, promo: p };
}

// ─── Pathy AI Chat ────────────────────────────────────────────────────────────
// Pathy runs on the `pathy-agent` edge function: a tool-calling assistant that
// reads the caller's own policies, claims and quotes, prices motor premiums off
// the active OJK rate set, and can save a draft penawaran — all server-side,
// scoped to the verified JWT (see supabase/functions/pathy-agent/).
//
// History: v1.46.0 pointed Pathy at askPathy() (knowledge base only, no user
// data, no tools) and wrapped it in a catch that fell through to the
// `pathy_chat` gateway action. That action needs ANTHROPIC_API_KEY, which is
// not configured, so it answers 503 "AI not configured" — and the UI turned
// *every* failure, including "please log in" and rate limits, into a
// "coming soon" message. That is why Pathy looked permanently dead.
// askPathy() is now only a degraded fallback for when pathy-agent itself is
// unreachable, and real errors are surfaced with their own code.

export type PathyErrorCode = 'AUTH' | 'RATE_LIMIT' | 'NOT_CONFIGURED' | 'UNAVAILABLE';

export class PathyError extends Error {
  code: PathyErrorCode;
  constructor(code: PathyErrorCode, message: string) {
    super(message);
    this.name = 'PathyError';
    this.code = code;
  }
}

/** Structured block the chat renders instead of trusting the model to retype numbers. */
export interface PathyCard {
  type:
    | 'policies' | 'policy_detail' | 'claims' | 'quotes'
    | 'premium' | 'quote_created' | 'sales_report' | 'products'
    | 'document_read' | 'offers' | 'quotation_ready'
    // v2.3.0 — layanan purna jual
    | 'coverage' | 'claim_start' | 'claim_status' | 'renewals'
    | 'policy_explainer' | 'payment_help'
    | 'pipeline' | 'commission_forecast' | 'followup_draft'
    | 'document_saved';
  data: any;
}

/**
 * A document the user attached to a Pathy turn. OCR runs here on the client —
 * it already owns stnk-ocr, the KTP reader and the vehicle price database — so
 * only extracted fields travel to the agent, never the image itself.
 */
export type PathyDocumentType = 'STNK' | 'KTP' | 'SIM' | 'POLIS' | 'INVOICE' | 'DOC';

export interface PathyDocument {
  type: PathyDocumentType;
  /** Human label for a generic document, e.g. "Kuitansi bengkel". */
  label?: string;
  fields: Record<string, unknown>;
  confidence?: number;
}

export interface PathyReply {
  reply: string;
  cards: PathyCard[];
  toolsUsed: string[];
  /**
   * Caveat for this turn, computed server-side from the tools that ran and the
   * words that came back (pathy-agent/disclaimers.ts). Rendered under the
   * bubble so it is there even on turns where the model forgot to add one.
   */
  disclaimer?: string;
  /** True when the tool-capable agent was unreachable and we answered from the knowledge base only. */
  degraded?: boolean;
}

// A tool round-trip is several model calls, so this is deliberately longer
// than the 15s data-gateway timeout.
const PATHY_TIMEOUT_MS = 45_000;

/**
 * Pathy, dengan rekaman percakapannya.
 *
 * Perekaman duduk di PEMBUNGKUS, bukan di dalam, karena jalur sukses di dalam
 * ada empat (agen langsung, dan tiga jalur jatuh ke basis pengetahuan).
 * Menempelkannya satu per satu berarti cepat atau lambat ada yang terlewat —
 * dan cacat semacam itu diam: fiturnya terlihat jalan sampai ada yang mencari
 * transkrip yang ternyata tidak pernah tersimpan.
 *
 * `void` di depan panggilannya disengaja: obrolan tidak boleh menunggu tabel
 * audit, dan tidak boleh gagal karenanya.
 */
export async function pathyChat(
  message: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  documents?: PathyDocument[],
): Promise<PathyReply> {
  const reply = await pathyChatInner(message, conversationHistory, documents);
  void recordPathyTurn({
    question: message,
    answer: reply.reply,
    toolsUsed: reply.toolsUsed,
    degraded: reply.degraded,
  });
  return reply;
}

async function pathyChatInner(
  message: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  documents?: PathyDocument[],
): Promise<PathyReply> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new PathyError('AUTH', 'Silakan login dulu supaya aku bisa melihat data polismu.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PATHY_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pathy-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        message,
        history: conversationHistory ?? [],
        documents: documents ?? [],
      }),
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(timeoutId);
    console.error('pathyChat: pathy-agent unreachable:', e);
    return await pathyKnowledgeFallback(message, conversationHistory);
  }
  clearTimeout(timeoutId);

  if (res.ok) {
    const body = await res.json().catch(() => ({}));
    const data = body?.data;
    const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
    if (reply) {
      return {
        reply,
        cards: Array.isArray(data.cards) ? data.cards : [],
        toolsUsed: Array.isArray(data.toolsUsed) ? data.toolsUsed : [],
        disclaimer: typeof data.disclaimer === 'string' ? data.disclaimer : undefined,
      };
    }
    return await pathyKnowledgeFallback(message, conversationHistory);
  }

  const errBody = await res.json().catch(() => ({}));
  const detail = typeof errBody?.error === 'string' ? errBody.error : '';

  if (res.status === 401) throw new PathyError('AUTH', detail || 'Sesi kamu sudah berakhir. Silakan login ulang.');
  if (res.status === 429) throw new PathyError('RATE_LIMIT', detail || 'Terlalu banyak pesan. Coba lagi dalam satu jam ya.');
  // 404 = function not deployed yet in this environment; 5xx = transient.
  // Both are worth a knowledge-base answer rather than a dead end.
  if (res.status === 404 || res.status >= 500) {
    return await pathyKnowledgeFallback(message, conversationHistory);
  }
  throw new PathyError('UNAVAILABLE', detail || 'Asisten Pathy sedang bermasalah. Coba lagi.');
}

/**
 * Knowledge-base-only answer (products, OJK rules, claim process). No access
 * to the user's own data and no tools — hence `degraded: true`, which the UI
 * surfaces so nobody mistakes a generic answer for a personalised one.
 */
async function pathyKnowledgeFallback(
  message: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<PathyReply> {
  try {
    const { askPathy } = await import('./aiGateway');
    const reply = await askPathy(message, conversationHistory);
    return { reply, cards: [], toolsUsed: [], degraded: true };
  } catch (e: any) {
    const msg = String(e?.message ?? '');
    if (/not configured|belum dikonfigurasi/i.test(msg)) {
      throw new PathyError('NOT_CONFIGURED', msg);
    }
    throw new PathyError('UNAVAILABLE', msg || 'Asisten Pathy sedang bermasalah. Coba lagi.');
  }
}

// ─── B2B Submissions & Quotes ─────────────────────────────────────────────────

export async function getB2BSubmissions(clientId: string): Promise<SpB2BSubmission[]> {
  const { data, error } = await supabase
    .from('sp_b2b_submissions')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getB2BSubmissions:', error); return []; }
  return (data ?? []) as SpB2BSubmission[];
}

export async function getAllB2BSubmissions(): Promise<SpB2BSubmission[]> {
  const { data, error } = await supabase
    .from('sp_b2b_submissions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getAllB2BSubmissions:', error); return []; }
  return (data ?? []) as SpB2BSubmission[];
}

export async function updateB2BSubmissionStatus(
  id: string,
  status: string,
  notes?: string,
): Promise<boolean> {
  const payload: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (notes !== undefined) payload.admin_notes = notes;
  const { error } = await callGateway('admin_update_b2b_submission', { submission_id: id, ...payload }).then(r => r.error ? { error: r.error } : { error: null });
  if (error) { console.error('updateB2BSubmissionStatus:', error); return false; }
  return true;
}

export async function getB2BQuotes(clientId: string): Promise<SpB2BQuote[]> {
  const { data, error } = await supabase
    .from('sp_b2b_quotes')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getB2BQuotes:', error); return []; }
  return (data ?? []) as SpB2BQuote[];
}

export async function createB2BQuote(
  data: Omit<SpB2BQuote, 'id' | 'created_at' | 'updated_at'>,
): Promise<boolean> {
  const { error } = await callGateway('admin_create_b2b_quote', data).then(r => r.error ? { error: r.error } : { error: null });
  if (error) { console.error('createB2BQuote:', error); return false; }
  return true;
}

export async function createB2BSubmission(
  data: Omit<SpB2BSubmission, 'id' | 'created_at' | 'updated_at'>
): Promise<SpB2BSubmission | null> {
  const { data: row, error } = await supabase
    .from('sp_b2b_submissions')
    .insert({ ...data, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) { console.error('createB2BSubmission:', error); return null; }
  return row;
}

export async function updateB2BQuoteStatus(
  quoteId: string,
  status: 'ACCEPTED' | 'REJECTED'
): Promise<boolean> {
  const { error } = await supabase
    .from('sp_b2b_quotes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', quoteId);
  if (error) { console.error('updateB2BQuoteStatus:', error); return false; }
  return true;
}
