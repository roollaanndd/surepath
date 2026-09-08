-- ─────────────────────────────────────────────────────────────────────────────
-- Notifikasi admin: hardening + perbaikan tabel order
-- Diterapkan ke produksi 2026-09-08 lewat Supabase MCP apply_migration.
--
-- Tiga masalah yang diperbaiki:
--
--   a. `notify_admin_telegram()` berjalan AFTER INSERT di `sp_users` TANPA
--      penangan error, dan di dalamnya ada `chat_id::bigint`. Artinya satu
--      nilai salah ketik di `sp_bot_config` membuat SETIAP PENDAFTARAN BARU
--      GAGAL — bukan cuma notifikasinya yang hilang. Sekarang seluruh badan
--      fungsi dibungkus EXCEPTION dan cast dijaga regex.
--
--   b. Trigger order polis menempel di `sp_policies` (tabel lama, baris
--      terakhir Mei 2026). Aplikasi menulis order ke `sp_policy_orders`
--      (lihat `create_policy_order` di data-gateway/actions/orders.ts), jadi
--      notifikasi order tidak pernah bunyi. Trigger dipindahkan.
--
--   c. Data pengguna diinterpolasi mentah ke HTML Telegram. Nama seperti
--      "</b><b>PENTING: transfer dana</b>" akan merender pesan palsu di chat
--      admin — masalah yang sama sudah diperbaiki di edge function
--      `notify-admin` tapi belum di jalur trigger. Sekarang di-escape.
--
-- Bonus: kanal WhatsApp (Fonnte) opsional. Mati selama
-- `sp_bot_config.whatsapp_admin_number` kosong atau FONNTE_TOKEN belum ada
-- di Vault.
--
-- CATATAN: `notify_paid_payment()` (sp_payments) dan `notify_new_withdrawal()`
-- (sp_withdrawals) masih memakai pola lama tanpa penangan error. Keduanya ada
-- di jalur uang dan sebaiknya di-hardening dengan pola yang sama.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 0. Cadangkan definisi lama supaya bisa dikembalikan kapan saja ──────────
create table if not exists public.sp_db_object_backup (
  id          bigserial primary key,
  saved_at    timestamptz not null default now(),
  object_name text        not null,
  definition  text        not null,
  note        text
);

insert into public.sp_db_object_backup (object_name, definition, note)
select 'public.notify_admin_telegram()', pg_get_functiondef(p.oid),
       'sebelum hardening notifikasi 2026-09-08'
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'notify_admin_telegram';

insert into public.sp_db_object_backup (object_name, definition, note)
select 'trigger ' || t.tgname || ' on ' || c.relname, pg_get_triggerdef(t.oid),
       'sebelum hardening notifikasi 2026-09-08'
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
where not t.tgisinternal and t.tgname in
      ('trg_notify_new_user','trg_notify_new_policy','trg_notify_new_claim');

-- ── 1. Escape HTML supaya data pengguna tidak bisa memalsukan pesan ─────────
create or replace function public.sp_tg_escape(s text)
returns text
language sql
immutable
set search_path to 'pg_catalog'
as $$
  select replace(replace(replace(coalesce(nullif(btrim(s), ''), '-'),
                                 '&', '&amp;'),
                         '<', '&lt;'),
                 '>', '&gt;')
$$;

-- ── 2. Fungsi notifikasi baru ──────────────────────────────────────────────
create or replace function public.notify_admin_telegram()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  bot_token  text;
  chat_raw   text;
  wa_target  text;
  wa_token   text;
  judul      text;
  isi_html   text;
  isi_teks   text;
  waktu      text;
