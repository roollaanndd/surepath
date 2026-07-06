// Barrel re-export — keeps backward compatibility with all existing imports.
//
// The original 2,720-line monolith has been split into domain-specific files:
//   - db.ts            supabase client + callGateway helper
//   - dbTypes.ts       all TypeScript interfaces/types
//   - users.ts         agent/user profile + admin user management
//   - clients.ts       sp_clients CRUD
//   - orders.ts        policy orders, policies, renewals, endorsements, life
//                      applications, payments, admin stats
//   - commissions.ts   commissions, quotes, leaderboard, agent stats, demo seed
//   - claims.ts        claims
//   - notifications.ts agent + admin notifications
//   - storage.ts       file uploads + signed-URL resolution
//   - insurers.ts      insurers, insurer products, product configs, OJK rates,
//                      vehicle overrides
//   - wallet.ts        wallet, withdrawals, coin ledger, downlines/referrals,
//                      tier config
//   - agreements.ts    agent legal agreements + TnC acceptance
//   - website.ts       website CMS, traffic, online users, security stats,
//                      insurer portal auth, review tokens, AI reviews, promo
//                      codes, Pathy chat, B2B submissions/quotes
//
// Every existing `import { X } from '...services/supabaseService'` continues
// to work because this file re-exports the union of all of the above.

export * from './db';
export * from './dbTypes';
export * from './users';
export * from './clients';
export * from './orders';
export * from './commissions';
export * from './claims';
export * from './notifications';
export * from './storage';
export * from './insurers';
export * from './wallet';
export * from './agreements';
export * from './website';
