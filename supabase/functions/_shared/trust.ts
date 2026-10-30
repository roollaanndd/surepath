// ─────────────────────────────────────────────────────────────────────────────
// Tingkat kepercayaan akun — satu gerbang, bukan puluhan penjaga tersebar.
//
// MASALAH YANG DIPECAHKAN
//
// 11 Sep 2026 sebuah akun mendaftar dengan `@example.com` — domain yang secara
// definisi tidak bisa menerima email — dan langsung berstatus terkonfirmasi.
// Audit menunjukkan itu bukan kejadian tunggal: dari 35 akun, **30 dikonfirmasi
// dalam <2 detik** (artinya auto-confirm menyala, tidak ada yang benar-benar
// mengklik tautan) dan **6 memakai domain sampah**.
//
// Lebih buruk: pendaftar CUSTOMER langsung ditulis `verified: true`
// (`actions/users.ts`: `verified: role !== 'AGENT'`). Jadi kolom `verified`
// TIDAK bisa dipakai membedakan nasabah asli dari akun karangan — hanya agen
// yang benar-benar diverifikasi manusia.
//
// KENAPA PEMERIKSAAN DOMAIN, BUKAN SEKADAR `email_confirmed_at`
//
// Selama auto-confirm menyala, `email_confirmed_at` selalu terisi, jadi ia
// bernilai nol sebagai sinyal. Pemeriksaan domain bekerja HARI INI tanpa
// mengubah setelan apa pun di dashboard. Begitu auto-confirm dimatikan,
// `emailConfirmedAt` otomatis ikut bermakna — kode ini sudah siap menerimanya.
//
// KENAPA ADA MASA TENGGANG (GRANDFATHERING)
//
// Semua akun yang dibuat sebelum `ENFORCEMENT_FROM` dianggap tepercaya penuh.
// Tujuannya tegas: menyalakan gerbang ini TIDAK BOLEH mengubah pengalaman satu
// pun pengguna yang sudah ada. Yang berubah hanya untuk pendaftar baru.
// ─────────────────────────────────────────────────────────────────────────────

/** 0 = belum tepercaya · 1 = email wajar · 2 = terverifikasi penuh. */
export type TrustTier = 0 | 1 | 2;

export const TIER_UNTRUSTED: TrustTier = 0;
export const TIER_EMAIL_OK: TrustTier = 1;
export const TIER_VERIFIED: TrustTier = 2;

/**
 * Akun yang dibuat sebelum tanggal ini dibebaskan dari gerbang.
 * Tanggal rilis v2.5.6 — semua akun lama (35 per audit) lolos otomatis.
 */
export const ENFORCEMENT_FROM = Date.parse('2026-09-12T00:00:00Z');

/**
 * Domain yang tidak bisa menerima email sungguhan, atau memang dijual sebagai
 * sekali-pakai. Daftar sengaja pendek dan konservatif: memblokir domain sah
 * jauh lebih mahal daripada meloloskan satu yang palsu, karena yang palsu
 * masih tertahan gerbang tier untuk aksi berisiko.
 */
export const UNTRUSTED_EMAIL_DOMAINS = new Set([
  // Domain khusus dokumentasi (RFC 2606) — tidak akan pernah bisa menerima email
  'example.com', 'example.net', 'example.org', 'test.com', 'invalid', 'localhost',
  // Sekali-pakai yang umum dipakai di Indonesia
  'mailinator.com', 'tempmail.com', 'temp-mail.org', 'guerrillamail.com',
  '10minutemail.com', 'yopmail.com', 'throwawaymail.com', 'sharklasers.com',
  'getnada.com', 'maildrop.cc', 'trashmail.com', 'fakeinbox.com', 'dispostable.com',
]);

/** TLD yang dicadangkan RFC 2606 — tidak pernah bisa dirutekan. */
const RESERVED_TLD = /\.(test|example|invalid|localhost)$/i;

export function isUntrustedEmail(email: string): boolean {
  const at = String(email ?? '').toLowerCase().trim();
  const domain = at.slice(at.lastIndexOf('@') + 1);
  if (!domain || !at.includes('@')) return true;
  if (UNTRUSTED_EMAIL_DOMAINS.has(domain)) return true;
  if (RESERVED_TLD.test(domain)) return true;
  return false;
}

export interface TrustSubject {
  email: string;
  /** `email_confirmed_at` dari auth.users — sudah tersedia di sesi, tanpa query tambahan. */
  emailConfirmedAt?: string | null;
  spUser: {
    role?: string | null;
    verified?: boolean | null;
    identity_status?: string | null;
    created_at?: string | null;
  } | null;
}

export interface TrustVerdict {
  tier: TrustTier;
  /** Alasan dalam Bahasa Indonesia — dipakai untuk pesan ke pengguna dan log. */
  alasan: string[];
  /** Benar bila akun dibuat sebelum ENFORCEMENT_FROM. */
  grandfathered: boolean;
}