begin
  waktu := to_char(now() at time zone 'Asia/Jakarta', 'DD-MM-YYYY HH24:MI') || ' WIB';

  -- ── Susun pesan sesuai tabel yang memicu ────────────────────────────────
  if tg_table_name = 'sp_users' then
    judul    := E'\U0001F195 <b>Pendaftaran Baru – SurePath</b>';
    isi_html :=
      E'\U0001F464 <b>Nama:</b> '  || public.sp_tg_escape(new.name)        || E'\n' ||
      E'\U0001F4E7 <b>Email:</b> ' || public.sp_tg_escape(new.email)       || E'\n' ||
      E'\U0001F4F1 <b>HP:</b> '    || public.sp_tg_escape(new.phone)       || E'\n' ||
      E'\U0001F3F7 <b>Role:</b> '  || public.sp_tg_escape(new.role::text)  || E'\n' ||
      E'\U0001F550 <b>Waktu:</b> ' || waktu;
    isi_teks :=
      'Nama  : ' || coalesce(new.name, '-')       || E'\n' ||
      'Email : ' || coalesce(new.email, '-')      || E'\n' ||
      'HP    : ' || coalesce(new.phone, '-')      || E'\n' ||
      'Role  : ' || coalesce(new.role::text, '-') || E'\n' ||
      'Waktu : ' || waktu;

  elsif tg_table_name = 'sp_policy_orders' then
    judul    := E'\U0001F4CB <b>Order Polis Baru – SurePath</b>';
    isi_html :=
      E'\U0001F522 <b>No. Order:</b> ' || public.sp_tg_escape(coalesce(new.order_number, new.id::text)) || E'\n' ||
      E'\U0001F464 <b>Nasabah:</b> '   || public.sp_tg_escape(new.client_name)  || E'\n' ||
      E'\U0001F4E6 <b>Produk:</b> '    || public.sp_tg_escape(new.product_name) || E'\n' ||
      E'\U0001F4B0 <b>Premi:</b> Rp '  || coalesce(to_char(new.total_premium, 'FM999G999G999'), '-') || E'\n' ||
      E'\U0001F4CA <b>Status:</b> '    || public.sp_tg_escape(new.status::text) || E'\n' ||
      E'\U0001F550 <b>Waktu:</b> '     || waktu;
    isi_teks :=
      'No. Order : ' || coalesce(new.order_number, new.id::text)  || E'\n' ||
      'Nasabah   : ' || coalesce(new.client_name, '-')            || E'\n' ||
      'Produk    : ' || coalesce(new.product_name, '-')           || E'\n' ||
      'Premi     : Rp ' || coalesce(to_char(new.total_premium, 'FM999G999G999'), '-') || E'\n' ||
      'Status    : ' || coalesce(new.status::text, '-')           || E'\n' ||
      'Waktu     : ' || waktu;

  elsif tg_table_name = 'sp_claims' then
    judul    := E'\U0001F6A8 <b>Klaim Baru Masuk – SurePath</b>';
    isi_html :=
      E'\U0001F522 <b>No. Klaim:</b> '  || public.sp_tg_escape(coalesce(new.claim_number, new.id::text)) || E'\n' ||
      E'\U0001F4CD <b>Lokasi:</b> '     || public.sp_tg_escape(new.location) || E'\n' ||
      E'\U0001F4B8 <b>Est. Nilai:</b> Rp ' || coalesce(to_char(new.amount_estimated, 'FM999G999G999'), '-') || E'\n' ||
      E'\U0001F550 <b>Waktu:</b> '      || waktu;
    isi_teks :=
      'No. Klaim  : ' || coalesce(new.claim_number, new.id::text) || E'\n' ||
      'Lokasi     : ' || coalesce(new.location, '-')              || E'\n' ||
      'Est. Nilai : Rp ' || coalesce(to_char(new.amount_estimated, 'FM999G999G999'), '-') || E'\n' ||
      'Waktu      : ' || waktu;

  else
    return new;
  end if;

  -- ── Kanal 1: Telegram ───────────────────────────────────────────────────
  select value into bot_token from public.sp_bot_config where key = 'telegram_bot_token';
  select value into chat_raw  from public.sp_bot_config where key = 'telegram_chat_id';

  -- Regex ini yang mencegah chat_id salah ketik menjatuhkan pendaftaran.
  if coalesce(btrim(bot_token), '') <> '' and btrim(coalesce(chat_raw, '')) ~ '^-?[0-9]+$' then
    perform net.http_post(
      url     := 'https://api.telegram.org/bot' || btrim(bot_token) || '/sendMessage',
      body    := jsonb_build_object(
                   'chat_id',    btrim(chat_raw)::bigint,
                   'text',       judul || E'\n\n' || isi_html || E'\n\n' ||
                                 E'\U0001F517 <a href="https://myinsurepath.com/admin">Buka Admin Panel</a>',
                   'parse_mode', 'HTML',
                   'disable_web_page_preview', true
                 ),
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 30000
    );
  end if;

  -- ── Kanal 2: WhatsApp lewat Fonnte (aktif sendiri begitu dikonfigurasi) ──
  select value into wa_target from public.sp_bot_config where key = 'whatsapp_admin_number';
  begin
    wa_token := public.get_app_secret('FONNTE_TOKEN');
  exception when others then
    wa_token := null;
  end;

  if coalesce(btrim(wa_target), '') <> '' and coalesce(btrim(wa_token), '') <> '' then
    perform net.http_post(
      url     := 'https://api.fonnte.com/send',
      body    := jsonb_build_object(
                   'target',      btrim(wa_target),
                   'message',     replace(replace(judul, '<b>', ''), '</b>', '') || E'\n\n' || isi_teks,
                   'countryCode', '62'
                 ),
      headers := jsonb_build_object(
                   'Content-Type',  'application/json',
                   'Authorization', btrim(wa_token)
                 ),
      timeout_milliseconds := 30000
    );
  end if;

  return new;

exception when others then
  -- Notifikasi tidak pernah boleh membatalkan pendaftaran / order / klaim.
  raise warning 'notify_admin_telegram gagal (%): %, baris tetap disimpan',
                sqlstate, sqlerrm;
  return new;
end;
$fn$;

-- ── 3. Pindahkan trigger order ke tabel yang benar-benar dipakai ────────────
drop trigger if exists trg_notify_new_policy on public.sp_policies;

drop trigger if exists trg_notify_new_order on public.sp_policy_orders;
create trigger trg_notify_new_order
  after insert on public.sp_policy_orders
  for each row execute function public.notify_admin_telegram();

-- ── 4. Slot konfigurasi WhatsApp (kosong = kanal WhatsApp mati) ────────────
insert into public.sp_bot_config (key, value)
select 'whatsapp_admin_number', ''
where not exists (select 1 from public.sp_bot_config where key = 'whatsapp_admin_number');
