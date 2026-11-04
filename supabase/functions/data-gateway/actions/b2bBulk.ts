// b2bBulk.ts — B2B bulk fleet TLO import (multifinance block business).
//
// A B2B client (e.g. a multifinance company) uploads a spreadsheet of
// financed vehicles that all need TLO cover. The browser parses the file
// and rates every row locally (services/b2bFleetRating.ts) so the review
// screen can show instant feedback, but none of that is trusted here:
// b2b_bulk_create_batch recomputes every premium from the classification
// inputs (vehicleClass/zone/commercialBody/financingValue/otr/tenor) with
// the Deno mirror of the same engine before anything is persisted. Money
// numbers never come from the client; only the categorical judgment calls
// (zone/vehicle class/commercial body — things a human can see and
// override in the review grid) do.
import type { GatewayContext, ActionResult } from './types.ts';
import { calcBulkPremium, calcBulkTotals, type VehicleClass, type Zone, type BulkPremiumResult } from '../../_shared/b2bFleetRating.ts';

const json = (body: unknown, status = 200): ActionResult => ({ status, body });
const ok = (data: unknown): ActionResult => json({ data });
const err = (message: string, status = 400): ActionResult => json({ error: message }, status);

const VEHICLE_CLASSES: VehicleClass[] = ['MOTORCYCLE', 'CAR', 'HEAVY_EQUIPMENT'];
const ZONES: Zone[] = [1, 2, 3];

interface ClientItemInput {
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

function validateItem(raw: unknown, index: number): { item: ClientItemInput; error?: string } | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: `Baris ${index + 1}: data tidak valid.` };
  const r = raw as Record<string, unknown>;
  const nasabahName = String(r.nasabahName ?? '').trim();
  if (!nasabahName) return { error: `Baris ${index + 1}: nama nasabah wajib diisi.` };
  const vehicleClass = String(r.vehicleClass ?? '') as VehicleClass;
  if (!VEHICLE_CLASSES.includes(vehicleClass)) return { error: `Baris ${index + 1}: jenis kendaraan tidak valid.` };
  const zone = Number(r.zone) as Zone;
  if (!ZONES.includes(zone)) return { error: `Baris ${index + 1}: zona tidak valid.` };
  const financingValue = Number(r.financingValue);
  if (!Number.isFinite(financingValue) || financingValue <= 0) return { error: `Baris ${index + 1}: nilai pencairan/pembiayaan tidak valid.` };
  const tenorMonths = Number(r.tenorMonths) || 12;
  const otr = Number(r.otr) || 0;

  return {
    item: {
      rowNo: Number(r.rowNo) || index + 1,
      nasabahName,
      nasabahKtp: r.nasabahKtp ? String(r.nasabahKtp) : undefined,
      nasabahPhone: r.nasabahPhone ? String(r.nasabahPhone) : undefined,
      nasabahAddress: r.nasabahAddress ? String(r.nasabahAddress) : undefined,
      contractNo: r.contractNo ? String(r.contractNo) : undefined,
      contractDate: r.contractDate ? String(r.contractDate) : undefined,
      tenorMonths,
      financingValue,
      vehicleClass,
      commercialBody: Boolean(r.commercialBody),
      make: r.make ? String(r.make) : undefined,
      model: r.model ? String(r.model) : undefined,
      modelYear: r.modelYear ? Number(r.modelYear) : undefined,
      otr,
      plateNo: r.plateNo ? String(r.plateNo) : undefined,
      chassisNo: r.chassisNo ? String(r.chassisNo) : undefined,
      engineNo: r.engineNo ? String(r.engineNo) : undefined,
      bpkbNo: r.bpkbNo ? String(r.bpkbNo) : undefined,
      regionText: r.regionText ? String(r.regionText) : undefined,
      zone,
      flags: Array.isArray(r.flags) ? r.flags.map(String) : [],
    },
  };
}

