// quotationSlipPdf.ts
// SurePath Quotation Slip Generator (4-page A4 PDF)
// Faithful port of /home/z/my-project/scripts/qs_template/template.html
// Renders directly in browser via jsPDF — no backend needed.
//
// Layout matches the reference PDF:
//  Page 1: Cover (dark green) — Logo, title, data box (3×2), footer
//  Page 2: Data Nasabah & Objek Pertanggungan (light)
//  Page 3: Perhitungan Premi & Terms (light)
//  Page 4: Konfirmasi & Pembayaran (dark green)

let _jsPDF: any = null;
async function getJsPDF(): Promise<any> {
  if (!_jsPDF) {
    const mod = await import('jspdf');
    _jsPDF = mod.jsPDF;
  }
  return _jsPDF;
}

// ─── Brand colors (sampled from original reference PDF) ────────────────────
const COLOR = {
  darkBg:        [14, 42, 28] as [number, number, number],    // #0E2A1C
  darkBgMid:     [23, 50, 25] as [number, number, number],    // #173219
  emerald:       [132, 204, 69] as [number, number, number],  // #84CC45 (bright lime)
  emeraldBright: [138, 200, 65] as [number, number, number],  // #8AC841
  emeraldDeep:   [11, 94, 46] as [number, number, number],    // #0B5E2E (table header)
  emeraldMid:    [63, 131, 54] as [number, number, number],   // #3F8336
  borderMuted:   [82, 95, 80] as [number, number, number],    // #525F50
  white:         [255, 255, 255] as [number, number, number],
  lightBg:       [243, 250, 245] as [number, number, number], // #F3FAF5
  ink:           [26, 47, 42] as [number, number, number],    // #1A2F2A
  inkMuted:      [90, 107, 101] as [number, number, number],  // #5A6B65
  beige:         [255, 248, 225] as [number, number, number], // #FFF8E1
  beigeBorder:   [184, 134, 11] as [number, number, number],  // #B8860B
  beigeText:     [93, 74, 10] as [number, number, number],    // #5D4A0A
};

// ─── Data interface ────────────────────────────────────────────────────────
export interface QuotationSlipData {
  // Quotation metadata
  quotationNumber: string;        // e.g. "QS/SP/2026/VII/0092"
  slipType?: string;              // default "RENEWAL 2026/2027"
  issueDate: string;              // e.g. "09 Juli 2026"
  yearTag?: string;               // e.g. "2026" (auto-extracted if missing)

  // Parties
  preparedForCompany: string;     // Customer company name
  preparedForPerson: string;      // Customer contact person
  previousPolicyNumber?: string;  // For renewals
  insurer: string;                // Full insurer name
  insurerShort: string;           // e.g. "Zurich"

  // Period
  periodStart: string;            // e.g. "17 Juli 2026"
  periodEnd: string;              // e.g. "17 Juli 2027"
  periodStartShort?: string;      // e.g. "17 Jul 2026"
  periodEndShort?: string;

  // Cover page text
  titleMain?: string;             // default "Penawaran"
  titleMid?: string;              // default "Perpanjangan"
  titleAccent?: string;           // default "Polis."
  ledeHtml?: string;              // Lede paragraph (HTML stripped, plain text used)

  // Insured & vehicle
  insuredName: string;
  insuredAddress: string;
  vehicleBrand: string;
  vehicleType: string;
  vehicleYear: string;
  engineNumber: string;
  chassisNumber: string;
  plateNumber: string;
  seats: string;
  color: string;
  usage: string;

  // Coverage
  coverageCondition: string;
  additionalCoverage: string;
  deductible: string;
  klausulList: string[];          // 3 strings rendered as Klausul boxes

  // Sum insured table
  sumInsuredItems: { no: string; desc: string; amount: string }[];
  totalSumInsured: string;
  currency?: string;              // default "IDR"

  // Premium calculation
  premiumComponents: { component: string; basis: string; rate: string; premium: string }[];
  subtotalPremium: string;
  discountLabel: string;          // e.g. "Diskon Perpanjangan 25%"
  discountAmount: string;         // e.g. "(1.492.000,00)"
  premiumAfterDiscount: string;
  policyFee: string;
  stampDuty: string;
  totalPremium: string;

  // Lists
  subjectivityList: string[];
  termsList: string[];

  // Payment page
  closingTitle?: string;          // default "Lanjutkan Proteksi Anda,"
  closingAccent?: string;         // default "Tanpa Jeda."
  closingDesc?: string;
  bankName: string;               // e.g. "BANK BCA"
  bankNameShort?: string;         // e.g. "BCA"
  bankAccount: string;            // e.g. "5730 - 807 - 807"
  bankAccountName: string;
  paymentDueDate: string;
  transferMemo: string;

