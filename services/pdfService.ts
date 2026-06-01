import { jsPDF } from 'jspdf';

export interface PolicyCertData {
  policyNumber: string;
  holderName: string;
  productType: 'CAR' | 'TRAVEL' | 'PA' | 'MPAR' | string;
  provider?: string;
  premium: number;
  startDate: string;
  endDate: string;
  agentName: string;
  agentCode: string;
  coverageDetails?: Record<string, any>;
}

const formatIDR = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

export function generatePolicyCertPDF(data: PolicyCertData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  const contentW = pageW - margin * 2;

  // ─── Header Bar ───────────────────────────────────────────────────────────
  doc.setFillColor(10, 10, 10); // #0a0a0a
  doc.rect(0, 0, pageW, 56, 'F');

  // "SUREPATH" white bold left
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('SUREPATH', margin, 36);

  // "POLICY CERTIFICATE" orange right
  doc.setTextColor(249, 115, 22); // #f97316
  doc.setFontSize(11);
  doc.text('POLICY CERTIFICATE', pageW - margin, 36, { align: 'right' });

  // ─── Subheader line ───────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text('AI-Powered Insurance Infrastructure', margin, 74);

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, 84, pageW - margin, 84);

  // ─── Policy Details Section ───────────────────────────────────────────────
  let y = 110;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 30, 30);
  doc.text('POLICY DETAILS', margin, y);

  y += 24;

  // Policy Number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Policy Number', margin, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(10, 10, 10);
  doc.text(data.policyNumber, margin, y + 16);

  y += 44;

  // Holder Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Policy Holder', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(10, 10, 10);
  doc.text(data.holderName, margin, y + 16);

  // Product Type (right column)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Product Type', margin + contentW / 2, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(10, 10, 10);
  doc.text(data.productType, margin + contentW / 2, y + 16);

  y += 44;

  // Provider (if supplied)
  if (data.provider) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Insurance Provider', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(10, 10, 10);
    doc.text(data.provider, margin, y + 16);
    y += 44;
  }

  // Coverage Period
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Coverage Period', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(10, 10, 10);
  doc.text(`${data.startDate}  →  ${data.endDate}`, margin, y + 16);

  y += 44;

  // Premium
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Annual Premium', margin, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(249, 115, 22); // orange
  doc.text(formatIDR(data.premium), margin, y + 20);

  y += 48;

  // ─── Vehicle details for CAR ──────────────────────────────────────────────
  if (data.productType === 'CAR' && data.coverageDetails) {
    const vehicle = data.coverageDetails.vehicle ?? data.coverageDetails;
    const brand = vehicle.brand ?? data.coverageDetails.brand ?? '';
    const model = vehicle.model ?? data.coverageDetails.model ?? '';
    const year = vehicle.year ?? data.coverageDetails.year ?? '';

    if (brand || model) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('Vehicle', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(10, 10, 10);
      const vehicleStr = [brand, model, year ? String(year) : ''].filter(Boolean).join(' ');
      doc.text(vehicleStr, margin, y + 16);
      y += 44;
    }
  }

  // ─── Divider ─────────────────────────────────────────────────────────────
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 24;

  // ─── Agent section ────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('ISSUED BY', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(10, 10, 10);
  doc.text(`${data.agentName} (${data.agentCode})`, margin, y + 16);

  y += 44;

  // ─── Footer ───────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  const footerY = pageH - 56;

  doc.setDrawColor(220, 220, 220);
  doc.line(margin, footerY - 12, pageW - margin, footerY - 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    'This certificate is digitally generated by SurePath. Valid with policy number reference.',
    margin,
    footerY,
  );

  const today = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Generated: ${today}`, margin, footerY + 14);

  // ─── Save ─────────────────────────────────────────────────────────────────
  doc.save(`SurePath-${data.policyNumber}.pdf`);
}

// ─── Quote PDF Data Interface ─────────────────────────────────────────────────

export interface QuotePDFData {
  agentName: string;
  agentCode: string;
  clientName: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: number;
  vehiclePrice: number;
  coverageType: 'COMPREHENSIVE' | 'TLO';
  zone: number;
  category: number;
  basePremium: number;
  addons: { label: string; amount: number }[];
  adminFee: number;
  stampDuty: number;
  totalPremium: number;
  validUntil: string;
  quoteNumber: string;
}

export async function generateQuotePDF(data: QuotePDFData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();   // 210mm
  const pageH = doc.internal.pageSize.getHeight();  // 297mm
  const marginL = 14;
  const marginR = pageW - 14;
  const contentW = pageW - marginL * 2;

  // ── Colours ────────────────────────────────────────────────────────────────
  const NAVY   = [10, 22, 40]    as [number, number, number];
  const ORANGE = [249, 115, 22]  as [number, number, number];
  const WHITE  = [255, 255, 255] as [number, number, number];
  const GRAY_L = [245, 246, 248] as [number, number, number];
  const GRAY_T = [120, 120, 130] as [number, number, number];
  const DARK   = [20, 25, 35]    as [number, number, number];
  const STRIPE = [250, 251, 253] as [number, number, number];

  // ── Header Bar ─────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 45, 'F');

  // SurePath logo text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...WHITE);
  doc.text('SurePath', marginL, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(160, 170, 185);
  doc.text('Insurance Solutions', marginL, 30);

  // "SURAT PENAWARAN" right side
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...ORANGE);
  doc.text('SURAT PENAWARAN', marginR, 20, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(180, 190, 200);
  doc.text('QUOTATION SHEET', marginR, 27, { align: 'right' });

  // ── Orange accent line ──────────────────────────────────────────────────────
  doc.setFillColor(...ORANGE);
  doc.rect(0, 45, pageW, 0.8, 'F');

  // ── Quote meta block (right-aligned) ───────────────────────────────────────
  let y = 55;

  const issueDate = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const validDate = new Date(data.validUntil).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

  const metaRows = [
    { label: 'No. Penawaran', value: data.quoteNumber },
    { label: 'Tanggal Terbit', value: issueDate },
    { label: 'Berlaku Hingga', value: validDate },
  ];

  metaRows.forEach(row => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY_T);
    doc.text(row.label, marginR - 52, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(row.value, marginR, y, { align: 'right' });
    y += 6;
  });

  // ── Section: Tertanggung ───────────────────────────────────────────────────
  y = 80;

  doc.setFillColor(...GRAY_L);
  doc.roundedRect(marginL, y, contentW, 24, 3, 3, 'F');
  doc.setDrawColor(220, 222, 228);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginL, y, contentW, 24, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY_T);
  doc.text('TERTANGGUNG / NASABAH', marginL + 5, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...DARK);
  doc.text(data.clientName.toUpperCase(), marginL + 5, y + 18);

  // ── Section: Data Kendaraan ────────────────────────────────────────────────
  y += 32;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text('DATA KENDARAAN', marginL, y);

  doc.setFillColor(...ORANGE);
  doc.rect(marginL, y + 1.5, 22, 0.5, 'F');

  y += 6;

  const colW = contentW / 2 - 3;
  const vehicleGrid = [
    [{ l: 'Merek', v: data.vehicleBrand }, { l: 'Model', v: data.vehicleModel }],
    [{ l: 'Tahun', v: String(data.vehicleYear) }, { l: 'Kategori OJK', v: `Kategori ${data.category}` }],
    [{ l: 'Harga Kendaraan', v: formatIDR(data.vehiclePrice) }, { l: 'Zona', v: `Zona ${data.zone}` }],
    [{ l: 'Tipe Perlindungan', v: data.coverageType === 'COMPREHENSIVE' ? 'KOMPREHENSIF (All Risk)' : 'TLO (Total Loss Only)' }, { l: '', v: '' }],
  ];

  vehicleGrid.forEach(row => {
    y += 5;
    row.forEach((cell, ci) => {
      if (!cell.l) return;
      const x = marginL + ci * (colW + 6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...GRAY_T);
      doc.text(cell.l, x, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      doc.text(cell.v, x, y + 4.5);
    });
    y += 5.5;
  });

  // ── Section: Rincian Premi ─────────────────────────────────────────────────
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text('RINCIAN PREMI', marginL, y);

  doc.setFillColor(...ORANGE);
  doc.rect(marginL, y + 1.5, 22, 0.5, 'F');

  y += 5;

  // Table rows
  interface PremRow { label: string; amount: number; isTotal?: boolean }
  const premRows: PremRow[] = [
    { label: 'Premi Dasar (Base Premium)', amount: data.basePremium },
    ...data.addons.filter(a => a.amount > 0).map(a => ({ label: a.label, amount: a.amount })),
    { label: 'Biaya Admin', amount: data.adminFee },
    { label: 'Materai', amount: data.stampDuty },
  ];

  const rowH = 8;
  premRows.forEach((row, idx) => {
    const rowY = y + idx * rowH;
    doc.setFillColor(...(idx % 2 === 0 ? WHITE : STRIPE));
    doc.rect(marginL, rowY, contentW, rowH, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(row.label, marginL + 3, rowY + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.text(formatIDR(row.amount), marginR - 2, rowY + 5.5, { align: 'right' });
  });

  y += premRows.length * rowH;

  // Total row — orange background
  const totalH = 10;
  doc.setFillColor(...ORANGE);
  doc.rect(marginL, y, contentW, totalH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  doc.text('TOTAL PREMI TAHUNAN', marginL + 3, y + 7);
  doc.setFontSize(10);
  doc.text(formatIDR(data.totalPremium), marginR - 2, y + 7, { align: 'right' });

  y += totalH + 10;

  // ── Section: Catatan & Ketentuan ───────────────────────────────────────────
  const noteLines = [
    '• Penawaran ini berlaku 30 hari dari tanggal terbit.',
    '• Premi mengacu pada tarif OJK sesuai SEOJK No. 6/SEOJK.05/2017.',
    '• Harga dapat berubah sesuai kondisi kendaraan saat survei.',
  ];

  doc.setFillColor(255, 247, 237);
  doc.setDrawColor(253, 186, 116);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginL, y, contentW, 5 + noteLines.length * 5.5, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(180, 80, 0);
  doc.text('CATATAN & KETENTUAN', marginL + 3, y + 4);

  noteLines.forEach((line, i) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 60, 0);
    doc.text(line, marginL + 3, y + 9 + i * 5.5);
  });

  // ── Footer ─────────────────────────────────────────────────────────────────
  const footerY = pageH - 20;

  doc.setDrawColor(210, 214, 220);
  doc.setLineWidth(0.4);
  doc.line(marginL, footerY - 6, marginR, footerY - 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...DARK);
  doc.text(`Dibuat oleh: ${data.agentName} (${data.agentCode})`, marginL, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...ORANGE);
  doc.text('Protecting What Matters Most', pageW / 2, footerY, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY_T);
  doc.text('Dokumen ini dibuat secara digital dan sah tanpa tanda tangan', pageW / 2, footerY + 5, { align: 'center' });

  doc.save(`SurePath-Quote-${data.quoteNumber}.pdf`);
}
