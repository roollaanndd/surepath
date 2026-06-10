# SurePath — Design System & UI/UX Revamp Specification

**Version:** 1.0  
**Date:** 10 June 2026  
**Scope:** Customer App + Agent App — full ecosystem redesign  
**Constraint:** UI/UX modernization only — zero backend/API/auth changes

---

## 0. Current State Audit (from uploaded screens)

### Customer App — Home (current)
| Dimension | Finding |
|-----------|---------|
| Visual hierarchy | Weak — "You're Protected" card, AI card, products, and activity all compete equally |
| Color | Inconsistent green tones; orange accents feel accidental |
| Typography | Mixed weight/size; no clear display → body scale |
| Spacing | Tight, asymmetric paddings across sections |
| Navigation | 5-tab bottom nav with unlabeled icons |
| AI | PathyChat bubble feels bolted-on, not integrated |
| Cards | 3+ competing card styles with no shared language |
| Conversion | "Featured" insurance section buried below fold |

### Agent App — Home (current)
| Dimension | Finding |
|-----------|---------|
| KPI display | Numbers readable but no visual rhythm; flat hierarchy |
| Charts | Thin line chart, no labels visible |
| Quick Actions | 4-icon grid with inconsistent icon sizes |
| Leaderboard | Avatar list feels low-density and unpolished |
| Commission focus | Headline metric (Rp 12.5M) correct priority — layout doesn't reinforce it |
| AI Sales Coach | Absent from home |
| Color use | Mostly white/gray — no premium signal |

---

## 1. Design Philosophy

> **"Intelligent protection, made visible."**

SurePath should feel like Revolut met Lemonade — the financial precision of a neobank fused with the warmth and clarity of a consumer wellness app. Every screen earns trust through calm, competent design.

### Design Principles

1. **Calm confidence** — premium neutrals with purposeful color moments, not color noise
2. **Information density done right** — data-rich without clutter; white space is structural
3. **AI is native** — the assistant is woven into context, not a floating chat button
4. **Motion has meaning** — micro-interactions signal state changes, not decoration
5. **Thumb-first** — primary actions in the bottom 40% of screen; no stretch zones

---

## 2. Color System

### Tokens (CSS custom properties — replace existing in `styles.css`)

```css
:root {
  /* === BRAND === */
  --sp-emerald-50:  #ecfdf5;
  --sp-emerald-100: #d1fae5;
  --sp-emerald-200: #a7f3d0;
  --sp-emerald-400: #34d399;
  --sp-emerald-500: #10b981;   /* Primary CTA */
  --sp-emerald-600: #059669;   /* Pressed state */
  --sp-emerald-700: #047857;   /* Dark mode CTA */
  --sp-emerald-900: #064e3b;   /* Deep accent */

  /* === PREMIUM BLUE (AI / Trust signals) === */
  --sp-blue-400: #60a5fa;
  --sp-blue-500: #3b82f6;
  --sp-blue-600: #2563eb;
  --sp-blue-900: #1e3a8a;

  /* === AMBER (Warnings / Commission / Rewards) === */
  --sp-amber-400: #fbbf24;
  --sp-amber-500: #f59e0b;
  --sp-amber-600: #d97706;

  /* === NEUTRALS === */
  --sp-gray-0:   #ffffff;
  --sp-gray-50:  #f9fafb;
  --sp-gray-100: #f3f4f6;
  --sp-gray-200: #e5e7eb;
  --sp-gray-300: #d1d5db;
  --sp-gray-400: #9ca3af;
  --sp-gray-500: #6b7280;
  --sp-gray-600: #4b5563;
  --sp-gray-700: #374151;
  --sp-gray-800: #1f2937;
  --sp-gray-900: #111827;
  --sp-gray-950: #030712;

  /* === SEMANTIC === */
  --sp-success:  var(--sp-emerald-500);
  --sp-warning:  var(--sp-amber-500);
  --sp-error:    #ef4444;
  --sp-info:     var(--sp-blue-500);

  /* === SURFACES (Light Mode) === */
  --sp-bg-base:    var(--sp-gray-50);
  --sp-bg-card:    var(--sp-gray-0);
  --sp-bg-raised:  var(--sp-gray-100);
  --sp-border:     var(--sp-gray-200);
  --sp-text-primary:   var(--sp-gray-900);
  --sp-text-secondary: var(--sp-gray-500);
  --sp-text-muted:     var(--sp-gray-400);
}

.dark {
  --sp-bg-base:    #0a0f1a;   /* Deep navy-black */
  --sp-bg-card:    #111827;
  --sp-bg-raised:  #1a2233;
  --sp-border:     rgba(255,255,255,0.08);
  --sp-text-primary:   #f9fafb;
  --sp-text-secondary: #9ca3af;
  --sp-text-muted:     #6b7280;
}
```

