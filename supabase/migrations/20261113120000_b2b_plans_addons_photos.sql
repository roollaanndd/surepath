-- v2.9.1 — B2B order unit: perluasan (addons), paket asuransi, foto kendaraan.
--
-- 1. sp_b2b_plans — paket asuransi B2B yang bisa dikelola admin dari dashboard.
--    Setiap paket punya loading rate (positif/negatif) yang diterapkan ke premi
--    setelah diskon, daftar benefit, dan status aktif. Deny-all RLS — admin
--    hanya lewat gateway (admin_save_b2b_plan/admin_list_b2b_plans), B2B client
--    lewat list_active_b2b_plans.
--
-- 2. Kolom baru di sp_b2b_batch_items:
--    - addons jsonb — pilihan perluasan per item ({flood, earthquake, srcc,
--      terrorism, tplLimit, authorizedWorkshop, paDriver, paPassengerSeats}).
--    - addon_premium numeric — total premi perluasan (dihitung server).
--    - plan_id uuid → sp_b2b_plans.id, nullable.
--    - plan_loading numeric — rupiah loading paket (bisa negatif = diskon).
--    - vehicle_photos jsonb — daftar foto kendaraan
--      ({ slot, url, uploaded_at, size_bytes }). Foto tersimpan di bucket
--      b2b-documents, URL publik ditandatangan sementara saat dibutuhkan.

create table if not exists public.sp_b2b_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  loading_rate numeric(6, 4) not null default 0,        -- 0.10 = +10% loading di atas premi setelah diskon
  benefits jsonb not null default '[]'::jsonb,          -- array string, mis. ["Bengkel ATPM", "24/7 derek"]
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.sp_users(id) on delete set null
);

create index if not exists sp_b2b_plans_active_idx on public.sp_b2b_plans(is_active, sort_order);

alter table public.sp_b2b_plans enable row level security;

-- Deny-all; semua akses via gateway service_role.
drop policy if exists sp_b2b_plans_deny_all on public.sp_b2b_plans;
create policy sp_b2b_plans_deny_all on public.sp_b2b_plans
  for all using (false) with check (false);

-- Benih 3 paket default — admin bisa menonaktifkan/mengubah dari dashboard.
insert into public.sp_b2b_plans (code, name, description, loading_rate, benefits, sort_order)
values
  ('BASIC',    'Basic',    'Pertanggungan standar sesuai pilihan (TLO/Comprehensive). Tanpa biaya tambahan.',               0.00,
   '["Pertanggungan standar sesuai jenis pilihan","Klaim via SurePath"]'::jsonb, 10),
  ('STANDARD', 'Standard', 'Paket seimbang dengan layanan klaim prioritas. Loading +5% di atas premi setelah diskon.',       0.05,
   '["Pertanggungan standar","Klaim prioritas","Mobil pengganti saat klaim (opsional)"]'::jsonb, 20),
  ('PREMIUM',  'Premium',  'Paket lengkap dengan layanan door-to-door dan bengkel resmi. Loading +10%.',                     0.10,
   '["Door-to-door","Bengkel resmi/ATPM","Klaim prioritas","Mobil pengganti saat klaim"]'::jsonb, 30)
on conflict (code) do nothing;

-- Kolom perluasan + paket + foto di batch items.
alter table public.sp_b2b_batch_items
  add column if not exists addons jsonb not null default '{}'::jsonb,
  add column if not exists addon_premium numeric(15, 2) not null default 0,
  add column if not exists plan_id uuid references public.sp_b2b_plans(id) on delete set null,
  add column if not exists plan_loading numeric(15, 2) not null default 0,
  add column if not exists vehicle_photos jsonb not null default '[]'::jsonb;

create index if not exists sp_b2b_batch_items_plan_id_idx on public.sp_b2b_batch_items(plan_id);

comment on column public.sp_b2b_batch_items.addons is
  'Pilihan perluasan per item: {flood, earthquake, srcc, terrorism, tplLimit, authorizedWorkshop, paDriver, paPassengerSeats}';
comment on column public.sp_b2b_batch_items.addon_premium is
  'Total premi perluasan dihitung server dari addons + sumInsured + coverage + rate set aktif.';
comment on column public.sp_b2b_batch_items.plan_id is
  'Paket asuransi B2B (sp_b2b_plans) yang dipilih klien.';
comment on column public.sp_b2b_batch_items.plan_loading is
  'Rupiah loading paket (bisa negatif untuk diskon paket).';
comment on column public.sp_b2b_batch_items.vehicle_photos is
  'Array foto kendaraan: [{slot, url, uploaded_at, size_bytes}].';
