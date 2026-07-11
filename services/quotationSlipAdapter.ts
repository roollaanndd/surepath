// quotationSlipAdapter.ts
// Adapter functions that convert data from various app sources
// (OperatorOrder, SpPolicyOrder, AgentQuoteBuilder state) into the
// QuotationSlipData format expected by generateQuotationSlipPDF.

import type { QuotationSlipData } from './quotationSlipPdf';

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmtIDR = (n: number | string): string => {
  if (typeof n === 'string') return n;
  if (!n || isNaN(n)) return '0,00';
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
};

const todayID = (): string =>
  new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

const addYearsID = (dateStr: string, years: number): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    d.setFullYear(d.getFullYear() + years);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return dateStr; }
};

const dateShortID = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
};

// Generate quotation number QS/SP/YYYY/ROMAN/SEQ
const generateQuoteNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const romanMonths = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `QS/SP/${year}/${romanMonths[month - 1]}/${seq}`;
};

// ─── Adapter: OperatorOrder → QuotationSlipData ────────────────────────────
export interface OperatorOrderSource {
  order_number?: string;
  id?: string;
  created_at?: string;
  status?: string;
  client_name?: string;
  client_phone?: string;
  client_ktp?: string;
  vehicle_details?: {
    make?: string;
    model?: string;
    year?: number | string;
    color?: string;
    plate?: string;
    plateCode?: string;
    plateNum?: string;
    plateSuffix?: string;
    chassis?: string;
    engine?: string;
    usage?: string;
  };
  coverage_type?: string;
  sum_insured?: number;
  zone?: number;
  base_premium?: number;
  addon_premium?: number;
  admin_fee?: number;
  stamp_duty?: number;
  application_fee?: number;
  total_premium?: number;
  discount_amount?: number;
  net_premium?: number;
  insurer_name?: string;
  addons?: Record<string, any>;
  // Optional: renewal context
  previous_policy_number?: string;
  period_start?: string;
  period_end?: string;
}

