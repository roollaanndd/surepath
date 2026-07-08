// Added comment above fix
// Fix: Use named import for Dexie to ensure proper class inheritance and visibility of instance methods like version() in TypeScript.
import { Dexie, type Table } from 'dexie';
import { UserRole, Provider } from './types';
import { hashPassword } from './services/authService';
import { INSURANCE_PROVIDERS } from './constants';

// --- DB INTERFACES ---

export interface User {
  id?: any;
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
  id?: any;
  userId: any;
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
  id?: any;
  policyId?: any;
  policyNumber?: string;
  contactInfo?: string;
  userId: any;
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
  id?: any;
  userId: any;
  type: 'PAYMENT' | 'COMMISSION' | 'WITHDRAWAL' | 'CLAIM_PAYOUT' | 'POINTS';
  amount: number;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  description: string;
  date: string;
  referenceId?: string;
}

export interface AuditLog {
  id?: any;
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

export interface CustomProduct {
  id?: any;
  name: string;
  type: string; // e.g., 'INSURANCE', 'SERVICES'
  isActive: boolean;
  basePremium: number;
  rate?: number;
  description: string;
  icon?: string;
  color?: string;
  bg?: string;
}

export interface WebsiteSection {
  id?: any;
  sectionKey: string; // 'hero' | 'marquee' | 'products' | 'claims' | 'stats' | 'testimonials' | 'footer'
  headline?: string;
  subtitle?: string;
  ctaText?: string;
  ctaSecondaryText?: string;
  bgType: 'animated-mesh' | 'gradient' | 'solid' | 'image' | 'none';
  bgValue?: string;
  isVisible: boolean;
  updatedAt: string;
}

export class SurePathDB extends Dexie {
  users!: Table<User, any>;
  policies!: Table<Policy, any>;
  claims!: Table<Claim, any>;
  transactions!: Table<Transaction, any>;
  auditLogs!: Table<AuditLog, any>;
  providers!: Table<DBProvider, string>;
  customProducts!: Table<CustomProduct, any>;
  websiteConfig!: Table<WebsiteSection, any>;

