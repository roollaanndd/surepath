-- Marketing/Sales CRM — Fase 1 (21 Okt 2026)
--
-- Dibangun lebih dulu dari Fase 0 (tulang belakang produksi) dengan sengaja:
-- bagian CRM tidak bergantung pada data produksi sama sekali. Semua yang
-- dibutuhkannya untuk pipeline rekrutmen sudah ada di sp_users (created_at,
-- identity_submitted_at, identity_status, verified, tier). Yang menunggu
-- Fase 0 hanya kolom ANGKA produksi, bukan CRM-nya.
--
-- Postur akses: semua tabel di sini deny-all (RLS aktif, tanpa policy).
-- Browser tidak pernah menyentuhnya; semua lewat data-gateway dengan
-- service_role, dan otorisasi per aksi ada di actions/marketing.ts.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Siapa marketing yang memegang seorang agen
-- ─────────────────────────────────────────────────────────────────────────────
-- handler_id DIPISAH dari upline_id dengan sengaja. upline_id semantiknya
-- referral antar-AGEN (dan per 21 Okt 2026 terisi 0 dari 47 baris — mati
-- total). Menumpanginya akan mencampur dua hubungan yang berbeda dan membuat
-- perhitungan override tidak bisa dipertanggungjawabkan.
alter table public.sp_users add column if not exists handler_id uuid references public.sp_users(id) on delete set null;
alter table public.sp_users add column if not exists handler_assigned_at timestamptz;
alter table public.sp_users add column if not exists handler_assigned_by uuid references public.sp_users(id) on delete set null;

-- Layering antar-marketing: produksi agen -> handler (L1) -> parent handler (L2).
alter table public.sp_users add column if not exists marketing_parent_id uuid references public.sp_users(id) on delete set null;

create index if not exists sp_users_handler_id_idx on public.sp_users (handler_id) where handler_id is not null;
create index if not exists sp_users_marketing_parent_idx on public.sp_users (marketing_parent_id) where marketing_parent_id is not null;

comment on column public.sp_users.handler_id is
  'Marketing (role MARKETING) yang memegang agen ini. BUKAN upline_id, yang semantiknya referral antar-agen.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Riwayat penugasan — append-only
-- ─────────────────────────────────────────────────────────────────────────────
-- Alasannya bukan kerapian: komisi override dihitung dari siapa yang memegang
-- agen SAAT polis terbit. Kalau agen dipindah tangan dan hanya nilai terkini
-- yang tersimpan, komisi historis berubah diam-diam dan tidak ada yang tahu.
create table if not exists public.sp_agent_handler_history (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid not null references public.sp_users(id) on delete cascade,
  handler_id  uuid references public.sp_users(id) on delete set null,
  assigned_by uuid references public.sp_users(id) on delete set null,
  reason      text,
  valid_from  timestamptz not null default now(),
  valid_to    timestamptz
);

create index if not exists sp_ahh_agent_idx on public.sp_agent_handler_history (agent_id, valid_from desc);
create index if not exists sp_ahh_handler_idx on public.sp_agent_handler_history (handler_id) where handler_id is not null;

-- Jejaknya ditulis oleh TRIGGER, bukan oleh kode aplikasi. Kalau diserahkan ke
-- aplikasi, satu jalur penulisan yang lupa mencatat akan melubangi audit trail
-- tanpa terlihat — pola kegagalan diam yang sama dengan insiden lain di repo ini.
create or replace function public.sp_track_handler_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.handler_id is not distinct from old.handler_id then
    return new;
  end if;

  update public.sp_agent_handler_history
     set valid_to = now()
   where agent_id = new.id and valid_to is null;

  if new.handler_id is not null then
    insert into public.sp_agent_handler_history (agent_id, handler_id, assigned_by)
    values (new.id, new.handler_id, new.handler_assigned_by);
  end if;

  return new;
end $$;

revoke execute on function public.sp_track_handler_change() from public, anon, authenticated;

drop trigger if exists sp_users_handler_change on public.sp_users;
create trigger sp_users_handler_change
  after update of handler_id on public.sp_users
  for each row execute function public.sp_track_handler_change();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Aktivitas CRM — yang membuatnya CRM, bukan laporan
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.sp_marketing_activities (
  id             uuid primary key default gen_random_uuid(),
  marketing_id   uuid not null references public.sp_users(id) on delete cascade,
  -- Nullable DENGAN SENGAJA: prospek yang belum jadi user harus bisa dicatat.
  -- Kalau tidak, marketing mencatatnya di luar sistem dan datanya hilang.
  agent_id       uuid references public.sp_users(id) on delete set null,
  prospect_name  text,
  kind           text not null check (kind in ('CALL','WA','VISIT','TRAINING','OTHER')),
  outcome        text,
  note           text,
  -- Dua kolom ini yang mengubah buku harian menjadi CRM: tanpa next_action_at,
  -- tidak ada "janji yang sudah lewat tanggal" untuk dibuka tiap pagi.
  next_action    text,
  next_action_at timestamptz,
  created_at     timestamptz not null default now(),
  constraint sp_ma_subjek_ada check (agent_id is not null or nullif(btrim(coalesce(prospect_name,'')), '') is not null)
);

create index if not exists sp_ma_marketing_idx on public.sp_marketing_activities (marketing_id, created_at desc);
create index if not exists sp_ma_agent_idx on public.sp_marketing_activities (agent_id, created_at desc) where agent_id is not null;
-- Antrean "janji lewat tanggal" adalah kueri terpanas di dashboard ini.
create index if not exists sp_ma_next_action_idx on public.sp_marketing_activities (next_action_at)
  where next_action_at is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS deny-all — browser tidak pernah menyentuh tabel ini
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.sp_agent_handler_history enable row level security;
alter table public.sp_marketing_activities  enable row level security;

revoke all on table public.sp_agent_handler_history from anon, authenticated;
revoke all on table public.sp_marketing_activities  from anon, authenticated;
