import { UserRole, Provider, User, Policy, Transaction, Claim, AuditLog, DBProvider, CustomProduct } from './types';
import { hashPassword } from './services/authService';
import { INSURANCE_PROVIDERS } from './constants';
import { collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, where, getCountFromServer, writeBatch, limit, orderBy } from 'firebase/firestore';
import { db as firestore } from './firebase';

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

// --- FIREBASE ADAPTER (Mimics Dexie Table API) ---

class FirebaseQuery {
    collectionName: string;
    collRef: any;
    queries: any[];

    constructor(collectionName: string, queries: any[] = []) {
        this.collectionName = collectionName;
        this.collRef = collection(firestore, collectionName);
        this.queries = queries;
    }

    where(field: string) {
        return {
            equals: (val: any) => {
                if (val === 'true') val = true;
                if (val === 'false') val = false;
                return new FirebaseQuery(this.collectionName, [...this.queries, where(field, '==', val)]);
            }
        };
    }
    
    reverse() {
       return this; // mock
    }

    async toArray() {
        let q = this.collRef;
        if (this.queries.length > 0) {
            // Apply standard queries, max 1000 to save client memory
            q = query(this.collRef, ...this.queries, limit(1000));
        } else {
            q = query(this.collRef, limit(1000));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async first() {
         let q = this.collRef;
         if (this.queries.length > 0) {
             q = query(this.collRef, ...this.queries, limit(1));
         } else {
             q = query(this.collRef, limit(1));
         }
         const snapshot = await getDocs(q);
         if (snapshot.empty) return undefined;
         const d = snapshot.docs[0];
         return { id: d.id, ...d.data() };
    }

    async count() {
         let q = this.collRef;
         if (this.queries.length > 0) {
             q = query(this.collRef, ...this.queries);
         }
         const snap = await getCountFromServer(q);
         return snap.data().count;
    }

    async add(data: any) {
        const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
        const docRef = await addDoc(this.collRef, cleanData);
        return docRef.id;
    }

    async bulkAdd(dataArray: any[]) {
        const chunks = [];
        // Max 500 writes per batch in firestore, using 400 for safety
        for (let i = 0; i < dataArray.length; i += 400) {
            chunks.push(dataArray.slice(i, i + 400));
        }
        
        for (const chunk of chunks) {
            const batch = writeBatch(firestore);
            for (const item of chunk) {
                const cleanData = Object.fromEntries(Object.entries(item).filter(([_, v]) => v !== undefined));
                const docRef = doc(collection(firestore, this.collectionName));
                batch.set(docRef, cleanData);
            }
            await batch.commit();
            await new Promise(resolve => setTimeout(resolve, 500)); // Delay to prevent connection overload
        }
    }

    async update(id: string, data: any) {
        if (!id) return;
        const docRef = doc(firestore, this.collectionName, id.toString());
        await updateDoc(docRef, data);
    }

    async get(id: string | number) {
        if (!id) return undefined;
        const docRef = doc(firestore, this.collectionName, id.toString());
        const snap = await getDoc(docRef);
        if (snap.exists()) return { id: snap.id, ...snap.data() };
        return undefined;
    }

    async clear() {
        // No-op for safety in production
    }
}

class SurePathFirebaseDB {
    users = new FirebaseQuery('users');
    policies = new FirebaseQuery('policies');
    claims = new FirebaseQuery('claims');
    transactions = new FirebaseQuery('transactions');
    auditLogs = new FirebaseQuery('auditLogs');
    providers = new FirebaseQuery('providers');
    customProducts = new FirebaseQuery('customProducts');

    async on(event: string, callback: () => void) {}
    
    async open() { return Promise.resolve(); }
}

export const db = new SurePathFirebaseDB();

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
        const userCount = await db.users.count();
        if (userCount === 0) {
            console.log("Seeding Database into Firebase...");
            const adminCreds = await hashPassword('admin');
            const userCreds = await hashPassword('user');
            
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
                memberSince: new Date('2023-01-01').toISOString(),
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
                memberSince: new Date('2024-11-12').toISOString(),
                verified: true,
                ktp: '3275000000000001',
                address: 'Jl. AI Tech Park, Jakarta Selatan'
              }
            ];

            const FIRST_NAMES = ["Budi", "Siti", "Anton", "Dewi", "Agus", "Ayu", "Eko", "Putri", "Wawan", "Sari", "Nina", "Bagas", "Didi", "Rini"];
            const LAST_NAMES = ["Santoso", "Wijaya", "Kusuma", "Lestari", "Pratama", "Hidayat", "Saputra", "Wahyudi", "Nugroho", "Gunawan"];
            