  // Optional logo override (data URL or URL string)
  logoUrl?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const stripHtml = (s: string): string =>
  (s ?? '').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').trim();

const fmtIDRShort = (s: string): string => {
  // Just strip IDR prefix and trim — used for the payment box big number
  return (s ?? '').replace(/^IDR\s*/i, '').replace(/[()]/g, '').trim();
};

// ─── Main generator ────────────────────────────────────────────────────────
export async function generateQuotationSlipPDF(data: QuotationSlipData): Promise<void> {
  const jsPDF = await getJsPDF();
  // A4 portrait, points unit
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageW = 595.28;  // A4 width in points
  const pageH = 841.89; // A4 height in points
  const margin = 42;    // ~56px at 96dpi scaled

  // ─── Pre-load SurePath logo from /logo-full.png (horizontal, full branded) ─
  // Try fetching at runtime; fall back to SVG-drawn shield if fetch fails.
  // Uses logo-full.png (600×180) which already includes wordmark + tagline.
  let logoDataUrl: string | null = null;
  try {
    logoDataUrl = await loadLogoAsDataUrl(data.logoUrl);
    if (logoDataUrl) {
      console.log('QuotationSlip: ✓ Real SurePath logo loaded');
    } else {
      console.warn('QuotationSlip: ⚠ Logo fetch returned null, using SVG fallback');
    }
  } catch (e) {
    console.warn('QuotationSlip: ⚠ Logo load failed, falling back to SVG shield', e);
  }

  // Auto-extract year tag from quotation number if missing
  const yearTag = data.yearTag || (() => {
    const m = (data.quotationNumber || '').match(/\/(\d{4})\//);
    return m ? m[1] : String(new Date().getFullYear());
  })();

  // Defaults
  const titleMain = data.titleMain || 'Penawaran';
  const titleMid = data.titleMid || 'Perpanjangan';
  const titleAccent = data.titleAccent || 'Polis.';
  const slipType = data.slipType || 'RENEWAL 2026/2027';
  const currency = data.currency || 'IDR';
  const closingTitle = data.closingTitle || 'Lanjutkan Proteksi Anda,';
  const closingAccent = data.closingAccent || 'Tanpa Jeda.';
  const closingDesc = data.closingDesc ||
    `Polis Anda berakhir pada ${data.periodStart} pukul 12.00 siang. Konfirmasi, jadwalkan survey kendaraan, dan lakukan pembayaran sebelum tanggal tersebut agar perlindungan berjalan tanpa terputus.`;
  const periodStartShort = data.periodStartShort || data.periodStart;
  const periodEndShort = data.periodEndShort || data.periodEnd;
  const bankNameShort = data.bankNameShort || data.bankName;
  const totalPremiumClean = fmtIDRShort(data.totalPremium);
  const discountAmountClean = fmtIDRShort(data.discountAmount);

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER (dark green)
  // ═══════════════════════════════════════════════════════════════════════
  drawCoverPage(doc, data, {
    pageW, pageH, margin, yearTag, titleMain, titleMid, titleAccent, slipType, logoDataUrl,
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 2 — DATA NASABAH & OBJEK PERTANGGUNGAN (light)
  // ═══════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawDataPage(doc, data, { pageW, pageH, margin, currency, logoDataUrl });

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 3 — PREMI & TERMS (light)
  // ═══════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawPremiPage(doc, data, { pageW, pageH, margin, currency, logoDataUrl });

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 4 — KONFIRMASI & PEMBAYARAN (dark green)
  // ═══════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawPaymentPage(doc, data, {
    pageW, pageH, margin, currency,
    closingTitle, closingAccent, closingDesc,
    periodStartShort, periodEndShort,
    discountAmountClean, totalPremiumClean, bankNameShort, logoDataUrl,
  });

  // ─── Set metadata ──────────────────────────────────────────────────────
  doc.setProperties({
    title: `${data.quotationNumber} — Penawaran Asuransi`,
    subject: `Quotation Slip — ${data.insurerShort}`,
    author: 'SurePath · PT. Ruang Proteksi Indonesia',
    creator: 'SurePath Digital Insurance Platform',
    keywords: 'SurePath, Quotation, Asuransi, ' + data.quotationNumber,
  });

  // ─── Save ───────────────────────────────────────────────────────────────
  const filename = `${data.quotationNumber.replace(/[/\s]/g, '_')}_Penawaran_${data.insurerShort}_${data.preparedForCompany.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}.pdf`;
  doc.save(filename);
}

// ─── Page 1: Cover ────────────────────────────────────────────────────────
function drawCoverPage(doc: any, d: QuotationSlipData, ctx: any) {
  const { pageW, pageH, margin, yearTag, titleMain, titleMid, titleAccent, slipType, logoDataUrl } = ctx;

  // Full dark green background
  doc.setFillColor(...COLOR.darkBg);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Decorative radial-like circles (subtle)
  doc.setFillColor(20, 70, 40);
  doc.circle(pageW - 60, 240, 140, 'F');
  doc.setFillColor(15, 55, 32);
  doc.circle(80, pageH - 200, 100, 'F');

  // ─── Top row: Logo (left) + Quotation Slip stamp (right) ──────────────
  // SurePath logo (shield SVG + wordmark)
  drawSurePathLogo(doc, margin, margin + 6, 'light', logoDataUrl);

  // Right meta stamp
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR.emerald, 0.7 * 255);
  doc.text('QUOTATION SLIP', pageW - margin, margin + 2, { align: 'right' });
  doc.setTextColor(...COLOR.emerald);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(d.quotationNumber, pageW - margin, margin + 14, { align: 'right' });

  // ─── Doc class label ──────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR.emerald);
  doc.text(`// QUOTATION SLIP — ${slipType}`, margin, margin + 60);

  // ─── Title block ──────────────────────────────────────────────────────
  // "Penawaran" / "Perpanjangan Polis."
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR.white);
  doc.setFontSize(44);
  doc.text(titleMain, margin, 180);
  doc.text(titleMid, margin, 230);
  doc.setTextColor(...COLOR.emeraldBright);
  doc.text(titleAccent, margin + doc.getTextWidth(titleMid + ' '), 230);

