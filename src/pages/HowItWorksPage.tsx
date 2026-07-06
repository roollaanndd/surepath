import React from 'react';
import { ArrowRight, MessageSquare, Search, Shield, HeartHandshake, BarChart2, Leaf } from 'lucide-react';
import SiteLayout from './site/SiteLayout';
import { SitePageProps, useT, useSiteTheme, Reveal, PromoBanners, useSiteChrome, SectionLabel, useWebsiteConfig } from './site/siteKit';

const HowItWorksPage: React.FC<SitePageProps> = (props) => {
  const { onSignIn, lang } = props;
  const t = useT(lang);
  const th = useSiteTheme(props.darkMode);
  const { cardBg, cardBorder, cardShadow, textMuted, textMain, videoBg2, videoBg3, accent } = th;
  const { onInstall } = useSiteChrome();

  const config = useWebsiteConfig('how_it_works');

  const STEPS = [
    { n: '01', icon: MessageSquare, color: accent,    title: config?.headline || t('Ceritakan Kebutuhanmu', 'Share Your Needs'), desc: t('Ceritain kebutuhan perlindunganmu ke agen kami yang berpengalaman, atau langsung lewat platform digital kami yang simpel.', 'Consult your protection needs with our experienced agents or through our easy-to-use digital platform.') },
    { n: '02', icon: Search,        color: '#2563eb', title: t('Temukan yang Tepat', 'Find the Right Fit'),        desc: t('Kami membandingkan puluhan opsi dari berbagai insurer dan mempresentasikan pilihan yang paling sesuai profil risikomu.', 'We compare dozens of options from various insurers and present the choices most suited to your risk profile.') },
    { n: '03', icon: Shield,        color: '#7c3aed', title: t('Terlindungi dengan Tenang', 'Protected with Ease'), desc: t('Polis aktif dan sepenuhnya dikelola secara digital. Kami tetap hadir mendampingi sepanjang perjalanan perlindunganmu.', 'Policy active and fully managed digitally. We remain present throughout your protection journey.') },
  ];

  const PILLARS = [
    { n: '01', Icon: HeartHandshake, accent: accent,    title: t('Berpusat pada Manusia', 'Human-Centered'),   desc: t('Keputusan penting butuh pendampingan manusia nyata. Bukan robot — mitra yang beneran dengerin dan peduli.', 'Important decisions need real human accompaniment. Not robots — partners who genuinely listen and care.'),    items: [t('Mitra bersertifikat & berpengalaman', 'Certified & experienced partners'), t('Konsultasi tanpa target penjualan', 'Consultation without sales pressure'), t('Pendampingan jangka panjang', 'Long-term accompaniment')] },
    { n: '02', Icon: BarChart2,       accent: '#2563eb', title: t('Transparan & Jujur', 'Transparent & Honest'), desc: t('Tiap produk yang kita rekomendasiin dijelasin tuntas — termasuk kekurangannya. Edukasi lebih berharga dari promosi.', 'Every product we recommend is fully explained — including its limitations. Education over promotion.'),       items: [t('Penjelasan klausa penting', 'Important clause explanations'), t('Tidak ada biaya tersembunyi', 'No hidden fees'), t('Laporan berkala yang jelas', 'Clear periodic reports')] },
    { n: '03', Icon: Leaf,            accent: '#7c3aed', title: t('Mitra Jangka Panjang', 'Long-Term Partner'),  desc: t('Hubungan kita nggak berakhir pas polis terbit. Kita tumbuh bareng dan pastiin perlindunganmu selalu relevan.', "Our relationship doesn't end when the policy is issued. We grow with you and ensure your protection stays relevant."), items: [t('Review polis berkala', 'Periodic policy review'), t('Notifikasi sebelum jatuh tempo', 'Pre-expiry notifications'), t('Adaptasi sesuai perubahan hidup', 'Adapts to life changes')] },
  ];

  return (
    <SiteLayout {...props} active="how-it-works" bgVideo="/bg2.mp4">

      {/* ─── Header ─── */}
      <section className="pt-36 pb-20 px-5 text-center" style={{ background: videoBg2 }}>
        <Reveal>
          <SectionLabel darkMode={props.darkMode}>{t('Cara Kerja', 'How It Works')}</SectionLabel>
          <h1 className="font-bold leading-tight tracking-tight mb-4" style={{ fontSize: 'clamp(2rem,5vw,3.25rem)', color: textMain }}>
            {config?.headline ? config.headline : <>{t('Tiga langkah menuju ', 'Three steps to ')}<span style={{ color: accent }}>{t('ketenangan pikiran', 'peace of mind')}</span></>}
          </h1>
          <p className="text-base max-w-xl mx-auto leading-relaxed" style={{ color: textMuted }}>
            {config?.subtitle || t("Proses yang sederhana, transparan, dan berpihak ke kamu dari awal sampai akhir.", "A simple, transparent process that's on your side from start to finish.")}
          </p>
        </Reveal>
      </section>

      {/* ─── Steps ─── */}
      <section className="pb-28 px-5" style={{ background: videoBg2, borderTop: `1px solid ${cardBorder}` }}>
        <div className="max-w-5xl mx-auto pt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-[22%] right-[22%] h-px"
              style={{ background: `linear-gradient(to right, transparent, ${accent}40, ${accent}40, transparent)` }} />
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.n} delay={i * 120}>
                  <div className="group relative flex flex-col items-center text-center pt-8">
                    {/* Giant ordinal watermark */}
                    <div className="transition-opacity duration-300 group-hover:opacity-[0.12]" style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', fontSize: '7rem', fontWeight: 900, lineHeight: 1, color: step.color, opacity: 0.07, pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap' }}>
                      {step.n}
                    </div>
                    {/* Solid circle icon */}
                    <div className="relative mb-7 z-10">
                      {/* Pulsing halo */}
                      <div className="absolute inset-0 rounded-full transition-transform duration-500 group-hover:scale-150" style={{ background: step.color, opacity: 0.18, filter: 'blur(10px)' }} />
                      <div className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                        style={{ background: step.color }}>
                        <Icon size={26} color="#fff" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold mb-2.5" style={{ color: textMain }}>{step.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{step.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Pillars / Values ─── */}
      <section className="py-24 px-5" style={{ background: videoBg3, borderTop: `1px solid ${cardBorder}` }}>
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <SectionLabel darkMode={props.darkMode}>{t('Nilai Kami', 'Our Values')}</SectionLabel>
              <h2 className="font-bold leading-tight tracking-tight" style={{ fontSize: 'clamp(1.75rem,4vw,3rem)', color: textMain }}>
                {t('Cara kami ', 'The way we ')}<span style={{ color: accent }}>{t('bekerja berbeda', 'work differently')}</span>
              </h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 100}>
                <div className="spx-card spx-sheen p-8 rounded-2xl h-full flex flex-col"
                  style={{ background: cardBg, borderLeft: `4px solid ${p.accent}`, boxShadow: cardShadow, ['--spx-accent' as string]: p.accent }}>
                  {/* Faded ordinal watermark */}
                  <div style={{ position: 'absolute', top: -8, right: 16, fontSize: '5rem', fontWeight: 900, lineHeight: 1, color: p.accent, opacity: 0.06, pointerEvents: 'none', userSelect: 'none' }}>
                    {p.n}
                  </div>
                  <div className="w-11 h-11 rounded-full flex items-center justify-center mb-5 flex-shrink-0"
                    style={{ background: p.accent }}>
                    <p.Icon size={20} color="#fff" />
                  </div>
                  <h3 className="text-lg font-bold mb-3" style={{ color: textMain }}>{p.title}</h3>
                  <p className="text-sm leading-relaxed mb-5 flex-1" style={{ color: textMuted }}>{p.desc}</p>
                  <ul className="space-y-2">
                    {p.items.map(item => (
                      <li key={item} className="flex items-center gap-2.5 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.accent }} />
                        <span style={{ color: textMuted }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Offers / Promo ─── */}
      <section className="py-24 px-5" style={{ background: videoBg2, borderTop: `1px solid ${cardBorder}` }}>
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <SectionLabel darkMode={props.darkMode}>{t('Penawaran & Promosi', 'Offers & Promotions')}</SectionLabel>
              <h2 className="font-bold leading-tight tracking-tight" style={{ fontSize: 'clamp(1.75rem,4vw,3rem)', color: textMain }}>
                {t('Program eksklusif ', 'Exclusive programs ')}<span style={{ color: accent }}>{t('untuk nasabah kami', 'for our clients')}</span>
              </h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Reveal delay={0}><PromoBanners onSignIn={onSignIn} onInstall={onInstall} /></Reveal>
            <Reveal delay={100}>
              <div className="spx-card spx-grid spx-sheen rounded-2xl h-full flex flex-col overflow-hidden" style={{ minHeight: 300, background: accent, ['--spx-accent' as string]: accent }}>
                <div className="spx-grid-tex" style={{ ['--spx-accent' as string]: '#ffffff' }} />
                <div className="p-8 flex flex-col flex-1 justify-center">
                  <p style={{ fontSize: '0.55rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.3em', marginBottom: 14 }}>
                    {t('MULAI SEKARANG', 'START NOW')}
                  </p>
                  <h3 className="text-2xl font-bold leading-tight mb-4" style={{ color: '#ffffff' }}>
                    {t('Pertama kali', 'First time')}{' '}
                    <span style={{ color: 'rgba(255,255,255,0.75)' }}>{t('bersama SurePath?', 'with SurePath?')}</span>
                  </h3>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {t('Mulai dengan konsultasi gratis 30 menit bareng agen kami. Santai aja — nggak ada tekanan, nggak ada komitmen.', 'Start with a free 30-minute consultation. No commitment, no pressure.')}
                  </p>
                  <ul className="space-y-2 mb-7">
                    {[t('Analisis kebutuhan perlindunganmu', 'Analyze your protection needs'), t('Perbandingan produk yang relevan', 'Relevant product comparison'), t('Estimasi biaya yang transparan', 'Transparent cost estimate')].map(item => (
                      <li key={item} className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.6)' }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <button onClick={onSignIn}
                    className="self-start flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.03]"
                    style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff', backdropFilter: 'blur(8px)' }}>
                    {t('Jadwalkan Konsultasi', 'Schedule Consultation')} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

    </SiteLayout>
  );
};

export default HowItWorksPage;
