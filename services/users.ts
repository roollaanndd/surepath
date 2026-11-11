// Agent / user profile management.
//
// All functions that read or write the `sp_users` table (agent profiles,
// customer profiles, B2B client profiles, admin user lookups, verification
// toggles, B2B profile helpers) live here.

import { supabase, callGateway } from './db';
import type { SpUser } from './dbTypes';

// ─── Agent Profile ────────────────────────────────────────────────────────────

export async function getAgentProfile(agentId: string): Promise<SpUser | null> {
  const { data, error } = await callGateway('get_user_profile', { user_id: agentId });
  if (error) return null;
  return (data as SpUser) ?? null;
}

export async function updateAgentProfile(
  _agentId: string,
  updates: { name?: string; phone?: string; address?: string },
): Promise<boolean> {
  const { error } = await callGateway('update_my_profile', updates);
  if (error) { console.error('updateAgentProfile:', error); return false; }
  return true;
}

export async function getAgentByEmail(_email: string): Promise<SpUser | null> {
  // Always called with the current user's own email after Supabase Auth sign-in.
  // Route through the gateway so the result is always the authenticated caller's
  // own profile, avoiding a direct open query on sp_users.
  const { data, error } = await callGateway('get_my_profile');
  if (error || !data) return null;
  return data as SpUser;
}

// Returns the current user's profile, creating it server-side (from the
// verified JWT identity) if it doesn't exist yet. Safe to call repeatedly.
//
// ROLE STICKINESS: the gateway ignores `role` if a profile already exists —
// once picked, the user's role is immutable through this endpoint. The `existed`
// flag on the return tells the caller whether the profile was pre-existing
// (so they can respect it) or freshly created (so the caller's requested role
// was honored).
export async function ensureProfile(params?: {
  name?: string;
  phone?: string;
  role?: 'CUSTOMER' | 'AGENT';
  ktp?: string | null;
  address?: string | null;
  referral_code?: string | null;
}): Promise<(SpUser & { __existed?: boolean }) | null> {
  const res = await callGateway('ensure_profile', params);
  if (res.error) {
    console.error('ensureProfile error:', res.error);
    return null;
  }
  if (!res.data) return null;
  return { ...(res.data as SpUser), __existed: res.existed === true };
}

// Fetch-only variant used on login. Distinguishes:
//   - profile found         → { profile }
//   - server says no profile → { noProfile: true }         (safe to show role picker)
//   - transient failure      → { transientError: true }    (do NOT create a wrong-role row)
// Retries transient errors with exponential backoff up to `retries` attempts.
export async function fetchMyProfileForLogin(
  retries = 3,
): Promise<
  | { profile: SpUser; noProfile?: false; transientError?: false }
  | { profile?: null; noProfile: true; transientError?: false }
  | { profile?: null; noProfile?: false; transientError: true; lastError?: string }
> {
  let lastError: string | undefined;
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await callGateway('get_my_profile');
    if (res.data) return { profile: res.data as SpUser };
    // 404 with the specific "no profile" body → genuinely new user
    if (res.status === 404) return { noProfile: true };
    // Anything else — 401 (auth), 5xx (server), network abort — is transient.
    lastError = res.error;
    if (attempt < retries - 1) {
      await new Promise(r => setTimeout(r, 800 * (attempt + 1))); // 0.8s, 1.6s, 2.4s
    }
  }
  return { transientError: true, lastError };
}

// ─── Tingkat kepercayaan akun (gerbang verifikasi) ───────────────────────────
//
// Aturannya hidup di satu tempat di server (`supabase/functions/_shared/trust.ts`)
// dan `get_my_profile` mengembalikan hasilnya, jadi klien TIDAK menyalin aturan
// tier — termasuk masa tenggang akun lama, yang kalau disalin salah akan
// mengunci mitra lama dari fitur yang sebenarnya masih boleh mereka pakai.
//
// 0 = belum tepercaya · 1 = email wajar, menunggu verifikasi · 2 = terverifikasi penuh.
export type AccountTrustTier = 0 | 1 | 2;

export interface AccountTrust {
  tier: AccountTrustTier;
  /** Alasan dari server, dalam Bahasa Indonesia. */
  reasons: string[];
}

/**
 * Tier kepercayaan caller. `null` berarti belum bisa dipastikan (jaringan,
 * atau gateway belum di-deploy dengan field ini) — pemanggil harus memilih
 * sikap terbuka, karena server tetap penjaga sebenarnya untuk setiap aksi
 * berisiko. Mengunci UI atas dugaan hanya menghukum pengguna yang sah.
 */
export async function getMyAccountTrust(): Promise<AccountTrust | null> {
  const { data, error } = await callGateway('get_my_profile');
  if (error || !data) return null;
  const tier = (data as any).trust_tier;
  if (tier !== 0 && tier !== 1 && tier !== 2) return null;
  return { tier, reasons: Array.isArray((data as any).trust_reasons) ? (data as any).trust_reasons : [] };
}

export async function getUserByEmail(_email: string): Promise<SpUser | null> {
  // Same as above — always fetches the current authenticated user's own profile.
  const { data, error } = await callGateway('get_my_profile');
  if (error || !data) return null;
  return data as SpUser;
}

// ─── Admin: Agent Management (via data-gateway) ───────────────────────────────