  constructor() {
    super('SurePathDB');
    const baseStores = {
      users: '++id, &email, nodeId, role, verified',
      policies: '++id, userId, type, status, policyNumber, createdAt',
      claims: '++id, userId, policyId, status, createdAt',
      transactions: '++id, userId, type, date, referenceId',
      auditLogs: '++id, timestamp, actor, domain, action',
      providers: 'id, name, isActive',
      customProducts: '++id, name, type, isActive',
    };
    this.version(6).stores(baseStores);
    this.version(7).stores({
      ...baseStores,
      websiteConfig: '++id, &sectionKey, isVisible, updatedAt',
    });
  }
}

export const db = new SurePathDB();

db.on('populate', () => {
  console.warn('Database populated');
});

db.open().catch(err => {
  console.error('Failed to open database:', err.stack || err);
});

export const logAdminAction = async (actor: string, domain: any, action: string, payload: any) => {
    await db.auditLogs.add({
        timestamp: new Date().toISOString(),
        actor,
        domain,
        action,
        payload: JSON.stringify(payload)
    });
};

let isSeeding = false;

export const seedDatabase = async () => {
  if (isSeeding) return;
  isSeeding = true;
  try {
    const isMigrated = localStorage.getItem('SP_DB_MIGRATED_v2');
    // Guard: never wipe if master admin already exists (protects against localStorage clear)
    const adminExists = await db.users.where('email').equals('master@surepath.ai').first();

    // SECURITY: IndexedDB demo seeding is DEV-only. In production, all auth
    // goes through Supabase — there's no reason to seed 3,000 demo users or
    // local admin credentials into the browser. The previous code used
    // VITE_ADMIN_KEY (which Vite statically substitutes into the client
    // bundle, exposing it to anyone) to seed master@surepath.ai with a
    // known password — that path is now blocked in AdminLogin.tsx.
    if (import.meta.env.DEV && !isMigrated && !adminExists) {
      await db.users.clear();

      const adminCreds = await hashPassword(import.meta.env.VITE_ADMIN_KEY || 'dev-only-admin-password');
      const userCreds = await hashPassword('user');

      const FIRST_NAMES = ["Budi", "Siti", "Anton", "Dewi", "Agus", "Ayu", "Eko", "Putri", "Wawan", "Sari", "Rudi", "Rina", "Dwi", "Sri", "Hadi", "Yuni", "Joko", "Tari", "Iwan", "Lestari", "Andi", "Maya", "Deni", "Nita", "Hendra", "Sisca", "Fajar", "Dian"];
      const LAST_NAMES = ["Santoso", "Wijaya", "Kusuma", "Lestari", "Pratama", "Hidayat", "Saputra", "Wahyudi", "Kurniawan", "Setiawan", "Utama", "Purnama", "Suryono", "Handayani", "Wibowo", "Nugroho"];
      
      const newUsers: User[] = [
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
        },
        {
          name: 'Ahmad Rizki Pratama',
          email: 'agent@surepath.ai',
          phone: '081234567890',
          passwordHash: userCreds.hash,
          salt: userCreds.salt,
          role: UserRole.AGENT,
          nodeId: 'SP-AGT-001',
          trustScore: 92,
          memberSince: '2024-01-01T00:00:00.000Z',
          verified: true,
          ktp: '3175000000000001',
          address: 'Jl. Sudirman No.1, Jakarta'
        }
      ];

      for (let i = 0; i < 3000; i++) {
         const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
         const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
         newUsers.push({
            name: `${first} ${last}`,
            email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@gmail.com`,
            phone: `08${Math.floor(1000000000 + Math.random() * 9000000000)}`,
            role: UserRole.CUSTOMER,
            nodeId: `SP-NODE-${4000 + i}`,
            trustScore: 60 + Math.floor(Math.random() * 40),
            memberSince: new Date(2023 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 12), 1).toISOString(),
            verified: true,
            passwordHash: userCreds.hash,
            salt: userCreds.salt
         });
      }

      await db.users.bulkAdd(newUsers).catch(e => console.warn('Seeding users failed:', e));
    }

    // Re-sync admin password only in DEV when VITE_ADMIN_KEY is explicitly set.
    // Production builds skip this entirely (no admin password in the bundle).
    if (import.meta.env.DEV) {
      const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY;
      if (ADMIN_KEY) {
        const freshCreds = await hashPassword(ADMIN_KEY);
        const ADMIN_EMAILS = ['master@surepath.ai', 'finance@surepath.ai'];
        for (const email of ADMIN_EMAILS) {
          const adminUser = await db.users.where('email').equals(email).first();
          if (adminUser) {
            await db.users.update(adminUser.id, { passwordHash: freshCreds.hash, salt: freshCreds.salt });
          }
        }
      }
    }

    const txCount = await db.transactions.count();
    // Only seed transactions on first-ever run, not when count is 0 (could be real empty state)
    const needsMigration = !localStorage.getItem('SP_DB_MIGRATED_v2') && !adminExists;

    if (needsMigration || txCount === 0) {
       await db.transactions.clear(); 
       const userDocs = await db.users.where('role').equals('CUSTOMER').toArray();
       const userIds = userDocs.map(u => u.id);
       
       const bulkTransactions: Transaction[] = [];
       const years = [2023, 2024, 2025, 2026];
       const USD_RATE = 16000;
       
       const YEARLY_USD_GWP = {
          2023: 1131141,
          2024: 1826982,
          2025: 2651782,
          2026: 3000000 // Run rate for 2026
       };

       let txCounter = 1;
       const today = new Date();

       years.forEach(year => {
           // Target MRR IDR for this specific year
           const baseMrrIDR = (YEARLY_USD_GWP[year as keyof typeof YEARLY_USD_GWP] * USD_RATE) / 12;
           
           for (let month = 0; month < 12; month++) {
              // Ensure we don't generate transactions in the future
              if (year === today.getFullYear() && month > today.getMonth()) break;

              // Up and down pattern
              const monthMultiplier = 1 + (Math.sin(month) * 0.15) + (Math.random() * 0.1 - 0.05);
              let targetRevenue = baseMrrIDR * monthMultiplier;
              
              // If it's the current month, prorate the target revenue up to the current day
              if (year === today.getFullYear() && month === today.getMonth()) {
                 const daysInMonth = new Date(year, month + 1, 0).getDate();
                 targetRevenue = targetRevenue * (today.getDate() / daysInMonth);
              }

              let currentRevenue = 0;

              // 120-160 active users this month
              const activeUserCount = 120 + Math.floor(Math.random() * 40);
              const activeUsers = [...userIds].sort(() => 0.5 - Math.random()).slice(0, activeUserCount);

              // Distribute transactions to hit the target revenue
              while (currentRevenue < targetRevenue) {
                 for (const activeUserId of activeUsers) {
                    if (currentRevenue >= targetRevenue) break;

                    // Min 300 USD (4.8M IDR) per tx, up to 1200 USD
                     const txUsd = 300 + Math.floor(Math.random() * 900);
                     const txIdr = txUsd * USD_RATE;
                     currentRevenue += txIdr;

                     // Ensure the generated day is not in the future for the current month
                     let maxDay = new Date(year, month + 1, 0).getDate();
                     if (year === today.getFullYear() && month === today.getMonth()) {
                        maxDay = today.getDate();
                     }
                     const day = 1 + Math.floor(Math.random() * maxDay);
                     
                     // Format date ensuring proper output (fix timezone issues by using mid-day UTC)
                     const txDate = new Date(Date.UTC(year, month, day, 12, 0, 0)).toISOString();
                     
                     bulkTransactions.push({
                        userId: activeUserId,
                        type: 'PAYMENT',
                        amount: txIdr,
                        status: 'SUCCESS',
                        description: `Pembelian Polis #${100000 + txCounter}`,
                        date: txDate,
                        referenceId: `TX-POL-${year}-${month}-${txCounter}`
                     });

                     bulkTransactions.push({
                        userId: activeUserId,
                        type: 'COMMISSION',
                        amount: txIdr * 0.25,
                        status: 'SUCCESS',
                        description: `Distribusi Komisi #${100000 + txCounter}`,
                        date: txDate,
                        referenceId: `TX-COM-${year}-${month}-${txCounter}`
                     });

                     txCounter++;

                     // 5% chance of a claim (random amount)
                     if (Math.random() < 0.05) {
                         const claimAmount = txIdr * (1 + Math.random() * 2); // Random claim magnitude
                         bulkTransactions.push({
                            userId: activeUserId,
                            type: 'CLAIM_PAYOUT',
                            amount: claimAmount,
                            status: 'SUCCESS',
                            description: `Pembayaran Klaim #${80000 + txCounter}`,
                            date: txDate,
                            referenceId: `TX-CLM-${year}-${month}-${txCounter}`
                         });
                         txCounter++;
                     }
                 }
              }
           }
       });

       // Chunk and add
       const chunkSize = 5000;
       for (let i = 0; i < bulkTransactions.length; i += chunkSize) {
          await db.transactions.bulkAdd(bulkTransactions.slice(i, i + chunkSize)).catch(e => console.warn('Tx seed failed', e));
       }

       localStorage.setItem('SP_DB_MIGRATED_v2', 'true');
    }

    const providerCount = await db.providers.count();
    if (providerCount === 0) {
        const dbProviders: DBProvider[] = INSURANCE_PROVIDERS.map(p => ({
            ...p,
            isActive: true
        }));
        await db.providers.bulkAdd(dbProviders).catch(e => console.warn('Seeding providers failed:', e));
    }
  } finally {
    isSeeding = false;
  }
};