import React from 'react';
import {
  ArrowRight, ChevronRight, ChevronDown, Sparkles, Users, Search, BarChart2, Zap, Shield,
} from 'lucide-react';
import SiteLayout from './site/SiteLayout';
import {
  SitePageProps, useT, useSiteTheme, Reveal, AnimatedCounter, HeroVideo, PRODUCTS,
} from './site/siteKit';

const HomePage: React.FC<SitePageProps> = (props) => {
  const { onSignIn, navigate, lang } = props;
  const t = useT(lang);
  const th = useSiteTheme(props.darkMode);
  const { cardBg, cardBorder, cardShadow, textMuted, textMain, sectionBg2, sectionBg3, sectionBg4, lpGreen } = th;

  const STATS = [
    { target: 12400, suffix: '+', label: t('Nasabah Aktif', 'Active Clients') },
    { target: 98,    suffix: '%', label: t('Tingkat Kepuasan', 'Satisfaction Rate') },
    { target: 18,    suffix: '+', label: t('Mitra Insurer', 'Insurer Partners') },
    { target: 40,    suffix: '+', label: t('Produk Tersedia', 'Products Available') },
  ];

  return (
    <SiteLayout {...props} active="home">
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative min-h-screen min-h-[100dvh] flex items-end overflow-hidden" style={{ background: 'hsl(0 0% 4%)' }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden"><HeroVideo /></div>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.72) 80%, rgba(0,0,0,0.88) 100%)', zIndex: 1 }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)', zIndex: 1 }} />
        <div className="relative w-full max-w-[90%] sm:max-w-md lg:max-w-2xl px-6 md:px-10 pb-12 md:pb-16 pt-32 pointer-events-none" style={{ zIndex: 2 }}>
          <h1 className="font-bold uppercase leading-[1.05] tracking-[-0.05em] mb-3 md:mb-5 opacity-0 animate-fade-up"
            style={{ fontSize: 'clamp(3rem,8vw,6rem)', animationDelay: '0.2s', color: 'hsl(0 0% 96%)' }}>
            Sure<span style={{ color: lpGreen, textShadow: '0 0 40px rgba(1,235,2,0.4)' }}>Path</span>
          </h1>
          <p className="font-light mb-3 md:mb-6 opacity-0 animate-fade-up" style={{ fontSize: 'clamp(1.125rem,2.5vw,1.875rem)', animationDelay: '0.4s', color: 'rgba(245,245,245,0.8)' }}>
            {t('Kami Ada, Buat Kamu Tenang.', 'We\'re here to protect.')}
          </p>
          <p className="font-light mb-6 md:mb-8 max-w-lg opacity-0 animate-fade-up" style={{ fontSize: 'clamp(0.875rem,1.5vw,1.125rem)', animationDelay: '0.55s', color: 'rgba(255,255,255,0.78)', lineHeight: '1.7', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
            {t('Asuransi yang beneran ngerti kebutuhanmu — transparan, manusiawi, dan nggak ribet. Satu platform, semua perlindungan yang kamu butuhkan.', 'A transparent, human-centered digital insurance platform built around your real needs — not just numbers on paper. One platform, all your protection.')}
          </p>
          <div className="opacity-0 animate-fade-up mb-6 md:mb-8 max-w-lg" style={{ animationDelay: '0.625s' }}>
            <div style={{ height: '1px', background: `rgba(1,235,2,0.30)` }} />
          </div>
          <div className="flex flex-wrap gap-3 opacity-0 animate-fade-up" style={{ animationDelay: '0.7s' }}>
            <button onClick={onSignIn}
              className="pointer-events-auto px-6 py-3 md:px-8 md:py-4 text-sm cursor-pointer transition-all active:scale-[0.97] hover:brightness-110"
              style={{ background: lpGreen, color: 'hsl(0 0% 4%)', borderRadius: '14px', fontWeight: 700, letterSpacing: '0.02em', boxShadow: '0 0 24px rgba(1,235,2,0.35)' }}>
              {t('Konsultasi Gratis', 'Book a Consultation')}
            </button>
            <button onClick={() => navigate('/products')}
              className="pointer-events-auto px-6 py-3 md:px-8 md:py-4 text-sm cursor-pointer transition-all active:scale-[0.97] hover:brightness-110"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
              {t('Lihat Produk', 'Our Products')}
            </button>
          </div>
          <div className="mt-5 md:mt-7 flex items-center gap-2 opacity-0 animate-fade-up" style={{ animationDelay: '0.85s' }}>
            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0 animate-trust-pulse" style={{ background: 'rgba(1,235,2,0.85)' }} />
            <p className="text-xs font-light" style={{ color: 'hsl(0 0% 50%)' }}>
              {t('Platform asuransi terpercaya', 'Trusted insurance platform')}
              <span className="mx-1.5" style={{ color: 'rgba(1,235,2,0.4)' }}>·</span>
              {t('Jakarta, Indonesia', 'Jakarta, Indonesia')}
              <span className="mx-1.5" style={{ color: 'rgba(1,235,2,0.4)' }}>·</span>
              {t('12.400+ nasabah aktif', '12,400+ active clients')}
            </p>
          </div>
        </div>
        <div className="absolute bottom-8 right-8 z-10 flex flex-col items-center pointer-events-none" style={{ gap: '2px' }}>
          <ChevronDown size={20} className="animate-chevron-1" style={{ color: lpGreen }} />
          <ChevronDown size={20} className="animate-chevron-2" style={{ color: lpGreen, marginTop: '-8px' }} />
        </div>
      </section>

      {/* ═══════════════ WHY SUREPATH (BENTO) ═══════════════ */}
      <section className="py-28 max-w-7xl mx-auto px-5">
        <Reveal>
          <div className="text-center mb-16">
            <span className="inline-block text-[0.6rem] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full mb-5"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}>
              {t('Kenapa SurePath?', 'Why SurePath?')}
            </span>
            <h2 className="font-black leading-tight tracking-[-0.03em]" style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', color: textMain }}>
              {t('Asuransi yang Benar-Benar', 'Insurance That Truly')}{' '}
              <span style={{ background: 'linear-gradient(135deg,#4ade80,#22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {t('Bekerja Untukmu', 'Works for You')}
              </span>
            </h2>
            <p className="mt-4 text-base max-w-xl mx-auto" style={{ color: textMuted }}>
              {t('Kita bikin platform ini bukan buat jualan sebanyak-banyaknya, tapi buat mastiin kamu dapet perlindungan yang paling pas.', 'We built this platform not to sell as much as possible, but to ensure you get the most appropriate protection.')}
            </p>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Reveal className="md:col-span-2" delay={0}>
            <div className="group relative overflow-hidden rounded-3xl p-8 h-full min-h-[220px] cursor-default transition-all duration-500 hover:scale-[1.01]"
              style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.07), rgba(16,185,129,0.03))', border: `1px solid rgba(34,197,94,0.12)` }}>
              <div className="absolute bottom-0 right-4 pointer-events-none select-none leading-none font-black" style={{ fontSize: 120, opacity: 0.04, color: '#22c55e', lineHeight: 1 }}>01</div>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <Sparkles size={22} style={{ color: '#22c55e' }} />
              </div>
              <h3 className="text-xl font-black mb-3" style={{ color: textMain }}>{t('Analisis Kebutuhan Cerdas', 'Smart Needs Analysis')}</h3>
              <p className="text-sm leading-relaxed" style={{ color: textMuted }}>
                {t('Sebelum rekomendasiin produk apapun, kita pahami dulu konteks hidupmu secara menyeluruh. Agen dan teknologi kami saling melengkapi buat nemuin solusi yang beneran cocok — bukan yang paling menguntungkan komisi.', 'Before recommending any product, we fully understand your life context. Our agents and technology work together to find truly suitable solutions — not the most commission-profitable ones.')}
              </p>
            </div>
          </Reveal>
          {[
            { color: '#3b82f6', Icon: Users,    pill: '01/03', title: t('Agen Berlisensi', 'Licensed Agents'),   desc: t('Semua agen kami udah lulus sertifikasi resmi dan terus update ilmunya — jadi kamu dapat saran yang beneran valid.', 'All our agents hold official insurance certifications and continuously updated knowledge.') },
            { color: '#a855f7', Icon: Search,   pill: '02/03', title: t('Transparansi 100%', '100% Transparent'), desc: t('Nggak ada biaya tersembunyi. Semua ketentuan polis dijelasin pakai bahasa yang gampang dipahami.', 'No hidden fees. All policy terms explained in clear language.') },
            { color: '#f59e0b', Icon: BarChart2, pill: '03/03', title: t('Pilihan Terlengkap', 'Widest Selection'), desc: t('40+ produk dari 18 insurer terpercaya dalam satu platform. Apapun kebutuhan perlindunganmu, ada di sini.', '40+ products from 18 trusted insurers, one platform for all your protection needs.') },
          ].map((c, i) => (
            <Reveal key={c.pill} delay={80 + i * 40}>
              <div className="group relative overflow-hidden rounded-3xl h-full min-h-[180px] transition-all duration-500 hover:scale-[1.02]"
                style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-3xl" style={{ background: c.color }} />
                <div className="absolute top-4 right-4 text-[0.5rem] font-black tracking-widest px-2 py-0.5 rounded-full" style={{ background: `${c.color}1f`, color: c.color, border: `1px solid ${c.color}40` }}>{c.pill}</div>
                <div className="p-7 pt-8">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5" style={{ background: `${c.color}1a`, border: `1px solid ${c.color}33` }}>
                    <c.Icon size={20} style={{ color: c.color }} />
                  </div>
                  <h3 className="text-lg font-black mb-2" style={{ color: textMain }}>{c.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{c.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
          <Reveal className="md:col-span-2" delay={200}>
            <div className="group relative overflow-hidden rounded-3xl p-8 h-full min-h-[180px] transition-all duration-500 hover:scale-[1.01]"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(5,150,105,0.03))', border: '1px solid rgba(16,185,129,0.1)' }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Zap size={20} style={{ color: '#10b981' }} />
              </div>
              <h3 className="text-xl font-black mb-3" style={{ color: textMain }}>Digital-First, Human Touch</h3>
              <p className="text-sm leading-relaxed" style={{ color: textMuted }}>
                {t('Teknologi kami bikin semuanya gampang, tapi di baliknya ada manusia nyata yang peduli. Agen kami siap jawab pertanyaan yang nggak bisa dijawab algoritma.', 'Modern technology makes access easy, but behind it are real humans who care. Our agents are here to answer the deep questions algorithms cannot.')}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════ STATS ═══════════════ */}
      <section className="py-20 px-5" style={{ background: sectionBg2 }}>
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

      {/* ═══════════════ PRODUCTS TEASER ═══════════════ */}
      <section className="py-28 px-5" style={{ background: sectionBg3 }}>
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="flex items-end justify-between mb-14 flex-wrap gap-6">
              <div>
                <span className="inline-block text-[0.6rem] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full mb-5"
                  style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}>
                  {t('Produk Kami', 'Our Products')}
                </span>
                <h2 className="font-black leading-tight tracking-[-0.03em]" style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: textMain }}>
                  {t('Perlindungan untuk Setiap', 'Protection for Every')}{' '}
                  <span style={{ color: lpGreen }}>{t('Aspek Hidupmu', 'Aspect of Life')}</span>
                </h2>
              </div>
              <button onClick={() => navigate('/products')} className="flex items-center gap-2 text-sm font-bold transition-colors" style={{ color: '#22c55e' }}>
                {t('Lihat Semua', 'View All')} <ChevronRight size={16} />
              </button>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {PRODUCTS.map((p, i) => (
              <Reveal key={p.name} delay={i * 60}>
                <button className="group relative overflow-hidden rounded-3xl cursor-pointer transition-all duration-500 hover:scale-[1.04] hover:-translate-y-1 w-full text-left min-h-[200px]"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}`, clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)', boxShadow: cardShadow }}
                  onClick={() => navigate(`/product/${p.slug}`)} aria-label={`Learn more about ${p.name}`}>
                  <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: p.color }} />
                  <div className="absolute bottom-2 right-3 pointer-events-none select-none font-black leading-none" style={{ fontSize: 80, opacity: 0.04, color: p.color, lineHeight: 1 }}>#{i + 1}</div>
                  <div className="p-6 pt-7">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 group-hover:rotate-3 relative"
                      style={{ background: `linear-gradient(135deg, ${p.color}22, ${p.color}11)`, border: `1px solid ${p.color}33` }}>
                      <p.Icon color={p.color} size={36} />
                    </div>
                    <h3 className="font-black text-sm mb-1 leading-tight" style={{ color: textMain }}>{p.name}</h3>
                    <p className="text-[0.65rem] font-bold mb-3" style={{ color: p.color }}>{p.sub}</p>
                    <p className="text-xs leading-relaxed" style={{ color: textMuted }}>{p.desc}</p>
                    <div className="flex items-center gap-1.5 mt-4 text-xs font-bold transition-all" style={{ color: p.color }}>
                      {t('Pelajari', 'Learn more')} <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ KALKULATOR PREMI CTA ═══════════════ */}
      <section className="py-16 px-5" style={{ background: sectionBg4 }}>
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8"
              style={{ background: props.darkMode ? 'rgba(255,255,255,0.04)' : '#ffffff', border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
              <div className="flex-1 text-center md:text-left">
                <span className="inline-block text-[0.6rem] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full mb-4"
                  style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#16a34a' }}>
                  {t('Hitung Premi Sekarang', 'Calculate Premium Now')}
                </span>
                <h2 className="font-black leading-tight tracking-[-0.02em] mb-3" style={{ fontSize: 'clamp(1.5rem,3vw,2.25rem)', color: textMain }}>
                  {t('Berapa Premi Asuransi', 'What\'s Your Car')}{' '}
                  <span style={{ color: lpGreen }}>{t('Mobil Anda?', 'Insurance Premium?')}</span>
                </h2>
                <p className="text-sm leading-relaxed max-w-md" style={{ color: textMuted }}>
                  {t('Hitung estimasi premi asuransi mobil Anda berdasarkan tarif resmi OJK (batas bawah). Transparan, akurat, dan gratis.', 'Get your car insurance premium estimate using official OJK minimum rates. Transparent, accurate, and free.')}
                </p>
              </div>
              <div className="flex flex-col gap-3 items-center md:items-end shrink-0">
                <button onClick={() => navigate('/kalkulator')}
                  className="flex items-center gap-2.5 px-8 py-4 rounded-2xl font-black text-sm transition-all hover:scale-105 active:scale-95"
                  style={{ background: lpGreen, color: '#000', boxShadow: '0 4px 24px rgba(6,230,0,0.35)' }}>
                  <Shield size={18} /> {t('Hitung Premi Gratis', 'Calculate Free')}
                </button>
                <p className="text-[0.65rem] font-medium" style={{ color: textMuted }}>
                  {t('Berdasarkan SE OJK No.06/SEOJK.05/2017', 'Based on SE OJK No.06/SEOJK.05/2017')}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════ FINAL CTA ═══════════════ */}
      <section className="py-28 max-w-7xl mx-auto px-5">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] p-12 md:p-20 text-center"
            style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(16,185,129,0.06) 50%, rgba(5,150,105,0.08) 100%)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] -translate-y-1/2 rounded-full opacity-20" style={{ background: 'radial-gradient(ellipse, rgba(34,197,94,0.35), transparent)' }} />
            </div>
            <div className="relative z-10">
              <span className="inline-block text-[0.6rem] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full mb-8"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac' }}>
                {t('Mulai Hari Ini', 'Start Today')}
              </span>
              <h2 className="font-black leading-tight tracking-[-0.03em] mb-6" style={{ fontSize: 'clamp(2.2rem,5vw,4rem)', color: textMain }}>
                {t('Siap Memulai', 'Ready to Begin')}<br />
                <span style={{ background: 'linear-gradient(135deg,#4ade80,#22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {t('Perjalanan Proteksimu?', 'Your Protection Journey?')}
                </span>
              </h2>
              <p className="text-base max-w-xl mx-auto mb-10" style={{ color: textMuted }}>
                {t('Gabung bareng lebih dari 12.000 orang yang udah percayain ketenangan hidupnya ke SurePath.', 'Join over 12,000 clients who have entrusted their peace of mind to SurePath.')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={onSignIn}
                  className="group flex items-center justify-center gap-3 px-10 py-4 rounded-2xl text-base font-black text-white transition-all hover:scale-[1.03] hover:shadow-2xl"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 8px 40px rgba(34,197,94,0.3)' }}>
                  {t('Mulai Sekarang', 'Start Now')} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => navigate('/products')}
                  className="group flex items-center justify-center gap-3 px-10 py-4 rounded-2xl text-base font-black transition-all"
                  style={{ background: cardBg, border: `1px solid rgba(34,197,94,0.2)`, color: '#4ade80' }}>
                  {t('Lihat Semua Produk', 'View All Products')}
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </SiteLayout>
  );
};

export default HomePage;
