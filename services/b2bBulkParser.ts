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
  /** Baris (0-based) tempat header ditemukan di file. */
  headerRowIndex?: number;
  /** Nama sheet yang dibaca (hanya .xlsx/.xls). */
  sheetName?: string;
}

// Field kanonik → alias header. Dicocokkan setelah dinormalkan (huruf besar,
// tanda baca jadi spasi) dan per KATA, bukan sekadar substring: "OTR" tidak
// lagi cocok dengan "KONTRAK", "NAMA" tidak lagi merebut "NAMA CABANG".
const FIELD_ALIASES: Record<string, string[]> = {
  nasabahName:      ['NAMA NASABAH', 'NAMA DEBITUR', 'NAMA KONSUMEN', 'NAMA CUSTOMER', 'NAMA TERTANGGUNG', 'NAMA PEMILIK', 'NAMA LENGKAP', 'NASABAH', 'DEBITUR', 'KONSUMEN', 'TERTANGGUNG', 'CUSTOMER NAME', 'NAMA', 'NAME'],
  nasabahKtp:       ['NO KTP', 'NOMOR KTP', 'NIK', 'KTP'],
  nasabahPhone:     ['NO HP', 'NOMOR HP', 'NO TELEPON', 'NO TELP', 'TELEPON', 'TELP', 'HANDPHONE', 'HP', 'WHATSAPP', 'PHONE'],
  nasabahAddress:   ['ALAMAT'],
  contractNo:       ['NO KONTRAK', 'NOMOR KONTRAK', 'NO PERJANJIAN', 'NOMOR PERJANJIAN', 'NO PK', 'NO AGREEMENT', 'KONTRAK'],
  contractDate:     ['TGL KONTRAK', 'TANGGAL KONTRAK', 'TGL PERJANJIAN', 'TANGGAL PERJANJIAN', 'TGL AKAD', 'TANGGAL AKAD'],
  tenorMonths:      ['TENOR', 'JANGKA WAKTU', 'LAMA PERTANGGUNGAN', 'PERIODE', 'DURASI'],
  financingValue:   ['NILAI PENCAIRAN', 'NILAI PEMBIAYAAN', 'POKOK PEMBIAYAAN', 'NILAI PERTANGGUNGAN', 'UANG PERTANGGUNGAN', 'HARGA PERTANGGUNGAN', 'NILAI PINJAMAN', 'POKOK HUTANG', 'POKOK PINJAMAN', 'PLAFON', 'PLAFOND', 'TSI', 'SUM INSURED', 'PENCAIRAN', 'PEMBIAYAAN'],
  jenisBrg:         ['JENIS BRG', 'JENIS BARANG', 'JENIS KENDARAAN', 'JENIS UNIT', 'JENIS OBJEK', 'KATEGORI KENDARAAN', 'KATEGORI', 'JENIS'],
  make:             ['MERK', 'MEREK', 'BRAND', 'MAKE'],
  typeName:         ['TYPE', 'TIPE', 'MODEL', 'TYPE KENDARAAN', 'TIPE KENDARAAN'],
  modelYear:        ['TAHUN PEMBUATAN', 'TAHUN KENDARAAN', 'TAHUN PRODUKSI', 'TAHUN RAKITAN', 'TAHUN', 'THN', 'YEAR'],
  otr:              ['HARGA OTR', 'OTR', 'HARGA KENDARAAN', 'HARGA UNIT', 'HARGA PASAR', 'NILAI KENDARAAN', 'HARGA'],
  plateNo:          ['NO POLISI', 'NOMOR POLISI', 'NOPOL', 'NO POL', 'PLAT NOMOR', 'NO PLAT', 'PLAT', 'POLISI'],
  chassisNo:        ['NO RANGKA', 'NOMOR RANGKA', 'RANGKA'],
  engineNo:         ['NO MESIN', 'NOMOR MESIN', 'MESIN'],
  bpkbNo:           ['NO BPKB', 'NOMOR BPKB', 'BPKB'],
  regionText:       ['WILAYAH', 'KOTA', 'CABANG', 'DOMISILI', 'KABUPATEN', 'PROVINSI', 'AREA'],
  referenceZone:    ['ZONA OJK', 'ZONA', 'ZONE'],
  referenceTotalPremium: ['TOTAL PREMI'],
};

