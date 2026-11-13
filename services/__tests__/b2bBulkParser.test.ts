import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { prepareB2BDocument, B2B_DOC_ACCEPT, B2B_DOC_MAX_BYTES } from '../storage';
import {
  autoMapColumns, buildRawRows, parseBulkFile, findHeaderRow, missingRequiredFields, mappingNotices, toNumber,
} from '../b2bBulkParser';

describe('b2bBulkParser — column auto-mapping', () => {
  it('maps the PT MMF export headers onto canonical fields', () => {
    const headers = [
      'NO.', 'NAMA', 'NO. KTP', 'NO. HP', 'ALAMAT', 'NO. KONTRAK', 'TGL KONTRAK',
      'TENOR', 'NILAI PENCAIRAN / PEMBIAYAAN', 'JENIS BRG', 'MERK', 'TYPE',
      'TAHUN', 'OTR', 'NO. POLISI', 'NO. RANGKA', 'NO. MESIN', 'NO. BPKB',
      'WILAYAH', 'COVERAGE', 'ZONA OJK', 'RATE TLO BATAS BAWAH',
      'PREMI GROSS (MINIMUM Rp50.000)', 'DISC (25% MOTOR/MOBIL; 15% ALAT BERAT)',
      'PREMI SETELAH DISC', 'BIAYA ADMIN (Rp)', 'TOTAL PREMI',
    ];
    const mapping = autoMapColumns(headers);
    expect(mapping.nasabahName).toBe(1);
    expect(mapping.nasabahKtp).toBe(2);
    expect(mapping.financingValue).toBe(8);
    expect(mapping.jenisBrg).toBe(9);
    expect(mapping.otr).toBe(13);
    expect(mapping.plateNo).toBe(14);
    expect(mapping.regionText).toBe(18);
    expect(mapping.referenceZone).toBe(20);
    expect(mapping.referenceTotalPremium).toBe(26);
  });

  it('builds normalized rows, skips a trailing blank row', () => {
    const headers = ['NAMA', 'TENOR', 'NILAI PENCAIRAN', 'JENIS BRG', 'OTR', 'NO. POLISI', 'WILAYAH'];
    const mapping = autoMapColumns(headers);
    const rows = [
      ['DENI KASSUARI', '12', 2_500_000, 'MOTOR BEKAS', 6_000_000, 'B6948UQO', 'GALUR'],
      [null, null, null, null, null, null, null],
    ];
    const built = buildRawRows({ headers, rows }, mapping);
    expect(built).toHaveLength(1);
    expect(built[0].nasabahName).toBe('DENI KASSUARI');
    expect(built[0].tenorMonths).toBe(12);
    expect(built[0].financingValue).toBe(2_500_000);
    expect(built[0].jenisBrg).toBe('MOTOR BEKAS');
    expect(built[0].otr).toBe(6_000_000);
    expect(built[0].plateNo).toBe('B6948UQO');
    expect(built[0].regionText).toBe('GALUR');
  });

  it('parses a CSV upload end to end', async () => {
    const csv = 'NAMA,TENOR,NILAI PENCAIRAN,JENIS BRG,OTR,NO. POLISI,WILAYAH\nDENI KASSUARI,12,2500000,MOTOR BEKAS,6000000,B6948UQO,GALUR\n';
    const file = new File([csv], 'test.csv', { type: 'text/csv' });
    const sheet = await parseBulkFile(file);
    expect(sheet.headers[0]).toBe('NAMA');
    const mapping = autoMapColumns(sheet.headers);
    const rows = buildRawRows(sheet, mapping);
    expect(rows).toHaveLength(1);
    expect(rows[0].nasabahName).toBe('DENI KASSUARI');
    expect(rows[0].financingValue).toBe(2_500_000);
  });
});

