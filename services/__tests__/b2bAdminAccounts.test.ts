// Akun Klien B2B buatan admin (v2.7.56).
//
// B2BLogin mengklaim "B2B accounts are provisioned by SurePath admin", tapi
// sampai v2.7.56 tidak ada satu pun jalur yang benar-benar membuat akun itu:
// admin_create_mitra memaksa role AGENT, dan b2bBulk hanya menulis data armada.
// Guard di sini mengunci kontrak cabang B2B di mitraAccounts.ts:
//
//   1. Profil B2B adalah cermin createB2BClientProfile (services/users.ts):
//      role B2B_CLIENT, perusahaan di address, trust_score 85, verified false —
//      dan TANPA agent_code/komisi/target/upline milik agen.
//   2. Kata sandi sementara tetap eksklusif MASTER_ADMIN, dan tetap tidak
//      pernah ditulis ke basis data — aturan audit 2026-10-23 tidak berubah
//      hanya karena tipe akunnya baru.
//   3. Undangan & reset mengarah ke portal yang benar: /b2bapps untuk B2B,
//      /agapps untuk agen.
//   4. Aksi kata sandi/reset yang dulu AGENT-only kini mencakup B2B_CLIENT,
//      tapi TETAP menolak role lain — bukan gerbang yang dilonggarkan sebisanya.
import { describe, it, expect, vi } from 'vitest';
import { handleMitraAccountsAction } from '../../supabase/functions/data-gateway/actions/mitraAccounts.ts';

type Row = Record<string, unknown>;

function makeDb(opts: { byEmail?: Row | null; byId?: Row | null; upline?: Row | null } = {}) {
  const inserted: Array<{ table: string; row: Row }> = [];
  const authCalls: Array<{ fn: string; arg: unknown }> = [];
  const thenable = { then: (res: () => void) => { res(); return thenable; } };

  return {
    inserted,
    authCalls,
    from(table: string) {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: table === 'sp_users' ? (opts.byEmail ?? opts.byId ?? null) : null,
              error: null,
            }),
          }),
          or: () => ({ maybeSingle: async () => ({ data: opts.upline ?? null }) }),
        }),
        insert(row: Row) {
          inserted.push({ table, row });
          return {
            select: () => ({ single: async () => ({ data: { id: 'mitra-1', ...row }, error: null }) }),
            then: thenable.then,
          };
        },
      };
    },
    auth: {
      admin: {
        createUser: async (arg: unknown) => {
          authCalls.push({ fn: 'createUser', arg });
          return { data: { user: { id: 'auth-1' } }, error: null };
        },
        inviteUserByEmail: async (email: string, arg: unknown) => {
          authCalls.push({ fn: 'inviteUserByEmail', arg: { email, ...(arg as Row) } });
          return { data: { user: { id: 'auth-1' } }, error: null };
        },
        generateLink: async (arg: unknown) => {
          authCalls.push({ fn: 'generateLink', arg });
          return {
            data: {
              user: { id: 'auth-1', user_metadata: { name: 'Budi' } },
              properties: { action_link: 'https://auth.example/recover#token' },
            },
            error: null,
          };
        },
        updateUserById: async (id: string, arg: unknown) => {
          authCalls.push({ fn: 'updateUserById', arg: { id, ...(arg as Row) } });
          return { data: { user: { id } }, error: null };
        },
        deleteUser: async (id: string) => {
          authCalls.push({ fn: 'deleteUser', arg: id });
          return { data: null, error: null };
        },
      },
    },
  };
}

function makeCtx(role: string, params: Row = {}, dbOpts: Parameters<typeof makeDb>[0] = {}) {
  const db = makeDb(dbOpts);
  return {
    db,
    ctx: {
      db,
      params,
      caller: {
        authId: 'caller-auth',
        email: `${role.toLowerCase()}@surepath.id`,
        spUser: { id: 'caller-1', role },
        role,
        isAdmin: true,
        isFinanceAdmin: true,
        userMetadata: null,
        ownerId: 'caller-1',
        ownerIds: ['caller-1'],
      },
      sendTelegram: vi.fn(),
      logActivity: vi.fn(),
      checkRateLimit: vi.fn(async () => true),
      RESEND_KEY: '',
    } as never,
  };
}

const B2B_INPUT = {
  name: 'Rina',
  email: 'rina@mutiara.id',
  phone: '0812',
  role: 'B2B_CLIENT',
  company_name: 'Mutiara Finance',
};

