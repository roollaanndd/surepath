// surveyReportPdf.ts — Laporan Hasil Audit Foto Survey (PDF).
//
// Audit 28 Okt 2026: hasil analisa AI atas foto survey sebelumnya hanya
// sebagian tersimpan (ai_findings) dan tidak pernah diarsipkan sebagai
// dokumen pelengkap order. Kini laporan ini dibuat saat checkout, diunggah ke
// bucket privat order-documents, dan bisa diunduh admin/asuransi.

// Lazy-load jsPDF to keep it out of the main bundle (same pattern as
// agreementPdf.ts / pdfService.ts).
let _jsPDF: any = null;
async function getJsPDF(): Promise<any> {
  if (!_jsPDF) {
    const mod = await import('jspdf');
    _jsPDF = mod.jsPDF;
  }
  return _jsPDF;
}

export interface SurveyReportInput {
  orderNumber: string;
  clientName: string;
  productName: string;
  vehicle: {
    make?: string; model?: string; year?: string | number;
    plate?: string; color?: string;
  };
  stnk?: {
    ownerName?: string; plate?: string; vin?: string; engine?: string;
    color?: string; year?: string; confidence?: number; source?: string;
  } | null;
  audit: {
    score?: number;
    verdict?: string;                       // CLEAN | MANUAL_REQUIRED | REJECTED | ...
    summary?: string;
    underwritingReport?: string;
    detailedIssues?: string[];
    photoFlags?: string[];
    recommendations?: string[];
    fraudAnalysis?: string;
    fraudRiskScore?: number;
    identityMatchScore?: number;
    bodyConditionScore?: number;
    paintConditionScore?: number;
    glassConditionScore?: number;
    interiorConditionScore?: number;
    degraded?: boolean;                     // AI gagal → verifikasi manual
  };
  photos: Array<{ slot: string; label: string; archived: boolean }>;
  stnkArchived: boolean;
  generatedByRole?: string;
}

export const VERDICT_LABEL: Record<string, string> = {
  CLEAN: 'LOLOS CEK AI',
  MANUAL_REQUIRED: 'SURVEI MANUAL',
  REJECTED: 'DITOLAK',
  REVIEW_REQUIRED: 'BUTUH TINJAUAN',
};

const EMERALD_DK: [number, number, number] = [6, 78, 59];
const EMERALD: [number, number, number]    = [5, 150, 105];
const INK: [number, number, number]        = [17, 24, 39];
const MUTED: [number, number, number]      = [107, 114, 128];

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

const fmtWib = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  }) + ' WIB';

