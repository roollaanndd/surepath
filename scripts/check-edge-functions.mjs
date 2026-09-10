#!/usr/bin/env node
// Penjaga: setiap edge function di repo harus PUNYA SIKAP yang tertulis.
//
// Kenapa ada: `send-insurer-email` hidup di repo, dipanggil klien, dan tidak
// pernah ter-deploy selama berbulan-bulan tanpa ada yang tahu. Penyebabnya
// bukan kode yang salah — melainkan tidak adanya satu tempat pun yang
// menyatakan "fungsi ini seharusnya hidup". Sekali `supabase/config.toml`
// menjadi tempat itu (v2.5.1), ia harus dijaga supaya tidak melenceng lagi.
//
// Aturannya sederhana: setiap direktori di `supabase/functions/` wajib
// SALAH SATU dari
//   • dideklarasikan sebagai `[functions.<nama>]`, atau
//   • ditandai sengaja-tidak-dideploy lewat baris `#!undeclared <nama> — alasan`
// Diam bukan pilihan. Diam persis yang membuat cacat sebelumnya tidak terlihat.
//
// Juga menangkap arah sebaliknya: deklarasi yang sumbernya tidak ada di repo,
// yang berarti deploy akan mencari berkas yang tidak pernah kita punya.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CONFIG = 'supabase/config.toml';
const DIR = 'supabase/functions';

function fail(lines) {
  console.error('\n✗ Pemeriksaan edge function GAGAL\n');
  for (const l of lines) console.error('  ' + l);
  console.error('');
  process.exit(1);
}

if (!existsSync(CONFIG)) {
  fail([`${CONFIG} tidak ditemukan.`,
        'Tanpa berkas ini, integrasi GitHub Supabase men-deploy NOL edge function.']);
}

const toml = readFileSync(CONFIG, 'utf8');

const declared = new Set(
  [...toml.matchAll(/^\s*\[functions\.([A-Za-z0-9_-]+)\]/gm)].map(m => m[1]),
);

// Pengecualian yang disengaja, ditulis di config.toml itu sendiri supaya
// alasannya hidup bersebelahan dengan deklarasinya.
const excused = new Map(
  [...toml.matchAll(/^#!undeclared\s+([A-Za-z0-9_-]+)\s*—\s*(.+)$/gm)]
    .map(m => [m[1], m[2].trim()]),
);

const onDisk = readdirSync(DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name !== '_shared')
  .map(d => d.name)
  .sort();

const problems = [];

for (const fn of onDisk) {
  if (declared.has(fn) && excused.has(fn)) {
    problems.push(`"${fn}" dideklarasikan SEKALIGUS ditandai #!undeclared — pilih salah satu.`);
  } else if (!declared.has(fn) && !excused.has(fn)) {
    problems.push(
      `"${fn}" ada di ${DIR}/ tapi tidak dideklarasikan di ${CONFIG}.`,
      `    → Ia tidak akan pernah ter-deploy, dan tidak ada yang akan memberi tahu.`,
      `    → Deklarasikan [functions.${fn}], ATAU tulis alasannya:`,
      `      #!undeclared ${fn} — alasan kenapa sengaja tidak dihidupkan`,
    );
  }
}

for (const fn of declared) {
  if (!onDisk.includes(fn)) {
    problems.push(
      `"${fn}" dideklarasikan di ${CONFIG} tapi ${DIR}/${fn}/ tidak ada.`,
      `    → Deploy akan mencari sumber yang tidak dimiliki repo ini.`,
    );
  }
}

if (problems.length > 0) fail(problems);

console.log(`✓ Edge function: ${declared.size} dideklarasikan, ${excused.size} sengaja tidak dihidupkan, ${onDisk.length} di repo — semua punya sikap tertulis.`);
for (const [fn, why] of excused) console.log(`  · ${fn} sengaja mati — ${why}`);
