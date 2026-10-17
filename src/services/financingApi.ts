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
    // Read only the sanitized public error code from the Edge Function response.
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const payload = await context.clone().json() as { error?: string; message?: string };
        throw new Error(payload.error || payload.message || 'Financing service is unavailable.');
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message !== 'Unexpected end of JSON input') throw parseError;
      }
    }
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

export type FinancingRepaymentSchedule = {
  id: string;
  loan_account_id: string;
  installment_number: number;
  due_date: string;
  principal_due: number | string;
  interest_due: number | string;
  fees_due: number | string;
  amount_paid: number | string;
  status: string;
  schedule_version: number;
  principal_opening_balance: number | string;
  scheduled_payment: number | string;
  generated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FinancingLedgerJournal = {
  id: string;
  journal_number: string;
  source_type: string;
  source_id: string;
  currency: string;
  status: string;
  correlation_id: string;
  memo: string;
  created_by: string;
  created_at: string;
};

export type FinancingTrialBalanceRow = {
  account_code: string;
  account_name: string;
  account_type: string;
  total_debit: number | string;
  total_credit: number | string;
  net_debit: number | string;
};

export async function listFinancingRepaymentSchedules(limit = 100, loanAccountId?: string): Promise<{ data: FinancingRepaymentSchedule[]; correlationId?: string }> {
  return invokeFinancing('list_repayment_schedules', { limit, ...(loanAccountId ? { loan_account_id: loanAccountId } : {}) });
}

export async function listFinancingLedgerJournals(limit = 50): Promise<{ data: FinancingLedgerJournal[]; correlationId?: string }> {
  return invokeFinancing('list_ledger_journals', { limit });
}

export async function getFinancingTrialBalance(): Promise<{ data: FinancingTrialBalanceRow[]; correlationId?: string }> {
  return invokeFinancing('get_ledger_trial_balance');
}
