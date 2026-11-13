// B2B bulk fleet TLO rating engine — correctness against the pilot partner's
// (Mutiara Finance / PT MMF) reference audit figures, + Deno/browser parity.
import { describe, it, expect } from 'vitest';
import * as browser from '../b2bFleetRating';
import * as deno from '../../supabase/functions/_shared/b2bFleetRating.ts';

describe('b2bFleetRating — browser/Deno parity', () => {
  it('exposes the same rate tables and constants', () => {
    expect(deno.PICKUP_TRUCK_TLO_MIN).toEqual(browser.PICKUP_TRUCK_TLO_MIN);
    expect(deno.HEAVY_EQUIPMENT_TLO_RATE).toBe(browser.HEAVY_EQUIPMENT_TLO_RATE);
    expect(deno.DISCOUNT_RATE_STANDARD).toBe(browser.DISCOUNT_RATE_STANDARD);
    expect(deno.DISCOUNT_RATE_HEAVY).toBe(browser.DISCOUNT_RATE_HEAVY);
    expect(deno.ADMIN_FEE_MOTORCYCLE).toBe(browser.ADMIN_FEE_MOTORCYCLE);
    expect(deno.ADMIN_FEE_CAR).toBe(browser.ADMIN_FEE_CAR);
    expect(deno.ADMIN_FEE_HEAVY).toBe(browser.ADMIN_FEE_HEAVY);
    expect(deno.MIN_PREMIUM_GROSS).toBe(browser.MIN_PREMIUM_GROSS);
    expect(deno.MULTI_YEAR_DEPRECIATION_RATE).toBe(browser.MULTI_YEAR_DEPRECIATION_RATE);
    expect(deno.MULTI_YEAR_MAX_TENOR_MONTHS).toBe(browser.MULTI_YEAR_MAX_TENOR_MONTHS);
    expect(deno.MAX_DEPRECIATION_RATE).toBe(browser.MAX_DEPRECIATION_RATE);
    expect(deno.PICKUP_TRUCK_COMP_MIN).toEqual(browser.PICKUP_TRUCK_COMP_MIN);
  });

  it('comprehensive: every class, zone and OTR band agrees', () => {
    const otrs = [100_000_000, 150_000_000, 300_000_000, 600_000_000, 1_200_000_000];
    for (const zone of [1, 2, 3] as const) {
      for (const otr of otrs) {
        for (const commercialBodyHint of [false, true]) {
          const c = { vehicleClass: 'CAR' as const, zone, financingValue: otr, otr, tenorMonths: 12, commercialBodyHint, coverage: 'COMPREHENSIVE' as const };
          expect(deno.calcBulkPremium(c)).toEqual(browser.calcBulkPremium(c));
        }
      }
      const moto = { vehicleClass: 'MOTORCYCLE' as const, zone, financingValue: 20_000_000, otr: 20_000_000, tenorMonths: 24, coverage: 'COMPREHENSIVE' as const, depreciationRate: 0.1 };
      expect(deno.calcBulkPremium(moto)).toEqual(browser.calcBulkPremium(moto));
      const heavy = { vehicleClass: 'HEAVY_EQUIPMENT' as const, zone, financingValue: 900_000_000, otr: 0, tenorMonths: 12, coverage: 'COMPREHENSIVE' as const };
      expect(deno.calcBulkPremium(heavy)).toEqual(browser.calcBulkPremium(heavy));
    }
  });

  it('multi-year depreciation, discount override and date helpers agree', () => {
    const cases: Array<Parameters<typeof browser.calcBulkPremium>[0]> = [
      { vehicleClass: 'CAR', zone: 2, financingValue: 250_000_000, otr: 280_000_000, tenorMonths: 72, depreciationRate: 0.1 },
      { vehicleClass: 'CAR', zone: 1, financingValue: 100_000_000, otr: 0, tenorMonths: 18, commercialBodyHint: true, depreciationRate: 0.1, discountRateOverride: 0.1 },
      { vehicleClass: 'MOTORCYCLE', zone: 3, financingValue: 21_333_333, otr: 0, tenorMonths: 36, depreciationRate: 0.1, discountRateOverride: 0 },
      { vehicleClass: 'HEAVY_EQUIPMENT', zone: 3, financingValue: 1_000_000_000, otr: 0, tenorMonths: 48, depreciationRate: 0.1, discountRateOverride: 0.9 },
      { vehicleClass: 'MOTORCYCLE', zone: 2, financingValue: 2_500_000, otr: 0, tenorMonths: 12, depreciationRate: 0.1 },
    ];
    for (const c of cases) {
      expect(deno.calcBulkPremium(c)).toEqual(browser.calcBulkPremium(c));
    }
    for (const [iso, months] of [['2026-11-12', 12], ['2027-01-31', 1], ['2028-02-29', 12], ['2026-11-12', 72], ['2026-12-15', 6], ['bukan-tanggal', 12]] as Array<[string, number]>) {
      expect(deno.addMonthsToIsoDate(iso, months)).toBe(browser.addMonthsToIsoDate(iso, months));
      expect(deno.isValidIsoDate(iso)).toBe(browser.isValidIsoDate(iso));
    }
  });

  it('calcBulkPremium agrees on a representative set of inputs', () => {
    const cases: Array<Parameters<typeof browser.calcBulkPremium>[0]> = [
      { vehicleClass: 'MOTORCYCLE', zone: 2, financingValue: 2_500_000, otr: 6_000_000, tenorMonths: 12 },
      { vehicleClass: 'MOTORCYCLE', zone: 2, financingValue: 3_000_000, otr: 7_000_000, tenorMonths: 12 },
      { vehicleClass: 'CAR', zone: 2, financingValue: 13_000_000, otr: 41_000_000, tenorMonths: 12, commercialBodyHint: true },
      { vehicleClass: 'CAR', zone: 1, financingValue: 10_000_000, otr: 46_000_000, tenorMonths: 12, commercialBodyHint: false },
      { vehicleClass: 'HEAVY_EQUIPMENT', zone: 3, financingValue: 1_000_000_000, otr: 1_100_000_000, tenorMonths: 3 },
    ];
    for (const c of cases) {
      expect(deno.calcBulkPremium(c)).toEqual(browser.calcBulkPremium(c));
    }
  });

  it('classification and zone detection agree', () => {
    expect(deno.classifyVehicleClass('MOTOR BEKAS')).toBe(browser.classifyVehicleClass('MOTOR BEKAS'));
    expect(deno.classifyVehicleClass('ALAT BERAT')).toBe(browser.classifyVehicleClass('ALAT BERAT'));
    expect(deno.isLikelyCommercialBody('SUZUKI GC 415 T(4X2) M/T 2012')).toBe(true);
    expect(deno.isLikelyCommercialBody('SUZUKI GC 415 T(4X2) M/T 2012')).toBe(browser.isLikelyCommercialBody('SUZUKI GC 415 T(4X2) M/T 2012'));
    expect(deno.detectZone('SERANG', 'A1977YX')).toEqual(browser.detectZone('SERANG', 'A1977YX'));
    expect(deno.detectZone(null, 'BG8775FQ')).toEqual(browser.detectZone(null, 'BG8775FQ'));
  });
});

