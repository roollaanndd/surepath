// Unit tests for Pathy v2.5.0 — diplomacy, disclaimers, and documents.
//
// What these lock down:
//
//  1. **Pathy never decides liability.** Cover answers come back as an
//     indication with `decision_by: 'INSURER'`, and no code path produces a
//     sentence that promises a claim will be paid. This is the answer that
//     costs SurePath money when it is wrong, and the one a chat model is most
//     tempted to give.
//  2. **Every turn carries a caveat**, computed from what actually ran rather
//     than trusted to the model's goodwill.
//  3. **Document writes stay narrow.** save_document_data touches four profile
//     columns and nothing else; it fills blanks rather than overwriting the
//     user's own data; and an agent's scan lands in their client list, never
//     on their own profile.

import { describe, it, expect } from 'vitest';
import {
  turnDisclaimer, detectTopics, AI_DISCLAIMER, INSURER_AUTHORITY,
  MEDICAL_AUTHORITY, LEGAL_AUTHORITY, PRICE_DISCLAIMER,
} from '../../supabase/functions/pathy-agent/disclaimers.ts';
import {
  attachmentHints, isDocumentTool, runDocumentTool, documentToolSchemas,
} from '../../supabase/functions/pathy-agent/documents.ts';
import { runServiceTool } from '../../supabase/functions/pathy-agent/serviceTools.ts';
import type { ToolContext, PathyDocument } from '../../supabase/functions/pathy-agent/common.ts';
import { BUILTIN_RATE_SET } from '../../supabase/functions/_shared/ojk.ts';

const CLIENT_ID = '22222222-2222-4222-8222-222222222222';
const AGENT_ID = '11111111-1111-4111-8111-111111111111';

// ─── Fake database that records every write ──────────────────────────────────

interface Write { table: string; op: string; payload: unknown }

function fakeDb(tables: Record<string, unknown[]>, writes: Write[]) {
  const make = (table: string) => {
    let payload: unknown = null;
    let op = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = new Proxy({}, {
      get(_t, prop: string) {
        if (prop === 'then') {
          return (ok: (v: unknown) => unknown) => {
            if (op) writes.push({ table, op, payload });
            return Promise.resolve({ data: tables[table] ?? [], error: null }).then(ok);
          };
        }
        if (prop === 'maybeSingle' || prop === 'single') {
          return async () => {
            if (op) writes.push({ table, op, payload });
            return { data: (tables[table] ?? [])[0] ?? null, error: null };
          };
        }
        if (prop === 'insert' || prop === 'update' || prop === 'upsert' || prop === 'delete') {
          return (arg: unknown) => { op = prop; payload = arg; return q; };
        }
        return () => q;
      },
    });
    return q;
  };
  return { from: (t: string) => make(t), rpc: () => { throw new Error('no rpc'); } };
}

function ctx(
  tables: Record<string, unknown[]>,
  documents: PathyDocument[],
  role = 'CUSTOMER',
  writes: Write[] = [],
): ToolContext & { __writes: Write[] } {
  const id = role === 'CUSTOMER' ? CLIENT_ID : AGENT_ID;
  return {
    db: fakeDb(tables, writes),
    caller: {
      authId: id, ownerId: id, ownerIds: [id], role,
      name: 'Budi Nasabah', email: 'budi@example.com',
    },
    rateSet: BUILTIN_RATE_SET,
    documents,
    __writes: writes,
  };
}

const STNK: PathyDocument = {
  type: 'STNK',
  fields: {
    plate: 'B 1234 XYZ', brand: 'Toyota', model: 'Avanza', year: 2022,
    province: 'DKI Jakarta', zone: 2, market_value: 204_840_000, owner_name: 'BUDI SANTOSO',
  },
  confidence: 0.96,
};

const KTP: PathyDocument = {
  type: 'KTP',
  fields: { name: 'BUDI SANTOSO', nik: '3171012345670001', address: 'JL MERDEKA NO 1, JAKARTA' },
};

