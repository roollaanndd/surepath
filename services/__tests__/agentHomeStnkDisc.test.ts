// Guard for the v2.7.50 agent pass:
//   1. Beranda icons — 'clients' and 'profile' get their own bespoke brand
//      artwork instead of sharing the generic 'people' illustration.
//   2. The agent quote builder's STNK entry uses the SAME capture card, OCR
//      notice and OCR service as the customer wizard — the stub AI pipeline
//      (extractSTNKAndRecommend, which only shipped 100 chars of the image
//      data-URL and guessed prices) is gone.
//   3. The recommended vehicle price RANGE (±5%, same formula as the customer
//      wizard) is visible in the agent flow.
//   4. The discount lives in step 4 (summary) — input, amount and the
//      before/after breakdown — not at the top of step 2.
//   5. Purchase handoff — STNK/nasabah/kendaraan data flows into the
//      underwriting wizard (initialQuote) so nothing is re-entered; the
//      wizard's own STNK card steps aside when data already arrived.
//   6. Photos that cannot be analyzed no longer dead-end the agent: the order
//      can be submitted into the manual admin-approval queue, is marked for
//      the admin, payment stays gated, and a notification says why.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const brand = readFileSync(join(ROOT, 'components/shared/SurePathBrandIcon.tsx'), 'utf8');
const quote = readFileSync(join(ROOT, 'components/agent/AgentQuoteBuilder.tsx'), 'utf8');
const wizard = readFileSync(join(ROOT, 'components/agent/VehicleUnderwritingWizard.tsx'), 'utf8');
const gateway = readFileSync(join(ROOT, 'services/aiGateway.ts'), 'utf8');

describe('beranda brand icons', () => {
  it('has bespoke artwork for clients and profile', () => {
    expect(brand).toContain('SpClientsIcon');
    expect(brand).toContain('SpProfileIcon');
    expect(brand).toMatch(/clients:\s*SpClientsIcon/);
    expect(brand).toMatch(/profile:\s*SpProfileIcon/);
  });
});

describe('agent STNK entry mirrors the customer wizard', () => {
  it('uses the shared capture card, OCR notice and real OCR service', () => {
    expect(quote).toContain('StnkCaptureCard');
    expect(quote).toContain('StnkOcrNotice');
    expect(quote).toMatch(/extractStnkOcr/);
  });

  it('the stub AI extract pipeline is gone everywhere', () => {
    expect(quote).not.toContain('STNKAutoExtract');
    expect(gateway).not.toContain('extractSTNKAndRecommend');
    expect(gateway).not.toContain('STNKExtractionResult');
    expect(existsSync(join(ROOT, 'components/shared/STNKAutoExtract.tsx'))).toBe(false);
  });

  it('auto-fills the quote form from the OCR result', () => {
    expect(quote).toMatch(/setCarInputs/);
  });
});

describe('recommended price range is visible', () => {
  it('shows the ±5% market estimate like the customer wizard', () => {
    expect(quote).toMatch(/0\.95/);
    expect(quote).toMatch(/1\.05/);
    expect(quote).toMatch(/Rentang harga rekomendasi/);
  });
});

describe('discount lives in step 4', () => {
  it('the discount input renders in the summary steps, not in inputs', () => {
    const inputsIdx = quote.indexOf("step === 'inputs' && (");
    const quoteSummaryIdx = quote.indexOf("step === 'quote_summary' && (product === 'CAR'");
    const summaryIdx = quote.indexOf("step === 'summary' && product && (");
    expect(inputsIdx).toBeGreaterThan(-1);
    expect(quoteSummaryIdx).toBeGreaterThan(-1);
    expect(summaryIdx).toBeGreaterThan(-1);
    // Step 2 (inputs) tidak lagi punya input diskon.
    const inputsBlock = quote.slice(inputsIdx, quoteSummaryIdx);
    expect(inputsBlock).not.toContain('agent-quote-discount');
    // Kartu penawaran kendaraan (quote_summary) dan ringkasan (summary)
    // keduanya menampung input + perhitungan diskon.
    expect(quote.slice(quoteSummaryIdx, summaryIdx)).toContain('agent-quote-discount-quote');
    expect(quote.slice(summaryIdx)).toContain('agent-quote-discount');
  });

  it('the summary shows the base → discount → final breakdown', () => {
    expect(quote).toMatch(/Premi dasar|Base premium/);
    expect(quote).toMatch(/discountAmount/);
  });
});

describe('purchase handoff — no re-entering data', () => {
  it('carries the STNK scan result into the underwriting wizard', () => {
    expect(quote).toMatch(/plate:\s*stnkOcrResult\?\.plate/);
    expect(quote).toMatch(/chassis:\s*stnkOcrResult\?\.vin/);
    expect(quote).toMatch(/engine:\s*stnkOcrResult\?\.engineNo/);
    expect(quote).toMatch(/color:\s*stnkOcrResult\?\.color/);
  });

  it('the wizard prefills vehicle details and steps its STNK card aside', () => {
    expect(wizard).toMatch(/plate: initialQuote\?\.plate/);
    expect(wizard).toMatch(/chassis: initialQuote\?\.chassis/);
    expect(wizard).toMatch(/engine: initialQuote\?\.engine/);
    expect(wizard).toMatch(/color: initialQuote\?\.color/);
    expect(wizard).toMatch(/stnkPrefilled/);
    expect(wizard).toMatch(/sudah terisi dari Penawaran/);
  });
});

describe('photo analysis failure → manual admin approval', () => {
  it('lets the agent proceed when AI cannot analyze the photos', () => {
    expect(wizard).toMatch(/const aiUnavailable = aiResult === null && !aiScoring && photoCount >= 1/);
    expect(wizard).toMatch(/const needsManualReview = /);
    expect(wizard).toMatch(/aiVerdict !== 'REJECTED' && \(aiResult !== null \|\| aiUnavailable\)/);
  });

  it('marks the order and notifies the agent about manual approval', () => {
    expect(wizard).toContain('PHOTO_ANALYSIS_UNAVAILABLE');
    expect(wizard).toMatch(/menunggu persetujuan manual admin/);
  });

  it('keeps payment gated until an admin approves', () => {
    // Layar sukses membuka pembayaran hanya bila TIDAK perlu review manual.
    expect(wizard).toMatch(/\{needsManualReview \? \(/);
  });
});
