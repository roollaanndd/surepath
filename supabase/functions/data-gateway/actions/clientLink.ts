// clientLink.ts — menautkan sebuah order ke akun nasabahnya.
//
// ─────────────────────────────────────────────────────────────────────────────
// ATURAN PENCOCOKAN — baca sebelum melebarkannya
// ─────────────────────────────────────────────────────────────────────────────
//
// `sp_policy_orders.client_id` menentukan siapa yang boleh MELIHAT dan
// MENGKLAIM sebuah polis: `get_my_orders`, `get_my_payments`, `cancel_my_order`
// dan pemeriksaan kepemilikan di `submit_claim` semuanya bersandar padanya.
// Satu pencocokan yang salah berarti polis seseorang terlihat — dan bisa
// diklaim — oleh orang lain. Jadi aturan ini dipilih untuk salah ke arah
// "tidak menautkan apa pun", bukan "menautkan yang keliru".
//
// Penautan HANYA lewat email, dan harus cocok persis:
//
//   1. Email di order harus berbentuk email yang wajar.
//   2. Harus ada TEPAT SATU baris `sp_users` yang cocok. Nol baris, atau dua
//      ke atas, tidak menautkan apa pun.
//   3. Email baris itu harus sama persis dengan email di order setelah
//      keduanya di-lowercase — bukan sekadar "cocok menurut pola".
//   4. Peran baris itu harus CUSTOMER.
//   5. Tidak pernah menautkan ke id yang dikecualikan pemanggil — dipakai
//      supaya agen yang mengisi emailnya sendiri di kolom nasabah tidak
//      menjadi "client" atas ordernya sendiri, yang akan mengaburkan batas
//      antara agent_id dan client_id.
//
// Langkah 3 bukan pengulangan langkah 2. `%` dan `_` adalah wildcard LIKE,
// dan email di order datang dari payload klien, jadi `client_email: "%@gmail.com"`
// akan dicocokkan oleh `.ilike()` dengan nasabah mana pun. Wildcard-nya
// di-escape sebelum dikirim, DAN hasilnya dibandingkan lagi sebagai string di
// sini — pola yang melebar kena langkah 2 (lebih dari satu baris), dan pola
// yang kebetulan mengenai tepat satu baris kena langkah 3.
//
// ─────────────────────────────────────────────────────────────────────────────
// NOMOR TELEPON SENGAJA TIDAK DIPAKAI
// ─────────────────────────────────────────────────────────────────────────────
//
// Mencocokkan nomor telepon akan menautkan lebih banyak order — dan itu
// justru alasannya ditolak. Di pasar ini satu nomor sering dipakai bergantian
// dalam satu keluarga, ditulis dalam tiga format yang sama-sama sah (`08xx`,
// `+628xx`, `628xx`), dan agen kadang mengisi nomornya sendiri di kolom
// nasabah supaya OTP masuk ke dirinya. Ketiganya membuat pencocokan nomor
// jadi tebakan, dan yang ditebak di sini adalah hak baca atas sebuah polis.
//
// Order yang emailnya tidak cocok tetap menyimpan `client_email` apa adanya,
// jadi ia masih bisa tertaut nanti — lihat `linkOrdersToNewCustomer()`.

/** Minimal PostgREST client surface these helpers need. */
interface Db {
  from(table: string): any;
}

/** Escapes the LIKE wildcards `%` and `_` so an email is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * True for a string shaped like a single email address. Deliberately strict:
 * no spaces, no commas, exactly one `@`, and a dot in the domain.
 */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(value);
}

/** Lowercased, trimmed email, or null when it isn't one. */
export function normaliseEmail(raw: unknown): string | null {
  const email = String(raw ?? '').trim().toLowerCase();
  if (!email || email.length > 200 || !looksLikeEmail(email)) return null;
  return email;
}

/**
 * Resolves the `sp_users.id` of the CUSTOMER an order belongs to, from the
 * email captured on that order. Returns null unless every rule above holds.
 *
 * @param excludeIds ids that must never be returned — pass the caller's own
 *   ids so an agent cannot become the client of their own order.
 */
export async function findClientIdByEmail(
  db: Db,
  rawEmail: unknown,
  excludeIds: string[] = [],
): Promise<string | null> {
  const email = normaliseEmail(rawEmail);
  if (!email) return null;

  // limit(2) — the rule needs to know "exactly one", not "the first one".
  const { data: rows, error } = await db.from('sp_users')
    .select('id, email, role')
    .ilike('email', escapeLike(email))
    .limit(2);
  if (error || !Array.isArray(rows) || rows.length !== 1) return null;

  const row = rows[0] as { id?: unknown; email?: unknown; role?: unknown };
  if (String(row.email ?? '').trim().toLowerCase() !== email) return null;
  if (String(row.role ?? '').toUpperCase() !== 'CUSTOMER') return null;

  const id = String(row.id ?? '');
  if (!id || excludeIds.includes(id)) return null;
  return id;
}

/**
 * Attaches orders that were sold to this email before the customer had an
 * account. Called from ensure_profile when a CUSTOMER profile is created.
 *
 * This is the one place that writes `client_id` onto pre-existing orders. It is
 * narrow on purpose: the email comes from the caller's own verified session —
 * never from a request parameter — and only rows that are still unclaimed
 * (`client_id is null`) and not the new user's own agent rows are touched.
 *
 * Returns how many orders were linked. Best-effort: a failure here must never
 * fail the signup it runs inside.
 */
export async function linkOrdersToNewCustomer(
  db: Db,
  userId: string,
  rawEmail: unknown,
): Promise<number> {
  const email = normaliseEmail(rawEmail);
  if (!email || !userId) return 0;

  try {
    const { data, error } = await db.from('sp_policy_orders')
      .update({ client_id: userId, updated_at: new Date().toISOString() })
      .is('client_id', null)
      .neq('agent_id', userId)
      .ilike('client_email', escapeLike(email))
      .select('id');
    if (error || !Array.isArray(data)) return 0;
    return data.length;
  } catch {
    return 0;
  }
}
