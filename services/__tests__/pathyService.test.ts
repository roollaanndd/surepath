// Unit tests for Pathy's after-sales tools (v2.3.0).
//
// Two things these lock down above all else:
//
//  1. **Coverage answers must follow the policy, not general knowledge.** Flood,
//     earthquake, riot, terrorism, third-party liability and personal accident
//     are NOT in the base Indonesian motor cover — they are paid extensions.
//     Telling a customer with no flood extension that their flooded car is
//     covered is the most damaging wrong answer this assistant could give.
//
//  2. **These tools never write.** Claim submission and payment each have one
//     guarded path already (staged photo forensics, Xendit invoicing); a chat
//     model must not get a second door into either. The fake database throws on
//     any write verb, so a future tool that inserts fails this suite loudly.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runServiceTool, isServiceTool, serviceToolSchemas, PERIL_KEYS,
} from '../../supabase/functions/pathy-agent/serviceTools.ts';
import type { ToolContext } from '../../supabase/functions/pathy-agent/common.ts';
import { BUILTIN_RATE_SET } from '../../supabase/functions/_shared/ojk.ts';

// ─── Fake database ───────────────────────────────────────────────────────────

const WRITE_VERBS = new Set(['insert', 'update', 'upsert', 'delete', 'rpc']);

function fakeDb(tables: Record<string, unknown[]>) {
  const calls: Array<[string, string]> = [];

  const make = (table: string) => {
    const rows = () => tables[table] ?? [];
    // deno-lint-ignore no-explicit-any
    const q: any = new Proxy({}, {
      get(_t, prop: string) {
        if (prop === 'then') {
          return (ok: (v: unknown) => unknown, fail?: (e: unknown) => unknown) =>
            Promise.resolve({ data: rows(), error: null }).then(ok, fail);
        }
        if (prop === 'maybeSingle' || prop === 'single') {
          return async () => ({ data: rows()[0] ?? null, error: null });
        }
        if (WRITE_VERBS.has(prop)) {
          return () => { throw new Error(`service tools must not write (${table}.${prop})`); };
        }
        return (...args: unknown[]) => { calls.push([table, prop]); void args; return q; };
      },
    });
    return q;
  };

  return {
    __calls: calls,
    from: (t: string) => make(t),
    rpc: () => { throw new Error('service tools must not call RPCs'); },
  };
}

const AGENT_ID = '11111111-1111-4111-8111-111111111111';
const CLIENT_ID = '22222222-2222-4222-8222-222222222222';

function ctx(tables: Record<string, unknown[]>, role = 'CUSTOMER'): ToolContext {
  const id = role === 'CUSTOMER' ? CLIENT_ID : AGENT_ID;
  return {
    db: fakeDb(tables),
    caller: {
      authId: id, ownerId: id, ownerIds: [id],
      role, name: role === 'CUSTOMER' ? 'Budi Nasabah' : 'Rina Mitra',
      email: 'user@example.com', agentCode: 'SP-AGT-1234', phone: '08123456789',
    },
    rateSet: BUILTIN_RATE_SET,
  };
}

/** An active Comprehensive car policy with no extensions bought. */
const BARE_POLICY = {
  id: 'order-1',
  order_number: 'ORD/2026/0001',
  policy_number: 'POL-2026-0001',
  product_name: 'Car Protection',
  product_type: 'CAR',
  status: 'ISSUED',
  insurer_name: 'PT Asuransi Contoh',
  coverage_type: 'COMPREHENSIVE',
  sum_insured: 200_000_000,
  total_premium: 5_400_000,
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  created_at: '2026-01-01T00:00:00Z',
  client_name: 'Budi Nasabah',
  addons: null,
  vehicle_details: { brand: 'Toyota', model: 'Avanza', year: 2022, province: 'DKI Jakarta' },
};

const withAddons = (addons: Record<string, unknown>) => ({ ...BARE_POLICY, addons });
const asTlo = { ...BARE_POLICY, coverage_type: 'TLO' };

const run = (name: string, args: Record<string, unknown>, c: ToolContext) =>
  runServiceTool(name, args, c);

// ─── Registration ────────────────────────────────────────────────────────────

