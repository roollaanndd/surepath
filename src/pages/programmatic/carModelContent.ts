import { SiloPageContent } from '../site/SiloLandingTemplate';

// Phase 4 — car model pages, the 3 highest individual-search-volume models
// (per docs/marketing-growth-plan.md's own "premi asuransi mobil avanza
// 2024" example). Each model gets ONE genuinely distinct insurance angle
// specific to how that model is actually used in Indonesia — not brand-page
// content repeated with a different name:
//   - Avanza: ride-hailing/commercial-use disclosure (a real coverage-
//     invalidating gap if undisclosed — this is the single most useful
//     thing an Avanza owner researching insurance needs to know)
//   - Brio: aftermarket modification declaration + young first-car-owner risk
//   - Xpander: high resale demand as a double-edged theft/value consideration

const BASE_URL = 'https://myinsurepath.com';

interface ModelFact {
  slug: string;
  brand: string;
  model: string;
  type: string;
  angle: string;
  angleTitle: string;
  angleBody: string;
  priceNote: string;
  faqExtra: { q: string; a: string };
}

const rootCrumbs = [
  { name: 'Beranda', path: '/' },
  { name: 'Produk', path: '/products' },
  { name: 'Asuransi Mobil', path: '/asuransi-mobil' },
  { name: 'Per Model', path: '/asuransi-mobil/model' },
];

