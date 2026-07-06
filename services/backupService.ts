// Automated encrypted daily backup service
// Backs up both IndexedDB and Supabase tables to public.backups (insert-only RLS)

import { db } from '../db';
import { supabase } from './supabaseService';

const LAST_BACKUP_KEY = 'sp_last_auto_backup';
const BACKUP_INTERVAL_MS = 23 * 60 * 60 * 1000; // trigger once per 23 h
const BACKUP_SALT = 'SurePath-Backup-Salt-v1';

// ── Crypto helpers ────────────────────────────────────────────────────────────

async function deriveKey(adminKey: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const raw = await crypto.subtle.importKey('raw', enc.encode(adminKey), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(BACKUP_SALT), iterations: 100_000, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptJSON(json: string, adminKey: string): Promise<string> {
  const key = await deriveKey(adminKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(json));
  const buf = new Uint8Array(12 + enc.byteLength);
  buf.set(iv, 0);
  buf.set(new Uint8Array(enc), 12);
  return btoa(String.fromCharCode(...buf));
}

export async function decryptBackup(encryptedB64: string, adminKey: string): Promise<string> {
  const key = await deriveKey(adminKey);
  const buf = Uint8Array.from(atob(encryptedB64), c => c.charCodeAt(0));
  const iv = buf.slice(0, 12);
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, buf.slice(12));
  return new TextDecoder().decode(dec);
}

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Data collection ───────────────────────────────────────────────────────────

async function collectIndexedDB() {
  const [usersRaw, policies, claims, transactions, auditLogs, providers, customProducts] = await Promise.all([
    db.users.toArray(),
    db.policies.toArray(),
    db.claims.toArray(),
    db.transactions.toArray(),
    db.auditLogs.toArray(),
    db.providers.toArray(),
    db.customProducts.toArray(),
  ]);
  // Strip password hashes from export
  const users = usersRaw.map(({ passwordHash: _h, salt: _s, ...rest }) => rest);
  return { users, policies, claims, transactions, auditLogs, providers, customProducts };
}

async function collectSupabase() {
  const tables = ['sp_users', 'sp_clients', 'sp_policies', 'sp_commissions', 'sp_claims', 'sp_policy_orders', 'sp_quotes', 'sp_insurers', 'sp_insurer_products'] as const;
  const results = await Promise.all(tables.map(t => supabase.from(t).select('*').then(r => r.data ?? [])));
  return Object.fromEntries(tables.map((t, i) => [t, results[i]]));
}

// ── Public API ────────────────────────────────────────────────────────────────

export type BackupRecord = BackupMeta;
export interface BackupMeta {
  id: number;
  label: string;
  backup_type: string;
  row_counts: Record<string, number>;
  tables_list: string[];
  backup_size_bytes: number;
  checksum: string;
  created_at: string;
}

export async function listBackups(): Promise<BackupMeta[]> {
  const { data } = await supabase
    .from('backups')
    .select('id, label, backup_type, row_counts, tables_list, backup_size_bytes, checksum, created_at')
    .order('created_at', { ascending: false })
    .limit(30);
  return (data as BackupMeta[]) ?? [];
}

export interface BackupResult {
  success: boolean;
  label: string;
  rowCounts: Record<string, number>;
  sizeBytes: number;
  error?: string;
}

export async function performBackup(adminKey?: string, type: 'AUTO' | 'MANUAL' = 'MANUAL'): Promise<BackupResult> {
  try {
    const [idb, supa] = await Promise.all([collectIndexedDB(), collectSupabase()]);
    const payload = { version: 'SP_BACKUP_v2', exportedAt: new Date().toISOString(), indexeddb: idb, supabase: supa };
    const json = JSON.stringify(payload);
    const checksum = await sha256hex(json);

    const rowCounts: Record<string, number> = {
      ...Object.fromEntries(Object.entries(idb).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])),
      ...Object.fromEntries(Object.entries(supa).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])),
    };
    const tablesList = [...Object.keys(idb), ...Object.keys(supa)];

    const encryptedData = adminKey ? await encryptJSON(json, adminKey) : null;
    const label = `${type.toLowerCase()}_${new Date().toISOString().split('T')[0]}_${Date.now()}`;

    const { error } = await supabase.from('backups').insert({
      label,
      payload: { rowCounts, exportedAt: payload.exportedAt, checksum },
      row_counts: rowCounts,
      encrypted_data: encryptedData,
      checksum,
      backup_type: type,
      tables_list: tablesList,
      backup_size_bytes: json.length,
    });

    if (error) throw new Error(error.message);

    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
    return { success: true, label, rowCounts, sizeBytes: json.length };
  } catch (e: any) {
    return { success: false, label: '', rowCounts: {}, sizeBytes: 0, error: e.message };
  }
}

export async function downloadBackup(backupId: number | string): Promise<void> {
  const { data } = await supabase
    .from('backups')
    .select('label, payload, row_counts, created_at')
    .eq('id', Number(backupId))
    .single();
  if (!data) return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.label ?? 'surepath_backup'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function shouldAutoBackup(): boolean {
  const last = localStorage.getItem(LAST_BACKUP_KEY);
  if (!last) return true;
  return Date.now() - new Date(last).getTime() > BACKUP_INTERVAL_MS;
}

export function getLastBackupTime(): Date | null {
  const last = localStorage.getItem(LAST_BACKUP_KEY);
  return last ? new Date(last) : null;
}
