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
import {
  calcBulkPremium, calcBulkTotals, isValidIsoDate, addMonthsToIsoDate,
  MULTI_YEAR_DEPRECIATION_RATE, MULTI_YEAR_MAX_TENOR_MONTHS,
  type VehicleClass, type Zone, type BulkPremiumResult, type FleetCoverage,
} from '../../_shared/b2bFleetRating.ts';
import { loadActiveBulkRateConfig } from './b2bSettings.ts';

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
  // Order unit (v2.8.23) — semuanya opsional; baris impor massal tidak
  // mengirimnya dan diperlakukan persis seperti sebelumnya.
  coverageStartDate?: string;      // "YYYY-MM-DD", tanggal efektif pertanggungan
  multiYearDepreciation?: boolean; // true → TSI menyusut 10%/tahun (rate dari server)
  discountRate?: number;           // diskon pilihan klien; dijepit ke diskon rate set
  discountShownOnPolicy?: boolean; // diskon dicetak di polis atau tidak
  coverage?: FleetCoverage;        // v2.8.24 — 'COMPREHENSIVE' hanya mobil & motor; bawaan TLO
}

// Tanggal efektif boleh hari ini s/d 60 hari ke depan. Sehari kelonggaran di
// kedua ujung karena "hari ini" klien (WIB/WITA/WIT) bisa sudah lewat tengah
// malam sementara server masih di tanggal UTC sebelumnya.
const COVERAGE_START_MAX_DAYS_AHEAD = 60;
function coverageStartError(iso: string): string | null {
  if (!isValidIsoDate(iso)) return 'tanggal efektif tidak valid (format YYYY-MM-DD).';
  const dayMs = 86_400_000;
  const todayUtc = Math.floor(Date.now() / dayMs) * dayMs;
  const start = Date.parse(`${iso}T00:00:00Z`);
  if (start < todayUtc - dayMs) return 'tanggal efektif tidak boleh di masa lalu.';
  if (start > todayUtc + (COVERAGE_START_MAX_DAYS_AHEAD + 1) * dayMs) {
    return `tanggal efektif paling jauh ${COVERAGE_START_MAX_DAYS_AHEAD} hari dari hari ini.`;
  }
  return null;
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

  const coverageStartDate = r.coverageStartDate ? String(r.coverageStartDate).trim() : undefined;
  if (coverageStartDate) {
    const dateErr = coverageStartError(coverageStartDate);
    if (dateErr) return { error: `Baris ${index + 1}: ${dateErr}` };
  }
  const multiYearDepreciation = r.multiYearDepreciation === true;
  if (multiYearDepreciation && tenorMonths > MULTI_YEAR_MAX_TENOR_MONTHS) {
    return { error: `Baris ${index + 1}: jangka waktu maksimum ${MULTI_YEAR_MAX_TENOR_MONTHS / 12} tahun.` };
  }
  const coverageRaw = String(r.coverage ?? 'TLO').toUpperCase();
  if (coverageRaw !== 'TLO' && coverageRaw !== 'COMPREHENSIVE') {
    return { error: `Baris ${index + 1}: jenis pertanggungan tidak valid.` };
  }
  if (coverageRaw === 'COMPREHENSIVE' && vehicleClass === 'HEAVY_EQUIPMENT') {
    return { error: `Baris ${index + 1}: alat berat hanya tersedia dengan pertanggungan TLO.` };
  }
  let discountRate: number | undefined;
  if (r.discountRate !== undefined && r.discountRate !== null && r.discountRate !== '') {
    discountRate = Number(r.discountRate);
    if (!Number.isFinite(discountRate) || discountRate < 0 || discountRate > 1) {
      return { error: `Baris ${index + 1}: diskon tidak valid.` };
    }
  }

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
      coverageStartDate,
      multiYearDepreciation,
      discountRate,
      // Tanpa pilihan eksplisit, diskon tetap tertera — sama seperti semua
      // batch sebelum v2.8.23.
      discountShownOnPolicy: r.discountShownOnPolicy === undefined ? true : r.discountShownOnPolicy === true,
      coverage: coverageRaw as FleetCoverage,
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
      // Loads whatever admin-edited rate set is currently active (or leaves
      // the built-in defaults if none is) before pricing a single row.
      await loadActiveBulkRateConfig(db);
      const rated = validated.map(it => {
        const premium: BulkPremiumResult = calcBulkPremium({
          vehicleClass: it.vehicleClass,
          zone: it.zone,
          financingValue: it.financingValue,
          otr: it.otr ?? 0,
          tenorMonths: it.tenorMonths,
          commercialBodyHint: it.commercialBody,
          // Klien hanya memilih YA/TIDAK; besar penyusutan ditentukan server.
          depreciationRate: it.multiYearDepreciation ? MULTI_YEAR_DEPRECIATION_RATE : 0,
          // calcBulkPremium menjepit ini ke 0..diskon rate set aktif.
          discountRateOverride: it.discountRate,
          coverage: it.coverage,
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
        coverage_type: r.premium.coverage,
        rate: r.premium.rate,
        premium_gross: r.premium.premiumGross,
        discount_rate: r.premium.discountRate,
        discount_amount: r.premium.discountAmount,
        premium_after_discount: r.premium.premiumAfterDiscount,
        admin_fee: r.premium.adminFee,
        total_premium: r.premium.totalPremium,
        flags: r.flags ?? [],
        status: 'PENDING',
        coverage_start_date: r.coverageStartDate ?? null,
        coverage_end_date: r.coverageStartDate ? addMonthsToIsoDate(r.coverageStartDate, r.tenorMonths) : null,
        depreciation_rate: r.premium.depreciationRate,
        premium_schedule: r.premium.schedule,
        discount_shown_on_policy: r.discountShownOnPolicy ?? true,
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
        body: `${companyName} mengajukan ${totals.itemCount} unit${rated.every(r => r.premium.coverage === 'TLO') ? ' TLO' : ''}, total Rp ${totals.totalAmount.toLocaleString('id-ID')}.`,
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

      // master_policy_document_url holds a storage PATH (private bucket) —
      // resolve it to a short-lived signed URL here so the client/admin UI
      // has something that actually downloads. Legacy rows that still hold
      // an old public-URL-shaped value (issued before the 2026-11-05 fix)
      // are left as-is; they simply won't resolve to a live document.
      let masterPolicySignedUrl: string | null = null;
      if (batch.master_policy_document_url && !batch.master_policy_document_url.startsWith('http')) {
        const { data: signed } = await db.storage.from('b2b-documents').createSignedUrl(batch.master_policy_document_url, 300);
        masterPolicySignedUrl = signed?.signedUrl ?? null;
      }

      return ok({ batch: { ...batch, master_policy_signed_url: masterPolicySignedUrl }, items: items ?? [], payment: payment ?? null });
    }

    // ── Client: decide an insurer quote ─────────────────────────────────────
    // FIX v2.8.20 (audit 2026-11-11): keputusan penawaran sebelumnya ditulis
    // langsung dari peramban (update satu kolom tanpa verifikasi apa pun) —
    // tidak ada notifikasi ke admin, status pengajuan induk tidak ikut
    // berubah, dan keandalan transisinya bergantung sepenuhnya pada RLS.
    // Kini satu aksi gateway: hanya pemilik penawaran (B2B_CLIENT) yang boleh
    // memutuskan (MASTER_ADMIN mode pantau sengaja ditolak — sama seperti UI),
    // hanya PENDING yang boleh diputus (keputusan kedua ditolak), status
    // pengajuan disinkronkan, dan admin diberi notifikasi.
    case 'b2b_decide_quote': {
      if (caller.role !== 'B2B_CLIENT') return err('Forbidden: keputusan penawaran hanya untuk klien korporat pemiliknya', 403);
      const clientId = caller.spUser?.id;
      if (!clientId) return err('No B2B profile', 403);
      const quoteId = String(params.quote_id ?? '');
      const decision = String(params.decision ?? '').toUpperCase();
      if (!quoteId) return err('quote_id required', 400);
      if (decision !== 'ACCEPTED' && decision !== 'REJECTED') return err('decision harus ACCEPTED atau REJECTED', 400);

      const { data: quote, error: qErr } = await db.from('sp_b2b_quotes')
        .select('id, submission_id, client_id, insurer_name, premium_amount, status')
        .eq('id', quoteId).maybeSingle();
      if (qErr) return err(qErr.message, 400);
      if (!quote) return err('Penawaran tidak ditemukan', 404);
      if (quote.client_id !== clientId) return err('Forbidden: bukan penawaran Anda', 403);
      if (quote.status !== 'PENDING') return err(`Penawaran sudah diputuskan sebelumnya (status: ${quote.status})`, 409);

      const ts = new Date().toISOString();
      const { data: updatedQuote, error: updErr } = await db.from('sp_b2b_quotes')
        .update({ status: decision, updated_at: ts })
        .eq('id', quoteId).eq('status', 'PENDING')
        .select().maybeSingle();
      if (updErr) return err(updErr.message, 400);
      if (!updatedQuote) return err('Penawaran sudah diputuskan sebelumnya', 409);

      // Sinkronkan pipeline pengajuan induk — tanpa ini pengajuan selamanya
      // tampak QUOTED walaupun klien sudah setuju atau menolak.
      const { data: submission } = await db.from('sp_b2b_submissions')
        .update({ status: decision, updated_at: ts })
        .eq('id', quote.submission_id)
        .select('id, company_name, status').maybeSingle();

      await db.from('sp_admin_notifications').insert({
        type: 'B2B_QUOTE_DECIDED',
        title: `Penawaran ${decision === 'ACCEPTED' ? 'Diterima' : 'Ditolak'} — ${submission?.company_name ?? 'Klien B2B'}`,
        body: `${submission?.company_name ?? 'Klien korporat'} ${decision === 'ACCEPTED' ? 'MENERIMA' : 'menolak'} penawaran ${quote.insurer_name ?? '(tanpa penanggung)'} senilai Rp ${Number(quote.premium_amount ?? 0).toLocaleString('id-ID')}. ${decision === 'ACCEPTED' ? 'Tindak lanjuti: konversi ke order / terbitkan dokumen.' : 'Tidak perlu tindak lanjut.'}`,
        metadata: { quote_id: quoteId, submission_id: quote.submission_id, decision, premium_amount: quote.premium_amount ?? null },
        read: false,
      }).then(() => {}, () => {});

      return ok({ quote: updatedQuote, submission: submission ?? null });
    }

    // ── Admin: issue the master policy for a PAID batch ────────────────────
    // ── Admin: signed upload URL for the master policy file ────────────────
    // b2b-documents' INSERT storage policy only allows
    // (storage.foldername(name))[1] = auth.uid()::text — there is no
    // is_admin() OR clause on INSERT (only on SELECT/UPDATE/DELETE), so even
    // an authenticated ADMIN cannot satisfy it by uploading directly under a
    // path keyed by batch_id rather than their own uid. uploadB2BBulkMasterPolicy()
    // (services/b2bBulk.ts) relied on exactly that direct upload and would
    // fail. A signed upload URL from service_role sidesteps the policy
    // entirely — same reasoning as insurer_bulk_request_upload_url below.
    case 'admin_b2b_bulk_request_upload_url': {
      if (!caller.isAdmin) return err('Forbidden: admin only', 403);
      const batchId = String(params.batch_id ?? '');
      const fileName = String(params.file_name ?? 'master-policy.pdf');
      if (!batchId) return err('batch_id required', 400);
      const { data: batch } = await db.from('sp_b2b_batches').select('id').eq('id', batchId).maybeSingle();
      if (!batch) return err('Batch not found', 404);
      const ext = (fileName.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf';
      const path = `${batchId}/master-policy-${Date.now()}.${ext}`;
      const { data: signed, error: signErr } = await db.storage.from('b2b-documents').createSignedUploadUrl(path);
      if (signErr || !signed) return err(signErr?.message ?? 'Gagal membuat signed upload URL', 400);
      return ok({ path, signed_url: signed.signedUrl, token: signed.token });
    }

    case 'admin_b2b_bulk_issue': {
      if (!caller.isAdmin) return err('Forbidden: admin only', 403);
      const batchId = String(params.batch_id ?? '');
      const policyNumber = String(params.master_policy_number ?? '').trim();
      // FIX 2026-11-05: b2b-documents is a PRIVATE bucket (20260706_security_
      // hardening_phase3) — a getPublicUrl() result for it 404s. This param
      // is now the storage PATH inside that bucket, not a URL; every reader
      // resolves it to a short-lived signed URL (below, and in
      // insurer_list_bulk_batches / b2b_bulk_get_batch) instead of storing
      // one. Accepts a legacy value that still looks like a URL (already
      // issued under the old, broken behavior) without rejecting it — it
      // just won't resolve to anything live; new issuances always get a path.
      const masterPolicyPath = String(params.master_policy_path ?? params.master_policy_document_url ?? '').trim();
      if (!batchId || !policyNumber || !masterPolicyPath) {
        return err('batch_id, master_policy_number, master_policy_path required', 400);
      }
      if (masterPolicyPath.includes('..') || !masterPolicyPath.startsWith(`${batchId}/`)) {
        return err(`master_policy_path harus diawali ${batchId}/`, 400);
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
        master_policy_document_url: masterPolicyPath,
        insurer_name: insurerName,
        issued_at: ts,
        updated_at: ts,
      }).eq('id', batchId).select().maybeSingle();
      if (updErr) return err(updErr.message, 400);

      await db.from('sp_b2b_batch_items').update({ status: 'ISSUED', policy_number: policyNumber, updated_at: ts }).eq('batch_id', batchId);

      const { data: signed } = await db.storage.from('b2b-documents').createSignedUrl(masterPolicyPath, 300);
      return ok({ ...updated, master_policy_signed_url: signed?.signedUrl ?? null });
    }

    // ── Admin: assign the insurer who will issue the master policy ─────────
    // Previously insurer_id on a batch was only ever written by
    // admin_b2b_bulk_issue itself (the LAST step) — there was no way to
    // assign one earlier, so an insurer's token-authed dashboard had nothing
    // to query before the batch was already done. This lets admin pick the
    // insurer any time after submission; it does not change batch status.
    case 'admin_b2b_bulk_assign_insurer': {
      if (!caller.isAdmin) return err('Forbidden: admin only', 403);
      const batchId = String(params.batch_id ?? '');
      const insurerId = String(params.insurer_id ?? '');
      if (!batchId || !insurerId) return err('batch_id, insurer_id required', 400);
      const { data: insurer } = await db.from('sp_insurers').select('id, name').eq('id', insurerId).maybeSingle();
      if (!insurer) return err('Insurer not found', 404);
      const { data, error } = await db.from('sp_b2b_batches').update({
        insurer_id: insurerId, insurer_name: insurer.name, updated_at: new Date().toISOString(),
      }).eq('id', batchId).select().maybeSingle();
      if (error) return err(error.message, 400);
      if (!data) return err('Batch not found', 404);
      return ok(data);
    }

    // ── Insurer (token-authed): batches assigned to them ────────────────────
    // Mirrors insurer_list_payments's token-validation shape. Only PAID
    // batches are actionable (awaiting their master-policy upload); ISSUED
    // ones are included read-only as history so the dashboard isn't empty
    // once an insurer has worked through their queue.
    case 'insurer_list_bulk_batches': {
      const token = String(params.token ?? '');
      if (!token) return err('token required', 400);
      const { data: authToken, error: authErr } = await db.from('sp_insurer_auth_tokens')
        .select('id, insurer_id, expires_at').eq('token', token).maybeSingle();
      if (authErr) return err(authErr.message, 400);
      if (!authToken) return err('Invalid token', 404);
      if (new Date(authToken.expires_at) < new Date()) return err('Token expired', 410);

      const { data: batches, error: batchesErr } = await db.from('sp_b2b_batches')
        .select('*').eq('insurer_id', authToken.insurer_id).in('status', ['PAID', 'ISSUED'])
        .order('created_at', { ascending: false });
      if (batchesErr) return err(batchesErr.message, 400);

      // Sign whichever ISSUED batches already have a master policy path, so
      // the dashboard can offer a working download link without a second
      // round trip (same inline-signing shape as insurer_list_order_documents).
      const withUrls = await Promise.all((batches ?? []).map(async (b: any) => {
        if (!b.master_policy_document_url || b.master_policy_document_url.startsWith('http')) {
          return { ...b, master_policy_signed_url: null };
        }
        const { data: signed } = await db.storage.from('b2b-documents').createSignedUrl(b.master_policy_document_url, 300);
        return { ...b, master_policy_signed_url: signed?.signedUrl ?? null };
      }));
      return ok(withUrls);
    }

    // ── Insurer (token-authed): request a signed upload URL ────────────────
    // b2b-documents is private with owner-folder-only INSERT policies — an
    // insurer has no Supabase session (bearer token only), so it cannot
    // satisfy that policy by uploading directly the way an authenticated
    // admin/client would. A signed upload URL from service_role sidesteps
    // that entirely: the URL itself is the grant, scoped to this one path.
    case 'insurer_bulk_request_upload_url': {
      const token = String(params.token ?? '');
      const batchId = String(params.batch_id ?? '');
      const fileName = String(params.file_name ?? 'master-policy.pdf');
      if (!token || !batchId) return err('token, batch_id required', 400);
      const { data: authToken, error: authErr } = await db.from('sp_insurer_auth_tokens')
        .select('id, insurer_id, expires_at').eq('token', token).maybeSingle();
      if (authErr) return err(authErr.message, 400);
      if (!authToken) return err('Invalid token', 404);
      if (new Date(authToken.expires_at) < new Date()) return err('Token expired', 410);

      const { data: batch } = await db.from('sp_b2b_batches').select('id, status, insurer_id').eq('id', batchId).maybeSingle();
      if (!batch || batch.insurer_id !== authToken.insurer_id) return err('Batch not found or not assigned to your insurer', 404);
      if (batch.status !== 'PAID') return err(`Batch belum berstatus PAID (status: ${batch.status})`, 409);

      const ext = (fileName.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf';
      const path = `${batchId}/master-policy-${Date.now()}.${ext}`;
      const { data: signed, error: signErr } = await db.storage.from('b2b-documents').createSignedUploadUrl(path);
      if (signErr || !signed) return err(signErr?.message ?? 'Gagal membuat signed upload URL', 400);
      return ok({ path, signed_url: signed.signedUrl, token: signed.token });
    }

    // ── Insurer (token-authed): finalize — mirrors insurer_upload_policy ──
    case 'insurer_upload_bulk_master_policy': {
      const token = String(params.token ?? '');
      const batchId = String(params.batch_id ?? '');
      const path = String(params.master_policy_path ?? '').trim();
      const policyNumber = String(params.master_policy_number ?? '').trim();
      if (!token || !batchId || !path) return err('token, batch_id, master_policy_path required', 400);
      if (path.includes('..') || !path.startsWith(`${batchId}/`)) return err(`master_policy_path harus diawali ${batchId}/`, 400);

      const { data: authToken, error: authErr } = await db.from('sp_insurer_auth_tokens')
        .select('id, insurer_id, expires_at').eq('token', token).maybeSingle();
      if (authErr) return err(authErr.message, 400);
      if (!authToken) return err('Invalid token', 404);
      if (new Date(authToken.expires_at) < new Date()) return err('Token expired', 410);

      const { data: batch, error: batchErr } = await db.from('sp_b2b_batches')
        .select('id, status, insurer_id, company_name, batch_number').eq('id', batchId).maybeSingle();
      if (batchErr) return err(batchErr.message, 400);
      if (!batch || batch.insurer_id !== authToken.insurer_id) return err('Batch not found or not assigned to your insurer', 404);
      if (batch.status !== 'PAID') return err(`Batch belum berstatus PAID (status: ${batch.status})`, 409);

      const ts = new Date().toISOString();
      const { data: updated, error: updErr } = await db.from('sp_b2b_batches').update({
        status: 'ISSUED',
        master_policy_number: policyNumber || null,
        master_policy_document_url: path,
        issued_at: ts,
        updated_at: ts,
      }).eq('id', batchId).select().maybeSingle();
      if (updErr) return err(updErr.message, 400);

      await db.from('sp_b2b_batch_items').update({ status: 'ISSUED', policy_number: policyNumber || null, updated_at: ts }).eq('batch_id', batchId);

      await db.from('sp_admin_notifications').insert({
        type: 'B2B_BULK_ISSUED',
        title: `Polis Induk B2B Diterbitkan — ${batch.company_name}`,
        body: `${batch.batch_number}: polis ${policyNumber || '(no number)'} diunggah oleh insurer.`,
        metadata: { batch_id: batchId, policy_number: policyNumber },
        read: false,
      }).then(() => {}, () => {});

      const { data: signed } = await db.storage.from('b2b-documents').createSignedUrl(path, 300);
      return ok({ ...updated, master_policy_signed_url: signed?.signedUrl ?? null });
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
