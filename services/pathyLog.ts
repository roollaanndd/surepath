// Rekaman percakapan Pathy.
//
// Ditulis dari browser, bukan dari `pathy-agent`. Itu bukan pilihan desain
// melainkan konsekuensi: `pathy-agent` belum bisa di-deploy dari lingkungan ini,
// dan menunggu berarti fitur ini tidak ada sama sekali. Browser memang peserta
// percakapannya, jadi ia tahu isinya.
//
// Yang TIDAK dipercayakan pada browser adalah identitas: `user_id`, `user_email`
// dan `source` ditimpa dari JWT oleh trigger database sebelum baris tersimpan
// (lihat 20260915_sp_pathy_messages.sql). Jadi kolom identitas di sini hanya
// formalitas — nilainya diabaikan server.
//
// Sifat perekamnya sengaja tidak pernah menggagalkan obrolan: kalau penyimpanan
// gagal, pengguna tetap dapat jawabannya. Rekaman yang hilang jauh lebih murah
// daripada chat yang mati gara-gara tabel audit.

import { supabase } from './db';

const TABLE = 'sp_pathy_messages';

/** Satu sesi obrolan = satu conversation_id, hidup selama tab dibuka. */
let currentConversationId: string | null = null;

const newId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : // Jalur cadangan untuk lingkungan tanpa crypto.randomUUID (uji, WebView lama).
      '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
        (Number(c) ^ (Math.floor(Math.random() * 256) & (15 >> (Number(c) / 4)))).toString(16),
      );

export function currentPathyConversationId(): string {
  if (!currentConversationId) currentConversationId = newId();
  return currentConversationId;
}

/** Dipanggil saat pengguna membuka obrolan baru, supaya transkrip tidak menyatu. */
export function startNewPathyConversation(): string {
  currentConversationId = newId();
  return currentConversationId;
}

export interface PathyTurn {
  question: string;
  answer: string;
  toolsUsed?: string[];
  degraded?: boolean;
}

/**
 * Merekam satu giliran (pertanyaan + jawaban) sebagai dua baris.
 *
 * Dua baris, bukan satu, karena transkrip dibaca berurutan per peran — dan
 * karena giliran yang jawabannya gagal tetap menyisakan pertanyaannya, yang
 * justru bagian paling berguna saat menelusuri keluhan pengguna.
 */
export async function recordPathyTurn(turn: PathyTurn): Promise<void> {
  const conversation_id = currentPathyConversationId();
  const rows = [
    { conversation_id, role: 'user' as const, content: turn.question, tools_used: null, degraded: false },
    {
      conversation_id,
      role: 'assistant' as const,
      content: turn.answer,
      tools_used: turn.toolsUsed?.length ? turn.toolsUsed : null,
      degraded: Boolean(turn.degraded),
    },
  ].filter(r => r.content.trim().length > 0);

  if (rows.length === 0) return;

  try {
    const { error } = await supabase.from(TABLE).insert(rows);
    if (error) console.warn('recordPathyTurn:', error.message);
  } catch (e) {
    console.warn('recordPathyTurn:', e);
  }
}

// ─── Sisi CMS ────────────────────────────────────────────────────────────────

export interface PathyMessageRow {
  id: number;
  created_at: string;
  user_id: string;
  user_email: string | null;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  tools_used: string[] | null;
  degraded: boolean;
  source: 'CLIENT' | 'AGENT';
}

export interface PathyUserSummary {
  user_id: string;
  user_email: string | null;
  messages: number;
  conversations: number;
  last_seen: string;
}

/**
 * Baris mentah untuk CMS. Dibaca LANGSUNG dari tabel, bukan lewat gateway —
 * kebijakan RLS `pathy select admin` yang menjaganya, jadi layar ini hidup tanpa
 * menunggu deploy edge function. Pengguna non-admin hanya akan menerima barisnya
 * sendiri dari kueri yang sama persis.
 */
export async function fetchPathyMessages(sinceHours: number, limit = 2000): Promise<PathyMessageRow[]> {
  const since = new Date(Date.now() - sinceHours * 3_600_000).toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as PathyMessageRow[];
}

/** Meringkas per pengguna — pertanyaan pertama admin adalah "siapa yang pakai". */
export function summarisePathyUsers(rows: PathyMessageRow[]): PathyUserSummary[] {
  const byUser = new Map<string, PathyUserSummary & { convIds: Set<string> }>();
  for (const r of rows) {
    let e = byUser.get(r.user_id);
    if (!e) {
      e = {
        user_id: r.user_id,
        user_email: r.user_email,
        messages: 0,
        conversations: 0,
        last_seen: r.created_at,
        convIds: new Set<string>(),
      };
      byUser.set(r.user_id, e);
    }
    e.messages += 1;
    e.convIds.add(r.conversation_id);
    // Baris datang terbaru-dulu, tapi jangan bergantung pada itu.
    if (r.created_at > e.last_seen) e.last_seen = r.created_at;
    if (!e.user_email && r.user_email) e.user_email = r.user_email;
  }
  return [...byUser.values()]
    .map(({ convIds, ...rest }) => ({ ...rest, conversations: convIds.size }))
    .sort((a, b) => (a.last_seen < b.last_seen ? 1 : -1));
}
