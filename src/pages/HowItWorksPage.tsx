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
    { n: '02', icon: Search,        color: '#2563eb',  title: t('Temukan yang Tepat', 'Find the Right Fit'),        desc: t('Kami membandingkan puluhan opsi dari berbagai insurer dan mempresentasikan pilihan yang paling sesuai profil risikomu.', 'We compare dozens of options from various insurers and present the choices most suited to your risk profile.') },
    { n: '03', icon: Shield,        color: '#7c3aed',  title: t('Terlindungi dengan Tenang', 'Protected with Ease'), desc: t('Polis aktif dan sepenuhnya dikelola secara digital. Kami tetap hadir mendampingi sepanjang perjalanan perlindunganmu.', 'Policy active and fully managed digitally. We remain present throughout your protection journey.') },
  ];

  const PILLARS = [
    { n: '01', Icon: HeartHandshake, accent: accent,    title: t('Berpusat pada Manusia', 'Human-Centered'),      desc: t('Keputusan penting butuh pendampingan manusia nyata. Bukan robot — agen yang beneran dengerin dan peduli.', 'Important decisions need real human accompaniment. Not robots — agents who genuinely listen and care.'),    items: [t('Agen bersertifikat & berpengalaman', 'Certified & experienced agents'), t('Konsultasi tanpa target penjualan', 'Consultation without sales pressure'), t('Pendampingan jangka panjang', 'Long-term accompaniment')] },
    { n: '02', Icon: BarChart2,       accent: '#2563eb', title: t('Transparan & Jujur', 'Transparent & Honest'),    desc: t('Tiap produk yang kita rekomendasiin dijelasin tuntas — termasuk kekurangannya. Edukasi lebih berharga dari promosi.', 'Every product we recommend is fully explained — including its limitations. Education over promotion.'),       items: [t('Penjelasan klausa penting', 'Important clause explanations'), t('Tidak ada biaya tersembunyi', 'No hidden fees'), t('Laporan berkala yang jelas', 'Clear periodic reports')] },
    { n: '03', Icon: Leaf,            accent: '#7c3aed', title: t('Mitra Jangka Panjang', 'Long-Term Partner'),      desc: t('Hubungan kita nggak berakhir pas polis terbit. Kita tumbuh bareng dan pastiin perlindunganmu selalu relevan.', 'Our relationship doesn\'t end when the policy is issued. We grow with you and ensure your protection stays relevant.'), items: [t('Review polis berkala', 'Periodic policy review'), t('Notifikasi sebelum jatuh tempo', 'Pre-expiry notifications'), t('Adaptasi sesuai perubahan hidup', 'Adapts to life changes')] },
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
            {config?.subtitle || t('Proses yang sederhana, transparan, dan berpihak ke kamu dari awal sampai akhir.', 'A simple, transparent process that\'s on your side from start to finish.')}
          </p>
        </Reveal>
      </section>

      {/* ─── Steps ─── */}
      <section className="pb-24 px-5" style={{ background: videoBg2, borderTop: `1px solid ${cardBorder}` }}>
        <div className="max-w-5xl mx-auto pt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            <div className="hidden md:block absolute top-12 left-[22%] right-[22%] h-px"
              style={{ background: `linear-gradient(to right, transparent, ${accent}40, ${accent}40, transparent)` }} />
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.n} delay={i * 120}>
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-7">
                      <div className="w-24 h-24 rounded-2xl flex items-center justify-center"
                        style={{ background: `${step.color}0e`, border: `1px solid ${step.color}22` }}>
                        <Icon size={32} style={{ color: step.color }} />
                      </div>
                      <span className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-lg flex items-center justify-center text-[0.6rem] font-black text-white"
                        style={{ background: step.color }}>{step.n}</span>
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
                <div className="p-8 rounded-2xl h-full flex flex-col"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: `${p.accent}0e`, border: `1px solid ${p.accent}20` }}>
                    <p.Icon size={22} style={{ color: p.accent }} />
                  </div>
                  <h3 className="text-lg font-bold mb-3" style={{ color: textMain }}>{p.title}</h3>
                  <p className="text-sm leading-relaxed mb-5 flex-1" style={{ color: textMuted }}>{p.desc}</p>
                  <ul className="space-y-2">
                    {p.items.map(item => (
                      <li key={item} className="flex items-center gap-2.5 text-sm">
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
                          <circle cx="7.5" cy="7.5" r="6.5" fill={`${p.accent}15`} stroke={p.accent} strokeWidth="1"/>
                          <path d="M4.5 7.5 L6.5 9.5 L10.5 5.5" stroke={p.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
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
              <div className="rounded-2xl p-8 h-full flex flex-col" style={{ background: videoBg3, border: `1px solid ${cardBorder}`, minHeight: 300 }}>
                <SectionLabel darkMode={props.darkMode}>{t('Mulai Sekarang', 'Start Now')}</SectionLabel>
                <h3 className="text-2xl font-bold leading-tight mb-4" style={{ color: textMain }}>
                  {t('Pertama kali', 'First time')}{' '}
                  <span style={{ color: accent }}>{t('bersama SurePath?', 'with SurePath?')}</span>
                </h3>
                <p className="text-sm leading-relaxed mb-6 flex-1" style={{ color: textMuted }}>
                  {t('Mulai dengan konsultasi gratis 30 menit bareng agen kami. Santai aja — nggak ada tekanan, nggak ada komitmen.', 'Start with a free 30-minute consultation. No commitment, no pressure.')}
                </p>
                <ul className="space-y-2 mb-7">
                  {[t('Analisis kebutuhan perlindunganmu', 'Analyze your protection needs'), t('Perbandingan produk yang relevan', 'Relevant product comparison'), t('Estimasi biaya yang transparan', 'Transparent cost estimate')].map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm" style={{ color: textMuted }}>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <button onClick={onSignIn}
                  className="self-start flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.03]"
                  style={{ background: accent }}>
                  {t('Jadwalkan Konsultasi', 'Schedule Consultation')} <ArrowRight size={14} />
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

    </SiteLayout>
  );
};

export default HowItWorksPage;
