export const TNC_VERSION = 'v1.0';

export const TNC_SECTIONS = [
  {
    title: '1. Layanan SurePath',
    body: `SurePath adalah platform digital asuransi yang menghubungkan pengguna dengan produk asuransi dari berbagai penanggung (insurer) berlisensi OJK. SurePath berperan sebagai marketplace/perantara dan bukan sebagai penanggung langsung. Semua produk yang tersedia telah mendapatkan persetujuan dari Otoritas Jasa Keuangan (OJK) Republik Indonesia.`,
  },
  {
    title: '2. Syarat Penggunaan & Kelayakan',
    body: `Untuk menggunakan layanan SurePath, Anda harus:\n• Berusia minimal 17 (tujuh belas) tahun;\n• Warga Negara Indonesia (WNI) atau badan hukum Indonesia;\n• Memiliki identitas resmi yang sah (KTP/SIM/Paspor);\n• Memiliki kapasitas hukum untuk membuat perjanjian yang mengikat;\n• Tidak sedang dalam status kebangkrutan atau pengampuan hukum.\n\nSurePath berhak menolak atau menghentikan akses pengguna yang tidak memenuhi syarat kelayakan di atas.`,
  },
  {
    title: '3. Pengumpulan & Pengolahan Data Pribadi',
    body: `Dalam rangka penyediaan layanan, SurePath mengumpulkan dan memproses data pribadi Anda, meliputi:\n• Nama lengkap, tanggal lahir, dan jenis kelamin;\n• Nomor Induk Kependudukan (NIK) dan data KTP;\n• Nomor kendaraan, data STNK, dan foto kendaraan;\n• Nomor telepon dan alamat e-mail;\n• Data lokasi dan informasi perangkat.\n\nData Anda diproses berdasarkan Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP) dan peraturan OJK yang berlaku. Data tidak akan dijual kepada pihak ketiga tanpa persetujuan eksplisit Anda, kecuali untuk keperluan pemrosesan klaim dan penerbitan polis oleh penanggung mitra.`,
  },
  {
    title: '4. Persetujuan Pemrosesan Klaim & Pembayaran Premi',
    body: `Dengan menggunakan layanan SurePath, Anda menyetujui:\n• Pemrosesan pembayaran premi melalui gateway pembayaran yang telah bersertifikat PCI-DSS;\n• Penyampaian data yang diperlukan kepada penanggung mitra untuk keperluan akseptasi risiko dan penerbitan polis;\n• Proses verifikasi klaim yang dapat mencakup pemeriksaan foto, dokumen, dan kunjungan lapangan oleh surveyor;\n• Penyelesaian klaim sesuai dengan ketentuan polis yang berlaku dan jadwal pembayaran yang ditetapkan penanggung.`,
  },
  {
    title: '5. Kewajiban Pengguna',
    body: `Anda wajib:\n• Memberikan informasi yang akurat, lengkap, dan tidak menyesatkan pada seluruh formulir;\n• Tidak menyembunyikan fakta material yang relevan (material fact) yang dapat memengaruhi keputusan akseptasi risiko penanggung;\n• Segera memberitahukan SurePath apabila terjadi perubahan data yang memengaruhi risiko yang diasuransikan;\n• Tidak melakukan penipuan asuransi (insurance fraud) dalam bentuk apapun;\n• Menjaga kerahasiaan kredensial akun dan segera melapor apabila terjadi akses tidak sah.\n\nPelanggaran kewajiban ini dapat mengakibatkan pembatalan polis, penolakan klaim, dan/atau tindakan hukum sesuai peraturan yang berlaku.`,
  },
  {
    title: '6. Penggunaan AI & Teknologi Computer Vision',
    body: `SurePath menggunakan teknologi Kecerdasan Buatan (AI) dan Computer Vision untuk:\n• OCR (Optical Character Recognition) dokumen STNK dan KTP guna mempercepat proses pendaftaran;\n• Validasi foto kendaraan untuk mendeteksi kerusakan pra-asuransi;\n• Survei kendaraan berbasis foto untuk penilaian risiko underwriting;\n• Analisis kuitansi medis untuk klaim asuransi kesehatan.\n\nHasil analisis AI bersifat indikatif dan dapat ditinjau ulang oleh underwriter manusia. SurePath tidak bertanggung jawab atas keputusan yang diambil semata-mata berdasarkan output AI tanpa verifikasi lebih lanjut.`,
  },
  {
    title: '7. Batasan Tanggung Jawab',
    body: `SurePath sebagai platform marketplace:\n• Tidak bertanggung jawab atas kegagalan bayar klaim yang disebabkan oleh kondisi polis atau keputusan penanggung;\n• Tidak menjamin ketersediaan layanan tanpa gangguan 24/7, meskipun kami berupaya mempertahankan uptime tertinggi;\n• Tidak bertanggung jawab atas kerugian tidak langsung, konsekuensial, atau kehilangan keuntungan;\n• Tanggung jawab SurePath dalam satu kejadian dibatasi sebesar premi yang telah Anda bayarkan untuk polis terkait.\n\nPeranggung bertanggung jawab penuh atas penyelesaian klaim sesuai syarat dan ketentuan polis masing-masing.`,
  },
  {
    title: '8. Hukum yang Berlaku & Penyelesaian Sengketa',
    body: `Syarat dan Ketentuan ini tunduk pada dan ditafsirkan berdasarkan Hukum Negara Republik Indonesia, termasuk namun tidak terbatas pada:\n• Undang-Undang No. 40 Tahun 2014 tentang Perasuransian;\n• Peraturan OJK (POJK) terkait pemasaran digital produk asuransi;\n• Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi;\n• Undang-Undang No. 19 Tahun 2016 tentang Informasi dan Transaksi Elektronik.\n\nSengketa diselesaikan melalui musyawarah mufakat. Apabila tidak tercapai kesepakatan dalam 30 (tiga puluh) hari, sengketa diselesaikan melalui Lembaga Alternatif Penyelesaian Sengketa (LAPS) Sektor Jasa Keuangan atau Pengadilan Negeri Jakarta Selatan sesuai pilihan pengguna.`,
  },
];

export function buildTncText(): string {
  const header = `SYARAT DAN KETENTUAN SUREPATH\nVersi: ${TNC_VERSION}\n${'─'.repeat(60)}\n\n`;
  const body = TNC_SECTIONS.map(s => `${s.title}\n${s.body}`).join('\n\n');
  return header + body;
}
