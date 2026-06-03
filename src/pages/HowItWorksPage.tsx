import React from 'react';
import { ArrowRight, MessageSquare, Search, Shield, HeartHandshake, BarChart2, Leaf } from 'lucide-react';
import SiteLayout from './site/SiteLayout';
import { SitePageProps, useT, useSiteTheme, Reveal, PromoBanners, useSiteChrome } from './site/siteKit';

const HowItWorksPage: React.FC<SitePageProps> = (props) => {
  const { onSignIn, lang } = props;
  const t = useT(lang);
  const th = useSiteTheme(props.darkMode);
  const { cardBg, cardBorder, cardShadow, textMuted, textMain, sectionBg2, sectionBg4, lpGreen } = th;
  const { onInstall } = useSiteChrome();

  const STEPS = [
    { n: '01', icon: MessageSquare, color: '#22c55e', title: t('Ceritakan Kebutuhanmu', 'Share Your Needs'), desc: t('Ceritain kebutuhan perlindunganmu ke agen kami yang berpengalaman, atau langsung lewat platform digital kami yang simpel.', 'Consult your protection needs with our experienced agents or through our easy-to-use digital platform.') },
    { n: '02', icon: Search, color: '#3b82f6', title: t('Temukan yang Tepat', 'Find the Right Fit'), desc: t('Kami membandingkan puluhan opsi dari berbagai insurer dan mempresentasikan pilihan yang paling sesuai profil risikomu.', 'We compare dozens of options from various insurers and present the choices most suited to your risk profile.') },
    { n: '03', icon: Shield, color: '#a855f7', title: t('Terlindungi dengan Tenang', 'Protected with Ease'), desc: t('Polis aktif dan sepenuhnya dikelola secara digital. Kami tetap hadir mendampingi sepanjang perjalanan perlindunganmu.', 'Policy active and fully managed digitally. We remain present throughout your protection journey.') },
  ];

  const PILLARS = [
    { n: '01', Icon: HeartHandshake, accent: '#22c55e', title: t('Berpusat pada Manusia', 'Human-Centered'), desc: t('Keputusan penting dalam hidup butuh pendampingan manusia yang nyata. Bukan robot, bukan skrip — tapi agen yang beneran dengerin dan peduli sama kamu.', 'Amid automation trends, we believe important life decisions need real human accompaniment. Not robots, not scripts — agents who truly care.'), items: [t('Agen bersertifikat & berpengalaman', 'Certified & experienced agents'), t('Konsultasi tanpa target penjualan', 'Consultation without sales pressure'), t('Pendampingan jangka panjang', 'Long-term accompaniment')] },
    { n: '02', Icon: BarChart2, accent: '#3b82f6', title: t('Transparan & Jujur', 'Transparent & Honest'), desc: t('Kita percaya edukasi lebih berharga dari promosi. Tiap produk yang kita rekomendasiin dijelasin tuntas — termasuk kekurangannya.', 'We believe education is more valuable than promotion. Every product we recommend is clearly explained including its limitations.'), items: [t('Penjelasan klausa penting', 'Important clause explanations'), t('Tidak ada biaya tersembunyi', 'No hidden fees'), t('Laporan berkala yang jelas', 'Clear periodic reports')] },
    { n: '03', Icon: Leaf, accent: '#a855f7', title: t('Mitra Jangka Panjang', 'Long-Term Partner'), desc: t('Hubungan kita nggak berakhir pas polis terbit. Kita tumbuh bareng dan pastiin perlindunganmu selalu relevan seiring perjalanan hidupmu.', 'Our relationship does not end when the policy is issued. We grow with clients and ensure protection always stays relevant to your life journey.'), items: [t('Review polis berkala', 'Periodic policy review'), t('Notifikasi sebelum jatuh tempo', 'Pre-expiry notifications'), t('Adaptasi sesuai perubahan hidup', 'Adapts to life changes')] },
  ];

  return (
    <SiteLayout {...props} active="how-it-works">
      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section className="pt-40 pb-28 max-w-7xl mx-auto px-5">
        <Reveal>
          <div className="text-center mb-20">
            <span className="inline-block text-[0.6rem] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full mb-5"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}>
              {t('Cara Kerja', 'How It Works')}
            </span>
            <h1 className="font-black leading-tight tracking-[-0.03em]" style={{ fontSize: 'clamp(2.25rem,5vw,3.5rem)', color: textMain }}>
              {t('Tiga Langkah Menuju', 'Three Steps to')}{' '}
              <span style={{ color: lpGreen }}>{t('Ketenangan Pikiran', 'Peace of Mind')}</span>
            </h1>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-14 left-[20%] right-[20%] h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(34,197,94,0.3), rgba(34,197,94,0.3), transparent)' }} />
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.n} delay={i * 120}>
                <div className="relative flex flex-col items-center text-center group">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl" style={{ background: step.color, transform: 'scale(1.5)' }} />
                    <div className="relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-105" style={{ background: `${step.color}0d`, border: `1px solid ${step.color}25` }}>
                      <Icon size={36} style={{ color: step.color }} />
                      <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-[0.6rem] font-black" style={{ background: step.color, color: 'white' }}>{step.n}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-black mb-3" style={{ color: textMain }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{step.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ═══════════════ PILLARS / VALUES ═══════════════ */}
      <section className="py-28 overflow-hidden" style={{ background: sectionBg4 }}>
        <div className="max-w-7xl mx-auto px-5">
          <Reveal>
            <div className="text-center mb-20">
              <span className="inline-block text-[0.6rem] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full mb-5"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}>
                {t('Nilai Kami', 'Our Values')}
              </span>
              <h2 className="font-black leading-tight tracking-[-0.03em]" style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: textMain }}>
                {t('Cara Berbeda', 'A Different Way')}{' '}
                <span style={{ color: lpGreen }}>{t('Cara Kami Bekerja', 'We Work')}</span>
              </h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 100}>
                <div className="group relative overflow-hidden rounded-3xl p-8 h-full transition-all duration-500 hover:scale-[1.02] cursor-default"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
                  <div className="absolute top-0 right-3 pointer-events-none select-none font-black leading-none" style={{ fontSize: 100, opacity: 0.05, color: p.accent, lineHeight: 1 }}>{p.n}</div>
                  <div className="absolute top-0 left-0 pointer-events-none" style={{ width: 60, height: 60, background: p.accent, opacity: 0.10, clipPath: 'polygon(0 0, 60px 0, 0 60px)' }} />
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 animate-float relative" style={{ background: `${p.accent}12`, border: `1px solid ${p.accent}25`, animationDelay: `${i * 0.8}s` }}>
                    <p.Icon size={26} style={{ color: p.accent }} />
                  </div>
                  <h3 className="text-xl font-black mb-4" style={{ color: textMain }}>{p.title}</h3>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: textMuted }}>{p.desc}</p>
                  <ul className="space-y-2.5">
                    {p.items.map(item => (
                      <li key={item} className="flex items-center gap-2.5 text-sm">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                          <circle cx="8" cy="8" r="7" fill={`${p.accent}18`} stroke={p.accent} strokeWidth="1"/>
                          <path d="M5 8 L7 10.5 L11 5.5" stroke={p.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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

      {/* ═══════════════ OFFERS / PROMO ═══════════════ */}
      <section className="py-28 max-w-7xl mx-auto px-5" style={{ background: sectionBg2 }}>
        <Reveal>
          <div className="text-center mb-14">
            <span className="inline-block text-[0.6rem] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-full mb-5"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}>
              {t('Penawaran & Promosi', 'Offers & Promotions')}
            </span>
            <h2 className="font-black leading-tight tracking-[-0.03em]" style={{ fontSize: 'clamp(2rem,4vw,3rem)', color: textMain }}>
              {t('Program Eksklusif', 'Exclusive Programs')}{' '}
              <span style={{ color: lpGreen }}>{t('untuk Nasabah Kami', 'for Our Clients')}</span>
            </h2>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Reveal delay={0}>
            <PromoBanners onSignIn={onSignIn} onInstall={onInstall} />
          </Reveal>
          <Reveal delay={100}>
            <div className="relative overflow-hidden rounded-3xl p-8 h-full"
              style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(16,185,129,0.05) 100%)', border: '1px solid rgba(34,197,94,0.15)', minHeight: '300px' }}>
              <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.3), transparent)', transform: 'translate(30%,-30%)' }} />
              <span className="inline-block text-[0.55rem] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full mb-6" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>
                {t('Mulai Sekarang', 'Start Now')}
              </span>
              <h3 className="text-3xl font-black leading-tight mb-4" style={{ color: textMain }}>
                {t('Pertama Kali', 'First Time')}<br /><span style={{ color: '#22c55e' }}>{t('Bersama SurePath?', 'with SurePath?')}</span>
              </h3>
              <p className="text-sm leading-relaxed mb-8 max-w-xs" style={{ color: textMuted }}>
                {t('Mulai dengan konsultasi gratis 30 menit bareng agen kami yang berpengalaman. Santai aja — nggak ada tekanan, nggak ada komitmen.', 'Start with a free 30-minute consultation with our experienced agent. No commitment, no pressure.')}
              </p>
              <div className="space-y-3">
                {[t('Analisis kebutuhan perlindunganmu', 'Analyze your protection needs'), t('Perbandingan produk yang relevan', 'Relevant product comparison'), t('Estimasi biaya yang transparan', 'Transparent cost estimate')].map(item => (
                  <div key={item} className="flex items-center gap-2.5 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22c55e' }} />
                    <span style={{ color: textMuted }}>{item}</span>
                  </div>
                ))}
              </div>
              <button onClick={onSignIn}
                className="mt-8 flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black text-white transition-all hover:scale-[1.03]"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 8px 30px rgba(34,197,94,0.25)' }}>
                {t('Jadwalkan Konsultasi', 'Schedule Consultation')} <ArrowRight size={14} />
              </button>
            </div>
          </Reveal>
        </div>
      </section>
    </SiteLayout>
  );
};

export default HowItWorksPage;