### Color Usage Rules

| Token | Use |
|-------|-----|
| `--sp-emerald-500` | Primary buttons, active nav, success badges, key CTAs |
| `--sp-blue-500` | AI elements, policy trust badges, info states |
| `--sp-amber-500` | Commission amounts, reward coins, expiry warnings |
| `--sp-gray-900` | Headings, primary text |
| `--sp-gray-500` | Labels, secondary text |
| `--sp-bg-card` | All card surfaces |
| `--sp-bg-base` | Page backgrounds |

---

## 3. Typography System

### Font Stack
```css
--sp-font-display: 'Sora', sans-serif;     /* Existing — keep */
--sp-font-sans:    'Inter', sans-serif;    /* Existing — keep */
--sp-font-mono:    'JetBrains Mono', monospace;  /* Numbers, amounts */
```

### Scale (Tailwind class mapping)

| Role | Size | Weight | Line Height | Class |
|------|------|--------|-------------|-------|
| Display | 32px | 700 | 1.15 | `text-[32px] font-bold leading-tight` |
| Headline | 24px | 700 | 1.25 | `text-2xl font-bold` |
| Title | 18px | 600 | 1.35 | `text-lg font-semibold` |
| Body Large | 16px | 400 | 1.6 | `text-base leading-relaxed` |
| Body | 14px | 400 | 1.6 | `text-sm leading-relaxed` |
| Caption | 12px | 500 | 1.4 | `text-xs font-medium` |
| Micro | 10px | 500 | 1.3 | `text-[10px] font-medium` |
| Amount | 28px | 700 | 1.1 | `text-[28px] font-bold font-mono` |
| Amount Small | 20px | 600 | 1.1 | `text-xl font-semibold font-mono` |

### Rules
- Amounts (Rp) always use `font-mono` for digit alignment
- Headlines: `font-display` (Sora)
- Body/UI: `font-sans` (Inter)
- Never use more than 3 type sizes on a single screen
- Minimum body text: 14px (never smaller for primary content)

---

## 4. Spacing & Layout System

### Base Unit: 4px

```
4px   → gap-1   (micro spacing within components)
8px   → gap-2   (inline element spacing)
12px  → gap-3   (label-to-input gap)
16px  → gap-4   (standard section padding)
20px  → gap-5   (card internal padding)
24px  → gap-6   (between card sections)
32px  → gap-8   (between major sections)
40px  → gap-10  (screen-level vertical rhythm)
48px  → gap-12  (hero/display sections)
```

### Screen Padding
```
Horizontal page padding: 20px (px-5)
Card internal padding:   20px (p-5)
Section gap:             24px (gap-6 or space-y-6)
Bottom nav clearance:    80px padding-bottom on scroll container
```

### Grid
- Single column on mobile (max-width: 430px)
- 2-column for quick action grids
- 3-column for product icon grids

---

## 5. Card System

All cards share: `rounded-2xl bg-[--sp-bg-card] border border-[--sp-border] shadow-sm`

### 5.1 Hero Card (Protection Summary)
```
Height:      auto (min 140px)
Background:  gradient from sp-emerald-600 to sp-emerald-800
Text:        white
Radius:      24px
Padding:     24px
Content:     Status headline + sub-metric + CTA row
Shadow:      0 8px 32px rgba(16,185,129,0.25)
```

### 5.2 KPI Card (Agent metrics)
```
Height:      auto
Background:  sp-bg-card
Border:      sp-border
Radius:      16px
Padding:     16px
Content:     Label (caption) + Value (amount) + Delta badge
```

### 5.3 AI Insight Card
```
Background:  linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)
Accent:      left border 3px solid sp-blue-400
Radius:      16px
Padding:     16px
Icon:        Sparkles (blue-400)
Text:        white + gray-300
```

### 5.4 Product Card
```
Layout:      horizontal — icon left (48x48, rounded-xl) + text right
Tap target:  full card (min 72px height)
Background:  sp-bg-card
Hover state: bg-sp-bg-raised
```

### 5.5 Activity / List Item Card
```
Layout:      leading icon + content + trailing amount/status
Padding:     16px horizontal, 14px vertical
Divider:     1px sp-border between items (not separate cards)
```

### 5.6 Achievement Card (Agent leaderboard / rewards)
```
Background:  amber gradient for #1, silver for #2, standard for rest
Badge:       rank number top-left, medal icon
```

---

