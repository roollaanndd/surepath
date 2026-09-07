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

// ─── Product mapping (app product codes → generic quotation product) ───────
// App codes: CAR | MOTORCYCLE | TRAVEL | PA | MPAR (+ custom products)
type SlipProductType = NonNullable<QuotationSlipData['productType']>;

const mapProductType = (code?: string): SlipProductType => {
  switch ((code ?? '').toUpperCase()) {
    case 'CAR': case 'MOTORCYCLE': case 'MOTOR': return 'MOTOR';
    case 'PA': return 'PA';
    case 'TRAVEL': return 'TRAVEL';
    case 'MPAR': case 'PROPERTY': return 'PROPERTY';
    case 'HEALTH': case 'LIFE': return 'HEALTH';
    default: return (code ?? '') === '' ? 'MOTOR' : 'OTHER';
  }
};

const PRODUCT_NAMES: Record<SlipProductType, string> = {
  MOTOR:    'Asuransi Kendaraan Bermotor',
  PA:       'Asuransi Kecelakaan Diri (Personal Accident)',
  TRAVEL:   'Asuransi Perjalanan (Travel Insurance)',
  PROPERTY: 'Asuransi Harta Benda (Property All Risk)',
  HEALTH:   'Asuransi Kesehatan',
  OTHER:    'Produk Asuransi',
};

const PRODUCT_TITLE_ACCENTS: Record<SlipProductType, string> = {
  MOTOR:    'Kendaraan.',
  PA:       'Kecelakaan Diri.',
  TRAVEL:   'Perjalanan.',
  PROPERTY: 'Properti.',
  HEALTH:   'Kesehatan.',
  OTHER:    'Anda.',
};

// Coverage boilerplate per product line, used when the source has no richer data
const PRODUCT_COVERAGE: Record<SlipProductType, { condition: string; additional: string; deductible: string }> = {
  MOTOR: {
    condition: 'Comprehensive — menjamin kerugian/kerusakan sebagian maupun total akibat tabrakan, benturan, terbalik, tergelincir, perbuatan jahat, pencurian, dan kebakaran, sesuai Polis Standar Asuransi Kendaraan Bermotor Indonesia (PSAKBI).',
    additional: 'Tanggung Jawab Hukum terhadap Pihak Ketiga (TPL) — sesuai limit yang dipilih',
    deductible: 'Comprehensive: IDR 300.000,00 untuk setiap kejadian (any one accident)',
  },
  PA: {
    condition: 'Kecelakaan Diri (Personal Accident) — santunan meninggal dunia akibat kecelakaan, cacat tetap total/sebagian, dan penggantian biaya perawatan/pengobatan akibat kecelakaan, sesuai wording polis Penanggung.',
    additional: 'Santunan rawat inap & biaya pemakaman — sesuai plan yang dipilih',
    deductible: 'Tidak ada (nil) — sesuai ketentuan polis Penanggung',
  },
  TRAVEL: {
    condition: 'Asuransi Perjalanan — jaminan kecelakaan diri, biaya medis darurat, evakuasi medis, pembatalan/keterlambatan perjalanan, dan kehilangan bagasi, sesuai plan dan wording polis Penanggung.',
    additional: 'Perlindungan COVID-19 & olahraga rekreasi — sesuai plan yang dipilih',
    deductible: 'Sesuai ketentuan plan pada polis Penanggung',
  },
  PROPERTY: {
    condition: 'Property All Risk / Harta Benda — menjamin kerugian atau kerusakan fisik atas harta benda yang dipertanggungkan akibat risiko yang tidak dikecualikan polis (kebakaran, petir, ledakan, dsb.), sesuai wording polis Penanggung.',
    additional: 'Perluasan RSMDCC, banjir & angin topan — sesuai kesepakatan',
    deductible: 'Sesuai ketentuan polis Penanggung',
  },
  HEALTH: {
    condition: 'Asuransi Kesehatan — penggantian biaya rawat inap, rawat jalan, dan manfaat kesehatan lain sesuai plan dan wording polis Penanggung.',
    additional: 'Manfaat tambahan sesuai plan yang dipilih',
    deductible: 'Sesuai ketentuan plan pada polis Penanggung',
  },
  OTHER: {
    condition: 'Sesuai syarat dan kondisi polis standar yang berlaku pada Penanggung.',
    additional: 'Sesuai kesepakatan penutupan',
    deductible: 'Sesuai ketentuan polis Penanggung',
  },
};

