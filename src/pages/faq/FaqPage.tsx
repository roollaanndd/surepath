import React, { useMemo, useState } from 'react';
import { HelpCircle, Search } from 'lucide-react';
import SiteLayout from '../site/SiteLayout';
import { SEO } from '../site/SEO';
import { Breadcrumb, breadcrumbJsonLd } from '../site/Breadcrumb';
import { SitePageProps, useT, useSiteTheme, Reveal, SectionLabel } from '../site/siteKit';
import { SiloPageContent } from '../site/SiloLandingTemplate';
import { mobilHub, mobilAllRisk, mobilTlo, mobilKlaim, mobilPremi } from '../silo/mobilContent';
import { kesehatanHub, kecelakaanDiriHub, perjalananHub, perjalananInternasional } from '../silo/otherVerticalsContent';
import { proteksiBarangHub } from '../silo/proteksiBarangContent';
import { allRiskVsTlo } from '../comparison/allRiskVsTloContent';
import { kesehatanVsBpjs, paVsAsuransiJiwa } from '../comparison/moreComparisonsContent';

// Consolidated FAQ directory (docs/SEO_ARCHITECTURE.md Phase 3) — pulls the
// existing `faq` array already visible on each silo/comparison page rather
// than retyping content, so this page is a genuine aggregation of content
// that already exists elsewhere on the site, not a thin duplicate built
// solely to host FAQPage schema.

const indexCrumb = { name: 'FAQ', path: '/faq' };
const rootCrumbs = [{ name: 'Beranda', path: '/' }, indexCrumb];

interface FaqGroup { sourceTitle: string; sourcePath: string; faq: SiloPageContent['faq']; }

const SOURCES: FaqGroup[] = [
  { sourceTitle: 'Asuransi Mobil', sourcePath: mobilHub.breadcrumb.at(-1)!.path, faq: mobilHub.faq },
  { sourceTitle: 'Asuransi Mobil All Risk', sourcePath: mobilAllRisk.breadcrumb.at(-1)!.path, faq: mobilAllRisk.faq },
  { sourceTitle: 'Asuransi Mobil TLO', sourcePath: mobilTlo.breadcrumb.at(-1)!.path, faq: mobilTlo.faq },
  { sourceTitle: 'Klaim Asuransi Mobil', sourcePath: mobilKlaim.breadcrumb.at(-1)!.path, faq: mobilKlaim.faq },
  { sourceTitle: 'Premi Asuransi Mobil', sourcePath: mobilPremi.breadcrumb.at(-1)!.path, faq: mobilPremi.faq },
  { sourceTitle: 'Asuransi Kesehatan', sourcePath: kesehatanHub.breadcrumb.at(-1)!.path, faq: kesehatanHub.faq },
  { sourceTitle: 'Asuransi Kecelakaan Diri', sourcePath: kecelakaanDiriHub.breadcrumb.at(-1)!.path, faq: kecelakaanDiriHub.faq },
  { sourceTitle: 'Asuransi Perjalanan', sourcePath: perjalananHub.breadcrumb.at(-1)!.path, faq: perjalananHub.faq },
  { sourceTitle: 'Asuransi Perjalanan Internasional', sourcePath: perjalananInternasional.breadcrumb.at(-1)!.path, faq: perjalananInternasional.faq },
  { sourceTitle: 'Proteksi Barang', sourcePath: proteksiBarangHub.breadcrumb.at(-1)!.path, faq: proteksiBarangHub.faq },
  { sourceTitle: 'All Risk vs TLO', sourcePath: allRiskVsTlo.breadcrumb.at(-1)!.path, faq: allRiskVsTlo.faq },
  { sourceTitle: 'Asuransi Kesehatan vs BPJS', sourcePath: kesehatanVsBpjs.breadcrumb.at(-1)!.path, faq: kesehatanVsBpjs.faq },
  { sourceTitle: 'Personal Accident vs Asuransi Jiwa', sourcePath: paVsAsuransiJiwa.breadcrumb.at(-1)!.path, faq: paVsAsuransiJiwa.faq },
];

