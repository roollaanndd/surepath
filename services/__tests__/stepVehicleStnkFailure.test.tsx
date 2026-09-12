// Regression guard for the "STNK gagal dibaca → keluar dari apps" report.
//
// When the OCR cannot read the document at all, StepVehicle drops the user
// into manual entry. If anything in that render path throws, PortalErrorBoundary
// replaces the whole portal with a full-screen error card whose only action is
// "Kembali" — from the user's seat the app has thrown them out mid-purchase.
//
// So the assertion here is deliberately blunt: mount the component, fail the
// OCR, and require that the failure notice renders without a throw.

import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// The OCR service is the seam — it reaches the network in real life.
const extractStnkOcr = vi.fn();
vi.mock('../stnkOcr', () => ({
  extractStnkOcr: (...a: unknown[]) => extractStnkOcr(...a),
}));

// supabaseService is pulled in transitively and would build a real client.
vi.mock('../supabaseService', () => ({ supabase: {} }));

import StepVehicle from '../../components/car-wizard/StepVehicle';

/** Exactly the shape `extractStnkOcr` returns when it gives up (emptyResult). */
const totalFailure = {
  ok: false,
  status: 'ERROR' as const,
  confidence: 0,
  ownerName: null, plate: null, brand: null, model: null, variant: null,
  color: null, year: null, vin: null, engineNo: null, fuel: null,
  cylinderCc: null, chassisType: null, registrationDate: null,
  expiryDate: null, region: null, zone: null,
  validation: { plate: false, vin: false, year: false, brand: false, model: false },
  source: 'fallback-empty' as const,
};

/** The initial vehicle state from CarInsuranceWizard, verbatim. */
const initialVehicle = {
  brand: '', model: '', year: new Date().getFullYear(), isOther: false,
  price: 0, basePrice: 0, manualPrice: false, plate: '',
  vin: '', engine: '', color: '',
  region: '3', regionName: 'Region Lainnya', usage: 'PRIVATE', condition: 'NEW',
  province: '',
};

/** Mirrors how CarInsuranceWizard wires the step up. */
const Harness: React.FC = () => {
  const [vehicle, setVehicle] = useState<Record<string, unknown>>(initialVehicle);
  const [entryMode, setEntryMode] = useState<'DATABASE' | 'MANUAL'>('DATABASE');
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<'STNK' | 'KTP' | 'SURVEY' | null>(null);
  return (
    <StepVehicle
      vehicle={vehicle}
      setVehicle={setVehicle as never}
      entryMode={entryMode}
      setEntryMode={setEntryMode}
      handlePlateChange={() => {}}
      formatInputCurrency={(v: string) => v}
      loading={loading}
      setLoading={setLoading}
      loadingType={loadingType}
      setLoadingType={setLoadingType}
      setStnkResult={() => {}}
    />
  );
};

function uploadStnk() {
  // The STNK input is the file input the "Unggah"/"Scan" control opens.
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  expect(input).toBeTruthy();
  const file = new File(['x'], 'stnk.jpg', { type: 'image/jpeg' });
  fireEvent.change(input, { target: { files: [file] } });
}

describe('StepVehicle — STNK OCR gagal total', () => {
  beforeEach(() => {
    extractStnkOcr.mockReset();
    extractStnkOcr.mockResolvedValue(totalFailure);
  });

  it('menampilkan pemberitahuan, bukan melempar error (yang memicu error boundary)', async () => {
    render(<Harness />);
    uploadStnk();
    await waitFor(() => {
      expect(screen.getByText(/STNK Tidak Terbaca/i)).toBeTruthy();
    });
  });

  it('tetap menyediakan isian manual setelah kegagalan', async () => {
    render(<Harness />);
    uploadStnk();
    await waitFor(() => {
      expect(screen.getByText(/Ketik Manual/i)).toBeTruthy();
    });
  });
});