export async function getAllAgents(): Promise<SpUser[]> {
  // v2.7.56: layar Manajemen Mitra kini juga menampung Klien B2B buatan admin
  // (role B2B_CLIENT) supaya aksi reset/kata sandi sementara terjangkau dari
  // layar yang sama.
  const { data, error } = await callGateway('admin_list_users', { roles: ['AGENT', 'B2B_CLIENT'], limit: 500 });
  if (error) { console.error('getAllAgents:', error); return []; }
  return (data ?? []) as SpUser[];
}

export async function getAdminUser(userId: string): Promise<SpUser | null> {
  const { data, error } = await callGateway('admin_get_user', { user_id: userId });
  if (error) { console.error('getAdminUser:', error); return null; }
  return data as SpUser ?? null;
}

export async function updateAgentVerification(agentId: string, verified: boolean): Promise<boolean> {
  const { error } = await callGateway('admin_update_user', { user_id: agentId, verified });
  if (error) { console.error('updateAgentVerification:', error); return false; }
  return true;
}

export async function updateAgentCommissionRate(agentId: string, rate: number): Promise<boolean> {
  const { error } = await callGateway('admin_update_user', { user_id: agentId, commission_rate: rate });
  if (error) { console.error('updateAgentCommissionRate:', error); return false; }
  return true;
}

// ─── Agent Registration ───────────────────────────────────────────────────────

export async function registerAgent(data: {
  name: string;
  email: string;
  phone: string;
  ktp?: string;
  address?: string;
}): Promise<SpUser | null> {
  const { data: result, error } = await callGateway('admin_register_agent', data);
  if (error) { console.error('registerAgent:', error); return null; }
  return result as SpUser;
}

// ─── Kelola akun mitra dari CMS admin (v2.7.6) ───────────────────────────────
//
// Semua pekerjaan istimewanya ada di supabase/functions/data-gateway/actions/
// mitraAccounts.ts; fungsi-fungsi di sini cuma pembungkus bertipe. Yang penting
// untuk diingat pemanggilnya: `temp_password` HANYA ada di respons, tidak
// pernah di basis data, jadi kalau layar itu ditutup kata sandinya hilang dan
// harus disetel ulang.

export interface CreateMitraInput {
  name: string;
  email: string;
  phone: string;
  ktp?: string | null;
  address?: string | null;
  upline_code?: string | null;
  /** v2.7.56: tipe akun — 'AGENT' (bawaan) atau 'B2B_CLIENT'. */
  role?: 'AGENT' | 'B2B_CLIENT';
  /** Nama perusahaan untuk B2B_CLIENT; disimpan ke kolom address profil. */
  company_name?: string | null;
  /** 'invite' mengirim email undangan; 'temp' mengembalikan kata sandi sementara (MASTER_ADMIN). */
  mode?: 'invite' | 'temp';
  /** v2.7.56: sandi buatan admin untuk mode 'temp'. Kosong = dibuat otomatis. */
  password?: string | null;
}

export async function createMitra(
  input: CreateMitraInput,
): Promise<{ agent?: SpUser; tempPassword?: string | null; mode?: string; error?: string }> {
  const res = await callGateway('admin_create_mitra', input as unknown as Record<string, unknown>);
  if (res.error) return { error: res.error };
  return {
    agent: res.data as SpUser,
    tempPassword: (res.temp_password as string | null) ?? null,
    mode: res.mode as string | undefined,
  };
}

export async function sendMitraPasswordReset(
  userId: string,
): Promise<{ email?: string; recoveryLink?: string | null; error?: string }> {
  const res = await callGateway('admin_send_mitra_reset', { user_id: userId });
  if (res.error) return { error: res.error };
  return { email: res.data?.email, recoveryLink: (res.recovery_link as string | null) ?? null };
}

export async function setMitraTempPassword(
  userId: string,
  requireChange = true,
  password?: string | null,
): Promise<{ tempPassword?: string; email?: string; error?: string }> {
  const res = await callGateway('admin_set_mitra_temp_password', {
    user_id: userId,
    require_change: requireChange,
    // v2.7.56: sandi buatan admin opsional — kosong/undefined = generator.
    password: password || null,
  });
  if (res.error) return { error: res.error };
  return { tempPassword: res.temp_password as string, email: res.data?.email };
}

export async function createCustomerProfile(data: {
  id: string;
  name: string;
  email: string;
  phone: string;
}): Promise<SpUser | null> {
  const payload = {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: 'CUSTOMER',
    trust_score: 85,
    verified: true,
  };
  const { data: result, error } = await supabase
    .from('sp_users')
    .insert(payload)
    .select()
    .single();
  if (error) return null;
  return result as SpUser;
}

export async function createB2BClientProfile(data: {
  id: string;
  name: string;
  email: string;
  phone: string;
  company_name?: string;
}): Promise<SpUser | null> {
  const payload = {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: 'B2B_CLIENT',
    address: data.company_name ?? null,
    trust_score: 85,
    verified: false,
  };
  const { data: result, error } = await supabase
    .from('sp_users')
    .insert(payload)
    .select()
    .single();
  if (error) return null;
  return result as SpUser;
}

// ─── B2B Profile Helpers ──────────────────────────────────────────────────────

export async function getB2BProfile(clientId: string): Promise<SpUser | null> {
  return getAgentProfile(clientId);
}

export async function updateB2BProfile(
  clientId: string,
  data: Partial<SpUser>
): Promise<boolean> {
  const { error } = await supabase
    .from('sp_users')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', clientId);
  if (error) { console.error('updateB2BProfile:', error); return false; }
  return true;
}
