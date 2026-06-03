import React from 'react';
import { ArrowRight, ChevronDown, Star, CheckCircle } from 'lucide-react';
import SiteLayout from './site/SiteLayout';
import { SitePageProps, useT, useSiteTheme, Reveal, AnimatedCounter } from './site/siteKit';

const AboutPage: React.FC<SitePageProps> = (props) => {
  const { onSignIn, lang } = props;
  const t = useT(lang);
  const th = useSiteTheme(props.darkMode);
  const { cardBg, cardBorder, cardShadow, textMuted, textMain, sectionBg2, sectionBg3, sectionBg5, lpGreen } = th;

  const STATS = [
    { target: 12400, suffix: '+', label: t('Nasabah Aktif', 'Active Clients') },
    { target: 98,    suffix: '%', label: t('Tingkat Kepuasan', 'Satisfaction Rate') },
    { target: 18,    suffix: '+', label: t('Mitra Insurer', 'Insurer Partners') },
    { target: 200,   suffix: '+', label: t('Kota Jangkauan', 'Cities Covered') },
  ];

  const VALUES = [
    { title: t('Transparansi', 'Transparency'), desc: t('Tidak ada biaya tersembunyi, tidak ada klausul yang membingungkan.', 'No hidden fees, no confusing clauses.') },
    { title: t('Humanis', 'Human-Centered'), desc: t('Di balik teknologi canggih, ada agen nyata yang siap mendampingi.', 'Behind advanced technology, real agents ready to support you.') },
    { title: t('Inovatif', 'Innovative'), desc: t('AI-powered claims, instant approval, pengalaman digital-first.', 'AI-powered claims, instant approval, digital-first experience.') },
    { title: t('Terpercaya', 'Trusted'), desc: t('Bermitra dengan insurer yang terdaftar dan diawasi penuh oleh OJK.', 'Partnered with insurers fully registered and supervised by OJK.') },
  ];

  const TESTIMONIALS = [
    { name: 'Rafi A.', role: t('Pengusaha Muda', 'Young Entrepreneur'), city: 'Jakarta', initial: 'R', color: '#22c55e', quote: t('SurePath membantu saya menemukan produk yang benar-benar sesuai kebutuhan, bukan sekadar yang termurah atau yang paling banyak diiklankan. Agen mereka meluangkan waktu untuk benar-benar mendengarkan.', 'SurePath helped me find products truly suited to my needs, not just the cheapest or most advertised. Their agent took time to genuinely listen.') },
    { name: 'Dewi S.', role: t('Profesional HR', 'HR Professional'), city: 'Surabaya', initial: 'D', color: '#3b82f6', quote: t('Baru pertama kali saya memahami isi polis asuransi saya dengan baik. Agen SurePath menjelaskan setiap klausa penting dengan sabar dan jelas — tanpa jargon yang membingungkan.', 'For the first time I truly understood my insurance policy. SurePath\'s agent patiently explained each important clause clearly — without confusing jargon.') },
    { name: 'Hendra K.', role: t('Arsitek', 'Architect'), city: 'Bandung', initial: 'H', color: '#a855f7', quote: t('Proses seluruhnya digital namun saya tetap merasa ditangani secara personal. Ada manusia di balik teknologinya, dan itu yang membuat saya nyaman mempercayakan perlindungan keluarga kepada SurePath.', 'The entire process is digital yet I still felt handled personally. There are humans behind the technology, and that\'s what makes me comfortable entrusting my family\'s protection to SurePath.') },
  ];

  const FAQS = [
    { q: 'Cara beli asuransi mobil online di SurePath?', a: 'Beli asuransi mobil di SurePath gampang banget — tinggal daftar, isi data kendaraan, pilih produk yang sesuai (all risk atau TLO), lalu bayar secara online. Polis aktif dalam hitungan menit dan dikirim langsung ke emailmu. Nggak perlu antre, nggak perlu tatap muka.' },
    { q: 'Berapa premi asuransi kendaraan bermotor di SurePath?', a: 'Premi asuransi kendaraan bermotor ditentukan berdasarkan jenis kendaraan, tahun produksi, wilayah penggunaan, dan tipe perlindungan (all risk atau TLO). Rata-rata premi all risk berkisar 1,5%–3,5% dari harga kendaraan per tahun, sedangkan TLO lebih terjangkau mulai 0,2%–0,8%. Pakai kalkulator premi gratis kami untuk estimasi akurat.' },
    { q: 'Apa perbedaan asuransi jiwa unit link dan tradisional?', a: 'Asuransi jiwa tradisional memberikan perlindungan murni tanpa komponen investasi — premi lebih terjangkau dan manfaat lebih pasti. Unit link menggabungkan proteksi jiwa dengan investasi di reksa dana, jadi nilai premi bisa bertumbuh. Pilihan tergantung tujuan kamu: kalau fokus proteksi, tradisional lebih cocok; kalau mau sekaligus investasi, unit link bisa jadi pilihan.' },
    { q: 'Bagaimana cara klaim asuransi dengan cepat?', a: 'Proses klaim di SurePath bisa dilakukan 100% online: lapor kejadian lewat aplikasi atau WhatsApp kami, upload dokumen yang dibutuhkan (foto kejadian, KTP, polis), lalu tim klaim kami akan memproses dalam 1–3 hari kerja. Untuk klaim darurat, tersedia layanan 24 jam yang bisa dihubungi kapan saja.' },
    { q: 'Apa perbedaan asuransi all risk dan TLO untuk kendaraan?', a: 'All risk menanggung semua kerusakan — dari goresan kecil sampai kecelakaan besar dan kehilangan kendaraan. TLO (Total Loss Only) hanya menanggung kerugian total, yaitu jika kendaraan hilang dicuri atau rusak lebih dari 75% nilai kendaraan. All risk lebih komprehensif tapi preminya lebih tinggi; TLO lebih hemat untuk kendaraan tua atau yang jarang digunakan.' },
    { q: 'Apakah asuransi SurePath sudah terdaftar OJK?', a: 'SurePath adalah platform pemasaran asuransi yang bermitra dengan perusahaan-perusahaan asuransi yang semuanya telah terdaftar dan diawasi oleh OJK (Otoritas Jasa Keuangan Indonesia). Seluruh produk yang kami pasarkan berasal dari mitra insurer yang berlisensi dan diregulasi penuh oleh OJK.' },
    { q: 'Bagaimana cara daftar jadi agen asuransi di SurePath?', a: 'Kamu bisa daftar sebagai agen di SurePath dengan mengisi formulir pendaftaran di halaman Program Agen kami. Syaratnya: usia minimal 21 tahun, punya KTP, dan bersedia mengikuti pelatihan sertifikasi asuransi. SurePath menyediakan pelatihan, materi, dan dukungan teknologi penuh — jadi kamu bisa mulai berkarir sebagai agen asuransi profesional tanpa modal besar.' },
    { q: 'Apa manfaat asuransi perjalanan yang ditawarkan SurePath?', a: 'Asuransi perjalanan SurePath menanggung berbagai risiko selama kamu bepergian: biaya medis darurat di luar negeri, pembatalan atau keterlambatan penerbangan, kehilangan bagasi, hingga evakuasi medis darurat. Tersedia untuk perjalanan domestik maupun internasional, dengan premi mulai dari Rp50.000 per perjalanan.' },
  ];

  return (
    <SiteLayout {...props} active="about">
      {/* ═══════════════ STORY ═══════════════ */}
      <section className="pt-40 pb-20 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <span className="inline-block text-[0.6rem] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full mb-5"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}>
              {t('Tentang Kami', 'About Us')}
            </span>
            <h1 className="font-black leading-tight tracking-[-0.03em] mb-6" style={{ fontSize: 'clamp(2.25rem,5vw,3.75rem)', color: textMain }}>
              {t('Asuransi yang', 'Insurance That\'s')}{' '}
              <span style={{ background: 'linear-gradient(135deg,#4ade80,#22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {t('Berpihak ke Kamu', 'On Your Side')}
              </span>
            </h1>
            <p className="text-base leading-relaxed max-w-2xl mx-auto" style={{ color: textMuted }}>
              {t('SurePath adalah platform insurtech Indonesia yang menggabungkan teknologi AI mutakhir dengan sentuhan manusiawi. Didirikan pada 2023, kami hadir untuk menyederhanakan pengalaman asuransi yang selama ini terasa rumit dan tidak transparan.', 'SurePath is an Indonesian insurtech platform combining cutting-edge AI technology with a human touch. Founded in 2023, we exist to simplify an insurance experience that has long felt complex and opaque.')}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════ MISSION + VALUES ═══════════════ */}
      <section className="py-20 px-5" style={{ background: sectionBg2 }}>
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="rounded-3xl p-8 md:p-12 mb-12 text-center" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(16,185,129,0.03))', border: '1px solid rgba(34,197,94,0.15)' }}>
              <h2 className="text-2xl font-black mb-3" style={{ color: textMain }}>{t('Misi Kami', 'Our Mission')}</h2>
              <p className="text-base leading-relaxed max-w-2xl mx-auto" style={{ color: textMuted }}>
                {t('Menjadikan perlindungan finansial mudah diakses oleh semua orang Indonesia — dengan proses yang transparan, cepat, dan dapat dipercaya penuh.', 'Making financial protection accessible to everyone in Indonesia — with a transparent, fast, and fully trustworthy process.')}
              </p>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 80}>
                <div className="rounded-2xl p-6 h-full" style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <CheckCircle size={18} style={{ color: lpGreen }} />
                    <h3 className="font-black text-base" style={{ color: textMain }}>{v.title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{v.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ STATS ═══════════════ */}
      <section className="py-20 px-5" style={{ background: sectionBg3 }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 80}>
                <div className="text-center p-6 rounded-2xl min-h-[140px] flex flex-col items-center justify-center"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderBottom: '2px solid rgba(1,235,2,0.15)', backgroundImage: 'radial-gradient(circle at 50% 100%, rgba(1,235,2,0.08), transparent 70%)', boxShadow: cardShadow }}>
                  <p className="font-black mb-1" style={{ fontSize: 'clamp(2rem,5vw,3rem)', lineHeight: 1, color: lpGreen }}>
                    <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                  </p>
                  <p className="text-xs font-medium mt-2" style={{ color: textMuted }}>{stat.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ TESTIMONIALS ═══════════════ */}
      <section className="py-28 px-5" style={{ background: sectionBg5 }}>
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <span className="inline-block text-[0.6rem] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full mb-5"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}>
                {t('Cerita Nasabah', 'Client Stories')}
              </span>
              <h2 className="font-black leading-tight tracking-[-0.03em]" style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: textMain }}>
                {t('Dipercaya, Karena', 'Trusted, Because')}{' '}
                <span style={{ color: lpGreen }}>{t('Mereka Merasakannya', 'They Felt It')}</span>
              </h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((tm, i) => (
              <Reveal key={tm.name} delay={i * 100}>
                <div className="relative overflow-hidden rounded-3xl p-7 h-full flex flex-col" style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
                  <div className="flex gap-1 mb-5">
                    {[...Array(5)].map((_, j) => (<Star key={j} size={14} fill="#f59e0b" style={{ color: '#f59e0b' }} />))}
                  </div>
                  <p className="text-sm leading-relaxed flex-1 mb-6" style={{ color: textMuted }}>"{tm.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0" style={{ background: `${tm.color}18`, border: `1px solid ${tm.color}30`, color: tm.color }}>{tm.initial}</div>
                    <div>
                      <p className="text-sm font-black" style={{ color: textMain }}>{tm.name}</p>
                      <p className="text-[0.65rem]" style={{ color: textMuted }}>{tm.role} · {tm.city}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ FAQ ═══════════════ */}
      <section className="py-28 px-5" style={{ background: sectionBg3 }}>
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <span className="inline-block text-[0.6rem] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full mb-5"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}>FAQ</span>
              <h2 className="font-black leading-tight tracking-[-0.03em]" style={{ fontSize: 'clamp(1.75rem,4vw,2.75rem)', color: textMain }}>
                {t('Pertanyaan yang', 'Questions')}{' '}
                <span style={{ color: lpGreen }}>{t('Sering Ditanyakan', 'Often Asked')}</span>
              </h2>
            </div>
          </Reveal>
          <div itemScope itemType="https://schema.org/FAQPage" className="space-y-3">
            {FAQS.map((item, i) => (
              <Reveal key={i} delay={i * 40}>
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question" className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
                  <details className="group">
                    <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none select-none" style={{ color: textMain }}>
                      <span itemProp="name" className="text-sm font-bold leading-snug">{item.q}</span>
                      <ChevronDown size={16} className="flex-shrink-0 transition-transform duration-300 group-open:rotate-180" style={{ color: lpGreen }} />
                    </summary>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                      <p itemProp="text" className="px-5 pb-5 text-sm leading-relaxed" style={{ color: textMuted }}>{item.a}</p>
                    </div>
                  </details>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="text-center mt-12">
              <button onClick={onSignIn}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-black text-white transition-all hover:scale-[1.03]"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 8px 30px rgba(34,197,94,0.25)' }}>
                {t('Mulai Sekarang', 'Get Started')} <ArrowRight size={16} />
              </button>
            </div>
          </Reveal>
        </div>
      </section>
    </SiteLayout>
  );
};

export default AboutPage;
