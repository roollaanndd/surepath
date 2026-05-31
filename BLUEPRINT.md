# SurePath — Blueprint & Flow Process

**Platform:** Web PWA + installable mobile app (Android/iOS)  
**Users:** Customers, Agents, Admins  
**Market:** Indonesia  

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USERS                                    │
│   [Customer PWA]    [Agent PWA]    [Admin Portal]               │
└────────┬─────────────────┬──────────────────┬───────────────────┘
         │                 │                  │
         ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   VERCEL (Frontend)                             │
│   React 19 + TypeScript + Vite PWA + TailwindCSS               │
│   HashRouter — single deployment, role-based view switching     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  SUPABASE (Backend)                             │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │  PostgreSQL  │  │  Auth        │  │  Edge Functions     │  │
│  │  + RLS       │  │  Google OAuth│  │  (Deno / Xendit)    │  │
│  │  + Vault     │  │  Email OTP   │  │                     │  │
│  └──────────────┘  └──────────────┘  └─────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
   ┌──────────────────┐          ┌──────────────────────┐
   │  XENDIT          │          │  TELEGRAM BOT        │
   │  Invoice API     │          │  Admin alerts        │
   │  Disbursement API│          │  sp_bot_config table │
   └──────────────────┘          └──────────────────────┘
```

---

## 2. Authentication Flow

### All Users (Web + Mobile)

```
Open App
    │
    ▼
Splash Screen (3s animated logo)
    │
    ▼
Check session (supabase.auth.getSession)
    │
    ├── Session found ──► Skip to Portal (role-based)
    │
    └── No session ──► Login Screen
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
           Google       Email OTP    Email +
           OAuth        (6-digit)    Password
                │           │           │
                └───────────┴───────────┘
                            │
                            ▼
                   Supabase Auth
                            │
                   Check sp_users table
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
           Profile exists          New user →
                │                  Create sp_users row
                ▼                  Set role = AGENT / CUSTOMER
           Determine role
                │
    ┌───────────┼─────────────┐
    ▼           ▼             ▼
 CUSTOMER    AGENT        ADMIN roles
 Portal      Portal       Admin Portal
```

### Session Persistence
- Google OAuth: PKCE flow, handled via `onAuthStateChange`
- OTP: `supabase.auth.verifyOtp({ type: 'email' })`
- `sessionStorage.sp_splash_done` prevents splash replay on OAuth redirect

---

## 3. Customer Flow

### 3.1 Onboarding

```
Register / Login
    │
    ▼
Welcome Animation (AppEntryScreen)
    │
    ▼
Customer Portal (Home)
    │
    ├── Hero carousel (Travel / Car / Claims)
    ├── Policy Status Card (active policy summary)
    └── Quick Actions: Travel │ Auto │ Claim │ More
```

### 3.2 Car Insurance Purchase

```
Tap "Beli Asuransi Mobil"
    │
    ▼
Step 1 — STNK Scan / Manual Entry
    • Plate number → region auto-detected
    • Vehicle details: brand, model, year, price
    │
    ▼
Step 2 — Coverage Selection
    • Type: Comprehensive (All Risk) or TLO
    • Add-ons: Flood, Earthquake, SRCC, Terrorism,
               TPL, PA Driver, PA Passengers,
               Authorized Workshop
    • Discount % (agent can apply)
    • Premium calculated live:
        Base premium (OJK rate × vehicle price)
        + Add-on premiums
        − Discount
        + Admin/policy fee
        + Stamp duty Rp 10,000
        + Application fee Rp 5,000
        = Total Payable
    │
    ▼
Step 3 — KYC
    • KTP photo upload
    • Selfie with KTP
    • AI identity verification
    │
    ▼
Step 4 — Vehicle Photo Audit
    • Front / rear / left / right / interior shots
    • AI scoring (damage detection)
    • Score ≥ 70 → pass
    • Score < 70 → flag, admin review required
    │
    ▼
Step 5 — Provider Selection
    • Ranked insurer cards
    • Each shows: premium, commission, coin reward
    • Select insurer
    │
    ▼
Step 6 — Pre-Summary
    • Full policy detail review
    • Downloadable PDF quote
    │
    ▼
