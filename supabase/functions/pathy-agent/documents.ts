// ─────────────────────────────────────────────────────────────────────────────
// What happens to a document after Pathy reads it.
//
// Before v2.5.0 an attachment lived for exactly one turn: the client OCR'd it,
// Pathy priced from it, and the extracted fields were thrown away. Ask the same
// customer for their STNK twice in a week and they had to photograph it twice.
//
// Two things happen here instead:
//
//   1. **Archive (automatic, no model involved).** Every attachment on a turn is
//      appended to `sp_user_documents`, scoped to the caller. Deterministic —
//      the model cannot decide not to, and cannot decide to file it under
//      somebody else's id, because the id comes from the verified JWT.
//
//   2. **Enrichment (only when the user says yes).** `save_document_data` fills
//      the caller's own profile — or, for an agent, their client record —
//      from a KTP/STNK read. It only ever fills fields that are EMPTY. Silently
//      overwriting a name or an address the user typed themselves, on the
//      strength of an OCR guess, is the kind of "helpful" write that turns into
//      a support ticket, so an overwrite needs `overwrite: true`, which the
//      system prompt only lets the model send after the user asks for it.
//
// Still no money path, no order writes, no claim writes.
// ─────────────────────────────────────────────────────────────────────────────

import {
  DOCUMENT_TYPES, isAgentSide, str, type PathyDocument, type PathyDocumentType,
  type ToolContext, type ToolOutcome,
} from './common.ts';

/** Columns on sp_users this may ever touch. Nothing about money, role or trust. */
const USER_SAFE_COLUMNS = ['name', 'phone', 'ktp', 'address'] as const;
type UserColumn = typeof USER_SAFE_COLUMNS[number];

const NIK_RE = /^[0-9]{16}$/;

/** Field names the readers produce, mapped onto profile columns. */
function profileFieldsFrom(doc: PathyDocument): Partial<Record<UserColumn, string>> {
  const f = doc.fields ?? {};
  const out: Partial<Record<UserColumn, string>> = {};

  const name = str(f.name ?? f.owner_name, 120);
  if (name) out.name = name;

  const nik = String(f.nik ?? '').replace(/\D/g, '');
  if (NIK_RE.test(nik)) out.ktp = nik;

  const address = str(f.address, 300);
  if (address) out.address = address;

  const phone = str(f.phone, 32);
  if (phone) out.phone = phone;

  return out;
}

/** The vehicle shape kept on an archived STNK row, for reuse in later quotes. */
function vehicleFrom(doc: PathyDocument): Record<string, unknown> | null {
  if (doc.type !== 'STNK') return null;
  const f = doc.fields ?? {};
  const v = {
    plate: str(f.plate, 20) || null,
    brand: str(f.brand, 60) || null,
    model: str(f.model, 80) || null,
    variant: str(f.variant, 80) || null,
    year: Number(f.year) || null,
    province: str(f.province ?? f.region, 60) || null,
    zone: Number(f.zone) || null,
    market_value: Number(f.market_value) || null,
    owner_name: str(f.owner_name, 120) || null,
  };
  return Object.values(v).some(x => x !== null) ? v : null;
}

/**
 * Files every attachment on this turn.
 *
 * Deliberately never throws and never blocks the answer: if the table is not
 * there yet in an environment, Pathy still works, it just does not remember.
 */
export async function archiveDocuments(ctx: ToolContext): Promise<void> {
  const docs = ctx.documents ?? [];
  if (docs.length === 0) return;

  const agentSide = isAgentSide(ctx.caller.role);
  const rows = docs.map(d => ({
    user_id: ctx.caller.ownerId,
    // An agent scanning a customer's papers is filing it under their own
    // agent id, not turning it into their own identity.
    owner_role: agentSide ? 'AGENT' : 'CUSTOMER',
    doc_type: d.type,
    label: d.label ? str(d.label, 80) : null,
    fields: d.fields ?? {},
    confidence: typeof d.confidence === 'number' ? d.confidence : null,
    source: 'PATHY_CHAT',
  }));

  try {
    const { error } = await ctx.db.from('sp_user_documents').insert(rows);
    if (error) console.error('pathy archiveDocuments:', error.message);
  } catch (e) {
    console.error('pathy archiveDocuments threw:', e);
  }
}