// Kata yang membatalkan kecocokan: "NAMA CABANG" bukan nama nasabah, dst.
const FIELD_EXCLUDES: Partial<Record<keyof typeof FIELD_ALIASES, string[]>> = {
  nasabahName: ['CABANG', 'DEALER', 'SALES', 'MARKETING', 'BARANG', 'KENDARAAN', 'ASURANSI', 'PRODUK', 'BANK', 'UNIT', 'IBU'],
  financingValue: ['PREMI', 'RATE', 'ADMIN', 'DISC', 'DISKON'],
  otr: ['PREMI', 'RATE', 'ADMIN', 'DISC', 'DISKON', 'PERTANGGUNGAN'],
  modelYear: ['TENOR', 'JANGKA'],
  tenorMonths: ['PEMBUATAN', 'KENDARAAN', 'PRODUKSI'],
  regionText: ['NAMA NASABAH'],
  contractNo: ['TGL', 'TANGGAL'],
  jenisBrg: ['ASURANSI', 'COVER', 'PERTANGGUNGAN', 'KELAMIN', 'PEMBAYARAN'],
};

export type ColumnMapping = Record<keyof typeof FIELD_ALIASES, number | null>;

const normHeader = (h: unknown): string =>
  (h == null ? '' : String(h)).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

/** Skor kecocokan satu header terhadap satu alias; 0 = tidak cocok. */
function aliasScore(header: string, alias: string): number {
  if (!header || !alias) return 0;
  if (header === alias) return 1000 + alias.length;
  const padded = ` ${header} `;
  if (!padded.includes(` ${alias} `)) return 0;
  // Cocok per kata. Alias yang lebih panjang (lebih spesifik) menang, dan
  // header yang hampir sama panjangnya dengan alias lebih kuat daripada
  // header panjang yang kebetulan memuat katanya.
  const startsOrEnds = header.startsWith(`${alias} `) || header.endsWith(` ${alias}`);
  return (startsOrEnds ? 500 : 300) + alias.length * 4 - Math.min(header.length - alias.length, 60);
}

export function autoMapColumns(headers: string[]): ColumnMapping {
  const norm = headers.map(normHeader);
  const fields = Object.keys(FIELD_ALIASES) as Array<keyof typeof FIELD_ALIASES>;
  const candidates: Array<{ field: keyof typeof FIELD_ALIASES; col: number; score: number; order: number }> = [];
  fields.forEach((field, order) => {
    const excludes = FIELD_EXCLUDES[field] ?? [];
    norm.forEach((h, col) => {
      if (!h) return;
      if (excludes.some(x => ` ${h} `.includes(` ${x} `))) return;
      let best = 0;
      for (const alias of FIELD_ALIASES[field]) best = Math.max(best, aliasScore(h, alias));
      if (best > 0) candidates.push({ field, col, score: best, order });
    });
  });
  // Satu kolom hanya boleh dipakai satu field: pasangan terkuat dipilih dulu.
  candidates.sort((a, b) => b.score - a.score || a.order - b.order || a.col - b.col);
  const mapping = {} as ColumnMapping;
  for (const f of fields) mapping[f] = null;
  const usedCols = new Set<number>();
  for (const c of candidates) {
    if (mapping[c.field] != null || usedCols.has(c.col)) continue;
    mapping[c.field] = c.col;
    usedCols.add(c.col);
  }
  return mapping;
}

/** Banyaknya field yang dikenali di satu baris — dipakai mencari baris header. */
function headerScore(row: unknown[]): number {
  const cells = row.map(c => (c == null ? '' : String(c)));
  if (cells.filter(c => /[A-Za-z]{2,}/.test(c)).length < 2) return 0;
  const mapping = autoMapColumns(cells);
  return Object.values(mapping).filter(v => v != null).length;
}

/**
 * Cari baris header. Ekspor multifinance jarang menaruhnya di baris pertama:
 * biasanya ada judul laporan, periode, dan baris kosong di atasnya. Baris
 * dengan field terkenali terbanyak (dalam 40 baris pertama) dianggap header;
 * kalau tidak ada yang meyakinkan, baris berisi pertama yang dipakai.
 */
