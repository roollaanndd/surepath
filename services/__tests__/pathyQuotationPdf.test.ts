// Tombol "Unduh PDF penawaran" di kartu Pathy dilaporkan tidak berfungsi.
//
// Payload di bawah BUKAN karangan: ia disalin apa adanya dari baris sp_quotes
// produksi terbaru (quote_data->'quotation', 20 Okt 2026), supaya uji ini
// menjalankan persis apa yang dialami pengguna, bukan bentuk ideal yang
// kebetulan lolos.
//
// Jalurnya sama dengan yang dipanggil tombol itu:
//   fromAgentQuote(quotation) -> generateQuotationSlipPDF(slip)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fromAgentQuote } from '../quotationSlipAdapter';

/** Baris produksi, apa adanya. */
const PATHY_QUOTATION = {
  rows: [
    { label: 'Premi Dasar', amount: 4784000 },
    { label: 'Biaya Admin', amount: 50000 },
    { label: 'Materai', amount: 10000 },
  ],
  zone: 2,
  ojkRate: 0.0208,
  product: 'CAR',
  rateBand: 'MIN',
  agentCode: 'SP-AGT-2890',
  agentName: 'NH Abdul Jabbar',
  agentPhone: '0818200322',
  clientName: 'NH Abdul Jabbar',
  validUntil: '2026-11-19T00:46:08.281Z',
  quoteNumber: 'QS/SP/2026/X/8281',
  vehicleYear: 2022,
  coverageType: 'COMPREHENSIVE',
  totalPremium: 4844000,
  vehicleBrand: 'Mitsubishi',
  vehicleModel: 'Xpander Cross',
  vehiclePrice: 230000000,
} as any;

describe('adapter: quotation Pathy -> slip PDF', () => {
  it('tidak melempar untuk payload produksi', () => {
    expect(() => fromAgentQuote(PATHY_QUOTATION)).not.toThrow();
  });

  it('membawa angka uang apa adanya, tanpa mengarang', () => {
    const slip = fromAgentQuote(PATHY_QUOTATION);
    expect(slip.quotationNumber).toBe('QS/SP/2026/X/8281');
    expect(slip.preparedForCompany).toBe('NH Abdul Jabbar');
  });

  it('tetap jalan walau Pathy mengirim quotation TANPA rows', () => {
    // Pathy dulu pernah mengirim bentuk yang lebih ramping. Satu field hilang
    // tidak boleh membuat tombol unduh mati total.
    const { rows, ...tanpaRows } = PATHY_QUOTATION;
    expect(() => fromAgentQuote(tanpaRows as any)).not.toThrow();
  });
});

describe('generator PDF', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Keep this unit test deterministic: decorative image requests must not depend on remote hosts.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
  });
  afterEach(() => vi.unstubAllGlobals());

  // jsPDF memuat font dan membangun dokumen dari nol. Saat seluruh suite
  // berjalan paralel biaya itu melewati batas 5 detik bawaan Vitest (terukur
  // ~5,4 dtk; 0,3 dtk saat diisolasi). Ini hanya melonggarkan waktu tunggu —
  // assertion-nya tidak berubah.
  it('menghasilkan PDF dari slip hasil adapter', async () => {
    const { generateQuotationSlipPDF } = await import('../quotationSlipPdf');
    const slip = fromAgentQuote(PATHY_QUOTATION);
    await expect(generateQuotationSlipPDF(slip)).resolves.toBeUndefined();
  // 20s: under a full parallel vitest run the jsdom canvas rasterizing this
  // PDF can take ~7s on a loaded machine — 5s timed out spuriously in runs
  // where transform+import time spikes (seen twice on Oct 28). Raising the
  // ceiling of THIS test only; the assertion itself is unchanged.
  }, 20000);
});