describe('b2bFleetRating — matches the PT MMF reference audit', () => {
  it('row 1: DENI KASSUARI — motor, Zona 2, 12 bulan — formula penuh tanpa lantai', () => {
    // Araahan owner (2026-11-11): premi = nilai pencairan × rate × tenor/12,
    // TANPA lantai premi minimum (default minPremiumGross = 0).
    const r = browser.calcBulkPremium({ vehicleClass: 'MOTORCYCLE', zone: 2, financingValue: 2_500_000, otr: 6_000_000, tenorMonths: 12 });
    expect(r.rate).toBeCloseTo(0.018, 6);
    expect(r.premiumGross).toBe(45_000); // 2,500,000 * 0.018 * 12/12
    expect(r.discountAmount).toBe(11_250); // 25%
    expect(r.premiumAfterDiscount).toBe(33_750);
    expect(r.adminFee).toBe(25_000);
    expect(r.totalPremium).toBe(58_750);
    // Metodologi audit manual mitra pilot memakai lantai premi gross 50rb —
    // mekanismenya tetap ada, direproduksi via rate config eksplisit.
    const floored = browser.calcBulkPremium(
      { vehicleClass: 'MOTORCYCLE', zone: 2, financingValue: 2_500_000, otr: 6_000_000, tenorMonths: 12 },
      { ...browser.DEFAULT_BULK_RATE_CONFIG, minPremiumGross: 50_000 },
    );
    expect(floored.premiumGross).toBe(50_000);
    expect(floored.totalPremium).toBe(62_500);
  });

  it('row 2: RITA TJUNG — alat berat, Zona 3, 3 bulan', () => {
    const r = browser.calcBulkPremium({ vehicleClass: 'HEAVY_EQUIPMENT', zone: 3, financingValue: 1_000_000_000, otr: 1_100_000_000, tenorMonths: 3 });
    expect(r.rate).toBe(0.0085);
    expect(r.premiumGross).toBe(2_125_000); // 1e9 * 0.0085 * 3/12
    expect(r.discountAmount).toBe(318_750); // 15%
    expect(r.premiumAfterDiscount).toBe(1_806_250);
    expect(r.adminFee).toBe(65_000);
    expect(r.totalPremium).toBe(1_871_250);
  });

  it('row 105: SUZUKI GC 415 T — the rate the reference audit corrected (pickup, not passenger)', () => {
    // Reference audit originally mis-rated this as a passenger car (0.65%)
    // and corrected it to the pickup/mobil-barang rate (1.68%) after reading
    // the model name — isLikelyCommercialBody() exists to catch exactly this.
    expect(browser.isLikelyCommercialBody('SUZUKI GC 415 T(4X2 ) M/T 2012')).toBe(true);
    const r = browser.calcBulkPremium({ vehicleClass: 'CAR', zone: 2, financingValue: 13_000_000, otr: 41_000_000, tenorMonths: 12, commercialBodyHint: true });
    expect(r.rate).toBeCloseTo(0.0168, 6);
    expect(r.premiumGross).toBe(218_400);
    expect(r.discountAmount).toBe(54_600);
    expect(r.premiumAfterDiscount).toBe(163_800);
    expect(r.adminFee).toBe(25_000); // arahan owner 2026-11-11: flat 25rb motor & mobil
    expect(r.totalPremium).toBe(188_800);
  });

  it('row 197: SUZUKI CARRY — pickup, Zona 1, 24 bulan tenor pro-rata', () => {
    expect(browser.isLikelyCommercialBody('SUSUKI CARRY ST 130 FUTURA 2021')).toBe(true);
    const r = browser.calcBulkPremium({ vehicleClass: 'CAR', zone: 1, financingValue: 23_000_000, otr: 48_000_000, tenorMonths: 24, commercialBodyHint: true });
    expect(r.rate).toBeCloseTo(0.0088, 6);
    expect(r.premiumGross).toBe(404_800); // 23,000,000 * 0.0088 * 24/12
    expect(r.totalPremium).toBe(328_600);
  });

  it('row 231: MITSUBISHI MAVEN — passenger car (category 1), Zona 1, formula penuh', () => {
    expect(browser.isLikelyCommercialBody('MITSUBISHI MAVEN SDX 2005')).toBe(false);
    const r = browser.calcBulkPremium({ vehicleClass: 'CAR', zone: 1, financingValue: 10_000_000, otr: 46_000_000, tenorMonths: 12, commercialBodyHint: false });
    expect(r.category).toBe(1);
    expect(r.rate).toBeCloseTo(0.0047, 6);
    expect(r.premiumGross).toBe(47_000); // 10,000,000 * 0.0047 — tanpa lantai (arahan owner)
    expect(r.totalPremium).toBe(60_250);
  });

  it('row 246: MITSUBISHI L300 — pickup/van, Zona 3 (Samarinda)', () => {
    expect(browser.isLikelyCommercialBody('MITSUBISHI L300 4X2 MANUAL')).toBe(true);
    const r = browser.calcBulkPremium({ vehicleClass: 'CAR', zone: 3, financingValue: 17_000_000, otr: 46_000_000, tenorMonths: 12, commercialBodyHint: true });
    expect(r.rate).toBeCloseTo(0.0081, 6);
    expect(r.premiumGross).toBe(137_700);
    expect(r.totalPremium).toBe(128_275);
  });

  it('zone detection: BG plate (Sumsel) and A plate (Banten) match the reference audit zones', () => {
    expect(browser.detectZone('PALEMBANG', 'BG1057K')).toEqual({ zone: 1, source: 'plate', confident: true });
    expect(browser.detectZone('SERANG', 'A1977YX')).toEqual({ zone: 2, source: 'plate', confident: true });
    expect(browser.detectZone('SAMARINDA', 'KT8199MD')).toEqual({ zone: 3, source: 'plate', confident: true });
    // No plate at all — falls back to the region-text keyword map.
    expect(browser.detectZone('BANDUNG', '')).toEqual({ zone: 2, source: 'region', confident: true });
    // Neither matches — default Zone 3, flagged unconfident for manual review.
    expect(browser.detectZone('KOTA ANTAH BERANTAH', '')).toEqual({ zone: 3, source: 'default', confident: false });
  });

  it('batch totals aggregate cleanly across mixed vehicle classes', () => {
    const items = [
      browser.calcBulkPremium({ vehicleClass: 'MOTORCYCLE', zone: 2, financingValue: 2_500_000, otr: 6_000_000, tenorMonths: 12 }),
      browser.calcBulkPremium({ vehicleClass: 'HEAVY_EQUIPMENT', zone: 3, financingValue: 1_000_000_000, otr: 1_100_000_000, tenorMonths: 3 }),
    ];
    const totals = browser.calcBulkTotals(items);
    expect(totals.itemCount).toBe(2);
    expect(totals.totalAmount).toBe(58_750 + 1_871_250);
    expect(totals.totalAmount).toBe(items[0].totalPremium + items[1].totalPremium);
  });
});

