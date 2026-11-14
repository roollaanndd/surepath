// b2bProposalPdf — Proposal PDF untuk order unit B2B (v2.9.1).
//
// Satu dokumen A4 portrait yang bisa diunduh klien B2B sebelum submit order,
// selaras dengan gaya proposal yang ada di agent app (services/quotationSlipPdf.ts).
//
// Perbedaan dengan quotation slip agent:
//  • Khusus B2B — menampilkan paket (loading/diskon), perluasan OJK, jumlah
//    foto yang sudah diunggah, dan perusahaan klien.
//  • Lebih ringkas (1-2 halaman) — proposal, bukan slip polis.
//  • Watermark diagonal 'SUREPATH B2B' + aksen oranye pada total.
//  • Tidak publish ke database — hanya file untuk referensi internal/mitra.
//
// Semua angka datang dari BuiltLineItem (mesin rating sama persis dengan
// server); PDF ini hanya memformat, tidak menghitung ulang premi apa pun.
//
// Warna mengikuti palet "Kaca Pagi" (agent v2.9.0):
//   emerald hijau utama, orange aksen (satu titik tujuan), ink gelap, putih.
//

import type { BuiltLineItem } from './b2bFleetRating';

let _jsPDF: any = null;
async function getJsPDF(): Promise<any> {
  if (!_jsPDF) {
    const mod = await import('jspdf');
    _jsPDF = mod.jsPDF;
  }
  return _jsPDF;
}

type RGB = [number, number, number];
const COLOR = {
  white:    [255, 255, 255] as RGB,
  paper:    [250, 252, 250] as RGB,  // near-white paper tint
  ink:      [14, 25, 35] as RGB,     // deep slate
  ink2:     [56, 74, 85] as RGB,     // body
  ink3:     [120, 134, 142] as RGB,  // caption
  hairline: [223, 229, 227] as RGB,  // tipis pembatas
  emerald:  [5, 150, 105] as RGB,    // #059669 — SurePath primary
  emeraldD: [6, 95, 70] as RGB,      // #065f46 — deeper
  emeraldT: [236, 253, 245] as RGB,  // #ecfdf5 — panel tint
  orange:   [234, 88, 12] as RGB,    // #ea580c — aksen "titik tujuan"
  orangeT:  [255, 247, 237] as RGB,  // #fff7ed
  amber:    [217, 119, 6] as RGB,    // #D97706 — warn
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2;

export interface B2BProposalInput {
  // Perusahaan & agen
  companyName: string;
  preparedBy?: string;        // nama penjual/relationship manager (opsional)
  preparedByEmail?: string;
  proposalDate?: Date;
  proposalCode?: string;      // mis. "PROP-B2B-20261114-XYZ"
  // Nasabah / unit
  nasabahName: string;
  nasabahPhone?: string;
  nasabahAddress?: string;
  contractNo?: string;
  make?: string;
  model?: string;
  modelYear?: number;
  plateNo?: string;
  regionText?: string;
  financingValue: number;     // nilai pertanggungan / pencairan
  otr?: number;
  tenorMonths: number;
  // Periode & opsi
  coverageStartDate: string;  // YYYY-MM-DD
  coverageEndDate: string;    // YYYY-MM-DD (dari addMonthsToIsoDate)
  multiYear: boolean;
  discountShownOnPolicy: boolean;
  // Paket
  planName?: string;
  planDescription?: string;
  planBenefits?: string[];
  planLoadingPct?: number;    // 0.10 = 10%
  // Hasil rating
  line: BuiltLineItem;
  // Foto
  photoCount: number;
}

const fmtIDR = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const fmtPct = (n: number) => `${(n * 100).toFixed(3).replace(/\.?0+$/, '')}%`;
const fmtDate = (iso: string) =>
  iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

const ADDON_LABEL: Record<string, string> = {
  flood: 'Banjir (Lampiran II)',
  earthquake: 'Gempa Bumi (Lampiran III)',
  srcc: 'Huru-hara / SRCC (OJK IV.B No.3)',
  terrorism: 'Terorisme & Sabotase (OJK IV.B No.4)',
  tpl: 'Tanggung Jawab Hukum Pihak Ketiga (TPL)',
  authorizedWorkshop: 'Bengkel Resmi / ATPM',
  paDriver: 'PA Pengemudi',
  paPassenger: 'PA Penumpang',
};

/** Builder utility: lingkaran. */
function dot(doc: any, x: number, y: number, r: number, c: RGB) {
  doc.setFillColor(c[0], c[1], c[2]);
  doc.circle(x, y, r, 'F');
}

/** Hairline horizontal. */
function hr(doc: any, x1: number, x2: number, y: number) {
  doc.setDrawColor(COLOR.hairline[0], COLOR.hairline[1], COLOR.hairline[2]);
  doc.setLineWidth(0.5);
  doc.line(x1, y, x2, y);
}

/** Satu baris key-value. */
function row(doc: any, label: string, value: string, x: number, y: number, w: number): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR.ink3[0], COLOR.ink3[1], COLOR.ink3[2]);
  doc.text(label, x, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLOR.ink[0], COLOR.ink[1], COLOR.ink[2]);
  const lines = doc.splitTextToSize(value || '—', w - 110);
  doc.text(lines, x + 110, y);
  const h = Array.isArray(lines) ? lines.length * 12 : 12;
  return y + Math.max(h, 16);
}