// ─── v2.8.24 — laporan owner: "menu upload data excel tidak bisa membaca data
// sama sekali". Penyebabnya: baris PERTAMA file selalu dianggap header, padahal
// ekspor nyata hampir selalu punya judul laporan di atasnya; dan nama kolom
// yang sedikit berbeda dari file mitra pilot tidak dikenali.
describe('b2bBulkParser — file dunia nyata', () => {
  const xlsxFile = (aoa: unknown[][], name = 'data.xlsx', extraSheets: Record<string, unknown[][]> = {}) => {
    const wb = XLSX.utils.book_new();
    for (const [sheetName, rows] of Object.entries(extraSheets)) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheetName);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Data');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    return new File([buf], name);
  };
  const DATA = [
    [1, 'Budi Santoso', 12, 150_000_000, 'MOBIL', 'TOYOTA', 'AVANZA 1.5 G', 2022, 240_000_000, 'B 1234 XYZ', 'JAKARTA'],
    [2, 'Sari Wulandari', 24, 12_000_000, 'MOTOR', 'HONDA', 'BEAT CBS', 2023, 19_000_000, 'D 4321 ABC', 'BANDUNG'],
  ];
  const STD = ['No', 'NAMA NASABAH', 'TENOR', 'NILAI PENCAIRAN', 'JENIS BRG', 'MERK', 'TYPE', 'TAHUN', 'OTR', 'NO. POLISI', 'WILAYAH'];

  it('menemukan header walau ada judul laporan dan baris kosong di atasnya', async () => {
    const file = xlsxFile([['DAFTAR PENGAJUAN ASURANSI — PT CONTOH'], ['Periode: November 2026'], [], STD, ...DATA]);
    const sheet = await parseBulkFile(file);
    expect(sheet.headerRowIndex).toBe(3);
    expect(sheet.headers).toContain('NAMA NASABAH');
    const mapping = autoMapColumns(sheet.headers);
    expect(missingRequiredFields(mapping)).toEqual([]);
    const rows = buildRawRows(sheet, mapping);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ nasabahName: 'Budi Santoso', financingValue: 150_000_000, otr: 240_000_000, tenorMonths: 12, make: 'TOYOTA', typeName: 'AVANZA 1.5 G', plateNo: 'B 1234 XYZ' });
    expect(rows[1]).toMatchObject({ nasabahName: 'Sari Wulandari', jenisBrg: 'MOTOR', tenorMonths: 24 });
  });

  it('mengenali nama kolom yang berbeda dari file mitra pilot', () => {
    const headers = ['No.', 'Nama Konsumen', 'NIK', 'Telepon', 'Alamat Lengkap', 'Nomor Perjanjian', 'Jangka Waktu (bln)', 'Nilai Pertanggungan', 'Jenis Kendaraan', 'Merek', 'Model', 'Tahun Pembuatan', 'Harga Kendaraan', 'Nopol', 'Cabang'];
    const m = autoMapColumns(headers);
    expect(m.nasabahName).toBe(1);
    expect(m.nasabahKtp).toBe(2);
    expect(m.nasabahPhone).toBe(3);
    expect(m.nasabahAddress).toBe(4);
    expect(m.contractNo).toBe(5);
    expect(m.tenorMonths).toBe(6);
    expect(m.financingValue).toBe(7);
    expect(m.jenisBrg).toBe(8);
    expect(m.make).toBe(9);
    expect(m.typeName).toBe(10);
    expect(m.modelYear).toBe(11);
    expect(m.otr).toBe(12);
    expect(m.plateNo).toBe(13);
    expect(m.regionText).toBe(14);
  });

  it('tidak salah menangkap kolom yang hanya mirip', () => {
    // "OTR" bukan bagian dari "KONTRAK"; "NAMA CABANG" bukan nama nasabah;
    // kolom premi/rate bukan nilai pertanggungan.
    const m = autoMapColumns(['NAMA CABANG', 'NAMA DEBITUR', 'NO KONTRAK', 'RATE PREMI', 'PREMI PERTANGGUNGAN', 'PLAFON']);
    expect(m.nasabahName).toBe(1);
    expect(m.otr).toBeNull();
    expect(m.contractNo).toBe(2);
    expect(m.financingValue).toBe(5);
    expect(m.regionText).toBe(0);
  });

  it('memilih sheet data, bukan sheet catatan yang lebih panjang', async () => {
    const notes = Array.from({ length: 30 }, (_, i) => [`Catatan audit baris ${i + 1}`]);
    const sheet = await parseBulkFile(xlsxFile([STD, ...DATA], 'multi.xlsx', { 'AUDIT LENGKAP': notes }));
    expect(sheet.sheetName).toBe('Data');
    expect(buildRawRows(sheet, autoMapColumns(sheet.headers))).toHaveLength(2);
  });

  it('membuang baris TOTAL dan baris kosong di kaki tabel', () => {
    const sheet = { headers: STD, rows: [...DATA, [null, null, null, null, null, null, null, null, null, null, null], ['TOTAL', null, null, 162_000_000, null, null, null, null, 259_000_000, null, null], [null, 'Mengetahui,', null, null, null, null, null, null, null, null, null]] };
    const rows = buildRawRows(sheet, autoMapColumns(STD));
    expect(rows.map(r => r.nasabahName)).toEqual(['Budi Santoso', 'Sari Wulandari']);
  });

  it('tanpa kolom nilai pencairan, OTR dipakai sebagai nilai pertanggungan dan diberitahukan', () => {
    const headers = ['NAMA', 'MERK', 'TYPE', 'HARGA OTR'];
    const m = autoMapColumns(headers);
    expect(m.financingValue).toBeNull();
    expect(missingRequiredFields(m)).toEqual([]);
    expect(mappingNotices(m).join(' ')).toMatch(/OTR/);
    const rows = buildRawRows({ headers, rows: [['Andi', 'HONDA', 'BRIO', 'Rp 180.000.000']] }, m);
    expect(rows[0].financingValue).toBe(180_000_000);
    expect(rows[0].tenorMonths).toBe(12);
  });

  it('melaporkan field wajib yang benar-benar hilang', () => {
    expect(missingRequiredFields(autoMapColumns(['MERK', 'TYPE', 'TAHUN']))).toEqual(['nasabahName', 'financingValue']);
  });

  it('tenor bertuliskan tahun dikonversi ke bulan', () => {
    const headers = ['NAMA', 'NILAI PEMBIAYAAN', 'JANGKA WAKTU (TAHUN)'];
    const rows = buildRawRows({ headers, rows: [['Andi', 50_000_000, 3]] }, autoMapColumns(headers));
    expect(rows[0].tenorMonths).toBe(36);
  });

  it('membaca angka uang dalam format Indonesia maupun internasional', () => {
    expect(toNumber('Rp 150.000.000')).toBe(150_000_000);
    expect(toNumber('150,000,000')).toBe(150_000_000);
    expect(toNumber('1.234.567,89')).toBeCloseTo(1_234_567.89);
    expect(toNumber('1,234,567.89')).toBeCloseTo(1_234_567.89);
    expect(toNumber('2.500')).toBe(2_500);
    expect(toNumber('12,5')).toBe(12.5);
    expect(toNumber('12.5')).toBe(12.5);
    expect(toNumber(42)).toBe(42);
    expect(toNumber('')).toBe(0);
    expect(toNumber(null)).toBe(0);
  });

  it('CSV dengan BOM, pemisah titik koma, dan judul di atas header', async () => {
    const csv = '﻿LAPORAN PEMBIAYAAN\n\nNAMA;TENOR;NILAI PENCAIRAN;JENIS BRG;OTR\nDENI;12;2.500.000;MOTOR;6.000.000\n';
    const sheet = await parseBulkFile(new File([csv], 'x.csv', { type: 'text/csv' }));
    expect(sheet.headers[0]).toBe('NAMA');
    const rows = buildRawRows(sheet, autoMapColumns(sheet.headers));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ nasabahName: 'DENI', financingValue: 2_500_000, otr: 6_000_000 });
  });

  it('findHeaderRow jatuh ke baris berisi pertama bila tidak ada yang dikenali', () => {
    expect(findHeaderRow([[], [null, null], ['foo', 'bar'], ['1', '2']])).toBe(2);
  });
});

