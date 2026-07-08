// Unit tests for claims service — submit, list, update status.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve({ data: [], error: null })) })),
        })),
      })),
    })),
  },
  callGateway: vi.fn(async (action: string) => {
    if (action === 'submit_claim') return { data: { id: 'clm-1', status: 'SUBMITTED' } };
    if (action === 'admin_list_claims') return { data: [{ id: 'clm-1', status: 'SUBMITTED', claim_type: 'VEHICLE' }] };
    if (action === 'admin_update_claim') return { data: { id: 'clm-1', status: 'APPROVED' } };
    if (action === 'get_my_claims') return { data: [] };
    return { data: null, error: 'Unknown' };
  }),
}));

import { submitClaim, getAllClaims, updateClaimStatus, getCustomerClaims } from '../claims';

describe('Claims Service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('submitClaim returns claim on success', async () => {
    const result = await submitClaim({
      claim_type: 'VEHICLE', description: 'Test claim', location: 'Jakarta', amount_estimated: 5000000,
    } as any);
    expect(result).toBeDefined();
    expect(result?.status).toBe('SUBMITTED');
  });

  it('getAllClaims returns array', async () => {
    const result = await getAllClaims();
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('claim_type');
    }
  });

  it('updateClaimStatus returns true', async () => {
    const result = await updateClaimStatus('clm-1', 'APPROVED', 'Approved by admin');
    expect(result).toBe(true);
  });

  it('getCustomerClaims returns array', async () => {
    const result = await getCustomerClaims('user-1');
    expect(Array.isArray(result)).toBe(true);
  });
});
