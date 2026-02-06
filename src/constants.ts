
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
  { brand: 'TOYOTA', code: 'TOYRUS008', modelName: 'ALL NEW RUSH 1.5 G M/T', yearPrices: { 2025: 284.4, 2024: 267.7, 2023: 251.3, 2022: 239.5, 2021: 219.1, 2020: 195.5, 2019: 182.5 } },
  { brand: 'TOYOTA', code: 'TOYRUS009', modelName: 'ALL NEW RUSH 1.5 G A/T', yearPrices: { 2025: 295.2, 2024: 277.9, 2023: 261.0, 2022: 248.7, 2021: 227.6, 2020: 203.3, 2019: 189.6 } },
  { brand: 'TOYOTA', code: 'TOYRUS014', modelName: 'ALL NEW RUSH 1.5 GR SPORT M/T', yearPrices: { 2025: 299.4, 2024: 279.7, 2023: 262.7, 2022: 247.3, 2021: 230.2 } },
  { brand: 'TOYOTA', code: 'TOYRUS015', modelName: 'ALL NEW RUSH 1.5 GR SPORT A/T', yearPrices: { 2025: 310.4, 2024: 289.9, 2023: 272.2, 2022: 256.5, 2021: 238.8 } },
  { brand: 'TOYOTA', code: 'TOYALP050', modelName: 'ALPHARD 2.5 X PREMIUM COLOR CVT', yearPrices: { 2025: 1410.0, 2024: 1335.3, 2023: 1208.4 } },
  { brand: 'TOYOTA', code: 'TOYALP051', modelName: 'ALPHARD 2.5 G NON PREMIUM COLOR CVT', yearPrices: { 2025: 1620.3, 2024: 1534.4, 2023: 1403.5 } },
  
  // --- HONDA ---
  { brand: 'HONDA', code: 'HONBRI020', modelName: 'ALL NEW BRIO SATYA E M/T', yearPrices: { 2025: 191.7, 2024: 159.9, 2023: 148.9, 2022: 143.7, 2021: 135.2, 2020: 129.4, 2019: 120.3 } },
  { brand: 'HONDA', code: 'HONBRI021', modelName: 'ALL NEW BRIO SATYA E A/T', yearPrices: { 2025: 207.8, 2024: 171.9, 2023: 154.7, 2022: 150.0, 2021: 147.8, 2020: 131.5, 2019: 122.7 } },
  { brand: 'HONDA', code: 'HONBRI018', modelName: 'ALL NEW BRIO RS M/T', yearPrices: { 2025: 249.0, 2024: 206.8, 2023: 190.2, 2022: 185.3, 2021: 152.8, 2020: 141.8, 2019: 132.2 } },
  { brand: 'HONDA', code: 'HONBRI019', modelName: 'ALL NEW BRIO RS A/T', yearPrices: { 2025: 259.0, 2024: 215.5, 2023: 198.3, 2022: 193.8, 2021: 165.3, 2020: 153.6, 2019: 143.3 } },
  { brand: 'HONDA', code: 'HONHRV020', modelName: 'ALL NEW HRV 1.5 E CVT', yearPrices: { 2025: 408.4, 2024: 386.8, 2023: 356.6, 2022: 325.0 } },
  { brand: 'HONDA', code: 'HONHRV024', modelName: 'ALL NEW HRV 1.5 RS TURBO CVT', yearPrices: { 2025: 553.2, 2024: 514.3, 2023: 474.1, 2022: 435.4 } },
  { brand: 'HONDA', code: 'HONBRV010', modelName: 'BR-V N7X PRESTIGE CVT', yearPrices: { 2025: 343.4, 2024: 299.0 } },
  { brand: 'HONDA', code: 'HONBRV011', modelName: 'BR-V N7X PRESTIGE WITH HS CVT', yearPrices: { 2025: 363.4, 2024: 327.0 } },
  { brand: 'HONDA', code: 'HONCIT043', modelName: 'CITY HATCHBACK RS M/T', yearPrices: { 2025: 352.6, 2024: 327.5, 2023: 251.8, 2022: 240.7, 2021: 230.0 } },
  { brand: 'HONDA', code: 'HONCIT044', modelName: 'CITY HATCHBACK RS CVT', yearPrices: { 2025: 362.6, 2024: 336.9, 2023: 257.4, 2022: 249.6, 2021: 236.4 } },
  { brand: 'HONDA', code: 'HONWRV003', modelName: 'WR-V 1.5 RS TWO TONE CVT', yearPrices: { 2025: 312.8, 2024: 290.8, 2023: 263.3, 2022: 246.6 } },
  { brand: 'HONDA', code: 'HONWRV005', modelName: 'WR-V 1.5 RS WITH HONDA SENSING TWO TONE CVT', yearPrices: { 2025: 332.8, 2024: 309.7, 2023: 280.7, 2022: 263.4 } },
  { brand: 'HONDA', code: 'HONCRV034', modelName: 'HONDA CR-V 1.5L Turbo', yearPrices: { 2024: 749.1, 2023: 630.6, 2022: 536.5 } },
  { brand: 'HONDA', code: 'HONCRV035', modelName: 'HONDA CR-V 2.0L RS e:HEV', yearPrices: { 2025: 814.4, 2024: 700.7, 2023: 696.0 } },

  // --- MITSUBISHI ---
  { brand: 'MITSUBISHI', code: 'MITXPA015', modelName: 'NEW XPANDER GLS M/T', yearPrices: { 2025: 263.2, 2024: 244.3, 2023: 227.6, 2022: 215.8, 2021: 205.1 } },
  { brand: 'MITSUBISHI', code: 'MITXPA016', modelName: 'NEW XPANDER GLS A/T', yearPrices: { 2025: 272.4, 2024: 253.2, 2023: 235.9, 2022: 223.7, 2021: 214.3 } },
  { brand: 'MITSUBISHI', code: 'MITXPA019', modelName: 'NEW XPANDER SPORT A/T', yearPrices: { 2025: 309.5, 2024: 293.1, 2023: 273.0, 2022: 247.3, 2021: 256.1 } },
  { brand: 'MITSUBISHI', code: 'MITXPA021', modelName: 'NEW XPANDER ULTIMATE A/T', yearPrices: { 2025: 322.9, 2024: 296.3, 2023: 276.0, 2022: 261.6, 2021: 258.2 } },
  { brand: 'MITSUBISHI', code: 'MITXPA022', modelName: 'NEW XPANDER CROSS 1.5 MT', yearPrices: { 2025: 325.2, 2024: 285.0, 2023: 265.4, 2022: 244.0 } },
  { brand: 'MITSUBISHI', code: 'MITXPA024', modelName: 'NEW XPANDER CROSS Premium Package 1.5 AT', yearPrices: { 2025: 351.1, 2024: 309.4, 2023: 288.1, 2022: 265.1 } },
  { brand: 'MITSUBISHI', code: 'MITPAJ009', modelName: 'PAJERO SPORT DAKAR 4X2 A/T', yearPrices: { 2025: 635.0, 2024: 592.7, 2023: 556.0, 2022: 517.5, 2021: 460.0, 2020: 438.5, 2019: 429.9, 2018: 410.9, 2017: 399.5, 2016: 348.2 } },
  { brand: 'MITSUBISHI', code: 'MITPAJ010', modelName: 'NEW PAJERO SPORT DAKAR 4X4 A/T', yearPrices: { 2025: 746.0, 2024: 696.6, 2023: 653.4, 2022: 606.7, 2021: 586.7, 2020: 536.5, 2019: 500.5, 2018: 459.9, 2017: 413.8, 2016: 406.5 } },
  { brand: 'MITSUBISHI', code: 'MITPAJ011', modelName: 'NEW PAJERO SPORT DAKAR LIMITED 4X4 A/T', yearPrices: { 2025: 644.5, 2024: 610.3, 2023: 572.6, 2022: 553.0, 2021: 534.7, 2020: 492.6, 2019: 459.5, 2018: 443.5, 2017: 424.5, 2016: 416.9 } },
  { brand: 'MITSUBISHI', code: 'MITXFO001', modelName: 'XFORCE EXCEED CVT', yearPrices: { 2025: 382.5, 2024: 362.2, 2023: 326.1 } },
  { brand: 'MITSUBISHI', code: 'MITXFO002', modelName: 'XFORCE ULTIMATE CVT', yearPrices: { 2025: 419.1, 2024: 396.9, 2023: 357.2 } },

  // --- DAIHATSU ---
  { brand: 'DAIHATSU', code: 'DAYAYL013', modelName: 'AYLA NEW 1.2 X M/T', yearPrices: { 2025: 125.8, 2024: 122.0, 2023: 119.6, 2022: 116.0, 2021: 113.7, 2020: 109.1, 2019: 106.9 } },
  { brand: 'DAIHATSU', code: 'DAYAYL014', modelName: 'AYLA NEW 1.2 X A/T', yearPrices: { 2025: 134.9, 2024: 130.9, 2023: 128.2, 2022: 124.4, 2021: 121.9, 2020: 117.0, 2019: 114.7 } },
  { brand: 'DAIHATSU', code: 'DAYAYL015', modelName: 'AYLA NEW 1.2 R M/T', yearPrices: { 2025: 132.2, 2024: 128.2, 2023: 125.7, 2022: 121.9, 2021: 119.5, 2020: 114.7, 2019: 112.4 } },
  { brand: 'DAIHATSU', code: 'DAISIG006', modelName: 'SIGRA 1.2 X MT DLX', yearPrices: { 2025: 163.3, 2024: 156.3, 2023: 146.3, 2022: 141.2, 2021: 117.2, 2020: 112.5, 2019: 108.0, 2018: 103.7, 2017: 99.5, 2016: 96.6 } },
  { brand: 'DAIHATSU', code: 'DAISIG010', modelName: 'SIGRA 1.2 R AT', yearPrices: { 2025: 179.3, 2024: 171.6, 2023: 148.6, 2022: 155.0, 2021: 128.4, 2020: 123.3, 2019: 118.3, 2018: 113.6, 2017: 109.1, 2016: 105.8 } },
  { brand: 'DAIHATSU', code: 'DAIXEN011', modelName: 'XENIA NEW 1.0 LI VVT-I DELUXE', yearPrices: { 2025: 235.3, 2024: 143.6, 2023: 136.7, 2022: 113.3, 2021: 108.7, 2020: 97.4, 2019: 84.0 } },
  { brand: 'DAIHATSU', code: 'DAITER032', modelName: 'NEW TERIOS X M/T', yearPrices: { 2025: 241.6, 2024: 228.7, 2023: 212.5, 2022: 205.3, 2021: 176.1, 2020: 158.0, 2019: 147.4, 2018: 139.0 } },
  { brand: 'DAIHATSU', code: 'DAITER035', modelName: 'NEW TERIOS R M/T', yearPrices: { 2025: 273.6, 2024: 261.8, 2023: 243.2, 2022: 218.4, 2021: 203.2, 2020: 182.9, 2019: 170.6, 2018: 161.5 } },
  { brand: 'DAIHATSU', code: 'DAIROC002', modelName: 'ROCKY 1.0 R ADS M/T', yearPrices: { 2025: 258.8, 2024: 247.7, 2023: 203.1, 2022: 182.8, 2021: 179.2 } },
  { brand: 'DAIHATSU', code: 'DAIROC005', modelName: 'ROCKY 1.0 R ASA CVT', yearPrices: { 2025: 286.3, 2024: 263.7, 2023: 211.0, 2022: 194.1, 2021: 190.4 } },
  { brand: 'DAIHATSU', code: 'DAIGPU001', modelName: 'GRAN MAX PU 1.3 STANDARD M/T', yearPrices: { 2025: 158.3, 2024: 151.5, 2023: 149.7, 2022: 135.9, 2021: 118.8, 2020: 108.2, 2019: 100.6, 2018: 98.6, 2017: 96.6, 2016: 92.8, 2015: 87.2, 2014: 77.9 } },

  // --- SUZUKI ---
  { brand: 'SUZUKI', code: 'SUZERG002', modelName: 'ERTIGA GL M/T', yearPrices: { 2025: 226.5, 2024: 212.0, 2023: 193.0, 2022: 175.0, 2021: 168.0 } },
  { brand: 'SUZUKI', code: 'SUZXL7005', modelName: 'SUZUKI XL7 ALPHA MT', yearPrices: { 2025: 279.1, 2024: 264.3, 2023: 237.9, 2022: 229.7, 2021: 210.7, 2020: 190.3, 2019: 177.6 } },
  { brand: 'SUZUKI', code: 'SUZXL7006', modelName: 'SUZUKI XL7 ALPHA AT', yearPrices: { 2025: 290.1, 2024: 274.7, 2023: 247.3, 2022: 238.7, 2021: 219.2, 2020: 198.2, 2019: 184.9 } },
  { brand: 'SUZUKI', code: 'SUZXL7009', modelName: 'NEW XL7 BETA HYBRID M/T', yearPrices: { 2025: 288.0, 2024: 268.9, 2023: 242.0 } },
  { brand: 'SUZUKI', code: 'SUZXL7010', modelName: 'NEW XL7 BETA HYBRID A/T', yearPrices: { 2025: 299.0, 2024: 279.3, 2023: 251.3 } },
  { brand: 'SUZUKI', code: 'SUZVIT019', modelName: 'GRAND VITARA GL AT', yearPrices: { 2025: 362.0, 2024: 340.4, 2023: 294.0 } },
  { brand: 'SUZUKI', code: 'SUZVIT020', modelName: 'GRAND VITARA GX AT', yearPrices: { 2025: 393.4, 2024: 364.0, 2023: 314.0 } },
  { brand: 'SUZUKI', code: 'SUZIGN007', modelName: 'IGNIS GX M/T', yearPrices: { 2025: 200.8, 2024: 180.7, 2023: 170.6, 2022: 154.8, 2021: 137.3, 2020: 128.0, 2019: 115.8, 2018: 104.2 } },
  
  // --- HYUNDAI ---
  { brand: 'HYUNDAI', code: 'HYUSTAR006', modelName: 'STARGAZER Prime IVT', yearPrices: { 2025: 307.1, 2024: 290.8, 2023: 261.8, 2022: 252.8 } },
  { brand: 'HYUNDAI', code: 'HYUSTAR009', modelName: 'STARGAZER X Style', yearPrices: { 2025: 325.6, 2024: 308.3, 2023: 277.5 } },
  { brand: 'HYUNDAI', code: 'HYUSTAR010', modelName: 'STARGAZER X Prime One-Tone Roof IVT', yearPrices: { 2025: 336.2, 2024: 318.4, 2023: 286.6 } },
  { brand: 'HYUNDAI', code: 'HYUCRE001', modelName: 'CRETA ACTIVE M/T', yearPrices: { 2025: 297.3, 2024: 267.6, 2023: 297.3, 2022: 219.1 } },
  { brand: 'HYUNDAI', code: 'HYUCRE005', modelName: 'CRETA PRIME IVT', yearPrices: { 2025: 410.0, 2024: 369.0, 2023: 297.3, 2022: 272.0 } },
  { brand: 'HYUNDAI', code: 'HYUIUO001', modelName: 'IONIQ Prime AT', yearPrices: { 2025: 722.0, 2024: 683.7, 2023: 601.7, 2022: 561.5, 2021: 331.5, 2020: 311.6, 2019: 292.8 } },
  { brand: 'HYUNDAI', code: 'HYUION003', modelName: 'IONIQ 5 Signature Standard Range', yearPrices: { 2025: 779.0, 2024: 737.7, 2023: 663.9, 2022: 641.4 } },
  { brand: 'HYUNDAI', code: 'HYUPAL002', modelName: 'PALISADE Signature AT', yearPrices: { 2025: 1051.0, 2024: 995.3, 2023: 863.0, 2022: 746.7, 2021: 724.6, 2020: 659.1 } },

  // --- WULING ---
  { brand: 'WULING', code: 'WULAIR002', modelName: 'AIR EV LONG RANGE', yearPrices: { 2025: 275.0, 2024: 255.8, 2023: 180.0, 2022: 156.6 } },
  { brand: 'WULING', code: 'WULALM010', modelName: 'NEW ALMAZ RS PRO HYBRID CVT', yearPrices: { 2025: 476.0, 2024: 442.7, 2023: 412.5 } },
  { brand: 'WULING', code: 'WULALV003', modelName: 'ALVEZ EX CVT', yearPrices: { 2025: 302.0, 2024: 280.9, 2023: 222.0 } },
  { brand: 'WULING', code: 'WULBIN001', modelName: 'BINGUO EV Premium Range', yearPrices: { 2025: 408.0, 2024: 379.4, 2023: 350.4 } },
  
  // --- BMW ---
  { brand: 'BMW', code: 'BMW320026', modelName: 'NEW 320i SPORT', yearPrices: { 2025: 1080.0, 2024: 1000.1, 2023: 920.5, 2022: 826.4, 2021: 625.0, 2020: 562.5, 2019: 506.2, 2018: 431.6, 2017: 377.6, 2016: 360.1, 2015: 304.0 } },
  { brand: 'BMW', code: 'BMWX10009', modelName: 'X1 SDRIVE 18I DYNAMIC', yearPrices: { 2022: 669.2, 2021: 614.4, 2020: 553.0, 2019: 515.7 } },
  { brand: 'BMW', code: 'BMW520013', modelName: '520i LUXURY', yearPrices: { 2021: 1003.8, 2020: 950.2, 2019: 847.0, 2018: 790.3, 2017: 651.9, 2016: 493.8, 2015: 418.8, 2014: 361.9 } },

  // --- MERCEDES BENZ ---
  { brand: 'MERCEDES BENZ', code: 'MERCCL029', modelName: 'C-CLASS NEW C-230 AVANTGARDE/AMG', yearPrices: { 2025: 645.5, 2024: 612.0, 2023: 557.3, 2022: 519.9, 2021: 506.0, 2020: 484.5, 2019: 436.0, 2018: 392.3 } },
  { brand: 'MERCEDES BENZ', code: 'MERECL070', modelName: 'E - CLASS NEW E 300 AMG Line', yearPrices: { 2025: 1815.0, 2024: 1576.8, 2023: 1419.1, 2022: 1280.2, 2021: 1071.0, 2020: 957.8, 2019: 892.0, 2018: 807.0, 2017: 689.4 } },

  // --- MAZDA ---
  { brand: 'MAZDA', code: 'MAZCX5012', modelName: 'ALL NEW MAZDA CX-5 GT', yearPrices: { 2022: 451.8, 2021: 437.7, 2020: 398.6, 2019: 371.8, 2018: 336.4, 2017: 309.5, 2016: 284.7, 2015: 277.0 } },
  { brand: 'MAZDA', code: 'MAZDA2017', modelName: 'NEW MAZDA 2 GT', yearPrices: { 2025: 367.7, 2024: 348.2, 2023: 313.4, 2022: 278.9, 2021: 247.5, 2020: 225.3, 2019: 210.2, 2018: 199.5, 2017: 183.6, 2016: 173.5, 2015: 164.5, 2014: 164.4 } }
];