Step 7 — Payment
    • Method: Bank VA / e-Wallet / QRIS / Credit Card
    • Payment processed via Xendit Invoice
    • Customer redirected to Xendit payment page
    │
    ▼
Step 8 — Confirmation
    • PAID → Policy under review
    • PENDING_PAYMENT → Invoice link sent
    │
    ▼
Admin reviews → Issues policy → Customer notified
```

### 3.3 Claim Submission

```
Tap "Lapor Klaim"
    │
    ▼
Select policy
    │
    ▼
Fill claim form:
    • Date of incident
    • Location
    • Chronology
    • Photo uploads (damage photos)
    │
    ▼
Submit → sp_claims (status: SUBMITTED)
    │
    ▼
Admin reviews
    │
    ├── Approved → amount_approved set → Customer notified
    └── Rejected  → admin_notes set   → Customer notified
```

### 3.4 Customer Portal Tabs

| Tab | Content |
|---|---|
| Home | Hero carousel, policy status card, quick actions |
| Products | Browse all insurance products |
| History | My policies, claim status |
| Profile | Account details, settings |

---

## 4. Agent Flow

### 4.1 Agent Onboarding

```
Register with agent code
    │
    ▼
Admin assigns role = AGENT
    │
    ▼
Agent Portal unlocked:
    • Dashboard (sales stats, commission summary)
    • Quote Builder
    • Client Manager
    • Wallet
    • Notifications
```

### 4.2 Quote & Policy Submission

```
Agent Portal → "Buat Quotasi"
    │
    ▼
Select product: Car / Motorcycle / Travel
    │
    ▼
[Car/Motorcycle] → VehicleUnderwritingWizard
    │
    Step 1: Vehicle details
    Step 2: Coverage selection + live premium
    Step 3: Client KYC
    Step 4: Photo audit (AI scoring)
    Step 5: Insurer selection
            Each insurer card shows:
            • Gross premium
            • Commission: rate% = IDR amount
            • Coin reward: N coins ≈ IDR value
    Step 6: Summary + PDF quote
    Step 7: Submit order
    │
    ▼
sp_policy_orders created (status: SUBMITTED)
    │
    ▼
Admin notified → Creates Xendit invoice
    │
    ▼
Customer pays
    │
    ▼
PAID → Agent wallet credited (commission_amount)
      Agent notified
```

### 4.3 Client Manager

```
Client List
    │
    ├── Prospect → add notes, follow up
    ├── Active   → view policies, upsell
    └── Add new client
            │
            ▼
        Client profile:
        name, phone, KTP, address, DOB
        → linked to agent_id
        → view all policies and claims for that client
```

### 4.4 Agent Wallet

```
Wallet Screen
    │
    ├── Balance card
    │       • Saldo (available IDR balance)
    │       • Total earned (all time)
    │       • Total withdrawn (all time)
    │
    ├── Tab: Riwayat Kredit (credit ledger)
    │       Each row: type, amount, balance_after, date
    │       Sources: COMMISSION_CREDIT, COIN_CREDIT,
    │                WITHDRAWAL_REVERSAL
    │
    └── Tab: Penarikan (withdrawal history)
            Each row: bank, amount, status, date
```

### 4.5 Withdrawal Request Flow

```
Tap "Tarik Dana"
    │
    ▼
Enter amount
    │
    Validation:
    • Minimum: Rp 10,000
    • Cannot exceed current balance
    • Xendit fee Rp 5,000 shown (deducted from net)
    │
    ▼
Approval tier warning shown:
    • < Rp 10 juta  → L1 only
    • Rp 10–25 juta → L1 + L2 required
    • ≥ Rp 25 juta  → L1 + L2 + L3 + 24-hour delay
    │
    ▼
Bank details:
    • Select bank (BCA / Mandiri / BNI / BRI / CIMB etc)
    • Account number
    • Account holder name
    │
    ▼
Confirm → sp_withdrawals INSERT (status: PENDING_L1/L2/L3)
          Balance deducted IMMEDIATELY & atomically
          Cannot overdraw — DB enforces balance ≥ 0
    │
    ▼
Approval chain (see Admin section below)
    │
    ▼
On DISBURSED:
    • Xendit transfer to agent bank
    • Agent notified: "Dana berhasil ditransfer"

