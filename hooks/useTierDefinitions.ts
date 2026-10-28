import { useState, useEffect } from 'react';
import { getTierDefinitions } from '../services/supabaseService';
import type { SpAgentTier } from '../services/dbTypes';

// Module-level cache — tier definitions are shared across many components
// (leaderboard, network, profile, home), but they are EDITABLE from the admin
// CMS (Tier & Promo panel). A cache that lives for the whole JS session means
// a long-lived PWA agent never sees admin changes until a full app reload —
// the reported "tier doesn't update" bug. So the cache now carries a TTL and
// is revalidated when the tab regains focus.
let cache: SpAgentTier[] | null = null;
let cacheAt = 0;
let inflight: Promise<SpAgentTier[]> | null = null;

/** Revalidate after 10 minutes, or sooner if the tab was hidden (mobile PWA
 *  users keep the app open for days — a hidden tab is the exact scenario
 *  where an admin assigns a new tier). */
const TTL_MS = 10 * 60 * 1000;

function isStale(): boolean {
  if (!cache) return true;
  if (Date.now() - cacheAt > TTL_MS) return true;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return true;
  return false;
}

async function load(force = false): Promise<SpAgentTier[]> {
  if (!force && cache && !isStale()) return cache;
  if (!inflight) {
    inflight = getTierDefinitions()
      .then(data => { cache = data; cacheAt = Date.now(); inflight = null; return data; })
      .catch(err => { inflight = null; throw err; });
  }
  return inflight;
}

export function invalidateTierDefinitionsCache(): void {
  cache = null;
  cacheAt = 0;
  inflight = null;
}

export function useTierDefinitions(): { tiers: SpAgentTier[]; loading: boolean } {
  const [tiers, setTiers] = useState<SpAgentTier[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let cancelled = false;
    // Stale-while-revalidate: render the cached list immediately, refresh in
    // the background when the entry is stale. The UI never blocks on this.
    if (cache && !isStale()) { setTiers(cache); setLoading(false); return; }
    setLoading(cache === null);
    load().then(data => { if (!cancelled) { setTiers(data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Revalidate on focus — covers PWA users who keep the app open while an
  // admin edits tier definitions or assignments.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !isStale()) return;
      load(true).then(data => setTiers(data)).catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  return { tiers, loading };
}

export function getTierByCode(tiers: SpAgentTier[], code?: string | null): SpAgentTier | null {
  if (!code) return null;
  return tiers.find(t => t.code === code) ?? null;
}
