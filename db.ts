// Added comment above fix
// Fix: Use named import for Dexie to ensure proper class inheritance and visibility of instance methods like version() in TypeScript.
import { Dexie, type Table } from 'dexie';
import { UserRole, Provider } from './types';
import { hashPassword } from './services/authService';
import { INSURANCE_PROVIDERS } from './constants';

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
  coverageDetails: any; 
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
  photos: string[]; 
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

export interface AuditLog {
  id?: number;
  timestamp: string;
  actor: string;
  action: string;
  domain: 'INVENTORY' | 'FINANCE' | 'OPERATIONS' | 'SECURITY';
  payload: string;
}

export interface DBProvider extends Provider {
    id: string; // override for dexie
    isActive: boolean;
}

export class SurePathDB extends Dexie {
  users!: Table<User, number>;
  policies!: Table<Policy, number>;
  claims!: Table<Claim, number>;
  transactions!: Table<Transaction, number>;
  auditLogs!: Table<AuditLog, number>;
  providers!: Table<DBProvider, string>;

  constructor() {
    super('SurePathDB');
    // Added comment above fix
    // Fix: The version method is inherited from the Dexie base class; defining the schema for the database version.
    this.version(5).stores({
      users: '++id, &email, nodeId, role, verified',
      policies: '++id, userId, type, status, policyNumber, createdAt',
      claims: '++id, userId, policyId, status, createdAt',
      transactions: '++id, userId, type, date, referenceId',
      auditLogs: '++id, timestamp, actor, domain, action',
      providers: 'id, name, isActive'
    });
  }
}

export const db = new SurePathDB();

export const logAdminAction = async (actor: string, domain: any, action: string, payload: any) => {
    await db.auditLogs.add({
        timestamp: new Date().toISOString(),
        actor,
        domain,
        action,
        payload: JSON.stringify(payload)
    });
};

export const seedDatabase = async () => {
  const userCount = await db.users.count();
  if (userCount === 0) {
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
        name: 'Financial Controller',
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
        name: 'Ahmad Sholihin',
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

  const providerCount = await db.providers.count();
  if (providerCount === 0) {
      const dbProviders: DBProvider[] = INSURANCE_PROVIDERS.map(p => ({
          ...p,
          isActive: true
      }));
      await db.providers.bulkAdd(dbProviders);
  }
};