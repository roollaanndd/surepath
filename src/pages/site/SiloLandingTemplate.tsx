import React from 'react';
import { CheckCircle, ArrowRight, ShieldCheck, HelpCircle, ArrowLeftRight } from 'lucide-react';
import SiteLayout from './SiteLayout';
import PremiumCalcWidget from './PremiumCalcWidget';
import { SEO } from './SEO';
import { Breadcrumb, Crumb, breadcrumbJsonLd } from './Breadcrumb';
import { SitePageProps, useT, useSiteTheme, Reveal, SectionLabel } from './siteKit';

// Reusable landing-page template for SEO silo pages (docs/SEO_ARCHITECTURE.md
// Phase 3). One template, many content payloads — content differs per page,
// markup does not, so pages stay structurally consistent without duplicating
// ~400 lines of JSX per silo page.

export interface SiloFAQ { q: string; a: string; }
export interface SiloComparisonRow { label: string; a: string; b: string; }
export interface SiloClaimStep { title: string; desc: string; }
export interface SiloInternalLink { label: string; path: string; }
export interface SiloRelatedArticle { title: string; excerpt: string; path: string; }
export interface SiloPriceRow { label: string; value: string; }

export interface SiloPageContent {
  breadcrumb: Crumb[];
  seoTitle: string;
  seoDescription: string;
  category: string;
  h1: string;
  heroSubtitle: string;
  heroHighlights: string[];
  bodyIntro: string;
  benefitsTitle: string;
  benefits: { title: string; desc: string }[];
  coverageTitle: string;
  coverageIntro: string;
  coverageItems: { title: string; desc: string }[];
  priceTitle: string;
  priceIntro: string;
  priceTable?: SiloPriceRow[];
  showCalculator: boolean;
  bodySections: { h: string; p: string }[];
  claimProcessTitle: string;
  claimIntro: string;
  claimSteps: SiloClaimStep[];
  comparisonTitle?: string;
  comparisonIntro?: string;
  comparisonColA?: string;
  comparisonColB?: string;
  comparisonRows?: SiloComparisonRow[];
  faqTitle: string;
  faq: SiloFAQ[];
  internalLinksTitle: string;
  internalLinks: SiloInternalLink[];
  relatedArticlesTitle: string;
  relatedArticles: SiloRelatedArticle[];
  ctaTitle: string;
  ctaSubtitle: string;
  /** Extra JSON-LD merged alongside the auto-generated BreadcrumbList + FAQPage (e.g. Service). */
  extraJsonLd?: object[];
}

interface Props extends SitePageProps {
  content: SiloPageContent;
  activeNavId?: string;
}

const faqJsonLd = (faq: SiloFAQ[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
});

