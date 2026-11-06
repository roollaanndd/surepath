// ─────────────────────────────────────────────────────────────────────────────
// adminTools — Pathy sebagai asisten operasional MASTER_ADMIN/ADMIN.
//
// Permintaan pemilik (v2.8.0): Pathy diperkaya sampai bisa membantu proses
// admin. Aturan mainnya tetap sama dengan sisa Pathy:
//   • read-only — tidak ada satupun write di sini. Semua perubahan tetap
//     lewat UI CMS (admin_* actions) yang punya konfirmasi + audit sendiri.
//   • Hanya terdaftar untuk role MASTER_ADMIN/ADMIN — di schema DAN di guard
//     runtime setiap tool (dua lapis, pola yang sama dengan tool agen).
//   • Angka selalu dari DB, bukan dari model.
// ─────────────────────────────────────────────────────────────────────────────

import type { ToolContext, ToolOutcome } from './common.ts';
import { clamp, num, ORDER_COLUMNS, shapeClaim, shapeOrder, str } from './common.ts';

export const ADMIN_TOOL_ROLES = new Set(['MASTER_ADMIN', 'ADMIN']);

export const isAdminToolRole = (role: string) => ADMIN_TOOL_ROLES.has(role);

function requireAdmin(ctx: ToolContext): ToolOutcome | null {
  if (!isAdminToolRole(ctx.caller.role)) {
    return { result: { error: 'Tool ini hanya untuk MASTER_ADMIN/ADMIN.' } };
  }
  return null;
}

export function adminToolSchemas(): any[] {
  return [
    {
      type: 'function',
      function: {
        name: 'admin_overview',
        description:
          'Ringkasan operasional seluruh platform untuk admin: jumlah pengguna per peran, order 30 hari terakhir per status, ' +
          'klaim berjalan, penarikan menunggu, contact leads baru, dan pengajuan B2B menunggu. Pakai bila admin bertanya ' +
          '"kondisi platform", "ada apa hari ini", atau minta ringkasan umum.',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'admin_search_orders',
        description:
          'Cari order/polis LINTAS pengguna untuk admin: berdasarkan nomor order, nomor polis, nama klien, atau plat nomor. ' +
          'Read-only — hasilnya untuk dicek/dibantu, bukan diubah.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Nomor order/polis, nama klien, atau plat nomor (min. 3 karakter).' },
            limit: { type: 'integer', description: '1-15, default 8.' },
          },
          required: ['query'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'admin_claim_queue',
        description:
          'Antrean klaim seluruh platform untuk admin, terbaru dulu, bisa difilter status (SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, PAID). ' +
          'Read-only — keputusan klaim tetap milik insurer via alur resmi.',
        parameters: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter status. Kosongkan untuk semua yang belum selesai.' },
            limit: { type: 'integer', description: '1-20, default 10.' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'admin_contact_leads',
        description:
          'Prospek dari form kontak publik (sp_contact_leads): nama, kontak, pesan, status (NEW/CONTACTED/CLOSED). ' +
          'Bantu admin melihat siapa yang belum dihubungi.',
        parameters: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter status: NEW, CONTACTED, atau CLOSED. Default NEW.' },
            limit: { type: 'integer', description: '1-20, default 10.' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'admin_user_lookup',
        description:
          'Cari akun pengguna untuk admin berdasarkan email atau nama. Mengembalikan profil dasar (peran, kode agen, tanggal daftar) — ' +
          'tanpa data keuangan siapa pun.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Email atau nama (min. 3 karakter).' },
            limit: { type: 'integer', description: '1-8, default 5.' },
          },
          required: ['query'],
        },
      },
    },
  ];
}

const NAMES = new Set([
  'admin_overview', 'admin_search_orders', 'admin_claim_queue',
  'admin_contact_leads', 'admin_user_lookup',
]);

export const isAdminTool = (name: string) => NAMES.has(name);

// ─── Implementations ─────────────────────────────────────────────────────────

async function adminOverview(_args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  const db = ctx.db;

  const users = await db.from('sp_users').select('role').range(0, 2999);
  const roleTally: Record<string, number> = {};
  for (const u of users.data ?? []) roleTally[String(u.role)] = (roleTally[String(u.role)] ?? 0) + 1;

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const orders = await db.from('sp_policy_orders').select('status').gte('created_at', since).range(0, 2999);
  const orderTally: Record<string, number> = {};
  for (const o of orders.data ?? []) orderTally[String(o.status)] = (orderTally[String(o.status)] ?? 0) + 1;

  const [claims, withdrawals, leads, b2bSubs] = await Promise.all([
    db.from('sp_claims').select('status').in('status', ['SUBMITTED', 'UNDER_REVIEW']).range(0, 499),
    db.from('sp_withdrawals').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
    db.from('sp_contact_leads').select('id', { count: 'exact', head: true }).eq('status', 'NEW'),
    db.from('sp_b2b_submissions').select('id', { count: 'exact', head: true }).in('status', ['SUBMITTED', 'UNDER_REVIEW']),
  ]);

  return {
    result: {
      pengguna_per_peran: roleTally,
      catatan_pengguna: (users.data ?? []).length >= 3000 ? 'sampel 3000 pertama' : null,
      order_30_hari_per_status: orderTally,
      klaim_berjalan: (claims.data ?? []).length,
      penarikan_menunggu: withdrawals.count ?? 0,
      contact_leads_baru: leads.count ?? 0,
      b2b_menunggu_review: b2bSubs.count ?? 0,
    },
    card: {
      type: 'admin_overview',
      data: {
        users: roleTally,
        orders30d: orderTally,
        claimsActive: (claims.data ?? []).length,
        withdrawalsPending: withdrawals.count ?? 0,
        leadsNew: leads.count ?? 0,
        b2bPending: b2bSubs.count ?? 0,
      },
    },
  };
}