// ─── Disclaimers ─────────────────────────────────────────────────────────────

describe('turn disclaimer', () => {
  it('always says Pathy can be wrong', () => {
    expect(turnDisclaimer('Halo!', [])).toContain(AI_DISCLAIMER);
  });

  it('names the insurer as the authority on any claim answer', () => {
    const d = turnDisclaimer('Klaimmu sedang diproses.', ['claim_status']);
    expect(d).toContain(INSURER_AUTHORITY);
  });

  it('names the insurer on a coverage answer even if the model was vague', () => {
    expect(turnDisclaimer('Banjir tidak dijamin polismu.', [])).toContain(INSURER_AUTHORITY);
  });

  it('points medical questions at a doctor', () => {
    const d = turnDisclaimer('Untuk cedera itu sebaiknya diperiksa dulu.', []);
    expect(d).toContain(MEDICAL_AUTHORITY);
  });

  it('points legal and regulatory questions at the authorities', () => {
    expect(turnDisclaimer('Soal laporan polisi dan pasal itu…', [])).toContain(LEGAL_AUTHORITY);
  });

  it('marks premium figures as estimates', () => {
    expect(turnDisclaimer('Preminya sekitar segitu.', ['estimate_premium'])).toContain(PRICE_DISCLAIMER);
  });

  it('stays short — the AI line plus at most two authorities', () => {
    const d = turnDisclaimer('Klaim, dokter, polisi, premi, banjir semuanya.', ['start_claim', 'estimate_premium']);
    expect(d.split('. ').length).toBeLessThanOrEqual(4);
  });

  it('detects the claim topic from the tool even when the prose hides it', () => {
    expect(detectTopics('Oke, siap.', ['start_claim'])).toContain('CLAIM');
  });
});

// ─── Diplomacy: cover answers are indications, not verdicts ──────────────────

const POLICY = {
  id: 'order-1',
  order_number: 'ORD/2026/0001',
  policy_number: 'POL-2026-0001',
  product_name: 'Car Protection',
  product_type: 'CAR',
  status: 'ISSUED',
  coverage_type: 'COMPREHENSIVE',
  sum_insured: 200_000_000,
  total_premium: 5_400_000,
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  created_at: '2026-01-01T00:00:00Z',
  client_name: 'Budi Nasabah',
  addons: null,
};

describe('liability stays with the insurer', () => {
  it('answers cover questions as an indication, naming who decides', async () => {
    const { result } = await runServiceTool('check_coverage', { peril: 'collision' },
      ctx({ sp_policy_orders: [POLICY] }, []));
    expect(result.indication).toBe('LIKELY_COVERED');
    expect(result.decision_by).toBe('INSURER');
    expect(result.reason).toMatch(/indikasi/i);
  });

  it('never phrases an answer as a guarantee', async () => {
    for (const peril of ['collision', 'flood', 'mechanical', 'total_loss']) {
      const { result } = await runServiceTool('check_coverage', { peril },
        ctx({ sp_policy_orders: [POLICY] }, []));
      expect(result.reason).not.toMatch(/pasti (dijamin|dibayar|diganti)/i);
      expect(result.disclaimer).toMatch(/insurer/i);
    }
  });

  it('hands an inactive policy to the insurer instead of ruling on it', async () => {
    const { result } = await runServiceTool('check_coverage', { peril: 'collision' },
      ctx({ sp_policy_orders: [{ ...POLICY, status: 'PENDING' }] }, []));
    expect(result.indication).toBe('NEEDS_REVIEW');
    expect(result.covered).toBe(false);
  });

  it('treats an out-of-period incident as needing review, not as a rejection', async () => {
    const { result } = await runServiceTool(
      'start_claim',
      { peril: 'collision', incident_date: '2025-06-01' },
      ctx({ sp_policy_orders: [POLICY] }, []),
    );
    expect(result.indication).toBe('NEEDS_REVIEW');
    expect(result.eligible).toBe(false);
    expect(result.period_warning).toBeTruthy();
    expect(result.note).toMatch(/insurer/i);
  });
});