  // Lede paragraph (plain text, no HTML)
  const lede = stripHtml(d.ledeHtml || '');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255, 0.72 * 255);
  const ledeLines = doc.splitTextToSize(lede, pageW - 2 * margin);
  doc.text(ledeLines, margin, 270);

  // ─── Data box (3 rows × 2 cols) ───────────────────────────────────────
  const boxY = 420;
  const boxH = 270;
  const boxW = pageW - 2 * margin;
  const rowH = boxH / 3;
  const colW = boxW / 2;

  // Box outline
  doc.setDrawColor(...COLOR.borderMuted);
  doc.setLineWidth(0.8);
  doc.setFillColor(255, 255, 255, 0.03 * 255);
  doc.roundedRect(margin, boxY, boxW, boxH, 12, 12, 'FD');

  // Inner cell separators
  for (let i = 1; i < 3; i++) {
    doc.line(margin, boxY + i * rowH, margin + boxW, boxY + i * rowH);
  }
  doc.line(margin + colW, boxY, margin + colW, boxY + boxH);

  // Cell contents
  const cells = [
    { label: 'NOMOR PENAWARAN',     value: d.quotationNumber, accent: true },
    { label: 'TANGGAL PENERBITAN',  value: d.issueDate },
    { label: 'DISIAPKAN UNTUK',     value: d.preparedForCompany, sub: d.preparedForPerson },
    { label: 'POLIS SEBELUMNYA',    value: d.previousPolicyNumber || '-', accent: true },
    { label: 'PENANGGUNG (RENEWAL)',value: d.insurer },
    { label: 'PERIODE PERPANJANGAN',value: `${d.periodStart} — ${d.periodEnd}` },
  ];

  cells.forEach((c, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = margin + col * colW + 16;
    const cy = boxY + row * rowH + 22;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255, 0.45 * 255);
    doc.text(c.label, cx, cy);

    doc.setFont('courier', 'bold');
    doc.setFontSize(11);
    if (c.accent) {
      doc.setTextColor(...COLOR.emerald);
    } else {
      doc.setTextColor(...COLOR.white);
    }
    doc.text(c.value, cx, cy + 18);

    if (c.sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255, 0.72 * 255);
      doc.text(c.sub, cx, cy + 32);
    }
  });

  // ─── Footer with dotted line + dots ───────────────────────────────────
  const footerY = pageH - 50;
  doc.setDrawColor(...COLOR.borderMuted);
  doc.setLineDashPattern([2, 3], 0);
  doc.line(margin, footerY, pageW - margin, footerY);
  doc.setLineDashPattern([], 0);

  // Three dots
  doc.setFillColor(...COLOR.emerald);
  doc.circle(margin, footerY, 2.5, 'F');
  doc.circle(pageW - margin, footerY, 2.5, 'F');
  doc.circle(pageW / 2, footerY, 2.5, 'F');

  // Footer left
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR.white);
  doc.text('PT. Ruang Proteksi Indonesia', margin, footerY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255, 0.72 * 255);
  doc.text('SurePath — Digital Insurance Distribution Platform', margin, footerY + 25);
  doc.setTextColor(...COLOR.emerald);
  doc.text('myinsurepath.com', margin, footerY + 36);
  doc.setTextColor(255, 255, 255, 0.5 * 255);
  doc.text('· Bekerja sama dengan perusahaan asuransi berizin & diawasi OJK', margin + doc.getTextWidth('myinsurepath.com'), footerY + 36);

  // Footer right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.emerald);
  doc.text(`SUREPATH.QS.${yearTag}`, pageW - margin, footerY + 14, { align: 'right' });
}

// ─── Page 2: Data Nasabah & Objek ─────────────────────────────────────────
function drawDataPage(doc: any, d: QuotationSlipData, ctx: any) {
  const { pageW, pageH, margin, currency, logoDataUrl } = ctx;

  // White background
  doc.setFillColor(...COLOR.white);
  doc.rect(0, 0, pageW, pageH, 'F');

  // ─── Top row ──────────────────────────────────────────────────────────
  drawSurePathLogo(doc, margin, margin + 6, 'dark', logoDataUrl);

  // Right meta
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR.inkMuted);
  doc.text('PENAWARAN ASURANSI', pageW - margin, margin + 2, { align: 'right' });
  doc.setTextColor(...COLOR.emeraldDeep);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Hal. 2 dari 4', pageW - margin, margin + 14, { align: 'right' });

  // ─── Section header ───────────────────────────────────────────────────
  let y = margin + 60;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.emeraldDeep);
  doc.text('// PENAWARAN ASURANSI — 01', margin, y);

  y += 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...COLOR.ink);
  doc.text('Data Nasabah & Objek Pertanggungan', margin, y);

  // Right meta under header
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.inkMuted);
  doc.text(d.quotationNumber, pageW - margin, y - 6, { align: 'right' });
  doc.text(`Renewal of Policy No. ${d.previousPolicyNumber || '-'}`, pageW - margin, y + 6, { align: 'right' });

  // ─── Two-column data boxes ────────────────────────────────────────────
  y += 28;
  const colW = (pageW - 2 * margin - 12) / 2;
  const boxH = 230;

  // LEFT BOX: Tertanggung
  drawDataBox(doc, margin, y, colW, boxH, '// TERTANGGUNG', [
    { label: 'NAMA TERTANGGUNG', value: d.insuredName },
    { label: 'ALAMAT', value: d.insuredAddress },
    { label: 'PENANGGUNG', value: d.insurer },
    { label: 'PERIODE', value: `${d.periodStart} s.d. ${d.periodEnd}` },
  ]);

  // RIGHT BOX: Objek Pertanggungan
  drawDataBox(doc, margin + colW + 12, y, colW, boxH, '// OBJEK PERTANGGUNGAN', [
    { label: 'MERK / TIPE / TAHUN', value: `${d.vehicleBrand} / ${d.vehicleType} / ${d.vehicleYear}` },
    { label: 'NO. MESIN', value: d.engineNumber, mono: true },
    { label: 'NO. RANGKA', value: d.chassisNumber, mono: true },
    { label: 'NOMOR POLISI', value: d.plateNumber, mono: true },
    { label: 'TEMPAT DUDUK / WARNA', value: `${d.seats} · ${d.color}` },
    { label: 'PENGGUNAAN', value: d.usage },
  ]);

  // ─── Section: Kondisi & Luas Jaminan ──────────────────────────────────
  y += boxH + 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.emeraldDeep);
  doc.text('// KONDISI & LUAS JAMINAN', margin, y);

  y += 10;
  drawCoverageList(doc, margin, y, pageW - 2 * margin, [
    { label: 'KONDISI PERTANGGUNGAN', value: d.coverageCondition },
    { label: 'JAMINAN TAMBAHAN', value: d.additionalCoverage },
    { label: 'RISIKO SENDIRI', value: d.deductible },
  ]);

  // ─── Klausul boxes (3 horizontal) ─────────────────────────────────────
  y += 130;
  const klausulW = (pageW - 2 * margin - 20) / 3;
  d.klausulList.slice(0, 3).forEach((k, i) => {
    const kx = margin + i * (klausulW + 10);
    doc.setFillColor(132, 204, 69, 0.10 * 255);
    doc.setDrawColor(132, 204, 69, 0.30 * 255);
    doc.setLineWidth(0.6);
    doc.roundedRect(kx, y, klausulW, 36, 7, 7, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.emeraldDeep);
    const lines = doc.splitTextToSize(k, klausulW - 16);
    doc.text(lines, kx + klausulW / 2, y + 18 + (lines.length > 1 ? -4 : 0), { align: 'center' });
  });

  // ─── Section: Harga Pertanggungan ─────────────────────────────────────
  y += 60;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.emeraldDeep);
  doc.text('// HARGA PERTANGGUNGAN', margin, y);

  y += 10;
  drawSumInsuredTable(doc, margin, y, pageW - 2 * margin, d.sumInsuredItems, d.totalSumInsured, currency);

  // ─── Footer ───────────────────────────────────────────────────────────
  drawLightFooter(doc, pageW, pageH, margin, d.quotationNumber, 2);
}

