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
import { sanitizeReferralCode, pickUplineMatch, generateUniqueUserCode } from '../../_shared/referral.ts';

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
        // v2.8.9 — kode mitra dicek unik sebelum dipakai (benturan kode membuat
        // lookup upline berbasis kode gagal senyap; lihat _shared/referral.ts).
        agent_code: await generateUniqueUserCode(db, 'AGENT'),
        commission_rate: 0.1,
        monthly_target: 50000000,
        trust_score: 80,
        // Mitra buatan admin tetap melewati verifikasi seperti yang lain.
        // Admin yang sama bisa langsung menekan Approve setelahnya; itu
        // tercatat terpisah lewat admin_verify_agent.
        verified: false,
      };

      // Upline opsional — dicocokkan ke referral_code atau agent_code, dengan
      // nilai yang dibersihkan lebih dulu. Interpolasi mentah ke .or() adalah
      // kelas bug injeksi filter yang ditutup di v2.6.18.
      // v2.8.9 — kandidat diambil semua lalu dipilih deterministik
      // (pickUplineMatch): kode duplikat dulu membuat maybeSingle() gagal
      // senyap dan admin melihat "kode tidak ditemukan" untuk kode yang
      // sebenarnya ada; pencocokan juga kini case-insensitive.
      const uplineCode = sanitizeReferralCode(params.upline_code);
      if (uplineCode) {
        const { data: uplineCandidates } = await db.from('sp_users')
          .select('id, agent_code, referral_code')
          .or(`agent_code.ilike.${uplineCode},referral_code.ilike.${uplineCode}`)
          .order('created_at', { ascending: true })
          .limit(5);
        const upline = pickUplineMatch(uplineCandidates, uplineCode);
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

    // ── B2B korporat: pendaftaran pengguna oleh admin (v2.7.56) ────────────
    //
    // User B2B_CLIENT butuh akun auth (email + kata sandi) dan profil
    // sp_users dengan pengikatan perusahaan — dipakai b2b_bulk_* untuk
    // mengikat batch ke client_id. Dua mode, mengikuti konvensi
    // admin_create_mitra:
    //   'password' → admin menyetel kata sandi secara manual (hanya
    //                MASTER_ADMIN). v2.8.8: sandi BERLAKU PERMANEN — tanpa
    //                wajib ganti — kecuali require_change: true eksplisit.
    //   'invite'   → email undangan; user menyetel sandinya sendiri.
    case 'admin_create_b2b_user': {
      if (!CAN_MANAGE_MITRA_ACCOUNT.includes(caller.role ?? '')) {
        return json({ error: 'Forbidden: hanya ADMIN atau MASTER_ADMIN' }, 403);
      }

      const name = String(params.name ?? '').trim();
      const email = String(params.email ?? '').trim().toLowerCase();
      const phone = String(params.phone ?? '').trim();
      const companyName = String(params.company_name ?? '').trim();
      const companyRegNo = String(params.company_reg_no ?? '').trim();
      const companyIndustry = String(params.company_industry ?? '').trim();
      if (!name || !email || !phone || !companyName) {
        return json({ error: 'name, email, phone, company_name wajib diisi' }, 400);
      }
      if (!EMAIL_RE.test(email)) return json({ error: 'Format email tidak valid' }, 400);
      if (isUntrustedEmail(email) && caller.role !== 'MASTER_ADMIN') {
        return json({
          error: 'Domain email tersebut tidak bisa menerima email. Minta MASTER_ADMIN bila memang disengaja.',
          code: 'UNTRUSTED_EMAIL_DOMAIN',
        }, 403);
      }

      const mode = params.mode === 'invite' ? 'invite' : 'password';
      let manualPassword: string | null = null;
      let requireChange = false;
      if (mode === 'password') {
        // Kata sandi manual hanya oleh MASTER_ADMIN — ADMIN memakai invite.
        if (!CAN_SET_MITRA_PASSWORD.includes(caller.role ?? '')) {
          return json({ error: 'Forbidden: kata sandi manual hanya MASTER_ADMIN (ADMIN memakai mode undangan)' }, 403);
        }
        manualPassword = String(params.password ?? '');
        // Kebijakan kata sandi: panjang + keragaman kelas karakter.
        if (manualPassword.length < 10) {
          return json({ error: 'Kata sandi minimal 10 karakter' }, 400);
        }
        const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(manualPassword!)).length;
        if (classes < 3) {
          return json({ error: 'Kata sandi harus memuat minimal 3 dari 4 kelas karakter (huruf kecil, huruf besar, angka, simbol)' }, 400);
        }
        // v2.8.8 — kata sandi manual B2B berlaku PERMANEN: tanpa
        // must_change_password, pengguna langsung login dengan sandi yang
        // di-set admin. require_change: true mengembalikan perilaku lama
        // bila suatu saat dibutuhkan.
        requireChange = params.require_change === true;
      }

      const { data: existing } = await db.from('sp_users')
        .select('id, email, role').eq('email', email).maybeSingle();
      if (existing) {
        return json({
          error: `Email ${email} sudah terdaftar sebagai ${existing.role ?? 'pengguna'}.`,
          code: 'EMAIL_TAKEN',
        }, 409);
      }

      const authMeta = { name, phone, role: 'B2B_CLIENT', company_name: companyName, created_by_admin: caller.email };

      let authUserId: string | null = null;
      if (mode === 'password') {
        const { data: created, error: createErr } = await db.auth.admin.createUser({
          email,
          password: manualPassword!,
          email_confirm: true,
          // v2.8.8 — tanpa must_change_password: sandi manual B2B berlaku
          // permanen (kecuali require_change eksplisit, lihat di atas).
          user_metadata: { ...authMeta, ...(requireChange ? { must_change_password: true } : {}) },
        });
        if (createErr) return json({ error: createErr.message }, 400);
        authUserId = created.user?.id ?? null;
      } else {
        const { data: invited, error: inviteErr } = await db.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${APP_ORIGIN}/b2bapps`,
          data: authMeta,
        });
        if (inviteErr) return json({ error: inviteErr.message }, 400);
        authUserId = invited.user?.id ?? null;
      }
      if (!authUserId) return json({ error: 'Gagal membuat akun auth' }, 500);

      const insertRow: Record<string, unknown> = {
        id: authUserId,
        email,
        name,
        phone,
        role: 'B2B_CLIENT',
        // B2B bukan mitra agen — tidak melalui verifikasi agen.
        verified: true,
      };
      let profileErr: { message: string } | null = null;
      // Kolom company_* hidup di database produksi (drift yang didokumentasikan
      // DATABASE_STATE.md) — bila belum ada, simpan profil tanpanya agar
      // pendaftaran tetap berhasil dan bisa dilengkapi dari portal B2B.
      const withCompany = await db.from('sp_users').insert({
        ...insertRow,
        company_name: companyName,
        ...(companyRegNo ? { company_reg_no: companyRegNo } : {}),
        ...(companyIndustry ? { company_industry: companyIndustry } : {}),
      }).select().single();
      let profile = withCompany.data;
      profileErr = withCompany.error;
      if (profileErr && /company_/i.test(profileErr.message)) {
        const retry = await db.from('sp_users').insert(insertRow).select().single();
        profile = retry.data;
        profileErr = retry.error;
      }
      if (profileErr || !profile) {
        // Pengguna auth tanpa profil akan di-addBack ensure_profile sebagai
        // CUSTOMER — hapus agar tidak ada akun setengah jadi.
        await db.auth.admin.deleteUser(authUserId).catch(() => {});
        return json({ error: profileErr?.message ?? 'Gagal membuat profil' }, 400);
      }

      db.from('sp_admin_notifications').insert({
        type: 'B2B_USER_CREATED',
        title: 'Pengguna B2B Baru',
        body: `${companyName} — ${name} (${email}) didaftarkan oleh ${caller.email}.`,
        read: false,
        metadata: { user_id: profile.id, role: 'B2B_CLIENT', email, company_name: companyName, created_by: caller.email, mode },
      }).then(() => {}, () => {});

      sendTelegram(
        `Pengguna B2B Baru - SurePath\n\n` +
        `Perusahaan: ${companyName}\nNama: ${name}\nEmail: ${email}\nHP: ${phone || '-'}\n` +
        `Ditambahkan oleh: ${caller.email}\n` +
        `Mode: ${mode === 'password' ? 'kata sandi manual' : 'email undangan'}`,
      );

      return json({
        data: profile,
        mode,
        // Kata sandi manual ditampilkan SEKALI di CMS dan tidak pernah
        // disimpan di tabel mana pun. v2.8.8: sandi ini berlaku permanen —
        // pengguna langsung login dengannya tanpa wajib ganti.
        temp_password: mode === 'password' ? manualPassword : null,
      });
    }

    case 'admin_list_b2b_users': {
      if (!CAN_MANAGE_MITRA_ACCOUNT.includes(caller.role ?? '')) {
        return json({ error: 'Forbidden: hanya ADMIN atau MASTER_ADMIN' }, 403);
      }
      const { data, error } = await db.from('sp_users')
        .select('*')
        .eq('role', 'B2B_CLIENT')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) return json({ error: error.message }, 400);
      // Proyeksi eksplisit — jangan bocorkan kolom sensitif ke CMS.
      const users = (data ?? []).map((u: Record<string, any>) => ({
        id: u.id,
        email: u.email,
        name: u.name ?? null,
        phone: u.phone ?? null,
        company_name: u.company_name ?? null,
        company_reg_no: u.company_reg_no ?? null,
        company_industry: u.company_industry ?? null,
        verified: u.verified ?? null,
        created_at: u.created_at ?? null,
      }));
      return json({ data: users });
    }

    // ── Buat pengguna internal (ADMIN/FINANCE/OPERATOR/INSURANCE_ADMIN) ────
    //
    // Pengganti `admin_invite_user` lama yang hanya memberi mode undangan.
    // Pola sama persis dengan admin_create_mitra & admin_create_b2b_user:
    //   'invite'   → ADMIN atau MASTER_ADMIN; penerima menyetel sandi sendiri.
    //   'password' → MASTER_ADMIN only; sandi manual, tampil sekali, wajib
    //                diganti saat login pertama (must_change_password).
    //
    // Matriks role mencerminkan admin_update_user:
    //   - MASTER_ADMIN dan ADMIN hanya boleh dibuat MASTER_ADMIN
    //     (anti-privilege-escalation — ADMIN tidak bisa membuat ADMIN baru).
    //   - Role lain (OPERATOR/FINANCE*/INSURANCE_ADMIN) boleh dibuat ADMIN
    //     atau MASTER_ADMIN.
    case 'admin_create_internal_user': {
      if (!CAN_MANAGE_MITRA_ACCOUNT.includes(caller.role ?? '')) {
        return json({ error: 'Forbidden: hanya ADMIN atau MASTER_ADMIN' }, 403);
      }

      const name = String(params.name ?? '').trim();
      const email = String(params.email ?? '').trim().toLowerCase();
      const role = String(params.role ?? '').trim().toUpperCase();
      const phone = params.phone ? String(params.phone).trim() : null;

      if (!name || !email || !role) {
        return json({ error: 'name, email, role wajib diisi' }, 400);
      }
      if (!EMAIL_RE.test(email)) return json({ error: 'Format email tidak valid' }, 400);

      // Role yang boleh dibuat lewat jalur ini — hanya pengguna internal.
      // AGENT pakai admin_create_mitra, B2B_CLIENT pakai admin_create_b2b_user,
      // CUSTOMER tidak dibuat admin.
      const INTERNAL_ROLES = new Set([
        'ADMIN', 'MASTER_ADMIN',
        'FINANCE', 'FINANCE_MANAGER', 'FINANCE_DIRECTOR',
        'INSURANCE_ADMIN', 'OPERATOR',
      ]);
      if (!INTERNAL_ROLES.has(role)) {
        return json({ error: `Role ${role} bukan role internal. Gunakan admin_create_mitra untuk AGENT atau admin_create_b2b_user untuk B2B_CLIENT.` }, 400);
      }
      // Anti-eskalasi: hanya MASTER_ADMIN yang bisa membuat ADMIN/MASTER_ADMIN.
      if ((role === 'ADMIN' || role === 'MASTER_ADMIN') && caller.role !== 'MASTER_ADMIN') {
        return json({ error: `Hanya MASTER_ADMIN yang boleh membuat role ${role}.` }, 403);
      }

      // Domain gate — mitra saja yang lewat; staf internal selalu pakai
      // domain yang kami percaya.
      if (isUntrustedEmail(email) && caller.role !== 'MASTER_ADMIN') {
        return json({
          error: 'Domain email tersebut tidak bisa menerima email. Minta MASTER_ADMIN bila memang disengaja.',
          code: 'UNTRUSTED_EMAIL_DOMAIN',
        }, 403);
      }

      // Bentrokan dulu, pesan lebih jelas dibanding "duplicate key".
      const { data: existing } = await db.from('sp_users')
        .select('id, email, role').eq('email', email).maybeSingle();
      if (existing) {
        return json({
          error: `Email ${email} sudah terdaftar sebagai ${existing.role ?? 'pengguna'}.`,
          code: 'EMAIL_TAKEN',
        }, 409);
      }

      const mode = params.mode === 'password' ? 'password' : 'invite';
      let manualPassword: string | null = null;
      if (mode === 'password') {
        if (!CAN_SET_MITRA_PASSWORD.includes(caller.role ?? '')) {
          return json({ error: 'Forbidden: kata sandi manual hanya MASTER_ADMIN (ADMIN memakai mode undangan)' }, 403);
        }
        manualPassword = String(params.password ?? '');
        if (manualPassword.length < 10) {
          return json({ error: 'Kata sandi minimal 10 karakter' }, 400);
        }
        const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(manualPassword!)).length;
        if (classes < 3) {
          return json({ error: 'Kata sandi harus memuat minimal 3 dari 4 kelas karakter (huruf kecil, huruf besar, angka, simbol)' }, 400);
        }
      }

      const authMeta = {
        name,
        ...(phone ? { phone } : {}),
        role,
        created_by_admin: caller.email,
      };

      let authUserId: string | null = null;
      if (mode === 'password') {
        const { data: created, error: createErr } = await db.auth.admin.createUser({
          email,
          password: manualPassword!,
          email_confirm: true,
          user_metadata: { ...authMeta, must_change_password: true },
        });
        if (createErr) return json({ error: createErr.message }, 400);
        authUserId = created.user?.id ?? null;
      } else {
        const { data: invited, error: inviteErr } = await db.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${APP_ORIGIN}/admin`,
          data: authMeta,
        });
        if (inviteErr) return json({ error: inviteErr.message }, 400);
        authUserId = invited.user?.id ?? null;
      }
      if (!authUserId) return json({ error: 'Gagal membuat akun auth' }, 500);

      const insertRow: Record<string, unknown> = {
        id: authUserId,
        email,
        name,
        role,
        ...(phone ? { phone } : {}),
        verified: true, // staf internal tidak melalui verifikasi dokumen
      };

      const { data: profile, error: profileErr } = await db.from('sp_users')
        .insert(insertRow).select().single();
      if (profileErr) {
        // Hindari akun auth yatim — ensure_profile akan membuatnya sebagai
        // CUSTOMER kalau ditinggal, dan itu lebih buruk daripada gagal total.
        await db.auth.admin.deleteUser(authUserId).catch(() => {});
        return json({ error: profileErr.message }, 400);
      }

      db.from('sp_admin_notifications').insert({
        type: 'NEW_INTERNAL_USER',
        title: 'Pengguna Internal Baru',
        body: `${name} (${email}) ditambahkan sebagai ${role} oleh ${caller.email}.`,
        read: false,
        metadata: { user_id: profile.id, role, email, created_by: caller.email, mode },
      }).then(() => {}, () => {});

      sendTelegram(
        `Pengguna Internal Baru - SurePath\n\n` +
        `Nama: ${name}\nEmail: ${email}\nRole: ${role}\n` +
        `Ditambahkan oleh: ${caller.email}\n` +
        `Mode: ${mode === 'password' ? 'kata sandi manual' : 'email undangan'}`,
      );

      return json({
        data: profile,
        mode,
        temp_password: mode === 'password' ? manualPassword : null,
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
      // v2.8.8 — klien korporat ikut didukung: MASTER_ADMIN bisa menyetel
      // ulang kata sandi B2B_CLIENT secara manual, dan sandi itu berlaku
      // permanen (tanpa wajib ganti) kecuali diminta eksplisit.
      if (target.role !== 'AGENT' && target.role !== 'B2B_CLIENT') {
        return json({ error: 'Aksi ini hanya untuk akun mitra (AGENT) atau klien korporat (B2B_CLIENT)', code: 'NOT_AN_AGENT' }, 400);
      }

      // Kata sandi kustom opsional — tanpa parameter, generator sementara
      // dipakai (perilaku lama). Kebijakan sandi sama dengan pembuatan akun.
      let password = generateTempPassword();
      if (params.password != null && String(params.password).length > 0) {
        password = String(params.password);
        if (password.length < 10) {
          return json({ error: 'Kata sandi minimal 10 karakter' }, 400);
        }
        const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
        if (classes < 3) {
          return json({ error: 'Kata sandi harus memuat minimal 3 dari 4 kelas karakter (huruf kecil, huruf besar, angka, simbol)' }, 400);
        }
      }

      // AGENT mempertahankan perilaku lama (default wajib ganti); B2B_CLIENT
      // default-nya permanen, selaras dengan admin_create_b2b_user.
      const requireChange = params.require_change != null
        ? params.require_change !== false
        : target.role !== 'B2B_CLIENT';

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
        body: `${caller.email} menyetel kata sandi untuk ${target.name} (${target.email}).`,
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

    // ── KYC document upload (v2.8.5) ────────────────────────────────────
    //
    // Simpan dokumen KYC yang dikirim AddUserWizard ke bucket privat
    // kyc-documents dan daftarkan referensinya di sp_users.kyc_docs jsonb.
    //
    // Payload base64 dibatasi 3 MB raw (per migration file_size_limit = 10
    // MB, kita lebih ketat di sini supaya payload Edge Function tidak jebol).
    // Format path: {user_id}/{doc_type}/{uuid}.{ext}
    case 'admin_upload_kyc_file': {
      if (!CAN_MANAGE_MITRA_ACCOUNT.includes(caller.role ?? '')) {
        return json({ error: 'Forbidden: hanya ADMIN atau MASTER_ADMIN' }, 403);
      }

      const user_id = String(params.user_id ?? '').trim();
      const doc_type = String(params.doc_type ?? '').trim();
      const mime = String(params.mime ?? '').trim();
      const size = Number(params.size ?? 0);
      const file_b64 = String(params.file_b64 ?? '');
      const original_name = String(params.original_name ?? '').trim();

      if (!user_id || !doc_type || !file_b64) {
        return json({ error: 'user_id, doc_type, file_b64 wajib diisi' }, 400);
      }
      if (size > 3 * 1024 * 1024) {
        return json({ error: 'File terlalu besar (maks 3 MB)' }, 400);
      }
      const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!ACCEPTED.includes(mime)) {
        return json({ error: `Tipe ${mime} tidak didukung` }, 400);
      }

      // Validasi doc_type whitelist — tetap senada dengan kycMatrix.ts di
      // frontend. Daftar ini sengaja dijaga di dua sisi (defense in depth).
      const ALLOWED_DOC_TYPES = new Set([
        'ktp', 'npwp', 'selfie_ktp', 'sim', 'foto_profil',
        'surat_penunjukan', 'surat_penunjukan_insurer', 'akta_kerjasama',
        'company_npwp', 'company_nib', 'company_siup', 'company_akta', 'company_profile_pdf',
        'pic_ktp', 'pic_npwp',
      ]);
      if (!ALLOWED_DOC_TYPES.has(doc_type)) {
        return json({ error: `doc_type ${doc_type} tidak dikenal` }, 400);
      }

      // Pastikan user ada.
      const { data: target, error: userErr } = await db
        .from('sp_users').select('id, kyc_docs').eq('id', user_id).maybeSingle();
      if (userErr || !target) return json({ error: 'user_id tidak ditemukan' }, 404);

      // Decode base64 ke Uint8Array
      let bytes: Uint8Array;
      try {
        const binary = atob(file_b64);
        bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      } catch {
        return json({ error: 'file_b64 bukan base64 valid' }, 400);
      }
      if (bytes.length !== size) {
        return json({ error: 'Size tidak cocok dengan payload' }, 400);
      }

      // Path: {user_id}/{doc_type}/{uuid}.{ext}
      const ext = mime === 'application/pdf' ? 'pdf'
        : mime === 'image/jpeg' ? 'jpg'
        : mime === 'image/png' ? 'png'
        : mime === 'image/webp' ? 'webp' : 'bin';
      const uuid = crypto.randomUUID();
      const path = `${user_id}/${doc_type}/${uuid}.${ext}`;

      const { error: uploadErr } = await db.storage
        .from('kyc-documents')
        .upload(path, bytes, { contentType: mime, upsert: false });
      if (uploadErr) return json({ error: `Upload gagal: ${uploadErr.message}` }, 500);

      // Merge entry baru ke kyc_docs jsonb. Dokumen lama dengan doc_type
      // yang sama di-overwrite — path lama tetap di bucket (bisa dibersihkan
      // nanti dengan cron).
      const existingDocs = (target.kyc_docs ?? {}) as Record<string, unknown>;
      const nextDocs = {
        ...existingDocs,
        [doc_type]: {
          path,
          size_bytes: size,
          mime,
          original_name: original_name || null,
          uploaded_at: new Date().toISOString(),
          uploaded_by: caller.email,
        },
      };
      const { error: updErr } = await db.from('sp_users')
        .update({ kyc_docs: nextDocs }).eq('id', user_id);
      if (updErr) {
        // Rollback upload: hapus file yang baru saja tersimpan.
        await db.storage.from('kyc-documents').remove([path]).catch(() => {});
        return json({ error: `Gagal menyimpan referensi: ${updErr.message}` }, 500);
      }

      return json({
        data: { path, size_bytes: size, mime, doc_type },
      });
    }

    // Admin membaca dokumen KYC yang tersimpan — mengeluarkan signed URL
    // berumur pendek (5 menit) agar browser bisa menampilkan preview.
    case 'admin_get_kyc_doc_url': {
      if (!CAN_MANAGE_MITRA_ACCOUNT.includes(caller.role ?? '')) {
        return json({ error: 'Forbidden: hanya ADMIN atau MASTER_ADMIN' }, 403);
      }
      const user_id = String(params.user_id ?? '').trim();
      const doc_type = String(params.doc_type ?? '').trim();
      if (!user_id || !doc_type) {
        return json({ error: 'user_id dan doc_type wajib diisi' }, 400);
      }
      const { data: target } = await db
        .from('sp_users').select('kyc_docs').eq('id', user_id).maybeSingle();
      const docs = (target?.kyc_docs ?? {}) as Record<string, { path?: string }>;
      const entry = docs[doc_type];
      if (!entry?.path) return json({ error: 'Dokumen tidak ditemukan' }, 404);

      const { data: signed, error } = await db.storage
        .from('kyc-documents')
        .createSignedUrl(entry.path, 300); // 5 menit
      if (error) return json({ error: error.message }, 500);
      return json({ data: { signed_url: signed?.signedUrl, path: entry.path } });
    }

    default:
      return null;
  }
}
