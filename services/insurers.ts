// Insurers, insurer products, product commission configs, OJK rate sets and
// vehicle market-value overrides.

import { supabase } from './db';
import type {
  SpInsurer,
  SpInsurerProduct,
  SpProductConfig,
  SpVehicleOverride,
  SpOjkRateSet,
  AvailableInsurerProductsResult,
} from './dbTypes';

// ─── Product Commission & Coin Configs ───────────────────────────────────────

export async function getProductConfigs(): Promise<SpProductConfig[]> {
  const { data, error } = await supabase
    .from('sp_product_configs')
    .select('*')
    .order('product_code');
  if (error) { console.error('getProductConfigs:', error); return []; }
  return (data ?? []) as SpProductConfig[];
}

export async function getProductConfig(productCode: string): Promise<SpProductConfig | null> {
  const { data, error } = await supabase
    .from('sp_product_configs')
    .select('*')
    .eq('product_code', productCode)
    .eq('is_active', true)
    .maybeSingle();
  if (error) { console.error('getProductConfig:', error); return null; }
  return data as SpProductConfig | null;
}

export async function updateProductConfig(id: string, updates: Partial<SpProductConfig>): Promise<boolean> {
  const { error } = await supabase
    .from('sp_product_configs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { console.error('updateProductConfig:', error); return false; }
  return true;
}

export async function createProductConfig(
  data: Omit<SpProductConfig, 'id' | 'created_at' | 'updated_at'>
): Promise<SpProductConfig | null> {
  const { data: result, error } = await supabase
    .from('sp_product_configs')
    .insert(data)
    .select()
    .single();
  if (error) { console.error('createProductConfig:', error); return null; }
  return result as SpProductConfig;
}

// ─── Insurer CRUD ─────────────────────────────────────────────────────────────

export async function getInsurers(): Promise<SpInsurer[]> {
  const { data, error } = await supabase
    .from('sp_insurers')
    .select('*')
    .order('name');
  if (error) { console.error('getInsurers:', error); return []; }
  return (data ?? []) as SpInsurer[];
}

export async function createInsurer(payload: Omit<SpInsurer, 'id' | 'created_at'>): Promise<SpInsurer | null> {
  const { data, error } = await supabase
    .from('sp_insurers')
    .insert(payload)
    .select()
    .single();
  if (error) { console.error('createInsurer:', error); return null; }
  return data as SpInsurer;
}

export async function updateInsurer(id: string, payload: Partial<SpInsurer>): Promise<boolean> {
  const { error } = await supabase.from('sp_insurers').update(payload).eq('id', id);
  if (error) { console.error('updateInsurer:', error); return false; }
  return true;
}

export async function deleteInsurer(id: string): Promise<boolean> {
  const { error } = await supabase.from('sp_insurers').delete().eq('id', id);
  if (error) { console.error('deleteInsurer:', error); return false; }
  return true;
}

// ─── Insurer Product CRUD ─────────────────────────────────────────────────────

export async function getInsurerProducts(insurer_id?: string): Promise<SpInsurerProduct[]> {
  let q = supabase
    .from('sp_insurer_products')
    .select('*, sp_insurers(name, code)');
  if (insurer_id) q = q.eq('insurer_id', insurer_id);
  const { data, error } = await q.order('product_type').order('vehicle_coverage');
  if (error) { console.error('getInsurerProducts:', error); return []; }
  return (data ?? []).map((r: any) => ({
    ...r,
    insurer_name: r.sp_insurers?.name,
    insurer_code: r.sp_insurers?.code,
  })) as SpInsurerProduct[];
}

export async function getAvailableInsurerProducts(
  vehicleType: string,
  coverageType: string,
  vehicleAgeYears: number,
): Promise<AvailableInsurerProductsResult> {
  const { data, error } = await supabase
    .from('sp_insurer_products')
    .select('*, sp_insurers!inner(name, code, is_active, logo_url)')
    .eq('product_type', vehicleType)
    .eq('is_active', true)
    .or(`vehicle_coverage.eq.${coverageType},vehicle_coverage.eq.ALL`);
  if (error) { console.error('getAvailableInsurerProducts:', error); return { products: [], excludedByAgeCount: 0 }; }
  const activeRows = (data ?? []).filter((r: any) => r.sp_insurers?.is_active);
  const products = activeRows
    .filter((r: any) => !r.max_vehicle_age_years || vehicleAgeYears <= r.max_vehicle_age_years)
    .map((r: any) => ({
      ...r,
      insurer_name: r.sp_insurers?.name,
      insurer_code: r.sp_insurers?.code,
      insurer_logo_url: r.sp_insurers?.logo_url,
    })) as SpInsurerProduct[];
  return { products, excludedByAgeCount: activeRows.length - products.length };
}

export async function createInsurerProduct(payload: Omit<SpInsurerProduct, 'id' | 'created_at' | 'updated_at' | 'insurer_name' | 'insurer_code'>): Promise<boolean> {
  const { error } = await supabase.from('sp_insurer_products').insert(payload);
  if (error) { console.error('createInsurerProduct:', error); return false; }
  return true;
}

export async function updateInsurerProduct(id: string, payload: Partial<SpInsurerProduct>): Promise<boolean> {
  const { error } = await supabase
    .from('sp_insurer_products')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { console.error('updateInsurerProduct:', error); return false; }
  return true;
}

export async function deleteInsurerProduct(id: string): Promise<boolean> {
  const { error } = await supabase.from('sp_insurer_products').delete().eq('id', id);
  if (error) { console.error('deleteInsurerProduct:', error); return false; }
  return true;
}

// ─── OJK Rate Set CRUD (services/ojkRates.ts CMS) ─────────────────────────────

export async function getActiveOjkRateSet(): Promise<SpOjkRateSet | null> {
  const { data, error } = await supabase
    .from('sp_ojk_rate_sets')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();
  if (error) { console.error('getActiveOjkRateSet:', error); return null; }
  return data as SpOjkRateSet | null;
}

export async function getAllOjkRateSets(): Promise<SpOjkRateSet[]> {
  const { data, error } = await supabase
    .from('sp_ojk_rate_sets')
    .select('*')
    .order('effective_date', { ascending: false });
  if (error) { console.error('getAllOjkRateSets:', error); return []; }
  return (data ?? []) as SpOjkRateSet[];
}

export async function createOjkRateSet(payload: Omit<SpOjkRateSet, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
  const { error } = await supabase.from('sp_ojk_rate_sets').insert(payload);
  if (error) { console.error('createOjkRateSet:', error); return false; }
  return true;
}

export async function updateOjkRateSet(id: string, payload: Partial<SpOjkRateSet>): Promise<boolean> {
  const { error } = await supabase
    .from('sp_ojk_rate_sets')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) { console.error('updateOjkRateSet:', error); return false; }
  return true;
}

