// Manual commission + coin credit — four-eyes approval tests (v2.7.58).
//
// Fokus pengujian:
//   1. Gerbang peran: hanya FINANCE_ROLES boleh mengajukan;
//      hanya MASTER_ADMIN boleh memutuskan.
//   2. Four-eyes: pengaju tidak boleh menyetujui permintaannya sendiri.
//   3. Validasi: minimal salah satu dari komisi atau koin > 0; alasan
//      min 10 karakter; target harus AGENT.
//   4. Alur approve: PENDING → APPROVED → panggil RPC → APPLIED.
import { describe, it, expect, vi } from 'vitest';
import { handleManualCommissionAction } from '../../supabase/functions/data-gateway/actions/manualCommission.ts';

type Row = Record<string, unknown>;

interface DbOpts {
  /** Baris yang dikembalikan oleh .eq('id', agentId).maybeSingle() di sp_users. */
  agent?: Row | null;
  /** Baris yang dikembalikan oleh .eq('id', requestId).maybeSingle() di sp_manual_commission_requests. */
  request?: Row | null;
  /** Baris yang dikembalikan oleh update.single() di sp_manual_commission_requests. */
  updated?: Row | null;
  /** Error untuk credit_agent_wallet RPC. */
  walletErr?: { message: string } | null;
}

function makeDb(opts: DbOpts = {}) {
  const inserted: Array<{ table: string; row: Row }> = [];
  const updates: Array<{ table: string; row: Row; match: Row }> = [];
  const rpcCalls: Array<{ fn: string; params: Row }> = [];
  const thenable = { then: (res: () => void) => { res(); return thenable; } };

  // Query builder yang semua method-nya mengembalikan dirinya sendiri
  // sampai salah satu terminator (maybeSingle/single/then/limit-await)
  // dipanggil. Nilai yang dikembalikan tergantung tabel dan apa yang
  // dikonfigurasi di DbOpts.
  function makeQB(table: string) {
    const resolveSingle = () => {
      if (table === 'sp_users') return { data: opts.agent ?? null, error: null };
      if (table === 'sp_manual_commission_requests') return { data: opts.request ?? null, error: null };
      if (table === 'sp_wallet_transactions') return { data: { id: 'wtx-1' }, error: null };
      return { data: null, error: null };
    };
    const qb: any = {
      select: () => qb,
      eq: () => qb,
      or: () => qb,
      in: () => qb,
      order: () => qb,
      limit: () => qb,
      maybeSingle: async () => resolveSingle(),
      single: async () => resolveSingle(),
      then: (cb: (r: { data: Row[]; error: null }) => void) => { cb({ data: [], error: null }); return qb; },
    };
    return qb;
  }

  return {
    inserted,
    updates,
    rpcCalls,
    from(table: string) {
      return {
        select: () => makeQB(table),
        insert(row: Row) {
          inserted.push({ table, row });
          return {
            select: () => ({
              single: async () => ({ data: { id: 'req-1', ...row }, error: null }),
              maybeSingle: async () => ({ data: { id: 'ins-1', ...row }, error: null }),
            }),
            then: thenable.then,
          };
        },
        update(row: Row) {
          const match: Row = {};
          const upd: any = {
            eq: (col: string, val: unknown) => { match[col] = val; return upd; },
            select: () => ({
              single: async () => {
                updates.push({ table, row, match });
                return { data: opts.updated ?? { id: 'req-1', ...row }, error: null };
              },
            }),
          };
          return upd;
        },
      };
    },
    rpc(fn: string, params: Row) {
      rpcCalls.push({ fn, params });
      if (fn === 'credit_agent_wallet' && opts.walletErr) {
        return Promise.resolve({ data: null, error: opts.walletErr });
      }
      return Promise.resolve({ data: null, error: null });
    },
  };
}

function makeCtx(role: string, params: Row = {}, dbOpts: DbOpts = {}, callerId = 'caller-1') {
  const db = makeDb(dbOpts);
  return {
    db,
    ctx: {
      db,
      params,
      caller: {
        authId: 'caller-auth',
        email: `${role.toLowerCase()}@surepath.id`,
        spUser: { id: callerId, role },
        role,
        isAdmin: true,
        isFinanceAdmin: true,
        userMetadata: null,
        ownerId: callerId,
        ownerIds: [callerId],
        emailConfirmedAt: null,
      },
      reqIp: null,
      reqUserAgent: null,
      sendTelegram: vi.fn(),
      logActivity: vi.fn(),
      checkRateLimit: vi.fn(async () => true),
      RESEND_KEY: '',
    } as never,
  };
}

const AGENT = { id: 'agt-1', email: 'budi@email.com', name: 'Budi', role: 'AGENT' };

describe('finance_request_manual_commission — gerbang peran', () => {
  for (const role of ['CUSTOMER', 'AGENT', 'OPERATOR', 'B2B_CLIENT', 'INSURANCE_ADMIN']) {
    it(`menolak ${role}`, async () => {
      const { ctx } = makeCtx(role, {
        agent_id: 'agt-1', commission_amount: 100000, coin_amount: 10, reason: 'Alasan lengkap valid.',
      });
      const res = await handleManualCommissionAction('finance_request_manual_commission', ctx);
      expect(res?.status).toBe(403);
    });
  }
  for (const role of ['FINANCE', 'FINANCE_MANAGER', 'FINANCE_DIRECTOR', 'ADMIN', 'MASTER_ADMIN']) {
    it(`mengizinkan ${role}`, async () => {
      const { ctx } = makeCtx(role, {
        agent_id: 'agt-1', commission_amount: 100000, coin_amount: 10, reason: 'Polis offline ditutup langsung.',
      }, { agent: AGENT });
      const res = await handleManualCommissionAction('finance_request_manual_commission', ctx);
      expect(res?.status).toBe(200);
    });
  }
});