// ─── Page 3: Premi & Terms ────────────────────────────────────────────────
function drawPremiPage(doc: any, d: QuotationSlipData, ctx: any) {
  const { pageW, pageH, margin, currency, logoDataUrl } = ctx;

  doc.setFillColor(...COLOR.white);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Top row
  drawSurePathLogo(doc, margin, margin + 6, 'dark', logoDataUrl);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR.inkMuted);
  doc.text('PENAWARAN ASURANSI', pageW - margin, margin + 2, { align: 'right' });
  doc.setTextColor(...COLOR.emeraldDeep);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Hal. 3 dari 4', pageW - margin, margin + 14, { align: 'right' });

  // Section header
  let y = margin + 60;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.emeraldDeep);
  doc.text('// PENAWARAN ASURANSI — 02', margin, y);

  y += 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...COLOR.ink);
  doc.text('Perhitungan Premi, Subjectivity', margin, y);
  y += 22;
  doc.text('& Syarat Ketentuan', margin, y);

  // Right meta
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.inkMuted);
  doc.text(d.quotationNumber, pageW - margin, y - 22, { align: 'right' });

  // Section: Perhitungan Premi
  y += 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.emeraldDeep);
  doc.text('// PERHITUNGAN PREMI PERPANJANGAN', margin, y);

  y += 10;
  drawPremiumTable(doc, margin, y, pageW - 2 * margin, d, currency);

  // Beige note box
  y += 165;
  doc.setFillColor(...COLOR.beige);
  doc.rect(margin, y, 3, 32, 'F');
  doc.setFillColor(...COLOR.beige);
  doc.rect(margin + 3, y, pageW - 2 * margin - 3, 32, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.beigeText);
  doc.text('Catatan Penting:', margin + 12, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const noteText = `Harga/premi di atas bersifat indikatif dan dapat berubah tergantung hasil penilaian, persetujuan, dan ketentuan final dari perusahaan asuransi (${d.insurerShort}). Premi final akan dikonfirmasi sebelum penerbitan polis.`;
  const noteLines = doc.splitTextToSize(noteText, pageW - 2 * margin - 24);
  doc.text(noteLines, margin + 12, y + 22);

  // Section: Subjectivity
  y += 50;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.emeraldDeep);
  doc.text('// SUBJECTIVITY — SYARAT PENUTUPAN', margin, y);

  // WAJIB box
  y += 10;
  doc.setFillColor(132, 204, 69, 0.10 * 255);
  doc.setDrawColor(132, 204, 69, 0.30 * 255);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, pageW - 2 * margin, 36, 8, 8, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR.emeraldDeep);
  doc.text('✓', margin + 12, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.text('WAJIB', margin + 24, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.ink);
  const wajibText = '— Survey / inspeksi fisik kendaraan (mandatory vehicle survey) oleh surveyor yang ditunjuk Penanggung sebelum penerbitan polis. Jaminan berlaku efektif setelah hasil survey disetujui oleh Penanggung.';
  const wajibLines = doc.splitTextToSize(wajibText, pageW - 2 * margin - 90);
  doc.text(wajibLines, margin + 64, y + 14);

  // Numbered list (subjectivity)
  y += 50;
  drawNumberedList(doc, margin, y, pageW - 2 * margin, d.subjectivityList);

  // Section: Syarat & Ketentuan
  y += 24 + d.subjectivityList.length * 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.emeraldDeep);
  doc.text('// SYARAT & KETENTUAN PENAWARAN', margin, y);
  y += 10;
  drawNumberedList(doc, margin, y, pageW - 2 * margin, d.termsList);

  // Footer
  drawLightFooter(doc, pageW, pageH, margin, d.quotationNumber, 3);
}