// Activates one rate set and deactivates all others (partial unique index
// only allows a single is_active=true row, so the old one must be turned
// off first in the same round-trip).
export async function activateOjkRateSet(id: string): Promise<boolean> {
  const { error: offErr } = await supabase.from('sp_ojk_rate_sets').update({ is_active: false }).eq('is_active', true);
  if (offErr) { console.error('activateOjkRateSet (deactivate):', offErr); return false; }
  const { error } = await supabase.from('sp_ojk_rate_sets').update({ is_active: true, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) { console.error('activateOjkRateSet:', error); return false; }
  return true;
}

export async function deleteOjkRateSet(id: string): Promise<boolean> {
  const { error } = await supabase.from('sp_ojk_rate_sets').delete().eq('id', id);
  if (error) { console.error('deleteOjkRateSet:', error); return false; }
  return true;
}

// ─── Vehicle Override CRUD ────────────────────────────────────────────────────

export async function getVehicleOverrides(): Promise<SpVehicleOverride[]> {
  const { data, error } = await supabase
    .from('sp_vehicle_overrides')
    .select('*')
    .order('brand')
    .order('model');
  if (error) { console.error('getVehicleOverrides:', error); return []; }
  return (data ?? []) as SpVehicleOverride[];
}

export async function upsertVehicleOverride(payload: Omit<SpVehicleOverride, 'id' | 'created_at'>): Promise<boolean> {
  const { error } = await supabase
    .from('sp_vehicle_overrides')
    .upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict: 'brand,model' });
  if (error) { console.error('upsertVehicleOverride:', error); return false; }
  return true;
}

export async function getVehicleMarketValue(brand: string, model: string, year: number): Promise<number | null> {
  const { data, error } = await supabase
    .from('sp_vehicle_overrides')
    .select('market_value_rp, list_price_m, ref_year, discount_rate, is_active')
    .ilike('brand', brand)
    .ilike('model', model)
    .eq('is_active', true)
    .order('ref_year', { ascending: false })
    .limit(5);
  if (error || !data || data.length === 0) return null;
  const closest = (data as SpVehicleOverride[]).reduce((best, row) => {
    return Math.abs(row.ref_year - year) < Math.abs(best.ref_year - year) ? row : best;
  }, data[0] as SpVehicleOverride);
  if (closest.market_value_rp && closest.market_value_rp > 0) return closest.market_value_rp;
  if (closest.list_price_m && closest.list_price_m > 0) {
    const yearDiff = Math.max(0, new Date().getFullYear() - year);
    const dep = closest.discount_rate > 0 ? closest.discount_rate : 0.15;
    return Math.round(closest.list_price_m * 1_000_000 * Math.pow(1 - dep, yearDiff));
  }
  return null;
}
