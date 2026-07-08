# SurePath v1.26.0 — Re-Audit Report

> **Overall Score: 6.4/10** (up from 5.7/10 at v1.23.0 — +0.7 improvement)
> Re-audit date: 8 Juli 2026
> Method: All commands executed against actual files — verified, not assumed.

---

## Score Summary

| # | Dimension | v1.23 | v1.26 | Δ | Status |
|---|---|---|---|---|---|
| 1 | Code Quality | 5.0 | **7.0** | +2.0 | ⚠️ Good progress |
| 2 | Security | 6.5 | **6.0** | -0.5 | ⚠️ 43 mutations still bypass gateway |
| 3 | UX/UI | 5.0 | **7.0** | +2.0 | ⚠️ Good progress |
| 4 | Performance | 5.0 | **6.0** | +1.0 | ⚠️ 12.5MB video still unoptimized |
| 5 | Testing | 0.0 | **5.0** | +5.0 | ⚠️ Wide but shallow (1 file, 53% E2E skipped) |
| 6 | Documentation | 6.0 | **7.0** | +1.0 | ⚠️ CHANGELOG 3 versions behind |
| 7 | Deployment | 5.0 | **6.0** | +1.0 | ⚠️ CI doesn't run E2E |
| 8 | Features | 7.0 | **6.0** | -1.0 | ⚠️ 3 placeholders still in production |
| 9 | Database | 6.5 | **7.0** | +0.5 | ⚠️ get_my_orders missing deleted_at |
| 10 | API Design | 6.5 | **7.0** | +0.5 | ⚠️ 2151-line monolith |
| | **Overall** | **5.7** | **6.4** | **+0.7** | |

---

## Per-Dimension: Score + Problems + Path to 9/10

### 1. Code Quality: 7/10

**Problems:**
- 52 `: any` casts across 20 files
- 5 ESLint warnings (console.log in db.ts/Toast.tsx, unused catch vars)
- SUREPATH_DOCS.md (658 lines) at root, not in docs/
- react-hooks/exhaustive-deps warnings in PathyChat/Toast

**To reach 9/10:**
1. Replace 52 `: any` with typed interfaces or zod schemas (2 days)
2. Fix 5 ESLint warnings (30 min)
3. Move SUREPATH_DOCS.md to docs/ (5 min)
4. Fix exhaustive-deps warnings (1 hour)

### 2. Security: 6/10

**Problems:**
- **43 direct client mutations bypass gateway** across 12 files (CRITICAL)
  - services/insurers.ts: 8 admin CRUD ops
  - components/admin/InsurerAdmin.tsx: 7 ops (including deletes)
  - services/website.ts: 11 ops (auth tokens, admin notifications)
  - 9 more files with 1-3 mutations each
- No CSP/HSTS/X-Frame-Options verification (E2E tests skipped)

**To reach 9/10:**
1. Migrate all 43 mutations to callGateway actions (3 days)
2. Apply RLS deny-all to sp_insurers, sp_insurer_products, sp_ojk_rate_sets (1 day)
3. Add integration test asserting no direct mutations in admin components (4 hours)
4. Implement CSP/HSTS at Vercel edge (already in vercel.json — verify) (2 hours)

### 3. UX/UI: 7/10

**Problems:**
- 63 `w-8 h-8` (32px) buttons — ~10-15 are clickable, below WCAG 44px
- Only 18 `min-h-[44px]` patterns (primitives exist but adoption incomplete)
- No focus-visible outline verified globally

**To reach 9/10:**
1. Replace 10-15 inline `w-8 h-8` buttons with `<IconButton size="md">` (1 day)
2. Add CSS: `button:focus-visible { outline: 2px solid var(--ds-primary); }` (5 min)
3. Audit aria-label coverage → target 100% on icon-only buttons (4 hours)

### 4. Performance: 6/10

**Problems:**
- hero.mp4 is **12.5MB** (should be <3MB)
- 5 mp4 files total **24MB** served from /public
- 3 service files still eagerly import jspdf (pdfService.ts, agreementPdf.ts, proposalPdf.ts)
- index.js chunk is 440KB (above 200KB budget)

**To reach 9/10:**
1. Compress hero.mp4 12.5MB → <3MB with ffmpeg (2 hours)
2. Move 5 mp4s to CDN (Cloudflare R2/Bunny) (4 hours)
3. Lazy-load jspdf in 3 service files via dynamic import wrapper (4 hours)
4. Add vite-plugin-compression for Brotli (1 hour)
5. Split index.js >200KB chunks (1 day)

### 5. Testing: 5/10

**Problems:**
- Only 1 unit test file (43 tests) — no per-service test files
- 0 component tests (React Testing Library)
- 10/19 E2E tests SKIPPED (53% dark)
- CI doesn't run Playwright (only vitest)
- No coverage threshold configured
- Rate-limit E2E test is flaky (shared IP quota)

