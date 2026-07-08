// Unit tests for critical SurePath services.
// Run with: npx vitest run

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Supabase ───────────────────────────────────────────────────────────

vi.mock('../db', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: { access_token: 'mock-jwt' } } })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id', email: 'test@test.com' } } })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(), maybeSingle: vi.fn(), order: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve({ data: [], error: null })) })) })), })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn() })) })),
    removeChannel: vi.fn(),
    storage: { from: vi.fn(() => ({ upload: vi.fn(() => Promise.resolve({ data: null, error: null })), getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://mock.url/file.jpg' } })) })) },
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    functions: { invoke: vi.fn(() => Promise.resolve({ data: null, error: null })) },
  },
  callGateway: vi.fn(async (action: string) => {
    if (action === 'get_my_profile') return { data: { id: 'test-id', email: 'test@test.com', name: 'Test User', role: 'CUSTOMER' } };
    if (action === 'admin_queue_summary') return { data: { pendingOrders: 5, pendingClaims: 2, pendingWithdrawals: 1, pendingAgents: 3, unreadNotifications: 10, paidPayments: 50, pendingPayments: 5 } };
    if (action === 'admin_list_orders') return { data: [{ id: 'ord-1', order_number: 'ORD-001', client_name: 'Test', status: 'SUBMITTED', total_premium: 500000 }] };
    return { data: null, error: 'Unknown action' };
  }),
}));

// ─── Tests: callGateway pattern ──────────────────────────────────────────────

import { callGateway } from '../db';

describe('callGateway', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return data for get_my_profile', async () => {
    const { data, error } = await callGateway('get_my_profile');
    expect(error).toBeUndefined();
    expect(data).toBeDefined();
    expect(data?.role).toBe('CUSTOMER');
  });

  it('should return data for admin_queue_summary', async () => {
    const { data, error } = await callGateway('admin_queue_summary');
    expect(error).toBeUndefined();
    expect(data?.pendingOrders).toBe(5);
  });

  it('should return error for unknown action', async () => {
    const { data, error } = await callGateway('nonexistent');
    expect(data).toBeNull();
    expect(error).toBeDefined();
  });

  it('should return admin_list_orders with correct shape', async () => {
    const { data } = await callGateway('admin_list_orders');
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    if (data && data.length > 0) {
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('order_number');
      expect(data[0]).toHaveProperty('client_name');
      expect(data[0]).toHaveProperty('status');
    }
  });
});

// ─── Tests: QueueSummary shape ───────────────────────────────────────────────

describe('QueueSummary shape', () => {
  it('should have all required numeric fields', async () => {
    const { data } = await callGateway('admin_queue_summary');
    if (data) {
      const keys = ['pendingOrders','pendingClaims','pendingWithdrawals','pendingAgents','unreadNotifications','paidPayments','pendingPayments'];
      keys.forEach(k => {
        expect(data).toHaveProperty(k);
        expect(typeof (data as any)[k]).toBe('number');
      });
    }
  });

  it('pendingOrders should be non-negative', async () => {
    const { data } = await callGateway('admin_queue_summary');
    expect(data?.pendingOrders).toBeGreaterThanOrEqual(0);
  });

  it('unreadNotifications should be non-negative', async () => {
    const { data } = await callGateway('admin_queue_summary');
    expect(data?.unreadNotifications).toBeGreaterThanOrEqual(0);
  });
});

// ─── Tests: Order shape ──────────────────────────────────────────────────────

describe('Order shape', () => {
  it('should have required fields', async () => {
    const { data } = await callGateway('admin_list_orders');
    if (data && Array.isArray(data) && data.length > 0) {
      const order = data[0];
      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('order_number');
      expect(order).toHaveProperty('client_name');
      expect(order).toHaveProperty('status');
      expect(order).toHaveProperty('total_premium');
      expect(typeof order.id).toBe('string');
      expect(typeof order.status).toBe('string');
    }
  });

  it('total_premium should be a number', async () => {
    const { data } = await callGateway('admin_list_orders');
    if (data && Array.isArray(data) && data.length > 0) {
      expect(typeof data[0].total_premium).toBe('number');
    }
  });
});

// ─── Tests: OJK Rates (actual implementation, not mocked) ────────────────────

import { calcPremium, getZone, getVehicleCategory, TPL_OPTIONS, PROVINCES } from '../ojkRates';

describe('OJK Rates', () => {
  it('should have TPL_OPTIONS defined', () => {
    expect(TPL_OPTIONS).toBeDefined();
  });

  it('getZone should return a number', () => {
    const zone = getZone('DKI Jakarta');
    expect(typeof zone).toBe('number');
    expect(zone).toBeGreaterThanOrEqual(1);
    expect(zone).toBeLessThanOrEqual(3);
  });

  it('getZone should handle unknown province gracefully', () => {
    const zone = getZone('Unknown Place');
    expect(zone).toBeGreaterThanOrEqual(1);
    expect(zone).toBeLessThanOrEqual(3);
  });
});

