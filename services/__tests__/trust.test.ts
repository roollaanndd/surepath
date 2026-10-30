// Uji gerbang kepercayaan akun (v2.5.6).
//
// Yang dikunci di sini, berurutan dari yang paling mahal kalau salah:
//
//  1. **Akun lama tidak boleh terdampak.** Menyalakan gerbang ini tidak boleh
//     mengubah pengalaman satu pun dari 35 pengguna yang sudah ada. Kalau uji
//     ini merah, kita baru saja mengunci nasabah sungguhan di luar aplikasinya.
//  2. **Domain sampah tidak lolos meski `verified: true`.** Pendaftar CUSTOMER
//     selalu ditulis verified:true, jadi tanpa aturan domain akun
//     `@example.com` akan punya akses penuh — persis kejadian 11 Sep 2026.
//  3. **Gerbang tetap sempit.** Aksi baca, simulasi, penawaran draf, dan Pathy
//     harus tetap terbuka untuk pengguna baru. Menggerbang terlalu banyak sama
//     buruknya dengan tidak menggerbang sama sekali.

import { describe, it, expect } from 'vitest';
import {
  deriveTier, evaluateTrust, requiredTier, isUntrustedEmail,
  ENFORCEMENT_FROM, ACTION_MIN_TIER,
  TIER_UNTRUSTED, TIER_EMAIL_OK, TIER_VERIFIED,
} from '../../supabase/functions/_shared/trust.ts';

const LAMA = '2026-06-01T00:00:00Z';                       // sebelum ENFORCEMENT_FROM
const BARU = new Date(ENFORCEMENT_FROM + 86_400_000).toISOString(); // sesudahnya

const subjek = (o: Partial<{
  email: string; emailConfirmedAt: string | null;
  role: string; verified: boolean | null; identity_status: string | null; created_at: string;
}> = {}) => ({
  email: o.email ?? 'budi@gmail.com',
  emailConfirmedAt: o.emailConfirmedAt === undefined ? '2026-09-01T00:00:00Z' : o.emailConfirmedAt,
  spUser: {
    role: o.role ?? 'CUSTOMER',
    verified: o.verified === undefined ? true : o.verified,
    identity_status: o.identity_status ?? 'UNSUBMITTED',
    created_at: o.created_at ?? BARU,
  },
});

// ─── 1. Akun lama tidak boleh terdampak ──────────────────────────────────────

describe('akun lama (grandfathering)', () => {
  it('akun sebelum tanggal penegakan selalu tier penuh', () => {
    const v = deriveTier(subjek({ created_at: LAMA, verified: false, identity_status: 'UNSUBMITTED' }));
    expect(v.tier).toBe(TIER_VERIFIED);
    expect(v.grandfathered).toBe(true);
  });

  it('akun lama lolos bahkan dengan domain sampah', () => {
    // Ada 6 akun domain mencurigakan di produksi. Mereka tidak boleh
    // tiba-tiba terkunci oleh rilis ini.
    const v = deriveTier(subjek({ created_at: LAMA, email: 'x@example.com' }));
    expect(v.tier).toBe(TIER_VERIFIED);
  });

  it('akun lama boleh membuat order', () => {
    const d = evaluateTrust('create_policy_order', subjek({ created_at: LAMA, verified: false }));
    expect(d.allowed).toBe(true);
  });
});

// ─── 2. Domain sampah tidak boleh lolos ──────────────────────────────────────

describe('domain email tidak tepercaya', () => {
  it('mengenali domain dokumentasi RFC 2606 dan sekali-pakai', () => {
    for (const e of ['a@example.com', 'a@test.com', 'a@mailinator.com', 'a@yopmail.com', 'a@apa.test']) {
      expect(isUntrustedEmail(e)).toBe(true);
    }
  });

  it('membiarkan domain wajar', () => {
    for (const e of ['budi@gmail.com', 'a@myinsurepath.com', 'a@perusahaan.co.id']) {
      expect(isUntrustedEmail(e)).toBe(false);
    }
  });

  it('menolak string tanpa @', () => {
    expect(isUntrustedEmail('bukan-email')).toBe(true);
    expect(isUntrustedEmail('')).toBe(true);
  });

  it('mengunci di tier 0 MESKIPUN verified:true — kasus 11 Sep 2026', () => {
    const v = deriveTier(subjek({ email: 'edotbotak@example.com', verified: true }));
    expect(v.tier).toBe(TIER_UNTRUSTED);
  });

  it('akun domain sampah tidak bisa membuat order maupun klaim', () => {
    for (const aksi of ['create_policy_order', 'submit_claim']) {
      const d = evaluateTrust(aksi, subjek({ email: 'x@example.com', verified: true }));
      expect(d.allowed).toBe(false);
      expect(d.code).toBe('VERIFICATION_REQUIRED');
      expect(d.message).toMatch(/verifikasi/i);
    }
  });
});