export async function handleB2BBulkAction(action: string, ctx: GatewayContext): Promise<ActionResult | null> {
  const { db, params, caller } = ctx;

  switch (action) {
    // ── Client: create a batch from reviewed rows ──────────────────────────
    case 'b2b_bulk_create_batch': {
      if (caller.role !== 'B2B_CLIENT' && !caller.isAdmin) return err('Forbidden: B2B client only', 403);
      const clientId = caller.spUser?.id;
      if (!clientId) return err('No B2B profile', 403);

      const rawItems: unknown[] = Array.isArray(params.items) ? params.items : [];
      if (rawItems.length === 0) return err('items tidak boleh kosong', 400);
      if (rawItems.length > 2000) return err('Maksimum 2000 baris per batch', 400);

      const companyName = String(params.company_name ?? caller.spUser?.company_name ?? '').trim();
      if (!companyName) return err('company_name wajib diisi', 400);
      const sourceFileName = params.source_file_name ? String(params.source_file_name).slice(0, 255) : null;

      const validated: ClientItemInput[] = [];
      for (let i = 0; i < rawItems.length; i++) {
        const v = validateItem(rawItems[i], i);
        if ('error' in v && !('item' in v)) return err(v.error, 400);
        validated.push((v as { item: ClientItemInput }).item);
      }

      // Authoritative recompute — never trust client-supplied money figures.
      const rated = validated.map(it => {
        const premium: BulkPremiumResult = calcBulkPremium({
          vehicleClass: it.vehicleClass,
          zone: it.zone,
          financingValue: it.financingValue,
          otr: it.otr ?? 0,
          tenorMonths: it.tenorMonths,
          commercialBodyHint: it.commercialBody,
        });
        return { ...it, premium };
      });

      const totals = calcBulkTotals(rated.map(r => r.premium));

      const { data: batch, error: batchErr } = await db.from('sp_b2b_batches').insert({
        client_id: clientId,
        company_name: companyName,
        source_file_name: sourceFileName,
        item_count: totals.itemCount,
        total_premium_gross: totals.totalPremiumGross,
        total_discount: totals.totalDiscount,
        total_premium_net: totals.totalPremiumNet,
        total_admin_fee: totals.totalAdminFee,
        total_amount: totals.totalAmount,
        status: 'SUBMITTED',
      }).select().single();
      if (batchErr) return err(batchErr.message, 400);

      const itemRows = rated.map(r => ({
        batch_id: batch.id,
        row_no: r.rowNo,
        nasabah_name: r.nasabahName,
        nasabah_ktp: r.nasabahKtp ?? null,
        nasabah_phone: r.nasabahPhone ?? null,
        nasabah_address: r.nasabahAddress ?? null,
        contract_no: r.contractNo ?? null,
        contract_date: r.contractDate || null,
        tenor_months: r.tenorMonths,
        financing_value: r.financingValue,
        vehicle_class: r.vehicleClass,
        make: r.make ?? null,
        model: r.model ?? null,
        model_year: r.modelYear ?? null,
        otr: r.otr ?? null,
        plate_no: r.plateNo ?? null,
        chassis_no: r.chassisNo ?? null,
        engine_no: r.engineNo ?? null,
        bpkb_no: r.bpkbNo ?? null,
        region_text: r.regionText ?? null,
        zone: r.zone,
        coverage_type: 'TLO',
        rate: r.premium.rate,
        premium_gross: r.premium.premiumGross,
        discount_rate: r.premium.discountRate,
        discount_amount: r.premium.discountAmount,
        premium_after_discount: r.premium.premiumAfterDiscount,
        admin_fee: r.premium.adminFee,
        total_premium: r.premium.totalPremium,
        flags: r.flags ?? [],
        status: 'PENDING',
      }));

      const { error: itemsErr } = await db.from('sp_b2b_batch_items').insert(itemRows);
      if (itemsErr) {
        // Roll back the header so a failed import doesn't leave an orphan batch.
        await db.from('sp_b2b_batches').delete().eq('id', batch.id);
        return err(itemsErr.message, 400);
      }

      await db.from('sp_admin_notifications').insert({
        type: 'B2B_BULK_SUBMITTED',
        title: `Impor Massal B2B Baru — ${companyName}`,
        body: `${companyName} mengajukan ${totals.itemCount} unit TLO, total Rp ${totals.totalAmount.toLocaleString('id-ID')}.`,
        metadata: { batch_id: batch.id, batch_number: batch.batch_number },
        read: false,
      }).then(() => {}, () => {});

      return ok({ batch, totals });
    }

    // ── Client/admin: list batches ──────────────────────────────────────────
    case 'b2b_bulk_list_batches': {
      let q = db.from('sp_b2b_batches').select('*').order('created_at', { ascending: false });
      if (caller.isAdmin && params.all) {
        // no filter — admin sees every batch
      } else {
        if (caller.role !== 'B2B_CLIENT' && !caller.isAdmin) return err('Forbidden', 403);
        const clientId = caller.spUser?.id;
        if (!clientId) return err('No B2B profile', 403);
        q = q.eq('client_id', clientId);
      }
      const { data, error } = await q;
      if (error) return err(error.message, 400);
      return ok(data ?? []);
    }

    // ── Client/admin: get one batch + its items ──────────────────────────────
    case 'b2b_bulk_get_batch': {
      const batchId = String(params.batch_id ?? '');
      if (!batchId) return err('batch_id required', 400);
      const { data: batch, error: batchErr } = await db.from('sp_b2b_batches').select('*').eq('id', batchId).maybeSingle();
      if (batchErr) return err(batchErr.message, 400);
      if (!batch) return err('Batch not found', 404);
      if (!caller.isAdmin && batch.client_id !== caller.spUser?.id) return err('Forbidden', 403);

      const { data: items, error: itemsErr } = await db.from('sp_b2b_batch_items').select('*').eq('batch_id', batchId).order('row_no');
      if (itemsErr) return err(itemsErr.message, 400);

      const { data: payment } = await db.from('sp_payments')
        .select('invoice_url, status, created_at')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return ok({ batch, items: items ?? [], payment: payment ?? null });
    }

    // ── Admin: issue the master policy for a PAID batch ────────────────────
    case 'admin_b2b_bulk_issue': {
      if (!caller.isAdmin) return err('Forbidden: admin only', 403);
      const batchId = String(params.batch_id ?? '');
      const policyNumber = String(params.master_policy_number ?? '').trim();
      const policyDocUrl = String(params.master_policy_document_url ?? '').trim();
      if (!batchId || !policyNumber || !policyDocUrl) {
        return err('batch_id, master_policy_number, master_policy_document_url required', 400);
      }
      let docUrl: URL;
      try { docUrl = new URL(policyDocUrl); } catch { return err('master_policy_document_url must be a valid URL', 400); }
      if (docUrl.protocol !== 'https:' || !docUrl.pathname.includes('/b2b-documents/')) {
        return err('master_policy_document_url must be an https URL inside the b2b-documents bucket', 400);
      }

      const { data: batch, error: batchErr } = await db.from('sp_b2b_batches').select('id, status').eq('id', batchId).maybeSingle();
      if (batchErr) return err(batchErr.message, 400);
      if (!batch) return err('Batch not found', 404);
      if (batch.status !== 'PAID' && batch.status !== 'ISSUED') {
        return err(`Batch belum dibayar (status: ${batch.status}). Polis hanya dapat diterbitkan untuk batch PAID.`, 409);
      }

      const ts = new Date().toISOString();
      const insurerName = params.insurer_name ? String(params.insurer_name) : null;
      const { data: updated, error: updErr } = await db.from('sp_b2b_batches').update({
        status: 'ISSUED',
        master_policy_number: policyNumber,
        master_policy_document_url: policyDocUrl,
        insurer_name: insurerName,
        issued_at: ts,
        updated_at: ts,
      }).eq('id', batchId).select().maybeSingle();
      if (updErr) return err(updErr.message, 400);

      await db.from('sp_b2b_batch_items').update({ status: 'ISSUED', policy_number: policyNumber, updated_at: ts }).eq('batch_id', batchId);

      return ok(updated);
    }

    case 'admin_b2b_bulk_list_batches': {
      if (!caller.isAdmin) return err('Forbidden: admin only', 403);
      const { data, error } = await db.from('sp_b2b_batches').select('*').order('created_at', { ascending: false });
      if (error) return err(error.message, 400);
      return ok(data ?? []);
    }

    default:
      return null;
  }
}