function generateModelContent(f: ModelFact): SiloPageContent {
  const path = `/asuransi-mobil/model/${f.slug}`;
  const fullName = `${f.brand} ${f.model}`;
  return {
    breadcrumb: [...rootCrumbs, { name: fullName, path }],
    seoTitle: `Asuransi Mobil ${fullName} — Premi & Pertimbangan Khusus | SurePath`,
    seoDescription: `Asuransi ${fullName}: tarif resmi OJK, All Risk vs TLO, dan pertimbangan khusus yang perlu diketahui pemilik ${fullName} sebelum membeli polis.`,
    category: `Asuransi Mobil ${fullName}`,
    h1: `Asuransi Mobil ${fullName}`,
    heroSubtitle: `${f.type} — salah satu model paling banyak diasuransikan di Indonesia. Ini yang perlu kamu tahu sebelum membeli polis, termasuk satu pertimbangan yang sering terlewat.`,
    heroHighlights: ['Tarif Resmi OJK', f.type, 'Pertimbangan Khusus Model Ini'],
    bodyIntro: `${fullName} adalah salah satu model ${f.brand} paling populer di Indonesia, dan karena itu juga salah satu yang paling sering ditanyakan soal asuransinya. Selain tarif standar yang berlaku sama untuk semua kendaraan sejenis, ada satu pertimbangan spesifik terkait cara ${fullName} umumnya dipakai di lapangan yang layak kamu pahami sebelum membeli polis.`,
    benefitsTitle: `Yang Perlu Diketahui Pemilik ${fullName}`,
    benefits: [
      { title: f.angleTitle, desc: f.angleBody },
      { title: 'Tarif Sama dengan Model Sejenis', desc: 'Premi ditentukan kategori harga pertanggungan dan wilayah, bukan model spesifik — cek halaman merek untuk konteks lebih luas.' },
      { title: 'Bandingkan Sebelum Beli', desc: 'Bandingkan penawaran dari 10+ perusahaan asuransi sekaligus untuk model ini di SurePath.' },
    ],
    coverageTitle: 'Cakupan yang Relevan',
    coverageIntro: `Pertimbangan cakupan untuk ${fullName} mengikuti pola umum ${f.type.toLowerCase()}, dengan catatan khusus di bawah.`,
    coverageItems: [
      { title: 'All Risk', desc: 'Menanggung kerusakan sebagian dan total — direkomendasikan jika unit masih baru atau kredit.' },
      { title: 'TLO', desc: 'Fokus pada kerugian total — opsi lebih hemat untuk unit yang sudah cukup berusia dan lunas.' },
      { title: f.angleTitle, desc: f.angleBody },
    ],
    priceTitle: 'Kisaran Premi',
    priceIntro: f.priceNote,
    priceTable: [
      { label: 'All Risk', value: '1,05% – 4,20% dari harga pertanggungan/tahun' },
      { label: 'TLO', value: '0,20% – 0,78% dari harga pertanggungan/tahun' },
    ],
    showCalculator: true,
    bodySections: [
      { h: f.angleTitle, p: f.angleBody },
      { h: 'Cara Menentukan Harga Pertanggungan yang Tepat', p: `Gunakan harga pasar ${fullName} saat ini sesuai usia dan kondisi unit — bukan harga beli baru jika sudah dipakai beberapa tahun. Harga pertanggungan yang akurat memastikan premi wajar dan klaim tidak under-insured.` },
      { h: 'All Risk atau TLO untuk Model Ini?', p: `Untuk ${fullName} yang masih baru atau dalam masa kredit, All Risk umumnya lebih masuk akal mengingat nilai kendaraan yang masih tinggi. Untuk unit yang sudah lunas dan berusia 5+ tahun, TLO cukup memadai selama kamu siap menanggung sendiri biaya perbaikan minor.` },
    ],
    claimProcessTitle: `Klaim Asuransi ${fullName}`,
    claimIntro: 'Proses klaim mengikuti prosedur standar — lihat panduan lengkap di halaman Cara Klaim Asuransi Mobil.',
    claimSteps: [
      { title: 'Laporkan via app', desc: 'Foto kerusakan dan ajukan laporan dalam 3×24 jam.' },
      { title: 'Survei & approval', desc: 'Surveyor asuransi memverifikasi kerusakan.' },
      { title: 'Perbaikan', desc: 'Di bengkel rekanan resmi.' },
    ],
    faqTitle: `Pertanyaan Seputar Asuransi ${fullName}`,
    faq: [
      f.faqExtra,
      { q: `Berapa premi ${fullName} tahun ini?`, a: 'Gunakan kalkulator di halaman ini untuk estimasi sesuai harga pertanggungan dan wilayahmu — premi tidak ditentukan model secara tetap, selalu mengikuti kategori harga terkini.' },
      { q: `Apakah ${fullName} bekas tetap bisa All Risk?`, a: 'Bisa, selama usia kendaraan memenuhi syarat perusahaan asuransi terkait — umumnya di bawah 10-15 tahun untuk All Risk.' },
      { q: 'Apakah premi berbeda antar perusahaan asuransi untuk model yang sama?', a: 'Kisarannya tetap dalam batas resmi OJK, tapi penawaran final bisa sedikit berbeda antar perusahaan asuransi — bandingkan di SurePath untuk melihat variasinya.' },
    ],
    internalLinksTitle: 'Jelajahi Asuransi Mobil',
    internalLinks: [
      { label: `Asuransi Mobil ${f.brand}`, path: `/asuransi-mobil/merek/${f.brand.toLowerCase()}` },
      { label: 'Asuransi Mobil All Risk', path: '/asuransi-mobil/all-risk' },
      { label: 'Asuransi Mobil TLO', path: '/asuransi-mobil/tlo' },
      { label: 'Semua Model', path: '/asuransi-mobil/model' },
    ],
    relatedArticlesTitle: 'Baca Juga',
    relatedArticles: [
      { title: 'Asuransi All Risk vs TLO: Pilih yang Mana?', excerpt: 'Bedah lengkap perbedaan All Risk dan TLO beserta tarif OJK.', path: '/blog/asuransi-all-risk-vs-tlo' },
    ],
    ctaTitle: `Bandingkan Premi ${fullName}mu`,
    ctaSubtitle: 'Cek estimasi premi gratis dalam 2 menit — tanpa perlu daftar dulu.',
    extraJsonLd: [{
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: `Asuransi Mobil ${fullName}`,
      name: `Asuransi Mobil ${fullName}`,
      description: `Asuransi mobil All Risk dan TLO untuk ${fullName}, tarif resmi OJK.`,
      provider: { '@id': `${BASE_URL}/#organization` },
      areaServed: { '@type': 'Country', name: 'Indonesia' },
      url: `${BASE_URL}${path}`,
    }],
  };
}