const FaqPage: React.FC<SitePageProps> = (page) => {
  const t = useT(page.lang);
  const th = useSiteTheme(page.darkMode);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SOURCES;
    return SOURCES
      .map(s => ({ ...s, faq: s.faq.filter(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)) }))
      .filter(s => s.faq.length > 0);
  }, [query]);

  const totalCount = SOURCES.reduce((n, s) => n + s.faq.length, 0);

  const faqPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: SOURCES.flatMap(s => s.faq).map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  const jsonLd = [breadcrumbJsonLd(rootCrumbs), faqPageJsonLd];

  return (
    <SiteLayout {...page} active="faq">
      <SEO
        title={`FAQ — ${totalCount}+ Pertanyaan Seputar Asuransi Dijawab | SurePath`}
        description="Kumpulan pertanyaan yang sering ditanyakan seputar asuransi mobil, kesehatan, kecelakaan diri, perjalanan, dan proteksi barang di SurePath — dijawab langsung, tanpa jargon."
        path="/faq"
        jsonLd={jsonLd}
      />
      <section className="max-w-4xl mx-auto px-6 pt-28 pb-6">
        <Breadcrumb crumbs={rootCrumbs} navigate={page.navigate} th={th} />
      </section>
      <section className="max-w-4xl mx-auto px-6 pb-10 text-center">
        <Reveal>
          <SectionLabel darkMode={page.darkMode}>FAQ</SectionLabel>
          <h1 className="font-black tracking-tight mb-5" style={{ fontSize: 'clamp(2rem,5vw,3rem)', color: th.textMain }}>
            {t('Pertanyaan yang Sering Diajukan', 'Frequently Asked Questions')}
          </h1>
          <p className="text-base leading-relaxed max-w-2xl mx-auto mb-8" style={{ color: th.textMuted }}>
            {t(`${totalCount}+ pertanyaan seputar semua produk asuransi SurePath, dijawab langsung di sini.`, `${totalCount}+ questions about every SurePath insurance product, answered directly.`)}
          </p>
          <div className="relative max-w-md mx-auto">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: th.textSubtle }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('Cari pertanyaan…', 'Search questions…')}
              className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm outline-none"
              style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}`, color: th.textMain }}
            />
          </div>
        </Reveal>
      </section>
      <section className="max-w-3xl mx-auto px-6 pb-24">
        {filtered.length === 0 && (
          <p className="text-center text-sm py-12" style={{ color: th.textMuted }}>
            {t('Tidak ada pertanyaan yang cocok. Coba kata kunci lain.', 'No matching questions. Try another keyword.')}
          </p>
        )}
        {filtered.map((group, gi) => (
          <Reveal key={group.sourcePath} delay={gi * 30}>
            <div className="mb-10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: th.accent }}>
                  <HelpCircle size={14} /> {group.sourceTitle}
                </h2>
                <button onClick={() => page.navigate(group.sourcePath)} className="text-xs font-bold transition-colors hover:underline" style={{ color: th.textMuted }}>
                  {t('Lihat halaman →', 'View page →')}
                </button>
              </div>
              <div>
                {group.faq.map(f => (
                  <details key={f.q} className="spx-faq group" style={{ borderBottom: `1px solid ${th.cardBorder}` }}>
                    <summary className="flex items-center justify-between py-3.5 cursor-pointer text-sm font-bold list-none" style={{ color: th.textMain }}>
                      {f.q}
                      <span className="ml-3 flex-shrink-0 transition-transform group-open:rotate-45" style={{ color: th.accent }}>+</span>
                    </summary>
                    <p className="text-xs leading-relaxed pb-3.5" style={{ color: th.textMuted }}>{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </section>
    </SiteLayout>
  );
};

export default FaqPage;