On REJECTED:
    • Balance reversed immediately
    • Agent notified with rejection reason

On Xendit failure:
    • Balance reversed automatically
    • Agent notified: "Penarikan gagal, dana dikembalikan"
```

### 4.6 Commission & Coin Earning

```
Policy paid (sp_payments.status = PAID)
    │
    ▼
xendit-webhook edge function fires:
    │
    ├── sp_policy_orders → UNDER_REVIEW
    ├── credit_agent_wallet(agent_id, commission_amount)
    │       → sp_agent_wallets.balance += commission_amount
    │       → sp_wallet_transactions APPEND (immutable)
    └── sp_notifications INSERT (agent notified)

Commission rate: set per insurer product (sp_insurer_products.base_commission_rate)
Coin rate: set per insurer product (coin_rate)
Coins stored: sp_users.coins_balance + sp_coin_ledger
```

---

## 5. Admin Flow

### 5.1 Admin Login

```
Navigate to /admin
    │
    ▼
Admin Login screen (separate from customer/agent auth)
    • Username + password
    • Credential verified against admin_sessions table
    • Session token stored in localStorage
    • Role loaded: MASTER_ADMIN / ADMIN / FINANCE /
                   FINANCE_MANAGER / FINANCE_DIRECTOR /
                   INSURANCE_ADMIN
    │
    ▼
Admin Portal — role-filtered menu
```

### 5.2 Policy Order Queue

```
"Antrean Polis" menu
    │
    ▼
List of orders (status: SUBMITTED / UNDER_REVIEW)
    │
    Per order card shows:
    • Order number, client name, product
    • AI risk score + recommendation
    • Payment status badge (Lunas / Invoice Aktif)
    │
    ▼
Open order detail:
    • Vehicle details + AI photo audit findings
    • Coverage breakdown
    • Premium & commission breakdown
    • Payment info (amount, method, paid date)
    • AI admin recommendation (APPROVE / REVIEW / REJECT)
    │
    ▼
Admin action:
    ├── APPROVE → status: APPROVED
    │       Issue policy number
    │       Upload policy document URL
    │       → status: ISSUED
    │       Agent + customer notified
    │
    └── REJECT → status: REJECTED
            Enter rejection notes
            Agent + customer notified
```

### 5.3 Withdrawal Approval Queue

```
"Penarikan Agen" menu
    │
    ▼
List of withdrawals with filters:
    PENDING / APPROVED / DISBURSED / REJECTED
    │
    Per card shows:
    • Agent name, bank, account number
    • Amount requested / Xendit fee / Net to agent
    • Current approval status
    • L1/L2/L3 approval timestamps
    • 24hr schedule warning if > Rp 25 juta
    │
    ▼
Actions (based on role):

    FINANCE / ADMIN (L1):
    ├── Setujui → l1_approved, status → PENDING_L2 or APPROVED
    └── Tolak  → modal: enter reason
                  → balance reversed to agent
                  → agent notified

    FINANCE_MANAGER (L2):
    ├── Setujui → l2_approved, status → PENDING_L3 or APPROVED
    └── Tolak

    FINANCE_DIRECTOR / MASTER_ADMIN (L3):
    ├── Setujui → l3_approved, status → APPROVED
    └── Tolak

    On APPROVED:
    ├── If amount < Rp 25 juta → "Cairkan via Xendit" button
    │       → xendit-disburse edge fn called
    │       → status: PROCESSING → DISBURSED
    │
    └── If amount ≥ Rp 25 juta → scheduled_disburse_at set (now + 24hr)
            → Button active only after 24hr window
            → Manual trigger by admin
```

### 5.4 Financial Reports

```
"Laporan" menu
    │
    ▼
Year selector
    │
    ▼
Live queries to Supabase:
    • GWP (Gross Written Premium): sp_policy_orders WHERE status=ISSUED
    • Commissions paid: sp_commissions WHERE status=PAID
    • Claims: sp_claims WHERE status IN (APPROVED, PAID)
    │
    ▼
Charts:
    • Monthly GWP bar chart
    • Commission ratio
    • Loss ratio (claims / GWP)
    • Net revenue
    │
    ▼
AI Finance Review button:
    → ai-finance-review edge fn
    → Health score, anomaly detection, recommendations
