// B2B bulk fleet TLO import — client wrappers over the data-gateway actions
// in supabase/functions/data-gateway/actions/b2bBulk.ts, plus the dedicated
// Xendit invoice edge function for a batch. See services/b2bFleetRating.ts
// for the rating engine and services/b2bBulkParser.ts for the file reader.
import { callGateway, supabase } from './db';
import type { VehicleClass, Zone } from './b2bFleetRating';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export type B2BBatchStatus = 'DRAFT' | 'SUBMITTED' | 'INVOICED' | 'PAID' | 'ISSUED' | 'CANCELLED';
export type B2BBatchItemStatus = 'PENDING' | 'READY' | 'ISSUED';

export interface SpB2BBatch {
  id: string;
  batch_number: string;
  client_id: string;
  company_name: string;
  product_type: string;
  source_file_name: string | null;
  item_count: number;
  total_premium_gross: number;
  total_discount: number;
  total_premium_net: number;
  total_admin_fee: number;
  total_amount: number;
  status: B2BBatchStatus;
  insurer_id: string | null;
  insurer_name: string | null;
  master_policy_number: string | null;
  master_policy_document_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  issued_at: string | null;
}

export interface SpB2BBatchItem {
  id: string;
  batch_id: string;
  row_no: number;
  nasabah_name: string;
  nasabah_ktp: string | null;
  nasabah_phone: string | null;
  nasabah_address: string | null;
  contract_no: string | null;
  contract_date: string | null;
  tenor_months: number;
  financing_value: number;
  vehicle_class: VehicleClass;
  make: string | null;
  model: string | null;
  model_year: number | null;
  otr: number | null;
  plate_no: string | null;
  chassis_no: string | null;
  engine_no: string | null;
  bpkb_no: string | null;
  region_text: string | null;
  zone: Zone;
  coverage_type: string;
  rate: number;
  premium_gross: number;
  discount_rate: number;
  discount_amount: number;
  premium_after_discount: number;
  admin_fee: number;
  total_premium: number;
  flags: string[];
  status: B2BBatchItemStatus;
  policy_number: string | null;
  certificate_document_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateB2BBulkItemInput {
  rowNo: number;
  nasabahName: string;
  nasabahKtp?: string;
  nasabahPhone?: string;
  nasabahAddress?: string;
  contractNo?: string;
  contractDate?: string;
  tenorMonths: number;
  financingValue: number;
  vehicleClass: VehicleClass;
  commercialBody?: boolean;
  make?: string;
  model?: string;
  modelYear?: number;
  otr?: number;
  plateNo?: string;
  chassisNo?: string;
  engineNo?: string;
  bpkbNo?: string;
  regionText?: string;
  zone: Zone;
  flags?: string[];
}

export async function createB2BBulkBatch(input: {
  companyName: string;
  sourceFileName?: string;
  items: CreateB2BBulkItemInput[];
}): Promise<{ batch: SpB2BBatch; totals: Record<string, number> } | { error: string }> {
  const { data, error } = await callGateway('b2b_bulk_create_batch', {
    company_name: input.companyName,
    source_file_name: input.sourceFileName,
    items: input.items,
  });
  if (error) return { error };
  return data as { batch: SpB2BBatch; totals: Record<string, number> };
}

export async function getB2BBulkBatches(opts: { all?: boolean } = {}): Promise<SpB2BBatch[]> {
  const { data, error } = await callGateway('b2b_bulk_list_batches', opts.all ? { all: true } : {});
  if (error) { console.error('getB2BBulkBatches:', error); return []; }
  return (data ?? []) as SpB2BBatch[];
}

export interface B2BBulkPaymentSummary {
  invoice_url: string | null;
  status: string;
  created_at: string;
}

export async function getB2BBulkBatch(batchId: string): Promise<{ batch: SpB2BBatch; items: SpB2BBatchItem[]; payment: B2BBulkPaymentSummary | null } | null> {
  const { data, error } = await callGateway('b2b_bulk_get_batch', { batch_id: batchId });
  if (error) { console.error('getB2BBulkBatch:', error); return null; }
  return data as { batch: SpB2BBatch; items: SpB2BBatchItem[]; payment: B2BBulkPaymentSummary | null };
}

export async function adminGetAllB2BBulkBatches(): Promise<SpB2BBatch[]> {
  const { data, error } = await callGateway('admin_b2b_bulk_list_batches', {});
  if (error) { console.error('adminGetAllB2BBulkBatches:', error); return []; }
  return (data ?? []) as SpB2BBatch[];
}

export async function adminIssueB2BBulkBatch(input: {
  batchId: string;
  masterPolicyNumber: string;
  masterPolicyDocumentUrl: string;
  insurerName?: string;
}): Promise<SpB2BBatch | null> {
  const { data, error } = await callGateway('admin_b2b_bulk_issue', {
    batch_id: input.batchId,
    master_policy_number: input.masterPolicyNumber,
    master_policy_document_url: input.masterPolicyDocumentUrl,
    insurer_name: input.insurerName,
  });
  if (error) { console.error('adminIssueB2BBulkBatch:', error); return null; }
  return data as SpB2BBatch;
}

// ─── Document upload (reuses the b2b-documents bucket) ────────────────────

export async function uploadB2BBulkSourceFile(clientId: string, batchNumberHint: string, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${clientId}/bulk-source/${batchNumberHint}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('b2b-documents').upload(path, file, { upsert: true });
  if (error) { console.error('uploadB2BBulkSourceFile:', error); return null; }
  const { data } = supabase.storage.from('b2b-documents').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadB2BBulkMasterPolicy(batchId: string, file: File): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const uploaderId = session?.user?.id ?? 'admin';
  const ext = file.name.split('.').pop() ?? 'pdf';
  const path = `${uploaderId}/bulk-policies/${batchId}/master-policy-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('b2b-documents').upload(path, file, { upsert: true, contentType: file.type });
  if (error) { console.error('uploadB2BBulkMasterPolicy:', error); return null; }
  const { data } = supabase.storage.from('b2b-documents').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Payment (dedicated edge function — one invoice per batch) ─────────────

export interface XenditInvoiceResult {
  invoice_url: string;
  xendit_invoice_id: string;
  external_id: string;
  status: string;
}

export async function createB2BBulkInvoice(batchId: string): Promise<XenditInvoiceResult | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? (import.meta.env.VITE_SUPABASE_ANON_KEY as string);
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-b2b-bulk-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ batch_id: batchId }),
    });
    if (!res.ok) {
      console.error('createB2BBulkInvoice error:', await res.text());
      return null;
    }
    return (await res.json()) as XenditInvoiceResult;
  } catch (err) {
    console.error('createB2BBulkInvoice error:', err);
    return null;
  }
}
