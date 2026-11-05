import { describe, it, expect } from 'vitest';
import { autoMapColumns, buildRawRows, parseBulkFile } from '../b2bBulkParser';

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
