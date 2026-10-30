// Shared sanitizers for values interpolated into PostgREST filter strings.
//
// PostgREST parses an `.or("col.eq.VALUE,...")` filter from a string — the
// value is NOT bound as a parameter. A value containing `,` (condition
// separator), `.` (column.op value separator), or `()` (predicate grouping)
// would rewrite the predicate instead of being matched literally. With the
// gateway running as service_role, that means filter injection across
// tenants/data boundaries.
//
// FIX pattern introduced by the v2.6.18 audit additionally allowed
// [._/-] for order/policy-number style lookups; see sanitizeReference().
// Reusable here so every interpolation site goes through one tested
// implementation.

export function sanitizeFilterValue(raw: unknown, maxLength = 32): string {
  return String(raw ?? '')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, maxLength);
}

/**
 * For order/policy/reference numbers which may legitimately contain
 * dots, slashes, and dashes (e.g. `SP-2026/X/1.2`): strips everything outside
 * [A-Za-z0-9._/-]. NOTE: `/` and `.` are kept for the domain but must never be
 * combined with multi-clause `.or()` values built from user input — the
 * callers of this variant interpolate a single `col.eq.<value>` predicate at a
 * position where the value is the final segment, or the full match string of
 * `or(a.eq.X,b.eq.X)` where a stripped `,` guarantees one condition per clause.
 * Do NOT relax the allowlist beyond this.
 */
export function sanitizeReference(raw: unknown, maxLength = 100): string {
  return String(raw ?? '')
    .replace(/[^A-Za-z0-9._/-]/g, '')
    .slice(0, maxLength);
}