/** Bangun PDF laporan audit (Blob) — tidak menyentuh DOM / unduhan. */
export async function buildSurveyAuditReportPdf(d: SurveyReportInput): Promise<Blob> {
  const doc = new (await getJsPDF())({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const mL = 18, mR = pw - 18, cw = pw - 36;
  const logo = await loadLogo();
  const generatedAt = fmtWib(new Date().toISOString());

  let page = 1;
  const drawHeader = () => {
    doc.setFillColor(...EMERALD_DK);
    doc.rect(0, 0, pw, 26, 'F');
    if (logo) doc.addImage(logo, 'PNG', mL, 5, 14, 16);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
    doc.text('SurePath', mL + 18, 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(167, 243, 208);
    doc.text('Laporan Hasil Audit Foto Survey', mL + 18, 18);
    doc.setFontSize(6.5); doc.setTextColor(190, 242, 220);
    doc.text(`No. Order: ${d.orderNumber}`, mR, 12, { align: 'right' });
    doc.text(`Hal. ${page}`, mR, 18, { align: 'right' });
    doc.setFillColor(...EMERALD); doc.rect(0, 26, pw, 0.8, 'F');
  };
  const drawFooter = () => {
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3);
    doc.line(mL, ph - 14, mR, ph - 14);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...MUTED);
    doc.text(`Dokumen pelengkap order ${d.orderNumber} · dibuat otomatis ${generatedAt}`, mL, ph - 9);
    doc.text('SurePath', mR, ph - 9, { align: 'right' });
  };
  const ensure = (needed: number, y: number): number => {
    if (y + needed > ph - 20) { drawFooter(); doc.addPage(); page++; drawHeader(); return 36; }
    return y;
  };
  const section = (title: string, y: number): number => {
    y = ensure(12, y);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...EMERALD_DK);
    doc.text(title, mL, y);
    doc.setFillColor(...EMERALD); doc.rect(mL, y + 1.2, 26, 0.6, 'F');
    return y + 7;
  };
  const row = (label: string, value: string, y: number): number => {
    y = ensure(5.5, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6); doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), mL, y);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.6); doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(String(value || '—'), cw - 52);
    doc.text(lines, mL + 52, y);
    return y + Math.max(1, lines.length) * 4.2 + 1.2;
  };

  drawHeader();
  let y = 36;

  // Ringkasan order & nasabah
  y = section('RINGKASAN ORDER', y);
  y = row('Nomor Order', d.orderNumber, y);
  y = row('Nasabah', d.clientName, y);
  y = row('Produk', d.productName, y);
  y = row('Dibuat', generatedAt, y);
  y += 3;

  // Data kendaraan & STNK
  y = section('DATA KENDARAAN & STNK', y);
  const v = d.vehicle ?? {};
  y = row('Merk / Model / Tahun', `${v.make ?? '—'} ${v.model ?? ''} ${v.year ?? ''}`.trim(), y);
  y = row('Nomor Plat', v.plate ?? '—', y);
  y = row('Warna', v.color ?? '—', y);
  if (d.stnk) {
    y = row('Pemilik STNK (OCR)', d.stnk.ownerName ?? '—', y);
    y = row('No. Rangka (OCR)', d.stnk.vin ?? '—', y);
    y = row('No. Mesin (OCR)', d.stnk.engine ?? '—', y);
    y = row('Sumber Bacaan', `${d.stnk.source ?? 'OCR'} · confidence ${d.stnk.confidence ?? '—'}`, y);
  } else {
    y = row('STNK', 'Tidak ada hasil OCR tercatat', y);
  }
  y = row('Arsip Foto STNK', d.stnkArchived ? 'Tersimpan pada bucket dokumen order' : 'Tidak terarsip', y);
  y += 3;

  // Hasil audit AI
  const a = d.audit ?? {};
  const verdictLabel = a.degraded
    ? 'VERIFIKASI MANUAL (ANALISA AI TIDAK TERSEDIA SAAT SUBMIT)'
    : (VERDICT_LABEL[a.verdict ?? ''] ?? a.verdict ?? '—');
  y = section('HASIL AUDIT FOTO SURVEY (AI)', y);
  y = row('Skor Audit', a.score != null ? `${a.score}/100` : '—', y);
  y = row('Vonis', verdictLabel, y);
  if (a.identityMatchScore != null) y = row('Kecocokan Identitas', `${a.identityMatchScore}/100`, y);
  if (a.bodyConditionScore != null) y = row('Kondisi Bodi', `${a.bodyConditionScore}/100`, y);
  if (a.paintConditionScore != null) y = row('Kondisi Cat', `${a.paintConditionScore}/100`, y);
  if (a.glassConditionScore != null) y = row('Kondisi Kaca', `${a.glassConditionScore}/100`, y);
  if (a.interiorConditionScore != null) y = row('Kondisi Interior', `${a.interiorConditionScore}/100`, y);
  if (a.fraudRiskScore != null) y = row('Risiko Fraud', `${a.fraudRiskScore}/100`, y);
  if (a.summary) {
    const lines = doc.splitTextToSize(a.summary, cw);
    y = ensure(lines.length * 3.9 + 3, y);
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7.2); doc.setTextColor(...MUTED);
    doc.text(lines, mL, y);
    y += lines.length * 3.9 + 3;
  }
  y += 2;

  // Temuan detail
  const issues = (a.detailedIssues ?? []).filter(Boolean);
  if (issues.length > 0) {
    y = section('TEMUAN DETAIL', y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4); doc.setTextColor(...INK);
    issues.slice(0, 12).forEach((issue, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${issue}`, cw);
      y = ensure(lines.length * 3.8 + 1, y);
      doc.text(lines, mL, y);
      y += lines.length * 3.8 + 1;
    });
    y += 2;
  }

  // Flag foto & rekomendasi
  const flags = (a.photoFlags ?? []).filter(Boolean);
  if (flags.length > 0) {
    y = section('FLAG FOTO', y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4); doc.setTextColor(...INK);
    flags.slice(0, 12).forEach((flag) => {
      const lines = doc.splitTextToSize(`• ${flag}`, cw);
      y = ensure(lines.length * 3.8 + 1, y);
      doc.text(lines, mL, y);
      y += lines.length * 3.8 + 1;
    });
    y += 2;
  }

  const recs = (a.recommendations ?? []).filter(Boolean);
  if (recs.length > 0) {
    y = section('REKOMENDASI UNDERWRITING', y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4); doc.setTextColor(...INK);
    recs.slice(0, 10).forEach((rec) => {
      const lines = doc.splitTextToSize(`• ${rec}`, cw);
      y = ensure(lines.length * 3.8 + 1, y);
      doc.text(lines, mL, y);
      y += lines.length * 3.8 + 1;
    });
    y += 2;
  }

  if (a.fraudAnalysis) {
    y = section('ANALISA FRAUD', y);
    const lines = doc.splitTextToSize(a.fraudAnalysis, cw);
    y = ensure(lines.length * 3.8 + 1, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4); doc.setTextColor(...INK);
    doc.text(lines, mL, y);
    y += lines.length * 3.8 + 2;
  }

  // Inventaris dokumen arsip
  y = section('INVENTARIS DOKUMEN ARSIP', y);
  y = row('Folder Storage', `order-documents/${d.orderNumber}/`, y);
  const photoRows = d.photos.length > 0
    ? d.photos.map(p => `${p.label}: ${p.archived ? 'terarsip' : 'gagal terarsip'}`).join(' · ')
    : 'Tidak ada foto survey';
  y = row('Foto Survey', photoRows, y);
  y = row('Laporan Ini', `survey-audit-report.pdf (dibuat ${generatedAt})`, y);
  y += 3;

  // Penutup
  doc.setFont('helvetica', 'italic'); doc.setFontSize(6.8); doc.setTextColor(...MUTED);
  const disc = doc.splitTextToSize(
    'Dokumen ini merupakan laporan pelengkap pengajuan polis, dibuat otomatis oleh platform SurePath ' +
    'berdasarkan hasil analisa foto survey dan data yang disubmit nasabah/agen. Dokumen tersimpan pada ' +
    'arsip dokumen order dan dapat diunduh oleh admin maupun perusahaan asuransi untuk keperluan audit ' +
    'dan keputusan underwriting.',
    cw);
  y = ensure((disc as string[]).length * 3.6 + 4, y);
  doc.text(disc, mL, y);

  drawFooter();
  return doc.output('blob');
}