## 6. Component Library

### 6.1 Buttons

**Primary**
```tsx
className="h-12 px-6 rounded-xl bg-emerald-500 text-white font-semibold text-sm
           active:bg-emerald-600 transition-all duration-150
           disabled:opacity-40 disabled:cursor-not-allowed w-full"
```

**Secondary**
```tsx
className="h-12 px-6 rounded-xl bg-emerald-50 text-emerald-700 font-semibold text-sm
           border border-emerald-200 active:bg-emerald-100 transition-all duration-150"
```

**Ghost**
```tsx
className="h-10 px-4 rounded-lg text-gray-600 font-medium text-sm
           hover:bg-gray-100 active:bg-gray-200 transition-all duration-150"
```

**Danger**
```tsx
className="h-12 px-6 rounded-xl bg-red-500 text-white font-semibold text-sm"
```

**Icon Button**
```tsx
className="w-10 h-10 rounded-xl flex items-center justify-center
           bg-gray-100 text-gray-600 active:bg-gray-200"
```

### 6.2 Bottom Navigation

Replace current nav with:

```tsx
// Customer App — 5 tabs
tabs: [
  { icon: HomeIcon,       label: "Home",     route: "/" },
  { icon: ShieldCheck,    label: "Polis",    route: "/policies" },
  { icon: FileText,       label: "Klaim",    route: "/claims" },
  { icon: Bot,            label: "AI",       route: "/assistant" },
  { icon: UserCircle,     label: "Profil",   route: "/profile" },
]

// Agent App — 5 tabs
tabs: [
  { icon: LayoutDashboard, label: "Beranda",  route: "/" },
  { icon: Users,           label: "Klien",   route: "/clients" },
  { icon: FileBarChart,    label: "Penjualan",route: "/sales" },
  { icon: Wallet,          label: "Komisi",  route: "/commission" },
  { icon: UserCircle,      label: "Profil",  route: "/profile" },
]

// Visual spec:
height: 72px
background: white (light) / sp-bg-card (dark)
border-top: 1px solid sp-border
active tab: icon color sp-emerald-500, label color sp-emerald-600, dot indicator
inactive tab: icon + label color sp-gray-400
label: 10px, font-medium
icon: 22px
safe-area: padding-bottom env(safe-area-inset-bottom)
```

### 6.3 Status Chips / Badges

```tsx
// Policy status
const statusStyles = {
  ACTIVE:   "bg-emerald-50 text-emerald-700 border border-emerald-200",
  EXPIRED:  "bg-gray-100 text-gray-500 border border-gray-200",
  PENDING:  "bg-amber-50 text-amber-700 border border-amber-200",
  ISSUED:   "bg-blue-50 text-blue-700 border border-blue-200",
  CLAIMED:  "bg-purple-50 text-purple-700 border border-purple-200",
}
// Shape: rounded-full px-3 py-1 text-xs font-medium
```

### 6.4 Input Fields

```tsx
className="w-full h-12 px-4 rounded-xl border border-gray-200
           bg-white text-gray-900 text-sm placeholder:text-gray-400
           focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500
           transition-all duration-150"
// Label above: text-xs font-medium text-gray-600 mb-1.5
// Error state: border-red-400 ring-red-400/30
// Helper text: text-xs text-gray-400 mt-1.5
```

### 6.5 Section Headers

```tsx
// Standard section header with optional action
<div className="flex items-center justify-between mb-4">
  <h2 className="text-base font-semibold text-gray-900">{title}</h2>
  {action && (
    <button className="text-xs font-medium text-emerald-600">{action}</button>
  )}
</div>
```

### 6.6 Amount Display

```tsx
// Large amount (hero / commission total)
<div>
  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
    {label}
  </span>
  <div className="flex items-baseline gap-1 mt-1">
    <span className="text-sm font-medium text-gray-500">Rp</span>
    <span className="text-[28px] font-bold font-mono text-gray-900">
      {formatNumber(amount)}
    </span>
  </div>
</div>
```

### 6.7 AI Insight Component

```tsx
// Floating contextual AI nudge — appears below hero, above products
<div className="rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950
                border border-blue-800/40 p-4 flex gap-3">
  <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
    <Sparkles className="w-4 h-4 text-blue-400" />
  </div>
  <div>
    <p className="text-xs font-semibold text-blue-300 mb-0.5">SurePath AI</p>
    <p className="text-sm text-gray-300 leading-relaxed">{message}</p>
    {action && (
      <button className="mt-2 text-xs font-semibold text-emerald-400">{action} →</button>
    )}
  </div>
</div>
```

### 6.8 Progress / Step Indicator

