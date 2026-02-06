
export enum Language {
  EN = 'EN',
  ID = 'ID'
}

export enum UserRole {
  MASTER_ADMIN = 'MASTER_ADMIN',
  ADMIN = 'ADMIN', // SurePath Admin
  FINANCE = 'FINANCE',
  INSURANCE_ADMIN = 'INSURANCE_ADMIN',
  AGENT = 'AGENT',
  CUSTOMER = 'CUSTOMER'
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
  srcc: boolean; 
  terrorism: boolean;
  authorizedWorkshop: boolean; // +0.2% rate
  tpl: number; // TPL Amount in IDR
  paDriver: boolean;
  paPassenger: boolean;
}

export interface VehiclePhotos {
  stnk: string | null;
  carFront: string | null;
  carBack: string | null;
  carLeft: string | null;
  carRight: string | null;
  interior: string | null;
}

export interface Provider {
  id: string;
  name: string;
  logo: any;
  adminFee: number;
  stampDuty: number;
  rating: number;
  advantages?: string[];
  disadvantages?: string[];
  extraCoinsPercent?: number;
  features?: string[];
}

export interface VehicleState {
  brand: string;
  model: string;
  isOther: boolean;
  year: number;
  price: number;
  manualPrice: boolean;
  plate: string;
  region: '1' | '2' | '3';
  usage: 'PRIVATE' | 'COMMERCIAL' | 'DINAS';
  condition: 'NEW' | 'USED';
}

export interface UserState {
  name: string;
  ktpNo: string;
  email: string;
  phone: string;
  address: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  recipientName: string;
  deliveryMethod: 'WHATSAPP' | 'EMAIL' | 'HARDCOPY';
  ktpPhoto: string | null;
}

export interface Review {
  id: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  date: string;
  sentimentScore: number;
  aiTag: string;
}

export type TravelRegion = 'INTERNATIONAL' | 'DOMESTIC' | 'INBOUND';
export type TravelPlanType = 'PLATINUM' | 'GOLD' | 'ASIA_EXTRA' | 'GARUDA_1' | 'GARUDA_2';

export interface TravelerDetails {
  name: string;
  ktp: string;
  birthDate: string;
  passportNo?: string;
  isMain: boolean;
}

export interface TravelState {
  destination: string;
  region: TravelRegion;
  startDate: string;
  endDate: string;
  duration: number;
  tripType: 'SINGLE' | 'ANNUAL';
  participantType: 'INDIVIDUAL' | 'FAMILY';
  travelers: {
    adults: number;
    children: number;
    details: TravelerDetails[];
  };
  selectedPlan: TravelPlanType | null;
}

export interface PAState {
  category: 'GENERAL' | 'STUDENT';
  planCode: string;
  beneficiaryName: string;
  beneficiaryRelation: string;
}

export interface PetState {
  petType: 'DOG' | 'CAT';
  petName: string;
  breed: string;
  age: number;
  microchipNo?: string;
  selectedPlan: string | null;
}

export type MPARCategory = 'ELECTRONIC' | 'GADGET' | 'FURNITURE';

export interface MPARState {
  category: MPARCategory;
  subCategory: 'TV' | 'NON-TV' | 'SMARTPHONE' | 'LAPTOP' | 'FURNITURE_CORE';
  itemName: string;
  itemPrice: number;
  itemAge: number;
  serialNumber: string;
  periodMonths: 6 | 12;
}
