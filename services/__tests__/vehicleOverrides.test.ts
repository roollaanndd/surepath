import { describe, expect, it } from 'vitest';
import { buildOverrideIndex, lookupInIndex } from '../vehicleOverrides';

const rows = [
  { brand: 'Toyota', model: 'Avanza 1.5 G', ref_year: 2024, market_value_rp: 210_000_000 },
  { brand: 'toyota', model: 'avanza   1.5 g', ref_year: 2025, market_value_rp: 230_000_000 },
  { brand: 'Honda', model: 'Brio Satya E', ref_year: 2023, market_value_rp: 130_000_000 },
];

describe('harga kendaraan dari CMS', () => {
  it('mencocokkan merek/model tanpa peduli huruf besar dan spasi ganda', () => {
    const index = buildOverrideIndex(rows);
    expect(lookupInIndex(index, 'TOYOTA', ' Avanza 1.5 G ', 2024)).toBe(210_000_000);
    expect(lookupInIndex(index, 'toyota', 'avanza 1.5 g', 2025)).toBe(230_000_000);
  });

  it('tahun yang diminta harus persis — tidak menebak tahun lain', () => {
    const index = buildOverrideIndex(rows);
    expect(lookupInIndex(index, 'Toyota', 'Avanza 1.5 G', 2022)).toBeNull();
  });

  it('tanpa tahun memakai harga tahun terbaru', () => {
    const index = buildOverrideIndex(rows);
    expect(lookupInIndex(index, 'Toyota', 'Avanza 1.5 G')).toBe(230_000_000);
  });

  it('baris tidak valid diabaikan, bukan menghasilkan harga nol', () => {
    const index = buildOverrideIndex([
      { brand: 'Toyota', model: 'Yaris', ref_year: 2025, market_value_rp: 0 },
      { brand: 'Toyota', model: 'Yaris', ref_year: 2025, market_value_rp: Number.NaN },
      { brand: '', model: 'Yaris', ref_year: 2025, market_value_rp: 100 },
    ]);
    expect(index.size).toBe(0);
    expect(lookupInIndex(index, 'Toyota', 'Yaris', 2025)).toBeNull();
  });

  it('baris duplikat: nilai terakhir yang menang', () => {
    const index = buildOverrideIndex([
      { brand: 'Honda', model: 'Brio', ref_year: 2025, market_value_rp: 100 },
      { brand: 'Honda', model: 'Brio', ref_year: 2025, market_value_rp: 150 },
    ]);
    expect(lookupInIndex(index, 'Honda', 'Brio', 2025)).toBe(150);
  });

  it('model yang tidak ada di CMS mengembalikan null (pemanggil pakai harga statis)', () => {
    const index = buildOverrideIndex(rows);
    expect(lookupInIndex(index, 'Suzuki', 'Ertiga', 2025)).toBeNull();
  });
});
