import React from 'react';
import { ArrowLeft, Car, Plane, Shield, Smartphone, Heart, CloudRain, CheckCircle, ArrowRight, ShieldCheck, Star, Info } from 'lucide-react';
import { SurePathLogo } from '../../components/Navbar';
import { Language } from '../../types';
import { PRODUCT_CONTENT, Loc } from './productInfoContent';

interface Props {
  productId: string;
  lang: Language;
  onBack: () => void;
  onSignIn: () => void;
}

const ICONS: Record<string, React.FC<{ size?: number; style?: React.CSSProperties }>> = {
  car: Car, travel: Plane, pa: Shield, property: Smartphone, health: Heart, climate: CloudRain,
};

// Page-scoped animation CSS — respects prefers-reduced-motion.
const PAGE_CSS = `
  body { background: hsl(222 47% 11%) !important; }
  @keyframes pip-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pip-glow { 0%,100% { transform: translate(-50%,0) scale(1); opacity: .5; } 50% { transform: translate(-50%,-4%) scale(1.12); opacity: .8; } }
  .pip-rise { opacity: 0; animation: pip-rise .6s cubic-bezier(.22,1,.36,1) forwards; }
  .pip-glow { animation: pip-glow 9s ease-in-out infinite; }
  .pip-card { transition: transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s ease, border-color .35s ease; }
  .pip-card:hover { transform: translateY(-3px); }
  @media (prefers-reduced-motion: reduce) {
    .pip-rise { opacity: 1; animation: none; }
    .pip-glow { animation: none; }
    .pip-card { transition: none; }
    .pip-card:hover { transform: none; }
  }
`;

