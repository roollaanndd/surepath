import { CarModelData } from './types';

// Mocking a subset of the massive OCR data for demonstration
export const CAR_DATABASE: CarModelData[] = [
  {
    brand: 'TOYOTA',
    code: 'TOYAVA032',
    modelName: 'ALL NEW AVANZA 1.5 G M/T',
    yearPrices: { 2025: 262.0, 2024: 244.1, 2023: 229.2, 2022: 218.9, 2021: 215.2 }
  },
  {
    brand: 'TOYOTA',
    code: 'TOYFOR055',
    modelName: 'ALL NEW FORTUNER 4X2 2.7 SRZ A/T GR SPORT LUXURY',
    yearPrices: { 2025: 612.2, 2024: 579.8, 2023: 544.4, 2022: 525.8, 2021: 520.6 }
  },
  {
    brand: 'TOYOTA',
    code: 'TOYAGY017',
    modelName: 'NEW AGYA 1.2 GR SPORT A/T',
    yearPrices: { 2025: 253.5, 2024: 228.2, 2023: 186.0, 2022: 178.6, 2021: 171.4 }
  },
  {
    brand: 'HONDA',
    code: 'HONHRV019',
    modelName: 'ALL NEW HRV 1.5 S CVT',
    yearPrices: { 2025: 396.8, 2024: 367.7, 2023: 339.0, 2022: 308.1 }
  },
  {
    brand: 'HONDA',
    code: 'HONBRI018',
    modelName: 'ALL NEW BRIO RS M/T',
    yearPrices: { 2025: 249.0, 2024: 206.8, 2023: 190.2, 2022: 185.3, 2021: 152.8 }
  },
  {
    brand: 'MITSUBISHI',
    code: 'MITXPA025',
    modelName: 'NEW XPANDER ULTIMATE M/T',
    yearPrices: { 2025: 307.8, 2024: 292.6 }
  },
  {
    brand: 'MITSUBISHI',
    code: 'MITPAJ033',
    modelName: 'NEW PAJERO SPORT DAKKAR ULTIMATE 4X2 A/T',
    yearPrices: { 2025: 685.0, 2024: 618.2, 2023: 579.9, 2022: 560.1, 2021: 496.6 }
  },
  {
    brand: 'SUZUKI',
    code: 'SUZERG035',
    modelName: 'ALL NEW ERTIGA SPORT AT',
    yearPrices: { 2025: 287.4, 2024: 261.8, 2023: 235.6, 2022: 227.5, 2021: 221.3 }
  },
  {
    brand: 'BMW',
    code: 'BMW320028',
    modelName: 'NEW 330i M SPORT',
    yearPrices: { 2025: 1255.0, 2024: 1142.1, 2023: 1069.6, 2022: 928.1, 2021: 808.9 }
  }
];

// OJK Rate Logic (BATAS BAWAH / LOWER BOUND ONLY)
// Category based on Price (in Millions IDR)
// Cat 1: 0-125, Cat 2: 125-200, Cat 3: 200-400, Cat 4: 400-800, Cat 5: >800
export const getOJKRate = (priceMillions: number, region: '1'|'2'|'3', type: 'COMPREHENSIVE' | 'TLO'): number => {
  if (type === 'COMPREHENSIVE') {
    // Table IV.A - Batas Bawah
    if (region === '1') { // Sumatra
      if (priceMillions <= 125) return 3.82;
      if (priceMillions <= 200) return 2.67;
      if (priceMillions <= 400) return 2.18;
      if (priceMillions <= 800) return 1.20;
      return 1.05;
    } else if (region === '2') { // DKI, Jabar, Banten
      if (priceMillions <= 125) return 3.26;
      if (priceMillions <= 200) return 2.47;
      if (priceMillions <= 400) return 2.08;
      if (priceMillions <= 800) return 1.20;
      return 1.05;
    } else { // Region 3
      if (priceMillions <= 125) return 2.53;
      if (priceMillions <= 200) return 2.69;
      if (priceMillions <= 400) return 1.79;
      if (priceMillions <= 800) return 1.14;
      return 1.05;
    }
  } else {
    // TLO - Table IV.A Batas Bawah
    if (region === '1') {
      if (priceMillions <= 125) return 0.47;
      if (priceMillions <= 200) return 0.63;
      if (priceMillions <= 400) return 0.41;
      if (priceMillions <= 800) return 0.25;
      return 0.20;
    } else if (region === '2') {
      if (priceMillions <= 125) return 0.65;
      if (priceMillions <= 200) return 0.44;
      if (priceMillions <= 400) return 0.38;
      if (priceMillions <= 800) return 0.25;
      return 0.20;
    } else {
      if (priceMillions <= 125) return 0.51;
      if (priceMillions <= 200) return 0.44;
      if (priceMillions <= 400) return 0.29;
      if (priceMillions <= 800) return 0.23;
      return 0.20;
    }
  }
};

// Additional Coverage Rates (Table IV.B)
export const EXPANSION_RATES = {
  FLOOD: 0.05, // Placeholder standard rate (usually varies by zone)
  EARTHQUAKE: 0.10,
  SRCC: { COMPREHENSIVE: 0.05, TLO: 0.035 },
  TERRORISM: { COMPREHENSIVE: 0.05, TLO: 0.035 },
  PA_DRIVER: 0.5, // % of SI
  PA_PASSENGER: 0.1 // % of SI
};

export const LOCATIONS = {
  1: "Sumatera & Surroundings",
  2: "DKI Jakarta, West Java, Banten",
  3: "Other Regions"
};

export const TPL_OPTIONS = [0, 10, 20, 30, 40, 50]; // Millions