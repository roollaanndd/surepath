// Pembangkit kode identitas bersama (_shared/codes.ts).
//
// Kode mitra dipakai sebagai kode rujukan upline, dicocokkan ke
// `agent_code`/`referral_code` di `admin_create_mitra` dan `apply_referral`,
// jadi siapa pun yang bisa menduga kode mitra orang lain bisa menautkan
// dirinya ke upline itu. Dulu ketiga pembangkitnya memakai Math.random() di
// tiga tempat terpisah; CodeQL menandainya di PR #291. Tes ini memaku bentuk
// kodenya (supaya data lama tetap cocok) sekaligus menahan Math.random() agar
// tidak kembali masuk.
import { describe, it, expect, vi } from 'vitest';
import { newAgentCode, newCustomerCode, newTncRefNumber } from '../../supabase/functions/_shared/codes.ts';

describe('_shared/codes', () => {
  it('bentuknya tidak berubah dari yang sudah ada di basis data', () => {
    expect(newAgentCode()).toMatch(/^SP-AGT-\d{4}$/);
    expect(newCustomerCode()).toMatch(/^SP-\d{5}$/);
    expect(newTncRefNumber(2026)).toMatch(/^TC-2026-\d{6}$/);
  });

  it('kode mitra selalu 4 digit — 1000..9999, tidak pernah lebih pendek', () => {
    for (let i = 0; i < 200; i++) {
      const n = Number(newAgentCode().slice('SP-AGT-'.length));
      expect(n).toBeGreaterThanOrEqual(1000);
      expect(n).toBeLessThanOrEqual(9999);
    }
  });

  it('tidak satu pun memakai Math.random', () => {
    const spy = vi.spyOn(Math, 'random');
    newAgentCode(); newCustomerCode(); newTncRefNumber();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('tidak mengulang kode dalam jumlah kecil pemanggilan', () => {
    // Bukan jaminan keunikan — ruangnya cuma 9000, dan tabrakan tetap mungkin.
    // Yang diuji di sini: pembangkitnya benar-benar beragam, bukan konstan.
    const codes = new Set(Array.from({ length: 50 }, () => newAgentCode()));
    expect(codes.size).toBeGreaterThan(30);
  });
});
