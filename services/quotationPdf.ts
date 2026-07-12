// quotationPdf.ts — 3-page professional quotation proposal PDF generator.
// Page 1: Cover page (stunning first impression)
// Page 2: Full quotation (customer + vehicle + premium breakdown)
// Page 3: Benefits + next steps + contact

let _jsPDF: any = null;
async function getJsPDF(): Promise<any> {
  if (!_jsPDF) {
    const mod = await import('jspdf');
    _jsPDF = mod.jsPDF;
  }
  return _jsPDF;
}

export interface QuotationData {
  // Order info
  orderNumber: string;
  orderDate: string;
  status: string;
  // Customer
  clientName: string;
  clientPhone: string;
  clientKtp: string;
  // Vehicle
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColor: string;
  vehiclePlate: string;
  vehicleChassis: string;
  vehicleEngine: string;
  vehicleUsage: string;
  // Coverage
  coverageType: string;
  sumInsured: number;
  zone: number;
  // Premium breakdown
  basePremium: number;
  addonPremium: number;
  adminFee: number;
  stampDuty: number;
  applicationFee: number;
  totalPremium: number;
  discountAmount: number;
  netPremium: number;
  // Insurer
  insurerName: string;
  // Addons
  addons: Record<string, any>;
}

const formatIDR = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

