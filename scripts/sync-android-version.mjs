#!/usr/bin/env node
// Keep android/app/build.gradle in step with src/version.ts.
//
// Why: the Android versionName sat at "1.0.1" while the app shipped 2.5.11 —
// twenty-odd releases of drift. A Play Store upload carrying the wrong version
// cannot be correlated with a crash report, a changelog entry, or a bug a user
// reports by version, and nothing in the build surfaced the mismatch.
//
// versionName mirrors APP_VERSION exactly. versionCode is independent: Play
// requires it to increase on every upload and never reuses a number, so this
// only ever bumps it by one and refuses to lower it.
//
//   node scripts/sync-android-version.mjs          # apply
//   node scripts/sync-android-version.mjs --check  # fail if out of step (CI)

import { readFileSync, writeFileSync } from 'node:fs';

const GRADLE = 'android/app/build.gradle';
const VERSION_TS = 'src/version.ts';
const checkOnly = process.argv.includes('--check');

const appVersion = readFileSync(VERSION_TS, 'utf8').match(
  /APP_VERSION\s*=\s*['"]([^'"]+)['"]/,
)?.[1];
if (!appVersion) {
  console.error(`✗ APP_VERSION tidak ditemukan di ${VERSION_TS}`);
  process.exit(1);
}

const gradle = readFileSync(GRADLE, 'utf8');
const nameMatch = gradle.match(/versionName\s+"([^"]+)"/);
const codeMatch = gradle.match(/versionCode\s+(\d+)/);
if (!nameMatch || !codeMatch) {
  console.error(`✗ versionName/versionCode tidak ditemukan di ${GRADLE}`);
  process.exit(1);
}

const currentName = nameMatch[1];
const currentCode = Number(codeMatch[1]);

if (currentName === appVersion) {
  console.log(`✓ Versi Android sudah selaras: ${appVersion} (versionCode ${currentCode})`);
  process.exit(0);
}

if (checkOnly) {
  console.error(
    `✗ Versi Android melenceng: build.gradle "${currentName}" vs ${VERSION_TS} "${appVersion}".\n` +
    `  Jalankan: node scripts/sync-android-version.mjs`,
  );
  process.exit(1);
}

const nextCode = currentCode + 1;
const updated = gradle
  .replace(/versionName\s+"[^"]+"/, `versionName "${appVersion}"`)
  .replace(/versionCode\s+\d+/, `versionCode ${nextCode}`);
writeFileSync(GRADLE, updated);

console.log(
  `✓ Versi Android disinkronkan: ${currentName} → ${appVersion} ` +
  `(versionCode ${currentCode} → ${nextCode})`,
);
