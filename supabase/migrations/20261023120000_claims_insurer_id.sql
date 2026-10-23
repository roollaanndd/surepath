-- sp_claims.insurer_id — tautkan klaim ke penanggungnya.
--
-- submit_claim sudah mengambil insurer_id dari order yang ditaut sejak v1.42.0,
-- tapi tidak pernah menuliskannya ke mana pun: kolomnya tidak ada. Jadi setiap
-- klaim yang masuk kehilangan jejak insurernya, dan jejak itu tidak bisa
-- dipulihkan untuk klaim yang masuk tanpa policy_id (lihat perbaikan pencocokan
-- policy_number di action yang sama).
--
-- Tanpa kolom ini, portal insurer tidak punya apa pun untuk memfilter, yang
-- sebabnya tab "Klaim" di sana sampai sekarang menampilkan daftar order.
--
-- Aditif dan nullable: aman diapply kapan pun, dan aman berdiri sendiri tanpa
-- kode yang mengisinya. URUTAN: apply migrasi ini LEBIH DULU, baru deploy
-- data-gateway — insert dengan kolom yang belum ada akan gagal seluruhnya.

alter table public.sp_claims
  add column if not exists insurer_id uuid references public.sp_insurers(id);

comment on column public.sp_claims.insurer_id is
  'Penanggung polis yang diklaim, diturunkan server-side dari sp_policy_orders.insurer_id saat submit_claim. Tidak pernah diterima dari klien.';

-- Dipakai oleh daftar klaim per-insurer (insurer_list_claims, Gelombang 3).
create index if not exists idx_sp_claims_insurer
  on public.sp_claims (insurer_id)
  where insurer_id is not null;

-- Backfill klaim lama yang masih bisa ditelusuri lewat policy_id. Per 23 Okt
-- 2026 sp_claims kosong, jadi ini tidak mengubah apa pun sekarang — tapi
-- membuat migrasi ini tetap benar kalau diapply setelah klaim pertama masuk.
update public.sp_claims c
   set insurer_id = o.insurer_id
  from public.sp_policy_orders o
 where c.policy_id = o.id
   and c.insurer_id is null
   and o.insurer_id is not null;
