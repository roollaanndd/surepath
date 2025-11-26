
import { CarModelData, Provider } from './types';
import { Shield, Zap, Star } from 'lucide-react';

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

export const AUTHORIZED_WORKSHOP_RATE = 0.2; // 0.2%
export const STAMP_DUTY = 10000;

export const INSURANCE_PROVIDERS: Provider[] = [
  {
    id: 'zurich',
    name: 'Zurich',
    logo: Shield,
    adminFee: 55000,
    rating: 4.9,
    features: ['Authorized Workshops', '24/7 Towing', 'Free Pickup']
  },
  {
    id: 'tugu',
    name: 'Tugu Insurance',
    logo: Zap,
    adminFee: 50000,
    rating: 4.7,
    features: ['Mobile Claim App', 'Emergency Roadside', 'Replacement Car']
  },
  {
    id: 'intra',
    name: 'Intra Asia',
    logo: Star,
    adminFee: 25000,
    rating: 4.5,
    features: ['Competitive Rates', 'Fast Approval', 'National Network']
  }
];

export const PROMO_CODES = {
  'SUREPATH25': 0.25,
  'WELCOME10': 0.10,
  'AI5': 0.05
};

export const LOCATIONS = {
  1: "Sumatera & Surroundings",
  2: "DKI Jakarta, West Java, Banten",
  3: "Other Regions"
};

export const TPL_OPTIONS = [0, 10, 20, 30, 40, 50];

// --- TRAVEL INSURANCE CONSTANTS (FROM PDF) ---

export const TRAVEL_PRICING = {
  INTERNATIONAL: {
    INDIVIDUAL: [
      { maxDays: 4, rates: { PLATINUM: 224000, GOLD: 208000, ASIA_EXTRA: 160000 } },
      { maxDays: 6, rates: { PLATINUM: 304000, GOLD: 272000, ASIA_EXTRA: 256000 } },
      { maxDays: 8, rates: { PLATINUM: 416000, GOLD: 368000, ASIA_EXTRA: 304000 } },
      { maxDays: 10, rates: { PLATINUM: 480000, GOLD: 432000, ASIA_EXTRA: 416000 } },
      { maxDays: 15, rates: { PLATINUM: 544000, GOLD: 512000, ASIA_EXTRA: 464000 } },
      { maxDays: 20, rates: { PLATINUM: 672000, GOLD: 592000, ASIA_EXTRA: 560000 } },
      { maxDays: 25, rates: { PLATINUM: 752000, GOLD: 672000, ASIA_EXTRA: 624000 } },
      { maxDays: 30, rates: { PLATINUM: 768000, GOLD: 720000, ASIA_EXTRA: 672000 } },
      { maxDays: 365, rates: { PLATINUM: 1584000, GOLD: 1392000, ASIA_EXTRA: 0 } }, // Annual
    ],
    FAMILY: [
      { maxDays: 4, rates: { PLATINUM: 320000, GOLD: 272000, ASIA_EXTRA: 256000 } },
      { maxDays: 6, rates: { PLATINUM: 448000, GOLD: 384000, ASIA_EXTRA: 352000 } },
      { maxDays: 8, rates: { PLATINUM: 592000, GOLD: 528000, ASIA_EXTRA: 432000 } },
      { maxDays: 10, rates: { PLATINUM: 720000, GOLD: 656000, ASIA_EXTRA: 608000 } },
      { maxDays: 15, rates: { PLATINUM: 848000, GOLD: 800000, ASIA_EXTRA: 720000 } },
      { maxDays: 20, rates: { PLATINUM: 1008000, GOLD: 880000, ASIA_EXTRA: 832000 } },
      { maxDays: 25, rates: { PLATINUM: 1104000, GOLD: 1040000, ASIA_EXTRA: 992000 } },
      { maxDays: 30, rates: { PLATINUM: 1184000, GOLD: 1072000, ASIA_EXTRA: 1040000 } },
      { maxDays: 365, rates: { PLATINUM: 2944000, GOLD: 2512000, ASIA_EXTRA: 0 } }, // Annual
    ]
  },
  DOMESTIC: {
    INDIVIDUAL: [
      { maxDays: 4, rates: { GARUDA_1: 85000, GARUDA_2: 72000 } },
      { maxDays: 6, rates: { GARUDA_1: 90000, GARUDA_2: 79000 } },
      { maxDays: 8, rates: { GARUDA_1: 99000, GARUDA_2: 91000 } },
      { maxDays: 10, rates: { GARUDA_1: 125000, GARUDA_2: 99000 } },
      { maxDays: 15, rates: { GARUDA_1: 130000, GARUDA_2: 114000 } },
      { maxDays: 20, rates: { GARUDA_1: 148000, GARUDA_2: 119000 } },
      { maxDays: 25, rates: { GARUDA_1: 155000, GARUDA_2: 122000 } },
      { maxDays: 30, rates: { GARUDA_1: 165000, GARUDA_2: 128000 } },
    ]
  },
  INBOUND: {
    INDIVIDUAL: [
      { maxDays: 4, rates: { GARUDA_1: 70000, GARUDA_2: 59000 } },
      { maxDays: 6, rates: { GARUDA_1: 75000, GARUDA_2: 65000 } },
      { maxDays: 8, rates: { GARUDA_1: 83000, GARUDA_2: 75000 } },
      { maxDays: 10, rates: { GARUDA_1: 105000, GARUDA_2: 82000 } },
      { maxDays: 15, rates: { GARUDA_1: 109000, GARUDA_2: 95000 } },
      { maxDays: 20, rates: { GARUDA_1: 124000, GARUDA_2: 99000 } },
      { maxDays: 25, rates: { GARUDA_1: 130000, GARUDA_2: 102000 } },
      { maxDays: 31, rates: { GARUDA_1: 139000, GARUDA_2: 107000 } },
    ]
  }
};

