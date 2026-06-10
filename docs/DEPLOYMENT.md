# SurePath — Panduan Deployment

> Terakhir diperbarui: 10 Juni 2026.

## Ringkasan: 3 hal yang dideploy TERPISAH

| Komponen | Trigger | Otomatis? |
|---|---|---|
| Web (myinsurepath.com) | push/merge ke `main` di GitHub | ✅ otomatis via Vercel |
| Edge functions Supabase | `supabase functions deploy <nama>` | ❌ MANUAL |
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

```bash
supabase functions deploy data-gateway --project-ref uyjgeteelnswphyzkjwi
```

- Sumber kode di `supabase/functions/<nama>/index.ts`.
- ⚠️ Mengubah file di repo TIDAK mengubah fungsi yang jalan — selalu deploy manual.
- Secrets fungsi (otomatis tersedia): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.

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
