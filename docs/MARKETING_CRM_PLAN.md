# Rencana: Dashboard Marketing/Sales (CRM + KPI)

**Status:** rancangan, belum dibangun · **Disusun:** 21 Okt 2026
**Sumber angka di dokumen ini:** kueri langsung ke Postgres produksi `uyjgeteelnswphyzkjwi`, bukan perkiraan.

---

## 1. Keadaan sekarang — baca ini dulu

Permintaannya menyebut "pastikan semua terkoordinasi dan data real". Itu justru bagian
yang paling perlu dikerjakan lebih dulu, karena hari ini **belum** begitu. Hasil
pemeriksaan produksi:

| Fakta terukur | Angka | Artinya untuk rencana ini |
|---|---|---|
| Role `MARKETING` di `sp_users` | **tidak ada** | role, rute, dan portalnya dibuat dari nol |
| `sp_users.upline_id` terisi | **0 dari 47** | rantai layering yang sudah ada mati total; tidak bisa dipakai apa adanya |
| `sp_payments` | **0 baris** | status paid/unpaid/cancel **belum punya sumber data sama sekali** |
| `sp_commissions` tertaut ke order | **0 dari 13** | komisi yang ada yatim; tidak bisa direkap per agen secara sah |
| `sp_policies` tertaut ke order | **0 dari 5** | polis dan order hidup terpisah |
| Order punya `policy_number` | **0 dari 5** | "nomor polis" yang Anda minta belum pernah terisi |
| Agen punya order | **2** | sedangkan 5 agen punya komisi — dua himpunan berbeda |
| Tier agen aktif | 3 | `sp_agent_tiers` sudah matang, bisa jadi contoh pola tier marketing |

**Kesimpulan jujur:** dashboard-nya bisa dibangun rapi, tapi kalau tulang
belakang datanya tidak dibereskan lebih dulu, ia akan menampilkan angka yang
terlihat meyakinkan dan **salah**. Untuk aplikasi uang itu lebih berbahaya
daripada tidak ada dashboard. Karena itu Fase 0 di bawah bukan opsional.

---

## 2. Fase 0 — Tulang belakang produksi (prasyarat)

Satu sumber kebenaran untuk "produksi": **`sp_policy_orders`**. Semua yang lain
menempel padanya.

1. **Tautkan komisi ke order.** `sp_commissions.order_id` wajib terisi saat komisi
   dibuat. Backfill 13 baris lama atau tandai `legacy = true` supaya tidak ikut
   terhitung di KPI. Jangan diam-diam dibiarkan `null` — itu yang membuat rekap
   tidak bisa dipercaya.
2. **Tautkan polis ke order.** Isi `sp_policy_orders.sp_policy_id` saat polis
   diterbitkan, dan jadikan `policy_number` wajib pada transisi status ke
   `ISSUED`/`ACTIVE`.
3. **Perbaiki funnel pembayaran.** `sp_payments` kosong karena invoice belum
   pernah terbit untuk order yang ada (2 order `APPROVED` senilai Rp 13.679.035
   belum ditagih). Tanpa ini kolom paid/unpaid/cancel hanya bisa diisi manual,
   dan itu harus ditampilkan sebagai status manual, bukan status pembayaran.
4. **Satu view kanonik**, dipakai SEMUA dashboard (marketing, master, agen) supaya
   tidak ada dua definisi "penjualan":
   `v_produksi` = order + polis + pembayaran + komisi, satu baris per order.

> Aturan yang saya sarankan dipegang: **tidak ada kartu KPI yang dibangun di atas
> kolom yang masih boleh `null`.** Kalau sumbernya belum ada, kartunya belum dibuat.

---

## 3. Model data baru

### 3.1 Role & penugasan

```
MARKETING  -> karyawan internal (bukan agen, bukan nasabah)
```

