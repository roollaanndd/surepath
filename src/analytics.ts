// analytics.ts — event konversi GA4 untuk situs publik.
//
// Kenapa berkas ini ada (audit situs publik 31 Okt 2026):
//   GA4 sudah terpasang benar di `index.html` dan hidup di produksi, tapi ia
//   HANYA mengirim `page_view`. Nol `gtag('event', …)` di seluruh `src/pages/`.
//   Artinya tidak ada yang tahu berapa orang menekan CTA hero, memakai
//   kalkulator premi, menekan tombol WhatsApp, atau mengirim formulir kontak —
//   jadi tidak ada satu pun perbaikan konversi yang bisa dibuktikan berhasil
//   atau gagal.
//
// Satu helper, dipasang di titik-titik niat beli. Sengaja tidak memuat SDK
// apa pun: `gtag` sudah ada di `window` dari `index.html`.

type GtagWindow = Window & {
  gtag?: (command: string, ...args: unknown[]) => void;
  __gtagReady?: boolean;
};

/** Nama event yang dilacak. Union, bukan string bebas, supaya nama tidak
 *  menyimpang antar halaman — GA4 memperlakukan `hero_cta` dan `heroCta`
 *  sebagai dua event berbeda dan laporannya pecah tanpa peringatan. */
export type TrackedEvent =
  | 'hero_cta_click'          // CTA utama hero beranda
  | 'final_cta_click'         // CTA di bagian penutup
  | 'product_card_click'      // kartu produk → halaman produk
  | 'calculator_interact'     // pengunjung mengubah pilihan di kalkulator
  | 'calculator_result'       // premi berhasil dihitung
  | 'calculator_cta_click'    // CTA setelah hasil kalkulator
  | 'whatsapp_click'          // tombol WhatsApp melayang
  | 'contact_form_submit'     // formulir kontak terkirim ke server
  | 'install_app_click';      // tombol Install App / PWA

/**
 * Mengirim satu event ke GA4. Aman dipanggil kapan pun: kalau GA4 diblokir
 * pemblokir iklan, belum sempat dimuat, atau `VITE_GA4_ID` tidak diset,
 * fungsi ini diam saja dan TIDAK pernah melempar. Pelacakan yang gagal tidak
 * boleh menjatuhkan interaksi yang sedang dilacaknya.
 */
export function trackEvent(name: TrackedEvent, params?: Record<string, unknown>): void {
  try {
    if (typeof window === 'undefined') return;
    const host = window as GtagWindow;
    if (typeof host.gtag !== 'function') return;
    host.gtag('event', name, params ?? {});
  } catch {
    /* pelacakan tidak pernah mengganggu alur pengguna */
  }
}
