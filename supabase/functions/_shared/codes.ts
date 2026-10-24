// Pembangkit kode identitas — satu tempat, dan memakai crypto.
//
// Kode mitra (`SP-AGT-####`) dan kode pelanggan (`SP-#####`) dulu dibangkitkan
// dengan `Math.random()` di tiga tempat terpisah (`users.ts` ensure_profile,
// `admin.ts` admin_register_agent, dan modul mitraAccounts.ts yang baru).
//
// Itu bukan sekadar label tampilan: kode mitra dipakai sebagai KODE RUJUKAN
// upline, dicocokkan ke `agent_code`/`referral_code` di `admin_create_mitra`
// dan `apply_referral`. Siapa pun yang bisa menduga kode mitra orang lain bisa
// menautkan dirinya ke upline itu. `Math.random()` tidak memberi jaminan apa
// pun soal keterdugaan — di V8 ia xorshift128+ dengan state yang bisa
// direkonstruksi dari beberapa keluaran.
//
// CodeQL (js/insecure-randomness) menandainya di PR #291, dan menandainya
// sebagai sumber yang mengalir ke pembangkit kata sandi di berkas yang sama.
// Daripada menebak-nebak jalur alirannya, sumber tidak amannya dihapus dari
// seluruh pohon dispatch ini — yang benar atas dasarnya sendiri, terlepas dari
// apa yang dilihat CodeQL.
//
// `send-otp/index.ts` sudah memakai crypto.getRandomValues untuk alasan yang
// sama; ini menyusulkan sisanya.

/** Bilangan bulat acak kriptografis di [0, max). */
function randomInt(max: number): number {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  // Modulo bias di sini tidak berarti: max (9000 / 99999 / 1e6) jauh lebih
  // kecil dari 2^32, jadi sebarannya praktis rata.
  return n[0] % max;
}

/** `SP-AGT-1234` — kode mitra, dipakai juga sebagai kode rujukan upline. */
export function newAgentCode(): string {
  return 'SP-AGT-' + String(1000 + randomInt(9000));
}

/** `SP-01234` — kode pelanggan. */
export function newCustomerCode(): string {
  return 'SP-' + String(randomInt(100000)).padStart(5, '0');
}

/** `TC-2026-012345` — nomor rujukan penerimaan syarat & ketentuan. */
export function newTncRefNumber(year = new Date().getFullYear()): string {
  return `TC-${year}-${String(randomInt(1000000)).padStart(6, '0')}`;
}
