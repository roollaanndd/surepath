// insurerPartners.ts — mitra asuransi yang NYATA, untuk permukaan publik.
//
// Kenapa berkas ini ada (audit situs publik 31 Okt 2026):
//   `/about` menayangkan empat angka yang tidak bisa dibuktikan — "12.400+
//   Nasabah Aktif", "98% Tingkat Kepuasan", "18+ Mitra Insurer", "200+ Kota
//   Jangkauan" — plus tiga testimoni bernama (Rafi A., Dewi S., Hendra K.).
//   Statistik yang sama pernah dinonaktifkan di beranda justru karena tidak
//   nyata, tapi tetap tayang di `/about`. roland memerintahkan semuanya
//   dihilangkan (31 Okt 2026).
//
//   Penggantinya adalah satu-satunya sinyal kepercayaan yang memang bisa
//   dibuktikan: nama perusahaan asuransi berizin OJK yang benar-benar jadi
//   mitra. Daftar di bawah diambil dari `sp_insurers` produksi pada
//   31 Okt 2026 — baris `is_active = true`, nama unik (barisnya ada sepuluh
//   untuk tujuh perusahaan karena Intra Asia, Tugu, dan Zurich masing-masing
//   punya dua kode). Asuransi Astra ada di tabel tapi `is_active = false`,
//   jadi tidak ditampilkan.
//
//   Untuk perantara produk keuangan, angka karangan bukan sekadar pemasaran
//   yang lemah — ia risiko pengawasan. Jangan tambahkan angka ke sini yang
//   tidak bisa ditunjuk sumbernya di database.

export interface InsurerPartner {
  /** Nama sebagaimana tercatat di `sp_insurers.name`. */
  name: string;
  /**
   * Berkas logo resmi di `public/insurers/`, atau `null` kalau belum ada.
   * `logo_url` di `sp_insurers` NULL untuk kesepuluh baris, jadi belum ada
   * satu pun logo di sistem. Kartu nama di bawah tampil apa adanya sampai
   * berkas resminya tersedia — JANGAN mengisi ini dengan logo hasil unduhan
   * sembarangan dari internet; logo perusahaan asuransi berizin harus aset
   * resmi dengan izin pemakaian.
   */
  logo: string | null;
}

/** Mitra aktif, urut abjad. Sumber: `sp_insurers` produksi, 31 Okt 2026. */
export const INSURER_PARTNERS: InsurerPartner[] = [
  { name: 'Asuransi Sinar Mas',          logo: null },
  { name: 'Intra Asia',                  logo: null },
  { name: 'Jasindo',                     logo: null },
  { name: 'Sompo Insurance Indonesia',   logo: null },
  { name: 'Tugu Insurance',              logo: null },
  { name: 'Zurich Asuransi Indonesia',   logo: null },
];
