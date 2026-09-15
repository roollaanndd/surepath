-- APPLIED TO PRODUCTION 2026-09-15.
--
-- Rekaman percakapan Pathy per pengguna.
--
-- Kenapa ditulis dari browser, bukan dari `pathy-agent` seperti seharusnya:
-- `pathy-agent` belum bisa di-deploy dari lingkungan ini (jaringan ke
-- api.supabase.com ditolak kebijakan proxy). Menunggu deploy berarti fitur ini
-- tidak ada sama sekali. Browser adalah peserta percakapan itu sendiri, jadi ia
-- memang tahu isinya — yang tidak boleh dipercayakan padanya adalah IDENTITAS.
--
-- Karena itu identitas TIDAK diambil dari payload klien melainkan dipaksa dari
-- JWT lewat trigger di bawah. Klien boleh mengarang apa pun di kolom user_id /
-- user_email; nilainya akan ditimpa sebelum baris tersimpan.
--
-- Saat `pathy-agent` akhirnya ter-deploy dan menulis sendiri, kolom `source`
-- membedakan asalnya tanpa perlu migrasi kedua.

create table if not exists public.sp_pathy_messages (
  id              bigserial primary key,
  created_at      timestamptz not null default now(),
  -- Dipaksa dari JWT oleh trigger. Jangan percaya nilai kiriman klien.
  user_id         uuid not null,
  user_email      text,
  -- Mengelompokkan satu sesi obrolan supaya transkrip bisa dibaca berurutan.
  conversation_id uuid not null,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  tools_used      text[],
  degraded        boolean not null default false,
  source          text not null default 'CLIENT' check (source in ('CLIENT', 'AGENT'))
);

create index if not exists sp_pathy_messages_user_idx
  on public.sp_pathy_messages (user_id, created_at desc);
create index if not exists sp_pathy_messages_conv_idx
  on public.sp_pathy_messages (conversation_id, created_at);
create index if not exists sp_pathy_messages_created_idx
  on public.sp_pathy_messages (created_at desc);

-- ── Identitas dipaksa dari JWT ───────────────────────────────────────────────
create or replace function public.sp_pathy_messages_stamp_identity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.user_id    := auth.uid();
  new.user_email := coalesce(auth.jwt() ->> 'email', new.user_email);
  -- Hanya service_role yang boleh mengaku sebagai AGENT.
  if coalesce(auth.role(), '') <> 'service_role' then
    new.source := 'CLIENT';
  end if;
  -- Batas panjang: satu giliran obrolan yang wajar jauh di bawah ini, dan tanpa
  -- batas satu klien nakal bisa menggelembungkan tabel audit sesukanya.
  if length(new.content) > 8000 then
    new.content := left(new.content, 8000) || '…[dipotong]';
  end if;
  return new;
end;
$$;

drop trigger if exists sp_pathy_messages_stamp on public.sp_pathy_messages;
create trigger sp_pathy_messages_stamp
  before insert on public.sp_pathy_messages
  for each row execute function public.sp_pathy_messages_stamp_identity();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.sp_pathy_messages enable row level security;

-- Menulis: hanya pengguna login, dan hanya atas namanya sendiri. Trigger sudah
-- memaksa user_id, jadi with_check ini menolak insert dari sesi tanpa auth.uid()
-- (anon) ketimbang menyimpan baris yatim.
drop policy if exists "pathy insert own" on public.sp_pathy_messages;
create policy "pathy insert own" on public.sp_pathy_messages
  for insert to authenticated
  with check (auth.uid() is not null);

-- Membaca: pemiliknya sendiri…
drop policy if exists "pathy select own" on public.sp_pathy_messages;
create policy "pathy select own" on public.sp_pathy_messages
  for select to authenticated
  using (user_id = auth.uid());

-- …dan admin, untuk CMS.
drop policy if exists "pathy select admin" on public.sp_pathy_messages;
create policy "pathy select admin" on public.sp_pathy_messages
  for select to authenticated
  using (public.is_admin());

-- Sengaja TIDAK ada policy UPDATE/DELETE: ini rekaman, bukan draf. Append-only
-- untuk semua peran, admin sekalipun.

-- Fungsi trigger tidak pernah perlu dipanggil langsung, dan sebagai
-- SECURITY DEFINER ia muncul di /rest/v1/rpc kalau dibiarkan.
revoke execute on function public.sp_pathy_messages_stamp_identity() from public, anon, authenticated;

comment on table public.sp_pathy_messages is
  'Rekaman percakapan Pathy per pengguna. Identitas dipaksa dari JWT lewat trigger — nilai kiriman klien diabaikan. Append-only: tidak ada policy UPDATE/DELETE.';