// ─── 3. Gerbang harus tetap sempit ───────────────────────────────────────────

describe('cakupan gerbang', () => {
  it('hanya enam aksi yang digerbang', () => {
    expect(Object.keys(ACTION_MIN_TIER).sort()).toEqual([
      'accept_agreement', 'agent_request_withdrawal', 'apply_referral',
      'create_policy_order', 'redeem_coins', 'submit_claim',
    ]);
  });

  it('aksi baca, simulasi dan Pathy tetap terbuka untuk akun tier 0', () => {
    const terbuka = [
      'get_my_orders', 'get_my_claims', 'get_my_profile', 'get_my_notifications',
      'save_quote', 'save_quotation', 'pathy_chat', 'list_my_clients',
      'get_tier_definitions', 'update_my_profile', 'ensure_profile',
    ];
    for (const aksi of terbuka) {
      expect(requiredTier(aksi)).toBe(TIER_UNTRUSTED);
      expect(evaluateTrust(aksi, subjek({ email: 'x@example.com' })).allowed).toBe(true);
    }
  });

  it('peran admin selalu lolos', () => {
    const d = evaluateTrust('create_policy_order',
      subjek({ email: 'x@example.com', role: 'MASTER_ADMIN' }), { isAdmin: true });
    expect(d.allowed).toBe(true);
  });
});

// ─── Penurunan tier ──────────────────────────────────────────────────────────

describe('penurunan tier', () => {
  it('tanpa profil sp_users → tier 0', () => {
    expect(deriveTier({ email: 'a@gmail.com', emailConfirmedAt: null, spUser: null }).tier).toBe(TIER_UNTRUSTED);
  });

  it('email belum dikonfirmasi → tier 0 (bermakna setelah auto-confirm dimatikan)', () => {
    expect(deriveTier(subjek({ emailConfirmedAt: null })).tier).toBe(TIER_UNTRUSTED);
  });

  it('CUSTOMER baru dengan identitas disetujui → tier penuh', () => {
    expect(deriveTier(subjek({ identity_status: 'APPROVED' })).tier).toBe(TIER_VERIFIED);
  });

  it('AGENT baru belum diverifikasi operator → tier 1, tidak bisa tarik dana', () => {
    const s = subjek({ role: 'AGENT', verified: false, identity_status: 'APPROVED' });
    expect(deriveTier(s).tier).toBe(TIER_EMAIL_OK);
    expect(evaluateTrust('agent_request_withdrawal', s).allowed).toBe(false);
  });

  // Regresi 30 Okt 2026 — kebuntuan pendaftaran mitra. `accept_agreement`
  // pernah menuntut TIER_VERIFIED, dan karena AGENT hanya mencapai tier itu
  // lewat `verified = true` dari operator, mitra baru terjebak di gerbang
  // perjanjian layar penuh: tanda tangan ditolak dengan "belum diverifikasi",
  // padahal tanda tangan itulah prasyarat verifikasinya.
  it('AGENT belum diverifikasi TETAP boleh menandatangani perjanjian', () => {
    const s = subjek({ role: 'AGENT', verified: false });
    expect(deriveTier(s).tier).toBe(TIER_EMAIL_OK);
    expect(evaluateTrust('accept_agreement', s).allowed).toBe(true);
  });

  it('AGENT belum diverifikasi tetap terkunci dari order, klaim dan tarik dana', () => {
    const s = subjek({ role: 'AGENT', verified: false });
    for (const aksi of ['create_policy_order', 'submit_claim', 'agent_request_withdrawal']) {
      expect(evaluateTrust(aksi, s).allowed).toBe(false);
    }
  });

  it('perjanjian tetap tertutup untuk domain sampah dan email belum dikonfirmasi', () => {
    // Gerbang perjanjian dilonggarkan ke tier 1, bukan dibuka: tier 0 tetap tertahan.
    expect(evaluateTrust('accept_agreement',
      subjek({ role: 'AGENT', verified: false, email: 'x@example.com' })).allowed).toBe(false);
    expect(evaluateTrust('accept_agreement',
      subjek({ role: 'AGENT', verified: false, emailConfirmedAt: null })).allowed).toBe(false);
  });

  it('AGENT yang sudah diverifikasi operator → tier penuh', () => {
    const s = subjek({ role: 'AGENT', verified: true });
    expect(deriveTier(s).tier).toBe(TIER_VERIFIED);
    expect(evaluateTrust('agent_request_withdrawal', s).allowed).toBe(true);
  });

  it('CUSTOMER verified-otomatis tetap lolos, tapi alasannya dicatat jujur', () => {
    const v = deriveTier(subjek({ verified: true, identity_status: 'UNSUBMITTED' }));
    expect(v.tier).toBe(TIER_VERIFIED);
    expect(v.alasan.join(' ')).toMatch(/identitas belum ditinjau/i);
  });
});