async function adminSearchOrders(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  const q = str(args.query, 60);
  if (q.length < 3) return { result: { error: 'Kata kunci minimal 3 karakter.' } };
  const limit = clamp(Math.round(num(args.limit, 8)), 1, 15);

  // PostgREST .or() grammar: nilai di-escape dari koma/kurung dan wildcard
  // user-controlled tidak diberikan — pola aman yang sama dengan gateway.
  const safe = q.replace(/[(),*%]/g, ' ').trim();
  const { data, error } = await ctx.db
    .from('sp_policy_orders')
    .select(ORDER_COLUMNS)
    .or(`order_number.ilike.%${safe}%,policy_number.ilike.%${safe}%,client_name.ilike.%${safe}%,plate_number.ilike.%${safe}%`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { result: { error: 'Pencarian gagal. Coba kata kunci lain.' } };

  return {
    result: { jumlah: (data ?? []).length, orders: (data ?? []).map(shapeOrder) },
    card: { type: 'admin_orders', data: { orders: (data ?? []).map(shapeOrder) } },
  };
}

async function adminClaimQueue(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  const status = str(args.status, 30).toUpperCase();
  const VALID = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID'];
  const limit = clamp(Math.round(num(args.limit, 10)), 1, 20);

  let query = ctx.db.from('sp_claims').select('*').order('created_at', { ascending: false }).limit(limit);
  if (status && VALID.includes(status)) query = query.eq('status', status);
  else if (!status) query = query.in('status', ['SUBMITTED', 'UNDER_REVIEW']);
  const { data, error } = await query;
  if (error) return { result: { error: 'Gagal membaca antrean klaim.' } };

  return {
    result: { jumlah: (data ?? []).length, claims: (data ?? []).map(shapeClaim) },
    card: { type: 'admin_claims', data: { claims: (data ?? []).map(shapeClaim) } },
  };
}

async function adminContactLeads(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  const status = str(args.status, 20).toUpperCase() || 'NEW';
  const VALID = ['NEW', 'CONTACTED', 'CLOSED'];
  const limit = clamp(Math.round(num(args.limit, 10)), 1, 20);
  if (!VALID.includes(status)) return { result: { error: `Status harus salah satu dari ${VALID.join(', ')}.` } };

  const { data, error } = await ctx.db
    .from('sp_contact_leads')
    .select('id,name,email,phone,subject,message,status,created_at')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { result: { error: 'Gagal membaca contact leads.' } };

  return {
    result: { status, jumlah: (data ?? []).length, leads: data ?? [] },
    card: { type: 'admin_leads', data: { status, leads: data ?? [] } },
  };
}

async function adminUserLookup(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  const q = str(args.query, 80);
  if (q.length < 3) return { result: { error: 'Kata kunci minimal 3 karakter.' } };
  const limit = clamp(Math.round(num(args.limit, 5)), 1, 8);

  const safe = q.replace(/[(),*%]/g, ' ').trim();
  const { data, error } = await ctx.db
    .from('sp_users')
    .select('id,name,email,role,agent_code,created_at')
    .or(`email.ilike.%${safe}%,name.ilike.%${safe}%`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { result: { error: 'Pencarian pengguna gagal.' } };

  return {
    result: { jumlah: (data ?? []).length, users: data ?? [] },
    card: { type: 'admin_users', data: { users: data ?? [] } },
  };
}

export async function runAdminTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolOutcome> {
  const denied = requireAdmin(ctx);
  if (denied) return denied;
  switch (name) {
    case 'admin_overview':       return await adminOverview(args, ctx);
    case 'admin_search_orders':  return await adminSearchOrders(args, ctx);
    case 'admin_claim_queue':    return await adminClaimQueue(args, ctx);
    case 'admin_contact_leads':  return await adminContactLeads(args, ctx);
    case 'admin_user_lookup':    return await adminUserLookup(args, ctx);
    default: return { result: { error: `Tool tidak dikenal: ${name}` } };
  }
}