const PRODUCT_KLAUSUL: Record<SlipProductType, string[]> = {
  MOTOR:    ['Klausul Penggantian Suku Cadang', 'Klausul Bengkel Authorized', 'Klausul Kendaraan CBU/CKD'],
  PA:       ['Klausul 24 Jam di Seluruh Dunia', 'Klausul Ahli Waris (Beneficiary)', 'Klausul sesuai wording polis Penanggung'],
  TRAVEL:   ['Klausul Wilayah Perjalanan', 'Klausul Evakuasi Medis Darurat', 'Klausul sesuai wording polis Penanggung'],
  PROPERTY: ['Klausul Premium Payment Warranty', 'Klausul 72 Jam (72 Hours Clause)', 'Klausul sesuai wording polis Penanggung'],
  HEALTH:   ['Klausul Masa Tunggu (Waiting Period)', 'Klausul Jaringan Provider', 'Klausul sesuai wording polis Penanggung'],
  OTHER:    ['Klausul Premium Payment Warranty', 'Klausul Cancellation (30 hari)', 'Klausul sesuai wording polis Penanggung'],
};

const MOTOR_SUBJECTIVITY = [
  'Foto kendaraan terkini (tampak depan, belakang, samping kiri-kanan, interior, odometer, dan nomor rangka/mesin).',
  'Tidak ada kerugian/klaim yang diketahui atau dilaporkan (no known or reported losses) hingga tanggal mulai pertanggungan.',
  'SPPA (Surat Permintaan Penutupan Asuransi) diisi lengkap dan ditandatangani, dilampiri fotokopi STNK & KTP Tertanggung.',
  'Survey/inspeksi fisik kendaraan oleh surveyor yang ditunjuk Penanggung — jaminan efektif setelah hasil survey disetujui.',
  'Penutupan tunduk pada akseptasi dan persetujuan penuh dari Penanggung (subject to insurer\'s acceptance).',
];

const GENERIC_SUBJECTIVITY = [
  'Formulir permintaan penutupan asuransi (SPPA) diisi lengkap, ditandatangani, dan dilampiri fotokopi identitas (KTP) Tertanggung.',
  'Kelengkapan data dan dokumen pendukung yang dipersyaratkan Penanggung diterima sebelum tanggal mulai pertanggungan.',
  'Tidak ada kerugian/klaim yang diketahui atau dilaporkan (no known or reported losses) hingga tanggal mulai pertanggungan.',
  'Penutupan tunduk pada akseptasi dan persetujuan penuh dari Penanggung (subject to insurer\'s acceptance).',
];

const productSubjectivity = (t: SlipProductType): string[] =>
  t === 'MOTOR' ? MOTOR_SUBJECTIVITY : GENERIC_SUBJECTIVITY;

const plus30DaysISO = (): string => new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

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
  insurer_logo_url?: string;
  addons?: Record<string, any>;
  // Product context (CAR | MOTORCYCLE | TRAVEL | PA | MPAR | …)
  product_code?: string;
  product_type?: string;
  product_name?: string;
  // Agent context (when the order came through an agent)
  agent_name?: string;
  agent_phone?: string;
  agent_code?: string;
  // Optional: renewal context
  previous_policy_number?: string;
  period_start?: string;
  period_end?: string;
}

