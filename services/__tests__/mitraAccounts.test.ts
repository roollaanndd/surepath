// Kelola akun mitra dari CMS admin.
//
// Tiga hal yang diuji di sini adalah tiga hal yang membuat fitur ini aman, dan
// ketiganya mudah hilang tanpa disadari saat seseorang menambahkan aksi
// berikutnya:
//
//   1. Gerbangnya per-kapabilitas, BUKAN `caller.isAdmin`. ADMIN_ROLES di
//      data-gateway/index.ts memuat OPERATOR, FINANCE*, dan INSURANCE_ADMIN;
//      audit 2026-10-23 menemukan empat aksi uang yang bocor justru karena
//      digerbang `isAdmin`. Kredensial mitra tidak boleh ikut jadi yang kelima.
//   2. Kata sandi sementara tidak pernah ditulis ke basis data. Itulah sebabnya
//      "lihat kata sandi" diganti "setel kata sandi": kalau salinan teks
//      terangnya tersimpan, satu kebocoran menyerahkan kredensial semua mitra.
//   3. Aksi kata sandi hanya menyentuh akun AGENT. Tanpa itu, layar Manajemen
//      Mitra menjadi alat pengambilalihan akun MASTER_ADMIN lain.
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
        // Sengaja true untuk SEMUA peran di bawah: kalau aksi-aksi ini pernah
        // digerbang `caller.isAdmin`, tes penolakan di bawah akan gagal.
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

const AGENT = { id: 'mitra-1', email: 'budi@email.com', name: 'Budi', role: 'AGENT' };

describe('admin_create_mitra — siapa yang boleh', () => {
  for (const role of ['OPERATOR', 'FINANCE', 'FINANCE_MANAGER', 'FINANCE_DIRECTOR', 'INSURANCE_ADMIN', 'AGENT']) {
    it(`menolak ${role} meski isAdmin bernilai true`, async () => {
      const { ctx } = makeCtx(role, { name: 'Budi', email: 'budi@email.com', phone: '0811' });
      const res = await handleMitraAccountsAction('admin_create_mitra', ctx);
      expect(res?.status).toBe(403);
    });
  }

  it('mengizinkan ADMIN dan membuat pengguna auth + profil dengan id yang sama', async () => {
    const { db, ctx } = makeCtx('ADMIN', { name: 'Budi', email: 'Budi@Email.com', phone: '0811' });
    const res = await handleMitraAccountsAction('admin_create_mitra', ctx);
    expect(res?.status).toBe(200);
    expect(db.authCalls.find(c => c.fn === 'inviteUserByEmail')).toBeTruthy();
    const profile = db.inserted.find(i => i.table === 'sp_users');
    expect(profile?.row.id).toBe('auth-1');
    // Email dinormalkan ke huruf kecil: pencarian identitas di index.ts
    // membandingkan dengan .eq() pada email yang sudah huruf kecil.
    expect(profile?.row.email).toBe('budi@email.com');
    expect(profile?.row.role).toBe('AGENT');
    // Nilai bawaan harus sama dengan cabang AGENT di ensure_profile.
    expect(profile?.row.commission_rate).toBe(0.1);
    expect(profile?.row.verified).toBe(false);
  });

  it('tidak membuat apa pun kalau emailnya sudah terdaftar', async () => {
    const { db, ctx } = makeCtx('ADMIN',
      { name: 'Budi', email: 'budi@email.com', phone: '0811' },
      { byEmail: AGENT });
    const res = await handleMitraAccountsAction('admin_create_mitra', ctx);
    expect(res?.status).toBe(409);
    expect(db.authCalls).toHaveLength(0);
    expect(db.inserted).toHaveLength(0);
  });

  it('melarang ADMIN memakai mode kata sandi sementara', async () => {
    const { ctx } = makeCtx('ADMIN', { name: 'Budi', email: 'budi@email.com', phone: '0811', mode: 'temp' });
    const res = await handleMitraAccountsAction('admin_create_mitra', ctx);
    expect(res?.status).toBe(403);
  });

  it('memaksa role AGENT walau pemanggil meminta role lain', async () => {
    const { db, ctx } = makeCtx('MASTER_ADMIN',
      { name: 'Budi', email: 'budi@email.com', phone: '0811', role: 'MASTER_ADMIN' });
    await handleMitraAccountsAction('admin_create_mitra', ctx);
    expect(db.inserted.find(i => i.table === 'sp_users')?.row.role).toBe('AGENT');
  });

  it('membatalkan pengguna auth kalau penulisan profil gagal', async () => {
    const { db, ctx } = makeCtx('ADMIN',
      { name: 'Budi', email: 'budi@email.com', phone: '0811', upline_code: 'SP-AGT-9999' });
    // upline tidak ditemukan → pengguna auth yang baru dibuat harus dihapus,
    // kalau tidak mitranya bisa masuk tanpa baris sp_users dan ensure_profile
    // akan membuatkannya sebagai CUSTOMER.
    const res = await handleMitraAccountsAction('admin_create_mitra', ctx);
    expect(res?.status).toBe(400);
    expect(db.authCalls.find(c => c.fn === 'deleteUser')?.arg).toBe('auth-1');
  });
});

