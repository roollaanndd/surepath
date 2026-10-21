// pathyVision.ts — analisa foto kendaraan sebagai pekerjaan Pathy.
//
// Permintaan pemilik (21 Okt 2026): analisa foto di menu pembelian asuransi
// kendaraan diarahkan supaya dilakukan oleh Pathy.
//
// BATASAN YANG PERLU DIKETAHUI, dan ini bukan pilihan gaya:
// `pathy-agent` HARI INI TIDAK BISA MELIHAT GAMBAR. Parameter `documents`-nya
// hanya menerima FIELD TEKS — `sanitizeDocuments()` di fungsi itu membuang
// objek/array dan memotong string. Jadi mengarahkan foto ke pathy-agent butuh
// kemampuan vision baru di sisi server, dan itu berarti men-deploy pathy-agent
// — yang per 21 Okt berarti menaruh fungsi kedua di jalur darurat
// (lihat docs/INCIDENT_2026-10-21_data-gateway.md).
//
// Jadi yang dilakukan modul ini:
//   - panggilan vision tetap lewat `ai-proxy`, satu-satunya jalur vision yang
//     ADA dan terbukti sehat (kunci OpenRouter diuji 200, model diizinkan)
//   - hasilnya menjadi bagian dari REKAMAN PERCAKAPAN PATHY (sp_pathy_messages),
//     sehingga muncul di CMS bersama percakapan Pathy lainnya
//   - atribusi ke Pathy dipusatkan di sini, bukan disebar sebagai teks di UI
//
// Dengan begitu analisa itu benar-benar tercatat sebagai pekerjaan Pathy di
// produk, bukan sekadar label, dan ketika vision pindah ke pathy-agent nanti
// hanya isi fungsi ini yang berubah — pemanggilnya tidak.
import { analyzeVehicleSurvey, type SurveyAnalysisResult } from './geminiService';
import { recordPathyTurn } from './pathyLog';

export interface PathyVehicleContext {
  brand: string;
  model: string;
  color: string;
  plate: string;
}

/** Ringkas hasil analisa jadi satu paragraf untuk rekaman Pathy. */
function ringkasUntukRekaman(r: SurveyAnalysisResult): string {
  if (!r.success) return `Analisa foto GAGAL. ${r.error ?? 'Sebab tidak diketahui.'}`;
  const bagian = [
    `Verdict: ${r.auditVerdict ?? '-'}`,
    `Skor: ${r.score ?? '-'}`,
    r.identityMatchScore !== undefined ? `Kecocokan identitas: ${r.identityMatchScore}` : null,
    r.fraudRiskScore !== undefined ? `Risiko fraud: ${r.fraudRiskScore}` : null,
    r.summary ? `Kesimpulan: ${r.summary}` : null,
  ].filter(Boolean);
  return bagian.join(' · ');
}

/**
 * Analisa survei foto kendaraan, dicatat sebagai turn Pathy.
 *
 * Perekamannya `void` dengan sengaja: rekaman tidak boleh pernah menunda atau
 * menggagalkan analisa yang sudah berhasil. `recordPathyTurn` sendiri tidak
 * melempar.
 */
export async function pathyAnalyzeVehiclePhotos(
  images: { id: string; data: string }[],
  vehicle?: PathyVehicleContext,
): Promise<SurveyAnalysisResult> {
  const hasil = await analyzeVehicleSurvey(images, vehicle);

  const konteks = vehicle
    ? `${vehicle.brand} ${vehicle.model} ${vehicle.color} (${vehicle.plate})`
    : 'kendaraan tanpa konteks STNK';

  // `void` saja TIDAK cukup: ia tetap mengevaluasi ekspresinya, jadi throw
  // SINKRON dari perekam akan tetap merambat dan membunuh analisa yang sudah
  // berhasil. Ditemukan oleh ujinya sendiri, bukan diasumsikan aman.
  try {
    const p = recordPathyTurn({
      question: `[Analisa foto kendaraan] ${images.length} foto · ${konteks}`,
      answer: ringkasUntukRekaman(hasil),
      toolsUsed: ['vehicle_photo_survey'],
      degraded: !hasil.success,
    });
    if (p && typeof (p as Promise<void>).catch === 'function') {
      (p as Promise<void>).catch(() => { /* rekaman gagal tidak mengubah hasil */ });
    }
  } catch {
    /* Sengaja ditelan: rekaman adalah pelengkap, analisa adalah produknya. */
  }

  return hasil;
}
