// Guards Pathy's product catalogue.
//
// The bug this replaces was not a forbidden topic — it was an absent one. The
// system prompt described only motor flows, so Pathy generalised to motor-only.
// These tests hold two lines: every catalogued product must actually reach the
// prompt, and the non-motor lines must never be priced.

import { describe, it, expect } from 'vitest';
import {
  PRODUCT_CATALOG,
  PLATFORM_SERVICES,
  catalogSection,
} from '../../supabase/functions/pathy-agent/catalog';

describe('PRODUCT_CATALOG', () => {
  it('mencakup lini non-kendaraan yang memang ada di aplikasi', () => {
    const names = PRODUCT_CATALOG.map(l => l.name.toLowerCase()).join(' | ');
    expect(names).toMatch(/jiwa/);
    expect(names).toMatch(/kesehatan kumpulan/);
    expect(names).toMatch(/armada/);
    expect(names).toMatch(/bond/);
  });

  it('hanya kendaraan yang boleh dihitung preminya', () => {
    const quotable = PRODUCT_CATALOG.filter(l => l.kind === 'QUOTABLE');
    expect(quotable).toHaveLength(2);
    for (const l of quotable) {
      expect(l.name.toLowerCase()).toMatch(/kendaraan/);
    }
  });

  it('lini jiwa dan korporasi ditandai sebagai pengajuan, bukan quote', () => {
    for (const name of ['Asuransi Jiwa', 'Asuransi Kesehatan Kumpulan (karyawan)']) {
      const line = PRODUCT_CATALOG.find(l => l.name === name);
      expect(line, `${name} hilang dari katalog`).toBeTruthy();
      expect(line!.kind).toBe('SUBMISSION');
    }
  });

  it('setiap entri punya varian konkret', () => {
    for (const l of PRODUCT_CATALOG) {
      expect(l.variants.length, `${l.name} tanpa varian`).toBeGreaterThan(0);
      expect(l.where.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('catalogSection()', () => {
  const section = catalogSection();

  it('menyebut SETIAP produk di katalog — produk yang tidak sampai ke prompt tidak terlihat oleh Pathy', () => {
    for (const l of PRODUCT_CATALOG) {
      expect(section, `${l.name} tidak masuk prompt`).toContain(l.name);
    }
  });

  it('menyebut setiap layanan platform', () => {
    for (const s of PLATFORM_SERVICES) {
      expect(section).toContain(s);
    }
  });

  it('melarang mengarang premi untuk lini non-kendaraan', () => {
    expect(section).toMatch(/estimate_premium HANYA untuk kendaraan/i);
    expect(section).toMatch(/DILARANG menghitung, mengarang/i);
  });

  it('jujur bahwa kesehatan perorangan belum tersedia', () => {
    expect(section).toMatch(/kesehatan perorangan/i);
    expect(section).toMatch(/belum tersedia/i);
  });

  it('tetap mengizinkan edukasi umum lintas lini tanpa angka', () => {
    expect(section).toMatch(/edukasi, bukan penawaran/i);
  });

  it('memisahkan yang bisa di-quote dari yang lewat pengajuan', () => {
    const quotableAt = section.indexOf('Bisa dihitung preminya');
    const submissionAt = section.indexOf('lewat pengajuan/konsultasi');
    expect(quotableAt).toBeGreaterThan(-1);
    expect(submissionAt).toBeGreaterThan(quotableAt);
  });
});