/** Watermark diagonal besar di tengah halaman (sangat transparan). */
function watermark(doc: any, text = 'SUREPATH  ·  B2B') {
  doc.saveGraphicsState();
  // jsPDF: transparansi via GState; tidak semua versi punya shortcut, jadi
  // pakai warna pucat sebagai fallback aman.
  const gstate = (doc as any).GState?.({ opacity: 0.08 });
  if (gstate) (doc as any).setGState(gstate);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(72);
  doc.setTextColor(COLOR.emerald[0], COLOR.emerald[1], COLOR.emerald[2]);
  doc.text(text, PAGE_W / 2, PAGE_H / 2, { align: 'center', angle: 30, baseline: 'middle' });
  doc.restoreGraphicsState();
}

/** Header kop surat: wordmark + alamat ringkas. */
function headerBand(doc: any) {
  // Pita emerald tipis di atas
  doc.setFillColor(COLOR.emerald[0], COLOR.emerald[1], COLOR.emerald[2]);
  doc.rect(0, 0, PAGE_W, 6, 'F');

  // Wordmark Sure(Path) + titik oranye di titik akhir path
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(COLOR.ink[0], COLOR.ink[1], COLOR.ink[2]);
  doc.text('Sure', MARGIN, 44);
  const sureW = doc.getTextWidth('Sure');
  doc.setTextColor(COLOR.emerald[0], COLOR.emerald[1], COLOR.emerald[2]);
  doc.text('Path', MARGIN + sureW, 44);
  const pathW = doc.getTextWidth('Path');
  dot(doc, MARGIN + sureW + pathW + 6, 38, 3.4, COLOR.orange);

  // Tagline + alamat
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLOR.ink3[0], COLOR.ink3[1], COLOR.ink3[2]);
  doc.text('Asuransi digital untuk korporasi · myinsurepath.com', MARGIN, 58);

  // Kanan atas: "PROPOSAL B2B" dengan aksen oranye
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLOR.orange[0], COLOR.orange[1], COLOR.orange[2]);
  doc.text('PROPOSAL B2B', PAGE_W - MARGIN, 44, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLOR.ink3[0], COLOR.ink3[1], COLOR.ink3[2]);
  doc.text('Dokumen non-kontraktual · perlu verifikasi underwriting', PAGE_W - MARGIN, 58, { align: 'right' });

  hr(doc, MARGIN, PAGE_W - MARGIN, 72);
}

