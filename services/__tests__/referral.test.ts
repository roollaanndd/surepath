// Referral sinkron v2.8.9 — kode yang ditampilkan app agen sama dengan yang
// dicocokkan server: sanitasi, pencocokan tahan duplikat & case-insensitive,
// dan generator kode yang terverifikasi unik.
import { describe, it, expect } from 'vitest';
import {
  sanitizeReferralCode,
  pickUplineMatch,
  generateUniqueUserCode,
} from '../../supabase/functions/_shared/referral';
import { newAgentCode } from '../../supabase/functions/_shared/codes';

describe('sanitizeReferralCode', () => {
  it('membuang karakter di luar alphanumeric + hubung', () => {
    expect(sanitizeReferralCode(' SP-AGT-1234 ')).toBe('SP-AGT-1234');
    expect(sanitizeReferralCode('xyz,id.eq.<admin_uuid>')).toBe('xyzideqadminuuid');
    expect(sanitizeReferralCode(null)).toBe('');
    expect(sanitizeReferralCode(12345)).toBe('12345');
  });

  it('memotong pada 32 karakter', () => {
    expect(sanitizeReferralCode('a'.repeat(40)).length).toBe(32);
  });
});

describe('pickUplineMatch — lookup upline tidak pernah gagal senyap', () => {
  it('kode yang dicocokkan lebih dari satu baris TETAP menghasilkan upline', () => {
    // Dulu: .or().maybeSingle() melempar "multiple rows returned" → upline
    // null → referral tidak masuk downline tanpa jejak.
    const rows = [
      { id: 'lama', agent_code: 'SP-AGT-1234', referral_code: null },
      { id: 'baru', agent_code: 'SP-AGT-1234', referral_code: null },
    ];
    expect(pickUplineMatch(rows, 'SP-AGT-1234')?.id).toBe('lama');
  });

  it('referral_code lebih diprioritaskan daripada agent_code', () => {
    const rows = [
      { id: 'by-agent-code', agent_code: 'SP-AGT-9999', referral_code: null },
      { id: 'by-referral-code', agent_code: 'SP-AGT-8888', referral_code: 'SP-AGT-9999' },
    ];
    expect(pickUplineMatch(rows, 'SP-AGT-9999')?.id).toBe('by-referral-code');
  });

  it('pencocokan case-insensitive — kode dibagikan dengan kapitalisasi lain tetap cocok', () => {
    const rows = [{ id: 'u1', agent_code: 'sp-agt-1234', referral_code: null }];
    expect(pickUplineMatch(rows, 'SP-AGT-1234')?.id).toBe('u1');
    expect(pickUplineMatch(rows, 'sp-AGT-1234')?.id).toBe('u1');
  });

  it('kode tidak ada → null (dipakai penelepon untuk menolak)', () => {
    expect(pickUplineMatch([{ id: 'u1', agent_code: 'SP-AGT-1234' }], 'SP-AGT-0000')).toBeNull();
    expect(pickUplineMatch([], 'SP-AGT-1234')).toBeNull();
    expect(pickUplineMatch(null, 'SP-AGT-1234')).toBeNull();
    expect(pickUplineMatch([{ id: 'u1', agent_code: 'SP-AGT-1234' }], '')).toBeNull();
  });
});

describe('generateUniqueUserCode — benturan kode tidak mungkin lolos', () => {
  const fakeDb = (taken: string[]) => ({
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, value: string) =>
          Promise.resolve({ data: taken.includes(value) ? [{ id: 'x' }] : [], error: null }),
      }),
    }),
  });

  it('format tetap persis seperti yang sudah ada di basis data', async () => {
    const code = await generateUniqueUserCode(fakeDb([]), 'AGENT');
    expect(code).toMatch(/^SP-AGT-\d{4}$/);
    const cust = await generateUniqueUserCode(fakeDb([]), 'CUSTOMER');
    expect(cust).toMatch(/^SP-\d{5}$/);
  });

  it('mengulang saat kode sudah terpakai, berhenti di kode bebas', async () => {
    const taken: string[] = [];
    let first = await generateUniqueUserCode(fakeDb(taken), 'AGENT');
    taken.push(first);
    first = await generateUniqueUserCode(fakeDb(taken), 'AGENT');
    expect(taken).not.toContain(first);
  });

  it('nilai yang dikembalikan tidak pernah ada di daftar taken', async () => {
    const taken = [newAgentCode(), newAgentCode(), newAgentCode()];
    const code = await generateUniqueUserCode(fakeDb(taken), 'AGENT');
    expect(taken).not.toContain(code);
  });
});
