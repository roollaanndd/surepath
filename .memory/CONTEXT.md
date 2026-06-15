# SurePath Session Context
**Updated:** 2026-06-15

## Current State
- **Branch:** `main` — v1.8.3 live at myinsurepath.com (PR #28 merged Jun 15, 2026)
- **main:** v1.8.3 — last commit `37218c5`
- **Build:** passing ✅
- **data-gateway:** v11 live

## What Was Done (this session)

### v1.8.3 — Admin UX Bug Fixes (merged via PR #28)
- **Approvals for ADMIN role** — Added `ADMIN` to Antrean Polis menu roles
- **CANCELLED status** — Added to `SpPolicyOrder['status']` type + `STATUS_META` + filter tabs in `PolicyOrdersAdmin`
- **Dashboard stats refresh** — 2-minute auto-refresh interval + manual Refresh button
- **User list refresh** — Refresh button added to `UserManagementView`
- **Docs** — All .md files updated to reflect v1.8.1–v1.8.3, data-gateway v11, RLS state, demo accounts

### Previous (v1.8.2 on main)
- Customer portal: order history refetch, cancel order, OrderDetailSheet, accessibility font scale, manual dark mode, navbar pill UX, white status bar, animations
- v1.8.0–v1.8.1: version badge, promo banner + image upload, App.tsx modularization, PWA update toast, PWA icon regeneration

## Demo Accounts (Supabase project `uyjgeteelnswphyzkjwi`)
| Role | Email | Password |
|------|-------|----------|
| Customer | demo.customer@myinsurepath.com | Demo1234! |
| Agent | demo.agent@myinsurepath.com | Demo1234! |
| Admin | demo.admin@myinsurepath.com | Demo1234! |

## Backlog
- [ ] Test demo.admin login — verify Antrean Polis visible for ADMIN role
- [ ] Test customer order cancellation end-to-end
- [ ] Agent portal feature completeness review
