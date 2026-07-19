import React from 'react';
import { ArrowRight, ShieldAlert, Scale } from 'lucide-react';
import SiloLandingTemplate from '../site/SiloLandingTemplate';
import SiteLayout from '../site/SiteLayout';
import { SEO } from '../site/SEO';
import { Breadcrumb, breadcrumbJsonLd } from '../site/Breadcrumb';
import { SitePageProps, useSiteTheme, Reveal, SectionLabel } from '../site/siteKit';
import { panduanKecelakaanMobil, panduanKlaimDitolak, panduanHpHilang, panduanRawatInapMendadak } from './panduanKlaimContent';
import { seojkTarifPremi } from './regulasiContent';

export type GuidePage = 'panduan-kecelakaan-mobil' | 'panduan-klaim-ditolak' | 'panduan-hp-hilang' | 'panduan-rawat-inap-mendadak' | 'regulasi-seojk-6-2017';

const CONTENT = {
  'panduan-kecelakaan-mobil': panduanKecelakaanMobil,
  'panduan-klaim-ditolak': panduanKlaimDitolak,
  'panduan-hp-hilang': panduanHpHilang,
  'panduan-rawat-inap-mendadak': panduanRawatInapMendadak,
  'regulasi-seojk-6-2017': seojkTarifPremi,
} as const;

interface Props extends SitePageProps {
  page: GuidePage;
}

export const GuidesPage: React.FC<Props> = ({ page, ...rest }) => (
  <SiloLandingTemplate content={CONTENT[page]} {...rest} />
);

// ─── Lightweight index pages — the "Panduan Klaim" and "Regulasi" horizontal
// silos referenced in each guide's breadcrumb (docs/SEO_ARCHITECTURE.md §1) ──

const PANDUAN_KLAIM_ITEMS = [
  { title: 'Baru Saja Kecelakaan Mobil?', excerpt: 'Urutan langkah darurat — keselamatan, dokumentasi, lapor polisi, klaim.', path: '/panduan-klaim/kecelakaan-mobil' },
  { title: 'HP Hilang atau Dicuri?', excerpt: 'Amankan akun dulu, blokir IMEI, baru lapor polisi dan klaim.', path: '/panduan-klaim/hp-hilang-dicuri' },
  { title: 'Rawat Inap Mendadak?', excerpt: 'Cara aktifkan cashless di IGD dan kapan harus reimbursement.', path: '/panduan-klaim/rawat-inap-mendadak' },
  { title: 'Kenapa Klaim Asuransi Ditolak?', excerpt: 'Penyebab penolakan per kategori produk dan cara mengajukan banding.', path: '/panduan-klaim/klaim-ditolak' },
];

const REGULASI_ITEMS = [
  { title: 'SEOJK No.06/SEOJK.05/2017', excerpt: 'Regulasi OJK yang mengatur batas tarif premi asuransi kendaraan bermotor.', path: '/regulasi/seojk-6-2017-tarif-premi' },
];

const IndexList: React.FC<SitePageProps & { title: string; subtitle: string; crumbName: string; crumbPath: string; Icon: React.FC<{ size?: number }>; items: typeof PANDUAN_KLAIM_ITEMS; seoTitle: string; seoDescription: string }> = (props) => {
  const { title, subtitle, crumbName, crumbPath, Icon, items, seoTitle, seoDescription, ...page } = props;
  const th = useSiteTheme(page.darkMode);
  const crumbs = [{ name: 'Beranda', path: '/' }, { name: crumbName, path: crumbPath }];

  return (
    <SiteLayout {...page}>
      <SEO title={seoTitle} description={seoDescription} path={crumbPath} jsonLd={breadcrumbJsonLd(crumbs)} />
      <section className="max-w-4xl mx-auto px-6 pt-28 pb-6">
        <Breadcrumb crumbs={crumbs} navigate={page.navigate} th={th} />
      </section>
      <section className="max-w-4xl mx-auto px-6 pb-10 text-center">
        <Reveal>
          <SectionLabel darkMode={page.darkMode}>{crumbName}</SectionLabel>
          <h1 className="font-black tracking-tight mb-5" style={{ fontSize: 'clamp(2rem,5vw,3rem)', color: th.textMain }}>{title}</h1>
          <p className="text-base leading-relaxed max-w-2xl mx-auto" style={{ color: th.textMuted }}>{subtitle}</p>
        </Reveal>
      </section>
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <div className="flex flex-col gap-3">
          {items.map((item, i) => (
            <Reveal key={item.path} delay={i * 40}>
              <button onClick={() => page.navigate(item.path)}
                className="flex items-center justify-between w-full text-left p-5 rounded-2xl transition-all hover:opacity-85"
                style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}`, boxShadow: th.cardShadow }}>
                <div className="flex items-start gap-3">
                  <Icon size={18} />
                  <div>
                    <h2 className="text-sm font-black mb-1" style={{ color: th.textMain }}>{item.title}</h2>
                    <p className="text-xs leading-relaxed" style={{ color: th.textMuted }}>{item.excerpt}</p>
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

export const PanduanKlaimIndex: React.FC<SitePageProps> = (page) => (
  <IndexList {...page}
    title="Panduan Klaim"
    subtitle="Panduan darurat dan pemecahan masalah untuk situasi klaim asuransi — ditulis untuk dibaca saat kamu benar-benar membutuhkannya."
    crumbName="Panduan Klaim" crumbPath="/panduan-klaim"
    Icon={({ size }) => <ShieldAlert size={size} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />}
    items={PANDUAN_KLAIM_ITEMS}
    seoTitle="Panduan Klaim Asuransi — Darurat & Pemecahan Masalah | SurePath"
    seoDescription="Kumpulan panduan klaim asuransi: apa yang harus dilakukan setelah kecelakaan, dan kenapa klaim bisa ditolak beserta cara mengajukan banding."
  />
);

export const RegulasiIndex: React.FC<SitePageProps> = (page) => (
  <IndexList {...page}
    title="Regulasi & OJK"
    subtitle="Dasar hukum dan regulasi resmi yang membentuk setiap angka tarif dan ketentuan yang kamu lihat di SurePath."
    crumbName="Regulasi" crumbPath="/regulasi"
    Icon={({ size }) => <Scale size={size} style={{ color: '#3b82f6', flexShrink: 0, marginTop: 2 }} />}
    items={REGULASI_ITEMS}
    seoTitle="Regulasi & OJK — Dasar Hukum Tarif Asuransi | SurePath"
    seoDescription="Penjelasan regulasi OJK yang mendasari tarif dan ketentuan produk asuransi yang dipasarkan di SurePath."
  />
);

export default GuidesPage;