describe('tool registration', () => {
  it('claims every service tool name it implements', () => {
    for (const n of ['check_coverage', 'start_claim', 'claim_status', 'renewal_check',
      'explain_my_policy', 'payment_help', 'pipeline_nudge', 'commission_forecast', 'draft_followup']) {
      expect(isServiceTool(n)).toBe(true);
    }
    expect(isServiceTool('drop_table')).toBe(false);
  });

  it('hides the agent tools from customers', () => {
    const customer = serviceToolSchemas('CUSTOMER').map(t => t.function.name);
    const agent = serviceToolSchemas('AGENT').map(t => t.function.name);
    expect(customer).not.toContain('commission_forecast');
    expect(customer).not.toContain('draft_followup');
    expect(agent).toContain('commission_forecast');
    expect(agent).toContain('pipeline_nudge');
  });

  it('offers the model a closed list of perils rather than free text', () => {
    const schema = serviceToolSchemas('CUSTOMER').find(t => t.function.name === 'check_coverage');
    expect(schema.function.parameters.properties.peril.enum).toEqual(PERIL_KEYS);
    expect(PERIL_KEYS.length).toBeGreaterThan(10);
  });
});

// ─── check_coverage ──────────────────────────────────────────────────────────

describe('check_coverage', () => {
  it('refuses flood when the extension was never bought', async () => {
    const { result } = await run('check_coverage', { peril: 'flood' }, ctx({ sp_policy_orders: [BARE_POLICY] }));
    expect(result.covered).toBe(false);
    expect(result.indication).toBe('LIKELY_NOT_COVERED');
    expect(result.reason).toMatch(/tidak tercatat/i);
  });

  it('allows flood once the extension is on the policy', async () => {
    const { result } = await run('check_coverage', { peril: 'flood' },
      ctx({ sp_policy_orders: [withAddons({ flood: true })] }));
    expect(result.covered).toBe(true);
    expect(result.extensions).toContain('Banjir & angin topan');
  });

  it.each(['earthquake', 'riot', 'terrorism', 'third_party', 'personal_accident'])(
    'treats %s as an extension, not base cover', async (peril) => {
      const { result } = await run('check_coverage', { peril }, ctx({ sp_policy_orders: [BARE_POLICY] }));
      expect(result.covered).toBe(false);
    });

  it('reads a third-party limit of 0 as "not bought"', async () => {
    const { result } = await run('check_coverage', { peril: 'third_party' },
      ctx({ sp_policy_orders: [withAddons({ tpl_limit: 0 })] }));
    expect(result.covered).toBe(false);
  });

  it('covers a collision on Comprehensive but not on TLO', async () => {
    const comp = await run('check_coverage', { peril: 'collision' }, ctx({ sp_policy_orders: [BARE_POLICY] }));
    expect(comp.result.covered).toBe(true);
    expect(comp.result.own_risk).toBe(300_000);

    const tlo = await run('check_coverage', { peril: 'collision' }, ctx({ sp_policy_orders: [asTlo] }));
    expect(tlo.result.covered).toBe(false);
    expect(tlo.result.reason).toMatch(/TLO/);
  });

  it('covers theft under both Comprehensive and TLO', async () => {
    for (const policy of [BARE_POLICY, asTlo]) {
      const { result } = await run('check_coverage', { peril: 'theft' }, ctx({ sp_policy_orders: [policy] }));
      expect(result.covered).toBe(true);
    }
  });

  it.each(['tyre_only', 'mechanical', 'no_licence', 'illegal_use', 'abroad'])(
    'never covers %s', async (peril) => {
      const { result } = await run('check_coverage', { peril }, ctx({ sp_policy_orders: [BARE_POLICY] }));
      expect(result.covered).toBe(false);
    });

  it('rejects a peril the model invented instead of guessing', async () => {
    const { result } = await run('check_coverage', { peril: 'alien_abduction' }, ctx({ sp_policy_orders: [BARE_POLICY] }));
    expect(result.error).toBeTruthy();
    expect(result.covered).toBeUndefined();
  });

  it('rejects a policy reference that could break the query filter', async () => {
    const { result } = await run('check_coverage', { peril: 'collision', order_number: 'A,or(status.eq.X)' },
      ctx({ sp_policy_orders: [BARE_POLICY] }));
    expect(result.error).toMatch(/tidak valid/i);
  });

  it('says so plainly when the account has no policy at all', async () => {
    const { result } = await run('check_coverage', { peril: 'collision' }, ctx({ sp_policy_orders: [] }));
    expect(result.error).toMatch(/Belum ada polis/i);
  });

  it('always carries a disclaimer — the insurer decides, not Pathy', async () => {
    const { result } = await run('check_coverage', { peril: 'collision' }, ctx({ sp_policy_orders: [BARE_POLICY] }));
    expect(result.disclaimer).toMatch(/insurer/i);
  });
});

