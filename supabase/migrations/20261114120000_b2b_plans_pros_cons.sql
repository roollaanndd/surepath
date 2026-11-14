-- v2.9.2 — Tambah kolom pros/cons di paket asuransi B2B.
--
-- Setiap paket (sp_b2b_plans) sekarang bisa menyimpan daftar kelebihan dan
-- kekurangan yang ditampilkan pada kartu paket (B2BUnitOrder) dan dapat
-- dikelola admin dari dashboard (B2BPlansAdmin). Ini memberi klien B2B
-- gambaran jujur sebelum memilih paket, bukan hanya nilai loading rate-nya.
--
-- Baris lama tetap valid: `pros`/`cons` default '[]' sehingga paket tanpa
-- data tetap muncul di kartu (section pros/cons disembunyikan bila kosong).

alter table public.sp_b2b_plans
  add column if not exists pros jsonb not null default '[]'::jsonb,
  add column if not exists cons jsonb not null default '[]'::jsonb;

comment on column public.sp_b2b_plans.pros is
  'Kelebihan paket: array string pendek, ditampilkan di kartu paket.';
comment on column public.sp_b2b_plans.cons is
  'Kekurangan/batasan paket: array string pendek, ditampilkan di kartu paket.';

-- Isi default untuk benih paket Basic/Standard/Premium kalau sedang kosong —
-- admin dapat mengubah/menghapus kapan saja dari dashboard Paket B2B.
update public.sp_b2b_plans set
  pros = '["Harga paling ekonomis","Setup cepat tanpa biaya tambahan","Cocok untuk fleet dengan budget terbatas"]'::jsonb,
  cons = '["Tidak termasuk layanan prioritas","Tanpa bengkel resmi/ATPM","Perlindungan dasar sesuai jenis pilihan"]'::jsonb
where code = 'BASIC' and (pros = '[]'::jsonb and cons = '[]'::jsonb);

update public.sp_b2b_plans set
  pros = '["Klaim prioritas dengan SLA lebih cepat","Mobil pengganti saat klaim (opsional)","Layanan customer service premium"]'::jsonb,
  cons = '["Loading +5% di atas premi standar","Bengkel umum, bukan ATPM resmi","Butuh verifikasi dokumen tambahan"]'::jsonb
where code = 'STANDARD' and (pros = '[]'::jsonb and cons = '[]'::jsonb);

update public.sp_b2b_plans set
  pros = '["Bengkel resmi/ATPM dengan suku cadang asli","Door-to-door derek 24/7","Klaim ekspres + mobil pengganti","Dedicated account manager"]'::jsonb,
  cons = '["Loading +10% di atas premi standar","Nominal premi lebih tinggi","Beberapa manfaat butuh jarak servis tertentu"]'::jsonb
where code = 'PREMIUM' and (pros = '[]'::jsonb and cons = '[]'::jsonb);
