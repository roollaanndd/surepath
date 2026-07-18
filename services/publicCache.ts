// publicCache.ts — tiny TTL cache for PUBLIC, read-heavy, rarely-changing data
// (website CMS sections, active OJK rate set, …).
//
// Why: every anonymous page view fired its own Supabase REST reads for the
// same handful of rows. Under load (100+ concurrent visitors) that is pure
// duplicated read traffic. This cache serves from memory/localStorage inside
// the TTL and refreshes in the background (stale-while-revalidate), so the
// database sees one read per client per TTL window instead of one per view.
//
// NEVER use this for per-user or sensitive data — public rows only.

interface Entry<T> { v: T; t: number }

const mem = new Map<string, Entry<unknown>>();
const LS_PREFIX = 'sp_pc_';

function lsGet<T>(key: string): Entry<T> | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? JSON.parse(raw) as Entry<T> : null;
  } catch { return null; }
}

function lsSet<T>(key: string, entry: Entry<T>): void {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry)); } catch { /* quota/private mode */ }
}

/**
 * Serve `key` from cache when fresher than `ttlMs`; otherwise (or when only a
 * stale copy exists) call `fetcher`. A stale copy is returned immediately
 * while the fetcher refreshes it in the background (SWR).
 * `null`/`undefined` results are not cached, so transient failures retry.
 */
export async function cachedFetch<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = (mem.get(key) as Entry<T> | undefined) ?? lsGet<T>(key);

  if (hit) {
    if (!mem.has(key)) mem.set(key, hit);
    if (now - hit.t < ttlMs) return hit.v;
    // Stale — refresh in background, serve the stale value now.
    fetcher().then(v => {
      if (v != null) { const e = { v, t: Date.now() }; mem.set(key, e); lsSet(key, e); }
    }).catch(() => {});
    return hit.v;
  }

  const v = await fetcher();
  if (v != null) { const e = { v, t: now }; mem.set(key, e); lsSet(key, e); }
  return v;
}

/** Drop cached entries whose key starts with `prefix` (both layers). */
export function invalidatePublicCache(prefix: string): void {
  for (const k of [...mem.keys()]) if (k.startsWith(prefix)) mem.delete(k);
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_PREFIX + prefix)) localStorage.removeItem(k);
    }
  } catch { /* noop */ }
}
