
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
  tpl: number; // 0, 10, 20, 30, 40, 50 (Millions)
  paDriver: number; // Sum Insured
  paPassenger: number; // Sum Insured per passenger
  passengers: number; // Number of passengers
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
}

export interface UserState {
  name: string;
  ktp: string;
  domicile: string;
  email: string;
  phone: string;
  isMember: boolean;
}

export interface Quote {
  provider: string;
  logo: string;
  basePremium: number;
  expansionPremium: number;
  totalPremium: number;
  rating: number;
  workshops: number;
  branches: number;
  features: string[];
  planName?: string; // For Travel/PA
}

// --- TRAVEL INSURANCE TYPES ---
export type TravelRegion = 'DOMESTIC' | 'INTERNATIONAL';
export type TravelType = 'INDIVIDUAL' | 'FAMILY';

export interface TravelState {
  destination: string;
  region: TravelRegion;
  startDate: string;
  endDate: string;
  type: TravelType;
  travelersCount: number;
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