```

### 5.5 Xendit Payment Ledger

```
"Pembayaran Xendit" menu
    │
    ▼
Filter: ALL / PAID / PENDING / EXPIRED
    │
    KPI cards:
    • Total terbayar (sum of paid_amount for PAID)
    • Invoice pending (sum of amount for PENDING)
    • Kadaluarsa (count of EXPIRED)
    │
    Table per payment:
    date │ order# │ client │ product │ amount │ status │ method │ invoice link
```

---

## 6. Full Payment Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│  AGENT submits order                                         │
│  sp_policy_orders: status = SUBMITTED                        │
└─────────────────┬────────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────────────┐
│  ADMIN creates invoice                                       │
│  POST /functions/create-xendit-invoice                       │
│  → Xendit Invoice created (PENDING)                          │
│  → sp_payments INSERT (status: PENDING)                      │
│  → invoice_url sent to agent/customer                        │
└─────────────────┬────────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────────────┐
│  CUSTOMER pays via Xendit                                    │
│  Options: Bank VA / e-Wallet / QRIS / Credit Card            │
│  Invoice valid: 24 hours                                     │
└─────────────────┬────────────────────────────────────────────┘
                  │
           ┌──────┴──────┐
           ▼             ▼
         PAID          EXPIRED
           │             │
           ▼             ▼
  xendit-webhook      Agent notified:
  fires               "Invoice kadaluarsa"
           │
           ▼
  sp_payments: PAID
  sp_policy_orders: UNDER_REVIEW
  credit_agent_wallet(commission_amount)
  sp_admin_notifications INSERT
  sp_notifications INSERT (agent)
           │
           ▼
  ADMIN reviews order
           │
     ┌─────┴─────┐
     ▼           ▼
  ISSUED      REJECTED
     │           │
     ▼           ▼
  Policy      Agent + customer
  document    notified
  generated
  Agent + customer notified
```

---

## 7. Disbursement Lifecycle

```
Agent requests withdrawal
    │
    ▼
sp_withdrawals INSERT (PENDING_L1 / L2 / L3)
request_withdrawal_deduct() → balance deducted atomically
    │
    ▼
Finance approves (L1 → L2 → L3 as needed)
    │
    ▼
status = APPROVED
    │
    If amount ≥ Rp 25 juta:
    → wait 24 hours (scheduled_disburse_at)
    → admin manually triggers after window
    │
    ▼
Admin clicks "Cairkan via Xendit"
    │
    ▼
xendit-disburse edge fn:
    → status: PROCESSING  (prevents double-trigger)
    → POST https://api.xendit.co/disbursements
    │
    ├── Success:
    │   sp_withdrawals: DISBURSED
    │   xendit_disbursement_id stored
    │   Agent notified: "Dana berhasil ditransfer"
    │
    └── Failure:
        sp_withdrawals: FAILED
        reverse_withdrawal() → balance restored
        Agent notified: "Penarikan gagal, dana dikembalikan"
```

---

## 8. Notification Channels

| Event | Agent notification | Admin notification | Telegram |
|---|---|---|---|
| Order submitted | — | sp_admin_notifications | ✓ |
| Payment PAID | sp_notifications | sp_admin_notifications | ✓ |
| Invoice expired | sp_notifications | — | — |
| Policy issued | sp_notifications | — | — |
| Policy rejected | sp_notifications | — | — |
| Claim submitted | — | sp_admin_notifications | ✓ |
| Withdrawal requested | — | sp_admin_notifications | — |
| Withdrawal disbursed | sp_notifications | — | — |
| Withdrawal failed | sp_notifications | — | — |
| Withdrawal rejected | sp_notifications | — | — |

---

## 9. Screen Map

### Customer

```
Splash → Login
    │
    └── Home
         ├── Buy Travel Insurance
         ├── Buy Car Insurance ──► 8-step wizard
         ├── Submit Claim       ──► claim form
         ├── My Policies
         └── Profile
```

### Agent

```
Splash → Login
    │
    └── Agent Home (dashboard)
         ├── Quote Builder ──► underwriting wizard
         ├── My Clients   ──► client CRM
         ├── Wallet       ──► balance, ledger, withdraw
         ├── Notifications
         └── Profile
```

### Admin Portal (/admin)

