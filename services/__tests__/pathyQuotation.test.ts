// Tests for the KTP reader and Pathy's proposal pipeline.
//
// The proposal is a commercial document: it carries an insurer's name, a
// premium and the insured's identity. So the two things pinned hardest here are
// (a) a NIK is never half-read into a form, and (b) the premium printed on the
// slip is recomputed by the rate engine at build time rather than carried over
// from whatever the model said a few turns earlier.
import { describe, it, expect, vi } from 'vitest';
import { normaliseKtp } from '../ktpOcr';
import { handleUsersAction } from '../../supabase/functions/data-gateway/actions/users.ts';
import { runTool, toolSchemas, type ToolContext } from '../../supabase/functions/pathy-agent/tools.ts';
import { calcPremium, type AddOns } from '../ojkRates';

// ─── KTP ─────────────────────────────────────────────────────────────────────

describe('normaliseKtp', () => {
  it('accepts a clean card and uppercases the text fields', () => {
    const r = normaliseKtp({ name: 'Budi Santoso', nik: '3174012509880001', address: 'Jl. Melati No. 12, Jakarta' });
    expect(r.ok).toBe(true);
    expect(r.status).toBe('OK');
    expect(r.name).toBe('BUDI SANTOSO');
    expect(r.address).toBe('JL. MELATI NO. 12, JAKARTA');
  });

  it('strips the separators models like to add to a NIK', () => {
    expect(normaliseKtp({ nik: '3174 0125 0988 0001' }).nik).toBe('3174012509880001');
    expect(normaliseKtp({ nik: '3174-0125-0988-0001' }).nik).toBe('3174012509880001');
  });

  it('rejects a NIK that is not exactly 16 digits rather than prefilling it', () => {
    const short = normaliseKtp({ name: 'Siti', nik: '317401250988', address: 'Bandung' });
    expect(short.nik).toBeNull();
    expect(short.ok).toBe(false);
    expect(short.notes).toMatch(/16 digit/i);
    expect(normaliseKtp({ nik: '31740125098800011' }).nik).toBeNull();
  });

  it('reports PARTIAL when only some fields came back, UNCLEAR when none did', () => {
    expect(normaliseKtp({ name: 'Budi' }).status).toBe('PARTIAL');
    expect(normaliseKtp({}).status).toBe('UNCLEAR');
    expect(normaliseKtp({}).notes).toBeTruthy();
  });
});

// ─── Pathy proposal tools ────────────────────────────────────────────────────

const AVANZA_SI = 204_840_000; // Toyota All New Avanza 1.5 G CVT 2022

function ctx(over: Partial<ToolContext> = {}): ToolContext {
  const inserted: any[] = [];
  const db: any = {
    __inserted: inserted,
    from() {
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          in: () => ({
            not: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
          }),
        }),
        insert(row: any) {
          inserted.push(row);
          return { select: () => ({ single: async () => ({ data: { id: 'q-1', ...row }, error: null }) }) };
        },
      };
    },
  };
  return {
    db,
    caller: {
      authId: '11111111-1111-4111-8111-111111111111',
      ownerId: '11111111-1111-4111-8111-111111111111',
      ownerIds: ['11111111-1111-4111-8111-111111111111'],
      role: 'AGENT',
      name: 'Rina Mitra',
      email: 'rina@example.com',
      agentCode: 'SP-AGT-1234',
      phone: '08123456789',
    },
    ...over,
  } as ToolContext;
}

describe('read_attachment', () => {
  it('returns the document the client already extracted', async () => {
    const c = ctx({ documents: [{ type: 'STNK', fields: { plate: 'B 1234 XYZ' }, confidence: 0.96 }] });
    const out = await runTool('read_attachment', { type: 'STNK' }, c);
    expect(out.result.fields.plate).toBe('B 1234 XYZ');
    expect(out.card?.type).toBe('document_read');
  });

  it('says what is actually attached instead of inventing a document', async () => {
    const c = ctx({ documents: [{ type: 'STNK', fields: { plate: 'B 1 A' } }] });
    const out = await runTool('read_attachment', { type: 'KTP' }, c);
    expect(out.result.error).toBeTruthy();
    expect(out.result.available).toEqual(['STNK']);
    expect((await runTool('read_attachment', { type: 'STNK' }, ctx())).result.error).toMatch(/Belum ada dokumen/i);
  });
});

