// How a claim finds the policy it belongs to.
//
// The reported shape of the bug: a claim filed with the number printed on the
// insurer's policy document was stored with no policy_id, no agent_id and no
// insurer — orphaned. It never appeared in the agent's list and could not be
// routed to the insurer who has to pay it. The cause was that submit_claim
// matched the reference against order_number only, which is SurePath's internal
// number, while the customer holds sp_policy_orders.policy_number.
//
// These tests pin three things: both columns are searched, the insurer is
// carried over from the order, and the reference cannot rewrite the PostgREST
// filter it is interpolated into.
//
// The insurer link is written by a separate UPDATE after the insert, not as a
// column on the insert, so that deploying this function before migration
// 20261023120000 costs the link rather than the whole claim. The tests assert
// that split directly — an insert naming insurer_id is the regression.
import { describe, it, expect } from 'vitest';
import { handleClaimsAction } from '../../supabase/functions/data-gateway/actions/claims.ts';

type Row = Record<string, unknown>;

/**
 * PostgREST-shaped stub covering the calls submit_claim makes. Records the
 * `.or()` filter strings so the tests can assert on what was actually queried,
 * and the rows inserted into each table.
 */
function makeDb(opts: { order?: Row | null } = {}) {
  const orFilters: string[] = [];
  const inserted: Array<{ table: string; row: Row }> = [];
  const updated: Array<{ table: string; row: Row; id: unknown }> = [];
  const thenable = { then: (res: () => void) => { res(); return thenable; } };

  const db = {
    orFilters,
    inserted,
    updated,
    from(table: string) {
      return {
        select: () => ({
          // policy_number path — .or(...).limit(1)
          or: (filter: string) => {
            orFilters.push(filter);
            return { limit: async () => ({ data: opts.order ? [opts.order] : [] }) };
          },
          // policy_id path — .eq(...).maybeSingle()
          eq: () => ({ maybeSingle: async () => ({ data: opts.order ?? null }) }),
        }),
        insert(row: Row) {
          inserted.push({ table, row });
          return {
            select: () => ({ single: async () => ({ data: { id: 'clm-1', ...row }, error: null }) }),
            then: thenable.then,
          };
        },
        update: (row: Row) => ({
          eq: (_col: string, id: unknown) => { updated.push({ table, row, id }); return thenable; },
        }),
      };
    },
  };
  return db;
}

function makeCtx(db: ReturnType<typeof makeDb>, params: Row) {
  return {
    db,
    params,
    caller: {
      authId: 'auth-1',
      email: 'agen@example.com',
      spUser: { id: 'agent-1', role: 'AGENT' },
      role: 'AGENT',
      isAdmin: false,
      isFinanceAdmin: false,
      userMetadata: null,
      ownerId: 'agent-1',
      ownerIds: ['agent-1', 'auth-1'],
    },
    sendTelegram: () => {},
    logActivity: () => {},
    checkRateLimit: async () => true,
    RESEND_KEY: '',
  } as never;
}

const ORDER = {
  id: 'ord-1',
  agent_id: 'agent-1',
  client_id: 'cust-1',
  insurer_id: 'ins-9',
};

const BASE_CLAIM = {
  claim_type: 'VEHICLE',
  description: 'Lecet bemper depan',
  location: 'Jakarta',
  amount_estimated: 5_000_000,
};

describe('submit_claim — policy linkage', () => {
  it('searches policy_number as well as order_number', async () => {
    const db = makeDb({ order: ORDER });
    await handleClaimsAction('submit_claim', makeCtx(db, { ...BASE_CLAIM, policy_number: 'POL-ABC-123' }));

    expect(db.orFilters).toHaveLength(1);
    expect(db.orFilters[0]).toContain('policy_number.eq.POL-ABC-123');
    expect(db.orFilters[0]).toContain('order_number.eq.POL-ABC-123');
  });

  it('carries the insurer over from the matched order', async () => {
    const db = makeDb({ order: ORDER });
    await handleClaimsAction('submit_claim', makeCtx(db, { ...BASE_CLAIM, policy_number: 'POL-ABC-123' }));

    const claim = db.inserted.find(r => r.table === 'sp_claims')?.row;
    expect(claim).toMatchObject({
      policy_id: 'ord-1',
      agent_id: 'agent-1',
      client_id: 'cust-1',
    });
    // Carried, but by the follow-up update rather than the insert.
    expect(claim).not.toHaveProperty('insurer_id');
    expect(db.updated).toEqual([
      { table: 'sp_claims', row: { insurer_id: 'ins-9' }, id: 'clm-1' },
    ]);
  });

  it('carries the insurer over on the policy_id path too', async () => {
    const db = makeDb({ order: ORDER });
    await handleClaimsAction('submit_claim', makeCtx(db, { ...BASE_CLAIM, policy_id: 'ord-1' }));

    expect(db.inserted.find(r => r.table === 'sp_claims')?.row).not.toHaveProperty('insurer_id');
    expect(db.updated).toEqual([
      { table: 'sp_claims', row: { insurer_id: 'ins-9' }, id: 'clm-1' },
    ]);
  });

  it('never takes insurer_id from the payload', async () => {
    // No order matches, so there is nothing to derive it from — and a claimed
    // insurer_id in the request must not survive into the row.
    const db = makeDb({ order: null });
    await handleClaimsAction('submit_claim', makeCtx(db, {
      ...BASE_CLAIM,
      policy_number: 'POL-NOPE',
      insurer_id: 'ins-attacker',
    }));

    expect(db.inserted.find(r => r.table === 'sp_claims')?.row.insurer_id).toBeUndefined();
    expect(db.updated).toHaveLength(0);
  });

  it('files the claim even when the insurer column does not exist yet', async () => {
    // The reason the link is a separate statement. If the update fails — which
    // is what a missing column looks like — the claim must still be created and
    // the caller must still get a success. Nothing here awaits that update.
    const db = makeDb({ order: ORDER });
    const broken = {
      ...db,
      from(table: string) {
        const real = db.from(table);
        return {
          ...real,
          update: () => ({ eq: () => ({ then: (_r: () => void, rej?: () => void) => { rej?.(); } }) }),
        };
      },
    };
    const res = await handleClaimsAction('submit_claim', makeCtx(broken as never, { ...BASE_CLAIM, policy_id: 'ord-1' }));

    expect(res.status).toBe(200);
    expect(db.inserted.find(r => r.table === 'sp_claims')).toBeDefined();
  });

  it('strips characters that would rewrite the .or() filter', async () => {
    // An .or() filter is parsed by PostgREST, not bound as a parameter. A comma
    // or parenthesis in the reference would add predicates rather than be
    // matched by one, so those characters must not reach it.
    const db = makeDb({ order: ORDER });
    await handleClaimsAction('submit_claim', makeCtx(db, {
      ...BASE_CLAIM,
      policy_number: 'X,agent_id.eq.*,or(status.eq.ISSUED)',
    }));

    expect(db.orFilters[0]).toBe('order_number.eq.Xagent_id.eq.orstatus.eq.ISSUED,policy_number.eq.Xagent_id.eq.orstatus.eq.ISSUED');
    expect(db.orFilters[0].match(/,/g)).toHaveLength(1); // only the separator
  });

  it('does not query at all when the reference sanitises to nothing', async () => {
    const db = makeDb({ order: ORDER });
    await handleClaimsAction('submit_claim', makeCtx(db, { ...BASE_CLAIM, policy_number: '(),' }));

    expect(db.orFilters).toHaveLength(0);
    expect(db.inserted.find(r => r.table === 'sp_claims')?.row.policy_id).toBeUndefined();
  });
});
