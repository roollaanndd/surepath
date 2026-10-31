// contactLeads.ts — 3 actions
//
// Prospek dari formulir kontak situs publik (`/contact`).
//
// Sebelum ini, formulir itu tidak mengirim apa pun: `handleSubmit` hanya
// memanggil `setSent(true)` lalu memberi tahu pengunjung bahwa pesannya
// terkirim. Semua prospek hilang. Lihat migrasi
// 20261031100000_contact_leads.sql.
//
// `submit_contact_lead` adalah aksi PUBLIK — pengunjung situs tidak punya
// akun. Karena itu: rate limit per IP, batas panjang di setiap kolom, dan
// `ip`/`user_agent`/`status` diisi server, tidak pernah dari parameter klien.
import type { GatewayContext, ActionResult } from './types.ts';

const json = (body: unknown, status = 200): ActionResult => ({ status, body });

/** Status yang boleh diset operator. Teks bebas dari klien ditolak. */
const LEAD_STATUSES = ['NEW', 'CONTACTED', 'CLOSED'] as const;

/**
 * Email longgar tapi cukup: satu `@`, ada titik di domain, tidak ada spasi.
 * Validasi ketat di sini tidak berguna — satu-satunya cara tahu sebuah email
 * hidup adalah mengirim surat ke sana.
 */
const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export async function handleContactLeadsAction(
  action: string,
  ctx: GatewayContext,
): Promise<ActionResult | null> {
  const { db, params, caller, reqIp, reqUserAgent, checkRateLimit, sendTelegram } = ctx;

  switch (action) {
    // ── Publik: pengunjung situs mengirim formulir kontak ──────────────────
    case 'submit_contact_lead': {
      // reqIp/reqUserAgent berasal dari header permintaan di index.ts.
      // Jangan pernah membacanya dari params: pengunjung anonim mengendalikan
      // params sepenuhnya, jadi batas per-IP akan trivial untuk dilewati.
      const ip = (reqIp ?? '').trim() || 'unknown';

      // 10 kiriman per jam per IP. Lebih longgar dari batas umum 60/jam karena
      // ini satu endpoint saja, tapi cukup ketat untuk tidak menjadikannya
      // saluran spam ke antrean operator.
      const allowed = await checkRateLimit(`contact:${ip}`, 10);
      if (!allowed) {
        return json({ error: 'Terlalu banyak pesan dari koneksi ini. Coba lagi dalam 1 jam.' }, 429);
      }

      const name = String(params.name ?? '').trim().slice(0, 120);
      const email = String(params.email ?? '').trim().toLowerCase().slice(0, 160);
      const phone = String(params.phone ?? '').trim().slice(0, 32);
      const message = String(params.message ?? '').trim().slice(0, 4000);
      const sourcePath = String(params.source_path ?? '').trim().slice(0, 200);

      if (!name) return json({ error: 'Nama wajib diisi' }, 400);
      if (!message) return json({ error: 'Pesan wajib diisi' }, 400);
      // Operator harus punya cara membalas. Tanpa salah satu dari keduanya,
      // prospek ini mustahil ditindaklanjuti — lebih baik ditolak di depan
      // daripada mengisi antrean dengan baris yang tidak bisa dihubungi.
      if (!email && !phone) {
        return json({ error: 'Isi email atau nomor telepon supaya kami bisa membalas' }, 400);
      }
      if (email && !looksLikeEmail(email)) {
        return json({ error: 'Format email tidak valid' }, 400);
      }

      const { data, error } = await db
        .from('sp_contact_leads')
        .insert({
          name,
          email: email || null,
          phone: phone || null,
          message,
          source_path: sourcePath || null,
          status: 'NEW',
          ip: ip === 'unknown' ? null : ip,
          user_agent: reqUserAgent ?? null,
        })
        .select('id')
        .maybeSingle();

      if (error) return json({ error: error.message }, 500);

      // Email dan WhatsApp belum aktif sebagai tujuan prospek (31 Okt 2026),
      // jadi Telegram adalah satu-satunya pemberitahuan langsung yang hidup.
      // Kegagalannya tidak boleh menjatuhkan kiriman pengunjung — barisnya
      // sudah tersimpan dan tetap muncul di portal operator.
      try {
        await sendTelegram(
          `📬 Prospek baru dari situs\n` +
          `Nama: ${name}\n` +
          (email ? `Email: ${email}\n` : '') +
          (phone ? `Telepon: ${phone}\n` : '') +
          (sourcePath ? `Halaman: ${sourcePath}\n` : '') +
          `\n${message.slice(0, 500)}`,
        );
      } catch { /* notifikasi gagal tidak membatalkan prospek */ }

      return json({ ok: true, id: data?.id ?? null });
    }

    // ── Operator/admin: baca antrean prospek ───────────────────────────────
    case 'list_contact_leads': {
      if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);

      const status = String(params.status ?? '').trim().toUpperCase();
      const limit = Math.min(Math.max(Number(params.limit ?? 100) || 100, 1), 500);

      let q = db
        .from('sp_contact_leads')
        .select('id, name, email, phone, message, source_path, status, notes, handled_at, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status && (LEAD_STATUSES as readonly string[]).includes(status)) {
        q = q.eq('status', status);
      }

      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      return json({ leads: data ?? [] });
    }

    // ── Operator/admin: tandai sudah ditindaklanjuti ────────────────────────
    case 'update_contact_lead': {
      if (!caller.isAdmin) return json({ error: 'Forbidden: admin only' }, 403);

      const id = String(params.id ?? '').trim();
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Invalid lead id' }, 400);

      const status = String(params.status ?? '').trim().toUpperCase();
      if (!(LEAD_STATUSES as readonly string[]).includes(status)) {
        return json({ error: `Status harus salah satu dari: ${LEAD_STATUSES.join(', ')}` }, 400);
      }

      const patch: Record<string, unknown> = {
        status,
        // handled_by selalu dari pemanggil terverifikasi, bukan dari params.
        handled_by: caller.authId || null,
        handled_at: new Date().toISOString(),
      };
      if (params.notes !== undefined) {
        patch.notes = String(params.notes ?? '').trim().slice(0, 2000) || null;
      }

      const { error } = await db.from('sp_contact_leads').update(patch).eq('id', id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    default:
      return null;
  }
}
