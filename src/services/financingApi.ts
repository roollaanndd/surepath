import { supabase } from '../../services/supabaseService';

export type FinancingProductCode = 'MOTOR_VEHICLE' | 'MULTIPURPOSE' | 'HEAVY_EQUIPMENT' | 'WORKING_CAPITAL';

export type FinancingApplicationRecord = {
  id: string;
  application_number: string;
  requested_amount: number | string;
  currency: string;
  requested_tenor_months: number;
  status: string;
  source_channel: string;
  version: number;
  created_at: string;
  updated_at: string;
  customer?: { display_name: string; customer_type: 'INDIVIDUAL' | 'BUSINESS' } | null;
  product?: { code: FinancingProductCode; name: string } | null;
};

export type FinancingOverview = {
  totalApplications: number;
  amountRequestedIdr: number;
  byStatus: Record<string, number>;
  partial: boolean;
  asOf: string;
};

async function invokeFinancing<T>(action: string, params: Record<string, unknown> = {}, headers: Record<string, string> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('financing-api', {
    body: { action, params },
    headers: { 'x-correlation-id': crypto.randomUUID(), ...headers },
  });
  if (error) {
    // Do not expose raw provider or database errors to the UI.
    throw new Error(error.message || 'Financing service is unavailable.');
  }
  if (!data || data.error) {
    throw new Error(typeof data?.message === 'string' ? data.message : (typeof data?.error === 'string' ? data.error : 'Financing request failed.'));
  }
  return data as T;
}

export async function listFinancingApplications(limit = 100): Promise<{ data: FinancingApplicationRecord[]; total: number; limit: number; offset: number }> {
  return invokeFinancing('list_applications', { limit, offset: 0 });
}

export async function getFinancingOverview(): Promise<FinancingOverview> {
  const result = await invokeFinancing<{ data: FinancingOverview }>('overview');
  return result.data;
}

export async function createFinancingApplication(input: {
  customerName: string;
  customerType: 'INDIVIDUAL' | 'BUSINESS';
  productCode: FinancingProductCode;
  amount: number;
  tenorMonths: number;
  sourceChannel?: 'DIRECT' | 'DEALER' | 'MERCHANT' | 'PARTNER' | 'MANUAL';
  notes?: string;
}): Promise<Record<string, unknown>> {
  const idempotencyKey = crypto.randomUUID();
  const result = await invokeFinancing<{ data: Record<string, unknown> }>('create_application', {
    customer_name: input.customerName,
    customer_type: input.customerType,
    product_code: input.productCode,
    requested_amount: input.amount,
    requested_tenor_months: input.tenorMonths,
    source_channel: input.sourceChannel ?? 'DIRECT',
    notes: input.notes ?? '',
  }, { 'x-idempotency-key': idempotencyKey });
  return result.data;
}