// ─── Tests: Plate Codes ──────────────────────────────────────────────────────

import { PLATE_CODES } from '../plateCodes';

describe('Plate Codes', () => {
  it('should have plate codes defined', () => {
    expect(PLATE_CODES).toBeDefined();
    expect(Object.keys(PLATE_CODES).length).toBeGreaterThan(5);
  });
});

// ─── Tests: Promo Code Service ───────────────────────────────────────────────

describe('Promo Code Service', () => {
  it('promoToDiscountPercent should return 0 for invalid validation', async () => {
    const { promoToDiscountPercent } = await import('../promoCodeService');
    const result = promoToDiscountPercent({ valid: false } as any, 500000);
    expect(result).toBe(0);
  });

  it('promoToDiscountPercent should calculate percent discount', async () => {
    const { promoToDiscountPercent } = await import('../promoCodeService');
    const result = promoToDiscountPercent({ valid: true, discountType: 'PERCENT', discountValue: 10 } as any, 500000);
    expect(result).toBe(10);
  });

  it('promoToDiscountPercent should cap at maxDiscountPercent', async () => {
    const { promoToDiscountPercent } = await import('../promoCodeService');
    const result = promoToDiscountPercent({ valid: true, discountType: 'PERCENT', discountValue: 50 } as any, 500000, 25);
    expect(result).toBe(25);
  });

  it('promoToDiscountPercent should return 0 for missing discountType', async () => {
    const { promoToDiscountPercent } = await import('../promoCodeService');
    const result = promoToDiscountPercent({ valid: true, discountValue: 10 } as any, 500000);
    expect(result).toBe(0);
  });

  it('promoToDiscountPercent should return 0 for zero order total NOMINAL', async () => {
    const { promoToDiscountPercent } = await import('../promoCodeService');
    const result = promoToDiscountPercent({ valid: true, discountType: 'NOMINAL', discountValue: 50000 } as any, 0);
    expect(result).toBe(0);
  });
});

// ─── Tests: AuthService (synchronous) ────────────────────────────────────────

import { checkRateLimit, recordFailedAttempt, clearRateLimit, createSessionToken } from '../authService';

describe('AuthService', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('checkRateLimit allows first attempt', () => {
    const result = checkRateLimit('test@example.com');
    expect(result.allowed).toBe(true);
    expect(result.remainingAttempts).toBeGreaterThan(0);
  });

  it('checkRateLimit blocks after 5 failed attempts', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt('blocked@example.com');
    const result = checkRateLimit('blocked@example.com');
    expect(result.allowed).toBe(false);
  });

  it('clearRateLimit resets counter', () => {
    for (let i = 0; i < 5; i++) recordFailedAttempt('reset@example.com');
    clearRateLimit('reset@example.com');
    const result = checkRateLimit('reset@example.com');
    expect(result.allowed).toBe(true);
  });

  it('createSessionToken returns decodable base64', () => {
    const token = createSessionToken({ id: 'u1', email: 't@t.com', name: 'Test', role: 'CUSTOMER' });
    expect(typeof token).toBe('string');
    const decoded = JSON.parse(atob(token));
    expect(decoded.id).toBe('u1');
    expect(decoded.email).toBe('t@t.com');
    expect(decoded.role).toBe('CUSTOMER');
  });

  it('createSessionToken includes expiration', () => {
    const token = createSessionToken({ id: 'u2', email: 't2@t.com', name: 'T2', role: 'AGENT' });
    const decoded = JSON.parse(atob(token));
    expect(decoded.exp).toBeGreaterThan(Date.now());
  });
});

// ─── Tests: OJK Rates calcPremium (comprehensive) ────────────────────────────