// ─── start_claim ─────────────────────────────────────────────────────────────

describe('start_claim', () => {
  it('prepares a claim without ever writing one', async () => {
    const c = ctx({ sp_policy_orders: [BARE_POLICY] });
    const { result, card } = await run('start_claim',
      { peril: 'collision', incident_date: '2026-06-10', description: 'Nabrak pembatas jalan' }, c);

    expect(result.eligible).toBe(true);
    expect(result.documents.length).toBeGreaterThan(3);
    expect(result.prefill.policy_number).toBe('POL-2026-0001');
    expect(result.prefill.incident_date).toBe('2026-06-10');
    expect(card?.type).toBe('claim_start');
    // The model is told, in the tool result itself, not to claim it submitted.
    expect(result.note).toMatch(/BELUM dikirim/i);
  });

  it('flags an incident outside the policy period before documents are gathered', async () => {
    const { result } = await run('start_claim', { peril: 'collision', incident_date: '2025-06-10' },
      ctx({ sp_policy_orders: [BARE_POLICY] }));
    expect(result.eligible).toBe(false);
    expect(result.period_warning).toMatch(/lebih awal/i);
  });

  it('rejects a future incident date', async () => {
    const future = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const { result } = await run('start_claim', { peril: 'collision', incident_date: future },
      ctx({ sp_policy_orders: [{ ...BARE_POLICY, end_date: '2099-12-31' }] }));
    expect(result.period_warning).toMatch(/masa depan/i);
  });

  it('will not start a claim on a policy that is not active yet', async () => {
    const { result } = await run('start_claim', { peril: 'collision' },
      ctx({ sp_policy_orders: [{ ...BARE_POLICY, status: 'PENDING_PAYMENT' }] }));
    expect(result.error).toMatch(/belum aktif/i);
  });

  it('agrees with check_coverage — an uncovered peril is not eligible', async () => {
    const { result } = await run('start_claim', { peril: 'flood' },
      ctx({ sp_policy_orders: [BARE_POLICY] }));
    expect(result.covered).toBe(false);
    expect(result.eligible).toBe(false);
  });

  it('drops a malformed incident date instead of passing it to the form', async () => {
    const { result } = await run('start_claim', { peril: 'collision', incident_date: '10 Juni' },
      ctx({ sp_policy_orders: [BARE_POLICY] }));
    expect(result.prefill.incident_date).toBeNull();
  });
});

// ─── claim_status ────────────────────────────────────────────────────────────

describe('claim_status', () => {
  it('explains the stage and the next step, and flags missing photos', async () => {
    const { result } = await run('claim_status', {}, ctx({
      sp_claims: [{
        claim_number: 'CLM-1', policy_number: 'POL-2026-0001', status: 'SUBMITTED',
        incident_date: '2026-06-10', created_at: '2026-06-11T00:00:00Z', photo_urls: [],
      }],
    }));
    expect(result.claims[0].stage).toMatch(/verifikasi/i);
    expect(result.claims[0].next_step).toBeTruthy();
    expect(result.claims[0].missing).toContain('Foto kerusakan belum ada');
  });

  it('does not invent a stage for an unknown status', async () => {
    const { result } = await run('claim_status', {}, ctx({
      sp_claims: [{ claim_number: 'CLM-2', status: 'WEIRD', incident_date: '2026-06-10', created_at: '2026-06-11T00:00:00Z', photo_urls: ['a'] }],
    }));
    expect(result.claims[0].stage).toBe('WEIRD');
    expect(result.claims[0].missing).toEqual([]);
  });

  it('rejects a malformed claim number', async () => {
    const { result } = await run('claim_status', { claim_number: 'X,y.z(1)' }, ctx({ sp_claims: [] }));
    expect(result.error).toMatch(/tidak valid/i);
  });
});

// ─── renewal_check ───────────────────────────────────────────────────────────

describe('renewal_check', () => {
  it('recomputes the renewal premium instead of repeating last year\'s', async () => {
    const { result } = await run('renewal_check', {}, ctx({ sp_policy_orders: [BARE_POLICY] }));
    const r = result.renewals[0];
    expect(r.renewal_sum_insured).toBe(180_000_000); // 10%/yr depreciation
    expect(r.renewal_estimate).toBeGreaterThan(0);
    expect(r.renewal_estimate).not.toBe(BARE_POLICY.total_premium);
  });

  it('ignores policies that never became active', async () => {
    const { result } = await run('renewal_check', {},
      ctx({ sp_policy_orders: [{ ...BARE_POLICY, status: 'CANCELLED' }] }));
    expect(result.count).toBe(0);
  });
});

