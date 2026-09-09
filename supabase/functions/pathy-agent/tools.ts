// Pathy agent tools — the only things the model is allowed to do.
//
// Every tool runs server-side with the service_role client and is scoped to
// the *verified* caller: identity fields (agent_id / client_id / user_id) are
// always taken from the resolved caller, never from model-supplied arguments.
// The model can therefore hallucinate an id all it wants and still only ever
// read or write the caller's own rows.
//
// Read tools are unrestricted. Three tools write, none of them near money:
// create_quote and build_quotation both add a non-binding DRAFT row to
// sp_quotes, and save_document_data (v2.5.0, see documents.ts) fills in the
// caller's own profile — or an agent's own client record — from a document the
// user just had read, and only after the user agrees. Nothing here touches
// money tables (sp_agent_wallets, sp_wallet_transactions and sp_commissions are
// read-only), orders, claims, or payments.

import {
  loadRateSet, calcPremium, getZone, type AddOns, type CoverageType,
  type OjkBand, type RateSet, type VehicleType, type Zone,
} from '../_shared/ojk.ts';

export type {
  PathyCaller, PathyDocument, PathyDocumentType, ToolContext, PathyCard, ToolOutcome,
} from './common.ts';
import type { ToolContext, ToolOutcome } from './common.ts';
import {
  ORDER_COLUMNS, ORDER_REF_RE, clamp, isAgentSide, num, ownerFilter,
  safeIds, shapeClaim, shapeOrder, str,
} from './common.ts';
import { serviceToolSchemas, runServiceTool, isServiceTool } from './serviceTools.ts';
import {
  attachmentHints, documentToolSchemas, isDocumentTool, runDocumentTool,
} from './documents.ts';
import { PRICE_DISCLAIMER } from './disclaimers.ts';

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
    {
      type: 'function',
      function: {
        name: 'read_attachment',
        description:
          'Baca dokumen/foto yang dilampirkan pengguna di percakapan ini (STNK, KTP, SIM, polis, invoice, atau dokumen lain). ' +
          'Isinya sudah diekstrak dan divalidasi di klien. Panggil ini SEBELUM menghitung atau menyimpulkan apa pun ' +
          'kalau ada lampiran — jangan pernah menebak isi dokumen. Kosongkan `type` untuk membaca semua lampiran giliran ini.',
        parameters: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['STNK', 'KTP', 'SIM', 'POLIS', 'INVOICE', 'DOC'],
              description: 'Jenis dokumen yang mau dibaca. Kosongkan untuk membaca semuanya.',
            },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'compare_offers',
        description:
          'Hitung TIGA opsi penawaran kendaraan sekaligus dengan tarif OJK yang aktif: ' +
          'Comprehensive polos, Comprehensive + perluasan lengkap, dan TLO. ' +
          'Pakai ini saat pengguna minta "beberapa opsi" atau "bandingkan". ' +
          'Semua angka dihitung di server — jangan pernah menghitung sendiri.',
        parameters: {
          type: 'object',
          properties: {
            vehicle_type: { type: 'string', enum: ['CAR', 'MOTORCYCLE'] },
            sum_insured: { type: 'number', description: 'Nilai pertanggungan dalam Rupiah (dari read_attachment atau dari pengguna).' },
            province: { type: 'string', description: 'Provinsi pemilik kendaraan — menentukan zona OJK.' },
            brand: { type: 'string' },
            model: { type: 'string' },
            year: { type: 'integer' },
            plate: { type: 'string' },
          },
          required: ['vehicle_type', 'sum_insured'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'build_quotation',
        description:
          'Susun proposal penawaran resmi (format slip SurePath yang sama dengan menu beli asuransi ' +
          'kendaraan) untuk SATU opsi hasil compare_offers, lalu simpan sebagai draf. ' +
          'Antarmuka akan menampilkan tombol unduh PDF. Panggil HANYA setelah pengguna memilih opsi.',
        parameters: {
          type: 'object',
          properties: {
            option_id: { type: 'string', enum: ['comprehensive', 'comprehensive_plus', 'tlo'], description: 'Opsi yang dipilih pengguna.' },
            vehicle_type: { type: 'string', enum: ['CAR', 'MOTORCYCLE'] },
            sum_insured: { type: 'number' },
            province: { type: 'string' },
            client_name: { type: 'string', description: 'Nama tertanggung — dari KTP kalau ada, kalau tidak dari pengguna.' },
            client_address: { type: 'string', description: 'Alamat tertanggung sesuai KTP.' },
            client_phone: { type: 'string' },
            brand: { type: 'string' },
            model: { type: 'string' },
            year: { type: 'integer' },
            plate: { type: 'string' },
            insurer_name: { type: 'string', description: 'Nama insurer bila pengguna sudah memilih. Kosongkan kalau belum.' },
          },
          required: ['option_id', 'vehicle_type', 'sum_insured', 'client_name'],
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

  tools.push(...documentToolSchemas);
  tools.push(...serviceToolSchemas(role));
  return tools;
}

// ─── Row shaping ─────────────────────────────────────────────────────────────

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
  if (!ORDER_REF_RE.test(ref)) {
    return { result: { error: 'Format nomor order tidak valid. Minta pengguna menyalin nomornya persis dari daftar polis.' } };
  }

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
      disclaimer: PRICE_DISCLAIMER,
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

// ─── Attachments, offers and the quotation proposal ──────────────────────────

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

/** QS/SP/2026/IX/0092 — the same series the buy-wizard mints. */
function quotationNumber(): string {
  const d = new Date();
  return `QS/SP/${d.getUTCFullYear()}/${ROMAN[d.getUTCMonth()]}/${String(Date.now()).slice(-4)}`;
}

function readAttachment(args: Record<string, unknown>, ctx: ToolContext): ToolOutcome {
  const want = str(args.type, 10).toUpperCase();
  const docs = ctx.documents ?? [];
  if (docs.length === 0) {
    return { result: { error: 'Belum ada dokumen yang dilampirkan. Minta pengguna melampirkan foto lewat tombol unggah atau kamera di kolom chat.' } };
  }

  // No type asked for → hand back everything on this turn. The model asking to
  // "read the attachment" when the user sent one photo should not have to guess
  // the classification first.
  const wanted = want ? docs.filter(d => d.type === want) : docs;
  if (wanted.length === 0) {
    return {
      result: {
        error: `Tidak ada lampiran ${want}.`,
        available: docs.map(d => d.type),
      },
    };
  }

  const shape = (d: typeof docs[number]) => ({
    type: d.type,
    label: d.label ?? null,
    confidence: d.confidence ?? null,
    fields: d.fields,
  });

  const primary = wanted[0];
  return {
    result: wanted.length === 1
      ? { ...shape(primary), saveable: true, save_hint: 'Kalau pengguna mau, datanya bisa disimpan ke akunnya lewat save_document_data.' }
      : { documents: wanted.map(shape), saveable: true },
    card: { type: 'document_read', data: shape(primary) },
  };
}

/** The three coverage shapes the buy-wizard offers, priced off one rate set. */
const OFFER_SHAPES: Array<{
  id: 'comprehensive' | 'comprehensive_plus' | 'tlo';
  label: string;
  coverage: CoverageType;
  addons: AddOns;
  blurb: string;
}> = [
  {
    id: 'comprehensive',
    label: 'Comprehensive',
    coverage: 'COMPREHENSIVE',
    addons: { flood: false, earthquake: false, riot: false, terrorism: false, tplLimit: 0, paDriver: false, paPassengerSeats: 0 },
    blurb: 'Kerugian sebagian dan total, tanpa perluasan.',
  },
  {
    id: 'comprehensive_plus',
    label: 'Comprehensive + perluasan',
    coverage: 'COMPREHENSIVE',
    addons: { flood: true, earthquake: true, riot: true, terrorism: false, tplLimit: 25_000_000, paDriver: true, paPassengerSeats: 4 },
    blurb: 'Ditambah banjir, gempa, huru-hara, TPL Rp 25 juta, dan kecelakaan diri sopir + 4 penumpang.',
  },
  {
    id: 'tlo',
    label: 'TLO',
    coverage: 'TLO',
    addons: { flood: false, earthquake: false, riot: false, terrorism: false, tplLimit: 0, paDriver: false, paPassengerSeats: 0 },
    blurb: 'Hanya kerugian total (kehilangan atau kerusakan ≥75%).',
  },
];

/** Premium rows in the order the quotation slip prints them. */
function offerRows(b: ReturnType<typeof calcPremium>, addons: AddOns) {
  const rows: Array<{ label: string; amount: number }> = [
    { label: 'Premi Dasar', amount: b.basePremium },
  ];
  const d = b.addonsDetail;
  if (d.flood)       rows.push({ label: 'Perluasan Banjir', amount: d.flood });
  if (d.earthquake)  rows.push({ label: 'Perluasan Gempa Bumi', amount: d.earthquake });
  if (d.riot)        rows.push({ label: 'Perluasan Huru-hara (SRCC)', amount: d.riot });
  if (d.terrorism)   rows.push({ label: 'Perluasan Terorisme & Sabotase', amount: d.terrorism });
  if (d.tpl)         rows.push({ label: `TPL (Tanggung Jawab Pihak Ketiga) — ${formatIdr(addons.tplLimit)}`, amount: d.tpl });
  if (d.paDriver)    rows.push({ label: 'Kecelakaan Diri — Pengemudi', amount: d.paDriver });
  if (d.paPassenger) rows.push({ label: `Kecelakaan Diri — Penumpang (${addons.paPassengerSeats} kursi)`, amount: d.paPassenger });
  rows.push({ label: 'Biaya Admin', amount: b.adminFee });
  rows.push({ label: 'Materai', amount: b.stampDuty });
  return rows;
}

function formatIdr(n: number): string {
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

/** Drops keys the model sent as null/empty so a hint can fill them instead. */
function stripEmpty(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && !v.trim()) continue;
    if (typeof v === 'number' && !Number.isFinite(v)) continue;
    out[k] = v;
  }
  return out;
}

interface OfferInputs {
  vehicleType: VehicleType;
  sumInsured: number;
  province: string;
  zone: Zone;
}

/** Validates the shared inputs of compare_offers / build_quotation. */
function readOfferInputs(args: Record<string, unknown>, rs: RateSet): OfferInputs | { error: string } {
  const vehicleType: VehicleType = str(args.vehicle_type, 20).toUpperCase() === 'MOTORCYCLE' ? 'MOTORCYCLE' : 'CAR';
  const sumInsured = Math.round(num(args.sum_insured, 0));
  if (sumInsured < 5_000_000 || sumInsured > 20_000_000_000) {
    return { error: 'Nilai pertanggungan harus antara Rp 5 juta dan Rp 20 miliar. Tanyakan harga kendaraannya ke pengguna.' };
  }
  const province = str(args.province, 60);
  return { vehicleType, sumInsured, province, zone: province ? getZone(rs, province) : 3 };
}

async function compareOffers(rawArgs: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  const rs = ctx.rateSet ?? await loadRateSet(ctx.db);
  ctx.rateSet = rs;

  // Arguments the model supplied always win; anything it left out is filled
  // from the document the user attached on this turn (v2.5.0). Quoting a car
  // whose STNK is sitting right there against an invented sum insured was the
  // failure this closes.
  const args = { ...attachmentHints(ctx), ...stripEmpty(rawArgs) };
  const input = readOfferInputs(args, rs);
  if ('error' in input) return { result: { error: input.error } };

  // MIN band = tarif batas bawah OJK, the same conservative figure the public
  // calculator and the buy-wizard quote.
  const band: OjkBand = 'MIN';
  const options = OFFER_SHAPES.map(shape => {
    const b = calcPremium(rs, input.vehicleType, shape.coverage, input.sumInsured, input.zone, shape.addons, band);
    return {
      id: shape.id,
      label: shape.label,
      coverage: shape.coverage,
      blurb: shape.blurb,
      ratePercent: b.ratePercent,
      basePremium: b.basePremium,
      addonPremium: b.addonPremium,
      adminFee: b.adminFee,
      stampDuty: b.stampDuty,
      total: b.total,
      rows: offerRows(b, shape.addons),
    };
  });

  const vehicle = {
    brand: str(args.brand, 60) || null,
    model: str(args.model, 80) || null,
    year: Math.round(num(args.year, 0)) || null,
    plate: str(args.plate, 20) || null,
  };

  const data = {
    vehicle,
    vehicleType: input.vehicleType,
    sumInsured: input.sumInsured,
    province: input.province || null,
    zone: input.zone,
    band,
    rateSetVersion: rs.version,
    options,
    disclaimer: PRICE_DISCLAIMER,
  };

  return { result: data, card: { type: 'offers', data } };
}

async function buildQuotation(rawArgs: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  const rs = ctx.rateSet ?? await loadRateSet(ctx.db);
  ctx.rateSet = rs;

  // Arguments the model supplied always win; anything it left out is filled
  // from the document the user attached on this turn (v2.5.0). Quoting a car
  // whose STNK is sitting right there against an invented sum insured was the
  // failure this closes.
  const args = { ...attachmentHints(ctx), ...stripEmpty(rawArgs) };
  const input = readOfferInputs(args, rs);
  if ('error' in input) return { result: { error: input.error } };

  const optionId = str(args.option_id, 30).toLowerCase();
  const shape = OFFER_SHAPES.find(o => o.id === optionId);
  if (!shape) {
    return { result: { error: 'Opsi tidak dikenal. Jalankan compare_offers dulu, lalu pakai salah satu option_id-nya.' } };
  }

  const clientName = str(args.client_name, 120);
  if (!clientName) return { result: { error: 'Nama tertanggung wajib diisi — ambil dari KTP atau tanyakan ke pengguna.' } };

  // Recomputed here rather than trusting any figure the model carried over from
  // compare_offers: the premium printed on the proposal must come from the rate
  // engine on this request, not from the conversation.
  const band: OjkBand = 'MIN';
  const b = calcPremium(rs, input.vehicleType, shape.coverage, input.sumInsured, input.zone, shape.addons, band);
  const rows = offerRows(b, shape.addons);

  const agentSide = isAgentSide(ctx.caller.role);
  const quoteNo = quotationNumber();
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const vehicleBrand = str(args.brand, 60) || 'Kendaraan';
  const vehicleModel = str(args.model, 80) || '-';

  // Shape matches services/quotationSlipAdapter.ts → AgentQuoteSource, so the
  // client can hand it straight to fromAgentQuote() + the existing slip
  // generator. Same PDF the buy-wizard produces.
  const quotation = {
    quoteNumber: quoteNo,
    validUntil,
    clientName,
    clientPhone: str(args.client_phone, 32) || undefined,
    clientAddress: str(args.client_address, 300) || undefined,
    agentName: agentSide ? (ctx.caller.name || 'Mitra SurePath') : 'SurePath Digital',
    agentCode: agentSide ? (ctx.caller.agentCode || undefined) : undefined,
    agentPhone: agentSide ? (ctx.caller.phone || undefined) : undefined,
    product: input.vehicleType === 'MOTORCYCLE' ? 'MOTORCYCLE' : 'CAR',
    vehicleBrand,
    vehicleModel,
    vehicleYear: Math.round(num(args.year, 0)) || undefined,
    vehiclePlate: str(args.plate, 20) || undefined,
    vehiclePrice: input.sumInsured,
    coverageType: shape.coverage,
    zone: input.zone,
    ojkRate: b.rate,
    rateBand: band,
    providerName: str(args.insurer_name, 120) || undefined,
    rows,
    totalPremium: b.total,
  };

  // Persist as a DRAFT quote so it shows up in the user's/agent's quote list.
  // agent_id is NOT NULL — same resolution rule as create_quote.
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

  const { data: saved, error } = await ctx.db.from('sp_quotes').insert({
    agent_id: agentId,
    client_id: agentSide ? null : ctx.caller.ownerId,
    client_name: clientName,
    product_type: input.vehicleType === 'MOTORCYCLE' ? 'MOTOR' : 'CAR',
    quote_data: { source: 'pathy', kind: 'quotation', option: shape.id, quotation },
    premium_estimate: b.total,
    status: 'DRAFT',
    expires_at: validUntil,
  }).select('id').single();

  if (error) {
    return { result: { error: 'Penawaran gagal disimpan. Coba lagi atau hubungi tim SurePath.' } };
  }

  const data = {
    quoteId: saved.id,
    quotationNumber: quoteNo,
    optionLabel: shape.label,
    coverage: shape.coverage,
    clientName,
    clientAddress: quotation.clientAddress ?? null,
    vehicle: `${vehicleBrand} ${vehicleModel}`.trim(),
    plate: quotation.vehiclePlate ?? null,
    sumInsured: input.sumInsured,
    totalPremium: b.total,
    validUntil,
    /** Handed to fromAgentQuote() on the client to render the PDF. */
    quotation,
  };

  return {
    result: {
      ok: true,
      quotationNumber: quoteNo,
      optionLabel: shape.label,
      totalPremium: b.total,
      note: 'Proposal siap. Antarmuka sudah menampilkan tombol unduh PDF — ini penawaran indikatif, belum penerbitan polis.',
    },
    card: { type: 'quotation_ready', data },
  };
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
    case 'read_attachment':  return readAttachment(args, ctx);
    case 'compare_offers':   return await compareOffers(args, ctx);
    case 'build_quotation':  return await buildQuotation(args, ctx);
    case 'create_quote':     return await createQuote(args, ctx);
    case 'get_sales_report': return await getSalesReport(args, ctx);
    case 'list_products':    return listProducts();
    default:
      // v2.5.0 document tools (archive + profile/client enrichment).
      if (isDocumentTool(name)) return await runDocumentTool(name, args, ctx);
      // v2.3.0 service tools (coverage, claims, renewal, payment, pipeline).
      if (isServiceTool(name)) return await runServiceTool(name, args, ctx);
      return { result: { error: `Tool tidak dikenal: ${name}` } };
  }
}