export function deriveTier(s: TrustSubject): TrustVerdict {
  const alasan: string[] = [];

  if (!s.spUser) {
    return { tier: TIER_UNTRUSTED, alasan: ['Profil pengguna belum terbentuk.'], grandfathered: false };
  }

  const dibuat = s.spUser.created_at ? Date.parse(s.spUser.created_at) : NaN;
  const grandfathered = Number.isFinite(dibuat) && dibuat < ENFORCEMENT_FROM;
  if (grandfathered) {
    return { tier: TIER_VERIFIED, alasan: ['Akun lama — dibebaskan dari gerbang verifikasi.'], grandfathered: true };
  }

  // Domain tidak sah mengunci di tier 0, MESKIPUN `verified` bernilai true.
  // Ini disengaja: pendaftar CUSTOMER selalu ditulis verified:true, jadi tanpa
  // aturan ini akun `@example.com` akan lolos penuh.
  if (isUntrustedEmail(s.email)) {
    return {
      tier: TIER_UNTRUSTED,
      alasan: ['Alamat email memakai domain yang tidak dapat menerima email.'],
      grandfathered: false,
    };
  }

  // Bermakna hanya setelah auto-confirm dimatikan di Supabase Auth. Selama
  // masih menyala, kolom ini selalu terisi sehingga tidak menyaring apa pun.
  if (s.emailConfirmedAt === null) {
    return { tier: TIER_UNTRUSTED, alasan: ['Email belum dikonfirmasi.'], grandfathered: false };
  }

  const identitasDisetujui = String(s.spUser.identity_status ?? '').toUpperCase() === 'APPROVED';
  const diverifikasiManusia = s.spUser.verified === true;
  const peran = String(s.spUser.role ?? '').toUpperCase();

  // Untuk AGENT, `verified` memang hasil persetujuan operator — itu sinyal kuat.
  // Untuk CUSTOMER ia disetel otomatis saat daftar, jadi butuh identitas.
  if (peran === 'AGENT' ? diverifikasiManusia : (identitasDisetujui || diverifikasiManusia)) {
    if (peran !== 'AGENT' && !identitasDisetujui) {
      alasan.push('Terverifikasi otomatis saat pendaftaran; identitas belum ditinjau.');
    }
    return { tier: TIER_VERIFIED, alasan, grandfathered: false };
  }

  alasan.push(peran === 'AGENT'
    ? 'Agen belum diverifikasi operator.'
    : 'Identitas belum diajukan atau belum disetujui.');
  return { tier: TIER_EMAIL_OK, alasan, grandfathered: false };
}

// ─── Kebijakan per-action ────────────────────────────────────────────────────
//
// SENGAJA PENDEK. Hanya aksi yang menciptakan catatan mengikat, menggerakkan
// uang, atau bisa disalahgunakan akun massal yang digerbang. Semua aksi baca,
// simulasi premi, penawaran draf, profil, notifikasi, dan Pathy TETAP terbuka —
// pengguna baru harus tetap bisa mencoba produk sebelum diverifikasi.
//
// Aksi admin tidak didaftarkan: keduanya sudah dijaga pemeriksaan peran di
// modulnya masing-masing, dan menggerbang ganda hanya menambah tempat gagal.

export const ACTION_MIN_TIER: Record<string, TrustTier> = {
  create_policy_order:     TIER_VERIFIED,  // menerbitkan order polis sungguhan
  submit_claim:            TIER_VERIFIED,  // mengajukan klaim
  agent_request_withdrawal: TIER_VERIFIED, // uang keluar
  redeem_coins:            TIER_VERIFIED,  // menukar imbalan jadi nilai
  apply_referral:          TIER_VERIFIED,  // jalur penyalahgunaan akun massal

  // `accept_agreement` DULU TIER_VERIFIED, dan itu membuat pendaftaran mitra
  // mati total (dilaporkan 30 Okt 2026). Urutannya melingkar:
  //
  //   AgentPortal memblokir seluruh aplikasi sampai perjanjian ditandatangani
  //     → accept_agreement menuntut TIER_VERIFIED
  //       → untuk AGENT, TIER_VERIFIED HANYA didapat dari `verified = true`
  //         → `verified` disetel operator SETELAH mitra mendaftar lengkap
  //
  // Jadi mitra baru membaca perjanjian, menekan setuju, dan menerima
  // "Agen belum diverifikasi operator" — tanpa jalan keluar, karena gerbang
  // perjanjian adalah layar penuh. Menandatangani perjanjian adalah SYARAT
  // verifikasi, bukan hak setelah verifikasi, jadi tier yang benar adalah
  // TIER_EMAIL_OK: domain sampah dan email yang belum dikonfirmasi tetap
  // tertahan (keduanya tier 0), sementara mitra sungguhan bisa masuk dan
  // menunggu persetujuan dengan fitur transaksi tetap terkunci di bawah.
  accept_agreement:        TIER_EMAIL_OK,  // tanda tangan elektronik — prasyarat verifikasi
};

export function requiredTier(action: string): TrustTier {
  return ACTION_MIN_TIER[action] ?? TIER_UNTRUSTED;
}

export interface TrustDecision {
  allowed: boolean;
  tier: TrustTier;
  required: TrustTier;
  /** Pesan siap tampil bila ditolak. */
  message?: string;
  /** Kode mesin supaya klien bisa menampilkan ajakan verifikasi yang tepat. */
  code?: 'VERIFICATION_REQUIRED';
}

/**
 * Keputusan gerbang. Peran admin selalu lolos — mereka sudah melewati
 * pemeriksaan peran yang lebih ketat di modul masing-masing.
 */
export function evaluateTrust(
  action: string,
  subject: TrustSubject,
  opts: { isAdmin?: boolean } = {},
): TrustDecision {
  const required = requiredTier(action);
  const { tier, alasan } = deriveTier(subject);

  if (required === TIER_UNTRUSTED || opts.isAdmin) {
    return { allowed: true, tier, required };
  }
  if (tier >= required) {
    return { allowed: true, tier, required };
  }

  const sebab = alasan[0] ?? 'Akun belum terverifikasi.';
  return {
    allowed: false,
    tier,
    required,
    code: 'VERIFICATION_REQUIRED',
    message: `${sebab} Selesaikan verifikasi akun dulu untuk memakai fitur ini. Fitur lain tetap bisa dipakai.`,
  };
}