// ─── explain_my_policy ───────────────────────────────────────────────────────

describe('explain_my_policy', () => {
  it('lists unbought extensions under "not covered", not under "covered"', async () => {
    const { result } = await run('explain_my_policy', {}, ctx({ sp_policy_orders: [BARE_POLICY] }));
    const notCovered = (result.not_covered as string[]).join(' | ');
    expect(notCovered).toMatch(/Banjir/);
    expect(notCovered).toMatch(/perluasan belum dibeli/);
    expect((result.covered as string[]).join(' | ')).not.toMatch(/Banjir/);
  });

  it('moves a bought extension into "covered"', async () => {
    const { result } = await run('explain_my_policy', {},
      ctx({ sp_policy_orders: [withAddons({ earthquake: true })] }));
    expect((result.covered as string[]).join(' | ')).toMatch(/Gempa/);
  });
});

// ─── payment_help ────────────────────────────────────────────────────────────

describe('payment_help', () => {
  it('surfaces an existing invoice link', async () => {
    const { result } = await run('payment_help', {}, ctx({
      sp_policy_orders: [{ ...BARE_POLICY, status: 'PENDING_PAYMENT' }],
      sp_payments: [{ order_id: 'order-1', invoice_url: 'https://checkout.xendit.co/web/abc', status: 'PENDING' }],
    }));
    expect(result.pending[0].invoice_url).toBe('https://checkout.xendit.co/web/abc');
  });

  it('refuses to hand the UI a non-https payment link', async () => {
    const { result } = await run('payment_help', {}, ctx({
      sp_policy_orders: [{ ...BARE_POLICY, status: 'PENDING_PAYMENT' }],
      sp_payments: [{ order_id: 'order-1', invoice_url: 'javascript:alert(1)', status: 'PENDING' }],
    }));
    expect(result.pending[0].invoice_url).toBeNull();
  });

  it('says nothing is outstanding rather than inventing a bill', async () => {
    const { result } = await run('payment_help', {}, ctx({ sp_policy_orders: [] }));
    expect(result.count).toBe(0);
    expect(result.note).toMatch(/Tidak ada tagihan/i);
  });
});

// ─── Agent tools ─────────────────────────────────────────────────────────────

describe('agent-only tools', () => {
  it.each(['pipeline_nudge', 'commission_forecast', 'draft_followup'])(
    'refuses %s for a customer account', async (tool) => {
      const { result } = await run(tool, { quote_id: '33333333-3333-4333-8333-333333333333' }, ctx({}, 'CUSTOMER'));
      expect(result.error).toMatch(/agen/i);
    });

  it('reports wallet and in-flight commission without touching the money tables', async () => {
    const { result } = await run('commission_forecast', {}, ctx({
      sp_agent_wallets: [{ balance: 1_500_000, total_earned: 9_000_000, total_withdrawn: 7_500_000 }],
      sp_commissions: [
        { commission_amount: 400_000, status: 'PENDING' },
        { commission_amount: 600_000, status: 'PAID' },
      ],
      sp_policy_orders: [{ order_number: 'ORD/2', commission_amount: 250_000, status: 'SUBMITTED' }],
    }, 'AGENT'));
    expect(result.wallet_balance).toBe(1_500_000);
    expect(result.commission_pending).toBe(400_000);
    expect(result.expected_from_inflight).toBe(250_000);
  });

  it('rejects a quote id that is not a UUID', async () => {
    const { result } = await run('draft_followup', { quote_id: "'; drop --" }, ctx({}, 'AGENT'));
    expect(result.error).toMatch(/UUID/i);
  });

  it('drafts a message but never sends it', async () => {
    const { result } = await run('draft_followup',
      { quote_id: '33333333-3333-4333-8333-333333333333', tone: 'singkat' }, ctx({
        sp_quotes: [{
          id: '33333333-3333-4333-8333-333333333333', client_name: 'Pak Andi',
          product_type: 'CAR', premium_estimate: 5_400_000,
          expires_at: new Date(Date.now() + 5 * 86_400_000).toISOString(), quote_data: {},
        }],
      }, 'AGENT'));
    expect(result.message).toContain('Pak Andi');
    expect(result.message).toContain('5.400.000');
    expect(result.note).toMatch(/tidak mengirim/i);
  });
});

// ─── The invariant that matters most ─────────────────────────────────────────

