# Pathy — asisten AI dengan tools (`pathy-agent`)

> Edge function: `supabase/functions/pathy-agent/`. Deploy manual:
> `supabase functions deploy pathy-agent --project-ref uyjgeteelnswphyzkjwi`
> Versi deploy saat ini: **v3** (7 September 2026). Klien: `pathyChat()` di `services/website.ts`, UI di `components/shared/PathyChat.tsx`.

## Kenapa fungsi sendiri, bukan action di data-gateway

Loop tool-calling butuh beberapa round-trip ke model, sehingga tidak muat di timeout klien 15 detik milik `callGateway()`. Selain itu jalur AI sebaiknya tidak berbagi code path dengan action uang. Polanya sama dengan fungsi AI berdiri sendiri lain (`ai-proxy`, `ai-policy-review`, `stnk-ocr`).

```
browser ──(Supabase JWT)──▶ pathy-agent ──▶ OpenRouter (tool calls)
                                 │
                                 └─(service_role, di-scope ke caller)──▶ Postgres
```

## Kontrak

**Request** `POST /functions/v1/pathy-agent` (`Authorization: Bearer <JWT user>`)

```jsonc
{
  "message": "polis saya apa saja?",          // maks 2000 karakter
  "history": [{ "role": "user|assistant", "content": "..." }]  // maks 8 giliran terakhir
}
```

**Response 200**

```jsonc
{
  "data": {
    "reply": "Kamu punya 2 polis aktif …",
    "cards": [{ "type": "policies", "data": { "policies": [ … ] } }],
    "toolsUsed": ["get_my_policies"],
    "model": "openai/gpt-4o-mini",
    "latencyMs": 2140
  }
}
```

**Error** → `{ "error": "..." }` dengan status: `400` pesan kosong · `401` token hilang/invalid · `429` lewat kuota per jam · `502` model tidak tersedia · `503` `OPENROUTER_KEY` belum diset / permintaan terlalu kompleks.

Klien memetakan status itu ke `PathyError.code` (`AUTH` / `RATE_LIMIT` / `NOT_CONFIGURED` / `UNAVAILABLE`) supaya UI bisa berkata jujur. `404`/`5xx` jatuh ke jawaban knowledge-base (`askPathy`) dan ditandai `degraded: true`.

## Tools

| Tool | Akses | Fungsi |
|---|---|---|
| `get_my_policies` | semua | Daftar polis/order milik caller. AGENT → `agent_id`, CUSTOMER → `client_id`. Filter status opsional. |
| `get_policy_detail` | semua | Rincian satu polis (premi dasar, add-on, rate OJK, zona) berdasar nomor order/polis. |
| `get_my_claims` | semua | Daftar klaim + status + nominal estimasi/disetujui. |
| `get_my_quotes` | semua | Penawaran tersimpan milik caller. |
| `list_products` | semua | Katalog produk SurePath (mencegah model mengarang nama/manfaat). |
| `estimate_premium` | semua | Hitung premi kendaraan dari rate set OJK aktif (`sp_ojk_rate_sets`), band **MIN** (tarif batas bawah). |
| `create_quote` | semua | **Satu-satunya tool tulis.** Simpan penawaran ke `sp_quotes` status `DRAFT`, berlaku 14 hari. |
| `get_sales_report` | AGENT/ADMIN | Ringkasan order, premi bruto/terbayar, komisi, saldo dompet (read-only). |
| `read_attachment` | semua | Baca lampiran STNK/KTP giliran ini (sudah di-OCR di klien). |
| `compare_offers` | semua | Tiga opsi sekaligus: Comprehensive, Comprehensive + perluasan, TLO. |
| `build_quotation` | semua | **Tool tulis kedua.** Menyusun proposal + menyimpan draf; klien merender PDF slip. |

### Tool layanan (v2.3.0) — `serviceTools.ts`

Semuanya **baca-saja atau siapkan-saja**. Tidak satu pun menulis; lihat bagian di bawah.

| Tool | Akses | Fungsi |
|---|---|---|
| `check_coverage` | semua | Apakah satu risiko dijamin, dibaca dari `coverage_type` + `addons` polis caller. Termasuk risiko sendiri. |
| `start_claim` | semua | Cari polis yang berlaku pada tanggal kejadian, daftar dokumen, dan prefill formulir klaim. **Tidak mengirim klaim.** |
| `claim_status` | semua | Status + tahap + langkah berikutnya + apa yang masih kurang. |
| `renewal_check` | semua | Polis jatuh tempo; premi perpanjangan dihitung ulang dari rate set OJK aktif (penyusutan 10%/tahun). |
| `explain_my_policy` | semua | Daftar ditanggung / tidak ditanggung untuk satu polis. |
| `payment_help` | semua | Tagihan tertunda + `invoice_url` yang **sudah ada** di `sp_payments`. Tidak membuat invoice. |
| `pipeline_nudge` | AGENT/ADMIN | Penawaran DRAFT mendekati kedaluwarsa + order menunggu bayar > 3 hari. |
| `commission_forecast` | AGENT/ADMIN | Dompet + komisi + perkiraan dari order berjalan (read-only). |
| `draft_followup` | AGENT/ADMIN | Draft pesan WhatsApp untuk satu penawaran. Tidak mengirim apa pun. |

### Kenapa tool layanan tidak menulis