const MODEL_FACTS: ModelFact[] = [
  {
    slug: 'toyota-avanza',
    brand: 'Toyota',
    model: 'Avanza',
    type: 'MPV Keluarga',
    angle: 'ride-hailing',
    angleTitle: 'Dipakai untuk Ojek/Taksi Online? Wajib Disampaikan',
    angleBody: 'Avanza adalah salah satu mobil paling umum dipakai untuk layanan transportasi online (Grab, Gojek, Maxim). Ini penting: polis asuransi pribadi standar umumnya dirancang untuk penggunaan non-komersial. Jika Avanza-mu dipakai secara rutin untuk ride-hailing, sampaikan hal ini saat membeli polis — penggunaan komersial yang tidak diungkapkan berisiko membuat klaim ditolak karena dianggap tidak sesuai dengan risiko yang dinilai saat polis diterbitkan. Tanyakan ke tim SurePath soal opsi polis yang sesuai jika kendaraanmu dipakai untuk keperluan ini.',
    priceNote: 'Avanza umumnya masuk kategori harga pertanggungan menengah (Rp125-200 juta tergantung tahun dan tipe) — cek kalkulator untuk estimasi sesuai unit spesifikmu.',
    faqExtra: { q: 'Apakah Avanza untuk ojek online butuh polis khusus?', a: 'Sangat disarankan mengungkapkan penggunaan komersial saat membeli polis — beberapa perusahaan asuransi punya produk atau ketentuan khusus untuk kendaraan yang dipakai ride-hailing, dan penggunaan komersial yang tidak diungkapkan berisiko klaim ditolak.' },
  },
  {
    slug: 'honda-brio',
    brand: 'Honda',
    model: 'Brio',
    type: 'Hatchback',
    angle: 'modification',
    angleTitle: 'Sudah Dimodifikasi? Laporkan ke Asuransi',
    angleBody: 'Brio populer di kalangan penggemar modifikasi otomotif — dari sekadar body kit sampai upgrade mesin. Modifikasi yang mengubah nilai atau spesifikasi kendaraan dari kondisi standar pabrikan sebaiknya dilaporkan ke perusahaan asuransi. Modifikasi signifikan yang tidak diungkapkan bisa mempengaruhi proses klaim — baik soal penilaian nilai kendaraan maupun soal apakah kerusakan terkait komponen modifikasi tercakup polis.',
    priceNote: 'Brio umumnya masuk kategori harga pertanggungan lebih rendah dari Avanza (segmen hatchback/LCGC) — premi tahunan dalam nominal Rupiah relatif ringan, cek kalkulator untuk angka pastinya.',
    faqExtra: { q: 'Apakah body kit atau upgrade audio perlu dilaporkan ke asuransi?', a: 'Modifikasi yang signifikan mengubah nilai atau tampilan kendaraan sebaiknya dilaporkan — ini membantu memastikan nilai pertanggungan akurat dan menghindari kendala saat proses klaim terkait komponen modifikasi.' },
  },
  {
    slug: 'mitsubishi-xpander',
    brand: 'Mitsubishi',
    model: 'Xpander',
    type: 'MPV',
    angle: 'resale',
    angleTitle: 'Permintaan Pasar Bekas Tinggi — Pertimbangkan Perluasan Pencurian',
    angleBody: 'Xpander punya salah satu nilai jual kembali terbaik di segmennya, konsisten diminati pasar mobil bekas. Sisi baiknya, ini menguntungkan pemilik saat menjual. Sisi yang perlu diwaspadai: popularitas tinggi juga berarti daya tarik lebih besar bagi pencurian kendaraan dan penadahan suku cadang. Pertimbangkan All Risk dengan cakupan penuh untuk Xpander baru atau yang masih kredit, mengingat kombinasi nilai tinggi dan minat pasar yang besar.',
    priceNote: 'Xpander umumnya masuk kategori harga pertanggungan setara atau sedikit di atas Avanza — cek kalkulator untuk estimasi sesuai tahun dan tipe unitmu.',
    faqExtra: { q: 'Kenapa Xpander sering direkomendasikan pakai All Risk?', a: 'Karena kombinasi nilai jual kembali yang tinggi dan permintaan pasar yang besar membuat Xpander punya profil daya tarik pencurian yang layak diperhatikan — All Risk dengan cakupan kehilangan total memberi proteksi lebih menyeluruh.' },
  },
];

export const CAR_MODELS = MODEL_FACTS.map(f => ({ slug: f.slug, name: `${f.brand} ${f.model}`, type: f.type }));

export const CAR_MODEL_CONTENT: Record<string, SiloPageContent> = Object.fromEntries(
  MODEL_FACTS.map(f => [f.slug, generateModelContent(f)]),
);
