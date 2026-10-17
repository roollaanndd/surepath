import { supabase } from '../../../services/supabaseService';

export type FinancingProduct = {
  id: string; code: string; name: string; category: string; currency: string;
  min_amount: number; max_amount: number; tenor_min_months: number; tenor_max_months: number;
};
export type FinancingApplication = {
  id: string; application_number: string; customer_id: string; product_id: string;
  requested_amount: number; tenor_months: number; purpose?: string | null; status: string;
  submitted_at: string; created_at: string; customer?: { display_name: string; customer_type?: string } | null;
  product?: { name: string; code?: string; category?: string } | null;
};
export type FinancingOverview = {
  applications: number; requestedAmount: number; pendingCreditReview: number;
  activeAccounts: number; outstandingPrincipal: number; collectionRate: number | null;
  openCollectionCases: number; source: string;
};
export type FinancingRow = Record<string, unknown> & { id: string };

let demoMode = false;

export async function financingRequest<T = any>(
  route: string,
  options: { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown; query?: Record<string, string> } = {},
): Promise<T> {
  const sessionResult = await supabase.auth.getSession().catch(() => ({ data: { session: null } } as any));
  const token = sessionResult?.data?.session?.access_token as string | undefined;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const query = options.query ? '?' + new URLSearchParams(options.query).toString() : '';
  const response = await fetch(`/api/financing/${route.replace(/^\/+/, '')}${query}`, {
    method: options.method || 'GET', headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Financing API returned HTTP ${response.status}`);
  if (route === 'health') demoMode = payload.mode === 'sandbox';
  return payload as T;
}

export const isFinancingDemoMode = () => demoMode;
