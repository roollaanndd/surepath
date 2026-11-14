// b2bSettings.ts — admin-editable B2B fleet rates + versioned T&C documents.
//
// Two independent, versioned "one active row at a time" config tables, same
// shape as sp_ojk_rate_sets (see OjkRateAdmin.tsx for the UI pattern this
// mirrors). Both are deny-all RLS — gateway/service_role only.
//
//   sp_b2b_fleet_rate_sets — pickup/truck rate, heavy-equipment rate, the two
//     discount rates, the three admin fees, and the minimum premium floor
//     used by services/b2bFleetRating.ts's calcBulkPremium(). Passenger-car
//     and motorcycle TLO rates are NOT here — those already come from the
//     active sp_ojk_rate_sets row (OjkRateAdmin.tsx), reused as-is.
//
//   sp_tnc_documents — the Terms & Conditions text an agent agrees to via
//     accept_agreement (actions/users.ts). doc_version there used to be a
//     hardcoded string; getActiveTncVersion() below is the single source of
//     truth both that action and record_tc_acceptance now read from.
import type { GatewayContext, ActionResult } from './types.ts';
import { setActiveBulkRateConfig, type BulkRateConfig } from '../../_shared/b2bFleetRating.ts';

const json = (body: unknown, status = 200): ActionResult => ({ status, body });
const CAN_EDIT_RATES = ['MASTER_ADMIN', 'ADMIN', 'FINANCE_MANAGER'];
const CAN_EDIT_TNC = ['MASTER_ADMIN', 'ADMIN'];

function isValidRateConfig(r: unknown): r is BulkRateConfig {
  if (!r || typeof r !== 'object') return false;
  const c = r as Record<string, unknown>;
  const numFields = ['heavyEquipmentRate', 'discountRateStandard', 'discountRateHeavy', 'adminFeeMotorcycle', 'adminFeeCar', 'adminFeeHeavy', 'minPremiumGross'];
  if (!numFields.every(k => typeof c[k] === 'number' && Number.isFinite(c[k] as number) && (c[k] as number) >= 0)) return false;
  const pickup = c.pickupTruckTloMin as Record<string, unknown> | undefined;
  if (!pickup || typeof pickup !== 'object') return false;
  return ['1', '2', '3'].every(z => typeof pickup[z] === 'number' && (pickup[z] as number) >= 0);
}

/**
 * Loads the active sp_b2b_fleet_rate_sets row (if any) and installs it as
 * the module-level override calcBulkPremium prices from. Call this once per
 * request before pricing a batch — the Deno module instance persists across
 * invocations on the same isolate, so a stale value could otherwise leak
 * into a later request if this were skipped. Falls back silently (keeps
 * whatever DEFAULT_BULK_RATE_CONFIG already set) if no row is active or the
 * stored shape doesn't validate — pricing must never hard-fail because of a
 * malformed admin edit.
 */
export async function loadActiveBulkRateConfig(db: GatewayContext['db']): Promise<void> {
  const { data } = await db.from('sp_b2b_fleet_rate_sets').select('rates').eq('is_active', true).maybeSingle();
  if (data?.rates && isValidRateConfig(data.rates)) {
    setActiveBulkRateConfig(data.rates);
  }
}