export const TRAVEL_BENEFITS = {
  PLATINUM: { 
    death: '1.6 Miliar', 
    medical: '960 Juta', 
    features: ['Visa Schengen Approved', 'Covid-19 Cover', 'Worldwide Coverage', 'Trip Cancellation up to 96M', 'Baggage Loss 32M'] 
  },
  GOLD: { 
    death: '960 Juta', 
    medical: '640 Juta', 
    features: ['Worldwide Coverage', 'Trip Cancellation up to 24M', 'Baggage Loss 24M', 'Flight Delay 4M'] 
  },
  ASIA_EXTRA: { 
    death: '240 Juta', 
    medical: '160 Juta', 
    features: ['Asia Only Coverage', 'Trip Cancellation up to 16M', 'Baggage Loss 16M', 'Flight Delay 1.6M'] 
  },
  GARUDA_1: { 
    death: '100 Juta', 
    medical: '75 Juta', 
    features: ['Domestic Coverage', 'Trip Cancellation 5M', 'Baggage Loss 2.5M', 'Flight Delay 500k'] 
  },
  GARUDA_2: { 
    death: '50 Juta', 
    medical: '25 Juta', 
    features: ['Domestic Coverage', 'Trip Cancellation 2.5M', 'Baggage Loss 2M', 'Flight Delay 250k'] 
  },
};

// --- PERSONAL ACCIDENT CONSTANTS ---

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

// --- PET INSURANCE CONSTANTS ---

export const PET_BREEDS = {
  DOG: ['Golden Retriever', 'Bulldog', 'Poodle', 'Beagle', 'German Shepherd', 'Chihuahua', 'Mixed Breed', 'Other'],
  CAT: ['Persian', 'Siamese', 'Maine Coon', 'Bengal', 'Ragdoll', 'Sphynx', 'Domestic Short Hair', 'Other']
};

export const PET_COVERAGE_PLANS = [
  { 
    id: 'LITE', 
    name: 'Lite', 
    price: 75000, 
    benefits: { medical: '5.000.000', death: '2.000.000', thirdParty: 'No' },
    features: ['Accident Only', 'Exam Fees', 'Reimbursement']
  },
  { 
    id: 'COMFORT', 
    name: 'Comfort', 
    price: 150000, 
    benefits: { medical: '20.000.000', death: '5.000.000', thirdParty: '10.000.000' },
    features: ['Accident & Illness', 'Surgery', 'Third Party Liability', 'Cashless @ Partners']
  },
  { 
    id: 'ULTIMATE', 
    name: 'Ultimate', 
    price: 300000, 
    benefits: { medical: '50.000.000', death: '10.000.000', thirdParty: '25.000.000' },
    features: ['All Risk', 'Theft/Lost', 'Boarding Fees', 'Overseas Cover', 'Burial Costs']
  }
];

export const PET_PLANS = PET_COVERAGE_PLANS; // alias for backward compatibility