// ─── Page 4: Payment ──────────────────────────────────────────────────────
function drawPaymentPage(doc: any, d: QuotationSlipData, ctx: any) {
  const { pageW, pageH, margin, currency,
          closingTitle, closingAccent, closingDesc,
          periodStartShort, periodEndShort,
          discountAmountClean, totalPremiumClean, bankNameShort, logoDataUrl } = ctx;

  // Full dark green background
  doc.setFillColor(...COLOR.darkBg);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Decorative circle
  doc.setFillColor(20, 70, 40);
  doc.circle(pageW - 60, 180, 110, 'F');

  // Top row
  drawSurePathLogo(doc, margin, margin + 6, 'light', logoDataUrl);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255, 0.45 * 255);
  doc.text('KONFIRMASI & PEMBAYARAN', pageW - margin, margin + 2, { align: 'right' });
  doc.setTextColor(...COLOR.emerald);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Hal. 4 dari 4', pageW - margin, margin + 14, { align: 'right' });

  // Doc tag
  let y = margin + 60;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.emerald);
  doc.text('// KONFIRMASI & PEMBAYARAN', margin, y);

  // Closing title
  y += 30;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(...COLOR.white);
  doc.text(closingTitle, margin, y);
  y += 34;
  doc.setTextColor(...COLOR.emerald);
  doc.text(closingAccent, margin, y);

  // Closing desc
  y += 28;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255, 0.72 * 255);
  const descLines = doc.splitTextToSize(closingDesc, pageW - 2 * margin - 30);
  doc.text(descLines, margin, y);

  // ─── Billing card (white) ─────────────────────────────────────────────
  y += 50;
  const cardW = pageW - 2 * margin;
  const cardH = 170;

  doc.setFillColor(...COLOR.white);
  doc.roundedRect(margin, y, cardW, cardH, 12, 12, 'F');

  // Tag
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR.emeraldDeep);
  doc.text(`// RINCIAN TAGIHAN — ${d.quotationNumber}`, margin + 16, y + 18);

  // Divider
  doc.setDrawColor(220, 230, 225);
  doc.setLineWidth(0.5);
  doc.line(margin + 16, y + 24, margin + cardW - 16, y + 24);

  // Rows
  const rows = [
    { label: `Premi Asuransi Kendaraan Comprehensive + TPL (${periodStartShort} – ${periodEndShort})`, value: `${currency} ${d.subtotalPremium}` },
    { label: d.discountLabel, value: `(${currency} ${discountAmountClean})`, isDiscount: true },
    { label: 'Biaya Polis', value: `${currency} ${d.policyFee}` },
    { label: 'Biaya Materai', value: `${currency} ${d.stampDuty}` },
  ];

  let rowY = y + 40;
  rows.forEach(r => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR.ink);
    const labelLines = doc.splitTextToSize(r.label, cardW - 200);
    doc.text(labelLines, margin + 16, rowY);
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    if (r.isDiscount) doc.setTextColor(...COLOR.emeraldDeep);
    else doc.setTextColor(...COLOR.ink);
    doc.text(r.value, margin + cardW - 16, rowY, { align: 'right' });
    rowY += 18;
  });

  // Total row (green background, full-width)
  const totalY = y + cardH - 38;
  doc.setFillColor(...COLOR.emeraldDeep);
  doc.rect(margin, totalY - 12, cardW, 38, 'F');
  // Re-round bottom corners by drawing a rectangle that overlaps rounded top
  doc.setFillColor(...COLOR.emeraldDeep);
  doc.roundedRect(margin, y, cardW, cardH, 12, 12, 'F');
  // Re-draw white background up to total row
  doc.setFillColor(...COLOR.white);
  doc.roundedRect(margin + 0.5, y + 0.5, cardW - 1, totalY - y - 12, 12, 0, 'F');
  // Re-draw rows above total (the white rect covered them)
  // Re-draw tag + rows
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR.emeraldDeep);
  doc.text(`// RINCIAN TAGIHAN — ${d.quotationNumber}`, margin + 16, y + 18);
  doc.setDrawColor(220, 230, 225);
  doc.setLineWidth(0.5);
  doc.line(margin + 16, y + 24, margin + cardW - 16, y + 24);

  rowY = y + 40;
  rows.forEach(r => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR.ink);
    const labelLines = doc.splitTextToSize(r.label, cardW - 200);
    doc.text(labelLines, margin + 16, rowY);
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    if (r.isDiscount) doc.setTextColor(...COLOR.emeraldDeep);
    else doc.setTextColor(...COLOR.ink);
    doc.text(r.value, margin + cardW - 16, rowY, { align: 'right' });
    rowY += 18;
  });

  // Total label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR.white);
  doc.text('TOTAL PEMBAYARAN', margin + 16, totalY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`${currency} ${d.totalPremium}`, margin + cardW - 16, totalY + 8, { align: 'right' });

  // ─── 2-column bank + total ────────────────────────────────────────────
  y += cardH + 12;
  const halfW = (cardW - 10) / 2;
  const colH = 110;

  // Left box: Bank transfer
  doc.setFillColor(...COLOR.darkBgMid);
  doc.setDrawColor(...COLOR.borderMuted);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, halfW, colH, 10, 10, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR.emerald);
  doc.text('TRANSFER PEMBAYARAN KE', margin + 16, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLOR.emerald);
  doc.text(d.bankName, margin + 16, y + 38);
  doc.setFont('courier', 'bold');
  doc.setFontSize(13);
  doc.text(d.bankAccount, margin + 16, y + 58);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255, 0.72 * 255);
  doc.text(`a.n. ${d.bankAccountName}`, margin + 16, y + 74);

  // Right box: Total jatuh tempo
  doc.setFillColor(...COLOR.darkBgMid);
  doc.setDrawColor(...COLOR.borderMuted);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin + halfW + 10, y, halfW, colH, 10, 10, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR.emerald);
  doc.text('TOTAL JATUH TEMPO', margin + halfW + 26, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...COLOR.emerald);
  doc.text(`${currency}`, margin + halfW + 26, y + 44);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  const tw = doc.getTextWidth(`${currency} `);
  doc.text(totalPremiumClean, margin + halfW + 26 + tw, y + 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255, 0.45 * 255);
  const dueLines = doc.splitTextToSize(`Jatuh tempo pembayaran: ${d.paymentDueDate} · Premi indikatif, dapat berubah sesuai konfirmasi asuransi`, halfW - 32);
  doc.text(dueLines, margin + halfW + 26, y + 64);

  // ─── 3-step process ───────────────────────────────────────────────────
  y += colH + 14;
  const stepW = (cardW - 20) / 3;
  const stepH = 95;
  const steps = [
    { num: '1', title: 'Konfirmasi & Survey', desc: `Konfirmasi perpanjangan ke tim SurePath, lalu jadwalkan survey kendaraan (wajib) oleh surveyor ${d.insurerShort}.` },
    { num: '2', title: 'Lakukan Pembayaran', desc: `Transfer ke rekening ${bankNameShort} di atas. Berita transfer: ${d.transferMemo}` },
    { num: '3', title: 'Polis Diterbitkan', desc: `Setelah survey disetujui dan pembayaran diterima, polis perpanjangan ${d.insurerShort} diterbitkan dan dikirimkan kepada Anda.` },
  ];

  steps.forEach((s, i) => {
    const sx = margin + i * (stepW + 10);
    doc.setFillColor(...COLOR.darkBgMid);
    doc.setDrawColor(...COLOR.borderMuted);
    doc.setLineWidth(0.5);
    doc.roundedRect(sx, y, stepW, stepH, 8, 8, 'FD');

    // Step number circle
    doc.setFillColor(...COLOR.emerald);
    doc.circle(sx + 16, y + 18, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR.darkBg);
    doc.text(s.num, sx + 16, y + 21, { align: 'center' });

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR.white);
    doc.text(s.title, sx + 32, y + 22);

    // Description
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255, 0.72 * 255);
    const descLines = doc.splitTextToSize(s.desc, stepW - 24);
    doc.text(descLines, sx + 12, y + 42);
  });

  // ─── Footer ───────────────────────────────────────────────────────────
  const footerY = pageH - 36;
  doc.setDrawColor(...COLOR.borderMuted);
  doc.setLineDashPattern([2, 3], 0);
  doc.line(margin, footerY, pageW - margin, footerY);
  doc.setLineDashPattern([], 0);
  doc.setFillColor(...COLOR.emerald);
  doc.circle(margin, footerY, 2.5, 'F');
  doc.circle(pageW - margin, footerY, 2.5, 'F');
  doc.circle(pageW / 2, footerY, 2.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.white);
  doc.text('SurePath', margin, footerY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255, 0.72 * 255);
  doc.text('· PT. Ruang Proteksi Indonesia · ', margin + doc.getTextWidth('SurePath'), footerY + 14);
  doc.setTextColor(...COLOR.emerald);
  doc.text('myinsurepath.com', margin + doc.getTextWidth('SurePath · PT. Ruang Proteksi Indonesia · '), footerY + 14);
  doc.setTextColor(255, 255, 255, 0.72 * 255);
  doc.text(' · @SurePathID', margin + doc.getTextWidth('SurePath · PT. Ruang Proteksi Indonesia · myinsurepath.com'), footerY + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR.emerald);
  doc.text(`${d.quotationNumber} · Hal. 4 dari 4`, pageW - margin, footerY + 14, { align: 'right' });
}