- `UserRole.MARKETING` di `types.ts`, dan `allowed_apps` boleh memuat `marketingapp`.
- **Relasi marketing → agen dibuat eksplisit**, bukan menumpang `upline_id`
  (yang semantiknya referral antar-agen dan saat ini kosong):

```sql
alter table sp_users add column handler_id uuid references sp_users(id);  -- marketing penanggung jawab
alter table sp_users add column handler_assigned_at timestamptz;
alter table sp_users add column handler_assigned_by uuid references sp_users(id);
create index on sp_users (handler_id) where handler_id is not null;
```

Riwayatnya disimpan append-only, supaya komisi override tidak bisa berubah
diam-diam ketika agen dipindah tangan:

```sql
create table sp_agent_handler_history (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references sp_users(id),
  handler_id uuid references sp_users(id),
  assigned_by uuid references sp_users(id),
  reason text,
  valid_from timestamptz not null default now(),
  valid_to timestamptz
);
```

**Dua cara penugasan, sesuai permintaan:**
- manual dari CMS/dashboard (aksi `marketing_assign_agent`, khusus ADMIN + MARKETING_LEAD)
- dipilih saat agen **sudah terverifikasi** — hook pada transisi
  `verified: false -> true` menampilkan pilihan marketing; kalau dilewati,
  agen masuk antrean "belum punya handler" di dashboard.

### 3.2 Tier & layering marketing

Meniru pola `sp_agent_tiers` yang sudah terbukti (19 kolom, `rank`,
`l1_override_rate`, `l2_override_rate`, `requires_approval`):

```sql
create table sp_marketing_tiers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,          -- MO, SMO, MM, AM
  name text not null,                 -- Marketing Officer, Senior, Manager, Area Manager
  rank int not null,
  min_recruits int default 0,         -- syarat naik: jumlah agen aktif
  min_production_amount bigint default 0,
  override_l1_rate numeric default 0, -- dari produksi agen yg dia handle langsung
  override_l2_rate numeric default 0, -- dari produksi agen bawahan marketing bawahannya
  is_active bool default true
);
```

Layering antar-marketing (struktur, bukan referral):

```sql
alter table sp_users add column marketing_parent_id uuid references sp_users(id);
```

Sehingga: `produksi agen → marketing handler (L1) → marketing parent (L2)`.
Override dihitung **server-side saja**, lewat fungsi `SECURITY DEFINER`, dan
`sp_wallet_transactions` tetap append-only. Tidak ada tulisan dari klien ke
tabel uang — aturan ini tidak dilonggarkan untuk fitur ini.

---

## 4. Isi dashboard marketing (`/marketingapp`)

### 4.1 CRM — mengelola orang
- **Pipeline rekrutmen agen:** `PROSPEK → DAFTAR → DOKUMEN → TERVERIFIKASI → PRODUKTIF`,
  dengan umur per tahap (bukan hanya jumlah) supaya yang mandek terlihat.
- **Daftar agen saya:** status verifikasi, tier, produksi 30 hari, hari sejak
  order terakhir, dan penanda **"belum pernah produksi"** — itu metrik paling
  berguna bagi marketing dan paling sering disembunyikan dashboard.
- **Catatan & follow-up:** `sp_marketing_activities` (tipe: call/WA/visit/training,
  hasil, janji berikutnya). Ini yang membuatnya CRM, bukan laporan.
- **Antrean tindakan**, meniru pola `OpsConsoleView` yang sudah ada: diurutkan
  berdasarkan **umur**, bukan tanggal buat.

### 4.2 Produksi / penjualan agen — persis field yang Anda minta
Satu tabel, dari `v_produksi`, bisa difilter dan diekspor:

| Kolom | Sumber |
|---|---|
| Nomor polis | `sp_policy_orders.policy_number` |
| Asuransi (penanggung) | `insurer_name` / `insurer_id` |
| Produk & jenis pertanggungan | `product_name`, `coverage_type`, `vehicle_details` |
| Tanggal efektif | `start_date`, `end_date` |
| Perhitungan premi | `base_premium`, `addon_premium`, `admin_fee`, `stamp_duty`, `discount_amount`, `net_premium`, `total_premium`, `ojk_rate`, `zone` |
| Komisi | `commission_rate`, `commission_amount` + override L1/L2 |
| Status bayar | `sp_payments.status` → PAID / UNPAID / CANCEL (+ `paid_at`, `payment_channel`) |
| Agen & handler | `agent_id`, `handler_id` |

### 4.3 Rekap harian / mingguan / bulanan
Agregat dihitung **di server** (view + aksi gateway), bukan di browser:
`marketing_production_recap(period: 'daily'|'weekly'|'monthly', from, to)`.
Zona waktu dipaku ke **Asia/Jakarta** — kalau tidak, rekap harian akan bergeser
dan tidak ada yang sadar.

### 4.4 KPI
Target bulanan per marketing (`monthly_target` sudah ada di `sp_users`),
pencapaian, jumlah agen aktif vs rekrut, rasio agen produktif, rata-rata premi
per polis, dan progres ke tier berikutnya. Setiap kartu menampilkan
**pembilang/penyebut**, bukan hanya persen, supaya bisa diaudit.

---

## 5. Master dashboard
Satu baris per marketing: produksi, komisi+override, jumlah agen, agen produktif,
pencapaian target, tier. Semua dari `v_produksi` yang sama — inilah yang membuat
"terkoordinasi" benar secara struktur, bukan sekadar klaim. Plus laporan
**rekonsiliasi**: order tanpa pembayaran, komisi tanpa order, polis tanpa nomor.

## 6. Aplikasi agen
Kartu "Marketing pendamping Anda" (nama, foto, WA) di profil agen, dari
`handler_id`. Read-only bagi agen; agen tidak boleh memilih atau mengganti
handler-nya sendiri.

## 7. Aksi gateway baru
`marketing_dashboard_summary`, `marketing_list_agents`, `marketing_agent_detail`,
`marketing_production_list`, `marketing_production_recap`, `marketing_log_activity`,
`marketing_assign_agent` (ADMIN/LEAD), `admin_marketing_overview` (ADMIN).

Otorisasi per aksi di `actions/marketing.ts`: seorang MARKETING **hanya** boleh
melihat agen di subtree-nya (`handler_id` = dirinya, atau lewat
`marketing_parent_id`). Diuji dengan impersonasi dua pengguna di transaksi yang
di-rollback, seperti pembuktian isolasi RLS sebelumnya — bukan sekadar
diasumsikan. `FINANCE_ROLES` **tidak** ditambah MARKETING.

## 8. Urutan kerja
| Fase | Isi | Perkiraan |
|---|---|---|
| 0 | Tulang belakang data + `v_produksi` + rekonsiliasi | 2–3 sesi |
| 1 | Role, tier, `handler_id`, penugasan, kartu di apps agen | 1–2 sesi |
| 2 | Portal marketing: CRM + produksi + rekap | 2–3 sesi |
| 3 | KPI, override komisi, master dashboard | 2 sesi |

## 9. Keputusan yang saya butuhkan dari Anda
1. **Override komisi marketing**: tambahan di atas komisi agen (biaya naik), atau
   bagi hasil dari komisi yang sama (komisi agen turun)? Ini mengubah uang, jadi
   saya tidak mengasumsikan.
2. **Tier marketing**: otomatis dari pencapaian, atau tetap perlu persetujuan
   seperti `sp_agent_tiers.requires_approval`?
3. **Agen tanpa handler**: boleh tetap berjualan, atau diblokir sampai ditugaskan?
4. **Paid/unpaid sebelum Fase 0 selesai**: tampilkan "belum ada data pembayaran"
   secara terbuka, atau izinkan penandaan manual oleh operator (dan diberi label
   manual)?