describe('finance_request_manual_commission — validasi', () => {
  it('menolak nominal nol', async () => {
    const { ctx } = makeCtx('FINANCE', {
      agent_id: 'agt-1', commission_amount: 0, coin_amount: 0, reason: 'Alasan cukup panjang.',
    }, { agent: AGENT });
    const res = await handleManualCommissionAction('finance_request_manual_commission', ctx);
    expect(res?.status).toBe(400);
    expect((res?.body as any).error).toContain('komisi atau koin');
  });

  it('menolak alasan kurang dari 10 karakter', async () => {
    const { ctx } = makeCtx('FINANCE', {
      agent_id: 'agt-1', commission_amount: 10000, coin_amount: 0, reason: 'singkat',
    }, { agent: AGENT });
    const res = await handleManualCommissionAction('finance_request_manual_commission', ctx);
    expect(res?.status).toBe(400);
  });

  it('menolak target yang bukan AGENT', async () => {
    const CUSTOMER = { id: 'cus-1', email: 'c@c.c', name: 'C', role: 'CUSTOMER' };
    const { ctx } = makeCtx('FINANCE', {
      agent_id: 'cus-1', commission_amount: 10000, coin_amount: 0, reason: 'Alasan cukup panjang untuk audit.',
    }, { agent: CUSTOMER });
    const res = await handleManualCommissionAction('finance_request_manual_commission', ctx);
    expect(res?.status).toBe(400);
    expect((res?.body as any).error).toContain('AGENT');
  });
});

describe('master_decide_manual_commission — four-eyes', () => {
  it('menolak non-MASTER_ADMIN', async () => {
    const { ctx } = makeCtx('ADMIN', { request_id: 'req-1', approve: true });
    const res = await handleManualCommissionAction('master_decide_manual_commission', ctx);
    expect(res?.status).toBe(403);
  });

  it('pengaju tidak boleh menyetujui sendiri (requested_by == caller)', async () => {
    const REQ = {
      id: 'req-1', agent_id: 'agt-1', commission_amount: 100000, coin_amount: 0,
      reason: 'offline', policy_ref: 'POL-1',
      requested_by: 'master-1', status: 'PENDING',
      agent: AGENT,
    };
    const { ctx } = makeCtx('MASTER_ADMIN',
      { request_id: 'req-1', approve: true },
      { request: REQ },
      'master-1', // same id as requested_by
    );
    const res = await handleManualCommissionAction('master_decide_manual_commission', ctx);
    expect(res?.status).toBe(403);
    expect((res?.body as any).error).toContain('four-eyes');
  });

  it('menolak status selain PENDING', async () => {
    const REQ = {
      id: 'req-1', agent_id: 'agt-1', commission_amount: 100000, coin_amount: 0,
      reason: 'offline', requested_by: 'finance-1', status: 'APPROVED',
      agent: AGENT,
    };
    const { ctx } = makeCtx('MASTER_ADMIN',
      { request_id: 'req-1', approve: true },
      { request: REQ },
      'master-1',
    );
    const res = await handleManualCommissionAction('master_decide_manual_commission', ctx);
    expect(res?.status).toBe(409);
  });

  it('reject wajib alasan (min 5)', async () => {
    const REQ = {
      id: 'req-1', agent_id: 'agt-1', commission_amount: 100000, coin_amount: 0,
      reason: 'offline', requested_by: 'finance-1', status: 'PENDING',
      agent: AGENT,
    };
    const { ctx } = makeCtx('MASTER_ADMIN',
      { request_id: 'req-1', approve: false, decision_note: 'x' },
      { request: REQ },
      'master-1',
    );
    const res = await handleManualCommissionAction('master_decide_manual_commission', ctx);
    expect(res?.status).toBe(400);
  });

  it('approve memanggil credit_agent_wallet dan menandai APPLIED', async () => {
    const REQ = {
      id: 'req-1', agent_id: 'agt-1', commission_amount: 500000, coin_amount: 50,
      reason: 'polis offline', policy_ref: 'POL-X',
      requested_by: 'finance-1', status: 'PENDING',
      agent: AGENT,
    };
    const { db, ctx } = makeCtx('MASTER_ADMIN',
      { request_id: 'req-1', approve: true },
      { request: REQ, updated: { ...REQ, status: 'APPLIED' } },
      'master-1',
    );
    const res = await handleManualCommissionAction('master_decide_manual_commission', ctx);
    expect(res?.status).toBe(200);
    // RPC credit_agent_wallet dipanggil dengan nominal yang benar
    const credit = db.rpcCalls.find(c => c.fn === 'credit_agent_wallet');
    expect(credit).toBeTruthy();
    expect(credit?.params.p_amount).toBe(500000);
    expect(credit?.params.p_agent_id).toBe('agt-1');
    expect(credit?.params.p_reference_type).toBe('MANUAL_COMMISSION');
    // Koin ikut diproses
    const coinInc = db.rpcCalls.find(c => c.fn === 'increment_coins_balance');
    expect(coinInc).toBeTruthy();
    expect(coinInc?.params.p_delta).toBe(50);
  });
});