export function fromOperatorOrder(o: OperatorOrderSource): QuotationSlipData {
  const vd = o.vehicle_details ?? {};
  const plate = (vd.plate ?? `${vd.plateCode ?? ''} ${vd.plateNum ?? ''} ${vd.plateSuffix ?? ''}`.trim()) || 'TBA';
  const insurerName = o.insurer_name || 'PT Zurich Asuransi Indonesia Tbk';
  const insurerShort = insurerName
    .replace(/^PT\.?\s*/i, '')
    .replace(/\s+(Asuransi|Tbk|Indonesia).*$/i, '')
    .trim() || 'Insurer';
  const periodStart = o.period_start || (o.created_at ? new Date(o.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
  const periodEnd = o.period_end || addYearsID(periodStart, 1);

  // Build premium components
  const sumInsured = o.sum_insured ?? 0;
  const basePremium = o.base_premium ?? 0;
  const addonPremium = o.addon_premium ?? 0;
  const rate = sumInsured > 0 ? (basePremium / sumInsured * 100).toFixed(2).replace('.', ',') + '%' : '-';

  // Add-ons detail (simplified)
  const premiumComponents = [
    { component: 'Casco — Comprehensive', basis: `IDR ${fmtIDR(sumInsured)}`, rate, premium: fmtIDR(basePremium) },
  ];
  if (addonPremium > 0) {
    premiumComponents.push({
      component: 'Tambahan Jaminan (TPL dll.)',
      basis: `IDR ${fmtIDR(sumInsured)}`,
      rate: '—',
      premium: fmtIDR(addonPremium),
    });
  }

  return {
    quotationNumber: o.order_number || o.id || generateQuoteNumber(),
    slipType: 'PENUTUPAN ASURANSI',
    issueDate: todayID(),
    yearTag: String(new Date().getFullYear()),

    preparedForCompany: o.client_name || 'Nasabah SurePath',
    preparedForPerson: o.client_phone || '',
    previousPolicyNumber: o.previous_policy_number || '-',
    insurer: insurerName,
    insurerShort,

    periodStart: periodStart.includes('T') ? new Date(periodStart).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : periodStart,
    periodEnd: periodEnd.includes('T') ? new Date(periodEnd).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : periodEnd,
    periodStartShort: dateShortID(periodStart),
    periodEndShort: dateShortID(periodEnd),

    titleMain: 'Penawaran',
    titleMid: 'Asuransi',
    titleAccent: 'Kendaraan.',
    ledeHtml: `Asuransi Kendaraan Bermotor — ${o.coverage_type === 'TLO' ? 'TLO' : 'Comprehensive'}. Penutupan proteksi kendaraan ${vd.make ?? ''} ${vd.model ?? ''} Anda, ditempatkan melalui ${insurerShort}.`,

    insuredName: o.client_name || 'Nasabah SurePath',
    insuredAddress: '-',
    vehicleBrand: vd.make || '-',
    vehicleType: vd.model || '-',
    vehicleYear: vd.year ? String(vd.year) : '-',
    engineNumber: vd.engine || '-',
    chassisNumber: vd.chassis || '-',
    plateNumber: plate,
    seats: '5',
    color: vd.color || '-',
    usage: vd.usage || 'Pribadi',

    coverageCondition: `Comprehensive — menjamin kerugian/kerusakan sebagian maupun total akibat tabrakan, benturan, terbalik, tergelincir, perbuatan jahat, pencurian, dan kebakaran, sesuai Polis Standar Asuransi Kendaraan Bermotor Indonesia (PSAKBI).`,
    additionalCoverage: 'Tanggung Jawab Hukum terhadap Pihak Ketiga (TPL) — sesuai limit yang dipilih',
    deductible: 'Comprehensive: IDR 300.000,00 untuk setiap kejadian (any one accident)',
    klausulList: [
      'Klausul Penggantian Suku Cadang',
      'Klausul Bengkel Authorized',
      'Klausul Kendaraan CBU/CKD',
    ],

    sumInsuredItems: [
      { no: '1', desc: 'Casco — kendaraan bermotor', amount: fmtIDR(sumInsured) },
      { no: '2', desc: 'Tanggung Jawab Hukum Pihak Ketiga (TPL)', amount: fmtIDR(addonPremium || 0) },
    ],
    totalSumInsured: fmtIDR(sumInsured + (addonPremium || 0)),

    premiumComponents,
    subtotalPremium: fmtIDR(basePremium + addonPremium),
    discountLabel: o.discount_amount && o.discount_amount > 0 ? 'Diskon Penutupan' : 'Diskon Penutupan 0%',
    discountAmount: o.discount_amount && o.discount_amount > 0 ? `(${fmtIDR(o.discount_amount)})` : '(0,00)',
    premiumAfterDiscount: fmtIDR(o.net_premium || (basePremium + addonPremium - (o.discount_amount || 0))),
    policyFee: fmtIDR(o.admin_fee || o.application_fee || 50000),
    stampDuty: fmtIDR(o.stamp_duty || 10000),
    totalPremium: fmtIDR(o.total_premium || 0),

    subjectivityList: [
      'Foto kendaraan terkini (tampak depan, belakang, samping kiri-kanan, interior, odometer, dan nomor rangka/mesin).',
      'Tidak ada kerugian/klaim yang diketahui atau dilaporkan (no known or reported losses) hingga tanggal mulai pertanggungan.',
      'SPPA (Surat Permintaan Penutupan Asuransi) diisi lengkap dan ditandatangani, dilampiri fotokopi STNK & KTP Tertanggung.',
      'Penutupan tunduk pada akseptasi dan persetujuan penuh dari Penanggung (subject to insurer\'s acceptance).',
    ],

    termsList: [
      `Penawaran ini untuk penutupan asuransi atas kendaraan ${vd.make ?? ''} ${vd.model ?? ''} dengan penempatan pada ${insurerName}, mengikuti syarat dan kondisi Polis Standar Asuransi Kendaraan Bermotor Indonesia beserta klausul terlampir.`,
      'Penawaran berlaku selama 30 (tiga puluh) hari sejak tanggal penerbitan. Untuk menghindari terputusnya jaminan, konfirmasi dan pembayaran disarankan sebelum tanggal mulai pertanggungan.',
      'Rate premi menggunakan acuan tarif OJK (SEOJK); premi final mengikuti konfirmasi tertulis dari Penanggung.',
      'Polis diterbitkan setelah subjectivity terpenuhi, konfirmasi penutupan, dan pembayaran premi diterima.',
    ],

    closingTitle: 'Lindungi Kendaraan Anda,',
    closingAccent: 'Sekarang Juga.',
    closingDesc: `Konfirmasi penutupan, jadwalkan survey kendaraan, dan lakukan pembayaran sebelum tanggal mulai pertanggungan agar perlindungan berjalan tanpa terputus.`,

    bankName: 'BANK BCA',
    bankNameShort: 'BCA',
    bankAccount: '5730 - 807 - 807',
    bankAccountName: 'PT. Ruang Proteksi Indonesia',
    paymentDueDate: dateShortID(periodStart),
    transferMemo: `${o.order_number || o.id || 'QS'} — ${vd.make ?? ''} ${vd.model ?? ''} ${o.client_name ?? ''}`.trim(),
  };
}

// ─── Adapter: SpPolicyOrder (Customer order) → QuotationSlipData ──────────
export interface SpPolicyOrderSource {
  id?: string;
  order_number?: string;
  product_name?: string;
  product_type?: string;
  client_name?: string;
  insurer_name?: string;
  coverage_type?: string;
  sum_insured?: number;
  base_premium?: number;
  addon_premium?: number;
  admin_fee?: number;
  stamp_duty?: number;
  application_fee?: number;
  total_premium?: number;
  discount_amount?: number;
  net_premium?: number;
  status?: string;
  created_at?: string;
  vehicle_details?: any;
  vehicle_type?: string;
  period_start?: string;
  period_end?: string;
}

export function fromCustomerOrder(o: SpPolicyOrderSource, customerName?: string, customerAddress?: string): QuotationSlipData {
  const vd = o.vehicle_details ?? {};
  const insurerName = o.insurer_name || 'PT Zurich Asuransi Indonesia Tbk';
  const insurerShort = insurerName
    .replace(/^PT\.?\s*/i, '')
    .replace(/\s+(Asuransi|Tbk|Indonesia).*$/i, '')
    .trim() || 'Insurer';
  const periodStart = o.period_start || (o.created_at ? new Date(o.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
  const periodEnd = o.period_end || addYearsID(periodStart, 1);

  const sumInsured = o.sum_insured ?? 0;
  const basePremium = o.base_premium ?? (o.total_premium ? o.total_premium * 0.9 : 0);
  const addonPremium = o.addon_premium ?? 0;
  const rate = sumInsured > 0 ? (basePremium / sumInsured * 100).toFixed(2).replace('.', ',') + '%' : '-';

  return {
    quotationNumber: o.order_number || generateQuoteNumber(),
    slipType: 'PENUTUPAN ASURANSI',
    issueDate: todayID(),
    yearTag: String(new Date().getFullYear()),

    preparedForCompany: customerName || o.client_name || 'Nasabah SurePath',
    preparedForPerson: '',
    previousPolicyNumber: '-',
    insurer: insurerName,
    insurerShort,

    periodStart: periodStart.includes('T') ? new Date(periodStart).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : periodStart,
    periodEnd: periodEnd.includes('T') ? new Date(periodEnd).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : periodEnd,
    periodStartShort: dateShortID(periodStart),
    periodEndShort: dateShortID(periodEnd),

    titleMain: 'Penawaran',
    titleMid: 'Asuransi',
    titleAccent: 'Kendaraan.',
    ledeHtml: `Asuransi Kendaraan Bermotor — ${o.coverage_type === 'TLO' ? 'TLO' : 'Comprehensive'}. Penawaran proteksi kendaraan ${vd.make ?? ''} ${vd.model ?? ''} Anda, ditempatkan melalui ${insurerShort}.`,

    insuredName: customerName || o.client_name || 'Nasabah SurePath',
    insuredAddress: customerAddress || '-',
    vehicleBrand: vd.make || vd.brand || '-',
    vehicleType: vd.model || '-',
    vehicleYear: vd.year ? String(vd.year) : '-',
    engineNumber: vd.engine || '-',
    chassisNumber: vd.chassis || '-',
    plateNumber: vd.plate || 'TBA',
    seats: vd.seats ? String(vd.seats) : '5',
    color: vd.color || '-',
    usage: vd.usage || 'Pribadi',

    coverageCondition: `Comprehensive — menjamin kerugian/kerusakan sebagian maupun total akibat tabrakan, benturan, terbalik, tergelincir, perbuatan jahat, pencurian, dan kebakaran, sesuai Polis Standar Asuransi Kendaraan Bermotor Indonesia (PSAKBI).`,
    additionalCoverage: 'Tanggung Jawab Hukum terhadap Pihak Ketiga (TPL) — sesuai limit yang dipilih',
    deductible: 'Comprehensive: IDR 300.000,00 untuk setiap kejadian (any one accident)',
    klausulList: [
      'Klausul Penggantian Suku Cadang',
      'Klausul Bengkel Authorized',
      'Klausul Kendaraan CBU/CKD',
    ],

    sumInsuredItems: [
      { no: '1', desc: 'Casco — kendaraan bermotor', amount: fmtIDR(sumInsured) },
      { no: '2', desc: 'Tanggung Jawab Hukum Pihak Ketiga (TPL)', amount: fmtIDR(addonPremium || 0) },
    ],
    totalSumInsured: fmtIDR(sumInsured + (addonPremium || 0)),

    premiumComponents: [
      { component: 'Casco — Comprehensive', basis: `IDR ${fmtIDR(sumInsured)}`, rate, premium: fmtIDR(basePremium) },
      ...(addonPremium > 0 ? [{ component: 'Tambahan Jaminan', basis: `IDR ${fmtIDR(sumInsured)}`, rate: '—', premium: fmtIDR(addonPremium) }] : []),
    ],
    subtotalPremium: fmtIDR(basePremium + addonPremium),
    discountLabel: o.discount_amount && o.discount_amount > 0 ? 'Diskon Penutupan' : 'Diskon Penutupan 0%',
    discountAmount: o.discount_amount && o.discount_amount > 0 ? `(${fmtIDR(o.discount_amount)})` : '(0,00)',
    premiumAfterDiscount: fmtIDR(o.net_premium || (basePremium + addonPremium - (o.discount_amount || 0))),
    policyFee: fmtIDR(o.admin_fee || o.application_fee || 50000),
    stampDuty: fmtIDR(o.stamp_duty || 10000),
    totalPremium: fmtIDR(o.total_premium || 0),

    subjectivityList: [
      'Foto kendaraan terkini (tampak depan, belakang, samping kiri-kanan, interior, odometer, dan nomor rangka/mesin).',
      'Tidak ada kerugian/klaim yang diketahui atau dilaporkan (no known or reported losses) hingga tanggal mulai pertanggungan.',
      'SPPA (Surat Permintaan Penutupan Asuransi) diisi lengkap dan ditandatangani, dilampiri fotokopi STNK & KTP Tertanggung.',
      'Penutupan tunduk pada akseptasi dan persetujuan penuh dari Penanggung (subject to insurer\'s acceptance).',
    ],

    termsList: [
      `Penawaran ini untuk penutupan asuransi atas kendaraan ${vd.make ?? ''} ${vd.model ?? ''} dengan penempatan pada ${insurerName}, mengikuti syarat dan kondisi Polis Standar Asuransi Kendaraan Bermotor Indonesia beserta klausul terlampir.`,
      'Penawaran berlaku selama 30 (tiga puluh) hari sejak tanggal penerbitan. Untuk menghindari terputusnya jaminan, konfirmasi dan pembayaran disarankan sebelum tanggal mulai pertanggungan.',
      'Rate premi menggunakan acuan tarif OJK (SEOJK); premi final mengikuti konfirmasi tertulis dari Penanggung.',
      'Polis diterbitkan setelah subjectivity terpenuhi, konfirmasi penutupan, dan pembayaran premi diterima.',
    ],

    closingTitle: 'Lindungi Kendaraan Anda,',
    closingAccent: 'Sekarang Juga.',
    closingDesc: `Konfirmasi penutupan, jadwalkan survey kendaraan, dan lakukan pembayaran sebelum tanggal mulai pertanggungan agar perlindungan berjalan tanpa terputus.`,

    bankName: 'BANK BCA',
    bankNameShort: 'BCA',
    bankAccount: '5730 - 807 - 807',
    bankAccountName: 'PT. Ruang Proteksi Indonesia',
    paymentDueDate: dateShortID(periodStart),
    transferMemo: `${o.order_number || 'QS'} — ${vd.make ?? ''} ${vd.model ?? ''} ${customerName ?? ''}`.trim(),
  };
}

// ─── Adapter: B2B Quote → QuotationSlipData ────────────────────────────────
export interface B2BQuoteSource {
  id: string;
  insurer_name?: string;
  premium_amount: number;
  coverage_details?: Record<string, any>;
  valid_until?: string;
  terms?: string;
  created_at?: string;
}

export function fromB2BQuote(q: B2BQuoteSource, companyName?: string): QuotationSlipData {
  const insurerName = q.insurer_name || 'PT Zurich Asuransi Indonesia Tbk';
  const insurerShort = insurerName
    .replace(/^PT\.?\s*/i, '')
    .replace(/\s+(Asuransi|Tbk|Indonesia).*$/i, '')
    .trim() || 'Insurer';
  const periodStart = new Date().toISOString().slice(0, 10);
  const periodEnd = addYearsID(periodStart, 1);
  const company = companyName || 'Klien Korporasi SurePath';

  const coverageEntries = Object.entries(q.coverage_details ?? {});
  const coverageLabel = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const sumInsuredItems = coverageEntries.length > 0
    ? coverageEntries.slice(0, 6).map(([k, v], i) => ({
        no: String(i + 1),
        desc: `${coverageLabel(k)}: ${String(v)}`,
        amount: '—',
      }))
    : [{ no: '1', desc: 'Sesuai penawaran penanggung', amount: '—' }];

  return {
    quotationNumber: `QS/B2B/${q.id.slice(0, 8).toUpperCase()}`,
    slipType: 'PENUTUPAN ASURANSI KORPORASI',
    issueDate: q.created_at ? dateShortID(q.created_at) : todayID(),
    yearTag: String(new Date().getFullYear()),

    preparedForCompany: company,
    preparedForPerson: '',
    previousPolicyNumber: '-',
    insurer: insurerName,
    insurerShort,

    periodStart: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
    periodEnd,
    periodStartShort: dateShortID(periodStart),
    periodEndShort: dateShortID(periodEnd),

    titleMain: 'Penawaran',
    titleMid: 'Asuransi',
    titleAccent: 'Korporasi.',
    ledeHtml: `Penawaran asuransi korporasi untuk ${company}, ditempatkan melalui ${insurerShort}. Rincian jaminan dan premi tercantum pada halaman berikut.`,

    insuredName: company,
    insuredAddress: '-',
    vehicleBrand: '-',
    vehicleType: 'Korporasi / Bisnis',
    vehicleYear: '-',
    engineNumber: '-',
    chassisNumber: '-',
    plateNumber: '-',
    seats: '-',
    color: '-',
    usage: 'Komersial',

    coverageCondition: coverageEntries.length > 0
      ? coverageEntries.map(([k, v]) => `${coverageLabel(k)}: ${String(v)}`).join('; ')
      : 'Sesuai syarat dan kondisi polis standar yang berlaku pada penanggung.',
    additionalCoverage: '-',
    deductible: 'Sesuai ketentuan polis penanggung',
    klausulList: [
      'Klausul Premium Payment Warranty',
      'Klausul Cancellation (30 hari)',
      'Klausul sesuai wording polis penanggung',
    ],

    sumInsuredItems,
    totalSumInsured: '—',

    premiumComponents: [
      { component: 'Premi Asuransi (tahunan)', basis: '—', rate: '—', premium: fmtIDR(q.premium_amount) },
    ],
    subtotalPremium: fmtIDR(q.premium_amount),
    discountLabel: 'Diskon Penutupan 0%',
    discountAmount: '(0,00)',
    premiumAfterDiscount: fmtIDR(q.premium_amount),
    policyFee: '0,00',
    stampDuty: '0,00',
    totalPremium: fmtIDR(q.premium_amount),

    subjectivityList: [
      'Kelengkapan data dan dokumen pendukung dari Tertanggung.',
      'Tidak ada kerugian/klaim yang diketahui atau dilaporkan (no known or reported losses) hingga tanggal mulai pertanggungan.',
      'Penutupan tunduk pada akseptasi dan persetujuan penuh dari Penanggung (subject to insurer\'s acceptance).',
    ],

    termsList: [
      `Penawaran ini ditempatkan pada ${insurerName}, mengikuti syarat dan kondisi polis standar penanggung beserta klausul terlampir.`,
      q.valid_until
        ? `Penawaran berlaku sampai ${dateShortID(q.valid_until)}.`
        : 'Penawaran berlaku selama 30 (tiga puluh) hari sejak tanggal penerbitan.',
      ...(q.terms ? [q.terms] : []),
      'Polis diterbitkan setelah subjectivity terpenuhi, konfirmasi penutupan, dan pembayaran premi diterima.',
    ],

    closingTitle: 'Lindungi Bisnis Anda,',
    closingAccent: 'Sekarang Juga.',
    closingDesc: 'Konfirmasi penutupan dan lakukan pembayaran sebelum tanggal mulai pertanggungan agar perlindungan berjalan tanpa terputus.',

    bankName: 'BANK BCA',
    bankNameShort: 'BCA',
    bankAccount: '5730 - 807 - 807',
    bankAccountName: 'PT. Ruang Proteksi Indonesia',
    paymentDueDate: dateShortID(periodStart),
    transferMemo: `QS/B2B/${q.id.slice(0, 8).toUpperCase()} — ${company}`,
  };
}

// ─── Adapter: Agent Quote Builder state → QuotationSlipData ───────────────
export interface AgentQuoteSource {
  clientName: string;
  clientPhone?: string;
  agentName: string;
  agentCode?: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear?: number | string;
  vehiclePlate?: string;
  vehiclePrice: number;
  coverageType: 'COMPREHENSIVE' | 'TLO';
  zone?: number;
  ojkRate?: number;
  rateBand?: 'MIN' | 'MID' | 'MAX';
  providerName?: string;
  rows: { label: string; amount: number }[];
  discountAmount?: number;
  totalPremium: number;
  quoteNumber?: string;
  validUntil?: string;
}

export function fromAgentQuote(q: AgentQuoteSource): QuotationSlipData {
  const insurerName = q.providerName || 'PT Zurich Asuransi Indonesia Tbk';
  const insurerShort = insurerName
    .replace(/^PT\.?\s*/i, '')
    .replace(/\s+(Asuransi|Tbk|Indonesia).*$/i, '')
    .trim() || 'Insurer';
  const today = new Date();
  const periodStart = today.toISOString().slice(0, 10);
  const periodEnd = addYearsID(periodStart, 1);
  const sumInsured = q.vehiclePrice || 0;
  const basePremium = q.rows.find(r => /premi\s+dasar|casco|base/i.test(r.label))?.amount ?? q.totalPremium * 0.9;
  const addonRows = q.rows.filter(r => !/premi\s+dasar|casco|base|biaya|materai/i.test(r.label));
  const addonPremium = addonRows.reduce((s, r) => s + r.amount, 0);
  const adminFee = q.rows.find(r => /admin/i.test(r.label))?.amount ?? 50000;
  const stampDuty = q.rows.find(r => /materai/i.test(r.label))?.amount ?? 10000;
  const discountAmount = q.discountAmount ?? 0;
  const netPremium = q.totalPremium - adminFee - stampDuty;
  const rate = q.ojkRate ? (q.ojkRate * 100).toFixed(2).replace('.', ',') + '%' : (sumInsured > 0 ? (basePremium / sumInsured * 100).toFixed(2).replace('.', ',') + '%' : '-');

  return {
    quotationNumber: q.quoteNumber || generateQuoteNumber(),
    slipType: 'PENUTUPAN ASURANSI',
    issueDate: todayID(),
    yearTag: String(today.getFullYear()),

    preparedForCompany: q.clientName,
    preparedForPerson: q.clientPhone || '',
    previousPolicyNumber: '-',
    insurer: insurerName,
    insurerShort,

    periodStart: today.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
    periodEnd,
    periodStartShort: today.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
    periodEndShort: dateShortID(periodEnd),

    titleMain: 'Penawaran',
    titleMid: 'Asuransi',
    titleAccent: 'Kendaraan.',
    ledeHtml: `Asuransi Kendaraan Bermotor — ${q.coverageType === 'TLO' ? 'TLO' : 'Comprehensive'}. Penawaran proteksi kendaraan ${q.vehicleBrand} ${q.vehicleModel} untuk ${q.clientName}, disiapkan oleh ${q.agentName}${q.agentCode ? ` (${q.agentCode})` : ''}.`,

    insuredName: q.clientName,
    insuredAddress: '-',
    vehicleBrand: q.vehicleBrand,
    vehicleType: q.vehicleModel,
    vehicleYear: q.vehicleYear ? String(q.vehicleYear) : '-',
    engineNumber: '-',
    chassisNumber: '-',
    plateNumber: q.vehiclePlate || 'TBA',
    seats: '5',
    color: '-',
    usage: 'Pribadi',

    coverageCondition: `${q.coverageType === 'TLO' ? 'TLO (Total Loss Only)' : 'Comprehensive'} — menjamin kerugian/kerusakan sebagian maupun total akibat tabrakan, benturan, terbalik, tergelincir, perbuatan jahat, pencurian, dan kebakaran, sesuai Polis Standar Asuransi Kendaraan Bermotor Indonesia (PSAKBI).`,
    additionalCoverage: addonRows.length > 0 ? addonRows.map(r => r.label).join(', ') : 'Tanggung Jawab Hukum terhadap Pihak Ketiga (TPL) — sesuai limit yang dipilih',
    deductible: 'Comprehensive: IDR 300.000,00 untuk setiap kejadian (any one accident)',
    klausulList: [
      'Klausul Penggantian Suku Cadang',
      'Klausul Bengkel Authorized',
      `Klausul Rate Band: ${q.rateBand || 'MID'} (OJK SEOJK 6/2017)`,
    ],

    sumInsuredItems: [
      { no: '1', desc: 'Casco — kendaraan bermotor', amount: fmtIDR(sumInsured) },
      { no: '2', desc: 'Tanggung Jawab Hukum Pihak Ketiga (TPL)', amount: fmtIDR(addonPremium || 0) },
    ],
    totalSumInsured: fmtIDR(sumInsured + (addonPremium || 0)),

    premiumComponents: [
      { component: `Casco — ${q.coverageType}`, basis: `IDR ${fmtIDR(sumInsured)}`, rate, premium: fmtIDR(basePremium) },
      ...addonRows.map(r => ({ component: r.label, basis: `IDR ${fmtIDR(sumInsured)}`, rate: '—', premium: fmtIDR(r.amount) })),
    ],
    subtotalPremium: fmtIDR(basePremium + addonPremium),
    discountLabel: discountAmount > 0 ? 'Diskon Penawaran' : 'Diskon Penawaran 0%',
    discountAmount: discountAmount > 0 ? `(${fmtIDR(discountAmount)})` : '(0,00)',
    premiumAfterDiscount: fmtIDR(netPremium - discountAmount),
    policyFee: fmtIDR(adminFee),
    stampDuty: fmtIDR(stampDuty),
    totalPremium: fmtIDR(q.totalPremium),

    subjectivityList: [
      'Foto kendaraan terkini (tampak depan, belakang, samping kiri-kanan, interior, odometer, dan nomor rangka/mesin).',
      'Tidak ada kerugian/klaim yang diketahui atau dilaporkan (no known or reported losses) hingga tanggal mulai pertanggungan.',
      'SPPA (Surat Permintaan Penutupan Asuransi) diisi lengkap dan ditandatangani, dilampiri fotokopi STNK & KTP Tertanggung.',
      `Penutupan tunduk pada akseptasi dan persetujuan penuh dari Penanggung (subject to insurer's acceptance). Zone: ${q.zone ?? 3}.`,
    ],

    termsList: [
      `Penawaran ini untuk penutupan asuransi atas kendaraan ${q.vehicleBrand} ${q.vehicleModel} dengan penempatan pada ${insurerName}, mengikuti syarat dan kondisi Polis Standar Asuransi Kendaraan Bermotor Indonesia beserta klausul terlampir.`,
      `Penawaran berlaku sampai ${q.validUntil ? dateShortID(q.validUntil) : '30 hari sejak tanggal penerbitan'}. Untuk menghindari terputusnya jaminan, konfirmasi dan pembayaran disarankan sebelum tanggal mulai pertanggungan.`,
      `Rate premi menggunakan acuan tarif OJK (SEOJK 6/2017); rate ${rate}, band ${q.rateBand || 'MID'}, zone ${q.zone ?? 3}. Premi final mengikuti konfirmasi tertulis dari Penanggung.`,
      'Polis diterbitkan setelah subjectivity terpenuhi, konfirmasi penutupan, dan pembayaran premi diterima.',
    ],

    closingTitle: 'Lindungi Kendaraan Anda,',
    closingAccent: 'Sekarang Juga.',
    closingDesc: `Konfirmasi penutupan ke agen SurePath (${q.agentName}), jadwalkan survey kendaraan, dan lakukan pembayaran sebelum tanggal mulai pertanggungan agar perlindungan berjalan tanpa terputus.`,

    bankName: 'BANK BCA',
    bankNameShort: 'BCA',
    bankAccount: '5730 - 807 - 807',
    bankAccountName: 'PT. Ruang Proteksi Indonesia',
    paymentDueDate: today.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
    transferMemo: `${q.quoteNumber || 'QS'} — ${q.vehicleBrand} ${q.vehicleModel} ${q.clientName}`.trim(),
  };
}
