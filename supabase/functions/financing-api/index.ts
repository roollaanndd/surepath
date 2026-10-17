import { createClient } from 'npm:@supabase/supabase-js@2';

const DEMO_PRODUCTS = [
  { id: 'demo-motor', code: 'MOTOR_VEHICLE', name: 'Motor Vehicle Financing', category: 'Motor vehicle', min_amount: 10000000, max_amount: 2000000000, tenor_min_months: 6, tenor_max_months: 60, active: true },
  { id: 'demo-multi', code: 'MULTIPURPOSE', name: 'Multipurpose Financing', category: 'Multipurpose', min_amount: 5000000, max_amount: 500000000, tenor_min_months: 3, tenor_max_months: 48, active: true },
  { id: 'demo-heavy', code: 'HEAVY_EQUIPMENT', name: 'Heavy Equipment Financing', category: 'Heavy equipment', min_amount: 50000000, max_amount: 20000000000, tenor_min_months: 12, tenor_max_months: 60, active: true },
  { id: 'demo-working', code: 'WORKING_CAPITAL', name: 'Working Capital Financing', category: 'Working capital', min_amount: 10000000, max_amount: 10000000000, tenor_min_months: 1, tenor_max_months: 36, active: true },
];
const ALL_ROLES = ['FINANCING_ADMIN','ORIGINATION','VERIFICATION_ANALYST','CREDIT_ANALYST','CREDIT_APPROVER','CONTRACT_OFFICER','DISBURSEMENT_MAKER','DISBURSEMENT_CHECKER','SERVICING_FINANCE','COLLECTIONS','AUDITOR','COMPLIANCE'];
const TRANSITIONS: Record<string, string[]> = {
  NEW: ['SUBMITTED','CANCELLED'],
  SUBMITTED: ['DOCUMENTS_PENDING','VERIFICATION','CANCELLED'],
  DOCUMENTS_PENDING: ['VERIFICATION','CANCELLED'],
  VERIFICATION: ['CREDIT_REVIEW','REFERRED','DOCUMENTS_PENDING','CANCELLED'],
  REFERRED: ['CREDIT_REVIEW','DECLINED','CANCELLED'],
  CREDIT_REVIEW: ['APPROVED','DECLINED','REFERRED'],
  APPROVED: ['OFFERED','CANCELLED'],
  OFFERED: ['CONTRACTED','CANCELLED'],
  CONTRACTED: ['BOOKED'],
};
function response(body: unknown, status = 200, headers: Record<string,string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });
}
function fail(message: string, status = 400, headers: Record<string,string> = {}) { return response({ error: message }, status, headers); }
async function checkDemoRateLimit(db: any, identifier: string, action: string, limit: number) {
  const now = new Date();
  const hourBucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-${String(now.getUTCDate()).padStart(2,'0')}-${String(now.getUTCHours()).padStart(2,'0')}`;
  const { error: insertError } = await db.from('sp_rate_limits').insert({ identifier, action, hour_bucket: hourBucket, request_count: 1, last_request: now.toISOString() });
  if (!insertError) return true;
  const { data, error } = await db.rpc('increment_rate_limit', { p_identifier: identifier, p_action: action, p_hour_bucket: hourBucket });
  if (error) return false;
  return Number(data ?? 1) <= limit;
}
async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function roleHas(roles: string[], allowed: string[]) {
  return roles.includes('FINANCING_ADMIN') || allowed.some((role) => roles.includes(role));
}
function demoStatusLabel(status: string) { return status; }

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = /^https:\/\/(myinsurepath\.com|www\.myinsurepath\.com|[a-z0-9-]+-roollaanndds-projects\.vercel\.app)$/i.test(origin)
    ? origin : 'https://myinsurepath.com';
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { status: 204, headers });
  if (req.method === 'GET') return response({ service: 'financing-api', status: 'ok', apiVersion: 'v1', mode: 'edge-health' }, 200, headers);
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405, headers);

  const url = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  if (!url || !serviceKey || !anonKey) return response({ error: 'Financing gateway is not configured' }, 503, headers);

  let payload: any;
  try { payload = await req.json(); } catch { return response({ error: 'Invalid JSON body' }, 400, headers); }
  const action = typeof payload?.action === 'string' ? payload.action : '';
  const params = payload?.params && typeof payload.params === 'object' ? payload.params : {};
  if (!action) return response({ error: 'Action is required' }, 400, headers);

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const authorization = req.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  let actorId: string | null = null;
  let roles: string[] = [];
  if (token) {
    const authClient = createClient(url, anonKey, { global: { headers: { Authorization: 'Bearer ' + token } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await authClient.auth.getUser();
    if (!error && data.user) {
      actorId = data.user.id;
      const { data: roleRows } = await db.from('sp_financing_user_roles').select('role').eq('user_id', actorId).eq('active', true);
      roles = (roleRows || []).map((row: any) => String(row.role));
    }
  }

  const isDemo = !actorId || roles.length === 0;
  const demoAction = action.startsWith('demo_');
  if (action === 'health') {
    return response({ service: 'surepath-financing-gateway', configured: true, mode: isDemo ? 'sandbox' : 'authenticated', roles }, 200, headers);
  }
  if (isDemo !== demoAction) return response({ error: isDemo ? 'Use sandbox actions in the isolated demo workspace' : 'Sandbox endpoints cannot be used with an authenticated session' }, 403, headers);
  if (isDemo) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    if (!await checkDemoRateLimit(db, `ip:${ip}`, 'financing_demo', 30)) return response({ error: 'Sandbox rate limit exceeded; try again later' }, 429, headers);
  } else if (!roles.length) {
    return response({ error: 'This account has no active Financing Core role. Ask the financing administrator to assign one.' }, 403, headers);
  }

  const audit = async (event: string, entityId: string | null, details: Record<string, unknown> = {}) => {
    const table = isDemo ? 'sp_financing_demo_audit_events' : 'sp_financing_audit_events';
    const row = isDemo
      ? { action: event, entity_id: entityId, details }
      : { actor_user_id: actorId, action: event, entity_type: 'financing', entity_id: entityId, correlation_id: String(params.correlationId || crypto.randomUUID()).slice(0, 120), outcome: 'SUCCESS', details };
    const { error } = await db.from(table).insert(row);
    if (error) console.error('[financing-gateway] audit insert failed', error.code || 'unknown');
  };
  const getDemoApp = async (id: string) => {
    const { data, error } = await db.from('sp_financing_demo_applications').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  };

  try {
    if (action === 'demo_products') return response({ data: DEMO_PRODUCTS, mode: 'sandbox' }, 200, headers);
    if (action === 'demo_overview') {
      const { data, error } = await db.from('sp_financing_demo_applications').select('id,status,requested_amount');
      if (error) throw error;
      const rows = data || [];
      return response({ data: {
        applications: rows.length,
        requestedAmount: rows.reduce((sum: number, row: any) => sum + Number(row.requested_amount || 0), 0),
        pendingCreditReview: rows.filter((row: any) => row.status === 'CREDIT_REVIEW').length,
        activeAccounts: 0, outstandingPrincipal: 0, collectionRate: null, openCollectionCases: 0, source: 'sandbox_database',
      }, mode: 'sandbox' }, 200, headers);
    }
    if (action === 'demo_applications') {
      let query = db.from('sp_financing_demo_applications').select('*').order('created_at', { ascending: false }).limit(Math.min(100, Math.max(1, Number(params.limit || 100))));
      if (typeof params.status === 'string') query = query.eq('status', params.status.toUpperCase());
      const { data, error } = await query;
      if (error) throw error;
      const enriched = (data || []).map((row: any) => ({
        ...row, application_number: row.application_number, requested_tenor_months: row.tenor_months,
        requested_amount: row.requested_amount, customer: { display_name: row.customer_name, customer_type: row.customer_type },
        product: { name: DEMO_PRODUCTS.find((product) => product.code === row.product_code)?.name || row.product_code, code: row.product_code },
      }));
      return response({ data: enriched, mode: 'sandbox' }, 200, headers);
    }
    if (action === 'demo_customers') {
      const { data, error } = await db.from('sp_financing_demo_applications').select('id,customer_name,customer_type,created_at,application_number').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      const customers = (data || []).map((row: any) => ({ id: row.id, display_name: row.customer_name, customer_type: row.customer_type, created_at: row.created_at, external_ref: row.application_number }));
      return response({ data: customers, mode: 'sandbox' }, 200, headers);
    }
    if (action === 'demo_read_module') return response({ data: [], mode: 'sandbox' }, 200, headers);
    if (action === 'demo_create_application') {
      const customerName = String(params.customerName || params.customer_name || '').trim();
      const productCode = String(params.productCode || params.product_code || '');
      const amount = Number(params.requestedAmount ?? params.requested_amount);
      const tenor = Number(params.tenorMonths ?? params.requested_tenor_months);
      const product = DEMO_PRODUCTS.find((item) => item.code === productCode);
      if (customerName.length < 2 || customerName.length > 160) return fail('Use a fictional customer name between 2 and 160 characters.', 400, headers);
      if (!product) return fail('Choose an available financing product.', 400, headers);
      if (!Number.isFinite(amount) || amount < product.min_amount || amount > product.max_amount) return fail('Requested amount is outside the product limits.', 400, headers);
      if (!Number.isInteger(tenor) || tenor < product.tenor_min_months || tenor > product.tenor_max_months) return fail('Requested tenor is outside the product limits.', 400, headers);
      const { data, error } = await db.from('sp_financing_demo_applications').insert({
        application_number: 'SPF-DEMO-' + crypto.randomUUID().slice(0, 8).toUpperCase(),
        customer_name: customerName, customer_type: params.customerType === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'BUSINESS',
        product_code: productCode, requested_amount: amount, tenor_months: tenor,
        purpose: String(params.purpose || '').slice(0, 500),
      }).select('*').single();
      if (error) throw error;
      await audit('DEMO_APPLICATION_CREATED', data.id, { product_code: productCode, amount, tenor_months: tenor });
      return response({ data: { ...data, requested_tenor_months: data.tenor_months, customer: { display_name: data.customer_name, customer_type: data.customer_type }, product: { name: product.name, code: product.code } }, mode: 'sandbox' }, 201, headers);
    }
    if (action === 'demo_transition_application') {
      const app = await getDemoApp(String(params.id || ''));
      if (!app) return fail('Application not found.', 404, headers);
      const target = String(params.targetStatus || params.target_status || '');
      if (!TRANSITIONS[app.status]?.includes(target)) return fail('Invalid application status transition.', 409, headers);
      if (app.version !== Number(params.expectedVersion ?? params.expected_version)) return fail('Application changed; refresh and retry.', 409, headers);
      const { data, error } = await db.from('sp_financing_demo_applications').update({ status: target, version: app.version + 1, updated_at: new Date().toISOString() }).eq('id', app.id).eq('version', app.version).select('*').maybeSingle();
      if (error) throw error;
      if (!data) return fail('Application changed; refresh and retry.', 409);
      await audit('DEMO_APPLICATION_STATUS_CHANGED', app.id, { from: app.status, to: target, reason: String(params.reason || '').slice(0, 1000) });
      return response({ data, mode: 'sandbox' }, 200, headers);
    }
    if (action === 'demo_decide_application') {
      const app = await getDemoApp(String(params.id || ''));
      if (!app) return fail('Application not found.', 404, headers);
      if (app.status !== 'CREDIT_REVIEW') return fail('Application must be in credit review first.', 409, headers);
      const decision = String(params.decision || '');
      if (!['APPROVED','DECLINED','REFERRED'].includes(decision)) return fail('Invalid decision.', 400, headers);
      const score = params.score == null ? null : Number(params.score);
      if (score !== null && (!Number.isInteger(score) || score < 0 || score > 100)) return fail('Score must be between 0 and 100.', 400, headers);
      const rationale = String(params.rationale || '').trim();
      if (rationale.length < 3 || rationale.length > 1000) return fail('A decision rationale is required.', 400, headers);
      const { data, error } = await db.from('sp_financing_demo_applications').update({
        status: decision, credit_score: score, decision_rationale: rationale, version: app.version + 1, updated_at: new Date().toISOString(),
      }).eq('id', app.id).eq('version', app.version).select('*').maybeSingle();
      if (error) throw error;
      if (!data) return fail('Application changed; refresh and retry.', 409);
      await audit('DEMO_CREDIT_DECISION', app.id, { decision, score, rationale });
      return response({ data, mode: 'sandbox' }, 200, headers);
    }

    // From this point on, only authenticated users with explicit financing roles are allowed.
    const canRead = roleHas(roles, ALL_ROLES);
    if (!canRead) return response({ error: 'Financing Core role required' }, 403, headers);
    if (action === 'products' || action === 'list_products') {
      const { data, error } = await db.from('sp_financing_products').select('id,code,name,description,active').eq('active', true).order('name');
      if (error) throw error;
      const policies = DEMO_PRODUCTS;
      const enriched = (data || []).map((row: any) => ({ ...(policies.find((item) => item.code === row.code) || {}), ...row }));
      return response({ data: enriched, mode: 'authenticated' }, 200, headers);
    }
    if (action === 'overview') {
      const [apps, loans, schedules, collections] = await Promise.all([
        db.from('sp_financing_applications').select('id,status,requested_amount'),
        db.from('sp_financing_loan_accounts').select('id,status,outstanding_principal'),
        db.from('sp_financing_repayment_schedules').select('principal_due,interest_due,fees_due,amount_paid'),
        db.from('sp_financing_collection_cases').select('id,status').neq('status','RESOLVED'),
      ]);
      const error = [apps, loans, schedules, collections].find((item: any) => item.error)?.error;
      if (error) throw error;
      const appRows = apps.data || [], loanRows = loans.data || [], scheduleRows = schedules.data || [];
      const due = scheduleRows.reduce((sum: number, row: any) => sum + Number(row.principal_due || 0) + Number(row.interest_due || 0) + Number(row.fees_due || 0), 0);
      const paid = scheduleRows.reduce((sum: number, row: any) => sum + Number(row.amount_paid || 0), 0);
      return response({ data: {
        applications: appRows.length,
        requestedAmount: appRows.reduce((sum: number, row: any) => sum + Number(row.requested_amount || 0), 0),
        pendingCreditReview: appRows.filter((row: any) => row.status === 'CREDIT_REVIEW').length,
        activeAccounts: loanRows.filter((row: any) => row.status === 'ACTIVE').length,
        outstandingPrincipal: loanRows.reduce((sum: number, row: any) => sum + Number(row.outstanding_principal || 0), 0),
        collectionRate: due > 0 ? Math.round(Math.min(100, paid / due * 10000)) / 100 : null,
        openCollectionCases: (collections.data || []).length, source: 'database',
      }, mode: 'authenticated' }, 200, headers);
    }
    if (action === 'applications' || action === 'list_applications') {
      let query = db.from('sp_financing_applications').select('id,application_number,customer_id,product_id,requested_amount,currency,requested_tenor_months,status,source_channel,notes,version,created_at,updated_at,customer:sp_financing_customers(display_name,customer_type),product:sp_financing_products(name,code)').order('created_at', { ascending: false }).limit(Math.min(100, Math.max(1, Number(params.limit || 100))));
      if (typeof params.status === 'string') query = query.eq('status', params.status.toUpperCase());
      const { data, error } = await query;
      if (error) throw error;
      return response({ data: data || [], mode: 'authenticated' }, 200, headers);
    }
    if (action === 'customers') {
      const { data, error } = await db.from('sp_financing_customers').select('id,display_name,customer_type,created_at').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return response({ data: data || [], mode: 'authenticated' }, 200, headers);
    }
    if (action === 'create_application') {
      if (!roleHas(roles, ['ORIGINATION'])) return response({ error: 'Origination role required' }, 403, headers);
      const customerName = String(params.customerName || params.customer_name || '').trim();
      const productCode = String(params.productCode || params.product_code || '');
      const amount = Number(params.requestedAmount ?? params.requested_amount);
      const tenor = Number(params.tenorMonths ?? params.requested_tenor_months);
      if (customerName.length < 2 || customerName.length > 160) return fail('Customer name must be 2–160 characters.', 400, headers);
      const productPolicy = DEMO_PRODUCTS.find((product) => product.code === productCode);
      if (!productPolicy) return fail('Invalid product code.', 400, headers);
      if (!Number.isFinite(amount) || amount < productPolicy.min_amount || amount > productPolicy.max_amount) return fail('Requested amount is outside the product limits.', 400, headers);
      if (!Number.isInteger(tenor) || tenor < productPolicy.tenor_min_months || tenor > productPolicy.tenor_max_months) return fail('Requested tenor is outside the product limits.', 400, headers);
      const idempotencyKey = String(params.idempotencyKey || params.idempotency_key || crypto.randomUUID());
      const requestHash = await sha256(JSON.stringify({ customerName, productCode, amount, tenor, customerType: params.customerType || params.customer_type || 'BUSINESS', purpose: params.purpose || params.notes || '' }));
      const { data, error } = await db.rpc('sp_financing_create_application', {
        p_user_id: actorId, p_customer_type: (params.customerType || params.customer_type) === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'BUSINESS',
        p_customer_name: customerName, p_product_code: productCode, p_amount: amount, p_tenor_months: tenor,
        p_source_channel: ['DIRECT','DEALER','MERCHANT','PARTNER','MANUAL'].includes(String(params.sourceChannel || params.source_channel)) ? (params.sourceChannel || params.source_channel) : 'MANUAL',
        p_notes: String(params.purpose || params.notes || '').slice(0, 2000), p_idempotency_key: idempotencyKey, p_request_hash: requestHash,
      });
      if (error) throw error;
      return response({ data, mode: 'authenticated' }, 201, headers);
    }
    if (action === 'transition_application') {
      const target = String(params.targetStatus || '');
      const roleByTarget: Record<string, string[]> = {
        SUBMITTED: ['ORIGINATION'], DOCUMENTS_PENDING: ['ORIGINATION','VERIFICATION_ANALYST'],
        VERIFICATION: ['VERIFICATION_ANALYST'], CREDIT_REVIEW: ['VERIFICATION_ANALYST'],
        REFERRED: ['CREDIT_ANALYST','CREDIT_APPROVER'], CANCELLED: ['ORIGINATION'],
        OFFERED: ['CREDIT_APPROVER'], CONTRACTED: ['CONTRACT_OFFICER'], BOOKED: ['CONTRACT_OFFICER'],
      };
      if (!roleByTarget[target] || !roleHas(roles, roleByTarget[target])) return response({ error: 'Role is not permitted to make this transition' }, 403, headers);
      const { data, error } = await db.rpc('sp_financing_transition_application', {
        p_user_id: actorId, p_application_id: String(params.id || params.application_id || ''), p_expected_version: Number(params.expectedVersion ?? params.expected_version),
        p_target_status: target, p_reason: String(params.reason || '').slice(0, 1000), p_correlation_id: String(params.correlationId || params.correlation_id || crypto.randomUUID()),
      });
      if (error) throw error;
      return response({ data, mode: 'authenticated' }, 200, headers);
    }
    if (action === 'record_credit_decision') {
      if (!roleHas(roles, ['CREDIT_APPROVER'])) return response({ error: 'Credit approver role required' }, 403, headers);
      const decisionMap: Record<string, string> = { approve: 'APPROVED', reject: 'DECLINED', refer: 'REFERRED' };
      const decision = decisionMap[String(params.decision || '').toLowerCase()];
      if (!decision) return fail('Invalid credit decision.', 400, headers);
      const { data, error } = await db.rpc('sp_financing_record_credit_decision', {
        p_user_id: actorId, p_application_id: String(params.id || params.application_id || ''), p_expected_version: Number(params.expectedVersion ?? params.expected_version),
        p_decision: decision, p_score: params.score == null ? null : Number(params.score),
        p_rationale: String(params.rationale || '').trim(), p_policy_version: String(params.policyVersion || 'pilot-v1'),
        p_correlation_id: String(params.correlationId || crypto.randomUUID()),
      });
      if (error) throw error;
      return response({ data, mode: 'authenticated' }, 200, headers);
    }

    const readTables: Record<string, { table: string; columns: string; roles?: string[] }> = {
      contracts: { table: 'sp_financing_contracts', columns: 'id,application_id,contract_number,status,principal_amount,annual_rate,tenor_months,terms_version,signed_at,created_at' },
      disbursements: { table: 'sp_financing_disbursement_requests', columns: 'id,loan_account_id,amount,beneficiary_ref,status,maker_user_id,checker_user_id,created_at,updated_at', roles: ['DISBURSEMENT_MAKER','DISBURSEMENT_CHECKER','SERVICING_FINANCE'] },
      repayments: { table: 'sp_financing_repayments', columns: 'id,loan_account_id,amount,currency,payment_date,channel,external_reference,status,created_at', roles: ['SERVICING_FINANCE','COLLECTIONS'] },
      collections: { table: 'sp_financing_collection_cases', columns: 'id,loan_account_id,severity,status,assigned_to,promise_to_pay_date,last_contact_at,created_at,updated_at', roles: ['COLLECTIONS','SERVICING_FINANCE'] },
      'audit-events': { table: 'sp_financing_audit_events', columns: 'id,actor_user_id,action,entity_type,entity_id,correlation_id,outcome,details,created_at', roles: ['AUDITOR','COMPLIANCE'] },
    };
    if (readTables[action]) {
      if (readTables[action].roles && !roleHas(roles, readTables[action].roles as string[])) return response({ error: 'Role not permitted to read this module' }, 403, headers);
      const { data, error } = await db.from(readTables[action].table).select(readTables[action].columns).order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return response({ data: data || [], mode: 'authenticated' }, 200, headers);
    }
    return response({ error: 'Unknown financing action' }, 404, headers);
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message.slice(0, 220) : 'Financing gateway request failed';
    console.error('[financing-gateway]', error?.code || 'request_failed');
    const status = /role|actor_required/i.test(message) ? 403 : /not_found/i.test(message) ? 404 : /version_conflict|invalid_state_transition|not_in_credit_review|idempotency_conflict/i.test(message) ? 409 : 400;
    return response({ error: message }, status, headers);
  }
});