// ─── Attachments feed the quote ──────────────────────────────────────────────

describe('attachmentHints', () => {
  it('turns an STNK read into the arguments a quote needs', () => {
    const h = attachmentHints(ctx({}, [STNK]));
    expect(h.sum_insured).toBe(204_840_000);
    expect(h.province).toBe('DKI Jakarta');
    expect(h.brand).toBe('Toyota');
    expect(h.vehicle_type).toBe('CAR');
  });

  it('takes the insured name and address from a KTP read', () => {
    const h = attachmentHints(ctx({}, [KTP]));
    expect(h.client_name).toBe('BUDI SANTOSO');
    expect(h.client_address).toMatch(/MERDEKA/);
  });

  it('returns nothing when there is nothing attached', () => {
    expect(attachmentHints(ctx({}, []))).toEqual({});
  });
});

// ─── save_document_data ──────────────────────────────────────────────────────

describe('save_document_data', () => {
  it('is registered and offered to the model', () => {
    expect(isDocumentTool('save_document_data')).toBe(true);
    expect(isDocumentTool('drop_table')).toBe(false);
    expect(documentToolSchemas[0].function.name).toBe('save_document_data');
  });

  it('fills a customer profile from their KTP', async () => {
    const writes: Write[] = [];
    const c = ctx({ sp_users: [{ id: CLIENT_ID, name: '', phone: '', ktp: null, address: null }] },
      [KTP], 'CUSTOMER', writes);
    const { result } = await runDocumentTool('save_document_data', { type: 'KTP' }, c);
    expect(result.target).toBe('PROFILE');
    expect(result.saved_fields).toEqual(expect.arrayContaining(['name', 'ktp', 'address']));
    const write = writes.find(w => w.table === 'sp_users');
    expect(write?.op).toBe('update');
    // Only ever the four identity columns — never role, tier, wallet or trust.
    expect(Object.keys(write?.payload as object).sort())
      .toEqual(['address', 'ktp', 'name', 'updated_at']);
  });

  it('does not overwrite what the user already filled in', async () => {
    const writes: Write[] = [];
    const c = ctx({ sp_users: [{ id: CLIENT_ID, name: 'Budi Nasabah', phone: '', ktp: null, address: 'ALAMAT LAMA' }] },
      [KTP], 'CUSTOMER', writes);
    const { result } = await runDocumentTool('save_document_data', { type: 'KTP' }, c);
    expect(result.saved_fields).toEqual(['ktp']);
    expect(result.skipped_fields).toEqual(expect.arrayContaining(['name', 'address']));
  });

  it('overwrites only when explicitly told to', async () => {
    const writes: Write[] = [];
    const c = ctx({ sp_users: [{ id: CLIENT_ID, name: 'Budi Nasabah', phone: '', ktp: null, address: 'ALAMAT LAMA' }] },
      [KTP], 'CUSTOMER', writes);
    const { result } = await runDocumentTool('save_document_data', { type: 'KTP', overwrite: true }, c);
    expect(result.saved_fields).toEqual(expect.arrayContaining(['name', 'address', 'ktp']));
  });

  it("files an agent's scan in their client list, never on their own profile", async () => {
    const writes: Write[] = [];
    const c = ctx({ sp_clients: [] }, [KTP], 'AGENT', writes);
    const { result } = await runDocumentTool('save_document_data', { type: 'KTP' }, c);
    expect(result.target).toBe('CLIENT');
    expect(writes.some(w => w.table === 'sp_users')).toBe(false);
    const insert = writes.find(w => w.table === 'sp_clients');
    expect(insert?.op).toBe('insert');
    expect((insert?.payload as Record<string, unknown>).agent_id).toBe(AGENT_ID);
  });

  it('refuses when the document was never attached', async () => {
    const { result } = await runDocumentTool('save_document_data', { type: 'KTP' }, ctx({}, [STNK]));
    expect(result.error).toBeTruthy();
    expect(result.available).toEqual(['STNK']);
  });
});
