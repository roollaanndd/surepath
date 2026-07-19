import React from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import SiteLayout from '../site/SiteLayout';
import { SEO } from '../site/SEO';
import { Breadcrumb, breadcrumbJsonLd } from '../site/Breadcrumb';
import { SitePageProps, useT, useSiteTheme, Reveal, SectionLabel } from '../site/siteKit';
import { GLOSSARY_TERMS, glossaryTermBySlug } from './glossaryContent';

interface Props extends SitePageProps {
  slug?: string;
}

const BASE_URL = 'https://myinsurepath.com';
const indexCrumb = { name: 'Glosarium', path: '/glosarium' };
const rootCrumbs = [{ name: 'Beranda', path: '/' }, indexCrumb];

const GlossaryIndex: React.FC<SitePageProps> = (page) => {
  const t = useT(page.lang);
  const th = useSiteTheme(page.darkMode);
  const jsonLd = breadcrumbJsonLd(rootCrumbs);

  return (
    <SiteLayout {...page} active="glosarium">
      <SEO
        title="Glosarium Asuransi — Istilah Asuransi Mobil Dijelaskan | SurePath"
        description="Kamus istilah asuransi mobil: All Risk, TLO, risiko sendiri, uang pertanggungan, SRCC, dan lainnya — dijelaskan sederhana dengan contoh nyata."
        path="/glosarium"
        jsonLd={jsonLd}
      />
      <section className="max-w-4xl mx-auto px-6 pt-28 pb-6">
        <Breadcrumb crumbs={rootCrumbs} navigate={page.navigate} th={th} />
      </section>
      <section className="max-w-4xl mx-auto px-6 pb-16 text-center">
        <Reveal>
          <SectionLabel darkMode={page.darkMode}>{t('Glosarium', 'Glossary')}</SectionLabel>
          <h1 className="font-black tracking-tight mb-5" style={{ fontSize: 'clamp(2rem,5vw,3rem)', color: th.textMain }}>
            {t('Istilah Asuransi, Dijelaskan Sederhana', 'Insurance Terms, Explained Simply')}
          </h1>
          <p className="text-base leading-relaxed max-w-2xl mx-auto" style={{ color: th.textMuted }}>
            {t('Bingung dengan istilah teknis di polis asuransi? Semua dijelaskan di sini, lengkap dengan contoh nyata.',
               'Confused by technical terms in your policy? Everything is explained here, with real examples.')}
          </p>
        </Reveal>
      </section>
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {GLOSSARY_TERMS.map((term, i) => (
            <Reveal key={term.slug} delay={i * 40}>
              <button onClick={() => page.navigate(`/glosarium/${term.slug}`)}
                className="text-left w-full p-5 rounded-2xl h-full transition-all hover:opacity-85"
                style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}`, boxShadow: th.cardShadow }}>
                <span className="text-[0.6rem] font-black uppercase tracking-widest" style={{ color: th.accent }}>{term.category}</span>
                <h2 className="text-base font-black mt-1.5 mb-2" style={{ color: th.textMain }}>{term.term}</h2>
                <p className="text-xs leading-relaxed" style={{ color: th.textMuted }}>{term.shortDef}</p>
                <span className="inline-flex items-center gap-1 mt-3 text-xs font-bold" style={{ color: th.accent }}>
                  {t('Baca selengkapnya', 'Read more')} <ArrowRight size={12} />
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
};

const GlossaryTermView: React.FC<Props> = (page) => {
  const term = glossaryTermBySlug(page.slug!);
  const t = useT(page.lang);
  const th = useSiteTheme(page.darkMode);

  if (!term) {
    return (
      <SiteLayout {...page} active="glosarium">
        <div className="max-w-2xl mx-auto px-6 pt-40 pb-24 text-center">
          <p style={{ color: th.textMuted }}>{t('Istilah tidak ditemukan.', 'Term not found.')}</p>
          <button onClick={() => page.navigate('/glosarium')} className="mt-4 text-sm font-bold" style={{ color: th.accent }}>
            ← {t('Kembali ke Glosarium', 'Back to Glossary')}
          </button>
        </div>
      </SiteLayout>
    );
  }

  const crumbs = [...rootCrumbs, { name: term.term, path: `/glosarium/${term.slug}` }];
  const definedTermJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: term.term,
    description: term.longDef,
    inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Glosarium Asuransi SurePath', url: `${BASE_URL}/glosarium` },
    url: `${BASE_URL}/glosarium/${term.slug}`,
  };
  const jsonLd = [breadcrumbJsonLd(crumbs), definedTermJsonLd];

  const related = term.relatedSlugs.map(s => glossaryTermBySlug(s)).filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <SiteLayout {...page} active="glosarium">
      <SEO
        title={`Apa itu ${term.term}? Pengertian & Contoh | Glosarium SurePath`}
        description={term.shortDef}
        path={`/glosarium/${term.slug}`}
        jsonLd={jsonLd}
      />
      <section className="max-w-3xl mx-auto px-6 pt-28 pb-6">
        <Breadcrumb crumbs={crumbs} navigate={page.navigate} th={th} />
      </section>
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <Reveal>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} style={{ color: th.accent }} />
            <span className="text-[0.6rem] font-black uppercase tracking-widest" style={{ color: th.accent }}>{term.category}</span>
          </div>
          <h1 className="font-black tracking-tight mb-6" style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', color: th.textMain }}>{term.term}</h1>
          <p className="text-base leading-relaxed mb-6" style={{ color: th.textMuted }}>{term.longDef}</p>
          <div className="p-5 rounded-2xl mb-8" style={{ background: `${th.accent}0a`, border: `1px solid ${th.accent}22` }}>
            <p className="text-[0.62rem] font-black uppercase tracking-widest mb-1.5" style={{ color: th.accent }}>{t('Contoh', 'Example')}</p>
            <p className="text-sm leading-relaxed" style={{ color: th.textMain }}>{term.example}</p>
          </div>
          <button onClick={() => page.navigate(term.ctaPath)}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-black text-white transition-all hover:scale-[1.02] active:scale-95"
            style={{ background: th.accent, boxShadow: `0 10px 26px -10px ${th.accent}` }}>
            {term.ctaLabel} <ArrowRight size={15} />
          </button>
        </Reveal>
      </section>
      {related.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 pb-24">
          <h2 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: th.textMuted }}>{t('Istilah Terkait', 'Related Terms')}</h2>
          <div className="flex flex-wrap gap-2">
            {related.map(r => (
              <button key={r.slug} onClick={() => page.navigate(`/glosarium/${r.slug}`)}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}`, color: th.textMain }}>
                {r.term}
              </button>
            ))}
          </div>
        </section>
      )}
    </SiteLayout>
  );
};

const GlossaryPage: React.FC<Props> = (props) => (
  props.slug ? <GlossaryTermView {...props} /> : <GlossaryIndex {...props} />
);

export default GlossaryPage;
