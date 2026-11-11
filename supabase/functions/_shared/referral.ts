// referral.ts — pencocokan kode referral/upline yang tahan duplikat.
//
// v2.8.9: komplain owner — kode referral yang ditampilkan app agen tidak
// sinkron dengan database, sehingga pendaftaran lewat kode agen tidak masuk
// ke downlinenya. Dua penyebab di sisi server:
//
//   1. Lookup upline memakai `.or(...).maybeSingle()` — ketika satu kode
//      mencocokkan LEBIH DARI SATU baris (agent_code 4 digit mudah berbenturan),
//      PostgREST mengembalikan error "multiple rows returned", maybeSingle()
//      menjadikannya null, dan referral gagal SENYAP tanpa jejak.
//   2. Pencocokan case-sensitive: kode yang dibagikan dengan kapitalisasi lain
//      tidak pernah cocok.
//
// Pola baru: ambil SEMUA kandidat (limit kecil), lalu pilih deterministik
// lewat pickUplineMatch. Modul ini dependency-free supaya bisa diimpor Deno
// dan vitest sekaligus.

export interface ReferralMatchRow {
  id: string;
  agent_code?: string | null;
  referral_code?: string | null;
}

/** Bersihkan kode dari klien: alphanumeric + tanda hubung saja, maks 32.
 *  Selain memotong noise, ini menutup injeksi filter PostgREST (.or string). */
export const sanitizeReferralCode = (raw: unknown): string =>
  String(raw ?? '').trim().replace(/[^A-Za-z0-9-]/g, '').slice(0, 32);

/** Pilih upline dari kandidat hasil query. Prioritas: referral_code persis →
 *  agent_code persis → baris pertama (server mengirim terurut created_at
 *  terlama). Pencocokan case-insensitive; kalau satu kode dimiliki beberapa
 *  akun (data lama sebelum unique index), yang terlama menang alih-alih
 *  seluruh lookup gagal senyap. */
export const pickUplineMatch = <T extends ReferralMatchRow>(
  rows: T[] | null | undefined,
  code: string,
): T | null => {
  const list = Array.isArray(rows) ? rows : [];
  if (!code) return null;
  const needle = code.toLowerCase();
  const matches = (col: 'referral_code' | 'agent_code') =>
    list.filter(r => String(r[col] ?? '').trim().toLowerCase() === needle);
  return matches('referral_code')[0] ?? matches('agent_code')[0] ?? null;
};

// ─── Kode user unik ──────────────────────────────────────────────────────────

import { newAgentCode, newCustomerCode } from './codes.ts';

/** Struktur minimum dari Supabase client yang dibutuhkan pengecekan keunikan —
 *  cukup longgar untuk client service_role di gateway tanpa mengimpor tipe
 *  Deno ke modul yang juga dipakai vitest. */
export interface UserCodeDb {
  from(table: string): any;
}

/** Kode user yang TERVERIFIKASI belum terpakai (v2.8.9). Benturan kode lama
 *  (ruang 'SP-AGT-XXXX' hanya 9.000) membuat lookup upline berbasis kode gagal
 *  senyap (multiple rows → maybeSingle() null) sehingga referral tidak masuk
 *  downline; migration v2.8.9 mendedupe data lama dan memasang unique index —
 *  generator ini menjaga sisi tulisan: format tetap persis seperti yang sudah
 *  ada di database (kode pembangkit kriptografis dari codes.ts), tapi setiap
 *  kode dicek dulu ke sp_users.agent_code, maksimal 8 percobaan. */
export const generateUniqueUserCode = async (
  db: UserCodeDb,
  role: 'AGENT' | 'CUSTOMER',
): Promise<string> => {
  let lastCode = '';
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = role === 'AGENT' ? newAgentCode() : newCustomerCode();
    lastCode = code;
    try {
      const { data, error } = await db.from('sp_users').select('id').eq('agent_code', code);
      if (error) return code; // lookup gagal → serahkan penegakan ke unique index
      if (!data || data.length === 0) return code;
    } catch {
      // Klien db tidak lengkap (uji unit) atau gagal jaringan → serahkan
      // penegakan keunikan ke unique index di DB.
      return code;
    }
  }
  return lastCode;
};
