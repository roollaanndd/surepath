// activity.ts — helper jejak aktivitas (sp_activity_log).
//
// Dipakai dispatcher data-gateway (Deno) sekaligus vitest (Node) — jangan
// menaruh dependency khusus runtime di sini.
//
// Dua keputusan v2.8.9 (komplain owner: log admin hanya menampilkan
// "Get My Notifications" tanpa detail apa yang dikerjakan):
//
// 1. Aksi polling yang dinyalakan timer di setiap portal terbuka (notifikasi
//    tiap 30–60 detik) tidak bernilai audit apa pun — ratusan baris per jam
//    per perangkat menenggelamkan aksi yang bermakna, termasuk kolom "Paling
//    Sering" di ringkasan. Mereka tidak ditulis sama sekali.
// 2. Baris audit kini membawa kolom `detail`: ringkasan apa yang dikerjakan,
//    dibangun dari whitelist kunci parameter yang aman. Stance privasi tidak
//    berubah — nilai NIK, foto, kata sandi, dan token TETAP tidak pernah
//    disalin; yang disalin hanya pengenal dan status aksi (id, email target,
//    nomor order, status, jumlah).

/** Aksi heartbeat yang tidak perlu diaudit. */
export const ACTIVITY_NOISE_ACTIONS: ReadonlySet<string> = new Set([
  'get_my_notifications',
]);

export const isNoiseAction = (action: string): boolean =>
  ACTIVITY_NOISE_ACTIONS.has(action);

/** Kunci yang nilainya TIDAK PERNAH disalin ke jejak, apa pun labelnya. */
const DENY_VALUE_PATTERN =
  /pass|sandi|secret|token|otp|ktp|nik|foto|photo|image|base64|signature|cvv|rekening|birth|dob|ssn/i;

/** Kunci yang nilainya aman dan menjawab "apa yang dikerjakan". Urutan di
 *  sini juga urutan tampil di kolom Detail. */
const SAFE_VALUE_KEYS: readonly string[] = [
  'order_number', 'policy_number', 'order_id', 'claim_id', 'policy_id',
  'batch_id', 'payment_id', 'withdrawal_id', 'notification_id',
  'user_id', 'agent_id', 'upline_id', 'insurer_id', 'product_id',
  'email', 'name', 'role', 'target_role', 'status', 'tier', 'tier_code',
  'agent_code', 'referral_code', 'upline_code', 'plate', 'region_code',
  'category', 'vehicle_type', 'rate_version', 'insurer', 'app_id',
  'amount', 'premium', 'total_premium', 'commission_rate', 'monthly_target',
  'verified', 'reason', 'title', 'type', 'allowed_apps',
];

const MAX_PAIRS = 6;
const MAX_VALUE_LEN = 64;
const MAX_DETAIL_LEN = 240;

const valueToText = (v: unknown): string | null => {
  if (v == null) return null;
  if (typeof v === 'string') {
    const s = v.trim();
    return s ? s.slice(0, MAX_VALUE_LEN) : null;
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    // Array pendek dari nilai sederhana (mis. allowed_apps) ikut; array besar
    // (payload, foto) tidak.
    if (v.length === 0 || v.length > 8) return null;
    const parts = v.map(x => (typeof x === 'string' || typeof x === 'number' ? String(x) : null))
      .filter((s): s is string => !!s);
    return parts.length ? parts.join(',').slice(0, MAX_VALUE_LEN) : null;
  }
  return null; // object → jangan disalin
};

/** Ringkasan aksi dari whitelist kunci aman, atau null kalau tidak ada yang
 *  layak. Nilai kunci lain diabaikan sepenuhnya. */
export const buildActivityDetail = (
  params: Record<string, unknown> | null | undefined,
): string | null => {
  if (!params || typeof params !== 'object') return null;
  const pairs: string[] = [];
  for (const key of SAFE_VALUE_KEYS) {
    if (pairs.length >= MAX_PAIRS) break;
    if (DENY_VALUE_PATTERN.test(key)) continue;
    const text = valueToText(params[key]);
    if (text) pairs.push(`${key}=${text}`);
  }
  if (!pairs.length) return null;
  const detail = pairs.join('; ');
  return detail.length > MAX_DETAIL_LEN ? detail.slice(0, MAX_DETAIL_LEN) : detail;
};

/** Pengenal target aksi — diperluas dari 5 kunci lama (yang membuat kolom
 *  Target mayoritas baris kosong) menjadi seluruh kunci pengenal umum. */
const TARGET_KEYS: readonly string[] = [
  'id', 'order_id', 'claim_id', 'policy_id', 'batch_id', 'user_id',
  'agent_id', 'payment_id', 'withdrawal_id', 'notification_id', 'insurer_id',
];

export const resolveActivityTarget = (
  params: Record<string, unknown> | null | undefined,
): string | null => {
  if (!params || typeof params !== 'object') return null;
  for (const key of TARGET_KEYS) {
    const v = params[key];
    if (v != null && (typeof v === 'string' || typeof v === 'number')) {
      const s = String(v).trim();
      if (s) return s.slice(0, 100);
    }
  }
  return null;
};
