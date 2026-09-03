import React from 'react';
import {
  ArrowRight, MessageSquare, ScanLine, ShieldAlert, Calculator,
  ClipboardCheck, ImageOff, Stethoscope, FileCheck2, KeyRound, Gauge,
  EyeOff, ShieldCheck, UserCheck, Info,
} from 'lucide-react';
import SiteLayout from './site/SiteLayout';
import { SitePageProps, useT, useSiteTheme, Reveal, SectionLabel } from './site/siteKit';

// ─────────────────────────────────────────────────────────────────────────────
// /ai — "Teknologi AI SurePath"
//
// Every capability listed here maps to code that is live and wired in this
// repo. Deliberate omissions: no model vendor is named (the AI is presented as
// SurePath technology), no invented metrics, no promised settlement times, and
// no capability that is defined but has no caller. Claims that cannot be
// verified from code must not be added to this page.
// ─────────────────────────────────────────────────────────────────────────────

const AITechPage: React.FC<SitePageProps> = (props) => {
  const { onSignIn, navigate, lang } = props;
  const t = useT(lang);
  const th = useSiteTheme(props.darkMode);
  const { cardBg, cardBorder, cardShadow, textMuted, textMain, videoBg2, videoBg3, accent } = th;

  // Capabilities that are live and wired in the product today.
  const CAPABILITIES = [
    {
      Icon: ScanLine, color: '#2563eb',
      title: t('Smart Scan dokumen kendaraan', 'Smart Scan for vehicle documents'),
      desc: t(
        'Foto STNK Anda, dan sistem kami membaca data kendaraan lalu mengisinya ke formulir. Hasilnya tidak langsung dipercaya begitu saja: nomor polisi dicocokkan ke kode wilayah, merek dan model dicocokkan ke daftar kendaraan yang kami punya, dan nomor rangka diperiksa formatnya. Semua kolom tetap bisa Anda koreksi sebelum lanjut.',
        'Photograph your vehicle registration and our system reads the details and fills in the form. The result is not taken at face value: the plate is matched against regional codes, the brand and model against our vehicle list, and the chassis number is format-checked. Every field stays editable before you continue.',
      ),
      who: t('Nasabah & Mitra', 'Customers & Partners'),
    },
    {
      Icon: ImageOff, color: '#dc2626',
      title: t('Pemeriksaan keaslian foto klaim', 'Claim photo authenticity checks'),
      desc: t(
        'Setiap foto klaim melewati tiga pemeriksaan terpisah: metadata foto (waktu pengambilan dan jejak penyuntingan), pencocokan sidik gambar terhadap foto klaim sebelumnya untuk menemukan foto yang dipakai ulang, dan pemeriksaan visual terhadap tanda-tanda manipulasi. Hasilnya berupa skor keaslian yang membantu tim kami, bukan penolakan otomatis.',
        'Every claim photo goes through three separate checks: photo metadata (capture time and editing traces), an image fingerprint match against earlier claim photos to catch reused images, and a visual check for signs of manipulation. The output is an authenticity score that assists our team — not an automatic rejection.',
      ),
      who: t('Nasabah', 'Customers'),
    },
    {
      Icon: Calculator, color: '#16a34a',
      title: t('ClaimSense — estimasi biaya perbaikan', 'ClaimSense — repair cost estimates'),
      desc: t(
        'Dari deskripsi kerusakan dan data kendaraan Anda, sistem menyusun perkiraan biaya per komponen dengan mengacu pada tabel harga suku cadang dan biaya jasa yang kami kelola sendiri. Angka yang keluar bersifat indikatif untuk membantu Anda bersiap — keputusan dan besaran klaim final tetap hak perusahaan asuransi.',
        'From your damage description and vehicle data, the system builds a component-by-component cost estimate using parts and labour price tables we maintain ourselves. The figures are indicative, to help you prepare — the final claim decision and amount remain the insurer’s.',
      ),
      who: t('Nasabah', 'Customers'),
    },
    {
      Icon: ClipboardCheck, color: '#7c3aed',
      title: t('Survei kendaraan berbasis foto', 'Photo-based vehicle survey'),
      desc: t(
        'Untuk pengajuan polis, foto kendaraan dinilai pada enam aspek terpisah — kecocokan identitas kendaraan dengan data yang Anda isi, kondisi bodi, cat, kaca, interior, dan indikasi ketidakwajaran. Hasilnya menjadi bahan pertimbangan penilai kami, dan pengajuan yang meragukan diteruskan ke pemeriksaan manusia.',
        'For policy submissions, vehicle photos are assessed across six separate aspects — identity match against the data you entered, body, paint, glass, and interior condition, plus irregularity indicators. The result informs our reviewers, and doubtful submissions are escalated to a human check.',
      ),
      who: t('Nasabah & Mitra', 'Customers & Partners'),
    },
    {
      Icon: MessageSquare, color: '#0891b2',
      title: t('Pathy — asisten digital SurePath', 'Pathy — the SurePath digital assistant'),
      desc: t(
        'Pathy menjawab pertanyaan seputar produk, status polis, dan proses klaim dalam bahasa sehari-hari. Ruang lingkupnya dibatasi: Pathy tidak memberi nasihat medis atau finansial, tidak menjanjikan persetujuan, dan tidak dapat mengubah data apa pun di akun Anda — hanya membacanya untuk menjawab.',
        'Pathy answers questions about products, policy status, and the claim process in everyday language. Its scope is deliberately bounded: Pathy gives no medical or financial advice, promises no approvals, and cannot change anything in your account — it only reads it in order to answer.',
      ),
      who: t('Nasabah & Mitra', 'Customers & Partners'),
    },
    {
      Icon: Stethoscope, color: '#ef4444',
      title: t('Asisten informasi kesehatan', 'Health information assistant'),
      desc: t(
        'Membantu Anda memahami istilah dalam asuransi kesehatan dan pertanyaan kesehatan umum. Ini bukan diagnosa medis dan bukan pengganti konsultasi dokter — pengingat itu selalu tampil di layar percakapan.',
        'Helps you understand health insurance terminology and general health questions. This is not a medical diagnosis and not a substitute for consulting a doctor — that reminder is always shown on the chat screen.',
      ),
      who: t('Nasabah', 'Customers'),
    },
    {
      Icon: FileCheck2, color: '#d97706',
      title: t('Pembacaan kuitansi medis', 'Medical receipt reading'),
      desc: t(
        'Untuk klaim kesehatan, foto kuitansi atau tagihan rumah sakit dibaca untuk mengambil nama fasilitas, tanggal, total biaya, dan rincian tagihan — sehingga Anda tidak perlu mengetik ulang. Data hasil pembacaan tetap diverifikasi sebelum diproses.',
        'For health claims, a photo of a receipt or hospital bill is read to extract the facility name, date, total, and line items — so you do not have to retype them. Extracted data is still verified before processing.',
      ),
      who: t('Nasabah', 'Customers'),
    },
    {
      Icon: ShieldAlert, color: '#64748b',
      title: t('Pemeriksaan internal polis & keuangan', 'Internal policy & finance checks'),
      desc: t(
        'Di sisi operasional, sistem kami menyusun ringkasan risiko untuk setiap pengajuan polis dan menandai anomali pada data transaksi serta komisi. Ini adalah alat bantu tim internal — pendapat kedua untuk penelaah kami, bukan pengambil keputusan.',
        'On the operations side, our system compiles a risk summary for each policy submission and flags anomalies in transaction and commission data. These are internal tools — a second opinion for our reviewers, not a decision-maker.',
      ),
      who: t('Tim internal SurePath', 'SurePath internal team'),
    },
  ];

  // Safeguards, each one implemented in code.
  const SAFEGUARDS = [
    {
      Icon: UserCheck,
      title: t('Manusia yang memutuskan', 'Humans make the decisions'),
      desc: t(
        'Aturan tetap kami: sistem AI tidak pernah membuat keputusan finansial final. Penerbitan polis, persetujuan klaim, dan besaran pembayaran selalu melewati manusia — di pihak kami maupun di pihak perusahaan asuransi.',
        'Our standing rule: AI systems never make a final financial decision. Policy issuance, claim approval, and payout amounts always pass through a human — on our side and on the insurer’s side.',
      ),
    },
    {
      Icon: EyeOff,
      title: t('Data pribadi disaring dua arah', 'Personal data filtered both ways'),
      desc: t(
        'Nomor KTP, nomor telepon, alamat email, nomor kartu, dan nomor rekening disaring sebelum teks dikirim untuk diproses, lalu disaring lagi sebelum jawaban ditampilkan kembali kepada Anda.',
        'ID numbers, phone numbers, email addresses, card numbers, and bank account numbers are filtered before text is sent for processing, then filtered again before an answer is shown back to you.',
      ),
    },
    {
      Icon: KeyRound,
      title: t('Kunci akses tidak pernah ada di browser', 'Access keys never live in the browser'),
      desc: t(
        'Semua pemrosesan AI berjalan di server kami. Kunci akses disimpan di brankas rahasia dan tidak pernah dikirim ke perangkat Anda. Setiap permintaan memerlukan sesi login yang sah.',
        'All AI processing runs on our servers. Access keys are kept in a secrets vault and are never sent to your device. Every request requires a valid signed-in session.',
      ),
    },
    {
      Icon: ShieldCheck,
      title: t('Penahan klaim berlebihan', 'Overclaim containment'),
      desc: t(
        'Jawaban diperiksa terhadap daftar klaim terlarang — misalnya menjanjikan premi pasti atau persetujuan yang dijamin — dan estimasi tarif diperiksa agar tetap berada dalam rentang tarif yang berlaku. Jawaban yang melanggar diberi catatan koreksi.',
        'Answers are checked against a list of forbidden claims — such as promising a guaranteed premium or guaranteed approval — and rate estimates are checked to stay within the applicable rate range. Answers that breach this are annotated with a correction.',
      ),
    },
    {
      Icon: Gauge,
      title: t('Batas pemakaian & pencatatan', 'Usage limits & logging'),
      desc: t(
        'Setiap fitur AI punya batas jumlah permintaan per jam dan per hari, dan aktivitasnya dicatat. Ini menjaga biaya tetap terkendali sekaligus membatasi penyalahgunaan.',
        'Every AI feature has per-hour and per-day request limits, and its activity is logged. This keeps costs predictable and limits abuse.',
      ),
    },
    {
      Icon: Info,
      title: t('Gagal dengan aman', 'Fails safely'),
      desc: t(
        'Kalau pemeriksaan AI gagal, alur Anda tidak ikut terhenti: pembacaan dokumen jatuh ke pengisian manual, pemeriksaan foto memberi nilai netral, dan tidak ada pengajuan yang ditolak hanya karena sistem sedang bermasalah.',
        'If an AI check fails, your flow does not stop with it: document reading falls back to manual entry, photo checks return a neutral score, and no submission is rejected merely because a system was unavailable.',
      ),
    },
  ];

  // Concrete before/after, phrased without promised timings.
  const BEFORE_AFTER = [
    {
      step: t('Mengisi data kendaraan', 'Entering vehicle data'),
      before: t('Mengetik ulang 15 kolom dari STNK, satu per satu', 'Retyping 15 fields from the registration document, one by one'),
      after: t('Foto STNK, data terisi, Anda tinggal memeriksa dan mengoreksi', 'Photograph it, the fields fill in, you review and correct'),
    },
    {
      step: t('Survei kendaraan', 'Vehicle survey'),
      before: t('Menunggu jadwal surveyor datang ke lokasi', 'Waiting for a surveyor to be scheduled to your location'),
      after: t('Foto kendaraan dari HP, dinilai lalu ditelaah tim kami', 'Photos from your phone, assessed then reviewed by our team'),
    },
    {
      step: t('Mengajukan klaim', 'Filing a claim'),
      before: t('Mengisi formulir panjang tanpa gambaran biaya sama sekali', 'Filling long forms with no idea of the cost involved'),
      after: t('Unggah foto, dapat estimasi indikatif sejak awal proses', 'Upload photos, get an indicative estimate early in the process'),
    },
    {
      step: t('Memeriksa keaslian dokumen klaim', 'Verifying claim document authenticity'),
      before: t('Pemeriksaan manual satu per satu, foto lama sulit terdeteksi', 'Manual checks one by one; reused photos are hard to spot'),
      after: t('Foto yang dipakai ulang tertandai otomatis untuk ditelaah', 'Reused photos are flagged automatically for review'),
    },
  ];

  return (
    <SiteLayout {...props} active="ai" bgVideo="/bg3.mp4">

      {/* ─── Header ─── */}
      <section className="pt-36 pb-14 px-5 text-center" style={{ background: videoBg2 }}>
        <Reveal>
          <SectionLabel darkMode={props.darkMode}>{t('Teknologi AI', 'AI Technology')}</SectionLabel>
          <h1 className="font-bold leading-tight tracking-tight mb-4" style={{ fontSize: 'clamp(2rem,5vw,3.25rem)', color: textMain }}>
            {t('AI yang bekerja di ', 'AI that works in the ')}
            <span style={{ color: accent }}>{t('balik layar', 'background')}</span>
          </h1>
          <p className="text-base max-w-2xl mx-auto leading-relaxed" style={{ color: textMuted }}>
            {t(
              'Kami memakai AI untuk menghapus pekerjaan yang membosankan dan mudah salah — mengetik ulang dokumen, menunggu survei, menebak-nebak biaya. Bukan untuk menggantikan orang yang memutuskan.',
              'We use AI to remove the tedious, error-prone work — retyping documents, waiting for surveys, guessing at costs. Not to replace the people who decide.',
            )}
          </p>
        </Reveal>
      </section>

      {/* ─── Capabilities ─── */}
      <section className="pb-24 px-5" style={{ background: videoBg2, borderTop: `1px solid ${cardBorder}` }}>
        <div className="max-w-6xl mx-auto pt-16">
          <Reveal>
            <h2 className="font-bold leading-tight tracking-tight mb-3 text-center" style={{ fontSize: 'clamp(1.5rem,3.5vw,2.25rem)', color: textMain }}>
              {t('Yang sudah berjalan hari ini', 'What is running today')}
            </h2>
            <p className="text-sm text-center max-w-xl mx-auto mb-12" style={{ color: textMuted }}>
              {t(
                'Delapan kemampuan di bawah ini aktif di platform SurePath sekarang — bukan rencana.',
                'The eight capabilities below are active on the SurePath platform now — not roadmap items.',
              )}
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {CAPABILITIES.map((c, i) => (
              <Reveal key={c.title} delay={i * 50}>
                <div className="spx-card rounded-2xl h-full p-7 flex flex-col"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, ['--spx-accent' as string]: c.color }}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${c.color}14`, border: `1px solid ${c.color}30` }}>
                      <c.Icon size={20} style={{ color: c.color }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-base leading-tight mb-1" style={{ color: textMain }}>{c.title}</h3>
                      <span className="text-[0.6rem] font-bold uppercase tracking-[0.18em]" style={{ color: c.color }}>{c.who}</span>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{c.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Before / after ─── */}
      <section className="py-20 px-5" style={{ background: videoBg3, borderTop: `1px solid ${cardBorder}` }}>
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <SectionLabel darkMode={props.darkMode}>{t('Bedanya di Mana', 'What Changes')}</SectionLabel>
            <h2 className="font-bold leading-tight tracking-tight mb-10" style={{ fontSize: 'clamp(1.5rem,3.5vw,2.25rem)', color: textMain }}>
              {t('Pekerjaan yang ', 'The work we ')}<span style={{ color: accent }}>{t('kami hilangkan', 'take away')}</span>
            </h2>
          </Reveal>

          <div className="space-y-3">
            {BEFORE_AFTER.map((row, i) => (
              <Reveal key={row.step} delay={i * 60}>
                <div className="rounded-2xl p-6 grid grid-cols-1 md:grid-cols-[1fr_1.3fr_1.3fr] gap-4 md:gap-6 md:items-center"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                  <p className="font-bold text-sm" style={{ color: textMain }}>{row.step}</p>
                  <div className="flex items-start gap-2.5">
                    <span className="text-[0.55rem] font-bold uppercase tracking-[0.18em] mt-1 flex-shrink-0" style={{ color: textMuted, opacity: 0.7 }}>
                      {t('Dulu', 'Before')}
                    </span>
                    <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{row.before}</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-[0.55rem] font-bold uppercase tracking-[0.18em] mt-1 flex-shrink-0" style={{ color: accent }}>
                      {t('Kini', 'Now')}
                    </span>
                    <p className="text-sm leading-relaxed font-medium" style={{ color: textMain }}>{row.after}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Safeguards ─── */}
      <section className="py-24 px-5" style={{ background: videoBg2, borderTop: `1px solid ${cardBorder}` }}>
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <SectionLabel darkMode={props.darkMode}>{t('Batas & Pengaman', 'Limits & Safeguards')}</SectionLabel>
            <h2 className="font-bold leading-tight tracking-tight mb-3" style={{ fontSize: 'clamp(1.5rem,3.5vw,2.25rem)', color: textMain }}>
              {t('Bagaimana AI kami ', 'How our AI is ')}<span style={{ color: accent }}>{t('dijaga', 'kept in check')}</span>
            </h2>
            <p className="text-sm max-w-2xl mb-12 leading-relaxed" style={{ color: textMuted }}>
              {t(
                'Asuransi menyangkut uang dan data pribadi orang. Karena itu pembatas di bawah ini kami tulis sebagai aturan sistem, bukan sekadar janji.',
                'Insurance involves people’s money and personal data. That is why the boundaries below are written as system rules, not merely as promises.',
              )}
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SAFEGUARDS.map((sg, i) => (
              <Reveal key={sg.title} delay={i * 50}>
                <div className="rounded-2xl h-full p-6"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${accent}14`, border: `1px solid ${accent}28` }}>
                    <sg.Icon size={18} style={{ color: accent }} />
                  </div>
                  <h3 className="font-bold text-sm mb-2 leading-tight" style={{ color: textMain }}>{sg.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{sg.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Honest note + link to the T&C clause that already discloses this */}
          <Reveal>
            <div className="mt-10 flex items-start gap-3 p-6 rounded-2xl"
              style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
              <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: textMuted }} />
              <p className="text-xs leading-relaxed" style={{ color: textMuted }}>
                {t(
                  'Perlu jujur: sistem AI bisa keliru. Karena itu setiap hasil pembacaan dokumen dapat Anda koreksi, setiap estimasi biaya bersifat indikatif, dan keputusan final atas polis maupun klaim tetap berada pada perusahaan asuransi berizin OJK yang menerbitkan polis Anda. Rincian penggunaan AI juga kami cantumkan di ',
                  'To be straightforward: AI systems can be wrong. That is why every document reading is editable by you, every cost estimate is indicative, and the final decision on a policy or claim remains with the OJK-licensed insurer that issues your policy. The details of our AI use are also set out in our ',
                )}
                <button onClick={() => navigate('/terms')} className="font-bold underline underline-offset-2" style={{ color: accent }}>
                  {t('Syarat & Ketentuan', 'Terms & Conditions')}
                </button>
                {t(' dan ', ' and ')}
                <button onClick={() => navigate('/privacy')} className="font-bold underline underline-offset-2" style={{ color: accent }}>
                  {t('Kebijakan Privasi', 'Privacy Policy')}
                </button>
                {t('.', '.')}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 px-5" style={{ background: videoBg3, borderTop: `1px solid ${cardBorder}` }}>
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <SectionLabel darkMode={props.darkMode}>{t('Coba Sendiri', 'Try It Yourself')}</SectionLabel>
            <h2 className="font-bold leading-tight tracking-tight mb-5" style={{ fontSize: 'clamp(1.75rem,4vw,2.75rem)', color: textMain }}>
              {t('Rasakan bedanya ', 'Feel the difference ')}<span style={{ color: accent }}>{t('tanpa daftar', 'without signing up')}</span>
            </h2>
            <p className="text-sm mb-8 max-w-xl mx-auto leading-relaxed" style={{ color: textMuted }}>
              {t(
                'Hitung estimasi premi kendaraan Anda memakai tarif resmi OJK, atau mulai pengajuan dan lihat sendiri bagaimana data STNK terisi dari satu foto.',
                'Estimate your vehicle premium using official OJK rates, or start a submission and see for yourself how registration data fills in from a single photo.',
              )}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => navigate('/kalkulator')}
                className="flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.03] active:scale-95"
                style={{ background: accent }}>
                {t('Hitung Premi Gratis', 'Calculate Premium Free')} <ArrowRight size={15} />
              </button>
              <button onClick={onSignIn}
                className="flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-bold transition-all hover:scale-[1.03] active:scale-95"
                style={{ background: cardBg, border: `1px solid ${cardBorder}`, color: textMain }}>
                {t('Mulai Pengajuan', 'Start a Submission')} <ArrowRight size={15} />
              </button>
            </div>
          </Reveal>
        </div>
      </section>

    </SiteLayout>
  );
};

export default AITechPage;
