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

// Authentication is a deployment invariant, not just a comment in config.toml.
// Any endpoint with platform JWT verification disabled must be explicitly reviewed
// here so a future config edit cannot silently expose a new function.
const verifyJwtFalseAllowlist = new Map([
  ['data-gateway', 'Validates Supabase JWTs in code and explicitly allowlists public actions.'],
  ['quotations-gateway', 'Serves public quotation links; private actions validate Supabase JWTs in code.'],
  ['daily-report', 'Scheduled job; must enforce its own trusted scheduler/secret check.'],
  ['insurer-reminder-cron', 'Scheduled job; must enforce its own trusted scheduler/secret check.'],
  ['xendit-webhook', 'Authenticates server callbacks with the Xendit x-callback-token.'],
]);

// Parse each function block and require an explicit verify_jwt setting.
const functionSettings = new Map();
let currentFunction = null;
for (const line of toml.split(/\\r?\\n/)) {
  const section = line.match(/^\\[functions\\.([A-Za-z0-9_-]+)\\]\\s*$/);
  if (section) {
    currentFunction = section[1];
    functionSettings.set(currentFunction, null);
    continue;
  }
  if (/^\\[/.test(line)) {
    currentFunction = null;
    continue;
  }
  if (currentFunction) {
    const setting = line.match(/^\\s*verify_jwt\\s*=\\s*(true|false)\\s*(?:#.*)?$/);
    if (setting) functionSettings.set(currentFunction, setting[1] === 'true');
  }
}

for (const fn of declared) {
  if (!functionSettings.has(fn) || functionSettings.get(fn) === null) {
    problems.push(`"${fn}" must explicitly set verify_jwt = true or false in ${CONFIG}.`);
    continue;
  }
  if (functionSettings.get(fn) === false && !verifyJwtFalseAllowlist.has(fn)) {
    problems.push(
      `"${fn}" disables platform JWT verification without an explicit security exception.`,
      `    → Review its in-function authentication, then document the reason in verifyJwtFalseAllowlist.`,
    );
  }
}

for (const [fn, reason] of verifyJwtFalseAllowlist) {
  if (!declared.has(fn)) {
    problems.push(`JWT-disabled exception "${fn}" is stale: no [functions.${fn}] declaration exists.`);
  } else if (functionSettings.get(fn) !== false) {
    problems.push(`JWT-disabled exception "${fn}" must explicitly set verify_jwt = false.`);
  }
  if (!reason.trim()) problems.push(`JWT-disabled exception "${fn}" needs a non-empty rationale.`);
}

if (problems.length > 0) fail(problems);

console.log(`✓ Edge function: ${declared.size} dideklarasikan, ${excused.size} sengaja tidak dihidupkan, ${onDisk.length} di repo — semua punya sikap tertulis.`);
for (const [fn, why] of excused) console.log(`  · ${fn} sengaja mati — ${why}`);