```
Admin Login
    │
    └── Dashboard
         ├── Reports
         ├── Data Polis (inventory)
         ├── Transaksi
         ├── Antrean Polis (order queue)
         ├── Pengguna / Kelola Akun
         ├── Pesanan Polis
         ├── Manajemen Agen
         ├── Antrean Klaim
         ├── Keuangan
         ├── Komisi
         ├── Pembayaran Xendit ──► payment ledger
         ├── Penarikan Agen   ──► withdrawal approvals
         ├── Produk
         ├── Perusahaan Asuransi
         ├── Database Kendaraan
         ├── Editor Website
         ├── AI Admin Agent
         ├── AI Finance Agent
         └── Keamanan
```

---

## 10. Data Ownership & Security Boundaries

```
┌─────────────────────────────────────────────┐
│  CLIENT BROWSER / APP                       │
│                                             │
│  • Can READ own data (RLS enforced)         │
│  • Can INSERT orders, claims, withdrawals   │
│  • CANNOT write to:                         │
│      sp_agent_wallets (no policy)           │
│      sp_wallet_transactions (no policy)     │
│      sp_commissions (service_role only)     │
│      sp_payments (service_role only)        │
└──────────────────┬──────────────────────────┘
                   │  anon key (public)
                   ▼
┌─────────────────────────────────────────────┐
│  SUPABASE (Row Level Security)              │
│                                             │
│  Agents: see only rows WHERE agent_id =     │
│           auth.uid()                        │
│  Customers: see only own policies/claims    │
│  Admins: bypass RLS via service_role        │
└──────────────────┬──────────────────────────┘
                   │  service_role key (server-only)
                   ▼
┌─────────────────────────────────────────────┐
│  EDGE FUNCTIONS (Deno, server-side)         │
│                                             │
│  • credit_agent_wallet()    SECURITY DEFINER│
│  • request_withdrawal_deduct() SEC. DEFINER │
│  • reverse_withdrawal()     SECURITY DEFINER│
│  • Xendit API calls                         │
│  • Xendit key from Vault only               │
└─────────────────────────────────────────────┘
```

---

## 11. PWA / Mobile Behaviour

- Installable on Android (Chrome) and iOS (Safari Add to Home Screen)
- Service worker: Workbox, `skipWaiting + clientsClaim` for instant updates
- Offline: shows cached shell; data operations require network
- Push: web push subscriptions via `push_subscriptions` table
- `vite:preloadError` handler → auto-reload on stale chunk after deploy (10s cooldown to prevent loop)
- Dark mode: `dark:` TailwindCSS classes, follows system preference

---

## 12. Operational Runbook

### Go-live checklist

- [ ] Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel Dashboard
- [ ] Set `VITE_ADMIN_KEY` in Vercel Dashboard
- [ ] Store `XENDIT_SECRET_KEY` in Supabase Vault via SQL: `SELECT vault.create_secret('xnd_...', 'XENDIT_SECRET_KEY', 'Xendit key')`
- [ ] Set Supabase auth redirect URL to production Vercel domain
- [ ] Add production domain to Google OAuth authorized redirect URIs
- [ ] Set Xendit webhook URL to `https://<supabase-ref>.supabase.co/functions/v1/xendit-webhook`
- [ ] Set Xendit webhook token in Supabase edge function secrets (`XENDIT_WEBHOOK_TOKEN`)
- [ ] Insert Telegram `bot_token` and `admin_chat_id` into `sp_bot_config`
- [ ] Create at least one `MASTER_ADMIN` user in `sp_users`
- [ ] Set `APP_URL` edge function secret to production URL
- [ ] Assign `FINANCE_MANAGER` role to at least one user for L2 withdrawal approvals
- [ ] Assign `FINANCE_DIRECTOR` role to at least one user for L3 withdrawal approvals

### Xendit fee reference (disbursements)

| Bank type | Fee |
|---|---|
| Same bank | Rp 2,500 |
| Intrabank / BI-FAST | Rp 2,500–5,000 |
| SKN / RTGS | Rp 5,000–25,000 |
| Default configured | Rp 5,000 |

> Adjust `XENDIT_FEE = 5000` in `requestWithdrawal()` in `supabaseService.ts` if Xendit updates pricing.