describe('OJK Rates — Comprehensive', () => {
  const baseAddons = { flood: false, earthquake: false, riot: false, tplLimit: 0, paDriver: false, paPassengerSeats: 0 };

  it('calcPremium returns PremiumBreakdown with all fields', () => {
    const r = calcPremium('CAR', 'COMPREHENSIVE', 200000000, 1, baseAddons as any);
    expect(r).toHaveProperty('basePremium');
    expect(r).toHaveProperty('addonPremium');
    expect(r).toHaveProperty('adminFee');
    expect(r).toHaveProperty('stampDuty');
    expect(r).toHaveProperty('total');
  });

  it('admin fee is 50000', () => {
    const r = calcPremium('CAR', 'COMPREHENSIVE', 200000000, 1, baseAddons as any);
    expect(r.adminFee).toBe(50000);
  });

  it('stamp duty is 10000', () => {
    const r = calcPremium('CAR', 'COMPREHENSIVE', 200000000, 1, baseAddons as any);
    expect(r.stampDuty).toBe(10000);
  });

  it('total = base + addon + admin + stamp', () => {
    const r = calcPremium('CAR', 'COMPREHENSIVE', 200000000, 1, baseAddons as any);
    expect(r.total).toBe(r.basePremium + r.addonPremium + r.adminFee + r.stampDuty);
  });

  it('comprehensive > TLO for same vehicle', () => {
    const comp = calcPremium('CAR', 'COMPREHENSIVE', 200000000, 1, baseAddons as any);
    const tlo = calcPremium('CAR', 'TLO', 200000000, 1, baseAddons as any);
    expect(comp.basePremium).toBeGreaterThan(tlo.basePremium);
  });

  it('flood addon increases total', () => {
    const without = calcPremium('CAR', 'COMPREHENSIVE', 200000000, 1, baseAddons as any);
    const withFlood = calcPremium('CAR', 'COMPREHENSIVE', 200000000, 1, { ...baseAddons, flood: true } as any);
    expect(withFlood.total).toBeGreaterThan(without.total);
  });

  it('earthquake addon increases total', () => {
    const without = calcPremium('CAR', 'COMPREHENSIVE', 200000000, 1, baseAddons as any);
    const withEq = calcPremium('CAR', 'COMPREHENSIVE', 200000000, 1, { ...baseAddons, earthquake: true } as any);
    expect(withEq.total).toBeGreaterThan(without.total);
  });

  it('TPL addon increases total', () => {
    const without = calcPremium('CAR', 'COMPREHENSIVE', 200000000, 1, baseAddons as any);
    const withTpl = calcPremium('CAR', 'COMPREHENSIVE', 200000000, 1, { ...baseAddons, tplLimit: 25000000 } as any);
    expect(withTpl.total).toBeGreaterThan(without.total);
  });

  it('PA passengers increase with more seats', () => {
    const r1 = calcPremium('CAR', 'COMPREHENSIVE', 200000000, 1, { ...baseAddons, paPassengerSeats: 1 } as any);
    const r4 = calcPremium('CAR', 'COMPREHENSIVE', 200000000, 1, { ...baseAddons, paPassengerSeats: 4 } as any);
    expect(r4.total).toBeGreaterThan(r1.total);
  });

  it('higher sum insured = higher premium', () => {
    const low = calcPremium('CAR', 'COMPREHENSIVE', 100000000, 1, baseAddons as any);
    const high = calcPremium('CAR', 'COMPREHENSIVE', 500000000, 1, baseAddons as any);
    expect(high.basePremium).toBeGreaterThan(low.basePremium);
  });

  it('motorcycle uses different rates than car', () => {
    const car = calcPremium('CAR', 'COMPREHENSIVE', 20000000, 1, baseAddons as any);
    const moto = calcPremium('MOTORCYCLE', 'COMPREHENSIVE', 20000000, 1, baseAddons as any);
    expect(moto.basePremium).not.toEqual(car.basePremium);
  });

  it('getVehicleCategory bands', () => {
    expect(getVehicleCategory(100000000)).toBe(1);
    expect(getVehicleCategory(150000000)).toBe(2);
    expect(getVehicleCategory(300000000)).toBe(3);
    expect(getVehicleCategory(500000000)).toBe(4);
    expect(getVehicleCategory(1000000000)).toBe(5);
  });

  it('TPL_OPTIONS has 4 options', () => {
    expect(TPL_OPTIONS.length).toBe(4);
    expect(TPL_OPTIONS.some(o => o.value === 0)).toBe(true);
    expect(TPL_OPTIONS.some(o => o.value === 10000000)).toBe(true);
    expect(TPL_OPTIONS.some(o => o.value === 25000000)).toBe(true);
    expect(TPL_OPTIONS.some(o => o.value === 50000000)).toBe(true);
  });

  it('PROVINCES has >20 entries', () => {
    expect(PROVINCES.length).toBeGreaterThan(20);
  });

  it('all provinces return valid zone (1-3)', () => {
    for (const p of PROVINCES) {
      const z = getZone(p);
      expect(z).toBeGreaterThanOrEqual(1);
      expect(z).toBeLessThanOrEqual(3);
    }
  });
});

// ─── Tests: Plate Codes (expanded) ───────────────────────────────────────────

describe('Plate Codes — Expanded', () => {
  it('has >20 entries', () => { expect(PLATE_CODES.length).toBeGreaterThan(20); });
  it('includes B (Jakarta)', () => { expect(PLATE_CODES.find(p => p.code === 'B')).toBeDefined(); });
  it('includes D (Bandung)', () => { expect(PLATE_CODES.find(p => p.code === 'D')).toBeDefined(); });
  it('each entry has code, region, province', () => {
    PLATE_CODES.forEach(p => {
      expect(p).toHaveProperty('code');
      expect(p).toHaveProperty('region');
      expect(p).toHaveProperty('province');
    });
  });
});

// ─── Tests: Order status validation ──────────────────────────────────────────

describe('Order Status Validation', () => {
  it('valid statuses include all 6', async () => {
    const validStatuses = ['SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','ISSUED','CANCELLED'];
    const { data } = await callGateway('admin_list_orders');
    if (data && Array.isArray(data)) {
      data.forEach((o: any) => {
        expect(validStatuses).toContain(o.status);
      });
    }
  });
});
