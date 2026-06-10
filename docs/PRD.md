# SurePath — Product Requirements Document

**Version:** 2.1  
**Date:** 10 June 2026  
**Owner:** Product & Engineering Team  
**Status:** Active

> v2.1 changelog: auth/registration overhaul (self-service `ensure_profile` via data-gateway,
> agent self-registration fixed, native-app CORS), feature inventory & tech stack corrections.

---

## 1. Executive Summary

SurePath is Indonesia's AI-powered insurance distribution platform targeting the multi-trillion-rupiah general insurance market. The platform connects customers, licensed agents (AAUI), and institutional insurers through a unified digital stack — delivering instant quotes, AI-assisted underwriting, real-time claims, and an agent MLM commission network.

**Target:** $50M ARR by 2028, 100,000 active policies, 5,000 licensed agents on-platform.

---

## 2. Market Context

| Metric | Value |
|--------|-------|
| Indonesia general insurance GWP (2025) | ~IDR 120 trillion |
| Insurance penetration rate | ~1.6% of GDP (vs. 3–5% in Malaysia/Thailand) |
| Smartphone penetration | 73% of adult population |
| WhatsApp users | 175M+ |
| Primary distribution channel | Bancassurance + tied agents |

**Opportunity:** The market is under-digitised. Most Indonesian policies are still sold via paper-based agent networks. SurePath's digital-first, mobile-first approach targets the 40M uninsured middle class with affordable products and a frictionless purchase flow.

---

## 3. Product Vision

> "Every Indonesian — individual, family, or business — has access to the right insurance product in under 5 minutes, at a fair price, issued instantly."

---

## 4. User Personas

### 4.1 End Customer (Nasabah)
- Age 22–45, smartphone-native
- Owns a car, travels domestically, wants health coverage
- Values speed, transparency, and WhatsApp-level UX
- Pain: long agent calls, paper forms, weeks of waiting

### 4.2 Licensed Insurance Agent (Agen)
- Holds AAUI certification
- Manages 50–500 client relationships
- Wants productivity tools, real-time commissions, and downline management
- Pain: manual renewal tracking, slow insurer approval, commission disputes

### 4.3 B2B Corporate Client (Klien Korporat)
- HR manager / finance director at SME (50–500 employees)
- Needs fleet MV insurance, group health, surety bonds
- Wants single portal for all corporate policies, centralized invoicing
- Pain: relationship-dependent pricing, long negotiation cycles

### 4.4 Insurer PIC (Penanggung)
- Underwriter or ops manager at licensed insurer (OJK-regulated)
- Reviews incoming applications, sets pricing, issues policy documents
- Wants clean survey data, AI risk scores, digital document flow
- Pain: unstructured data from agents, manual data re-entry

### 4.5 Platform Admin
- SurePath operations/finance team
- Manages agent onboarding, commission disbursement, compliance reporting
- Wants automation, audit trails, OJK-ready reports

---

## 5. Current Feature Inventory

### 5.1 Retail Insurance (Nasabah)
| Feature | Status | Notes |
|---------|--------|-------|
| Car insurance wizard + AI scan | Live | OCR STNK, photo survey, AI damage score |
| Travel insurance | Live | Xendit payment, instant invoice |
| Personal accident (PA) | Live | — |
| Movable property (MPAR) | Live | — |
| Health insurance (individual) | Live | AI health chat + HealthChat advisor |
| Policy history dashboard | Live | Supabase-backed |
| Claims submission | Live | Photo upload, status tracking |
| Payment via Xendit | Live | VA, QRIS, e-wallet |
| Google OAuth login | Live | PKCE flow, custom domain |
| Email+password registration & login | Live | Auto profile creation via gateway `ensure_profile` (fixed 10 Jun 2026) |
| Email OTP / magic link login | Live | `signInWithOtp`, no user enumeration |
| Push notifications | Partial | In-app only, no native push yet |

### 5.2 Agent Portal
| Feature | Status | Notes |
|---------|--------|-------|
| Client CRM | Live | Add, edit, delete clients |
| Quote builder | Live | Multi-product, save to Supabase |
| Commission wallet | Live | Append-only ledger, service_role RPC |
| Withdrawal requests | Live | Manual approval + Xendit disbursement |
| Override commission (upline 3%) | Live | Triggered on xendit-webhook PAID |
| Agent leaderboard | Live | Rank by commission |
| Downline management | Live | Tree hierarchy |
| Referral code | Live | applyReferralCode() |
| Policy renewals tracking | Live | getExpiringOrders() |
| Endorsements | Live | Mid-term policy changes |
| Life insurance applications | Live | Full application form |
| Agent self-registration | Live | Fixed 10 Jun 2026 — real signUp + `ensure_profile`; agents start unverified pending admin approval |
| Capacitor Android app | Live (beta) | com.myinsurepath.os — gateway CORS for `https://localhost` fixed 10 Jun 2026 |

