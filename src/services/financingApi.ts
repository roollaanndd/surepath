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

export type FinancingRepaymentRecord = {
  id: string;
  loan_account_id: string;
  amount: number | string;
  currency: string;
  payment_date: string;
  channel: string;
  external_reference: string | null;
  status: string;
  received_by: string | null;
  created_at: string;
};

export async function listFinancingRepayments(limit = 50, loanAccountId?: string): Promise<{ data: FinancingRepaymentRecord[]; correlationId?: string }> {
  return invokeFinancing('list_repayments', { limit, ...(loanAccountId ? { loan_account_id: loanAccountId } : {}) });
}

export async function recordFinancingRepayment(input: {
  loanAccountId: string;
  amount: number;
  channel: string;
  externalReference: string;
  paymentDate: string;
  idempotencyKey?: string;
}): Promise<Record<string, unknown>> {
  const result = await invokeFinancing<{ data: Record<string, unknown> }>('record_repayment', {
    loan_account_id: input.loanAccountId,
    amount: input.amount,
    channel: input.channel,
    external_reference: input.externalReference,
    payment_date: input.paymentDate,
  }, { 'x-idempotency-key': input.idempotencyKey ?? crypto.randomUUID() });
  return result.data;
}

export async function allocateFinancingRepayment(input: {
  repaymentId: string;
  scheduleId: string;
  principalAmount: number;
  interestAmount: number;
  feesAmount: number;
  idempotencyKey?: string;
}): Promise<Record<string, unknown>> {
  const result = await invokeFinancing<{ data: Record<string, unknown> }>('allocate_repayment', {
    repayment_id: input.repaymentId,
    schedule_id: input.scheduleId,
    principal_amount: input.principalAmount,
    interest_amount: input.interestAmount,
    fees_amount: input.feesAmount,
  }, { 'x-idempotency-key': input.idempotencyKey ?? crypto.randomUUID() });
  return result.data;
}

export type FinancingReconciliationBatch = {
  id: string;
  statement_reference: string;
  masked_bank_account: string;
  period_start: string;
  period_end: string;
  status: string;
  line_count: number;
  matched_count: number;
  exception_count: number;
  created_at: string;
};

export type FinancingStatementLine = {
  id: string;
  batch_id: string;
  line_number: number;
  transaction_date: string;
  direction: 'IN' | 'OUT';
  amount: number | string;
  external_reference: string;
  status: string;
  matched_entity_type: string | null;
  matched_entity_id: string | null;
  matched_at: string | null;
  exception_code: string | null;
};

export async function listFinancingReconciliationBatches(limit = 50): Promise<{ data: FinancingReconciliationBatch[]; correlationId?: string }> {
  return invokeFinancing('list_reconciliation_batches', { limit });
}

export async function listFinancingReconciliationLines(batchId: string): Promise<{ data: FinancingStatementLine[]; correlationId?: string }> {
  return invokeFinancing('list_reconciliation_lines', { batch_id: batchId });
}

export async function importFinancingReconciliationBatch(input: {
  statementReference: string;
  maskedBankAccount: string;
  periodStart: string;
  periodEnd: string;
  lines: Array<{ transaction_date: string; direction: 'IN' | 'OUT'; amount: number; external_reference: string; description_hash?: string }>;
}): Promise<Record<string, unknown>> {
  const result = await invokeFinancing<{ data: Record<string, unknown> }>('import_reconciliation_batch', {
    statement_reference: input.statementReference,
    masked_bank_account: input.maskedBankAccount,
    period_start: input.periodStart,
    period_end: input.periodEnd,
    lines: input.lines,
  });
  return result.data;
}

export async function reconcileFinancingStatementLine(input: {
  statementLineId: string;
  entityType: 'REPAYMENT' | 'DISBURSEMENT';
  entityId: string;
}): Promise<Record<string, unknown>> {
  const result = await invokeFinancing<{ data: Record<string, unknown> }>('reconcile_statement_line', {
    statement_line_id: input.statementLineId,
    entity_type: input.entityType,
    entity_id: input.entityId,
  });
  return result.data;
}


export type FinancingApplicationDocument = {
  id: string;
  application_id: string;
  document_type: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  created_at: string;
  download_url?: string | null;
};

export async function uploadFinancingApplicationDocument(applicationId: string, file: File, documentType: string): Promise<FinancingApplicationDocument> {
  const allowedTypes = ['application/pdf','image/jpeg','image/png','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
  if (!allowedTypes.includes(file.type)) throw new Error('Unsupported file type. Upload PDF, JPG, PNG, DOC/DOCX, or XLS/XLSX.');
  if (file.size < 1 || file.size > 10 * 1024 * 1024) throw new Error('Each document must be smaller than or equal to 10 MB.');
  if (!/^[0-9a-f-]{36}$/i.test(applicationId)) throw new Error('The application ID is invalid.');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-150) || 'document';
  const path = applicationId + '/' + crypto.randomUUID() + '-' + safeName;
  const { error: uploadError } = await supabase.storage.from('financing-application-documents').upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error('Document upload failed: ' + uploadError.message);
  let sha256: string | undefined;
  try {
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    sha256 = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  } catch { /* SHA-256 is supplemental; storage and access controls remain mandatory. */ }
  try {
    const result = await invokeFinancing<{ data: FinancingApplicationDocument }>('register_application_document', {
      application_id: applicationId, document_type: documentType, file_name: file.name.slice(0, 180),
      storage_path: path, content_type: file.type, size_bytes: file.size, sha256,
    });
    return result.data;
  } catch (error) {
    await supabase.storage.from('financing-application-documents').remove([path]);
    throw error;
  }
}

export async function listFinancingApplicationDocuments(applicationId: string): Promise<{ data: FinancingApplicationDocument[] }> {
  return invokeFinancing('list_application_documents', { application_id: applicationId });
}

export type FinancingApprovalStep = {
  id: string;
  application_id: string;
  step_order: number;
  step_code: string;
  step_label: string;
  required_role: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  decision_note?: string | null;
  decided_by?: string | null;
  decided_at?: string | null;
  created_at: string;
  application?: { application_number?: string; requested_amount?: number | string; status?: string; customer?: { display_name?: string } | null } | null;
};

export async function createFinancingApprovalWorkflow(applicationId: string): Promise<{ data: FinancingApprovalStep[] }> {
  return invokeFinancing('create_approval_workflow', { application_id: applicationId });
}

export async function listFinancingApprovalWorkflows(limit = 150): Promise<{ data: FinancingApprovalStep[] }> {
  return invokeFinancing('list_approval_workflows', { limit });
}

export async function decideFinancingApprovalStep(input: { stepId: string; decision: 'APPROVE' | 'REJECT'; note: string }): Promise<{ data: FinancingApprovalStep }> {
  return invokeFinancing('decide_approval_step', { step_id: input.stepId, decision: input.decision, note: input.note });
}

export type FinancingFinanceReportRow = {
  id: string;
  journal_number: string;
  source_type: string;
  source_id: string;
  currency: string;
  status: string;
  memo: string;
  created_at: string;
  debit: number;
  credit: number;
  entries?: Array<{ debit: number | string; credit: number | string; account?: { account_code?: string; account_name?: string } | null }>;
};

export async function getFinancingTransactionReport(startDate: string, endDate: string): Promise<{ data: FinancingFinanceReportRow[]; totals: { transaction_count: number; debit: number; credit: number; truncated: boolean }; start_date: string; end_date: string; as_of: string }> {
  return invokeFinancing('finance_transaction_report', { start_date: startDate, end_date: endDate });
}
