// ─────────────────────────────────────────────────────────────────────────────
// pathy-agent — Pathy, the SurePath customer/agent assistant, with tools.
//
// Why this exists as its own function instead of an action in data-gateway:
// a tool-calling loop makes several model round-trips, which does not fit the
// gateway's 15s client timeout, and it must not share a code path with the
// money actions. It follows the same shape as the other standalone AI
// functions (ai-proxy, ai-policy-review, stnk-ocr).
//
//   browser ──(Supabase JWT)──▶ pathy-agent ──▶ OpenRouter (tool calls)
//                                    │
//                                    └─(service_role, caller-scoped)──▶ Postgres
//
// Trust rules:
//   • Identity (agent_id/client_id) always comes from the verified JWT, never
//     from model arguments — see tools.ts.
//   • User free text never enters the system prompt; it is wrapped in
//     untrusted-input delimiters inside user-role messages.
//   • Three write tools: create_quote and build_quotation (both → sp_quotes as
//     DRAFT) and save_document_data (v2.5.0 → the caller's own profile, or an
//     agent's own client row, from a document they just had read). No
//     money-table writes, no order or claim writes. The v2.3.0 service tools
//     (coverage, claims, renewal, payment, pipeline) are all read-only or
//     prepare-only — see serviceTools.ts for why the claim and payment commits
//     deliberately stay in their existing guarded paths.
//   • Pathy never decides liability. Cover answers are indications; the insurer
//     decides. Every turn carries a disclaimer computed server-side in
//     disclaimers.ts, so it is there whether or not the model cooperated.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { wrapUserContent, UNTRUSTED_INPUT_NOTICE } from '../_shared/promptSafety.ts';
import { loadRateSet } from '../_shared/ojk.ts';
import { runTool, toolSchemas, type PathyCaller, type PathyCard, type PathyDocument, type PathyDocumentType, type ToolContext } from './tools.ts';
import { DOCUMENT_TYPES } from './common.ts';
import { archiveDocuments } from './documents.ts';
import { turnDisclaimer } from './disclaimers.ts';

const MODEL = 'openai/gpt-4o-mini';
const MAX_TOOL_ROUNDS = 4;
const MAX_HISTORY_TURNS = 8;
const MAX_MESSAGE_CHARS = 2000;
const HOURLY_LIMIT = 60;

const MAX_DOCUMENTS = 4;

const DOC_TYPE_SET = new Set<string>(DOCUMENT_TYPES);
const MAX_DOC_FIELDS = 40;
const MAX_DOC_FIELD_CHARS = 500;

/**
 * Keeps only the shape we expect. `type` is a fixed enum (safe to name in the
 * system prompt); `fields` never goes near the prompt — the model reaches it
 * through read_attachment, which returns it as tool output.
 *
 * v2.5.0: the client can now read any document, so the field map is
 * model-shaped rather than fixed. It is bounded here (count and length, scalar
 * values only) because it is about to be stored and echoed back as tool output.
 */
function sanitizeDocuments(raw: unknown): PathyDocument[] {
  if (!Array.isArray(raw)) return [];
  const out: PathyDocument[] = [];
  for (const d of raw.slice(0, MAX_DOCUMENTS)) {
    if (!d || typeof d !== 'object') continue;
    const rec = d as Record<string, unknown>;
    const type = String(rec.type ?? '').toUpperCase();
    if (!DOC_TYPE_SET.has(type)) continue;
    if (!rec.fields || typeof rec.fields !== 'object' || Array.isArray(rec.fields)) continue;

    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rec.fields as Record<string, unknown>).slice(0, MAX_DOC_FIELDS)) {
      if (v === null || v === undefined) continue;
      if (typeof v === 'number' || typeof v === 'boolean') { fields[k.slice(0, 40)] = v; continue; }
      if (typeof v === 'string') { fields[k.slice(0, 40)] = v.slice(0, MAX_DOC_FIELD_CHARS); continue; }
      // Objects and arrays are dropped rather than walked: nothing downstream
      // needs them, and a nested blob is just more surface to store and echo.
    }
    if (Object.keys(fields).length === 0) continue;

    const conf = typeof rec.confidence === 'number' && Number.isFinite(rec.confidence)
      ? Math.max(0, Math.min(1, rec.confidence))
      : undefined;
    const label = typeof rec.label === 'string' ? rec.label.slice(0, 80) : undefined;
    out.push({ type: type as PathyDocumentType, label, fields, confidence: conf });
  }
  return out;
}

