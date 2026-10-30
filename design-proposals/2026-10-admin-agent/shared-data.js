/* ==========================================================================
   SurePath — Design Proposal Demo Data (Okt 2026)
   Semua data di bawah adalah data ilustratif untuk memvisualisasikan tata letak.
   All data below is illustrative layout demo data — not real records.
   ========================================================================== */

window.SP_DEMO = {
  sync: { time: "12:04", latency: "320ms" },

  kpis: [
    { id: "orders",  label: "Pesanan baru",      en: "New orders",        value: 27,   delta: "+12%", dir: "up",   sub: "vs kemarin" },
    { id: "pending", label: "Menunggu keputusan", en: "Awaiting decision", value: 9,    delta: "−3",   dir: "down", sub: "vs kemarin" },
    { id: "claims",  label: "Klaim aktif",        en: "Active claims",     value: 5,    delta: "+1",   dir: "up",   sub: "2 baru hari ini" },
    { id: "wl1",     label: "Penarikan L1",       en: "L1 withdrawals",    value: 4,    delta: "",     dir: "flat", sub: "total Rp 38,2 jt" }
  ],

  queue: [
    { id: "ORD-2510-0731", vehicle: "Honda Brio Satya E 2022",  plate: "B 3456 XY", agent: "Rani Kusuma",    premium: 4250000,  wait: "2 j 14 mnt",  waitLevel: "old",  status: "Dibayar · Perlu keputusan", paid: "QRIS · Xendit" },
    { id: "ORD-2510-0730", vehicle: "Yamaha NMAX 155 2024",     plate: "B 6521 KLM", agent: "Bagas Prayoga", premium: 1870000,  wait: "5 j 40 mnt",  waitLevel: "old",  status: "Dibayar · Perlu keputusan", paid: "VA BCA · Xendit" },
    { id: "ORD-2510-0729", vehicle: "Toyota Avanza G 2023",     plate: "D 4210 GH",  agent: "Rani Kusuma",    premium: 3640000,  wait: "1 j 04 mnt",  waitLevel: "mid",  status: "Dibayar · Perlu keputusan", paid: "E-wallet · Xendit" },
    { id: "ORD-2510-0728", vehicle: "Honda Vario 160 2023",     plate: "F 1120 AB",  agent: "Dewi Anggita",   premium: 1245000,  wait: "44 mnt",      waitLevel: "new",  status: "Dibayar · Perlu keputusan", paid: "QRIS · Xendit" },
    { id: "ORD-2510-0726", vehicle: "Mitsubishi Xpander ULT 24", plate: "B 8890 TR",  agent: "Fajar Nugraha",  premium: 5310000,  wait: "22 j 10 mnt", waitLevel: "old",  status: "Dokumen kurang",           paid: "VA BNI · Xendit" }
  ],

  drawer: {
    ref: "ORD-2510-0731",
    vehicle: "Honda Brio Satya E 2022",
    plate: "B 3456 XY",
    cover: "Comprehensive TLO+ · sewa 1 thn",
    issued: "Para pemilik: Putri Larasati, S.H.",
    agent: "Rani Kusuma · tier Emerald",
    paid: "QRIS · XENDIT-INV-8891 · PAID 14 Okt 12:03",
    breakdown: [
      { k: "Premi dasar (OJK 5,62% × TSI Rp 68 jt)", v: "Rp 3.820.000" },
      { k: "Perluasan banjir + gempa",               v: "Rp 380.000" },
      { k: "Biaya polisi + materai",                 v: "Rp 40.000" },
      { k: "Total premi dibayar",                    v: "Rp 4.250.000", strong: true }
    ],
    checks: [
      { id: "id",     label: "Identitas pemegang", en: "Holder identity",   doc: "KTP · Putri Larasati",           state: "ok",     note: "Cocok dengan data pemesan" },
      { id: "stnk",   label: "Dokumen kendaraan",  en: "Vehicle documents", doc: "STNK · B 3456 XY",               state: "ok",     note: "Pajak aktif s/d Mei 2027" },
      { id: "pay",    label: "Bukti pembayaran",   en: "Payment proof",     doc: "Xendit invoice 8891 · PAID",     state: "ok",     note: "Nilai cocok Rp 4.250.000" },
      { id: "photo",  label: "Foto kondisi",       en: "Condition photos",  doc: "AI audit skor 0,94 (baik)",      state: "warn",   note: "1 foto kaca depan kurang tajam" }
    ],
    pdf: "SP-2026-X-8281-Penawaran-Zurich-NHAbdulJabbar.pdf"
  },

  sideTasks: [
    { tag: "Tarik L1", tagtone: "warn",  title: "Penarikan Rp 7.500.000",        sub: "Bagas Prayoga · BCA · menunggu L1 Finance",      wait: "6 j" },
    { tag: "Tarik L1", tagtone: "warn",  title: "Penarikan Rp 2.100.000",        sub: "Dewi Anggita · BRI · menunggu L1 Finance",       wait: "2 j" },
    { tag: "Klaim",    tagtone: "alert", title: "Klaim CLM-2510-0092 — kaca",    sub: "Avanza D 4210 GH · dikerjakan operator",         wait: "3 j" }
  ],

  activity: [
    { t: "12:01", txt: "Xendit webhook PAID — ORD-2510-0731 (QRIS Rp 4.250.000)" },
    { t: "11:58", txt: "Agent baru menunggu verifikasi: Sinta Maharani (AAUI diterima)" },
    { t: "11:40", txt: "Telegram: klaim baru CLM-2510-0092 masuk" },
    { t: "11:22", txt: "Polis diterbitkan: ORD-2510-0713 · Zurich · auto-approve" }
  ],

  menu: [
    { group: "Hari Ini", en: "Today", items: [
      { ic: "grid",   label: "Ringkasan",   en: "Overview",   active: true },
      { ic: "checklist", label: "Tugas Saya", en: "My tasks", badge: 9 }
    ]},
    { group: "Polis & Klaim", en: "Policies & claims", items: [
      { ic: "folder", label: "Pesanan Polis",  en: "Policy orders", badge: 9 },
      { ic: "shield", label: "Klaim",          en: "Claims",        badge: 5 },
      { ic: "swap",   label: "Endorsement",    en: "Endorsements" },
      { ic: "doc",    label: "Dokumen",        en: "Documents" }
    ]},
    { group: "Mitra", en: "Partners", items: [
      { ic: "users",  label: "Mitra",      en: "Agents", badge: 1 },
      { ic: "user",   label: "Pengguna",   en: "Users" }
    ]},
    { group: "Keuangan", en: "Finance", items: [
      { ic: "wallet", label: "Transaksi",  en: "Transactions" },
      { ic: "coin",   label: "Komisi",     en: "Commissions" },
      { ic: "chart",  label: "Laporan",    en: "Reports" }
    ]},
    { group: "Katalog & Harga", en: "Catalog & pricing", items: [
      { ic: "box",    label: "Produk",     en: "Products" },
      { ic: "tag",    label: "Harga & Rate", en: "Rates" },
      { ic: "star",   label: "Tier & Promo", en: "Tiers & promos" }
    ]},
    { group: "Sistem", en: "System", items: [
      { ic: "spark",  label: "AI & Pathy", en: "AI & Pathy" },
      { ic: "globe",  label: "Konten Web", en: "Web content" },
      { ic: "eye",    label: "Jejak & Keamanan", en: "Audit & security" },
      { ic: "cog",    label: "Pengaturan", en: "Settings" }
    ]}
  ],

  agent: {
    name: "Rani Kusuma",
    tier: "Emerald",
    area: "Bogor · Jawa Barat",
    wallet: { avail: 12480500, pending: 3120000, mtd: 21430000, target: 30000000, pct: 71 },
    kpis: [ { label: "Kutipan terbuka", en: "Open quotes", value: 4 }, { label: "Klien", en: "Clients", value: 86 }, { label: "Polis aktif", en: "Active policies", value: 71 } ],
    tasks: [
      { tone: "hot",  title: "Follow-up klea Wulandari",        sub: "Mitraplus · tertarik premi Rp 1,9 jt · 2 hari belum dibalas", m: "Hubungi / Call" },
      { tone: "hot",  title: "Perpanjangan B 3456 XY",          sub: "Berpakai 30 Okt · Asvelop Brio · sainer verifikasi STNK",     th: "Kirim kutipan / Send quote" },
      { tone: "norm", title: "Klaim CLM-2510-0092 milik klien", sub: "Operator sedang memeriksa · notifikasi ke saat tiap tahap",   tx: "Lacak / Track" }
    ],
    recent: [
      { ord: "ORD-2510-0701", txt: "Komisi kredit", v: "+Rp 212.500", sub: "Brio · diterbitkan 12:04" },
      { ord: "ORD-2510-0688", txt: "Komisi kredit", v: "+Rp 158.400", sub: "NMAX · dikonfirmasi kemarin" },
      { ord: "ORD-2510-0655", txt: "Menunggu pembayaran", v: "Rp 985.000", sub: "Xpander · tagihan berlaku 2 hari" }
    ],
    quote: {
      step: 1, steps: ["Kendaraan", "Klien", "Jaminan & premi", "Ringkasan & kirim"],
      plate: "B 1234 CD",
      model: "Honda Brio Satya 1.2 E 2022 · TSI Rp 168.000.000",
      cover: [
        { k: "Premi dasar TLO", v: "Rp 4.120.000" },
        { k: "Perluasan banjir + gempa", v: "+Rp 640.000" },
        { k: "Tanggung jawab pihak ke-3", v: "Termasuk" },
        { k: "Estimasi premi (tahun 1)", v: "Rp 4.760.000", strong: true }
      ],
      commission: "Estimasi komisi Rani: Rp 428.400 (9%)"
    },
    walletTx: [
      { t: "Okt 20", v: "+Rp 428.400", sub: "Komisi · ORD-2510-0701 · masuk" },
      { t: "Okt 18", v: "+Rp 312.000", sub: "Komisi · ORD-2510-0688 · masuk" },
      { t: "Okt 15", v: "−Rp 5.000",  sub: "Biaya penarikan · XENDIT-DSB-2201" },
      { t: "Okt 14", v: "+Rp 158.400", sub: "Komisi · ORD-2509-0988 · masuk" }
    ]
  },

  rupiah(n) {
    return "Rp " + n.toLocaleString("id-ID");
  },

  icons: {
    grid:    "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
    checklist: "M9 6h11M9 12h11M9 18h11M4 5.5l1.5 1.5L8 4.5M4 11.5l1.5 1.5L8 10.5M4 17.5l1.5 1.5L8 16.5",
    folder:  "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z",
    shield:  "M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z",
    swap:    "M7 4v12M7 4L3.5 7.5M7 4l3.5 3.5M17 20V8m0 12l3.5-3.5M17 20l-3.5-3.5",
    doc:     "M7 3h7l4 4v14H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v4h4",
    users:   "M16 19a4 4 0 00-8 0M12 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7M20.5 19a3 3 0 00-2-2.4M17 8a3 3 0 013 5",
    user:    "M12 12a4 4 0 100-8 4 4 0 000 8zM5 20a7 7 0 0114 0",
    wallet:  "M3 7a2 2 0 012-2h13a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM16 12h.5",
    coin:    "M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 14.5c.6 1 1.4 1.5 2.5 1.5 1.5 0 2.5-.8 2.5-2s-1-1.7-2.5-2-2.3-.8-2.3-1.9S10.6 8 12 8c1 0 1.9.5 2.4 1.4M12 6.5v11",
    chart:   "M4 20h16M7 16v-5M12 16V8M17 16v-8",
    box:     "M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5",
    tag:     "M3 12V5a2 2 0 012-2h7l9 9-9 9-9-9zM8 8h.01",
    star:    "M12 3l2.7 5.6 6.3.9-4.5 4.3 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.5l6.3-.9L12 3z",
    spark:   "M12 3v3M12 18v3M5.6 5.6l2.2 2.2M16.2 16.2l2.2 2.2M3 12h3M18 12h3M5.6 18.4l2.2-2.2M16.2 7.8l2.2-2.2M12 15a3 3 0 100-6 3 3 0 000 6",
    globe:   "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9",
    eye:     "M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12zM12 12h.01",
    cog:     "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 01-.1 1.2l2 1.5-2 3.4-2.3-.9c-.7.5-1.4 1-2.2 1.2l-.4 2.4h-4l-.4-2.4a7.6 7.6 0 01-2.2-1.2l-2.3.9-2-3.4 2-1.5A7 7 0 015 12c0-.4 0-.8.1-1.2l-2-1.5 2-3.4 2.3.9c.7-.5 1.4-1 2.2-1.2l.4-2.4h4l.4 2.4c.8.3 1.5.7 2.2 1.2l2.3-.9 2 3.4-2 1.5c.1.4.1.8.1 1.2z",
    bell:    "M6 9a6 6 0 0112 0c0 5 2 6.5 2 6.5H4S6 14 6 9zM10 19a2 2 0 004 0",
    search:  "M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM21 21l-5.2-5.2",
    sync:    "M21 12a9 9 0 01-15.5 6.2L3 16M3 12a9 9 0 0115.5-6.2L21 8M3 16v-3.5H6.5M21 8v3.5h-3.5",
    car:     "M5 16l1.2-5A2 2 0 018.2 9h7.6a2 2 0 012 1.5L19 16M5 16h14v4h-2.5v-1.5h-9V20H5v-4zM8 13h.01M16 13h.01",
    bike:    "M5.5 18a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM18.5 18a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM5.5 14.5L9 8l1.5 1.5L13.5 8l-1-.9M14.5 17.5L13.2 12l-4.4.7M15.5 5.5h3l2 12",
    check:   "M5 12.5l4.5 4.5L19 7.5",
    x:       "M6 6l12 12M18 6L6 18",
    clock:   "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2",
    arrow:   "M5 12h14M13 6l6 6-6 6",
    plus:    "M12 5v14M5 12h14",
    alert:   "M12 9v4M12 16.5h.01M10.3 4l-7.5 13a2 2 0 001.7 3h13a2 2 0 001.7-3L12.7 4a2 2 0 00-3.4 0z",
    send:    "M22 3L11 14M22 3l-7 18-4-7-7-4 18-7z",
    pdf:     "M7 3h7l4 4v14H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v4h4M9.5 13h5M9.5 16h5",
    file:    "M7 3h7l4 4v14H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v4h4",
    home:    "M4 11l8-7 8 7v8a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 19v-8zM10 20v-6h4v6",
    users2:  "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20a6.5 6.5 0 0113 0M17 6.5a3 3 0 010 4.6M19.5 20a6 6 0 00-1.5-4",
    bank:    "M3 9.5L12 4l9 5.5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18M21 9.5v1",
    starLine:"M12 3.5l2.4 4.9 5.4.8-3.9 3.8.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.9-3.8 5.4-.8L12 3.5z",
    gift:    "M4 11h16v9.5H4V11zM2.5 7.5h19V11h-19V7.5zM12 7.5v13M12 7.5C10.5 5 8 4.5 7 5.5s-.3 2 5 2M12 7.5c1.5-2.5 4-3 5-2s.3 2-5 2",
    flame:   "M12 3c1 3-1.5 4-1.5 6A2.8 2.8 0 0013 11c0-2 2-2.5 2-5 2.3 1.5 4 4.4 4 7.5a7 7 0 11-14 0C5 10 7.5 7 12 3z"
  },

  icon(name, size = 18, cls = "") {
    return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${this.icons[name] || this.icons.grid}"/></svg>`;
  }
};
