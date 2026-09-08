// Pathy service tools — after-sales: coverage, claims, renewal, payment, and
// the agent's own pipeline.
//
// ─── The rule that shapes this whole file ────────────────────────────────────
//
// Every tool here is READ-ONLY or PREPARE-ONLY. Not one of them writes.
//
// That is deliberate, not a shortcut. Submitting a claim already has a careful
// trust chain in data-gateway/actions/claims.ts: the photo forensics run first
// in the analyze-claim-photos function, which stages its verdict server-side,
// and submit_claim then consumes that staged row once, by id, after checking it
// belongs to the caller and has not expired — precisely so the fraudster the
// feature targets cannot post `fraud_verdict: CLEAN` themselves. Paying for an
// order goes through create-xendit-invoice. Both are single code paths with
// guards that took real work to get right.
//
// Giving a chat model a second door into either of those would mean either
// duplicating those guards (two places to keep correct) or bypassing them (a
// hole). So Pathy does the part it is actually good at — working out which
// policy applies, what is covered, what is missing, what it will cost — and
// then hands the user a prefilled deep link into the flow that already exists.
// The commit stays where the guards are.

import { loadRateSet, calcPremium, getZone, type OjkBand } from '../_shared/ojk.ts';
import {
  ORDER_COLUMNS, ORDER_REF_RE, clamp, daysUntil, isAgentSide, num, ownerFilter,
  safeIds, shapeClaim, shapeOrder, str, type ToolContext, type ToolOutcome,
} from './common.ts';

// ─── Coverage rules ──────────────────────────────────────────────────────────
//
// Indonesian motor policies follow PSAKBI (Polis Standar Asuransi Kendaraan
// Bermotor Indonesia). What matters for answering "is this covered?" is which
// bucket the peril falls in — and crucially that flood, earthquake, riot,
// terrorism, third-party liability and personal accident are NOT in the base
// cover: they are paid extensions. Telling a customer "yes, covered" for a
// flooded car that has no flood extension is the single most damaging wrong
// answer this assistant could give, so each peril carries its own bucket and
// the answer is always resolved against the extensions actually on the order.

type Bucket =
  /** In base Comprehensive cover. Not covered by TLO unless the loss is total. */
  | 'COMPREHENSIVE'
  /** Total loss only — covered by both TLO and Comprehensive. */
  | 'TOTAL_LOSS'
  /** Only covered when the matching extension was bought. */
  | 'EXTENSION'
  /** Never covered under a standard motor policy. */
  | 'EXCLUDED';

interface Peril {
  label: string;
  bucket: Bucket;
  /** Key in sp_policy_orders.addons that switches an EXTENSION peril on. */
  addonKey?: string;
  note: string;
}

const PERILS: Record<string, Peril> = {
  collision: {
    label: 'Tabrakan / benturan / terbalik / tergelincir',
    bucket: 'COMPREHENSIVE',
    note: 'Risiko inti polis Comprehensive. Polis TLO hanya menanggung bila kerusakannya total (biaya perbaikan ≥ 75% harga kendaraan).',
  },
  vandalism: {
    label: 'Perbuatan jahat orang lain (baret, penyok disengaja)',
    bucket: 'COMPREHENSIVE',
    note: 'Termasuk risiko inti Comprehensive. Bukan termasuk baret akibat pemakaian wajar.',
  },
  fire: {
    label: 'Kebakaran & sambaran petir',
    bucket: 'COMPREHENSIVE',
    note: 'Ditanggung Comprehensive; ditanggung TLO bila kendaraan habis terbakar.',
  },
  glass: {
    label: 'Kaca, lampu, dan spion pecah',
    bucket: 'COMPREHENSIVE',
    note: 'Ditanggung Comprehensive bila akibat risiko yang dijamin. Ada risiko sendiri per kejadian, sehingga kerusakan kecil sering lebih murah dibayar sendiri.',
  },
  theft: {
    label: 'Pencurian kendaraan (termasuk dengan kekerasan)',
    bucket: 'TOTAL_LOSS',
    note: 'Ditanggung Comprehensive maupun TLO. Wajib ada laporan polisi.',
  },
  theft_parts: {
    label: 'Pencurian bagian kendaraan (ban, spion, aki)',
    bucket: 'COMPREHENSIVE',
    note: 'Ditanggung Comprehensive bila disertai kerusakan akibat pembongkaran. Tidak ditanggung TLO.',
  },
  total_loss: {
    label: 'Kerugian total (rusak ≥ 75% atau hilang)',
    bucket: 'TOTAL_LOSS',
    note: 'Ditanggung Comprehensive maupun TLO.',
  },
  flood: {
    label: 'Banjir, angin topan, badai, tanah longsor',
    bucket: 'EXTENSION', addonKey: 'flood',
    note: 'BUKAN jaminan dasar. Hanya ditanggung bila perluasan Banjir & Angin Topan dibeli.',
  },
  earthquake: {
    label: 'Gempa bumi, tsunami, letusan gunung berapi',
    bucket: 'EXTENSION', addonKey: 'earthquake',
    note: 'BUKAN jaminan dasar. Perlu perluasan Gempa Bumi.',
  },
  riot: {
    label: 'Huru-hara, kerusuhan, pemogokan (SRCC)',
    bucket: 'EXTENSION', addonKey: 'riot',
    note: 'BUKAN jaminan dasar. Perlu perluasan Huru-hara.',
  },
  terrorism: {
    label: 'Terorisme & sabotase',
    bucket: 'EXTENSION', addonKey: 'terrorism',
    note: 'BUKAN jaminan dasar. Perlu perluasan Terorisme & Sabotase.',
  },
  third_party: {
    label: 'Kerugian pihak ketiga (mobil/orang lain yang kamu tabrak)',
    bucket: 'EXTENSION', addonKey: 'tpl_limit',
    note: 'BUKAN jaminan dasar. Perlu perluasan Tanggung Jawab Hukum Pihak Ketiga, dan ganti ruginya dibatasi limit yang dibeli.',
  },
  personal_accident: {
    label: 'Kecelakaan diri pengemudi / penumpang',
    bucket: 'EXTENSION', addonKey: 'pa_driver',
    note: 'BUKAN jaminan dasar. Perlu perluasan Kecelakaan Diri.',
  },
  tyre_only: {
    label: 'Ban atau pelek saja, tanpa kerusakan lain',
    bucket: 'EXCLUDED',
    note: 'Dikecualikan PSAKBI kecuali menyertai kerusakan lain yang dijamin pada kejadian yang sama.',
  },
  mechanical: {
    label: 'Kerusakan mesin/elektrik, aus, karat, kualitas bahan',
    bucket: 'EXCLUDED',
    note: 'Dikecualikan. Ini urusan garansi atau servis berkala, bukan asuransi.',
  },
  no_licence: {
    label: 'Pengemudi tanpa SIM sah, mabuk, atau di bawah pengaruh obat',
    bucket: 'EXCLUDED',
    note: 'Dikecualikan mutlak. Pastikan SIM pengemudi berlaku saat kejadian.',
  },
  illegal_use: {
    label: 'Balapan, menarik kendaraan lain, kelebihan muatan, tindak kejahatan',
    bucket: 'EXCLUDED',
    note: 'Dikecualikan. Termasuk pemakaian komersial bila polisnya bukan untuk komersial.',
  },
  abroad: {
    label: 'Kejadian di luar wilayah Republik Indonesia',
    bucket: 'EXCLUDED',
    note: 'Wilayah pertanggungan polis kendaraan Indonesia terbatas di dalam negeri.',
  },
};

