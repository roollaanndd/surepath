
import { Dexie, type Table } from 'dexie';
import { UserRole } from './types';
import { hashPassword } from './services/authService';

// --- DB INTERFACES ---

export interface User {
  id?: number;
  email: string;
  name: string;
  phone: string;
  passwordHash?: string;
  salt?: string;
  role: UserRole;
  nodeId: string;
  ktp?: string;
  address?: string;
  trustScore: number;
  memberSince: string;
  verified: boolean;
}

export interface Policy {
  id?: number;
  userId: number;
  type: 'CAR' | 'TRAVEL' | 'PA' | 'MPAR';
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED';
  startDate: string;
  endDate: string;
  premium: number;
  coverageDetails: any; // Menyimpan data input wizard (Vehicle, KYC, Survey)
  providerId: string;
  policyNumber: string;
  createdAt: string;
}

export interface Claim {
  id?: number;
  policyId?: number;
  userId: number;
  date: string;
  time: string;
  location: string;
  chronology: string;
  thirdPartyInvolved: boolean;
  status: 'SUBMITTED' | 'ANALYZING' | 'APPROVED' | 'REJECTED' | 'PAID';
  amountEstimated: number;
  amountApproved?: number;
  photos: string[]; // Base64 strings
  aiAnalysis?: any;
  createdAt: string;
}

export interface Transaction {
  id?: number;
  userId: number;
  type: 'PAYMENT' | 'COMMISSION' | 'WITHDRAWAL' | 'CLAIM_PAYOUT' | 'POINTS';
  amount: number;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  description: string;
  date: string;
  referenceId?: string;
}

export class SurePathDB extends Dexie {
  users!: Table<User, number>;
  policies!: Table<Policy, number>;
  claims!: Table<Claim, number>;
  transactions!: Table<Transaction, number>;

  constructor() {
    super('SurePathDB');
    // Fix: Access version method through cast to any to resolve property/method name conflict in TypeScript
    (this as any).version(3).stores({
      users: '++id, &email, nodeId, role, verified',
      policies: '++id, userId, type, status, policyNumber, createdAt',
      claims: '++id, userId, policyId, status, createdAt',
      transactions: '++id, userId, type, date, referenceId'
    });
  }
}

export const db = new SurePathDB();

export const seedDatabase = async () => {
  const count = await db.users.count();
  if (count === 0) {
    const adminCreds = await hashPassword('admin');
    const userCreds = await hashPassword('user');

    await db.users.bulkAdd([
      {
        name: 'Chief Neural Architect',
        email: 'master@surepath.ai',
        phone: '08110000000',
        passwordHash: adminCreds.hash,
        salt: adminCreds.salt,
        role: UserRole.MASTER_ADMIN,
        nodeId: 'SP-CORE-000',
        trustScore: 100,
        memberSince: '2023-01-01T00:00:00.000Z',
        verified: true
      },
      {
        name: 'SurePath Operations Manager',
        email: 'admin@surepath.ai',
        phone: '08110000001',
        passwordHash: adminCreds.hash,
        salt: adminCreds.salt,
        role: UserRole.ADMIN,
        nodeId: 'SP-OPS-001',
        trustScore: 100,
        memberSince: '2023-06-15T00:00:00.000Z',
        verified: true
      },
      {
        name: 'Head of Finance & Treasury',
        email: 'finance@surepath.ai',
        phone: '08110000002',
        passwordHash: adminCreds.hash,
        salt: adminCreds.salt,
        role: UserRole.FINANCE,
        nodeId: 'SP-FIN-001',
        trustScore: 100,
        memberSince: '2023-03-10T00:00:00.000Z',
        verified: true
      },
      {
        name: 'Zurich Partnership Admin',
        email: 'zurich@surepath.ai',
        phone: '08110000003',
        passwordHash: adminCreds.hash,
        salt: adminCreds.salt,
        role: UserRole.INSURANCE_ADMIN,
        nodeId: 'SP-INS-ZUR-01',
        trustScore: 100,
        memberSince: '2024-01-20T00:00:00.000Z',
        verified: true
      },
      {
        name: 'Budi (Premier Agent)',
        email: 'agent@surepath.ai',
        phone: '081298765432',
        passwordHash: adminCreds.hash,
        salt: adminCreds.salt,
        role: UserRole.AGENT,
        nodeId: 'SP-AGENT-007',
        trustScore: 98,
        memberSince: '2024-02-14T00:00:00.000Z',
        verified: true
      },
      {
        name: 'Ahmad Sholihin (Member)',
        email: 'user@surepath.ai',
        phone: '081122334455',
        passwordHash: userCreds.hash,
        salt: userCreds.salt,
        role: UserRole.CUSTOMER,
        nodeId: 'SP-NODE-101',
        trustScore: 85,
        memberSince: '2024-11-12T00:00:00.000Z',
        verified: true,
        ktp: '3275000000000001',
        address: 'Jl. AI Tech Park, Jakarta Selatan'
      }
    ]);
  }
};