            // Generate limited users (200 instead of 3000 to save quota but show scale)
            for (let i = 0; i < 200; i++) {
               const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
               const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
               newUsers.push({
                  name: `${first} ${last}`,
                  email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@gmail.com`,
                  phone: `08${Math.floor(1000000000 + Math.random() * 9000000000)}`,
                  role: Math.random() > 0.8 ? UserRole.AGENT : UserRole.CUSTOMER,
                  nodeId: `SP-NODE-${4000 + i}`,
                  trustScore: 60 + Math.floor(Math.random() * 40),
                  memberSince: new Date(2023 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 12), 1).toISOString(),
                  verified: true,
                  passwordHash: userCreds.hash,
                  salt: userCreds.salt
               });
            }
            await db.users.bulkAdd(newUsers);
            console.log("Users seeded.");

            const activeUserDocs = await db.users.where('role').equals('CUSTOMER').toArray();
            const userIds = activeUserDocs.map((u: any) => u.id);

            const bulkTransactions: Transaction[] = [];
            const years = [2023, 2024, 2025, 2026];
            
            // Adjusting to target ~42.8 Miliar IDR in 2025
            // So monthly MRR for 2025 is ~3.5 Miliar = 3,500,000,000 IDR
            const YEARLY_TARGET_IDR = {
               2023: 15000000000, // 15 Miliar
               2024: 28000000000, // 28 Miliar
               2025: 42800000000, // 42.8 Miliar (Requested)
               2026: 55000000000  // 55 Miliar Run Rate
            };

            let txCounter = 1;
            const today = new Date();

            years.forEach(year => {
                const baseMrrIDR = YEARLY_TARGET_IDR[year as keyof typeof YEARLY_TARGET_IDR] / 12;
                
                for (let month = 0; month < 12; month++) {
                   if (year === today.getFullYear() && month > today.getMonth()) break;

                   let monthMultiplier = 1 + (Math.sin(month) * 0.15) + (Math.random() * 0.1 - 0.05);
                   let targetRevenue = baseMrrIDR * monthMultiplier;
                   
                   if (year === today.getFullYear() && month === today.getMonth()) {
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      targetRevenue = targetRevenue * (today.getDate() / daysInMonth);
                   }

                   let currentRevenue = 0;
                   let activeUserCount = 5 + Math.floor(Math.random() * 5); // smaller sample per month to save DB writes
                   let activeUsers = [...userIds].sort(() => 0.5 - Math.random()).slice(0, activeUserCount);

                   // We need fewer, but much larger transactions to hit the 42.8 Miliar cap without breaking 20k writes limit
                   // E.g., average transaction size 500 Juta to 1.5 Milyar IDR (Enterprise/Fleet Policies)
                   while (currentRevenue < targetRevenue && activeUsers.length > 0) {
                      for (const activeUserId of activeUsers) {
                         if (currentRevenue >= targetRevenue) break;

                          const txIdr = 250000000 + Math.floor(Math.random() * 500000000); // 250M to 750M IDR
                          currentRevenue += txIdr;

                          let maxDay = new Date(year, month + 1, 0).getDate();
                          if (year === today.getFullYear() && month === today.getMonth()) {
                             maxDay = today.getDate();
                          }
                          const day = Math.max(1, Math.floor(Math.random() * maxDay));
                          const txDate = new Date(Date.UTC(year, month, day, 12, 0, 0)).toISOString();
                          
                          bulkTransactions.push({
                             userId: activeUserId,
                             type: 'PAYMENT',
                             amount: txIdr,
                             status: 'SUCCESS',
                             description: `Pembelian Polis Asuransi Armada #${100000 + txCounter}`,
                             date: txDate,
                             referenceId: `TX-POL-${year}-${month}-${txCounter}`
                          });

                          bulkTransactions.push({
                             userId: activeUserId,
                             type: 'COMMISSION',
                             amount: txIdr * 0.15,
                             status: 'SUCCESS',
                             description: `Distribusi Komisi Agen #${100000 + txCounter}`,
                             date: txDate,
                             referenceId: `TX-COM-${year}-${month}-${txCounter}`
                          });

                          txCounter++;

                          if (Math.random() < 0.1) {
                              const claimAmount = txIdr * (Math.random() * 1.5);
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

            console.log(`Seeding ${bulkTransactions.length} transactions...`);
            await db.transactions.bulkAdd(bulkTransactions);
            console.log("Transactions seeded.");
        }

        const providerCount = await db.providers.count();
        if (providerCount === 0) {
            console.log("Seeding Providers into Firebase...");
            const dbProviders: DBProvider[] = INSURANCE_PROVIDERS.map(p => ({
                ...p,
                isActive: true
            }));
            await db.providers.bulkAdd(dbProviders);
        }
    } catch (e) {
        console.error("Firebase DB Seeding Error", e);
    } finally {
        isSeeding = false;
    }
};