export function findHeaderRow(rows: unknown[][]): number {
  let best = -1;
  let bestScore = 1; // butuh minimal 2 field supaya dianggap header
  const limit = Math.min(rows.length, 40);
  for (let i = 0; i < limit; i++) {
    const score = headerScore(rows[i] ?? []);
    if (score > bestScore) { bestScore = score; best = i; }
  }
  if (best !== -1) return best;
  const firstFilled = rows.findIndex(r => (r ?? []).some(c => c != null && String(c).trim() !== ''));
  return firstFilled === -1 ? 0 : firstFilled;
}

function sheetFromRows(allRows: unknown[][], sheetName?: string): ParsedSheet {
  if (allRows.length === 0) return { headers: [], rows: [], sheetName };
  const headerRowIndex = findHeaderRow(allRows);
  const headers = (allRows[headerRowIndex] ?? []).map(h => (h == null ? '' : String(h).trim()));
  return { headers, rows: allRows.slice(headerRowIndex + 1), headerRowIndex, sheetName };
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

// Yang benar-benar tidak bisa ditebak: siapa nasabahnya dan berapa nilai yang
// dipertanggungkan. Sisanya punya bawaan yang aman dan ditandai di layar
// tinjau: tenor → 12 bulan, jenis barang → Mobil (bisa diubah per baris),
// OTR kosong → baris mobil penumpang diberi tanda periksa.
export const REQUIRED_FIELDS: Array<keyof typeof FIELD_ALIASES> = ['nasabahName', 'financingValue'];

/** Field wajib yang belum terpetakan. Nilai pertanggungan boleh diwakili OTR. */
export function missingRequiredFields(mapping: ColumnMapping): Array<keyof typeof FIELD_ALIASES> {
  return REQUIRED_FIELDS.filter(f => {
    if (mapping[f] != null) return false;
    if (f === 'financingValue' && mapping.otr != null) return false;
    return true;
  });
}

/** Field opsional yang tidak ketemu dan bawaan apa yang dipakai sebagai gantinya. */
export function mappingNotices(mapping: ColumnMapping): string[] {
  const notes: string[] = [];
  if (mapping.financingValue == null && mapping.otr != null) {
    notes.push('Kolom nilai pencairan/pertanggungan tidak ditemukan — premi dihitung dari kolom OTR.');
  }
  if (mapping.jenisBrg == null) {
    notes.push('Kolom jenis barang tidak ditemukan — semua baris dianggap Mobil. Ubah kelas per baris di layar tinjau bila ada motor atau alat berat.');
  }
  if (mapping.tenorMonths == null) notes.push('Kolom tenor tidak ditemukan — semua baris memakai 12 bulan.');
  if (mapping.otr == null) notes.push('Kolom OTR tidak ditemukan — tarif mobil penumpang memakai kategori terendah dan barisnya ditandai untuk diperiksa.');
  return notes;
}

// ─── Value normalizers ──────────────────────────────────────────────────────

export function toNumber(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v == null) return 0;
  let s = String(v).replace(/[^\d.,-]/g, '');
  if (!s) return 0;
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  if (hasDot && hasComma) {
    // Pemisah yang muncul TERAKHIR adalah desimal: "1.234.567,89" (ID) atau "1,234,567.89" (US).
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (hasComma) {
    // "150,000,000" = ribuan; "12,5" = desimal.
    s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (hasDot) {
    // "150.000.000" atau "2.500" = ribuan; "12.5" = desimal.
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function toText(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function toDateIso(v: unknown): string | undefined {
  if (v == null || v === '') return undefined;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return undefined;
    // Tanggal sel Excel adalah tanggal lokal; toISOString() bisa menggesernya sehari.
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }
  const dmy = String(v).trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
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

const FOOTER_RE = /^(GRAND\s+)?(TOTAL|JUMLAH|SUB\s?TOTAL)\b/i;

export function buildRawRows(sheet: ParsedSheet, mapping: ColumnMapping): RawBulkRow[] {
  const get = (row: unknown[], field: keyof typeof FIELD_ALIASES): unknown => {
    const idx = mapping[field];
    return idx == null ? undefined : row[idx];
  };
  // "Jangka waktu (tahun)" → bulan.
  const tenorHeader = mapping.tenorMonths == null ? '' : normHeader(sheet.headers[mapping.tenorMonths]);
  const tenorInYears = / (TAHUN|THN|YEAR|YEARS)( |$)/.test(` ${tenorHeader}`) && !/ (BULAN|BLN|MONTH)/.test(` ${tenorHeader}`);
  const useOtrAsBasis = mapping.financingValue == null && mapping.otr != null;

  return sheet.rows
    .map((row, i): RawBulkRow | null => {
      if (!Array.isArray(row)) return null;
      const nasabahName = toText(get(row, 'nasabahName'));
      const jenisBrg = toText(get(row, 'jenisBrg'));
      // A fully blank row (common trailing rows in exports) isn't a record.
      if (!nasabahName && !jenisBrg && row.every(c => c == null || c === '')) return null;
      const otr = toNumber(get(row, 'otr'));
      const financingValue = toNumber(get(row, 'financingValue')) || (useOtrAsBasis ? otr : 0);
      // Baris jumlah/total di kaki tabel bukan nasabah.
      const firstText = row.map(toText).find(c => c !== '') ?? '';
      if (FOOTER_RE.test(firstText) || FOOTER_RE.test(nasabahName)) return null;
      // Baris tanpa nama DAN tanpa nilai apa pun (mis. catatan kaki).
      if (!nasabahName && financingValue <= 0 && otr <= 0) return null;
      // Satu sel teks sendirian tanpa angka ("Mengetahui,", nama penanda tangan)
      // bukan nasabah. Nasabah sungguhan yang nilainya kosong punya sel lain
      // yang terisi, jadi tetap masuk dan ditandai di layar tinjau.
      const filledCells = row.filter(c => c != null && String(c).trim() !== '').length;
      if (filledCells <= 1 && financingValue <= 0 && otr <= 0) return null;
      const tenorRaw = toNumber(get(row, 'tenorMonths'));
      return {
        rowNo: i + 1,
        nasabahName,
        nasabahKtp: toText(get(row, 'nasabahKtp')) || undefined,
        nasabahPhone: toText(get(row, 'nasabahPhone')) || undefined,
        nasabahAddress: toText(get(row, 'nasabahAddress')) || undefined,
        contractNo: toText(get(row, 'contractNo')) || undefined,
        contractDate: toDateIso(get(row, 'contractDate')),
        tenorMonths: (tenorInYears ? tenorRaw * 12 : tenorRaw) || 12,
        financingValue,
        jenisBrg,
        make: toText(get(row, 'make')) || undefined,
        typeName: toText(get(row, 'typeName')) || undefined,
        modelYear: toNumber(get(row, 'modelYear')) || undefined,
        otr,
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
  // Buang BOM (ekspor Excel "CSV UTF-8" selalu membawanya).
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const lines = clean.split(/\r\n|\n|\r/).filter(l => l.trim() !== '');
  // Pemisah: yang paling sering muncul di 10 baris pertama (koma, titik koma, atau tab).
  const sample = lines.slice(0, 10).join('\n');
  const count = (ch: string) => sample.split(ch).length - 1;
  const delim = [',', ';', '\t'].sort((a, b) => count(b) - count(a))[0];
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
      } else if (c === delim) {
        out.push(cur); cur = '';
      } else {
        cur += c;
      }
    }
    out.push(cur);
    return out;
  };
  return sheetFromRows(lines.map(splitLine));
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

  // Pilih sheet yang header-nya paling dikenali; bila seri, yang barisnya
  // paling banyak. Ekspor multifinance sering membawa sheet catatan/legenda
  // (mis. "AUDIT LENGKAP") di samping sheet datanya, dan sheet catatan itu
  // kadang justru lebih panjang.
  let best: ParsedSheet | null = null;
  let bestKey = -1;
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws || !ws['!ref']) continue;
    const allRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null }) as unknown[][];
    if (allRows.length === 0) continue;
    const parsed = sheetFromRows(allRows, name);
    const recognised = Object.values(autoMapColumns(parsed.headers)).filter(v => v != null).length;
    const key = recognised * 1_000_000 + parsed.rows.length;
    if (key > bestKey) { bestKey = key; best = parsed; }
  }
  return best ?? { headers: [], rows: [] };
}

export async function parseBulkFile(file: File): Promise<ParsedSheet> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = await file.text();
    return parseCsv(text);
  }
  return parseXlsx(file);
}
