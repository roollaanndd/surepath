// Analisa foto kendaraan oleh Pathy + perbaikan penyebab "tidak berfungsi".
//
// Uji pertama di bawah adalah inti dari laporan pemilik 21 Okt 2026:
// compressImageBase64() dipanggil SEBELUM permintaan AI dikirim, dan dulu
// promise-nya hanya diselesaikan di onload/onerror. Kalau dua-duanya tidak
// pernah menyala, `await` tidak pernah kembali: spinner menyala terus, NOL
// permintaan keluar, dan tidak ada error sama sekali. Bukti produksinya:
// `ai-proxy` nol invokasi dalam 24 jam padahal fiturnya dilaporkan tidak jalan.
//
// jsdom tidak memuat data URL, jadi di sini onload/onerror memang tidak pernah
// menyala — lingkungan ujinya persis mereproduksi kasus gantung itu.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const analyzeVehicleSurvey = vi.fn();
const recordPathyTurn = vi.fn();

vi.mock('../geminiService', () => ({
  analyzeVehicleSurvey: (...a: unknown[]) => analyzeVehicleSurvey(...a),
}));
vi.mock('../pathyLog', () => ({
  recordPathyTurn: (...a: unknown[]) => recordPathyTurn(...a),
}));

beforeEach(() => { analyzeVehicleSurvey.mockReset(); recordPathyTurn.mockReset(); });

describe('pathyAnalyzeVehiclePhotos', () => {
  const foto = [{ id: 'front', data: 'data:image/jpeg;base64,AAA' }];
  const kendaraan = { brand: 'Toyota', model: 'Avanza', color: 'Hitam', plate: 'B 1234 XY' };

  it('mencatat hasil sukses ke rekaman Pathy, dengan angka yang bisa diaudit', async () => {
    analyzeVehicleSurvey.mockResolvedValue({
      success: true, score: 88, auditVerdict: 'CLEAN',
      identityMatchScore: 95, fraudRiskScore: 10, summary: 'Kondisi baik.',
    });
    const { pathyAnalyzeVehiclePhotos } = await import('../pathyVision');
    const hasil = await pathyAnalyzeVehiclePhotos(foto, kendaraan);

    expect(hasil.success).toBe(true);
    const turn = recordPathyTurn.mock.calls[0][0];
    expect(turn.question).toContain('Toyota Avanza');
    expect(turn.answer).toContain('CLEAN');
    expect(turn.answer).toContain('88');
    expect(turn.degraded).toBe(false);
    expect(turn.toolsUsed).toEqual(['vehicle_photo_survey']);
  });

  it('mencatat kegagalan sebagai degraded DAN menyimpan sebabnya', async () => {
    analyzeVehicleSurvey.mockResolvedValue({ success: false, error: 'Analisa Pathy gagal: 401 Unauthorized' });
    const { pathyAnalyzeVehiclePhotos } = await import('../pathyVision');
    const hasil = await pathyAnalyzeVehiclePhotos(foto, kendaraan);

    expect(hasil.success).toBe(false);
    const turn = recordPathyTurn.mock.calls[0][0];
    expect(turn.degraded).toBe(true);
    // Sebab yang bisa ditindaklanjuti, bukan "AI tidak tersedia".
    expect(turn.answer).toContain('401 Unauthorized');
  });

  it('tetap memulangkan hasil analisa walau perekaman gagal', async () => {
    analyzeVehicleSurvey.mockResolvedValue({ success: true, score: 70, auditVerdict: 'REVIEW_REQUIRED' });
    recordPathyTurn.mockImplementation(() => { throw new Error('rekaman mati'); });
    const { pathyAnalyzeVehiclePhotos } = await import('../pathyVision');
    // Rekaman tidak boleh pernah menggagalkan analisa yang sudah berhasil.
    await expect(pathyAnalyzeVehiclePhotos(foto, kendaraan)).resolves.toMatchObject({ success: true, score: 70 });
  });

  it('jalan tanpa konteks STNK', async () => {
    analyzeVehicleSurvey.mockResolvedValue({ success: true, score: 50, auditVerdict: 'REVIEW_REQUIRED' });
    const { pathyAnalyzeVehiclePhotos } = await import('../pathyVision');
    await pathyAnalyzeVehiclePhotos(foto);
    expect(recordPathyTurn.mock.calls[0][0].question).toContain('tanpa konteks STNK');
  });
});
