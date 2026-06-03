import React from 'react';
import { ArrowRight, ChevronDown, Star } from 'lucide-react';
import SiteLayout from './site/SiteLayout';
import { SitePageProps, useT, useSiteTheme, Reveal, AnimatedCounter, SectionLabel, useWebsiteConfig } from './site/siteKit';

const AboutPage: React.FC<SitePageProps> = (props) => {
  const { onSignIn, lang } = props;
  const t = useT(lang);
  const th = useSiteTheme(props.darkMode);
  const { cardBg, cardBorder, cardShadow, textMuted, textMain, videoBg2, videoBg3, accent } = th;

  const config     = useWebsiteConfig('about');
  const testiConf  = useWebsiteConfig('testimonials');

  const STATS = [
    { target: 12400, suffix: '+', label: t('Nasabah Aktif', 'Active Clients') },
    { target: 98,    suffix: '%', label: t('Tingkat Kepuasan', 'Satisfaction Rate') },
    { target: 18,    suffix: '+', label: t('Mitra Insurer', 'Insurer Partners') },
    { target: 200,   suffix: '+', label: t('Kota Jangkauan', 'Cities Covered') },
  ];

  const VALUES = [
    { title: t('Transparansi', 'Transparency'), desc: t('Tidak ada biaya tersembunyi, tidak ada klausul yang membingungkan.', 'No hidden fees, no confusing clauses.') },
    { title: t('Humanis', 'Human-Centered'),    desc: t('Di balik teknologi canggih, ada agen nyata yang siap mendampingi.', 'Behind advanced technology, real agents ready to support you.') },
    { title: t('Inovatif', 'Innovative'),        desc: t('AI-powered claims, instant approval, pengalaman digital-first.', 'AI-powered claims, instant approval, digital-first experience.') },
    { title: t('Terpercaya', 'Trusted'),         desc: t('Bermitra dengan insurer yang terdaftar dan diawasi penuh oleh OJK.', 'Partnered with insurers fully registered and supervised by OJK.') },
  ];

  const TESTIMONIALS = [
    { name: 'Rafi A.', role: t('Pengusaha Muda', 'Young Entrepreneur'), city: 'Jakarta', initial: 'R', color: accent, quote: t('SurePath membantu saya menemukan produk yang benar-benar sesuai kebutuhan, bukan sekadar yang termurah. Agen mereka meluangkan waktu untuk benar-benar mendengarkan.', 'SurePath helped me find products truly suited to my needs. Their agent took time to genuinely listen.') },
    { name: 'Dewi S.', role: t('Profesional HR', 'HR Professional'), city: 'Surabaya', initial: 'D', color: '#2563eb', quote: t('Baru pertama kali saya memahami isi polis asuransi saya dengan baik. Agen SurePath menjelaskan setiap klausa penting dengan sabar dan jelas.', "For the first time I truly understood my insurance policy. SurePath's agent patiently explained each clause clearly.") },
    { name: 'Hendra K.', role: t('Arsitek', 'Architect'), city: 'Bandung', initial: 'H', color: '#7c3aed', quote: t('Proses seluruhnya digital namun saya tetap merasa ditangani secara personal. Ada manusia di balik teknologinya.', 'The process is fully digital yet I still felt handled personally. There are real humans behind the technology.') },
  ];

  const FAQS = [
    { q: 'Cara beli asuransi mobil online di SurePath?', a: 'Beli asuransi mobil di SurePath gampang banget — tinggal daftar, isi data kendaraan, pilih produk (all risk atau TLO), lalu bayar secara online. Polis aktif dalam hitungan menit dan dikirim langsung ke emailmu.' },
    { q: 'Berapa premi asuransi kendaraan bermotor di SurePath?', a: 'Premi ditentukan berdasarkan jenis kendaraan, tahun produksi, wilayah, dan tipe perlindungan. Rata-rata all risk berkisar 1,5%–3,5% dari harga kendaraan per tahun, TLO mulai 0,2%–0,8%. Pakai kalkulator premi gratis kami untuk estimasi akurat.' },
    { q: 'Apa perbedaan asuransi jiwa unit link dan tradisional?', a: 'Tradisional memberikan perlindungan murni tanpa komponen investasi — premi lebih terjangkau. Unit link menggabungkan proteksi jiwa dengan investasi. Jika fokus proteksi, tradisional lebih cocok; jika mau sekaligus investasi, unit link bisa jadi pilihan.' },
    { q: 'Bagaimana cara klaim asuransi dengan cepat?', a: 'Klaim bisa dilakukan 100% online: lapor kejadian lewat aplikasi atau WhatsApp, upload dokumen, lalu tim klaim kami akan memproses dalam 1–3 hari kerja. Untuk klaim darurat, tersedia layanan 24 jam.' },
    { q: 'Apa perbedaan asuransi all risk dan TLO?', a: 'All risk menanggung semua kerusakan — dari goresan kecil sampai kecelakaan besar. TLO hanya menanggung kerugian total (kendaraan hilang atau rusak >75%). All risk lebih komprehensif tapi preminya lebih tinggi.' },
    { q: 'Apakah asuransi SurePath sudah terdaftar OJK?', a: 'SurePath bermitra dengan perusahaan-perusahaan asuransi yang semuanya telah terdaftar dan diawasi oleh OJK. Seluruh produk yang kami pasarkan berasal dari mitra insurer berlisensi.' },
    { q: 'Bagaimana cara daftar jadi agen asuransi di SurePath?', a: 'Daftar sebagai agen di halaman Program Agen kami. Syarat: usia minimal 21 tahun, punya KTP, bersedia mengikuti pelatihan sertifikasi. SurePath menyediakan pelatihan, materi, dan dukungan teknologi penuh.' },
    { q: 'Apa manfaat asuransi perjalanan SurePath?', a: 'Menanggung: biaya medis darurat, pembatalan/keterlambatan penerbangan, kehilangan bagasi, dan evakuasi medis. Tersedia untuk perjalanan domestik maupun internasional, mulai dari Rp50.000 per perjalanan.' },
  ];

  return (
    <SiteLayout {...props} active="about" bgVideo="/bg3.mp4">

      {/* ─── Story ─── */}
      <section className="pt-36 pb-20 px-5" style={{ background: videoBg2 }}>
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <SectionLabel darkMode={props.darkMode}>{t('Tentang Kami', 'About Us')}</SectionLabel>
            <h1 className="font-bold leading-tight tracking-tight mb-5" style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', color: textMain }}>
              {config?.headline || <>{t('Asuransi yang ', "Insurance that's ")}<span style={{ color: accent }}>{t('berpihak ke kamu', 'on your side')}</span></>}
            </h1>
            <p className="text-base leading-relaxed max-w-2xl mx-auto" style={{ color: textMuted }}>
              {config?.subtitle || t('SurePath adalah platform insurtech Indonesia yang menggabungkan teknologi AI mutakhir dengan sentuhan manusiawi. Didirikan pada 2023, kami hadir untuk menyederhanakan pengalaman asuransi yang selama ini terasa rumit dan tidak transparan.', 'SurePath is an Indonesian insurtech platform combining cutting-edge AI technology with a human touch. Founded in 2023, we simplify an insurance experience that has long felt complex and opaque.')}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─── Mission + Values ─── */}
      <section className="py-20 px-5" style={{ background: videoBg3, borderTop: `1px solid ${cardBorder}` }}>
        <div className="max-w-5xl mx-auto">
          <Reveal>
            {/* Mission — accent gradient bg */}
            <div className="rounded-2xl p-8 md:p-12 mb-12 text-center relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${accent}18 0%, ${accent}05 100%)`, border: `1px solid ${accent}30` }}>
              <div style={{ position: 'absolute', top: -30, right: -10, fontSize: '10rem', fontWeight: 900, lineHeight: 1, color: accent, opacity: 0.04, pointerEvents: 'none', userSelect: 'none', fontFamily: 'Georgia, serif' }}>M</div>
              <p style={{ fontSize: '0.55rem', fontWeight: 800, color: accent, letterSpacing: '0.3em', marginBottom: 14 }}>
                {t('MISI KAMI', 'OUR MISSION')}
              </p>
              <p className="text-lg leading-relaxed max-w-2xl mx-auto font-medium relative" style={{ color: textMain }}>
                {t('Menjadikan perlindungan finansial mudah diakses oleh semua orang Indonesia — dengan proses yang transparan, cepat, dan dapat dipercaya penuh.', 'Making financial protection accessible to all Indonesians — with a transparent, fast, and fully trustworthy process.')}
              </p>
            </div>
          </Reveal>
          {/* Values — left border cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 70}>
                <div className="p-6 rounded-2xl h-full relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px]"
                  style={{ background: cardBg, borderLeft: `4px solid ${accent}` }}>
                  <div style={{ position: 'absolute', top: -8, right: 12, fontSize: '4.5rem', fontWeight: 900, lineHeight: 1, color: accent, opacity: 0.06, pointerEvents: 'none', userSelect: 'none' }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <p style={{ fontSize: '0.55rem', fontWeight: 800, color: accent, letterSpacing: '0.3em', marginBottom: 10 }}>
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h3 className="font-bold text-base mb-2 relative" style={{ color: textMain }}>{v.title}</h3>
                  <p className="text-sm leading-relaxed relative" style={{ color: textMuted }}>{v.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Stats — giant numbers, borderless ─── */}
      <section className="py-16 px-5" style={{ background: videoBg2, borderTop: `1px solid ${cardBorder}` }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap justify-between gap-10">
            {STATS.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 70}>
                <div>
                  <div style={{ fontSize: 'clamp(2.5rem,5.5vw,4rem)', fontWeight: 900, lineHeight: 1, color: textMain, letterSpacing: '-0.04em' }}>
                    <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                  </div>
                  <div style={{ width: 28, height: 3, background: accent, margin: '10px 0 8px', borderRadius: 99 }} />
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                    {stat.label}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-24 px-5" style={{ background: videoBg3, borderTop: `1px solid ${cardBorder}` }}>
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <SectionLabel darkMode={props.darkMode}>{t('Cerita Nasabah', 'Client Stories')}</SectionLabel>
              <h2 className="font-bold leading-tight tracking-tight" style={{ fontSize: 'clamp(1.75rem,4vw,3rem)', color: textMain }}>
                {testiConf?.headline || <>{t('Dipercaya, karena ', 'Trusted, because ')}<span style={{ color: accent }}>{t('mereka merasakannya', 'they felt it')}</span></>}
              </h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((tm, i) => (
              <Reveal key={tm.name} delay={i * 100}>
                <div className="p-7 rounded-2xl h-full flex flex-col relative overflow-hidden"
                  style={{ background: cardBg, borderLeft: `4px solid ${tm.color}`, boxShadow: cardShadow }}>
                  {/* Giant quote mark */}
                  <div style={{ position: 'absolute', top: -14, left: 16, fontSize: '8rem', fontWeight: 900, lineHeight: 1, color: tm.color, opacity: 0.08, fontFamily: 'Georgia, serif', pointerEvents: 'none', userSelect: 'none' }}>"</div>
                  <div className="flex gap-1 mb-5 relative">
                    {[...Array(5)].map((_, j) => (<Star key={j} size={13} fill="#f59e0b" style={{ color: '#f59e0b' }} />))}
                  </div>
                  <p className="text-sm leading-relaxed flex-1 mb-6 relative" style={{ color: textMuted }}>{tm.quote}</p>
                  <div className="flex items-center gap-3 relative">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 text-white"
                      style={{ background: tm.color }}>{tm.initial}</div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: textMain }}>{tm.name}</p>
                      <p className="text-[0.65rem]" style={{ color: textMuted }}>{tm.role} · {tm.city}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ — editorial dividers ─── */}
      <section className="py-24 px-5" style={{ background: videoBg2, borderTop: `1px solid ${cardBorder}` }}>
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <SectionLabel darkMode={props.darkMode}>FAQ</SectionLabel>
              <h2 className="font-bold leading-tight tracking-tight" style={{ fontSize: 'clamp(1.75rem,4vw,2.75rem)', color: textMain }}>
                {t('Pertanyaan yang ', 'Questions ')}<span style={{ color: accent }}>{t('sering ditanyakan', 'often asked')}</span>
              </h2>
            </div>
          </Reveal>
          <div itemScope itemType="https://schema.org/FAQPage" style={{ borderTop: `1px solid ${cardBorder}` }}>
            {FAQS.map((item, i) => (
              <Reveal key={i} delay={i * 40}>
                <div itemScope itemProp="mainEntity" itemType="https://schema.org/Question"
                  style={{ borderBottom: `1px solid ${cardBorder}` }}>
                  <details className="group">
                    <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none select-none" style={{ color: textMain }}>
                      <span itemProp="name" className="text-sm font-semibold leading-snug">{item.q}</span>
                      <ChevronDown size={15} className="flex-shrink-0 transition-transform duration-300 group-open:rotate-180" style={{ color: accent }} />
                    </summary>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                      <p itemProp="text" className="pb-5 text-sm leading-relaxed" style={{ color: textMuted }}>{item.a}</p>
                    </div>
                  </details>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="text-center mt-12">
              <button onClick={onSignIn}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02]"
                style={{ background: accent }}>
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
