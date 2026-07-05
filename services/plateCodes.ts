// Indonesian vehicle plate prefix → OJK province mapping.
//
// Source: agent VehicleUnderwritingWizard.tsx (PR #47 sync). Lifted into a
// shared module so the customer CarInsuranceWizard uses the same province
// resolution path as the agent app — which means the CMS-backed
// PROVINCE_ZONES override (services/ojkRates.ts → applyOjkRateSet) takes
// effect for both portals consistently.
//
// License: same as repo. No external data; compiled from public OJK + Polri
// plate-code references.

export interface PlateCodeEntry {
  code: string;
  region: string;
  province: string;
}

export const PLATE_CODES: PlateCodeEntry[] = [
  // Zone 2 — DKI Jakarta, Jawa Barat, Banten
  { code: 'B',  region: 'DKI Jakarta / Bekasi / Depok / Tangerang', province: 'DKI Jakarta' },
  { code: 'D',  region: 'Bandung & sekitarnya', province: 'Jawa Barat' },
  { code: 'E',  region: 'Cirebon', province: 'Jawa Barat' },
  { code: 'F',  region: 'Bogor / Sukabumi / Cianjur', province: 'Jawa Barat' },
  { code: 'T',  region: 'Purwakarta / Karawang / Subang', province: 'Jawa Barat' },
  { code: 'Z',  region: 'Tasikmalaya / Garut / Ciamis', province: 'Jawa Barat' },
  { code: 'A',  region: 'Banten / Serang / Tangerang', province: 'Banten' },
  // Zone 3 — Jawa Tengah & DIY
  { code: 'H',  region: 'Semarang & sekitarnya', province: 'Jawa Tengah' },
  { code: 'G',  region: 'Pekalongan / Tegal', province: 'Jawa Tengah' },
  { code: 'K',  region: 'Pati / Kudus / Blora / Jepara', province: 'Jawa Tengah' },
  { code: 'R',  region: 'Banyumas / Cilacap / Purbalingga', province: 'Jawa Tengah' },
  { code: 'AA', region: 'Magelang / Temanggung / Kedu', province: 'Jawa Tengah' },
  { code: 'AD', region: 'Surakarta / Solo', province: 'Jawa Tengah' },
  { code: 'AB', region: 'DI Yogyakarta', province: 'DI Yogyakarta' },
  // Zone 3 — Jawa Timur
  { code: 'AE', region: 'Madiun', province: 'Jawa Timur' },
  { code: 'AG', region: 'Kediri / Blitar / Tulungagung', province: 'Jawa Timur' },
  { code: 'L',  region: 'Surabaya', province: 'Jawa Timur' },
  { code: 'M',  region: 'Madura', province: 'Jawa Timur' },
  { code: 'N',  region: 'Malang & sekitarnya', province: 'Jawa Timur' },
  { code: 'P',  region: 'Besuki / Banyuwangi', province: 'Jawa Timur' },
  { code: 'S',  region: 'Bojonegoro / Tuban / Lamongan', province: 'Jawa Timur' },
  { code: 'W',  region: 'Sidoarjo / Mojokerto / Gresik', province: 'Jawa Timur' },
  // Zone 3 — Bali & Nusa Tenggara
  { code: 'DK', region: 'Bali', province: 'Bali' },
  { code: 'DR', region: 'Lombok / NTB', province: 'Nusa Tenggara Barat' },
  { code: 'EA', region: 'Sumbawa', province: 'Nusa Tenggara Barat' },
  { code: 'DH', region: 'Kupang / NTT', province: 'Nusa Tenggara Timur' },
  { code: 'EB', region: 'Flores / Ende', province: 'Nusa Tenggara Timur' },
  { code: 'ED', region: 'Sumba', province: 'Nusa Tenggara Timur' },
  // Zone 1 — Sumatera
  { code: 'BL', region: 'Aceh', province: 'Aceh' },
  { code: 'BK', region: 'Medan & Sumatera Utara', province: 'Sumatera Utara' },
  { code: 'BB', region: 'Tapanuli / Sumatera Utara', province: 'Sumatera Utara' },
  { code: 'BA', region: 'Padang / Sumatera Barat', province: 'Sumatera Barat' },
  { code: 'BM', region: 'Pekanbaru / Riau', province: 'Riau' },
  { code: 'BP', region: 'Batam / Kepulauan Riau', province: 'Kepulauan Riau' },
  { code: 'BN', region: 'Bangka Belitung', province: 'Kepulauan Bangka Belitung' },
  { code: 'BH', region: 'Jambi', province: 'Jambi' },
  { code: 'BD', region: 'Bengkulu', province: 'Bengkulu' },
  { code: 'BE', region: 'Lampung', province: 'Lampung' },
  { code: 'BG', region: 'Palembang / Sumatera Selatan', province: 'Sumatera Selatan' },
  // Zone 3 — Kalimantan
  { code: 'DA', region: 'Banjarmasin / Kalimantan Selatan', province: 'Kalimantan Selatan' },
  { code: 'KB', region: 'Pontianak / Kalimantan Barat', province: 'Kalimantan Barat' },
  { code: 'KH', region: 'Palangkaraya / Kalimantan Tengah', province: 'Kalimantan Tengah' },
  { code: 'KT', region: 'Samarinda / Kalimantan Timur', province: 'Kalimantan Timur' },
  { code: 'KU', region: 'Tarakan / Kalimantan Utara', province: 'Kalimantan Utara' },
  // Zone 3 — Sulawesi
  { code: 'DB', region: 'Manado / Sulawesi Utara', province: 'Sulawesi Utara' },
  { code: 'DM', region: 'Gorontalo', province: 'Gorontalo' },
  { code: 'DN', region: 'Palu / Sulawesi Tengah', province: 'Sulawesi Tengah' },
  { code: 'DC', region: 'Mamuju / Sulawesi Barat', province: 'Sulawesi Barat' },
  { code: 'DD', region: 'Makassar / Sulawesi Selatan', province: 'Sulawesi Selatan' },
  { code: 'DW', region: 'Gowa / Takalar (Sulsel)', province: 'Sulawesi Selatan' },
  { code: 'DP', region: 'Kendari / Sulawesi Tenggara', province: 'Sulawesi Tenggara' },
  { code: 'DT', region: 'Bau-Bau / Sulawesi Tenggara', province: 'Sulawesi Tenggara' },
  // Zone 3 — Maluku & Papua
  { code: 'DE', region: 'Ambon / Maluku', province: 'Maluku' },
  { code: 'DG', region: 'Ternate / Maluku Utara', province: 'Maluku Utara' },
  { code: 'DS', region: 'Jayapura / Papua', province: 'Papua' },
  { code: 'PB', region: 'Manokwari / Papua Barat', province: 'Papua Barat' },
];

// Parse the leading 1-2 letter block off an Indonesian plate string.
// Examples: "B 1234 ABC" → "B", "BK 7890 XY" → "BK", "AB 1234 AB" → "AB".
export function parsePlatePrefix(plate: string): string | null {
  const match = (plate ?? '').trim().toUpperCase().match(/^([A-Z]{1,2})\b/);
  return match ? match[1] : null;
}

// Look up a plate string and return the matching entry, or null if unknown.
export function lookupPlate(plate: string): PlateCodeEntry | null {
  const prefix = parsePlatePrefix(plate);
  if (!prefix) return null;
  return PLATE_CODES.find(p => p.code === prefix) ?? null;
}
