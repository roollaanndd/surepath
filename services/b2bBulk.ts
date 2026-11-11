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
  // v2.8.6 — melempar, bukan []: pemanggil menampilkan panel Coba lagi.
  if (error) { console.error('getB2BBulkBatches:', error); throw new Error(error); }
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

// ─── B2B corporate users (admin provisioning, v2.7.56) ─────────────────────

export interface SpB2BUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  company_name: string | null;
  company_reg_no: string | null;
  company_industry: string | null;
  verified: boolean | null;
  created_at: string | null;
}

/**
 * Daftarkan pengguna B2B baru. mode 'password': admin menyetel kata sandi
 * secara manual (hanya MASTER_ADMIN; sandi ditampilkan sekali dan wajib
 * diganti saat login pertama). mode 'invite': email undangan dikirim.
 */
export async function adminCreateB2BUser(input: {
  name: string;
  email: string;
  phone: string;
  company_name: string;
  company_reg_no?: string;
  company_industry?: string;
  mode: 'password' | 'invite';
  password?: string;
}): Promise<{ data?: SpB2BUser & { id: string }; mode?: string; temp_password?: string | null; error?: string }> {
  return await callGateway('admin_create_b2b_user', input);
}

export async function adminListB2BUsers(): Promise<SpB2BUser[]> {
  const { data, error } = await callGateway('admin_list_b2b_users', {});
  if (error) { console.error('adminListB2BUsers:', error); return []; }
  return (data ?? []) as SpB2BUser[];
}

export async function adminIssueB2BBulkBatch(input: {
  batchId: string;
  masterPolicyNumber: string;
  masterPolicyPath: string;
  insurerName?: string;
}): Promise<SpB2BBatch | null> {
  const { data, error } = await callGateway('admin_b2b_bulk_issue', {
    batch_id: input.batchId,
    master_policy_number: input.masterPolicyNumber,
    master_policy_path: input.masterPolicyPath,
    insurer_name: input.insurerName,
  });
  if (error) { console.error('adminIssueB2BBulkBatch:', error); return null; }
  return data as SpB2BBatch;
}

/** Admin: assign which insurer will issue a batch's master policy. */
export async function adminAssignB2BBulkInsurer(batchId: string, insurerId: string): Promise<SpB2BBatch | null> {
  const { data, error } = await callGateway('admin_b2b_bulk_assign_insurer', { batch_id: batchId, insurer_id: insurerId });
  if (error) { console.error('adminAssignB2BBulkInsurer:', error); return null; }
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

// FIX 2026-11-05: b2b-documents is a PRIVATE bucket. The previous version of
// this function uploaded directly with the browser client (which happened to
// satisfy the bucket's owner-folder INSERT policy because the path's first
// segment was the admin's own auth.uid()) and then called getPublicUrl() —
// which returns a URL that 404s on a private bucket. Uploads it via a
// service_role-issued signed upload URL instead (admin_b2b_bulk_request_upload_url)
// and returns the storage PATH, which admin_b2b_bulk_issue now expects and
// every reader resolves to a short-lived signed URL on demand.
export async function uploadB2BBulkMasterPolicy(batchId: string, file: File): Promise<string | null> {
  const { data, error } = await callGateway('admin_b2b_bulk_request_upload_url', { batch_id: batchId, file_name: file.name });
  if (error || !data) { console.error('uploadB2BBulkMasterPolicy: request_upload_url:', error); return null; }
  const { path, token } = data as { path: string; signed_url: string; token: string };
  const { error: upErr } = await supabase.storage.from('b2b-documents').uploadToSignedUrl(path, token, file, { contentType: file.type });
  if (upErr) { console.error('uploadB2BBulkMasterPolicy: upload:', upErr); return null; }
  return path;
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

// ─── B2B fleet rate sets (admin-editable; see actions/b2bSettings.ts) ──────
// Covers only what services/b2bFleetRating.ts's calcBulkPremium() doesn't
// already get from the active sp_ojk_rate_sets row: pickup/truck rate, heavy
// equipment rate, the two discount rates, the three admin fees, and the
// minimum premium floor.

export interface SpB2BFleetRateSet {
  id: string;
  version: string;
  source_reference: string;
  effective_date: string;
  is_active: boolean;
  rates: {
    pickupTruckTloMin: Record<'1' | '2' | '3', number>;
    heavyEquipmentRate: number;
    discountRateStandard: number;
    discountRateHeavy: number;
    adminFeeMotorcycle: number;
    adminFeeCar: number;
    adminFeeHeavy: number;
    minPremiumGross: number;
  };
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function getActiveB2BFleetRateConfig(): Promise<SpB2BFleetRateSet | null> {
  const { data, error } = await callGateway('get_active_b2b_fleet_rate_config', {});
  if (error) { console.error('getActiveB2BFleetRateConfig:', error); return null; }
  return (data as SpB2BFleetRateSet | null) ?? null;
}

export async function adminListB2BFleetRateSets(): Promise<SpB2BFleetRateSet[]> {
  const { data, error } = await callGateway('admin_list_b2b_fleet_rate_sets', {});
  if (error) { console.error('adminListB2BFleetRateSets:', error); return []; }
  return (data ?? []) as SpB2BFleetRateSet[];
}

export async function adminSaveB2BFleetRateSet(input: Partial<SpB2BFleetRateSet> & { id?: string; version: string; rates: SpB2BFleetRateSet['rates'] }): Promise<SpB2BFleetRateSet | null> {
  const { data, error } = await callGateway('admin_save_b2b_fleet_rate_set', input);
  if (error) { console.error('adminSaveB2BFleetRateSet:', error); return null; }
  return data as SpB2BFleetRateSet;
}

export async function adminActivateB2BFleetRateSet(id: string): Promise<boolean> {
  const { error } = await callGateway('admin_activate_b2b_fleet_rate_set', { id });
  if (error) { console.error('adminActivateB2BFleetRateSet:', error); return false; }
  return true;
}

export async function adminDeleteB2BFleetRateSet(id: string): Promise<boolean> {
  const { error } = await callGateway('admin_delete_b2b_fleet_rate_set', { id });
  if (error) { console.error('adminDeleteB2BFleetRateSet:', error); return false; }
  return true;
}