/** Footer. */
function footer(doc: any, pageNo: number, pageCount: number) {
  hr(doc, MARGIN, PAGE_W - MARGIN, PAGE_H - 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR.ink3[0], COLOR.ink3[1], COLOR.ink3[2]);
  doc.text(
    'PT SurePath Indonesia · hello@myinsurepath.com · +62 812 0000 0000 · Jakarta, Indonesia',
    MARGIN, PAGE_H - 30,
  );
  doc.text(`Halaman ${pageNo} dari ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 30, { align: 'right' });
}

/** Panel judul blok: label + aksen vertikal. */
function sectionTitle(doc: any, label: string, y: number): number {
  // Bar vertikal oranye kecil — satu titik tujuan
  doc.setFillColor(COLOR.orange[0], COLOR.orange[1], COLOR.orange[2]);
  doc.rect(MARGIN, y - 10, 3, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLOR.ink[0], COLOR.ink[1], COLOR.ink[2]);
  doc.text(label.toUpperCase(), MARGIN + 10, y);
  return y + 14;
}

/** Baris tabel ringkasan premi (label + angka kanan). */
function moneyRow(
  doc: any, label: string, value: string, y: number,
  { bold = false, color = COLOR.ink, hair = true }: { bold?: boolean; color?: RGB; hair?: boolean } = {},
): number {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(bold ? 10 : 9.5);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(label, MARGIN + 8, y);
  doc.text(value, PAGE_W - MARGIN - 8, y, { align: 'right' });
  const next = y + 15;
  if (hair) hr(doc, MARGIN + 8, PAGE_W - MARGIN - 8, next - 7);
  return next;
}

export async function generateB2BProposalPdf(input: B2BProposalInput): Promise<void> {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  const date = input.proposalDate ?? new Date();
  const code = input.proposalCode ?? `PROP-B2B-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  // ─ Halaman 1 ─
  watermark(doc);
  headerBand(doc);

  // Blok perusahaan + tanggal + kode proposal
  let y = 98;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLOR.ink3[0], COLOR.ink3[1], COLOR.ink3[2]);
  doc.text('DITERBITKAN UNTUK', MARGIN, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(COLOR.ink[0], COLOR.ink[1], COLOR.ink[2]);
  doc.text(input.companyName || 'Klien B2B', MARGIN, y + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLOR.ink3[0], COLOR.ink3[1], COLOR.ink3[2]);
  doc.text('Tanggal proposal', PAGE_W - MARGIN, y, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLOR.ink[0], COLOR.ink[1], COLOR.ink[2]);
  doc.text(date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), PAGE_W - MARGIN, y + 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLOR.ink3[0], COLOR.ink3[1], COLOR.ink3[2]);
  doc.text(`Kode: ${code}`, PAGE_W - MARGIN, y + 28, { align: 'right' });
  y = 150;

  // ── Blok nasabah + unit ──
  y = sectionTitle(doc, 'Nasabah & Unit', y + 10);
  y += 6;
  y = row(doc, 'Nama nasabah', input.nasabahName || '—', MARGIN, y, CONTENT_W);
  if (input.contractNo)      y = row(doc, 'No. kontrak', input.contractNo, MARGIN, y, CONTENT_W);
  if (input.nasabahPhone)    y = row(doc, 'Telepon', input.nasabahPhone, MARGIN, y, CONTENT_W);
  if (input.nasabahAddress)  y = row(doc, 'Alamat', input.nasabahAddress, MARGIN, y, CONTENT_W);
  const vehicle = [input.make, input.model, input.modelYear].filter(Boolean).join(' ') || '—';
  y = row(doc, 'Kendaraan', vehicle, MARGIN, y, CONTENT_W);
  y = row(doc, 'Kelas', input.line.vehicleClass === 'HEAVY_EQUIPMENT' ? 'Alat Berat' : input.line.vehicleClass === 'MOTORCYCLE' ? 'Motor' : 'Mobil', MARGIN, y, CONTENT_W);
  if (input.plateNo)   y = row(doc, 'Plat nomor', input.plateNo, MARGIN, y, CONTENT_W);
  y = row(doc, 'Zona', `Wilayah ${input.line.zone}`, MARGIN, y, CONTENT_W);
  if (input.otr && input.otr > 0) y = row(doc, 'OTR', fmtIDR(input.otr), MARGIN, y, CONTENT_W);
  y = row(doc, 'Nilai pertanggungan', fmtIDR(input.financingValue), MARGIN, y, CONTENT_W);

  // ── Blok pertanggungan ──
  y = sectionTitle(doc, 'Pertanggungan', y + 12);
  y += 6;
  y = row(doc, 'Jenis', input.line.coverage === 'COMPREHENSIVE' ? 'Comprehensive' : 'TLO (Total Loss Only)', MARGIN, y, CONTENT_W);
  y = row(doc, 'Tenor', `${input.tenorMonths} bulan`, MARGIN, y, CONTENT_W);
  y = row(doc, 'Periode', `${fmtDate(input.coverageStartDate)} s/d ${fmtDate(input.coverageEndDate)}`, MARGIN, y, CONTENT_W);
  if (input.multiYear) {
    y = row(doc, 'Penyusutan', `${(input.line.depreciationRate * 100).toFixed(0)}% per tahun (multi-tahun)`, MARGIN, y, CONTENT_W);
  }
  y = row(doc, 'Rate', fmtPct(input.line.rate), MARGIN, y, CONTENT_W);

  // ── Paket (opsional) ──
  if (input.planName) {
    y = sectionTitle(doc, 'Paket Asuransi', y + 12);
    y += 6;
    // Kartu latar emerald tipis
    doc.setFillColor(COLOR.emeraldT[0], COLOR.emeraldT[1], COLOR.emeraldT[2]);
    doc.setDrawColor(COLOR.emerald[0], COLOR.emerald[1], COLOR.emerald[2]);
    doc.setLineWidth(0.6);
    const planCardH = 14 + (input.planDescription ? 24 : 0) + (input.planBenefits?.length ? input.planBenefits.length * 11 + 10 : 0);
    doc.roundedRect(MARGIN, y - 4, CONTENT_W, planCardH, 6, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(COLOR.emeraldD[0], COLOR.emeraldD[1], COLOR.emeraldD[2]);
    doc.text(input.planName, MARGIN + 10, y + 8);
    if (input.planLoadingPct && input.planLoadingPct !== 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(COLOR.orange[0], COLOR.orange[1], COLOR.orange[2]);
      const pct = `${input.planLoadingPct > 0 ? '+' : ''}${(input.planLoadingPct * 100).toFixed(1)}%`;
      doc.text(pct, PAGE_W - MARGIN - 10, y + 8, { align: 'right' });
    }
    if (input.planDescription) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(COLOR.ink2[0], COLOR.ink2[1], COLOR.ink2[2]);
      const descL = doc.splitTextToSize(input.planDescription, CONTENT_W - 20);
      doc.text(descL, MARGIN + 10, y + 22);
    }
    if (input.planBenefits?.length) {
      let by = y + (input.planDescription ? 42 : 24);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(COLOR.ink2[0], COLOR.ink2[1], COLOR.ink2[2]);
      for (const b of input.planBenefits.slice(0, 6)) {
        dot(doc, MARGIN + 14, by - 3, 1.5, COLOR.emerald);
        doc.text(b, MARGIN + 20, by);
        by += 11;
      }
    }
    y += planCardH + 6;
  }

  // ── Perluasan ──
  const detail = input.line.addonsDetail ?? {};
  const addonKeys = Object.keys(detail);
  if (addonKeys.length > 0) {
    y = sectionTitle(doc, 'Perluasan Pertanggungan', y + 12);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    for (const k of addonKeys) {
      doc.setTextColor(COLOR.ink2[0], COLOR.ink2[1], COLOR.ink2[2]);
      doc.text(`• ${ADDON_LABEL[k] ?? k}`, MARGIN + 6, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLOR.ink[0], COLOR.ink[1], COLOR.ink[2]);
      doc.text(fmtIDR(detail[k]), PAGE_W - MARGIN - 6, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      y += 13;
    }
  }

  // ── Dokumen pendukung ──
  if (input.photoCount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR.ink3[0], COLOR.ink3[1], COLOR.ink3[2]);
    y += 10;
    doc.text(`${input.photoCount} foto kendaraan terlampir pada submission (tersimpan di sistem SurePath).`, MARGIN, y);
    y += 10;
  }

  // ── Rincian premi — kartu bordered ──
  y = sectionTitle(doc, 'Rincian Premi', y + 14);
  y += 8;
  const premiStart = y;
  doc.setDrawColor(COLOR.hairline[0], COLOR.hairline[1], COLOR.hairline[2]);
  doc.setLineWidth(0.6);
  doc.roundedRect(MARGIN, premiStart - 4, CONTENT_W, 0, 6, 6, 'S');

  y = moneyRow(doc, 'Premi gross', fmtIDR(input.line.premiumGross), y + 8);
  if (input.line.discountAmount > 0) {
    y = moneyRow(doc, `Diskon (${fmtPct(input.line.discountRate)}${input.discountShownOnPolicy ? '' : ' — tidak tertera di polis'})`, `−${fmtIDR(input.line.discountAmount)}`, y);
  }
  if (input.line.planLoading !== 0) {
    y = moneyRow(doc, `Loading paket ${input.planName ?? ''}`, `${input.line.planLoading > 0 ? '+' : ''}${fmtIDR(input.line.planLoading)}`, y);
  }
  if (input.line.addonPremium > 0) {
    y = moneyRow(doc, 'Perluasan', `+${fmtIDR(input.line.addonPremium)}`, y);
  }
  y = moneyRow(doc, 'Biaya administrasi', fmtIDR(input.line.adminFee), y, { hair: false });

  // Garis tebal sebelum total
  doc.setDrawColor(COLOR.ink[0], COLOR.ink[1], COLOR.ink[2]);
  doc.setLineWidth(1);
  doc.line(MARGIN + 8, y - 2, PAGE_W - MARGIN - 8, y - 2);

  // Total — pita orange kontras
  y += 8;
  doc.setFillColor(COLOR.orange[0], COLOR.orange[1], COLOR.orange[2]);
  doc.roundedRect(MARGIN, y - 10, CONTENT_W, 36, 8, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLOR.white[0], COLOR.white[1], COLOR.white[2]);
  doc.text('TOTAL PREMI', MARGIN + 14, y + 10);
  doc.setFontSize(18);
  doc.text(fmtIDR(input.line.totalPremium), PAGE_W - MARGIN - 14, y + 13, { align: 'right' });
  y += 36;

  // ── Catatan & disclaimer ──
  if (input.line.flags.length > 0) {
    y += 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(COLOR.amber[0], COLOR.amber[1], COLOR.amber[2]);
    doc.text('Catatan verifikasi:', MARGIN, y);
    y += 11;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLOR.ink2[0], COLOR.ink2[1], COLOR.ink2[2]);
    for (const f of input.line.flags.slice(0, 4)) {
      const lines = doc.splitTextToSize(`• ${f}`, CONTENT_W);
      doc.text(lines, MARGIN, y);
      y += lines.length * 10;
    }
  }

  y += 14;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR.ink3[0], COLOR.ink3[1], COLOR.ink3[2]);
  const disclaimer =
    'Proposal ini bersifat non-kontraktual. Rate mengacu pada SEOJK No. 6/SEOJK.05/2017 dan rate set armada yang aktif di SurePath. ' +
    'Angka final mengikuti verifikasi underwriting penanggung. Polis terbit setelah dokumen lengkap, premi dibayar, dan underwriting disetujui.';
  const disclaimerLines = doc.splitTextToSize(disclaimer, CONTENT_W);
  doc.text(disclaimerLines, MARGIN, y);

  // Preparer
  if (input.preparedBy) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLOR.ink3[0], COLOR.ink3[1], COLOR.ink3[2]);
    doc.text(`Disiapkan oleh ${input.preparedBy}${input.preparedByEmail ? ` · ${input.preparedByEmail}` : ''}`, MARGIN, PAGE_H - 54);
  }

  // Footer halaman tunggal
  footer(doc, 1, 1);

  const fileName = `Proposal-B2B-${input.nasabahName.replace(/[^A-Za-z0-9]+/g, '-').slice(0, 30)}-${code}.pdf`;
  doc.save(fileName);
}
