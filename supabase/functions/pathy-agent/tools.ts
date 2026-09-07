// Pathy agent tools — the only things the model is allowed to do.
//
// Every tool runs server-side with the service_role client and is scoped to
// the *verified* caller: identity fields (agent_id / client_id / user_id) are
// always taken from the resolved caller, never from model-supplied arguments.
// The model can therefore hallucinate an id all it wants and still only ever
// read or write the caller's own rows.
//
// Read tools are unrestricted. There is exactly one write tool
// (create_quote → sp_quotes, a non-binding penawaran). Nothing here touches
// money tables (sp_agent_wallets, sp_wallet_transactions, sp_commissions are
// read-only), orders, claims, or payments.

import {
  loadRateSet, calcPremium, getZone, type AddOns, type CoverageType,
  type OjkBand, type RateSet, type VehicleType, type Zone,
} from '../_shared/ojk.ts';

export interface PathyCaller {
  authId: string;
  ownerId: string;
  ownerIds: string[];
  role: string;
  name: string;
  email: string;
}

export interface ToolContext {
  // deno-lint-ignore no-explicit-any
  db: any;
  caller: PathyCaller;
  rateSet?: RateSet;
}

// A card is structured data the chat UI renders as a rich block instead of
// leaving the model to re-type numbers into prose (where it can drift).
export interface PathyCard {
  type: 'policies' | 'policy_detail' | 'claims' | 'quotes' | 'premium' | 'quote_created' | 'sales_report' | 'products';
  // deno-lint-ignore no-explicit-any
  data: any;
}

export interface ToolOutcome {
  // deno-lint-ignore no-explicit-any
  result: any;
  card?: PathyCard;
}

const AGENT_ROLES = new Set(['AGENT', 'AGENT_LEADER', 'MASTER_ADMIN', 'ADMIN']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isAgentSide = (role: string) => AGENT_ROLES.has(role);
const safeIds = (ids: string[]) => ids.filter(id => UUID_RE.test(id));
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const str = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max);

// ─── Product catalogue ───────────────────────────────────────────────────────
// Kept deliberately short: claims here are the ones the product pages make.
// Anything not listed, Pathy must not invent.
const PRODUCT_CATALOGUE = [
  {
    code: 'CAR', name: 'Car Protection (Asuransi Mobil)',
    coverage: 'COMPREHENSIVE / TLO', quotable: true,
    summary: 'Asuransi kendaraan bermotor: kerugian sebagian (Comprehensive) atau hanya kerugian total (TLO). Perluasan banjir, gempa, huru-hara, TPL, dan PA tersedia.',
  },
  {
    code: 'MOTOR', name: 'Motor Protection (Asuransi Motor)',
    coverage: 'COMPREHENSIVE / TLO', quotable: true,
    summary: 'Asuransi sepeda motor dengan tarif OJK Roda 2. Comprehensive atau TLO.',
  },
  {
    code: 'TRAVEL', name: 'Travel Safe (Asuransi Perjalanan)',
    coverage: 'Paket', quotable: false,
    summary: 'Perjalanan domestik & internasional: perlindungan medis darurat, keterlambatan penerbangan, kehilangan bagasi, pembatalan perjalanan.',
  },
  {
    code: 'PA', name: 'Personal Safety (Kecelakaan Diri)',
    coverage: 'Paket', quotable: false,
    summary: 'Santunan kecelakaan diri: cacat tetap, meninggal dunia, dan biaya medis akibat kecelakaan. Pendaftaran online singkat.',
  },
  {
    code: 'MPAR', name: 'Proteksi Barang (Gadget & Elektronik)',
    coverage: 'Paket', quotable: false,
    summary: 'Perlindungan gadget dan elektronik terhadap kerusakan tidak disengaja dan pencurian, dengan teknisi rekanan kami.',
  },
];

// ─── Tool schemas (OpenAI function-calling format) ───────────────────────────

