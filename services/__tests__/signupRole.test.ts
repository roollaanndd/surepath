// Signup account-type tests.
//
// The reported bug: every new user landed in the customer app. The cause was
// that a profile could be created with no account type stated — the client
// called ensure_profile with no role, and the server quietly defaulted to
// CUSTOMER, so the Nasabah/Mitra picker never got to run. These tests pin the
// contract that makes that impossible: a profile is only ever created with an
// explicitly chosen role.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleUsersAction } from '../../supabase/functions/data-gateway/actions/users.ts';

type Row = Record<string, unknown>;

/** Minimal PostgREST-shaped stub covering the calls ensure_profile makes. */
function makeDb(opts: { existingByEmail?: Row | null; upline?: Row | null } = {}) {
  const inserted: Array<{ table: string; row: Row }> = [];
  const thenable = { then: (res: () => void) => { res(); return thenable; } };

  const db = {
    inserted,
    from(table: string) {
      return {
        select: () => ({
          ilike: () => ({ maybeSingle: async () => ({ data: opts.existingByEmail ?? null }) }),
          or: () => ({ neq: () => ({ maybeSingle: async () => ({ data: opts.upline ?? null }) }) }),
        }),
        insert(row: Row) {
          inserted.push({ table, row });
          return {
            select: () => ({ single: async () => ({ data: { id: 'new-id', ...row }, error: null }) }),
            then: thenable.then,
          };
        },
        update: (row: Row) => ({
          eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: { ...(opts.existingByEmail ?? {}), ...row }, error: null }) }) }),
        }),
      };
    },
  };
  return db;
}

function makeCtx(over: { spUser?: Row | null; params?: Row; meta?: Row; email?: string } = {}) {
  const db = makeDb();
  return {
    ctx: {
      db,
      params: over.params ?? {},
      caller: {
        authId: '11111111-1111-4111-8111-111111111111',
        email: over.email ?? 'baru@gmail.com',
        spUser: over.spUser ?? null,
        role: (over.spUser?.role as string) ?? null,
        isAdmin: false,
        isFinanceAdmin: false,
        userMetadata: over.meta ?? {},
        ownerId: '11111111-1111-4111-8111-111111111111',
        ownerIds: ['11111111-1111-4111-8111-111111111111'],
      },
      sendTelegram: vi.fn(),
      logActivity: vi.fn(),
      checkRateLimit: vi.fn(async () => true),
      RESEND_KEY: '',
    } as any,
    db,
  };
}

