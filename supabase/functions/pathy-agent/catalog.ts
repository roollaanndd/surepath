// Pathy's product & service catalogue.
//
// Why this module exists: Pathy answered only about car insurance, and not
// because anything forbade the rest — the system prompt simply never said what
// SurePath actually offers, while every worked example in it was motor. The
// model filled the gap the way models do, by generalising from the examples.
//
// The catalogue below is transcribed from what the app really has, verified
// against production rather than assumed:
//   - sp_product_configs      → 4 active rows, all motor (roda 2 & roda 4)
//   - sp_insurer_products     → CAR only (COMPREHENSIVE / TLO)
//   - LifeInsuranceWizard.tsx → TERM_LIFE, WHOLE_LIFE, UNIT_LINK, ENDOWMENT
//   - B2BNewSubmission.tsx    → FLEET_MV, BONDING, GROUP_HEALTH
//
// The distinction that matters most is QUOTABLE vs SUBMISSION. Only motor has
// OJK rate tables behind it, so only motor can produce a premium number in the
// app. Life and the corporate lines are real products but they are handled as
// submissions and consultations. Letting Pathy talk about them is the point of
// this change; letting it invent premiums for them would be a much worse bug
// than the narrowness it replaces.

export type LineKind = 'QUOTABLE' | 'SUBMISSION';

export interface CatalogLine {
  /** Short label as a user would say it. */
  name: string;
  kind: LineKind;
  /** Concrete variants, as the app names them. */
  variants: string[];
  /** Where in the app this is handled. */
  where: string;
}

export const PRODUCT_CATALOG: CatalogLine[] = [
  {
    name: 'Asuransi Kendaraan Roda 4 (mobil)',
    kind: 'QUOTABLE',
    variants: ['Komprehensif (All Risk)', 'TLO (Total Loss Only)'],
    where: 'Beli Polis di aplikasi — premi dihitung dari tarif OJK',
  },
  {
    name: 'Asuransi Kendaraan Roda 2 (motor)',
    kind: 'QUOTABLE',
    variants: ['Komprehensif', 'TLO'],
    where: 'Beli Polis di aplikasi — premi dihitung dari tarif OJK',
  },
  {
    name: 'Asuransi Jiwa',
    kind: 'SUBMISSION',
    variants: ['Term Life', 'Whole Life', 'Unit Link', 'Endowment'],
    where: 'dibantu agen SurePath; ada deklarasi kesehatan sebelum pengajuan',
  },
  {
    name: 'Asuransi Kesehatan Kumpulan (karyawan)',
    kind: 'SUBMISSION',
    variants: ['Group Health / Kesehatan Kumpulan'],
    where: 'portal B2B — pengajuan dengan data census karyawan',
  },
  {
    name: 'Asuransi Armada Kendaraan Korporasi',
    kind: 'SUBMISSION',
    variants: ['Fleet Motor Vehicle'],
    where: 'portal B2B — pengajuan dengan vehicle schedule',
  },
  {
    name: 'Surety Bond / Bonding',
    kind: 'SUBMISSION',
    variants: ['Surety Bond', 'Bank Garansi'],
    where: 'portal B2B — pengajuan dengan laporan keuangan & dokumen proyek',
  },
];

/** Platform capabilities that are not products but are what users ask about. */
export const PLATFORM_SERVICES: string[] = [
  'Pengajuan dan pelacakan klaim',
  'Perpanjangan polis dan pengingat jatuh tempo',
  'Pembayaran premi (invoice Xendit) dan status pembayaran',
  'Dompet komisi agen, penarikan dana, dan koin/reward',
  'Program referral untuk nasabah dan agen',
  'Unggah dan pembacaan dokumen (STNK, KTP, SIM, polis, invoice)',
];

/**
 * The catalogue section injected into Pathy's system prompt.
 *
 * Kept as one exported function so the prompt has a single source of truth and
 * a test can assert that every line in PRODUCT_CATALOG actually reaches it —
 * a product added to the array but missing from the prompt would be invisible
 * to Pathy, which is exactly the failure this module exists to prevent.
 */
export function catalogSection(): string {
  const quotable = PRODUCT_CATALOG.filter(l => l.kind === 'QUOTABLE');
  const submission = PRODUCT_CATALOG.filter(l => l.kind === 'SUBMISSION');

  const fmt = (l: CatalogLine) => `- ${l.name}: ${l.variants.join(', ')} — ${l.where}.`;

  return `KATALOG PRODUK & LAYANAN SUREPATH
Kamu melayani SELURUH lini di bawah ini, bukan hanya asuransi mobil.

Bisa dihitung preminya langsung di aplikasi (pakai tool estimate_premium):
${quotable.map(fmt).join('\n')}

Ada di SurePath tapi lewat pengajuan/konsultasi, BUKAN hitung premi otomatis:
${submission.map(fmt).join('\n')}

Layanan platform yang juga jadi tugasmu:
${PLATFORM_SERVICES.map(s => `- ${s}.`).join('\n')}

ATURAN LINTAS PRODUK (WAJIB)
- estimate_premium HANYA untuk kendaraan roda 2 dan roda 4. Untuk jiwa, kesehatan kumpulan, armada, dan bonding: DILARANG menghitung, mengarang, atau mengira-ngira premi, iuran, uang pertanggungan, atau plafon. Jelaskan cakupannya, apa yang memengaruhi harga, dan dokumen yang perlu disiapkan, lalu arahkan ke jalur pengajuannya.
- Pertanyaan asuransi kesehatan: yang tersedia di SurePath adalah kesehatan KUMPULAN untuk karyawan lewat portal B2B. Untuk kesehatan perorangan, katakan terus terang belum tersedia di aplikasi, lalu tawarkan dihubungkan ke tim SurePath. Jangan pernah mengarang produk, plafon, atau daftar rumah sakit rekanan.
- Pertanyaan umum seputar asuransi (cara kerja premi, deductible, no-claim bonus, beda all risk vs TLO, kenapa klaim bisa ditolak, istilah polis) tetap kamu jawab dengan jelas untuk lini apa pun — ini edukasi, bukan penawaran, jadi tidak perlu angka.
- Kalau pengguna menanyakan lini yang tidak ada di katalog di atas sama sekali (misalnya properti, perjalanan, atau kargo): katakan jujur belum ada di SurePath, jangan diarang-arang, lalu tawarkan alternatif yang memang ada.
- Untuk hal medis apa pun yang muncul di jalur jiwa atau kesehatan (kondisi bawaan, layak/tidak dipertanggung, tindakan): kamu TIDAK menilai. Sampaikan sisi asuransinya, dan tegaskan yang berwenang secara medis adalah dokter dan yang memutuskan penerimaan risiko adalah pihak asuransi.`;
}
