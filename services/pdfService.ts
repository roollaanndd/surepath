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
