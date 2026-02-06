import { Provider, InsuranceType, CarModelData } from './types';
import { Shield, Zap, Star } from 'lucide-react';

// OJK Batas Bawah Rate Logic
export const getOJKRate = (priceMillions: number, region: '1'|'2'|'3', type: InsuranceType): number => {
  if (type === InsuranceType.COMPREHENSIVE) {
    if (region === '1') {
      if (priceMillions <= 125) return 3.82;
      if (priceMillions <= 200) return 2.67;
      if (priceMillions <= 400) return 2.18;
      if (priceMillions <= 800) return 1.20;
      return 1.05;
    } else if (region === '2') {
      if (priceMillions <= 125) return 3.26;
      if (priceMillions <= 200) return 2.47;
      if (priceMillions <= 400) return 2.08;
      if (priceMillions <= 800) return 1.20;
      return 1.05;
    } else {
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
  AUTHORIZED_WORKSHOP_RATE: 0.2,
  PA_DRIVER: 0.5, 
  PA_PASSENGER: 0.1
};

export const AUTHORIZED_WORKSHOP_RATE = 0.2;
export const STAMP_DUTY = 10000;
export const BASE_COMMISSION_PERCENT = 25; // 25% Komisi untuk semua asuransi

export const INSURANCE_PROVIDERS: Provider[] = [
  {
    id: 'intra',
    name: 'Intra Asia',
    logo: Star,
    adminFee: 30000,
    stampDuty: 10000,
    rating: 4.8,
    advantages: ['Premi sangat kompetitif', 'Proses persetujuan cepat', 'Jaringan bengkel luas'],
    disadvantages: ['Fasilitas derek terbatas', 'Belum ada aplikasi mobile klaim'],
    extraCoinsPercent: 15, // Poin 15%
    features: ['Competitive Rates', 'Fast Approval', 'National Network']
  },
  {
    id: 'zurich',
    name: 'Zurich',
    logo: Shield,
    adminFee: 55000,
    stampDuty: 10000,
    rating: 4.9,
    advantages: ['Layanan 24/7 Roadside Assistance', 'Bengkel authorized premium', 'Penggantian mobil (Loss of Use)'],
    disadvantages: ['Admin fee lebih tinggi', 'Proses survei lebih detail'],
    extraCoinsPercent: 10, // Poin 10%
    features: ['Authorized Workshops', '24/7 Towing', 'Free Pickup']
  },
  {
    id: 'tugu',
    name: 'Tugu Insurance',
    logo: Zap,
    adminFee: 50000,
    stampDuty: 10000,
    rating: 4.7,
    advantages: ['Aplikasi mobile klaim canggih', 'BUMN Group (Kredibel)', 'Layanan derek gratis'],
    disadvantages: ['Respon CS jam sibuk agak lambat', 'Jaringan bengkel di pelosok terbatas'],
    extraCoinsPercent: 10, // Poin 10%
    features: ['Mobile Claim App', 'Emergency Roadside', 'Replacement Car']
  }
];

export const TPL_OPTIONS = [0, 10000000, 25000000, 50000000];

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

export const PROMO_CODES: Record<string, number> = {
  'SUREPATH25': 0.25,
  'WELCOME10': 0.10,
  'AI5': 0.05
};

export const CAR_DATABASE: CarModelData[] = [
  // --- AUDI ---
  { brand: 'AUDI', code: 'AUDAUD79', modelName: 'A3 SPORTBACK 1.2 TFSI', yearPrices: { 2021: 474.3, 2020: 445.8, 2019: 401.2, 2018: 334.8, 2017: 319.5 } },
  { brand: 'AUDI', code: 'AUDAUD033', modelName: 'A4 1.8 TFSI', yearPrices: { 2016: 237.6, 2015: 222.5 } },
  { brand: 'AUDI', code: 'AUDAUD034', modelName: 'A4 NEW 2.0 TURBO FSI MULTITRONIC', yearPrices: { 2025: 1280.0, 2024: 1185.3, 2023: 1090.9, 2022: 1032.0, 2021: 946.6, 2020: 891.5, 2019: 763.4, 2018: 590.2, 2017: 574.8 } },
  { brand: 'AUDI', code: 'AUDAUD81', modelName: 'A5 COUPE 2.0 TFSI QUATTRO', yearPrices: { 2025: 1525.0, 2024: 1412.2, 2023: 1299.8, 2022: 1084.8, 2021: 976.3, 2020: 877.9, 2019: 790.7, 2018: 695.9 } },
  { brand: 'AUDI', code: 'AUDAUD038', modelName: 'A6 2.0 TFSI MULTITRONIC', yearPrices: { 2015: 301.9 } },
  { brand: 'AUDI', code: 'AUDAUD077', modelName: 'A6 2.0 SALOON', yearPrices: { 2025: 1649.0, 2024: 1527.0, 2023: 1405.4, 2022: 1329.6, 2021: 1088.7, 2020: 868.8, 2019: 810.5, 2018: 737.0, 2017: 593.1, 2016: 533.9 } },
  { brand: 'AUDI', code: 'AUDAUD074', modelName: 'A7 3.0 TFSI QUATTRO SPORTBACK', yearPrices: { 2025: 1900.0, 2024: 1759.4, 2023: 1619.4, 2022: 1532.0, 2021: 1405.1, 2020: 1323.3, 2019: 1234.7, 2018: 1154.4, 2017: 940.2, 2016: 881.8, 2015: 684.7 } },
  { brand: 'AUDI', code: 'AUDAUD065', modelName: 'Q3 2.0 TFSI A/T', yearPrices: { 2015: 326.1 } },
  { brand: 'AUDI', code: 'AUDAUD83', modelName: 'Q7 3.0 TFSI QUATTRO', yearPrices: { 2025: 2430.0, 2024: 2250.2, 2023: 2071.1, 2022: 1491.5, 2021: 1431.9, 2020: 1388.9, 2019: 1361.1, 2018: 1306.7, 2017: 1215.2, 2016: 700.8 } },
  
  // --- BMW ---
  { brand: 'BMW', code: 'BMW218001', modelName: '218 I ACTIVE TOURER SPORT', yearPrices: { 2019: 439.6, 2018: 372.8, 2017: 322.3, 2016: 270.7 } },
  { brand: 'BMW', code: 'BMW520010', modelName: '520 D F10 A/T', yearPrices: { 2015: 437.8 } },
  { brand: 'BMW', code: 'BMW520013', modelName: '520i LUXURY', yearPrices: { 2021: 1003.8, 2020: 950.2, 2019: 847.0, 2018: 790.3, 2017: 651.9, 2016: 493.8, 2015: 418.8, 2014: 361.9 } },
  { brand: 'BMW', code: 'BMW320022', modelName: '320 I F30 LUXURY', yearPrices: { 2022: 539.4, 2021: 527.5, 2020: 523.5, 2019: 488.5, 2018: 445.5, 2017: 408.5, 2016: 364.4, 2015: 317.8 } },
  { brand: 'BMW', code: 'BMW320025', modelName: '320 D SPORT', yearPrices: { 2022: 496.0, 2021: 488.0, 2020: 455.2, 2019: 356.5, 2018: 339.8, 2017: 330.8, 2015: 317.4 } },
  { brand: 'BMW', code: 'BMW320026', modelName: 'NEW 320i SPORT', yearPrices: { 2025: 1080.0, 2024: 1000.1, 2023: 920.5, 2022: 826.4, 2021: 625.0, 2020: 562.5, 2019: 506.2, 2018: 431.6, 2017: 377.6, 2016: 360.1, 2015: 304.0 } },
  { brand: 'BMW', code: 'BMW435001', modelName: '435 I F32 A/T', yearPrices: { 2015: 590.1 } },
  
  // --- DAIHATSU ---
  { brand: 'DAIHATSU', code: 'DAIAYL001', modelName: 'AYLA X A/T', yearPrices: { 2018: 97.3, 2017: 95.4, 2016: 91.6, 2015: 89.7 } },
  { brand: 'DAIHATSU', code: 'DAIAYL002', modelName: 'AYLA X M/T', yearPrices: { 2018: 95.3, 2017: 93.4, 2016: 89.6, 2015: 87.8 } },
  { brand: 'DAIHATSU', code: 'DAIAYL003', modelName: 'AYLA M A/T', yearPrices: { 2018: 89.8, 2017: 88.0, 2016: 84.5, 2015: 82.8 } },
  { brand: 'DAIHATSU', code: 'DAIGPU001', modelName: 'GRAN MAX PU 1.3 STANDARD M/T', yearPrices: { 2025: 158.3, 2024: 151.5, 2023: 149.7, 2022: 135.9, 2021: 118.8, 2020: 108.2, 2019: 100.6, 2018: 98.6, 2017: 96.6, 2016: 92.8, 2015: 87.2, 2014: 77.9 } },
  { brand: 'DAIHATSU', code: 'DAIGPU002', modelName: 'GRAN MAX PU 1.3 3 -WAY STANDARD M/T', yearPrices: { 2018: 103.4, 2017: 101.3, 2016: 99.3, 2015: 89.6, 2014: 83.0 } },
  
  // --- HONDA ---
  { brand: 'HONDA', code: 'HONACC021', modelName: 'ACCORD ALL NEW VTI-L 2.4 A/T', yearPrices: { 2018: 318.9, 2017: 299.5, 2016: 286.3, 2015: 270.7, 2014: 254.0 } },
  { brand: 'HONDA', code: 'HONBRI001', modelName: 'BRIO S M/T', yearPrices: { 2015: 87.0, 2014: 80.1 } },
  { brand: 'HONDA', code: 'HONBRI004', modelName: 'BRIO E A/T', yearPrices: { 2018: 112.8, 2017: 108.1, 2016: 104.7, 2015: 100.9, 2014: 91.0 } },
  { brand: 'HONDA', code: 'HONBRV001', modelName: 'BR-V S M/T', yearPrices: { 2017: 148.0, 2016: 145.0, 2015: 139.5 } },
  
  // --- TOYOTA ---
  { brand: 'TOYOTA', code: 'TOYVEL002', modelName: 'VELLFIRE 2.5 G A/T', yearPrices: { 2024: 1325.6, 2023: 1244.7, 2022: 1202.4, 2021: 1124.0, 2020: 912.2, 2019: 851.0, 2018: 806.2, 2017: 710.9, 2016: 675.3, 2015: 623.4 } },
  { brand: 'TOYOTA', code: 'TOYAGY001', modelName: 'AGYA E MT', yearPrices: { 2018: 89.5, 2017: 88.1, 2016: 86.8, 2015: 85.1 } },
  { brand: 'TOYOTA', code: 'TOY860002', modelName: '86 A/T', yearPrices: { 2024: 782.1, 2023: 740.6, 2022: 695.5, 2021: 671.7, 2020: 665.1, 2019: 567.7, 2018: 529.7, 2017: 508.5, 2016: 476.0, 2015: 472.8, 2014: 457.3 } },
  { brand: 'TOYOTA', code: 'TOYAVA016', modelName: 'AVANZA ALL NEW 1.3 E M/T', yearPrices: { 2016: 101.2, 2015: 98.5 } },
  { brand: 'TOYOTA', code: 'TOYAVA017', modelName: 'AVANZA ALL NEW 1.3 E A/T', yearPrices: { 2016: 99.1, 2015: 98.3 } },
  { brand: 'TOYOTA', code: 'TOYKIJ128', modelName: 'KIJANG NEW GRAND INNOVA 2.0 V M/T LUXURY', yearPrices: { 2015: 181.4, 2014: 158.0 } },
  
  // --- SUZUKI ---
  { brand: 'SUZUKI', code: 'SUZCAR022', modelName: 'CARRY REALVAN 1.5 DX', yearPrices: { 2016: 70.2, 2015: 56.0 } },
  { brand: 'SUZUKI', code: 'SUZCAR025', modelName: 'CARRY PICK UP FLAT DECK 1.5 MT', yearPrices: { 2016: 59.1, 2015: 52.9 } },
  { brand: 'SUZUKI', code: 'SUZERG016', modelName: 'NEW ERTIGA GA M/T', yearPrices: { 2018: 110.4, 2017: 100.4, 2016: 95.4, 2015: 91.3 } }
];

// Added missing TRAVEL_PRICING
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

// Added missing TRAVEL_BENEFITS
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

// Added missing PA_PLANS
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

// Added missing PET_BREEDS
export const PET_BREEDS = {
  DOG: ['Golden Retriever', 'Bulldog', 'Poodle', 'Beagle', 'German Shepherd', 'Chihuahua', 'Mixed Breed', 'Other'],
  CAT: ['Persian', 'Siamese', 'Maine Coon', 'Bengal', 'Ragdoll', 'Sphynx', 'Domestic Short Hair', 'Other']
};

// Added missing PET_PLANS
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

// Added missing MPAR_PRICING
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
