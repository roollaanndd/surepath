// Client-side parser for B2B bulk fleet TLO uploads (.xlsx/.xls/.csv).
//
// Reads whatever sheet/header layout the multifinance partner exports —
// column names vary between companies — and fuzzy-maps them onto the
// canonical RawBulkRow shape that services/b2bFleetRating.ts rates. Never
// trust the file's own computed columns (rate/premium) for money; they're
// only kept as a reference the rating engine compares itself against.
import type { RawBulkRow, Zone } from './b2bFleetRating';

export interface ParsedSheet {
  headers: string[];
  rows: unknown[][];
}

// Canonical field → header aliases (uppercased, matched by substring so
// minor punctuation/spacing differences don't break detection).
const FIELD_ALIASES: Record<string, string[]> = {
  nasabahName:      ['NAMA', 'NAMA NASABAH', 'NAMA DEBITUR'],
  nasabahKtp:       ['NO. KTP', 'NO KTP', 'NIK'],
  nasabahPhone:     ['NO. HP', 'NO HP', 'TELEPON', 'TELP'],
  nasabahAddress:   ['ALAMAT'],
  contractNo:       ['NO. KONTRAK', 'NO KONTRAK', 'NOMOR KONTRAK'],
  contractDate:     ['TGL KONTRAK', 'TANGGAL KONTRAK'],
  tenorMonths:      ['TENOR'],
  financingValue:   ['NILAI PENCAIRAN', 'NILAI PEMBIAYAAN', 'PEMBIAYAAN', 'POKOK PEMBIAYAAN'],
  jenisBrg:         ['JENIS BRG', 'JENIS BARANG', 'JENIS KENDARAAN'],
  make:             ['MERK'],
  typeName:         ['TYPE', 'TIPE'],
  modelYear:        ['TAHUN'],
  otr:              ['OTR'],
  plateNo:          ['NO. POLISI', 'NO POLISI', 'NOPOL', 'PLAT'],
  chassisNo:        ['NO. RANGKA', 'NO RANGKA'],
  engineNo:         ['NO. MESIN', 'NO MESIN'],
  bpkbNo:           ['NO. BPKB', 'NO BPKB'],
  regionText:       ['WILAYAH', 'KOTA', 'CABANG'],
  referenceZone:    ['ZONA OJK', 'ZONA', 'ZONE'],
  referenceTotalPremium: ['TOTAL PREMI'],
};

export type ColumnMapping = Record<keyof typeof FIELD_ALIASES, number | null>;

export function autoMapColumns(headers: string[]): ColumnMapping {
  const upper = headers.map(h => (h ?? '').toString().trim().toUpperCase());
  const mapping = {} as ColumnMapping;
  for (const field of Object.keys(FIELD_ALIASES) as Array<keyof typeof FIELD_ALIASES>) {
    const aliases = FIELD_ALIASES[field];
    let found: number | null = null;
    for (const alias of aliases) {
      const idx = upper.findIndex(h => h === alias || h.includes(alias));
      if (idx !== -1) { found = idx; break; }
    }
    mapping[field] = found;
  }
  return mapping;
}

export const FIELD_LABELS: Record<keyof typeof FIELD_ALIASES, string> = {
  nasabahName: 'Nama Nasabah', nasabahKtp: 'No. KTP', nasabahPhone: 'No. HP',
  nasabahAddress: 'Alamat', contractNo: 'No. Kontrak', contractDate: 'Tgl Kontrak',
  tenorMonths: 'Tenor (bulan)', financingValue: 'Nilai Pencairan/Pembiayaan',
  jenisBrg: 'Jenis Barang', make: 'Merk', typeName: 'Type', modelYear: 'Tahun',
  otr: 'OTR', plateNo: 'No. Polisi', chassisNo: 'No. Rangka', engineNo: 'No. Mesin',
  bpkbNo: 'No. BPKB', regionText: 'Wilayah', referenceZone: 'Zona (pada file)',
  referenceTotalPremium: 'Total Premi (pada file)',
};

export const REQUIRED_FIELDS: Array<keyof typeof FIELD_ALIASES> = [
  'nasabahName', 'tenorMonths', 'financingValue', 'jenisBrg', 'otr',
];