export const PERIL_KEYS = Object.keys(PERILS);

// Risiko Sendiri (deductible) — the customer's own share per event. These are
// the market-standard PSAKBI figures; the policy schedule always prevails, so
// the answer says so.
const OWN_RISK_BASE = 300_000;
const OWN_RISK_EXTENSION_MIN = 500_000;

const COVERAGE_DISCLAIMER =
  'Ini pembacaan indikatif dari data polismu. Keputusan akhir tetap ada pada insurer setelah survei/pemeriksaan berkas.';

/** Reads the extensions actually bought on the order. */
function orderAddons(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
}

function hasAddon(addons: Record<string, unknown>, key: string): boolean {
  const v = addons[key];
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v > 0;
  return false;
}

// ─── Claim document checklists ───────────────────────────────────────────────
// Mirrors services/aiKnowledge.ts claimDocumentRequirements — same list the
// claim form asks for, so Pathy never promises a shorter one.
const CLAIM_DOCS: Record<string, string[]> = {
  CAR: ['Foto kerusakan minimal 4 sudut', 'STNK', 'KTP pemilik', 'SIM pengemudi saat kejadian', 'Laporan polisi (bila tabrakan dengan pihak lain atau kehilangan)', 'Estimasi biaya bengkel bila sudah ada'],
  MOTOR: ['Foto kerusakan minimal 4 sudut', 'STNK', 'KTP pemilik', 'SIM pengemudi saat kejadian', 'Laporan polisi (bila tabrakan dengan pihak lain atau kehilangan)'],
  TRAVEL: ['Boarding pass', 'Bukti keterlambatan/pembatalan dari maskapai', 'Kuitansi pengeluaran', 'Paspor'],
  PA: ['Surat keterangan dokter', 'Foto luka', 'Laporan polisi bila ada', 'KTP'],
  MPAR: ['Foto kerusakan', 'Bukti pembelian', 'Laporan polisi bila hilang'],
};

const ACTIVE_POLICY_STATUSES = new Set(['ISSUED', 'ACTIVE', 'PAID', 'COMPLETED']);

/** Claim stages, in order, with what the customer can do about each. */
const CLAIM_STAGES: Record<string, { stage: string; next: string }> = {
  DRAFT:      { stage: 'Belum terkirim', next: 'Lengkapi formulir klaim lalu kirim.' },
  SUBMITTED:  { stage: 'Terkirim, menunggu verifikasi berkas', next: 'Tidak ada yang perlu kamu lakukan. Tim kami memeriksa kelengkapan berkas.' },
  IN_REVIEW:  { stage: 'Sedang ditinjau', next: 'Siapkan berkas tambahan bila diminta surveyor.' },
  SURVEY:     { stage: 'Menunggu survei', next: 'Pastikan kendaraan tersedia saat surveyor menghubungi.' },
  PENDING:    { stage: 'Menunggu kelengkapan', next: 'Ada berkas yang kurang — cek menu Klaim untuk melihat mana.' },
  APPROVED:   { stage: 'Disetujui', next: 'Menunggu penerbitan Surat Perintah Kerja bengkel atau pembayaran.' },
  PAID:       { stage: 'Sudah dibayar', next: 'Selesai. Cek rekening atau konfirmasi bengkel.' },
  REJECTED:   { stage: 'Ditolak', next: 'Alasannya tertulis di detail klaim. Kamu bisa mengajukan keberatan lewat tim SurePath.' },
  CLOSED:     { stage: 'Ditutup', next: 'Selesai.' },
};