describe('compare_offers', () => {
  it('prices three options that match the browser rate engine', async () => {
    const out = await runTool('compare_offers', {
      vehicle_type: 'CAR', sum_insured: AVANZA_SI, province: 'DKI Jakarta',
      brand: 'Toyota', model: 'ALL NEW AVANZA 1.5 G CVT', year: 2022,
    }, ctx());

    const ids = out.result.options.map((o: any) => o.id);
    expect(ids).toEqual(['comprehensive', 'comprehensive_plus', 'tlo']);
    expect(out.result.zone).toBe(2);
    expect(out.card?.type).toBe('offers');

    const none: AddOns = { flood: false, earthquake: false, riot: false, terrorism: false, tplLimit: 0, paDriver: false, paPassengerSeats: 0 };
    const comp = calcPremium('CAR', 'COMPREHENSIVE', AVANZA_SI, 2, none, 'MIN');
    const tlo = calcPremium('CAR', 'TLO', AVANZA_SI, 2, none, 'MIN');
    expect(out.result.options[0].total).toBe(comp.total);
    expect(out.result.options[2].total).toBe(tlo.total);
    // The middle option must actually cost more than the bare one.
    expect(out.result.options[1].total).toBeGreaterThan(comp.total);
  });

  it('every option itemises rows that add up to its own total', async () => {
    const out = await runTool('compare_offers', { vehicle_type: 'CAR', sum_insured: AVANZA_SI, province: 'DKI Jakarta' }, ctx());
    for (const o of out.result.options) {
      const sum = o.rows.reduce((a: number, r: any) => a + r.amount, 0);
      expect(sum).toBe(o.total);
    }
  });

  it('refuses an implausible sum insured instead of quoting it', async () => {
    const out = await runTool('compare_offers', { vehicle_type: 'CAR', sum_insured: 1000 }, ctx());
    expect(out.result.error).toMatch(/Rp 5 juta/);
  });
});

describe('build_quotation', () => {
  const baseArgs = {
    option_id: 'comprehensive_plus',
    vehicle_type: 'CAR',
    sum_insured: AVANZA_SI,
    province: 'DKI Jakarta',
    client_name: 'Budi Santoso',
    client_address: 'JL. MELATI NO. 12, JAKARTA',
    brand: 'Toyota',
    model: 'ALL NEW AVANZA 1.5 G CVT',
    year: 2022,
    plate: 'B 1234 XYZ',
  };

  it('returns a payload shaped for the buy-wizard slip adapter', async () => {
    const c = ctx();
    const out = await runTool('build_quotation', baseArgs, c);
    const q = out.card?.data.quotation;

    expect(out.card?.type).toBe('quotation_ready');
    // fromAgentQuote()'s required fields — the slip cannot render without these.
    for (const k of ['clientName', 'agentName', 'vehicleBrand', 'vehicleModel', 'vehiclePrice', 'coverageType', 'rows', 'totalPremium']) {
      expect(q[k]).toBeDefined();
    }
    expect(q.clientAddress).toBe('JL. MELATI NO. 12, JAKARTA');
    expect(q.agentCode).toBe('SP-AGT-1234');
    expect(q.quoteNumber).toMatch(/^QS\/SP\/\d{4}\/[IVX]+\/\d{4}$/);
  });

  it('recomputes the premium from the rate engine rather than trusting the conversation', async () => {
    const full: AddOns = { flood: true, earthquake: true, riot: true, terrorism: false, tplLimit: 25_000_000, paDriver: true, paPassengerSeats: 4 };
    const expected = calcPremium('CAR', 'COMPREHENSIVE', AVANZA_SI, 2, full, 'MIN');
    // Deliberately pass a bogus premium alongside — it must be ignored.
    const out = await runTool('build_quotation', { ...baseArgs, total_premium: 1 }, ctx());
    expect(out.card?.data.totalPremium).toBe(expected.total);
    expect(out.card?.data.quotation.totalPremium).toBe(expected.total);
  });

  it('saves a DRAFT quote carrying the proposal payload', async () => {
    const c = ctx();
    await runTool('build_quotation', baseArgs, c);
    const row = (c.db as any).__inserted[0];
    expect(row.status).toBe('DRAFT');
    expect(row.product_type).toBe('CAR');
    expect(row.quote_data.kind).toBe('quotation');
    expect(row.quote_data.option).toBe('comprehensive_plus');
  });

  it('rejects an unknown option and a missing insured name', async () => {
    expect((await runTool('build_quotation', { ...baseArgs, option_id: 'murah' }, ctx())).result.error).toMatch(/compare_offers/);
    expect((await runTool('build_quotation', { ...baseArgs, client_name: '' }, ctx())).result.error).toMatch(/Nama tertanggung/);
  });
});

describe('tool exposure', () => {
  it('offers the proposal tools to everyone, sales report only to agents', () => {
    const names = (role: string) => toolSchemas(role).map((t: any) => t.function.name);
    for (const n of ['read_attachment', 'compare_offers', 'build_quotation']) {
      expect(names('CUSTOMER')).toContain(n);
    }
    expect(names('CUSTOMER')).not.toContain('get_sales_report');
    expect(names('AGENT')).toContain('get_sales_report');
  });
});

// Keeps the existing gateway import honest — signup still refuses a role-less profile.
describe('regression: ensure_profile still requires a role', () => {
  it('answers 409', async () => {
    const res = await handleUsersAction('ensure_profile', {
      db: { from: () => ({ select: () => ({ ilike: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) },
      params: {},
      caller: { authId: 'a', email: 'a@b.c', spUser: null, role: null, isAdmin: false, isFinanceAdmin: false, userMetadata: {}, ownerId: 'a', ownerIds: ['a'] },
      sendTelegram: vi.fn(), logActivity: vi.fn(), checkRateLimit: vi.fn(async () => true), RESEND_KEY: '',
    } as any);
    expect(res?.status).toBe(409);
  });
});
