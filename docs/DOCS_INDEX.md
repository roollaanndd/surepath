# SurePath — Indeks Dokumen

> Peta navigasi semua dokumen `docs/` (57 file + indeks ini). Deskripsi
> diturunkan dari judul/konten berkas — bukan klaim baru. Untuk *cara kerja*
> sehari-hari (workflow + mini-plan per bagian), mulai dari
> [`PLAYBOOK.md`](PLAYBOOK.md). Aturan induk proyek: `AGENTS.md` (root).

## Entry point (mulai dari sini)

| Dokumen | Kapan dibaca |
|---|---|
| `../AGENTS.md` | Aturan kerja, guardrail, siklus rilis — WAJIB untuk semua kontributor |
| [`../product.md`](../product.md) | **Guideline produk di root** — visi, pengguna, peran, journey, ruang lingkup, acceptance criteria, aturan anti-rekayasa (anti-invention) |
| [`../design.md`](../design.md) | **Guideline desain di root** — sistem visual diapprove (admin light-first), token ds-*/sp-* riil, a11y/Responsif, checklist QA desain, register utang desain |
| [PLAYBOOK.md](PLAYBOOK.md) | Workflow operasional + mini-plan per bagian (rilis, tema, portal, edge, testing, deploy) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Bentuk sistem secara umum |
| [TECHNICAL_SPEC.md](TECHNICAL_SPEC.md) | Spesifikasi teknis rinci |
| [PRD.md](PRD.md) | Kebutuhan produk |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Cara deploy ke tiap target |
| [ROADMAP.md](ROADMAP.md) | Arah perkembangan fitur |
| [HANDOVER.md](HANDOVER.md) | Onboarding sesi/penyerahan baru |
| [PROJECT_RECALL.md](PROJECT_RECALL.md) | Rekap konteks proyek untuk memulihkan ingatan |
| [CHANGELOG.md](CHANGELOG.md) | Riwayat rilis per versi |

## Arsitektur & spesifikasi

| Dokumen | Isi |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arsitektur aplikasi & portal |
| [TECHNICAL_SPEC.md](TECHNICAL_SPEC.md) | Spesifikasi teknis implementasi |
| [CMS_ARCHITECTURE.md](CMS_ARCHITECTURE.md) | Arsitektur CMS Admin |
| [DATA_GATEWAY.md](DATA_GATEWAY.md) | Pola edge `data-gateway` (akses data service_role) |
| [DATABASE_STATE.md](DATABASE_STATE.md) | Keadaan skema/tabel Supabase saat ini |
| [DATABASE_PROTECTION.md](DATABASE_PROTECTION.md) | Aturan perlindungan database (RLS, deny-all, migrasi) |
| [AUTH_FLOW.md](AUTH_FLOW.md) | Alur autentikasi & verifikasi (OTP) |
| [API_REFERENCE.md](API_REFERENCE.md) | Referensi API/edge function |
| [APP_FLOWCHART.md](APP_FLOWCHART.md) | Diagram alur layar |
| [PLATFORM_DOCS.md](PLATFORM_DOCS.md) | Catatan per platform (PWA/Android/Capacitor) |
| [SEO.md](SEO.md) | strategi & implementasi SEO |
| [SECURITY_LAYERING.md](SECURITY_LAYERING.md) | Lapisan keamanan (edge/frontend/db) |
| [SECURITY_POLICY.md](SECURITY_POLICY.md) | Kebijakan keamanan proyek |

## Desain & UI/UX

| Dokumen | Isi |
|---|---|
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Sistem token ds-*/sp-* (pendamping PLAYBOOK Bagian 1) |
| [SUREPATH_MASTER_UI_SYSTEM.md](SUREPATH_MASTER_UI_SYSTEM.md) | Master sistem UI lintas portal |
| [UI_REDESIGN_2026-10.md](UI_REDESIGN_2026-10.md) | Rencana & catatan redesign UI Oktober 2026 |
| [UI_UX_AUDIT_2026-10-13.md](UI_UX_AUDIT_2026-10-13.md) | Audit UI/UX 13 Okt |
| [UI_UX_REDESIGN_AGENT_FIRST_2026.md](UI_UX_REDESIGN_AGENT_FIRST_2026.md) | Redesign portal agen (agent-first) |
| [CROSS_PORTAL_VISUAL_MODERNIZATION.md](CROSS_PORTAL_VISUAL_MODERNIZATION.md) | Modernisasi visual lintas portal |
| [PORTAL_NAVIGATION_AUDIT_2026-10-16.md](PORTAL_NAVIGATION_AUDIT_2026-10-16.md) | Audit navigasi portal 16 Okt |
| [ICON_SYSTEM_AUDIT.md](ICON_SYSTEM_AUDIT.md) | Audit sistem ikon |
| [OPERATOR_APP_REDESIGN.md](OPERATOR_APP_REDESIGN.md) | Redesign app operator |

## Audit & insiden

