
import { CarModelData, Provider, InsuranceType } from './types';
import { Shield, Zap, Star } from 'lucide-react';

// OJK Rate Logic (BATAS BAWAH / LOWER BOUND ONLY)
export const getOJKRate = (priceMillions: number, region: '1'|'2'|'3', type: InsuranceType): number => {
  if (type === InsuranceType.COMPREHENSIVE) {
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
  } else { // TLO
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
// Added missing constant for commission calculations
export const BASE_COMMISSION_PERCENT = 25; // 25% Komisi untuk semua asuransi

export const INSURANCE_PROVIDERS: Provider[] = [
  {
    id: 'zurich',
    name: 'Zurich',
    logo: Shield,
    adminFee: 55000,
    stampDuty: 10000,
    rating: 4.9,
    features: ['Authorized Workshops', '24/7 Towing', 'Free Pickup'],
    advantages: ['Bengkel Resmi', 'Layanan Derek 24 Jam'],
    disadvantages: ['Premi sedikit lebih tinggi']
  },
  {
    id: 'tugu',
    name: 'Tugu Insurance',
    logo: Zap,
    adminFee: 50000,
    stampDuty: 10000,
    rating: 4.7,
    features: ['Mobile Claim App', 'Emergency Roadside', 'Replacement Car'],
    advantages: ['Aplikasi Mudah', 'BUMN'],
    disadvantages: ['Proses survey 1x24 jam']
  },
  {
    id: 'intra',
    name: 'Intra Asia',
    logo: Star,
    adminFee: 25000,
    stampDuty: 10000,
    rating: 4.8,
    features: ['Competitive Rates', 'Fast Approval', 'National Network'],
    advantages: ['Harga Terbaik', 'Approval Cepat'],
    disadvantages: ['Jaringan bengkel rekanan']
  }
];

export const PROMO_CODES: Record<string, number> = {
  'SUREPATH25': 0.25,
  'WELCOME10': 0.10,
  'AI5': 0.05
};

export const PLATE_REGIONS: Record<string, { region: '1' | '2' | '3', name: string }> = {
  'BL': { region: '1', name: 'Aceh' },
  'BB': { region: '1', name: 'Sumut (Barat)' },
  'BK': { region: '1', name: 'Sumut (Timur)' },
  'BA': { region: '1', name: 'Sumbar' },
  'BM': { region: '1', name: 'Riau' },
  'BP': { region: '1', name: 'Kepri' },
  'BE': { region: '1', name: 'Lampung' },
  'BD': { region: '1', name: 'Bengkulu' },
  'BH': { region: '1', name: 'Jambi' },
  'BG': { region: '1', name: 'Sumsel' },
  'A': { region: '2', name: 'Banten' },
  'B': { region: '2', name: 'Jakarta' },
  'D': { region: '2', name: 'Bandung' },
  'E': { region: '2', name: 'Cirebon' },
  'F': { region: '2', name: 'Bogor' },
  'T': { region: '2', name: 'Karawang' },
  'Z': { region: '2', name: 'Priangan Timur' },
};

export const TPL_OPTIONS = [0, 10000000, 25000000, 50000000];

// --- TRAVEL INSURANCE CONSTANTS ---

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
    deathBenefit: '1.6 Miliar', 
    medicalBenefit: '960 Juta', 
    features: ['Visa Schengen Approved', 'Covid-19 Cover', 'Worldwide Coverage', 'Trip Cancellation up to 96M', 'Baggage Loss 32M'] 
  },
  GOLD: { 
    deathBenefit: '960 Juta', 
    medicalBenefit: '640 Juta', 
    features: ['Worldwide Coverage', 'Trip Cancellation up to 24M', 'Baggage Loss 24M', 'Flight Delay 4M'] 
  },
  ASIA_EXTRA: { 
    deathBenefit: '240 Juta', 
    medicalBenefit: '160 Juta', 
    features: ['Asia Only Coverage', 'Trip Cancellation up to 16M', 'Baggage Loss 16M', 'Flight Delay 1.6M'] 
  },
  GARUDA_1: { 
    deathBenefit: '100 Juta', 
    medicalBenefit: '75 Juta', 
    features: ['Domestic Coverage', 'Trip Cancellation 5M', 'Baggage Loss 2.5M', 'Flight Delay 500k'] 
  },
  GARUDA_2: { 
    deathBenefit: '50 Juta', 
    medicalBenefit: '25 Juta', 
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

export const PET_PLANS = PET_COVERAGE_PLANS;

export const MPAR_PRICING = {
  ELECTRONIC: [
    { min: 1000000, max: 5000000, TV: 50000, NON_TV: 40000 },
    { min: 5000001, max: 10000000, TV: 70000, NON_TV: 50000 },
    { min: 10000001, max: 15000000, TV: 80000, NON_TV: 60000 },
    { min: 15000001, max: 25000000, TV: 100000, NON_TV: 80000 },
    { min: 25000001, max: 35000000, TV: 135000, NON_TV: 115000 },
    { min: 35000001, max: 50000000, TV: 205000, NON_TV: 185000 },
  ],
  GADGET: {
    MONTHS_6: [
      { min: 500000, max: 5000000, premium: 65000 },
      { min: 5000001, max: 10000000, premium: 75000 },
      { min: 10000001, max: 15000000, premium: 85000 },
      { min: 15000001, max: 20000000, premium: 95000 },
    ],
    MONTHS_12: [
      { min: 500000, max: 5000000, premium: 100000 },
      { min: 5000001, max: 10000000, premium: 160000 },
      { min: 10000001, max: 15000000, premium: 180000 },
      { min: 15000001, max: 20000000, premium: 210000 },
    ]
  },
  FURNITURE: [
    { min: 500000, max: 1000000, premium: 12600 },
    { min: 1000001, max: 5000000, premium: 50300 },
    { min: 5000001, max: 10000000, premium: 125700 },
    { min: 10000001, max: 15000000, premium: 209500 },
    { min: 15000001, max: 20000000, premium: 293300 },
    { min: 20000001, max: 30000000, premium: 418950 },
  ]
};

// --- VEHICLE DATABASE (Extracted from Price List) ---
export const CAR_DATABASE: CarModelData[] = [
  // --- TOYOTA ---
  { brand: 'TOYOTA', code: 'TOYAGY011', modelName: 'NEW AGYA 1.0 G M/T', yearPrices: { 2025: 143.8, 2024: 129.4, 2023: 127.8, 2022: 123.5, 2021: 122.2, 2020: 117.3, 2019: 115.0, 2018: 108.1, 2017: 103.7 } },
  { brand: 'TOYOTA', code: 'TOYAGY012', modelName: 'NEW AGYA 1.2 G M/T', yearPrices: { 2025: 175.4, 2024: 143.7, 2023: 142.0, 2022: 137.1, 2021: 125.9, 2020: 120.9, 2019: 118.4, 2018: 111.3, 2017: 106.9 } },
  { brand: 'TOYOTA', code: 'TOYAGY013', modelName: 'NEW AGYA 1.2 G A/T', yearPrices: { 2025: 191.4, 2024: 156.0, 2023: 146.2, 2022: 138.9, 2021: 137.1, 2020: 131.6, 2019: 129.0, 2018: 121.2, 2017: 116.4 } },
  { brand: 'TOYOTA', code: 'TOYAGY016', modelName: 'NEW AGYA 1.2 GR SPORT M/T', yearPrices: { 2025: 237.5, 2024: 213.8, 2023: 183.0, 2022: 175.7, 2021: 168.7 } },
  { brand: 'TOYOTA', code: 'TOYAGY017', modelName: 'NEW AGYA 1.2 GR SPORT A/T', yearPrices: { 2025: 253.5, 2024: 228.2, 2023: 186.0, 2022: 178.6, 2021: 171.4 } },
  { brand: 'TOYOTA', code: 'TOYCAL009', modelName: 'NEW CALYA 1.2 E STD M/T', yearPrices: { 2025: 167.3, 2024: 156.0, 2023: 146.4, 2022: 138.9, 2021: 126.3, 2020: 113.5, 2019: 105.9 } },
  { brand: 'TOYOTA', code: 'TOYCAL007', modelName: 'NEW CALYA 1.2 G M/T', yearPrices: { 2025: 175.8, 2024: 164.0, 2023: 154.0, 2022: 146.1, 2021: 134.2, 2020: 120.6, 2019: 112.5 } },
  { brand: 'TOYOTA', code: 'TOYCAL008', modelName: 'NEW CALYA 1.2 G A/T', yearPrices: { 2025: 190.0, 2024: 177.5, 2023: 166.7, 2022: 158.4, 2021: 144.8, 2020: 130.3, 2019: 121.5 } },
  { brand: 'TOYOTA', code: 'TOYAVA028', modelName: 'ALL NEW VELOZ 1.5 M/T', yearPrices: { 2025: 292.9, 2024: 273.4, 2023: 256.7, 2022: 245.6, 2021: 236.4 } },
  { brand: 'TOYOTA', code: 'TOYAVA029', modelName: 'ALL NEW VELOZ 1.5 Q CVT', yearPrices: { 2025: 318.0, 2024: 296.7, 2023: 278.6, 2022: 245.6, 2021: 236.0 } },
  { brand: 'TOYOTA', code: 'TOYAVA030', modelName: 'ALL NEW VELOZ 1.5 Q CVT TSS', yearPrices: { 2025: 340.4, 2024: 317.7, 2023: 298.4, 2022: 257.7, 2021: 245.3 } },
  { brand: 'TOYOTA', code: 'TOYAVA031', modelName: 'ALL NEW AVANZA 1.3 E M/T', yearPrices: { 2025: 239.7, 2024: 222.6, 2023: 209.1, 2022: 200.2, 2021: 194.0 } },
  { brand: 'TOYOTA', code: 'TOYAVA033', modelName: 'ALL NEW AVANZA 1.5 G CVT', yearPrices: { 2025: 276.7, 2024: 258.1, 2023: 242.4, 2022: 231.7, 2021: 227.6 } },
  { brand: 'TOYOTA', code: 'TOYAVA034', modelName: 'ALL NEW AVANZA 1.5 G CVT TSS', yearPrices: { 2025: 298.5, 2024: 282.7, 2023: 265.5, 2022: 254.0, 2021: 249.5 } },
  { brand: 'TOYOTA', code: 'TOYKIJ171', modelName: 'KIJANG INNOVA ZENIX 2.0 G CVT', yearPrices: { 2025: 430.4, 2024: 402.5, 2023: 377.9, 2022: 359.9 } },
  { brand: 'TOYOTA', code: 'TOYKIJ175', modelName: 'KIJANG INNOVA ZENIX 2.0 G HV CVT', yearPrices: { 2025: 482.1, 2024: 443.8, 2023: 416.6, 2022: 393.4 } },
  { brand: 'TOYOTA', code: 'TOYKIJ177', modelName: 'KIJANG INNOVA ZENIX 2.0 V HV CVT MODELISTA', yearPrices: { 2025: 541.7, 2024: 503.8, 2023: 473.1, 2022: 457.0 } },
  { brand: 'TOYOTA', code: 'TOYKIJ180', modelName: 'KIJANG INNOVA ZENIX 2.0 Q HV CVT TSS MODELISTA', yearPrices: { 2025: 637.4, 2024: 590.9, 2023: 554.9, 2022: 527.4 } },
  { brand: 'TOYOTA', code: 'TOYFOR057', modelName: 'ALL NEW FORTUNER 4x2 2.8 VRZ A/T DSL', yearPrices: { 2025: 634.9, 2024: 570.1, 2023: 535.3, 2022: 517.1 } },
  { brand: 'TOYOTA', code: 'TOYFOR058', modelName: 'ALL NEW FORTUNER 4x2 2.8 GR Sport A/T DSL', yearPrices: { 2025: 721.6, 2024: 588.7, 2023: 552.7, 2022: 533.9 } },
  { brand: 'TOYOTA', code: 'TOYRAI001', modelName: 'RAIZE 1.0T G M/T ONE TONE', yearPrices: { 2025: 254.5, 2024: 241.0, 2023: 226.4, 2022: 216.4, 2021: 198.5 } },
  { brand: 'TOYOTA', code: 'TOYRAI003', modelName: 'RAIZE 1.0T G CVT ONE TONE', yearPrices: { 2025: 269.5, 2024: 255.2, 2023: 239.7, 2022: 229.2, 2021: 201.7 } },
  { brand: 'TOYOTA', code: 'TOYRAI005', modelName: 'RAIZE 1.0T GR CVT ONE TONE', yearPrices: { 2025: 287.0, 2024: 268.4, 2023: 252.0, 2022: 241.2, 2021: 207.5 } },
  { brand: 'TOYOTA', code: 'TOYRAI007', modelName: 'RAIZE 1.0T GR CVT TSS ONE TONE', yearPrices: { 2025: 304.0, 2024: 288.9, 2023: 271.3, 2022: 259.7, 2021: 250.7 } },
  { brand: 'TOYOTA', code: 'TOYRUS008', modelName: 'ALL NEW RUSH 1.5 G M/T', yearPrices: { 2025: 284.4, 2024: 267.7, 2023: 251.3, 2022: 239.5, 2021: 219.1, 2020: 195.5, 20