describe('ensure_profile — account type must be chosen, never assumed', () => {
  let warn: any;
  beforeEach(() => { warn = vi.spyOn(console, 'warn').mockImplementation(() => {}); });

  it('refuses to create a profile when no role is supplied anywhere', async () => {
    const { ctx, db } = makeCtx();
    const res = await handleUsersAction('ensure_profile', ctx);
    expect(res?.status).toBe(409);
    expect((res?.body as any).code).toBe('ROLE_REQUIRED');
    // The critical assertion: nothing was written. Previously this inserted a
    // CUSTOMER row and the user was routed to /custapp without ever choosing.
    expect(db.inserted).toHaveLength(0);
  });

  it('creates an AGENT profile when the picker says AGENT', async () => {
    const { ctx, db } = makeCtx({ params: { role: 'AGENT', name: 'Budi' } });
    const res = await handleUsersAction('ensure_profile', ctx);
    expect(res?.status).toBe(200);
    expect((res?.body as any).data.role).toBe('AGENT');
    const row = db.inserted.find(i => i.table === 'sp_users')!.row;
    expect(row.role).toBe('AGENT');
    // Partners are not auto-verified — they need admin review.
    expect(row.verified).toBe(false);
    expect(String(row.agent_code)).toMatch(/^SP-AGT-/);
  });

  it('creates a CUSTOMER profile when the picker says CUSTOMER', async () => {
    const { ctx, db } = makeCtx({ params: { role: 'CUSTOMER', name: 'Siti' } });
    const res = await handleUsersAction('ensure_profile', ctx);
    expect((res?.body as any).data.role).toBe('CUSTOMER');
    expect(db.inserted.find(i => i.table === 'sp_users')!.row.verified).toBe(true);
  });

  it('falls back to the signup metadata role, so the email-confirmation round trip keeps the choice', async () => {
    const { ctx, db } = makeCtx({ meta: { role: 'AGENT', name: 'Dewi' } });
    const res = await handleUsersAction('ensure_profile', ctx);
    expect(res?.status).toBe(200);
    expect(db.inserted.find(i => i.table === 'sp_users')!.row.role).toBe('AGENT');
  });

  it('never downgrades an existing profile to the role the client asked for', async () => {
    const existing = { id: 'agent-1', role: 'AGENT', email: 'baru@gmail.com', name: 'Budi' };
    const { ctx, db } = makeCtx({ spUser: existing, params: { role: 'CUSTOMER' } });
    const res = await handleUsersAction('ensure_profile', ctx);
    expect((res?.body as any).data.role).toBe('AGENT');
    expect((res?.body as any).existed).toBe(true);
    expect(db.inserted).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
  });

  it('links the upline when a referral code comes along', async () => {
    const db = makeDb({ upline: { id: 'upline-1' } });
    const ctx: any = {
      db,
      params: { role: 'CUSTOMER', name: 'Rina', referral_code: 'SP-AGT-1234' },
      caller: {
        authId: '22222222-2222-4222-8222-222222222222',
        email: 'rina@gmail.com',
        spUser: null, role: null, isAdmin: false, isFinanceAdmin: false,
        userMetadata: {},
        ownerId: '22222222-2222-4222-8222-222222222222',
        ownerIds: ['22222222-2222-4222-8222-222222222222'],
      },
      sendTelegram: vi.fn(), logActivity: vi.fn(),
      checkRateLimit: vi.fn(async () => true), RESEND_KEY: '',
    };
    await handleUsersAction('ensure_profile', ctx);
    expect(db.inserted.find(i => i.table === 'sp_users')!.row.upline_id).toBe('upline-1');
  });
});

describe('get_my_profile — 404 is what tells the client to show the picker', () => {
  it('answers 404 when the account has no profile row', async () => {
    const { ctx } = makeCtx();
    const res = await handleUsersAction('get_my_profile', ctx);
    expect(res?.status).toBe(404);
  });

  it('answers 200 with the profile when one exists', async () => {
    const { ctx } = makeCtx({ spUser: { id: 'u1', role: 'AGENT' } });
    const res = await handleUsersAction('get_my_profile', ctx);
    expect(res?.status).toBe(200);
    expect((res?.body as any).data.role).toBe('AGENT');
  });

  // ── Domain email tidak tepercaya (v2.5.7) ─────────────────────────────────
  //
  // Uji kedua ada karena versi PERTAMA penjaga ini salah: ia menolak sebelum
  // memeriksa profil yang sudah ada. ensure_profile dipanggil di setiap login,
  // jadi itu akan mengunci enam akun berdomain mencurigakan yang sudah ada di
  // produksi. Suite inilah yang menangkapnya — jangan dilonggarkan.

  it('menolak profil BARU dengan domain yang tidak bisa menerima email', async () => {
    const { ctx, db } = makeCtx({ params: { role: 'CUSTOMER' }, email: 'palsu@example.com' });
    const res = await handleUsersAction('ensure_profile', ctx);
    expect(res?.status).toBe(403);
    expect((res?.body as any).code).toBe('UNTRUSTED_EMAIL_DOMAIN');
    expect(db.inserted).toHaveLength(0);
  });

  it('TIDAK mengunci akun lama yang sudah terlanjur berdomain mencurigakan', async () => {
    const existing = { id: 'lama-1', role: 'CUSTOMER', name: 'Lama' };
    const { ctx } = makeCtx({ spUser: existing, email: 'lama@example.com' });
    const res = await handleUsersAction('ensure_profile', ctx);
    expect(res?.status).toBe(200);
    expect((res?.body as any).existed).toBe(true);
  });
});
