import { supabase } from '../../../services/supabaseService';

export type FinancingProduct = {
  id: string; code: string; name: string; description?: string; category?: string; currency?: string;
  min_amount: number; max_amount: number; tenor_min_months: number; tenor_max_months: number; active?: boolean;
};
export type FinancingApplication = {
  id: string; application_number: string; customer_id?: string; product_id?: string;
  requested_amount: number; requested_tenor_months: number; tenor_months?: number;
  purpose?: string | null; status: string; version: number;
  submitted_at?: string; created_at: string; updated_at?: string;
  customer?: { display_name: string; customer_type?: string } | null;
  product?: { name: string; code?: string; category?: string } | null;
};
export type FinancingOverview = {
  applications: number; requestedAmount: number; pendingCreditReview: number;
  activeAccounts: number; outstandingPrincipal: number; collectionRate: number | null;
  openCollectionCases: number; source: string;
};
export type FinancingRow = Record<string, unknown> & { id: string };

let demoMode = false;
const statusToApi: Record<string, string> = {
  new: 'NEW', submitted: 'SUBMITTED', documents_pending: 'DOCUMENTS_PENDING',
  documents_verified: 'VERIFICATION', verification: 'VERIFICATION', credit_review: 'CREDIT_REVIEW', referred: 'REFERRED',
  approved: 'APPROVED', rejected: 'DECLINED', declined: 'DECLINED',
  offer_prepared: 'OFFERED', offered: 'OFFERED', contract_pending: 'CONTRACTED',
  contract_signed: 'CONTRACTED', contracted: 'CONTRACTED', active: 'BOOKED',
  booked: 'BOOKED', withdrawn: 'CANCELLED', cancelled: 'CANCELLED',
};

export async function financingRequest<T = any>(
  route: string,
  options: { method?: 'GET' | 'POST' | 'PATCH'; body?: any; query?: Record<string, string> } = {},
): Promise<T> {
  const sessionResult = await supabase.auth.getSession().catch(() => ({ data: { session: null } } as any));
  const token = sessionResult?.data?.session?.access_token as string | undefined;
  const isDemo = !token;
  const method = options.method || 'GET';
  const parts = route.replace(/^\/+/, '').split('/').filter(Boolean);
  let action = parts[0] || 'health';
  const params: Record<string, any> = { ...(options.query || {}) };
  if (typeof params.status === 'string') params.status = statusToApi[params.status.toLowerCase()] || params.status.toUpperCase();

  if (action === 'health') {
    action = 'health';
  } else if (action === 'overview' || action === 'products' || action === 'customers' ||
             action === 'contracts' || action === 'disbursements' || action === 'repayments' ||
             action === 'collections' || action === 'audit-events') {
    if (action === 'audit-events') action = 'audit-events';
  } else if (action === 'applications' && method === 'POST') {
    action = 'create_application';
    Object.assign(params, options.body || {});
    params.idempotencyKey = params.idempotencyKey || crypto.randomUUID();
  } else if (action === 'applications' && parts.length >= 3 && parts[2] === 'decision' && method === 'POST') {
    action = 'record_credit_decision';
    params.id = parts[1];
    Object.assign(params, options.body || {});
  } else if (action === 'applications' && parts.length === 2 && method === 'PATCH') {
    action = 'transition_application';
    params.id = parts[1];
    Object.assign(params, options.body || {});
    params.targetStatus = statusToApi[String(params.status || '').toLowerCase()] || String(params.status || '').toUpperCase();
    params.reason = params.reason || 'Updated from Financing Core workspace';
    params.correlationId = params.correlationId || crypto.randomUUID();
    delete params.status;
  } else if (action === 'applications') {
    action = 'applications';
  }

  if (isDemo && action !== 'health') action = 'demo_' + (action === 'audit-events' ? 'read_module' : action);
  if (isDemo && ['demo_contracts','demo_disbursements','demo_repayments','demo_collections'].includes(action)) {
    params.module = action.slice(5);
    action = 'demo_read_module';
  }
  if (isDemo && action === 'demo_audit-events') action = 'demo_read_module';
  if (isDemo && action === 'demo_transition_application') {
    params.targetStatus = statusToApi[String(params.status || params.targetStatus || '').toLowerCase()] || String(params.targetStatus || params.status || '').toUpperCase();
    params.expectedVersion = Number(params.expectedVersion || 1);
    params.reason = params.reason || 'Sandbox workflow transition';
    delete params.status;
  }
  if (isDemo && action === 'demo_record_credit_decision') action = 'demo_decide_application';
  if (isDemo && action === 'demo_decide_application') {
    const decisions: Record<string, string> = { approve: 'APPROVED', reject: 'DECLINED', refer: 'REFERRED' };
    params.decision = decisions[String(params.decision || '').toLowerCase()] || String(params.decision || '').toUpperCase();
  }

  // Production and sandbox use the same UX but separate server-side actions and tables.
  if (isDemo && action === 'demo_create_application') {
    params.customerType = params.customerType === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'BUSINESS';
  }
  if (action === 'record_credit_decision' || action === 'demo_decide_application') {
    params.expectedVersion = Number(params.expectedVersion || 1);
  }

  const { data, error } = await supabase.functions.invoke('financing-gateway', { body: { action, params } });
  if (error) {
    let message = error.message || 'Financing gateway request failed';
    try {
      const context = (error as any).context;
      const body = context && typeof context.json === 'function' ? await context.json() : null;
      if (body?.error) message = body.error;
    } catch { /* keep safe generic error */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(String(data.error));
  if (route === 'health') demoMode = data?.mode === 'sandbox';
  return data as T;
}

export const isFinancingDemoMode = () => demoMode;
