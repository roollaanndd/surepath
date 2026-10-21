// Penyebab "analisa foto AI tidak berfungsi" — laporan pemilik 21 Okt 2026.
//
// compressImageBase64() dijalankan SEBELUM permintaan AI dikirim, baik oleh
// validateVehiclePhoto() maupun analyzeVehicleSurvey(). Versi lamanya hanya
// menyelesaikan promise di `onload` atau `onerror`. Kalau dua-duanya tidak
// pernah menyala — HEIC/HEIF dari iPhone pada sebagian browser, berkas rusak,
// data URL terpotong — `await` di pemanggilnya TIDAK PERNAH kembali:
//
//   - spinner menyala terus
//   - NOL permintaan keluar ke AI
//   - tidak ada error di console maupun di server
//
// Bukti produksinya: fungsi edge `ai-proxy` tercatat **nol** invokasi dalam 24
// jam, padahal fiturnya dilaporkan tidak berfungsi. Permintaannya memang tidak
// pernah dikirim, jadi tidak ada yang bisa ditelusuri di sisi server.
//
// Berkas uji ini TIDAK me-mock geminiService: yang harus dibuktikan justru
// fungsi aslinya. jsdom tidak memuat data URL, sehingga di sini onload/onerror
// memang tidak pernah menyala — lingkungan ujinya mereproduksi kasus gantung
// itu apa adanya, bukan tiruannya.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { compressImageBase64 } from '../geminiService';

describe('compressImageBase64 — tidak boleh menggantung', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('tetap selesai walau onload dan onerror tidak pernah menyala', async () => {
    vi.useFakeTimers();
    const asli = 'data:image/heic;base64,AAAA';

    let selesai = false;
    const p = compressImageBase64(asli, 800).then(v => { selesai = true; return v; });

    // Sebelum timeout memang belum selesai — ini persis kasus gantungnya.
    await vi.advanceTimersByTimeAsync(9_000);
    expect(selesai).toBe(false);

    // Setelah timeout WAJIB selesai, dan memulangkan gambar asli supaya
    // pemanggilnya jalan terus alih-alih mati diam.
    await vi.advanceTimersByTimeAsync(2_000);
    await expect(p).resolves.toBe(asli);
  });

  it('memulangkan base64 mentah apa adanya kalau tanpa prefiks data URL', async () => {
    vi.useFakeTimers();
    const mentah = 'AAAABBBBCCCC';
    const p = compressImageBase64(mentah, 800);
    await vi.advanceTimersByTimeAsync(11_000);
    // Fallback-nya adalah masukan ASLI, bukan versi yang sudah diberi prefiks —
    // pemanggilnya yang memutuskan bagaimana membungkusnya.
    await expect(p).resolves.toBe(mentah);
  });
});
