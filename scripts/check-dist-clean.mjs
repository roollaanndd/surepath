#!/usr/bin/env node
// Penjaga: apa pun yang ada di dist/ akan TERPUBLIKASI ke internet.
//
// Kenapa ada: `npm run build` dulu menulis bundle server dev beserta
// sourcemap-nya ke dist/ — folder yang dipublikasikan Vercel. Sourcemap itu
// membawa `sourcesContent`, yaitu KODE SUMBER TYPESCRIPT ASLI dari server.ts
// (termasuk AI gateway berikut lapisan validasi PII-leak) dan
// services/aiAdminEngine.ts. Siapa pun yang menebak /server.cjs.map bisa
// mengunduh sumbernya utuh, lengkap dengan komentar.
//
// Ini tidak bersuara: build sukses, situs normal, tidak ada yang menandai.
// Persis pola yang sama dengan cacat-cacat lain yang ditemukan di v2.5.2-v2.5.4.
//
// Penjaga ini berjalan di akhir `npm run build`, jadi build GAGAL sebelum
// sesuatu yang tidak semestinya sempat ter-deploy.

import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';

// Berkas yang tidak boleh ada di folder publik, beserta alasannya.
const TERLARANG = [
  { uji: f => f.endsWith('.map'),
    alasan: 'sourcemap membawa kode sumber asli (sourcesContent)' },
  { uji: f => /(^|\/)server\.[cm]?js$/.test(f),
    alasan: 'bundle server dev tidak punya urusan di folder publik' },
  { uji: f => /\.(env|pem|key|p12|keystore|jks)$/i.test(f),
    alasan: 'berkas kredensial' },
  { uji: f => /(^|\/)\.env/.test(f),
    alasan: 'berkas environment' },
];

function semuaBerkas(dir, akar = dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...semuaBerkas(p, akar));
    else out.push(relative(akar, p).split('\\').join('/'));
  }
  return out;
}

if (!existsSync(DIST)) {
  console.error(`✗ ${DIST}/ tidak ada — jalankan build lebih dulu.`);
  process.exit(1);
}

const berkas = semuaBerkas(DIST);
const temuan = [];

for (const f of berkas) {
  for (const { uji, alasan } of TERLARANG) {
    if (uji(f)) {
      const kb = (statSync(join(DIST, f)).size / 1024).toFixed(1);
      temuan.push({ f, alasan, kb });
      break;
    }
  }
}

if (temuan.length > 0) {
  console.error('\n✗ BUILD DIHENTIKAN — berkas berikut akan terpublikasi ke internet:\n');
  for (const t of temuan) {
    console.error(`  ${t.f}  (${t.kb} KB)`);
    console.error(`      → ${t.alasan}\n`);
  }
  console.error('  Pindahkan keluar dari dist/, atau matikan pembuatannya.\n');
  process.exit(1);
}

console.log(`✓ dist/ bersih: ${berkas.length} berkas, tidak ada sourcemap/bundle server/kredensial.`);
