
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
export const getOJKRate = (priceMillions: number, region: '1'|'2'|'3', type: 'COMPREHENSIVE' | 'TLO'): number => {
  if (type === 'COMPREHENSIVE') {
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
    // TLO
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

export const EXPANSION_RATES = {
  FLOOD: 0.05,
  EARTHQUAKE: 0.10,
  SRCC: { COMPREHENSIVE: 0.05, TLO: 0.035 },
  TERRORISM: { COMPREHENSIVE: 0.05, TLO: 0.035 },
  PA_DRIVER: 0.5,
  PA_PASSENGER: 0.1
};

export const LOCATIONS = {
  1: "Sumatera & Surroundings",
  2: "DKI Jakarta, West Java, Banten",
  3: "Other Regions"
};

export const TPL_OPTIONS = [0, 10, 20, 30, 40, 50];

// --- TRAVEL INSURANCE CONSTANTS ---

// Based on PDF Page 10 (Premi Internasional) & Page 13 (Premi Domestik)
// Using 'Individu' rates for calculation simplicity
export const TRAVEL_RATES = {
  INTERNATIONAL: {
    '1-4': { platinum: 224000, gold: 208000, asia: 160000 },
    '5-6': { platinum: 304000, gold: 272000, asia: 256000 },
    '7-8': { platinum: 416000, gold: 368000, asia: 304000 },
    '9-10': { platinum: 480000, gold: 432000, asia: 416000 },
    '11-15': { platinum: 544000, gold: 512000, asia: 464000 },
    '16-20': { platinum: 672000, gold: 592000, asia: 560000 },
    '21-25': { platinum: 752000, gold: 672000, asia: 624000 },
    '26-30': { platinum: 768000, gold: 720000, asia: 672000 },
  },
  DOMESTIC: {
    '1-4': { garuda1: 85000, garuda2: 72000 },
    '5-6': { garuda1: 90000, garuda2: 79000 },
    '7-8': { garuda1: 99000, garuda2: 91000 },
    '9-10': { garuda1: 125000, garuda2: 99000 },
    '11-15': { garuda1: 130000, garuda2: 114000 },
    '16-20': { garuda1: 148000, garuda2: 119000 },
    '21-25': { garuda1: 155000, garuda2: 122000 },
    '26-30': { garuda1: 165000, garuda2: 128000 },
  }
};

// Benefits highlights from PDF Page 7 & 12
export const TRAVEL_BENEFITS = {
  PLATINUM: { death: '1.6 M', medical: '960 Juta', features: ['Visa Schengen', 'Covid-19 Cover', 'No Excess'] },
  GOLD: { death: '960 Juta', medical: '640 Juta', features: ['Worldwide', 'Baggage Delay'] },
  ASIA: { death: '240 Juta', medical: '160 Juta', features: ['Asia Only', 'Flight Delay'] },
  GARUDA1: { death: '100 Juta', medical: '75 Juta', features: ['Domestic', 'Trip Cancellation'] },
  GARUDA2: { death: '50 Juta', medical: '25 Juta', features: ['Domestic', 'Baggage Loss'] },
};

// --- PERSONAL ACCIDENT CONSTANTS ---

// Based on PDF Page 4 (Umum) and Page 5 (Siswa)
// Map Plan Codes A-J to Premium and Death Benefit
export const PA_PLANS = {
  GENERAL: [
    { code: 'A', premium: 25000, benefit: '6 Juta' },
    { code: 'B', premium: 30000, benefit: '7.5 Juta' },
    { code: 'C', premium: 40000, benefit: '10 Juta' },
    { code: 'D', premium: 40000, benefit: '12.5 Juta' },
    { code: 'E', premium: 50000, benefit: '15 Juta' },
    { code: 'F', premium: 80000, benefit: '20 Juta' },
    { code: 'G', premium: 100000, benefit: '25 Juta' },
    { code: 'H', premium: 150000, benefit: '37.5 Juta' },
    { code: 'I', premium: 200000, benefit: '50 Juta' },
  ],
  STUDENT: [
    { code: 'A', premium: 10000, benefit: '2.5 Juta' },
    { code: 'B', premium: 30000, benefit: '5 Juta' },
    { code: 'C', premium: 30000, benefit: '7.5 Juta' },
    { code: 'D', premium: 40000, benefit: '10 Juta' },
    { code: 'E', premium: 50000, benefit: '12.5 Juta' },
    { code: 'F', premium: 60000, benefit: '15 Juta' },
    { code: 'G', premium: 80000, benefit: '20 Juta' },
    { code: 'H', premium: 100000, benefit: '25 Juta' },
    { code: 'I', premium: 150000, benefit: '37.5 Juta' },
    { code: 'J', premium: 200000, benefit: '50 Juta' },
  ]
};

// --- PET INSURANCE CONSTANTS (Mocked) ---
export const PET_PLANS = [
  { name: 'Basic', price: 500000, medical: '5 Juta', death: '2 Juta', features: ['Accident Only'] },
  { name: 'Premium', price: 1200000, medical: '20 Juta', death: '5 Juta', features: ['Accident & Illness', 'Third Party Liability'] },
  { name: 'Gold', price: 2500000, medical: '50 Juta', death: '10 Juta', features: ['Full Coverage', 'Theft', 'Overseas Travel'] },
];
