# SurePath — Panduan Deployment

> Terakhir diperbarui: 7 Juli 2026 (v1.23.0).

## Ringkasan: 3 hal yang dideploy TERPISAH

| Komponen | Trigger | Otomatis? |
|---|---|---|
| Web (myinsurepath.com) | push/merge ke `main` di GitHub | ✅ otomatis via Vercel |
| Edge functions Supabase | push ke `main` yang menyentuh `supabase/functions/**` | ⚠️ **belum aktif** — lihat di bawah |
| APK Android | build di Android Studio | ❌ MANUAL |

## 1. Web — Vercel

- Vercel team: `roollaanndds-projects` (`team_afNqJ8H0darvhUlxlzTjzrjm`)
- Project production: **myinsurepath** (`prj_PFPNq8TJgm2RMircwtaIVC3rQEzd`), branch `main`.
- Project kedua: **surepath** (`prj_MLYVdGeboOTxAO5s0Xf2cwLDGohu`) — repo sama.
- Setiap PR otomatis dapat preview URL (`*-roollaanndds-projects.vercel.app`).
- Env vars wajib di Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (+ `VITE_GSC_VERIFY`, dll).
- Konfigurasi headers/CSP & SPA rewrite: `vercel.json`. CSP `connect-src` sudah mengizinkan `*.supabase.co`.

```bash
npm run build      # vite build + esbuild server.ts
npm run lint       # tsc --noEmit (banyak error TS lama — vite tetap build)
```

## 2. Edge Functions — Supabase

Project ref: `uyjgeteelnswphyzkjwi`.

### ⚠️ Auto-deploy ada, tapi belum pernah benar-benar jalan

`.github/workflows/deploy-edge-functions.yml` sudah men-deploy fungsi yang tersentuh push ke `main`. **Tetapi dua secret repo-nya belum pernah diset**, jadi setiap run berhenti di langkah guard dan melaporkan sukses tanpa men-deploy apa pun. Itulah sebabnya `pathy-agent` di produksi masih versi 7 September (v3) padahal repo sudah dua rilis di depan.

Untuk mengaktifkannya — **Settings → Secrets and variables → Actions**:

| Secret | Isi |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Personal access token dari <https://supabase.com/dashboard/account/tokens> |
| `SUPABASE_PROJECT_REF` | `uyjgeteelnswphyzkjwi` |

Sesudah itu, jalankan ulang workflow terakhir (atau `workflow_dispatch` dengan daftar fungsi) dan deploy berjalan sendiri untuk seterusnya. Selama secret belum ada, halaman run menampilkan ringkasan "⚠️ Edge functions NOT deployed" beserta perintah manual yang perlu dijalankan.

### Deploy manual (selama auto-deploy belum aktif)

```bash
supabase functions deploy data-gateway --project-ref uyjgeteelnswphyzkjwi
```

- Sumber kode di `supabase/functions/<nama>/index.ts`.
- ⚠️ Mengubah file di repo TIDAK mengubah fungsi yang jalan — selalu deploy manual.
- Secrets fungsi (otomatis tersedia): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.

### Daftar edge functions (per v1.23.0)

| Function | Trigger | Catatan |
|---|---|---|
| `data-gateway` | HTTP | Inti — semua akses tabel sensitif lewat sini |
| `create-xendit-invoice` | HTTP | Buat invoice Xendit |
| `xendit-webhook` | HTTP (Xendit callback) | Credit wallet saat PAID |
| `xendit-disburse` | HTTP | Trigger disbursement |
| `send-otp` / `verify-otp` | HTTP | OTP email login |
| `send-whatsapp` | HTTP | WhatsApp notification |
| `submit-policy-insurer` | HTTP | Submit polis ke insurer API |
| `ocr-scan` | HTTP | AI photo scoring |
| `stnk-ocr` | HTTP | OCR STNK |
| `notify-admin` | HTTP | Telegram alert |
| `ai-policy-review` | HTTP | AI underwriting |
| `ai-finance-review` | HTTP | AI financial health |
| `ai-proxy` | HTTP | Proxy AI vendor |
| `daily-report` | HTTP | Laporan harian |
| `send-insurer-email` | HTTP | Kirim review-link email ke insurer (v1.20.0) |
| `insurer-reminder-cron` | **Supabase Cron** | Pengingat insurer tiap 4 jam (v1.22.0) — lihat di bawah |

### `insurer-reminder-cron` — scheduled function (v1.22.0+)

Edge function ini tidak dipanggil HTTP manual, melainkan dijalankan otomatis oleh **Supabase Cron** (pg_cron extension) tiap 4 jam.

**Schedule (Unix cron format):**
```
0 */4 * * *
```
Artinya: menit 0, setiap 4 jam (00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC).

**Setup sekali saja (cek di Supabase Dashboard → Database → Cron Schedules):**
```sql
select cron.schedule(
  'insurer-reminder-cron',
  '0 */4 * * *',
  $$
  select net.http_post(
    url := 'https://uyjgeteelnswphyzkjwi.supabase.co/functions/v1/insurer-reminder-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('request.jwt.secret', true),
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

**Secret yang wajib diset di Supabase → Project Settings → Edge Functions:**
- `CRON_SECRET` — secret string acak (mis. `openssl rand -hex 32`). Edge function `insurer-reminder-cron` memvalidasi header `x-cron-secret` == nilai ini sebelum eksekusi, supaya endpoint tidak bisa dipanggil sembarang dari internet.

**Cara deploy + verify:**
```bash
supabase functions deploy insurer-reminder-cron --project-ref uyjgeteelnswphyzkjwi
# verify jadwalnya aktif:
supabase db execute "select * from cron.job;" --project-ref uyjgeteelnswphyzkjwi
```

Function mengirim email pengingat hanya ke review token yang: belum dipakai, belum expired, dan `last_reminded_at` lebih dari 24 jam lalu (anti-spam). Counter `reminder_count` dinaikkan tiap email terkirim.

## 3. Migrasi Database

- File di `supabase/migrations/` — **apply manual & hati-hati** (lihat `DATABASE_STATE.md`:
  live DB tidak sinkron dengan folder migrasi; beberapa migrasi sengaja ditahan).
- Cara apply: SQL editor di dashboard, atau `supabase db push` (verifikasi dulu isi migrasinya).

## 4. APK Android (Capacitor)

```bash
npm run build
npx cap sync android
# buka android/ di Android Studio → Build → Generate Signed APK/AAB
```

- `capacitor.config.ts`: appId `com.myinsurepath.os`, webDir `dist` (bundle lokal, BUKAN load dari server).
- Konsekuensi: perubahan frontend butuh rilis APK baru.
- Origin WebView = `https://localhost` → sudah diizinkan di CORS data-gateway (v4).
- OAuth redirect native: `com.myinsurepath.os://auth-callback`.

## Checklist rilis fitur yang menyentuh gateway

1. Merge PR ke `main` (web auto-deploy).
2. Deploy edge function yang berubah.
3. Apply migrasi DB jika ada (cek urutan: gateway dulu, baru lockdown RLS).
4. Rebuild APK jika perubahan frontend penting untuk pengguna mobile.
5. Smoke test: registrasi customer, registrasi agent, login keduanya, di web + APK.
