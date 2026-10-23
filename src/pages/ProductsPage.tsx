import React from 'react';
import { ArrowRight, CheckCircle, Shield } from 'lucide-react';
import SiteLayout from './site/SiteLayout';
import { SitePageProps, useT, useSiteTheme, Reveal, PRODUCTS, SectionLabel, useWebsiteConfig } from './site/siteKit';

const ProductsPage: React.FC<SitePageProps> = (props) => {
  const { onSignIn, navigate, lang } = props;
  const t = useT(lang);
  const th = useSiteTheme(props.darkMode);
  const { cardBg, cardBorder, cardShadow, textMuted, textMain, videoBg2, videoBg3, accent } = th;

  const config    = useWebsiteConfig('products');
  const subtitle  = config?.subtitle  || t('40+ produk dari 18 insurer terpercaya dalam satu platform. Bandingkan, pilih, dan beli — semuanya online.', '40+ products from 18 trusted insurers in one platform. Compare, choose, and buy — all online.');
  const ctaText   = config?.cta_text   || t('Konsultasi Gratis', 'Free Consultation');

  return (
    <SiteLayout {...props} active="products" bgVideo="/bg1.mp4">

      {/* ─── Header ─── */}
      <section className="pt-36 pb-14 px-5 text-center" style={{ background: videoBg2 }}>
        <Reveal>
          <SectionLabel darkMode={props.darkMode}>{t('Produk Kami', 'Our Products')}</SectionLabel>
          <h1 className="font-bold leading-tight tracking-tight mb-4" style={{ fontSize: 'clamp(2rem,5vw,3.25rem)', color: textMain }}>
            {config?.headline || t('Perlindungan untuk setiap ', 'Protection for every ')}
            <span style={{ color: accent }}>{t('aspek hidupmu', 'aspect of life')}</span>
          </h1>
          <p className="text-base max-w-2xl mx-auto leading-relaxed" style={{ color: textMuted }}>{subtitle}</p>
        </Reveal>
      </section>

      {/* ─── Product grid ─── */}
      <section className="pb-24 px-5" style={{ background: videoBg2, borderTop: `1px solid ${cardBorder}` }}>
        <div className="max-w-7xl mx-auto pt-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PRODUCTS.map((p, i) => (
              <Reveal key={p.name} delay={i * 60}>
                <a
                  href={`/product/${p.slug}`}
                  className="spx-card spx-sheen group rounded-2xl cursor-pointer w-full text-left h-full min-h-[240px] flex flex-col"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, ['--spx-accent' as string]: p.color, textDecoration: 'none', color: 'inherit' }}
                  onClick={e => { e.preventDefault(); navigate(`/product/${p.slug}`); }} aria-label={p.name}>
                  {/* Color gradient header */}
                  <div className="flex items-center justify-center flex-shrink-0"
                    style={{ height: 72, background: `linear-gradient(135deg, ${p.color}20 0%, ${p.color}08 100%)` }}>
                    <p.Icon color={p.color} size={30} className="transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  {/* 2px solid color rule */}
                  <div style={{ height: 2, background: p.color, flexShrink: 0 }} />
                  {/* Card body */}
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-base leading-tight" style={{ color: textMain }}>{p.name}</h3>
                      {p.comingSoon && (
                        <span className="shrink-0 text-[0.55rem] font-bold uppercase tracking-[0.15em] px-2 py-1 rounded-full"
                          style={{ background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}35` }}>
                          {t('Segera Hadir', 'Coming Soon')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold mb-3" style={{ color: p.color }}>{p.sub}</p>
                    <p className="text-sm leading-relaxed mb-5 flex-1" style={{ color: textMuted }}>{p.desc}</p>
                    <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: p.color }}>
                      {p.comingSoon ? t('Pelajari & Daftar Minat', 'Learn & Join Waitlist') : t('Pelajari & Beli', 'Learn & Buy')}
                      <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </a>
              </Reveal>
            ))}

            {/* Consultation card — solid accent, inverted */}
            <Reveal delay={PRODUCTS.length * 60}>
              <div className="spx-card spx-grid spx-sheen rounded-2xl h-full min-h-[240px] flex flex-col overflow-hidden"
                style={{ background: accent, ['--spx-accent' as string]: accent }}>
                <div className="spx-grid-tex" style={{ ['--spx-accent' as string]: '#ffffff' }} />
                <div className="p-8 flex flex-col flex-1 justify-center">
                  <p style={{ fontSize: '0.55rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.3em', marginBottom: 14 }}>
                    {t('KONSULTASI', 'CONSULTATION')}
                  </p>
                  <h3 className="font-bold text-lg mb-2" style={{ color: '#ffffff' }}>
                    {t('Belum yakin pilih yang mana?', 'Not sure which to pick?')}
                  </h3>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {t('Ngobrol gratis dengan agen kami. Kami bantu temukan perlindungan yang paling pas — tanpa tekanan jualan.', 'Chat free with our agent. We help you find the right fit — no sales pressure.')}
                  </p>
                  <button onClick={onSignIn}
                    className="self-start flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.03]"
                    style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff', backdropFilter: 'blur(8px)' }}>
                    {ctaText} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── Calculator CTA ─── */}
      <section className="py-16 px-5" style={{ background: videoBg3, borderTop: `1px solid ${cardBorder}` }}>
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="spx-card spx-grid spx-sheen rounded-2xl overflow-hidden flex flex-col md:flex-row"
              style={{ background: cardBg, boxShadow: cardShadow, border: `1px solid ${cardBorder}`, ['--spx-accent' as string]: accent }}>
              <div className="spx-grid-tex" />
              {/* Left accent bar */}
              <div className="md:w-1.5 h-1.5 md:h-auto flex-shrink-0" style={{ background: accent }} />
              <div className="flex flex-col md:flex-row items-center gap-8 p-8 md:p-10 flex-1">
                <div className="flex-1 text-center md:text-left">
                  <SectionLabel darkMode={props.darkMode}>{t('Hitung Premi Sekarang', 'Calculate Premium Now')}</SectionLabel>
                  <h2 className="font-bold leading-tight mb-3" style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', color: textMain }}>
                    {t('Berapa premi asuransi', "What's your car")}{' '}
                    <span style={{ color: accent }}>{t('mobil Anda?', 'insurance premium?')}</span>
                  </h2>
                  <ul className="space-y-1.5 mt-2">
                    {[t('Tarif resmi OJK batas bawah', 'Official OJK minimum rates'), t('Estimasi all risk & TLO', 'All risk & TLO estimate'), t('Gratis, tanpa daftar', 'Free, no sign-up')].map(it => (
                      <li key={it} className="flex items-center gap-2 text-sm" style={{ color: textMuted }}>
                        <CheckCircle size={13} style={{ color: accent }} /> {it}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="shrink-0">
                  <a href="/kalkulator" onClick={e => { e.preventDefault(); navigate('/kalkulator'); }}
                    className="flex items-center gap-2.5 px-8 py-4 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                    style={{ background: accent, color: '#ffffff', textDecoration: 'none' }}>
                    <Shield size={16} /> {t('Hitung Premi Gratis', 'Calculate Free')}
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

    </SiteLayout>
  );
};

export default ProductsPage;
