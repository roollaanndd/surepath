// Financing Core sengaja TIDAK TERDAFTAR di situs publik.
//
// Permintaannya: hanya yang punya tautannya yang bisa masuk; orang umum tidak
// menemukannya dari website. Itu dijalankan dengan menghapus seluruh pintu
// masuk di SiteLayout, bukan dengan mematikan rutenya.
//
// Kenapa ini butuh uji sendiri: "tautan yang dihapus" adalah jenis perubahan
// yang paling mudah batal tanpa disadari. Satu pekerjaan UI berikutnya yang
// menambahkan kembali tombol "Masuk Pembiayaan" — atau satu entri navbar yang
// dikembalikan sambil menata ulang menu — langsung membuka kembali pintunya,
// dan tidak ada yang akan menyadarinya sampai ada yang menemukannya. Uji ini
// membaca berkas sumbernya langsung, jadi ia berteriak saat itu terjadi.
//
// Sisi lain yang sama pentingnya: rutenya HARUS tetap hidup. Kalau suatu saat
// ada yang "merapikan" dengan menghapus rutenya juga, tautan yang sudah dibagi
// ke orang akan mati — jadi itu ikut dikunci di sini.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const siteLayout = read('src/pages/site/SiteLayout.tsx');
const appTsx = read('App.tsx');
const robots = read('public/robots.txt');
const sitemap = read('public/sitemap.xml');
const seo = read('src/seo/seo.ts');

describe('Financing Core tidak terdaftar di situs publik', () => {
  it('tidak ada satu pun rujukan /financing di SiteLayout', () => {
    expect(siteLayout).not.toMatch(/\/financing/);
  });

  it('tidak ada entri navbar untuk financing', () => {
    // NAV_LINKS adalah yang mengisi menu desktop DAN menu mobile sekaligus;
    // satu entri di sini memunculkan dua pintu masuk.
    const navBlock = siteLayout.slice(
      siteLayout.indexOf('const NAV_LINKS'),
      siteLayout.indexOf('const SiteNav'),
    );
    expect(navBlock.length).toBeGreaterThan(0);
    expect(navBlock.toLowerCase()).not.toMatch(/financing|pembiayaan/);
  });

  it('tidak ada tombol "Masuk Pembiayaan" di mana pun di situs', () => {
    expect(siteLayout).not.toMatch(/Masuk Pembiayaan/i);
    expect(siteLayout).not.toMatch(/Financing Login/i);
  });

  it('tidak dipanggil dari halaman situs lain', () => {
    for (const f of [
      'src/pages/site/SiteLayout.tsx',
      'src/pages/HomePage.tsx',
      'src/pages/ProductsPage.tsx',
    ]) {
      let body = '';
      try { body = read(f); } catch { continue; } // halaman opsional
      expect(body, `${f} menautkan ke /financing`).not.toMatch(/go\(['"]\/financing/);
    }
  });
});

describe('tautan langsung harus tetap berfungsi', () => {
  it('rutenya masih terdaftar di App.tsx', () => {
    expect(appTsx).toMatch(/pathname === '\/financing'/);
    expect(appTsx).toMatch(/FinancingPage/);
  });

  it('kedua bentuk alamat tetap dilayani', () => {
    expect(appTsx).toMatch(/\/financing\/dashboard/);
  });
});

describe('tidak diumumkan ke mesin pencari — maupun ke pembaca robots.txt', () => {
  it('tidak ada di sitemap', () => {
    expect(sitemap).not.toMatch(/financing/i);
  });

  it('TIDAK dicantumkan di robots.txt', () => {
    // Sengaja: robots.txt bisa dibaca siapa pun. Menulis "Disallow: /financing"
    // di sana justru mengumumkan alamat yang ingin disembunyikan. Rutenya sudah
    // noindex lewat jalur lain (uji berikutnya), jadi menyebutnya di sini hanya
    // merugikan.
    expect(robots).not.toMatch(/financing/i);
  });

  it('tetap noindex karena bukan halaman terdaftar di seo.ts', () => {
    // resolveSeo() memulangkan noindexDescriptor untuk path yang tidak dikenal.
    // Jadi begitu /financing masuk PAGES, ia berhenti noindex — itu yang dijaga.
    expect(seo).not.toMatch(/'\/financing'/);
    expect(seo).toMatch(/return noindexDescriptor\(pathname\)/);
  });
});
