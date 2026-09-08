-- ─────────────────────────────────────────────────────────────────────────────
-- Notifikasi admin: empat kanal, bukan cuma Telegram.
-- Diterapkan ke produksi 2026-09-08 lewat Supabase MCP apply_migration.
--
-- Setiap kanal berdiri sendiri dan DILEWATI kalau konfigurasinya kosong, jadi
-- menambah kanal tidak pernah mengubah perilaku sampai sengaja diaktifkan.
-- Semuanya tetap di dalam satu EXCEPTION (lihat 20260908_harden_admin_notifications.sql):
-- notifikasi tidak boleh punya kuasa menjatuhkan pendaftaran/order/klaim.
--
--   1. Telegram  — sp_bot_config: telegram_bot_token + telegram_chat_id
--   2. WhatsApp  — sp_bot_config: whatsapp_admin_number + Vault: FONNTE_TOKEN
--   3. Email     — sp_bot_config: admin_email          + Vault: RESEND_API_KEY
--   4. Webhook   — sp_bot_config: webhook_url  (Slack ATAU Discord)
--
-- CATATAN KREDENSIAL — ini yang menentukan kanal mana yang bisa hidup:
-- trigger database hanya bisa membaca Vault lewat get_app_secret(), dan TIDAK
-- bisa membaca env edge function. Per 8 Sep 2026 Vault hanya berisi
-- ADMIN_USERNAME, ADMIN_PASSWORD, APP_URL, OPENROUTER_KEY, XENDIT_SECRET_KEY,
-- XENDIT_WEBHOOK_TOKEN. FONNTE_TOKEN dan RESEND_API_KEY ada di env edge
-- function saja, sehingga kanal 2 dan 3 baru menyala setelah token-nya
-- ditambahkan ke Vault (Dashboard → Project Settings → Vault).
--
-- NILAI konfigurasi (nomor WhatsApp, alamat email, URL webhook) TIDAK disimpan
-- di berkas ini dan tidak boleh masuk repo — hanya nama slotnya. Nilainya
-- diisi langsung ke sp_bot_config, yang ber-RLS `USING (false)` sehingga tidak
-- terbaca oleh anon maupun authenticated.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.sp_db_object_backup (object_name, definition, note)
select 'public.notify_admin_telegram()', pg_get_functiondef(p.oid),
       'sebelum multi-channel 2026-09-08'
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'notify_admin_telegram';

create or replace function public.notify_admin_telegram()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  bot_token   text;
  chat_raw    text;
  wa_target   text;
  wa_token    text;
  mail_to     text;
  mail_key    text;
  hook_url    text;
  judul       text;   -- dengan tag <b> untuk Telegram
  judul_polos text;   -- tanpa tag, untuk kanal teks
  isi_html    text;
  isi_teks    text;
  waktu       text;
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

  judul_polos := replace(replace(judul, '<b>', ''), '</b>', '');

  -- ── Kanal 1: Telegram ───────────────────────────────────────────────────
  select value into bot_token from public.sp_bot_config where key = 'telegram_bot_token';
  select value into chat_raw  from public.sp_bot_config where key = 'telegram_chat_id';

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

  -- ── Kanal 2: WhatsApp lewat Fonnte ──────────────────────────────────────
  select value into wa_target from public.sp_bot_config where key = 'whatsapp_admin_number';
  begin wa_token := public.get_app_secret('FONNTE_TOKEN');
  exception when others then wa_token := null; end;

  if coalesce(btrim(wa_target), '') <> '' and coalesce(btrim(wa_token), '') <> '' then
    perform net.http_post(
      url     := 'https://api.fonnte.com/send',
      body    := jsonb_build_object(
                   'target',      btrim(wa_target),
                   'message',     judul_polos || E'\n\n' || isi_teks || E'\n\n' ||
                                  'Buka: https://myinsurepath.com/admin',
                   'countryCode', '62'
                 ),
      headers := jsonb_build_object('Content-Type', 'application/json',
                                    'Authorization', btrim(wa_token)),
      timeout_milliseconds := 30000
    );
  end if;

  -- ── Kanal 3: Email lewat Resend ─────────────────────────────────────────
  select value into mail_to from public.sp_bot_config where key = 'admin_email';
  begin mail_key := public.get_app_secret('RESEND_API_KEY');
  exception when others then mail_key := null; end;

  if coalesce(btrim(mail_to), '') <> '' and coalesce(btrim(mail_key), '') <> '' then
    perform net.http_post(
      url     := 'https://api.resend.com/emails',
      body    := jsonb_build_object(
                   'from',    'SurePath <noreply@myinsurepath.com>',
                   'to',      jsonb_build_array(btrim(mail_to)),
                   'subject', judul_polos,
                   'html',    '<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6">' ||
                              '<h2 style="margin:0 0 12px">' || judul_polos || '</h2><pre style="font-family:inherit;margin:0">' ||
                              public.sp_tg_escape(isi_teks) ||
                              '</pre><p style="margin-top:16px"><a href="https://myinsurepath.com/admin">Buka Admin Panel</a></p></div>'
                 ),
      headers := jsonb_build_object('Content-Type', 'application/json',
                                    'Authorization', 'Bearer ' || btrim(mail_key)),
      timeout_milliseconds := 30000
    );
  end if;

  -- ── Kanal 4: Webhook Slack / Discord ────────────────────────────────────
  -- Satu payload untuk keduanya: Slack membaca "text", Discord membaca
  -- "content", masing-masing mengabaikan field yang bukan miliknya.
  select value into hook_url from public.sp_bot_config where key = 'webhook_url';

  if coalesce(btrim(hook_url), '') like 'https://%' then
    perform net.http_post(
      url     := btrim(hook_url),
      body    := jsonb_build_object(
                   'text',    judul_polos || E'\n' || isi_teks,
                   'content', judul_polos || E'\n' || isi_teks
                 ),
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 30000
    );
  end if;

  return new;

exception when others then
  raise warning 'notify_admin_telegram gagal (%): %, baris tetap disimpan',
                sqlstate, sqlerrm;
  return new;
end;
$fn$;

-- ── Slot konfigurasi baru (kosong = kanal mati) ────────────────────────────
insert into public.sp_bot_config (key, value)
select v.key, ''
from (values ('whatsapp_admin_number'), ('admin_email'), ('webhook_url')) as v(key)
where not exists (select 1 from public.sp_bot_config b where b.key = v.key);
