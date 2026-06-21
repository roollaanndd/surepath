# SurePath Session Context
**Updated:** 2026-06-21

## Current State
- **Branch:** `main` — v1.8.4 live at myinsurepath.com
- **main:** v1.8.4 — last commit `d05530a`
- **Build:** passing ✅
- **data-gateway:** v11 live

## What Was Done (recent sessions)

### v1.8.4 — Agent Portal Fixes + Website Cleanup
- **AgentWallet wired** — `AgentWalletView` added as `wallet` case in `AgentPortal`; previously orphaned
- **Withdraw button fixed** — `handleWithdraw` in `AgentCommission` navigates to wallet tab via `onNavigate` prop
- **CANCELLED in agent order filters** — Added to `STATUS_META` + `FILTERS` in `AgentOrderStatus`
- **Order load error handling** — `useEffect` in `AgentOrderStatus` catches errors; no more infinite spinner
- **Homepage stat counters hidden** — Removed 12,400+ / 98% / 18+ / 40+ animated section; removed "12.000 orang" copy; removed stat numbers from WHY card

### v1.8.3 — Admin UX Bug Fixes
- **Approvals for ADMIN role** — Added `ADMIN` to Antrean Polis menu roles
- **CANCELLED order status** — Added to `SpPolicyOrder['status']` type + `STATUS_META` + filter tabs in `PolicyOrdersAdmin`
- **Dashboard stats auto-refresh** — 2-minute interval + manual Refresh button
- **User list refresh** — Refresh button in `UserManagementView`
- **Docs** — All .md files updated to reflect v1.8.1–v1.8.3, data-gateway v11, RLS state

## Demo Accounts (Supabase project `uyjgeteelnswphyzkjwi`)
| Role | Email | Password |
|------|-------|----------|
| Customer | demo.customer@myinsurepath.com | Demo1234! |
| Agent | demo.agent@myinsurepath.com | Demo1234! |
| Admin | demo.admin@myinsurepath.com | Demo1234! |

## Backlog
- [ ] Live browser QA blocked (cdn.playwright.dev not in egress allowlist)
- [ ] Re-enable stat counters on homepage when real data is ready
- [ ] Agent portal: AgentCommission "Total Withdrawn" hardcoded 0 (needs wallet data)
