// mitraAccounts.ts — pengelolaan akun mitra (agen) dari CMS admin.
//
// Tiga aksi, semuanya istimewa dan semuanya dijalankan service_role di sini —
// bukan di browser:
//
//   admin_create_mitra            buat akun auth + profil sp_users sekaligus
//   admin_send_mitra_reset        dorong email setel ulang kata sandi
//   admin_set_mitra_temp_password setel kata sandi sementara (MASTER_ADMIN)
//
// KENAPA TIDAK ADA "LIHAT KATA SANDI".
// Supabase Auth menyimpan bcrypt hash, bukan kata sandinya. Tidak ada jalan
// matematis dari hash ke teks aslinya, jadi "lihat kata sandi" hanya mungkin
// kalau aplikasi ini ikut menyimpan salinan teks terangnya — tepat kebiasaan
// yang audit keamanan 2026-10-23 habis dibersihkan, dan satu kebocoran basis
// data akan menyerahkan kredensial setiap mitra. Penggantinya ada di bawah:
// MASTER_ADMIN bisa MENETAPKAN kata sandi sementara yang ditampilkan sekali,
// dengan paksaan ganti saat login berikutnya. Secara operasional setara
// ("saya bisa membantu mitra yang terkunci"), tanpa menyimpan satu pun kata
// sandi yang bisa dibaca.
import type { GatewayContext, ActionResult } from './types.ts';
import { isUntrustedEmail } from '../../_shared/trust.ts';

const json = (body: unknown, status = 200): ActionResult => ({ status, body });

// Per-kapabilitas, bukan `caller.isAdmin`. ADMIN_ROLES di index.ts memuat
// OPERATOR, FINANCE, dan INSURANCE_ADMIN; membuat akun mitra dan menyentuh
// kredensialnya bukan pekerjaan mereka. Pelajaran yang sama dengan
// FINANCE_ROLES: begitu satu aksi digerbang `isAdmin`, gerbangnya hilang.
const CAN_MANAGE_MITRA_ACCOUNT = ['MASTER_ADMIN', 'ADMIN'];
const CAN_SET_MITRA_PASSWORD = ['MASTER_ADMIN'];

const APP_ORIGIN = 'https://myinsurepath.com';
// AuthGate memakai `?reset=1` untuk tetap di formulir setel ulang alih-alih
// menyelesaikan sesi pemulihan sebagai login biasa (components/AuthGate.tsx).
const RESET_REDIRECT = `${APP_ORIGIN}?reset=1`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// `Deno` ada di runtime edge function tapi tidak di program tsc — modul ini
// ikut ditarik ke dalamnya oleh services/__tests__/mitraAccounts.test.ts, yang
// menjalankannya di Node. Dibaca lewat globalThis supaya keduanya aman.
function envGet(key: string): string {
  const deno = (globalThis as { Deno?: { env: { get(k: string): string | undefined } } }).Deno;
  return deno?.env.get(key) ?? '';
}

// Huruf/angka yang ambigu saat didiktekan lewat telepon (0/O, 1/l/I) dibuang —
// kata sandi sementara ini memang diucapkan ke mitra, bukan ditempel.
const PW_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
function generateTempPassword(length = 14): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) out += PW_ALPHABET[bytes[i] % PW_ALPHABET.length];
  // Satu simbol di posisi tetap supaya tetap lolos kebijakan "harus ada
  // karakter khusus" tanpa membuat panjangnya acak.
  return out.slice(0, 4) + '-' + out.slice(4, 9) + '-' + out.slice(9);
}

function agentCode(): string {
  return 'SP-AGT-' + String(Math.floor(1000 + Math.random() * 9000));
}

