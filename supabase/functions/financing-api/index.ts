import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://myinsurepath.com",
  "https://www.myinsurepath.com",
];
const PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+-roollaanndds-projects\.vercel\.app$/i;
const LOCAL_ORIGIN = /^(https?|capacitor):\/\/localhost(:\d+)?$/i;
const PRODUCT_CODES = new Set(["MOTOR_VEHICLE", "MULTIPURPOSE", "HEAVY_EQUIPMENT", "WORKING_CAPITAL"]);
const READ_ROLES = new Set(["FINANCING_ADMIN", "ORIGINATION", "VERIFICATION_ANALYST", "CREDIT_ANALYST", "CREDIT_APPROVER", "CONTRACT_OFFICER", "DISBURSEMENT_MAKER", "DISBURSEMENT_CHECKER", "SERVICING_FINANCE", "COLLECTIONS", "AUDITOR", "COMPLIANCE"]);

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && (ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN.test(origin) || LOCAL_ORIGIN.test(origin));
  return {
    "Access-Control-Allow-Origin": allowed ? origin! : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type, x-idempotency-key, x-correlation-id",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}
function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}
function safeString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function canTransition(roles: Set<string>, from: string, to: string): boolean {
  if (roles.has("FINANCING_ADMIN")) return true;
  const allowed: Record<string, Record<string, string[]>> = {
    ORIGINATION: { NEW: ["SUBMITTED", "CANCELLED"], SUBMITTED: ["DOCUMENTS_PENDING"] },
    VERIFICATION_ANALYST: { SUBMITTED: ["DOCUMENTS_PENDING", "VERIFICATION"], DOCUMENTS_PENDING: ["VERIFICATION"], VERIFICATION: ["DOCUMENTS_PENDING"] },
    CREDIT_ANALYST: { VERIFICATION: ["CREDIT_REVIEW", "REFERRED"], REFERRED: ["CREDIT_REVIEW"] },
    CREDIT_APPROVER: { CREDIT_REVIEW: ["APPROVED", "DECLINED", "REFERRED"] },
    CONTRACT_OFFICER: { APPROVED: ["OFFERED"], OFFERED: ["CONTRACTED"] },
  };
  return Array.from(roles).some((role) => (allowed[role]?.[from] ?? []).includes(to));
}
function canCreate(roles: Set<string>): boolean {
  return roles.has("FINANCING_ADMIN") || roles.has("ORIGINATION");
}

Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  const correlationId = safeString(req.headers.get("x-correlation-id"), 100) || crypto.randomUUID();
  if (req.method === "GET") return json({ service: "financing-api", status: "ok", apiVersion: "v1", correlationId }, 200, headers);
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED", correlationId }, 405, headers);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: "SERVICE_MISCONFIGURED", correlationId }, 500, headers);

  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return json({ error: "UNAUTHENTICATED", correlationId }, 401, headers);

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userData, error: authError } = await authClient.auth.getUser();
  if (authError || !userData.user) return json({ error: "UNAUTHENTICATED", correlationId }, 401, headers);
  const userId = userData.user.id;
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: roleRows, error: roleError } = await db.from("sp_financing_user_roles")
    .select("role").eq("user_id", userId).eq("active", true);
  if (roleError) return json({ error: "AUTHORIZATION_UNAVAILABLE", correlationId }, 503, headers);
  const roles = new Set((roleRows ?? []).map((row: { role: string }) => row.role));
  if (roles.size === 0 || !Array.from(roles).some((role) => READ_ROLES.has(role))) {
    await db.from("sp_financing_audit_events").insert({
      actor_user_id: userId, action: "FINANCING_ACCESS_DENIED", entity_type: "api",
      correlation_id: correlationId, outcome: "DENIED", details: { reason: "missing_or_inactive_role" },
    });
    return json({ error: "FORBIDDEN", message: "No active financing role is assigned to this account.", correlationId }, 403, headers);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "INVALID_JSON", correlationId }, 400, headers); }
  const action = safeString(body.action, 80);
  const params = (body.params && typeof body.params === "object" && !Array.isArray(body.params) ? body.params : {}) as Record<string, unknown>;

  try {
    if (action === "list_products") {
      const { data, error } = await db.from("sp_financing_products").select("id,code,name,description,active").order("name");
      if (error) throw error;
      return json({ data, correlationId }, 200, headers);
    }

    if (action === "list_applications") {
      const limit = Math.min(100, Math.max(1, Number(params.limit) || 25));
      const offset = Math.max(0, Number(params.offset) || 0);
      const { data, error, count } = await db.from("sp_financing_applications")
        .select("id,application_number,requested_amount,currency,requested_tenor_months,status,source_channel,version,created_at,updated_at,customer:sp_financing_customers(display_name,customer_type),product:sp_financing_products(code,name)", { count: "exact" })
        .order("created_at", { ascending: false }).range(offset, offset + limit - 1);
      if (error) throw error;
      return json({ data: data ?? [], total: count ?? 0, limit, offset, correlationId }, 200, headers);
    }

    if (action === "overview") {
      const { count: total, error: countError } = await db.from("sp_financing_applications").select("id", { count: "exact", head: true });
      if (countError) throw countError;
      const { data: statuses, error: statusError } = await db.from("sp_financing_applications").select("status,requested_amount").limit(10000);
      if (statusError) throw statusError;
      const byStatus: Record<string, number> = {};
      let amountRequested = 0;
      for (const row of statuses ?? []) {
        byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
        amountRequested += Number(row.requested_amount ?? 0);
      }
      return json({ data: { totalApplications: total ?? 0, amountRequestedIdr: amountRequested, byStatus, partial: (total ?? 0) > (statuses?.length ?? 0), asOf: new Date().toISOString() }, correlationId }, 200, headers);
    }

    if (action === "create_application") {
      if (!canCreate(roles)) return json({ error: "FORBIDDEN", message: "This role cannot create applications.", correlationId }, 403, headers);
      const customerName = safeString(params.customer_name, 160);
      const customerType = safeString(params.customer_type, 20) || "INDIVIDUAL";
      const productCode = safeString(params.product_code, 40);
      const amount = Number(params.requested_amount);
      const tenor = Number(params.requested_tenor_months);
      const sourceChannel = safeString(params.source_channel, 20) || "DIRECT";
      const notes = safeString(params.notes, 2000);
      if (customerName.length < 2 || !["INDIVIDUAL", "BUSINESS"].includes(customerType) ||
          !PRODUCT_CODES.has(productCode) || !Number.isFinite(amount) || amount <= 0 || amount > 100000000000 ||
          !Number.isInteger(tenor) || tenor < 1 || tenor > 240 ||
          !["DIRECT", "DEALER", "MERCHANT", "PARTNER", "MANUAL"].includes(sourceChannel)) {
        return json({ error: "VALIDATION_ERROR", message: "Invalid customer, product, amount, tenor, or source channel.", correlationId }, 400, headers);
      }
      const idempotencyKey = safeString(req.headers.get("x-idempotency-key"), 128);
      if (idempotencyKey.length < 8) return json({ error: "IDEMPOTENCY_KEY_REQUIRED", correlationId }, 400, headers);
      const requestBody = { customerName, customerType, productCode, amount, tenor, sourceChannel, notes };
      const requestHash = await sha256(JSON.stringify(requestBody));
      const { data, error } = await db.rpc("sp_financing_create_application", {
        p_user_id: userId,
        p_customer_type: customerType,
        p_customer_name: customerName,
        p_product_code: productCode,
        p_amount: amount,
        p_tenor_months: tenor,
        p_source_channel: sourceChannel,
        p_notes: notes,
        p_idempotency_key: idempotencyKey,
        p_request_hash: requestHash,
      });
      if (error) {
        if (error.message.includes("idempotency_conflict")) return json({ error: "IDEMPOTENCY_CONFLICT", correlationId }, 409, headers);
        if (/invalid_|product_unavailable|idempotency_in_progress|idempotency_key_required/.test(error.message)) return json({ error: "VALIDATION_ERROR", message: error.message.split("\n")[0], correlationId }, 400, headers);
        console.error("financing create application failed", correlationId, error.code);
        return json({ error: "APPLICATION_CREATE_FAILED", correlationId }, 500, headers);
      }
      return json({ data, correlationId }, 201, headers);
    }

    if (action === "transition_application") {
      const applicationId = safeString(params.application_id, 40);
      const targetStatus = safeString(params.target_status, 30);
      const reason = safeString(params.reason, 1000);
      const expectedVersion = Number(params.expected_version);
      if (!/^[0-9a-f-]{36}$/i.test(applicationId) || !Number.isInteger(expectedVersion) || expectedVersion < 1 || reason.length < 3 ||
          !["SUBMITTED","DOCUMENTS_PENDING","VERIFICATION","CREDIT_REVIEW","REFERRED","APPROVED","DECLINED","OFFERED","CONTRACTED","BOOKED","CANCELLED"].includes(targetStatus)) {
        return json({ error: "VALIDATION_ERROR", correlationId }, 400, headers);
      }
      const { data: current, error: currentError } = await db.from("sp_financing_applications").select("id,status,version").eq("id", applicationId).maybeSingle();
      if (currentError) throw currentError;
      if (!current) return json({ error: "NOT_FOUND", correlationId }, 404, headers);
      if (!canTransition(roles, current.status, targetStatus)) return json({ error: "FORBIDDEN_TRANSITION", correlationId }, 403, headers);
      const { data, error } = await db.rpc("sp_financing_transition_application", {
        p_user_id: userId, p_application_id: applicationId, p_expected_version: expectedVersion,
        p_target_status: targetStatus, p_reason: reason, p_correlation_id: correlationId,
      });
      if (error) {
        if (error.message.includes("version_conflict")) return json({ error: "VERSION_CONFLICT", correlationId }, 409, headers);
        if (error.message.includes("application_not_found")) return json({ error: "NOT_FOUND", correlationId }, 404, headers);
        if (error.message.includes("invalid_state_transition")) return json({ error: "INVALID_STATE_TRANSITION", correlationId }, 409, headers);
        if (error.message.includes("reason_required")) return json({ error: "REASON_REQUIRED", correlationId }, 400, headers);
        console.error("financing transition failed", correlationId, error.code);
        return json({ error: "TRANSITION_FAILED", correlationId }, 500, headers);
      }
      return json({ data, correlationId }, 200, headers);
    }

    return json({ error: "UNKNOWN_ACTION", correlationId }, 400, headers);
  } catch (error) {
    console.error("financing API failed", correlationId, error instanceof Error ? error.message : "unknown");
    return json({ error: "INTERNAL_ERROR", correlationId }, 500, headers);
  }
});