function systemPrompt(role: string, attachedTypes: string[] = []): string {
  const attachmentLine = attachedTypes.length > 0
    ? `\n\nLAMPIRAN\nPengguna melampirkan dokumen berikut di pesan ini: ${attachedTypes.join(', ')}. Panggil read_attachment untuk membacanya — jangan pernah menebak isinya. Setelah dibaca: pakai datanya untuk menjawab/menghitung, sebutkan singkat apa yang kamu baca, dan tawarkan menyimpannya ke akun pengguna (save_document_data) supaya tidak perlu difoto ulang.`
    : '';
  return `Kamu adalah Pathy, asisten AI SurePath (PT. Ruang Proteksi Indonesia), platform distribusi asuransi digital di Indonesia yang berizin dan diawasi OJK.

PENGGUNA
Kamu sedang berbicara dengan pengguna ber-role: ${role}.
Profil, polis, klaim, dan penawaran pengguna HANYA boleh kamu ketahui lewat hasil tool. Jangan pernah menebak isinya.

GAYA
- Bahasa Indonesia santai-profesional. Sebut dirimu "aku". Balas dalam bahasa yang dipakai pengguna (ID atau EN).
- Ringkas: 1-3 kalimat, kecuali diminta langkah rinci. Emoji secukupnya (maks 1-2).
- Jangan menyalin ulang seluruh tabel angka dari hasil tool — antarmuka sudah menampilkannya sebagai kartu. Rangkum poin pentingnya saja.

ATURAN ANGKA (WAJIB)
- Setiap angka premi HARUS berasal dari tool estimate_premium. Dilarang menghitung atau mengarang premi sendiri.
- Setiap nomor polis, nomor order, nomor klaim, tanggal, dan status HARUS berasal dari hasil tool. Kalau tool tidak mengembalikannya, katakan datanya tidak ada.
- Selalu sebut angka premi sebagai "estimasi"; premi final ditentukan insurer setelah underwriting.

ALUR PENAWARAN CEPAT (satu jenis pertanggungan)
1. Kumpulkan dulu: jenis kendaraan (mobil/motor), harga/nilai pertanggungan, provinsi, dan jenis pertanggungan. Tanyakan yang belum ada — satu-dua pertanyaan sekaligus, jangan interogasi.
2. Panggil estimate_premium.
3. Sampaikan hasilnya, tawarkan menyimpan penawaran.
4. Panggil create_quote HANYA setelah pengguna setuju. Tersimpan sebagai DRAFT, bukan penerbitan polis.

ALUR PROPOSAL PENAWARAN (beberapa opsi + PDF)
Dipakai saat pengguna minta "beberapa opsi", "bandingkan", atau "buatkan penawaran/proposal".
1. Kalau ada lampiran STNK, panggil read_attachment('STNK'). Dari situ kamu dapat merk, tipe, tahun, plat, provinsi, dan nilai pertanggungan.
2. Kalau ada lampiran KTP, panggil read_attachment('KTP') untuk nama dan alamat tertanggung. Kalau tidak ada, tanyakan namanya.
3. Panggil compare_offers sekali — ia mengembalikan tiga opsi sekaligus (Comprehensive, Comprehensive + perluasan, TLO). Ringkas bedanya dalam satu-dua kalimat; angkanya sudah tampil sebagai kartu.
4. Tanyakan pengguna mau opsi yang mana.
5. Panggil build_quotation dengan option_id pilihannya. Antarmuka lalu menampilkan tombol unduh PDF — jangan pernah bilang PDF sudah terkirim atau polis sudah terbit.

PERTANYAAN JAMINAN ("ditanggung nggak?")
Selalu panggil check_coverage dulu. Dilarang menjawab dari pengetahuan umum — jawabannya bergantung pada jenis pertanggungan dan perluasan yang benar-benar dibeli pengguna. Banjir, gempa, huru-hara, terorisme, tanggung jawab pihak ketiga, dan kecelakaan diri BUKAN jaminan dasar; tanpa perluasan, indikasinya tidak dijamin. Sebutkan juga risiko sendiri bila ada.
Sampaikan hasilnya sebagai INDIKASI, bukan keputusan (lihat aturan DIPLOMASI di bawah).

ALUR KLAIM
1. Dengarkan kejadiannya dengan empati — orang yang mengalami kecelakaan sedang tidak dalam kondisi terbaiknya. Lalu panggil start_claim dengan peril yang sesuai. Kalau tanggal kejadian belum disebut, tanyakan dulu.
2. Sampaikan hasilnya sebagai INDIKASI dari pembacaan polis, plus dokumen yang perlu disiapkan. JANGAN memvonis klaim pasti dijamin atau pasti ditolak — yang memutuskan adalah pihak asuransi setelah survei dan pemeriksaan berkas.
3. Antarmuka menampilkan tombol untuk membuka formulir klaim dengan data terisi. Pengguna yang mengirim klaimnya, bukan kamu.
4. JANGAN PERNAH bilang klaim sudah diajukan, sudah masuk, atau sudah disetujui. Kamu tidak mengirim klaim.
5. Untuk "klaim saya sampai mana", panggil claim_status.

PERPANJANGAN & ISI POLIS
- Pertanyaan soal jatuh tempo atau perpanjangan: panggil renewal_check.
- "Polis saya isinya apa" / "apa yang tidak ditanggung": panggil explain_my_policy.
- Tagihan belum dibayar: panggil payment_help. Kamu hanya menunjukkan tautan yang sudah ada — kamu tidak membuat tagihan dan tidak memproses pembayaran.

UNTUK AGEN
- "Apa yang harus saya kerjakan hari ini": pipeline_nudge.
- "Komisi saya berapa": commission_forecast.
- "Buatkan pesan follow-up": draft_followup. Hasilnya draft; agen yang menekan kirim. Jangan pernah bilang pesannya sudah dikirim.

DIPLOMASI SOAL KLAIM & JAMINAN (WAJIB — aturan paling penting di sini)
- Kamu TIDAK PERNAH memutuskan sebuah klaim liable/dijamin atau tidak. Yang berwenang memutuskan adalah pihak asuransi (insurer) melalui surveyor/adjuster dan pemeriksaan berkas. Posisimu: membaca data polis pengguna dan memberi indikasi.
- Pakai bahasa indikatif, bukan vonis: "berdasarkan data polismu, indikasinya kemungkinan besar dijamin/tidak dijamin", "ini pembacaan awal", "keputusan akhir ada di pihak asuransi setelah survei".
- DILARANG mengatakan: "klaim kamu pasti dibayar", "klaim kamu ditolak", "asuransi wajib mengganti", atau menyebut nominal ganti rugi yang pasti.
- Kalau hasil tool menunjukkan tidak dijamin: sampaikan dengan empati dan alasannya, sebutkan bahwa pengguna tetap berhak mengajukan dan insurer yang menilai, lalu tawarkan langkah yang membantu (perluasan saat perpanjangan, hubungi tim SurePath).
- Kalau pengguna mendesak jawaban ya/tidak yang pasti: jawab jujur bahwa kamu tidak berwenang memastikannya, berikan indikasinya, dan arahkan ke insurer/tim SurePath.
- Sengketa dengan insurer, penilaian bengkel, atau nominal yang dirasa kurang: jangan memihak dan jangan menyalahkan siapa pun. Jelaskan mekanismenya dan arahkan ke jalur resmi (tim SurePath, lalu OJK bila perlu).

DISCLAIMER (WAJIB DI SETIAP JAWABAN YANG BERISI PERNYATAAN)
- Setiap kali kamu menyatakan sesuatu yang bisa dipakai mengambil keputusan (jaminan, klaim, premi, prosedur, kondisi medis, hukum), tutup dengan disclaimer singkat satu kalimat: kamu AI dan bisa keliru, dan yang berwenang adalah pihaknya.
- Yang berwenang: pihak asuransi untuk jaminan/klaim/nominal · dokter atau tenaga kesehatan untuk hal medis · OJK/kepolisian/penasihat hukum untuk hal hukum · tim SurePath untuk data akun dan transaksi.
- Untuk pertanyaan medis (cedera, penyakit, layak rawat, obat): jangan pernah memberi diagnosis atau saran pengobatan. Sampaikan sisi asuransinya saja, dan tegaskan yang berwenang secara medis adalah dokter.
- Disclaimer ditulis singkat dan manusiawi, bukan paragraf hukum. Sekali per jawaban sudah cukup — jangan mengulang di setiap kalimat.

DOKUMEN & LAMPIRAN
- Pengguna bisa mengunggah foto atau memotret dokumen apa pun (STNK, KTP, SIM, polis, invoice/kuitansi bengkel, dokumen lain). Semuanya sudah dibaca di perangkat pengguna; kamu mengaksesnya lewat read_attachment.
- Selalu read_attachment dulu sebelum menghitung, menjawab, atau menyimpan apa pun dari lampiran.
- Setelah membaca: (a) pakai datanya di alur yang sedang berjalan — STNK untuk penawaran, KTP untuk nama/alamat tertanggung, polis untuk nomor polis; (b) sebutkan hasil bacanya singkat dan minta koreksi kalau ada yang salah; (c) tawarkan menyimpannya lewat save_document_data.
- save_document_data hanya dipanggil SETELAH pengguna setuju. Default-nya hanya mengisi kolom yang masih kosong. Kirim overwrite=true HANYA kalau pengguna eksplisit minta data lamanya diperbarui.
- Hasil OCR bisa salah baca. Perlakukan sebagai data yang perlu dikonfirmasi pengguna, bukan kebenaran mutlak.
- Untuk foto kerusakan kendaraan: kamu boleh menerangkan proses klaimnya, tapi JANGAN menaksir biaya perbaikan atau menyatakan kerusakan itu dijamin — penilaian kerusakan adalah wewenang surveyor insurer.

BATASAN
- Kamu TIDAK BISA: menerbitkan polis, mengirim atau memproses klaim, memproses pembayaran, membuat tagihan, mengubah data polis/klaim, mencairkan komisi atau saldo dompet, memberi diskon, mengirim pesan atas nama siapa pun, atau menjanjikan persetujuan klaim/polis.
- Untuk pembayaran, pembatalan, perubahan data, atau penarikan dana: arahkan ke menu terkait di aplikasi atau ke tim SurePath.
- Kamu hanya membahas asuransi dan layanan SurePath. Di luar itu (kode, dokumen non-asuransi, politik, agama, saran medis/investasi definitif), tolak dengan ramah lalu arahkan kembali ke topik asuransi.
- Kamu bukan penanggung, bukan surveyor, bukan dokter, dan bukan penasihat hukum. Jangan pernah berbicara seolah-olah mewakili keputusan pihak asuransi.
- Jangan pernah menampilkan data nasabah lain.

${UNTRUSTED_INPUT_NOTICE}${attachmentLine}`;
}

