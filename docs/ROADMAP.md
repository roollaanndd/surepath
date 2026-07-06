# SurePath — Product Roadmap (2026–2027)

**Goal:** $50M ARR, 100K active policies, 5K agents, OJK-compliant, Series A ready

---

## Immediate (Next 30 Days)

| # | Feature | Effort | Why |
|---|---------|--------|-----|
| 1 | **Policy digital certificate** with QR verification endpoint | M | Insurers require it; builds customer trust |
| 2 | **Automated renewal email reminders** (30/7/1 day) | S | Single largest churn reducer |
| 3 | **Admin MFA** (TOTP via Supabase Auth) | S | Security hygiene before scale |
| 4 | **OTP rate limiting** in send-otp function | S | Prevent SMS abuse |
| 5 | **Native push notifications** (Firebase FCM + Capacitor) | M | Engage Android users outside browser |
| 6 | **Audit log table** for admin actions | S | Compliance requirement |

---

## Q3 2026 (Phase 1 — Compliance & Stability)

| # | Feature | Effort | OKR |
|---|---------|--------|-----|
| 7 | **OJK LBPP/LSPP report generator** | L | Regulatory — without this, can't scale underwriting volume |
| 8 | **Policy comparison view** (multi-insurer quotes side by side) | M | +15% conversion rate |
| 9 | **Agent mobile app** (Play Store release) | L | 40% of agents mobile-only |
| 10 | **Withdrawal auto-disburse** (no manual approve step) | M | Agent NPS +10 |
| 11 | **Email/SMS status updates** at each policy status change | M | Customer NPS +15 |
| 12 | **QRIS in-app display** for payment | S | Indonesia's fastest-growing payment method |

---

## Q4 2026 (Phase 2 — Growth)

| # | Feature | Effort | OKR |
|---|---------|--------|-----|
| 13 | **WhatsApp Business API chatbot** — policy lookup, renewal, claims | XL | Reach 175M WA users; 3x engagement |
| 14 | **Instant issuance AI** — auto-approve low-risk motor profiles | XL | Reduce 48h wait to <60s for 70% of orders |
| 15 | **Embedded insurance API** — partner REST API | XL | 10x distribution via platform partners |
| 16 | **Agent gamification 2.0** — monthly competition, prizes | M | 2x agent productivity, reduce churn |
| 17 | **Micro-insurance** — daily/weekly gig worker policies | L | 80M untapped gig market |
| 18 | **Multi-insurer quote comparison** for agents | M | Agent sells more with less effort |

---

## Q1 2027 (Phase 3 — Scale)

| # | Feature | Effort | OKR |
|---|---------|--------|-----|
| 19 | **AI claims automation** — photo damage assessment, auto-reserve | XL | Cut claim cycle 14d → 3d |
| 20 | **Bancassurance partner portal** (white-label) | XL | 10M+ captive banking customers |
| 21 | **Multi-country** — Malaysia (BNM) / Philippines (IC) | XL | SEA expansion, Series B story |
| 22 | **Telematics-based motor pricing** | L | Usage-based insurance, 20% better loss ratio |
| 23 | **Parametric travel insurance** — auto-payout on flight delay | L | Zero-friction claims, viral marketing |
| 24 | **Actuarial data product** for reinsurers | M | New B2B revenue stream |

---

## Sizing Guide
- **S** = 1–3 days
- **M** = 1–2 weeks  
- **L** = 2–4 weeks
- **XL** = 1–3 months

---

## Series A Checklist

Before raising Series A, SurePath needs to demonstrate:

- [ ] IDR 10B+ GWP on-platform (monthly run rate)
- [ ] 500+ active licensed agents
- [ ] 2+ insurance company partnerships with signed MoU
- [ ] OJK "digital insurance intermediary" registration in progress
- [ ] <5% claims dispute rate
- [ ] NPS > 50 from customer surveys
- [ ] Cohort data: 60%+ of customers renew at year 1
- [ ] Android app 1,000+ installs, 4.0+ rating
- [ ] Security: SOC 2 Type I report or equivalent ISMS
- [ ] Data room ready (cap table, financials, contracts, IP assignments)
