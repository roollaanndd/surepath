import { jsPDF } from 'jspdf';

/* ─── SurePath Proposal PDF — 3-page professional quotation proposal ─────────
   Page 1: branded cover · Page 2: quotation + breakdown · Page 3: benefits,
   terms & approval. A4 portrait, emerald brand palette, official logo. */

export interface ProposalPDFData {
  quoteNumber: string;
  validUntil: string;           // ISO date
  clientName: string;
  clientPhone?: string;
  preparedBy: string;           // agent name or 'SurePath Digital'
  preparedByCode?: string;      // agent code
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear?: number;
  vehiclePlate?: string;
  vehiclePrice: number;         // sum insured
  coverageType: 'COMPREHENSIVE' | 'TLO';
  zone?: number;
  ojkRate?: number;             // decimal p.a. (0.0247 = 2.47%)
  rateBand?: 'MIN' | 'MID' | 'MAX';
  providerName?: string;
  rows: { label: string; amount: number }[];  // premium lines incl. base + addons + fees
  discountAmount?: number;
  totalPremium: number;
}

const EMERALD: [number, number, number]      = [5, 150, 105];
const EMERALD_DK: [number, number, number]   = [6, 78, 59];
const EMERALD_LT: [number, number, number]   = [209, 250, 229];
const INK: [number, number, number]          = [15, 23, 42];
const INK_MUTED: [number, number, number]    = [100, 116, 139];
const PAPER: [number, number, number]        = [246, 250, 247];

const fmtIDR = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const fmtDate = (d: Date) =>
  d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

// Load the official logo once and cache the dataURL
let logoCache: string | null = null;
async function loadLogo(): Promise<string | null> {
  if (logoCache) return logoCache;
  try {
    const blob = await (await fetch('/logo.png')).blob();
    logoCache = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
    return logoCache;
  } catch { return null; }
}

// Vector shield fallback + decorative winding path
function drawPath(doc: jsPDF, y: number, w: number, color: [number, number, number], alpha = 1) {
  doc.saveGraphicsState();
  doc.setGState(doc.GState({ opacity: alpha }));
  doc.setDrawColor(...color);
  doc.setLineWidth(1.1);
  doc.setLineCap('round');
  // gentle S-curve across the page
  doc.lines([[w * 0.22, 0, w * 0.28, -16, w * 0.5, -16], [w * 0.22, 0, w * 0.28, 16, w * 0.5, 16]], 0, y, [1, 1], 'S');
  doc.restoreGraphicsState();
}

function pageFooter(doc: jsPDF, pageNum: number, total: number) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(14, ph - 16, pw - 14, ph - 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...INK_MUTED);
  doc.text('SurePath — Asuransi Digital Terpercaya · myinsurepath.com', 14, ph - 10);
  doc.setTextColor(...EMERALD);
  doc.text(`${pageNum} / ${total}`, pw - 14, ph - 10, { align: 'right' });
}

