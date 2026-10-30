import { describe, it, expect } from 'vitest';
import { sanitizeFilterValue, sanitizeReference } from '../../supabase/functions/_shared/sanitize.ts';

/**
 * Parametric regression tests for the PostgREST `.or()` filter-injection fix
 * (audit 2026-10-28, P1-A; pattern established by FIX v2.6.18).
 *
 * The data-gateway edge function runs with service_role, so any user value
 * interpolated into a PostgREST filter string like
 *   .or(`vehicle_coverage.eq.${p.coverage_type},vehicle_coverage.eq.ALL`)
 * must be stripped to characters that cannot split or extend the predicate.
 */
describe('sanitizeFilterValue (PostgREST .or() interpolation)', () => {
  // (name, hostile input) — none of these may survive as filter metacharacters
  const injectionAttempts: Array<[string, string]> = [
    ['comma extends the OR clause', 'ALL,id.eq.11111111-1111-1111-1111-111111111111'],
    ['comma extends commission-rate match', 'TLO,base_commission_rate.eq.0.99'],
    ['parens group a predicate', 'ALL)(id.eq.X'],
    ['dot splits column.op.value', 'ALL.id.eq.X'],
    ['space breaks parsing', 'ALL , id.eq.X'],
    ['wildcard star', '*'],
    ['percent wildcard', '%%'],
    ['quote attempt', "ALL' OR '1'='1"],
    ['double-quote attempt', 'ALL"'],
    ['unicode comma', 'ALL，id.eq.X'],
    ['empty after strip — must be rejected by caller truthiness', ',,,'],
  ];

  for (const [name, hostile] of injectionAttempts) {
    it(`neutralizes: ${name}`, () => {
      const out = sanitizeFilterValue(hostile);
      // No PostgREST filter metacharacters may survive
      expect(out).not.toMatch(/[,()[\]{}.*"'`\\$&=!;:\s<>]/);
      // Result is a bare token
      expect(out).toMatch(/^[A-Za-z0-9_-]*$/);
      expect(out.length).toBeLessThanOrEqual(32);
    });
  }

  it('keeps legitimate coverage enums untouched', () => {
    const legit = ['COMPREHENSIVE', 'TLO', 'ALL', 'COMP', 'ALL-RISK', 'MV_TPL'];
    for (const v of legit) {
      expect(sanitizeFilterValue(v)).toBe(v);
    }
  });

  it('truncates to the requested length', () => {
    expect(sanitizeFilterValue('A'.repeat(200)).length).toBe(32);
    expect(sanitizeFilterValue('B'.repeat(40), 10)).toBe('B'.repeat(10));
  });

  it('coerces null/undefined to an empty string', () => {
    expect(sanitizeFilterValue(null)).toBe('');
    expect(sanitizeFilterValue(undefined)).toBe('');
    expect(sanitizeFilterValue(0)).toBe('0');
  });
});

describe('sanitizeReference (order/policy-number lookups)', () => {
  const injectionAttempts: Array<[string, string]> = [
    ['comma listed at both sites of the or() pair', 'SP-1,policy_number.eq.X'],
    ['parens grouping', 'SP-(1)'],
    ['spaces', 'SP 1 X'],
    ['wildcards', 'SP-1*'],
  ];

  for (const [name, hostile] of injectionAttempts) {
    it(`neutralizes: ${name}`, () => {
      const out = sanitizeReference(hostile);
      expect(out).not.toMatch(/[,(){}[\]`"'*%$;:]/);
      expect(out).not.toMatch(/\s/);
    });
  }

  it('keeps legitimate order/policy-number characters', () => {
    expect(sanitizeReference('SP-2026/X_1.2')).toBe('SP-2026/X_1.2');
    expect(sanitizeReference('Zurich_NH-123/456.Lok')).toBe('Zurich_NH-123/456.Lok');
  });

  it('truncates hostile length bombs', () => {
    expect(sanitizeReference('A/1.'.repeat(100)).length).toBe(100);
  });
});