describe('admin_create_mitra — tipe akun B2B_CLIENT', () => {
  it('membuat profil cermin createB2BClientProfile: tanpa atribut agen', async () => {
    const { db, ctx } = makeCtx('ADMIN', B2B_INPUT);
    const res = await handleMitraAccountsAction('admin_create_mitra', ctx);
    expect(res?.status).toBe(200);

    const row = db.inserted.find(i => i.table === 'sp_users')?.row;
    expect(row?.role).toBe('B2B_CLIENT');
    // Nama perusahaan disimpan di address — kolom yang sama dipakai
    // createB2BClientProfile pada pendaftaran mandiri.
    expect(row?.address).toBe('Mutiara Finance');
    expect(row?.trust_score).toBe(85);
    expect(row?.verified).toBe(false);
    // Atribut milik agen TIDAK boleh muncul di profil B2B.
    expect(row).not.toHaveProperty('agent_code');
    expect(row).not.toHaveProperty('commission_rate');
    expect(row).not.toHaveProperty('monthly_target');
    expect(row).not.toHaveProperty('upline_id');
  });

  it('mengarahkan undangan ke /b2bapps dan menandai metadata role B2B_CLIENT', async () => {
    const { db, ctx } = makeCtx('ADMIN', B2B_INPUT);
    await handleMitraAccountsAction('admin_create_mitra', ctx);
    const invite = db.authCalls.find(c => c.fn === 'inviteUserByEmail')?.arg as Row;
    expect(invite.redirectTo).toBe('https://myinsurepath.com/b2bapps');
    expect((invite.data as Row).role).toBe('B2B_CLIENT');
  });

  it('mode temp oleh MASTER_ADMIN: metadata auth B2B + wajib ganti sandi', async () => {
    const { db, ctx } = makeCtx('MASTER_ADMIN', { ...B2B_INPUT, mode: 'temp' });
    const res = await handleMitraAccountsAction('admin_create_mitra', ctx);
    expect(res?.status).toBe(200);

    const created = db.authCalls.find(c => c.fn === 'createUser')?.arg as Row;
    expect((created.user_metadata as Row).role).toBe('B2B_CLIENT');
    expect((created.user_metadata as Row).must_change_password).toBe(true);

    const password = (res?.body as Row).temp_password as string;
    expect(password).toMatch(/^[A-Za-z2-9]{4}-[A-Za-z2-9]{5}-[A-Za-z2-9]{5}$/);
    for (const { row } of db.inserted) {
      expect(JSON.stringify(row)).not.toContain(password);
    }
  });

  it('notifikasi admin memakai judul dan tipe B2B', async () => {
    const { db, ctx } = makeCtx('ADMIN', B2B_INPUT);
    await handleMitraAccountsAction('admin_create_mitra', ctx);
    const notif = db.inserted.find(i => i.table === 'sp_admin_notifications')?.row;
    expect(notif?.title).toBe('Klien B2B Ditambahkan Manual');
    expect(notif?.type).toBe('NEW_B2B_CLIENT');
    expect((notif?.metadata as Row).role).toBe('B2B_CLIENT');
  });

  it('kata sandi sementara tetap ditolak untuk ADMIN (bukan hanya soal tipe akun)', async () => {
    const { db, ctx } = makeCtx('ADMIN', { ...B2B_INPUT, mode: 'temp' });
    const res = await handleMitraAccountsAction('admin_create_mitra', ctx);
    expect(res?.status).toBe(403);
    expect(db.authCalls).toHaveLength(0);
  });

  it('role tak dikenal tetap jatuh ke AGENT — backward-compatible', async () => {
    const { db, ctx } = makeCtx('MASTER_ADMIN',
      { name: 'Budi', email: 'budi@email.com', phone: '0811', role: 'CUSTOMER' });
    await handleMitraAccountsAction('admin_create_mitra', ctx);
    const row = db.inserted.find(i => i.table === 'sp_users')?.row;
    expect(row?.role).toBe('AGENT');
    expect(row?.agent_code).toMatch(/^SP-AGT-\d{4}$/);
  });

  it('B2B mengabaikan upline_code alih-alih gagal mencarinya', async () => {
    const { db, ctx } = makeCtx('ADMIN', { ...B2B_INPUT, upline_code: 'SP-AGT-9999' });
    const res = await handleMitraAccountsAction('admin_create_mitra', ctx);
    expect(res?.status).toBe(200);
    expect(db.inserted.find(i => i.table === 'sp_users')?.row).not.toHaveProperty('upline_id');
  });

  it('B2B tanpa company_name disimpan dengan address null', async () => {
    const { db, ctx } = makeCtx('ADMIN',
      { name: 'Rina', email: 'rina@mutiara.id', phone: '0812', role: 'B2B_CLIENT' });
    const res = await handleMitraAccountsAction('admin_create_mitra', ctx);
    expect(res?.status).toBe(200);
    expect(db.inserted.find(i => i.table === 'sp_users')?.row.address).toBeNull();
  });
});