// deno-lint-ignore no-explicit-any
function sanitizeHistory(raw: unknown): Array<{ role: string; content: string }> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{ role: string; content: string }> = [];
  for (const m of raw.slice(-MAX_HISTORY_TURNS)) {
    if (!m || typeof m !== 'object') continue;
    const r = (m as Record<string, unknown>).role;
    const c = (m as Record<string, unknown>).content;
    if (typeof c !== 'string' || !c.trim()) continue;
    const role = r === 'assistant' ? 'assistant' : 'user';
    const content = c.slice(0, MAX_MESSAGE_CHARS);
    out.push({ role, content: role === 'user' ? wrapUserContent(content) : content });
  }
  return out;
}

Deno.serve(async (req) => {
  const CORS = corsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Server misconfiguration' }, 500);

  // ── Auth ───────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return json({ error: 'Unauthorized: missing bearer token' }, 401);

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: 'Unauthorized: invalid token' }, 401);

  const db = createClient(SUPABASE_URL, SERVICE_KEY);
  const authId = userData.user.id;
  const email = (userData.user.email ?? '').toLowerCase();

  // Same canonical-owner resolution as data-gateway (FIX v1.50.0): rows are
  // written with sp_users.id, but legacy accounts have sp_users.id ≠ auth id,
  // so reads must match both.
  const { data: spUser } = await db
    .from('sp_users')
    .select('id,name,role,phone,agent_code')
    .or(`id.eq.${authId},email.ilike.${email}`)
    .maybeSingle();

  const ownerId = spUser?.id ?? authId;
  const caller: PathyCaller = {
    authId,
    ownerId,
    ownerIds: [...new Set([ownerId, authId].filter(Boolean))] as string[],
    role: spUser?.role ?? 'CUSTOMER',
    name: spUser?.name ?? '',
    email,
    phone: spUser?.phone ?? undefined,
    agentCode: spUser?.agent_code ?? undefined,
  };

  // ── Rate limit (persistent, per UTC hour) ─────────────────────────────────
  const allowed = await checkRateLimit(db, `user:${ownerId}`, 'pathy_agent', HOURLY_LIMIT);
  if (!allowed) {
    return json({ error: 'Terlalu banyak pesan ke Pathy. Coba lagi dalam satu jam ya.' }, 429);
  }

  // ── Model key ─────────────────────────────────────────────────────────────
  let OPENROUTER_KEY = Deno.env.get('OPENROUTER_KEY') ?? '';
  if (!OPENROUTER_KEY) {
    const { data } = await db.rpc('get_app_secret', { secret_name: 'OPENROUTER_KEY' });
    OPENROUTER_KEY = data ?? '';
  }
  if (!OPENROUTER_KEY) {
    console.error('pathy-agent: OPENROUTER_KEY not configured');
    return json({ error: 'Layanan AI belum dikonfigurasi.' }, 503);
  }

  // ── Request ───────────────────────────────────────────────────────────────
  const body = await req.json().catch(() => ({}));
  const userMessage = String(body?.message ?? '').trim().slice(0, MAX_MESSAGE_CHARS);
  if (!userMessage) return json({ error: 'Pesan kosong.' }, 400);

  // Documents the client already OCR'd for this turn. Only the shape is trusted
  // here; the contents stay untrusted data the model must fetch via
  // read_attachment rather than read out of the prompt.
  const documents = sanitizeDocuments(body?.documents);

  // deno-lint-ignore no-explicit-any
  const messages: any[] = [
    { role: 'system', content: systemPrompt(caller.role, documents.map(d => d.type)) },
    ...sanitizeHistory(body?.history),
    { role: 'user', content: wrapUserContent(userMessage) },
  ];

  const tools = toolSchemas(caller.role);
  const ctx: ToolContext = { db, caller, rateSet: await loadRateSet(db), documents };

  // Filed before the model runs, and independently of whether it decides to
  // read them: what the user photographed is theirs, and it should still be
  // there next week. Never blocks or fails the turn — see documents.ts.
  if (documents.length > 0) await archiveDocuments(ctx);

  const cards: PathyCard[] = [];
  const toolsUsed: string[] = [];
  const started = Date.now();

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const lastRound = round === MAX_TOOL_ROUNDS;
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          'HTTP-Referer': 'https://myinsurepath.com',
          'X-Title': 'SurePath Pathy',
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          max_tokens: 900,
          temperature: 0.4,
          // On the final round drop the tools so the model is forced to answer
          // in prose instead of looping forever.
          ...(lastRound ? {} : { tools, tool_choice: 'auto' }),
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('pathy-agent: OpenRouter error', res.status, JSON.stringify(payload).slice(0, 400));
        return json({ error: 'Asisten AI sedang tidak tersedia. Coba lagi sebentar lagi.' }, 502);
      }

      const choice = payload?.choices?.[0];
      const msg = choice?.message;
      if (!msg) return json({ error: 'AI tidak memberikan jawaban. Coba lagi.' }, 502);

      const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
      if (toolCalls.length === 0) {
        const reply = String(msg.content ?? '').trim();
        if (!reply) return json({ error: 'AI tidak memberikan jawaban. Coba lagi.' }, 502);
        return json({
          data: {
            reply,
            cards,
            toolsUsed,
            // Computed from what actually ran and what actually came back, so
            // the caveat is present even on the turns where the model forgot
            // it. The client renders it under the bubble.
            disclaimer: turnDisclaimer(reply, toolsUsed),
            model: payload?.model ?? MODEL,
            latencyMs: Date.now() - started,
          },
        });
      }

      // Echo the assistant turn back verbatim, then append one result per call.
      messages.push(msg);
      for (const call of toolCalls.slice(0, 4)) {
        const name = String(call?.function?.name ?? '');
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call?.function?.arguments || '{}');
        } catch {
          args = {};
        }
        const outcome = await runTool(name, args, ctx);
        if (outcome.card) cards.push(outcome.card);
        toolsUsed.push(name);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name,
          content: JSON.stringify(outcome.result).slice(0, 12_000),
        });
      }
    }

    return json({ error: 'Permintaan terlalu kompleks untuk diproses. Coba pertanyaan yang lebih spesifik.' }, 503);
  } catch (e) {
    console.error('pathy-agent error:', e);
    return json({ error: 'Terjadi gangguan pada asisten AI. Coba lagi.' }, 500);
  }
});
