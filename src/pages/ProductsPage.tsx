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
                <button
                  className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 w-full text-left h-full min-h-[240px]"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}
                  onClick={() => navigate(`/product/${p.slug}`)} aria-label={p.name}>
                  <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: p.color }} />
                  <div className="p-8">
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-105"
                      style={{ background: `${p.color}10`, border: `1px solid ${p.color}20` }}>
                      <p.Icon color={p.color} size={32} />
                    </div>
                    <h3 className="font-bold text-lg mb-1 leading-tight" style={{ color: textMain }}>{p.name}</h3>
                    <p className="text-xs font-semibold mb-3" style={{ color: p.color }}>{p.sub}</p>
                    <p className="text-sm leading-relaxed mb-5" style={{ color: textMuted }}>{p.desc}</p>
                    <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: p.color }}>
                      {t('Pelajari & Beli', 'Learn & Buy')} <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>
              </Reveal>
            ))}

            {/* Consultation card */}
            <Reveal delay={PRODUCTS.length * 60}>
              <div className="rounded-2xl p-8 h-full min-h-[240px] flex flex-col justify-center"
                style={{ background: videoBg3, border: `1px solid ${cardBorder}` }}>
                <h3 className="font-bold text-lg mb-2" style={{ color: textMain }}>{t('Belum yakin pilih yang mana?', 'Not sure which to pick?')}</h3>
                <p className="text-sm leading-relaxed mb-6" style={{ color: textMuted }}>
                  {t('Ngobrol gratis dengan agen kami. Kami bantu temukan perlindungan yang paling pas — tanpa tekanan jualan.', 'Chat free with our agent. We help you find the right fit — no sales pressure.')}
                </p>
                <button onClick={onSignIn}
                  className="self-start flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.03]"
                  style={{ background: accent, color: '#ffffff' }}>
                  {ctaText} <ArrowRight size={14} />
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── Calculator CTA ─── */}
      <section className="py-16 px-5" style={{ background: videoBg3, borderTop: `1px solid ${cardBorder}` }}>
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8"
              style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
              <div className="flex-1 text-center md:text-left">
                <SectionLabel darkMode={props.darkMode}>{t('Hitung Premi Sekarang', 'Calculate Premium Now')}</SectionLabel>
                <h2 className="font-bold leading-tight mb-3" style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', color: textMain }}>
                  {t('Berapa premi asuransi', 'What\'s your car')}{' '}
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
                <button onClick={() => navigate('/kalkulator')}
                  className="flex items-center gap-2.5 px-8 py-4 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                  style={{ background: accent, color: '#ffffff' }}>
                  <Shield size={16} /> {t('Hitung Premi Gratis', 'Calculate Free')}
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

    </SiteLayout>
  );
};

export default ProductsPage;
