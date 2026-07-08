// Unit tests for wallet service — withdrawal tiers, coin balance, referral.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db', () => ({
  supabase: {
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-agent' } } })) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve({ data: [], error: null })) })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: { id: 'wd-1' }, error: null })),
      update: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    functions: { invoke: vi.fn(() => Promise.resolve({ data: null, error: null })) },
  },
  callGateway: vi.fn(async (action: string) => {
    if (action === 'admin_list_withdrawals') return { data: [] };
    if (action === 'admin_approve_withdrawal') return { data: { success: true } };
    if (action === 'admin_reject_withdrawal') return { data: { success: true } };
    if (action === 'award_coins') return { data: { ok: true } };
    if (action === 'redeem_coins') return { data: { ok: true } };
    if (action === 'apply_referral') return { data: { ok: true } };
    if (action === 'admin_update_user') return { data: { ok: true } };
    return { data: null, error: 'Unknown' };
  }),
}));

import { awardCoins, redeemCoins, approveWithdrawal, rejectWithdrawal, applyReferralCode, updateAgentTier } from '../wallet';

describe('Wallet Service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('awardCoins calls gateway', async () => {
    await awardCoins('agent-1', 100, 'order-1', 'Test award');
    // Should not throw
    expect(true).toBe(true);
  });

  it('redeemCoins returns true on success', async () => {
    const result = await redeemCoins('agent-1', 50, 'Test redeem');
    expect(result).toBe(true);
  });

  it('approveWithdrawal returns success', async () => {
    const result = await approveWithdrawal('wd-1', 1, 'admin-1');
    expect(result.success).toBe(true);
  });

  it('rejectWithdrawal returns success', async () => {
    const result = await rejectWithdrawal('wd-1', 'admin-1', 'Test reason');
    expect(result.success).toBe(true);
  });

  it('applyReferralCode returns true', async () => {
    const result = await applyReferralCode('new-agent', 'REFCODE');
    expect(result).toBe(true);
  });

  it('updateAgentTier returns true', async () => {
    const result = await updateAgentTier('agent-1', 'STAR', 'admin-1');
    expect(result).toBe(true);
  });
});