// ─── Order unit multi-tahun (v2.8.23) ───────────────────────────────────────
// Arahan owner: polis sampai 6 tahun, nilai pertanggungan menyusut 10% per
// tahun (majemuk), diskon maksimum mengikuti rate set (25% standar) dan boleh
// diturunkan klien. Rate dikunci dari tahun pertama; biaya admin sekali.
describe('b2bFleetRating — order unit multi-tahun', () => {
  // Pickup Zona 1: rate datar 0.88% — angka per tahun mudah diverifikasi manual.
  const base = { vehicleClass: 'CAR' as const, zone: 1 as const, financingValue: 100_000_000, otr: 0, commercialBodyHint: true };

  it('tanpa depreciationRate, hasil identik dengan perilaku lama (impor massal tidak berubah)', () => {
    const lama = browser.calcBulkPremium({ ...base, tenorMonths: 36 });
    expect(lama.premiumGross).toBe(Math.round(100_000_000 * 0.0088 * 3)); // 2.640.000
    expect(lama.depreciationRate).toBe(0);
    expect(lama.schedule).toEqual([]);
    expect(lama.discountRate).toBe(browser.DISCOUNT_RATE_STANDARD);
  });

  it('6 tahun: TSI menyusut 10% majemuk per tahun — 100jt → 59.049.000 di tahun ke-6', () => {
    const r = browser.calcBulkPremium({ ...base, tenorMonths: 72, depreciationRate: browser.MULTI_YEAR_DEPRECIATION_RATE });
    expect(r.schedule.map(s => s.sumInsured)).toEqual([100_000_000, 90_000_000, 81_000_000, 72_900_000, 65_610_000, 59_049_000]);
    expect(r.schedule.map(s => s.months)).toEqual([12, 12, 12, 12, 12, 12]);
    expect(r.schedule.map(s => s.premiumGross)).toEqual([880_000, 792_000, 712_800, 641_520, 577_368, 519_631]);
    expect(r.depreciationRate).toBe(0.1);
  });

  it('premi gross = jumlah premi per tahun; diskon dan biaya admin dikenakan sekali', () => {
    const r = browser.calcBulkPremium({ ...base, tenorMonths: 72, depreciationRate: 0.1 });
    const sum = r.schedule.reduce((s, row) => s + row.premiumGross, 0);
    expect(r.premiumGross).toBe(sum);                      // 4.123.319
    expect(r.premiumGross).toBe(4_123_319);
    expect(r.discountAmount).toBe(Math.round(sum * 0.25)); // 25% dari gross
    expect(r.adminFee).toBe(browser.ADMIN_FEE_CAR);        // sekali, bukan × 6
    expect(r.totalPremium).toBe(sum - r.discountAmount + browser.ADMIN_FEE_CAR);
  });

  it('multi-tahun lebih murah daripada tanpa penyusutan untuk jangka waktu yang sama', () => {
    const susut = browser.calcBulkPremium({ ...base, tenorMonths: 72, depreciationRate: 0.1 });
    const datar = browser.calcBulkPremium({ ...base, tenorMonths: 72 });
    expect(susut.premiumGross).toBeLessThan(datar.premiumGross);
  });

  it('18 bulan: tahun kedua hanya 6 bulan dengan TSI 90%', () => {
    const r = browser.calcBulkPremium({ ...base, tenorMonths: 18, depreciationRate: 0.1 });
    expect(r.schedule).toEqual([
      { year: 1, months: 12, sumInsured: 100_000_000, premiumGross: 880_000 },
      { year: 2, months: 6, sumInsured: 90_000_000, premiumGross: 396_000 },
    ]);
    expect(r.premiumGross).toBe(1_276_000);
  });

  it('jangka waktu ≤ 12 bulan tidak pernah menyusut walau diminta', () => {
    for (const tenorMonths of [6, 12]) {
      const r = browser.calcBulkPremium({ ...base, tenorMonths, depreciationRate: 0.1 });
      expect(r.depreciationRate).toBe(0);
      expect(r.schedule).toEqual([]);
      expect(r.premiumGross).toBe(Math.round(100_000_000 * 0.0088 * (tenorMonths / 12)));
    }
  });

  it('penyusutan dijepit ke pagar mesin dan nilai aneh diabaikan', () => {
    expect(browser.calcBulkPremium({ ...base, tenorMonths: 24, depreciationRate: 5 }).depreciationRate).toBe(browser.MAX_DEPRECIATION_RATE);
    expect(browser.calcBulkPremium({ ...base, tenorMonths: 24, depreciationRate: -1 }).depreciationRate).toBe(0);
    expect(browser.calcBulkPremium({ ...base, tenorMonths: 24, depreciationRate: Number.NaN }).depreciationRate).toBe(0);
  });

  it('diskon pilihan klien hanya bisa MENURUNKAN — tidak pernah melewati diskon rate set', () => {
    const turun = browser.calcBulkPremium({ ...base, tenorMonths: 12, discountRateOverride: 0.1 });
    expect(turun.discountRate).toBe(0.1);
    expect(turun.discountAmount).toBe(88_000);
    const nol = browser.calcBulkPremium({ ...base, tenorMonths: 12, discountRateOverride: 0 });
    expect(nol.discountAmount).toBe(0);
    expect(nol.totalPremium).toBe(880_000 + browser.ADMIN_FEE_CAR);
    // Minta 90% → tetap plafon 25% (standar) / 15% (alat berat).
    expect(browser.calcBulkPremium({ ...base, tenorMonths: 12, discountRateOverride: 0.9 }).discountRate).toBe(browser.DISCOUNT_RATE_STANDARD);
    expect(browser.calcBulkPremium({ vehicleClass: 'HEAVY_EQUIPMENT', zone: 3, financingValue: 1_000_000_000, otr: 0, tenorMonths: 12, discountRateOverride: 0.25 }).discountRate).toBe(browser.DISCOUNT_RATE_HEAVY);
    expect(browser.calcBulkPremium({ ...base, tenorMonths: 12, discountRateOverride: -0.5 }).discountRate).toBe(0);
  });

  it('buildLineItem meneruskan penyusutan dan diskon pilihan ke mesin', () => {
    const li = browser.buildLineItem({
      rowNo: 1, nasabahName: 'PT Contoh', tenorMonths: 36, financingValue: 100_000_000, jenisBrg: 'MOBIL',
      otr: 0, vehicleClassOverride: 'CAR', commercialBodyOverride: true, zoneOverride: 1,
      depreciationRate: 0.1, discountRateOverride: 0.2,
    });
    expect(li.schedule).toHaveLength(3);
    expect(li.premiumGross).toBe(880_000 + 792_000 + 712_800);
    expect(li.discountRate).toBe(0.2);
  });

  it('tanggal: akhir pertanggungan = tanggal yang sama N bulan kemudian, ujung bulan dijepit', () => {
    expect(browser.addMonthsToIsoDate('2026-11-12', 12)).toBe('2027-11-12');
    expect(browser.addMonthsToIsoDate('2026-11-12', 72)).toBe('2032-11-12');
    expect(browser.addMonthsToIsoDate('2026-11-12', 6)).toBe('2027-05-12');
    expect(browser.addMonthsToIsoDate('2027-01-31', 1)).toBe('2027-02-28');
    expect(browser.addMonthsToIsoDate('2028-02-29', 12)).toBe('2029-02-28');
    expect(browser.addMonthsToIsoDate('2026-02-31', 12)).toBe('');
    expect(browser.isValidIsoDate('2026-11-12')).toBe(true);
    expect(browser.isValidIsoDate('2026-02-31')).toBe(false);
    expect(browser.isValidIsoDate('12/11/2026')).toBe(false);
    expect(browser.isValidIsoDate(null)).toBe(false);
  });
});

