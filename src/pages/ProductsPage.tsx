import React from 'react';
import { ArrowRight, Shield, CheckCircle } from 'lucide-react';
import SiteLayout from './site/SiteLayout';
import { SitePageProps, useT, useSiteTheme, Reveal, PRODUCTS } from './site/siteKit';

const ProductsPage: React.FC<SitePageProps> = (props) => {
  const { onSignIn, navigate, lang } = props;
  const t = useT(lang);
  const th = useSiteTheme(props.darkMode);
  const { cardBg, cardBorder, cardShadow, textMuted, textMain, sectionBg2, sectionBg4, lpGreen } = th;

  return (
    <SiteLayout {...props} active="products">
      {/* ═══════════════ HEADER ═══════════════ */}
      <section className="pt-40 pb-16 px-5 text-center">
        <Reveal>
          <span className="inline-block text-[0.6rem] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full mb-5"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}>
            {t('Produk Kami', 'Our Products')}
          </span>
          <h1 className="font-black leading-tight tracking-[-0.03em] mb-5" style={{ fontSize: 'clamp(2.25rem,5vw,3.75rem)', color: textMain }}>
            {t('Perlindungan untuk Setiap', 'Protection for Every')}{' '}
            <span style={{ background: 'linear-gradient(135deg,#4ade80,#22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t('Aspek Hidupmu', 'Aspect of Life')}
            </span>
          </h1>
          <p className="text-base max-w-2xl mx-auto" style={{ color: textMuted }}>
            {t('40+ produk dari 18 insurer terpercaya dalam satu platform. Bandingkan, pilih, dan beli perlindungan yang paling sesuai kebutuhanmu — semuanya online.', '40+ products from 18 trusted insurers in one platform. Compare, choose, and buy the protection that fits your needs — all online.')}
          </p>
        </Reveal>
      </section>

      {/* ═══════════════ PRODUCT GRID ═══════════════ */}
      <section className="pb-28 px-5" style={{ background: sectionBg2 }}>
        <div className="max-w-7xl mx-auto pt-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PRODUCTS.map((p, i) => (
              <Reveal key={p.name} delay={i * 60}>
                <button className="group relative overflow-hidden rounded-3xl cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:-translate-y-1 w-full text-left h-full min-h-[240px]"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}
                  onClick={() => navigate(`/product/${p.slug}`)} aria-label={`${p.name}`}>
                  <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: p.color }} />
                  <div className="absolute bottom-2 right-3 pointer-events-none select-none font-black leading-none" style={{ fontSize: 90, opacity: 0.04, color: p.color, lineHeight: 1 }}>#{i + 1}</div>
                  <div className="p-7">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 group-hover:rotate-3"
                      style={{ background: `linear-gradient(135deg, ${p.color}22, ${p.color}11)`, border: `1px solid ${p.color}33` }}>
                      <p.Icon color={p.color} size={40} />
                    </div>
                    <h3 className="font-black text-lg mb-1 leading-tight" style={{ color: textMain }}>{p.name}</h3>
                    <p className="text-xs font-bold mb-3" style={{ color: p.color }}>{p.sub}</p>
                    <p className="text-sm leading-relaxed mb-5" style={{ color: textMuted }}>{p.desc}</p>
                    <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: p.color }}>
                      {t('Pelajari & Beli', 'Learn & Buy')} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>
              </Reveal>
            ))}

            {/* Consultation card */}
            <Reveal delay={PRODUCTS.length * 60}>
              <div className="relative overflow-hidden rounded-3xl p-7 h-full min-h-[240px] flex flex-col justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.04))', border: '1px solid rgba(34,197,94,0.18)' }}>
                <h3 className="font-black text-lg mb-2" style={{ color: textMain }}>{t('Belum yakin pilih yang mana?', 'Not sure which to pick?')}</h3>
                <p className="text-sm leading-relaxed mb-6" style={{ color: textMuted }}>
                  {t('Ngobrol gratis dengan agen kami. Kami bantu temukan perlindungan yang paling pas — tanpa tekanan jualan.', 'Chat free with our agent. We help you find the right fit — no sales pressure.')}
                </p>
                <button onClick={onSignIn}
                  className="self-start flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:scale-[1.03]"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                  {t('Konsultasi Gratis', 'Free Consultation')} <ArrowRight size={14} />
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══════════════ KALKULATOR CTA ═══════════════ */}
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
                <ul className="space-y-1.5 mt-2">
                  {[t('Tarif resmi OJK batas bawah', 'Official OJK minimum rates'), t('Estimasi all risk & TLO', 'All risk & TLO estimate'), t('Gratis, tanpa daftar', 'Free, no sign-up')].map(it => (
                    <li key={it} className="flex items-center gap-2 text-sm" style={{ color: textMuted }}>
                      <CheckCircle size={14} style={{ color: lpGreen }} /> {it}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="shrink-0">
                <button onClick={() => navigate('/kalkulator')}
                  className="flex items-center gap-2.5 px-8 py-4 rounded-2xl font-black text-sm transition-all hover:scale-105 active:scale-95"
                  style={{ background: lpGreen, color: '#000', boxShadow: '0 4px 24px rgba(6,230,0,0.35)' }}>
                  <Shield size={18} /> {t('Hitung Premi Gratis', 'Calculate Free')}
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
