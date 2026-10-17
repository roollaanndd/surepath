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

    if (action === "import_reconciliation_batch") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("SERVICING_FINANCE") || roles.has("AUDITOR"))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const statementReference = safeString(params.statement_reference, 120);
      const maskedBankAccount = safeString(params.masked_bank_account, 40);
      const periodStart = safeString(params.period_start, 10);
      const periodEnd = safeString(params.period_end, 10);
      const rawLines = Array.isArray(params.lines) ? params.lines as Array<Record<string, unknown>> : [];
      const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
      if (statementReference.length < 6 || maskedBankAccount.length < 4 || !/[*•]{2,}|[Xx]{2,}/.test(maskedBankAccount) ||
          !isDate(periodStart) || !isDate(periodEnd) || periodEnd < periodStart || rawLines.length < 1 || rawLines.length > 500) {
        return json({ error: "VALIDATION_ERROR", message: "Provide a statement reference, masked bank account, valid period and 1–500 normalized statement lines.", correlationId }, 400, headers);
      }
      const lines: Array<Record<string, unknown>> = [];
      for (const line of rawLines) {
        const transactionDate = safeString(line.transaction_date, 10);
        const direction = safeString(line.direction, 3);
        const amount = Number(line.amount);
        const externalReference = safeString(line.external_reference, 200);
        const descriptionHash = safeString(line.description_hash, 64);
        if (!isDate(transactionDate) || transactionDate < periodStart || transactionDate > periodEnd ||
            !["IN", "OUT"].includes(direction) || !Number.isFinite(amount) || amount <= 0 ||
            externalReference.length < 3 || (descriptionHash && !/^[a-f0-9]{64}$/i.test(descriptionHash))) {
          return json({ error: "VALIDATION_ERROR", message: "Each statement line requires a valid date, IN/OUT direction, positive amount, external reference and optional SHA-256 description hash.", correlationId }, 400, headers);
        }
        lines.push({ transaction_date: transactionDate, direction, amount, external_reference: externalReference, ...(descriptionHash ? { description_hash: descriptionHash } : {}) });
      }
      const { data, error } = await db.rpc("sp_financing_import_reconciliation_batch", {
        p_user_id: userId, p_statement_reference: statementReference, p_masked_bank_account: maskedBankAccount,
        p_period_start: periodStart, p_period_end: periodEnd, p_lines: lines, p_correlation_id: correlationId,
      });
      if (error) {
        if (/reconciliation_access_required/.test(error.message)) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
        if (/statement_reference_already_imported/.test(error.message)) return json({ error: "STATEMENT_ALREADY_IMPORTED", correlationId }, 409, headers);
        if (/invalid_reconciliation_batch|invalid_statement_line/.test(error.message)) return json({ error: "VALIDATION_ERROR", message: error.message.split("\\n")[0], correlationId }, 400, headers);
        console.error("reconciliation batch import failed", correlationId, error.code);
        return json({ error: "RECONCILIATION_IMPORT_FAILED", correlationId }, 500, headers);
      }
      return json({ data, correlationId }, 201, headers);
    }

    if (action === "reconcile_statement_line") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("SERVICING_FINANCE"))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const statementLineId = safeString(params.statement_line_id, 40);
      const entityType = safeString(params.entity_type, 30);
      const entityId = safeString(params.entity_id, 40);
      if (!/^[0-9a-f-]{36}$/i.test(statementLineId) || !/^[0-9a-f-]{36}$/i.test(entityId) ||
          !["REPAYMENT", "DISBURSEMENT"].includes(entityType)) {
        return json({ error: "VALIDATION_ERROR", correlationId }, 400, headers);
      }
      const { data, error } = await db.rpc("sp_financing_reconcile_statement_line", {
        p_user_id: userId, p_statement_line_id: statementLineId, p_entity_type: entityType,
        p_entity_id: entityId, p_correlation_id: correlationId,
      });
      if (error) {
        if (/reconciliation_access_required/.test(error.message)) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
        if (/statement_line_not_found/.test(error.message)) return json({ error: "NOT_FOUND", correlationId }, 404, headers);
        if (/statement_line_not_unmatched/.test(error.message)) return json({ error: "RECONCILIATION_CONFLICT", correlationId }, 409, headers);
        if (/invalid_reconciliation_target/.test(error.message)) return json({ error: "VALIDATION_ERROR", correlationId }, 400, headers);
        console.error("statement line reconciliation failed", correlationId, error.code);
        return json({ error: "RECONCILIATION_FAILED", correlationId }, 500, headers);
      }
      return json({ data, correlationId }, 200, headers);
    }

    if (action === "list_reconciliation_batches") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("SERVICING_FINANCE") || roles.has("AUDITOR"))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
      const { data, error } = await db.rpc("sp_financing_list_reconciliation_batches", { p_user_id: userId, p_limit: limit });
      if (error) {
        if (/reconciliation_access_required/.test(error.message)) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
        console.error("reconciliation batch list failed", correlationId, error.code);
        return json({ error: "RECONCILIATION_LIST_FAILED", correlationId }, 500, headers);
      }
      return json({ data: data ?? [], correlationId }, 200, headers);
    }

    if (action === "list_reconciliation_lines") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("SERVICING_FINANCE") || roles.has("AUDITOR"))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const batchId = safeString(params.batch_id, 40);
      if (!/^[0-9a-f-]{36}$/i.test(batchId)) return json({ error: "VALIDATION_ERROR", correlationId }, 400, headers);
      const { data, error } = await db.from("sp_financing_bank_statement_lines")
        .select("id,batch_id,line_number,transaction_date,direction,amount,external_reference,description_hash,status,matched_entity_type,matched_entity_id,matched_by,matched_at,exception_code,created_at")
        .eq("batch_id", batchId).order("line_number", { ascending: true }).limit(500);
      if (error) throw error;
      return json({ data: data ?? [], correlationId }, 200, headers);
    }

    if (action === "settle_disbursement_and_generate_schedule") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("SERVICING_FINANCE"))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const requestId = safeString(params.request_id, 40);
      const settlementRef = safeString(params.external_settlement_ref, 200);
      const firstDueDate = safeString(params.first_due_date, 10);
      if (!/^[0-9a-f-]{36}$/i.test(requestId) || settlementRef.length < 6 || !/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate) ||
          Number.isNaN(Date.parse(firstDueDate)) || new Date(firstDueDate).toISOString().slice(0,10) !== firstDueDate) {
        return json({ error: "VALIDATION_ERROR", message: "Provide a valid request UUID, settlement reference, and first due date (YYYY-MM-DD).", correlationId }, 400, headers);
      }
      const { data, error } = await db.rpc("sp_financing_settle_disbursement_and_generate_schedule", {
        p_user_id: userId, p_request_id: requestId, p_external_settlement_ref: settlementRef,
        p_first_due_date: firstDueDate, p_correlation_id: correlationId,
      });
      if (error) {
        if (/servicing_finance_required/.test(error.message)) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
        if (/disbursement_request_not_found|loan_account_not_found|contract_not_found/.test(error.message)) return json({ error: "NOT_FOUND", correlationId }, 404, headers);
        if (/disbursement_not_approved|loan_not_pending_disbursement|settlement_reference_conflict/.test(error.message)) return json({ error: "SETTLEMENT_CONFLICT", message: error.message.split("\\n")[0], correlationId }, 409, headers);
        if (/settlement_evidence_required|invalid_contract_terms/.test(error.message)) return json({ error: "VALIDATION_ERROR", correlationId }, 400, headers);
        console.error("disbursement settlement record failed", correlationId, error.code);
        return json({ error: "SETTLEMENT_RECORD_FAILED", correlationId }, 500, headers);
      }
      return json({ data, correlationId }, 200, headers);
    }

    if (action === "record_repayment") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("SERVICING_FINANCE"))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const accountId = safeString(params.loan_account_id, 40);
      const amount = Number(params.amount);
      const channel = safeString(params.channel, 60);
      const externalRef = safeString(params.external_reference, 200);
      const idempotencyKey = safeString(req.headers.get("x-idempotency-key"), 128);
      const paymentDate = safeString(params.payment_date, 40);
      if (!/^[0-9a-f-]{36}$/i.test(accountId) || !Number.isFinite(amount) || amount <= 0 || channel.length < 2 ||
          idempotencyKey.length < 8 || !paymentDate || Number.isNaN(Date.parse(paymentDate))) {
        return json({ error: "VALIDATION_ERROR", message: "Provide a valid loan account, amount, channel, payment date, and x-idempotency-key.", correlationId }, 400, headers);
      }
      const { data, error } = await db.rpc("sp_financing_record_repayment", {
        p_user_id: userId, p_loan_account_id: accountId, p_amount: amount, p_channel: channel,
        p_external_reference: externalRef, p_idempotency_key: idempotencyKey,
        p_payment_date: new Date(paymentDate).toISOString(), p_correlation_id: correlationId,
      });
      if (error) {
        if (/servicing_finance_required/.test(error.message)) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
        if (/loan_account_not_found/.test(error.message)) return json({ error: "NOT_FOUND", correlationId }, 404, headers);
        if (/idempotency_conflict/.test(error.message)) return json({ error: "IDEMPOTENCY_CONFLICT", correlationId }, 409, headers);
        if (/loan_not_active/.test(error.message)) return json({ error: "LOAN_NOT_ACTIVE", correlationId }, 409, headers);
        if (/invalid_repayment/.test(error.message)) return json({ error: "VALIDATION_ERROR", correlationId }, 400, headers);
        console.error("repayment receipt failed", correlationId, error.code);
        return json({ error: "REPAYMENT_RECORD_FAILED", correlationId }, 500, headers);
      }
      return json({ data, correlationId }, 201, headers);
    }

    if (action === "allocate_repayment") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("SERVICING_FINANCE"))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const repaymentId = safeString(params.repayment_id, 40);
      const scheduleId = safeString(params.schedule_id, 40);
      const principal = Number(params.principal_amount ?? 0);
      const interest = Number(params.interest_amount ?? 0);
      const fees = Number(params.fees_amount ?? 0);
      const idempotencyKey = safeString(req.headers.get("x-idempotency-key"), 128);
      if (!/^[0-9a-f-]{36}$/i.test(repaymentId) || !/^[0-9a-f-]{36}$/i.test(scheduleId) ||
          !Number.isFinite(principal) || !Number.isFinite(interest) || !Number.isFinite(fees) ||
          principal < 0 || interest < 0 || fees < 0 || principal + interest + fees <= 0 || idempotencyKey.length < 8) {
        return json({ error: "VALIDATION_ERROR", message: "Provide valid repayment/schedule IDs, allocation amounts and x-idempotency-key.", correlationId }, 400, headers);
      }
      const { data, error } = await db.rpc("sp_financing_allocate_repayment", {
        p_user_id: userId, p_repayment_id: repaymentId, p_schedule_id: scheduleId,
        p_principal_amount: principal, p_interest_amount: interest, p_fees_amount: fees,
        p_idempotency_key: idempotencyKey, p_correlation_id: correlationId,
      });
      if (error) {
        if (/servicing_finance_required/.test(error.message)) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
        if (/repayment_not_found|schedule_not_found/.test(error.message)) return json({ error: "NOT_FOUND", correlationId }, 404, headers);
        if (/idempotency_conflict/.test(error.message)) return json({ error: "IDEMPOTENCY_CONFLICT", correlationId }, 409, headers);
        if (/not_allocatable|loan_account_mismatch|schedule_waived|exceeds_|invalid_allocation/.test(error.message)) return json({ error: "ALLOCATION_CONFLICT", message: error.message.split("\\n")[0], correlationId }, 409, headers);
        console.error("repayment allocation failed", correlationId, error.code);
        return json({ error: "ALLOCATION_FAILED", correlationId }, 500, headers);
      }
      return json({ data, correlationId }, 201, headers);
    }

    if (action === "list_repayment_schedules") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("SERVICING_FINANCE") || roles.has("COLLECTIONS") || roles.has("AUDITOR"))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const accountId = safeString(params.loan_account_id, 40);
      let query = db.from("sp_financing_repayment_schedules")
        .select("id,loan_account_id,installment_number,due_date,principal_due,interest_due,fees_due,amount_paid,status,schedule_version,principal_opening_balance,scheduled_payment,generated_by,created_at,updated_at")
        .order("due_date", { ascending: true }).limit(Math.min(500, Math.max(1, Number(params.limit) || 100)));
      if (accountId) {
        if (!/^[0-9a-f-]{36}$/i.test(accountId)) return json({ error: "VALIDATION_ERROR", correlationId }, 400, headers);
        query = query.eq("loan_account_id", accountId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return json({ data: data ?? [], correlationId }, 200, headers);
    }

    if (action === "list_repayments") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("SERVICING_FINANCE") || roles.has("AUDITOR"))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const accountId = safeString(params.loan_account_id, 40);
      let query = db.from("sp_financing_repayments")
        .select("id,loan_account_id,amount,currency,payment_date,channel,external_reference,status,received_by,bank_reconciled,bank_reconciled_at,bank_statement_line_id,created_at")
        .order("payment_date", { ascending: false }).limit(Math.min(200, Math.max(1, Number(params.limit) || 50)));
      if (accountId) {
        if (!/^[0-9a-f-]{36}$/i.test(accountId)) return json({ error: "VALIDATION_ERROR", correlationId }, 400, headers);
        query = query.eq("loan_account_id", accountId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return json({ data: data ?? [], correlationId }, 200, headers);
    }

    if (action === "list_ledger_journals") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("SERVICING_FINANCE") || roles.has("AUDITOR"))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const { data, error } = await db.from("sp_financing_ledger_journals")
        .select("id,journal_number,source_type,source_id,currency,status,correlation_id,memo,created_by,created_at")
        .order("created_at", { ascending: false }).limit(Math.min(200, Math.max(1, Number(params.limit) || 50)));
      if (error) throw error;
      return json({ data: data ?? [], correlationId }, 200, headers);
    }

    if (action === "get_ledger_trial_balance") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("SERVICING_FINANCE") || roles.has("AUDITOR"))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const { data, error } = await db.rpc("sp_financing_get_ledger_trial_balance", { p_user_id: userId });
      if (error) {
        if (/ledger_access_required/.test(error.message)) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
        console.error("trial balance query failed", correlationId, error.code);
        return json({ error: "TRIAL_BALANCE_FAILED", correlationId }, 500, headers);
      }
      return json({ data: data ?? [], correlationId }, 200, headers);
    }

    if (action === "create_contract") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("CONTRACT_OFFICER"))) {
        return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      }
      const applicationId = safeString(params.application_id, 40);
      const expectedVersion = Number(params.expected_version);
      const termsVersion = safeString(params.terms_version, 80);
      if (!/^[0-9a-f-]{36}$/i.test(applicationId) || !Number.isInteger(expectedVersion) || expectedVersion < 1 || termsVersion.length < 2) {
        return json({ error: "VALIDATION_ERROR", correlationId }, 400, headers);
      }
      const { data, error } = await db.rpc("sp_financing_create_contract", {
        p_user_id: userId, p_application_id: applicationId, p_expected_version: expectedVersion,
        p_terms_version: termsVersion, p_correlation_id: correlationId,
      });
      if (error) {
        if (/contract_officer_required/.test(error.message)) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
        if (/application_not_found/.test(error.message)) return json({ error: "NOT_FOUND", correlationId }, 404, headers);
        if (/version_conflict|application_not_approved|contract_already_exists|product_rules_not_configured|application_outside_product_policy/.test(error.message)) return json({ error: "CONTRACT_CREATION_CONFLICT", message: error.message.split("\\n")[0], correlationId }, 409, headers);
        if (/terms_version_required/.test(error.message)) return json({ error: "VALIDATION_ERROR", correlationId }, 400, headers);
        console.error("contract creation failed", correlationId, error.code);
        return json({ error: "CONTRACT_CREATION_FAILED", correlationId }, 500, headers);
      }
      return json({ data, correlationId }, 201, headers);
    }

    if (action === "verify_contract_signature") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("COMPLIANCE"))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const contractId = safeString(params.contract_id, 40);
      const expectedVersion = Number(params.expected_application_version);
      const signatureRef = safeString(params.external_signature_ref, 200);
      if (!/^[0-9a-f-]{36}$/i.test(contractId) || !Number.isInteger(expectedVersion) || expectedVersion < 1 || signatureRef.length < 6) {
        return json({ error: "VALIDATION_ERROR", message: "Provide contract ID, current application version and a signature evidence reference.", correlationId }, 400, headers);
      }
      const { data, error } = await db.rpc("sp_financing_verify_contract_signature", {
        p_user_id: userId, p_contract_id: contractId, p_expected_application_version: expectedVersion,
        p_external_signature_ref: signatureRef, p_correlation_id: correlationId,
      });
      if (error) {
        if (/signature_verifier_required|maker_checker_violation/.test(error.message)) return json({ error: "FORBIDDEN", message: "A separate compliance verifier is required.", correlationId }, 403, headers);
        if (/contract_not_found|application_not_found/.test(error.message)) return json({ error: "NOT_FOUND", correlationId }, 404, headers);
        if (/contract_not_pending_signature|version_conflict|application_not_offered/.test(error.message)) return json({ error: "SIGNATURE_VERIFICATION_CONFLICT", correlationId }, 409, headers);
        if (/signature_evidence_required/.test(error.message)) return json({ error: "VALIDATION_ERROR", correlationId }, 400, headers);
        console.error("signature verification failed", correlationId, error.code);
        return json({ error: "SIGNATURE_VERIFICATION_FAILED", correlationId }, 500, headers);
      }
      return json({ data: { ...data, manualEvidenceVerification: true, moneyMoved: false }, correlationId }, 200, headers);
    }

    if (action === "create_disbursement_request") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("DISBURSEMENT_MAKER"))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const accountId = safeString(params.loan_account_id, 40);
      const amount = Number(params.amount);
      const beneficiaryRef = safeString(params.beneficiary_ref, 160);
      const idempotencyKey = safeString(req.headers.get("x-idempotency-key"), 128);
      if (!/^[0-9a-f-]{36}$/i.test(accountId) || !Number.isFinite(amount) || amount <= 0 ||
          beneficiaryRef.length < 3 || idempotencyKey.length < 8) {
        return json({ error: "VALIDATION_ERROR", message: "Provide a valid loan account, amount, beneficiary reference and x-idempotency-key.", correlationId }, 400, headers);
      }
      const { data, error } = await db.rpc("sp_financing_create_disbursement_request", {
        p_user_id: userId, p_loan_account_id: accountId, p_amount: amount,
        p_beneficiary_ref: beneficiaryRef, p_idempotency_key: idempotencyKey, p_correlation_id: correlationId,
      });
      if (error) {
        if (/disbursement_maker_required/.test(error.message)) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
        if (/loan_account_not_found/.test(error.message)) return json({ error: "NOT_FOUND", correlationId }, 404, headers);
        if (/idempotency_conflict|loan_not_pending_disbursement|partial_disbursement_not_supported/.test(error.message)) return json({ error: "DISBURSEMENT_REQUEST_CONFLICT", message: error.message.split("\\n")[0], correlationId }, 409, headers);
        if (/invalid_disbursement_request/.test(error.message)) return json({ error: "VALIDATION_ERROR", correlationId }, 400, headers);
        console.error("disbursement request failed", correlationId, error.code);
        return json({ error: "DISBURSEMENT_REQUEST_FAILED", correlationId }, 500, headers);
      }
      return json({ data: { ...data, moneyMoved: false }, correlationId }, 201, headers);
    }

    if (action === "approve_disbursement") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("DISBURSEMENT_CHECKER"))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const requestId = safeString(params.request_id, 40);
      if (!/^[0-9a-f-]{36}$/i.test(requestId)) return json({ error: "VALIDATION_ERROR", correlationId }, 400, headers);
      const { data, error } = await db.rpc("sp_financing_approve_disbursement", {
        p_user_id: userId, p_request_id: requestId, p_correlation_id: correlationId,
      });
      if (error) {
        if (/disbursement_checker_required|maker_checker_violation/.test(error.message)) return json({ error: "FORBIDDEN", message: "A different disbursement checker is required.", correlationId }, 403, headers);
        if (/disbursement_request_not_found/.test(error.message)) return json({ error: "NOT_FOUND", correlationId }, 404, headers);
        if (/disbursement_not_pending_approval/.test(error.message)) return json({ error: "DISBURSEMENT_APPROVAL_CONFLICT", correlationId }, 409, headers);
        console.error("disbursement approval failed", correlationId, error.code);
        return json({ error: "DISBURSEMENT_APPROVAL_FAILED", correlationId }, 500, headers);
      }
      return json({ data: { ...data, moneyMoved: false }, correlationId }, 200, headers);
    }

    if (action === "list_contracts") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("CONTRACT_OFFICER") || roles.has("COMPLIANCE") || roles.has("AUDITOR"))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const { data, error } = await db.from("sp_financing_contracts")
        .select("id,application_id,contract_number,status,principal_amount,annual_rate,tenor_months,terms_version,signed_at,created_by,created_at,updated_at")
        .order("created_at", { ascending: false }).limit(Math.min(100, Math.max(1, Number(params.limit) || 25)));
      if (error) throw error;
      return json({ data: data ?? [], correlationId }, 200, headers);
    }

    if (action === "list_loan_accounts") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("SERVICING_FINANCE") || roles.has("DISBURSEMENT_MAKER") || roles.has("DISBURSEMENT_CHECKER") || roles.has("AUDITOR"))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const { data, error } = await db.from("sp_financing_loan_accounts")
        .select("id,contract_id,account_number,principal_amount,outstanding_principal,currency,status,disbursed_at,closed_at,created_at,updated_at")
        .order("created_at", { ascending: false }).limit(Math.min(100, Math.max(1, Number(params.limit) || 25)));
      if (error) throw error;
      return json({ data: data ?? [], correlationId }, 200, headers);
    }

    if (action === "list_disbursement_requests") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("DISBURSEMENT_MAKER") || roles.has("DISBURSEMENT_CHECKER") || roles.has("AUDITOR"))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const { data, error } = await db.from("sp_financing_disbursement_requests")
        .select("id,loan_account_id,amount,status,maker_user_id,checker_user_id,idempotency_key,external_reference,bank_reconciled,bank_reconciled_at,bank_statement_line_id,created_at,updated_at")
        .order("created_at", { ascending: false }).limit(Math.min(100, Math.max(1, Number(params.limit) || 25)));
      if (error) throw error;
      return json({ data: data ?? [], correlationId }, 200, headers);
    }

    if (action === "list_partner_providers") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("COMPLIANCE") || roles.has("AUDITOR"))) {
        return json({ error: "FORBIDDEN", message: "Partner configuration access is restricted.", correlationId }, 403, headers);
      }
      const { data, error } = await db.from("sp_financing_partner_providers")
        .select("id,provider_code,provider_name,capability,environment,status,endpoint_base_url,secret_env_key,created_at,updated_at")
        .order("provider_code").order("environment");
      if (error) throw error;
      const safeData = (data ?? []).map((provider: Record<string, unknown>) => ({
        id: provider.id, provider_code: provider.provider_code, provider_name: provider.provider_name,
        capability: provider.capability, environment: provider.environment, status: provider.status,
        endpoint_configured: Boolean(provider.endpoint_base_url), secret_env_key_configured: Boolean(provider.secret_env_key),
        created_at: provider.created_at, updated_at: provider.updated_at,
      }));
      return json({ data: safeData, correlationId }, 200, headers);
    }

    if (action === "configure_partner_provider") {
      if (!roles.has("FINANCING_ADMIN")) return json({ error: "FORBIDDEN", message: "Only a financing administrator can configure partner metadata.", correlationId }, 403, headers);
      const providerCode = safeString(params.provider_code, 40);
      const providerName = safeString(params.provider_name, 120);
      const capability = safeString(params.capability, 40);
      const environment = safeString(params.environment, 20);
      const endpoint = safeString(params.endpoint_base_url, 500);
      const secretEnvKey = safeString(params.secret_env_key, 80);
      const capabilities = new Set(["IDENTITY_VERIFICATION", "CREDIT_BUREAU", "SLIK", "DOCUMENT_VERIFICATION", "VEHICLE_VALUATION"]);
      if (!/^[A-Z][A-Z0-9_]{1,39}$/.test(providerCode) || providerName.length < 2 ||
          !capabilities.has(capability) || !["SANDBOX", "PRODUCTION"].includes(environment) ||
          !endpoint.startsWith("https://") || !/^[A-Z][A-Z0-9_]{2,79}$/.test(secretEnvKey)) {
        return json({ error: "VALIDATION_ERROR", message: "Use an uppercase provider code, supported capability, SANDBOX/PRODUCTION environment, HTTPS endpoint, and secret environment-variable name (never a secret value).", correlationId }, 400, headers);
      }
      let parsedEndpoint: URL;
      try { parsedEndpoint = new URL(endpoint); } catch { return json({ error: "VALIDATION_ERROR", message: "Invalid endpoint URL.", correlationId }, 400, headers); }
      const host = parsedEndpoint.hostname.toLowerCase();
      const privateHost = host === "localhost" || host === "127.0.0.1" || host === "::1" ||
        host.endsWith(".local") || /^10\./.test(host) || /^192\.168\./.test(host) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host === "0.0.0.0";
      if (parsedEndpoint.protocol !== "https:" || parsedEndpoint.username || parsedEndpoint.password ||
          parsedEndpoint.search || parsedEndpoint.hash || privateHost) {
        return json({ error: "VALIDATION_ERROR", message: "Endpoint must be a public HTTPS base URL without credentials, query, or fragment.", correlationId }, 400, headers);
      }
      const { data, error } = await db.rpc("sp_financing_upsert_partner_provider", {
        p_user_id: userId, p_provider_code: providerCode, p_provider_name: providerName,
        p_capability: capability, p_environment: environment, p_endpoint_base_url: parsedEndpoint.toString().replace(/\/$/, ""),
        p_secret_env_key: secretEnvKey, p_correlation_id: correlationId,
      });
      if (error) {
        if (/financing_admin_required/.test(error.message)) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
        if (/invalid_partner_configuration/.test(error.message)) return json({ error: "VALIDATION_ERROR", message: error.message.split("\\n")[0], correlationId }, 400, headers);
        console.error("partner provider configuration failed", correlationId, error.code);
        return json({ error: "PARTNER_CONFIGURATION_FAILED", correlationId }, 500, headers);
      }
      return json({ data: { ...data, outboundCallsEnabled: false, note: "Registry only: no partner request is sent until a reviewed provider-specific adapter and sandbox tests are implemented." }, correlationId }, 201, headers);
    }

    if (action === "list_product_rules") {
      const { data, error } = await db.from("sp_financing_product_rules")
        .select("id,product_id,version,active,min_amount,max_amount,min_tenor_months,max_tenor_months,annual_interest_rate_pct,max_dti_pct,min_monthly_income,created_at,product:sp_financing_products(code,name)")
        .eq("active", true).order("created_at", { ascending: false });
      if (error) throw error;
      return json({ data: data ?? [], correlationId }, 200, headers);
    }

    if (action === "configure_product_rule") {
      if (!roles.has("FINANCING_ADMIN")) return json({ error: "FORBIDDEN", message: "Only a financing administrator can configure underwriting rules.", correlationId }, 403, headers);
      const productCode = safeString(params.product_code, 40);
      const minAmount = Number(params.min_amount), maxAmount = Number(params.max_amount);
      const minTenor = Number(params.min_tenor_months), maxTenor = Number(params.max_tenor_months);
      const annualRate = Number(params.annual_interest_rate_pct), maxDti = Number(params.max_dti_pct);
      const minIncome = Number(params.min_monthly_income);
      if (!PRODUCT_CODES.has(productCode) || !Number.isFinite(minAmount) || !Number.isFinite(maxAmount) ||
          !Number.isInteger(minTenor) || !Number.isInteger(maxTenor) || !Number.isFinite(annualRate) ||
          !Number.isFinite(maxDti) || !Number.isFinite(minIncome)) {
        return json({ error: "VALIDATION_ERROR", message: "Complete all product rule fields with valid numeric values.", correlationId }, 400, headers);
      }
      const { data, error } = await db.rpc("sp_financing_configure_product_rule", {
        p_user_id: userId, p_product_code: productCode, p_min_amount: minAmount, p_max_amount: maxAmount,
        p_min_tenor_months: minTenor, p_max_tenor_months: maxTenor,
        p_annual_interest_rate_pct: annualRate, p_max_dti_pct: maxDti,
        p_min_monthly_income: minIncome, p_correlation_id: correlationId,
      });
      if (error) {
        if (/financing_admin_required/.test(error.message)) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
        if (/invalid_product_rule|product_unavailable/.test(error.message)) return json({ error: "VALIDATION_ERROR", message: error.message.split("\\n")[0], correlationId }, 400, headers);
        console.error("financing product rule configuration failed", correlationId, error.code);
        return json({ error: "RULE_CONFIGURATION_FAILED", correlationId }, 500, headers);
      }
      return json({ data, correlationId }, 201, headers);
    }

    if (action === "evaluate_credit") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("CREDIT_ANALYST"))) {
        return json({ error: "FORBIDDEN", message: "Credit analyst access is required.", correlationId }, 403, headers);
      }
      const applicationId = safeString(params.application_id, 40);
      const monthlyIncome = Number(params.monthly_income);
      const obligations = Number(params.existing_monthly_obligations);
      const downPayment = Number(params.down_payment ?? 0);
      const notes = safeString(params.notes, 2000);
      if (!/^[0-9a-f-]{36}$/i.test(applicationId) || !Number.isFinite(monthlyIncome) || monthlyIncome <= 0 ||
          !Number.isFinite(obligations) || obligations < 0 || !Number.isFinite(downPayment) || downPayment < 0 ||
          notes.length > 2000) {
        return json({ error: "VALIDATION_ERROR", message: "Provide a valid application, monthly income, obligations and down payment.", correlationId }, 400, headers);
      }
      const { data: app, error: appError } = await db.from("sp_financing_applications")
        .select("id,product_id,requested_amount,requested_tenor_months,status,product:sp_financing_products(code,name)")
        .eq("id", applicationId).maybeSingle();
      if (appError) throw appError;
      if (!app) return json({ error: "NOT_FOUND", correlationId }, 404, headers);
      if (app.status !== "CREDIT_REVIEW") return json({ error: "APPLICATION_NOT_IN_CREDIT_REVIEW", correlationId }, 409, headers);
      const { data: rule, error: ruleError } = await db.from("sp_financing_product_rules")
        .select("id,version,min_amount,max_amount,min_tenor_months,max_tenor_months,annual_interest_rate_pct,max_dti_pct,min_monthly_income")
        .eq("product_id", app.product_id).eq("active", true).maybeSingle();
      if (ruleError) throw ruleError;
      if (!rule) return json({ error: "RULES_NOT_CONFIGURED", message: "An approved active product rule set is required before assessment.", correlationId }, 409, headers);
      const amount = Number(app.requested_amount);
      if (downPayment > amount) return json({ error: "VALIDATION_ERROR", message: "Down payment cannot exceed the requested amount.", correlationId }, 400, headers);
      const principal = Math.max(0, amount - downPayment);
      const monthlyRate = Number(rule.annual_interest_rate_pct) / 1200;
      const tenor = Number(app.requested_tenor_months);
      const payment = monthlyRate === 0 ? principal / tenor : principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -tenor));
      const dti = ((obligations + payment) / monthlyIncome) * 100;
      const reasons: string[] = [];
      if (amount < Number(rule.min_amount) || amount > Number(rule.max_amount)) reasons.push("AMOUNT_OUTSIDE_POLICY");
      if (tenor < Number(rule.min_tenor_months) || tenor > Number(rule.max_tenor_months)) reasons.push("TENOR_OUTSIDE_POLICY");
      if (monthlyIncome < Number(rule.min_monthly_income)) reasons.push("INCOME_BELOW_POLICY_MINIMUM");
      if (dti > Number(rule.max_dti_pct)) reasons.push("DTI_ABOVE_POLICY_LIMIT");
      const hardIneligible = reasons.includes("AMOUNT_OUTSIDE_POLICY") || reasons.includes("TENOR_OUTSIDE_POLICY");
      const outcome = hardIneligible ? "INELIGIBLE" : reasons.length ? "REFER" : "RECOMMEND_REVIEW";
      const { data, error } = await db.rpc("sp_financing_record_credit_assessment", {
        p_user_id: userId, p_application_id: applicationId, p_rule_id: rule.id,
        p_monthly_income: monthlyIncome, p_existing_monthly_obligations: obligations, p_down_payment: downPayment,
        p_estimated_monthly_payment: Number(payment.toFixed(2)), p_debt_to_income_pct: Number(dti.toFixed(3)),
        p_outcome: outcome, p_reason_codes: reasons, p_notes: notes, p_correlation_id: correlationId,
      });
      if (error) {
        if (/credit_analyst_required/.test(error.message)) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
        if (/application_not_found/.test(error.message)) return json({ error: "NOT_FOUND", correlationId }, 404, headers);
        if (/application_not_in_credit_review|product_rule_mismatch/.test(error.message)) return json({ error: "ASSESSMENT_CONFLICT", correlationId }, 409, headers);
        if (/product_rule_not_found|invalid_credit_assessment/.test(error.message)) return json({ error: "VALIDATION_ERROR", correlationId }, 400, headers);
        console.error("credit assessment failed", correlationId, error.code);
        return json({ error: "ASSESSMENT_FAILED", correlationId }, 500, headers);
      }
      return json({ data: { ...data, currency: "IDR", annualInterestRatePct: Number(rule.annual_interest_rate_pct), humanDecisionRequired: true }, correlationId }, 201, headers);
    }

    if (action === "list_credit_assessments") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("CREDIT_ANALYST") || roles.has("CREDIT_APPROVER") || roles.has("AUDITOR"))) {
        return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      }
      const applicationId = safeString(params.application_id, 40);
      let query = db.from("sp_financing_credit_assessments")
        .select("id,application_id,rule_version,assessor_user_id,monthly_income,existing_monthly_obligations,down_payment,estimated_monthly_payment,debt_to_income_pct,outcome,reason_codes,notes,created_at")
        .order("created_at", { ascending: false }).limit(Math.min(100, Math.max(1, Number(params.limit) || 25)));
      if (applicationId) {
        if (!/^[0-9a-f-]{36}$/i.test(applicationId)) return json({ error: "VALIDATION_ERROR", correlationId }, 400, headers);
        query = query.eq("application_id", applicationId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return json({ data: data ?? [], correlationId }, 200, headers);
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

    if (action === "register_application_document") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("ORIGINATION") || roles.has("VERIFICATION_ANALYST") || roles.has("CREDIT_ANALYST") || roles.has("CREDIT_APPROVER") || roles.has("SERVICING_FINANCE") || roles.has("COMPLIANCE"))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const applicationId = safeString(params.application_id, 40);
      const documentType = safeString(params.document_type, 40);
      const fileName = safeString(params.file_name, 180);
      const storagePath = safeString(params.storage_path, 500);
      const contentType = safeString(params.content_type, 120);
      const sizeBytes = Number(params.size_bytes);
      const sha = safeString(params.sha256, 64);
      const allowedTypes = ["IDENTITY","PROOF_OF_ADDRESS","INCOME_OR_BANK_STATEMENT","BUSINESS_REGISTRATION","TAX_DOCUMENT","FINANCIAL_STATEMENT","COLLATERAL","SIGNED_CONSENT","OTHER"];
      const allowedMime = ["application/pdf","image/jpeg","image/png","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
      if (!/^[0-9a-f-]{36}$/i.test(applicationId) || !allowedTypes.includes(documentType) || fileName.length < 1 ||
          !storagePath.startsWith(applicationId + "/") || !allowedMime.includes(contentType) ||
          !Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > 10485760 || (sha && !/^[a-f0-9]{64}$/i.test(sha))) {
        return json({ error: "VALIDATION_ERROR", correlationId }, 400, headers);
      }
      const { data: application, error: appError } = await db.from("sp_financing_applications").select("id").eq("id", applicationId).maybeSingle();
      if (appError) throw appError;
      if (!application) return json({ error: "NOT_FOUND", correlationId }, 404, headers);
      const { data: object, error: objectError } = await db.storage.from("financing-application-documents").createSignedUrl(storagePath, 60);
      if (objectError || !object?.signedUrl) return json({ error: "DOCUMENT_OBJECT_NOT_FOUND", correlationId }, 400, headers);
      const { data, error } = await db.from("sp_financing_application_documents").insert({
        application_id: applicationId, document_type: documentType, file_name: fileName,
        storage_path: storagePath, content_type: contentType, size_bytes: sizeBytes,
        sha256: sha || null, uploaded_by: userId,
      }).select("id,application_id,document_type,file_name,content_type,size_bytes,verification_status,created_at").single();
      if (error) {
        console.error("application document metadata registration failed", correlationId, error.code);
        return json({ error: "DOCUMENT_REGISTER_FAILED", correlationId }, 500, headers);
      }
      await db.from("sp_financing_audit_events").insert({
        actor_user_id: userId, action: "APPLICATION_DOCUMENT_UPLOADED", entity_type: "application_document",
        entity_id: data.id, correlation_id: correlationId, outcome: "SUCCESS",
        details: { application_id: applicationId, document_type: documentType, content_type: contentType, size_bytes: sizeBytes },
      });
      return json({ data, correlationId }, 201, headers);
    }

    if (action === "list_application_documents") {
      if (!Array.from(roles).some((role) => ["FINANCING_ADMIN","ORIGINATION","VERIFICATION_ANALYST","CREDIT_ANALYST","CREDIT_APPROVER","SERVICING_FINANCE","COMPLIANCE","AUDITOR"].includes(role))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const applicationId = safeString(params.application_id, 40);
      if (!/^[0-9a-f-]{36}$/i.test(applicationId)) return json({ error: "VALIDATION_ERROR", correlationId }, 400, headers);
      const { data, error } = await db.from("sp_financing_application_documents")
        .select("id,application_id,document_type,file_name,storage_path,content_type,size_bytes,sha256,verification_status,verification_note,uploaded_by,created_at,verified_by,verified_at")
        .eq("application_id", applicationId).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      const documents = await Promise.all((data ?? []).map(async (document: Record<string, unknown>) => {
        const { data: signed } = await db.storage.from("financing-application-documents").createSignedUrl(String(document.storage_path), 300);
        const { storage_path: _path, ...safeDocument } = document;
        return { ...safeDocument, download_url: signed?.signedUrl ?? null };
      }));
      return json({ data: documents, correlationId }, 200, headers);
    }

    if (action === "create_approval_workflow") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("ORIGINATION"))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const applicationId = safeString(params.application_id, 40);
      if (!/^[0-9a-f-]{36}$/i.test(applicationId)) return json({ error: "VALIDATION_ERROR", correlationId }, 400, headers);
      const { data: application, error: appError } = await db.from("sp_financing_applications").select("id,created_by").eq("id", applicationId).maybeSingle();
      if (appError) throw appError;
      if (!application) return json({ error: "NOT_FOUND", correlationId }, 404, headers);
      const { data: existing, error: existingError } = await db.from("sp_financing_approval_steps").select("id,step_order,step_code,status").eq("application_id", applicationId).order("step_order");
      if (existingError) throw existingError;
      if ((existing ?? []).length) return json({ data: existing, already_exists: true, correlationId }, 200, headers);
      const steps = [
        { application_id: applicationId, step_order: 1, step_code: "DOCUMENT_VERIFICATION", step_label: "Document verification", required_role: "VERIFICATION_ANALYST", requested_by: userId },
        { application_id: applicationId, step_order: 2, step_code: "CREDIT_REVIEW", step_label: "Credit review", required_role: "CREDIT_ANALYST", requested_by: userId },
        { application_id: applicationId, step_order: 3, step_code: "CREDIT_APPROVAL", step_label: "Credit approval", required_role: "CREDIT_APPROVER", requested_by: userId },
        { application_id: applicationId, step_order: 4, step_code: "FINANCE_CONTROL", step_label: "Finance control", required_role: "SERVICING_FINANCE", requested_by: userId },
      ];
      const { data, error } = await db.from("sp_financing_approval_steps").insert(steps).select("id,application_id,step_order,step_code,step_label,required_role,status,requested_by,created_at");
      if (error) throw error;
      await db.from("sp_financing_audit_events").insert({
        actor_user_id: userId, action: "APPROVAL_WORKFLOW_CREATED", entity_type: "application",
        entity_id: applicationId, correlation_id: correlationId, outcome: "SUCCESS",
        details: { step_count: steps.length, sequence: steps.map((step) => step.step_code) },
      });
      return json({ data, correlationId }, 201, headers);
    }

    if (action === "list_approval_workflows") {
      if (!Array.from(roles).some((role) => ["FINANCING_ADMIN","VERIFICATION_ANALYST","CREDIT_ANALYST","CREDIT_APPROVER","SERVICING_FINANCE","AUDITOR","COMPLIANCE"].includes(role))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const limit = Math.min(300, Math.max(1, Number(params.limit) || 150));
      const { data, error } = await db.from("sp_financing_approval_steps")
        .select("id,application_id,step_order,step_code,step_label,required_role,status,decision_note,requested_by,decided_by,decided_at,created_at,application:sp_financing_applications(application_number,requested_amount,status,customer:sp_financing_customers(display_name))")
        .order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return json({ data: data ?? [], correlationId }, 200, headers);
    }

    if (action === "decide_approval_step") {
      const stepId = safeString(params.step_id, 40);
      const decision = safeString(params.decision, 20);
      const note = safeString(params.note, 1000);
      if (!/^[0-9a-f-]{36}$/i.test(stepId) || !["APPROVE","REJECT"].includes(decision) || note.length < 3) return json({ error: "VALIDATION_ERROR", message: "A valid step, decision, and reason of at least 3 characters are required.", correlationId }, 400, headers);
      const { data: step, error: stepError } = await db.from("sp_financing_approval_steps").select("*").eq("id", stepId).maybeSingle();
      if (stepError) throw stepError;
      if (!step) return json({ error: "NOT_FOUND", correlationId }, 404, headers);
      if (step.status !== "PENDING") return json({ error: "APPROVAL_ALREADY_DECIDED", correlationId }, 409, headers);
      if (!roles.has("FINANCING_ADMIN") && !roles.has(step.required_role)) return json({ error: "FORBIDDEN", message: "Your role cannot decide this approval layer.", correlationId }, 403, headers);
      if (step.requested_by === userId) return json({ error: "MAKER_CHECKER_VIOLATION", message: "The person who initiated this approval workflow cannot approve its steps.", correlationId }, 403, headers);
      const { data: prior, error: priorError } = await db.from("sp_financing_approval_steps").select("status").eq("application_id", step.application_id).lt("step_order", step.step_order);
      if (priorError) throw priorError;
      if ((prior ?? []).some((item: {status:string}) => item.status !== "APPROVED")) return json({ error: "APPROVAL_SEQUENCE_BLOCKED", message: "Earlier approval layers must be approved first.", correlationId }, 409, headers);
      const now = new Date().toISOString();
      const { data, error } = await db.from("sp_financing_approval_steps").update({
        status: decision === "APPROVE" ? "APPROVED" : "REJECTED", decision_note: note, decided_by: userId, decided_at: now,
      }).eq("id", stepId).eq("status", "PENDING").select("id,application_id,step_order,step_code,step_label,required_role,status,decision_note,decided_by,decided_at").maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: "APPROVAL_ALREADY_DECIDED", correlationId }, 409, headers);
      if (decision === "REJECT") {
        await db.from("sp_financing_approval_steps").update({ status: "SKIPPED", decision_note: "Skipped after earlier layer rejected", decided_by: userId, decided_at: now })
          .eq("application_id", step.application_id).gt("step_order", step.step_order).eq("status", "PENDING");
      }
      await db.from("sp_financing_audit_events").insert({
        actor_user_id: userId, action: decision === "APPROVE" ? "APPROVAL_LAYER_APPROVED" : "APPROVAL_LAYER_REJECTED",
        entity_type: "approval_step", entity_id: stepId, correlation_id: correlationId,
        outcome: "SUCCESS", details: { application_id: step.application_id, step_code: step.step_code, note },
      });
      return json({ data, correlationId }, 200, headers);
    }

    if (action === "finance_transaction_report") {
      if (!(roles.has("FINANCING_ADMIN") || roles.has("SERVICING_FINANCE") || roles.has("AUDITOR"))) return json({ error: "FORBIDDEN", correlationId }, 403, headers);
      const startDate = safeString(params.start_date, 10);
      const endDate = safeString(params.end_date, 10);
      const validDate = (value: string) => /^\\d{4}-\\d{2}-\\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
      if (!validDate(startDate) || !validDate(endDate) || endDate < startDate) return json({ error: "VALIDATION_ERROR", message: "Provide valid start_date and end_date.", correlationId }, 400, headers);
      const span = (Date.parse(endDate + "T00:00:00Z") - Date.parse(startDate + "T00:00:00Z")) / 86400000;
      if (span > 366) return json({ error: "DATE_RANGE_TOO_LARGE", message: "Choose a report range of 367 days or less.", correlationId }, 400, headers);
      const nextDay = new Date(Date.parse(endDate + "T00:00:00Z") + 86400000).toISOString();
      const { data: journals, error } = await db.from("sp_financing_ledger_journals")
        .select("id,journal_number,source_type,source_id,currency,status,memo,created_at,entries:sp_financing_ledger_entries(debit,credit,account:sp_financing_ledger_accounts(account_code,account_name))")
        .gte("created_at", startDate + "T00:00:00.000Z").lt("created_at", nextDay)
        .order("created_at", { ascending: true }).limit(1000);
      if (error) throw error;
      const rows = (journals ?? []).map((journal: Record<string, unknown>) => {
        const entries = Array.isArray(journal.entries) ? journal.entries as Array<Record<string, unknown>> : [];
        const debit = entries.reduce((sum, entry) => sum + Number(entry.debit ?? 0), 0);
        const credit = entries.reduce((sum, entry) => sum + Number(entry.credit ?? 0), 0);
        return { id: journal.id, journal_number: journal.journal_number, source_type: journal.source_type, source_id: journal.source_id, currency: journal.currency, status: journal.status, memo: journal.memo, created_at: journal.created_at, debit, credit, entries };
      });
      return json({ data: rows, totals: { transaction_count: rows.length, debit: rows.reduce((sum, row) => sum + row.debit, 0), credit: rows.reduce((sum, row) => sum + row.credit, 0), truncated: rows.length === 1000 }, start_date: startDate, end_date: endDate, as_of: new Date().toISOString(), correlationId }, 200, headers);
    }

    return json({ error: "UNKNOWN_ACTION", correlationId }, 400, headers);
  } catch (error) {
    console.error("financing API failed", correlationId, error instanceof Error ? error.message : "unknown");
    return json({ error: "INTERNAL_ERROR", correlationId }, 500, headers);
  }
});
