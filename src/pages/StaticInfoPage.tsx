import React from 'react';
import {
  ArrowLeft, Briefcase, Award, Handshake,
  Lock, ScrollText, Shield, ArrowRight,
} from 'lucide-react';
import { SurePathLogo } from '../../components/Navbar';
import { Language } from '../../types';
import { STATIC_CONTENT, Loc } from './staticPagesContent';

interface Props {
  pageId: string;
  lang: Language;
  onBack: () => void;
  onSignIn: () => void;
}

type Meta = { Icon: React.FC<{ size?: number; style?: React.CSSProperties }>; color: string };

const META: Record<string, Meta> = {
  careers:     { Icon: Briefcase,  color: '#3b82f6' },
  agents:      { Icon: Award,      color: '#f59e0b' },
  partnership: { Icon: Handshake,  color: '#06b6d4' },
  privacy:     { Icon: Lock,       color: '#64748b' },
  terms:       { Icon: ScrollText, color: '#64748b' },
  security:    { Icon: Shield,     color: '#22c55e' },
  cookie:      { Icon: Shield,     color: '#64748b' },
};

// Page-scoped animation CSS — respects prefers-reduced-motion.
const PAGE_CSS = `
  body { background: hsl(0 0% 8%) !important; }
  @keyframes sip-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes sip-glow { 0%,100% { transform: translate(-50%,0) scale(1); opacity: .5; } 50% { transform: translate(-50%,-4%) scale(1.12); opacity: .8; } }
  .sip-rise { opacity: 0; animation: sip-rise .6s cubic-bezier(.22,1,.36,1) forwards; }
  .sip-glow { animation: sip-glow 9s ease-in-out infinite; }
  .sip-card { transition: transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s ease, border-color .35s ease; }
  .sip-card:hover { transform: translateY(-3px); }
  @media (prefers-reduced-motion: reduce) {
    .sip-rise { opacity: 1; animation: none; }
    .sip-glow { animation: none; }
    .sip-card { transition: none; }
    .sip-card:hover { transform: none; }
  }
`;

const StaticInfoPage: React.FC<Props> = ({ pageId, lang, onBack, onSignIn }) => {
  const content = STATIC_CONTENT[pageId];
  const meta = META[pageId];
  const isEN = lang === Language.EN;
  const L = (loc: Loc) => (isEN ? loc[1] : loc[0]);

  if (!content || !meta) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sora" style={{ background: 'hsl(0 0% 8%)' }}>
        <div className="text-center">
          <p className="text-white mb-4">{isEN ? 'Page not found.' : 'Halaman tidak ditemukan.'}</p>
          <button onClick={onBack} className="text-sm font-bold" style={{ color: '#22c55e' }}>
            ← {isEN ? 'Back to Home' : 'Kembali ke Beranda'}
          </button>
        </div>
      </div>
    );
  }

  const { Icon, color } = meta;
  const cardBg    = 'rgba(255,255,255,0.025)';
  const cardBdr   = 'rgba(255,255,255,0.07)';
  const textMuted = 'rgba(255,255,255,0.55)';

  const cta = content.ctaLabel;
  // careers/partnership use mailto; everything else opens the app sign-in.
  const mailtoFor: Record<string, string> = {
    careers:     'mailto:careers@surepath.id',
    partnership: 'mailto:partnership@surepath.id',
  };
  const handleCta = () => {
    const mail = mailtoFor[pageId];
    if (mail) { window.location.href = mail; return; }
    onSignIn();
  };

  return (
    <div className="min-h-screen font-sora text-white" style={{ background: 'hsl(0 0% 8%)' }}>
      <style>{PAGE_CSS}</style>

      {/* Fine dot-matrix texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      {/* Top hairline accent in the page color */}
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
          style={{ background: '#22c55e' }}>
          {isEN ? 'Sign In' : 'Masuk'}
        </button>
      </nav>

      <div className="relative max-w-3xl mx-auto px-5 py-16">
        {/* Header */}
        <div className="relative mb-14 text-center">
          {/* Soft animated color glow behind the icon */}
          <div className="absolute left-1/2 -top-6 w-64 h-40 rounded-full blur-3xl pointer-events-none sip-glow"
            style={{ background: `radial-gradient(circle, ${color}33 0%, transparent 70%)` }} />
          <div className="relative sip-rise" style={{ animationDelay: '0ms' }}>
            <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-5 sip-card"
              style={{ background: `${color}14`, border: `1px solid ${color}30`, boxShadow: `0 14px 40px -16px ${color}80` }}>
              <Icon size={30} style={{ color }} />
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-4">{L(content.title)}</h1>
            <p className="text-sm leading-relaxed max-w-xl mx-auto" style={{ color: textMuted }}>{L(content.subtitle)}</p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {content.sections.map((s, i) => (
            <div key={i} className="p-6 rounded-2xl sip-card sip-rise"
              style={{ background: cardBg, border: `1px solid ${cardBdr}`, animationDelay: `${80 + i * 70}ms` }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-1.5 h-5 rounded-full flex-shrink-0" style={{ background: color }} />
                <h2 className="text-base font-black" style={{ color }}>{L(s.heading)}</h2>
              </div>
              {Array.isArray(s.body) ? (
                <ul className="space-y-2 pl-1">
                  {s.body.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: textMuted }}>
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      {L(item)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-relaxed" style={{ color: textMuted }}>{L(s.body)}</p>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        {cta && (
          <div className="mt-14 text-center py-12 px-8 rounded-3xl sip-rise"
            style={{ background: `${color}08`, border: `1px solid ${color}18`, animationDelay: '240ms' }}>
            <button onClick={handleCta}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-black text-white transition-all hover:scale-[1.03] active:scale-95"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 8px 30px ${color}40` }}>
              {L(cta)} <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaticInfoPage;