| Dokumen | Isi |
|---|---|
| [AUDIT_2026-10-28_v2.7.14.md](AUDIT_2026-10-28_v2.7.14.md) | **TERBARU** — audit statis v2.7.14: 3 P1 (injeksi `.or()`, `/api/*` tanpa auth, `camera=()` vercel.json) + P2/P3 + skor health |
| [AUDIT_2026-07-06.md](AUDIT_2026-07-06.md) | Audit 6 Jul |
| [FINAL_AUDIT_v1.23.0.md](FINAL_AUDIT_v1.23.0.md) | Audit final v1.23.0 |
| [RE_AUDIT_v1.26.0.md](RE_AUDIT_v1.26.0.md) | Audit ulang v1.26.0 |
| [INSURER_AUDIT_v1.22.0.md](INSURER_AUDIT_v1.22.0.md) | Audit portal insurer v1.22.0 |
| [OPERATOR_PENTEST_v1.18.0.md](OPERATOR_PENTEST_v1.18.0.md) | Pentest app operator v1.18.0 |
| [INCIDENT_2026-10-21_data-gateway.md](INCIDENT_2026-10-21_data-gateway.md) | Insiden data-gateway telat deploy (asal guard deploy edge) |
| [REMEDIATION_CHECKLIST.md](REMEDIATION_CHECKLIST.md) | Checklist remediasi menyeluruh |
| [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) | Kesiapan produksi |
| docs/security/SECURITY_ENGINEERING_PLAN.md | Rencana engineering keamanan |
| docs/security/RUFLO_AGENT_POC.md | POC agent RUFLO |

## Fitur & modul

| Dokumen | Isi |
|---|---|
| [PATHY_AGENT.md](PATHY_AGENT.md) | Asisten AI Pathy (kartu, briefing, TTS) |
| [PATHY_EVOLUTION_PLAN.md](PATHY_EVOLUTION_PLAN.md) | Rencana evolusi Pathy (P1–P4) |
| [INSURER_CMS_PLAN.md](INSURER_CMS_PLAN.md) | Rencana CMS insurer |
| [REGISTRATION_VERIFICATION_PLAN.md](REGISTRATION_VERIFICATION_PLAN.md) | Rencana verifikasi registrasi (OTP/Magic link) |
| [TROUBLESHOOTING_AUTH.md](TROUBLESHOOTING_AUTH.md) | Panduan diagnostik auth |

## Financing (fase 1–6)

| Dokumen | Isi |
|---|---|
| [FINANCING_PHASE1_OPERATIONS.md](FINANCING_PHASE1_OPERATIONS.md) | Operasi financing dasar |
| [FINANCING_PHASE2_CREDIT_DECISIONING.md](FINANCING_PHASE2_CREDIT_DECISIONING.md) | Keputusan kredit |
| [FINANCING_PHASE3_PARTNER_ADAPTERS.md](FINANCING_PHASE3_PARTNER_ADAPTERS.md) | Adapter mitra |
| [FINANCING_PHASE4_LOAN_OPERATIONS.md](FINANCING_PHASE4_LOAN_OPERATIONS.md) | Operasi pinjaman |
| [FINANCING_PHASE5_SERVICING_LEDGER.md](FINANCING_PHASE5_SERVICING_LEDGER.md) | Servicing & ledger |
| [FINANCING_PHASE6_BANK_RECONCILIATION.md](FINANCING_PHASE6_BANK_RECONCILIATION.md) | Rekonsiliasi bank |

## Rencana & pertumbuhan

| Dokumen | Isi |
|---|---|
| [ROADMAP.md](ROADMAP.md) | Roadmap proyek |
| [SERIES_B_PRODUCT_ROADMAP.md](SERIES_B_PRODUCT_ROADMAP.md) | Roadmap produk skenario Series B |
| [MARKETING_CRM_PLAN.md](MARKETING_CRM_PLAN.md) | Rencana CRM pemasaran |
| [marketing-growth-plan.md](marketing-growth-plan.md) | Rencana pertumbuhan pemasaran |
| docs/engineering/SUREPATH_PRODUCT_CMS_UPGRADE_AUDIT_2026-10-17.md | Audit upgrade CMS produk 17 Okt |
| docs/engineering/ecc-adoption.md | Catatan adopsi ECC |
| [APP_REVAMP_EXECUTION.md](APP_REVAMP_EXECUTION.md) | Log eksekusi revamp app (§6 = execution log rilis) |

## Distribusi & playbook platform

| Dokumen | Isi |
|---|---|
| [PLAY_STORE.md](PLAY_STORE.md) | Rencana & status distribusi Play Store |
| docs/play-store-aso.md | Catatan ASO (App Store Optimization) |

Catatan: deskripsi di atas diturunkan dari judul berkas; bila isi berkas
berubah, mutakhirkan baris terkait. Dokumen baru WAJIB didaftarkan di sini dan
diberi lokasi pas salah satu kelompok di atas.
