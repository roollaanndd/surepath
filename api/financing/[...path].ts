import { createClient } from '@supabase/supabase-js';

const DEMO_TENANT_ID = 'f1000000-0000-4000-8000-000000000001';
const VALID_STATUSES = new Set([
  'new', 'documents_pending', 'documents_verified', 'credit_review', 'approved',
  'rejected', 'offer_prepared', 'contract_pending', 'contract_signed',
  'disbursement_pending', 'active', 'withdrawn',
]);
const TRANSITIONS: Record<string, string[]> = {
  new: ['documents_pending', 'documents_verified', 'withdrawn'],
  documents_pending: ['documents_verified', 'withdrawn'],
  documents_verified: ['credit_review', 'withdrawn'],
  credit_review: ['approved', 'rejected', 'documents_pending'],
  approved: ['offer_prepared', 'withdrawn'],
  rejected: [],
  offer_prepared: ['contract_pending', 'withdrawn'],
  contract_pending: ['contract_signed', 'withdrawn'],
  contract_signed: ['disbursement_pending'],
  disbursement_pending: ['active'],
  active: [],
  withdrawn: [],
};

function send(res: any, status: number, body: Record<string, unknown>) {
  return res.status(status).json(body);
}

function getBearer(req: any): string | null {
  const header = req.headers?.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

function safeError(error: any) {
  // Avoid leaking database internals, SQL, credentials, or personal information.
  return typeof error?.message === 'string' && error.message.length < 180
    ? error.message : 'Financing Core request failed';
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST', 'PATCH'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST, PATCH, OPTIONS');
    return send(res, 405, { error: 'Method not allowed' });
  }

  const url = new URL(req.url || '/api/financing/health', 'https://surepath.invalid');
  const pathParts = Array.isArray(req.query?.path)
    ? req.query.path.map(String)
    : url.pathname.replace(/^\/api\/financing\/?/, '').split('/').filter(Boolean);
  const route = pathParts.join('/');
  if (route === 'health' && req.method === 'GET') {
    const configured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
    return send(res, configured ? 200 : 503, {
      service: 'surepath-financing-core',
      configured,
      mode: process.env.FINANCING_DEMO_MODE === 'true' ? 'sandbox' : 'authenticated',
      persistence: configured ? 'supabase' : 'not_configured',
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return send(res, 503, { error: 'Financing Core database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' });
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const demoMode = process.env.FINANCING_DEMO_MODE === 'true';
  const bearer = getBearer(req);
  let actorId: string | null = null;
  let tenantId: string | null = null;
  let role = 'demo_readonly';

  if (demoMode && !bearer) {
    tenantId = DEMO_TENANT_ID;
  } else {
    if (!bearer) return send(res, 401, { error: 'Bearer access token required' });
    const { data: authData, error: authError } = await db.auth.getUser(bearer);
    if (authError || !authData.user) return send(res, 401, { error: 'Invalid or expired access token' });
    actorId = authData.user.id;
    const metadata = authData.user.app_metadata || {};
    tenantId = typeof metadata.financing_tenant_id === 'string' ? metadata.financing_tenant_id : null;
    role = typeof metadata.financing_role === 'string' ? metadata.financing_role : 'viewer';
    if (!tenantId) return send(res, 403, { error: 'User is not assigned to a financing tenant' });
  }

  const demo = demoMode && tenantId === DEMO_TENANT_ID && !bearer;
  const canWrite = demo || ['tenant_admin', 'operations_manager', 'credit_manager', 'credit_analyst'].includes(role);
  const canDecide = demo || ['tenant_admin', 'credit_manager'].includes(role);
  const isTenantScoped = (row: any) => row && row.tenant_id === tenantId;

  async function audit(action: string, entityType: string, entityId: string, beforeState?: unknown, afterState?: unknown) {
    const { error } = await db.from('financing_audit_events').insert({
      tenant_id: tenantId, actor_id: actorId, action, entity_type: entityType, entity_id: entityId,
      request_id: String(req.headers?.['x-request-id'] || '').slice(0, 100) || null,
      before_state: beforeState ?? null, after_state: afterState ?? null,
    });
    if (error) console.error('[Financing Core] audit write failed', error.code || 'unknown');
  }

  try {
    if (route === 'products' && req.method === 'GET') {
      const { data, error } = await db.from('financing_products').select('id,code,name,category,currency,min_amount,max_amount,tenor_min_months,tenor_max_months,active,version').eq('tenant_id', tenantId).eq('active', true).order('name');
      if (error) throw error;
      return send(res, 200, { data: data || [], mode: demo ? 'sandbox' : 'authenticated' });
    }

    if (route === 'overview' && req.method === 'GET') {
      const [apps, loans, schedules, collections] = await Promise.all([
        db.from('financing_applications').select('id,status,requested_amount,submitted_at', { count: 'exact' }).eq('tenant_id', tenantId),
        db.from('financing_loan_accounts').select('id,status,outstanding_principal,principal_amount').eq('tenant_id', tenantId),
        db.from('financing_repayment_schedules').select('id,status,principal_due,interest_due,fees_due,amount_paid,due_date').eq('tenant_id', tenantId),
        db.from('financing_collection_cases').select('id,status,severity').eq('tenant_id', tenantId).neq('status', 'resolved'),
      ]);
      const failure = [apps, loans, schedules, collections].find(x => x.error);
      if (failure?.error) throw failure.error;
      const appRows = apps.data || [], loanRows = loans.data || [], scheduleRows = schedules.data || [];
      const due = scheduleRows.reduce((sum: number, x: any) => sum + Number(x.principal_due || 0) + Number(x.interest_due || 0) + Number(x.fees_due || 0), 0);
      const paid = scheduleRows.reduce((sum: number, x: any) => sum + Number(x.amount_paid || 0), 0);
      return send(res, 200, { data: {
        applications: appRows.length,
        requestedAmount: appRows.reduce((sum: number, x: any) => sum + Number(x.requested_amount || 0), 0),
        pendingCreditReview: appRows.filter((x: any) => x.status === 'credit_review').length,
        activeAccounts: loanRows.filter((x: any) => x.status === 'active').length,
        outstandingPrincipal: loanRows.reduce((sum: number, x: any) => sum + Number(x.outstanding_principal || 0), 0),
        collectionRate: due > 0 ? Math.round(Math.min(100, paid / due * 10000)) / 100 : null,
        openCollectionCases: (collections.data || []).length,
        source: 'database',
      }, mode: demo ? 'sandbox' : 'authenticated' });
    }

    if (route === 'customers' && req.method === 'GET') {
      const { data, error } = await db.from('financing_customers').select('id,customer_type,display_name,external_ref,created_at').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return send(res, 200, { data: data || [], mode: demo ? 'sandbox' : 'authenticated' });
    }

    if (route === 'applications' && req.method === 'GET') {
      const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 100)));
      let query = db.from('financing_applications').select('id,tenant_id,application_number,customer_id,product_id,requested_amount,tenor_months,purpose,status,source_channel,submitted_at,created_at,updated_at').eq('tenant_id', tenantId).order('submitted_at', { ascending: false }).limit(limit);
      const status = url.searchParams.get('status');
      if (status && VALID_STATUSES.has(status)) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      const customerIds = [...new Set((data || []).map((x: any) => x.customer_id))];
      const productIds = [...new Set((data || []).map((x: any) => x.product_id))];
      const [customers, products] = await Promise.all([
        customerIds.length ? db.from('financing_customers').select('id,display_name,customer_type').eq('tenant_id', tenantId).in('id', customerIds) : Promise.resolve({ data: [], error: null }),
        productIds.length ? db.from('financing_products').select('id,name,category').eq('tenant_id', tenantId).in('id', productIds) : Promise.resolve({ data: [], error: null }),
      ]);
      if (customers.error) throw customers.error;
      if (products.error) throw products.error;
      const customerMap = new Map((customers.data || []).map((x: any) => [x.id, x]));
      const productMap = new Map((products.data || []).map((x: any) => [x.id, x]));
      const enriched = (data || []).map((x: any) => ({
        ...x, customer: customerMap.get(x.customer_id) || null, product: productMap.get(x.product_id) || null,
      }));
      return send(res, 200, { data: enriched, mode: demo ? 'sandbox' : 'authenticated' });
    }

    if (route === 'applications' && req.method === 'POST') {
      if (!canWrite) return send(res, 403, { error: 'Insufficient financing role' });
      const body = req.body || {};
      const customerName = typeof body.customerName === 'string' ? body.customerName.trim().slice(0, 160) : '';
      const productCode = typeof body.productCode === 'string' ? body.productCode.trim().slice(0, 40) : '';
      const amount = Number(body.requestedAmount);
      const tenor = Number(body.tenorMonths);
      if (!customerName || !productCode || !Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(tenor) || tenor < 1 || tenor > 120) {
        return send(res, 400, { error: 'Valid customerName, productCode, requestedAmount and tenorMonths are required' });
      }
      const { data: product, error: productError } = await db.from('financing_products').select('id,code,name,min_amount,max_amount,tenor_min_months,tenor_max_months').eq('tenant_id', tenantId).eq('code', productCode).eq('active', true).maybeSingle();
      if (productError) throw productError;
      if (!product) return send(res, 400, { error: 'Selected financing product is unavailable' });
      if (amount < Number(product.min_amount) || amount > Number(product.max_amount) || tenor < product.tenor_min_months || tenor > product.tenor_max_months) {
        return send(res, 400, { error: 'Requested amount or tenor is outside the product configuration' });
      }
      const customerType = body.customerType === 'individual' ? 'individual' : 'business';
      const { data: customer, error: customerError } = await db.from('financing_customers').insert({
        tenant_id: tenantId, customer_type: customerType, display_name: customerName, created_by: actorId,
      }).select('id').single();
      if (customerError) throw customerError;
      const applicationNumber = 'SPF-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + cryptoRandomSuffix();
      const { data: application, error: appError } = await db.from('financing_applications').insert({
        tenant_id: tenantId, application_number: applicationNumber, customer_id: customer.id, product_id: product.id,
        requested_amount: amount, tenor_months: tenor, purpose: typeof body.purpose === 'string' ? body.purpose.slice(0, 500) : null,
        status: 'new', source_channel: 'dashboard', created_by: actorId, updated_by: actorId,
      }).select('id,application_number,customer_id,product_id,requested_amount,tenor_months,status,submitted_at').single();
      if (appError) throw appError;
      await audit('application.created', 'financing_application', application.id, null, application);
      return send(res, 201, { data: { ...application, customer: { display_name: customerName }, product: { name: product.name, code: product.code } }, mode: demo ? 'sandbox' : 'authenticated' });
    }

    const decisionMatch = route.match(/^applications\/([^/]+)\/decision$/);
    if (decisionMatch && req.method === 'POST') {
      if (!canDecide) return send(res, 403, { error: 'Credit manager role required for decisions' });
      const applicationId = decisionMatch[1];
      const body = req.body || {};
      const decision = body.decision;
      const score = body.score == null ? null : Number(body.score);
      const rationale = typeof body.rationale === 'string' ? body.rationale.trim().slice(0, 1000) : '';
      if (!['approve', 'reject', 'refer'].includes(decision) || !rationale || (score !== null && (!Number.isInteger(score) || score < 0 || score > 100))) {
        return send(res, 400, { error: 'Decision, rationale and optional score (0–100) are required' });
      }
      const { data: app, error: fetchError } = await db.from('financing_applications').select('*').eq('tenant_id', tenantId).eq('id', applicationId).maybeSingle();
      if (fetchError) throw fetchError;
      if (!app) return send(res, 404, { error: 'Application not found' });
      if (app.status !== 'credit_review') return send(res, 409, { error: 'Application must be in credit_review before a decision' });
      const nextStatus = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'documents_pending';
      const { data: updated, error: updateError } = await db.from('financing_applications').update({ status: nextStatus, updated_by: actorId, updated_at: new Date().toISOString() }).eq('tenant_id', tenantId).eq('id', applicationId).eq('status', 'credit_review').select('*').maybeSingle();
      if (updateError) throw updateError;
      if (!updated) return send(res, 409, { error: 'Application changed concurrently; refresh and retry' });
      const { error: decisionError } = await db.from('financing_credit_decisions').insert({
        tenant_id: tenantId, application_id: applicationId, decision, score, rationale,
        policy_version: String(body.policyVersion || 'pilot-v1').slice(0, 80), decided_by: actorId || DEMO_TENANT_ID,
      });
      if (decisionError) throw decisionError;
      await audit('credit.decision', 'financing_application', applicationId, { status: app.status }, { status: updated.status, decision, score });
      return send(res, 200, { data: updated, mode: demo ? 'sandbox' : 'authenticated' });
    }

    if (['contracts', 'disbursements', 'repayments', 'collections', 'audit-events'].includes(route) && req.method === 'GET') {
      const tables: Record<string, string> = {
        contracts: 'financing_contracts', disbursements: 'financing_disbursements',
        repayments: 'financing_repayments', collections: 'financing_collection_cases', 'audit-events': 'financing_audit_events',
      };
      const columns: Record<string, string> = {
        contracts: 'id,application_id,contract_number,status,principal_amount,annual_rate,tenor_months,terms_version,signed_at,created_at',
        disbursements: 'id,loan_account_id,amount,beneficiary_ref,status,maker_id,checker_id,created_at,updated_at',
        repayments: 'id,loan_account_id,amount,currency,payment_date,channel,external_reference,status,created_at',
        collections: 'id,loan_account_id,severity,status,assigned_to,promise_to_pay_date,last_contact_at,created_at,updated_at',
        'audit-events': 'id,actor_id,action,entity_type,entity_id,request_id,before_state,after_state,created_at',
      };
      const { data, error } = await db.from(tables[route]).select(columns[route]).eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return send(res, 200, { data: data || [], mode: demo ? 'sandbox' : 'authenticated' });
    }

    if (route.startsWith('applications/') && req.method === 'PATCH') {
      if (!canWrite) return send(res, 403, { error: 'Insufficient financing role' });
      const parts = route.split('/');
      if (parts.length !== 2) return send(res, 404, { error: 'Route not found' });
      const applicationId = parts[1];
      const nextStatus = String(req.body?.status || '');
      if (!VALID_STATUSES.has(nextStatus)) return send(res, 400, { error: 'Invalid application status' });
      const { data: before, error: beforeError } = await db.from('financing_applications').select('*').eq('tenant_id', tenantId).eq('id', applicationId).maybeSingle();
      if (beforeError) throw beforeError;
      if (!before) return send(res, 404, { error: 'Application not found' });
      if (!TRANSITIONS[before.status]?.includes(nextStatus)) return send(res, 409, { error: 'Invalid status transition', currentStatus: before.status, requestedStatus: nextStatus });
      if (nextStatus === 'approved' || nextStatus === 'rejected') return send(res, 409, { error: 'Use the credit decision endpoint for approval or rejection' });
      const { data: after, error: updateError } = await db.from('financing_applications').update({ status: nextStatus, updated_by: actorId, updated_at: new Date().toISOString() }).eq('tenant_id', tenantId).eq('id', applicationId).eq('status', before.status).select('*').maybeSingle();
      if (updateError) throw updateError;
      if (!after) return send(res, 409, { error: 'Application changed concurrently; refresh and retry' });
      await audit('application.status_changed', 'financing_application', applicationId, { status: before.status }, { status: after.status });
      return send(res, 200, { data: after, mode: demo ? 'sandbox' : 'authenticated' });
    }

    return send(res, 404, { error: 'Financing Core route not found' });
  } catch (error: any) {
    console.error('[Financing Core API]', error?.code || 'request_failed');
    return send(res, 500, { error: safeError(error) });
  }
}

function cryptoRandomSuffix() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