export function toolSchemas(role: string) {
  const tools = [
    {
      type: 'function',
      function: {
        name: 'get_my_policies',
        description:
          'Ambil daftar polis / order asuransi milik pengguna yang sedang login. ' +
          'Untuk AGENT mengembalikan order yang dia jual; untuk CUSTOMER mengembalikan polisnya sendiri. ' +
          'Gunakan ini setiap kali pengguna bertanya soal "polis saya", "status order", "laporan polis", atau kapan polis berakhir.',
        parameters: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter status opsional, mis. PENDING, PAID, ISSUED, ACTIVE, REJECTED. Kosongkan untuk semua.',
            },
            limit: { type: 'integer', description: 'Jumlah baris maksimum (1-25, default 10).' },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_policy_detail',
        description: 'Ambil rincian satu polis/order milik pengguna berdasarkan nomor order atau nomor polis.',
        parameters: {
          type: 'object',
          properties: {
            order_number: { type: 'string', description: 'Nomor order atau nomor polis persis seperti yang tampil di daftar.' },
          },
          required: ['order_number'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_my_claims',
        description: 'Ambil daftar klaim milik pengguna beserta statusnya. Gunakan untuk pertanyaan "status klaim saya".',
        parameters: {
          type: 'object',
          properties: { limit: { type: 'integer', description: 'Jumlah baris maksimum (1-25, default 10).' } },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_my_quotes',
        description: 'Ambil daftar penawaran (quote) yang tersimpan milik pengguna.',
        parameters: {
          type: 'object',
          properties: { limit: { type: 'integer', description: 'Jumlah baris maksimum (1-25, default 10).' } },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'list_products',
        description: 'Daftar produk SurePath beserta ringkasannya. Pakai ini alih-alih mengarang nama/manfaat produk.',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'estimate_premium',
        description:
          'Hitung estimasi premi kendaraan memakai tarif OJK SEOJK 6/2017 yang aktif di sistem. ' +
          'SELALU pakai tool ini untuk angka premi — jangan pernah menghitung atau menebak sendiri.',
        parameters: {
          type: 'object',
          properties: {
            vehicle_type: { type: 'string', enum: ['CAR', 'MOTORCYCLE'], description: 'CAR untuk mobil, MOTORCYCLE untuk sepeda motor.' },
            coverage: { type: 'string', enum: ['COMPREHENSIVE', 'TLO'], description: 'Jenis pertanggungan.' },
            sum_insured: { type: 'number', description: 'Nilai pertanggungan / harga kendaraan dalam Rupiah, mis. 250000000.' },
            province: { type: 'string', description: 'Provinsi pemilik kendaraan (menentukan zona OJK), mis. "DKI Jakarta".' },
            addons: {
              type: 'object',
              description: 'Perluasan opsional.',
              properties: {
                flood: { type: 'boolean' },
                earthquake: { type: 'boolean' },
                riot: { type: 'boolean', description: 'SRCC — huru-hara & kerusuhan.' },
                terrorism: { type: 'boolean' },
                tpl_limit: { type: 'number', description: 'Limit tanggung jawab hukum pihak ketiga: 0, 10000000, 25000000, atau 50000000.' },
                pa_driver: { type: 'boolean' },
                pa_passenger_seats: { type: 'integer', description: 'Jumlah kursi penumpang yang di-cover PA (0-7).' },
              },
            },
          },
          required: ['vehicle_type', 'coverage', 'sum_insured'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'create_quote',
        description:
          'Simpan penawaran (quote) untuk pengguna. Panggil HANYA setelah estimate_premium berhasil dan pengguna ' +
          'sudah setuju untuk menyimpannya. Penawaran ini bersifat indikatif, bukan penerbitan polis dan bukan pembayaran.',
        parameters: {
          type: 'object',
          properties: {
            product_type: { type: 'string', enum: ['CAR', 'MOTOR'], description: 'Jenis produk penawaran.' },
            client_name: { type: 'string', description: 'Nama calon tertanggung. Untuk CUSTOMER boleh dikosongkan (memakai nama sendiri).' },
            vehicle_description: { type: 'string', description: 'Deskripsi kendaraan, mis. "Toyota Avanza 2020".' },
            coverage: { type: 'string', enum: ['COMPREHENSIVE', 'TLO'] },
            sum_insured: { type: 'number', description: 'Nilai pertanggungan dalam Rupiah.' },
            province: { type: 'string', description: 'Provinsi (menentukan zona OJK).' },
            premium_estimate: { type: 'number', description: 'Total premi hasil estimate_premium. Wajib berasal dari tool tersebut.' },
            notes: { type: 'string', description: 'Catatan singkat opsional.' },
          },
          required: ['product_type', 'coverage', 'sum_insured', 'premium_estimate'],
        },
      },
    },
  ];

  if (isAgentSide(role)) {
    tools.push({
      type: 'function',
      function: {
        name: 'get_sales_report',
        description:
          'HANYA untuk AGENT: ringkasan penjualan agen yang sedang login — jumlah order, total premi, ' +
          'komisi, dan saldo dompet. Semua angka bersifat read-only.',
        parameters: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['this_month', 'last_30_days', 'this_year', 'all_time'], description: 'Periode laporan, default this_month.' },
          },
        },
        // deno-lint-ignore no-explicit-any
      } as any,
    });
  }

  return tools;
}

// ─── Row shaping ─────────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
const shapeOrder = (o: any) => ({
  order_number: o.order_number,
  policy_number: o.policy_number ?? null,
  product: o.product_name,
  status: o.status,
  insurer: o.insurer_name ?? null,
  coverage_type: o.coverage_type,
  sum_insured: Number(o.sum_insured ?? 0),
  total_premium: Number(o.total_premium ?? 0),
  start_date: o.start_date,
  end_date: o.end_date,
  created_at: o.created_at,
  client_name: o.client_name,
});

// deno-lint-ignore no-explicit-any
const shapeClaim = (c: any) => ({
  claim_number: c.claim_number,
  policy_number: c.policy_number ?? null,
  product_type: c.product_type ?? null,
  status: c.status,
  incident_date: c.incident_date ?? c.date ?? null,
  amount_estimated: c.amount_estimated == null ? null : Number(c.amount_estimated),
  amount_approved: c.amount_approved == null ? null : Number(c.amount_approved),
  created_at: c.created_at,
});

// deno-lint-ignore no-explicit-any
const shapeQuote = (q: any) => ({
  id: q.id,
  client_name: q.client_name,
  product_type: q.product_type,
  premium_estimate: Number(q.premium_estimate ?? 0),
  status: q.status,
  created_at: q.created_at,
  expires_at: q.expires_at,
  summary: q.quote_data?.vehicle_description ?? null,
});

// ─── Tool implementations ────────────────────────────────────────────────────

const ORDER_COLUMNS =
  'order_number,policy_number,product_name,status,insurer_name,coverage_type,' +
  'sum_insured,total_premium,start_date,end_date,created_at,client_name';

// deno-lint-ignore no-explicit-any
function ownerFilter(query: any, ctx: ToolContext, agentCol: string, clientCols: string[]) {
  const ids = safeIds(ctx.caller.ownerIds);
  if (ids.length === 0) return query.eq(agentCol, '00000000-0000-0000-0000-000000000000');
  if (isAgentSide(ctx.caller.role)) return query.in(agentCol, ids);
  const list = ids.join(',');
  return query.or(clientCols.map(c => `${c}.in.(${list})`).join(','));
}

async function getMyPolicies(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  const limit = clamp(Math.round(num(args.limit, 10)), 1, 25);
  const status = str(args.status, 30).toUpperCase();

  let q = ctx.db.from('sp_policy_orders').select(ORDER_COLUMNS).is('deleted_at', null);
  q = ownerFilter(q, ctx, 'agent_id', ['client_id']);
  if (status) q = q.eq('status', status);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(limit);
  if (error) return { result: { error: 'Tidak bisa membaca data polis saat ini.' } };

  // deno-lint-ignore no-explicit-any
  const rows = (data ?? []).map((o: any) => shapeOrder(o));
  return {
    result: { count: rows.length, policies: rows },
    card: { type: 'policies', data: { policies: rows, scope: isAgentSide(ctx.caller.role) ? 'agent' : 'customer' } },
  };
}

async function getPolicyDetail(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  const ref = str(args.order_number, 60);
  if (!ref) return { result: { error: 'Nomor order wajib diisi.' } };

  let q = ctx.db.from('sp_policy_orders')
    .select(`${ORDER_COLUMNS},vehicle_details,base_premium,addon_premium,admin_fee,stamp_duty,ojk_rate,zone,reviewer_notes`)
    .is('deleted_at', null)
    .or(`order_number.eq.${ref},policy_number.eq.${ref}`);
  q = ownerFilter(q, ctx, 'agent_id', ['client_id']);
  const { data, error } = await q.limit(1);
  if (error) return { result: { error: 'Tidak bisa membaca detail polis saat ini.' } };
  if (!data || data.length === 0) {
    return { result: { error: 'Polis dengan nomor tersebut tidak ditemukan pada akun ini.' } };
  }

  const o = data[0];
  const detail = {
    ...shapeOrder(o),
    vehicle: o.vehicle_details ?? null,
    base_premium: Number(o.base_premium ?? 0),
    addon_premium: Number(o.addon_premium ?? 0),
    admin_fee: Number(o.admin_fee ?? 0),
    stamp_duty: Number(o.stamp_duty ?? 0),
    ojk_rate: o.ojk_rate == null ? null : Number(o.ojk_rate),
    zone: o.zone ?? null,
  };
  return { result: detail, card: { type: 'policy_detail', data: detail } };
}

async function getMyClaims(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  const limit = clamp(Math.round(num(args.limit, 10)), 1, 25);
  let q = ctx.db.from('sp_claims')
    .select('claim_number,policy_number,product_type,status,incident_date,date,amount_estimated,amount_approved,created_at')
    .is('deleted_at', null);
  q = ownerFilter(q, ctx, 'agent_id', ['client_id', 'user_id']);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(limit);
  if (error) return { result: { error: 'Tidak bisa membaca data klaim saat ini.' } };

  // deno-lint-ignore no-explicit-any
  const rows = (data ?? []).map((c: any) => shapeClaim(c));
  return { result: { count: rows.length, claims: rows }, card: { type: 'claims', data: { claims: rows } } };
}

async function getMyQuotes(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  const limit = clamp(Math.round(num(args.limit, 10)), 1, 25);
  let q = ctx.db.from('sp_quotes').select('id,client_name,product_type,premium_estimate,status,created_at,expires_at,quote_data');
  q = ownerFilter(q, ctx, 'agent_id', ['client_id']);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(limit);
  if (error) return { result: { error: 'Tidak bisa membaca data penawaran saat ini.' } };

  // deno-lint-ignore no-explicit-any
  const rows = (data ?? []).map((r: any) => shapeQuote(r));
  return { result: { count: rows.length, quotes: rows }, card: { type: 'quotes', data: { quotes: rows } } };
}

function readAddons(raw: unknown): AddOns {
  const a = (raw ?? {}) as Record<string, unknown>;
  const tpl = num(a.tpl_limit, 0);
  const allowedTpl = [0, 10_000_000, 25_000_000, 50_000_000];
  return {
    flood: a.flood === true,
    earthquake: a.earthquake === true,
    riot: a.riot === true,
    terrorism: a.terrorism === true,
    tplLimit: allowedTpl.includes(tpl) ? tpl : 0,
    paDriver: a.pa_driver === true,
    paPassengerSeats: clamp(Math.round(num(a.pa_passenger_seats, 0)), 0, 7),
  };
}

async function estimatePremium(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  const vehicleType: VehicleType = str(args.vehicle_type, 20).toUpperCase() === 'MOTORCYCLE' ? 'MOTORCYCLE' : 'CAR';
  const coverage: CoverageType = str(args.coverage, 20).toUpperCase() === 'TLO' ? 'TLO' : 'COMPREHENSIVE';
  const sumInsured = Math.round(num(args.sum_insured, 0));

  if (sumInsured < 5_000_000 || sumInsured > 20_000_000_000) {
    return { result: { error: 'Nilai pertanggungan harus antara Rp 5 juta dan Rp 20 miliar. Tanyakan harga kendaraan ke pengguna.' } };
  }

  const rs = ctx.rateSet ?? await loadRateSet(ctx.db);
  ctx.rateSet = rs;
  const province = str(args.province, 60);
  const zone: Zone = province ? getZone(rs, province) : 3;
  const addons = readAddons(args.addons);

  // MIN band = tarif batas bawah OJK — the conservative, customer-facing
  // figure the public calculator also quotes.
  const band: OjkBand = 'MIN';
  const breakdown = calcPremium(rs, vehicleType, coverage, sumInsured, zone, addons, band);

  return {
    result: {
      ...breakdown,
      province: province || null,
      band,
      disclaimer: 'Estimasi indikatif berdasarkan tarif OJK. Premi final ditentukan insurer setelah underwriting.',
    },
    card: { type: 'premium', data: { ...breakdown, province: province || null, addons } },
  };
}

async function createQuote(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  const productType = str(args.product_type, 20).toUpperCase() === 'MOTOR' ? 'MOTOR' : 'CAR';
  const coverage = str(args.coverage, 20).toUpperCase() === 'TLO' ? 'TLO' : 'COMPREHENSIVE';
  const sumInsured = Math.round(num(args.sum_insured, 0));
  const premium = Math.round(num(args.premium_estimate, 0));

  if (sumInsured <= 0 || premium <= 0) {
    return { result: { error: 'Jalankan estimate_premium dulu — nilai pertanggungan dan premi wajib berasal dari hasil perhitungan.' } };
  }

  const agentSide = isAgentSide(ctx.caller.role);
  const clientName = str(args.client_name, 120) || ctx.caller.name || 'Nasabah';

  // agent_id is NOT NULL. For an agent it is their own id; for a customer we
  // attach the agent who already services them (from their latest order) so
  // the quote lands in that agent's pipeline, falling back to the customer's
  // own id when they have no agent yet.
  let agentId = ctx.caller.ownerId;
  if (!agentSide) {
    const ids = safeIds(ctx.caller.ownerIds);
    if (ids.length > 0) {
      const { data: lastOrder } = await ctx.db
        .from('sp_policy_orders')
        .select('agent_id')
        .in('client_id', ids)
        .not('agent_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastOrder?.agent_id) agentId = lastOrder.agent_id;
    }
  }

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const quoteData = {
    source: 'pathy',
    created_by_role: ctx.caller.role,
    coverage_type: coverage,
    sum_insured: sumInsured,
    vehicle_description: str(args.vehicle_description, 160) || null,
    province: str(args.province, 60) || null,
    notes: str(args.notes, 400) || null,
    disclaimer: 'Penawaran indikatif dari asisten Pathy. Premi final ditentukan insurer setelah underwriting.',
  };

  const { data, error } = await ctx.db.from('sp_quotes').insert({
    agent_id: agentId,
    client_id: agentSide ? null : ctx.caller.ownerId,
    client_name: clientName,
    product_type: productType,
    quote_data: quoteData,
    premium_estimate: premium,
    status: 'DRAFT',
    expires_at: expiresAt,
  }).select('id,client_name,product_type,premium_estimate,status,created_at,expires_at').single();

  if (error) return { result: { error: 'Penawaran gagal disimpan. Coba lagi atau hubungi tim SurePath.' } };

  const saved = {
    id: data.id,
    client_name: data.client_name,
    product_type: data.product_type,
    coverage_type: coverage,
    sum_insured: sumInsured,
    premium_estimate: Number(data.premium_estimate ?? 0),
    status: data.status,
    expires_at: data.expires_at,
    vehicle_description: quoteData.vehicle_description,
  };
  return {
    result: { ok: true, quote: saved, note: 'Penawaran tersimpan sebagai DRAFT dan berlaku 14 hari. Ini belum penerbitan polis.' },
    card: { type: 'quote_created', data: saved },
  };
}

async function getSalesReport(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  if (!isAgentSide(ctx.caller.role)) {
    return { result: { error: 'Laporan penjualan hanya tersedia untuk akun agen.' } };
  }
  const ids = safeIds(ctx.caller.ownerIds);
  if (ids.length === 0) return { result: { error: 'Profil agen tidak ditemukan.' } };

  const period = str(args.period, 20) || 'this_month';
  const now = new Date();
  let since: Date | null;
  switch (period) {
    case 'last_30_days': since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
    case 'this_year':    since = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)); break;
    case 'all_time':     since = null; break;
    default:             since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)); break;
  }

  let q = ctx.db.from('sp_policy_orders')
    .select('status,total_premium,commission_amount,created_at')
    .in('agent_id', ids)
    .is('deleted_at', null);
  if (since) q = q.gte('created_at', since.toISOString());
  const { data, error } = await q.limit(2000);
  if (error) return { result: { error: 'Tidak bisa membaca laporan penjualan saat ini.' } };

  const rows = data ?? [];
  const PAID = new Set(['PAID', 'ISSUED', 'ACTIVE', 'COMPLETED']);
  // deno-lint-ignore no-explicit-any
  const paidRows = rows.filter((r: any) => PAID.has(String(r.status ?? '').toUpperCase()));
  // deno-lint-ignore no-explicit-any
  const sum = (arr: any[], k: string) => arr.reduce((a, r) => a + Number(r[k] ?? 0), 0);

  const byStatus: Record<string, number> = {};
  // deno-lint-ignore no-explicit-any
  for (const r of rows) {
    const k = String(r.status ?? 'UNKNOWN').toUpperCase();
    byStatus[k] = (byStatus[k] ?? 0) + 1;
  }

  const { data: wallet } = await ctx.db
    .from('sp_agent_wallets')
    .select('balance,total_earned,total_withdrawn')
    .in('agent_id', ids)
    .limit(1)
    .maybeSingle();

  const report = {
    period,
    since: since ? since.toISOString().slice(0, 10) : null,
    total_orders: rows.length,
    paid_orders: paidRows.length,
    gross_premium: sum(rows, 'total_premium'),
    paid_premium: sum(paidRows, 'total_premium'),
    commission_earned_on_paid: sum(paidRows, 'commission_amount'),
    commission_pending: sum(rows, 'commission_amount') - sum(paidRows, 'commission_amount'),
    orders_by_status: byStatus,
    wallet: wallet
      ? {
          balance: Number(wallet.balance ?? 0),
          total_earned: Number(wallet.total_earned ?? 0),
          total_withdrawn: Number(wallet.total_withdrawn ?? 0),
        }
      : null,
    note: 'Angka dompet bersifat read-only. Penarikan dana hanya lewat menu Wallet dengan persetujuan berjenjang.',
  };
  return { result: report, card: { type: 'sales_report', data: report } };
}

function listProducts(): ToolOutcome {
  return {
    result: { products: PRODUCT_CATALOGUE },
    card: { type: 'products', data: { products: PRODUCT_CATALOGUE } },
  };
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolOutcome> {
  switch (name) {
    case 'get_my_policies':  return await getMyPolicies(args, ctx);
    case 'get_policy_detail': return await getPolicyDetail(args, ctx);
    case 'get_my_claims':    return await getMyClaims(args, ctx);
    case 'get_my_quotes':    return await getMyQuotes(args, ctx);
    case 'estimate_premium': return await estimatePremium(args, ctx);
    case 'create_quote':     return await createQuote(args, ctx);
    case 'get_sales_report': return await getSalesReport(args, ctx);
    case 'list_products':    return listProducts();
    default:
      return { result: { error: `Tool tidak dikenal: ${name}` } };
  }
}
