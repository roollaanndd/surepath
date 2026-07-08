import React from 'react';
import {
  ArrowRight, ChevronRight, ChevronDown,
  Zap, Users, Search, BarChart2,
} from 'lucide-react';
import SiteLayout from './site/SiteLayout';
import PremiumCalcWidget from './site/PremiumCalcWidget';
import {
  SitePageProps, useT, useSiteTheme, Reveal, 
  HeroVideo, PRODUCTS, SectionLabel, useWebsiteConfig,
} from './site/siteKit';

const HomePage: React.FC<SitePageProps> = (props) => {
  const { onSignIn, navigate, lang } = props;
  const t = useT(lang);
  const th = useSiteTheme(props.darkMode);
  const { cardBg, cardBorder, textMuted, textMain, videoBg2, videoBg3, accent } = th;

  const heroConfig     = useWebsiteConfig('hero');
  // const statsConfig = useWebsiteConfig('stats'); // re-enable with STATS section
  const productsConfig = useWebsiteConfig('products');

  const heroHeadline  = heroConfig?.headline    || t('Kami Ada,\nBuat Kamu Tenang.', 'We\'re here\nto protect.');
  const heroCta       = heroConfig?.cta_text    || t('Konsultasi Gratis', 'Book a Consultation');
  const heroCtaSec    = heroConfig?.cta_secondary_text || t('Lihat Produk', 'Our Products');
  const productsLabel = productsConfig?.headline || t('Produk Kami', 'Our Products');

  // STATS section temporarily hidden — data kept for re-enable:
  // const STATS = [
  //     { target: 12400, suffix: '+', label: statsConfig?.headline || t('Nasabah Aktif', 'Active Clients') },
  //     { target: 98,    suffix: '%', label: t('Tingkat Kepuasan', 'Satisfaction Rate') },
  //     { target: 18,    suffix: '+', label: t('Mitra Insurer', 'Insurer Partners') },
  //     { target: 40,    suffix: '+', label: t('Produk Tersedia', 'Products Available') },
  //   ];

  const WHY = [
    { color: '#2563eb', Icon: Search,    title: t('Analisis Kebutuhan Cerdas', 'Smart Needs Analysis'),   desc: t('Sebelum rekomendasiin produk apapun, kita pahami dulu konteks hidupmu. Bukan yang paling menguntungkan komisi.', 'Before recommending any product, we deeply understand your life context — not just the most commission-profitable ones.') },
    { color: '#7c3aed', Icon: Users,     title: t('Mitra Berlisensi', 'Licensed Partners'),               desc: t('Semua mitra udah lulus sertifikasi resmi dan terus update ilmunya — jadi kamu dapat saran yang beneran valid.', 'All our partners hold official certifications and continuously update their knowledge.') },
    { color: '#d97706', Icon: BarChart2, title: t('Pilihan Terlengkap', 'Widest Selection'),               desc: t('Berbagai produk dari insurer terpercaya dalam satu platform. Apapun kebutuhan perlindunganmu, ada di sini.', 'A wide range of products from trusted insurers in one platform.') },
    { color: accent,    Icon: Zap,       title: 'Digital-First, Human Touch',                              desc: t('Teknologi bikin semuanya gampang, tapi di baliknya ada manusia nyata yang peduli dan siap bantu.', 'Technology makes everything easy, but behind it are real humans who care and are ready to help.') },
  ];

  return (
    <SiteLayout {...props} active="home" bgVideo="/promo.mp4">

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative min-h-screen min-h-[100dvh] flex items-end overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(130 60% 4%) 0%, hsl(0 0% 5%) 50%, hsl(220 30% 6%) 100%)' }}>
        {/* Video full-bleed; object-position pushes the subject right on desktop so the
            left side is still video content — no seam, colors always blend */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden hidden lg:block"><HeroVideo position="78% center" /></div>
        <div className="absolute inset-0 pointer-events-none overflow-hidden lg:hidden"><HeroVideo /></div>
        {/* Desktop: subtle left scrim for copy legibility — translucent so video shows through */}
        <div className="absolute inset-0 pointer-events-none hidden lg:block" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 30%, rgba(0,0,0,0.08) 52%, transparent 68%)', zIndex: 1 }} />
        {/* Light bottom gradient for legibility — much thinner than before */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.10) 55%, rgba(0,0,0,0.42) 100%)', zIndex: 1 }} />
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
            <button onClick={onSignIn} className="pointer-events-auto px-6 py-3 md:px-8 md:py-4 text-sm cursor-pointer transition-all active:scale-[0.97] hover:brightness-110"
              style={{ background: 'hsl(119 99% 46%)', color: 'hsl(0 0% 4%)', borderRadius: '14px', fontWeight: 700, letterSpacing: '0.02em', boxShadow: '0 0 24px rgba(1,235,2,0.35)' }}>
              {heroCta}
            </button>
            <button onClick={() => navigate('/products')} className="pointer-events-auto px-6 py-3 md:px-8 md:py-4 text-sm cursor-pointer transition-all active:scale-[0.97] hover:brightness-110"
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
              {t('Amanah & Terpercaya', 'Trusted & Reliable')}
            </p>
          </div>
        </div>
        <div className="absolute bottom-8 right-8 z-10 flex flex-col items-center pointer-events-none" style={{ gap: '2px' }}>
          <ChevronDown size={20} className="animate-chevron-1" style={{ color: 'hsl(119 99% 46%)' }} />
          <ChevronDown size={20} className="animate-chevron-2" style={{ color: 'hsl(119 99% 46%)', marginTop: '-8px' }} />
        </div>
      </section>

      {/* ═══════════════ INTERACTIVE STATS COUNTER ═══════════════ */}
      <InteractiveStats darkMode={props.darkMode} lang={lang} />

      {/* ═══════════════ WHY — left-border cards, ordinal bg ═══════════════ */}
      <section className="py-24 px-6" style={{ background: videoBg3 }}>
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="mb-14 max-w-xl">
              <SectionLabel darkMode={props.darkMode}>{t('Kenapa SurePath?', 'Why SurePath?')}</SectionLabel>
              <h2 className="font-bold leading-tight tracking-tight" style={{ fontSize: 'clamp(1.75rem,4vw,3rem)', color: textMain }}>
                {t('Asuransi yang benar-benar', 'Insurance that truly')}{' '}
                <span style={{ color: accent }}>{t('bekerja untukmu', 'works for you')}</span>
              </h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {WHY.map((c, i) => (
              <Reveal key={c.title} delay={i * 60}>
                <div className="spx-card spx-sheen p-7 rounded-2xl h-full"
                  style={{ background: cardBg, borderLeft: `4px solid ${c.color}`, ['--spx-accent' as string]: c.color }}>
                  {/* Faded ordinal watermark */}
                  <div style={{ position: 'absolute', top: -4, right: 14, fontSize: '5.5rem', fontWeight: 900, lineHeight: 1, color: c.color, opacity: 0.07, pointerEvents: 'none', userSelect: 'none' }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="relative">
                    <p style={{ fontSize: '0.55rem', fontWeight: 800, color: c.color, letterSpacing: '0.3em', marginBottom: 14 }}>
                      {String(i + 1).padStart(2, '0')}
                    </p>
                    <c.Icon size={26} style={{ color: c.color, marginBottom: 14 }} />
                    <h3 className="font-bold text-base mb-2" style={{ color: textMain }}>{c.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{c.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ PRODUCTS — color-header cards ═══════════════ */}
      <section className="py-24 px-6" style={{ background: videoBg2 }}>
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
                <button className="spx-card spx-sheen group rounded-2xl cursor-pointer w-full text-left flex flex-col h-full"
                  style={{ background: cardBg, ['--spx-accent' as string]: p.color }}
                  onClick={() => navigate(`/product/${p.slug}`)} aria-label={p.name}>
                  {/* Coloured header */}
                  <div className="flex items-center justify-center" style={{ height: 72, background: `linear-gradient(135deg, ${p.color}20 0%, ${p.color}08 100%)` }}>
                    <p.Icon color={p.color} size={34} className="transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  {/* Colour accent rule */}
                  <div style={{ height: 2, background: p.color, flexShrink: 0 }} />
                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-bold text-sm mb-1 leading-tight" style={{ color: textMain }}>{p.name}</h3>
                    <p className="text-[0.65rem] font-semibold mb-2" style={{ color: p.color }}>{p.sub}</p>
                    <p className="text-xs leading-relaxed mb-4 flex-1" style={{ color: textMuted }}>{p.desc}</p>
                    <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: p.color }}>
                      {t('Pelajari', 'Learn more')} <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ LIVE PREMIUM CALCULATOR ═══════════════ */}
      <section className="py-20 px-6" style={{ background: videoBg3, borderTop: `1px solid ${cardBorder}` }}>
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-10 max-w-2xl mx-auto">
              <SectionLabel darkMode={props.darkMode}>{t('Kalkulator Premi', 'Premium Calculator')}</SectionLabel>
              <h2 className="font-bold leading-tight tracking-tight" style={{ fontSize: 'clamp(1.75rem,4vw,2.75rem)', color: textMain }}>
                {t('Cek premi mobilmu', 'Check your premium')}{' '}
                <span style={{ color: accent }}>{t('langsung di sini', 'right here')}</span>
              </h2>
              <p className="text-base mt-3" style={{ color: textMuted }}>
                {t('Tanpa daftar, tanpa ribet — hasilnya muncul seketika saat kamu mengatur pilihan.',
                   'No sign-up, no hassle — the estimate updates the instant you adjust the options.')}
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <PremiumCalcWidget
              lang={lang}
              darkMode={props.darkMode}
              onSignIn={onSignIn}
              onDetail={() => navigate('/kalkulator')}
            />
          </Reveal>
        </div>
      </section>

      {/* ═══════════════ FINAL CTA ═══════════════ */}
      <section className="py-24 px-6" style={{ background: videoBg2 }}>
        <Reveal>
          <div className="max-w-3xl mx-auto text-center">
            <SectionLabel darkMode={props.darkMode}>{t('Mulai Hari Ini', 'Start Today')}</SectionLabel>
            <h2 className="font-bold leading-tight tracking-tight mb-5" style={{ fontSize: 'clamp(2rem,4.5vw,3.5rem)', color: textMain }}>
              {t('Siap memulai', 'Ready to begin')}{' '}
              <span style={{ color: accent }}>{t('perjalanan proteksimu?', 'your protection journey?')}</span>
            </h2>
            <p className="text-base max-w-xl mx-auto mb-10 leading-relaxed" style={{ color: textMuted }}>
              {t('Mulai lindungi yang paling berharga dalam hidupmu — transparan, manusiawi, dan nggak ribet.', 'Start protecting what matters most — transparent, human-centered, and hassle-free.')}
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

// ─── Interactive Animated Stats Counter ──────────────────────────────────────
// Counts up from 0 to target when scrolled into view (IntersectionObserver).
// Creates a memorable "wow" moment on the homepage.

const InteractiveStats: React.FC<{ darkMode: boolean; lang: any }> = ({ darkMode }) => {
  const [visible, setVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const STATS = [
    { target: 5,    suffix: '',     label: 'Produk Asuransi',   color: '#00C16A' },
    { target: 24,   suffix: '/7',   label: 'Support Online',     color: '#3B82F6' },
    { target: 60,   suffix: ' detik', label: 'Pendaftaran Cepat', color: '#F59E0B' },
    { target: 100,  suffix: '%',    label: 'Tarif Transparan',   color: '#7C3AED' },
  ];

  return (
    <section ref={ref} className="py-16 px-6" style={{
      background: darkMode
        ? 'linear-gradient(135deg, #080B12 0%, #0F1829 50%, #080B12 100%)'
        : 'linear-gradient(135deg, #F4F7FB 0%, #E6FAF0 50%, #F4F7FB 100%)',
    }}>
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {STATS.map((stat, i) => (
            <div key={i} className="text-center" style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(20px)',
              transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.15}s`,
            }}>
              <div className="text-4xl md:text-5xl font-black tracking-tight" style={{ color: stat.color }}>
                <CountUp target={stat.target} start={visible} />
                <span style={{ fontSize: '0.6em' }}>{stat.suffix}</span>
              </div>
              <p className="text-xs md:text-sm font-bold uppercase tracking-widest mt-2" style={{
                color: darkMode ? '#94A3B8' : '#6B7280',
              }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// CountUp component — animates from 0 to target
const CountUp: React.FC<{ target: number; start: boolean }> = ({ target, start }) => {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!start) return;
    const duration = 1500;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [start, target]);

  return <>{count}</>;
};

export default HomePage;