// deno-lint-ignore no-explicit-any
export const documentToolSchemas: any[] = [
  {
    type: 'function',
    function: {
      name: 'save_document_data',
      description:
        'Simpan data hasil baca dokumen ke akun pengguna supaya tidak perlu difoto ulang lain kali. ' +
        'Untuk CUSTOMER: melengkapi profilnya sendiri (nama, NIK, alamat, telepon). ' +
        'Untuk AGENT: menyimpan/memperbarui data klien di daftar kliennya. ' +
        'Panggil HANYA setelah pengguna setuju disimpan. Secara default hanya mengisi kolom yang masih kosong; ' +
        'kirim overwrite=true hanya kalau pengguna eksplisit minta datanya diperbarui/diganti.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: DOCUMENT_TYPES, description: 'Jenis dokumen yang mau disimpan datanya.' },
          overwrite: { type: 'boolean', description: 'true hanya bila pengguna minta data lamanya diganti.' },
        },
        required: ['type'],
      },
    },
  },
];

export const isDocumentTool = (name: string) => name === 'save_document_data';

export async function runDocumentTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolOutcome> {
  if (name !== 'save_document_data') return { result: { error: `Tool tidak dikenal: ${name}` } };
  return await saveDocumentData(args, ctx);
}

async function saveDocumentData(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolOutcome> {
  const want = str(args.type, 10).toUpperCase() as PathyDocumentType;
  const doc = (ctx.documents ?? []).find(d => d.type === want);
  if (!doc) {
    return { result: {
      error: `Tidak ada lampiran ${want || 'dokumen'} di percakapan ini. Minta pengguna melampirkan fotonya dulu.`,
      available: (ctx.documents ?? []).map(d => d.type),
    } };
  }

  const overwrite = args.overwrite === true;
  const fields = profileFieldsFrom(doc);
  const vehicle = vehicleFrom(doc);

  if (Object.keys(fields).length === 0 && !vehicle) {
    return { result: { error: 'Dokumen ini tidak memuat data identitas atau kendaraan yang bisa disimpan.' } };
  }

  return isAgentSide(ctx.caller.role)
    ? await saveToClient(ctx, doc, fields, vehicle, overwrite)
    : await saveToProfile(ctx, doc, fields, vehicle, overwrite);
}

/** CUSTOMER — completes their own sp_users row. Never another user's. */
async function saveToProfile(
  ctx: ToolContext,
  doc: PathyDocument,
  fields: Partial<Record<UserColumn, string>>,
  vehicle: Record<string, unknown> | null,
  overwrite: boolean,
): Promise<ToolOutcome> {
  const { data: current, error: readErr } = await ctx.db
    .from('sp_users')
    .select('id,name,phone,ktp,address')
    .eq('id', ctx.caller.ownerId)
    .maybeSingle();

  if (readErr || !current) {
    return { result: { error: 'Profilmu belum bisa dibaca, jadi datanya belum bisa kusimpan.' } };
  }

  const updates: Record<string, string> = {};
  const skipped: string[] = [];
  for (const col of USER_SAFE_COLUMNS) {
    const value = fields[col];
    if (!value) continue;
    const existing = str(current[col], 300);
    if (existing && !overwrite) {
      if (existing.toLowerCase() !== value.toLowerCase()) skipped.push(col);
      continue;
    }
    updates[col] = value;
  }

  let saved: string[] = Object.keys(updates);
  if (saved.length > 0) {
    const { error } = await ctx.db
      .from('sp_users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', ctx.caller.ownerId);
    if (error) {
      console.error('pathy saveToProfile:', error.message);
      return { result: { error: 'Data gagal disimpan ke profil. Coba lagi nanti ya.' } };
    }
  } else {
    saved = [];
  }

  const data = {
    target: 'PROFILE',
    doc_type: doc.type,
    saved_fields: saved,
    skipped_fields: skipped,
    vehicle,
    note: skipped.length > 0
      ? 'Beberapa data sudah terisi sebelumnya dan sengaja tidak kutimpa.'
      : null,
  };

  return {
    result: {
      ...data,
      instruction: skipped.length > 0
        ? 'Sebutkan kolom mana yang tersimpan dan mana yang dibiarkan karena sudah terisi, lalu tawarkan memperbaruinya kalau memang mau diganti.'
        : 'Konfirmasikan singkat apa saja yang tersimpan.',
    },
    card: { type: 'document_saved', data },
  };
}

/**
 * AGENT — the papers they scan belong to a customer, so they land in
 * sp_clients under this agent, never on the agent's own profile.
 */
async function saveToClient(
  ctx: ToolContext,
  doc: PathyDocument,
  fields: Partial<Record<UserColumn, string>>,
  vehicle: Record<string, unknown> | null,
  overwrite: boolean,
): Promise<ToolOutcome> {
  const name = fields.name ?? '';
  const ktp = fields.ktp ?? '';
  if (!name && !ktp) {
    return { result: { error: 'Dokumen ini belum memuat nama atau NIK klien, jadi belum bisa disimpan sebagai data klien.' } };
  }

  // Match on NIK first (unique in practice), then on an exact name, and always
  // inside this agent's own client list.
  let existing: Record<string, unknown> | null = null;
  if (ktp) {
    const { data } = await ctx.db.from('sp_clients')
      .select('id,name,phone,ktp,address')
      .eq('agent_id', ctx.caller.ownerId).eq('ktp', ktp).maybeSingle();
    existing = data ?? null;
  }
  if (!existing && name) {
    const { data } = await ctx.db.from('sp_clients')
      .select('id,name,phone,ktp,address')
      .eq('agent_id', ctx.caller.ownerId).ilike('name', name).maybeSingle();
    existing = data ?? null;
  }

  const payload: Record<string, unknown> = {};
  const skipped: string[] = [];
  for (const col of USER_SAFE_COLUMNS) {
    const value = fields[col];
    if (!value) continue;
    const prior = existing ? str(existing[col], 300) : '';
    if (prior && !overwrite) {
      if (prior.toLowerCase() !== value.toLowerCase()) skipped.push(col);
      continue;
    }
    payload[col] = value;
  }

  let clientId: string | null = existing ? String(existing.id) : null;

  if (existing) {
    if (Object.keys(payload).length > 0) {
      const { error } = await ctx.db.from('sp_clients')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', clientId).eq('agent_id', ctx.caller.ownerId);
      if (error) {
        console.error('pathy saveToClient update:', error.message);
        return { result: { error: 'Data klien gagal diperbarui. Coba lagi nanti ya.' } };
      }
    }
  } else {
    const { data, error } = await ctx.db.from('sp_clients').insert({
      agent_id: ctx.caller.ownerId,
      name: name || 'Klien tanpa nama',
      ...payload,
      status: 'PROSPECT',
      notes: `Dibuat otomatis dari pembacaan ${doc.type} lewat Pathy.`,
    }).select('id').single();
    if (error) {
      console.error('pathy saveToClient insert:', error.message);
      return { result: { error: 'Klien baru gagal disimpan. Coba lagi nanti ya.' } };
    }
    clientId = data?.id ?? null;
  }

  const data = {
    target: 'CLIENT',
    doc_type: doc.type,
    client_id: clientId,
    client_name: name || (existing ? str(existing.name, 120) : ''),
    created: !existing,
    saved_fields: Object.keys(payload),
    skipped_fields: skipped,
    vehicle,
  };

  return {
    result: {
      ...data,
      instruction: 'Konfirmasikan singkat bahwa data klien tersimpan di daftar klien agen. Jangan menyebut polis atau order — ini baru data klien.',
    },
    card: { type: 'document_saved', data },
  };
}

/**
 * Values pulled from this turn's attachments, used to fill in arguments the
 * model left out of a pricing call.
 *
 * The model is told to read the attachment first, but when it forgets, quoting
 * against a made-up sum insured is far worse than quoting against the STNK the
 * user is literally looking at. These are only ever used as FALLBACKS — an
 * explicit argument always wins, because the user may well have corrected the
 * OCR in the chat.
 */
export function attachmentHints(ctx: ToolContext): Record<string, unknown> {
  const hints: Record<string, unknown> = {};
  const stnk = (ctx.documents ?? []).find(d => d.type === 'STNK');
  const ktp = (ctx.documents ?? []).find(d => d.type === 'KTP');

  if (stnk) {
    const f = stnk.fields ?? {};
    if (f.brand) hints.brand = str(f.brand, 60);
    if (f.model) hints.model = str(f.model, 80);
    if (Number(f.year)) hints.year = Number(f.year);
    if (f.plate) hints.plate = str(f.plate, 20);
    const province = str(f.province ?? f.region, 60);
    if (province) hints.province = province;
    if (Number(f.market_value)) hints.sum_insured = Number(f.market_value);
    const brand = String(f.brand ?? '').toUpperCase();
    const cc = Number(f.cylinder_cc ?? 0);
    if (cc > 0 && cc <= 250) hints.vehicle_type = 'MOTORCYCLE';
    else if (brand) hints.vehicle_type = 'CAR';
  }

  if (ktp) {
    const f = ktp.fields ?? {};
    if (f.name) hints.client_name = str(f.name, 120);
    if (f.address) hints.client_address = str(f.address, 300);
  }

  return hints;
}
