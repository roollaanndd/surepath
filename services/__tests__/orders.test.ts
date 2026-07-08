// Unit tests for orders service — create, cancel, update status.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve({ data: [], error: null })) })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          gte: vi.fn(() => ({ lte: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: [], error: null })) })) })),
        })),
        in: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
  callGateway: vi.fn(async (action: string) => {
    if (action === 'create_policy_order') return { data: { id: 'ord-1', order_number: 'ORD-001', status: 'SUBMITTED' } };
    if (action === 'cancel_my_order') return { data: { id: 'ord-1', status: 'CANCELLED' } };
    if (action === 'admin_list_orders') return { data: [{ id: 'ord-1', order_number: 'ORD-001', status: 'SUBMITTED', total_premium: 500000 }] };
    if (action === 'admin_update_order') return { data: { id: 'ord-1', status: 'APPROVED' } };
    if (action === 'admin_stats') return { data: { totalOrders: 10, ordersByStatus: {}, totalPremiumIssued: 5000000, totalPremiumPaid: 4000000, activeAgents: 5, pendingCommissions: 500000, topAgents: [] } };
    if (action === 'admin_list_payments') return { data: [] };
    if (action === 'admin_financial_reports') return { data: { orders: [], commissions: [], claims: [] } };
    if (action === 'get_my_orders') return { data: [] };
    return { data: null, error: 'Unknown' };
  }),
}));

import { createPolicyOrder, cancelMyOrder, getAllOrders, updateOrderStatus, getAdminStats } from '../orders';

describe('Orders Service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createPolicyOrder returns order on success', async () => {
    const result = await createPolicyOrder({
      agent_id: 'agent-1', client_name: 'Test', product_code: 'CAR',
      product_name: 'Car Insurance', coverage_type: 'COMPREHENSIVE',
      sum_insured: 200000000, zone: 1, vehicle_category: 2,
      base_premium: 500000, addon_premium: 0, admin_fee: 50000,
      stamp_duty: 10000, total_premium: 560000, status: 'SUBMITTED',
      addons: {}, vehicle_details: {},
    } as any);
    expect(result).toBeDefined();
    expect(result?.order_number).toBe('ORD-001');
  });

  it('cancelMyOrder returns cancelled order', async () => {
    const result = await cancelMyOrder('ord-1');
    expect(result).toBeDefined();
    expect(result?.status).toBe('CANCELLED');
  });

  it('getAllOrders returns array', async () => {
    const result = await getAllOrders();
    expect(Array.isArray(result)).toBe(true);
  });

  it('updateOrderStatus returns true', async () => {
    const result = await updateOrderStatus('ord-1', 'APPROVED');
    expect(result).toBe(true);
  });

  it('getAdminStats returns stats object', async () => {
    const result = await getAdminStats();
    expect(result).toHaveProperty('totalOrders');
    expect(result).toHaveProperty('activeAgents');
  });
});
