// Bilingual content for product detail pages (/product/:slug).
// Loc tuple = [Bahasa Indonesia, English]. Resolved at render time via lang.

export type Loc = readonly [id: string, en: string];

export interface ProductContent {
  name: Loc;
  tagline: Loc;
  color: string;
  description: Loc;
  features: Loc[];
  coverageItems: { title: Loc; desc: Loc }[];
  startingPrice: Loc;
  highlights: Loc[];
  /** Pre-launch product: renders a "Segera Hadir" badge and a waitlist CTA
   *  instead of a purchase CTA, plus a mandatory disclaimer block. */
  comingSoon?: boolean;
  /** Target segments, rendered as an extra section above Coverage. */
  segments?: { title: Loc; desc: Loc }[];
  /** Shown verbatim under the CTA when comingSoon is set. */
  disclaimer?: Loc;
}

export const PRODUCT_CONTENT: Record<string, ProductContent> = {
  car: {
    name: ['Asuransi Kendaraan', 'Car Insurance'],
    tagline: ['Komprehensif & TLO', 'Comprehensive & TLO'],
    color: '#22c55e',
    description: [
      'Perlindungan menyeluruh untuk kendaraan Anda dari berbagai risiko — dari goresan ringan hingga kecelakaan besar. Dengan teknologi AI SurePath, klaim bisa diajukan hanya dengan foto dari HP Anda.',
      'Complete protection for your vehicle against every risk — from light scratches to major accidents. With SurePath AI technology, you can file a claim using just a photo from your phone.',
    ],
    features: [
      ['Proses klaim via foto HP — tanpa survei fisik ke bengkel', 'File claims by phone photo — no physical workshop survey'],
      ['Jaringan 500+ bengkel rekanan resmi di seluruh Indonesia', 'A network of 500+ official partner workshops across Indonesia'],
      ['Estimasi biaya kerusakan instan menggunakan Computer Vision AI', 'Instant damage cost estimates using Computer Vision AI'],
      ['Perlindungan banjir, gempa, dan risiko alam lainnya', 'Protection against flood, earthquake, and other natural risks'],
      ['Roadside assistance 24 jam di seluruh Indonesia', '24-hour roadside assistance across Indonesia'],
    ],
    coverageItems: [
      { title: ['Komprehensif (All Risk)', 'Comprehensive (All Risk)'], desc: ['Kerusakan akibat tabrakan, terbalik, tergelincir, perbuatan jahat, dan kebakaran', 'Damage from collision, rollover, skidding, malicious acts, and fire'] },
      { title: ['Total Loss Only (TLO)', 'Total Loss Only (TLO)'], desc: ['Ganti rugi bila kendaraan hilang atau rusak parah (≥75% dari nilai pasar)', 'Compensation when the vehicle is lost or severely damaged (≥75% of market value)'] },
      { title: ['Pencurian Kendaraan', 'Vehicle Theft'], desc: ['Kehilangan akibat pencurian atau percobaan pencurian yang disertai laporan polisi', 'Loss from theft or attempted theft accompanied by a police report'] },
      { title: ['Tanggung Jawab Pihak Ketiga', 'Third-Party Liability'], desc: ['Kerugian material/fisik yang diderita pihak ketiga akibat kendaraan Anda', 'Material or physical loss suffered by third parties caused by your vehicle'] },
    ],
    startingPrice: ['Rp 500.000/tahun', 'Rp 500,000/year'],
    highlights: [['Klaim <60 menit', 'Claims <60 min'], ['OJK Licensed', 'OJK Licensed'], ['AI-Powered', 'AI-Powered']],
  },

  travel: {
    name: ['Asuransi Perjalanan', 'Travel Insurance'],
    tagline: ['Dalam & Luar Negeri', 'Domestic & International'],
    color: '#3b82f6',
    description: [
      'Nikmati setiap perjalanan dengan tenang — dari perjalanan bisnis internasional hingga wisata keluarga dalam negeri. SurePath Travel Safe melindungi dari keterlambatan pesawat hingga darurat medis di mana saja.',
      'Enjoy every trip with peace of mind — from international business travel to domestic family holidays. SurePath Travel Safe protects you from flight delays to medical emergencies anywhere.',
    ],
    features: [
      ['Perlindungan medis darurat hingga USD 100.000 di luar negeri', 'Emergency medical cover up to USD 100,000 abroad'],
      ['Klaim otomatis untuk penerbangan yang delay lebih dari 4 jam', 'Automatic claims for flights delayed more than 4 hours'],
      ['Evakuasi medis ke fasilitas kesehatan terbaik', 'Medical evacuation to the best healthcare facilities'],
      ['Perlindungan bagasi hilang, tertunda, atau rusak', 'Cover for lost, delayed, or damaged baggage'],
      ['Pembatalan perjalanan akibat force majeure', 'Trip cancellation due to force majeure'],
    ],
    coverageItems: [
      { title: ['Darurat Medis', 'Medical Emergency'], desc: ['Biaya rumah sakit, dokter, dan perawatan medis darurat selama perjalanan', 'Hospital, doctor, and emergency medical costs during your trip'] },
      { title: ['Keterlambatan Penerbangan', 'Flight Delay'], desc: ['Ganti rugi otomatis bila pesawat delay lebih dari 4 jam — tanpa klaim manual', 'Automatic compensation when a flight is delayed over 4 hours — no manual claim'] },
      { title: ['Kehilangan Bagasi', 'Lost Baggage'], desc: ['Penggantian barang berharga yang hilang atau rusak akibat maskapai', 'Reimbursement for valuables lost or damaged by the airline'] },
      { title: ['Pembatalan Perjalanan', 'Trip Cancellation'], desc: ['Pengembalian biaya tiket dan akomodasi akibat pembatalan mendadak', 'Refund of ticket and accommodation costs due to sudden cancellation'] },
    ],
    startingPrice: ['Rp 75.000/hari', 'Rp 75,000/day'],
    highlights: [['Auto Claim', 'Auto Claim'], ['Worldwide Cover', 'Worldwide Cover'], ['24/7 Support', '24/7 Support']],
  },

  pa: {
    name: ['Kecelakaan Diri', 'Personal Accident'],
    tagline: ['Personal Accident', 'Personal Accident'],
    color: '#a855f7',
    description: [
      'Kecelakaan bisa terjadi kapan saja dan di mana saja. Asuransi Kecelakaan Diri SurePath memberikan santunan finansial yang cepat untuk Anda dan keluarga, agar kehidupan tetap berjalan meski menghadapi kejadian tak terduga.',
      'Accidents can happen anytime, anywhere. SurePath Personal Accident insurance provides fast financial benefits for you and your family, so life can go on even in the face of the unexpected.',
    ],
    features: [
      ['Pendaftaran online selesai hanya dalam 60 detik', 'Online registration completed in just 60 seconds'],
      ['Santunan meninggal dunia akibat kecelakaan', 'Death benefit due to an accident'],
      ['Penggantian biaya perawatan medis akibat kecelakaan', 'Reimbursement of medical treatment costs from accidents'],
      ['Santunan cacat tetap total maupun sebagian', 'Benefits for total or partial permanent disability'],
      ['Perlindungan aktif 24 jam, di mana saja di seluruh dunia', 'Active 24-hour protection, anywhere in the world'],
    ],
    coverageItems: [
      { title: ['Meninggal Dunia', 'Death'], desc: ['Santunan penuh kepada ahli waris bila tertanggung meninggal akibat kecelakaan', 'Full benefit to beneficiaries if the insured dies from an accident'] },
      { title: ['Cacat Tetap Total', 'Total Permanent Disability'], desc: ['Santunan 100% uang pertanggungan bila mengalami cacat permanen total', '100% of the sum insured for total permanent disability'] },
      { title: ['Cacat Tetap Sebagian', 'Partial Permanent Disability'], desc: ['Santunan proporsional sesuai tabel manfaat yang tertera pada polis', 'Proportional benefit according to the benefit table stated in the policy'] },
      { title: ['Biaya Perawatan Medis', 'Medical Treatment Costs'], desc: ['Penggantian biaya rumah sakit dan tindakan medis akibat kecelakaan', 'Reimbursement of hospital and medical treatment costs from accidents'] },
    ],
    startingPrice: ['Rp 50.000/bulan', 'Rp 50,000/month'],
    highlights: [['Daftar 60 Detik', 'Register in 60s'], ['Global Coverage', 'Global Coverage'], ['Instant Approval', 'Instant Approval']],
  },

  property: {
    name: ['Proteksi Barang', 'Property Protection'],
    tagline: ['Gadget & Elektronik', 'Gadget & Electronics'],
    color: '#f59e0b',
    description: [
      'Dari smartphone mahal hingga laptop kerja, perangkat elektronik Anda adalah investasi berharga. SurePath Item Shield memberikan perlindungan total dari kerusakan tak terduga, jatuh, terkena air, hingga pencurian.',
      'From an expensive smartphone to your work laptop, your electronic devices are valuable investments. SurePath Item Shield gives total protection against unexpected damage, drops, water exposure, and theft.',
    ],
    features: [
      ['Klaim mudah cukup unggah foto kerusakan via aplikasi', 'Easy claims — just upload a damage photo via the app'],
      ['Perlindungan dari jatuh, terkena cairan, dan kerusakan fisik', 'Protection from drops, liquid exposure, and physical damage'],
      ['Garansi perbaikan dengan teknisi tersertifikasi', 'Repair guarantee with certified technicians'],
      ['Pengiriman perangkat pinjaman sementara saat perbaikan', 'A temporary loaner device delivered during repairs'],
      ['Perlindungan hingga 2 tahun untuk setiap perangkat', 'Protection of up to 2 years per device'],
    ],
    coverageItems: [
      { title: ['Kerusakan Fisik', 'Physical Damage'], desc: ['Layar retak, casing pecah, atau kerusakan fisik akibat jatuh dan benturan', 'Cracked screen, broken casing, or physical damage from drops and impacts'] },
      { title: ['Kerusakan Akibat Cairan', 'Liquid Damage'], desc: ['Kerusakan akibat terkena air, minuman, hujan, atau terendam banjir', 'Damage from water, drinks, rain, or flood submersion'] },
      { title: ['Pencurian', 'Theft'], desc: ['Kehilangan perangkat akibat pencurian disertai bukti laporan polisi resmi', 'Loss of a device from theft with an official police report'] },
      { title: ['Kerusakan Komponen Internal', 'Internal Component Damage'], desc: ['Kerusakan IC, baterai kembung, atau komponen akibat lonjakan listrik', 'IC damage, swollen battery, or component failure from power surges'] },
    ],
    startingPrice: ['Rp 35.000/bulan', 'Rp 35,000/month'],
    highlights: [['Photo Claim', 'Photo Claim'], ['Fast Repair', 'Fast Repair'], ['Loaner Device', 'Loaner Device']],
  },

  health: {
    name: ['Kesehatan Keluarga', 'Family Health'],
    tagline: ['Individu & Keluarga', 'Individual & Family'],
    color: '#ef4444',
    description: [
      'Kesehatan adalah aset terbesar Anda dan keluarga. Asuransi Kesehatan SurePath memberikan akses ke ribuan rumah sakit dan klinik terbaik di Indonesia, dilengkapi asisten medis AI yang siaga 24 jam.',
      'Health is your and your family’s greatest asset. SurePath Health insurance gives access to thousands of the best hospitals and clinics in Indonesia, complete with a 24-hour AI medical assistant.',
    ],
    features: [
      ['Asisten medis AI aktif 24 jam untuk konsultasi kesehatan', 'A 24-hour AI medical assistant for health consultations'],
      ['Cashless di 3.000+ rumah sakit dan klinik rekanan', 'Cashless at 3,000+ partner hospitals and clinics'],
      ['Manfaat rawat inap, rawat jalan, dan kesehatan gigi', 'Inpatient, outpatient, and dental benefits'],
      ['Manfaat melahirkan dan perawatan bayi baru lahir', 'Maternity and newborn care benefits'],
      ['Tidak ada masa tunggu untuk kondisi darurat medis', 'No waiting period for medical emergencies'],
    ],
    coverageItems: [
      { title: ['Rawat Inap', 'Inpatient Care'], desc: ['Biaya kamar, dokter, obat-obatan, dan semua tindakan medis selama dirawat', 'Room, doctor, medication, and all medical procedures during hospitalization'] },
      { title: ['Rawat Jalan', 'Outpatient Care'], desc: ['Konsultasi dokter umum dan spesialis, laboratorium, dan apotek rekanan', 'GP and specialist consultations, labs, and partner pharmacies'] },
      { title: ['Gawat Darurat', 'Emergency Care'], desc: ['Penanganan medis darurat di IGD 24 jam tanpa persetujuan awal dari SurePath', '24-hour ER emergency care without prior approval from SurePath'] },
      { title: ['Kesehatan Gigi', 'Dental Care'], desc: ['Perawatan gigi dasar meliputi scaling, pencabutan, dan penambalan gigi', 'Basic dental care including scaling, extraction, and fillings'] },
    ],
    startingPrice: ['Rp 200.000/bulan', 'Rp 200,000/month'],
    highlights: [['AI Health Bot', 'AI Health Bot'], ['3000+ RS', '3000+ Hospitals'], ['Cashless', 'Cashless']],
  },

  climate: {
    name: ['Proteksi Iklim', 'Climate Shield'],
    tagline: ['Climate Shield — Segera Hadir', 'Climate Shield — Coming Soon'],
    color: '#0891b2',
    comingSoon: true,
    description: [
      'Banjir, angin kencang, dan cuaca ekstrem makin sering terjadi di Indonesia — dan proses klaim konvensional sering kali paling lambat justru saat Anda paling butuh. Climate Shield adalah produk proteksi iklim yang sedang kami siapkan bersama mitra asuransi berizin OJK, dengan pendekatan parametrik: santunan dihitung dari data cuaca terukur, bukan dari penilaian kerugian di lokasi.',
      'Floods, high winds, and extreme weather are increasingly frequent in Indonesia — and conventional claims tend to be slowest exactly when you need them most. Climate Shield is a climate protection product we are preparing together with OJK-licensed insurance partners, using a parametric approach: benefits are calculated from measured weather data rather than an on-site loss assessment.',
    ],
    features: [
      ['Pendekatan parametrik — santunan dihitung dari data indeks cuaca, bukan survei lokasi', 'Parametric approach — benefits calculated from weather index data, not a site survey'],
      ['Ambang pemicu tertulis jelas di polis, sehingga Anda tahu persis kapan santunan berlaku', 'Trigger thresholds stated plainly in the policy, so you know exactly when a benefit applies'],
      ['Dirancang untuk premi terjangkau dan periode perlindungan yang fleksibel', 'Designed for affordable premiums and flexible protection periods'],
      ['Rencana notifikasi peringatan dini cuaca ekstrem untuk pemegang polis', 'Planned early-warning notifications for extreme weather to policyholders'],
      ['Terintegrasi dengan dompet dan riwayat polis SurePath yang sudah Anda pakai', 'Integrated with the SurePath wallet and policy history you already use'],
      ['Untuk kendaraan, perluasan risiko banjir dan angin topan sudah tersedia hari ini', 'For vehicles, flood and windstorm extensions are already available today'],
    ],
    segments: [
      { title: ['Rumah & UMKM', 'Home & Small Business'], desc: ['Untuk rumah tinggal, warung, toko, dan gudang kecil di wilayah rawan genangan', 'For homes, kiosks, shops, and small warehouses in flood-prone areas'] },
      { title: ['Pertanian & Perikanan', 'Agriculture & Fisheries'], desc: ['Untuk petani, pekebun, dan pembudidaya tambak yang terdampak kekeringan atau hujan ekstrem', 'For farmers, growers, and aquaculture operators affected by drought or extreme rainfall'] },
      { title: ['Bisnis & Korporat', 'Business & Corporate'], desc: ['Untuk usaha yang operasionalnya terganggu cuaca ekstrem — logistik, acara, dan ritel', 'For businesses whose operations are disrupted by extreme weather — logistics, events, and retail'] },
      { title: ['Kendaraan', 'Vehicles'], desc: ['Perluasan banjir dan angin topan pada polis kendaraan — sudah bisa dibeli sekarang', 'Flood and windstorm extensions on vehicle policies — available to buy today'] },
    ],
    coverageItems: [
      { title: ['Banjir & Genangan', 'Flood & Inundation'], desc: ['Rencana santunan saat curah hujan atau ketinggian genangan di wilayah tertanggung melewati ambang yang disepakati', 'Planned benefit when rainfall or inundation depth in the insured area passes an agreed threshold'] },
      { title: ['Angin Kencang & Badai', 'High Winds & Storms'], desc: ['Rencana santunan saat kecepatan angin di wilayah tertanggung melewati ambang yang disepakati', 'Planned benefit when wind speed in the insured area passes an agreed threshold'] },
      { title: ['Curah Hujan Ekstrem & Kekeringan', 'Extreme Rainfall & Drought'], desc: ['Indeks curah hujan musiman untuk segmen pertanian dan perikanan', 'Seasonal rainfall index for the agriculture and fisheries segment'] },
      { title: ['Gangguan Operasional', 'Business Interruption'], desc: ['Opsi tambahan untuk pelaku usaha yang terhenti operasionalnya akibat kejadian cuaca ekstrem', 'Optional add-on for businesses whose operations halt due to an extreme weather event'] },
    ],
    startingPrice: ['Belum tersedia', 'Not yet available'],
    highlights: [['Segera Hadir', 'Coming Soon'], ['Parametrik', 'Parametric'], ['Mitra Berizin OJK', 'OJK-Licensed Partners']],
    disclaimer: [
      'Climate Shield masih dalam tahap pengembangan dan belum dapat dibeli. Cakupan, ambang pemicu, besaran santunan, dan premi di halaman ini bersifat rencana dan dapat berubah, serta belum mengikat. Produk baru akan dipasarkan setelah bekerja sama dengan perusahaan asuransi berizin OJK dan memenuhi ketentuan yang berlaku. Dengan mendaftar minat, Anda hanya akan kami hubungi saat produk tersedia — tanpa biaya dan tanpa kewajiban apa pun.',
      'Climate Shield is still in development and cannot be purchased yet. The coverage, trigger thresholds, benefit amounts, and premiums on this page are indicative plans, subject to change, and not binding. The product will only be marketed after we partner with an OJK-licensed insurance company and meet the applicable requirements. By joining the waitlist you will only be contacted once the product is available — at no cost and with no obligation.',
    ],
  },
};
