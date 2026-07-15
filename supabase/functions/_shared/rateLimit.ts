// Shared, DB-backed rate limiter for SurePath edge functions.
//
// Bucketed per (identifier, action, UTC hour) in the sp_rate_limits table.
// First request in a bucket inserts (count=1, allowed); subsequent requests
// hit the unique-constraint insert error and fall back to the
// increment_rate_limit RPC, which atomically bumps the counter and returns
// the new count. Fails closed (denies) on any unexpected DB error.

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

export async function checkRateLimit(
  db: SupabaseLike,
  identifier: string,
  action: string,
  limit: number,
): Promise<boolean> {
  const now = new Date();
  const hourBucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}`;
  try {
    const { error: insErr } = await db.from('sp_rate_limits').insert({
      identifier, action, hour_bucket: hourBucket, request_count: 1, last_request: now.toISOString(),
    });
    if (insErr) {
      const { data, error: rpcErr } = await db.rpc('increment_rate_limit', {
        p_identifier: identifier, p_action: action, p_hour_bucket: hourBucket,
      });
      if (rpcErr) return false;
      return (data ?? 1) <= limit;
    }
    return true;
  } catch {
    return false;
  }
}