### 5.3 B2B Portal
| Feature | Status | Notes |
|---------|--------|-------|
| Corporate submission forms | Live | Fleet MV, Bonding, Group Health |
| Quote management | Live | Accept/reject insurer quotes |
| Submission status tracking | Live | With Indonesian labels |
| Document upload | Live | B2B documents |

### 5.4 Insurer Portal
| Feature | Status | Notes |
|---------|--------|-------|
| Magic-link dashboard auth | Live | 24h token, sp_insurer_auth_tokens |
| Order review dashboard | Live | KPI chips, filter tabs |
| Vehicle photo + AI score view | Live | — |
| Approve/reject with notifications | Live | Agent + admin notified |
| Policy PDF upload | Live | Marks order ISSUED |
| Customer/vehicle CSV export | Live | jsPDF survey report |
| Email notification on new order | Live | Resend API |

### 5.5 Admin Portal
| Feature | Status | Notes |
|---------|--------|-------|
| Orders management | Live | Full CRUD, status workflow |
| Agent management | Live | Verify, set commission rate |
| Claims review | Live | Admin notes |
| Insurer admin | Live | CRUD, admin_email for magic link |
| Product configuration | Live | Enable/disable products, pricing |
| AI finance review | Live | AI-generated P&L summary |
| AI policy review | Live | Risk scoring per order |
| Withdrawal approvals | Live | Manual approve/reject |
| Admin notifications | Live | Real-time sp_admin_notifications |
| Analytics overview | Live | Revenue, orders, agents |
| B2B management | Live | Status updates, quote creation |
| Life insurance management | Live | — |

---

## 6. Roadmap to Unicorn

### Phase 1 — Stability & Compliance (Q3 2026, 0–3 months)

| Priority | Feature | Impact |
|----------|---------|--------|
| P0 | **OJK Compliance Module** — automated LBPP/LSPP report generation (Excel/XML) | Regulatory necessity for scaled operations |
| P0 | **Policy digital certificate** — tamper-proof PDF with QR verification endpoint | Customer trust, insurer requirement |
| P1 | **Automated renewal reminders** — email + WhatsApp 30/7/1 day before expiry | Reduce churn 30–40% |
| P1 | **Native push notifications** — Firebase FCM via Capacitor plugin | Retention on Android |
| P1 | **Rate limiter + CAPTCHA on auth** — prevent brute force on agent/admin login | Security hardening |
| P2 | **OTP fallback for Google-failed login** — email OTP when OAuth state expires | Reduce support tickets |
| P2 | **Policy comparison view** — side-by-side multi-insurer quotes | Conversion rate uplift |

### Phase 2 — Growth & Distribution (Q4 2026–Q1 2027, 3–9 months)

| Priority | Feature | Impact |
|----------|---------|--------|
| P0 | **WhatsApp Business API chatbot** — policy lookup, renewal, claims status via WA | Meet users where they are (175M users) |
| P0 | **Embedded insurance API (B2B2C)** — REST API for partners to sell SurePath products | 10x distribution without agent overhead |
| P1 | **Instant issuance AI** — ML risk score triggers auto-approval for low-risk profiles | Reduce underwriting time from 48h to <60s |
| P1 | **QRIS native checkout** — QRIS payment via Xendit, in-app QR display | Indonesia's highest e-payment adoption |
| P1 | **Agent gamification** — monthly competition leaderboard, achievement badges, prizes | Agent engagement, 2x productivity |
| P2 | **Micro-insurance** — daily/weekly rideshare and gig worker policies (IDR 5,000/day) | Untapped 80M gig worker market |
| P2 | **Telematics-based pricing** — GPS-based safe driving discount for motor insurance | Acquisition differentiator |

### Phase 3 — Unicorn Scale (2027, 9–18 months)

| Priority | Feature | Impact |
|----------|---------|--------|
| P0 | **AI claims automation** — photo damage assessment for car claims, auto-reserve | Cut claim cycle from 14 days to 3 days |
| P0 | **Multi-country expansion** — Malaysia / Philippines portal (OJK → BNM / IC) | SEA addressable market expansion |
| P1 | **Bancassurance partner portal** — white-label for digital banks (Jenius, Blu, GoPay) | 10M+ captive banking customers |
| P1 | **Actuarial data product** — anonymised premium/claims dataset for reinsurers | New revenue stream |
| P2 | **Parametric triggers** — auto-payout on flight delay via API data (no claim needed) | Travel product differentiation |
| P2 | **Life insurance full flow** — term, whole life with digital medical questionnaire | Higher average premium, longer LTV |

