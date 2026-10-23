// Unit tests for operator service — queue summary, orders, agents, notifications.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db', () => ({
  supabase: { auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: { access_token: 'jwt' } } })) } },
  callGateway: vi.fn(async (action: string) => {
    if (action === 'admin_queue_summary') return { data: { pendingOrders: 3, pendingClaims: 1, pendingWithdrawals: 2, pendingAgents: 4, unreadNotifications: 8, paidPayments: 50, pendingPayments: 3 } };
    if (action === 'admin_list_orders') return { data: [{ id: 'o1', order_number: 'ORD-001', client_name: 'Test', status: 'SUBMITTED', total_premium: 500000 }] };
    if (action === 'admin_list_claims') return { data: [{ id: 'c1', status: 'SUBMITTED', claim_type: 'VEHICLE' }] };
    if (action === 'admin_list_withdrawals') return { data: [{ id: 'w1', agent_id: 'a1', amount: 1000000, status: 'PENDING_L1', sp_users: { name: 'Agent', email: 'a@t.com', phone: '123' } }] };
    if (action === 'admin_list_pending_agents') return { data: [{ id: 'a1', name: 'Agent', email: 'a@t.com', verified: false }] };
    if (action === 'admin_list_notifications') return { data: [{ id: 'n1', type: 'NEW_ORDER', title: 'Test', read: false, created_at: new Date().toISOString() }] };
    if (action === 'admin_verify_agent') return { data: { success: true } };
    if (action === 'admin_update_order') return { data: { id: 'o1', status: 'APPROVED' } };
    if (action === 'admin_update_claim') return { data: { id: 'c1', status: 'APPROVED' } };
    if (action === 'admin_approve_withdrawal') return { data: { success: true } };
    if (action === 'admin_reject_withdrawal') return { data: { success: true } };
    if (action === 'admin_mark_notification_read') return { data: { success: true } };
    if (action === 'admin_mark_all_notifications_read') return { data: { success: true } };
    if (action === 'admin_send_insurer_review_link') return { data: { review_url: 'https://test.com/review/abc', insurer_email: 'test@insurer.com' } };
    if (action === 'admin_get_agent_detail') return { data: { agent: { id: 'a1', name: 'Agent', verified: false }, agreements: [] } };
    return { data: null, error: 'Unknown' };
  }),
}));

import {
  getQueueSummary, listOrders, updateOrderStatus, sendInsurerReviewLink,
  listClaims, updateClaimStatus, listWithdrawals, rejectWithdrawal,
  listPendingAgents, getAgentDetail, verifyAgent, rejectAgent,
  listNotifications, markNotificationRead, markAllNotificationsRead,
} from '../operatorService';

describe('Operator Service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getQueueSummary returns all 7 fields', async () => {
    const result = await getQueueSummary();
    expect(result.pendingOrders).toBe(3);
    expect(result.pendingClaims).toBe(1);
    expect(result.pendingWithdrawals).toBe(2);
    expect(result.pendingAgents).toBe(4);
    expect(result.unreadNotifications).toBe(8);
    expect(result.paidPayments).toBe(50);
    expect(result.pendingPayments).toBe(3);
  });

  it('listOrders returns array', async () => {
    const result = await listOrders();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
  });

  it('updateOrderStatus returns updated order', async () => {
    const result = await updateOrderStatus('o1', 'APPROVED', 'Notes');
    expect(result.status).toBe('APPROVED');
  });

  it('sendInsurerReviewLink returns URL + email', async () => {
    const result = await sendInsurerReviewLink('o1');
    expect(result.reviewUrl).toContain('/review/');
    expect(result.insurerEmail).toBe('test@insurer.com');
  });

  it('listClaims returns array', async () => {
    const result = await listClaims();
    expect(result.length).toBe(1);
  });

  it('updateClaimStatus returns updated claim', async () => {
    const result = await updateClaimStatus('c1', 'APPROVED', 'Notes');
    expect(result.status).toBe('APPROVED');
  });

  it('listWithdrawals flattens agent info', async () => {
    const result = await listWithdrawals();
    expect(result[0].agent_name).toBe('Agent');
    expect(result[0].agent_email).toBe('a@t.com');
  });

  it('rejectWithdrawal does not throw', async () => {
    await expect(rejectWithdrawal('w1', 'Test reason')).resolves.not.toThrow();
  });

  it('listPendingAgents returns unverified agents', async () => {
    const result = await listPendingAgents();
    expect(result.length).toBe(1);
    expect(result[0].verified).toBe(false);
  });

  it('getAgentDetail returns agent + agreements', async () => {
    const result = await getAgentDetail('a1');
    expect(result.agent.name).toBe('Agent');
    expect(Array.isArray(result.agreements)).toBe(true);
  });

  it('verifyAgent does not throw', async () => {
    await expect(verifyAgent('a1')).resolves.not.toThrow();
  });

  it('rejectAgent does not throw', async () => {
    await expect(rejectAgent('a1')).resolves.not.toThrow();
  });

  it('listNotifications returns array', async () => {
    const result = await listNotifications();
    expect(result.length).toBe(1);
    expect(result[0].type).toBe('NEW_ORDER');
  });

  it('markNotificationRead does not throw', async () => {
    await expect(markNotificationRead('n1')).resolves.not.toThrow();
  });

  it('markAllNotificationsRead does not throw', async () => {
    await expect(markAllNotificationsRead()).resolves.not.toThrow();
  });
});
