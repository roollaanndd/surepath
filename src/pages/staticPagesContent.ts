// Bilingual content for footer / static info pages.
// Loc tuple = [Bahasa Indonesia, English]. Resolved at render time via lang.

export type Loc = readonly [id: string, en: string];

export interface StaticSection {
  heading: Loc;
  body: Loc | Loc[];
}

export interface StaticContent {
  title: Loc;
  subtitle: Loc;
  sections: StaticSection[];
  ctaLabel?: Loc;
}

export const STATIC_CONTENT: Record<string, StaticContent> = {
  careers: {
    title: ['Karir di SurePath', 'Careers at SurePath'],
    subtitle: [
      'Bergabunglah dengan tim yang sedang membangun masa depan asuransi Indonesia.',
      'Join the team building the future of insurance in Indonesia.',
    ],
    sections: [
      {
        heading: ['Kenapa SurePath?', 'Why SurePath?'],
        body: [
          'Kami adalah startup insurtech yang bergerak cepat dengan kultur kerja terbuka, menghargai setiap ide, dan memberdayakan setiap anggota tim untuk membuat dampak nyata bagi jutaan orang.',
          'We are a fast-moving insurtech startup with an open culture that values every idea and empowers each team member to make a real impact for millions of people.',
        ],
      },
      {
        heading: ['Posisi Terbuka', 'Open Positions'],
        body: [
          ['Frontend Engineer (React / TypeScript)', 'Frontend Engineer (React / TypeScript)'],
          ['Backend Engineer (Node.js / Supabase)', 'Backend Engineer (Node.js / Supabase)'],
          ['AI & Machine Learning Engineer', 'AI & Machine Learning Engineer'],
          ['Product Manager', 'Product Manager'],
          ['Mitra Asuransi — berbagai kota di Indonesia', 'Insurance Partner — various cities across Indonesia'],
          ['Customer Success Specialist', 'Customer Success Specialist'],
        ],
      },
      {
        heading: ['Benefit Kami', 'Our Benefits'],
        body: [
          ['Gaji kompetitif & paket equity', 'Competitive salary & equity package'],
          ['Ramah remote dengan jam kerja fleksibel', 'Remote-friendly with flexible working hours'],
          ['BPJS Kesehatan & Ketenagakerjaan penuh', 'Full BPJS health & employment coverage'],
          ['Asuransi kesehatan premium untuk karyawan & keluarga', 'Premium health insurance for employees & family'],
          ['Anggaran pembelajaran & pengembangan per tahun', 'Annual learning & development budget'],
          ['Team retreat tahunan dan acara kebersamaan perusahaan', 'Annual team retreat and company gatherings'],
        ],
      },
      {
        heading: ['Cara Melamar', 'How to Apply'],
        body: [
          'Kirimkan CV dan portofolio terbaru Anda ke careers@surepath.id dengan subjek: [Posisi Dilamar] — Nama Anda. Tim HR SurePath akan menghubungi dalam 5 hari kerja.',
          'Send your latest CV and portfolio to careers@surepath.id with the subject: [Role Applied] — Your Name. The SurePath HR team will reach out within 5 business days.',
        ],
      },
    ],
    ctaLabel: ['Kirim Lamaran', 'Send Application'],
  },

  agents: {
    title: ['Program Mitra SurePath', 'SurePath Partner Program'],
    subtitle: [
      'Jadilah bagian dari jaringan mitra insurtech terdepan dan paling inovatif di Indonesia.',
      'Become part of the most advanced and innovative insurtech partner network in Indonesia.',
    ],
    sections: [
      {
        heading: ['Apa Itu Program Mitra?', 'What Is the Partner Program?'],
        body: [
          'Program Mitra SurePath membuka peluang bagi Anda untuk memasarkan produk asuransi unggulan dari 18+ insurer terkemuka, dengan dukungan teknologi digital penuh dan pelatihan tersertifikasi. Perlu diingat: keputusan akseptasi risiko, penerbitan polis, dan klaim tetap sepenuhnya berada pada wewenang masing-masing perusahaan asuransi.',
          'The SurePath Partner Program lets you market top insurance products from 18+ leading insurers, backed by full digital technology and certified training. Note: decisions on risk acceptance, policy issuance, and claims remain entirely the authority of each insurance company.',
        ],
      },
      {
        heading: ['Keunggulan Menjadi Mitra SurePath', 'Benefits of Being a SurePath Partner'],
        body: [
          ['Komisi kompetitif hingga 15% per polis yang berhasil diterbitkan', 'Competitive commission up to 15% per issued policy'],
          ['Dashboard digital real-time untuk kelola klien, polis, dan komisi', 'Real-time digital dashboard to manage clients, policies, and commissions'],
          ['Pelatihan online & offline tersertifikasi AAJI / AAUI', 'AAJI / AAUI certified online & offline training'],
          ['Dukungan lead generation langsung dari platform SurePath', 'Lead generation support directly from the SurePath platform'],
          ['Tanpa modal awal — pendaftaran sepenuhnya gratis', 'No upfront capital — registration is completely free'],
          ['Fleksibel: bisa paruh waktu sambil pekerjaan utama', 'Flexible: work part-time alongside your main job'],
        ],
      },
      {
        heading: ['Syarat Bergabung', 'Requirements to Join'],
        body: [
          ['WNI, usia minimal 21 tahun', 'Indonesian citizen, minimum age 21'],
          ['Pendidikan minimal SMA / sederajat', 'Minimum high school education or equivalent'],
          ['Memiliki KTP dan NPWP aktif', 'Have an active national ID (KTP) and tax ID (NPWP)'],
          ['Berkomitmen tinggi, jujur, dan berintegritas', 'Highly committed, honest, and with strong integrity'],
          ['Bersedia secara sukarela memberikan data yang benar dan akurat, yang akan diteruskan kepada perusahaan asuransi terkait', 'Willing to voluntarily provide true and accurate data, which will be forwarded to the relevant insurance company'],
        ],
      },
      {
        heading: ['Proses Pendaftaran', 'Registration Process'],
        body: [
          'Klik tombol "Daftar Jadi Mitra", isi formulir pendaftaran mitra, lalu ikuti proses onboarding dan pelatihan online. Mitra aktif akan mendapat akses penuh ke portal mitra dalam 3–5 hari kerja.',
          'Click "Register as Partner", fill in the partner registration form, then complete onboarding and online training. Active partners get full access to the partner portal within 3–5 business days.',
        ],
      },
    ],
    ctaLabel: ['Daftar Jadi Mitra', 'Register as Partner'],
  },

  partnership: {
    title: ['Kemitraan SurePath', 'SurePath Partnerships'],
    subtitle: [
      'Kolaborasi strategis untuk memperluas jangkauan perlindungan di seluruh Indonesia.',
      'Strategic collaboration to expand protection coverage across Indonesia.',
    ],
    sections: [
      {
        heading: ['Model Kemitraan', 'Partnership Models'],
        body: [
          ['Insurer Partnership — Integrasi produk asuransi ke ekosistem platform SurePath', 'Insurer Partnership — Integrate insurance products into the SurePath platform ecosystem'],
          ['B2B Embedded Insurance — Solusi asuransi white-label untuk bisnis Anda', 'B2B Embedded Insurance — White-label insurance solutions for your business'],
          ['Integrasi API & Teknologi — Platform digital terhubung langsung ke sistem SurePath', 'API & Technology Integration — Connect your digital platform directly to SurePath'],
          ['Channel Partnership — Distribusi produk melalui jaringan dan basis data Anda', 'Channel Partnership — Distribute products through your network and database'],
        ],
      },
      {
        heading: ['Kenapa Bermitra dengan SurePath?', 'Why Partner with SurePath?'],
        body: [
          ['Akses ke 12.000+ nasabah aktif yang terus bertumbuh', 'Access to 12,000+ active and growing customers'],
          ['Infrastruktur teknologi AI dan Computer Vision yang siap pakai', 'Ready-to-use AI and Computer Vision technology infrastructure'],
          ['Proses onboarding mitra yang cepat (2–4 minggu)', 'Fast partner onboarding (2–4 weeks)'],
          ['Tim teknis, legal, dan kepatuhan yang berpengalaman', 'Experienced technical, legal, and compliance teams'],
          ['Bekerja sama dengan perusahaan asuransi berijin OJK', 'OJK-registered and fully compliant with Indonesian regulations'],
        ],
      },
      {
        heading: ['Hubungi Tim Kami', 'Contact Our Team'],
        body: [
          'Untuk diskusi kemitraan strategis lebih lanjut, silakan hubungi tim Business Development kami di partnership@surepath.id atau isi formulir kemitraan online dan tim kami akan menghubungi dalam 2 hari kerja.',
          'For further strategic partnership discussions, contact our Business Development team at partnership@surepath.id or fill in the online partnership form and our team will reach out within 2 business days.',
        ],
      },
    ],
    ctaLabel: ['Diskusi Kemitraan', 'Discuss Partnership'],
  },

  privacy: {
    title: ['Kebijakan Privasi', 'Privacy Policy'],
    subtitle: [
      'Kami berkomitmen penuh untuk melindungi privasi dan keamanan data pribadi Anda.',
      'We are fully committed to protecting the privacy and security of your personal data.',
    ],
    sections: [
      {
        heading: ['1. Data yang Kami Kumpulkan', '1. Data We Collect'],
        body: [
          'Kami mengumpulkan data yang Anda berikan langsung (nama, email, nomor telepon, data identitas KTP, data kendaraan), data yang dihasilkan otomatis (log akses, informasi perangkat, lokasi kota), serta data dari mitra terverifikasi (mitra verifikasi identitas, perusahaan asuransi rekanan).',
          'We collect data you provide directly (name, email, phone number, national ID details, vehicle data), data generated automatically (access logs, device information, city location), and data from verified partners (identity verification partners, partner insurers).',
        ],
      },
      {
        heading: ['2. Tujuan Penggunaan Data', '2. How We Use Your Data'],
        body: [
          ['Memproses aplikasi asuransi dan klaim Anda secara akurat', 'Accurately processing your insurance applications and claims'],
          ['Verifikasi identitas dan pencegahan penipuan', 'Identity verification and fraud prevention'],
          ['Personalisasi pengalaman dan rekomendasi produk yang relevan', 'Personalizing your experience and recommending relevant products'],
          ['Komunikasi terkait layanan, polis, dan informasi penting', 'Communicating about services, policies, and important information'],
          ['Bekerja sama dengan perusahaan asuransi berijin OJK', 'Full compliance with OJK regulations and applicable laws'],
          ['Diteruskan kepada perusahaan asuransi terkait, dengan persetujuan sukarela Anda, untuk keperluan akseptasi risiko, penerbitan polis, dan penyelesaian klaim — keputusan atas hal-hal tersebut sepenuhnya berada di tangan perusahaan asuransi', 'Forwarded to the relevant insurance company, with your voluntary consent, for risk acceptance, policy issuance, and claims settlement — decisions on these matters rest solely with the insurance company'],
        ],
      },
      {
        heading: ['3. Keamanan Data', '3. Data Security'],
        body: [
          'Seluruh data Anda disimpan dengan enkripsi AES-256 dan ditransmisikan melalui TLS 1.3. Akses dibatasi ketat hanya untuk staf yang memiliki kebutuhan bisnis yang sah, dengan audit log lengkap. SurePath tidak menjual atau menyewakan data Anda kepada pihak ketiga mana pun.',
          'All your data is stored with AES-256 encryption and transmitted over TLS 1.3. Access is strictly limited to staff with a legitimate business need, with complete audit logs. SurePath never sells or rents your data to any third party.',
        ],
      },
      {
        heading: ['4. Hak-Hak Anda', '4. Your Rights'],
        body: [
          ['Akses Data: Minta salinan lengkap data pribadi Anda yang kami simpan', 'Data Access: Request a full copy of the personal data we hold about you'],
          ['Koreksi: Minta pembaruan untuk data yang tidak akurat atau tidak lengkap', 'Correction: Request updates to inaccurate or incomplete data'],
          ['Penghapusan: Minta penghapusan data (dengan ketentuan kewajiban regulasi)', 'Deletion: Request data deletion (subject to regulatory obligations)'],
          ['Portabilitas: Ekspor data Anda dalam format terstruktur dan dapat dibaca mesin', 'Portability: Export your data in a structured, machine-readable format'],
        ],
      },
      {
        heading: ['5. Hubungi Kami', '5. Contact Us'],
        body: [
          'Pertanyaan atau permintaan terkait privasi: privacy@surepath.id. Kami berkomitmen merespons dalam 5 hari kerja. Kebijakan ini berlaku efektif sejak 1 Januari 2024.',
          'Privacy questions or requests: privacy@surepath.id. We are committed to responding within 5 business days. This policy is effective as of 1 January 2024.',
        ],
      },
    ],
  },

  terms: {
    title: ['Syarat & Ketentuan', 'Terms & Conditions'],
    subtitle: [
      'Ketentuan penggunaan platform dan layanan SurePath yang mengikat secara hukum.',
      'The legally binding terms governing the use of SurePath’s platform and services.',
    ],
    sections: [
      {
        heading: ['1. Penerimaan Ketentuan', '1. Acceptance of Terms'],
        body: [
          'Dengan menggunakan platform SurePath (website, aplikasi mobile, atau API), Anda menyatakan telah membaca, memahami, dan menyetujui seluruh syarat dan ketentuan ini sepenuhnya. Jika Anda tidak setuju, harap hentikan penggunaan platform.',
          'By using the SurePath platform (website, mobile app, or API), you confirm that you have read, understood, and fully agree to these terms and conditions. If you do not agree, please stop using the platform.',
        ],
      },
      {
        heading: ['2. Layanan yang Disediakan', '2. Services Provided'],
        body: [
          'SurePath adalah platform teknologi insurtech berlisensi yang memfasilitasi akses ke produk asuransi dari berbagai perusahaan asuransi berlisensi OJK. SurePath menjadi perantara teknologi dan pemasaran antara nasabah dan perusahaan asuransi — SurePath bukan penanggung dan tidak menerbitkan polis. Seluruh keputusan akseptasi risiko, syarat & ketentuan polis, serta persetujuan dan penyelesaian klaim sepenuhnya berada pada wewenang perusahaan asuransi terkait.',
          'SurePath is a licensed insurtech technology platform that facilitates access to insurance products from various OJK-licensed insurers. SurePath is a technology and marketing intermediary between customers and insurers — SurePath is not an insurer and does not issue policies. All decisions on risk acceptance, policy terms, and claims approval or settlement rest solely with the relevant insurance company.',
        ],
      },
      {
        heading: ['3. Kewajiban Pengguna', '3. User Obligations'],
        body: [
          ['Memberikan informasi yang benar, lengkap, dan tidak menyesatkan secara sukarela dan sepengetahuan Anda sendiri', 'Voluntarily provide accurate, complete, and non-misleading information to the best of your knowledge'],
          ['Menjaga kerahasiaan akun, password, dan kode OTP Anda', 'Keep your account, password, and OTP codes confidential'],
          ['Tidak menyalahgunakan platform untuk kegiatan yang melanggar hukum', 'Do not misuse the platform for unlawful activities'],
          ['Membayar premi tepat waktu sesuai jadwal yang tertera pada polis', 'Pay premiums on time according to the schedule stated in your policy'],
          ['Segera melaporkan perubahan data atau informasi material kepada SurePath', 'Promptly report any change of data or material information to SurePath'],
          ['Memahami bahwa data yang Anda berikan akan diteruskan kepada perusahaan asuransi terkait untuk keperluan akseptasi risiko, penerbitan polis, dan klaim', 'Understand that the data you provide will be forwarded to the relevant insurance company for risk acceptance, policy issuance, and claims purposes'],
        ],
      },
      {
        heading: ['4. Batasan Tanggung Jawab & Wewenang Perusahaan Asuransi', '4. Limitation of Liability & Insurer Authority'],
        body: [
          'SurePath tidak bertanggung jawab atas penolakan atau penundaan klaim oleh perusahaan asuransi yang disebabkan oleh ketidakakuratan data yang diberikan pengguna, kondisi pengecualian dalam polis, atau pelanggaran ketentuan polis oleh tertanggung. Perusahaan asuransi terkait memegang wewenang dan keputusan akhir yang mengikat atas akseptasi risiko, syarat polis, dan penyelesaian klaim — SurePath tidak dapat mengubah atau menjamin hasil dari keputusan tersebut.',
          'SurePath is not liable for claim rejections or delays by insurers caused by inaccurate data provided by the user, policy exclusions, or breaches of policy terms by the insured. The relevant insurance company holds sole and final binding authority over risk acceptance, policy terms, and claims settlement — SurePath cannot alter or guarantee the outcome of that decision.',
        ],
      },
      {
        heading: ['5. Hukum yang Berlaku', '5. Governing Law'],
        body: [
          'Syarat dan ketentuan ini diatur oleh hukum Negara Republik Indonesia. Segala sengketa yang timbul diselesaikan melalui Badan Mediasi Asuransi Indonesia (BMAI) atau pengadilan yang berwenang di Jakarta Selatan.',
          'These terms and conditions are governed by the laws of the Republic of Indonesia. Any disputes shall be resolved through the Indonesian Insurance Mediation Board (BMAI) or the competent courts in South Jakarta.',
        ],
      },
    ],
  },

  security: {
    title: ['Keamanan Data', 'Data Security'],
    subtitle: [
      'Infrastruktur keamanan berlapis untuk melindungi setiap aspek data dan transaksi Anda.',
      'Layered security infrastructure protecting every aspect of your data and transactions.',
    ],
    sections: [
      {
        heading: ['Enkripsi End-to-End', 'End-to-End Encryption'],
        body: [
          'Semua data sensitif dienkripsi menggunakan standar AES-256 saat penyimpanan dan TLS 1.3 saat transmisi. Kunci enkripsi dirotasi secara periodik dan disimpan di key management system terpisah.',
          'All sensitive data is encrypted using AES-256 at rest and TLS 1.3 in transit. Encryption keys are rotated periodically and stored in a separate key management system.',
        ],
      },
      {
        heading: ['Autentikasi & Kontrol Akses', 'Authentication & Access Control'],
        body: [
          ['Autentikasi multi-faktor (MFA) tersedia dan sangat direkomendasikan untuk semua akun', 'Multi-factor authentication (MFA) is available and strongly recommended for all accounts'],
          ['PBKDF2-HMAC-SHA256 dengan salt unik per pengguna untuk hashing password', 'PBKDF2-HMAC-SHA256 with a unique per-user salt for password hashing'],
          ['Token sesi dengan kedaluwarsa otomatis dan deteksi anomali aktivitas', 'Session tokens with automatic expiry and activity anomaly detection'],
          ['Tabel data sensitif tidak dapat diakses langsung dari browser — setiap permintaan diverifikasi ulang di server, per aksi', 'Sensitive data tables cannot be reached directly from the browser — every request is re-verified server-side, per action'],
        ],
      },
      {
        heading: ['Infrastruktur Cloud', 'Cloud Infrastructure'],
        body: [
          'Platform SurePath di-host di Supabase dengan infrastruktur AWS region ap-southeast-1 (Singapura), sehingga data Anda berada di kawasan Asia Tenggara. Backup basis data dan pemulihan data dikelola melalui penyedia infrastruktur tersebut. Sertifikasi kepatuhan yang berlaku pada lapisan infrastruktur adalah milik penyedia infrastruktur, bukan sertifikasi atas nama SurePath.',
          'The SurePath platform is hosted on Supabase with AWS infrastructure in the ap-southeast-1 region (Singapore), so your data resides within Southeast Asia. Database backup and recovery are managed through that infrastructure provider. Any compliance certifications at the infrastructure layer belong to the infrastructure provider, and are not certifications held by SurePath.',
        ],
      },
      {
        heading: ['Monitoring & Respons Insiden', 'Monitoring & Incident Response'],
        body: [
          ['Deteksi anomali real-time dan alerting 24/7', 'Real-time anomaly detection and 24/7 alerting'],
          ['Audit log komprehensif untuk semua akses ke data sensitif', 'Comprehensive audit logs for all access to sensitive data'],
          ['Program bug bounty terbuka bagi peneliti keamanan independen', 'Open bug bounty program for independent security researchers'],
          ['Komitmen respons insiden dalam < 4 jam untuk tingkat keparahan kritis', 'Incident response commitment within 4 hours for critical severity'],
        ],
      },
      {
        heading: ['Pelaporan Kerentanan', 'Vulnerability Reporting'],
        body: [
          'Jika Anda menemukan celah keamanan, laporkan secara bertanggung jawab ke security@surepath.id. Kami sangat menghargai setiap laporan dan berkomitmen merespons dalam 72 jam dengan tindak lanjut yang serius.',
          'If you discover a security vulnerability, please disclose it responsibly to security@surepath.id. We greatly value every report and commit to responding within 72 hours with serious follow-up.',
        ],
      },
    ],
  },

  cookie: {
    title: ['Kebijakan Cookie', 'Cookie Policy'],
    subtitle: [
      'Informasi transparan tentang penggunaan cookie di platform SurePath.',
      'Transparent information about how SurePath uses cookies.',
    ],
    sections: [
      {
        heading: ['Apa Itu Cookie?', 'What Are Cookies?'],
        body: [
          'Cookie adalah file teks kecil yang disimpan di perangkat Anda saat mengunjungi website SurePath. Cookie membantu kami mengingat preferensi Anda, menjaga keamanan sesi, dan meningkatkan pengalaman pengguna secara keseluruhan.',
          'Cookies are small text files stored on your device when you visit the SurePath website. They help us remember your preferences, keep your session secure, and improve the overall user experience.',
        ],
      },
      {
        heading: ['Jenis Cookie yang Kami Gunakan', 'Types of Cookies We Use'],
        body: [
          ['Cookie Esensial — Diperlukan untuk fungsi dasar platform seperti login, keamanan sesi, dan navigasi halaman', 'Essential Cookies — Required for core platform functions such as login, session security, and page navigation'],
          ['Cookie Analitik — Membantu kami memahami cara pengguna berinteraksi dengan platform untuk perbaikan berkelanjutan', 'Analytics Cookies — Help us understand how users interact with the platform for continuous improvement'],
          ['Cookie Preferensi — Menyimpan pengaturan pribadi seperti pilihan bahasa, tema, dan preferensi tampilan', 'Preference Cookies — Store personal settings such as language, theme, and display preferences'],
          ['Cookie Pemasaran — Untuk menampilkan iklan yang lebih relevan (dapat dinonaktifkan sepenuhnya)', 'Marketing Cookies — To show more relevant ads (can be fully disabled)'],
        ],
      },
      {
        heading: ['Cara Mengelola Cookie', 'Managing Cookies'],
        body: [
          'Anda dapat mengatur preferensi cookie kapan saja melalui pengaturan browser Anda atau melalui panel preferensi cookie di website SurePath. Perlu diingat: menonaktifkan cookie esensial dapat mempengaruhi fungsi dan keamanan platform.',
          'You can adjust your cookie preferences at any time through your browser settings or the cookie preferences panel on the SurePath website. Note: disabling essential cookies may affect platform functionality and security.',
        ],
      },
      {
        heading: ['Pertanyaan', 'Questions'],
        body: [
          'Untuk pertanyaan lebih lanjut terkait kebijakan cookie SurePath, silakan hubungi kami di privacy@surepath.id.',
          'For further questions about SurePath’s cookie policy, please contact us at privacy@surepath.id.',
        ],
      },
    ],
  },
};