**To reach 9/10:**
1. Add Playwright to CI workflow (30 min)
2. Write per-service unit tests: wallet, claims, orders, commissions, agreements (5 tests each = 25 tests) (3 days)
3. Add 10 React Testing Library component tests (AuthGate, portals, wizards) (3 days)
4. Fix rate-limit E2E: use unique identifier per run (5 min)
5. Configure vitest coverage threshold: 60% lines, 50% branches (1 hour)
6. Un-skip security header tests by verifying they work (30 min)

### 6. Documentation: 7/10

**Problems:**
- CHANGELOG missing v1.24.0, v1.25.0, v1.26.0 (3 versions undocumented)
- Health endpoint version hardcoded as "1.25.0" (stale)
- No API reference for 50+ gateway actions
- No testing strategy doc

**To reach 9/10:**
1. Write CHANGELOG entries for v1.24-v1.26 (1 hour)
2. Fix health endpoint version (5 min)
3. Generate docs/API_REFERENCE.md from gateway switch cases (1 day)
4. Add docs/TESTING.md describing coverage + gaps (1 hour)
5. Move SUREPATH_DOCS.md to docs/ (5 min)

### 7. Deployment: 6/10

**Problems:**
- CI doesn't run E2E (Playwright)
- Health endpoint version stale
- X-Request-ID missing from GET health response
- No staging environment
- No migration CI (migrations applied manually)

**To reach 9/10:**
1. Add `npm run test:e2e` to CI workflow (30 min)
2. Fix health version to read from env (5 min)
3. Move requestId generation above GET branch (5 min)
4. Provision staging Supabase + Vercel (1 day)
5. Add `supabase db push --dry-run` to CI (2 hours)
6. Configure Sentry release tracking (4 hours)

### 8. Features: 6/10

**Problems:**
- InsurerPortal Claims tab = "Coming soon" (no InsurerClaims component)
- PathyChat UI gated despite working backend
- pushNotificationService = 4-function no-op stub
- No FCM token registration

**To reach 9/10:**
1. Build InsurerClaims.tsx (claims for insurer's policies) (2 days)
2. Wire PathyChat UI to existing pathy_chat action (4 hours)
3. Implement pushNotificationService with FCM (2 days)
4. Add FCM token registration UI in profile (4 hours)

### 9. Database: 7/10

**Problems:**
- get_my_orders and get_my_claims don't filter deleted_at
- No DB-level trigger to auto-set deleted_at on DELETE
- No migration validation in CI

**To reach 9/10:**
1. Add `.is('deleted_at', null)` to get_my_orders, get_my_claims, all customer-facing SELECTs (4 hours)
2. Add DB trigger: auto-set deleted_at instead of hard delete (1 day)
3. Add `supabase migration list` check to CI (2 hours)

### 10. API Design: 7/10

**Problems:**
- data-gateway/index.ts is 2151 lines (monolith)
- Health version stale
- X-Request-ID missing from GET health
- No OpenAPI spec
- No pagination standardization

**To reach 9/10:**
1. Split gateway into domain modules: actions/{insurers,orders,claims,payments,admin}.ts (3 days)
2. Fix health version + X-Request-ID on GET (5 min)
3. Generate OpenAPI spec from switch cases (1 day)
4. Standardize pagination: { limit, offset, cursor } (1 day)
5. Enforce 1MB max body size (5 min)

---

## Top 5 Remaining Issues (by impact)

| # | Issue | Dimension | Impact | Effort |
|---|---|---|---|---|
| 1 | 43 direct client mutations bypass gateway | Security | Critical | 3 days |
| 2 | Testing wide-but-shallow (1 file, 53% E2E skipped, 0 component tests) | Testing | High | 5 days |
| 3 | hero.mp4 12.5MB + 24MB total video assets | Performance | High | 1 day |
| 4 | 3 placeholder features in production (InsurerClaims, PathyChat, FCM) | Features | Medium | 5 days |
| 5 | CHANGELOG 3 versions behind + health version stale | Docs/DevOps | Low | 2 hours |

---

## Roadmap to 9/10 Overall

| Phase | Duration | Target | Key Work |
|---|---|---|---|
| **Phase A: Quick Fixes** | 1 day | 6.4 → 7.0 | CHANGELOG, health version, X-Request-ID fix, deleted_at filters, lint warnings |
| **Phase B: Security + Performance** | 4 days | 7.0 → 8.0 | Migrate 43 mutations, compress video, lazy-load jspdf services |
| **Phase C: Test Depth** | 5 days | 8.0 → 8.5 | Per-service unit tests, component tests, Playwright in CI, coverage threshold |
| **Phase D: Features + Polish** | 5 days | 8.5 → 9.0 | InsurerClaims, PathyChat wiring, FCM, gateway split, OpenAPI |
| **Total** | **~15 engineer-days (3 weeks)** | **6.4 → 9.0** | |

---

## Verdict

v1.26.0 is a genuine improvement over v1.23.0 (+0.7 points), but the headline claims mask uneven execution:
- 52 tests exist but live in 2 files with 53% E2E skipped
- Rate limit fail-closed is real, but 43 mutations still bypass gateway
- Dark mode CSS is real, but 10-15 buttons remain below WCAG
- 3 placeholder features still ship in production

To honestly reach 9/10: **3 weeks of focused work** across 4 phases. Not a sprint — a quarter.
