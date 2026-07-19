import React from 'react';
import { ArrowRight, Car } from 'lucide-react';
import SiloLandingTemplate from '../site/SiloLandingTemplate';
import SiteLayout from '../site/SiteLayout';
import { SEO } from '../site/SEO';
import { Breadcrumb, breadcrumbJsonLd } from '../site/Breadcrumb';
import { SitePageProps, useT, useSiteTheme, Reveal, SectionLabel } from '../site/siteKit';
import { CAR_MODELS, CAR_MODEL_CONTENT } from './carModelContent';

interface ModelPageProps extends SitePageProps {
  model: string;
}

export const CarModelPage: React.FC<ModelPageProps> = ({ model, ...page }) => {
  const content = CAR_MODEL_CONTENT[model];
  const th = useSiteTheme(page.darkMode);
  if (!content) {
    return (
      <SiteLayout {...page}>
        <div className="max-w-2xl mx-auto px-6 pt-40 pb-24 text-center">
          <p style={{ color: th.textMuted }}>Model tidak ditemukan.</p>
          <button onClick={() => page.navigate('/asuransi-mobil/model')} className="mt-4 text-sm font-bold" style={{ color: th.accent }}>
            ← Kembali ke Semua Model
          </button>
        </div>
      </SiteLayout>
    );
  }
  return <SiloLandingTemplate content={content} {...page} />;
};

const rootCrumbs = [
  { name: 'Beranda', path: '/' },
  { name: 'Produk', path: '/products' },
  { name: 'Asuransi Mobil', path: '/asuransi-mobil' },
  { name: 'Per Model', path: '/asuransi-mobil/model' },
];

export const CarModelIndex: React.FC<SitePageProps> = (page) => {
  const t = useT(page.lang);
  const th = useSiteTheme(page.darkMode);

  return (
    <SiteLayout {...page} active="asuransi-mobil">
      <SEO
        title="Asuransi Mobil per Model — Avanza, Brio, Xpander | SurePath"
        description="Pertimbangan asuransi spesifik per model mobil populer di Indonesia — Toyota Avanza, Honda Brio, Mitsubishi Xpander. Tarif OJK dan hal khusus yang perlu diketahui."
        path="/asuransi-mobil/model"
        jsonLd={breadcrumbJsonLd(rootCrumbs)}
      />
      <section className="max-w-4xl mx-auto px-6 pt-28 pb-6">
        <Breadcrumb crumbs={rootCrumbs} navigate={page.navigate} th={th} />
      </section>
      <section className="max-w-4xl mx-auto px-6 pb-10 text-center">
        <Reveal>
          <SectionLabel darkMode={page.darkMode}>{t('Per Model', 'By Model')}</SectionLabel>
          <h1 className="font-black tracking-tight mb-5" style={{ fontSize: 'clamp(2rem,5vw,3rem)', color: th.textMain }}>
            {t('Asuransi Mobil per Model', 'Car Insurance by Model')}
          </h1>
          <p className="text-base leading-relaxed max-w-2xl mx-auto" style={{ color: th.textMuted }}>
            {t('Setiap model punya pola pemakaian yang berbeda — dan itu memengaruhi pertimbangan asuransinya. Pilih modelmu.',
               'Every model has different usage patterns — and that affects insurance considerations. Pick your model.')}
          </p>
        </Reveal>
      </section>
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CAR_MODELS.map((m, i) => (
            <Reveal key={m.slug} delay={i * 40}>
              <button onClick={() => page.navigate(`/asuransi-mobil/model/${m.slug}`)}
                className="flex items-center justify-between w-full text-left p-5 rounded-2xl transition-all hover:opacity-85"
                style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}`, boxShadow: th.cardShadow }}>
                <div className="flex items-start gap-3">
                  <Car size={18} style={{ color: th.accent, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <h2 className="text-sm font-black mb-1" style={{ color: th.textMain }}>{m.name}</h2>
                    <p className="text-xs leading-relaxed" style={{ color: th.textMuted }}>{m.type}</p>
                  </div>
                </div>
                <ArrowRight size={16} style={{ color: th.accent, flexShrink: 0 }} />
              </button>
            </Reveal>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
};

export default CarModelPage;
