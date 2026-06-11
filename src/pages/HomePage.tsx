import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ArrowRight, ChevronDown, Car, Plane, Shield, Smartphone, Heart, Star, CheckCircle2, Zap, Users, Eye, Lock } from 'lucide-react';
import SiteLayout from './site/SiteLayout';
import PremiumCalcWidget from './site/PremiumCalcWidget';
import {
  SitePageProps, useT, useSiteTheme, Reveal3D, use3DTilt,
  AnimatedCounter, PRODUCTS, SectionLabel, useWebsiteConfig,
} from './site/siteKit';

// ── Aurora canvas for hero background ──────────────────────────────────────────
const AuroraHero: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const blobs = darkMode
      ? [
          { color: '5,46,22',    phase: 0.0, sx: 0.00045, sy: 0.00033, r: 600, op: 0.28 },
          { color: '6,78,59',    phase: 2.1, sx: 0.00033, sy: 0.00052, r: 480, op: 0.20 },
          { color: '22,163,74',  phase: 4.2, sx: 0.00058, sy: 0.00040, r: 400, op: 0.12 },
          { color: '16,185,129', phase: 1.0, sx: 0.00040, sy: 0.00060, r: 320, op: 0.10 },
        ]
      : [
          { color: '22,163,74',  phase: 0.0, sx: 0.00035, sy: 0.00025, r: 500, op: 0.12 },
          { color: '16,185,129', phase: 2.1, sx: 0.00025, sy: 0.00040, r: 380, op: 0.08 },
          { color: '5,150,105',  phase: 4.2, sx: 0.00045, sy: 0.00030, r: 300, op: 0.06 },
        ];
    let frame = 0; let animId = 0;
    const draw = () => {
      frame++;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      blobs.forEach(b => {
        const x = w * (0.2 + 0.6 * (0.5 + 0.5 * Math.sin(frame * b.sx + b.phase)));
        const y = h * (0.2 + 0.6 * (0.5 + 0.5 * Math.cos(frame * b.sy + b.phase * 1.4)));
        const g = ctx.createRadialGradient(x, y, 0, x, y, b.r);
        g.addColorStop(0, `rgba(${b.color},${b.op})`);
        g.addColorStop(0.5, `rgba(${b.color},${(b.op * 0.3).toFixed(3)})`);
        g.addColorStop(1, `rgba(${b.color},0)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, [darkMode]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} />;
};

// ── Floating 3D product badge ───────────────────────────────────────────────────
const Float3D: React.FC<{ icon: React.FC<any>; label: string; color: string; style: React.CSSProperties }> = ({ icon: Icon, label, color, style }) => (
  <div className="animate-float-z absolute backdrop-blur-xl rounded-2xl border flex items-center gap-2.5 px-4 py-2.5 shadow-2xl"
    style={{ background: `rgba(${color},0.08)`, border: `1px solid rgba(${color},0.2)`, ...style }}>
    <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `rgba(${color},0.15)` }}>
      <Icon size={14} style={{ color: `rgb(${color})` }} />
    </div>
    <span className="text-xs font-bold whitespace-nowrap" style={{ color: `rgb(${color})` }}>{label}</span>
  </div>
);

const HomePage: React.FC<SitePageProps> = (props) => {
  const { onSignIn, navigate, lang, darkMode } = props;
  const t = useT(lang);
  const th = useSiteTheme(darkMode);
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroTilt, setHeroTilt] = useState({ x: 0, y: 0 });

  const heroConfig = useWebsiteConfig('hero');
  const heroHeadline = heroConfig?.headline || t('Tenang itu hak kamu.', 'Peace of mind is your right.');

  // Mouse-tracking parallax on hero cluster
  const onHeroMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = heroRef.current?.getBoundingClientRect(); if (!rect) return;
    setHeroTilt({
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top)  / rect.height - 0.5,
    });
  }, []);

  const WHY = [
    { color: '#2563eb', Icon: Eye,    title: t('Jujur & Transparan', 'Honest & Transparent'), desc: t('Kamu tau persis apa yang dibayar dan dilindungi. Nggak ada fine print yang bikin kaget.', 'You know exactly what you pay and what\'s covered. No surprise fine print.') },
    { color: '#7c3aed', Icon: Users,  title: t('Agen Berlisensi', 'Licensed Agents'),         desc: t('Semua agen bersertifikasi OJK — saran yang mereka kasih valid dan bisa dipercaya.', 'All agents are OJK-certified — the advice they give is valid and trustworthy.') },
    { color: '#d97706', Icon: Zap,    title: t('Proses Cepat', 'Lightning Fast'),              desc: t('Daftar 5 menit, polis langsung dikirim. Klaim? Bisa dari HP kamu dalam hitungan menit.', 'Sign up in 5 minutes, policy sent instantly. Claims? Done from your phone in minutes.') },
    { color: '#16a34a', Icon: Lock,   title: t('Data Aman', 'Data Secure'),                   desc: t('Enkripsi bank-grade di semua titik. Data kamu nggak pernah dijual ke pihak ketiga.', 'Bank-grade encryption everywhere. Your data is never sold to third parties.') },
  ];

  const STEPS = [
    { n: '01', title: t('Cerita Kebutuhanmu', 'Tell Us Your Needs'),   desc: t('Chat sama agen AI kita atau agen manusia — nggak ada tekanan, nggak ada script.', 'Chat with our AI or human agent — no pressure, no script.') },
    { n: '02', title: t('Pilih Perlindungan', 'Pick Your Coverage'),   desc: t('Bandingkan 40+ produk dari 18 insurer. Harga real-time, nggak ada markup tersembunyi.', 'Compare 40+ products from 18 insurers. Real-time pricing, no hidden markup.') },
    { n: '03', title: t('Bayar & Polis Aktif', 'Pay & Get Covered'),   desc: t('Bayar via transfer, kartu, atau e-wallet. Polis kamu aktif dan dikirim ke email dalam menit.', 'Pay via transfer, card, or e-wallet. Your policy is active and emailed in minutes.') },
  ];

  const STATS = [
    { target: 12400, suffix: '+', label: t('Nasabah Aktif', 'Active Clients') },
    { target: 98,    suffix: '%', label: t('Tingkat Kepuasan', 'Satisfaction Rate') },
    { target: 18,    suffix: '+', label: t('Mitra Insurer', 'Insurer Partners') },
    { target: 40,    suffix: '+', label: t('Produk Tersedia', 'Products Available') },
  ];

  const TESTIMONIALS = [
    { name: 'Reza Pratama', role: t('Nasabah Asuransi Mobil', 'Car Insurance Client'), quote: t('Klaim cuma 3 hari kerja, padahal kata orang bisa berminggu-minggu. Beneran surprise.', 'Claim settled in 3 business days. Totally surprised me.'), stars: 5 },
    { name: 'Sari Dewi',    role: t('Nasabah Asuransi Perjalanan', 'Travel Insurance Client'), quote: t('Gampang banget belinya, langsung ada di HP. Waktu koper ilang di Singapura langsung dibantu.', 'Super easy to buy, right on my phone. When my luggage was lost in Singapore, they helped immediately.'), stars: 5 },
    { name: 'Budi Santoso', role: t('Agen SurePath', 'SurePath Agent'), quote: t('Dashboard-nya keren, komisi transparan, dan sistem klaim bikin nasabah seneng. Bangga jadi bagian ini.', 'Great dashboard, transparent commissions, and the claims system keeps clients happy.'), stars: 5 },
  ];

  // 3D tilt instances for "Why" cards
  const tilts = [use3DTilt(), use3DTilt(), use3DTilt(), use3DTilt()];

  const heroBg = darkMode ? '#070b12' : '#f6f4f0';
  const accent = th.accent;

  return (
    <SiteLayout {...props} active="home" bgVideo="/promo.mp4">

      {/* ═══════════════ HERO ═══════════════ */}
      <section
        ref={heroRef}
        onMouseMove={onHeroMouseMove}
        className="relative min-h-screen flex items-end overflow-hidden"
        style={{ background: heroBg }}
      >
        <AuroraHero darkMode={darkMode} />

        {/* Dot grid overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1,
          backgroundImage: `radial-gradient(${darkMode ? 'rgba(22,163,74,0.06)' : 'rgba(22,163,74,0.09)'} 1px, transparent 1px)`,
          backgroundSize: '32px 32px' }} />

        {/* 3D floating badges — right side of hero, mouse-parallax */}
        <div className="absolute hidden lg:block"
          style={{ right: '6%', top: '50%', marginTop: '-200px', width: 340, height: 400, zIndex: 2,
            transform: `perspective(1200px) rotateY(${heroTilt.x * 10}deg) rotateX(${-heroTilt.y * 7}deg)`,
            transition: 'transform 0.4s ease',
          }}>
          <Float3D icon={Car}        label={t('Asuransi Mobil', 'Car Insurance')}     color="22,163,74"   style={{ top: '0%',   left: '30%',  animationDelay: '0s',    animationDuration: '5s' }} />
          <Float3D icon={Plane}      label={t('Perjalanan', 'Travel Cover')}           color="59,130,246"  style={{ top: '25%',  left: '-5%',  animationDelay: '0.8s',  animationDuration: '6s' }} />
          <Float3D icon={Shield}     label={t('Kecelakaan Diri', 'Personal Accident')} color="168,85,247"  style={{ top: '50%',  left: '50%',  animationDelay: '1.4s',  animationDuration: '4.5s' }} />
          <Float3D icon={Heart}      label={t('Kesehatan', 'Health')}                  color="239,68,68"   style={{ top: '72%',  left: '5%',   animationDelay: '0.4s',  animationDuration: '5.5s' }} />
          <Float3D icon={Smartphone} label={t('Proteksi Gadget', 'Gadget Protection')} color="245,158,11"  style={{ top: '88%',  left: '40%',  animationDelay: '1.0s',  animationDuration: '6.5s' }} />
        </div>

        {/* Hero content */}
        <div className="relative w-full max-w-2xl px-8 md:px-14 pb-14 md:pb-20 pt-36 pointer-events-none" style={{ zIndex: 3 }}>
          {/* Tag */}
          <div className="pointer-events-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[0.6rem] font-black uppercase tracking-[0.25em] mb-6 opacity-0 animate-fade-up"
            style={{ animationDelay: '0.1s', background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.22)', color: darkMode ? '#86efac' : '#15803d' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t('Asuransi yang beneran ngerti kamu', 'Insurance that actually gets you')}
          </div>

          {/* Headline */}
          <h1 className="font-black leading-[1.0] tracking-[-0.04em] mb-4 opacity-0 animate-fade-up"
            style={{ fontSize: 'clamp(2.8rem,7.5vw,5.5rem)', animationDelay: '0.25s', color: th.textMain }}>
            {heroHeadline.split('\n')[0]}
            {heroHeadline.includes('\n') && <><br /><span style={{ color: accent }}>{heroHeadline.split('\n').slice(1).join(' ')}</span></>}
            {!heroHeadline.includes('\n') && <><br /><span style={{ color: accent }}>{t('Kami ada buat kamu.', 'We\'ve got you covered.')}</span></>}
          </h1>

          {/* Sub */}
          <p className="font-light leading-relaxed mb-8 max-w-lg opacity-0 animate-fade-up"
            style={{ fontSize: 'clamp(1rem,2vw,1.2rem)', animationDelay: '0.4s', color: th.textMuted }}>
            {heroConfig?.subtitle || t(
              '40+ produk, 18 insurer, satu platform. Dari beli polis sampai klaim — semua bisa dari HP kamu.',
              '40+ products, 18 insurers, one platform. From buying a policy to filing a claim — all from your phone.',
            )}
          </p>

          {/* CTAs */}
          <div className="pointer-events-auto flex flex-wrap gap-3 opacity-0 animate-fade-up" style={{ animationDelay: '0.55s' }}>
            <button onClick={onSignIn}
              className="group flex items-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{ background: `linear-gradient(135deg, ${accent}, #059669)`, boxShadow: `0 12px 28px -8px rgba(22,163,74,0.5)` }}>
              {t('Mulai Gratis', 'Get Started Free')}
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => navigate('/products')}
              className="px-7 py-3.5 rounded-2xl font-bold text-sm transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{ background: darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', border: `1px solid ${th.cardBorder}`, color: th.textMain }}>
              {t('Lihat Produk', 'View Products')}
            </button>
          </div>

          {/* Trust line */}
          <div className="flex items-center gap-2 mt-6 opacity-0 animate-fade-up" style={{ animationDelay: '0.7s' }}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-xs" style={{ color: th.textSubtle }}>
              Jakarta, Indonesia
              <span className="mx-2 opacity-40">·</span>
              {t('Terdaftar OJK', 'OJK Registered')}
              <span className="mx-2 opacity-40">·</span>
              {t('12.400+ nasabah aktif', '12,400+ active clients')}
            </p>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 right-8 z-10 flex flex-col items-center pointer-events-none gap-[-4px]">
          <ChevronDown size={18} className="animate-chevron-1" style={{ color: accent }} />
          <ChevronDown size={18} className="animate-chevron-2" style={{ color: accent, marginTop: '-8px' }} />
        </div>
      </section>

      {/* ═══════════════ STATS ═══════════════ */}
      <section className="py-14 px-6" style={{ background: th.videoBg2, borderBottom: `1px solid ${th.cardBorder}` }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <Reveal3D key={s.label} delay={i * 70}>
              <div className="text-center md:text-left">
                <div style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 900, lineHeight: 1, color: th.textMain, letterSpacing: '-0.04em' }}>
                  <AnimatedCounter target={s.target} suffix={s.suffix} />
                </div>
                <div style={{ width: 24, height: 3, background: accent, margin: '8px auto 6px', borderRadius: 99 }} className="md:mx-0" />
                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: th.textMuted, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                  {s.label}
                </div>
              </div>
            </Reveal3D>
          ))}
        </div>
      </section>

      {/* ═══════════════ WHY — 3D tilt cards ═══════════════ */}
      <section className="py-24 px-6" style={{ background: th.videoBg3 }}>
        <div className="max-w-6xl mx-auto">
          <Reveal3D className="mb-14 max-w-xl">
            <SectionLabel darkMode={darkMode}>{t('Kenapa SurePath?', 'Why SurePath?')}</SectionLabel>
            <h2 className="font-black leading-tight tracking-tight" style={{ fontSize: 'clamp(1.8rem,4vw,3rem)', color: th.textMain }}>
              {t('Bukan sekadar', 'Not just another')}{' '}
              <span style={{ color: accent }}>{t('platform asuransi.', 'insurance platform.')}</span>
            </h2>
            <p className="mt-3 text-base leading-relaxed" style={{ color: th.textMuted }}>
              {t('SurePath dibangun dari frustrasi nyata — asuransi yang ribet, agen yang pushy, klaim yang lama. Kita ubah semua itu.',
                 'SurePath was built from real frustration — complicated insurance, pushy agents, slow claims. We changed all of that.')}
            </p>
          </Reveal3D>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {WHY.map((c, i) => (
              <Reveal3D key={c.title} delay={i * 80}>
                <div
                  ref={tilts[i].ref}
                  onMouseMove={tilts[i].onMove}
                  onMouseLeave={tilts[i].onLeave}
                  className="card-3d p-7 rounded-3xl h-full cursor-default"
                  style={{ background: th.cardBg, borderLeft: `4px solid ${c.color}`, boxShadow: th.cardShadow, ['--spx-accent' as string]: c.color }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${c.color}15` }}>
                      <c.Icon size={20} style={{ color: c.color }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base mb-2" style={{ color: th.textMain }}>{c.title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: th.textMuted }}>{c.desc}</p>
                    </div>
                  </div>
                </div>
              </Reveal3D>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ PRODUCTS — 3D depth grid ═══════════════ */}
      <section className="py-24 px-6" style={{ background: th.videoBg2 }}>
        <div className="max-w-6xl mx-auto">
          <Reveal3D className="mb-12">
            <SectionLabel darkMode={darkMode}>{t('Produk Kami', 'Our Products')}</SectionLabel>
            <div className="flex items-end justify-between flex-wrap gap-4">
              <h2 className="font-black leading-tight tracking-tight" style={{ fontSize: 'clamp(1.8rem,4vw,3rem)', color: th.textMain }}>
                {t('Satu platform,', 'One platform,')}{' '}
                <span style={{ color: accent }}>{t('semua perlindungan.', 'all your protection.')}</span>
              </h2>
              <button onClick={() => navigate('/products')} className="text-sm font-bold flex items-center gap-1.5 transition-opacity hover:opacity-70" style={{ color: accent }}>
                {t('Lihat Semua', 'View All')} <ArrowRight size={14} />
              </button>
            </div>
          </Reveal3D>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PRODUCTS.map((p, i) => (
              <Reveal3D key={p.slug} delay={i * 60} from={i % 2 === 0 ? 'bottom' : 'right'}>
                <button
                  onClick={() => navigate(`/product/${p.slug}`)}
                  className="spx-card spx-sheen group w-full text-left flex flex-col rounded-2xl overflow-hidden"
                  style={{ background: th.cardBg, ['--spx-accent' as string]: p.color, boxShadow: th.cardShadow }}
                >
                  <div className="flex items-center justify-center py-6" style={{ background: `linear-gradient(135deg, ${p.color}18 0%, ${p.color}06 100%)` }}>
                    <p.Icon color={p.color} size={36} className="transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <div style={{ height: 2, background: p.color }} />
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-black text-sm mb-1 leading-tight" style={{ color: th.textMain }}>{p.name}</h3>
                    <p className="text-[0.65rem] font-bold mb-2" style={{ color: p.color }}>{p.sub}</p>
                    <p className="text-xs leading-relaxed mb-4 flex-1" style={{ color: th.textMuted }}>{p.desc}</p>
                    <div className="flex items-center gap-1.5 text-xs font-black" style={{ color: p.color }}>
                      {t('Pelajari', 'Learn more')} <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>
              </Reveal3D>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section className="py-24 px-6" style={{ background: th.videoBg3 }}>
        <div className="max-w-5xl mx-auto">
          <Reveal3D className="mb-14 text-center">
            <SectionLabel darkMode={darkMode}>{t('Cara Kerja', 'How It Works')}</SectionLabel>
            <h2 className="font-black leading-tight tracking-tight" style={{ fontSize: 'clamp(1.8rem,4vw,3rem)', color: th.textMain }}>
              {t('3 langkah. Semudah itu.', 'Three steps. That simple.')}
            </h2>
          </Reveal3D>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-12 left-[calc(16.7%+1.5rem)] right-[calc(16.7%+1.5rem)] h-px" style={{ background: `linear-gradient(90deg, ${accent}40, ${accent}, ${accent}40)` }} />
            {STEPS.map((s, i) => (
              <Reveal3D key={s.n} delay={i * 100}>
                <div className="relative p-7 rounded-3xl text-center" style={{ background: th.cardBg, boxShadow: th.cardShadow, border: `1px solid ${th.cardBorder}` }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 font-black text-lg"
                    style={{ background: `${accent}12`, border: `2px solid ${accent}30`, color: accent }}>
                    {s.n}
                  </div>
                  <h3 className="font-black text-base mb-3" style={{ color: th.textMain }}>{s.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: th.textMuted }}>{s.desc}</p>
                  <CheckCircle2 size={16} className="absolute top-5 right-5 opacity-20" style={{ color: accent }} />
                </div>
              </Reveal3D>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ TESTIMONIALS ═══════════════ */}
      <section className="py-24 px-6" style={{ background: th.videoBg2 }}>
        <div className="max-w-5xl mx-auto">
          <Reveal3D className="mb-12 text-center">
            <SectionLabel darkMode={darkMode}>{t('Yang Mereka Bilang', 'What They Say')}</SectionLabel>
            <h2 className="font-black leading-tight tracking-tight" style={{ fontSize: 'clamp(1.8rem,4vw,3rem)', color: th.textMain }}>
              {t('Orang nyata,', 'Real people,')}{' '}
              <span style={{ color: accent }}>{t('cerita nyata.', 'real stories.')}</span>
            </h2>
          </Reveal3D>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((r, i) => (
              <Reveal3D key={r.name} delay={i * 90} from={(['left','bottom','right'] as const)[i]}>
                <div className="p-6 rounded-3xl flex flex-col gap-4 h-full" style={{ background: th.cardBg, boxShadow: th.cardShadow, border: `1px solid ${th.cardBorder}` }}>
                  <div className="flex gap-0.5">
                    {Array.from({ length: r.stars }).map((_, j) => (
                      <Star key={j} size={12} fill={accent} style={{ color: accent }} />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed flex-1 italic" style={{ color: th.textMuted }}>"{r.quote}"</p>
                  <div>
                    <p className="text-sm font-black" style={{ color: th.textMain }}>{r.name}</p>
                    <p className="text-xs font-semibold" style={{ color: accent }}>{r.role}</p>
                  </div>
                </div>
              </Reveal3D>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ CALCULATOR ═══════════════ */}
      <section className="py-20 px-6" style={{ background: th.videoBg3, borderTop: `1px solid ${th.cardBorder}` }}>
        <div className="max-w-5xl mx-auto">
          <Reveal3D className="text-center mb-10">
            <SectionLabel darkMode={darkMode}>{t('Kalkulator Premi', 'Premium Calculator')}</SectionLabel>
            <h2 className="font-black leading-tight tracking-tight" style={{ fontSize: 'clamp(1.8rem,4vw,3rem)', color: th.textMain }}>
              {t('Cek premi mobil kamu', 'Check your car premium')}{' '}
              <span style={{ color: accent }}>{t('sekarang.', 'right now.')}</span>
            </h2>
            <p className="text-base mt-2" style={{ color: th.textMuted }}>
              {t('Nggak perlu daftar. Hasilnya real-time.', 'No sign-up needed. Results are real-time.')}
            </p>
          </Reveal3D>
          <Reveal3D delay={80}>
            <PremiumCalcWidget lang={lang} darkMode={darkMode} onSignIn={onSignIn} onDetail={() => navigate('/kalkulator')} />
          </Reveal3D>
        </div>
      </section>

      {/* ═══════════════ CTA ═══════════════ */}
      <section className="py-28 px-6" style={{ background: th.videoBg2 }}>
        <Reveal3D>
          <div className="max-w-3xl mx-auto text-center">
            <SectionLabel darkMode={darkMode}>{t('Mulai Hari Ini', 'Start Today')}</SectionLabel>
            <h2 className="font-black leading-[1.05] tracking-tight mb-5" style={{ fontSize: 'clamp(2rem,5vw,4rem)', color: th.textMain }}>
              {t('Yuk,', 'Let\'s')}{' '}
              <span style={{ color: accent }}>{t('lindungi yang penting buat kamu.', 'protect what matters to you.')}</span>
            </h2>
            <p className="text-base leading-relaxed mb-10 max-w-lg mx-auto" style={{ color: th.textMuted }}>
              {t('Gabung bareng 12.000+ orang yang udah tenang karena udah dilindungi SurePath.', 'Join 12,000+ people who already have peace of mind with SurePath.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={onSignIn}
                className="group flex items-center justify-center gap-3 px-10 py-4 rounded-2xl text-base font-black text-white transition-all hover:scale-[1.03] active:scale-[0.97]"
                style={{ background: `linear-gradient(135deg, ${accent}, #059669)`, boxShadow: `0 16px 40px -12px rgba(22,163,74,0.5)` }}>
                {t('Mulai Sekarang — Gratis', 'Start Now — It\'s Free')}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => navigate('/products')}
                className="group flex items-center justify-center gap-3 px-10 py-4 rounded-2xl text-base font-bold transition-all hover:scale-[1.03] active:scale-[0.97]"
                style={{ background: th.cardBg, border: `1px solid ${th.cardBorder}`, color: th.textMain, boxShadow: th.cardShadow }}>
                {t('Lihat Semua Produk', 'View All Products')}
              </button>
            </div>
          </div>
        </Reveal3D>
      </section>

    </SiteLayout>
  );
};

export default HomePage;
