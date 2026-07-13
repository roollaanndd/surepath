// Foundation module for the Supabase data layer.
//
// Exports the singleton `supab` client and the `callGateway` helper used by
// every domain file. Split out of the original supabaseService.ts so domain
// modules can import these without creating cycles between themselves.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Data Gateway Client ─────────────────────────────────────────────────────
// Calls the data-gateway edge function with the current Supabase Auth session JWT.
// All sensitive table reads/writes should go through here instead of direct DB calls.

export async function callGateway(
  action: string,
  params?: Record<string, unknown>,
): Promise<{ data?: any; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { error: 'Not authenticated' };

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/data-gateway`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, params }),
    });
    return res.json();
  } catch (e) {
    return { error: String((e as Error)?.message ?? e) };
  }
}

// Like callGateway, but for the small set of PUBLIC_ACTIONS (data-gateway/index.ts)
// that are reachable without a Supabase Auth session — e.g. the unauthenticated
// insurer review-by-email-token flow. No Authorization header is sent; the
// gateway itself only dispatches actions in its PUBLIC_ACTIONS allowlist when
// no bearer token is present.
export async function callPublicGateway(
  action: string,
  params?: Record<string, unknown>,
): Promise<{ data?: any; error?: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/data-gateway`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, params }),
    });
    return res.json();
  } catch (e) {
    return { error: String((e as Error)?.message ?? e) };
  }
}