```tsx
// Purchase flow stepper
<div className="flex items-center gap-2">
  {steps.map((step, i) => (
    <React.Fragment key={i}>
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
        i < current  ? "bg-emerald-500 text-white" :
        i === current ? "bg-emerald-500 text-white ring-4 ring-emerald-100" :
                        "bg-gray-100 text-gray-400"
      )}>
        {i < current ? <Check className="w-3 h-3" /> : i + 1}
      </div>
      {i < steps.length - 1 && (
        <div className={cn("flex-1 h-0.5 rounded-full",
          i < current ? "bg-emerald-500" : "bg-gray-200")} />
      )}
    </React.Fragment>
  ))}
</div>
```

### 6.9 Bottom Sheet

```tsx
// Replace all modals with bottom sheets on mobile
// Overlay: fixed inset-0 bg-black/50 backdrop-blur-sm z-40
// Sheet:   fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50
//          max-height: 90vh, overflow-y-auto
//          Handle bar: w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-4
// Animation: translate-y from 100% → 0, duration 300ms ease-out
```

### 6.10 Notification Toast

```tsx
// Top-center, below status bar
className="fixed top-4 left-4 right-4 z-50 rounded-2xl p-4
           bg-gray-900 text-white shadow-2xl
           flex items-start gap-3"
// Icon left (colored by type), message right, dismiss X top-right
// Auto-dismiss: 4s with progress bar at bottom
```

---

## 7. Animation & Motion

```css
/* Entrance — cards load in */
@keyframes sp-slide-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.sp-enter { animation: sp-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
.sp-enter-d1 { animation-delay: 0.05s; }
.sp-enter-d2 { animation-delay: 0.10s; }
.sp-enter-d3 { animation-delay: 0.15s; }
.sp-enter-d4 { animation-delay: 0.20s; }

/* Number count-up — amounts */
/* Use GSAP (already installed): gsap.from(el, { textContent: 0, duration: 1, snap: { textContent: 1 } }) */

/* Skeleton loading */
@keyframes sp-shimmer {
  from { background-position: -200% 0; }
  to   { background-position: 200% 0; }
}
.sp-skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: sp-shimmer 1.4s ease infinite;
  border-radius: 8px;
}
```

### Motion Rules
- Page transitions: 250ms slide-up (not slide-left — feels lighter on mobile)
- Button press: scale(0.97) 100ms — already handled by `active:` Tailwind
- Card tap: scale(0.99) 80ms
- Bottom sheet: spring physics (cubic-bezier(0.16, 1, 0.3, 1)) 320ms
- No bounce on data loads — skeleton first, then content
- Amount counters: count-up on mount (GSAP, 800ms)

---

## 8. Customer App — Screen-by-Screen Redesign

### 8.1 Splash / Onboarding

**Problems:** Unknown (not shown — design assuming generic)

**New Spec:**
```
Screen 1 — Wordmark
  bg: sp-gray-950 (near black)
  Center: SurePath logo (wordmark white) + animated emerald shield icon
  Duration: 1.5s → fade into onboarding

Screens 2–4 — Value props (swipeable)
  bg: gradient sp-gray-950 → sp-emerald-900/10
  Illustration area: top 55% (abstract minimal illustration or Lottie)
  Headline: 28px bold white, centered, max 3 words
  Sub: 15px gray-400, centered, max 2 lines
  Progress: 3 dots bottom (active = emerald-500, inactive = gray-700)
  CTA: "Mulai" → appears only on screen 4, full-width primary button

Content:
  Slide 1: "Terlindungi Setiap Hari" — shield + calendar motif
  Slide 2: "Klaim dalam Hitungan Jam" — checkmark + timer motif  
  Slide 3: "Agen Tersertifikasi AAUI" — network/person motif
```

### 8.2 Login & Registration