describe('admin_set_mitra_temp_password', () => {
  for (const role of ['ADMIN', 'OPERATOR', 'FINANCE_DIRECTOR', 'INSURANCE_ADMIN']) {
    it(`menolak ${role} — hanya MASTER_ADMIN`, async () => {
      const { ctx } = makeCtx(role, { user_id: 'mitra-1' }, { byId: AGENT });
      const res = await handleMitraAccountsAction('admin_set_mitra_temp_password', ctx);
      expect(res?.status).toBe(403);
    });
  }

  it('menolak target yang bukan AGENT', async () => {
    const { ctx } = makeCtx('MASTER_ADMIN', { user_id: 'x' },
      { byId: { ...AGENT, role: 'MASTER_ADMIN' } });
    const res = await handleMitraAccountsAction('admin_set_mitra_temp_password', ctx);
    expect(res?.status).toBe(400);
    expect((res?.body as Row).code).toBe('NOT_AN_AGENT');
  });

  it('menyetel sandi, memaksa ganti, dan TIDAK menulis sandi ke basis data', async () => {
    const { db, ctx } = makeCtx('MASTER_ADMIN', { user_id: 'mitra-1' }, { byId: AGENT });
    const res = await handleMitraAccountsAction('admin_set_mitra_temp_password', ctx);
    expect(res?.status).toBe(200);

    const password = (res?.body as Row).temp_password as string;
    expect(password).toMatch(/^[A-Za-z2-9]{4}-[A-Za-z2-9]{5}-[A-Za-z2-9]{5}$/);

    const upd = db.authCalls.find(c => c.fn === 'updateUserById')?.arg as Row;
    expect(upd.password).toBe(password);
    expect((upd.user_metadata as Row).must_change_password).toBe(true);

    // Inti kontraknya: tidak satu pun baris yang ditulis boleh memuat kata
    // sandinya. Notifikasi admin memang ditulis — isinya tidak boleh berisi
    // kredensial.
    for (const { row } of db.inserted) {
      expect(JSON.stringify(row)).not.toContain(password);
    }
  });

  it('bisa dimatikan paksaan gantinya kalau diminta eksplisit', async () => {
    const { db, ctx } = makeCtx('MASTER_ADMIN', { user_id: 'mitra-1', require_change: false }, { byId: AGENT });
    await handleMitraAccountsAction('admin_set_mitra_temp_password', ctx);
    const upd = db.authCalls.find(c => c.fn === 'updateUserById')?.arg as Row;
    expect((upd.user_metadata as Row).must_change_password).toBe(false);
  });
});

describe('admin_send_mitra_reset', () => {
  it('menolak peran di luar ADMIN/MASTER_ADMIN', async () => {
    const { ctx } = makeCtx('OPERATOR', { user_id: 'mitra-1' }, { byId: AGENT });
    const res = await handleMitraAccountsAction('admin_send_mitra_reset', ctx);
    expect(res?.status).toBe(403);
  });

  it('menolak target yang bukan AGENT sebelum menyentuh auth', async () => {
    const { db, ctx } = makeCtx('ADMIN', { user_id: 'x' }, { byId: { ...AGENT, role: 'ADMIN' } });
    const res = await handleMitraAccountsAction('admin_send_mitra_reset', ctx);
    expect(res?.status).toBe(400);
    expect(db.authCalls).toHaveLength(0);
  });
});

describe('aksi di luar modul ini', () => {
  it('diteruskan ke modul berikutnya, bukan dijawab', async () => {
    const { ctx } = makeCtx('MASTER_ADMIN');
    expect(await handleMitraAccountsAction('admin_list_users', ctx)).toBeNull();
  });
});
