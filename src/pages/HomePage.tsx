import React from 'react';
import {
  ArrowRight, ChevronRight, ChevronDown, Shield, CheckCircle,
  Zap, Users, Search, BarChart2,
} from 'lucide-react';
import SiteLayout from './site/SiteLayout';
import {
  SitePageProps, useT, useSiteTheme, Reveal, AnimatedCounter,
  HeroVideo, PRODUCTS, SectionLabel, useWebsiteConfig,
} from './site/siteKit';

const HomePage: React.FC<SitePageProps> = (props) => {
  const { onSignIn, navigate, lang } = props;
  const t = useT(lang);
  const th = useSiteTheme(props.darkMode);
  const { cardBg, cardBorder, cardShadow, textMuted, textMain, videoBg2, videoBg3, accent } = th;

  const heroConfig   = useWebsiteConfig('hero');
  const statsConfig  = useWebsiteConfig('stats');
  const productsConfig = useWebsiteConfig('products');

  const heroHeadline   = heroConfig?.headline    || t('Kami Ada,\nBuat Kamu Tenang.', 'We\'re here\nto protect.');
  const heroCta        = heroConfig?.cta_text    || t('Konsultasi Gratis', 'Book a Consultation');
  const heroCtaSec     = heroConfig?.cta_secondary_text || t('Lihat Produk', 'Our Products');
  const productsLabel  = productsConfig?.headline || t('Produk Kami', 'Our Products');

  const STATS = [
    { target: 12400, suffix: '+', label: statsConfig?.headline || t('Nasabah Aktif', 'Active Clients') },
    { target: 98,    suffix: '%', label: t('Tingkat Kepuasan', 'Satisfaction Rate') },
    { target: 18,    suffix: '+', label: t('Mitra Insurer', 'Insurer Partners') },
    { target: 40,    suffix: '+', label: t('Produk Tersedia', 'Products Available') },
  ];

  const WHY = [
    { color: '#2563eb', Icon: Search,    title: t('Analisis Kebutuhan Cerdas', 'Smart Needs Analysis'),   desc: t('Sebelum rekomendasiin produk apapun, kita pahami dulu konteks hidupmu. Bukan yang paling menguntungkan komisi.', 'Before recommending any product, we deeply understand your life context — not just the most commission-profitable ones.') },
    { color: '#7c3aed', Icon: Users,     title: t('Agen Berlisensi', 'Licensed Agents'),                  desc: t('Semua agen udah lulus sertifikasi resmi dan terus update ilmunya — jadi kamu dapat saran yang beneran valid.', 'All our agents hold official certifications and continuously update their knowledge.') },
    { color: '#d97706', Icon: BarChart2, title: t('Pilihan Terlengkap', 'Widest Selection'),               desc: t('40+ produk dari 18 insurer terpercaya dalam satu platform. Apapun kebutuhan perlindunganmu, ada di sini.', '40+ products from 18 trusted insurers in one platform.') },
    { color: accent,   Icon: Zap,       title: 'Digital-First, Human Touch',                              desc: t('Teknologi bikin semuanya gampang, tapi di baliknya ada manusia nyata yang peduli dan siap bantu.', 'Technology makes everything easy, but behind it are real humans who care and are ready to help.') },
  ];

  return (
    <SiteLayout {...props} active="home" bgVideo="/promo.mp4">

      {/* ═══════════════ HERO (kept) ═══════════════ */}
      <section className="relative min-h-screen min-h-[100dvh] flex items-end overflow-hidden" style={{ background: 'hsl(0 0% 4%)' }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden"><HeroVideo /></div>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.72) 80%, rgba(0,0,0,0.88) 100%)', zIndex: 1 }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)', zIndex: 1 }} />
        <div className="relative w-full max-w-[90%] sm:max-w-md lg:max-w-2xl px-6 md:px-10 pb-12 md:pb-16 pt-32 pointer-events-none" style={{ zIndex: 2 }}>
          <h1 className="font-bold uppercase leading-[1.05] tracking-[-0.05em] mb-3 md:mb-5 opacity-0 animate-fade-up"
            style={{ fontSize: 'clamp(3rem,8vw,6rem)', animationDelay: '0.2s', color: 'hsl(0 0% 96%)' }}>
            Sure<span style={{ color: 'hsl(119 99% 46%)', textShadow: '0 0 40px rgba(1,235,2,0.4)' }}>Path</span>
          </h1>
          <p className="font-light mb-3 md:mb-6 opacity-0 animate-fade-up" style={{ fontSize: 'clamp(1.125rem,2.5vw,1.875rem)', animationDelay: '0.4s', color: 'rgba(245,245,245,0.8)' }}>
            {heroHeadline.split('\n')[0]}
            {heroHeadline.includes('\n') && <><br />{heroHeadline.split('\n').slice(1).join('\n')}</>}
          </p>
          <p className="font-light mb-6 md:mb-8 max-w-lg opacity-0 animate-fade-up" style={{ fontSize: 'clamp(0.875rem,1.5vw,1.125rem)', animationDelay: '0.55s', color: 'rgba(255,255,255,0.78)', lineHeight: '1.7', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
            {heroConfig?.subtitle || t('Asuransi yang beneran ngerti kebutuhanmu — transparan, manusiawi, dan nggak ribet. Satu platform, semua perlindungan yang kamu butuhkan.', 'A transparent, human-centered digital insurance platform built around your real needs — not just numbers on paper.')}
          </p>
          <div className="opacity-0 animate-fade-up mb-6 md:mb-8 max-w-lg" style={{ animationDelay: '0.625s' }}>
            <div style={{ height: '1px', background: 'rgba(1,235,2,0.30)' }} />
          </div>
          <div className="flex flex-wrap gap-3 opacity-0 animate-fade-up" style={{ animationDelay: '0.7s' }}>
            <button onClick={onSignIn}
              className="pointer-events-auto px-6 py-3 md:px-8 md:py-4 text-sm cursor-pointer transition-all active:scale-[0.97] hover:brightness-110"
              style={{ background: 'hsl(119 99% 46%)', color: 'hsl(0 0% 4%)', borderRadius: '14px', fontWeight: 700, letterSpacing: '0.02em', boxShadow: '0 0 24px rgba(1,235,2,0.35)' }}>
              {heroCta}
            </button>
            <button onClick={() => navigate('/products')}
              className="pointer-events-auto px-6 py-3 md:px-8 md:py-4 text-sm cursor-pointer transition-all active:scale-[0.97] hover:brightness-110"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.25)', color: 'white', borderRadius: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
              {heroCtaSec}
            </button>
          </div>
          <div className="mt-5 md:mt-7 flex items-center gap-2 opacity-0 animate-fade-up" style={{ animationDelay: '0.85s' }}>
            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0 animate-trust-pulse" style={{ background: 'rgba(1,235,2,0.85)' }} />
            <p className="text-xs font-light" style={{ color: 'hsl(0 0% 50%)' }}>
              {t('Platform asuransi terpercaya', 'Trusted insurance platform')}
              <span className="mx-1.5" style={{ color: 'rgba(1,235,2,0.4)' }}>·</span>
              Jakarta, Indonesia
              <span className="mx-1.5" style={{ color: 'rgba(1,235,2,0.4)' }}>·</span>
              {t('12.400+ nasabah aktif', '12,400+ active clients')}
            </p>
          </div>
        </div>
        <div className="absolute bottom-8 right-8 z-10 flex flex-col items-center pointer-events-none" style={{ gap: '2px' }}>
          <ChevronDown size={20} className="animate-chevron-1" style={{ color: 'hsl(119 99% 46%)' }} />
          <ChevronDown size={20} className="animate-chevron-2" style={{ color: 'hsl(119 99% 46%)', marginTop: '-8px' }} />
        </div>
      </section>

      {/* ═══════════════ STATS BAR ═══════════════ */}
      <section className="py-16 px-5" style={{ background: videoBg2, borderBottom: `1px solid ${cardBorder}` }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 70}>
              <div className="text-center p-5 rounded-2xl" style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
                <p className="font-black mb-1" style={{ fontSize: 'clamp(1.75rem,4vw,2.5rem)', lineHeight: 1, color: textMain }}>
                  <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                </p>
                <p className="text-xs font-medium mt-1.5" style={{ color: textMuted }}>{stat.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══════════════ WHY SUREPATH ═══════════════ */}
      <section className="py-24 px-5" style={{ background: videoBg3 }}>
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-center mb-16 max-w-xl mx-auto">
              <SectionLabel darkMode={props.darkMode}>{t('Kenapa SurePath?', 'Why SurePath?')}</SectionLabel>
              <h2 className="font-bold leading-tight tracking-tight" style={{ fontSize: 'clamp(1.75rem,4vw,3rem)', color: textMain }}>
                {t('Asuransi yang benar-benar', 'Insurance that truly')}{' '}
                <span style={{ color: accent }}>{t('bekerja untukmu', 'works for you')}</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed" style={{ color: textMuted }}>
                {t('Kami tidak menjual sebanyak-banyaknya. Kami membantu kamu menemukan perlindungan yang paling pas.', 'We don\'t just sell. We help you find the protection that fits your actual life.')}
              </p>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {WHY.map((c, i) => (
              <Reveal key={c.title} delay={i * 60}>
                <div className="group flex gap-5 p-7 rounded-2xl transition-all duration-300 hover:scale-[1.01]"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${c.color}12`, border: `1px solid ${c.color}25` }}>
                    <c.Icon size={20} style={{ color: c.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base mb-2" style={{ color: textMain }}>{c.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{c.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ PRODUCTS TEASER ═══════════════ */}
      <section className="py-24 px-5" style={{ background: videoBg2 }}>
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="flex items-end justify-between mb-12 flex-wrap gap-6">
              <div>
                <SectionLabel darkMode={props.darkMode}>{productsLabel}</SectionLabel>
                <h2 className="font-bold leading-tight tracking-tight" style={{ fontSize: 'clamp(1.75rem,4vw,2.75rem)', color: textMain }}>
                  {t('Perlindungan untuk setiap', 'Protection for every')}{' '}
                  <span style={{ color: accent }}>{t('aspek hidupmu', 'aspect of life')}</span>
                </h2>
              </div>
              <button onClick={() => navigate('/products')} className="flex items-center gap-2 text-sm font-semibold transition-colors" style={{ color: accent }}>
                {t('Lihat Semua', 'View All')} <ChevronRight size={16} />
              </button>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {PRODUCTS.map((p, i) => (
              <Reveal key={p.name} delay={i * 60}>
                <button className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:-translate-y-0.5 w-full text-left min-h-[200px]"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}
                  onClick={() => navigate(`/product/${p.slug}`)} aria-label={`Learn more about ${p.name}`}>
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: p.color }} />
                  <div className="p-6 pt-7">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-105"
                      style={{ background: `${p.color}10`, border: `1px solid ${p.color}20` }}>
                      <p.Icon color={p.color} size={28} />
                    </div>
                    <h3 className="font-bold text-sm mb-1 leading-tight" style={{ color: textMain }}>{p.name}</h3>
                    <p className="text-[0.65rem] font-semibold mb-2" style={{ color: p.color }}>{p.sub}</p>
                    <p className="text-xs leading-relaxed" style={{ color: textMuted }}>{p.desc}</p>
                    <div className="flex items-center gap-1.5 mt-4 text-xs font-semibold transition-all" style={{ color: p.color }}>
                      {t('Pelajari', 'Learn more')} <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ CALCULATOR CTA ═══════════════ */}
      <section className="py-16 px-5" style={{ background: videoBg3, borderTop: `1px solid ${cardBorder}` }}>
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8"
              style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
              <div className="flex-1 text-center md:text-left">
                <SectionLabel darkMode={props.darkMode}>{t('Kalkulator Premi', 'Premium Calculator')}</SectionLabel>
                <h2 className="font-bold leading-tight mb-3" style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', color: textMain }}>
                  {t('Berapa premi asuransi', 'What\'s your car')}{' '}
                  <span style={{ color: accent }}>{t('mobil Anda?', 'insurance premium?')}</span>
                </h2>
                <ul className="space-y-1.5 mt-2">
                  {[t('Tarif resmi OJK batas bawah', 'Official OJK minimum rates'), t('Estimasi all risk & TLO', 'All risk & TLO estimate'), t('Gratis, tanpa daftar', 'Free, no sign-up')].map(it => (
                    <li key={it} className="flex items-center gap-2 text-sm" style={{ color: textMuted }}>
                      <CheckCircle size={14} style={{ color: accent }} /> {it}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="shrink-0">
                <button onClick={() => navigate('/kalkulator')}
                  className="flex items-center gap-2.5 px-8 py-4 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                  style={{ background: accent, color: '#ffffff' }}>
                  <Shield size={16} /> {t('Hitung Sekarang', 'Calculate Now')}
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════ FINAL CTA ═══════════════ */}
      <section className="py-24 px-5" style={{ background: videoBg2 }}>
        <Reveal>
          <div className="max-w-3xl mx-auto text-center">
            <SectionLabel darkMode={props.darkMode}>{t('Mulai Hari Ini', 'Start Today')}</SectionLabel>
            <h2 className="font-bold leading-tight tracking-tight mb-5" style={{ fontSize: 'clamp(2rem,4.5vw,3.5rem)', color: textMain }}>
              {t('Siap memulai', 'Ready to begin')} <span style={{ color: accent }}>{t('perjalanan proteksimu?', 'your protection journey?')}</span>
            </h2>
            <p className="text-base max-w-xl mx-auto mb-10 leading-relaxed" style={{ color: textMuted }}>
              {t('Gabung bareng lebih dari 12.000 orang yang udah percayain ketenangan hidupnya ke SurePath.', 'Join over 12,000 clients who have entrusted their peace of mind to SurePath.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={onSignIn}
                className="group flex items-center justify-center gap-3 px-10 py-4 rounded-xl text-base font-bold text-white transition-all hover:scale-[1.02]"
                style={{ background: accent, boxShadow: `0 10px 30px -10px ${accent}` }}>
                {t('Mulai Sekarang', 'Start Now')} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => navigate('/products')}
                className="group flex items-center justify-center gap-3 px-10 py-4 rounded-xl text-base font-semibold transition-all"
                style={{ background: cardBg, border: `1px solid ${cardBorder}`, color: textMain }}>
                {t('Lihat Semua Produk', 'View All Products')}
              </button>
            </div>
          </div>
        </Reveal>
      </section>

    </SiteLayout>
  );
};

export default HomePage;