// ─── v2.8.24 — unggah dokumen B2B yang "diam saja" ──────────────────────────
// Bucket b2b-documents menolak tipe MIME di luar daftarnya. Di sebagian
// perangkat file.type untuk Excel/CSV kosong, sehingga file sah ditolak dan
// (sebelum perbaikan) layar tidak menampilkan apa pun.
describe('prepareB2BDocument', () => {
  const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  it('mengisi tipe MIME dari ekstensi bila peramban tidak memberinya', () => {
    for (const [name, type, expected] of [
      ['armada.xlsx', '', XLSX_MIME],
      ['armada.XLSX', 'application/octet-stream', XLSX_MIME],
      ['lama.xls', '', 'application/vnd.ms-excel'],
      ['data.csv', '', 'text/csv'],
      ['npwp.pdf', '', 'application/pdf'],
    ] as const) {
      const r = prepareB2BDocument(new File(['x'], name, { type }));
      expect('file' in r && r.file.type, name).toBe(expected);
      expect('file' in r && r.file.name).toBe(name);
    }
  });

  it('membiarkan file yang tipenya sudah benar apa adanya', () => {
    const f = new File(['x'], 'a.xlsx', { type: XLSX_MIME });
    const r = prepareB2BDocument(f);
    expect('file' in r && r.file).toBe(f);
    // CSV di Windows sering berlabel application/vnd.ms-excel — itu diterima bucket.
    const csv = prepareB2BDocument(new File(['x'], 'a.csv', { type: 'application/vnd.ms-excel' }));
    expect('file' in csv && csv.file.type).toBe('application/vnd.ms-excel');
  });

  it('menolak dengan alasan yang bisa dibaca: tipe asing, terlalu besar, kosong', () => {
    const exe = prepareB2BDocument(new File(['x'], 'a.exe', { type: 'application/x-msdownload' }));
    expect('error' in exe && exe.error).toMatch(/tidak didukung/);
    const big = new File(['x'], 'besar.xlsx', { type: XLSX_MIME });
    Object.defineProperty(big, 'size', { value: B2B_DOC_MAX_BYTES + 1 });
    const bigR = prepareB2BDocument(big);
    expect('error' in bigR && bigR.error).toMatch(/10 MB/);
    const empty = prepareB2BDocument(new File([], 'kosong.xlsx', { type: XLSX_MIME }));
    expect('error' in empty && empty.error).toMatch(/kosong/);
  });

  it('atribut accept memuat ekstensi dan tipe MIME (pemilih file ponsel butuh MIME)', () => {
    expect(B2B_DOC_ACCEPT).toContain('.xlsx');
    expect(B2B_DOC_ACCEPT).toContain(XLSX_MIME);
    expect(B2B_DOC_ACCEPT).toContain('text/csv');
  });
});
