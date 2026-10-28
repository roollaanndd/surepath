import { AGREEMENT_META, AGREEMENT_CLAUSES } from '../components/agent/agreementContent';

// Lazy-load jsPDF to keep it out of the main bundle (358KB saved)
let _jsPDF: any = null;
async function getJsPDF(): Promise<any> {
  if (!_jsPDF) {
    const mod = await import('jspdf');
    _jsPDF = mod.jsPDF;
  }
  return _jsPDF;
}


/* ─── Agent Agreement PDF — legally-formatted, numbered, timestamped ─────────
   Emitted after an agent accepts the T&C so both parties hold an auditable
   copy carrying the agreement number, KTP, name, and acceptance timestamp. */

export interface AgreementPDFData {
  agreementNo: string;
  docVersion: string;
  fullName: string;
  ktpNumber: string;
  acceptedAt: string;   // ISO
  agentEmail?: string;
  agentPhone?: string;
}

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

const maskKtp = (k: string) => (k.length === 16 ? `${k.slice(0, 6)}******${k.slice(12)}` : k);

export async function buildAgreementPdfBlob(d: AgreementPDFData): Promise<Blob> {
  const doc = new (await getJsPDF())({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const mL = 18, mR = pw - 18, cw = pw - 36;
  const logo = await loadLogo();
  const accepted = new Date(d.acceptedAt);
  const stamp = accepted.toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';

  let page = 1;
  const drawHeader = () => {
    doc.setFillColor(...EMERALD_DK);
    doc.rect(0, 0, pw, 26, 'F');
    if (logo) doc.addImage(logo, 'PNG', mL, 5, 14, 16);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
    doc.text('SurePath', mL + 18, 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(167, 243, 208);
    doc.text(AGREEMENT_META.company.name, mL + 18, 18);
    doc.setFontSize(6.5); doc.setTextColor(190, 242, 220);
    doc.text(`No. ${d.agreementNo}`, mR, 12, { align: 'right' });
    doc.text(AGREEMENT_META.version, mR, 18, { align: 'right' });
    doc.setFillColor(...EMERALD); doc.rect(0, 26, pw, 0.8, 'F');
  };
  const drawFooter = () => {
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3);
    doc.line(mL, ph - 14, mR, ph - 14);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...MUTED);
    doc.text(`Dokumen sah ditandatangani elektronik · ${d.agreementNo}`, mL, ph - 9);
    doc.text(`Hal. ${page}`, mR, ph - 9, { align: 'right' });
  };
  const ensure = (needed: number, y: number): number => {
    if (y + needed > ph - 20) { drawFooter(); doc.addPage(); page++; drawHeader(); return 36; }
    return y;
  };

  drawHeader();
  let y = 36;

  // Title block
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...INK);
  doc.text(AGREEMENT_META.title, pw / 2, y, { align: 'center' }); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED);
  doc.text(AGREEMENT_META.subtitle, pw / 2, y, { align: 'center' }); y += 4.5;
  doc.text(`Nomor: ${d.agreementNo}  ·  Berlaku efektif ${AGREEMENT_META.effectiveDate}`, pw / 2, y, { align: 'center' }); y += 9;

  // Parties box
  doc.setFillColor(236, 253, 245); doc.setDrawColor(110, 231, 183); doc.setLineWidth(0.4);
  doc.roundedRect(mL, y, cw, 30, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...EMERALD_DK);
  doc.text('PARA PIHAK', mL + 5, y + 6);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.6); doc.setTextColor(...INK);
  doc.text(`PIHAK PERTAMA: ${AGREEMENT_META.company.name} ("Perusahaan"), berkedudukan di ${AGREEMENT_META.company.domicile}.`, mL + 5, y + 13, { maxWidth: cw - 10 });
  doc.text(`PIHAK KEDUA: ${d.fullName} — NIK/KTP ${d.ktpNumber} ("Mitra").`, mL + 5, y + 20, { maxWidth: cw - 10 });
  doc.text('Kedua pihak sepakat terikat pada seluruh ketentuan Perjanjian berikut.', mL + 5, y + 26, { maxWidth: cw - 10 });
  y += 38;

  // Clauses
  AGREEMENT_CLAUSES.forEach(cl => {
    y = ensure(12, y);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...EMERALD_DK);
    doc.text(cl.heading, mL, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.8); doc.setTextColor(...INK);
    cl.body.forEach(p => {
      const lines = doc.splitTextToSize(p, cw);
      y = ensure(lines.length * 3.9 + 2, y);
      doc.text(lines, mL, y);
      y += lines.length * 3.9 + 1.6;
    });
    y += 3;
  });

  // Acceptance / signature block
  y = ensure(52, y) + 2;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...EMERALD_DK);
  doc.text('BUKTI PERSETUJUAN ELEKTRONIK', mL, y);
  doc.setFillColor(...EMERALD); doc.rect(mL, y + 1.5, 30, 0.7, 'F'); y += 8;

  doc.setFillColor(249, 250, 251); doc.setDrawColor(209, 213, 219); doc.setLineWidth(0.3);
  doc.roundedRect(mL, y, cw, 40, 3, 3, 'FD');
  const rows: [string, string][] = [
    ['Nomor Perjanjian', d.agreementNo],
    ['Versi Dokumen', d.docVersion],
    ['Nama Lengkap (Mitra)', d.fullName],
    ['Nomor KTP (NIK)', maskKtp(d.ktpNumber)],
    ['Disetujui pada', stamp],
    ['Kontak Mitra', [d.agentEmail, d.agentPhone].filter(Boolean).join(' · ') || '—'],
  ];
  rows.forEach(([l, v], i) => {
    const yy = y + 7 + i * 5.4;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6); doc.setTextColor(...MUTED);
    doc.text(l.toUpperCase(), mL + 5, yy);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.6); doc.setTextColor(...INK);
    doc.text(String(v), mL + 55, yy);
  });
  y += 46;

  doc.setFont('helvetica', 'italic'); doc.setFontSize(6.8); doc.setTextColor(...MUTED);
  const disc = doc.splitTextToSize(
    'Dokumen ini dibuat dan disetujui secara elektronik melalui platform SurePath serta sah tanpa tanda tangan basah sesuai UU ITE. Nomor KTP ditampilkan sebagian untuk keamanan; catatan lengkap tersimpan pada sistem Perusahaan untuk keperluan audit.',
    cw);
  doc.text(disc, mL, y);

  drawFooter();
  return doc.output('blob');
}

/** Unduh PDF perjanjian ke perangkat (perilaku lama, kini memakai builder). */
export async function generateAgreementPDF(d: AgreementPDFData): Promise<void> {
  const blob = await buildAgreementPdfBlob(d);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SurePath-Perjanjian-Mitra-${d.agreementNo}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