// ═══════════════════════════════════════════════════════════════════════
// SHARED DRAWING HELPERS
// ═══════════════════════════════════════════════════════════════════════

// SurePath logo: real logo image (logo-full.png) OR fallback SVG shield + wordmark
function drawSurePathLogo(doc: any, x: number, y: number, mode: 'light' | 'dark', logoDataUrl?: string | null) {
  // If we have the real SurePath logo as a data URL, render the image only.
  // logo-full.png already contains shield + "SurePath" wordmark + tagline (600×180 landscape).
  // We fit it to ~120×36pt — sized to match a header logo position.
  const logoBoxW = 120;
  const logoBoxH = 36;

  if (logoDataUrl) {
    try {
      // Detect format from data URL prefix
      const fmt = logoDataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
      // y is the baseline position; image is drawn above & slightly below baseline
      doc.addImage(logoDataUrl, fmt, x, y - logoBoxH + 8, logoBoxW, logoBoxH, undefined, 'FAST');
      console.log(`QuotationSlip: ✓ Logo image embedded (${fmt}, ${logoBoxW}×${logoBoxH}pt)`);
      return;
    } catch (e) {
      console.warn('QuotationSlip: addImage failed, falling back to SVG shield', e);
    }
  }

  // Fallback: SVG-drawn shield + wordmark
  const shieldColor = COLOR.emerald;
  const textColor = mode === 'light' ? COLOR.white : COLOR.ink;
  const taglineColor = mode === 'light' ? [255, 255, 255, 0.45 * 255] as any : COLOR.inkMuted;

  const sx = x;
  const sy = y - 16;

  doc.setFillColor(...shieldColor);
  const shieldPoints = [
    [sx + 9,  sy + 0],
    [sx + 18, sy + 3],
    [sx + 18, sy + 10],
    [sx + 9,  sy + 18],
    [sx + 0,  sy + 10],
    [sx + 0,  sy + 3],
  ];
  drawPolygon(doc, shieldPoints, true, true);

  doc.setDrawColor(...(mode === 'light' ? COLOR.darkBg : COLOR.white));
  doc.setLineWidth(1.5);
  doc.line(sx + 9, sy + 5, sx + 9, sy + 13);
  doc.line(sx + 5, sy + 9, sx + 13, sy + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...textColor);
  doc.text('SurePath', x + 24, y);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  const tc = taglineColor as any;
  doc.setTextColor(tc[0], tc[1], tc[2], tc[3] ?? 255);
  doc.text('Your Path to Protection.', x + 24, y + 10);
}

