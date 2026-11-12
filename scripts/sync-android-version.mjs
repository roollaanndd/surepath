#!/usr/bin/env node
// Keep android/app/build.gradle AND package.json in step with src/version.ts.
//
// Why: the Android versionName sat at "1.0.1" while the app shipped 2.5.11 —
// twenty-odd releases of drift. A Play Store upload carrying the wrong version
// cannot be correlated with a crash report, a changelog entry, or a bug a user
// reports by version, and nothing in the build surfaced the mismatch.
// package.json had its own drift (still "2.7.17" while the app shipped 2.8.6),
// so it is synced here too — one APP_VERSION, three files, zero drift.
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
const PACKAGE_JSON = 'package.json';
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

const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'));
const currentName = nameMatch[1];
const currentCode = Number(codeMatch[1]);
const oldPkgVersion = pkg.version;
const drifts = [];
if (currentName !== appVersion) drifts.push(`${GRADLE} "${currentName}"`);
if (oldPkgVersion !== appVersion) drifts.push(`${PACKAGE_JSON} "${oldPkgVersion}"`);

if (drifts.length === 0) {
  console.log(`✓ Semua sumber versi selaras: ${appVersion} (versionCode ${currentCode})`);
  process.exit(0);
}

if (checkOnly) {
  console.error(
    `✗ Versi melenceng dari ${VERSION_TS} "${appVersion}":\n` +
    drifts.map(d => `  - ${d}`).join('\n') +
    `\n  Jalankan: node scripts/sync-android-version.mjs`,
  );
  process.exit(1);
}

if (currentName !== appVersion) {
  const nextCode = currentCode + 1;
  const updated = gradle
    .replace(/versionName\s+"[^"]+"/, `versionName "${appVersion}"`)
    .replace(/versionCode\s+\d+/, `versionCode ${nextCode}`);
  writeFileSync(GRADLE, updated);
  console.log(
    `✓ Versi Android disinkronkan: ${currentName} → ${appVersion} ` +
    `(versionCode ${currentCode} → ${nextCode})`,
  );
}

if (oldPkgVersion !== appVersion) {
  pkg.version = appVersion;
  writeFileSync(PACKAGE_JSON, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✓ package.json disinkronkan: ${oldPkgVersion} → ${appVersion}`);
}
