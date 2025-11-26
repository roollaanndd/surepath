
export enum Language {
  EN = 'EN',
  ID = 'ID'
}

export enum InsuranceType {
  COMPREHENSIVE = 'COMPREHENSIVE',
  TLO = 'TLO'
}

export interface CarModelData {
  brand: string;
  code: string;
  modelName: string;
  yearPrices: Record<number, number>; // Year -> Price (in Millions)
}

export interface ExpansionOptions {
  flood: boolean;
  earthquake: boolean;
  srcc: boolean; // Strikes, Riot, Civil Commotion
  terrorism: boolean;
  authorizedWorkshop: boolean; // 0.2% rate
  tpl: number; // 0, 10, 20, 30, 40, 50 (Millions)
  paDriver: number; // Sum Insured
  paPassenger: number; // Sum Insured per passenger
  passengers: number; // Number of passengers
}

export interface VehiclePhotos {
  ktp: string | null;
  stnkFront: string | null;
  stnkBack: string | null;
  carFront: string | null;
  carBack: string | null;
  carLeft: string | null;
  carRight: string | null;
  dashboard: string | null;
  accessories?: string | null;
}

export interface Provider {
  id: string;
  name: string;
  logo: any; // component or string url
  adminFee: number;
  rating: number;
  features: string[];
}

export interface VehicleState {
  brand: string;
  modelCode: string;
  year: number;
  price: number;
  plateRegion: '1' | '2' | '3'; // 1: Sumatra, 2: DKI/Jabar/Banten, 3: Others
  plateDetails: {
    code: string;
    number: string;
    suffix: string;
  };
  usage: 'PERSONAL' | 'COMMERCIAL';
  condition: 'NEW' | 'USED';
  vin: string;
  engineNo: string;
  accessories: string;
  insuranceType: InsuranceType;
  expansions: ExpansionOptions;
  photos: VehiclePhotos;
  selectedProvider: Provider | null;
  promoCode?: string;
  discountAmount?: number;
  paymentMethod?: PaymentMethod;
}

export interface UserState {
  name: string;
  ktp: string;
  domicile: string;
  email: string;
  phone: string;
  isMember: boolean;
}

// --- TRAVEL INSURANCE TYPES ---
export type TravelRegion = 'DOMESTIC' | 'INTERNATIONAL' | 'INBOUND';
export type TravelPlanType = 'PLATINUM' | 'GOLD' | 'ASIA_EXTRA' | 'GARUDA_1' | 'GARUDA_2';
export type TravelParticipantType = 'INDIVIDUAL' | 'FAMILY';

export interface TravelerDetails {
  type: 'ADULT' | 'CHILD';
  name: string;
  dob: string;
  passport?: string;
  ktp?: string;
}

export interface TravelState {
  destination: string; // Country or City
  region: TravelRegion;
  startDate: string;
  endDate: string;
  duration: number;
  tripType: 'SINGLE' | 'ANNUAL';
  participantType: TravelParticipantType;
  travelers: {
    adults: number;
    children: number;
    details: TravelerDetails[];
  };
  selectedPlan: TravelPlanType | null;
  promoCode?: string;
  discountAmount?: number;
}

// --- PERSONAL ACCIDENT TYPES ---
export type PAType = 'GENERAL' | 'STUDENT'; // Umum / Siswa

export interface PAState {
  occupation: string;
  type: PAType;
  planCode: string; // A, B, C... J
}

// --- PET INSURANCE TYPES ---
export type PetType = 'DOG' | 'CAT';

export interface PetState {
  petName: string;
  petType: PetType;
  breed: string;
  age: number;
  gender: 'MALE' | 'FEMALE';
  sterilized: boolean;
}

export type PaymentMethod = 'VA' | 'QRIS' | 'CC';

export enum CarInsuranceStep {
  VEHICLE = 1,
  COVERAGE = 2,
  PROVIDER = 3,
  PERSONAL = 4,
  AI_CHECK = 5,
  SUMMARY = 6,
  PAYMENT = 7,
  SUCCESS = 8
}

export type DocumentType = 'KTP' | 'STNK_FRONT' | 'STNK_BACK' | 'CAR_FRONT' | 'CAR_BACK' | 'CAR_LEFT' | 'CAR_RIGHT' | 'DASHBOARD';