**Problems (current):** Layout unknown but auth flow had signup bug (fixed PR #3)

**New Spec:**
```
Login Screen
  bg: white
  Top 35%: emerald gradient card with SurePath logo + "Selamat datang kembali"
  Form area (white, rounded-t-3xl overlapping green card):
    - Email field
    - Password field + show/hide toggle
    - "Lupa password?" link right-aligned (text-xs emerald-600)
    - Primary button "Masuk"
    - Divider "atau"
    - Google OAuth button (white border, Google icon, "Lanjutkan dengan Google")
    - Footer: "Belum punya akun? Daftar" (emerald link)

Registration Screen (Customer)
  Same layout shell
  Fields: Nama lengkap, Email, No. HP, Password, Konfirmasi password
  Below form: Terms checkbox (required, text-xs gray-500)
  CTA: "Buat Akun"

Registration Screen (Agent) — AgentOnboarding.tsx
  Additional fields: No. KTP, Referral code (optional)
  Info banner (blue AI card): "Akun agent akan diverifikasi dalam 1x24 jam"
  CTA: "Daftar sebagai Agen"

Check-email state (after agent signUp):
  Full screen centered:
    - Envelope Lottie animation
    - "Cek email kamu"
    - Body text explaining verification
    - "Buka Gmail / Email app" button
    - "Kirim ulang" ghost link
```

### 8.3 Home (Customer)

**Current Problems:**
- 3 competing card styles
- AI assistant feels decorative
- Product grid below fold on most phones
- Activity section is low-value noise at top

**Redesigned Layout:**
```
StatusBar (system)
─────────────────────────────────────
Greeting Row (px-5 pt-4)
  "Selamat pagi, [Name] 👋"  text-lg font-semibold
  Avatar + notification bell icon  →  right

─────────────────────────────────────
Hero Protection Card (mx-5 mt-3)
  bg: emerald gradient (600→800)
  Rounded: 24px
  Left:
    "Kamu Terlindungi"  text-white font-bold 18px
    "[N] Polis Aktif"   text-emerald-100 text-sm
    "Premi berikutnya: 12 hari"  text-emerald-200 text-xs mt-1
  Right:
    Large shield icon (white, 40px) with subtle glow
  Bottom row (mt-3 pt-3 border-t border-white/20):
    2 micro-stats: "Total Klaim" | "Koin Reward"
    Each: value (white bold) + label (emerald-100 xs)

─────────────────────────────────────
AI Insight Card (mx-5 mt-3)  ← contextual, not always shown
  Dark blue gradient card (see §6.7)
  "Asuransi bagasi perjalananmu belum ter-cover.
   Tambahkan perlindungan tambahan dengan Rp 45k/trip."
  Action: "Lihat Penawaran →" (emerald-400)

─────────────────────────────────────
Quick Buy (mx-5 mt-4)
  Section header: "Beli Asuransi"
  Horizontal scroll row (no wrapping, no grid)
  Each chip: icon (24px) + label, rounded-full, border, 44px height
  Items: 🚗 Kendaraan  ✈️ Perjalanan  🏥 Kesehatan  🏠 Properti  ⚡ Lainnya

─────────────────────────────────────
My Policies (mx-5 mt-4)
  Section header: "Polis Saya"  action: "Semua →"
  Horizontal scroll cards (280px wide each):
    Card: product icon + name + insurer + status chip + expiry date
    Active polis: left accent bar emerald
    Expiring soon (<30 days): amber accent bar + "Segera perpanjang" badge

─────────────────────────────────────
Recent Activity (mx-5 mt-4)
  Section header: "Aktivitas"  action: "Semua →"
  List (max 3 items, no scroll):
    Icon + title + date/left + amount/status right
    Tap → detail bottom sheet

─────────────────────────────────────
Bottom Nav (fixed, 72px)
─────────────────────────────────────
```

### 8.4 Product Marketplace

**Redesign:**
```
Top: sticky search bar  "Cari produk asuransi..."
     Filter chips below: Semua | Kendaraan | Perjalanan | Kesehatan | Properti

Product Cards (full-width):
  Left: colored icon bg (emerald/blue/amber, 48x48 rounded-xl)
  Middle: Product name (title) + tagline (caption gray-500)
  Right: "Dari Rp X" (amount-small emerald) + "Beli →" chip

Featured / Promo: hero banner card (gradient bg, full-bleed, 160px height)

AI Recommendation row (between categories):
  "Berdasarkan profil kamu, SurePath AI merekomendasikan:"
  Horizontal scroll of 2 AI-highlighted product cards
```

### 8.5 Purchase / Quote Flow (multi-step wizard)

**Redesign:**
```
Persistent elements:
  Back arrow (top-left)
  Step indicator (§6.8) — top, below header
  Product name subtitle (gray-500 xs)

Per-step:
  Step 1 — Informasi Kendaraan/Perjalanan/etc
    Clean form (§6.4 inputs), one logical group per screen if possible
    "Lanjut →" button pinned to bottom (above keyboard: use paddingBottom)

  Step 2 — Pilih Paket / Coverage
    Card-based option selection (not radio buttons)
    Each package: name + coverage list (3 bullets) + price/year + "Pilih" button
    Selected state: emerald border + bg-emerald-50 + checkmark

  Step 3 — Review & Konfirmasi
    Summary card (all selected info)
    Price breakdown: base + optional additions + total (bold)
    "Bayar Sekarang" → Xendit payment

  Payment success:
    Full-screen success state: animated checkmark (Lottie) + emerald bg
    "Polis Kamu Aktif!" headline
    Policy number + PDF download CTA
    "Kembali ke Beranda" button
```

### 8.6 Policy Wallet

**Redesign:**
```
Header: "Polis Saya" + filter tabs (Semua | Aktif | Kedaluwarsa | Klaim)

Policy Cards (vertical list, full-width):
  Top row: insurer logo (24px) + insurer name + status chip
  Policy name: title weight
  Coverage amount: amount-small gray-700
  Dates row: "Berlaku [date] – [date]"
  Bottom row: "Lihat Detail" ghost | "Perpanjang" primary (if expiring)
  Left accent bar color = status color

Empty state:
  Centered illustration + "Belum ada polis aktif"
  + "Beli Polis Pertama" primary CTA
```

### 8.7 Claim Submission

**Redesign:**
```
Step 1 — Pilih Polis
  Dropdown replaced with card-picker bottom sheet
  Each policy: name + product type + policy number

Step 2 — Detail Kejadian  
  Date picker (native, styled)
  Description textarea (min 4 lines)
  Location field

Step 3 — Upload Foto
  Photo grid (2x2) with dashed-border add buttons
  Each slot: upload icon + label
  Photo added: thumbnail + remove X
  AI note (blue card): "AI kami akan menganalisis kerusakan otomatis"

Step 4 — Review
  Summary + "Ajukan Klaim" button

Claim status tracking:
  Timeline component:
    Vertical line connecting nodes
    Each node: circle (filled=done, ring=current, empty=pending) + label + timestamp
    Statuses: Diterima → Investigasi → Disetujui → Dibayar
```

### 8.8 AI Assistant Screen

**Redesign:**
```
Header: "SurePath AI" + Sparkles icon (blue)

Chat interface:
  Messages: user = right (emerald bubble), AI = left (gray-100 bubble, max-w-[80%])
  AI bubble: left icon = small bot avatar (blue gradient circle)
  Message timestamp: xs gray-400 below each message

Quick prompt chips (above input, horizontal scroll):
  "Apa yang di-cover polis saya?"
  "Cara klaim?"
  "Rekomendasi asuransi"
  "Kapan polis jatuh tempo?"

Input bar (bottom, above nav):
  Rounded-full input + send button (emerald)
  Mic icon for voice (placeholder for future)

AI typing indicator: 3 animated dots in gray bubble

Contextual suggestions: AI proactively surfaces renewals, missing coverage, claim status
```

### 8.9 Profile & Settings

**Redesign:**
```
Profile header:
  Avatar (large, 72px, with upload button overlay)
  Name (headline) + email (body gray-500) + member-since badge

Settings list (grouped):
  Group 1: Akun — Ubah Profil, Ubah Password, Verifikasi KTP
  Group 2: Notifikasi — toggle rows
  Group 3: Keamanan — 2FA, Sesi Aktif
  Group 4: Lainnya — Bantuan, Syarat & Ketentuan, Tentang App, Keluar

Each row: icon (20px gray) + label + chevron or toggle
Group headers: text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 px-1

Keluar: destructive red text, no icon, confirmation bottom sheet
```

---

## 9. Agent App — Screen-by-Screen Redesign

### 9.1 Home (Agent)

**Current Problems:**
- Commission number is correct priority but typography hierarchy loses it
- Charts unclear
- AI Sales Coach absent
- Quick Actions icons too small
- Leaderboard occupies too much space for low-value info

**Redesigned Layout:**
```
StatusBar
─────────────────────────────────────
Header (px-5 pt-4)
  "Halo, [Name]" text-lg font-semibold
  Avatar + notification bell

─────────────────────────────────────
Commission Hero Card (mx-5 mt-3)
  bg: dark slate (gray-900) — premium, wealth signal
  "Komisi Bulan Ini"  text-gray-400 xs uppercase tracking-wide
  "Rp 12.500.000"     text-[32px] font-bold font-mono text-white
  Delta badge: "+18% vs bulan lalu" (emerald pill)
  
  Bottom row (3 micro-stats, divider between):
    Pending: Rp X | Withdrawn: Rp X | Rank: #[N]

─────────────────────────────────────
AI Sales Coach (mx-5 mt-3)
  Blue gradient AI card (§6.7)
  "Target bulan ini 73% tercapai. 
   Follow up 3 lead ini untuk menutup target:"
  3 client chips (avatar + name, horizontal)
  Action: "Buka Pipeline →"

─────────────────────────────────────
KPI Row (mx-5 mt-3)  — 3 cards, horizontal
  Card 1: "Klien Baru" / [N] / +[N] this month
  Card 2: "Polis Aktif" / [N] 
  Card 3: "Quote Pending" / [N]
  Style: §5.2 KPI card, 1/3 width each, gap-3

─────────────────────────────────────
Sales Chart (mx-5 mt-4)
  Section header: "Performa Penjualan"  tabs: 7H | 30H | 3B
  Recharts AreaChart, emerald fill, smooth curve
  Y-axis: abbreviated (12.5jt), X-axis: dates abbreviated
  Height: 160px
  Tooltip: dark card (gray-900) with emerald dot + Rp amount

─────────────────────────────────────
Quick Actions (mx-5 mt-4)
  Section header: "Aksi Cepat"
  2x2 grid, each cell: rounded-2xl bg-gray-50 p-4
    Icon (24px emerald/blue/amber) + label (text-sm font-medium)
  Actions: Tambah Klien | Buat Quote | Cek Komisi | Lihat Polis

─────────────────────────────────────
Recent Clients (mx-5 mt-4)
  Section header: "Klien Terbaru"  action: "Semua →"
  List (3 items):
    Avatar initial circle + name + last activity date + policy count badge

─────────────────────────────────────
Bottom Nav (fixed, 72px)
─────────────────────────────────────
```

### 9.2 Client CRM

**Redesign:**
```
Search bar (sticky top): "Cari nama, email, atau no. HP..."
Filter tabs: Semua | Aktif | Jatuh Tempo | Prospek

Client list items:
  Avatar (initial, color-coded by name) 40px circle
  Name (title weight) + last-policy type (caption gray-500)
  Right: policy count badge (emerald pill) + last activity (xs gray-400)

FAB button: "+" (emerald, 56px circle, bottom-right, above nav)
  Tap → Add Client bottom sheet

Client Detail (separate screen):
  Header: Avatar (large) + name + phone + email
  Tabs: Polis | Klaim | Quote | Aktivitas
  
  Polis tab: policy cards (§8.6 style)
  Aktivitas tab: timeline (§8.7 claim tracking style)
  
  Sticky bottom bar: "Buat Quote" primary | "Hubungi" secondary
```

### 9.3 Quote Builder

**Redesign:**
```
Step 1 — Pilih Klien
  Search-to-select with existing clients
  Or "Klien Baru" option

Step 2 — Pilih Produk
  Product cards (§6.4 style) with tap selection

Step 3 — Isi Detail
  Same form as customer purchase wizard

Step 4 — Review Quote
  Premium summary card
  Coverage checklist
  Validity: "Quote berlaku 7 hari"
  Actions: "Kirim ke Klien" (share) | "Simpan" | "Beli Sekarang"

"Kirim ke Klien" → generates shareable link / WhatsApp pre-fill
```

### 9.4 Commission & Wallet

**Redesign:**
```
Header section:
  Total wallet balance (amount-display, dark hero card like §9.1 commission card)
  "Tersedia untuk ditarik: Rp X"
  "Tarik Dana" primary button

Tabs: Semua | Komisi | Override | Bonus

Transaction list:
  Date group headers (sticky): "Juni 2026"
  Each item:
    Policy icon + client name + policy number
    Right: +Rp X (emerald) or -Rp X (gray for withdrawal)
    Sub: commission type tag (regular / override / bonus)

Withdrawal CTA:
  "Tarik Dana" opens bottom sheet:
    Amount input (with quick-select chips: 500rb | 1jt | 5jt | Semua)
    Bank account selector
    "Ajukan Penarikan" button
```

### 9.5 Sales Performance / Reports

**Redesign:**
```
Period selector: tabs (Bulan Ini | Kuartal | Tahun)

Hero metric: GWP this period (amount-display, dark card)
Delta from previous period

Charts section (vertical stack):
  1. Revenue trend (AreaChart, 200px)
  2. Product mix (PieChart/DonutChart, 180px)
     Legend below: product name + % + Rp
  3. Agent rank context: "Kamu di posisi #[N] dari [M] agen"
     Thin horizontal bar showing position

Leaderboard (top 5 only):
  Rank | Avatar | Name | Commission
  Gold/silver/bronze treatment for top 3
  User's own row: highlighted emerald-50 bg

Export: "Unduh Laporan" button → generates PDF summary
```

### 9.6 Notifications

**Redesign:**
```
Tabs: Semua | Komisi | Polis | Klaim | Sistem

Notification items:
  Icon (colored by type) + title + body (2 lines, truncated)
  Timestamp right (relative: "2 jam lalu")
  Unread: left dot indicator (emerald-500) + slightly elevated bg

Mark all read: button top-right
Empty state: centered icon + "Semua notifikasi sudah dibaca"
```

---

## 10. Tailwind Config Updates

Add to `tailwind.config.cjs`:

```javascript
theme: {
  extend: {
    colors: {
      'sp-emerald': { /* same as --sp-emerald-* */ },
      'sp-blue': { /* --sp-blue-* */ },
      'sp-amber': { /* --sp-amber-* */ },
    },
    fontFamily: {
      display: ['Sora', 'sans-serif'],
      sans: ['Inter', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    borderRadius: {
      '2xl': '1rem',
      '3xl': '1.5rem',
      '4xl': '2rem',
    },
    boxShadow: {
      'sp-card':   '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
      'sp-hero':   '0 8px 32px rgba(16,185,129,0.20)',
      'sp-modal':  '0 25px 50px rgba(0,0,0,0.25)',
      'sp-nav':    '0 -1px 0 rgba(0,0,0,0.06)',
    },
    animation: {
      'sp-enter': 'sp-slide-up 0.35s cubic-bezier(0.16,1,0.3,1) both',
      'sp-shimmer': 'sp-shimmer 1.4s ease infinite',
    },
    keyframes: {
      'sp-slide-up': {
        from: { opacity: '0', transform: 'translateY(16px)' },
        to:   { opacity: '1', transform: 'translateY(0)' },
      },
      'sp-shimmer': {
        from: { backgroundPosition: '-200% 0' },
        to:   { backgroundPosition:  '200% 0' },
      },
    },
  },
}
```

---

## 11. Implementation Roadmap

### Phase A — Design Tokens & Base (1–2 days)
1. Update `styles.css`: replace color variables, add sp-* utility classes
2. Update `tailwind.config.cjs`: new colors, shadows, animation keyframes
3. Create `components/ui/` shared primitives: Button, Badge, Input, Card, BottomSheet
4. Update bottom navigation in `MobilePortal.tsx` and agent equivalent

### Phase B — Customer Home & Auth (2–3 days)
5. Redesign `AuthGate.tsx` login/register screens
6. Redesign `AgentOnboarding.tsx` registration UI
7. Redesign Customer Home in `MobilePortal.tsx`
8. Update `UI.tsx` shared card components

### Phase C — Customer Flows (3–4 days)
9. Update all insurance wizard screens (car, travel, PA, MPAR, health)
10. Redesign policy wallet view
11. Redesign claims submission & tracking
12. Add AI Insight component to relevant screens

### Phase D — Agent App (3–4 days)
13. Redesign Agent Home
14. Redesign CRM (client list + detail)
15. Redesign Commission / Wallet screen
16. Redesign Sales Performance charts

### Phase E — Polish (1–2 days)
17. Add skeleton loading states everywhere
18. Add GSAP count-up on amount displays
19. Add `sp-enter` animations on card mount
20. Dark mode audit pass
21. Accessibility: ARIA labels, contrast ratios, tap-target sizes (min 44px)

---

## 12. Accessibility Requirements

| Rule | Standard |
|------|---------|
| Color contrast (text on bg) | WCAG AA minimum (4.5:1 for body, 3:1 for large text) |
| Tap targets | Minimum 44x44px for all interactive elements |
| Focus states | Visible ring on keyboard focus (ring-2 ring-emerald-500) |
| Screen reader labels | `aria-label` on icon-only buttons, `role="status"` on loading |
| Motion | `prefers-reduced-motion`: disable sp-enter animations, keep content visible |
| Font sizes | Never below 12px for any visible text |

---

## 13. Component File Map

| Component | File | Priority |
|-----------|------|----------|
| Bottom navigation | `MobilePortal.tsx` | A |
| Auth screens | `AuthGate.tsx` | A |
| Agent registration | `AgentOnboarding.tsx` | A |
| Role selection | `RoleSelectionScreen.tsx` | A |
| Shared cards/buttons | `components/shared/UI.tsx` | A |
| AI insight card | new: `components/shared/AIInsightCard.tsx` | B |
| Skeleton loader | new: `components/shared/Skeleton.tsx` | B |
| Bottom sheet | new: `components/shared/BottomSheet.tsx` | B |
| Customer home | inside `MobilePortal.tsx` customer route | B |
| Agent home | inside agent portal component | B |
| Insurance wizards | `components/car/`, `components/insurance/` | C |
| Commission wallet | `components/agent/CommissionWallet.tsx` | D |
| Claims tracking | `components/insurance/ClaimsStatus.tsx` | D |
