import { useState, useEffect } from 'react';
import { getTierDefinitions } from '../services/supabaseService';
import type { SpAgentTier } from '../services/dbTypes';

// Module-level cache — tier definitions rarely change within a session and
// are shared across many components (leaderboard, network, profile, home).
let cache: SpAgentTier[] | null = null;
let inflight: Promise<SpAgentTier[]> | null = null;

async function load(): Promise<SpAgentTier[]> {
  if (cache) return cache;
  if (!inflight) inflight = getTierDefinitions().then(data => { cache = data; inflight = null; return data; });
  return inflight;
}

export function invalidateTierDefinitionsCache(): void {
  cache = null;
}

export function useTierDefinitions(): { tiers: SpAgentTier[]; loading: boolean } {
  const [tiers, setTiers] = useState<SpAgentTier[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let cancelled = false;
    if (cache) { setTiers(cache); setLoading(false); return; }
    load().then(data => { if (!cancelled) { setTiers(data); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  return { tiers, loading };
}

export function getTierByCode(tiers: SpAgentTier[], code?: string | null): SpAgentTier | null {
  if (!code) return null;
  return tiers.find(t => t.code === code) ?? null;
}