describe('no service tool writes', () => {
  it('completes every tool against a database that throws on any write', async () => {
    const tables = {
      sp_policy_orders: [{ ...BARE_POLICY, status: 'PENDING_PAYMENT' }],
      sp_claims: [{ claim_number: 'CLM-1', status: 'SUBMITTED', created_at: '2026-06-11T00:00:00Z' }],
      sp_payments: [],
      sp_quotes: [{
        id: '33333333-3333-4333-8333-333333333333', client_name: 'Pak Andi',
        product_type: 'CAR', premium_estimate: 1_000_000, expires_at: null, quote_data: {},
      }],
      sp_agent_wallets: [],
      sp_commissions: [],
    };
    const names = ['check_coverage', 'start_claim', 'claim_status', 'renewal_check',
      'explain_my_policy', 'payment_help', 'pipeline_nudge', 'commission_forecast', 'draft_followup'];

    for (const name of names) {
      const c = ctx(tables, 'AGENT');
      await expect(run(name, {
        peril: 'collision',
        quote_id: '33333333-3333-4333-8333-333333333333',
      }, c)).resolves.toBeTruthy();
      // Not one of them reached a write verb — the fake db would have thrown.
      expect((c.db as { __calls: Array<[string, string]> }).__calls
        .some(([, verb]) => WRITE_VERBS.has(verb))).toBe(false);
    }
  });
});

// ─── Claim handoff (client side) ─────────────────────────────────────────────

describe('claim handoff', () => {
  it('drops a malformed policy number rather than typing it into the form', async () => {
    vi.resetModules();
    const { requestClaimStart, consumeClaimPrefill } = await import('../claimHandoff');
    requestClaimStart({ policy_number: 'POL 2026,0001', incident_date: 'kemarin', description: 'x', product_type: 'CAR' });
    const pre = consumeClaimPrefill();
    expect(pre?.policyNumber).toBe('');
    expect(pre?.incidentDate).toBe('');
    expect(pre?.description).toBe('x');
  });

  it('is single-use — reopening the form later starts blank', async () => {
    vi.resetModules();
    const { requestClaimStart, consumeClaimPrefill } = await import('../claimHandoff');
    requestClaimStart({ policy_number: 'POL-2026-0001', incident_date: '2026-06-10', description: '', product_type: 'MOTOR' });
    expect(consumeClaimPrefill()?.policyNumber).toBe('POL-2026-0001');
    expect(consumeClaimPrefill()).toBeNull();
  });
});

// ─── App-mode viewport lock ──────────────────────────────────────────────────
//
// The split that matters: locked inside the installed app, free in a browser
// tab. Locking the public website would fail WCAG 1.4.4.

describe('app viewport lock', () => {
  const stubMedia = (standalone: boolean) => {
    window.matchMedia = ((q: string) => ({
      matches: /display-mode:\s*standalone/.test(q) ? standalone : false,
      media: q, addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  };

  const load = async () => { vi.resetModules(); return import('../appViewport'); };

  beforeEach(() => {
    document.documentElement.className = '';
    document.head.innerHTML = '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">';
    delete (window as unknown as { Capacitor?: unknown }).Capacitor;
  });

  it('leaves a browser tab zoomable', async () => {
    stubMedia(false);
    const m = await load();
    expect(m.isAppMode()).toBe(false);
    m.initAppViewport();
    expect(document.querySelector('meta[name=viewport]')?.getAttribute('content')).not.toMatch(/user-scalable=no/);
    expect(document.documentElement.classList.contains('sp-app-locked')).toBe(false);
  });

  it('locks zoom once running as an installed app', async () => {
    stubMedia(true);
    const m = await load();
    expect(m.isAppMode()).toBe(true);
    m.initAppViewport();
    const content = document.querySelector('meta[name=viewport]')?.getAttribute('content') ?? '';
    expect(content).toMatch(/user-scalable=no/);
    expect(content).toMatch(/maximum-scale=1\.0/);
    expect(content).toMatch(/viewport-fit=cover/);
    expect(document.documentElement.classList.contains('sp-app-locked')).toBe(true);
  });

  it('treats the Capacitor Android build as app mode', async () => {
    stubMedia(false);
    (window as unknown as { Capacitor: unknown }).Capacitor = { isNativePlatform: () => true };
    const m = await load();
    expect(m.isAppMode()).toBe(true);
  });

  it('blocks the iOS pinch gesture only while locked', async () => {
    stubMedia(true);
    const m = await load();
    m.initAppViewport();
    const e = new Event('gesturestart', { cancelable: true, bubbles: true });
    document.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
  });
});