export async function generateQuotationPDF(data: QuotationData): Promise<void> {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 20;

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER PAGE (stunning first impression)
  // ═══════════════════════════════════════════════════════════════════════

  // Full dark emerald background
  doc.setFillColor(0, 59, 47);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Gold accent bar at top
  doc.setFillColor(245, 158, 11);
  doc.rect(0, 0, pageW, 3, 'F');

  // Decorative circles (subtle texture)
  doc.setFillColor(0, 82, 64);
  doc.circle(pageW - 30, 40, 60, 'F');
  doc.setFillColor(0, 100, 80);
  doc.circle(pageW - 20, 250, 40, 'F');

  // Logo placeholder (draw SurePath text logo)
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('Sure', margin, 35);
  doc.setTextColor(0, 193, 106);
  doc.text('Path', margin + 18, 35);

  doc.setFontSize(8);
  doc.setTextColor(150, 200, 180);
  doc.setFont('helvetica', 'normal');
  doc.text('PT RUANG PROTEKSI INDONESIA', margin, 42);

  // Main title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(255, 255, 255);
  doc.text('PROPOSAL', pageW / 2, 120, { align: 'center' });
  doc.text('ASURANSI', pageW / 2, 140, { align: 'center' });

  // Subtitle
  doc.setFontSize(14);
  doc.setTextColor(0, 193, 106);
  doc.setFont('helvetica', 'normal');
  doc.text('Perlindungan Terbaik untuk Anda', pageW / 2, 155, { align: 'center' });

  // Customer name box
  doc.setFillColor(0, 82, 64);
  doc.roundedRect(margin, 175, pageW - margin * 2, 30, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setTextColor(150, 200, 180);
  doc.text('Disiapkan untuk:', margin + 8, 185);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(data.clientName || 'Nasabah', margin + 8, 195);

  // Date + order number
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(150, 200, 180);
  const dateStr = new Date(data.orderDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Tanggal: ${dateStr}`, margin + 8, 200);
  doc.text(`No. Order: ${data.orderNumber}`, pageW - margin - 8, 200, { align: 'right' });

  // Footer
  doc.setFillColor(245, 158, 11);
  doc.rect(0, pageH - 15, pageW, 1, 'F');
  doc.setFontSize(7);
  doc.setTextColor(100, 150, 130);
  doc.text('Dokumen ini adalah penawaran resmi dari SurePath. Premi dapat berubah sesuai kebijakan insurer.', pageW / 2, pageH - 8, { align: 'center' });
  doc.text('myinsurepath.com · WhatsApp: +62 821-9992-0300', pageW / 2, pageH - 4, { align: 'center' });

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 2 — FULL QUOTATION (details + premium breakdown)
  // ═══════════════════════════════════════════════════════════════════════
  doc.addPage();

  // Header bar
  doc.setFillColor(0, 59, 47);
  doc.rect(0, 0, pageW, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Sure', margin, 16);
  doc.setTextColor(0, 193, 106);
  doc.text('Path', margin + 10, 16);
  doc.setFontSize(8);
  doc.setTextColor(150, 200, 180);
  doc.setFont('helvetica', 'normal');
  doc.text('Rincian Penawaran Asuransi', pageW - margin, 16, { align: 'right' });

  let y = 38;

  // Section: Customer Info
  doc.setFillColor(0, 193, 106);
  doc.rect(margin, y - 4, 3, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 59, 47);
  doc.text('DATA NASABAH', margin + 6, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const customerRows = [
    ['Nama Lengkap', data.clientName || '-'],
    ['Nomor Telepon', data.clientPhone || '-'],
    ['Nomor KTP', data.clientKtp || '-'],
  ];
  for (const [label, value] of customerRows) {
    doc.setTextColor(120, 120, 120);
    doc.text(label, margin, y);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value), margin + 50, y);
    doc.setFont('helvetica', 'normal');
    y += 6;
  }
  y += 5;

  // Section: Vehicle Info
  doc.setFillColor(0, 193, 106);
  doc.rect(margin, y - 4, 3, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 59, 47);
  doc.text('DATA KENDARAAN', margin + 6, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const vehicleRows = [
    ['Merk / Model', `${data.vehicleMake || '-'} ${data.vehicleModel || ''}`.trim()],
    ['Tahun', data.vehicleYear || '-'],
    ['Warna', data.vehicleColor || '-'],
    ['No. Plat', data.vehiclePlate || '-'],
    ['No. Rangka', data.vehicleChassis || '-'],
    ['No. Mesin', data.vehicleEngine || '-'],
    ['Penggunaan', data.vehicleUsage || '-'],
  ];
  for (const [label, value] of vehicleRows) {
    doc.setTextColor(120, 120, 120);
    doc.text(label, margin, y);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value), margin + 50, y);
    doc.setFont('helvetica', 'normal');
    y += 6;
  }
  y += 5;

  // Section: Coverage & Premium
  doc.setFillColor(0, 193, 106);
  doc.rect(margin, y - 4, 3, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 59, 47);
  doc.text('RINCIAN PREMI', margin + 6, y);
  y += 8;

  // Premium table
  doc.setFontSize(9);
  const premiumRows: [string, string][] = [
    ['Jenis Coverage', data.coverageType || '-'],
    ['Harga Pertanggungan', formatIDR(data.sumInsured)],
    ['Zona OJK', String(data.zone || '-')],
    ['Insurer', data.insurerName || '-'],
  ];
  for (const [label, value] of premiumRows) {
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin, y);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text(value, margin + 50, y);
    y += 6;
  }
  y += 3;

  // Premium breakdown table with borders
  const tableX = margin;
  const tableW = pageW - margin * 2;

  // Table header
  doc.setFillColor(0, 59, 47);
  doc.rect(tableX, y, tableW, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('KOMPONEN', tableX + 3, y + 5);
  doc.text('NILAI', tableX + tableW - 3, y + 5, { align: 'right' });
  y += 7;

  const breakdownRows: [string, number, boolean][] = [
    ['Premi Dasar', data.basePremium || 0, false],
    ['Premi Add-on', data.addonPremium || 0, false],
    ['Biaya Admin', data.adminFee || 0, false],
    ['Biaya Meterai', data.stampDuty || 0, false],
    ['Biaya Layanan', data.applicationFee || 0, false],
  ];

  if (data.discountAmount && data.discountAmount > 0) {
    breakdownRows.push(['Diskon', -(data.discountAmount), true]);
  }

  doc.setFont('helvetica', 'normal');
  for (let i = 0; i < breakdownRows.length; i++) {
    const [label, amount, isDiscount] = breakdownRows[i];
    if (i % 2 === 0) {
      doc.setFillColor(245, 250, 247);
      doc.rect(tableX, y, tableW, 6, 'F');
    }
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);
    doc.text(label, tableX + 3, y + 4);
    doc.setTextColor(isDiscount ? 200 : 40, isDiscount ? 50 : 40, isDiscount ? 50 : 40);
    doc.setFont('helvetica', isDiscount ? 'bold' : 'normal');
    doc.text(formatIDR(Math.abs(amount)), tableX + tableW - 3, y + 4, { align: 'right' });
    y += 6;
  }

  // Total row
  doc.setFillColor(0, 193, 106);
  doc.rect(tableX, y, tableW, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL PREMI', tableX + 3, y + 6);
  doc.text(formatIDR(data.totalPremium || 0), tableX + tableW - 3, y + 6, { align: 'right' });
  y += 15;

  // Footer
  doc.setFillColor(240, 240, 240);
  doc.rect(0, pageH - 15, pageW, 15, 'F');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.text(`SurePath · ${data.orderNumber} · ${dateStr}`, pageW / 2, pageH - 6, { align: 'center' });

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 3 — BENEFITS + NEXT STEPS (creative page)
  // ═══════════════════════════════════════════════════════════════════════
  doc.addPage();

  // Header bar (same as page 2)
  doc.setFillColor(0, 59, 47);
  doc.rect(0, 0, pageW, 25, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Sure', margin, 16);
  doc.setTextColor(0, 193, 106);
  doc.text('Path', margin + 10, 16);
  doc.setFontSize(8);
  doc.setTextColor(150, 200, 180);
  doc.setFont('helvetica', 'normal');
  doc.text('Manfaat & Langkah Selanjutnya', pageW - margin, 16, { align: 'right' });

  y = 40;

  // Benefits section
  doc.setFillColor(0, 193, 106);
  doc.rect(margin, y - 4, 3, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 59, 47);
  doc.text('MANFAAT UTAMA', margin + 6, y);
  y += 12;

  const benefits = [
    { icon: '✓', title: 'Proteksi Komprehensif', desc: 'Perlindungan terhadap kerusakan total, kehilangan, dan tanggung jawab hukum kepada pihak ketiga.' },
    { icon: '✓', title: 'Klaim Cepat & Mudah', desc: 'Proses klaim digital dengan survey foto AI. Tidak perlu antri di kantor asuransi.' },
    { icon: '✓', title: 'Tarif Transparan', desc: 'Premi dihitung berdasarkan tarif resmi OJK. Tidak ada biaya tersembunyi.' },
    { icon: '✓', title: 'Support 24/7', desc: 'Tim SurePath siap membantu kapan saja melalui WhatsApp dan aplikasi.' },
    { icon: '✓', title: 'Bengkel Rekanan', desc: 'Akses ke jaringan bengkel resmi insurer di seluruh Indonesia.' },
    { icon: '✓', title: 'Add-on Fleksibel', desc: 'Perlindungan banjir, gempa, terorisme, dan PA penumpang tersedia.' },
  ];

  doc.setFontSize(9);
  for (const b of benefits) {
    // Check icon circle
    doc.setFillColor(0, 193, 106);
    doc.circle(margin + 3, y - 1, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(b.icon, margin + 3, y, { align: 'center' });

    doc.setTextColor(0, 59, 47);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(b.title, margin + 10, y);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(b.desc, margin + 10, y + 4);
    y += 12;
  }

  y += 5;

  // Next Steps section
  doc.setFillColor(245, 158, 11);
  doc.rect(margin, y - 4, 3, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 59, 47);
  doc.text('LANGKAH SELANJUTNYA', margin + 6, y);
  y += 12;

  const steps = [
    '1. Transfer pembayaran ke rekening BCA PT Ruang Proteksi Indonesia (5730-807-807)',
    '2. Kirim bukti pembayaran via WhatsApp ke +62 821-9992-0300',
    '3. Polis akan diterbitkan dalam 1x24 jam setelah pembayaran dikonfirmasi',
    '4. Dokumen polis akan dikirim via email dan tersedia di aplikasi SurePath',
  ];

  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.setFont('helvetica', 'normal');
  for (const step of steps) {
    // Wrap text
    const lines = doc.splitTextToSize(step, pageW - margin * 2 - 5);
    doc.text(lines, margin + 5, y);
    y += lines.length * 5 + 2;
  }

  y += 8;

  // Contact box
  doc.setFillColor(0, 59, 47);
  doc.roundedRect(margin, y, pageW - margin * 2, 35, 4, 4, 'F');
  doc.setTextColor(0, 193, 106);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Butuh Bantuan?', margin + 8, y + 10);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('WhatsApp: +62 821-9992-0300', margin + 8, y + 18);
  doc.text('Email: hello@myinsurepath.com', margin + 8, y + 24);
  doc.text('Website: myinsurepath.com', margin + 8, y + 30);

  // Right side — trust badges
  doc.setTextColor(150, 200, 180);
  doc.setFontSize(8);
  doc.text('PT Ruang Proteksi Indonesia', pageW - margin - 8, y + 18, { align: 'right' });
  doc.text('Bekerja sama dengan perusahaan', pageW - margin - 8, y + 24, { align: 'right' });
  doc.text('asuransi yang berizin OJK', pageW - margin - 8, y + 30, { align: 'right' });

  // Footer
  doc.setFillColor(240, 240, 240);
  doc.rect(0, pageH - 15, pageW, 15, 'F');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(`SurePath · ${data.orderNumber} · ${dateStr} · Halaman 3/3`, pageW / 2, pageH - 6, { align: 'center' });

  // Save
  const filename = `SurePath_Penawaran_${data.orderNumber || 'Order'}.pdf`;
  doc.save(filename);
}
