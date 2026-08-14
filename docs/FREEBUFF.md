# SurePath — Setup Freebuff

> Terakhir diperbarui: 14 Agustus 2026.

[Freebuff](https://github.com/CodebuffAI/freebuff) adalah coding agent CLI gratis (dibangun di atas platform Codebuff) yang berjalan di terminal. Dokumen ini menjelaskan cara memasangnya dan aturan main saat dipakai di repo SurePath.

## Ringkasan

| Hal | Nilai |
|---|---|
| Paket npm | `freebuff` (MIT, versi 0.0.149 saat dokumen ini ditulis) |
| Perintah | `freebuff` — dijalankan dari root repo |
| File konteks repo | `AGENTS.md` di root (dibaca otomatis setiap sesi) |
| Shortcut repo | `npm run agent` |
| Model default | DeepSeek V4 Pro; picker juga berisi DeepSeek V4 Flash, GPT-5.6 Luna, MiniMax M3, MiMo 2.5 |
| Biaya | Gratis, didanai iklan teks — tanpa API key |

## Instalasi

```bash
npm install -g freebuff
```

Paket npm-nya hanya **stub launcher**: binary asli diunduh saat pertama kali dijalankan dari
`https://codebuff.com/api/releases/download/<versi>/freebuff-<platform>.tar.gz`.
Artinya mesin yang dipakai harus bisa menjangkau `codebuff.com`.

Verifikasi:

```bash
freebuff --version
```

## Pemakaian di repo ini

```bash
cd /path/ke/surepath
npm run agent        # sama dengan menjalankan `freebuff` di root repo
```

Jalankan **selalu dari root repo**, bukan dari subfolder — Freebuff membaca `AGENTS.md` di root
untuk konteks proyek (arsitektur, perintah, dan aturan keras). Kalau dijalankan dari subfolder,
konteks itu tidak terbaca dan agent bisa mengambil keputusan yang salah.

## `AGENTS.md` adalah sumber konteks

`AGENTS.md` di root repo adalah file instruksi yang dibaca Freebuff (dan agent lain yang memakai
konvensi `AGENTS.md`: Codex, Cursor, Amp, dsb). Isinya cerminan `CLAUDE.md` yang dibaca Claude Code.

**Kalau salah satu diubah, ubah keduanya** — dua file ini harus tetap sinkron. Keduanya ada di
`.gitignore` (bagian "AI dev tooling — excluded from client handover") tapi sengaja di-commit
dengan `git add -f` supaya setiap developer dapat konteks yang sama.

## Aturan main (penting)

SurePath adalah platform produksi berisi **PII nasabah asli dan uang asli**. Aturan lengkap ada di
bagian "Hard rules" pada `AGENTS.md`; ringkasnya:

- Jangan pernah menempelkan secret ke prompt — Xendit key, Supabase `service_role`, AI provider key.
  Jangan minta agent membaca file `.env*`.
- Jangan menempelkan data nasabah asli (nama, NIK, nomor HP, record polis/pembayaran) ke prompt.
  Pakai akun demo atau data sintetis.
- Jangan biarkan agent melemahkan data gateway, menulis ke jalur uang dari sisi klien, menjalankan
  perintah DB destruktif, atau push langsung ke `main`.
- Review diff-nya sebelum commit. Agent boleh menulis kode; yang bertanggung jawab tetap manusia.

### Catatan privasi

Menurut README resmi Freebuff, layanan ini gratis karena didanai iklan, dan prompt, pesan, kode,
file, serta data repositori **dapat dianalisis untuk mempersonalisasi iklan** dan — untuk model atau
fitur tertentu — **dapat dipakai melatih model AI**. Pertimbangkan ini sebelum memakainya pada
bagian repo yang sensitif (isi `supabase/functions/`, logika pembayaran, skema data nasabah).
Detail: <https://freebuff.com/privacy-policy>.

## Troubleshooting

**`Failed to download freebuff: Proxy CONNECT failed with status 403`**
Jaringan/proxy memblokir `codebuff.com`. Ini yang terjadi di sandbox Claude Code on the web —
egress policy-nya tidak mengizinkan host tersebut, jadi Freebuff **tidak bisa dijalankan di sana**;
pakai mesin lokal. Jangan mematikan verifikasi TLS atau meng-unset `HTTPS_PROXY` untuk menyiasatinya.

**Binary korup / versi nyangkut**
Hapus cache unduhan lalu jalankan ulang:

```bash
npm uninstall -g freebuff && npm install -g freebuff
```

**Freebuff mengabaikan konvensi proyek**
Cek `AGENTS.md` masih ada di root dan sesi dijalankan dari root repo.

## Referensi

- Repo: <https://github.com/CodebuffAI/freebuff>
- Dokumentasi platform: <https://codebuff.com/docs>
- Konteks agent repo ini: `AGENTS.md`, `CLAUDE.md`