// Load SurePath logo from /logo-full.png as a JPEG data URL for embedding in jsPDF.
// Uses canvas to resize & convert to JPEG (jsPDF addImage is more reliable with JPEG).
// Falls back to PNG data URL if canvas conversion fails.
async function loadLogoAsDataUrl(overrideUrl?: string): Promise<string | null> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return null;
  try {
    // Allow override (e.g. custom logo set in localStorage)
    let url = overrideUrl;
    if (!url && typeof localStorage !== 'undefined') {
      const custom = localStorage.getItem('surepath_custom_logo');
      if (custom) url = custom;
    }
    // Default: use logo-full.png (horizontal, 600×180, includes wordmark + tagline)
    if (!url) url = '/logo-full.png';

    console.log('QuotationSlip: Loading logo from', url);
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) {
      console.warn('QuotationSlip: Logo fetch failed, HTTP', res.status);
      return null;
    }
    const blob = await res.blob();
    console.log('QuotationSlip: Logo blob size', blob.size, 'bytes, type', blob.type);

    // Convert blob to image, draw on canvas at scaled size, export as JPEG data URL
    // (jsPDF addImage is much more reliable with JPEG than PNG RGBA)
    const pngDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Try canvas resize + JPEG conversion
    try {
      const img = await loadImage(pngDataUrl);
      // Target width: 240px (high enough for crisp PDF, small enough for fast embedding)
      // Preserve aspect ratio
      const targetW = 240;
      const targetH = Math.round(img.height * (targetW / img.width));
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context not available');
      // White background to handle transparency (RGBA → JPEG)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);
      const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      console.log('QuotationSlip: ✓ Logo converted to JPEG', jpegDataUrl.length, 'chars');
      return jpegDataUrl;
    } catch (e) {
      console.warn('QuotationSlip: Canvas conversion failed, using PNG data URL', e);
      return pngDataUrl;
    }
  } catch (e) {
    console.warn('QuotationSlip: loadLogoAsDataUrl failed', e);
    return null;
  }
}

// Helper: load an image from a data URL
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

// Helper: draw polygon (closed path) with fill + optional stroke
function drawPolygon(doc: any, points: number[][], fill: boolean, stroke: boolean) {
  if (points.length < 3) return;
  const [x0, y0] = points[0];
  // Use lines with shape drawing
  doc.lines(
    points.slice(1).map(([x, y], i) => [x - points[i][0], y - points[i][1]]),
    x0, y0, [1, 1], fill ? (stroke ? 'FD' : 'F') : 'S', true
  );
}

// Data box (rounded rect with label header)
function drawDataBox(doc: any, x: number, y: number, w: number, h: number, label: string, fields: { label: string; value: string; mono?: boolean }[]) {
  doc.setFillColor(...COLOR.lightBg);
  doc.setDrawColor(26, 47, 42, 0.18 * 255);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 10, 10, 'FD');

  // Label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR.emeraldDeep);
  doc.text(label, x + 16, y + 18);

  // Fields
  let fy = y + 36;
  fields.forEach(f => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR.inkMuted);
    doc.text(f.label, x + 16, fy);
    doc.setFont(f.mono ? 'courier' : 'helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR.ink);
    const valLines = doc.splitTextToSize(f.value, w - 32);
    doc.text(valLines, x + 16, fy + 12);
    fy += 16 + (valLines.length - 1) * 10 + 8;
  });
}

// Coverage list (3 rows: label left, value right)
function drawCoverageList(doc: any, x: number, y: number, w: number, rows: { label: string; value: string }[]) {
  const rowH = 36;
  doc.setDrawColor(26, 47, 42, 0.18 * 255);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, rowH * rows.length, 10, 10, 'FD');

  rows.forEach((r, i) => {
    if (i > 0) {
      doc.setDrawColor(26, 47, 42, 0.10 * 255);
      doc.setLineWidth(0.4);
      doc.line(x + 12, y + i * rowH, x + w - 12, y + i * rowH);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR.inkMuted);
    doc.text(r.label, x + 16, y + i * rowH + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR.ink);
    const valLines = doc.splitTextToSize(r.value, w - 220);
    doc.text(valLines, x + 200, y + i * rowH + 14);
  });
}

// Sum insured table
function drawSumInsuredTable(doc: any, x: number, y: number, w: number, items: any[], total: string, currency: string) {
  const cols = [30, w - 30 - 60 - 110, 60, 110];
  const rowH = 22;
  const headerH = 22;
  const totalH = headerH + items.length * rowH + rowH;

  // Border
  doc.setDrawColor(26, 47, 42, 0.18 * 255);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, totalH, 8, 8, 'FD');

  // Header (deep green)
  doc.setFillColor(...COLOR.emeraldDeep);
  // We need to round only top corners — trick: draw rounded rect then cover bottom with rectangle
  doc.roundedRect(x, y, w, headerH, 8, 8, 'F');
  doc.rect(x, y + headerH - 8, w, 8, 'F'); // cover bottom round

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR.white);
  doc.text('NO', x + 8, y + 14);
  doc.text('URAIAN', x + cols[0] + 8, y + 14);
  doc.text('MATA UANG', x + cols[0] + cols[1] + 8, y + 14);
  doc.text('NILAI PERTANGGUNGAN', x + w - 8, y + 14, { align: 'right' });

  // Body rows
  let ry = y + headerH;
  items.forEach(item => {
    doc.setDrawColor(26, 47, 42, 0.10 * 255);
    doc.setLineWidth(0.3);
    doc.line(x, ry, x + w, ry);

    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.inkMuted);
    doc.text(item.no, x + 8, ry + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR.ink);
    doc.text(item.desc, x + cols[0] + 8, ry + 14);

    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.inkMuted);
    doc.text(currency, x + cols[0] + cols[1] + 8, ry + 14);

    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.ink);
    doc.text(item.amount, x + w - 8, ry + 14, { align: 'right' });

    ry += rowH;
  });

  // Total row (deep green)
  doc.setFillColor(...COLOR.emeraldDeep);
  doc.rect(x, ry, w, rowH, 'F');
  // Round bottom corners
  doc.roundedRect(x, ry, w, rowH, 0, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR.white);
  doc.text('Total Harga Pertanggungan', x + cols[0] + 8, ry + 14);
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.text(currency, x + cols[0] + cols[1] + 8, ry + 14);
  doc.text(total, x + w - 8, ry + 14, { align: 'right' });
}