const ProductInfoPage: React.FC<Props> = ({ productId, lang, onBack, onSignIn }) => {
  const product = PRODUCT_CONTENT[productId];
  const Icon = ICONS[productId];
  const isEN = lang === Language.EN;
  const L = (loc: Loc) => (isEN ? loc[1] : loc[0]);

  if (!product || !Icon) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sora" style={{ background: 'rgba(6,9,18,0.86)' }}>
        <div className="text-center">
          <p className="text-white mb-4">{isEN ? 'Product not found.' : 'Produk tidak ditemukan.'}</p>
          <button onClick={onBack} className="text-sm font-bold" style={{ color: '#22c55e' }}>
            ← {isEN ? 'Back to Home' : 'Kembali ke Beranda'}
          </button>
        </div>
      </div>
    );
  }

  const { name, tagline, color, description, features, coverageItems, startingPrice, highlights, comingSoon, segments, disclaimer } = product;
  const ctaLabel = comingSoon
    ? (isEN ? 'Join the Waitlist' : 'Daftar Minat')
    : (isEN ? 'Buy Now' : 'Beli Sekarang');

  return (
    <div className="min-h-screen font-sora text-white" style={{ background: 'rgba(6,9,18,0.86)', position: 'relative' }}>
      <style>{PAGE_CSS}</style>
      {/* Fixed looping video background — matches the rest of the site. These two
          pages sit outside SiteLayout, so they carry their own copy, the same way
          PremiumCalculatorPage already does. */}
      <video autoPlay muted loop playsInline preload="auto"
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', userSelect: 'none', zIndex: -1 }}>
        <source src="/bg3.mp4" type="video/mp4" />
      </video>

      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="fixed top-0 inset-x-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent 12%, ${color}55 50%, transparent 88%)` }} />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(14,14,14,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold transition-colors hover:text-white"
          style={{ color: 'rgba(255,255,255,0.45)' }}>
          <ArrowLeft size={18} /> {isEN ? 'Back' : 'Kembali'}
        </button>
        <button onClick={onBack} className="flex items-center gap-2" aria-label="SurePath">
          <SurePathLogo className="w-6 h-6" />
          <span className="font-black tracking-tight">Sure<span style={{ color: '#22c55e' }}>Path</span></span>
        </button>
        <button onClick={onSignIn}
          className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all hover:opacity-80 active:scale-95"
          style={{ background: color }}>
          {ctaLabel}
        </button>
      </nav>

      <div className="relative max-w-4xl mx-auto px-5 py-16">
        {/* Hero */}
        <div className="relative mb-16 text-center">
          <div className="absolute left-1/2 -top-8 w-72 h-48 rounded-full blur-3xl pointer-events-none pip-glow"
            style={{ background: `radial-gradient(circle, ${color}33 0%, transparent 70%)` }} />
          <div className="relative pip-rise">
            <div className="inline-flex w-20 h-20 rounded-3xl items-center justify-center mb-6 pip-card"
              style={{ background: `${color}14`, border: `1px solid ${color}30`, boxShadow: `0 16px 44px -18px ${color}90` }}>
              <Icon size={36} style={{ color }} />
            </div>
            {comingSoon && (
              <div className="mb-4">
                <span className="inline-block px-4 py-1.5 rounded-full text-2xs font-black uppercase tracking-[0.25em]"
                  style={{ background: `${color}18`, border: `1px solid ${color}45`, color }}>
                  {isEN ? 'In development — not yet available for purchase' : 'Dalam pengembangan — belum dapat dibeli'}
                </span>
              </div>
            )}
            <span className="block text-2xs font-black uppercase tracking-[0.35em] mb-3" style={{ color }}>
              {L(tagline)}
            </span>
            <h1 className="text-4xl font-black tracking-tight mb-5">{L(name)}</h1>
            <p className="text-base leading-relaxed max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {L(description)}
            </p>

            {/* Highlights */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-7 mb-8">
              {highlights.map((h, i) => (
                <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-2xs font-black uppercase tracking-widest"
                  style={{ background: `${color}12`, border: `1px solid ${color}28`, color }}>
                  <Star size={10} fill={color} /> {L(h)}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={onSignIn}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-black text-white transition-all hover:scale-[1.03] active:scale-95"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 8px 30px ${color}40` }}>
                {ctaLabel} <ArrowRight size={16} />
              </button>
              <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {comingSoon
                  ? (isEN ? 'Premium to be announced' : 'Premi diumumkan menyusul')
                  : `${isEN ? 'Starting from' : 'Mulai dari'} ${L(startingPrice)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mb-16">
          <h2 className="text-xl font-black mb-8 text-center tracking-tight">{isEN ? 'Key Features' : 'Fitur Unggulan'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-2xl pip-card pip-rise"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', animationDelay: `${60 + i * 60}ms` }}>
                <CheckCircle size={18} className="flex-shrink-0 mt-0.5" style={{ color }} />
                <span className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{L(f)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Segments — only for products that declare them */}
        {segments && segments.length > 0 && (
          <div className="mb-16">
            <h2 className="text-xl font-black mb-2 text-center tracking-tight">{isEN ? 'Who It Is For' : 'Untuk Siapa'}</h2>
            <p className="text-xs text-center mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {isEN ? 'Segments we are designing this protection for' : 'Segmen yang sedang kami rancang untuk perlindungan ini'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {segments.map((sg, i) => (
                <div key={i} className="p-5 rounded-2xl pip-card pip-rise"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', animationDelay: `${60 + i * 60}ms` }}>
                  <h3 className="text-sm font-black mb-2" style={{ color }}>{L(sg.title)}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{L(sg.desc)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coverage */}
        <div className="mb-16">
          <h2 className={`text-xl font-black text-center tracking-tight ${comingSoon ? 'mb-2' : 'mb-8'}`}>{isEN ? 'Coverage' : 'Jaminan Perlindungan'}</h2>
          {comingSoon && (
            <p className="text-xs text-center mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {isEN ? 'Planned coverage — final terms follow the issued policy' : 'Rencana cakupan — ketentuan final mengikuti polis yang diterbitkan'}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {coverageItems.map((c, i) => (
              <div key={i} className="p-5 rounded-2xl pip-card pip-rise"
                style={{ background: `${color}08`, border: `1px solid ${color}20`, animationDelay: `${60 + i * 60}ms` }}>
                <h3 className="text-sm font-black mb-2" style={{ color }}>{L(c.title)}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{L(c.desc)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center py-14 px-8 rounded-3xl pip-rise"
          style={{ background: `${color}08`, border: `1px solid ${color}18` }}>
          <ShieldCheck size={40} className="mx-auto mb-5" style={{ color }} />
          <h2 className="text-2xl font-black mb-3 tracking-tight">
            {comingSoon
              ? (isEN ? 'Want to Know When It Launches?' : 'Ingin Tahu Saat Produk Ini Rilis?')
              : (isEN ? 'Ready to Get Protected?' : 'Siap Terlindungi?')}
          </h2>
          <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {comingSoon
              ? (isEN
                  ? 'Leave your details and our team will reach out once the product is available. Free, and with no obligation to buy.'
                  : 'Tinggalkan data Anda dan tim kami akan menghubungi begitu produk tersedia. Gratis, tanpa kewajiban membeli.')
              : (isEN
                  ? 'Register now and get active protection in minutes. No survey, no hassle.'
                  : 'Daftar sekarang dan dapatkan perlindungan aktif dalam hitungan menit. Tanpa survei, tanpa kerumitan.')}
          </p>
          <button onClick={onSignIn}
            className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-sm font-black text-white transition-all hover:scale-[1.03] active:scale-95"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 8px 30px ${color}40` }}>
            {comingSoon ? ctaLabel : (isEN ? 'Get Started' : 'Mulai Sekarang')} <ArrowRight size={16} />
          </button>
        </div>

        {/* Mandatory disclaimer for pre-launch products */}
        {disclaimer && (
          <div className="mt-8 flex items-start gap-3 p-5 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }} />
            <p className="text-[0.7rem] leading-relaxed" style={{ color: 'rgba(255,255,255,0.42)' }}>
              {L(disclaimer)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductInfoPage;