export async function generateProposalPDF(d: ProposalPDFData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();   // 210
  const ph = doc.internal.pageSize.getHeight();  // 297
  const mL = 18, mR = pw - 18, cw = pw - 36;
  const logo = await loadLogo();
  const today = new Date();
  const covLabel = d.coverageType === 'COMPREHENSIVE' ? 'Komprehensif (All Risk)' : 'Total Loss Only (TLO)';

  /* ════════ PAGE 1 — COVER ════════ */
  // full-bleed deep emerald canvas with layered tones
  doc.setFillColor(...EMERALD_DK);
  doc.rect(0, 0, pw, ph, 'F');
  doc.setFillColor(4, 60, 46);
  doc.rect(0, ph * 0.58, pw, ph * 0.42, 'F');
  // soft accent circles
  doc.saveGraphicsState();
  doc.setGState(doc.GState({ opacity: 0.14 }));
  doc.setFillColor(52, 211, 153);
  doc.circle(pw * 0.88, ph * 0.12, 52, 'F');
  doc.circle(pw * 0.06, ph * 0.86, 64, 'F');
  doc.restoreGraphicsState();
  // winding brand paths
  drawPath(doc, ph * 0.62, pw, [52, 211, 153], 0.5);
  drawPath(doc, ph * 0.66, pw, [110, 231, 183], 0.25);

  // logo tile
  const tile = 44;
  doc.saveGraphicsState();
  doc.setGState(doc.GState({ opacity: 0.12 }));
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pw / 2 - tile / 2 - 5, 46 - 5, tile + 10, tile + 10, 10, 10, 'F');
  doc.restoreGraphicsState();
  if (logo) {
    doc.addImage(logo, 'PNG', pw / 2 - tile / 2 + 3, 46, tile - 6, tile);
  }

  // heading
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(167, 243, 208);
  doc.text('P R O P O S A L   P E N A W A R A N', pw / 2, 112, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(27);
  doc.setTextColor(255, 255, 255);
  doc.text('Asuransi Kendaraan', pw / 2, 126, { align: 'center' });
  doc.text('Bermotor', pw / 2, 138, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(190, 242, 220);
  doc.text(covLabel, pw / 2, 148, { align: 'center' });

  // client card
  const cardY = 170;
  doc.saveGraphicsState();
  doc.setGState(doc.GState({ opacity: 0.10 }));
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(mL + 12, cardY, cw - 24, 46, 6, 6, 'F');
  doc.restoreGraphicsState();
  doc.setDrawColor(52, 211, 153);
  doc.setLineWidth(0.4);
  doc.roundedRect(mL + 12, cardY, cw - 24, 46, 6, 6, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(167, 243, 208);
  doc.text('DIPERSIAPKAN UNTUK', pw / 2, cardY + 11, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text(d.clientName.toUpperCase(), pw / 2, cardY + 22, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(190, 242, 220);
  doc.text(`${d.vehicleBrand} ${d.vehicleModel}${d.vehicleYear ? ` · ${d.vehicleYear}` : ''}`, pw / 2, cardY + 31, { align: 'center' });
  doc.setFontSize(7);
  doc.setTextColor(140, 210, 185);
  doc.text(`No. ${d.quoteNumber}  ·  ${fmtDate(today)}`, pw / 2, cardY + 39, { align: 'center' });

  // cover footer
  doc.setFontSize(7);
  doc.setTextColor(167, 243, 208);
  doc.text(`Dipersiapkan oleh: ${d.preparedBy}${d.preparedByCode ? ` (${d.preparedByCode})` : ''}`, pw / 2, ph - 30, { align: 'center' });
  doc.setFontSize(6.2);
  doc.setTextColor(120, 190, 165);
  doc.text('SurePath — Asuransi Digital Terpercaya · myinsurepath.com', pw / 2, ph - 22, { align: 'center' });

  /* ════════ PAGE 2 — PENAWARAN ════════ */
  doc.addPage();
  doc.setFillColor(...PAPER);
  doc.rect(0, 0, pw, ph, 'F');
  // header band
  doc.setFillColor(...EMERALD_DK);
  doc.rect(0, 0, pw, 30, 'F');
  if (logo) doc.addImage(logo, 'PNG', mL, 6.5, 15, 17);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('Penawaran Premi', mL + 20, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(167, 243, 208);
  doc.text(`No. ${d.quoteNumber} · Berlaku hingga ${fmtDate(new Date(d.validUntil))}`, mL + 20, 22);
  doc.setFillColor(...EMERALD);
  doc.rect(0, 30, pw, 1, 'F');

  let y = 42;
  // intro paragraph
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  const intro = doc.splitTextToSize(
    `Kepada Yth. ${d.clientName}, terima kasih atas kepercayaan Anda. Berikut kami sampaikan penawaran premi asuransi kendaraan bermotor dengan perlindungan ${covLabel}, dihitung berdasarkan tarif resmi OJK (SEOJK No. 6/SEOJK.05/2017).`,
    cw);
  doc.text(intro, mL, y);
  y += intro.length * 4.4 + 6;

  // info grid (two columns)
  const grid: [string, string][] = [
    ['Tertanggung', d.clientName],
    ['Kendaraan', `${d.vehicleBrand} ${d.vehicleModel}${d.vehicleYear ? ` (${d.vehicleYear})` : ''}`],
    ['Nomor Polisi', d.vehiclePlate || '—'],
    ['Harga Pertanggungan', fmtIDR(d.vehiclePrice)],
    ['Jenis Perlindungan', covLabel],
    ['Wilayah OJK', d.zone ? `Wilayah ${d.zone}` : '—'],
    ['Tarif OJK', d.ojkRate ? `${(d.ojkRate * 100).toFixed(2)}% p.a.${d.rateBand ? ` (Batas ${d.rateBand === 'MIN' ? 'Bawah' : d.rateBand === 'MAX' ? 'Atas' : 'Tengah'})` : ''}` : '—'],
    ['Perusahaan Asuransi', d.providerName || 'Sesuai pilihan nasabah'],
  ];
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...EMERALD_LT);
  doc.setLineWidth(0.4);
  const gridH = Math.ceil(grid.length / 2) * 13 + 8;
  doc.roundedRect(mL, y, cw, gridH, 4, 4, 'FD');
  grid.forEach(([l, v], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = mL + 6 + col * (cw / 2);
    const yy = y + 10 + row * 13;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.4); doc.setTextColor(...INK_MUTED);
    doc.text(l.toUpperCase(), x, yy);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.6); doc.setTextColor(...INK);
    doc.text(String(v), x, yy + 4.6);
  });
  y += gridH + 10;

  // premium table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...EMERALD_DK);
  doc.text('RINCIAN PREMI', mL, y);
  doc.setFillColor(...EMERALD);
  doc.rect(mL, y + 1.5, 24, 0.7, 'F');
  y += 6;

  const rows = [...d.rows];
  if (d.discountAmount && d.discountAmount > 0) rows.push({ label: 'Diskon', amount: -d.discountAmount });
  const rowH = 8.4;
  rows.forEach((r, i) => {
    const ry = y + i * rowH;
    doc.setFillColor(...(i % 2 === 0 ? [255, 255, 255] : [240, 253, 246]) as [number, number, number]);
    doc.rect(mL, ry, cw, rowH, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.2);
    doc.setTextColor(...(r.amount < 0 ? EMERALD : INK));
    doc.text(r.label, mL + 4, ry + 5.6);
    doc.setFont('helvetica', 'bold');
    doc.text(fmtIDR(r.amount), mR - 4, ry + 5.6, { align: 'right' });
  });
  y += rows.length * rowH;
  // total bar
  doc.setFillColor(...EMERALD);
  doc.roundedRect(mL, y, cw, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
  doc.text('TOTAL PREMI TAHUNAN', mL + 4, y + 8);
  doc.setFontSize(11.5);
  doc.text(fmtIDR(d.totalPremium), mR - 4, y + 8, { align: 'right' });
  y += 20;

  // note strip
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(110, 231, 183);
  doc.roundedRect(mL, y, cw, 16, 3, 3, 'FD');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(6, 95, 70);
  doc.text('Premi mengacu pada tarif resmi OJK. Penawaran berlaku 30 hari sejak tanggal terbit.', mL + 5, y + 6.5);
  doc.text('Premi final dapat menyesuaikan hasil survei kondisi kendaraan.', mL + 5, y + 12);

  pageFooter(doc, 2, 3);

  /* ════════ PAGE 3 — MANFAAT & PERSETUJUAN ════════ */
  doc.addPage();
  doc.setFillColor(...PAPER);
  doc.rect(0, 0, pw, ph, 'F');
  doc.setFillColor(...EMERALD_DK);
  doc.rect(0, 0, pw, 30, 'F');
  if (logo) doc.addImage(logo, 'PNG', mL, 6.5, 15, 17);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(255, 255, 255);
  doc.text('Manfaat & Persetujuan', mL + 20, 15);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(167, 243, 208);
  doc.text(`No. ${d.quoteNumber}`, mL + 20, 22);
  doc.setFillColor(...EMERALD);
  doc.rect(0, 30, pw, 1, 'F');

  y = 42;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...EMERALD_DK);
  doc.text('RINGKASAN MANFAAT', mL, y);
  doc.setFillColor(...EMERALD); doc.rect(mL, y + 1.5, 24, 0.7, 'F');
  y += 8;

  const benefits = d.coverageType === 'COMPREHENSIVE'
    ? [
        'Kerugian sebagian (partial loss) — tabrakan, benturan, terbalik, tergelincir, perbuatan jahat, pencurian, kebakaran',
        'Kerugian total (total loss) — kerusakan ≥ 75% atau kehilangan akibat pencurian',
        'Perluasan sesuai pilihan: banjir & angin topan, gempa bumi & tsunami, kerusuhan (SRCC), terorisme, TPL, kecelakaan diri',
        'Proses klaim digital lewat aplikasi — cukup foto kerusakan dari HP Anda',
      ]
    : [
        'Kerugian total (total loss) — kerusakan ≥ 75% dari harga kendaraan',
        'Kehilangan kendaraan akibat pencurian',
        'Perluasan sesuai pilihan: banjir & angin topan, gempa bumi & tsunami, kerusuhan (SRCC), terorisme, TPL, kecelakaan diri',
        'Proses klaim digital lewat aplikasi — cukup foto & laporan dari HP Anda',
      ];
  benefits.forEach(b => {
    doc.setFillColor(...EMERALD);
    doc.circle(mL + 2, y - 1, 1.1, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(b, cw - 10);
    doc.text(lines, mL + 7, y);
    y += lines.length * 4.2 + 3.4;
  });
  y += 4;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...EMERALD_DK);
  doc.text('SYARAT & KETENTUAN', mL, y);
  doc.setFillColor(...EMERALD); doc.rect(mL, y + 1.5, 24, 0.7, 'F');
  y += 8;
  const terms = [
    'Penawaran ini bukan merupakan polis. Pertanggungan berlaku setelah premi dibayar dan polis diterbitkan oleh perusahaan asuransi.',
    'Risiko sendiri (deductible) minimum Rp300.000 per kejadian (roda dua Rp150.000) sesuai ketentuan OJK.',
    'Tertanggung wajib memberikan informasi yang benar. Informasi tidak benar dapat membatalkan pertanggungan.',
    'Ketentuan lengkap mengikuti Polis Standar Asuransi Kendaraan Bermotor Indonesia (PSAKBI).',
  ];
  terms.forEach((t2, i) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4); doc.setTextColor(...INK_MUTED);
    const lines = doc.splitTextToSize(`${i + 1}. ${t2}`, cw);
    doc.text(lines, mL, y);
    y += lines.length * 3.9 + 2.4;
  });
  y += 6;

  // approval boxes
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...EMERALD_DK);
  doc.text('LEMBAR PERSETUJUAN', mL, y);
  doc.setFillColor(...EMERALD); doc.rect(mL, y + 1.5, 24, 0.7, 'F');
  y += 7;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.6); doc.setTextColor(...INK);
  doc.text('Dengan menandatangani/menyetujui, Tertanggung menyatakan telah membaca dan menyetujui penawaran ini.', mL, y);
  y += 7;
  const boxW = (cw - 8) / 2, boxH = 34;
  (['Tertanggung', 'SurePath / Agen'] as const).forEach((who, i) => {
    const x = mL + i * (boxW + 8);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...EMERALD_LT);
    doc.roundedRect(x, y, boxW, boxH, 3, 3, 'FD');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.4); doc.setTextColor(...INK_MUTED);
    doc.text(who.toUpperCase(), x + 5, y + 7);
    doc.setDrawColor(203, 213, 225);
    doc.line(x + 5, y + boxH - 10, x + boxW - 5, y + boxH - 10);
    doc.setFontSize(7.6); doc.setTextColor(...INK);
    doc.text(i === 0 ? d.clientName : d.preparedBy, x + 5, y + boxH - 5);
  });

  pageFooter(doc, 3, 3);

  doc.save(`SurePath-Proposal-${d.quoteNumber}.pdf`);
}
