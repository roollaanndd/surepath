// Unit tests for the Pathy assistant client + the edge-function rate engine.
//
// The client tests pin the failure taxonomy: before this change every error
// (expired session, rate limit, outage) collapsed into a single "Pathy AI is
// coming soon" bubble, which is why the chatbot looked permanently dead.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const getSession = vi.fn();
const askPathy = vi.fn();

vi.mock('../db', () => ({
  supabase: { auth: { getSession: () => getSession() }, from: vi.fn() },
  callGateway: vi.fn(async () => ({ data: null, error: 'not used' })),
  callPublicGateway: vi.fn(async () => ({ data: null, error: 'not used' })),
}));

vi.mock('../aiGateway', () => ({ askPathy: (...a: unknown[]) => askPathy(...a) }));

import { pathyChat, PathyError } from '../website';
import {
  BUILTIN_RATE_SET, calcPremium, getVehicleCategory, getZone, type AddOns,
} from '../../supabase/functions/_shared/ojk.ts';
import { calcPremium as browserCalcPremium } from '../ojkRates';

const NO_ADDONS: AddOns = {
  flood: false, earthquake: false, riot: false, terrorism: false,
  tplLimit: 0, paDriver: false, paPassengerSeats: 0,
};

const respond = (status: number, body: unknown) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);

describe('pathyChat client', () => {
  beforeEach(() => {
    getSession.mockReset();
    askPathy.mockReset();
    getSession.mockResolvedValue({ data: { session: { access_token: 'jwt-123' } } });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('returns the reply and structured cards from pathy-agent', async () => {
    (globalThis.fetch as any).mockReturnValue(respond(200, {
      data: {
        reply: 'Kamu punya 2 polis aktif.',
        cards: [{ type: 'policies', data: { policies: [{ order_number: 'ORD-1' }] } }],
        toolsUsed: ['get_my_policies'],
      },
    }));

    const res = await pathyChat('polis saya apa saja?');
    expect(res.reply).toBe('Kamu punya 2 polis aktif.');
    expect(res.cards).toHaveLength(1);
    expect(res.cards[0].type).toBe('policies');
    expect(res.degraded).toBeUndefined();
    expect(askPathy).not.toHaveBeenCalled();
  });

  it('sends the caller JWT to the pathy-agent function', async () => {
    (globalThis.fetch as any).mockReturnValue(respond(200, { data: { reply: 'ok', cards: [] } }));
    await pathyChat('halo');
    const [url, init] = (globalThis.fetch as any).mock.calls[0];
    expect(url).toContain('/functions/v1/pathy-agent');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-123');
  });

  it('raises AUTH when there is no session instead of calling the model', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    await expect(pathyChat('halo')).rejects.toBeInstanceOf(PathyError);
    await expect(pathyChat('halo')).rejects.toMatchObject({ code: 'AUTH' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('raises AUTH on 401 and RATE_LIMIT on 429 — not a generic "coming soon"', async () => {
    (globalThis.fetch as any).mockReturnValueOnce(respond(401, { error: 'Unauthorized: invalid token' }));
    await expect(pathyChat('halo')).rejects.toMatchObject({ code: 'AUTH' });

    (globalThis.fetch as any).mockReturnValueOnce(respond(429, { error: 'Terlalu banyak pesan' }));
    await expect(pathyChat('halo')).rejects.toMatchObject({ code: 'RATE_LIMIT' });
  });

  it('falls back to the knowledge base (flagged degraded) when the function is 5xx or missing', async () => {
    askPathy.mockResolvedValue('Aku bisa bantu soal produk asuransi.');

    (globalThis.fetch as any).mockReturnValueOnce(respond(503, { error: 'down' }));
    const a = await pathyChat('apa itu TLO?');
    expect(a.degraded).toBe(true);
    expect(a.cards).toEqual([]);

    (globalThis.fetch as any).mockReturnValueOnce(respond(404, {}));
    const b = await pathyChat('apa itu TLO?');
    expect(b.degraded).toBe(true);
    expect(askPathy).toHaveBeenCalledTimes(2);
  });

  it('surfaces NOT_CONFIGURED when even the fallback has no AI key', async () => {
    askPathy.mockRejectedValue(new Error('AI service not configured'));
    (globalThis.fetch as any).mockReturnValue(respond(500, {}));
    await expect(pathyChat('halo')).rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
  });

  it('recovers from a network failure by answering from the knowledge base', async () => {
    askPathy.mockResolvedValue('jawaban umum');
    (globalThis.fetch as any).mockRejectedValue(new Error('Failed to fetch'));
    const res = await pathyChat('halo');
    expect(res.degraded).toBe(true);
  });
});

describe('edge-function OJK rate engine', () => {
  it('maps provinces to the same zones as the browser engine', () => {
    expect(getZone(BUILTIN_RATE_SET, 'DKI Jakarta')).toBe(2);
    expect(getZone(BUILTIN_RATE_SET, 'Sumatera Utara')).toBe(1);
    expect(getZone(BUILTIN_RATE_SET, 'Jawa Timur')).toBe(3);
    // Unknown province falls back to zone 3, as the browser engine does.
    expect(getZone(BUILTIN_RATE_SET, 'Atlantis')).toBe(3);
  });

  it('bands vehicles by sum insured', () => {
    expect(getVehicleCategory(BUILTIN_RATE_SET, 100_000_000)).toBe(1);
    expect(getVehicleCategory(BUILTIN_RATE_SET, 250_000_000)).toBe(3);
    expect(getVehicleCategory(BUILTIN_RATE_SET, 1_500_000_000)).toBe(5);
  });

  it('produces the same premium as services/ojkRates.ts for the same inputs', () => {
    const cases: Array<[250_000_000 | 90_000_000 | 600_000_000, 1 | 2 | 3, 'COMPREHENSIVE' | 'TLO']> = [
      [250_000_000, 2, 'COMPREHENSIVE'],
      [90_000_000, 1, 'TLO'],
      [600_000_000, 3, 'COMPREHENSIVE'],
    ];
    for (const [sumInsured, zone, coverage] of cases) {
      const edge = calcPremium(BUILTIN_RATE_SET, 'CAR', coverage, sumInsured, zone, NO_ADDONS, 'MIN');
      const browser = browserCalcPremium('CAR', coverage, sumInsured, zone, NO_ADDONS, 'MIN');
      expect(edge.rate).toBe(browser.rate);
      expect(edge.basePremium).toBe(browser.basePremium);
      expect(edge.total).toBe(browser.total);
    }
  });

  it('prices add-ons identically to the browser engine', () => {
    const addons: AddOns = {
      flood: true, earthquake: true, riot: true, terrorism: false,
      tplLimit: 50_000_000, paDriver: true, paPassengerSeats: 4,
    };
    const edge = calcPremium(BUILTIN_RATE_SET, 'CAR', 'COMPREHENSIVE', 300_000_000, 2, addons, 'MIN');
    const browser = browserCalcPremium('CAR', 'COMPREHENSIVE', 300_000_000, 2, addons, 'MIN');
    expect(edge.addonPremium).toBe(browser.addonPremium);
    expect(edge.total).toBe(browser.total);
  });

  it('prices motorcycles off the Roda 2 tables', () => {
    const edge = calcPremium(BUILTIN_RATE_SET, 'MOTORCYCLE', 'TLO', 20_000_000, 1, NO_ADDONS, 'MIN');
    const browser = browserCalcPremium('MOTORCYCLE', 'TLO', 20_000_000, 1, NO_ADDONS, 'MIN');
    expect(edge.rate).toBe(browser.rate);
    expect(edge.total).toBe(browser.total);
  });
});