describe('kata sandi buatan admin (bukan hasil generator)', () => {
  const CUSTOM = 'Mutiara2026!Tetap';

  it('admin_create_mitra memakai kata sandi yang admin ketik apa adanya', async () => {
    const { db, ctx } = makeCtx('MASTER_ADMIN', { ...B2B_INPUT, mode: 'temp', password: CUSTOM });
    const res = await handleMitraAccountsAction('admin_create_mitra', ctx);
    expect(res?.status).toBe(200);

    const created = db.authCalls.find(c => c.fn === 'createUser')?.arg as Row;
    expect(created.password).toBe(CUSTOM);
    expect((created.user_metadata as Row).must_change_password).toBe(true);
    // Respons mengembalikan sandi yang sama — admin tahu persis apa yang
    // disetel; yang penting TIDAK ada satu pun baris DB yang memuatnya.
    expect((res?.body as Row).temp_password).toBe(CUSTOM);
    for (const { row } of db.inserted) {
      expect(JSON.stringify(row)).not.toContain(CUSTOM);
    }
  });

  it('menolak kata sandi kustom yang terlalu pendek', async () => {
    const { db, ctx } = makeCtx('MASTER_ADMIN', { ...B2B_INPUT, mode: 'temp', password: 'pendek' });
    const res = await handleMitraAccountsAction('admin_create_mitra', ctx);
    expect(res?.status).toBe(400);
    expect(db.authCalls).toHaveLength(0);
  });

  it('menolak kata sandi kustom di atas 72 karakter (batas bcrypt)', async () => {
    const { db, ctx } = makeCtx('MASTER_ADMIN',
      { ...B2B_INPUT, mode: 'temp', password: 'a'.repeat(73) });
    const res = await handleMitraAccountsAction('admin_create_mitra', ctx);
    expect(res?.status).toBe(400);
    expect(db.authCalls).toHaveLength(0);
  });

  it('gerbangnya tetap MASTER_ADMIN — ADMIN tidak bisa menyetel sandi kustom', async () => {
    const { db, ctx } = makeCtx('ADMIN', { ...B2B_INPUT, mode: 'temp', password: CUSTOM });
    const res = await handleMitraAccountsAction('admin_create_mitra', ctx);
    expect(res?.status).toBe(403);
    expect(db.authCalls).toHaveLength(0);
  });

  it('admin_set_mitra_temp_password juga menerima sandi kustom', async () => {
    const { db, ctx } = makeCtx('MASTER_ADMIN', { user_id: 'mitra-1', password: CUSTOM },
      { byId: { id: 'mitra-1', email: 'rina@mutiara.id', name: 'Rina', role: 'B2B_CLIENT' } });
    const res = await handleMitraAccountsAction('admin_set_mitra_temp_password', ctx);
    expect(res?.status).toBe(200);

    const upd = db.authCalls.find(c => c.fn === 'updateUserById')?.arg as Row;
    expect(upd.password).toBe(CUSTOM);
    expect((res?.body as Row).temp_password).toBe(CUSTOM);
    for (const { row } of db.inserted) {
      expect(JSON.stringify(row)).not.toContain(CUSTOM);
    }
  });
});

describe('aksi kata sandi mencakup B2B_CLIENT', () => {
  it('admin_set_mitra_temp_password menerima target B2B_CLIENT', async () => {
    const { db, ctx } = makeCtx('MASTER_ADMIN', { user_id: 'mitra-1' },
      { byId: { id: 'mitra-1', email: 'rina@mutiara.id', name: 'Rina', role: 'B2B_CLIENT' } });
    const res = await handleMitraAccountsAction('admin_set_mitra_temp_password', ctx);
    expect(res?.status).toBe(200);
    expect(db.authCalls.find(c => c.fn === 'updateUserById')).toBeTruthy();
  });

  it('admin_set_mitra_temp_password tetap menolak role lain', async () => {
    const { ctx } = makeCtx('MASTER_ADMIN', { user_id: 'x' },
      { byId: { id: 'x', email: 'c@email.com', name: 'C', role: 'CUSTOMER' } });
    const res = await handleMitraAccountsAction('admin_set_mitra_temp_password', ctx);
    expect(res?.status).toBe(400);
    expect((res?.body as Row).code).toBe('NOT_AN_AGENT');
  });

  it('admin_send_mitra_reset membuka gerbang untuk B2B_CLIENT', async () => {
    const { ctx } = makeCtx('ADMIN', { user_id: 'mitra-1' },
      { byId: { id: 'mitra-1', email: 'rina@mutiara.id', name: 'Rina', role: 'B2B_CLIENT' } });
    const res = await handleMitraAccountsAction('admin_send_mitra_reset', ctx);
    // Lingkungan uji tidak punya SUPABASE_URL, jadi alurnya berhenti di
    // pemeriksaan konfigurasi — yang penting BUKAN penolakan NOT_AN_AGENT.
    expect((res?.body as Row).code).not.toBe('NOT_AN_AGENT');
    expect(res?.status).not.toBe(400);
  });
});