export async function handleB2BSettingsAction(action: string, ctx: GatewayContext): Promise<ActionResult | null> {
  const { db, params, caller } = ctx;

  switch (action) {
    // ─── B2B fleet rate sets ──────────────────────────────────────────────
    case 'get_active_b2b_fleet_rate_config': {
      if (!caller.spUser) return json({ error: 'No profile' }, 403);
      const { data } = await db.from('sp_b2b_fleet_rate_sets').select('*').eq('is_active', true).maybeSingle();
      return json({ data: data ?? null });
    }

    case 'admin_list_b2b_fleet_rate_sets': {
      if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
      const { data, error } = await db.from('sp_b2b_fleet_rate_sets').select('*').order('created_at', { ascending: false });
      if (error) return json({ error: error.message }, 400);
      return json({ data: data ?? [] });
    }

    case 'admin_save_b2b_fleet_rate_set': {
      if (!CAN_EDIT_RATES.includes(caller.role ?? '')) return json({ error: 'Forbidden' }, 403);
      const rates = params.rates;
      if (!isValidRateConfig(rates)) return json({ error: 'rates tidak valid — periksa semua field numerik' }, 400);
      const payload = {
        version: String(params.version ?? '').trim(),
        source_reference: params.source_reference ? String(params.source_reference) : undefined,
        effective_date: params.effective_date ? String(params.effective_date) : undefined,
        rates,
        notes: params.notes != null ? String(params.notes) : undefined,
        updated_at: new Date().toISOString(),
      };
      if (!payload.version) return json({ error: 'version wajib diisi' }, 400);
      if (params.id) {
        const { data, error } = await db.from('sp_b2b_fleet_rate_sets').update(payload).eq('id', String(params.id)).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }
      const { data, error } = await db.from('sp_b2b_fleet_rate_sets').insert({ ...payload, is_active: false }).select().single();
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    case 'admin_activate_b2b_fleet_rate_set': {
      if (!CAN_EDIT_RATES.includes(caller.role ?? '')) return json({ error: 'Forbidden' }, 403);
      const id = String(params.id ?? '');
      if (!id) return json({ error: 'id required' }, 400);
      await db.from('sp_b2b_fleet_rate_sets').update({ is_active: false }).eq('is_active', true);
      const { data, error } = await db.from('sp_b2b_fleet_rate_sets').update({ is_active: true, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle();
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    case 'admin_delete_b2b_fleet_rate_set': {
      if (!CAN_EDIT_RATES.includes(caller.role ?? '')) return json({ error: 'Forbidden' }, 403);
      const id = String(params.id ?? '');
      if (!id) return json({ error: 'id required' }, 400);
      const { data: row } = await db.from('sp_b2b_fleet_rate_sets').select('is_active').eq('id', id).maybeSingle();
      if (row?.is_active) return json({ error: 'Tidak bisa menghapus versi yang sedang aktif' }, 400);
      const { error } = await db.from('sp_b2b_fleet_rate_sets').delete().eq('id', id);
      if (error) return json({ error: error.message }, 400);
      return json({ data: { success: true } });
    }

    // ─── B2B plans (paket asuransi B2B) ──────────────────────────────────
    // Dikelola admin di dashboard (admin_*), dibaca klien B2B (list_active_b2b_plans).
    case 'list_active_b2b_plans': {
      if (!caller.spUser && !caller.isAdmin) return json({ error: 'No profile' }, 403);
      const { data, error } = await db.from('sp_b2b_plans').select('id, code, name, description, loading_rate, benefits, pros, cons, sort_order').eq('is_active', true).order('sort_order', { ascending: true });
      if (error) return json({ error: error.message }, 400);
      return json({ data: data ?? [] });
    }

    case 'admin_list_b2b_plans': {
      if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
      const { data, error } = await db.from('sp_b2b_plans').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false });
      if (error) return json({ error: error.message }, 400);
      return json({ data: data ?? [] });
    }

    case 'admin_save_b2b_plan': {
      if (!CAN_EDIT_RATES.includes(caller.role ?? '')) return json({ error: 'Forbidden' }, 403);
      const code = String(params.code ?? '').trim().toUpperCase();
      const name = String(params.name ?? '').trim();
      if (!code || !name) return json({ error: 'code dan name wajib diisi' }, 400);
      const loadingRate = Number(params.loading_rate);
      if (!Number.isFinite(loadingRate) || loadingRate < -0.5 || loadingRate > 1) {
        return json({ error: 'loading_rate harus di antara −50% dan 100%' }, 400);
      }
      const benefits = Array.isArray(params.benefits) ? params.benefits.map(String).slice(0, 20) : [];
      const pros = Array.isArray(params.pros) ? params.pros.map((x: unknown) => String(x).slice(0, 160)).filter(Boolean).slice(0, 12) : [];
      const cons = Array.isArray(params.cons) ? params.cons.map((x: unknown) => String(x).slice(0, 160)).filter(Boolean).slice(0, 12) : [];
      const payload = {
        code,
        name: name.slice(0, 80),
        description: params.description != null ? String(params.description).slice(0, 500) : null,
        loading_rate: loadingRate,
        benefits,
        pros,
        cons,
        is_active: params.is_active === false ? false : true,
        sort_order: Number(params.sort_order) || 0,
        updated_at: new Date().toISOString(),
      };
      if (params.id) {
        const { data, error } = await db.from('sp_b2b_plans').update(payload).eq('id', String(params.id)).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }
      const { data, error } = await db.from('sp_b2b_plans').insert({ ...payload, created_by: caller.spUser?.id ?? null }).select().single();
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    case 'admin_delete_b2b_plan': {
      if (!CAN_EDIT_RATES.includes(caller.role ?? '')) return json({ error: 'Forbidden' }, 403);
      const id = String(params.id ?? '');
      if (!id) return json({ error: 'id required' }, 400);
      // Cek apakah paket masih dipakai; kalau ya, non-aktifkan saja, jangan hapus.
      const { count } = await db.from('sp_b2b_batch_items').select('id', { head: true, count: 'exact' }).eq('plan_id', id);
      if ((count ?? 0) > 0) {
        await db.from('sp_b2b_plans').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id);
        return json({ data: { success: true, deactivated: true } });
      }
      const { error } = await db.from('sp_b2b_plans').delete().eq('id', id);
      if (error) return json({ error: error.message }, 400);
      return json({ data: { success: true } });
    }

    // ─── T&C documents ──────────────────────────────────────────────────────
    case 'get_active_tnc': {
      if (!caller.spUser) return json({ error: 'No profile' }, 403);
      const { data } = await db.from('sp_tnc_documents').select('doc_version, title, content, published_at').eq('is_active', true).maybeSingle();
      return json({ data: data ?? null });
    }

    case 'admin_list_tnc_documents': {
      if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);
      const { data, error } = await db.from('sp_tnc_documents').select('*').order('created_at', { ascending: false });
      if (error) return json({ error: error.message }, 400);
      return json({ data: data ?? [] });
    }

    case 'admin_save_tnc_document': {
      if (!CAN_EDIT_TNC.includes(caller.role ?? '')) return json({ error: 'Forbidden' }, 403);
      const docVersion = String(params.doc_version ?? '').trim();
      if (!docVersion) return json({ error: 'doc_version wajib diisi' }, 400);
      const payload: Record<string, unknown> = {
        doc_version: docVersion,
        title: String(params.title ?? 'Syarat & Ketentuan Mitra Agen').slice(0, 200),
        content: String(params.content ?? ''),
        updated_at: new Date().toISOString(),
      };
      if (params.id) {
        const { data, error } = await db.from('sp_tnc_documents').update(payload).eq('id', String(params.id)).select().maybeSingle();
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }
      const { data, error } = await db.from('sp_tnc_documents').insert({ ...payload, is_active: false }).select().single();
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    // Publishing is deliberately NOT the same call as saving — it's the
    // moment new signups start being asked to re-accept this version, so it
    // gets its own explicit admin action rather than happening as a side
    // effect of an edit.
    case 'admin_publish_tnc_document': {
      if (!CAN_EDIT_TNC.includes(caller.role ?? '')) return json({ error: 'Forbidden' }, 403);
      const id = String(params.id ?? '');
      if (!id) return json({ error: 'id required' }, 400);
      await db.from('sp_tnc_documents').update({ is_active: false }).eq('is_active', true);
      const ts = new Date().toISOString();
      const { data, error } = await db.from('sp_tnc_documents').update({
        is_active: true, published_at: ts, published_by: caller.spUser?.id ?? null, updated_at: ts,
      }).eq('id', id).select().maybeSingle();
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    case 'admin_delete_tnc_document': {
      if (!CAN_EDIT_TNC.includes(caller.role ?? '')) return json({ error: 'Forbidden' }, 403);
      const id = String(params.id ?? '');
      if (!id) return json({ error: 'id required' }, 400);
      const { data: row } = await db.from('sp_tnc_documents').select('is_active').eq('id', id).maybeSingle();
      if (row?.is_active) return json({ error: 'Tidak bisa menghapus versi yang sedang aktif' }, 400);
      const { error } = await db.from('sp_tnc_documents').delete().eq('id', id);
      if (error) return json({ error: error.message }, 400);
      return json({ data: { success: true } });
    }

    default:
      return null;
  }
}

/** Active T&C version string, or the legacy hardcoded default if none is published yet. */
export async function getActiveTncVersion(db: GatewayContext['db']): Promise<string> {
  const { data } = await db.from('sp_tnc_documents').select('doc_version').eq('is_active', true).maybeSingle();
  return data?.doc_version ?? 'v1.0-2026';
}
