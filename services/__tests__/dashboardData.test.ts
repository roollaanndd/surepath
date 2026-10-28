import { describe, expect, it } from 'vitest';
import {
  buildDashboardModel,
  groupProducts,
  monthlySeries,
  renewalDays,
} from '../../components/admin/dashboardData';
import type { SpClaim, SpPolicyOrder, Withdrawal } from '../../services/dbTypes';

const NOW = new Date('2026-10-28T10:00:00+07:00');

const order = (over: Partial<SpPolicyOrder>): SpPolicyOrder => ({
  id: over.id ?? 'o1',
  agent_id: 'a1',
  client_name: 'Budi',
  product_code: 'CAR',
  product_name: 'Motor Vehicle',
  vehicle_details: {},
  coverage_type: 'COMPREHENSIVE',
  sum_insured: 200_000_000,
  zone: 2,
  vehicle_category: 3,
  addons: {},
  base_premium: 4_000_000,
  addon_premium: 0,
  admin_fee: 50_000,
  stamp_duty: 10_000,
  total_premium: 4_060_000,
  status: 'ISSUED',
  created_at: '2026-10-20T09:00:00+07:00',
  ...over,
} as SpPolicyOrder);

describe('data dashboard admin', () => {
  it('mengambil 4 produk terbesar lalu menggabungkan sisanya', () => {
    const orders = [
      ...Array.from({ length: 5 }, (_, i) => order({ id: `a${i}`, product_name: 'Motor' })),
      ...Array.from({ length: 3 }, (_, i) => order({ id: `b${i}`, product_name: 'Health' })),
      ...Array.from({ length: 2 }, (_, i) => order({ id: `c${i}`, product_name: 'Travel' })),
      order({ id: 'd1', product_name: 'Property' }),
      order({ id: 'e1', product_name: 'PA' }),
    ];
    const slices = groupProducts(orders);
    expect(slices).toHaveLength(5);
    expect(slices[0]).toMatchObject({ label: 'Motor', count: 5 });
    expect(slices.at(-1)).toMatchObject({ label: 'Lainnya', count: 1 });
  });

  it('mengabaikan order batal dan reject dari komposisi maupun seri', () => {
    const orders = [
      order({ id: 'ok', product_name: 'Motor' }),
      order({ id: 'x', product_name: 'Motor', status: 'CANCELLED' }),
      order({ id: 'y', product_name: 'Motor', status: 'REJECTED' }),
    ];
    expect(groupProducts(orders)).toHaveLength(1);
    expect(groupProducts(orders)[0].count).toBe(1);
    const months = monthlySeries(orders, NOW);
    expect(months.at(-1)?.premium).toBe(4_060_000);
    expect(months.at(-1)?.count).toBe(1);
  });

  it('menghasilkan tepat enam bulan berjalan', () => {
    const months = monthlySeries([], NOW);
    expect(months).toHaveLength(6);
    expect(months.at(-1)?.key).toBe('2026-10');
    expect(months[0].key).toBe('2026-05');
  });

  it('jatuh tempo hanya polis ISSUED yang berakhir bulan ini', () => {
    const orders = [
      order({ id: 'a', end_date: '2026-10-05T00:00:00+07:00' }),
      order({ id: 'b', end_date: '2026-10-05T00:00:00+07:00' }),
      order({ id: 'c', end_date: '2026-11-05T00:00:00+07:00' }),
      order({ id: 'd', end_date: '2026-10-09T00:00:00+07:00', status: 'SUBMITTED' }),
    ];
    expect(renewalDays(orders, NOW)).toEqual([{ day: 5, count: 2 }]);
  });

  it('menyusun KPI, delta, dan tugas dari data nyata', () => {
    const orders = [
      order({ id: '1', created_at: '2026-10-27T08:00:00+07:00', status: 'SUBMITTED', total_premium: 1_000_000 }),
      order({ id: '2', created_at: '2026-10-26T08:00:00+07:00', status: 'UNDER_REVIEW', total_premium: 2_000_000 }),
      order({ id: '3', created_at: '2026-09-20T08:00:00+07:00', status: 'ISSUED', total_premium: 3_000_000 }),
      order({ id: '4', created_at: '2026-10-01T08:00:00+07:00', status: 'ISSUED', total_premium: 4_000_000 }),
    ];
    const claims = [
      { id: 'c1', status: 'SUBMITTED', created_at: '2026-10-25T08:00:00+07:00', client_name: 'Sari' },
      { id: 'c2', status: 'PAID', created_at: '2026-10-01T08:00:00+07:00' },
    ] as unknown as SpClaim[];
    const withdrawals = [
      { id: 'w1', status: 'PENDING_L2', amount: 5_000_000, created_at: '2026-10-24T08:00:00+07:00', agent_name: 'Rina' },
    ] as unknown as Withdrawal[];

    const model = buildDashboardModel({
      orders, claims, withdrawals, tierPending: 2, activeAgents: 9, now: NOW,
    });

    expect(model.totals.orders).toBe(4);
    expect(model.totals.pendingOrders).toBe(2);
    expect(model.totals.issuedPremium).toBe(7_000_000);
    expect(model.totals.pendingClaims).toBe(1);
    expect(model.totals.pendingWithdrawals).toBe(1);
    expect(model.totals.withdrawalAmount).toBe(5_000_000);
    expect(model.deltas.orders).not.toBeNull();
    expect(model.tasks.map(t => t.kind)).toContain('order');
    expect(model.tasks.map(t => t.kind)).toContain('claim');
    expect(model.tasks.map(t => t.kind)).toContain('withdrawal');
    expect(model.tasks.map(t => t.kind)).toContain('tier');
    // Yang paling lama menunggu tampil lebih dulu.
    expect(model.tasks[0].ageDays).toBeGreaterThanOrEqual(model.tasks.at(-1)!.ageDays);
  });

  it('delta null bila periode pembanding kosong, bukan angka karangan', () => {
    const model = buildDashboardModel({
      orders: [order({ created_at: '2026-10-27T08:00:00+07:00' })],
      claims: [], withdrawals: [], tierPending: 0, activeAgents: 0, now: NOW,
    });
    expect(model.deltas.orders).toBeNull();
    expect(model.deltas.premium).toBeNull();
  });
});
