// Glossary — docs/SEO_ARCHITECTURE.md Phase 3 P1, docs/SEO_KEYWORD_MAP.md §1.1
// (informational intent: "apa itu all risk", "apa itu deductible", dst.)

export interface GlossaryTerm {
  slug: string;
  term: string;
  category: string;
  shortDef: string;
  longDef: string;
  example: string;
  relatedSlugs: string[];
  ctaPath: string;
  ctaLabel: string;
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    slug: 'all-risk',
    term: 'All Risk (Comprehensive)',
    category: 'Asuransi Mobil',
    shortDef: 'Jenis asuransi mobil yang menanggung hampir semua risiko kerusakan, dari lecet kecil hingga kehilangan total.',
    longDef: 'All Risk, juga disebut Comprehensive, adalah jenis pertanggungan asuransi mobil dengan cakupan paling luas di Indonesia. Berbeda dari TLO yang hanya menanggung kerugian total, All Risk juga menanggung kerusakan sebagian (partial loss) — lecet, penyok, kaca pecah — selama penyebabnya termasuk risiko yang dijamin polis. Karena cakupannya lebih luas, tarif preminya juga lebih tinggi, berkisar 1,05%–4,20% dari harga pertanggungan per tahun sesuai tarif resmi OJK.',
    example: 'Mobil baru yang masih dalam masa kredit umumnya diwajibkan memakai All Risk oleh lembaga pembiayaan, karena nilai kendaraan yang dipertaruhkan masih tinggi.',
    relatedSlugs: ['tlo', 'srcc', 'risiko-sendiri'],
    ctaPath: '/asuransi-mobil/all-risk',
    ctaLabel: 'Pelajari Asuransi Mobil All Risk',
  },
  {
    slug: 'tlo',
    term: 'TLO (Total Loss Only)',
    category: 'Asuransi Mobil',
    shortDef: 'Jenis asuransi mobil yang hanya menanggung kehilangan total atau kerusakan ≥75% dari nilai kendaraan.',
    longDef: 'TLO (Total Loss Only) adalah jenis pertanggungan asuransi mobil yang hanya berlaku untuk dua skenario: kendaraan hilang akibat pencurian dan tidak ditemukan, atau kerusakan yang biaya perbaikannya mencapai atau melebihi 75% dari harga pertanggungan. Kerusakan ringan seperti lecet atau penyok tidak ditanggung. Karena cakupannya lebih sempit, tarif TLO jauh lebih murah dari All Risk, berkisar 0,20%–0,78% dari harga pertanggungan per tahun.',
    example: 'Mobil berusia 7 tahun yang sudah lunas sering cukup dilindungi TLO, karena pemilik biasanya sudah siap menanggung sendiri biaya perbaikan minor.',
    relatedSlugs: ['all-risk', 'uang-pertanggungan'],
    ctaPath: '/asuransi-mobil/tlo',
    ctaLabel: 'Pelajari Asuransi Mobil TLO',
  },
  {
    slug: 'premi',
    term: 'Premi Asuransi',
    category: 'Umum',
    shortDef: 'Sejumlah uang yang dibayarkan pemegang polis kepada perusahaan asuransi sebagai imbalan atas perlindungan yang diberikan.',
    longDef: 'Premi adalah biaya yang harus dibayarkan pemegang polis — biasanya tahunan, meski beberapa produk menawarkan skema cicilan bulanan — agar perlindungan asuransi tetap aktif. Untuk asuransi mobil di Indonesia, besaran premi dihitung sebagai persentase dari harga pertanggungan (nilai kendaraan), dengan batas atas dan bawah yang ditetapkan resmi oleh OJK lewat SEOJK No.06/SEOJK.05/2017 — bukan ditentukan bebas oleh masing-masing perusahaan asuransi.',
    example: 'Mobil senilai Rp 200 juta dengan tarif All Risk 2% akan memiliki estimasi premi sekitar Rp 4 juta per tahun.',
    relatedSlugs: ['uang-pertanggungan', 'risiko-sendiri'],
    ctaPath: '/asuransi-mobil/premi',
    ctaLabel: 'Cek Tarif Premi Resmi OJK',
  },
  {
    slug: 'risiko-sendiri',
    term: 'Risiko Sendiri (Own Risk)',
    category: 'Klaim',
    shortDef: 'Jumlah biaya yang menjadi tanggungan pemegang polis sendiri setiap kali mengajukan klaim, sebelum asuransi menanggung sisanya.',
    longDef: 'Risiko sendiri (own risk atau deductible) adalah nominal tertentu yang harus dibayar pemegang polis dari kantongnya sendiri untuk setiap klaim, sebelum perusahaan asuransi menanggung sisa biaya. Untuk asuransi mobil, nilai ini umumnya berkisar Rp 300.000 per klaim kerusakan sebagian, meski bisa berbeda untuk klaim kehilangan total atau kejadian khusus seperti banjir — selalu cek detail polis dari perusahaan asuransi terkait.',
    example: 'Jika biaya perbaikan lecet mobil sebesar Rp 2 juta dan risiko sendiri Rp 300 ribu, asuransi menanggung Rp 1,7 juta, sisanya ditanggung pemilik kendaraan.',
    relatedSlugs: ['all-risk', 'premi'],
    ctaPath: '/asuransi-mobil/klaim',
    ctaLabel: 'Pelajari Cara Klaim Asuransi Mobil',
  },
  {
    slug: 'uang-pertanggungan',
    term: 'Uang Pertanggungan',
    category: 'Umum',
    shortDef: 'Nilai maksimum yang akan dibayarkan perusahaan asuransi jika terjadi klaim sesuai ketentuan polis.',
    longDef: 'Uang pertanggungan adalah nilai yang disepakati di awal polis sebagai dasar perhitungan premi sekaligus batas maksimum santunan atau ganti rugi yang akan dibayarkan. Untuk asuransi mobil, ini biasanya disamakan dengan harga pasar kendaraan saat polis dibuat — bukan harga beli awal jika mobil sudah dipakai bertahun-tahun. Untuk asuransi jiwa atau kecelakaan diri, uang pertanggungan adalah nominal santunan yang akan diterima ahli waris atau tertanggung.',
    example: 'Menetapkan uang pertanggungan sesuai nilai pasar kendaraan saat ini (bukan harga beli 3 tahun lalu) membuat premi lebih akurat dan klaim tidak under-insured.',
    relatedSlugs: ['premi', 'tlo'],
    ctaPath: '/asuransi-mobil/premi',
    ctaLabel: 'Hitung Estimasi Premi',
  },
  {
    slug: 'srcc',
    term: 'SRCC (Strikes, Riots, Civil Commotion)',
    category: 'Asuransi Mobil',
    shortDef: 'Perluasan jaminan asuransi mobil untuk kerusakan akibat kerusuhan, huru-hara, atau pemogokan massal.',
    longDef: 'SRCC adalah singkatan dari Strikes, Riots, and Civil Commotion — perluasan jaminan yang menanggung kerusakan kendaraan akibat aksi mogok, kerusuhan, atau huru-hara sosial. Ini bukan bagian dari cakupan dasar All Risk maupun TLO, melainkan add-on terpisah yang harus ditambahkan secara eksplisit saat membeli polis. Sangat direkomendasikan untuk kendaraan yang beroperasi di kota-kota besar dengan riwayat unjuk rasa atau kerusuhan.',
    example: 'Tanpa perluasan SRCC, kerusakan mobil akibat terjebak di tengah kerusuhan tidak akan ditanggung asuransi, meski polis dasarnya All Risk.',
    relatedSlugs: ['all-risk', 'tlo'],
    ctaPath: '/asuransi-mobil/all-risk',
    ctaLabel: 'Pelajari Perluasan Jaminan All Risk',
  },
  {
    slug: 'no-claim-bonus',
    term: 'No Claim Bonus (NCB)',
    category: 'Umum',
    shortDef: 'Diskon atau keuntungan tambahan yang diberikan perusahaan asuransi kepada pemegang polis yang tidak mengajukan klaim selama periode tertentu.',
    longDef: 'No Claim Bonus adalah insentif berupa diskon premi atau manfaat tambahan lain yang diberikan sejumlah perusahaan asuransi kepada pemegang polis yang tidak pernah mengajukan klaim selama satu periode polis (biasanya satu tahun). Kebijakan NCB berbeda-beda antar perusahaan asuransi — beberapa insurer menyediakan opsi klaim kaca terpisah yang tidak memengaruhi status NCB. Selalu tanyakan kebijakan spesifik ini sebelum membeli polis jika riwayat tanpa klaim penting bagimu.',
    example: 'Pemegang polis yang tidak klaim selama setahun penuh bisa mendapat diskon perpanjangan premi di tahun berikutnya, tergantung kebijakan perusahaan asuransi.',
    relatedSlugs: ['premi', 'risiko-sendiri'],
    ctaPath: '/asuransi-mobil',
    ctaLabel: 'Bandingkan Asuransi Mobil',
  },
  {
    slug: 'tanggung-jawab-pihak-ketiga',
    term: 'Tanggung Jawab Pihak Ketiga (TPL)',
    category: 'Asuransi Mobil',
    shortDef: 'Perluasan jaminan yang menanggung ganti rugi jika kendaraanmu menyebabkan kerugian pada properti atau kendaraan orang lain.',
    longDef: 'Third Party Liability (TPL) adalah perluasan jaminan yang melindungi pemegang polis dari tuntutan ganti rugi pihak lain akibat kecelakaan yang disebabkan kendaraannya sendiri — misalnya menabrak mobil atau properti orang lain. Tanpa TPL, biaya ganti rugi kepada pihak ketiga menjadi tanggungan pribadi pemilik kendaraan, terlepas dari jenis polis (All Risk atau TLO) yang dimiliki untuk kendaraannya sendiri.',
    example: 'Jika mobilmu menabrak pagar rumah orang lain, TPL menanggung biaya perbaikan pagar tersebut — bukan biaya perbaikan mobilmu sendiri, yang ditanggung terpisah oleh All Risk/TLO.',
    relatedSlugs: ['all-risk', 'tlo'],
    ctaPath: '/asuransi-mobil/all-risk',
    ctaLabel: 'Pelajari Perluasan Jaminan All Risk',
  },
  {
    slug: 'polis',
    term: 'Polis Asuransi',
    category: 'Umum',
    shortDef: 'Dokumen resmi berisi perjanjian antara pemegang polis dan perusahaan asuransi, termasuk cakupan, pengecualian, dan kewajiban masing-masing pihak.',
    longDef: 'Polis adalah kontrak tertulis yang mengikat secara hukum antara pemegang polis dan perusahaan asuransi. Di dalamnya tercantum apa saja yang ditanggung, pengecualian (apa yang tidak ditanggung), besaran premi dan risiko sendiri, uang pertanggungan, serta hak dan kewajiban kedua belah pihak. Membaca ringkasan polis sebelum membeli — bukan setelah butuh klaim — adalah kebiasaan yang bisa mencegah banyak kekecewaan di kemudian hari.',
    example: 'Sebelum membeli asuransi mobil, cek polis untuk memastikan perluasan jaminan banjir sudah termasuk jika kamu tinggal di area rawan banjir — bukan mengasumsikan itu otomatis ditanggung.',
    relatedSlugs: ['premi', 'risiko-sendiri', 'uang-pertanggungan'],
    ctaPath: '/asuransi-mobil',
    ctaLabel: 'Bandingkan Asuransi Mobil',
  },
  {
    slug: 'cashless',
    term: 'Cashless',
    category: 'Asuransi Kesehatan',
    shortDef: 'Metode klaim di mana pemegang polis tidak perlu membayar dulu — biaya diselesaikan langsung antara rumah sakit dan perusahaan asuransi.',
    longDef: 'Cashless adalah mekanisme klaim asuransi kesehatan di mana pemegang polis cukup menunjukkan kartu digital atau nomor polis di rumah sakit rekanan — tanpa perlu membayar dulu dan menunggu proses reimbursement. Rumah sakit memverifikasi manfaat langsung dengan sistem perusahaan asuransi. Ini hanya berlaku di jaringan rumah sakit rekanan; di luar jaringan, pemegang polis tetap perlu membayar dulu lalu mengajukan reimbursement.',
    example: 'Saat rawat inap di rumah sakit rekanan, kamu tinggal tunjukkan kartu digital SurePath — tidak perlu menyiapkan uang muka seperti pasien umum.',
    relatedSlugs: ['polis', 'premi'],
    ctaPath: '/asuransi-kesehatan',
    ctaLabel: 'Pelajari Asuransi Kesehatan',
  },
  {
    slug: 'masa-tunggu',
    term: 'Masa Tunggu (Waiting Period)',
    category: 'Umum',
    shortDef: 'Periode setelah polis aktif di mana manfaat tertentu belum bisa diklaim — berbeda dari kondisi darurat yang biasanya langsung ditanggung.',
    longDef: 'Masa tunggu adalah jangka waktu yang harus dilewati sejak polis aktif sebelum manfaat tertentu bisa diklaim. Ini umum diterapkan untuk manfaat non-darurat seperti melahirkan pada asuransi kesehatan, mencegah orang mendaftar polis hanya setelah tahu akan butuh manfaat tertentu dalam waktu dekat. Kondisi darurat medis biasanya dikecualikan dari masa tunggu dan langsung ditanggung sejak polis aktif.',
    example: 'Manfaat melahirkan pada asuransi kesehatan biasanya punya masa tunggu beberapa bulan — mendaftar saat sudah hamil besar tidak akan langsung menanggung biaya persalinan tersebut.',
    relatedSlugs: ['polis', 'cashless'],
    ctaPath: '/asuransi-kesehatan',
    ctaLabel: 'Pelajari Asuransi Kesehatan',
  },
  {
    slug: 'evakuasi-medis',
    term: 'Evakuasi Medis',
    category: 'Asuransi Perjalanan',
    shortDef: 'Pemindahan pasien ke fasilitas kesehatan yang lebih memadai, ditanggung sebagai bagian dari manfaat asuransi perjalanan dalam kondisi darurat.',
    longDef: 'Evakuasi medis adalah manfaat yang menanggung biaya pemindahan pasien dari lokasi kejadian ke fasilitas kesehatan yang lebih memadai — bisa dalam kota yang sama atau lintas negara untuk polis perjalanan internasional — ketika fasilitas terdekat tidak mampu menangani kondisi darurat yang dialami. Biaya evakuasi medis, terutama lintas negara, bisa sangat tinggi tanpa proteksi asuransi.',
    example: 'Wisatawan yang mengalami kecelakaan serius di daerah terpencil mungkin perlu dievakuasi ke rumah sakit kota besar terdekat — biaya evakuasi ini yang ditanggung manfaat evakuasi medis.',
    relatedSlugs: ['uang-pertanggungan'],
    ctaPath: '/asuransi-perjalanan/internasional',
    ctaLabel: 'Pelajari Asuransi Perjalanan Internasional',
  },
];

export const glossaryTermBySlug = (slug: string) => GLOSSARY_TERMS.find(t => t.slug === slug);