const SiloLandingTemplate: React.FC<Props> = ({ content: c, activeNavId, ...page }) => {
  const t = useT(page.lang);
  const th = useSiteTheme(page.darkMode);

  const jsonLd = [
    breadcrumbJsonLd(c.breadcrumb),
    faqJsonLd(c.faq),
    ...(c.extraJsonLd ?? []),
  ];

  return (
    <SiteLayout {...page} active={activeNavId}>
      <SEO title={c.seoTitle} description={c.seoDescription} path={c.breadcrumb[c.breadcrumb.length - 1].path} jsonLd={jsonLd} />

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-4">
        <Breadcrumb crumbs={c.breadcrumb} navigate={page.navigate} th={th} />
      </div>

      {/* ── Hero ── */}
      <section className="max-w-4xl mx-auto px-6 pt-8 pb-14 text-center">
        <Reveal>
          <SectionLabel darkMode={page.darkMode}>{c.category}</SectionLabel>
          <h1 className="font-black tracking-tight mb-5" style={{ fontSize: 'clamp(2rem,5vw,3.1rem)', color: th.textMain, lineHeight: 1.08 }}>
            {c.h1}
          </h1>
          <p className="text-base leading-relaxed max-w-2xl mx-auto mb-7" style={{ color: th.textMuted }}>
            {c.heroSubtitle}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-9">
            {c.heroHighlights.map(h => (
              <span key={h} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold"
                style={{ background: `${th.accent}14`, border: `1px solid ${th.accent}30`, color: th.accent }}>
                <ShieldCheck size={13} /> {h}
              </span>
            ))}
          </div>
          <button onClick={page.onSignIn}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-black text-white transition-all hover:scale-[1.03] active:scale-95"
            style={{ background: th.accent, boxShadow: `0 10px 30px -10px ${th.accent}` }}>
            {t('Cek Premi & Beli', 'Check Premium & Buy')} <ArrowRight size={16} />
          </button>
        </Reveal>
      </section>

      {/* ── Body intro (EEAT long-form) ── */}
      <section className="max-w-3xl mx-auto px-6 pb-14">
        <Reveal>
          <p className="text-base leading-relaxed" style={{ color: th.textMuted }}>{c.bodyIntro}</p>
        </Reveal>
      </section>

      {/* ── Benefits ── */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <Reveal>
          <h2 className="text-2xl font-black text-center mb-10 tracking-tight" style={{ color: th.textMain }}>{c.benefitsTitle}</h2>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {c.benefits.map((b, i) => (
            <Reveal key={b.title} delay={i * 60}>
              <div className="p-6 rounded-2xl h-full" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}`, boxShadow: th.cardShadow }}>
                <CheckCircle size={20} className="mb-3" style={{ color: th.accent }} />
                <h3 className="font-bold text-sm mb-2" style={{ color: th.textMain }}>{b.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: th.textMuted }}>{b.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Coverage ── */}
      <section className="px-6 pb-16" style={{ background: th.sectionBg3 }}>
        <div className="max-w-6xl mx-auto py-16">
          <Reveal>
            <h2 className="text-2xl font-black text-center mb-3 tracking-tight" style={{ color: th.textMain }}>{c.coverageTitle}</h2>
            <p className="text-sm text-center max-w-2xl mx-auto mb-10" style={{ color: th.textMuted }}>{c.coverageIntro}</p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {c.coverageItems.map((item, i) => (
              <Reveal key={item.title} delay={i * 60}>
                <div className="p-5 rounded-2xl" style={{ background: `${th.accent}08`, border: `1px solid ${th.accent}20` }}>
                  <h3 className="text-sm font-black mb-2" style={{ color: th.accent }}>{item.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: th.textMuted }}>{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Price ── */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <Reveal>
          <h2 className="text-2xl font-black text-center mb-3 tracking-tight" style={{ color: th.textMain }}>{c.priceTitle}</h2>
          <p className="text-sm text-center max-w-2xl mx-auto mb-8" style={{ color: th.textMuted }}>{c.priceIntro}</p>
        </Reveal>
        {c.priceTable && (
          <Reveal>
            <div className="rounded-2xl overflow-hidden mb-2" style={{ border: `1px solid ${th.cardBorder}` }}>
              {c.priceTable.map((row, i) => (
                <div key={row.label} className="flex items-center justify-between px-5 py-3.5 text-sm"
                  style={{ background: i % 2 === 0 ? th.cardBg : th.sectionBg1, color: th.textMain, borderTop: i > 0 ? `1px solid ${th.cardBorder}` : undefined }}>
                  <span style={{ color: th.textMuted }}>{row.label}</span>
                  <span className="font-bold">{row.value}</span>
                </div>
              ))}
            </div>
            <p className="text-[0.68rem]" style={{ color: th.textSubtle }}>
              {t('Tarif resmi OJK sesuai SEOJK No.06/SEOJK.05/2017. Premi final ditentukan perusahaan asuransi mitra.',
                 'Official OJK rates per SEOJK No.06/SEOJK.05/2017. Final premium set by the partner insurer.')}
            </p>
          </Reveal>
        )}
      </section>

      {/* ── Calculator ── */}
      {c.showCalculator && (
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <Reveal delay={80}>
            <PremiumCalcWidget lang={page.lang} darkMode={page.darkMode} onSignIn={page.onSignIn} onDetail={() => page.navigate('/kalkulator')} />
          </Reveal>
        </section>
      )}

      {/* ── Long-form guide sections ── */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        {c.bodySections.map((s, i) => (
          <Reveal key={s.h} delay={i * 40}>
            <div className="mb-8">
              <h2 className="text-lg font-black mb-2.5" style={{ color: th.textMain }}>{s.h}</h2>
              <p className="text-sm leading-relaxed" style={{ color: th.textMuted }}>{s.p}</p>
            </div>
          </Reveal>
        ))}
      </section>

      {/* ── Claim process ── */}
      <section className="px-6 py-16" style={{ background: th.sectionBg3 }}>
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-black text-center mb-3 tracking-tight" style={{ color: th.textMain }}>{c.claimProcessTitle}</h2>
            <p className="text-sm text-center max-w-2xl mx-auto mb-10" style={{ color: th.textMuted }}>{c.claimIntro}</p>
          </Reveal>
          <div className="space-y-3">
            {c.claimSteps.map((s, i) => (
              <Reveal key={s.title} delay={i * 50}>
                <div className="flex items-start gap-4 p-4 rounded-2xl" style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                  <span className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs"
                    style={{ background: `${th.accent}18`, color: th.accent }}>{i + 1}</span>
                  <div>
                    <h3 className="text-sm font-bold mb-1" style={{ color: th.textMain }}>{s.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: th.textMuted }}>{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      {c.comparisonRows && c.comparisonRows.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 py-16">
          <Reveal>
            <div className="flex items-center justify-center gap-2 mb-3">
              <ArrowLeftRight size={18} style={{ color: th.accent }} />
              <h2 className="text-2xl font-black tracking-tight" style={{ color: th.textMain }}>{c.comparisonTitle}</h2>
            </div>
            <p className="text-sm text-center max-w-2xl mx-auto mb-8" style={{ color: th.textMuted }}>{c.comparisonIntro}</p>
          </Reveal>
          <Reveal>
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${th.cardBorder}` }}>
              <div className="grid grid-cols-3 text-xs font-black uppercase tracking-wide px-4 py-3" style={{ background: th.sectionBg4, color: th.textMuted }}>
                <span></span>
                <span style={{ color: th.accent }}>{c.comparisonColA}</span>
                <span>{c.comparisonColB}</span>
              </div>
              {c.comparisonRows.map((row, i) => (
                <div key={row.label} className="grid grid-cols-3 px-4 py-3.5 text-xs"
                  style={{ background: i % 2 === 0 ? th.cardBg : th.sectionBg1, borderTop: `1px solid ${th.cardBorder}`, color: th.textMain }}>
                  <span className="font-semibold" style={{ color: th.textMuted }}>{row.label}</span>
                  <span>{row.a}</span>
                  <span>{row.b}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ── FAQ ── */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <Reveal>
          <div className="flex items-center justify-center gap-2 mb-10">
            <HelpCircle size={18} style={{ color: th.accent }} />
            <h2 className="text-2xl font-black tracking-tight" style={{ color: th.textMain }}>{c.faqTitle}</h2>
          </div>
        </Reveal>
        <div className="space-y-2">
          {c.faq.map((f, i) => (
            <Reveal key={f.q} delay={i * 40}>
              <details className="spx-faq group" style={{ borderBottom: `1px solid ${th.cardBorder}` }}>
                <summary className="flex items-center justify-between py-4 cursor-pointer text-sm font-bold list-none" style={{ color: th.textMain }}>
                  {f.q}
                  <span className="ml-3 flex-shrink-0 transition-transform group-open:rotate-45" style={{ color: th.accent }}>+</span>
                </summary>
                <p className="text-xs leading-relaxed pb-4" style={{ color: th.textMuted }}>{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Internal links + Related articles ── */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest mb-5" style={{ color: th.textMuted }}>{c.internalLinksTitle}</h2>
          <div className="flex flex-col gap-2">
            {c.internalLinks.map(l => (
              <button key={l.path} onClick={() => page.navigate(l.path)}
                className="flex items-center justify-between text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}`, color: th.textMain }}>
                {l.label} <ArrowRight size={14} style={{ color: th.accent }} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest mb-5" style={{ color: th.textMuted }}>{c.relatedArticlesTitle}</h2>
          <div className="flex flex-col gap-2">
            {c.relatedArticles.map(a => (
              <button key={a.path} onClick={() => page.navigate(a.path)}
                className="text-left px-4 py-3 rounded-xl transition-all hover:opacity-80"
                style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}` }}>
                <p className="text-sm font-bold mb-0.5" style={{ color: th.textMain }}>{a.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: th.textMuted }}>{a.excerpt}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <Reveal>
          <div className="text-center py-14 px-8 rounded-3xl" style={{ background: `${th.accent}0c`, border: `1px solid ${th.accent}22` }}>
            <ShieldCheck size={36} className="mx-auto mb-4" style={{ color: th.accent }} />
            <h2 className="text-2xl font-black mb-3 tracking-tight" style={{ color: th.textMain }}>{c.ctaTitle}</h2>
            <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: th.textMuted }}>{c.ctaSubtitle}</p>
            <button onClick={page.onSignIn}
              className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-sm font-black text-white transition-all hover:scale-[1.03] active:scale-95"
              style={{ background: th.accent, boxShadow: `0 10px 30px -10px ${th.accent}` }}>
              {t('Mulai Sekarang', 'Get Started')} <ArrowRight size={16} />
            </button>
          </div>
        </Reveal>
      </section>
    </SiteLayout>
  );
};

export default SiloLandingTemplate;
