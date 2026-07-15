#!/usr/bin/env node
/**
 * apply-migration.js — Apply DB migration via Supabase REST API
 * 
 * Usage:
 *   node scripts/apply-migration.js
 * 
 * Requires env vars (set in .env.local or export before running):
 *   VITE_SUPABASE_URL=https://your-project.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
 * 
 * The service role key is in your Supabase Dashboard:
 *   Settings → API → service_role secret
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('');
  console.error('Set these before running:');
  console.error('  export VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.error('');
  console.error('Find your service role key at:');
  console.error('  Supabase Dashboard → Settings → API → service_role secret');
  process.exit(1);
}

const migrationFile = path.join(__dirname, '..', 'supabase', 'migrations', '20260714_integrity_hardening.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

console.log('📋 Applying migration: 20260714_integrity_hardening.sql');
console.log(`   Target: ${SUPABASE_URL}`);
console.log(`   SQL length: ${sql.length} chars`);
console.log('');

// Supabase provides a /rest/v1/rpc endpoint, but for raw SQL we use the pg-meta endpoint
// POST https://your-project.supabase.co/pg/query
const endpoint = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;

async function applyMigration() {
  try {
    // Method 1: Try via Supabase's built-in pg-meta endpoint
    const response = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Migration applied successfully!');
      console.log('   Result:', JSON.stringify(result).slice(0, 200));
    } else {
      const errorText = await response.text();
      console.error(`❌ HTTP ${response.status}: ${errorText}`);
      
      // Method 2: Try via /rest/v1/rpc (requires a custom function)
      console.log('');
      console.log('Trying alternative method...');
      const altResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY,
        },
        body: JSON.stringify({ sql_text: sql }),
      });
      
      if (altResponse.ok) {
        console.log('✅ Migration applied via RPC!');
      } else {
        console.error('❌ Both methods failed.');
        console.error('');
        console.error('Please apply manually via Supabase Dashboard:');
        console.error('  1. Open Supabase Dashboard → SQL Editor');
        console.error('  2. Copy contents of: supabase/migrations/20260714_integrity_hardening.sql');
        console.error('  3. Paste and click Run');
      }
    }
  } catch (e) {
    console.error('❌ Network error:', e.message);
    console.error('');
    console.error('Please apply manually via Supabase Dashboard → SQL Editor');
  }
}

applyMigration();
