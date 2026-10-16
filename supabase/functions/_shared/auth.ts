// Shared JWT verification helper for SurePath edge functions.

import { createClient } from 'npm:@supabase/supabase-js@2';

const ADMIN_ROLES = ['MASTER_ADMIN', 'ADMIN', 'FINANCE', 'FINANCE_MANAGER', 'FINANCE_DIRECTOR', 'INSURANCE_ADMIN'];

export interface AuthCaller {
  authId: string;
  email: string;
  role: string | null;
  isAdmin: boolean;
}

export interface AuthResult {
  caller?: AuthCaller;
  errorResponse?: Response;
}

/**
 * Verifies the Supabase Auth JWT in the Authorization header.
 * Optionally looks up the caller's sp_users role when serviceKey is provided.
 * Returns { caller } on success or { errorResponse } on failure.
 */
export async function verifyAuth(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
  serviceKey?: string,
  corsHeaders: Record<string, string> = {},
): Promise<AuthResult> {
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return { errorResponse: json({ error: 'Unauthorized: missing bearer token' }, 401) };
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData?.user) {
    return { errorResponse: json({ error: 'Unauthorized: invalid token' }, 401) };
  }

  const authId = userData.user.id;
  const email = (userData.user.email ?? '').toLowerCase();

  let role: string | null = null;
  if (serviceKey) {
    const db = createClient(supabaseUrl, serviceKey);

    // Use parameterized equality filters rather than interpolating identity data
    // into PostgREST's .or() filter grammar. Prefer the immutable Auth user ID;
    // fall back to email only for legacy profiles whose row ID differs.
    const { data: userById, error: idLookupError } = await db
      .from('sp_users')
      .select('role')
      .eq('id', authId)
      .maybeSingle();

    if (idLookupError) {
      console.error('Auth role lookup by ID failed:', idLookupError.code ?? 'unknown');
      return { errorResponse: json({ error: 'Unable to verify account permissions' }, 503) };
    }

    let spUser = userById;
    if (!spUser && email) {
      const { data: userByEmail, error: emailLookupError } = await db
        .from('sp_users')
        .select('role')
        .eq('email', email)
        .maybeSingle();

      if (emailLookupError) {
        console.error('Auth role lookup by email failed:', emailLookupError.code ?? 'unknown');
        return { errorResponse: json({ error: 'Unable to verify account permissions' }, 503) };
      }
      spUser = userByEmail;
    }

    role = spUser?.role ?? null;
  }

  return {
    caller: {
      authId,
      email,
      role,
      isAdmin: ADMIN_ROLES.includes(role ?? ''),
    },
  };
}

export function adminOnly(
  caller: AuthCaller,
  corsHeaders: Record<string, string> = {},
): Response | null {
  if (!caller.isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return null;
}
