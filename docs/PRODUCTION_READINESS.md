# SurePath — Kesiapan Produksi

> Diperbarui 10 September 2026 (v2.5.3).

## Pola yang perlu disadari lebih dulu

Selama audit 9–10 September 2026, hampir setiap cacat yang ditemukan punya bentuk yang sama: **sistem ini gagal tanpa bersuara.** Bukan error, bukan alarm — hanya sesuatu yang diam-diam tidak terjadi.

| Yang rusak | Bagaimana ia diam |
|---|---|
| Auto-deploy edge function tidak pernah jalan | Workflow berhenti di guard lalu melaporkan **sukses** |
| `pathy-agent` tertinggal dua rilis | Tidak ada yang membandingkan versi repo dengan produksi |
| `send-insurer-email` tidak pernah ter-deploy | `functions.invoke()` gagal, hasilnya tidak diperiksa pemanggil |
| `xendit-webhook` menolak callback | Platform membalas 401 sebelum kode fungsi jalan — tidak ada log aplikasi |
| Notifikasi WhatsApp admin mati | Token kosong → kanal dilewati **tanpa log**, sengaja |
| Percakapan Pathy tidak pernah tersimpan | Tidak ada log sama sekali, jadi jawaban salah tak terdeteksi |

Konsekuensinya bukan sekadar daftar bug. Selama sistem tidak bisa memberi tahu Anda saat dirinya rusak, **setiap perbaikan berikutnya adalah tebakan**, dan setiap cacat baru punya umur simpan tak terbatas.

Dua perkakas di bawah ada untuk memutus pola itu.

---

## 1. Penjaga otomatis: deklarasi edge function

```bash
npm run check:functions
```

Berjalan juga di CI pada setiap PR. Aturannya: **setiap** direktori di `supabase/functions/` wajib punya sikap **tertulis** di `supabase/config.toml` — dideklarasikan `[functions.<nama>]`, atau ditandai sengaja mati:

```toml
#!undeclared ai-gateway — alasannya di sini
```

Diam bukan pilihan, karena diam persis yang membuat `send-insurer-email` hilang berbulan-bulan. Penjaga ini juga menangkap arah sebaliknya: deklarasi yang sumbernya tidak ada di repo.

---

## 2. Pemeriksa kesehatan produksi (SQL)

Tempel di **Supabase → SQL Editor**. Tidak butuh kredensial tambahan, aman dijalankan kapan saja (read-only), dan tidak pernah menampilkan **nilai** rahasia — hanya ada/tidaknya.

```sql
with rahasia_dipakai as (
  select distinct (regexp_matches(p.prosrc, 'get_app_secret\(''([A-Z_]+)''', 'g'))[1] as nama
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
),
vault_ada as (select name from vault.decrypted_secrets),
cfg as (select key, coalesce(btrim(value),'') <> '' as terisi from public.sp_bot_config)
select * from (
  select 1 as urut, 'Rahasia (Vault)' as area, d.nama as item,
         case when v.name is null then 'MATI' else 'ok' end as status,
         case when v.name is null then 'dipakai fungsi DB tapi tidak ada di Vault' else '' end as catatan
  from rahasia_dipakai d left join vault_ada v on v.name = d.nama
  union all
  select 2, 'Konfigurasi bot', key, case when terisi then 'ok' else 'KOSONG' end,
         case when terisi then '' else 'baris ada tapi nilainya kosong' end from cfg
  union all
  select 3, 'Kanal notifikasi admin', 'Telegram',
         case when (select terisi from cfg where key='telegram_bot_token')
               and (select terisi from cfg where key='telegram_chat_id') then 'ok' else 'MATI' end, ''
  union all
  select 3, 'Kanal notifikasi admin', 'WhatsApp (Fonnte)',
         case when (select terisi from cfg where key='whatsapp_admin_number')
               and exists(select 1 from vault_ada where name='FONNTE_TOKEN') then 'ok' else 'MATI' end, ''
  union all
  select 3, 'Kanal notifikasi admin', 'Email (Resend)',
         case when (select terisi from cfg where key='admin_email')
               and exists(select 1 from vault_ada where name='RESEND_API_KEY') then 'ok' else 'MATI' end, ''
  union all
  select 4, 'Pembayaran', 'XENDIT_SECRET_KEY',
         case when exists(select 1 from vault_ada where name='XENDIT_SECRET_KEY') then 'ok' else 'MATI' end, ''
  union all
  select 4, 'Pembayaran', 'XENDIT_WEBHOOK_TOKEN',
         case when exists(select 1 from vault_ada where name='XENDIT_WEBHOOK_TOKEN') then 'ok' else 'MATI' end, ''
  union all
  select 5, 'Tarif OJK', 'rate set aktif',
         case when exists(select 1 from public.sp_ojk_rate_sets where is_active) then 'ok' else 'MATI' end, ''
) t order by urut, status desc, item;
```

---

## Status per 10 September 2026

Hasil query di atas dijalankan terhadap produksi (`uyjgeteelnswphyzkjwi`):

| Area | Item | Status | Yang dibutuhkan |
|---|---|---|---|
| Pembayaran | `XENDIT_SECRET_KEY` | ✅ | — |
| Pembayaran | `XENDIT_WEBHOOK_TOKEN` | ✅ | — |
| Tarif OJK | rate set aktif | ✅ | `SEOJK-6-2017-v1` |
| Notifikasi | Telegram | ✅ | — |
| Notifikasi | **WhatsApp (Fonnte)** | ❌ | `FONNTE_TOKEN` di Vault. Nomor admin **sudah** diisi — jadi kanal ini tampak menyala padahal tidak |
| Notifikasi | **Email (Resend)** | ❌ | `RESEND_API_KEY` di Vault **dan** isi `admin_email` di `sp_bot_config` |
| Konfigurasi | `webhook_url` | ⚪ kosong | Belum jelas dipakai apa — periksa sebelum mengisi |

### Cara mengisi rahasia yang hilang

Supabase → SQL Editor (nilainya tidak pernah tampil di repo maupun log):

```sql
select vault.create_secret('<nilai>', 'FONNTE_TOKEN');
select vault.create_secret('<nilai>', 'RESEND_API_KEY');
update public.sp_bot_config set value = '<email admin>' where key = 'admin_email';
```

---

## Yang masih menunggu deploy

Perbaikan berikut sudah ada di `main` tetapi **belum berlaku di produksi**, karena edge function belum pernah benar-benar ter-deploy (lihat `docs/DEPLOYMENT.md`):

| Menunggu | Dampak selama belum di-deploy |
|---|---|
| `xendit-webhook` → `verify_jwt = false` | Pembayaran **pertama** akan gagal jadi PAID; komisi tidak dikredit |
| `send-insurer-email` dideklarasikan | Insurer tidak menerima email review-link |
| `pathy-agent` v2.3.0 + v2.5.0 | Indikasi jaminan, disclaimer, arsip dokumen, `save_document_data` tidak aktif |

Ketiganya selesai dengan **satu** tindakan: nyalakan integrasi GitHub di dashboard Supabase (`docs/DEPLOYMENT.md`).