export function fromOperatorOrder(o: OperatorOrderSource): QuotationSlipData {
  const vd = o.vehicle_details ?? {};
  const productType = mapProductType(o.product_code ?? o.product_type);
  const isMotor = productType === 'MOTOR';
  const productName = o.product_name || PRODUCT_NAMES[productType];
  const coverage = PRODUCT_COVERAGE[productType];
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
    validUntil: plus30DaysISO(),

    productType,
    productName: isMotor ? `${productName} — ${o.coverage_type === 'TLO' ? 'TLO' : 'Comprehensive'}` : productName,
    objectSummary: isMotor ? `${vd.make ?? ''} ${vd.model ?? ''} ${vd.year ?? ''}`.trim() : productName,
    ...(!isMotor && {
      objectDetails: [
        { label: 'PRODUK', value: productName },
        { label: 'TERTANGGUNG', value: o.client_name || 'Nasabah SurePath' },
        { label: 'KONTAK', value: o.client_phone || '-', mono: true },
        { label: 'JENIS PERTANGGUNGAN', value: o.coverage_type || '-' },
        { label: 'NILAI PERTANGGUNGAN', value: o.sum_insured ? `IDR ${fmtIDR(o.sum_insured)}` : '-' },
      ],
    }),

    preparedForCompany: o.client_name || 'Nasabah SurePath',
    preparedForPerson: o.client_phone || '',
    previousPolicyNumber: o.previous_policy_number || '-',
    insurer: insurerName,
    insurerShort,
    insurerLogoUrl: o.insurer_logo_url,

    agentName: o.agent_name || undefined,
    agentPhone: o.agent_phone || undefined,
    agentCode: o.agent_code || undefined,

    periodStart: periodStart.includes('T') ? new Date(periodStart).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : periodStart,
    periodEnd: periodEnd.includes('T') ? new Date(periodEnd).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : periodEnd,
    periodStartShort: dateShortID(periodStart),
    periodEndShort: dateShortID(periodEnd),

    titleMain: 'Penawaran',
    titleMid: 'Asuransi',
    titleAccent: PRODUCT_TITLE_ACCENTS[productType],
    ledeHtml: isMotor
      ? `Asuransi Kendaraan Bermotor — ${o.coverage_type === 'TLO' ? 'TLO' : 'Comprehensive'}. Penutupan proteksi kendaraan ${vd.make ?? ''} ${vd.model ?? ''} Anda, ditempatkan melalui ${insurerShort}.`
      : `${productName}. Penutupan proteksi untuk ${o.client_name || 'Anda'}, ditempatkan melalui ${insurerShort}.`,

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

    coverageCondition: coverage.condition,
    additionalCoverage: coverage.additional,
    deductible: coverage.deductible,
    klausulList: PRODUCT_KLAUSUL[productType],

    sumInsuredItems: isMotor
      ? [
          { no: '1', desc: 'Casco — kendaraan bermotor', amount: fmtIDR(sumInsured) },
          { no: '2', desc: 'Tanggung Jawab Hukum Pihak Ketiga (TPL)', amount: fmtIDR(addonPremium || 0) },
        ]
      : [{ no: '1', desc: productName, amount: fmtIDR(sumInsured) }],
    totalSumInsured: fmtIDR(isMotor ? sumInsured + (addonPremium || 0) : sumInsured),

    premiumComponents,
    subtotalPremium: fmtIDR(basePremium + addonPremium),
    discountLabel: o.discount_amount && o.discount_amount > 0 ? 'Diskon Penutupan' : 'Diskon Penutupan 0%',
    discountAmount: o.discount_amount && o.discount_amount > 0 ? `(${fmtIDR(o.discount_amount)})` : '(0,00)',
    premiumAfterDiscount: fmtIDR(o.net_premium || (basePremium + addonPremium - (o.discount_amount || 0))),
    policyFee: fmtIDR(o.admin_fee || o.application_fee || 50000),
    stampDuty: fmtIDR(o.stamp_duty || 10000),
    totalPremium: fmtIDR(o.total_premium || 0),

    subjectivityList: productSubjectivity(productType),

    termsList: [
      isMotor
        ? `Penawaran ini untuk penutupan asuransi atas kendaraan ${vd.make ?? ''} ${vd.model ?? ''} dengan penempatan pada ${insurerName}, mengikuti syarat dan kondisi Polis Standar Asuransi Kendaraan Bermotor Indonesia beserta klausul terlampir.`
        : `Penawaran ini untuk penutupan ${productName} dengan penempatan pada ${insurerName}, mengikuti syarat, kondisi, dan wording polis standar Penanggung beserta klausul terlampir.`,
      'Penawaran berlaku selama 30 (tiga puluh) hari sejak tanggal penerbitan. Untuk menghindari terputusnya jaminan, konfirmasi dan pembayaran disarankan sebelum tanggal mulai pertanggungan.',
      'Rate premi menggunakan acuan tarif OJK (SEOJK); premi final mengikuti konfirmasi tertulis dari Penanggung.',
      'Polis diterbitkan setelah subjectivity terpenuhi, konfirmasi penutupan, dan pembayaran premi diterima.',
      'Dokumen ini bukan surat konfirmasi penutupan; seluruh konfirmasi dan akseptasi merupakan kewenangan penuh Penanggung.',
    ],

    closingTitle: isMotor ? 'Lindungi Kendaraan Anda,' : 'Lindungi Diri Anda,',
    closingAccent: 'Sekarang Juga.',
    closingDesc: isMotor
      ? `Konfirmasi penutupan, jadwalkan survey kendaraan, dan lakukan pembayaran sebelum tanggal mulai pertanggungan agar perlindungan berjalan tanpa terputus.`
      : `Konfirmasi penutupan, lengkapi dokumen, dan lakukan pembayaran sebelum tanggal mulai pertanggungan agar perlindungan berjalan tanpa terputus.`,

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
  product_code?: string;
  client_name?: string;
  insurer_name?: string;
  insurer_logo_url?: string;
  agent_name?: string;
  agent_phone?: string;
  agent_code?: string;
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
  const productType = mapProductType(o.product_code ?? o.product_type ?? o.vehicle_type);
  const isMotor = productType === 'MOTOR';
  const productName = o.product_name || PRODUCT_NAMES[productType];
  const coverage = PRODUCT_COVERAGE[productType];
  const clientName = customerName || o.client_name || 'Nasabah SurePath';
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
    validUntil: plus30DaysISO(),

    productType,
    productName: isMotor ? `${productName} — ${o.coverage_type === 'TLO' ? 'TLO' : 'Comprehensive'}` : productName,
    objectSummary: isMotor ? `${vd.make ?? vd.brand ?? ''} ${vd.model ?? ''} ${vd.year ?? ''}`.trim() : productName,
    ...(!isMotor && {
      objectDetails: [
        { label: 'PRODUK', value: productName },
        { label: 'TERTANGGUNG', value: clientName },
        { label: 'JENIS PERTANGGUNGAN', value: o.coverage_type || '-' },
        { label: 'NILAI PERTANGGUNGAN', value: sumInsured ? `IDR ${fmtIDR(sumInsured)}` : '-' },
      ],
    }),

    preparedForCompany: clientName,
    preparedForPerson: '',
    previousPolicyNumber: '-',
    insurer: insurerName,
    insurerShort,
    insurerLogoUrl: o.insurer_logo_url,

    agentName: o.agent_name || undefined,
    agentPhone: o.agent_phone || undefined,
    agentCode: o.agent_code || undefined,

    periodStart: periodStart.includes('T') ? new Date(periodStart).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : periodStart,
    periodEnd: periodEnd.includes('T') ? new Date(periodEnd).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : periodEnd,
    periodStartShort: dateShortID(periodStart),
    periodEndShort: dateShortID(periodEnd),

    titleMain: 'Penawaran',
    titleMid: 'Asuransi',
    titleAccent: PRODUCT_TITLE_ACCENTS[productType],
    ledeHtml: isMotor
      ? `Asuransi Kendaraan Bermotor — ${o.coverage_type === 'TLO' ? 'TLO' : 'Comprehensive'}. Penawaran proteksi kendaraan ${vd.make ?? ''} ${vd.model ?? ''} Anda, ditempatkan melalui ${insurerShort}.`
      : `${productName}. Penawaran proteksi untuk ${clientName}, ditempatkan melalui ${insurerShort}.`,

    insuredName: clientName,
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

    coverageCondition: coverage.condition,
    additionalCoverage: coverage.additional,
    deductible: coverage.deductible,
    klausulList: PRODUCT_KLAUSUL[productType],

    sumInsuredItems: isMotor
      ? [
          { no: '1', desc: 'Casco — kendaraan bermotor', amount: fmtIDR(sumInsured) },
          { no: '2', desc: 'Tanggung Jawab Hukum Pihak Ketiga (TPL)', amount: fmtIDR(addonPremium || 0) },
        ]
      : [{ no: '1', desc: productName, amount: fmtIDR(sumInsured) }],
    totalSumInsured: fmtIDR(isMotor ? sumInsured + (addonPremium || 0) : sumInsured),

    premiumComponents: [
      { component: isMotor ? 'Casco — Comprehensive' : `Premi ${productName}`, basis: `IDR ${fmtIDR(sumInsured)}`, rate, premium: fmtIDR(basePremium) },
      ...(addonPremium > 0 ? [{ component: 'Tambahan Jaminan', basis: `IDR ${fmtIDR(sumInsured)}`, rate: '—', premium: fmtIDR(addonPremium) }] : []),
    ],
    subtotalPremium: fmtIDR(basePremium + addonPremium),
    discountLabel: o.discount_amount && o.discount_amount > 0 ? 'Diskon Penutupan' : 'Diskon Penutupan 0%',
    discountAmount: o.discount_amount && o.discount_amount > 0 ? `(${fmtIDR(o.discount_amount)})` : '(0,00)',
    premiumAfterDiscount: fmtIDR(o.net_premium || (basePremium + addonPremium - (o.discount_amount || 0))),
    policyFee: fmtIDR(o.admin_fee || o.application_fee || 50000),
    stampDuty: fmtIDR(o.stamp_duty || 10000),
    totalPremium: fmtIDR(o.total_premium || 0),

    subjectivityList: productSubjectivity(productType),

    termsList: [
      isMotor
        ? `Penawaran ini untuk penutupan asuransi atas kendaraan ${vd.make ?? ''} ${vd.model ?? ''} dengan penempatan pada ${insurerName}, mengikuti syarat dan kondisi Polis Standar Asuransi Kendaraan Bermotor Indonesia beserta klausul terlampir.`
        : `Penawaran ini untuk penutupan ${productName} dengan penempatan pada ${insurerName}, mengikuti syarat, kondisi, dan wording polis standar Penanggung beserta klausul terlampir.`,
      'Penawaran berlaku selama 30 (tiga puluh) hari sejak tanggal penerbitan. Untuk menghindari terputusnya jaminan, konfirmasi dan pembayaran disarankan sebelum tanggal mulai pertanggungan.',
      'Rate premi menggunakan acuan tarif OJK (SEOJK); premi final mengikuti konfirmasi tertulis dari Penanggung.',
      'Polis diterbitkan setelah subjectivity terpenuhi, konfirmasi penutupan, dan pembayaran premi diterima.',
      'Dokumen ini bukan surat konfirmasi penutupan; seluruh konfirmasi dan akseptasi merupakan kewenangan penuh Penanggung.',
    ],

    closingTitle: isMotor ? 'Lindungi Kendaraan Anda,' : 'Lindungi Diri Anda,',
    closingAccent: 'Sekarang Juga.',
    closingDesc: isMotor
      ? `Konfirmasi penutupan, jadwalkan survey kendaraan, dan lakukan pembayaran sebelum tanggal mulai pertanggungan agar perlindungan berjalan tanpa terputus.`
      : `Konfirmasi penutupan, lengkapi dokumen, dan lakukan pembayaran sebelum tanggal mulai pertanggungan agar perlindungan berjalan tanpa terputus.`,

    bankName: 'BANK BCA',
    bankNameShort: 'BCA',
    bankAccount: '5730 - 807 - 807',
    bankAccountName: 'PT. Ruang Proteksi Indonesia',
    paymentDueDate: dateShortID(periodStart),
    transferMemo: `${o.order_number || 'QS'} — ${isMotor ? `${vd.make ?? ''} ${vd.model ?? ''}` : productName} ${clientName}`.trim(),
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
    validUntil: q.valid_until ? q.valid_until.slice(0, 10) : plus30DaysISO(),

    productType: 'OTHER',
    productName: 'Asuransi Korporasi',
    objectSummary: `Asuransi Korporasi — ${company}`,
    objectDetails: [
      { label: 'TERTANGGUNG', value: company },
      { label: 'JENIS', value: 'Korporasi / Bisnis' },
      { label: 'PENGGUNAAN', value: 'Komersial' },
      ...coverageEntries.slice(0, 4).map(([k, v]) => ({ label: coverageLabel(k).toUpperCase(), value: String(v) })),
    ],

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
  /** Insured's address, e.g. read off their KTP. Printed on the slip. */
  clientAddress?: string;
  agentName: string;
  agentCode?: string;
  agentPhone?: string;
  // App product code (CAR | MOTORCYCLE | TRAVEL | PA | MPAR). Defaults to CAR.
  // For non-vehicle products the vehicleBrand/vehicleModel fields carry the
  // product label & plan description (legacy behaviour of AgentQuoteBuilder).
  product?: string;
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
  const productType = mapProductType(q.product);
  const isMotor = productType === 'MOTOR';
  const productName = PRODUCT_NAMES[productType];
  const coverage = PRODUCT_COVERAGE[productType];
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
    validUntil: q.validUntil ? q.validUntil.slice(0, 10) : plus30DaysISO(),

    productType,
    productName: isMotor ? `${productName} — ${q.coverageType === 'TLO' ? 'TLO' : 'Comprehensive'}` : productName,
    objectSummary: isMotor ? `${q.vehicleBrand} ${q.vehicleModel} ${q.vehicleYear ?? ''}`.trim() : `${productName} — ${q.vehicleModel}`,
    ...(!isMotor && {
      objectDetails: [
        { label: 'PRODUK', value: productName },
        { label: 'TERTANGGUNG', value: q.clientName },
        { label: 'RINCIAN / PLAN', value: q.vehicleModel },
        { label: 'NILAI PERTANGGUNGAN', value: sumInsured ? `IDR ${fmtIDR(sumInsured)}` : '-' },
      ],
    }),

    preparedForCompany: q.clientName,
    preparedForPerson: q.clientPhone || '',
    previousPolicyNumber: '-',
    insurer: insurerName,
    insurerShort,

    agentName: q.agentName,
    agentPhone: q.agentPhone,
    agentCode: q.agentCode,

    periodStart: today.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
    periodEnd,
    periodStartShort: today.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
    periodEndShort: dateShortID(periodEnd),

    titleMain: 'Penawaran',
    titleMid: 'Asuransi',
    titleAccent: PRODUCT_TITLE_ACCENTS[productType],
    ledeHtml: isMotor
      ? `Asuransi Kendaraan Bermotor — ${q.coverageType === 'TLO' ? 'TLO' : 'Comprehensive'}. Penawaran proteksi kendaraan ${q.vehicleBrand} ${q.vehicleModel} untuk ${q.clientName}, disiapkan oleh ${q.agentName}${q.agentCode ? ` (${q.agentCode})` : ''}.`
      : `${productName}. Penawaran proteksi untuk ${q.clientName}, disiapkan oleh ${q.agentName}${q.agentCode ? ` (${q.agentCode})` : ''}, ditempatkan melalui ${insurerShort}.`,

    insuredName: q.clientName,
    insuredAddress: q.clientAddress || '-',
    vehicleBrand: q.vehicleBrand,
    vehicleType: q.vehicleModel,
    vehicleYear: q.vehicleYear ? String(q.vehicleYear) : '-',
    engineNumber: '-',
    chassisNumber: '-',
    plateNumber: q.vehiclePlate || 'TBA',
    seats: '5',
    color: '-',
    usage: 'Pribadi',

    coverageCondition: isMotor
      ? `${q.coverageType === 'TLO' ? 'TLO (Total Loss Only)' : 'Comprehensive'} — menjamin kerugian/kerusakan sebagian maupun total akibat tabrakan, benturan, terbalik, tergelincir, perbuatan jahat, pencurian, dan kebakaran, sesuai Polis Standar Asuransi Kendaraan Bermotor Indonesia (PSAKBI).`
      : coverage.condition,
    additionalCoverage: addonRows.length > 0 ? addonRows.map(r => r.label).join(', ') : coverage.additional,
    deductible: isMotor ? 'Comprehensive: IDR 300.000,00 untuk setiap kejadian (any one accident)' : coverage.deductible,
    klausulList: isMotor
      ? [
          'Klausul Penggantian Suku Cadang',
          'Klausul Bengkel Authorized',
          `Klausul Rate Band: ${q.rateBand || 'MID'} (OJK SEOJK 6/2017)`,
        ]
      : PRODUCT_KLAUSUL[productType],

    sumInsuredItems: isMotor
      ? [
          { no: '1', desc: 'Casco — kendaraan bermotor', amount: fmtIDR(sumInsured) },
          { no: '2', desc: 'Tanggung Jawab Hukum Pihak Ketiga (TPL)', amount: fmtIDR(addonPremium || 0) },
        ]
      : [{ no: '1', desc: `${productName} — ${q.vehicleModel}`, amount: fmtIDR(sumInsured) }],
    totalSumInsured: fmtIDR(isMotor ? sumInsured + (addonPremium || 0) : sumInsured),

    premiumComponents: [
      { component: isMotor ? `Casco — ${q.coverageType}` : `Premi ${productName}`, basis: `IDR ${fmtIDR(sumInsured)}`, rate, premium: fmtIDR(basePremium) },
      ...addonRows.map(r => ({ component: r.label, basis: `IDR ${fmtIDR(sumInsured)}`, rate: '—', premium: fmtIDR(r.amount) })),
    ],
    subtotalPremium: fmtIDR(basePremium + addonPremium),
    discountLabel: discountAmount > 0 ? 'Diskon Penawaran' : 'Diskon Penawaran 0%',
    discountAmount: discountAmount > 0 ? `(${fmtIDR(discountAmount)})` : '(0,00)',
    premiumAfterDiscount: fmtIDR(netPremium - discountAmount),
    policyFee: fmtIDR(adminFee),
    stampDuty: fmtIDR(stampDuty),
    totalPremium: fmtIDR(q.totalPremium),

    subjectivityList: isMotor
      ? [
          'Foto kendaraan terkini (tampak depan, belakang, samping kiri-kanan, interior, odometer, dan nomor rangka/mesin).',
          'Tidak ada kerugian/klaim yang diketahui atau dilaporkan (no known or reported losses) hingga tanggal mulai pertanggungan.',
          'SPPA (Surat Permintaan Penutupan Asuransi) diisi lengkap dan ditandatangani, dilampiri fotokopi STNK & KTP Tertanggung.',
          `Penutupan tunduk pada akseptasi dan persetujuan penuh dari Penanggung (subject to insurer's acceptance). Zone: ${q.zone ?? 3}.`,
        ]
      : productSubjectivity(productType),

    termsList: [
      isMotor
        ? `Penawaran ini untuk penutupan asuransi atas kendaraan ${q.vehicleBrand} ${q.vehicleModel} dengan penempatan pada ${insurerName}, mengikuti syarat dan kondisi Polis Standar Asuransi Kendaraan Bermotor Indonesia beserta klausul terlampir.`
        : `Penawaran ini untuk penutupan ${productName} dengan penempatan pada ${insurerName}, mengikuti syarat, kondisi, dan wording polis standar Penanggung beserta klausul terlampir.`,
      `Penawaran berlaku sampai ${q.validUntil ? dateShortID(q.validUntil) : '30 hari sejak tanggal penerbitan'}. Untuk menghindari terputusnya jaminan, konfirmasi dan pembayaran disarankan sebelum tanggal mulai pertanggungan.`,
      ...(isMotor ? [`Rate premi menggunakan acuan tarif OJK (SEOJK 6/2017); rate ${rate}, band ${q.rateBand || 'MID'}, zone ${q.zone ?? 3}. Premi final mengikuti konfirmasi tertulis dari Penanggung.`]
                  : ['Premi mengikuti tarif dan ketentuan produk Penanggung; premi final mengikuti konfirmasi tertulis dari Penanggung.']),
      'Polis diterbitkan setelah subjectivity terpenuhi, konfirmasi penutupan, dan pembayaran premi diterima.',
      'Dokumen ini bukan surat konfirmasi penutupan; seluruh konfirmasi dan akseptasi merupakan kewenangan penuh Penanggung.',
    ],

    closingTitle: isMotor ? 'Lindungi Kendaraan Anda,' : 'Lindungi Diri Anda,',
    closingAccent: 'Sekarang Juga.',
    closingDesc: isMotor
      ? `Konfirmasi penutupan ke agen SurePath (${q.agentName}), jadwalkan survey kendaraan, dan lakukan pembayaran sebelum tanggal mulai pertanggungan agar perlindungan berjalan tanpa terputus.`
      : `Konfirmasi penutupan ke agen SurePath (${q.agentName}), lengkapi dokumen, dan lakukan pembayaran sebelum tanggal mulai pertanggungan agar perlindungan berjalan tanpa terputus.`,

    bankName: 'BANK BCA',
    bankNameShort: 'BCA',
    bankAccount: '5730 - 807 - 807',
    bankAccountName: 'PT. Ruang Proteksi Indonesia',
    paymentDueDate: today.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
    transferMemo: `${q.quoteNumber || 'QS'} — ${isMotor ? `${q.vehicleBrand} ${q.vehicleModel}` : productName} ${q.clientName}`.trim(),
  };
}
