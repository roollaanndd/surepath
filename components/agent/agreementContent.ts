// ─── Perjanjian Kerja Sama Keagenan — legal T&C content (single source) ──────
// Used by both the in-app acceptance gate and the PDF export so the signed
// wording always matches the printed document.

export const AGREEMENT_META = {
  title: 'PERJANJIAN KERJA SAMA KEAGENAN',
  subtitle: 'Syarat & Ketentuan Keagenan Digital SurePath',
  version: 'v1.0-2026',
  effectiveDate: '1 Januari 2026',
  company: {
    name: 'PT SurePath Digital Indonesia',
    brand: 'SurePath — myinsurepath.com',
    domicile: 'Jakarta, Republik Indonesia',
  },
};

export interface AgreementClause {
  heading: string;
  body: string[];
}

export const AGREEMENT_CLAUSES: AgreementClause[] = [
  {
    heading: 'PASAL 1 — DEFINISI',
    body: [
      '1.1. "Perusahaan" adalah PT SurePath Digital Indonesia beserta seluruh badan hukum afiliasinya yang mengoperasikan platform SurePath.',
      '1.2. "Agen" adalah perorangan yang telah mendaftar, terverifikasi, dan menyetujui Perjanjian ini untuk memasarkan produk asuransi melalui platform SurePath.',
      '1.3. "Platform" adalah aplikasi dan sistem digital SurePath, termasuk aplikasi seluler, situs web, dan seluruh layanan pendukungnya.',
      '1.4. "Nasabah" adalah pihak yang membeli produk asuransi melalui Agen pada Platform.',
      '1.5. "Perusahaan Asuransi" adalah perusahaan asuransi berizin OJK yang produknya dipasarkan melalui Platform.',
    ],
  },
  {
    heading: 'PASAL 2 — RUANG LINGKUP & STATUS HUBUNGAN',
    body: [
      '2.1. Agen memasarkan produk asuransi atas dasar kemitraan mandiri dan BUKAN merupakan hubungan kerja/ketenagakerjaan, keagenan tetap, atau kemitraan usaha bersama (partnership) dengan Perusahaan.',
      '2.2. Agen tidak berwenang mengikat, mewakili, atau menimbulkan kewajiban hukum apa pun atas nama Perusahaan maupun Perusahaan Asuransi di luar kewenangan tertulis yang diberikan.',
      '2.3. Agen bertindak untuk dan atas nama diri sendiri sebagai wajib pajak orang pribadi dan bertanggung jawab penuh atas seluruh kewajiban perpajakannya.',
    ],
  },
  {
    heading: 'PASAL 3 — KEWAJIBAN & LARANGAN AGEN',
    body: [
      '3.1. Agen wajib memberikan informasi produk yang benar, jujur, dan tidak menyesatkan sesuai ketentuan OJK dan peraturan perundang-undangan yang berlaku.',
      '3.2. Agen dilarang menjanjikan manfaat, tarif, atau pengembalian yang tidak sesuai dengan polis resmi Perusahaan Asuransi.',
      '3.3. Agen dilarang menerima, menahan, atau menggunakan premi Nasabah untuk kepentingan pribadi. Seluruh pembayaran premi wajib melalui kanal resmi Platform.',
      '3.4. Agen dilarang memalsukan dokumen, data Nasabah, tanda tangan, atau identitas dalam bentuk apa pun.',
      '3.5. Agen wajib menjaga kerahasiaan data Nasabah sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.',
      '3.6. Agen dilarang melakukan tindakan yang merugikan nama baik, reputasi, atau kepentingan bisnis Perusahaan maupun Perusahaan Asuransi.',
    ],
  },
  {
    heading: 'PASAL 4 — KOMISI',
    body: [
      '4.1. Agen berhak atas komisi sesuai skema yang berlaku pada Platform pada saat transaksi terjadi dan hanya atas polis yang telah efektif serta preminya lunas.',
      '4.2. Komisi dapat ditinjau, disesuaikan, atau dibatalkan apabila polis batal, dibatalkan, gagal bayar, atau terbukti diperoleh melalui pelanggaran Perjanjian ini.',
      '4.3. Perusahaan berhak melakukan pemotongan (clawback) atas komisi yang telah dibayarkan apabila kemudian ditemukan pembatalan polis, fraud, atau ketidaksesuaian data.',
    ],
  },
  {
    heading: 'PASAL 5 — PERNYATAAN & JAMINAN AGEN',
    body: [
      '5.1. Agen menyatakan bahwa seluruh data yang diberikan, termasuk nama lengkap dan Nomor Induk Kependudukan (NIK/KTP), adalah benar, sah, dan masih berlaku.',
      '5.2. Agen menyatakan cakap secara hukum, berusia sekurang-kurangnya 18 tahun atau telah menikah, dan tidak sedang dalam pengampuan.',
      '5.3. Agen menyatakan tidak pernah dihukum atas tindak pidana di bidang keuangan, penipuan, atau penggelapan.',
    ],
  },
  {
    heading: 'PASAL 6 — GANTI RUGI (INDEMNIFIKASI)',
    body: [
      '6.1. Agen membebaskan dan mengganti rugi Perusahaan serta Perusahaan Asuransi atas segala kerugian, tuntutan, gugatan, denda, atau biaya (termasuk biaya hukum) yang timbul akibat pelanggaran Perjanjian ini oleh Agen.',
      '6.2. Agen bertanggung jawab secara pribadi dan penuh atas segala tindakan, kelalaian, maupun pelanggaran hukum yang dilakukannya dalam memasarkan produk.',
    ],
  },
  {
    heading: 'PASAL 7 — SANKSI & PENGAKHIRAN',
    body: [
      '7.1. Perusahaan berhak menangguhkan atau menghentikan akses Agen ke Platform, membekukan komisi, dan/atau mengakhiri Perjanjian ini sewaktu-waktu apabila Agen melanggar ketentuan Perjanjian.',
      '7.2. Pengakhiran tidak menghapus kewajiban Agen yang telah timbul sebelum pengakhiran, termasuk kewajiban ganti rugi dan kerahasiaan.',
    ],
  },
  {
    heading: 'PASAL 8 — KERAHASIAAN & DATA PRIBADI',
    body: [
      '8.1. Agen wajib merahasiakan seluruh informasi Nasabah, data komersial, dan informasi rahasia Perusahaan, baik selama maupun setelah berakhirnya Perjanjian.',
      '8.2. Agen memberikan persetujuan kepada Perusahaan untuk menyimpan dan memproses data pribadi Agen (termasuk NIK/KTP) untuk keperluan verifikasi, kepatuhan, dan audit sesuai peraturan yang berlaku.',
    ],
  },
  {
    heading: 'PASAL 9 — HUKUM YANG BERLAKU & PENYELESAIAN SENGKETA',
    body: [
      '9.1. Perjanjian ini tunduk pada dan ditafsirkan menurut hukum Negara Republik Indonesia.',
      '9.2. Setiap sengketa yang timbul akan diselesaikan terlebih dahulu secara musyawarah. Apabila tidak tercapai, para pihak sepakat memilih domisili hukum yang tetap dan umum pada Kantor Panitera Pengadilan Negeri Jakarta Pusat.',
    ],
  },
  {
    heading: 'PASAL 10 — PERSETUJUAN ELEKTRONIK',
    body: [
      '10.1. Agen memahami bahwa persetujuan elektronik atas Perjanjian ini memiliki kekuatan hukum yang sama dengan tanda tangan basah sesuai Undang-Undang Nomor 11 Tahun 2008 jo. Undang-Undang Nomor 19 Tahun 2016 tentang Informasi dan Transaksi Elektronik.',
      '10.2. Dengan menekan tombol "SAYA SETUJU", Agen menyatakan telah membaca, memahami, dan menyetujui seluruh isi Perjanjian ini, serta membubuhkan nama lengkap dan Nomor KTP sebagai bentuk persetujuan yang sah dan mengikat.',
    ],
  },
];
