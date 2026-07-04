// ─── Perjanjian Kemitraan SurePath — legal T&C content (single source) ───────
// Used by both the in-app acceptance gate and the PDF export so the signed
// wording always matches the printed document.

export const AGREEMENT_META = {
  title: 'PERJANJIAN KEMITRAAN SUREPATH',
  subtitle: 'Syarat & Ketentuan Kemitraan Digital SurePath',
  version: 'v2.0-2026',
  effectiveDate: '1 Juli 2026',
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
      '1.2. "Mitra" adalah perorangan yang telah mendaftar, terverifikasi, dan menyetujui Perjanjian ini untuk memasarkan produk asuransi melalui platform SurePath.',
      '1.3. "Platform" adalah aplikasi dan sistem digital SurePath, termasuk aplikasi seluler, situs web, dan seluruh layanan pendukungnya — sebuah platform teknologi yang memfasilitasi pemasaran produk asuransi, bukan penanggung/penerbit polis.',
      '1.4. "Nasabah" adalah pihak yang membeli produk asuransi melalui Mitra pada Platform.',
      '1.5. "Perusahaan Asuransi" adalah perusahaan asuransi berizin OJK yang produknya dipasarkan melalui Platform, dan yang memegang wewenang penuh serta keputusan akhir atas akseptasi risiko, penerbitan polis, dan penyelesaian klaim.',
    ],
  },
  {
    heading: 'PASAL 2 — RUANG LINGKUP & STATUS HUBUNGAN',
    body: [
      '2.1. Perusahaan menyediakan Platform sebagai sarana teknologi dan pemasaran yang menghubungkan Mitra, Nasabah, dan Perusahaan Asuransi. Perusahaan tidak bertindak sebagai penanggung dan tidak menerbitkan polis — seluruh keputusan akseptasi risiko, syarat polis, dan klaim sepenuhnya berada di tangan Perusahaan Asuransi.',
      '2.2. Mitra memasarkan produk asuransi atas dasar kemitraan mandiri dan BUKAN merupakan hubungan kerja/ketenagakerjaan, keagenan tetap, atau kemitraan usaha bersama (partnership) dengan Perusahaan.',
      '2.3. Mitra tidak berwenang mengikat, mewakili, atau menimbulkan kewajiban hukum apa pun atas nama Perusahaan maupun Perusahaan Asuransi di luar kewenangan tertulis yang diberikan.',
      '2.4. Mitra bertindak untuk dan atas nama diri sendiri sebagai wajib pajak orang pribadi dan bertanggung jawab penuh atas seluruh kewajiban perpajakannya.',
    ],
  },
  {
    heading: 'PASAL 3 — KEWAJIBAN & LARANGAN MITRA',
    body: [
      '3.1. Mitra wajib memberikan informasi produk yang benar, jujur, dan tidak menyesatkan sesuai ketentuan OJK dan peraturan perundang-undangan yang berlaku, dan menyampaikan dengan jelas kepada Nasabah bahwa keputusan akseptasi risiko, penerbitan polis, dan klaim adalah wewenang Perusahaan Asuransi, bukan Perusahaan maupun Mitra.',
      '3.2. Mitra dilarang menjanjikan manfaat, tarif, atau pengembalian yang tidak sesuai dengan polis resmi Perusahaan Asuransi, atau menyatakan/menyiratkan bahwa Perusahaan maupun Mitra dapat menjamin persetujuan klaim.',
      '3.3. Mitra dilarang menerima, menahan, atau menggunakan premi Nasabah untuk kepentingan pribadi. Seluruh pembayaran premi wajib melalui kanal resmi Platform.',
      '3.4. Mitra dilarang memalsukan dokumen, data Nasabah, tanda tangan, atau identitas dalam bentuk apa pun.',
      '3.5. Mitra wajib menjaga kerahasiaan data Nasabah sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.',
      '3.6. Mitra dilarang melakukan tindakan yang merugikan nama baik, reputasi, atau kepentingan bisnis Perusahaan maupun Perusahaan Asuransi.',
    ],
  },
  {
    heading: 'PASAL 4 — KOMISI',
    body: [
      '4.1. Mitra berhak atas komisi sesuai skema yang berlaku pada Platform pada saat transaksi terjadi dan hanya atas polis yang telah efektif serta preminya lunas.',
      '4.2. Komisi dapat ditinjau, disesuaikan, atau dibatalkan apabila polis batal, dibatalkan, gagal bayar, atau terbukti diperoleh melalui pelanggaran Perjanjian ini.',
      '4.3. Perusahaan berhak melakukan pemotongan (clawback) atas komisi yang telah dibayarkan apabila kemudian ditemukan pembatalan polis, fraud, atau ketidaksesuaian data.',
    ],
  },
  {
    heading: 'PASAL 5 — PERNYATAAN, JAMINAN, & PERSETUJUAN PENERUSAN DATA',
    body: [
      '5.1. Mitra menyatakan secara sukarela ("dengan kesadaran penuh dan tanpa paksaan") bahwa seluruh data yang diberikan, termasuk nama lengkap dan Nomor Induk Kependudukan (NIK/KTP), adalah benar, sah, akurat, dan masih berlaku, serta bersedia memperbaruinya apabila terjadi perubahan.',
      '5.2. Mitra memahami dan menyetujui bahwa data pribadi Mitra maupun data Nasabah yang diinput atau diproses melalui Platform — termasuk dokumen identitas, data kendaraan, dan data transaksi — akan diteruskan kepada Perusahaan Asuransi terkait sepanjang diperlukan untuk keperluan akseptasi risiko, penerbitan polis, dan/atau penyelesaian klaim, sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.',
      '5.3. Mitra menyatakan cakap secara hukum, berusia sekurang-kurangnya 18 tahun atau telah menikah, dan tidak sedang dalam pengampuan.',
      '5.4. Mitra menyatakan tidak pernah dihukum atas tindak pidana di bidang keuangan, penipuan, atau penggelapan.',
    ],
  },
  {
    heading: 'PASAL 6 — GANTI RUGI (INDEMNIFIKASI)',
    body: [
      '6.1. Mitra membebaskan dan mengganti rugi Perusahaan serta Perusahaan Asuransi atas segala kerugian, tuntutan, gugatan, denda, atau biaya (termasuk biaya hukum) yang timbul akibat pelanggaran Perjanjian ini oleh Mitra.',
      '6.2. Mitra bertanggung jawab secara pribadi dan penuh atas segala tindakan, kelalaian, maupun pelanggaran hukum yang dilakukannya dalam memasarkan produk.',
    ],
  },
  {
    heading: 'PASAL 7 — SANKSI & PENGAKHIRAN',
    body: [
      '7.1. Perusahaan berhak menangguhkan atau menghentikan akses Mitra ke Platform, membekukan komisi, dan/atau mengakhiri Perjanjian ini sewaktu-waktu apabila Mitra melanggar ketentuan Perjanjian.',
      '7.2. Pengakhiran tidak menghapus kewajiban Mitra yang telah timbul sebelum pengakhiran, termasuk kewajiban ganti rugi dan kerahasiaan.',
    ],
  },
  {
    heading: 'PASAL 8 — KERAHASIAAN & DATA PRIBADI',
    body: [
      '8.1. Mitra wajib merahasiakan seluruh informasi Nasabah, data komersial, dan informasi rahasia Perusahaan, baik selama maupun setelah berakhirnya Perjanjian.',
      '8.2. Mitra memberikan persetujuan kepada Perusahaan untuk menyimpan dan memproses data pribadi Mitra (termasuk NIK/KTP) untuk keperluan verifikasi, kepatuhan, dan audit sesuai peraturan yang berlaku, termasuk untuk diteruskan kepada Perusahaan Asuransi sebagaimana diatur pada Pasal 5.2.',
    ],
  },
  {
    heading: 'PASAL 9 — WEWENANG PERUSAHAAN ASURANSI',
    body: [
      '9.1. Mitra memahami dan menyetujui bahwa Perusahaan Asuransi memegang wewenang dan keputusan akhir yang sepenuhnya mengikat atas: (a) penerimaan atau penolakan aplikasi asuransi, (b) syarat, ketentuan, dan besaran premi polis, dan (c) persetujuan, penolakan, atau besaran pembayaran klaim.',
      '9.2. Perusahaan dan Platform tidak dapat mengubah, membatalkan, atau menjamin hasil dari keputusan Perusahaan Asuransi sebagaimana dimaksud pada ayat 9.1, dan tidak bertanggung jawab atas kerugian yang timbul dari keputusan tersebut.',
    ],
  },
  {
    heading: 'PASAL 10 — HUKUM YANG BERLAKU & PENYELESAIAN SENGKETA',
    body: [
      '10.1. Perjanjian ini tunduk pada dan ditafsirkan menurut hukum Negara Republik Indonesia.',
      '10.2. Setiap sengketa yang timbul akan diselesaikan terlebih dahulu secara musyawarah. Apabila tidak tercapai, para pihak sepakat memilih domisili hukum yang tetap dan umum pada Kantor Panitera Pengadilan Negeri Jakarta Pusat.',
    ],
  },
  {
    heading: 'PASAL 11 — PERSETUJUAN ELEKTRONIK',
    body: [
      '11.1. Mitra memahami bahwa persetujuan elektronik atas Perjanjian ini memiliki kekuatan hukum yang sama dengan tanda tangan basah sesuai Undang-Undang Nomor 11 Tahun 2008 jo. Undang-Undang Nomor 19 Tahun 2016 tentang Informasi dan Transaksi Elektronik.',
      '11.2. Dengan menekan tombol "SAYA SETUJU", Mitra menyatakan telah membaca, memahami, dan menyetujui seluruh isi Perjanjian ini — termasuk penerusan data kepada Perusahaan Asuransi pada Pasal 5.2 dan wewenang akhir Perusahaan Asuransi pada Pasal 9 — serta membubuhkan nama lengkap dan Nomor KTP sebagai bentuk persetujuan yang sah, sukarela, dan mengikat.',
    ],
  },
];