---

## 7. Success Metrics

### 7.1 North Star
- **Gross Written Premium (GWP)** on-platform per month

### 7.2 Acquisition
- New customer signups / week
- Agent registrations / month (target: 200/month by end 2026)
- Conversion rate: landing → first policy purchased

### 7.3 Engagement & Retention
- Monthly Active Users (customers + agents)
- Renewal rate (target: >70%)
- NPS score (target: >60)
- Time-to-first-policy: from signup to first purchase

### 7.4 Financial
- Gross Margin per policy (net premium minus insurer share + Xendit fee)
- Agent commission payout accuracy (<0.1% dispute rate)
- Claims loss ratio (track over time; flag anomalies to insurer)

### 7.5 Operational
- Average order-to-issuance time (target: <24h, then <60s for instant issuance)
- Support ticket rate per 1,000 policies
- OAuth login success rate (target: >99%)
- Edge function p99 latency

---

## 8. Non-Functional Requirements

### 8.1 Performance
- Page load (LCP) < 2.5s on 4G Android
- Time to Interactive < 4s on midrange Android (4GB RAM)
- Supabase query p99 < 200ms for all portal data fetches
- Edge function cold start < 1s (Deno runtime, no heavy imports)

### 8.2 Availability
- Vercel SPA: 99.9% uptime (SLA backed)
- Supabase: 99.9% uptime (Supabase Pro)
- Target: zero downtime deployments (Vercel atomic)

### 8.3 Scalability
- Support 50,000 concurrent users without architecture change (Supabase connection pooling + PgBouncer)
- Storage: 10,000 policy documents/year (~5 GB/year at 500KB average)

### 8.4 Compliance
- **OJK POJK No. 69/2016** — pemasaran produk asuransi via digital channels
- **UU PDP (Law No. 27/2022)** — personal data protection: encrypt PII at rest, right to deletion
- **POJK No. 11/2020** — anti-money laundering: KYC for agents and payout recipients
- **ISO 27001** mindset — access control, incident response, audit logging

---

## 9. Security Requirements

See `docs/SECURITY_POLICY.md` for full detail. Summary:

- Sensitive tables (`sp_users`, orders, payments, claims, commissions) accessed exclusively through the **data-gateway** edge function: JWT verified server-side, queries run as service_role with per-row authorization in code (see `docs/DATA_GATEWAY.md`)
- User profiles created server-side from the verified JWT identity (`ensure_profile`) — id/email never client-supplied; agent role starts unverified
- All customer PII stored in Supabase with RLS — no row accessible without ownership proof (note: live RLS state diverges from repo migrations; see `docs/DATABASE_STATE.md`)
- Admin routes protected by VITE_ADMIN_KEY (env-only, never in source)
- Xendit webhook: fail-closed token validation (500 if unconfigured, 401 on mismatch)
- AI/LLM calls proxied server-side (ai-proxy edge function) — no API keys in browser bundle
- SSRF prevention on insurer review API endpoint (whitelist check)
- Agent wallet mutations: service_role only via SECURITY DEFINER SQL functions
- OAuth PKCE: URL cleaned after exchange to prevent state replay
- Insurer portal: 24h expiring tokens, single-use magic links

---

## 10. Technical Architecture Summary

See `docs/TECHNICAL_SPEC.md` for full detail.

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite + TailwindCSS |
| Mobile | Capacitor 8 (Android, `com.myinsurepath.os`) |
| Backend | Supabase (PostgreSQL 17 + RLS + Realtime) |
| Secure data access | data-gateway edge function (JWT-verified, service_role) |
| Edge Functions | Deno (TypeScript) — deployed manually, not via git |
| Auth | Supabase GoTrue (email+password, Google OAuth PKCE, email OTP) |
| Payments | Xendit (VA, QRIS, e-wallet) |
| Email | Resend API |
| AI/LLM | OpenRouter (proxied via ai-proxy edge function) |
| CDN/Deploy | Vercel (atomic deploys, global edge) |
| Storage | Supabase Storage (vehicle photos, policy PDFs) |
| Analytics | Vercel Analytics |
| Monitoring | Supabase Logs + Vercel Runtime Logs |