// ─── Value normalizers ──────────────────────────────────────────────────────

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (v == null) return 0;
  const s = String(v).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function toText(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function toDateIso(v: unknown): string | undefined {
  if (v == null || v === '') return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return undefined;
}

function toZone(v: unknown): Zone | undefined {
  const s = toText(v).toUpperCase();
  const m = s.match(/[123]/);
  if (!m) return undefined;
  const z = Number(m[0]);
  return (z === 1 || z === 2 || z === 3) ? z : undefined;
}

// ─── Build RawBulkRow[] from parsed sheet + mapping ───────────────────────

export function buildRawRows(sheet: ParsedSheet, mapping: ColumnMapping): RawBulkRow[] {
  const get = (row: unknown[], field: keyof typeof FIELD_ALIASES): unknown => {
    const idx = mapping[field];
    return idx == null ? undefined : row[idx];
  };

  return sheet.rows
    .map((row, i): RawBulkRow | null => {
      const nasabahName = toText(get(row, 'nasabahName'));
      const jenisBrg = toText(get(row, 'jenisBrg'));
      // A fully blank row (common trailing rows in exports) isn't a record.
      if (!nasabahName && !jenisBrg && row.every(c => c == null || c === '')) return null;
      return {
        rowNo: i + 1,
        nasabahName,
        nasabahKtp: toText(get(row, 'nasabahKtp')) || undefined,
        nasabahPhone: toText(get(row, 'nasabahPhone')) || undefined,
        nasabahAddress: toText(get(row, 'nasabahAddress')) || undefined,
        contractNo: toText(get(row, 'contractNo')) || undefined,
        contractDate: toDateIso(get(row, 'contractDate')),
        tenorMonths: toNumber(get(row, 'tenorMonths')) || 12,
        financingValue: toNumber(get(row, 'financingValue')),
        jenisBrg,
        make: toText(get(row, 'make')) || undefined,
        typeName: toText(get(row, 'typeName')) || undefined,
        modelYear: toNumber(get(row, 'modelYear')) || undefined,
        otr: toNumber(get(row, 'otr')),
        plateNo: toText(get(row, 'plateNo')) || undefined,
        chassisNo: toText(get(row, 'chassisNo')) || undefined,
        engineNo: toText(get(row, 'engineNo')) || undefined,
        bpkbNo: toText(get(row, 'bpkbNo')) || undefined,
        regionText: toText(get(row, 'regionText')) || undefined,
        referenceZone: toZone(get(row, 'referenceZone')),
        referenceTotalPremium: toNumber(get(row, 'referenceTotalPremium')) || undefined,
      };
    })
    .filter((r): r is RawBulkRow => r !== null);
}

// ─── File reading ───────────────────────────────────────────────────────────

async function parseCsv(text: string): Promise<ParsedSheet> {
  const lines = text.split(/\r\n|\n|\r/).filter(l => l.trim() !== '');
  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') { inQuotes = false; }
        else { cur += c; }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',' || c === ';') {
        out.push(cur); cur = '';
      } else {
        cur += c;
      }
    }
    out.push(cur);
    return out;
  };
  const rows = lines.map(splitLine);
  const headers = rows[0] ?? [];
  return { headers, rows: rows.slice(1) };
}

// SECURITY NOTE: the `xlsx` (SheetJS) package has known prototype-pollution
// and ReDoS advisories, and the fixed releases aren't published to npm (the
// maintainer moved distribution to cdn.sheetjs.com after a licensing
// dispute). ExcelJS was tried first to avoid that dependency, but it throws
// on real-world exports that carry legacy VML cell comments — exactly the
// shape of file B2B partners actually send (confirmed against the pilot
// partner's own reference file). The blast radius here is bounded: this
// only ever runs inside the uploading B2B client's own browser tab, parsing
// a file *they* chose to upload — never server-side, never on a third
// party's file, and the workbook's formulas/scripts are never evaluated,
// only cell values are read.
async function parseXlsx(file: File): Promise<ParsedSheet> {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });

  // Pick the sheet with the most rows — multifinance exports sometimes
  // carry a short notes/legend sheet (like this workbook's "AUDIT LENGKAP")
  // ahead of or alongside the actual data sheet.
  let bestName = wb.SheetNames[0];
  let bestRows = 0;
  for (const name of wb.SheetNames) {
    const ref = wb.Sheets[name]?.['!ref'];
    if (!ref) continue;
    const range = XLSX.utils.decode_range(ref);
    const rowCount = range.e.r - range.s.r + 1;
    if (rowCount > bestRows) { bestRows = rowCount; bestName = name; }
  }
  const sheet = wb.Sheets[bestName];
  if (!sheet) return { headers: [], rows: [] };

  const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
  const headers = (allRows[0] ?? []).map(h => (h == null ? '' : String(h)));
  return { headers, rows: allRows.slice(1) as unknown[][] };
}

export async function parseBulkFile(file: File): Promise<ParsedSheet> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = await file.text();
    return parseCsv(text);
  }
  return parseXlsx(file);
}
