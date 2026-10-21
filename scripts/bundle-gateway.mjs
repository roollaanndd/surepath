// Membundel sumber data-gateway menjadi satu berkas, untuk jalur pemulihan
// darurat yang memuat kode gateway dari database.
// Lihat docs/INCIDENT_2026-10-21_data-gateway.md.
import { build } from 'esbuild';

const out = process.argv[2];
if (!out) {
  console.error('pemakaian: node scripts/bundle-gateway.mjs <berkas-keluaran>');
  process.exit(1);
}

await build({
  entryPoints: ['supabase/functions/data-gateway/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  minify: true,
  charset: 'utf8',
  legalComments: 'none',
  // Dipertahankan sebagai specifier: diselesaikan oleh runtime edge, bukan di sini.
  external: ['npm:*', 'https://*'],
  outfile: out,
});

console.log('bundel ditulis:', out);