// Premium calculation table
function drawPremiumTable(doc: any, x: number, y: number, w: number, d: QuotationSlipData, _currency: string) {
  const cols = [w - 180 - 80 - 140, 180, 80, 140];
  const headerH = 22;
  const rowH = 22;
  const summaryRows = 6; // subtotal, discount, after-discount, policy, stamp, total
  const totalH = headerH + d.premiumComponents.length * rowH + summaryRows * rowH;

  // Outer border
  doc.setDrawColor(26, 47, 42, 0.18 * 255);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, totalH, 8, 8, 'FD');

  // Header
  doc.setFillColor(...COLOR.emeraldDeep);
  doc.roundedRect(x, y, w, headerH, 8, 8, 'F');
  doc.rect(x, y + headerH - 8, w, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR.white);
  doc.text('KOMPONEN', x + 8, y + 14);
  doc.text('DASAR PERHITUNGAN', x + cols[0] + 8, y + 14);
  doc.text('RATE', x + cols[0] + cols[1] + 8, y + 14);
  doc.text('PREMI (IDR)', x + w - 8, y + 14, { align: 'right' });

  // Body rows
  let ry = y + headerH;
  d.premiumComponents.forEach(c => {
    doc.setDrawColor(26, 47, 42, 0.10 * 255);
    doc.setLineWidth(0.3);
    doc.line(x, ry, x + w, ry);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR.ink);
    doc.text(c.component, x + 8, ry + 14);

    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.inkMuted);
    doc.text(c.basis, x + cols[0] + 8, ry + 14);

    doc.text(c.rate, x + cols[0] + cols[1] + 8, ry + 14);

    doc.setFont('courier', 'bold');
    doc.setTextColor(...COLOR.ink);
    doc.text(c.premium, x + w - 8, ry + 14, { align: 'right' });

    ry += rowH;
  });

  // Summary rows
  const summary = [
    { label: 'Subtotal Premi', value: d.subtotalPremium, color: 'ink' },
    { label: d.discountLabel, value: d.discountAmount, color: 'emerald' },
    { label: 'Premi Setelah Diskon', value: d.premiumAfterDiscount, color: 'ink' },
    { label: 'Biaya Polis', value: d.policyFee, color: 'ink' },
    { label: 'Biaya Materai', value: d.stampDuty, color: 'ink' },
  ];

  summary.forEach(s => {
    doc.setDrawColor(26, 47, 42, 0.10 * 255);
    doc.setLineWidth(0.3);
    doc.line(x, ry, x + w, ry);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...(s.color === 'emerald' ? COLOR.emeraldDeep : COLOR.inkMuted));
    doc.text(s.label, x + w - cols[2] - cols[3] - 8, ry + 14, { align: 'right' });

    doc.setFont('courier', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...(s.color === 'emerald' ? COLOR.emeraldDeep : COLOR.ink));
    doc.text(s.value, x + w - 8, ry + 14, { align: 'right' });

    ry += rowH;
  });

  // Total row
  doc.setFillColor(...COLOR.emeraldDeep);
  doc.roundedRect(x, ry, w, rowH, 0, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR.white);
  doc.text('TOTAL PREMI JATUH TEMPO', x + w - cols[2] - cols[3] - 8, ry + 14, { align: 'right' });
  doc.setFont('courier', 'bold');
  doc.text(d.totalPremium, x + w - 8, ry + 14, { align: 'right' });
}

// Numbered list
function drawNumberedList(doc: any, x: number, y: number, w: number, items: string[]) {
  items.forEach((item, i) => {
    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.emeraldDeep);
    doc.text(`${i + 1}.`, x, y + i * 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.ink);
    const lines = doc.splitTextToSize(item, w - 20);
    doc.text(lines, x + 20, y + i * 18);
  });
}

// Light page footer
function drawLightFooter(doc: any, pageW: number, pageH: number, margin: number, quoteNum: string, pageNum: number) {
  const footerY = pageH - 36;
  doc.setDrawColor(26, 47, 42, 0.18 * 255);
  doc.setLineDashPattern([2, 3], 0);
  doc.setLineWidth(0.4);
  doc.line(margin, footerY, pageW - margin, footerY);
  doc.setLineDashPattern([], 0);
  doc.setFillColor(...COLOR.emeraldDeep);
  doc.circle(margin, footerY, 2, 'F');
  doc.circle(pageW - margin, footerY, 2, 'F');
  doc.circle(pageW / 2, footerY, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.ink);
  doc.text('SurePath', margin, footerY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR.inkMuted);
  doc.text('· PT. Ruang Proteksi Indonesia — ', margin + doc.getTextWidth('SurePath'), footerY + 14);
  doc.setTextColor(...COLOR.emeraldDeep);
  doc.text('Your Path to Protection.', margin + doc.getTextWidth('SurePath · PT. Ruang Proteksi Indonesia — '), footerY + 14);

  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR.emeraldDeep);
  doc.text(`${quoteNum} · Hal. ${pageNum} dari 4`, pageW - margin, footerY + 14, { align: 'right' });
}
