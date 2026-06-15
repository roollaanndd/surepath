# SurePath Session Context
**Updated:** 2026-06-15

## Current State
- **Branch:** `claude/gstack-status-yuyhyd` (PR #28 open, Vercel preview deployed)
- **main:** v1.8.2 — last commit `487b173`
- **Build:** passing ✅
- **data-gateway:** v11 live (deployed this session)

## What Was Done (this session)

### Admin UX Bug Fixes (PR #28, branch `claude/gstack-status-yuyhyd`)
- **Approvals for ADMIN role** — Added `ADMIN` to Antrean Polis menu roles
- **CANCELLED status** — Added to `SpPolicyOrder['status']` type + `STATUS_META` + filter tabs in `PolicyOrdersAdmin`
- **Dashboard stats refresh** — 2-minute auto-refresh interval + manual Refresh button
- **User list refresh** — Refresh button added to `UserManagementView`

### Previous session (v1.8.2 on main)
- Customer portal: order history refetch, cancel order, OrderDetailSheet, accessibility font scale, manual dark mode, navbar pill UX, white status bar, animations
- v1.8.0–v1.8.1: version badge, promo banner + image upload, App.tsx modularization, PWA update toast, PWA icon regeneration

## Demo Accounts (Supabase project `uyjgeteelnswphyzkjwi`)
| Role | Email | Password |
|------|-------|----------|
| Customer | demo.customer@myinsurepath.com | Demo1234! |
| Agent | demo.agent@myinsurepath.com | Demo1234! |
| Admin | demo.admin@myinsurepath.com | Demo1234! |

## Active PR
- **PR #28** — `claude/gstack-status-yuyhyd` → `main` (draft)
- Admin UX fixes: approvals, CANCELLED status, stats refresh, user list refresh
- Vercel preview: surepath-git-claude-gstack-status-yuyhyd-roollaanndds-projects.vercel.app ✅

## Next / Backlog
- [ ] Merge PR #28 to main
- [ ] Test demo.admin login — verify Antrean Polis visible
- [ ] Test customer order cancellation end-to-end
- [ ] Agent portal feature completeness review
