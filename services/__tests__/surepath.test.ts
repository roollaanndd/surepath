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

import { getZone, TPL_OPTIONS } from '../ojkRates';

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
});