// ─── Comprehensive di order unit (v2.8.24) ──────────────────────────────────
// Laporan owner: order polis satuan B2B tidak punya Comprehensive. Tarif:
// batas bawah SEOJK No. 6/SEOJK.05/2017 Lampiran IV Tabel IV.A.
describe('b2bFleetRating — comprehensive', () => {
  it('tanpa coverage, hasilnya tetap TLO (impor massal tidak berubah)', () => {
    const r = browser.calcBulkPremium({ vehicleClass: 'CAR', zone: 2, financingValue: 227_845_800, otr: 227_845_800, tenorMonths: 12 });
    expect(r.coverage).toBe('TLO');
    expect(r.rate).toBe(0.0038);
  });

  it('mobil penumpang: tarif mengikuti kategori OTR dan zona', () => {
    // Kategori 3 (>200–400 jt), Zona 2 → 2,08%.
    const r = browser.calcBulkPremium({ vehicleClass: 'CAR', zone: 2, financingValue: 227_845_800, otr: 227_845_800, tenorMonths: 12, coverage: 'COMPREHENSIVE' });
    expect(r.coverage).toBe('COMPREHENSIVE');
    expect(r.rate).toBe(0.0208);
    expect(r.premiumGross).toBe(4_739_193);
    expect(r.discountAmount).toBe(1_184_798);
    expect(r.totalPremium).toBe(4_739_193 - 1_184_798 + browser.ADMIN_FEE_CAR);
    // Kategori 1 (≤125 jt), Zona 1 → 3,82%; kategori 5 (>800 jt) → 1,05%.
    expect(browser.calcBulkPremium({ vehicleClass: 'CAR', zone: 1, financingValue: 100_000_000, otr: 100_000_000, tenorMonths: 12, coverage: 'COMPREHENSIVE' }).rate).toBe(0.0382);
    expect(browser.calcBulkPremium({ vehicleClass: 'CAR', zone: 3, financingValue: 900_000_000, otr: 900_000_000, tenorMonths: 12, coverage: 'COMPREHENSIVE' }).rate).toBe(0.0105);
  });

  it('pickup/truk: tarif comprehensive kategori 6 per zona', () => {
    const rate = (zone: 1 | 2 | 3) => browser.calcBulkPremium({ vehicleClass: 'CAR', zone, financingValue: 100_000_000, otr: 0, tenorMonths: 12, commercialBodyHint: true, coverage: 'COMPREHENSIVE' }).rate;
    expect([rate(1), rate(2), rate(3)]).toEqual([0.0242, 0.0239, 0.0223]);
  });

  it('motor: 3,18% di semua zona', () => {
    for (const zone of [1, 2, 3] as const) {
      expect(browser.calcBulkPremium({ vehicleClass: 'MOTORCYCLE', zone, financingValue: 16_800_000, otr: 16_800_000, tenorMonths: 12, coverage: 'COMPREHENSIVE' }).rate).toBe(0.0318);
    }
  });

  it('alat berat tetap TLO walau Comprehensive diminta', () => {
    const r = browser.calcBulkPremium({ vehicleClass: 'HEAVY_EQUIPMENT', zone: 3, financingValue: 900_000_000, otr: 0, tenorMonths: 12, coverage: 'COMPREHENSIVE' });
    expect(r.coverage).toBe('TLO');
    expect(r.rate).toBe(browser.HEAVY_EQUIPMENT_TLO_RATE);
  });

  it('comprehensive selalu lebih mahal daripada TLO untuk unit yang sama', () => {
    for (const zone of [1, 2, 3] as const) {
      for (const otr of [100_000_000, 250_000_000, 900_000_000]) {
        const base = { vehicleClass: 'CAR' as const, zone, financingValue: otr, otr, tenorMonths: 12 };
        expect(browser.calcBulkPremium({ ...base, coverage: 'COMPREHENSIVE' }).premiumGross)
          .toBeGreaterThan(browser.calcBulkPremium({ ...base, coverage: 'TLO' }).premiumGross);
      }
    }
  });

  it('rate set admin tanpa tabel comprehensive pickup jatuh ke tarif bawaan', () => {
    const { pickupTruckCompMin: _drop, ...legacy } = { ...browser.DEFAULT_BULK_RATE_CONFIG, pickupTruckCompMin: undefined };
    void _drop;
    const r = browser.calcBulkPremium({ vehicleClass: 'CAR', zone: 2, financingValue: 100_000_000, otr: 0, tenorMonths: 12, commercialBodyHint: true, coverage: 'COMPREHENSIVE' }, legacy);
    expect(r.rate).toBe(0.0239);
  });

  it('multi-tahun dan diskon pilihan tetap bekerja di Comprehensive', () => {
    const r = browser.buildLineItem({
      rowNo: 1, nasabahName: 'PT Contoh', tenorMonths: 24, financingValue: 100_000_000, jenisBrg: 'MOBIL',
      otr: 100_000_000, vehicleClassOverride: 'CAR', zoneOverride: 1, coverage: 'COMPREHENSIVE',
      depreciationRate: 0.1, discountRateOverride: 0.1,
    });
    expect(r.coverage).toBe('COMPREHENSIVE');
    expect(r.schedule.map(s => s.premiumGross)).toEqual([3_820_000, 3_438_000]);
    expect(r.discountRate).toBe(0.1);
  });
});