`submit_claim` (di `data-gateway/actions/claims.ts`) mengonsumsi hasil forensik foto yang di-*stage* server-side oleh `analyze-claim-photos`: sekali pakai, dicocokkan dengan `user_id` caller, dan ditolak kalau kedaluwarsa — supaya pemalsu tidak bisa mengirim `fraud_verdict: CLEAN` sendiri. Pembayaran lewat `create-xendit-invoice`. Menambahkan pintu kedua ke salah satunya berarti menduplikasi penjaga itu atau melubanginya.

Karena itu Pathy hanya **menyiapkan**: `start_claim` mengembalikan `prefill`, klien memarkirnya lewat `services/claimHandoff.ts` dan membuka formulir klaim yang sudah ada. Commit tetap di tempat penjaganya berada. Ada uji yang menjalankan kesembilan tool terhadap database palsu yang melempar error pada setiap verba tulis.

### Aturan jaminan

Banjir, gempa, huru-hara, terorisme, TJH pihak ketiga, dan kecelakaan diri **bukan jaminan dasar** PSAKBI — semuanya perluasan berbayar. `check_coverage` selalu meresolusi jawabannya terhadap kolom `addons` order, tidak pernah dari pengetahuan umum model.

## Lampiran & proposal penawaran

**OCR berjalan di klien, bukan di sini.** Browser sudah memiliki `stnk-ocr`, `services/ktpOcr.ts`, dan `services/vehicleDatabase.ts` (2.500 baris harga kendaraan — terlalu besar untuk dikirim ke edge function). Klien mengekstrak, menormalkan, dan meresolusi nilai pertanggungan, lalu mengirim **hanya kolom hasilnya**:

```jsonc
{
  "message": "Buatkan penawaran, beberapa opsi",
  "documents": [
    { "type": "STNK", "confidence": 0.96,
      "fields": { "plate": "B 1234 XYZ", "brand": "Toyota", "model": "…", "year": 2022,
                  "province": "DKI Jakarta", "zone": 2, "market_value": 204840000 } },
    { "type": "KTP", "fields": { "name": "BUDI SANTOSO", "nik": "…", "address": "…" } }
  ]
}
```

Gambar tidak pernah melewati fungsi ini. `sanitizeDocuments()` hanya mempercayai *bentuk*-nya; isinya tetap data tak tepercaya yang wajib diambil model lewat `read_attachment` — tidak pernah masuk system prompt. Hanya **jenis** lampiran (enum tetap) yang disebut di prompt, supaya model tahu ada yang perlu dibaca.

`build_quotation` mengembalikan payload berbentuk `AgentQuoteSource` (`services/quotationSlipAdapter.ts`). Klien meneruskannya ke `fromAgentQuote()` lalu `publishAndDownloadQuotation()` — **pipeline yang sama persis dengan `components/car-wizard/StepFinal.tsx`**, sehingga proposal dari chat identik dengan proposal dari wizard beli kendaraan.

**Premi dihitung ulang di `build_quotation`**, bukan dibawa dari `compare_offers`. Angka pada dokumen komersial harus berasal dari mesin tarif pada permintaan itu, bukan dari riwayat percakapan.

## Aturan keamanan

1. **Identitas tidak pernah dari model.** `agent_id`, `client_id`, `user_id` selalu diambil dari JWT yang sudah diverifikasi. Argumen model yang berisi id diabaikan. Model boleh berhalusinasi id apa pun — query tetap hanya menyentuh baris milik caller.
2. **Owner id kanonik.** Sama seperti data-gateway (FIX v1.50.0): baris ditulis dengan `sp_users.id`, tapi akun lama punya `sp_users.id ≠ auth.users.id`, jadi pembacaan memakai `ownerIds` (keduanya). Semua id divalidasi sebagai UUID sebelum masuk filter.
3. **Teks bebas pengguna tidak pernah masuk system prompt.** Hanya `role` (enum tetap) yang diinterpolasi. Pesan dan riwayat dibungkus `wrapUserContent()` di dalam message ber-role `user`.
4. **Tidak ada jalur uang.** Tidak ada tulis ke `sp_agent_wallets`, `sp_wallet_transactions`, `sp_commissions`, `sp_payments`, `sp_policy_orders`, atau `sp_claims`. Dompet hanya dibaca, itu pun hanya dompet caller sendiri.
5. **Argumen di-clamp di server.** `limit` 1–25, `sum_insured` Rp 5jt–20M, `tpl_limit` hanya dari daftar OJK, kursi PA 0–7.
6. **Rate limit** 60 pesan/jam per user lewat `sp_rate_limits` (persisten, tahan redeploy).
7. **Loop dibatasi** 4 ronde tool; pada ronde terakhir `tools` dilepas agar model wajib menjawab prosa.

## Angka premi

`estimate_premium` memakai `supabase/functions/_shared/ojk.ts` — cerminan Deno dari `services/ojkRates.ts`. Sumber kebenaran runtime-nya adalah baris aktif `sp_ojk_rate_sets` (dikelola CMS OJK Rate admin); tabel bawaan hanya fallback bila fetch gagal.

**Kalau salah satu tabel diubah, ubah keduanya.** `services/__tests__/pathy.test.ts` menguji paritas kedua mesin (rate, premi dasar, add-on, total, mobil & motor) supaya keduanya tidak diam-diam berpisah.

Model tidak pernah diizinkan menghitung premi sendiri — system prompt mewajibkan setiap angka premi datang dari tool ini, dan UI menampilkan angka dari `cards`, bukan dari prosa model.