// ─── Schemas ─────────────────────────────────────────────────────────────────

export function serviceToolSchemas(role: string) {
  // deno-lint-ignore no-explicit-any
  const tools: any[] = [
    {
      type: 'function',
      function: {
        name: 'check_coverage',
        description:
          'Jawab "apakah X ditanggung polis saya?" dengan membaca polis pengguna sendiri: jenis pertanggungan, perluasan yang dibeli, dan risiko sendiri. WAJIB dipakai sebelum menjawab pertanyaan jaminan — jangan menjawab dari pengetahuan umum.',
        parameters: {
          type: 'object',
          properties: {
            peril: { type: 'string', enum: PERIL_KEYS, description: 'Jenis risiko yang ditanyakan. Petakan pertanyaan pengguna ke salah satu nilai ini.' },
            order_number: { type: 'string', description: 'Nomor order/polis. Kosongkan untuk memakai polis aktif terbaru.' },
          },
          required: ['peril'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'start_claim',
        description:
          'Siapkan pengajuan klaim: cari polis yang berlaku pada tanggal kejadian, kembalikan daftar dokumen yang wajib disiapkan dan data awal formulir. Tool ini TIDAK mengirim klaim — antarmuka menampilkan tombol yang membuka formulir klaim dengan data terisi.',
        parameters: {
          type: 'object',
          properties: {
            peril: { type: 'string', enum: PERIL_KEYS, description: 'Penyebab kerugian.' },
            incident_date: { type: 'string', description: 'Tanggal kejadian, format YYYY-MM-DD. Kosongkan bila pengguna belum menyebutkannya.' },
            order_number: { type: 'string', description: 'Nomor polis bila pengguna menyebutkannya.' },
            description: { type: 'string', description: 'Kronologi singkat dari pengguna.' },
          },
          required: ['peril'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'claim_status',
        description: 'Status klaim pengguna berikut tahap saat ini dan apa langkah berikutnya. Pakai ini, bukan get_my_claims, bila pengguna bertanya "klaim saya sampai mana".',
        parameters: {
          type: 'object',
          properties: { claim_number: { type: 'string', description: 'Nomor klaim tertentu. Kosongkan untuk semua klaim yang masih berjalan.' } },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'renewal_check',
        description: 'Daftar polis yang akan jatuh tempo beserta estimasi premi perpanjangannya (dihitung ulang dengan tarif OJK berjalan). Pakai bila pengguna bertanya soal perpanjangan, atau untuk mengingatkan proaktif.',
        parameters: {
          type: 'object',
          properties: { days_ahead: { type: 'number', description: 'Rentang hari ke depan, default 90, maksimum 365.' } },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'explain_my_policy',
        description: 'Ringkas isi satu polis pengguna: apa yang ditanggung, apa yang TIDAK ditanggung, perluasan yang dibeli, dan risiko sendiri. Pakai bila pengguna bertanya "polis saya isinya apa" atau "apa yang tidak ditanggung".',
        parameters: {
          type: 'object',
          properties: { order_number: { type: 'string', description: 'Nomor order/polis. Kosongkan untuk polis aktif terbaru.' } },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'payment_help',
        description: 'Cari pengajuan yang tagihannya belum dibayar dan kembalikan tautan pembayaran yang SUDAH ada. Tool ini tidak membuat tagihan baru dan tidak memproses pembayaran.',
        parameters: { type: 'object', properties: {} },
      },
    },
  ];

  if (!isAgentSide(role)) return tools;

  tools.push(
    {
      type: 'function',
      function: {
        name: 'pipeline_nudge',
        description: 'Untuk agen: penawaran DRAFT yang mendekati kedaluwarsa dan pengajuan yang mandek, supaya agen tahu mana yang harus ditindaklanjuti hari ini.',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'commission_forecast',
        description: 'Untuk agen: saldo dompet, komisi yang sudah tercatat, dan perkiraan komisi dari pengajuan yang masih berjalan.',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'draft_followup',
        description: 'Untuk agen: susun DRAFT pesan WhatsApp tindak lanjut untuk satu penawaran. Hanya membuat teks — Pathy tidak pernah mengirim pesan atas nama agen.',
        parameters: {
          type: 'object',
          properties: {
            quote_id: { type: 'string', description: 'UUID penawaran dari get_my_quotes atau pipeline_nudge.' },
            tone: { type: 'string', enum: ['ramah', 'singkat', 'formal'], description: 'Gaya pesan, default ramah.' },
          },
          required: ['quote_id'],
        },
      },
    },
  );
  return tools;
}

const NAMES = new Set([
  'check_coverage', 'start_claim', 'claim_status', 'renewal_check',
  'explain_my_policy', 'payment_help',
  'pipeline_nudge', 'commission_forecast', 'draft_followup',
]);

export const isServiceTool = (name: string) => NAMES.has(name);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const POLICY_COLUMNS = `${ORDER_COLUMNS},id,addons,vehicle_details,product_type`;

/**
 * Resolves which policy a question is about: the one the user named, or their
 * most recent active one. Always scoped to the caller.
 */
async function resolvePolicy(
  ctx: ToolContext,
  ref: string,
): Promise<{ row?: Record<string, unknown>; error?: string }> {
  if (ref && !ORDER_REF_RE.test(ref)) {
    return { error: 'Format nomor polis tidak valid. Minta pengguna menyalin nomornya persis dari daftar polis.' };
  }

  let q = ctx.db.from('sp_policy_orders').select(POLICY_COLUMNS).is('deleted_at', null);
  if (ref) q = q.or(`order_number.eq.${ref},policy_number.eq.${ref}`);
  q = ownerFilter(q, ctx, 'agent_id', ['client_id']);

  const { data, error } = await q.order('created_at', { ascending: false }).limit(ref ? 1 : 10);
  if (error) return { error: 'Tidak bisa membaca data polis saat ini.' };
  const rows = (data ?? []) as Record<string, unknown>[];
  if (rows.length === 0) {
    return { error: ref
      ? 'Polis dengan nomor tersebut tidak ditemukan pada akun ini.'
      : 'Belum ada polis pada akun ini. Tanyakan apakah pengguna mau dibuatkan penawaran.' };
  }
  if (ref) return { row: rows[0] };

  const active = rows.find(r => ACTIVE_POLICY_STATUSES.has(String(r.status ?? '').toUpperCase()));
  return { row: active ?? rows[0] };
}

/** Human list of the extensions actually on an order. */
function extensionList(addons: Record<string, unknown>): string[] {
  const out: string[] = [];
  if (hasAddon(addons, 'flood')) out.push('Banjir & angin topan');
  if (hasAddon(addons, 'earthquake')) out.push('Gempa bumi & tsunami');
  if (hasAddon(addons, 'riot')) out.push('Huru-hara (SRCC)');
  if (hasAddon(addons, 'terrorism')) out.push('Terorisme & sabotase');
  if (hasAddon(addons, 'tpl_limit')) out.push(`Tanggung jawab pihak ketiga (limit Rp ${Number(addons.tpl_limit).toLocaleString('id-ID')})`);
  if (hasAddon(addons, 'pa_driver')) out.push('Kecelakaan diri pengemudi');
  if (hasAddon(addons, 'pa_passenger_seats')) out.push(`Kecelakaan diri penumpang (${Number(addons.pa_passenger_seats)} kursi)`);
  return out;
}

// ─── check_coverage ──────────────────────────────────────────────────────────

async function checkCoverage(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  const perilKey = str(args.peril, 40);
  const peril = PERILS[perilKey];
  if (!peril) {
    return { result: { error: `Jenis risiko tidak dikenal. Pilih salah satu: ${PERIL_KEYS.join(', ')}.` } };
  }

  const { row, error } = await resolvePolicy(ctx, str(args.order_number, 60));
  if (error || !row) return { result: { error } };

  const coverageType = String(row.coverage_type ?? '').toUpperCase().includes('TLO') ? 'TLO' : 'COMPREHENSIVE';
  const addons = orderAddons(row.addons);

  let covered = false;
  let reason = '';
  let ownRisk: number | null = null;

  switch (peril.bucket) {
    case 'EXCLUDED':
      reason = 'Dikecualikan oleh polis standar kendaraan bermotor (PSAKBI).';
      break;
    case 'EXTENSION': {
      covered = !!peril.addonKey && hasAddon(addons, peril.addonKey);
      reason = covered
        ? 'Perluasan ini ada pada polismu, jadi risikonya dijamin.'
        : 'Perluasan ini TIDAK ada pada polismu, jadi risiko ini tidak dijamin. Bisa ditambahkan saat perpanjangan.';
      if (covered) ownRisk = OWN_RISK_EXTENSION_MIN;
      break;
    }
    case 'TOTAL_LOSS':
      covered = true;
      reason = 'Dijamin baik oleh Comprehensive maupun TLO.';
      ownRisk = OWN_RISK_BASE;
      break;
    case 'COMPREHENSIVE':
      covered = coverageType === 'COMPREHENSIVE';
      reason = covered
        ? 'Termasuk jaminan dasar polis Comprehensive-mu.'
        : 'Polismu TLO — hanya menjamin kerugian total, jadi kerusakan sebagian seperti ini tidak dijamin.';
      if (covered) ownRisk = OWN_RISK_BASE;
      break;
  }

  const data = {
    peril: perilKey,
    peril_label: peril.label,
    covered,
    reason,
    note: peril.note,
    policy: {
      order_number: row.order_number,
      policy_number: row.policy_number ?? null,
      coverage_type: coverageType,
      status: row.status,
      end_date: row.end_date ?? null,
      days_left: daysUntil(row.end_date as string),
    },
    extensions: extensionList(addons),
    own_risk: ownRisk,
    own_risk_note: ownRisk
      ? `Risiko sendiri sekitar Rp ${ownRisk.toLocaleString('id-ID')} per kejadian${peril.bucket === 'EXTENSION' ? ' atau 10% dari nilai klaim, mana yang lebih besar' : ''}. Angka pastinya tertulis di ikhtisar polis.`
      : null,
    disclaimer: COVERAGE_DISCLAIMER,
  };

  return { result: data, card: { type: 'coverage', data } };
}

// ─── start_claim ─────────────────────────────────────────────────────────────

async function startClaim(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  const perilKey = str(args.peril, 40);
  const peril = PERILS[perilKey];
  if (!peril) {
    return { result: { error: `Jenis risiko tidak dikenal. Pilih salah satu: ${PERIL_KEYS.join(', ')}.` } };
  }

  const { row, error } = await resolvePolicy(ctx, str(args.order_number, 60));
  if (error || !row) return { result: { error } };

  const status = String(row.status ?? '').toUpperCase();
  if (!ACTIVE_POLICY_STATUSES.has(status)) {
    return { result: {
      error: `Polis ${row.order_number} berstatus ${status}, belum aktif, jadi klaim belum bisa diajukan. Arahkan pengguna menyelesaikan pengajuannya dulu.`,
    } };
  }

  // Incident date must fall inside the policy period. A claim outside it is
  // rejected downstream anyway — better the user hears it now than after
  // assembling documents.
  const rawDate = str(args.incident_date, 10);
  const incidentDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;
  let periodWarning: string | null = null;
  if (incidentDate) {
    const start = String(row.start_date ?? '');
    const end = String(row.end_date ?? '');
    if (start && incidentDate < start) periodWarning = `Tanggal kejadian ${incidentDate} lebih awal dari mulai berlakunya polis (${start}).`;
    if (end && incidentDate > end) periodWarning = `Tanggal kejadian ${incidentDate} setelah polis berakhir (${end}).`;
    if (Date.parse(`${incidentDate}T00:00:00Z`) > Date.now()) periodWarning = 'Tanggal kejadian tidak boleh di masa depan.';
  }

  // Reuse the coverage engine so the claim advice can never disagree with the
  // coverage answer.
  const coverage = await checkCoverage({ peril: perilKey, order_number: row.order_number }, ctx);
  const cov = coverage.result as { covered?: boolean; reason?: string; own_risk?: number | null };

  const productKey = String(row.product_type ?? row.product_name ?? 'CAR').toUpperCase().includes('MOTOR') ? 'MOTOR' : 'CAR';
  const docs = CLAIM_DOCS[productKey] ?? CLAIM_DOCS.CAR;

  const data = {
    eligible: cov.covered === true && !periodWarning,
    covered: cov.covered === true,
    coverage_reason: cov.reason ?? null,
    period_warning: periodWarning,
    peril: perilKey,
    peril_label: peril.label,
    own_risk: cov.own_risk ?? null,
    policy: {
      order_number: row.order_number,
      policy_number: row.policy_number ?? null,
      product: row.product_name,
      coverage_type: row.coverage_type,
      start_date: row.start_date ?? null,
      end_date: row.end_date ?? null,
    },
    documents: docs,
    /** Prefill handed to the existing claim form — no claim row is created here. */
    prefill: {
      policy_number: row.policy_number ?? row.order_number ?? null,
      product_type: productKey,
      claim_type: productKey === 'MOTOR' ? 'MOTOR' : 'VEHICLE',
      incident_date: incidentDate,
      description: str(args.description, 1000) || null,
    },
    next_step: 'Buka formulir klaim, unggah foto kerusakan, lalu kirim. Analisis foto berjalan otomatis sebelum klaim masuk.',
    disclaimer: COVERAGE_DISCLAIMER,
  };

  return {
    result: {
      ...data,
      note: 'Klaim BELUM dikirim. Antarmuka menampilkan tombol untuk membuka formulir klaim dengan data ini. Jangan bilang klaimnya sudah diajukan.',
    },
    card: { type: 'claim_start', data },
  };
}

// ─── claim_status ────────────────────────────────────────────────────────────

async function claimStatus(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  const ref = str(args.claim_number, 60);
  if (ref && !ORDER_REF_RE.test(ref)) {
    return { result: { error: 'Format nomor klaim tidak valid.' } };
  }

  let q = ctx.db.from('sp_claims')
    .select('claim_number,policy_number,product_type,status,incident_date,date,amount_estimated,amount_approved,created_at,updated_at,photo_urls,photos')
    .is('deleted_at', null);
  if (ref) q = q.eq('claim_number', ref);
  q = ownerFilter(q, ctx, 'agent_id', ['client_id', 'user_id']);

  const { data, error } = await q.order('created_at', { ascending: false }).limit(10);
  if (error) return { result: { error: 'Tidak bisa membaca data klaim saat ini.' } };

  const rows = (data ?? []) as Record<string, unknown>[];
  if (rows.length === 0) {
    return { result: { count: 0, claims: [], note: 'Belum ada klaim pada akun ini.' } };
  }

  const claims = rows.map(c => {
    const st = String(c.status ?? '').toUpperCase();
    const stage = CLAIM_STAGES[st] ?? { stage: st || 'Tidak diketahui', next: 'Cek detail klaim di menu Klaim.' };
    const photoCount = Array.isArray(c.photo_urls)
      ? c.photo_urls.length
      : Array.isArray(c.photos) ? c.photos.length : 0;
    const missing: string[] = [];
    if (photoCount === 0) missing.push('Foto kerusakan belum ada');
    if (!c.incident_date && !c.date) missing.push('Tanggal kejadian belum terisi');
    return {
      ...shapeClaim(c),
      stage: stage.stage,
      next_step: stage.next,
      photo_count: photoCount,
      missing,
      updated_at: c.updated_at ?? null,
    };
  });

  return {
    result: { count: claims.length, claims },
    card: { type: 'claim_status', data: { claims } },
  };
}

// ─── renewal_check ───────────────────────────────────────────────────────────

async function renewalCheck(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  const daysAhead = clamp(Math.round(num(args.days_ahead, 90)), 1, 365);
  const todayStr = new Date().toISOString().slice(0, 10);
  const untilStr = new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10);

  let q = ctx.db.from('sp_policy_orders')
    .select(POLICY_COLUMNS)
    .is('deleted_at', null)
    .not('end_date', 'is', null)
    .gte('end_date', todayStr)
    .lte('end_date', untilStr);
  q = ownerFilter(q, ctx, 'agent_id', ['client_id']);

  const { data, error } = await q.order('end_date', { ascending: true }).limit(25);
  if (error) return { result: { error: 'Tidak bisa membaca data polis saat ini.' } };

  const rows = ((data ?? []) as Record<string, unknown>[])
    .filter(r => ACTIVE_POLICY_STATUSES.has(String(r.status ?? '').toUpperCase()));

  if (rows.length === 0) {
    return { result: { count: 0, renewals: [], note: `Tidak ada polis yang jatuh tempo dalam ${daysAhead} hari ke depan.` } };
  }

  const rs = ctx.rateSet ?? await loadRateSet(ctx.db);
  ctx.rateSet = rs;

  const renewals = rows.map(r => {
    const sumInsured = Number(r.sum_insured ?? 0);
    const vd = (r.vehicle_details ?? {}) as Record<string, unknown>;
    const isMotor = String(r.product_type ?? r.product_name ?? '').toUpperCase().includes('MOTOR');
    const coverage = String(r.coverage_type ?? '').toUpperCase().includes('TLO') ? 'TLO' : 'COMPREHENSIVE';
    const province = str(vd.province ?? vd.provinsi, 60);

    // Renewal premium is recomputed from the live OJK rate set against the
    // depreciated value — never carried over from last year's figure, which is
    // the number a customer would otherwise be quoted wrongly.
    let estimate: number | null = null;
    let newSumInsured: number | null = null;
    if (sumInsured >= 5_000_000) {
      // One year of use. 10%/yr straight-line is the market convention used by
      // the buy wizard; it is an estimate and labelled as one.
      newSumInsured = Math.round(sumInsured * 0.9);
      if (newSumInsured >= 5_000_000) {
        const band: OjkBand = 'MIN';
        const b = calcPremium(
          rs, isMotor ? 'MOTORCYCLE' : 'CAR', coverage as 'COMPREHENSIVE' | 'TLO',
          newSumInsured, province ? getZone(rs, province) : 3,
          {
            flood: hasAddon(orderAddons(r.addons), 'flood'),
            earthquake: hasAddon(orderAddons(r.addons), 'earthquake'),
            riot: hasAddon(orderAddons(r.addons), 'riot'),
            terrorism: hasAddon(orderAddons(r.addons), 'terrorism'),
            tplLimit: Number(orderAddons(r.addons).tpl_limit ?? 0) || 0,
            paDriver: hasAddon(orderAddons(r.addons), 'pa_driver'),
            paPassengerSeats: Number(orderAddons(r.addons).pa_passenger_seats ?? 0) || 0,
          },
          band,
        );
        estimate = b.total;
      }
    }

    return {
      order_number: r.order_number,
      policy_number: r.policy_number ?? null,
      product: r.product_name,
      client_name: r.client_name,
      coverage_type: coverage,
      end_date: r.end_date,
      days_left: daysUntil(r.end_date as string),
      current_premium: Number(r.total_premium ?? 0),
      current_sum_insured: sumInsured,
      renewal_sum_insured: newSumInsured,
      renewal_estimate: estimate,
      extensions: extensionList(orderAddons(r.addons)),
    };
  });

  return {
    result: {
      count: renewals.length,
      renewals,
      disclaimer: 'Estimasi perpanjangan memakai tarif OJK berjalan dan penyusutan nilai 10%/tahun. Premi final ditentukan insurer.',
    },
    card: { type: 'renewals', data: { renewals, scope: isAgentSide(ctx.caller.role) ? 'agent' : 'customer' } },
  };
}

// ─── explain_my_policy ───────────────────────────────────────────────────────

async function explainMyPolicy(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  const { row, error } = await resolvePolicy(ctx, str(args.order_number, 60));
  if (error || !row) return { result: { error } };

  const coverageType = String(row.coverage_type ?? '').toUpperCase().includes('TLO') ? 'TLO' : 'COMPREHENSIVE';
  const addons = orderAddons(row.addons);

  const covered: string[] = [];
  const notCovered: string[] = [];
  for (const p of Object.values(PERILS)) {
    const line = p.label;
    if (p.bucket === 'EXCLUDED') { notCovered.push(line); continue; }
    if (p.bucket === 'TOTAL_LOSS') { covered.push(line); continue; }
    if (p.bucket === 'COMPREHENSIVE') {
      (coverageType === 'COMPREHENSIVE' ? covered : notCovered).push(line);
      continue;
    }
    const on = !!p.addonKey && hasAddon(addons, p.addonKey);
    (on ? covered : notCovered).push(on ? line : `${line} — perluasan belum dibeli`);
  }

  const data = {
    policy: {
      ...shapeOrder(row),
      coverage_type: coverageType,
      days_left: daysUntil(row.end_date as string),
    },
    vehicle: row.vehicle_details ?? null,
    extensions: extensionList(addons),
    covered,
    not_covered: notCovered,
    own_risk: OWN_RISK_BASE,
    own_risk_note: `Risiko sendiri sekitar Rp ${OWN_RISK_BASE.toLocaleString('id-ID')} per kejadian untuk jaminan dasar; perluasan biasanya 10% dari nilai klaim dengan minimum Rp ${OWN_RISK_EXTENSION_MIN.toLocaleString('id-ID')}. Angka pastinya tertulis di ikhtisar polis.`,
    disclaimer: COVERAGE_DISCLAIMER,
  };

  return { result: data, card: { type: 'policy_explainer', data } };
}

// ─── payment_help ────────────────────────────────────────────────────────────

const UNPAID_STATUSES = ['PENDING_PAYMENT', 'AWAITING_PAYMENT', 'PENDING', 'UNPAID'];

async function paymentHelp(_args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  let q = ctx.db.from('sp_policy_orders')
    .select(`${ORDER_COLUMNS},id`)
    .is('deleted_at', null)
    .in('status', UNPAID_STATUSES);
  q = ownerFilter(q, ctx, 'agent_id', ['client_id']);

  const { data, error } = await q.order('created_at', { ascending: false }).limit(10);
  if (error) return { result: { error: 'Tidak bisa membaca data pengajuan saat ini.' } };

  const orders = (data ?? []) as Record<string, unknown>[];
  if (orders.length === 0) {
    return { result: { count: 0, pending: [], note: 'Tidak ada tagihan yang menunggu pembayaran. Semua pengajuan sudah lunas atau belum sampai tahap bayar.' } };
  }

  // Only ever surface an invoice that already exists. Creating one is a
  // money-path action and stays in create-xendit-invoice.
  const ids = orders.map(o => String(o.id));
  const { data: payments } = await ctx.db
    .from('sp_payments')
    .select('order_id,invoice_url,status,amount,created_at')
    .in('order_id', ids)
    .order('created_at', { ascending: false });

  const latestByOrder = new Map<string, Record<string, unknown>>();
  for (const p of (payments ?? []) as Record<string, unknown>[]) {
    const key = String(p.order_id);
    if (!latestByOrder.has(key)) latestByOrder.set(key, p);
  }

  const pending = orders.map(o => {
    const pay = latestByOrder.get(String(o.id));
    const url = pay?.invoice_url ? String(pay.invoice_url) : null;
    return {
      order_number: o.order_number,
      product: o.product_name,
      client_name: o.client_name,
      amount: Number(o.total_premium ?? 0),
      status: o.status,
      created_at: o.created_at,
      // Only https links are ever handed to the UI.
      invoice_url: url && /^https:\/\//i.test(url) ? url : null,
      payment_status: pay?.status ?? null,
      hint: url ? 'Tautan pembayaran masih tersedia.' : 'Belum ada tautan pembayaran. Buka pengajuan di menu Polis untuk membuatnya.',
    };
  });

  return {
    result: { count: pending.length, pending, note: 'Pathy tidak memproses pembayaran — hanya menunjukkan tagihan dan tautan yang sudah ada.' },
    card: { type: 'payment_help', data: { pending } },
  };
}

// ─── Agent: pipeline_nudge ───────────────────────────────────────────────────

async function pipelineNudge(_args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  if (!isAgentSide(ctx.caller.role)) {
    return { result: { error: 'Fitur ini hanya untuk akun agen.' } };
  }
  const ids = safeIds(ctx.caller.ownerIds);
  if (ids.length === 0) return { result: { error: 'Profil agen tidak ditemukan.' } };

  const nowIso = new Date().toISOString();
  const soonIso = new Date(Date.now() + 7 * 86_400_000).toISOString();

  const [quotesRes, ordersRes] = await Promise.all([
    ctx.db.from('sp_quotes')
      .select('id,client_name,product_type,premium_estimate,status,created_at,expires_at')
      .in('agent_id', ids)
      .eq('status', 'DRAFT')
      .not('expires_at', 'is', null)
      .gte('expires_at', nowIso)
      .lte('expires_at', soonIso)
      .order('expires_at', { ascending: true })
      .limit(25),
    ctx.db.from('sp_policy_orders')
      .select('order_number,client_name,product_name,status,total_premium,created_at')
      .in('agent_id', ids)
      .is('deleted_at', null)
      .in('status', UNPAID_STATUSES)
      .lte('created_at', new Date(Date.now() - 3 * 86_400_000).toISOString())
      .order('created_at', { ascending: true })
      .limit(25),
  ]);

  const expiringQuotes = ((quotesRes.data ?? []) as Record<string, unknown>[]).map(q => ({
    id: q.id,
    client_name: q.client_name,
    product_type: q.product_type,
    premium_estimate: Number(q.premium_estimate ?? 0),
    expires_at: q.expires_at,
    days_left: daysUntil(q.expires_at as string),
  }));

  const stalledOrders = ((ordersRes.data ?? []) as Record<string, unknown>[]).map(o => ({
    order_number: o.order_number,
    client_name: o.client_name,
    product: o.product_name,
    status: o.status,
    total_premium: Number(o.total_premium ?? 0),
    created_at: o.created_at,
    days_waiting: Math.abs(daysUntil(o.created_at as string) ?? 0),
  }));

  const data = { expiring_quotes: expiringQuotes, stalled_orders: stalledOrders };
  return {
    result: {
      ...data,
      summary: `${expiringQuotes.length} penawaran mendekati kedaluwarsa, ${stalledOrders.length} pengajuan menunggu pembayaran lebih dari 3 hari.`,
    },
    card: { type: 'pipeline', data },
  };
}

// ─── Agent: commission_forecast ──────────────────────────────────────────────

async function commissionForecast(_args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  if (!isAgentSide(ctx.caller.role)) {
    return { result: { error: 'Fitur ini hanya untuk akun agen.' } };
  }
  const ids = safeIds(ctx.caller.ownerIds);
  if (ids.length === 0) return { result: { error: 'Profil agen tidak ditemukan.' } };

  // Wallet and commission tables are read-only here — Pathy can never move
  // money. Balances change only through the SECURITY DEFINER RPCs.
  const [walletRes, commRes, inflightRes] = await Promise.all([
    ctx.db.from('sp_agent_wallets').select('balance,total_earned,total_withdrawn').in('agent_id', ids).limit(1).maybeSingle(),
    ctx.db.from('sp_commissions').select('commission_amount,status').in('agent_id', ids).limit(1000),
    ctx.db.from('sp_policy_orders')
      .select('order_number,client_name,status,commission_amount,total_premium')
      .in('agent_id', ids).is('deleted_at', null)
      .in('status', [...UNPAID_STATUSES, 'SUBMITTED', 'IN_REVIEW', 'APPROVED'])
      .limit(500),
  ]);

  const commissions = (commRes.data ?? []) as Record<string, unknown>[];
  const sumBy = (pred: (s: string) => boolean) => commissions
    .filter(c => pred(String(c.status ?? '').toUpperCase()))
    .reduce((a, c) => a + Number(c.commission_amount ?? 0), 0);

  const inflight = (inflightRes.data ?? []) as Record<string, unknown>[];
  const expected = inflight.reduce((a, o) => a + Number(o.commission_amount ?? 0), 0);

  const wallet = walletRes.data as Record<string, unknown> | null;
  const data = {
    wallet_balance: Number(wallet?.balance ?? 0),
    total_earned: Number(wallet?.total_earned ?? 0),
    total_withdrawn: Number(wallet?.total_withdrawn ?? 0),
    commission_pending: sumBy(s => s === 'PENDING'),
    commission_paid: sumBy(s => s === 'PAID' || s === 'CREDITED'),
    inflight_orders: inflight.length,
    expected_from_inflight: expected,
    disclaimer: 'Perkiraan dari pengajuan yang masih berjalan. Komisi baru masuk dompet setelah pembayaran nasabah terkonfirmasi.',
  };

  return { result: data, card: { type: 'commission_forecast', data } };
}

// ─── Agent: draft_followup ───────────────────────────────────────────────────

const UUID_ONLY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function draftFollowup(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  if (!isAgentSide(ctx.caller.role)) {
    return { result: { error: 'Fitur ini hanya untuk akun agen.' } };
  }
  const quoteId = str(args.quote_id, 40);
  if (!UUID_ONLY.test(quoteId)) {
    return { result: { error: 'quote_id harus UUID penawaran dari get_my_quotes atau pipeline_nudge.' } };
  }
  const ids = safeIds(ctx.caller.ownerIds);
  if (ids.length === 0) return { result: { error: 'Profil agen tidak ditemukan.' } };

  const { data: quote, error } = await ctx.db
    .from('sp_quotes')
    .select('id,client_name,product_type,premium_estimate,expires_at,quote_data')
    .eq('id', quoteId)
    .in('agent_id', ids)
    .maybeSingle();
  if (error) return { result: { error: 'Tidak bisa membaca penawaran saat ini.' } };
  if (!quote) return { result: { error: 'Penawaran tidak ditemukan pada akun agen ini.' } };

  const tone = str(args.tone, 20) || 'ramah';
  const name = String(quote.client_name ?? 'Bapak/Ibu');
  const premium = Number(quote.premium_estimate ?? 0);
  const rupiah = `Rp ${premium.toLocaleString('id-ID')}`;
  const vehicle = String((quote.quote_data as Record<string, unknown> | null)?.vehicle_description ?? '') ||
    (String(quote.product_type ?? '').toUpperCase() === 'MOTOR' ? 'motor' : 'mobil');
  const left = daysUntil(quote.expires_at as string);
  const deadline = left != null && left >= 0 ? `Penawaran ini berlaku ${left} hari lagi.` : '';
  const agent = ctx.caller.name || 'Mitra SurePath';

  const templates: Record<string, string> = {
    ramah: `Halo ${name}, semoga sehat selalu 🙏\n\nSaya ${agent} dari SurePath. Menindaklanjuti penawaran asuransi ${vehicle} kemarin — preminya di ${rupiah} untuk setahun. ${deadline}\n\nKalau ada yang mau ditanyakan soal jaminan atau perluasannya, saya siap bantu. Mau saya kirimkan proposal lengkapnya?`,
    singkat: `Halo ${name}, ini ${agent} dari SurePath. Penawaran asuransi ${vehicle}: ${rupiah}/tahun. ${deadline} Mau lanjut?`,
    formal: `Yth. ${name},\n\nMenindaklanjuti penawaran asuransi ${vehicle} yang kami sampaikan, premi tahunan yang berlaku adalah ${rupiah}. ${deadline}\n\nKami siap membantu apabila Bapak/Ibu memerlukan penjelasan mengenai lingkup jaminan maupun perluasannya.\n\nHormat kami,\n${agent}\nSurePath`,
  };

  const message = templates[tone] ?? templates.ramah;
  const data = {
    quote_id: quote.id,
    client_name: name,
    premium_estimate: premium,
    tone,
    message,
    /** The UI turns this into a wa.me link the AGENT taps. Pathy never sends. */
    channel: 'whatsapp',
  };

  return {
    result: { ...data, note: 'Ini draft. Pathy tidak mengirim pesan — agen yang menekan kirim.' },
    card: { type: 'followup_draft', data },
  };
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export async function runServiceTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolOutcome> {
  switch (name) {
    case 'check_coverage':      return await checkCoverage(args, ctx);
    case 'start_claim':         return await startClaim(args, ctx);
    case 'claim_status':        return await claimStatus(args, ctx);
    case 'renewal_check':       return await renewalCheck(args, ctx);
    case 'explain_my_policy':   return await explainMyPolicy(args, ctx);
    case 'payment_help':        return await paymentHelp(args, ctx);
    case 'pipeline_nudge':      return await pipelineNudge(args, ctx);
    case 'commission_forecast': return await commissionForecast(args, ctx);
    case 'draft_followup':      return await draftFollowup(args, ctx);
    default:
      return { result: { error: `Tool tidak dikenal: ${name}` } };
  }
}