export async function handleMitraAccountsAction(
  action: string,
  ctx: GatewayContext,
): Promise<ActionResult | null> {
  const { db, params, caller, sendTelegram } = ctx;

  switch (action) {
    // ── Tambah mitra manual ───────────────────────────────────────────────
    //
    // `admin_register_agent` yang lama HANYA menulis baris sp_users, tanpa
    // pengguna auth. Mitranya muncul di daftar CMS tapi tidak pernah bisa
    // masuk — tidak ada kredensial untuk dipakai. Aksi ini membuat keduanya,
    // dengan urutan yang sama seperti pendaftaran sendiri (ensure_profile):
    // pengguna auth dulu, lalu profil dengan id yang sama.
    case 'admin_create_mitra': {
      if (!CAN_MANAGE_MITRA_ACCOUNT.includes(caller.role ?? '')) {
        return json({ error: 'Forbidden: hanya ADMIN atau MASTER_ADMIN' }, 403);
      }

      const name = String(params.name ?? '').trim();
      const email = String(params.email ?? '').trim().toLowerCase();
      const phone = String(params.phone ?? '').trim();
      if (!name || !email || !phone) {
        return json({ error: 'name, email, phone wajib diisi' }, 400);
      }
      if (!EMAIL_RE.test(email)) return json({ error: 'Format email tidak valid' }, 400);

      // Gerbang domain yang sama dengan pendaftaran sendiri. MASTER_ADMIN bisa
      // melewatinya: kalau mitra sungguhan memakai domain yang kebetulan masuk
      // daftar, keputusan itu memang keputusan bisnis, bukan keputusan kode.
      if (isUntrustedEmail(email) && caller.role !== 'MASTER_ADMIN') {
        return json({
          error: 'Domain email tersebut tidak bisa menerima email. Minta MASTER_ADMIN bila memang disengaja.',
          code: 'UNTRUSTED_EMAIL_DOMAIN',
        }, 403);
      }

      // Bentrokan diperiksa lebih dulu supaya pesannya jelas, bukan pesan
      // "duplicate key" dari Postgres.
      const { data: existing } = await db.from('sp_users')
        .select('id, email, role').eq('email', email).maybeSingle();
      if (existing) {
        return json({
          error: `Email ${email} sudah terdaftar sebagai ${existing.role ?? 'pengguna'}.`,
          code: 'EMAIL_TAKEN',
        }, 409);
      }

      // 'invite'  → mitra menerima email undangan dan menyetel sandinya sendiri.
      // 'temp'    → kata sandi sementara ditampilkan sekali ke admin.
      const mode = params.mode === 'temp' ? 'temp' : 'invite';
      if (mode === 'temp' && !CAN_SET_MITRA_PASSWORD.includes(caller.role ?? '')) {
        return json({ error: 'Forbidden: kata sandi sementara hanya MASTER_ADMIN' }, 403);
      }

      const tempPassword = mode === 'temp' ? generateTempPassword() : null;
      const authMeta = { name, phone, role: 'AGENT', created_by_admin: caller.email };

      let authUserId: string | null = null;
      if (mode === 'temp') {
        const { data: created, error: createErr } = await db.auth.admin.createUser({
          email,
          password: tempPassword!,
          email_confirm: true,
          user_metadata: { ...authMeta, must_change_password: true },
        });
        if (createErr) return json({ error: createErr.message }, 400);
        authUserId = created.user?.id ?? null;
      } else {
        const { data: invited, error: inviteErr } = await db.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${APP_ORIGIN}/agapps`,
          data: authMeta,
        });
        if (inviteErr) return json({ error: inviteErr.message }, 400);
        authUserId = invited.user?.id ?? null;
      }
      if (!authUserId) return json({ error: 'Gagal membuat akun auth' }, 500);

      // Cerminan cabang AGENT di ensure_profile — nilai default yang sama,
      // supaya mitra buatan admin tidak berbeda dari mitra yang mendaftar
      // sendiri.
      const insertRow: Record<string, unknown> = {
        id: authUserId,
        email,
        name,
        phone,
        ktp: params.ktp ?? null,
        address: params.address ?? null,
        role: 'AGENT',
        agent_code: agentCode(),
        commission_rate: 0.1,
        monthly_target: 50000000,
        trust_score: 80,
        // Mitra buatan admin tetap melewati verifikasi seperti yang lain.
        // Admin yang sama bisa langsung menekan Approve setelahnya; itu
        // tercatat terpisah lewat admin_verify_agent.
        verified: false,
      };

      // Upline opsional — dicocokkan ke agent_code atau referral_code, dengan
      // nilai yang dibersihkan lebih dulu. Interpolasi mentah ke .or() adalah
      // kelas bug injeksi filter yang ditutup di v2.6.18.
      const rawUpline = String(params.upline_code ?? '').trim();
      const uplineCode = rawUpline.replace(/[^A-Za-z0-9-]/g, '').slice(0, 32);
      if (uplineCode) {
        const { data: upline } = await db.from('sp_users')
          .select('id')
          .or(`agent_code.eq.${uplineCode},referral_code.eq.${uplineCode}`)
          .maybeSingle();
        if (!upline) {
          await db.auth.admin.deleteUser(authUserId).catch(() => {});
          return json({ error: `Kode upline ${uplineCode} tidak ditemukan`, code: 'UPLINE_NOT_FOUND' }, 400);
        }
        insertRow.upline_id = upline.id;
      }

      const { data: profile, error: profileErr } = await db.from('sp_users')
        .insert(insertRow).select().single();
      if (profileErr) {
        // Tanpa langkah ini kegagalan di sini meninggalkan pengguna auth tanpa
        // profil: mitranya bisa masuk, tidak punya baris sp_users, dan
        // ensure_profile akan membuatkannya sebagai CUSTOMER.
        await db.auth.admin.deleteUser(authUserId).catch(() => {});
        return json({ error: profileErr.message }, 400);
      }

      db.from('sp_admin_notifications').insert({
        type: 'NEW_AGENT',
        title: 'Mitra Ditambahkan Manual',
        body: `${name} (${email}) ditambahkan oleh ${caller.email}.`,
        read: false,
        metadata: { user_id: profile.id, role: 'AGENT', email, created_by: caller.email, mode },
      }).then(() => {}, () => {});

      sendTelegram(
        `Mitra Baru (manual) - SurePath\n\n` +
        `Nama: ${name}\nEmail: ${email}\nHP: ${phone || '-'}\n` +
        `Ditambahkan oleh: ${caller.email}\n` +
        `Mode: ${mode === 'temp' ? 'kata sandi sementara' : 'email undangan'}`,
      );

      return json({
        data: profile,
        mode,
        // Ditampilkan sekali di CMS lalu hilang. Tidak pernah ditulis ke
        // tabel mana pun — sp_activity_log pun hanya menyimpan NAMA kunci
        // parameter, bukan nilainya (lihat recordActivity di index.ts).
        temp_password: tempPassword,
      });
    }

    // ── Dorong setel ulang kata sandi ─────────────────────────────────────
    case 'admin_send_mitra_reset': {
      if (!CAN_MANAGE_MITRA_ACCOUNT.includes(caller.role ?? '')) {
        return json({ error: 'Forbidden: hanya ADMIN atau MASTER_ADMIN' }, 403);
      }
      if (!params.user_id) return json({ error: 'user_id wajib diisi' }, 400);

      const { data: target, error: targetErr } = await db.from('sp_users')
        .select('id, email, name, role').eq('id', String(params.user_id)).maybeSingle();
      if (targetErr) return json({ error: targetErr.message }, 400);
      if (!target) return json({ error: 'Mitra tidak ditemukan' }, 404);
      // Aksi ini hidup di layar Manajemen Mitra; membiarkannya menyentuh
      // MASTER_ADMIN atau ADMIN lain menjadikannya alat pengambilalihan akun.
      if (target.role !== 'AGENT') {
        return json({ error: 'Aksi ini hanya untuk akun mitra (AGENT)', code: 'NOT_AN_AGENT' }, 400);
      }

      // GoTrue /auth/v1/recover adalah satu-satunya panggilan yang benar-benar
      // MENGIRIM surat pemulihan; admin.generateLink di bawah hanya membuat
      // tautannya tanpa mengirim apa pun. Dipanggil lewat fetch dengan kunci
      // anon, bukan lewat createClient, supaya modul ini tetap bebas impor
      // 'npm:' dan bisa diuji di vitest seperti modul actions yang lain.
      const SUPABASE_URL = envGet('SUPABASE_URL');
      const ANON_KEY = envGet('SUPABASE_ANON_KEY');
      if (!SUPABASE_URL || !ANON_KEY) return json({ error: 'Server misconfiguration' }, 500);
      const recoverRes = await fetch(
        `${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(RESET_REDIRECT)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
          body: JSON.stringify({ email: String(target.email) }),
        },
      );
      if (!recoverRes.ok) {
        const detail = await recoverRes.text().catch(() => '');
        return json({ error: `Gagal mengirim email setel ulang: ${detail.slice(0, 200)}` }, 400);
      }

      // Pengiriman email ke Indonesia sering tersangkut. MASTER_ADMIN juga
      // menerima tautannya supaya bisa menyerahkannya lewat kanal lain; ini
      // tidak diberikan ke ADMIN karena tautan pemulihan setara dengan akses
      // penuh ke akun itu.
      let recoveryLink: string | null = null;
      if (caller.role === 'MASTER_ADMIN') {
        const { data: link } = await db.auth.admin.generateLink({
          type: 'recovery',
          email: String(target.email),
          options: { redirectTo: RESET_REDIRECT },
        });
        recoveryLink = (link as { properties?: { action_link?: string } })?.properties?.action_link ?? null;
      }

      return json({
        data: { email: target.email, name: target.name },
        recovery_link: recoveryLink,
      });
    }

    // ── Kata sandi sementara ──────────────────────────────────────────────
    //
    // Pengganti "lihat kata sandi". Ditampilkan sekali, tidak pernah disimpan,
    // dan secara bawaan memaksa mitra menggantinya saat login berikutnya —
    // bendera `must_change_password` di user_metadata dibaca AuthGate.
    case 'admin_set_mitra_temp_password': {
      if (!CAN_SET_MITRA_PASSWORD.includes(caller.role ?? '')) {
        return json({ error: 'Forbidden: hanya MASTER_ADMIN' }, 403);
      }
      if (!params.user_id) return json({ error: 'user_id wajib diisi' }, 400);

      const { data: target, error: targetErr } = await db.from('sp_users')
        .select('id, email, name, role').eq('id', String(params.user_id)).maybeSingle();
      if (targetErr) return json({ error: targetErr.message }, 400);
      if (!target) return json({ error: 'Mitra tidak ditemukan' }, 404);
      if (target.role !== 'AGENT') {
        return json({ error: 'Aksi ini hanya untuk akun mitra (AGENT)', code: 'NOT_AN_AGENT' }, 400);
      }

      const requireChange = params.require_change !== false;
      const password = generateTempPassword();

      // sp_users.id BISA berbeda dari auth.users.id untuk akun lama (lihat
      // ownerIds di index.ts), jadi akun auth dicari lewat email, bukan id
      // profil — menyetel sandi ke id yang salah akan mengubah akun lain.
      //
      // generateLink dipakai sebagai pencarian email → akun auth: ia
      // mengembalikan user-nya tanpa mengirim surat apa pun, dan tidak punya
      // batas halaman seperti listUsers() yang hanya memuat 50 akun pertama.
      const { data: lookup, error: lookupErr } = await db.auth.admin.generateLink({
        type: 'recovery',
        email: String(target.email),
        options: { redirectTo: RESET_REDIRECT },
      });
      const authUser = (lookup as { user?: { id: string; user_metadata?: Record<string, unknown> } })?.user ?? null;
      if (lookupErr || !authUser?.id) {
        return json({
          error: 'Mitra ini belum punya akun login (hanya baris profil). Pakai Tambah Mitra atau undang ulang.',
          code: 'NO_AUTH_USER',
        }, 409);
      }

      const { error: updErr } = await db.auth.admin.updateUserById(authUser.id, {
        password,
        user_metadata: {
          ...(authUser.user_metadata ?? {}),
          must_change_password: requireChange,
          temp_password_set_at: new Date().toISOString(),
          temp_password_set_by: caller.email,
        },
      });
      if (updErr) return json({ error: updErr.message }, 400);

      // Penyetelan kredensial oleh orang lain harus terlihat tanpa harus
      // menggali log. sp_activity_log sudah mencatatnya otomatis di dispatcher;
      // ini membuatnya muncul di lonceng notifikasi admin.
      db.from('sp_admin_notifications').insert({
        type: 'SECURITY',
        title: 'Kata Sandi Sementara Mitra',
        body: `${caller.email} menyetel kata sandi sementara untuk ${target.name} (${target.email}).`,
        read: false,
        metadata: {
          user_id: target.id, email: target.email,
          set_by: caller.email, require_change: requireChange,
        },
      }).then(() => {}, () => {});

      sendTelegram(
        `Kata Sandi Sementara Disetel - SurePath\n\n` +
        `Mitra: ${target.name} (${target.email})\n` +
        `Oleh: ${caller.email}\n` +
        `Wajib ganti saat login: ${requireChange ? 'ya' : 'tidak'}`,
      );

      return json({
        data: { email: target.email, name: target.name, require_change: requireChange },
        temp_password: password,
      });
    }

    default:
      return null;
  }
}
