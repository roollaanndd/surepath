# SurePath — Security Policy

**Version:** 1.1  
**Date:** June 2026  
**Classification:** Internal

---

## 1. Authentication & Authorization

### 1.1 Customer / Agent Login
- Google OAuth via Supabase GoTrue PKCE flow — `code_verifier` stored in localStorage, URL cleaned after exchange to prevent state replay
- Email OTP (passwordless) as fallback — `shouldCreateUser: false` (no enumeration)
- Session persisted in `sessionStorage` only (cleared on tab close); wallet-sensitive operations re-validate JWT

### 1.2 Admin Login
- Separate `AdminLogin` route — blocked from viewing main app login even when an agent is already authenticated
- Admin routes (`/admin`, `/admin/*`) only accessible to roles: `MASTER_ADMIN, ADMIN, FINANCE, FINANCE_MANAGER, FINANCE_DIRECTOR, INSURANCE_ADMIN`
- `VITE_ADMIN_KEY` demo bypass: env-only, never committed to source, set manually in Vercel Dashboard

### 1.3 Insurer Portal
- Magic-link auth: 24h expiring token, single-use (`used_at` set on first validation)
- Token stored in `sp_insurer_auth_tokens` table with RLS (`service_role` only for insert/read)
- Portal loads via `?token=` URL parameter — never stored in localStorage

---

## 2. Database Security (Supabase)

### 2.1 Row-Level Security (RLS)
- All tables have RLS enabled
- Customers: can only read/write their own rows (`auth.uid() = user_id`)
- Agents: can read their own clients, policies, commissions, orders
- Admins: service_role bypass for management operations
- `sp_wallet_transactions`: append-only — no UPDATE or DELETE policies exist at any role

### 2.2 Financial Operations
- Wallet balance mutations: handled exclusively by `SECURITY DEFINER` SQL functions called via `supabase.rpc()` — no direct UPDATE allowed
- `credit_agent_wallet(agent_id, amount, description)` — only callable by service_role
- `request_withdrawal_deduct(agent_id, amount)` — atomically checks balance before deducting
- Override commissions: triggered server-side in `xendit-webhook` edge function, not client-initiated

### 2.3 Secrets Management
- `SUPABASE_SERVICE_ROLE_KEY` — never in source code or client bundle; only used inside edge functions via `Deno.env.get()`
- `XENDIT_API_KEY` — Supabase Vault only; fetched at runtime in `create-xendit-invoice` and `xendit-disburse`
- `XENDIT_WEBHOOK_TOKEN` — Supabase Vault; xendit-webhook returns 500 if missing (fail-closed)
- `RESEND_API_KEY` — Supabase Edge Function secrets
- `VITE_ADMIN_KEY` — Vercel Environment Variables only
- `SUPABASE_ANON_KEY` — intentionally public (designed for client-side use, all data access gated by RLS)

---

## 3. Edge Function Security

### 3.1 Webhook Security (xendit-webhook)
- Validates `x-callback-token` header against Vault token
- Returns `500` if token unconfigured (fail-closed — no bypass when secret missing)
- Returns `401` on token mismatch
- No unauthenticated paths into payment processing

### 3.2 AI Proxy (ai-proxy)
- All LLM API keys server-side only — not in browser bundle
- Client sends Supabase anon JWT; function validates and proxies to OpenRouter
- No API keys exposed in Vite build output

### 3.3 SSRF Prevention (submit-policy-insurer)
- `isAllowedEndpoint()` whitelist check: only HTTPS endpoints outside RFC-1918 / loopback ranges allowed
- Blocks `169.254.x.x`, `10.x.x.x`, `172.16.x.x`, `192.168.x.x`, `127.x.x.x`, `::1`

### 3.4 OCR Scan (ocr-scan)
- Input size limit: `image_base64.length > 5MB` → `413 Payload Too Large`
- `doc_type` validated against enum (`KTP`, `STNK`) before processing

### 3.5 Email Injection Prevention (send-insurer-email)
- All user-controlled string interpolations HTML-escaped (`&`, `<`, `>`, `"`, `'`)
- Prevents XSS in email clients

---

## 4. File Upload Security

### 4.1 Extension Whitelist
- Vehicle images: `jpg`, `jpeg`, `png`, `webp`, `heic`
- Policy documents: `pdf` only
- Logo/section images: `jpg`, `jpeg`, `png`, `webp`, `heic`
- Extensions outside whitelist replaced with safe default — no rejection of form, but malicious extension cannot be stored

### 4.2 Storage Buckets
- `vehicle-images` — customer-write, insurer-read, admin-read
- `policy-documents` — insurer-write, customer-read (own), admin-read
- `website-assets` — admin-write only

---

## 5. Android App Security

- `com.myinsurepath.os://` deep link scheme registered in `AndroidManifest.xml` for OAuth callback
- No sensitive data stored in SharedPreferences or local Android storage
- Capacitor bridge follows Capacitor security guidelines — no `allowAllOrigins` in `CapacitorConfig`

---

## 6. Data Privacy (UU PDP / GDPR-equivalent)

- Customer PII (name, KTP, phone, vehicle plate) stored only in Supabase with RLS
- Vehicle photos stored in private Supabase bucket with signed URLs
- Email addresses never logged to console in production
- Right to deletion: admin can delete customer record via admin portal (cascade deletes orders via FK)

---

## 7. Incident Response

### 7.1 Credential Compromise
1. Rotate compromised key immediately in Supabase/Vercel/Xendit dashboard
2. Review audit logs for anomalous calls in the 24h prior to discovery
3. Notify affected users if PII was accessed
4. Post-mortem within 48h

### 7.2 Payment Fraud
1. Disable `xendit-webhook` edge function immediately via Supabase dashboard
2. Freeze pending withdrawals via admin portal
3. Contact Xendit support with transaction IDs

### 7.3 Unauthorized Admin Access
1. Revoke all active Supabase sessions for affected account
2. Rotate `VITE_ADMIN_KEY`
3. Review `sp_admin_notifications` audit trail

---

## 8. Known Limitations & Roadmap

| Issue | Severity | Target |
|-------|----------|--------|
| OTP endpoint has no rate limiting | MEDIUM | Phase 1 |
| Admin accounts have no MFA | MEDIUM | Phase 1 |
| No centralised audit log table | MEDIUM | Phase 1 |
| Bank code validation on withdrawal | LOW | Phase 1 |
| Insurer token race condition (atomic mark-used) | MEDIUM | Phase 2 |
| CORS wildcard on browser-facing edge functions | LOW | Phase 2 |
| Structured logging (vs console.log) | LOW | Phase 2 |
