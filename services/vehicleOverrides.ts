// Harga kendaraan yang dikelola admin (CMS > Pricelist Kendaraan).
//
// Sebelum modul ini ada, `services/vehicleDatabase.ts` hanya memakai pricelist
// statis yang ikut ter-bundle di JS. Admin bisa mengubah harga di CMS dan
// nilainya tidak pernah sampai ke wizard agen — dua sumber kebenaran untuk
// angka yang menentukan premi. Modul ini menimpa harga statis dengan baris
// `sp_vehicle_overrides` yang aktif, dan jatuh kembali ke statis bila baris
// belum termuat atau tidak ada.
//
// Kontrak:
// - `initVehicleOverrides()` dipanggil sekali saat aplikasi boot, lalu
//   di-refresh saat app kembali fokus (TTL 5 menit).
// - Lookup bersifat sinkron supaya call site lama di vehicleDatabase tidak
//   perlu diubah menjadi async. Sebelum pemuatan selesai, lookup mengembalikan
//   null dan pemanggil memakai harga statis.

import { supabase } from './db';

export interface VehicleOverrideRow {
  brand: string;
  model: string;
  ref_year: number;
  market_value_rp: number;
}

type OverrideIndex = Map<string, Map<number, number>>;

const TTL_MS = 5 * 60 * 1000;

const norm = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');
const modelKey = (brand: string, model: string): string => `${norm(brand)}|${norm(model)}`;

/**
 * Bangun indeks `brand|model -> (tahun -> harga)`.
 * Baris dengan harga tidak valid diabaikan; baris duplikat: yang terakhir menang.
 */
export function buildOverrideIndex(rows: readonly VehicleOverrideRow[]): OverrideIndex {
  const index: OverrideIndex = new Map();
  for (const row of rows) {
    if (!row || typeof row.brand !== 'string' || typeof row.model !== 'string') continue;
    const brand = norm(row.brand);
    const model = norm(row.model);
    if (!brand || !model) continue;
    const year = Number(row.ref_year);
    const price = Number(row.market_value_rp);
    if (!Number.isFinite(year) || !Number.isFinite(price) || price <= 0) continue;
    const key = `${brand}|${model}`;
    const byYear = index.get(key) ?? new Map<number, number>();
    byYear.set(year, price);
    index.set(key, byYear);
  }
  return index;
}

/**
 * Harga override untuk satu model.
 * - `year` diberikan: hanya tahun itu yang dipakai (tanpa menebak tahun lain).
 * - `year` kosong: pakai tahun terbaru yang tersedia, setara `marketValueRp`
 *   statis yang juga mengacu ke tahun referensi terbaru.
 */
export function lookupInIndex(
  index: OverrideIndex,
  brand: string,
  model: string,
  year?: number,
): number | null {
  const byYear = index.get(modelKey(brand, model));
  if (!byYear || byYear.size === 0) return null;
  if (year === undefined) {
    return byYear.get(Math.max(...byYear.keys())) ?? null;
  }
  return byYear.get(Number(year)) ?? null;
}

let index: OverrideIndex | null = null;
let loadedAt = 0;
let inflight: Promise<void> | null = null;

/** Muat/hitung ulang harga admin. Aman dipanggil berkali-kali. */
export async function initVehicleOverrides(force = false): Promise<void> {
  if (!force && index && Date.now() - loadedAt < TTL_MS) return;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const { data, error } = await supabase
        .from('sp_vehicle_overrides')
        .select('brand,model,ref_year,market_value_rp')
        .eq('is_active', true);
      if (!error && Array.isArray(data)) {
        index = buildOverrideIndex(data as VehicleOverrideRow[]);
        loadedAt = Date.now();
      }
    } catch {
      // Harga statis tetap dipakai; jangan gagalkan boot aplikasi.
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** Lookup sinkron; null berarti "pakai harga statis". */
export function lookupVehicleOverride(brand: string, model: string, year?: number): number | null {
  if (!index) return null;
  return lookupInIndex(index, brand, model, year);
}

/** Hanya untuk test. */
export function resetVehicleOverridesForTests(): void {
  index = null;
  loadedAt = 0;
  inflight = null;
}
