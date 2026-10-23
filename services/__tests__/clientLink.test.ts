// Who an order's customer is.
//
// `sp_policy_orders.client_id` decides who may SEE and CLAIM a policy:
// get_my_orders, get_my_payments, cancel_my_order and submit_claim's ownership
// check all rest on it. One wrong match means one person's policy is visible —
// and claimable — by another, so these tests pin the rule from the side that
// matters: everything that must NOT produce a link.
//
// The rule itself, and why phone numbers are deliberately not used, is
// documented at the top of clientLink.ts.
import { describe, it, expect } from 'vitest';
import {
  normaliseEmail,
  findClientIdByEmail,
  linkOrdersToNewCustomer,
} from '../../supabase/functions/data-gateway/actions/clientLink.ts';

type Row = Record<string, unknown>;

/** Records the ilike pattern it was given, and returns the rows it was seeded with. */
function makeDb(rows: Row[], opts: { updateError?: boolean } = {}) {
  const patterns: string[] = [];
  const updates: Array<{ table: string; row: Row; filters: string[] }> = [];

  const db = {
    patterns,
    updates,
    from(table: string) {
      return {
        select: () => ({
          ilike: (_col: string, pattern: string) => {
            patterns.push(pattern);
            return { limit: async (n: number) => ({ data: rows.slice(0, n), error: null }) };
          },
        }),
        update(row: Row) {
          const filters: string[] = [];
          const chain: any = {
            is: (col: string) => { filters.push(`is:${col}`); return chain; },
            neq: (col: string, v: unknown) => { filters.push(`neq:${col}=${v}`); return chain; },
            ilike: (col: string, pattern: string) => {
              filters.push(`ilike:${col}`);
              patterns.push(pattern);
              return chain;
            },
            select: async () => {
              updates.push({ table, row, filters });
              return opts.updateError
                ? { data: null, error: { message: 'boom' } }
                : { data: rows, error: null };
            },
          };
          return chain;
        },
      };
    },
  };
  return db;
}

const CUSTOMER = { id: 'cust-1', email: 'Budi@Example.com', role: 'CUSTOMER' };

describe('normaliseEmail', () => {
  it('lowercases and trims a real address', () => {
    expect(normaliseEmail('  Budi@Example.COM ')).toBe('budi@example.com');
  });

  it.each([
    ['', 'empty'],
    ['not-an-email', 'no @'],
    ['a@b', 'no dot in domain'],
    ['two@a.com,three@b.com', 'a list, not an address'],
    ['has space@a.com', 'whitespace'],
  ])('rejects %s (%s)', (input) => {
    expect(normaliseEmail(input)).toBeNull();
  });

  it('passes a wildcard address through — shape is not the wildcard defence', () => {
    // `%@gmail.com` is email-shaped, so this layer accepts it. What stops it
    // matching every Gmail customer is the escaping plus the exact-equality
    // check in findClientIdByEmail, not this function. Pinned here so nobody
    // later mistakes the shape test for that defence.
    expect(normaliseEmail('%@gmail.com')).toBe('%@gmail.com');
  });
});

describe('findClientIdByEmail', () => {
  it('links one CUSTOMER matched case-insensitively', async () => {
    const db = makeDb([CUSTOMER]);
    expect(await findClientIdByEmail(db, 'budi@example.com')).toBe('cust-1');
  });

  it('does not link when nothing matches', async () => {
    expect(await findClientIdByEmail(makeDb([]), 'budi@example.com')).toBeNull();
  });

  it('does not link when two rows share the address', async () => {
    // Duplicate emails exist in this database's history. "The first one" is a
    // guess, and this is not a place to guess.
    const db = makeDb([CUSTOMER, { id: 'cust-2', email: 'budi@example.com', role: 'CUSTOMER' }]);
    expect(await findClientIdByEmail(db, 'budi@example.com')).toBeNull();
  });

  it('does not link when the matched row is not exactly that address', async () => {
    // The guard that makes a surviving wildcard harmless: the pattern matched
    // a row, but that row is not this email.
    const db = makeDb([{ id: 'cust-9', email: 'someone@gmail.com', role: 'CUSTOMER' }]);
    expect(await findClientIdByEmail(db, 'budi@example.com')).toBeNull();
  });

  it('does not link to a non-CUSTOMER account', async () => {
    const db = makeDb([{ ...CUSTOMER, role: 'AGENT' }]);
    expect(await findClientIdByEmail(db, 'budi@example.com')).toBeNull();
  });

  it('does not link an agent to their own order', async () => {
    // An agent typing their own email into the customer field must not become
    // the client of their own order — that would blur agent_id and client_id.
    const db = makeDb([CUSTOMER]);
    expect(await findClientIdByEmail(db, 'budi@example.com', ['cust-1'])).toBeNull();
  });

  it('escapes LIKE wildcards before they reach the query', async () => {
    const db = makeDb([]);
    await findClientIdByEmail(db, 'a_b%c@example.com');
    expect(db.patterns[0]).toBe('a\\_b\\%c@example.com');
  });

  it('cannot hijack a customer with a bare wildcard address', async () => {
    // The whole attack, end to end: client_email: "%@gmail.com" would be a
    // pattern matching every Gmail customer. Escaped, it matches the literal
    // string, which is nobody — and even if it did hit one row, that row's
    // address is not "%@gmail.com", so the equality check refuses it.
    const db = makeDb([{ id: 'victim', email: 'someone@gmail.com', role: 'CUSTOMER' }]);
    expect(await findClientIdByEmail(db, '%@gmail.com')).toBeNull();
    expect(db.patterns[0]).toBe('\\%@gmail.com');
  });

  it('does not query at all for a malformed address', async () => {
    const db = makeDb([CUSTOMER]);
    expect(await findClientIdByEmail(db, 'nonsense')).toBeNull();
    expect(db.patterns).toHaveLength(0);
  });
});

describe('linkOrdersToNewCustomer', () => {
  it('claims only unclaimed orders, and never the user own agent rows', async () => {
    const db = makeDb([{ id: 'ord-1' }, { id: 'ord-2' }]);
    const n = await linkOrdersToNewCustomer(db, 'cust-1', 'Budi@Example.com');

    expect(n).toBe(2);
    expect(db.updates).toHaveLength(1);
    expect(db.updates[0].table).toBe('sp_policy_orders');
    expect(db.updates[0].row).toMatchObject({ client_id: 'cust-1' });
    expect(db.updates[0].filters).toContain('is:client_id');
    expect(db.updates[0].filters).toContain('neq:agent_id=cust-1');
    expect(db.updates[0].filters).toContain('ilike:client_email');
  });

  it('writes nothing for a malformed address', async () => {
    const db = makeDb([{ id: 'ord-1' }]);
    expect(await linkOrdersToNewCustomer(db, 'cust-1', 'nonsense')).toBe(0);
    expect(db.updates).toHaveLength(0);
  });

  it('writes nothing when there is no user id', async () => {
    const db = makeDb([{ id: 'ord-1' }]);
    expect(await linkOrdersToNewCustomer(db, '', 'budi@example.com')).toBe(0);
    expect(db.updates).toHaveLength(0);
  });

  it('reports zero rather than failing the signup it runs inside', async () => {
    const db = makeDb([{ id: 'ord-1' }], { updateError: true });
    expect(await linkOrdersToNewCustomer(db, 'cust-1', 'budi@example.com')).toBe(0);
  });
});
